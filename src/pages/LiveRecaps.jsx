/**
 * Rekap Live — /rekap-live (every live) and /rekap-live/:id (one live).
 *
 * Published automatically by EliRecorder a few minutes after each of Eli's
 * lives: how long, how busy, the liveliest minutes, and what people talked
 * about. Numbers and words only, never video, viewer names or transcript
 * excerpts (see src/lib/liveRecaps.js). Written stories live in Eli Notes.
 *
 * Look: a dark "broadcast board" (big numbers, thin-lined panels with a
 * label, a divider and an arrow row), in Armeniaca's own colours and type.
 */

import React, { useEffect, useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import Seo from '../components/Seo';
import { NoteCard } from '../components/EliNoteCard';
import { useEliNotes } from '../hooks/useEliNotes';
import { fmtMinute } from '../lib/eliNotes';
import { MOODS } from '../lib/eliNotes';
import { WEEK_RE, fmtDuration, liveCalendar, livePattern, monthlyTotals, noteNear, notesForRecap, perMinuteAvg, recapInsights, recapRecords, weekLabel, weekOf, weeklySummaries } from '../lib/liveRecaps';
import { useLiveRecaps } from '../hooks/useLiveRecaps';
import RecapShareCard from '../components/RecapShareCard';

const PLATFORM = { idn: 'IDN Live', showroom: 'SHOWROOM' };
const dateFmt = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
const timeFmt = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
const prettyDay = (r) => dateFmt.format(new Date(r.startedAt || `${r.date}T12:00:00+07:00`));
const fmtN = (n) => Number(n || 0).toLocaleString('id-ID');

// Colours of the board (dark, warm; Armeniaca gold + burgundy as accents).
const INK = '#16110e';
const PANEL = '#201915';
const LINE = 'rgba(244, 236, 228, 0.12)';

const Board = ({ children }) => (
  <div className="min-h-screen pb-20 text-[#f4ece4]" style={{ background: INK }}>
    {children}
  </div>
);

const Eyebrow = ({ children }) => (
  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-gold-light)]">{children}</p>
);

const Panel = ({ label, children, className = '', foot }) => (
  <section className={`rounded-2xl border p-5 sm:p-6 ${className}`} style={{ background: PANEL, borderColor: LINE }}>
    {label && <Eyebrow>{label}</Eyebrow>}
    <div className={label ? 'mt-3' : ''}>{children}</div>
    {foot && <div className="mt-5 pt-4 border-t text-xs font-black uppercase tracking-[0.2em] flex items-center justify-between" style={{ borderColor: LINE }}>{foot}</div>}
  </section>
);

const Stat = ({ value, label }) => (
  <div>
    <p className="font-header font-black leading-none text-5xl sm:text-6xl tracking-tight tabular-nums">{value}</p>
    <p className="mt-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#f4ece4]/55">{label}</p>
  </div>
);

/** Comments per minute as bars; moments marked in gold. Click a bar = nothing (no video here), hover shows the minute. */
const Pulse = ({ recap }) => {
  const data = recap.perMinute;
  const max = Math.max(1, ...data);
  const momentMinutes = new Set(recap.moments.map((m) => Math.floor(m.t / 60)));
  return (
    <div>
      <div className="flex items-end gap-[2px] h-36 sm:h-44" role="img" aria-label={`Grafik komentar per menit, puncak ${recap.peak ? `${fmtN(recap.peak.count)} komentar di menit ${recap.peak.minute + 1}` : '-'}`}>
        {data.map((v, i) => (
          <div
            key={i}
            title={`Menit ${i + 1}: ${fmtN(v)} komentar`}
            className="flex-1 rounded-t-sm min-w-[2px]"
            style={{
              height: `${Math.max(3, (v / max) * 100)}%`,
              background: momentMinutes.has(i) ? 'var(--retro-gold)' : i === recap.peak?.minute ? '#e0464e' : 'rgba(244, 236, 228, 0.28)',
            }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-bold text-[#f4ece4]/45 tabular-nums">
        <span>0:00</span>
        <span>{fmtMinute(Math.floor(data.length / 2) * 60)}</span>
        <span>{fmtMinute(recap.durationSec)}</span>
      </div>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#f4ece4]/60">
        <span><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1 align-middle" style={{ background: 'var(--retro-gold)' }} />momen seru</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1 align-middle" style={{ background: '#e0464e' }} />menit paling ramai</span>
      </p>
    </div>
  );
};

const Words = ({ pairs, emoji = false }) => {
  if (!pairs?.length) return <p className="text-sm text-[#f4ece4]/50">Belum cukup data.</p>;
  const max = pairs[0][1];
  return (
    <ul className="flex flex-wrap gap-2">
      {pairs.map(([w, n]) => (
        <li
          key={w}
          className="rounded-full border px-3 py-1 font-bold"
          style={{ borderColor: LINE, fontSize: emoji ? '1.35rem' : `${0.78 + (n / max) * 0.5}rem`, opacity: 0.55 + (n / max) * 0.45 }}
          title={`${fmtN(n)} kali`}
        >
          {w}{!emoji && <span className="ml-1.5 text-[10px] text-[#f4ece4]/45 tabular-nums">{fmtN(n)}</span>}
          {emoji && <span className="ml-1 text-[11px] text-[#f4ece4]/50 tabular-nums align-middle">{fmtN(n)}</span>}
        </li>
      ))}
    </ul>
  );
};

// ── Detail ───────────────────────────────────────────────────────────

const RecapDetail = ({ recap, prev, next, all }) => {
  const { notes } = useEliNotes();
  const insights = useMemo(() => recapInsights(all, recap), [all, recap]);
  const liveNotes = useMemo(() => notesForRecap(notes, recap, all), [notes, recap, all]);

  return (
    <>
      <header className="pt-24 sm:pt-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <Link to="/rekap-live" className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.2em] text-[color:var(--retro-gold-light)]">
            <i className="ri-arrow-left-line" /> Semua rekap
          </Link>
          <div className="mt-6 flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em]">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-white" style={{ background: '#e0464e' }}>
              <i className="ri-broadcast-line" /> {PLATFORM[recap.platform]}
            </span>
            <span className="text-[#f4ece4]/60">{prettyDay(recap)}{recap.startedAt ? ` · ${timeFmt.format(new Date(recap.startedAt))} WIB` : ''}</span>
          </div>
          <h1 className="mt-4 font-header font-black uppercase leading-[0.92] tracking-tight text-5xl sm:text-7xl lg:text-8xl">
            {fmtDuration(recap.durationSec)}<br />
            <span className="text-[color:var(--retro-gold)]">bareng Eli.</span>
          </h1>
          {recap.title && <p className="mt-4 text-base sm:text-lg text-[#f4ece4]/75 max-w-2xl">“{recap.title}”</p>}
          {insights.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2">
              {insights.map((b) => (
                <li key={b.text} className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-black text-[color:var(--retro-gold-light)]" style={{ borderColor: 'rgba(200,149,42,0.5)' }}>
                  <i className={b.icon} /> {b.text}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6"><RecapShareCard recap={recap} insights={insights} /></div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-10 grid gap-4">
        <Panel>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <Stat value={fmtN(recap.comments)} label="komentar" />
            <Stat value={fmtN(recap.commenters)} label="penonton berkomentar" />
            <Stat value={fmtN(perMinuteAvg(recap))} label="komentar / menit" />
            <Stat value={recap.peak ? fmtN(recap.peak.count) : '-'} label={recap.peak ? `puncak, menit ${recap.peak.minute + 1}` : 'puncak'} />
          </div>
        </Panel>

        <Panel label="Denyut live · komentar per menit">
          <Pulse recap={recap} />
        </Panel>

        {recap.moments.length > 0 && (
          <Panel label="Momen paling ramai">
            <ol className="grid gap-3 sm:grid-cols-3">
              {recap.moments.map((m, i) => {
                const note = noteNear(liveNotes, m.t);
                return (
                  <li key={m.t} className="rounded-xl border p-4 flex flex-col" style={{ borderColor: LINE }}>
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#f4ece4]/45">#{i + 1}</span>
                    <span className="mt-1 font-header text-4xl font-black tabular-nums text-[color:var(--retro-gold)]">{fmtMinute(m.t)}</span>
                    <span className="mt-2 text-sm text-[#f4ece4]/75 flex-1">{m.reasons.join(' · ')}</span>
                    <span className="mt-3 pt-3 border-t text-xs font-bold flex items-center justify-between" style={{ borderColor: LINE }}>
                      <span className="text-[#f4ece4]/55">{fmtN(m.commentCount)} komentar</span>
                      {note && (
                        <Link to={`/eli-notes/${note.id}`} className="font-black uppercase tracking-[0.15em] text-[color:var(--retro-gold-light)]">
                          Catatannya <i className="ri-arrow-right-line" />
                        </Link>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          </Panel>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Panel label="Yang paling sering diketik penonton">
            <Words pairs={recap.chatWords} />
            {recap.chatEmoji.length > 0 && <div className="mt-4"><Words pairs={recap.chatEmoji} emoji /></div>}
          </Panel>
          <Panel label="Yang Eli bicarakan">
            <Words pairs={recap.talkWords} />
            <p className="mt-4 text-xs text-[#f4ece4]/45">Dari subtitle otomatis, jadi bisa ada kata yang salah dengar.</p>
          </Panel>
        </div>

        {liveNotes.length > 0 && (
          <section className="mt-6">
            <Eyebrow>Eli Notes dari live ini</Eyebrow>
            <ul className="en-board mt-8">
              {liveNotes.map((n) => <li key={n.id}><NoteCard note={n} /></li>)}
            </ul>
          </section>
        )}

        <Panel
          foot={<><Link to="/vivo" className="text-[color:var(--retro-gold-light)]">Arsip live di Vivo</Link><i className="ri-arrow-right-line" /></>}
        >
          <p className="text-sm text-[#f4ece4]/65 leading-relaxed">
            Rekap ini dibuat otomatis beberapa menit setelah live selesai: hanya angka dan kata, tanpa video, tanpa nama penonton,
            dan tanpa kutipan dari transkrip. Cerita momennya kami tulis sendiri di{' '}
            <Link to="/eli-notes" className="font-bold underline text-[color:var(--retro-gold-light)]">Eli Notes</Link>.
          </p>
          <p className="mt-2 text-sm text-[#f4ece4]/65 leading-relaxed">
            <i className="ri-lock-line" aria-hidden="true" /> Kalau Eli bilang “kita-kita aja yang tau ya” atau “jangan diklip”, bagian
            live itu dilewati: tidak masuk kata-kata, momen, maupun catatan. Yang tersisa hanya jumlah komentarnya.
          </p>
        </Panel>

        <nav className="mt-4 grid grid-cols-2 gap-3" aria-label="Rekap lain">
          {next ? (
            <Link to={`/rekap-live/${next.id}`} className="rounded-2xl border p-4 hover:border-[color:var(--retro-gold)]" style={{ borderColor: LINE }}>
              <span className="text-xs text-[#f4ece4]/50"><i className="ri-arrow-left-line" /> Sebelumnya</span>
              <span className="mt-1 block text-sm font-bold">{prettyDay(next)}</span>
            </Link>
          ) : <span />}
          {prev ? (
            <Link to={`/rekap-live/${prev.id}`} className="rounded-2xl border p-4 text-right hover:border-[color:var(--retro-gold)]" style={{ borderColor: LINE }}>
              <span className="text-xs text-[#f4ece4]/50">Sesudahnya <i className="ri-arrow-right-line" /></span>
              <span className="mt-1 block text-sm font-bold">{prettyDay(prev)}</span>
            </Link>
          ) : <span />}
        </nav>
      </div>
    </>
  );
};

// ── List: calendar, records, months ──────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const monthLabel = (ym) => `${['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
const todayWib = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

const Calendar = ({ recaps }) => {
  const weeks = useMemo(() => liveCalendar(recaps, todayWib(), 26), [recaps]);
  const pattern = useMemo(() => livePattern(recaps), [recaps]);
  const firstOfMonth = weeks.map((col) => col.find((d) => d && d.date.endsWith('-01')) || (col[0] && col[0] === weeks[0][0] ? col[0] : null));
  return (
    <Panel label="Kalender live · 6 bulan terakhir">
      <div className="grid grid-cols-[1.6rem_1fr] gap-x-2">
        <span />
        <div className="flex gap-[3px] text-[10px] font-bold text-[#f4ece4]/45 h-4">
          {weeks.map((col, w) => (
            <span key={w} className="flex-1 min-w-0 overflow-visible whitespace-nowrap">{firstOfMonth[w] ? MONTHS[Number(firstOfMonth[w].date.slice(5, 7)) - 1] : ''}</span>
          ))}
        </div>
        <div className="grid grid-rows-7 gap-[3px] text-[10px] font-bold text-[#f4ece4]/45">
          {['Sen', '', 'Rab', '', 'Jum', '', 'Min'].map((d, i) => <span key={i} className="flex items-center leading-none">{d}</span>)}
        </div>
        <div className="flex gap-[3px]">
            {weeks.map((col, w) => (
              <div key={w} className="flex-1 min-w-0 flex flex-col gap-[3px]">
                {col.map((d, i) => {
                  if (!d) return <span key={i} className="block w-full aspect-square" />;
                  const lvl = d.lives === 0 ? 0 : d.minutes >= 60 ? 3 : d.minutes >= 30 ? 2 : 1;
                  const bg = ['rgba(244,236,228,0.07)', 'rgba(200,149,42,0.45)', 'rgba(200,149,42,0.75)', '#c8952a'][lvl];
                  const cell = <span className="block w-full aspect-square rounded-[3px]" style={{ background: bg }} />;
                  return d.lives ? (
                    <Link key={i} className="block" to={`/rekap-live/${d.ids[0]}`} title={`${d.date}: ${d.lives} live, ${d.minutes} menit`} aria-label={`${d.date}: ${d.lives} live`}>{cell}</Link>
                  ) : (
                    <span key={i} className="block" title={d.date}>{cell}</span>
                  );
                })}
              </div>
            ))}
        </div>
      </div>
      <p className="mt-4 text-sm text-[#f4ece4]/70">
        {pattern
          ? <>Eli paling sering live hari <b className="text-[#f4ece4]">{pattern.weekday}</b>, sekitar jam <b className="text-[#f4ece4]">{String(pattern.hour).padStart(2, '0')}.00 WIB</b>.</>
          : 'Pola hari dan jam live akan terlihat setelah ada beberapa rekap lagi.'}
      </p>
    </Panel>
  );
};

const Records = ({ recaps }) => {
  const rec = useMemo(() => recapRecords(recaps), [recaps]);
  if (!rec) return null;
  const items = [
    { r: rec.longest, label: 'Live terlama', value: fmtDuration(rec.longest.durationSec), icon: 'ri-timer-line' },
    { r: rec.mostComments, label: 'Komentar terbanyak', value: fmtN(rec.mostComments.comments), icon: 'ri-chat-3-line' },
    { r: rec.hottest, label: 'Menit terheboh', value: `${fmtN(rec.hottest.peak?.count)}/menit`, icon: 'ri-flashlight-line' },
  ];
  return (
    <Panel label="Rekor sepanjang arsip">
      <ul className="grid gap-3 sm:grid-cols-3">
        {items.map(({ r, label, value, icon }) => (
          <li key={label}>
            <Link to={`/rekap-live/${r.id}`} className="group block rounded-xl border p-4 hover:border-[color:var(--retro-gold)] transition-colors" style={{ borderColor: LINE }}>
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#f4ece4]/50"><i className={`${icon} text-[color:var(--retro-gold)]`} /> {label}</span>
              <span className="mt-2 block font-header text-3xl font-black tabular-nums">{value}</span>
              <span className="mt-3 pt-3 border-t flex items-center justify-between text-xs font-bold text-[#f4ece4]/60" style={{ borderColor: LINE }}>
                {prettyDay(r)} <i className="ri-arrow-right-line group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
};

const Months = ({ recaps }) => {
  const months = useMemo(() => monthlyTotals(recaps).slice(0, 12), [recaps]);
  const max = Math.max(1, ...months.map((m) => m.minutes));
  return (
    <Panel label="Per bulan">
      <ul className="grid gap-3">
        {months.map((m) => (
          <li key={m.month} className="grid grid-cols-[7.5rem_1fr] sm:grid-cols-[9rem_1fr_auto] items-center gap-3">
            <span className="font-header font-black">{monthLabel(m.month)}</span>
            <span className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(244,236,228,0.08)' }}>
              <span className="block h-full rounded-full" style={{ width: `${(m.minutes / max) * 100}%`, background: 'var(--retro-gold)' }} />
            </span>
            <span className="col-span-2 sm:col-span-1 text-xs text-[#f4ece4]/65 tabular-nums">{m.lives} live · {fmtDuration(m.minutes * 60)} · {fmtN(m.comments)} komentar</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
};

const Insights = ({ recaps }) => (
  <div className="grid gap-4 mb-6">
    <Calendar recaps={recaps} />
    <Records recaps={recaps} />
    <Months recaps={recaps} />
  </div>
);

// ── Ringkasan mingguan ───────────────────────────────────────────────

const dayFmt = new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' });
const dayName = (r) => dayFmt.format(new Date(r.startedAt || `${r.date}T12:00:00+07:00`));

/** A few plain sentences from the week's numbers (no guessing). */
const weekSentences = (w, prev) => {
  const out = [];
  if (w.lives === 0) out.push('Minggu ini tidak ada live yang terekam, tapi ada catatan dari live Eli.');
  else {
    out.push(`Eli live ${w.lives} kali, total ${fmtDuration(w.minutes * 60)}, dengan ${fmtN(w.comments)} komentar.`);
    if (prev && prev.lives > 0) {
      const diff = w.minutes - prev.minutes;
      if (Math.abs(diff) >= 10) out.push(`Itu ${fmtDuration(Math.abs(diff) * 60)} ${diff > 0 ? 'lebih lama' : 'lebih singkat'} dari minggu sebelumnya.`);
    }
    if (w.lives > 1 && w.busiest) out.push(`Paling ramai live ${dayName(w.busiest)}${w.busiest.startedAt ? ` pukul ${timeFmt.format(new Date(w.busiest.startedAt))}` : ''}, ${fmtN(w.busiest.comments)} komentar.`);
    if (w.chatWords[0]) out.push(`Kata yang paling sering diketik penonton: “${w.chatWords[0][0]}”.`);
  }
  if (w.notes.length) out.push(`${w.notes.length} momen kami tulis di Eli Notes.`);
  return out;
};

/** The newest week, as a panel on /rekap-live. */
const WeekTeaser = ({ weeks }) => {
  const w = weeks[0];
  if (!w) return null;
  const current = w.week === weekOf(todayWib());
  return (
    <Panel
      label={`Ringkasan mingguan · ${current ? 'minggu ini' : weekLabel(w.week)}`}
      className="mb-6"
      foot={<><Link to={`/rekap-live/minggu/${w.week}`} className="text-[color:var(--retro-gold-light)]">Baca ringkasannya</Link><i className="ri-arrow-right-line" /></>}
    >
      <p className="font-header text-2xl sm:text-3xl font-black leading-tight">{weekLabel(w.week)}</p>
      <p className="mt-2 text-sm text-[#f4ece4]/70 max-w-2xl">{weekSentences(w, weeks[1]).join(' ')}</p>
      {weeks.length > 1 && (
        <p className="mt-4 flex flex-wrap gap-2 text-xs">
          {weeks.slice(1, 7).map((x) => (
            <Link key={x.week} to={`/rekap-live/minggu/${x.week}`} className="rounded-full border px-3 py-1 font-bold text-[#f4ece4]/70 hover:border-[color:var(--retro-gold)]" style={{ borderColor: LINE }}>
              {weekLabel(x.week)}
            </Link>
          ))}
        </p>
      )}
    </Panel>
  );
};

const WeekDetail = ({ w, prev, next }) => {
  const sentences = weekSentences(w, prev);
  const others = w.notes.filter((n) => !w.picks.includes(n));
  return (
    <>
      <header className="pt-24 sm:pt-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <Link to="/rekap-live" className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.2em] text-[color:var(--retro-gold-light)]">
            <i className="ri-arrow-left-line" /> Semua rekap
          </Link>
          <div className="mt-5"><Eyebrow>Ringkasan mingguan</Eyebrow></div>
          <h1 className="mt-4 font-header font-black uppercase leading-[0.92] tracking-tight text-4xl sm:text-6xl">{weekLabel(w.week)}</h1>
          <p className="mt-5 text-base sm:text-lg text-[#f4ece4]/75 max-w-2xl">{sentences.join(' ')}</p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8 grid gap-4">
        {w.lives > 0 && (
          <Panel>
            <div className="grid grid-cols-3 gap-6">
              <Stat value={fmtN(w.lives)} label="live" />
              <Stat value={fmtN(w.minutes)} label="menit" />
              <Stat value={fmtN(w.comments)} label="komentar" />
            </div>
          </Panel>
        )}

        {w.lives > 0 && (
          <Panel label="Live minggu ini">
            <ul className="divide-y" style={{ borderColor: LINE }}>
              {[...w.recaps].reverse().map((r) => (
                <li key={r.id} style={{ borderColor: LINE }}>
                  <Link to={`/rekap-live/${r.id}`} className="group flex items-center justify-between gap-3 py-3">
                    <span>
                      <span className="block font-bold capitalize">{dayName(r)}{r.startedAt ? `, ${timeFmt.format(new Date(r.startedAt))} WIB` : ''}</span>
                      <span className="block text-xs text-[#f4ece4]/55 line-clamp-1">{r.title ? `“${r.title}” · ` : ''}{PLATFORM[r.platform]}</span>
                    </span>
                    <span className="text-right text-xs font-black uppercase tracking-[0.15em] text-[#f4ece4]/70 shrink-0">
                      {fmtDuration(r.durationSec)} · {fmtN(r.comments)} komentar
                      {w.lives > 1 && r === w.busiest && <span className="block text-[color:var(--retro-gold)]">paling ramai</span>}
                      {w.lives > 1 && r === w.longest && r !== w.busiest && <span className="block text-[color:var(--retro-gold)]">terlama</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {w.lives > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <Panel label="Yang paling sering diketik penonton"><Words pairs={w.chatWords} /></Panel>
            <Panel label="Yang Eli bicarakan">
              <Words pairs={w.talkWords} />
              <p className="mt-4 text-xs text-[#f4ece4]/45">Dari subtitle otomatis, jadi bisa ada kata yang salah dengar.</p>
            </Panel>
          </div>
        )}

        {w.notes.length > 0 && (
          <section className="mt-2">
            <Eyebrow>Dari Eli Notes{w.moods.length ? ` · ${w.moods.map(([m, n]) => `${n} ${MOODS[m]?.label.toLowerCase() || m}`).join(', ')}` : ''}</Eyebrow>
            <ul className="en-board mt-8">
              {[...w.picks, ...others].map((n) => <li key={n.id}><NoteCard note={n} /></li>)}
            </ul>
          </section>
        )}

        <nav className="mt-4 grid grid-cols-2 gap-3" aria-label="Minggu lain">
          {prev ? (
            <Link to={`/rekap-live/minggu/${prev.week}`} className="rounded-2xl border p-4 hover:border-[color:var(--retro-gold)]" style={{ borderColor: LINE }}>
              <span className="text-xs text-[#f4ece4]/50"><i className="ri-arrow-left-line" /> Minggu sebelumnya</span>
              <span className="mt-1 block text-sm font-bold">{weekLabel(prev.week)}</span>
            </Link>
          ) : <span />}
          {next ? (
            <Link to={`/rekap-live/minggu/${next.week}`} className="rounded-2xl border p-4 text-right hover:border-[color:var(--retro-gold)]" style={{ borderColor: LINE }}>
              <span className="text-xs text-[#f4ece4]/50">Minggu sesudahnya <i className="ri-arrow-right-line" /></span>
              <span className="mt-1 block text-sm font-bold">{weekLabel(next.week)}</span>
            </Link>
          ) : <span />}
        </nav>
      </div>
    </>
  );
};

// ── List ─────────────────────────────────────────────────────────────

const RecapList = ({ recaps, loading, weeks }) => {
  const totals = useMemo(() => ({
    lives: recaps.length,
    minutes: Math.round(recaps.reduce((a, r) => a + r.durationSec, 0) / 60),
    comments: recaps.reduce((a, r) => a + r.comments, 0),
  }), [recaps]);

  return (
    <>
      <header className="pt-24 sm:pt-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <Eyebrow>Rekap Live · otomatis setiap Eli selesai live</Eyebrow>
          <h1 className="mt-4 font-header font-black uppercase leading-[0.92] tracking-tight text-5xl sm:text-7xl lg:text-8xl">
            Setiap live,<br />
            <span className="text-[color:var(--retro-gold)]">tercatat.</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-[#f4ece4]/70 max-w-xl">
            Berapa lama, seramai apa, menit mana yang paling heboh, dan apa yang dibicarakan. Muncul sendiri beberapa menit setelah live IDN atau SHOWROOM Eli selesai.
          </p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-10">
        {recaps.length > 0 && (
          <Panel className="mb-6">
            <div className="grid grid-cols-3 gap-6">
              <Stat value={fmtN(totals.lives)} label="live" />
              <Stat value={fmtN(totals.minutes)} label="menit" />
              <Stat value={fmtN(totals.comments)} label="komentar" />
            </div>
          </Panel>
        )}

        {weeks.length > 0 && <WeekTeaser weeks={weeks} />}

        {recaps.length > 0 && <Insights recaps={recaps} />}

        {loading ? (
          <p className="text-sm text-[#f4ece4]/60">Memuat…</p>
        ) : recaps.length === 0 ? (
          <Panel label="Belum ada rekap" foot={<><Link to="/vivo" className="text-[color:var(--retro-gold-light)]">Arsip live di Vivo</Link><i className="ri-arrow-right-line" /></>}>
            <p className="font-header text-2xl font-black">Menunggu live Eli berikutnya.</p>
            <p className="mt-2 text-sm text-[#f4ece4]/65">Rekap pertama akan muncul di sini beberapa menit setelah live selesai.</p>
          </Panel>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {recaps.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/rekap-live/${r.id}`}
                  className="group block h-full rounded-2xl border p-5 sm:p-6 transition-colors hover:border-[color:var(--retro-gold)]"
                  style={{ background: PANEL, borderColor: LINE }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Eyebrow>{PLATFORM[r.platform]}</Eyebrow>
                    <span className="text-xs text-[#f4ece4]/50">{r.startedAt ? `${timeFmt.format(new Date(r.startedAt))} WIB` : ''}</span>
                  </div>
                  <p className="mt-3 font-header text-3xl font-black uppercase leading-none tracking-tight">{prettyDay(r)}</p>
                  {r.title && <p className="mt-2 text-sm text-[#f4ece4]/65 line-clamp-1">“{r.title}”</p>}
                  <div className="mt-4 flex items-end gap-[2px] h-10" aria-hidden="true">
                    {r.perMinute.slice(0, 120).map((v, i) => {
                      const max = Math.max(1, ...r.perMinute);
                      return <span key={i} className="flex-1 rounded-t-sm" style={{ height: `${Math.max(6, (v / max) * 100)}%`, background: 'rgba(244,236,228,0.25)' }} />;
                    })}
                  </div>
                  <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs font-black uppercase tracking-[0.18em]" style={{ borderColor: LINE }}>
                    <span className="text-[#f4ece4]/70">{fmtDuration(r.durationSec)} · {fmtN(r.comments)} komentar</span>
                    <i className="ri-arrow-right-line text-base group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};

// ── Page ─────────────────────────────────────────────────────────────

const LiveRecaps = () => {
  const { id, week } = useParams();
  const isWeek = useLocation().pathname.startsWith('/rekap-live/minggu');
  const { recaps, loading } = useLiveRecaps();
  const { notes, loading: notesLoading } = useEliNotes();
  const weeks = useMemo(() => weeklySummaries(recaps, notes), [recaps, notes]);
  const idx = id ? recaps.findIndex((r) => r.id === id) : -1;
  const recap = idx >= 0 ? recaps[idx] : null;
  const wIdx = isWeek ? (week && WEEK_RE.test(week) ? weeks.findIndex((x) => x.week === weekOf(week)) : 0) : -1;
  const w = wIdx >= 0 ? weeks[wIdx] : null;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id, week]);

  if (isWeek) {
    return (
      <Board>
        <Seo
          path={w ? `/rekap-live/minggu/${w.week}` : '/rekap-live/minggu'}
          title={w ? `Ringkasan mingguan ${weekLabel(w.week)}` : 'Ringkasan mingguan'}
          description={w ? `Seminggu live Eli JKT48 (${weekLabel(w.week)}): ${weekSentences(w, weeks[wIdx + 1]).join(' ')}` : 'Ringkasan mingguan live IDN dan SHOWROOM Eli JKT48.'}
        />
        {w ? (
          <WeekDetail w={w} prev={weeks[wIdx + 1]} next={weeks[wIdx - 1]} />
        ) : (
          <div className="pt-28 px-4 sm:px-6 max-w-5xl mx-auto">
            <h1 className="font-header text-4xl font-black uppercase">{loading || notesLoading ? 'Memuat…' : 'Belum ada ringkasan untuk minggu ini'}</h1>
            <Link to="/rekap-live" className="mt-4 inline-block text-sm font-bold underline text-[color:var(--retro-gold-light)]">Lihat semua rekap</Link>
          </div>
        )}
      </Board>
    );
  }

  return (
    <Board>
      <Seo
        path={id ? `/rekap-live/${id}` : '/rekap-live'}
        title={recap ? `Rekap live ${prettyDay(recap)}` : 'Rekap Live'}
        description={
          recap
            ? `Live ${PLATFORM[recap.platform]} Eli JKT48, ${prettyDay(recap)}: ${fmtDuration(recap.durationSec)}, ${fmtN(recap.comments)} komentar, momen paling ramai dan topik obrolannya.`
            : 'Rekap Live: ringkasan otomatis setiap live IDN dan SHOWROOM Eli JKT48. Durasi, keramaian chat, momen paling heboh, dan topik obrolan.'
        }
      />
      {!id ? (
        <RecapList recaps={recaps} loading={loading} weeks={weeks} />
      ) : recap ? (
        <RecapDetail recap={recap} prev={recaps[idx - 1]} next={recaps[idx + 1]} all={recaps} />
      ) : (
        <div className="pt-28 px-4 sm:px-6 max-w-5xl mx-auto">
          <h1 className="font-header text-4xl font-black uppercase">{loading ? 'Memuat…' : 'Rekap tidak ditemukan'}</h1>
          <Link to="/rekap-live" className="mt-4 inline-block text-sm font-bold underline text-[color:var(--retro-gold-light)]">Lihat semua rekap</Link>
        </div>
      )}
    </Board>
  );
};

export default LiveRecaps;
