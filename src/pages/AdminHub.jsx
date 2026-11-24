/**
 * Admin hub at /admin/<secret key>: every admin tool and a map of the
 * site's data (where each JSON lives, what it holds, who updates it, and
 * a link to edit it on GitHub).
 *
 * The repo is public, so the key itself is never in the code: only its
 * SHA-256 (ADMIN_KEY_HASH). The page hashes the URL segment in the
 * browser; a wrong key shows the normal 404 page. To change the key,
 * generate a new one and replace the hash (see docs/data-files.md).
 *
 * The hub only links out. Writing still needs its own lock: the daily
 * password for /admin/jadwal and /admin/cerita, a GitHub login for edits,
 * and the Mac for EliRecorder.
 */

import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import NotFound from './NotFound';
import {
  ADMIN_TOOLS, BY, CONTENT_FILES, DATA_FILES, SECRETS, githubEdit, githubHistory, githubView,
} from '../data/adminData';

const ADMIN_KEY_HASH = '44e8065ac63df9addf5002dbf386db2667f2b40a102ffb216d755c60f5518ac4';

const sha256Hex = async (text) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

const TONES = {
  emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  sky: 'bg-sky-50 text-sky-800 border-sky-200',
  stone: 'bg-stone-100 text-stone-700 border-stone-200',
};

const linkCls =
  'inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[color:var(--retro-brown-dark)]/15 text-[11px] font-bold text-[color:var(--retro-text-secondary)] hover:border-[color:var(--retro-burgundy)]/40 hover:text-[color:var(--retro-burgundy)] transition-colors';
const h2Cls = 'text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-text-muted)] mb-3 mt-10';

/** Renders `code` spans for text between backticks. */
const Rich = ({ text }) =>
  String(text).split('`').map((part, i) => (i % 2 ? <code key={i} className="px-1 rounded bg-[color:var(--retro-brown-dark)]/5 text-[12px]">{part}</code> : part));

const ByBadge = ({ by }) => (
  <span title={BY[by].hint} className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-[0.12em] ${TONES[BY[by].tone]}`}>
    {BY[by].label}
  </span>
);

const FileRow = ({ f }) => {
  const editable = f.by === 'tangan' && !f.folder;
  const publicUrl = f.path.startsWith('public/') && !f.folder ? f.path.replace(/^public/, '') : null;
  return (
    <li className="rounded-2xl border border-[color:var(--retro-brown-dark)]/10 bg-white p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-2 mb-1.5">
        <h3 className="font-bold text-[color:var(--retro-text-primary)]">{f.title}</h3>
        <ByBadge by={f.by} />
      </div>
      <p className="font-mono text-[11px] break-all text-[color:var(--retro-burgundy)] mb-2">{f.path}</p>
      <p className="text-sm text-[color:var(--retro-text-secondary)] mb-1"><Rich text={f.what} /></p>
      <p className="text-xs text-[color:var(--retro-text-muted)] mb-3">{BY[f.by].hint}</p>
      <div className="flex flex-wrap gap-2">
        {editable && (
          <a href={githubEdit(f.path)} target="_blank" rel="noopener noreferrer"
            className={`${linkCls} !bg-[color:var(--retro-burgundy)] !text-[color:var(--retro-cream)] !border-transparent`}>
            <i className="ri-edit-line" /> Edit di GitHub
          </a>
        )}
        <a href={githubView(f.path)} target="_blank" rel="noopener noreferrer" className={linkCls}><i className="ri-github-line" /> Lihat</a>
        <a href={githubHistory(f.path)} target="_blank" rel="noopener noreferrer" className={linkCls}><i className="ri-history-line" /> Riwayat</a>
        {publicUrl && <a href={publicUrl} target="_blank" rel="noopener noreferrer" className={linkCls}><i className="ri-braces-line" /> JSON live</a>}
        {f.page && <Link to={f.page} className={linkCls}><i className="ri-external-link-line" /> Halaman</Link>}
      </div>
    </li>
  );
};

const AdminHubPage = () => {
  const { key } = useParams();
  const [state, setState] = useState('checking'); // checking | ok | no

  useEffect(() => {
    let alive = true;
    const k = String(key || '');
    if (k.length < 16 || k.length > 64 || !globalThis.crypto?.subtle) { setState('no'); return undefined; }
    sha256Hex(k).then((h) => alive && setState(h === ADMIN_KEY_HASH ? 'ok' : 'no'), () => alive && setState('no'));
    return () => { alive = false; };
  }, [key]);

  if (state === 'no') return <NotFound />;
  if (state === 'checking') return <main className="min-h-screen bg-[color:var(--retro-bg-primary)]" />;

  return (
    <main className="relative bg-[color:var(--retro-bg-primary)] min-h-screen pt-28 md:pt-32 pb-20 px-4 sm:px-6 md:px-12">
      <title>Admin · Armeniaca</title>
      <meta name="robots" content="noindex, nofollow" />
      <meta name="referrer" content="no-referrer" />
      <div className="max-w-4xl mx-auto">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-2 inline-flex items-center gap-2">
          <i className="ri-shield-keyhole-line" /> Admin · link rahasia
        </p>
        <h1 className="font-header text-4xl md:text-5xl font-black tracking-tighter text-[color:var(--retro-text-primary)] mb-3">
          Ruang Admin Armeniaca
        </h1>
        <p className="text-sm text-[color:var(--retro-text-secondary)] max-w-2xl">
          Semua alat admin dan peta data situs. Jangan bagikan link halaman ini. Mengedit tetap butuh kunci masing-masing:
          password harian untuk Jadwal dan Cerita, login GitHub untuk file, dan Mac untuk EliRecorder. Setiap editan di
          GitHub langsung jadi commit ke <b>main</b> dan tampil di situs 1–2 menit kemudian.
        </p>

        <h2 className={h2Cls}>Alat admin</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {ADMIN_TOOLS.map((t) => {
            const inner = (
              <>
                <i className={`${t.icon} text-xl text-[color:var(--retro-burgundy)]`} />
                <span>
                  <span className="block font-bold text-[color:var(--retro-text-primary)]">{t.title}</span>
                  <span className="block text-xs text-[color:var(--retro-text-secondary)]">{t.text}</span>
                </span>
              </>
            );
            const cls = 'flex gap-3 items-start rounded-2xl border border-[color:var(--retro-brown-dark)]/10 bg-white p-4 hover:border-[color:var(--retro-burgundy)]/40 transition-colors';
            return (
              <li key={t.title}>
                {t.to
                  ? <Link to={t.to} className={cls}>{inner}</Link>
                  : <a href={t.href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>}
              </li>
            );
          })}
        </ul>

        <h2 className={h2Cls}>Arti label</h2>
        <ul className="grid gap-2 sm:grid-cols-2 text-sm">
          {Object.entries(BY).map(([k, b]) => (
            <li key={k} className="flex items-start gap-2"><ByBadge by={k} /><span className="text-[color:var(--retro-text-secondary)]">{b.hint}</span></li>
          ))}
        </ul>

        <h2 className={h2Cls}>Data JSON · public/data ({DATA_FILES.length})</h2>
        <p className="text-xs text-[color:var(--retro-text-muted)] -mt-1 mb-3">Dibaca situs saat dibuka, di alamat <code>armeniaca.online/data/…</code>.</p>
        <ul className="space-y-3">{DATA_FILES.map((f) => <FileRow key={f.path} f={f} />)}</ul>

        <h2 className={h2Cls}>Konten di kode · src ({CONTENT_FILES.length})</h2>
        <p className="text-xs text-[color:var(--retro-text-muted)] -mt-1 mb-3">File JavaScript; ikut terbit saat deploy. Hati-hati dengan tanda kutip dan koma saat mengedit.</p>
        <ul className="space-y-3">{CONTENT_FILES.map((f) => <FileRow key={f.path} f={f} />)}</ul>

        <h2 className={h2Cls}>Rahasia (nama saja)</h2>
        <ul className="space-y-2">
          {SECRETS.map((s) => (
            <li key={s.name} className="rounded-xl border border-[color:var(--retro-brown-dark)]/10 bg-white px-4 py-3 text-sm">
              <code className="font-bold text-[color:var(--retro-burgundy)]">{s.name}</code>
              <span className="text-[color:var(--retro-text-muted)]"> · {s.where}</span>
              <p className="text-[color:var(--retro-text-secondary)] text-xs mt-0.5">{s.what}</p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
};

export default AdminHubPage;
