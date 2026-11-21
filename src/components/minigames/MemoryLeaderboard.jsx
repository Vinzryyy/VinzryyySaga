import React, { useCallback, useEffect, useState } from 'react';
import { NAME_MAX, NAME_RE, formatDuration, maskName } from '../../lib/memoryGame';

const NAME_KEY = 'armeniaca_mg_name';
const CLIENT_KEY = 'armeniaca_mg_cid';
const SHOW = 10;

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

/** Random per-browser id: one leaderboard row per browser per day. */
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

const medal = ['ri-medal-fill text-[#C8952A]', 'ri-medal-fill text-[#9AA3AD]', 'ri-medal-fill text-[#B07A4A]'];

/**
 * Daily ranking for mode Harian. Shows today's top 10 for the level and,
 * after a finished daily game (`submission`), lets the player send it.
 * The server replays the flip log, so the numbers shown are the server's.
 */
const MemoryLeaderboard = ({ level, levelLabel, dateLabel, submission }) => {
  const [data, setData] = useState(null); // { entries, total }
  const [loadError, setLoadError] = useState(false);
  const [name, setName] = useState(() => readLocal(NAME_KEY));
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null); // { rank, total, improved, best }
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const r = await fetch(`/api/memory-leaderboard?level=${level}`);
      if (!r.ok) throw new Error();
      setData(await r.json());
    } catch {
      setLoadError(true);
    }
  }, [level]);

  useEffect(() => {
    load();
  }, [load]);

  // A new finished game (or level) re-opens the form.
  useEffect(() => {
    setSent(null);
    setError(null);
  }, [submission, level]);

  const cleanName = name.trim().replace(/\s+/g, ' ');
  const nameOk = NAME_RE.test(cleanName);

  const submit = async (e) => {
    e.preventDefault();
    if (!submission || !nameOk || sending) return;
    setSending(true);
    setError(null);
    writeLocal(NAME_KEY, cleanName);
    try {
      const r = await fetch('/api/memory-leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          date: submission.date,
          name: cleanName,
          clientId: getClientId(),
          log: submission.log,
          pauses: submission.pauses,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Gagal mengirim.');
      setSent(j);
      setData({ entries: j.entries, total: j.total });
    } catch (err) {
      setError(err.message || 'Gagal mengirim.');
    } finally {
      setSending(false);
    }
  };

  const entries = data?.entries || [];
  const myRank = sent?.rank || 0;

  return (
    <section className="mt-8 rounded-2xl bg-white border border-[color:var(--retro-brown-dark)]/12 shadow-sm p-5 sm:p-7" aria-labelledby="mm-lb">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]">
            Peringkat Harian · {dateLabel}
          </p>
          <h2 id="mm-lb" className="font-header text-2xl sm:text-3xl font-black text-[color:var(--retro-text-primary)] mt-1">
            Tercepat hari ini · {levelLabel}
          </h2>
        </div>
        {data?.total > 0 && (
          <span className="text-xs text-[color:var(--retro-text-secondary)]">{data.total} pemain</span>
        )}
      </div>

      {submission && !sent && (
        <form onSubmit={submit} className="mt-5 rounded-xl bg-[color:var(--retro-bg-primary)] p-4">
          <label htmlFor="mm-name" className="block text-xs font-bold text-[color:var(--retro-text-primary)]">
            Masukkan hasilmu ({formatDuration(submission.timeMs)} · {submission.moves} langkah) ke peringkat
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              id="mm-name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
              maxLength={NAME_MAX}
              autoComplete="nickname"
              placeholder="Nama panggilan"
              className="flex-1 min-w-[10rem] rounded-full border border-[color:var(--retro-brown-dark)]/20 bg-white px-4 py-2 text-sm text-[color:var(--retro-text-primary)] focus:outline-none focus:border-[color:var(--retro-burgundy)]"
            />
            <button
              type="submit"
              disabled={!nameOk || sending}
              className="px-5 py-2 rounded-full text-sm font-black uppercase tracking-wider bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] hover:bg-[color:var(--retro-burgundy-light)] disabled:opacity-50"
            >
              {sending ? 'Mengirim…' : 'Kirim'}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-[color:var(--retro-text-secondary)]">
            {nameOk ? (
              <>Tampil sebagai <strong className="font-mono">{maskName(cleanName)}</strong>. Nama aslimu tidak disimpan.</>
            ) : (
              'Nama 2–16 huruf atau angka. Nanti disamarkan, misalnya Malvin jadi M****n.'
            )}
          </p>
          {error && <p className="mt-2 text-xs font-bold text-[color:var(--retro-burgundy)]">{error}</p>}
        </form>
      )}

      {sent && (
        <p className="mt-5 rounded-xl bg-[color:var(--retro-bg-primary)] p-4 text-sm text-[color:var(--retro-text-primary)]">
          {sent.improved ? 'Tercatat!' : 'Hasil terbaikmu hari ini masih yang sebelumnya.'} Kamu peringkat{' '}
          <strong>#{sent.rank}</strong> dari {sent.total}
          {sent.best && <> ({formatDuration(sent.best.timeMs)} · {sent.best.moves} langkah)</>}.
        </p>
      )}

      {loadError ? (
        <p className="mt-5 text-sm text-[color:var(--retro-text-secondary)]">
          Peringkat belum bisa dimuat.{' '}
          <button type="button" onClick={load} className="underline font-bold">Coba lagi</button>
        </p>
      ) : !data ? (
        <p className="mt-5 text-sm text-[color:var(--retro-text-secondary)]">Memuat peringkat…</p>
      ) : entries.length === 0 ? (
        <p className="mt-5 text-sm text-[color:var(--retro-text-secondary)]">Belum ada yang main papan ini hari ini. Jadi yang pertama!</p>
      ) : (
        <ol className="mt-5 divide-y divide-[color:var(--retro-brown-dark)]/8">
          {entries.slice(0, SHOW).map((row, i) => (
            <li
              key={`${i}-${row.name}`}
              className={`flex items-center gap-3 py-2.5 text-sm ${myRank === i + 1 ? 'bg-[color:var(--retro-gold)]/12 -mx-2 px-2 rounded-lg' : ''}`}
            >
              <span className="w-7 text-center font-black tabular-nums text-[color:var(--retro-text-secondary)]">
                {i < 3 ? <i className={medal[i]} aria-label={`Peringkat ${i + 1}`} /> : i + 1}
              </span>
              <span className="flex-1 font-mono font-bold text-[color:var(--retro-text-primary)] truncate">{row.name}</span>
              <span className="tabular-nums font-bold text-[color:var(--retro-text-primary)]">{formatDuration(row.timeMs)}</span>
              <span className="w-20 text-right tabular-nums text-xs text-[color:var(--retro-text-secondary)]">{row.moves} langkah</span>
            </li>
          ))}
        </ol>
      )}
      {myRank > SHOW && (
        <p className="mt-2 text-xs text-[color:var(--retro-text-secondary)]">Kamu di peringkat #{myRank}.</p>
      )}
    </section>
  );
};

export default MemoryLeaderboard;
