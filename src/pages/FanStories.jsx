/**
 * /cerita — Cerita Penggemar.
 *
 * Fans write a small memory about Eli; an admin reads every story first
 * (/admin/cerita) and only approved ones appear here. This is the
 * "koneksi, bukan sekadar konsumsi" part of docs/prinsip-armeniaca.md:
 * the archive holds the photos, fans hold the meaning.
 *
 * Linking from a moment: /cerita?moment=<slug>&label=<nama momen>
 * prefills the moment chip (removable).
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Seo from '../components/Seo';
import StoryCard from '../components/stories/StoryCard';
import {
  LABEL_MAX,
  MOMENT_RE,
  NAME_MAX,
  STORY_MAX,
  STORY_MIN,
  fetchStories,
  postStoryApi,
  storyLength,
  validateStory,
} from '../lib/fanStory';

const NAME_KEY = 'armeniaca_fs_name';
const CLIENT_KEY = 'armeniaca_fs_cid';

const readLocal = (key) => {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
};
const writeLocal = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode: just not remembered */
  }
};

/** Random per-browser id; the server stores only its hash. */
const getClientId = () => {
  let id = readLocal(CLIENT_KEY);
  if (!/^[A-Za-z0-9_-]{12,64}$/.test(id)) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    id = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    writeLocal(CLIENT_KEY, id);
  }
  return id;
};

const inputCls =
  'w-full px-3 py-2.5 rounded-xl bg-white border border-[color:var(--retro-brown-dark)]/15 focus:border-[color:var(--retro-burgundy)]/50 focus:ring-2 focus:ring-[color:var(--retro-burgundy)]/15 focus:outline-none text-sm text-[color:var(--retro-text-primary)]';
const labelCls = 'block text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--retro-text-muted)] mb-1.5';
const btnPrimary =
  'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] text-xs font-black uppercase tracking-[0.15em] hover:opacity-90 disabled:opacity-40 transition-opacity';

const momentFromParams = (params) => {
  const slug = params.get('moment') || '';
  if (!MOMENT_RE.test(slug)) return null;
  const label = (params.get('label') || '').replace(/\s+/g, ' ').trim().slice(0, LABEL_MAX);
  return { slug, label };
};

const StoryForm = ({ initialMoment, onSent }) => {
  const [name, setName] = useState(() => readLocal(NAME_KEY));
  const [story, setStory] = useState('');
  const [moment, setMoment] = useState(initialMoment);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const len = storyLength(story);
  const tooLong = len > STORY_MAX;

  const onSubmit = async (e) => {
    e.preventDefault();
    const { story: clean, error: invalid } = validateStory({
      name, story, moment: moment?.slug, momentLabel: moment?.label,
    });
    if (invalid) {
      setError(invalid);
      return;
    }
    setSending(true);
    setError(null);
    try {
      await postStoryApi({ action: 'submit', ...clean, clientId: getClientId() });
      writeLocal(NAME_KEY, clean.name);
      setStory('');
      onSent();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <label className="block">
        <span className={labelCls}>Nama panggilan</span>
        <input
          type="text"
          value={name}
          maxLength={NAME_MAX}
          autoComplete="nickname"
          onChange={(e) => setName(e.target.value)}
          placeholder="mis. Arme dari Bekasi"
          className={inputCls}
        />
      </label>

      <label className="block">
        <span className={labelCls}>Ceritamu</span>
        <textarea
          value={story}
          rows={6}
          onChange={(e) => setStory(e.target.value)}
          placeholder="Momen kecil yang kamu ingat tentang Eli: pertama kali nonton teater, obrolan singkat di 2Shot, lagu yang selalu mengingatkanmu padanya…"
          className={`${inputCls} resize-y min-h-[140px] leading-relaxed`}
        />
        <span
          aria-live="polite"
          className={`mt-1 block text-right text-xs tabular-nums ${tooLong ? 'text-red-700 font-bold' : 'text-[color:var(--retro-text-muted)]'}`}
        >
          {len < STORY_MIN ? `${len}/${STORY_MAX} · minimal ${STORY_MIN}` : `${len}/${STORY_MAX}`}
        </span>
      </label>

      {moment && (
        <div>
          <span className={labelCls}>Tentang momen</span>
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[color:var(--retro-burgundy)]/8 border border-[color:var(--retro-burgundy)]/20 pl-3 pr-1 py-1 text-xs font-bold text-[color:var(--retro-burgundy)]">
            <i className="ri-camera-line flex-shrink-0" />
            <span className="truncate">{moment.label || moment.slug}</span>
            <button
              type="button"
              onClick={() => setMoment(null)}
              aria-label="Hapus momen"
              className="w-6 h-6 flex-shrink-0 rounded-full hover:bg-[color:var(--retro-burgundy)]/15"
            >
              <i className="ri-close-line" />
            </button>
          </span>
        </div>
      )}

      <p className="rounded-xl bg-[color:var(--retro-cream)] border border-[color:var(--retro-gold)]/40 px-4 py-3 text-xs leading-relaxed text-[color:var(--retro-text-secondary)]">
        <i className="ri-shield-check-line text-[color:var(--retro-burgundy)]" /> Ceritamu dibaca dulu oleh admin sebelum tampil.
        Jangan tulis data pribadi (nomor HP, alamat).
      </p>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      <button type="submit" disabled={sending || tooLong} className={btnPrimary}>
        <i className="ri-quill-pen-line" /> {sending ? 'Mengirim…' : 'Kirim cerita'}
      </button>
    </form>
  );
};

const FanStories = () => {
  const [params] = useSearchParams();
  const [initialMoment] = useState(() => momentFromParams(params));
  const [stories, setStories] = useState(null); // null = loading
  const [loadError, setLoadError] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchStories({ limit: 50 })
      .then((list) => alive && setStories(list))
      .catch(() => {
        if (!alive) return;
        setLoadError(true);
        setStories([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[color:var(--retro-bg-primary)] pb-20">
      <Seo
        path="/cerita"
        title="Cerita Penggemar"
        description="Cerita-cerita kecil penggemar tentang Eli JKT48 (Helisma Putri): momen yang diingat, dibagikan, dan dibaca bersama di Armeniaca."
      />

      {/* Dark photo band so the light navbar stays readable. */}
      <header className="relative overflow-hidden pt-24 sm:pt-28 pb-10 px-4 sm:px-6">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'url(/archive/img-142.webp)', backgroundSize: 'cover', backgroundPosition: '50% 30%' }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, rgba(61,52,43,0.9) 0%, rgba(92,74,58,0.75) 55%, rgba(124,45,52,0.6) 100%)' }}
        />
        <div className="relative max-w-5xl mx-auto">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] inline-flex items-center gap-2 text-[color:var(--retro-gold-light)]">
            <i className="ri-chat-heart-line text-base" /> Dari penggemar
          </p>
          <h1 className="mt-2 font-header text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Cerita Penggemar
          </h1>
          <p className="mt-2 text-sm sm:text-base text-[color:var(--retro-cream)]/85 max-w-xl">
            Foto menyimpan momennya, cerita menyimpan rasanya. Bagikan kenangan kecilmu tentang Eli, dan baca kenangan teman-teman sesama penggemar.
          </p>
          <p className="mt-4 text-xs text-[color:var(--retro-cream)]/75 italic">
            &ldquo;Keep connect and keep being human.&rdquo; <span className="not-italic">— Indah</span>
          </p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <section aria-labelledby="fs-list" className="order-2 lg:order-1">
          <h2 id="fs-list" className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-text-muted)] mb-3">
            Cerita yang sudah dibagikan{stories?.length ? ` · ${stories.length}` : ''}
          </h2>

          {stories === null && (
            <ul className="space-y-3" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <li key={i} className="h-28 rounded-2xl bg-white/60 border border-[color:var(--retro-brown-dark)]/5 animate-pulse" />
              ))}
            </ul>
          )}

          {stories && stories.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[color:var(--retro-brown-dark)]/20 p-6 text-center">
              <i className="ri-quill-pen-line text-2xl text-[color:var(--retro-burgundy)]" />
              <p className="mt-2 font-bold text-[color:var(--retro-text-primary)]">
                {loadError ? 'Cerita belum bisa dimuat.' : 'Belum ada cerita di sini.'}
              </p>
              <p className="mt-1 text-sm text-[color:var(--retro-text-secondary)]">
                {loadError
                  ? 'Coba muat ulang halaman sebentar lagi.'
                  : 'Jadilah yang pertama. Momen sekecil apa pun berarti, kok.'}
              </p>
            </div>
          )}

          {stories && stories.length > 0 && (
            <ul className="space-y-3">
              {stories.map((s) => (
                <li key={s.id}>
                  <StoryCard story={s} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="fs-form" className="order-1 lg:order-2 lg:sticky lg:top-28">
          <div className="rounded-2xl bg-white border border-[color:var(--retro-brown-dark)]/12 shadow-sm p-5">
            <h2 id="fs-form" className="font-header text-xl font-black text-[color:var(--retro-text-primary)] inline-flex items-center gap-2">
              <i className="ri-quill-pen-line text-[color:var(--retro-burgundy)]" /> Tulis ceritamu
            </h2>
            {sent ? (
              <div className="mt-4 space-y-3" role="status">
                <p className="text-sm text-[color:var(--retro-text-primary)] leading-relaxed">
                  <i className="ri-heart-3-fill text-[color:var(--retro-burgundy)]" /> Terima kasih sudah berbagi. Ceritamu sudah kami terima dan akan tampil
                  setelah dibaca admin.
                </p>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="text-xs font-black uppercase tracking-[0.15em] text-[color:var(--retro-burgundy)] hover:underline"
                >
                  Tulis cerita lain
                </button>
              </div>
            ) : (
              <>
                <p className="mt-1 mb-4 text-xs text-[color:var(--retro-text-secondary)]">
                  Cukup beberapa kalimat. Tidak perlu sempurna, yang penting jujur.
                </p>
                <StoryForm initialMoment={initialMoment} onSent={() => setSent(true)} />
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default FanStories;
