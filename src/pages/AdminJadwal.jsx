/**
 * /admin/jadwal — private page for adding Eli's schedule.
 *
 * Google sign-in; only accounts with RTDB /admins/{uid} === true can save
 * (enforced by database.rules.json, not just this UI). Entries go to
 * RTDB /eli_schedule and appear on the public site immediately via
 * scheduleSource.js. Setup steps: docs/admin-jadwal.md.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { isFirebaseConfigured } from '../lib/firebase';
import { signInWithGoogle, signOutAdmin, subscribeToAuth } from '../lib/firebaseAuth';
import { deleteEntry, isAdmin, saveEntry, subscribeToSchedule } from '../lib/scheduleAdminDb';
import { normalizeManualEvent } from '../lib/scheduleSource';
import { dayKeyWIB } from '../utils/calendar';
import { SITE_CONFIG } from '../config/siteConfig';

const TYPES = [
  { id: 'show', label: 'Show Teater', icon: 'ri-mic-line', kind: 'SHOW', time: '19:00' },
  { id: 'mg', label: '2Shot / M&G', icon: 'ri-user-heart-line', kind: 'EXCLUSIVE', category: 'TWO_SHOT', time: '13:00' },
  { id: 'vc', label: 'Video Call', icon: 'ri-vidicon-line', kind: 'EVENT', is_video_call: true, time: '20:00' },
  { id: 'event', label: 'Event / Off-site', icon: 'ri-map-pin-line', kind: 'GENERAL', time: '15:00' },
];

const typeOf = (e) => {
  if (e.is_video_call || e.category === 'DIGITAL_PHOTOBOOK') return 'vc';
  if (e.kind === 'EXCLUSIVE') return 'mg';
  if (e.kind === 'GENERAL' || e.kind === 'EVENT') return 'event';
  return 'show';
};

const emptyForm = (typeId = 'show') => {
  const t = TYPES.find((x) => x.id === typeId);
  return {
    type: typeId,
    title: '',
    date: dayKeyWIB(new Date()),
    start_time: t.time,
    end_time: '',
    category: t.category || '',
    venue: '',
    url: '',
    is_birthday_show: false,
    unit_song: '',
    position: '',
    partner: '',
    note: '',
  };
};

const formToEntry = (f) => {
  const t = TYPES.find((x) => x.id === f.type);
  return {
    kind: t.kind,
    title: f.title,
    date: f.date,
    start_time: f.start_time,
    end_time: f.end_time,
    category: t.kind === 'EXCLUSIVE' ? f.category || 'TWO_SHOT' : '',
    is_video_call: !!t.is_video_call,
    venue: f.venue,
    url: f.url,
    is_birthday_show: f.type === 'show' && f.is_birthday_show,
    unit_song: f.type === 'show' ? f.unit_song : '',
    position: f.type === 'show' ? f.position : '',
    partner: f.type === 'show' ? f.partner : '',
    note: f.note,
  };
};

const entryToForm = (e) => ({ ...emptyForm(typeOf(e)), ...e, type: typeOf(e), is_birthday_show: !!e.is_birthday_show });

const dateFmt = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const fmtDate = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return dateFmt.format(new Date(Date.UTC(y, m - 1, d)));
};
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/** TSV rows (scripts/eli-show-log.tsv format) for aired shows after the log ends. */
const buildTsv = (entries, showLog) => {
  const logEnd = showLog?.asOfDate || '0000-00-00';
  const careerEnd = SITE_CONFIG.eli?.careerStats?.asOfDate || logEnd;
  const careerTotal = SITE_CONFIG.eli?.careerStats?.theater ?? showLog?.totalShows ?? 0;
  const today = dayKeyWIB(new Date());
  let n = careerTotal;
  return entries
    .filter((e) => e.kind === 'SHOW' && e.date > logEnd && e.date <= today)
    .sort((a, b) => (a.date + (a.start_time || '')).localeCompare(b.date + (b.start_time || '')))
    .map((e) => {
      // Shows after the weekly total's date can be numbered; earlier
      // backfilled ones need their number checked against the recap.
      const no = e.date > careerEnd ? String((n += 1)) : '?';
      const [y, m, d] = e.date.split('-');
      const hari = HARI[new Date(Date.UTC(+y, +m - 1, +d)).getUTCDay()];
      return [no, hari, `${d}/${m}/${y}`, e.title, e.unit_song || '', e.position || '', e.partner || '', '', e.note || ''].join('\t');
    });
};

const inputCls =
  'w-full px-3 py-2 rounded-lg bg-white border border-[color:var(--retro-brown-dark)]/15 focus:border-[color:var(--retro-burgundy)]/50 focus:ring-2 focus:ring-[color:var(--retro-burgundy)]/15 focus:outline-none text-sm text-[color:var(--retro-text-primary)]';
const labelCls = 'block text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--retro-text-muted)] mb-1.5';
const btnPrimary =
  'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] text-xs font-black uppercase tracking-[0.15em] hover:opacity-90 disabled:opacity-40 transition-opacity';
const btnGhost =
  'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-[color:var(--retro-brown-dark)]/15 text-xs font-bold text-[color:var(--retro-text-secondary)] hover:border-[color:var(--retro-burgundy)]/40 hover:text-[color:var(--retro-burgundy)] transition-colors';

const Shell = ({ children }) => (
  <main className="relative bg-[color:var(--retro-bg-primary)] min-h-screen pt-28 md:pt-32 pb-20 px-5 sm:px-6 md:px-12">
    <title>Admin Jadwal · Armeniaca</title>
    <meta name="robots" content="noindex, nofollow" />
    <div className="max-w-5xl mx-auto">
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-2 inline-flex items-center gap-2">
        <i className="ri-lock-line" /> Admin
      </p>
      <h1 className="font-header text-4xl md:text-5xl font-black tracking-tighter text-[color:var(--retro-text-primary)] mb-8">
        Jadwal Eli
      </h1>
      {children}
    </div>
  </main>
);

const Notice = ({ icon, title, children }) => (
  <div className="rounded-2xl border border-[color:var(--retro-brown-dark)]/10 bg-white p-6 md:p-8">
    <p className="font-bold text-[color:var(--retro-text-primary)] mb-2 inline-flex items-center gap-2">
      <i className={`${icon} text-[color:var(--retro-burgundy)]`} /> {title}
    </p>
    <div className="text-sm text-[color:var(--retro-text-secondary)] space-y-3">{children}</div>
  </div>
);

const AdminJadwalPage = () => {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [admin, setAdmin] = useState(null);
  const [entries, setEntries] = useState([]);
  const [showLog, setShowLog] = useState(null);
  const [form, setForm] = useState(() => emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState(null); // { tone, text }
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => subscribeToAuth((u) => {
    setUser(u);
    setAdmin(null);
    if (u) isAdmin(u.uid).then(setAdmin);
  }), []);

  useEffect(() => {
    if (!admin) return undefined;
    return subscribeToSchedule(setEntries, (err) => setStatus({ tone: 'error', text: `Gagal memuat: ${err.message}` }));
  }, [admin]);

  useEffect(() => {
    fetch('/data/eli-show-log.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setShowLog)
      .catch(() => {});
  }, []);

  const setlists = useMemo(() => {
    const fromLog = (showLog?.setlists || []).map((s) => s.setlist);
    const fromEntries = entries.filter((e) => e.kind === 'SHOW').map((e) => e.title);
    return [...new Set([...fromEntries.reverse(), ...fromLog])];
  }, [showLog, entries]);
  const quickSetlists = setlists.slice(0, 4);

  const today = dayKeyWIB(new Date());
  const sorted = useMemo(
    () => [...entries].sort((a, b) => (a.date + (a.start_time || '')).localeCompare(b.date + (b.start_time || ''))),
    [entries],
  );
  const upcoming = sorted.filter((e) => e.date >= today);
  const past = sorted.filter((e) => e.date < today).reverse();
  const tsvRows = useMemo(() => buildTsv(entries, showLog), [entries, showLog]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const pickType = (typeId) => {
    const t = TYPES.find((x) => x.id === typeId);
    setForm((f) => ({ ...f, type: typeId, start_time: f.start_time || t.time, category: t.category || '' }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const entry = formToEntry(form);
    const { error } = normalizeManualEvent(entry);
    if (error) {
      setStatus({ tone: 'error', text: `Belum valid: ${error}` });
      return;
    }
    setSaving(true);
    try {
      await saveEntry(entry, editingId);
      setStatus({ tone: 'ok', text: editingId ? 'Perubahan disimpan.' : 'Jadwal ditambahkan — langsung tampil di situs.' });
      setEditingId(null);
      setForm((f) => ({ ...emptyForm(f.type), date: f.date }));
    } catch (err) {
      setStatus({ tone: 'error', text: `Gagal menyimpan: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    try {
      await deleteEntry(id);
      setStatus({ tone: 'ok', text: 'Jadwal dihapus.' });
      if (editingId === id) {
        setEditingId(null);
        setForm(emptyForm());
      }
    } catch (err) {
      setStatus({ tone: 'error', text: `Gagal menghapus: ${err.message}` });
    } finally {
      setConfirmDelete(null);
    }
  };

  const copyTsv = async () => {
    try {
      await navigator.clipboard.writeText(tsvRows.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setStatus({ tone: 'error', text: 'Clipboard diblokir browser — salin manual dari kotak di bawah.' });
    }
  };

  if (!isFirebaseConfigured) {
    return (
      <Shell>
        <Notice icon="ri-plug-line" title="Firebase belum dikonfigurasi">
          <p>Set <code>VITE_FIREBASE_*</code> env vars (lihat <code>.env.example</code>) lalu jalankan ulang.</p>
        </Notice>
      </Shell>
    );
  }

  if (user === undefined || (user && admin === null)) {
    return (
      <Shell>
        <p className="text-sm text-[color:var(--retro-text-muted)]">Memeriksa akun…</p>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <Notice icon="ri-shield-user-line" title="Khusus admin">
          <p>Masuk dengan akun Google yang terdaftar sebagai admin.</p>
          <button type="button" className={btnPrimary} onClick={() => signInWithGoogle().catch((err) => setStatus({ tone: 'error', text: err.message }))}>
            <i className="ri-google-fill" /> Masuk dengan Google
          </button>
          {status && <p className="text-red-700">{status.text}</p>}
        </Notice>
      </Shell>
    );
  }

  if (!admin) {
    return (
      <Shell>
        <Notice icon="ri-error-warning-line" title="Akun ini belum jadi admin">
          <p>Masuk sebagai <strong>{user.email}</strong>. Untuk jadi admin, tambahkan UID ini di Firebase Console → Realtime Database → Data:</p>
          <pre className="rounded-lg bg-[color:var(--retro-bg-primary)] p-3 text-xs overflow-x-auto select-all">admins / {user.uid} = true</pre>
          <p>Lalu muat ulang halaman ini. Panduan lengkap: <code>docs/admin-jadwal.md</code>.</p>
          <button type="button" className={btnGhost} onClick={signOutAdmin}>Keluar</button>
        </Notice>
      </Shell>
    );
  }

  const isShow = form.type === 'show';

  const Row = ({ e }) => {
    const t = TYPES.find((x) => x.id === typeOf(e));
    return (
      <li className={`flex items-center gap-3 p-3 rounded-xl border bg-white ${editingId === e.id ? 'border-[color:var(--retro-burgundy)]' : 'border-[color:var(--retro-brown-dark)]/10'}`}>
        <i className={`${t.icon} text-lg text-[color:var(--retro-burgundy)] flex-shrink-0`} />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm text-[color:var(--retro-text-primary)] truncate">{e.title}</p>
          <p className="text-xs text-[color:var(--retro-text-muted)] tabular-nums">
            {fmtDate(e.date)}{e.start_time ? ` · ${e.start_time}` : ''}
            {e.unit_song ? ` · ${e.unit_song}` : ''}
            {e.position ? ` (${e.position}${e.partner ? ` w/ ${e.partner}` : ''})` : ''}
          </p>
        </div>
        <button type="button" aria-label={`Edit ${e.title}`} className="w-8 h-8 rounded-full hover:bg-[color:var(--retro-burgundy)]/10 text-[color:var(--retro-text-secondary)]" onClick={() => { setEditingId(e.id); setForm(entryToForm(e)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <i className="ri-pencil-line" />
        </button>
        {confirmDelete === e.id ? (
          <span className="inline-flex gap-1">
            <button type="button" className="px-2.5 py-1 rounded-full bg-red-600 text-white text-[10px] font-black uppercase" onClick={() => onDelete(e.id)}>Hapus</button>
            <button type="button" className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase text-[color:var(--retro-text-muted)]" onClick={() => setConfirmDelete(null)}>Batal</button>
          </span>
        ) : (
          <button type="button" aria-label={`Hapus ${e.title}`} className="w-8 h-8 rounded-full hover:bg-red-50 text-[color:var(--retro-text-secondary)] hover:text-red-600" onClick={() => setConfirmDelete(e.id)}>
            <i className="ri-delete-bin-line" />
          </button>
        )}
      </li>
    );
  };

  return (
    <Shell>
      <div className="flex items-center justify-between gap-3 mb-6 text-xs text-[color:var(--retro-text-muted)]">
        <span>Masuk sebagai {user.email}</span>
        <span className="inline-flex gap-2">
          <Link to="/schedule?view=calendar" className={btnGhost}><i className="ri-external-link-line" /> Lihat situs</Link>
          <button type="button" className={btnGhost} onClick={signOutAdmin}>Keluar</button>
        </span>
      </div>

      {status && (
        <div role="status" className={`mb-6 rounded-lg px-4 py-3 text-sm ${status.tone === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
          {status.text}
        </div>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-8 items-start">
        {/* ── Form ─────────────────────────────────────────── */}
        <form onSubmit={onSubmit} className="rounded-2xl bg-[color:var(--retro-cream)] border border-[color:var(--retro-burgundy)]/15 p-5 md:p-6 space-y-4">
          <h2 className="font-header text-2xl font-black tracking-tight">{editingId ? 'Edit jadwal' : 'Tambah jadwal'}</h2>

          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Jenis">
            {TYPES.map((t) => (
              <button key={t.id} type="button" role="radio" aria-checked={form.type === t.id} onClick={() => pickType(t.id)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${form.type === t.id ? 'bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] border-[color:var(--retro-burgundy)]' : 'bg-white border-[color:var(--retro-brown-dark)]/15 text-[color:var(--retro-text-secondary)]'}`}>
                <i className={t.icon} /> {t.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className={labelCls}>Tanggal (WIB)</span>
              <input type="date" required value={form.date} onChange={set('date')} className={inputCls} />
            </label>
            <label className="block"><span className={labelCls}>Jam mulai</span>
              <input type="time" value={form.start_time} onChange={set('start_time')} className={inputCls} />
            </label>
          </div>

          <label className="block"><span className={labelCls}>{isShow ? 'Setlist' : 'Judul'}</span>
            <input type="text" required maxLength={120} list={isShow ? 'setlist-options' : undefined} value={form.title} onChange={set('title')}
              placeholder={isShow ? 'mis. Dream Bakudan' : 'mis. Personal 2Shot (Sesi 2)'} className={inputCls} />
            <datalist id="setlist-options">{setlists.map((s) => <option key={s} value={s} />)}</datalist>
          </label>
          {isShow && quickSetlists.length > 0 && (
            <div className="flex flex-wrap gap-1.5 -mt-2">
              {quickSetlists.map((s) => (
                <button key={s} type="button" onClick={() => setForm((f) => ({ ...f, title: s }))}
                  className="px-2.5 py-1 rounded-full bg-white border border-[color:var(--retro-brown-dark)]/15 text-[11px] font-bold text-[color:var(--retro-text-secondary)] hover:border-[color:var(--retro-burgundy)]/40">
                  {s}
                </button>
              ))}
            </div>
          )}

          {isShow && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className={labelCls}>Unit song</span>
                  <input type="text" maxLength={80} value={form.unit_song} onChange={set('unit_song')} className={inputCls} />
                </label>
                <label className="block"><span className={labelCls}>Posisi</span>
                  <select value={form.position} onChange={set('position')} className={inputCls}>
                    <option value="">—</option><option>Center</option><option>Solo</option><option>Duo</option>
                  </select>
                </label>
              </div>
              <label className="block"><span className={labelCls}>Partner unit</span>
                <input type="text" maxLength={120} value={form.partner} onChange={set('partner')} placeholder="mis. Indah" className={inputCls} />
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_birthday_show} onChange={set('is_birthday_show')} /> Birthday show
              </label>
            </>
          )}

          {form.type === 'mg' && (
            <label className="block"><span className={labelCls}>Kategori</span>
              <select value={form.category} onChange={set('category')} className={inputCls}>
                <option value="TWO_SHOT">2Shot</option><option value="MEET_GREET">Meet &amp; Greet</option><option value="PHOTOCARD">Photocard</option>
              </select>
            </label>
          )}

          <details className="text-sm">
            <summary className="cursor-pointer text-xs font-bold text-[color:var(--retro-text-muted)]">Detail lain (opsional)</summary>
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className={labelCls}>Jam selesai</span>
                  <input type="time" value={form.end_time} onChange={set('end_time')} className={inputCls} />
                </label>
                <label className="block"><span className={labelCls}>Venue</span>
                  <input type="text" maxLength={120} value={form.venue} onChange={set('venue')} placeholder="otomatis" className={inputCls} />
                </label>
              </div>
              <label className="block"><span className={labelCls}>Link jkt48.com</span>
                <input type="url" maxLength={300} pattern="https://.*" value={form.url} onChange={set('url')} placeholder="https://jkt48.com/schedule/…" className={inputCls} />
              </label>
              <label className="block"><span className={labelCls}>Catatan (mis. kota, STS)</span>
                <input type="text" maxLength={200} value={form.note} onChange={set('note')} className={inputCls} />
              </label>
            </div>
          </details>

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving} className={btnPrimary}>
              <i className={editingId ? 'ri-save-line' : 'ri-add-line'} /> {saving ? 'Menyimpan…' : editingId ? 'Simpan' : 'Tambah'}
            </button>
            {editingId && (
              <button type="button" className={btnGhost} onClick={() => { setEditingId(null); setForm(emptyForm(form.type)); }}>Batal edit</button>
            )}
          </div>
        </form>

        {/* ── Lists ────────────────────────────────────────── */}
        <div className="space-y-8">
          <section>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)] mb-3">Mendatang · {upcoming.length}</h2>
            {upcoming.length ? <ul className="space-y-2">{upcoming.map((e) => <Row key={e.id} e={e} />)}</ul>
              : <p className="text-sm text-[color:var(--retro-text-muted)]">Belum ada jadwal mendatang.</p>}
          </section>
          <section>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-text-muted)] mb-3">Sudah lewat · {past.length}</h2>
            {past.length ? <ul className="space-y-2">{past.slice(0, 30).map((e) => <Row key={e.id} e={e} />)}</ul>
              : <p className="text-sm text-[color:var(--retro-text-muted)]">Belum ada.</p>}
          </section>

          {tsvRows.length > 0 && (
            <section className="rounded-2xl bg-white border border-[color:var(--retro-brown-dark)]/10 p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-text-muted)]">Baris show log · {tsvRows.length}</h2>
                <button type="button" className={btnGhost} onClick={copyTsv}><i className="ri-file-copy-line" /> {copied ? 'Tersalin' : 'Salin TSV'}</button>
              </div>
              <p className="text-xs text-[color:var(--retro-text-muted)] mb-2">
                Show yang sudah tampil setelah akhir <code>eli-show-log.tsv</code>. Tempel ke TSV lalu jalankan <code>parse-show-log.py</code>. Nomor “?” perlu dicek ke rekap mingguan.
              </p>
              <pre className="text-[11px] bg-[color:var(--retro-bg-primary)] rounded-lg p-3 overflow-x-auto select-all">{tsvRows.join('\n')}</pre>
            </section>
          )}
        </div>
      </div>
    </Shell>
  );
};

export default AdminJadwalPage;
