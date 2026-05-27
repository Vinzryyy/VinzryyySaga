/**
 * KuisHelisma — daily quiz section di /petikan untuk earn buah extra.
 *
 * Mekanik:
 *   - 5 soal random per hari (deterministic per date, semua user sama)
 *   - Correct → 3 buah, wrong → 0 (no retry sampai midnight WIB)
 *   - Max 15 buah/hari dari kuis
 *   - Progress persist di localStorage (aprikot_quiz_state)
 *   - Auto-reset saat new day WIB
 *
 * UI:
 *   - Collapsed default — header tampil progress "X/5 benar · Y buah"
 *   - Expanded — current soal + 4 opsi MCQ
 *   - On answer: instant feedback (green correct / red wrong) + advance
 *   - All done: "Selesai. Total: Y dari 5 = Z buah. Balik besok."
 */

import React, { useMemo, useState } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import {
  pickDailyQuizSet,
  QUIZ_QUESTIONS_PER_DAY,
  QUIZ_REWARD_BUAH,
  QUIZ_MAX_BUAH_PER_DAY,
} from '../../data/helismaQuiz';
import {
  loadQuizState,
  saveQuizState,
  addBuah,
  getJakartaDate,
} from '../../lib/petikanStorage';

// Category labels — display Indonesian-friendly + remi-color accent.
const CATEGORY_META = {
  personal: { label: 'Personal', color: 'text-pink-700 bg-pink-50' },
  career: { label: 'Karier', color: 'text-amber-800 bg-amber-50' },
  theater: { label: 'Theater', color: 'text-burgundy-800 bg-rose-50' },
  discography: { label: 'Diskografi', color: 'text-indigo-700 bg-indigo-50' },
  social: { label: 'Sosial', color: 'text-sky-700 bg-sky-50' },
  trivia: { label: 'Trivia', color: 'text-emerald-700 bg-emerald-50' },
};

const KuisHelisma = ({ onBuahChange }) => {
  const today = getJakartaDate();
  const dailyQuizSet = useMemo(() => pickDailyQuizSet(today), [today]);
  const [quizState, setQuizState] = useState(() => loadQuizState(today));
  const [expanded, setExpanded] = useState(false);
  // Selected option index + reveal state untuk current question.
  // After click: lock selection, show correct/wrong feedback ~1.4s,
  // then commit to quizState (advance to next question).
  const [selected, setSelected] = useState(null);
  const [revealing, setRevealing] = useState(false);
  // Floating +3 buah popup — bumped saat correct, animate via CSS class.
  const [buahPopupKey, setBuahPopupKey] = useState(0);
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  // Cari soal yang belum dijawab di set hari ini.
  const currentQuiz = dailyQuizSet.find((q) => !quizState.answered[q.id]);
  const answeredEntries = Object.values(quizState.answered);
  const correctCount = answeredEntries.filter((v) => v === 'correct').length;
  const totalAnswered = answeredEntries.length;
  const allDone = totalAnswered >= QUIZ_QUESTIONS_PER_DAY;
  const earnedBuah = correctCount * QUIZ_REWARD_BUAH;

  const handleAnswer = (idx) => {
    if (!currentQuiz || revealing) return;
    setSelected(idx);
    setRevealing(true);
    const isCorrect = idx === currentQuiz.correctIndex;
    if (isCorrect) {
      addBuah(QUIZ_REWARD_BUAH);
      if (typeof onBuahChange === 'function') onBuahChange();
      // Bump key to retrigger CSS animation kalau correct beruntun.
      if (!prefersReducedMotion) setBuahPopupKey((k) => k + 1);
    }
    // Setelah jeda reveal, commit ke state + advance.
    setTimeout(() => {
      const nextState = {
        date: today,
        answered: {
          ...quizState.answered,
          [currentQuiz.id]: isCorrect ? 'correct' : 'wrong',
        },
      };
      setQuizState(nextState);
      saveQuizState(nextState);
      setSelected(null);
      setRevealing(false);
    }, 1400);
  };

  return (
    <div className="mb-8 bg-white/75 backdrop-blur-sm border border-[color:var(--retro-brown-dark)]/12 rounded-2xl shadow-[0_8px_28px_rgba(61,52,43,0.08)] overflow-hidden">
      {/* Header — always visible, click to expand/collapse */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-[color:var(--retro-burgundy)]/5 transition-colors"
        aria-expanded={expanded}
        aria-controls="kuis-helisma-body"
      >
        <div className="flex items-center gap-3">
          <i className="ri-question-line text-[color:var(--retro-burgundy)] text-xl" />
          <div>
            <p
              className="text-sm sm:text-base text-[color:var(--retro-brown-dark)] leading-tight"
              style={{
                fontFamily: '"Fraunces Variable", serif',
                fontWeight: 600,
              }}
            >
              Kuis Helisma · hari ini
            </p>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--retro-brown-dark)]/60 mt-0.5">
              {totalAnswered}/{QUIZ_QUESTIONS_PER_DAY} benar{' '}
              <span className="opacity-50">·</span> {earnedBuah}{' '}
              <span className="text-[11px]">🍑</span> dari max{' '}
              {QUIZ_MAX_BUAH_PER_DAY}
            </p>
          </div>
        </div>
        <i
          className={`ri-arrow-down-s-line text-xl text-[color:var(--retro-brown-dark)]/60 transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Body — soal current + opsi */}
      {expanded && (
        <div
          id="kuis-helisma-body"
          className="px-5 pb-5 pt-1 border-t border-[color:var(--retro-brown-dark)]/8"
        >
          {allDone ? (
            <div className="text-center py-6">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)] mb-3">
                Selesai
              </p>
              <p
                className="text-lg text-[color:var(--retro-brown-dark)] leading-relaxed"
                style={{ fontFamily: '"Fraunces Variable", serif' }}
              >
                {correctCount} dari {QUIZ_QUESTIONS_PER_DAY} benar
                <br />
                <span className="text-[color:var(--retro-burgundy)]">
                  +{earnedBuah} 🍑 buah
                </span>
              </p>
              <p className="text-xs text-[color:var(--retro-brown-dark)]/55 mt-3">
                Balik besok untuk 5 soal baru.
              </p>
            </div>
          ) : currentQuiz ? (
            <div className="py-3 relative">
              <div className="flex items-center gap-2 mb-3">
                <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]">
                  Soal {totalAnswered + 1} dari {QUIZ_QUESTIONS_PER_DAY}
                </p>
                {currentQuiz.category && CATEGORY_META[currentQuiz.category] && (
                  <span
                    className={`text-[9px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full ${CATEGORY_META[currentQuiz.category].color}`}
                  >
                    {CATEGORY_META[currentQuiz.category].label}
                  </span>
                )}
              </div>
              <p
                className="text-base sm:text-lg text-[color:var(--retro-brown-dark)] mb-4 leading-relaxed text-left"
                style={{ fontFamily: '"Fraunces Variable", serif' }}
              >
                {currentQuiz.question}
              </p>
              {/* Floating +3 buah popup — animate up + fade out saat
                  correct. key bump retrigger CSS animation. */}
              {revealing &&
                selected === currentQuiz.correctIndex &&
                !prefersReducedMotion && (
                  <span
                    key={buahPopupKey}
                    aria-hidden="true"
                    className="absolute right-1 top-0 text-[color:var(--retro-burgundy)] font-bold pointer-events-none"
                    style={{
                      fontFamily: '"Fraunces Variable", serif',
                      fontSize: '20px',
                      animation: 'kuisBuahPop 1.3s ease-out forwards',
                    }}
                  >
                    +{QUIZ_REWARD_BUAH} 🍑
                  </span>
                )}
              <div className="space-y-2">
                {currentQuiz.options.map((opt, idx) => {
                  const isSelected = selected === idx;
                  const isCorrect = idx === currentQuiz.correctIndex;
                  let buttonStyle =
                    'border-[color:var(--retro-brown-dark)]/15 hover:border-[color:var(--retro-burgundy)]/50 hover:bg-[color:var(--retro-burgundy)]/5';
                  if (revealing) {
                    if (isCorrect) {
                      buttonStyle =
                        'border-emerald-500/60 bg-emerald-50 text-emerald-900';
                    } else if (isSelected) {
                      buttonStyle =
                        'border-rose-500/60 bg-rose-50 text-rose-900';
                    } else {
                      buttonStyle =
                        'border-[color:var(--retro-brown-dark)]/15 opacity-60';
                    }
                  }
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={revealing}
                      onClick={() => handleAnswer(idx)}
                      className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${buttonStyle} ${
                        revealing ? 'cursor-default' : 'cursor-pointer'
                      }`}
                    >
                      <span className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--retro-brown-dark)]/50 mr-2">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {revealing && (
                <div className="mt-3 text-center">
                  <p
                    className="text-xs text-[color:var(--retro-brown-dark)]/65"
                    style={{ fontFamily: '"Fraunces Variable", serif' }}
                  >
                    {selected === currentQuiz.correctIndex
                      ? `Benar! +${QUIZ_REWARD_BUAH} 🍑 buah`
                      : 'Salah · 0 buah untuk soal ini'}
                  </p>
                  {currentQuiz.explanation && (
                    <p className="text-[11px] text-[color:var(--retro-brown-dark)]/55 italic mt-1 leading-relaxed">
                      {currentQuiz.explanation}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default KuisHelisma;
