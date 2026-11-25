/**
 * Tebak Momen — /mini-games/tebak-momen.
 *
 * "Eli said this in a live: on which day?" Five questions from Eli Notes
 * quotes. After each answer the note's story is shown, so the game is a
 * way back into the moment, not just a score (docs/prinsip-armeniaca.md).
 * Opens once Eli Notes has enough quoted notes (QUIZ_MIN_NOTES).
 */

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import { PAGES } from '../lib/pageMeta';
import { useEliNotes } from '../hooks/useEliNotes';
import { MOODS, PLATFORMS, QUIZ_MIN_NOTES, buildQuiz, fmtMinute, quizPool } from '../lib/eliNotes';

const ROUNDS = 5;
const dateFmt = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const prettyDate = (iso) => dateFmt.format(new Date(`${iso}T00:00:00Z`));

const Shell = ({ children }) => (
  <div className="min-h-screen bg-[color:var(--retro-bg-primary)] pb-20 pt-24 sm:pt-28 px-4 sm:px-6">
    <Seo {...PAGES.tebakMomen} />
    <div className="max-w-2xl mx-auto">
      <Link to="/mini-games" className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.2em] text-[color:var(--retro-burgundy)]">
        <i className="ri-arrow-left-line" /> Mini games
      </Link>
      <h1 className="mt-3 font-header text-3xl sm:text-5xl font-black tracking-tight text-[color:var(--retro-text-primary)]">Tebak Momen</h1>
      {children}
    </div>
  </div>
);

const btn = 'px-6 py-2.5 rounded-full text-sm font-black uppercase tracking-wider bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] hover:bg-[color:var(--retro-burgundy-light)]';

const TebakMomen = () => {
  const { notes, loading } = useEliNotes();
  const pool = useMemo(() => quizPool(notes), [notes]);
  const [seed, setSeed] = useState(0);
  // A new set of questions each time "Main lagi" bumps the seed.
  const quiz = useMemo(() => buildQuiz(notes, ROUNDS), [notes, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);

  if (loading) return <Shell><p className="mt-6 text-sm text-[color:var(--retro-text-secondary)]">Memuat…</p></Shell>;

  if (!pool.ready) {
    return (
      <Shell>
        <div className="mt-6 rounded-2xl bg-white border border-[color:var(--retro-brown-dark)]/10 p-6">
          <p className="font-header text-xl font-black text-[color:var(--retro-text-primary)]">Sebentar lagi.</p>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--retro-text-secondary)]">
            Tebak Momen dibuat dari kutipan di Eli Notes, dan butuh minimal {QUIZ_MIN_NOTES} catatan dari beberapa live yang berbeda.
            Sekarang baru ada {pool.quoted.length}. Sambil menunggu, baca{' '}
            <Link to="/eli-notes" className="font-bold underline text-[color:var(--retro-burgundy)]">Eli Notes</Link>.
          </p>
        </div>
      </Shell>
    );
  }

  const done = round >= quiz.length;
  if (done) {
    return (
      <Shell>
        <div className="mt-6 rounded-2xl bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] p-6 sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-gold-light)]">Selesai</p>
          <p className="mt-2 font-header text-4xl font-black">{score} / {quiz.length}</p>
          <p className="mt-2 text-sm text-[color:var(--retro-cream)]/85">
            {score === quiz.length ? 'Ingatanmu soal live Eli tajam sekali.' : score >= quiz.length / 2 ? 'Lumayan! Beberapa momen memang gampang terlewat.' : 'Tidak apa-apa, sekarang kamu tahu cerita di balik momen-momen itu.'}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" className="px-6 py-2.5 rounded-full text-sm font-black uppercase tracking-wider bg-[color:var(--retro-cream)] text-[color:var(--retro-burgundy)]" onClick={() => { setSeed((x) => x + 1); setRound(0); setPicked(null); setScore(0); }}>
              Main lagi
            </button>
            <Link to="/eli-notes" className="px-6 py-2.5 rounded-full text-sm font-black uppercase tracking-wider border border-[color:var(--retro-cream)]/40">Baca Eli Notes</Link>
          </div>
        </div>
      </Shell>
    );
  }

  const q = quiz[round];
  const answered = picked !== null;
  const choose = (d) => {
    if (answered) return;
    setPicked(d);
    if (d === q.answer) setScore((x) => x + 1);
  };

  return (
    <Shell>
      <p className="mt-2 text-sm text-[color:var(--retro-text-secondary)]">Eli bilang ini di live hari apa?</p>
      <p className="mt-4 text-xs font-black text-[color:var(--retro-text-muted)]">Soal {round + 1} dari {quiz.length} · skor {score}</p>
      <blockquote
        className="mt-2 rounded-2xl bg-white border border-[color:var(--retro-brown-dark)]/10 p-6 font-header text-2xl sm:text-3xl italic leading-snug text-[color:var(--retro-text-primary)]"
        style={{ borderTop: `4px solid ${MOODS[q.note.mood].tone}` }}
      >
        “{q.note.quote}”
      </blockquote>

      <ul className="mt-4 grid gap-2">
        {q.options.map((d) => {
          const state = !answered ? 'idle' : d === q.answer ? 'right' : d === picked ? 'wrong' : 'idle';
          return (
            <li key={d}>
              <button
                type="button"
                onClick={() => choose(d)}
                disabled={answered}
                className={`w-full text-left rounded-xl border px-4 py-3 text-sm font-bold transition-colors ${
                  state === 'right' ? 'bg-[#2f5d3f] border-[#2f5d3f] text-white'
                    : state === 'wrong' ? 'bg-[color:var(--retro-burgundy)] border-[color:var(--retro-burgundy)] text-white'
                      : 'bg-white border-[color:var(--retro-brown-dark)]/15 text-[color:var(--retro-text-primary)] hover:border-[color:var(--retro-burgundy)]/50'
                }`}
              >
                {prettyDate(d)}
                {state === 'right' && <i className="ri-check-line ml-2" />}
                {state === 'wrong' && <i className="ri-close-line ml-2" />}
              </button>
            </li>
          );
        })}
      </ul>

      {answered && (
        <div className="mt-5 rounded-2xl bg-white border border-[color:var(--retro-brown-dark)]/10 p-5" aria-live="polite">
          <p className="text-xs font-black text-[color:var(--retro-text-muted)]">
            {picked === q.answer ? 'Benar!' : 'Hampir.'} {PLATFORMS[q.note.platform]} · {prettyDate(q.note.date)} · menit {fmtMinute(q.note.at)}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--retro-text-primary)]">{q.note.story}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" className={btn} onClick={() => { setRound((r) => r + 1); setPicked(null); }}>
              {round + 1 < quiz.length ? 'Soal berikutnya' : 'Lihat skor'}
            </button>
            <Link to={`/eli-notes/${q.note.id}`} className="text-sm font-bold underline text-[color:var(--retro-burgundy)]">Buka catatannya</Link>
          </div>
        </div>
      )}
    </Shell>
  );
};

export default TebakMomen;
