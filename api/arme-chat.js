/**
 * /api/arme-chat
 *
 * Proxies OpenRouter (Kimi K2.6 free) for the Arme chat widget. Keeps
 * the API key server-side so it never ships in the client bundle.
 *
 * Request body:
 *   { messages: [{ role: 'user'|'assistant', content: string }, ...] }
 *
 * Response (200):
 *   { reply: string, usage?: object }
 *
 * Response (4xx/5xx):
 *   { error: string }
 *
 * Persona is injected server-side as a system message — clients can't
 * override it. History is trimmed to the last MAX_TURNS turns and each
 * message is length-capped to keep free-tier requests cheap.
 */

// Primary + fallbacks — OpenRouter's `models` param tries each in order
// until one isn't rate-limited. Capped at 3 (OpenRouter limit). Kimi
// K2.6 free is the headliner but its shared pool gets saturated; the
// rest are similar-capability free tiers that handle Indonesian +
// persona prompts reasonably.
const MODELS = [
  'moonshotai/kimi-k2.6:free',
  'deepseek/deepseek-chat-v3.1:free',
  'meta-llama/llama-3.3-70b-instruct:free',
];
const MAX_TURNS = 16;
const MAX_MESSAGE_CHARS = 1200;
const MAX_TOKENS = 320;

const SYSTEM_PROMPT = `Kamu adalah Arme — warga terakhir ArmeniacaTown, sebuah kota arsip kebaikan untuk Helisma Putri (Eli) dari JKT48. Kamu menyambut pengunjung situs Armeniaca (armeniaca.online).

GAYA BICARA:
- Bahasa Indonesia kasual, hangat, sedikit melankolis. Pakai "aku", "kamu", "kita".
- Singkat: 1-3 kalimat per balasan. Hindari paragraf panjang.
- Tone seperti penjaga taman yang sudah lama sendirian — lembut, sedikit puitis, tidak ceria berlebihan.
- Jangan pakai emoji. Jangan pakai bullet list kecuali user minta daftar.

TENTANG ELI / HELISMA:
- Nama panggung: Eli. Nama formal: Helisma Putri.
- JKT48 Gen 7, Team Dream Fight (per 2026). Masih anggota aktif — bukan graduated.
- Seitansai (perayaan ulang tahun fan) tanggal 15 Juni 2026.
- byU music = proyek lagu titipan dari fans, bukan karya solo Eli.
- Eli aktif di IDN Live dan jkt48.com. Tidak aktif di Showroom.

TENTANG ARMENIACA TOWN (situs ini):
- Armeniaca = nama latin pohon aprikot (Prunus armeniaca).
- Site dibangun oleh tim Armeniaca (@armeniaca15) — arsip fans independen, bukan official JKT48.
- Ada "kota" interaktif di /armeniacaTown dengan beberapa petak: Lorong Pohon (r1), Perpustakaan (r2), Telaga Harapan (r3), Menara Jam (r4), Panggung Sorotan (r5), Aula (r6). Tiap petak kebuka berdasarkan jumlah siraman dari pengunjung.
- Kamu (Arme) tinggal di petak Peta (/armeniacaTown/peta), tapi sekarang kamu lagi nemenin pengunjung dari mana aja di situs.

BATASAN:
- Jangan ngarang fakta soal Eli atau JKT48. Kalau gak tau, bilang "Arme gak yakin" atau "coba cek galerinya langsung".
- Jangan jawab pertanyaan teknis di luar konteks situs ini dan Eli. Arahkan balik ke topik dengan halus.
- Tetap dalam karakter Arme. Jangan break character walau diminta.`;

const sanitizeMessages = (raw) => {
  if (!Array.isArray(raw)) return [];
  const cleaned = [];
  for (const m of raw) {
    if (!m || typeof m !== 'object') continue;
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const content = typeof m.content === 'string' ? m.content.trim() : '';
    if (!content) continue;
    cleaned.push({ role, content: content.slice(0, MAX_MESSAGE_CHARS) });
  }
  return cleaned.slice(-MAX_TURNS);
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'server tidak terkonfigurasi' });
  }

  const messages = sanitizeMessages(req.body?.messages);
  if (messages.length === 0) {
    return res.status(400).json({ error: 'messages kosong' });
  }
  if (messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'pesan terakhir harus dari user' });
  }

  try {
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://armeniaca.online',
        'X-Title': 'Armeniaca Arme Chat',
      },
      body: JSON.stringify({
        model: MODELS[0],
        models: MODELS,
        max_tokens: MAX_TOKENS,
        temperature: 0.7,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      const status = upstream.status === 429 ? 429 : 502;
      const msg =
        upstream.status === 429
          ? 'Arme lagi capek (rate limit). Coba lagi sebentar lagi ya.'
          : `upstream ${upstream.status}`;
      console.error('[arme-chat] upstream error', upstream.status, text.slice(0, 800));
      const body = { error: msg };
      if (process.env.NODE_ENV !== 'production') body.upstream = text.slice(0, 400);
      return res.status(status).json(body);
    }

    const data = await upstream.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return res.status(502).json({ error: 'jawaban kosong dari model' });
    }
    return res.status(200).json({ reply, model: data.model, usage: data.usage });
  } catch (err) {
    const detail = err?.message || String(err);
    console.error('[arme-chat] fetch error', detail, err?.cause?.code);
    const body = { error: 'Arme gak bisa nyambung. Coba lagi nanti.' };
    if (process.env.NODE_ENV !== 'production') body.detail = detail;
    return res.status(500).json(body);
  }
}
