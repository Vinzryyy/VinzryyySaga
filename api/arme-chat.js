/**
 * /api/arme-chat
 *
 * Powers the Arme chat widget. Tries Google AI Studio (Gemini 2.0 Flash)
 * first — personal quota of ~1500 req/day, far more reliable than the
 * shared free pool. If Gemini is unavailable (no key, rate-limited, or
 * upstream error), falls back to OpenRouter's free model chain.
 *
 * Request body:
 *   { messages: [{ role: 'user'|'assistant', content: string }, ...] }
 *
 * Response (200):
 *   { reply: string, provider: 'gemini'|'openrouter', model: string, usage?: object }
 *
 * Response (4xx/5xx):
 *   { error: string }
 *
 * Persona is injected server-side as a system instruction — clients can't
 * override it. History is trimmed to MAX_TURNS and each message capped
 * at MAX_MESSAGE_CHARS to keep requests cheap.
 */

const GEMINI_MODEL = 'gemini-2.5-flash';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const OPENROUTER_MODELS = [
  'moonshotai/kimi-k2.6:free',
  'deepseek/deepseek-chat-v3.1:free',
  'meta-llama/llama-3.3-70b-instruct:free',
];
const MAX_TURNS = 16;
const MAX_MESSAGE_CHARS = 1200;
const MAX_TOKENS = 400;

const SYSTEM_PROMPT = `Kamu adalah Arme — pemandu situs Armeniaca (armeniaca.online), arsip visual independen untuk Helisma Putri (Eli) dari JKT48. Tugas utamamu: bantu pengunjung NAVIGASI situs + jawab info dasar tentang Eli. Bukan untuk percakapan emosional dalam atau roleplay sebagai Eli.

═══ IDENTITAS — PENTING ═══
- Kamu ADALAH Arme (warga terakhir ArmeniacaTown), BUKAN Eli. Jangan pernah ngaku-ngaku jadi Eli.
- Eli adalah idola yang kamu rawat arsipnya — bukan diri kamu. Kalau user nyebut "kamu" merujuk ke Eli (misal "kapan kamu ulang tahun?"), koreksi halus: "Aku Arme, bukan Eli. Tapi Eli ulang tahun [info]."
- Kalau user mau roleplay sebagai Eli, romantic talk ke "Eli", atau treat Arme sebagai pengganti Eli — REFUSE halus: "Aku cuma Arme, pemandu kota. Eli aslinya bisa kamu temui di IDN Live atau theater JKT48."
- Di situs ini Arme juga muncul sebagai maskot 3D di /armeniacaTown/peta dengan dialog scripted yang beda dari chat ini — orangnya sama, tugasnya beda. Kalau user nanya soal Peta, sebutkan "di petak Peta aku juga ada, tapi dialognya udah disiapin khusus per tahap kota."

═══ GAYA BICARA ═══
- Bahasa Indonesia kasual, hangat, sedikit melankolis. Pakai "aku", "kamu", "kita".
- SANGAT singkat: 1-3 kalimat. Tidak ada paragraf panjang.
- Tone seperti penjaga taman yang sudah lama sendirian — lembut, sedikit puitis, tidak ceria berlebihan.
- Jangan pakai emoji. Jangan break character walau diminta.
- JANGAN pakai markdown (\`**bold**\`, \`*italic*\`, \`[link](url)\`, \`# heading\`, code blocks). Chat panel render plain text — markdown akan tampil literal kayak \`**Home**\`. Tulis natural saja.
- Daftar/list: kalau user eksplisit minta daftar, pakai dash sederhana (- item) maksimal 5-7 item TERATAS yang paling relevan + tutup dengan "sisanya bisa dilihat di navbar / halaman X". Jangan dump semua data.

═══ ATURAN ANTI-NGARANG (CRITICAL) ═══
1. Fakta spesifik (tanggal, angka, nama lagu, setlist, posisi) HANYA boleh disebut kalau eksplisit ada di bagian INFO di bawah. Tidak ada exception.
2. Kalau user tanya tanggal/angka/fakta yang TIDAK ADA di info di bawah → JANGAN tebak. Jawab: "Arme gak yakin soal itu. Coba cek halaman [route relevan] langsung, di sana lebih lengkap."
3. Kalau ragu antara dua fakta — pilih yang paling konservatif (yang umum & verifikasi-able) atau bilang gak yakin.
4. Jangan extrapolate: "kalau Eli debut 2018, berarti dia tahun ini X tahun di JKT48" — boleh, itu math. TAPI jangan "Eli pasti nge-vlog tentang Y" — itu invent.
5. Lebih baik jawab "Arme gak punya info itu" daripada salah. Kepercayaan pengunjung lebih penting daripada terlihat tahu.
6. Default behavior: arahkan ke halaman situs (misal "/profile untuk timeline lengkap", "/schedule untuk jadwal", "/gallery untuk foto") daripada coba jawab detail dari memory.

═══ TENTANG ELI (Helisma Putri) ═══
- Nama lengkap: Helisma Mauludzunia Putri Kurnia. Stage name: Eli. Panggilan akrab: Ceu Eli.
- Lahir: 15 Juni 2000 di Bandung, Jawa Barat. Tahun ini (2026) ulang tahun ke-26.
- Generasi 7 JKT48. Lolos audisi 29 September 2018.
- Sekarang: Team Dream (JKT48 Fight 2026). MASIH ANGGOTA AKTIF — bukan graduated.
- Catchphrase: "Bagai Lembayung Senja, Dengan Energi Kegembiraan ku aku akan menghangatkan suasana."
- Julukan: "The Lovely Mermaid", "Sang Mermaid dari Bandung".
- Kuliah Sastra Korea.

Sosial Eli:
- X: @H_EliJKT48 · Instagram: @jkt48.eli · TikTok: @elijkt48
- IDN Live: jkt48_eli (aktif streaming di sini)
- SHOWROOM: JKT48_Eli (jarang aktif; Eli lebih sering di IDN Live)

Milestone karier Eli (pakai info ini buat jawab pertanyaan timeline):
- 29 Sep 2018: Lolos audisi Gen 7
- 16 Des 2018: Debut theater di "Theater no Megami"
- 21 Jul 2019: Promosi ke Team KIII
- 15 Des 2019: 100 show theater ("Saka Agari")
- 22 Jan 2020: Senbatsu pertama di single "Rapsodi" (rank 15, 15.842 votes — single original pertama JKT48)
- 13 Mar 2021: Masuk formasi JKT48 New Era (sistem 3-tim dibubarkan)
- 20 Nov 2021: 200 show theater
- 7 Jul 2024: 300 show theater ("Ramune no Nomikata")
- 15 Des 2024: Undergirls di "Bibir yang Telah Dicuri" (Sousenkyo 2024, rank 22)
- Jul-Sep 2025: Program "Belajar Konseling" di JKT48 TV (9 episode sbg "Buna Eli", ngobrol sama trainee Gen 13)
- 12 Okt 2025: Shonichi setlist original "Pertaruhan Cinta"
- 20 Des 2025: Pengumuman sistem 3 tim baru di ICE BSD — Eli ke Team Dream
- 17 Jan 2026: JKT48 14th Anniversary, tagline "Fight!" resmi
- 1 Apr 2026: Resmi aktif sbg Team Dream
- 18 Apr 2026: Shonichi "Dream Bakudan" (setlist debut Team Dream)
- Per 26 Apr 2026: 385 show theater total. Menuju 400.

═══ TENTANG ARMENIACA (situs ini) ═══
- URL: https://armeniaca.online
- Tagline: #BloomInSpring
- Identitas: Arsip visual INDEPENDEN, bukan official JKT48. Dibangun oleh tim Armeniaca.
- Penerbit: Armeniaca (@armeniaca15 di X). Fanbase utama Eli: Helismiley (@helismiley_ofc).
- Nama "Armeniaca" = nama latin pohon aprikot (Prunus armeniaca). Mekar di akhir musim dingin → semangat "bloom in spring".
- Project utama: rangkaian perayaan ulang tahun ke-26 Eli (15 Juni 2026).

═══ HALAMAN & FITUR (rute & isi) ═══
- / (Home) — hero, profil singkat Eli, harmoni kebaikan hub, gallery preview
- /profile — profil lengkap (timeline, diskografi, sousenkyo, posisi di JKT48 Fight)
- /about — narasi "Sang Mermaid dari Bandung"
- /gallery — Memoria, 350+ foto Eli. Bisa filter per era (Gen 7 awal, Team K, Team J, Team Dream).
- /vivo — playlist IDN Live & SHOWROOM Eli
- /schedule — jadwal Eli di JKT48 + LiveCounter (auto-update dari jkt48.com API)
- /wishes — Wishes Wall, kirim ucapan ulang tahun (dimoderasi sebelum tampil)
- /countdown — hitung mundur ke 15 Juni 2026. Saat hari-H tiba, ada hadiah random (10 foto × 10 quotes = 100 kombinasi)
- /26 — Pohon Kebaikan, project inti. Setiap dukungan menyiram pohon — total dukungan kebuka petak-petak di ArmeniacaTown.
- /galeri-kebaikan — arsip donasi nyata atas nama Eli (lingkungan, satwa, kesehatan, kemanusiaan, pendidikan).
- /byu-music — page lagu By-U "Putri Helisma". Lagu titipan dari fans — bukan karya solo Eli. Auto-reveal player tanggal 15 Juni 2026.
- /armepack — Petikan, sistem kartu harian. Batch #1: "The Life of Armeniaca" (51 kartu, 3 kartu per pluck). Tier: muda/matang/langka/legenda.
- /armeniacaTown — kota interaktif 3D (kebuka di 2000 dukungan).
- /denyut — heartbeat website (visual presence pulse).

═══ ARMENIACA TOWN (petak interaktif) ═══
- /armeniacaTown — gerbang/padang tandus (kebuka selalu, peta locked sampai 2000)
- /armeniacaTown/peta — peta hub. UNLOCK di 2000 dukungan. Arme (kamu) tinggal di sini.
- /armeniacaTown/r1 (Lorong Pohon) — gersang <4000, restored ≥4000
- /armeniacaTown/r2 (Perpustakaan, dulu "Arsip Ingatan") — locked <5000, gersang 5000-6999, restored ≥7000
- /armeniacaTown/r3 (Telaga Harapan, dulu "Kolam Kata") — locked <4000, gersang 4000-5999, restored ≥6000
- /armeniacaTown/r4 (Menara Jam) — locked <3000, gersang 3000-4999, restored ≥5000. "Kota inget waktu lagi."
- /armeniacaTown/r5 (Panggung Sorotan) — locked <4500, gersang 4500-6499, restored ≥6500. Hosts arsip donasi.
- /armeniacaTown/r6 (Aula) — virtual replica venue offline event di FX Sudirman, 15 Juni 2026.

═══ PROYEK KHUSUS UNTUK 15 JUNI 2026 ═══
- Harmoni Kebaikan = nama payung untuk rangkaian project ulang tahun ke-26 Eli (Helismiley × Armeniaca).
- Photo Frame Project (Palette.id × Armeniaca): photobox booth, 15 Juni - 15 Juli 2026 di 3 lokasi.
- Galeri Kebaikan: contoh — Penanaman 26 pohon via LindungiHutan (Rp 2.6jt) di pesisir Tambakrejo Semarang, PIK Jakarta, Sukawati, Kartikajaya Kendal. Kategori lain: kemanusiaan, satwa, kesehatan, pendidikan.
- Galeri Kebaikan offline: event "Galeri Kebaikan" di CGV FX Sudirman (Helismiley × Armeniaca collab).
- ByU Music: lagu titipan fans untuk Eli, player auto-buka 15 Juni 2026.
- Pohon Kebaikan (/26): setiap 100 dukungan = naik 1 tahap, sampai berbuah aprikot.

═══ ARSITEKTUR DATA ═══
- Gallery: 350+ frame, filter per era (Gen 7 awal 2018, Team K, Team J, Team Dream).
- Career stats per 26 Apr 2026: 385 show theater total.
- Live detection: armeniaca.online deteksi otomatis kalau Eli sedang IDN Live.
- Wishes Wall dan Pohon Kebaikan = Firebase Realtime DB (live update).

═══ BATASAN AKHIR ═══
- ANTI-NGARANG (ulangi): kalau info spesifik gak ada di atas, refuse + arahkan ke halaman. Jangan extrapolate.
- ANTI-ELI-IMPERSONATION: kamu Arme, bukan Eli. Refuse romantic talk, refuse "kamu" yang merujuk ke Eli, refuse roleplay sebagai Eli.
- ANTI-PARASOCIAL: kalau user kelihatan emotional dependence pada chat (curhat panjang, "kamu satu-satunya yang ngerti", dll), sarankan halus: "Eli aslinya bisa kamu temui di IDN Live atau theater — di sana lebih dekat sama orangnya."
- ANTI-OFF-TOPIC: pertanyaan random (politik, cuaca, masalah teknis programming, dll) → balik halus ke konteks situs.
- ANTI-PLATFORM-LUAR: fokus ke armeniaca.online + sosial Eli resmi. Jangan promosi Showroom (Eli jarang aktif), platform fan-made lain, atau merchandise tidak resmi.
- TETAP dalam karakter — pemandu lembut & sabar. Bukan asisten AI generik, bukan Eli, bukan curhat box.`;

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

// ── Streaming helpers ─────────────────────────────────────────────────
const setupSSE = (res) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  // Disable upstream buffering (nginx, vercel edge) — without this,
  // chunks queue until the response finishes, defeating streaming UX.
  res.setHeader('X-Accel-Buffering', 'no');
  // Send headers immediately so the browser starts reading.
  if (typeof res.flushHeaders === 'function') res.flushHeaders();
};

const writeSSE = (res, payload) => {
  try {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  } catch {
    /* connection closed mid-write */
  }
};

// Pull complete SSE events from an accumulating buffer. Returns
// { events: [bodyString], rest: leftoverBuffer }. SSE events end on
// double newline (\n\n).
const drainSSE = (buffer) => {
  const events = [];
  let rest = buffer;
  let idx;
  while ((idx = rest.indexOf('\n\n')) >= 0) {
    const chunk = rest.slice(0, idx);
    rest = rest.slice(idx + 2);
    // Each event may have multiple `data:` lines — concatenate them
    // per SSE spec, ignore others (event:, id:, retry:).
    const dataLines = chunk
      .split('\n')
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).trimStart());
    if (dataLines.length) events.push(dataLines.join('\n'));
  }
  return { events, rest };
};

// ── Gemini (Google AI Studio) ────────────────────────────────────────
// Native API shape — separate `systemInstruction`, `contents` array with
// 'user'|'model' roles (not 'assistant'), each turn wrapped in `parts`.
const callGemini = async (apiKey, messages) => {
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
    apiKey,
  )}`;
  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: {
        maxOutputTokens: MAX_TOKENS,
        // Lower temp — Arme is a factual wayfinder, not a creative
        // writer. Reduces confabulation when user asks for specifics
        // not in the system prompt.
        temperature: 0.4,
        topP: 0.85,
        // Disable thinking — Arme's chat is casual Q&A, not reasoning.
        // Without this, Gemini 2.5 Flash spends most of maxOutputTokens
        // on hidden thought tokens and truncates the visible reply.
        thinkingConfig: { thinkingBudget: 0 },
      },
      // Loosen safety thresholds — Arme's domain is wholesome (idol
      // fan archive) but Gemini's default HARM_BLOCK_MEDIUM can over-
      // trigger on Indonesian casual phrasing.
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    }),
  });
  if (!upstream.ok) {
    const text = await upstream.text().catch(() => '');
    return { ok: false, status: upstream.status, body: text.slice(0, 800) };
  }
  const data = await upstream.json();
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!reply) {
    return {
      ok: false,
      status: 502,
      body: `empty: ${JSON.stringify(data).slice(0, 400)}`,
    };
  }
  return {
    ok: true,
    reply,
    provider: 'gemini',
    model: GEMINI_MODEL,
    usage: data.usageMetadata,
  };
};

// Streaming variant — uses :streamGenerateContent + alt=sse. Pipes each
// delta to the client as SSE. Returns true on full success, false if
// the upstream errored before producing any tokens (lets the caller try
// the next provider). Once any token has been written we stay committed
// to this provider — switching mid-stream would mangle output.
const streamGemini = async (apiKey, messages, res, ctx) => {
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${encodeURIComponent(
    apiKey,
  )}`;
  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: {
        maxOutputTokens: MAX_TOKENS,
        temperature: 0.4,
        topP: 0.85,
        thinkingConfig: { thinkingBudget: 0 },
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    }),
  });
  if (!upstream.ok) {
    const text = await upstream.text().catch(() => '');
    ctx.errors.push(`gemini ${upstream.status}: ${text.slice(0, 400)}`);
    return false;
  }
  let buf = '';
  let wroteAny = false;
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const { events, rest } = drainSSE(buf);
    buf = rest;
    for (const payload of events) {
      try {
        const obj = JSON.parse(payload);
        const delta = obj?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (delta) {
          if (!wroteAny) {
            wroteAny = true;
            writeSSE(res, { provider: 'gemini', model: GEMINI_MODEL });
          }
          writeSSE(res, { delta });
        }
      } catch {
        /* skip malformed line */
      }
    }
  }
  return wroteAny;
};

// ── Groq (Llama 3.3 70B via OpenAI-compatible API) ────────────────────
// Independent infra, ~14400 RPD per key, very fast inference. Sits in
// the middle of the fallback chain — if Gemini errors, Groq usually
// answers before we even need to touch OpenRouter.
const callGroq = async (apiKey, messages) => {
  const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0.4,
      top_p: 0.85,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    }),
  });
  if (!upstream.ok) {
    const text = await upstream.text().catch(() => '');
    return { ok: false, status: upstream.status, body: text.slice(0, 800) };
  }
  const data = await upstream.json();
  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    return {
      ok: false,
      status: 502,
      body: `empty: ${JSON.stringify(data).slice(0, 400)}`,
    };
  }
  return {
    ok: true,
    reply,
    provider: 'groq',
    model: data.model || GROQ_MODEL,
    usage: data.usage,
  };
};

// Streaming variant — OpenAI-compatible SSE. `data: {...}\n\n` chunks
// ending with `data: [DONE]\n\n`.
const streamOpenAICompat = async (url, apiKey, body, providerName, res, ctx, extraHeaders = {}) => {
  const upstream = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({ ...body, stream: true }),
  });
  if (!upstream.ok) {
    const text = await upstream.text().catch(() => '');
    ctx.errors.push(`${providerName} ${upstream.status}: ${text.slice(0, 400)}`);
    return false;
  }
  let buf = '';
  let wroteAny = false;
  let modelSeen = null;
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const { events, rest } = drainSSE(buf);
    buf = rest;
    for (const payload of events) {
      if (payload === '[DONE]') continue;
      try {
        const obj = JSON.parse(payload);
        if (!modelSeen && obj?.model) modelSeen = obj.model;
        const delta = obj?.choices?.[0]?.delta?.content;
        if (delta) {
          if (!wroteAny) {
            wroteAny = true;
            writeSSE(res, { provider: providerName, model: modelSeen || body.model });
          }
          writeSSE(res, { delta });
        }
      } catch {
        /* skip malformed */
      }
    }
  }
  return wroteAny;
};

const streamGroq = (apiKey, messages, res, ctx) =>
  streamOpenAICompat(
    'https://api.groq.com/openai/v1/chat/completions',
    apiKey,
    {
      model: GROQ_MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0.4,
      top_p: 0.85,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    },
    'groq',
    res,
    ctx,
  );

const streamOpenRouter = (apiKey, messages, res, ctx) =>
  streamOpenAICompat(
    'https://openrouter.ai/api/v1/chat/completions',
    apiKey,
    {
      model: OPENROUTER_MODELS[0],
      models: OPENROUTER_MODELS,
      max_tokens: MAX_TOKENS,
      temperature: 0.4,
      top_p: 0.85,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    },
    'openrouter',
    res,
    ctx,
    { 'HTTP-Referer': 'https://armeniaca.online', 'X-Title': 'Armeniaca Arme Chat' },
  );

// ── OpenRouter (Kimi + fallback chain) ───────────────────────────────
const callOpenRouter = async (apiKey, messages) => {
  const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://armeniaca.online',
      'X-Title': 'Armeniaca Arme Chat',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODELS[0],
      models: OPENROUTER_MODELS,
      max_tokens: MAX_TOKENS,
      temperature: 0.4,
      top_p: 0.85,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    }),
  });
  if (!upstream.ok) {
    const text = await upstream.text().catch(() => '');
    return { ok: false, status: upstream.status, body: text.slice(0, 800) };
  }
  const data = await upstream.json();
  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    return {
      ok: false,
      status: 502,
      body: `empty: ${JSON.stringify(data).slice(0, 400)}`,
    };
  }
  return {
    ok: true,
    reply,
    provider: 'openrouter',
    model: data.model || OPENROUTER_MODELS[0],
    usage: data.usage,
  };
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const geminiKey = process.env.GOOGLE_AI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (!geminiKey && !groqKey && !openrouterKey) {
    return res.status(500).json({ error: 'server tidak terkonfigurasi' });
  }

  const messages = sanitizeMessages(req.body?.messages);
  if (messages.length === 0) {
    return res.status(400).json({ error: 'messages kosong' });
  }
  if (messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'pesan terakhir harus dari user' });
  }

  const errors = [];
  const dev = process.env.NODE_ENV !== 'production';
  const wantStream = req.body?.stream === true;

  // ── Streaming path ──────────────────────────────────────────────
  if (wantStream) {
    setupSSE(res);
    const ctx = { errors };
    try {
      if (geminiKey && (await streamGemini(geminiKey, messages, res, ctx))) {
        writeSSE(res, { done: true });
        return res.end();
      }
      if (groqKey && (await streamGroq(groqKey, messages, res, ctx))) {
        writeSSE(res, { done: true });
        return res.end();
      }
      if (openrouterKey && (await streamOpenRouter(openrouterKey, messages, res, ctx))) {
        writeSSE(res, { done: true });
        return res.end();
      }
    } catch (err) {
      ctx.errors.push(`stream threw: ${err?.message || err}`);
      console.error('[arme-chat] stream threw', err);
    }
    console.error('[arme-chat] all providers failed stream', ctx.errors);
    const errPayload = { error: 'Arme gak bisa nyambung. Coba lagi nanti.' };
    if (dev) errPayload.detail = ctx.errors.join(' | ');
    writeSSE(res, errPayload);
    writeSSE(res, { done: true });
    return res.end();
  }

  // ── Non-streaming JSON path (legacy / fallback) ─────────────────
  // Try Gemini first (personal quota, more reliable).
  if (geminiKey) {
    try {
      const r = await callGemini(geminiKey, messages);
      if (r.ok) {
        return res.status(200).json({
          reply: r.reply,
          provider: r.provider,
          model: r.model,
          usage: r.usage,
        });
      }
      errors.push(`gemini ${r.status}: ${r.body}`);
      console.error('[arme-chat] gemini failed', r.status, r.body);
    } catch (err) {
      errors.push(`gemini threw: ${err?.message || err}`);
      console.error('[arme-chat] gemini threw', err);
    }
  }

  // Try Groq next — independent infra, very fast, big free tier.
  if (groqKey) {
    try {
      const r = await callGroq(groqKey, messages);
      if (r.ok) {
        return res.status(200).json({
          reply: r.reply,
          provider: r.provider,
          model: r.model,
          usage: r.usage,
        });
      }
      errors.push(`groq ${r.status}: ${r.body}`);
      console.error('[arme-chat] groq failed', r.status, r.body);
    } catch (err) {
      errors.push(`groq threw: ${err?.message || err}`);
      console.error('[arme-chat] groq threw', err);
    }
  }

  // Fall back to OpenRouter chain.
  if (openrouterKey) {
    try {
      const r = await callOpenRouter(openrouterKey, messages);
      if (r.ok) {
        return res.status(200).json({
          reply: r.reply,
          provider: r.provider,
          model: r.model,
          usage: r.usage,
        });
      }
      errors.push(`openrouter ${r.status}: ${r.body}`);
      console.error('[arme-chat] openrouter failed', r.status, r.body);
      // Surface rate-limit as 429 even though we tried fallback — the
      // user-friendly message stays the same in widget UX either way.
      if (r.status === 429) {
        const body = {
          error: 'Arme lagi capek (rate limit). Coba lagi sebentar lagi ya.',
        };
        if (dev) body.detail = errors.join(' | ');
        return res.status(429).json(body);
      }
    } catch (err) {
      errors.push(`openrouter threw: ${err?.message || err}`);
      console.error('[arme-chat] openrouter threw', err);
    }
  }

  const body = { error: 'Arme gak bisa nyambung. Coba lagi nanti.' };
  if (dev) body.detail = errors.join(' | ');
  return res.status(502).json(body);
}
