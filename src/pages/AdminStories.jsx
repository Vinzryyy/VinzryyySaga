/**
 * /admin/cerita — moderation queue for Cerita Penggemar.
 *
 * Same daily password as /admin/jadwal (checked by /api/fan-stories). The
 * password lives only in this page's memory (React state) and is forwarded
 * with each request; nothing is written to storage.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { STORY_MAX, formatStoryDate, postStoryApi, storyLength, validateStory } from '../lib/fanStory';

const HARI_WIB = new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' });

const inputCls =
  'w-full px-3 py-2 rounded-lg bg-white border border-[color:var(--retro-brown-dark)]/15 focus:border-[color:var(--retro-burgundy)]/50 focus:ring-2 focus:ring-[color:var(--retro-burgundy)]/15 focus:outline-none text-sm text-[color:var(--retro-text-primary)]';
const labelCls = 'block text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--retro-text-muted)] mb-1.5';
const btnPrimary =
  'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] text-xs font-black uppercase tracking-[0.15em] hover:opacity-90 disabled:opacity-40 transition-opacity';
const btnGhost =
  'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-[color:var(--retro-brown-dark)]/15 text-xs font-bold text-[color:var(--retro-text-secondary)] hover:border-[color:var(--retro-burgundy)]/40 hover:text-[color:var(--retro-burgundy)] disabled:opacity-40 transition-colors';

const Shell = ({ children }) => (
  <main className="relative bg-[color:var(--retro-bg-primary)] min-h-screen pt-28 md:pt-32 pb-20 px-4 sm:px-6 md:px-12">
    <title>Admin Cerita · Armeniaca</title>
    <meta name="robots" content="noindex, nofollow" />
    <div className="max-w-3xl mx-auto">
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-2 inline-flex items-center gap-2">
        <i className="ri-lock-line" /> Admin
      </p>
      <h1 className="font-header text-4xl md:text-5xl font-black tracking-tighter text-[color:var(--retro-text-primary)] mb-8">
        Cerita Penggemar
      </h1>
      {children}
    </div>
  </main>
);

const PendingItem = ({ item, busy, onApprove, onReject }) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [story, setStory] = useState(item.story);
  const [confirmReject, setConfirmReject] = useState(false);
  const [error, setError] = useState(null);

  const approve = () => {
    if (!editing) return onApprove(item.id);
    const { error: invalid } = validateStory({ name, story, moment: item.moment, momentLabel: item.momentLabel });
    if (invalid) {
      setError(invalid);
      return undefined;
    }
    setError(null);
    const edits = {};
    if (name !== item.name) edits.name = name;
    if (story !== item.story) edits.story = story;
    return onApprove(item.id, Object.keys(edits).length ? edits : undefined);
  };

  return (
    <li className="rounded-2xl border border-[color:var(--retro-brown-dark)]/10 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--retro-text-muted)] mb-2">
        <span className="font-bold text-[color:var(--retro-text-primary)]">{item.name}</span>
        <span>{formatStoryDate(item.createdAt)}</span>
        {item.moment && (
          <span className="inline-flex items-center gap-1 text-[color:var(--retro-burgundy)]">
            <i className="ri-camera-line" /> {item.momentLabel || item.moment}
          </span>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <label className="block">
            <span className={labelCls}>Nama</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>Cerita · {storyLength(story)}/{STORY_MAX}</span>
            <textarea value={story} rows={6} onChange={(e) => setStory(e.target.value)} className={`${inputCls} resize-y leading-relaxed`} />
          </label>
        </div>
      ) : (
        <p className="whitespace-pre-line break-words text-sm leading-relaxed text-[color:var(--retro-text-primary)]">{item.story}</p>
      )}

      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy} onClick={approve} className={btnPrimary}>
          <i className="ri-check-line" /> {editing ? 'Simpan & setujui' : 'Setujui'}
        </button>
        <button
          type="button"
          disabled={busy}
          className={btnGhost}
          onClick={() => {
            if (editing) {
              setName(item.name);
              setStory(item.story);
              setError(null);
            }
            setEditing(!editing);
          }}
        >
          <i className={editing ? 'ri-arrow-go-back-line' : 'ri-pencil-line'} /> {editing ? 'Batal edit' : 'Edit dulu'}
        </button>
        {confirmReject ? (
          <span className="inline-flex gap-1">
            <button type="button" disabled={busy} className="px-3 py-2 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.1em]" onClick={() => onReject(item.id)}>
              Tolak
            </button>
            <button type="button" className="px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em] text-[color:var(--retro-text-muted)]" onClick={() => setConfirmReject(false)}>
              Batal
            </button>
          </span>
        ) : (
          <button type="button" disabled={busy} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-[color:var(--retro-brown-dark)]/15 text-xs font-bold text-[color:var(--retro-text-secondary)] hover:border-red-300 hover:text-red-600 disabled:opacity-40 transition-colors" onClick={() => setConfirmReject(true)}>
            <i className="ri-close-line" /> Tolak
          </button>
        )}
      </div>
    </li>
  );
};

const AdminStoriesPage = () => {
  const [password, setPassword] = useState(null); // set once unlocked
  const [pwInput, setPwInput] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [pending, setPending] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [status, setStatus] = useState(null); // { tone, text }

  const lock = () => {
    setPassword(null);
    setPending([]);
  };

  // A 401 mid-session means the WIB day rolled over — lock again.
  const handleApiError = (err, prefix) => {
    if (err.status === 401) {
      lock();
      setStatus({ tone: 'error', text: 'Hari sudah berganti — masukkan password hari ini.' });
      return;
    }
    setStatus({ tone: 'error', text: `${prefix}: ${err.message}` });
  };

  const unlock = async (e) => {
    e.preventDefault();
    setUnlocking(true);
    setStatus(null);
    try {
      const j = await postStoryApi({ action: 'list_pending', password: pwInput });
      setPending(j.stories || []);
      setPassword(pwInput);
      setPwInput('');
    } catch (err) {
      setStatus({ tone: 'error', text: err.message });
    } finally {
      setUnlocking(false);
    }
  };

  const refresh = async () => {
    try {
      const j = await postStoryApi({ action: 'list_pending', password });
      setPending(j.stories || []);
      setStatus(null);
    } catch (err) {
      handleApiError(err, 'Gagal memuat');
    }
  };

  const act = async (id, body, okText, prefix) => {
    setBusyId(id);
    try {
      await postStoryApi({ ...body, password, id });
      setPending((list) => list.filter((s) => s.id !== id));
      setStatus({ tone: 'ok', text: okText });
    } catch (err) {
      handleApiError(err, prefix);
    } finally {
      setBusyId(null);
    }
  };

  const onApprove = (id, edits) =>
    act(id, { action: 'approve', ...(edits ? { edits } : {}) }, 'Cerita disetujui — sekarang tampil di /cerita.', 'Gagal menyetujui');
  const onReject = (id) => act(id, { action: 'reject' }, 'Cerita ditolak dan dihapus dari antrean.', 'Gagal menolak');

  if (!password) {
    return (
      <Shell>
        <div className="rounded-2xl border border-[color:var(--retro-brown-dark)]/10 bg-white p-6 md:p-8">
          <p className="font-bold text-[color:var(--retro-text-primary)] mb-2 inline-flex items-center gap-2">
            <i className="ri-lock-password-line text-[color:var(--retro-burgundy)]" /> Khusus admin
          </p>
          <form onSubmit={unlock} className="space-y-3 max-w-sm">
            <label className="block">
              <span className={labelCls}>Password hari {HARI_WIB.format(new Date())}</span>
              <input type="password" autoComplete="current-password" required value={pwInput}
                onChange={(e) => setPwInput(e.target.value)} className={inputCls} />
            </label>
            <button type="submit" disabled={unlocking || !pwInput} className={btnPrimary}>
              <i className="ri-lock-unlock-line" /> {unlocking ? 'Memeriksa…' : 'Buka'}
            </button>
            {status && <p className="text-red-700 text-sm">{status.text}</p>}
          </form>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 text-xs text-[color:var(--retro-text-muted)]">
        <span>Password hari {HARI_WIB.format(new Date())} · terbuka</span>
        <span className="inline-flex flex-wrap gap-2">
          <button type="button" className={btnGhost} onClick={refresh}><i className="ri-refresh-line" /> Muat ulang</button>
          <Link to="/cerita" className={btnGhost}><i className="ri-external-link-line" /> Lihat situs</Link>
          <button type="button" className={btnGhost} onClick={() => { lock(); setStatus(null); }}>Kunci</button>
        </span>
      </div>

      {status && (
        <div role="status" className={`mb-6 rounded-lg px-4 py-3 text-sm ${status.tone === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
          {status.text}
        </div>
      )}

      <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-text-muted)] mb-3">
        Menunggu dibaca · {pending.length}
      </h2>
      {pending.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[color:var(--retro-brown-dark)]/20 p-6 text-sm text-[color:var(--retro-text-secondary)]">
          Antrean kosong. Semua cerita sudah dibaca.
        </p>
      ) : (
        <ul className="space-y-3">
          {pending.map((item) => (
            <PendingItem key={item.id} item={item} busy={busyId === item.id} onApprove={onApprove} onReject={onReject} />
          ))}
        </ul>
      )}
    </Shell>
  );
};

export default AdminStoriesPage;
