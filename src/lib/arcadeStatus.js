/**
 * "Hari ini" for /mini-games: where each game stands for this visitor,
 * read from what the games already keep in this browser (nothing new is
 * stored or sent). Every reader is defensive: no storage → fresh status.
 */

import { BUAH_CAP, canPluckToday, getBuah, getJakartaDate, loadQuizState, loadState } from './petikanStorage';
import { getChallengeRecord, getMemoryRecord } from './miniGamesStorage';
import { loadClaimed, setProgress, SETS } from './petikanBinder';
import { STAGE_COUNT } from './memoryChallenge';

export const QUIZ_PER_DAY = 5;
export const MEMORY_DAILY_LEVELS = ['mudah', 'sedang', 'sulit'];

/** ArmePack: daily pluck, buah, collection and binder sets. */
export const armepackStatus = (pool, now = new Date()) => {
  const state = loadState();
  const owned = Object.keys(state.buku || {}).length;
  const sets = setProgress(pool, state.buku || {});
  return {
    canPluck: canPluckToday(state, now),
    buah: getBuah(),
    buahCap: BUAH_CAP,
    owned,
    total: pool.length,
    setsComplete: sets.filter((s) => s.complete).length,
    setsTotal: SETS.length,
    rewardsWaiting: sets.filter((s) => s.complete && !loadClaimed().has(s.id)).length,
  };
};

/** Kuis Helisma: questions answered today (5 a day). */
export const quizStatus = (now = new Date()) => {
  const q = loadQuizState(getJakartaDate(now));
  return { answered: Math.min(QUIZ_PER_DAY, Object.keys(q.answered || {}).length), total: QUIZ_PER_DAY };
};

/** Pasangkan Momen: today's daily boards done, and the best Mode Tantangan run. */
export const memoryStatus = (now = new Date()) => {
  const today = getJakartaDate(now);
  const done = MEMORY_DAILY_LEVELS.filter((l) => getMemoryRecord('harian', l, today)).length;
  const best = getChallengeRecord();
  return {
    dailyDone: done,
    dailyTotal: MEMORY_DAILY_LEVELS.length,
    challenge: best ? (best.cleared ? `Tamat ${STAGE_COUNT}/${STAGE_COUNT}` : `Tingkat ${best.stage}/${STAGE_COUNT}`) : null,
  };
};

/**
 * The "Hari ini" checklist: [{ id, label, detail, done, to }], undone first
 * keeps its natural order so the list reads like a routine.
 */
export const todayList = ({ armepack, quiz, memory }) => [
  {
    id: 'pluck',
    label: 'Petik ArmePack',
    detail: armepack.canPluck ? 'Petikan gratis hari ini siap' : 'Sudah dipetik, kembali besok',
    done: !armepack.canPluck,
    to: '/armepack',
  },
  {
    id: 'quiz',
    label: 'Kuis Helisma',
    detail: `${quiz.answered}/${quiz.total} soal dijawab`,
    done: quiz.answered >= quiz.total,
    to: '/armepack',
  },
  {
    id: 'memory',
    label: 'Pasangkan Momen harian',
    detail: `${memory.dailyDone}/${memory.dailyTotal} papan selesai`,
    done: memory.dailyDone >= memory.dailyTotal,
    to: '/mini-games/memory?mode=harian',
  },
];
