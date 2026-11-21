/**
 * miniGamesStorage — per-browser records for /mini-games.
 *
 * One localStorage key holds everything. Every access is wrapped so a
 * blocked or full storage just means "no records", never a crash.
 *
 * Shape (v1):
 *   { memory: { best: { 'bebas:mudah': { timeMs, moves, stars, at } },
 *               daily: { 'mudah': { date, timeMs, moves, stars, at } } } }
 */

import { compareResults } from './memoryGame';
import { compareRuns } from './memoryChallenge';

export const STORAGE_KEY = 'armeniaca_mg_v1';

export const loadAll = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const v = raw ? JSON.parse(raw) : null;
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
};

const saveAll = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable: records just aren't kept */
  }
};

/** Best result for a free-mode level, or today's daily result. */
export const getMemoryRecord = (mode, levelId, wibDate) => {
  const mem = loadAll().memory || {};
  if (mode === 'harian') {
    const d = mem.daily?.[levelId];
    return d && d.date === wibDate ? d : null;
  }
  return mem.best?.[`bebas:${levelId}`] || null;
};

/**
 * Store a finished game. Returns { record, isRecord, previous }.
 * Daily results only compete with the same WIB date.
 */
export const saveMemoryResult = (mode, levelId, wibDate, result) => {
  const all = loadAll();
  const mem = { best: {}, daily: {}, ...(all.memory || {}) };
  const previous = getMemoryRecord(mode, levelId, wibDate);
  const isRecord = !previous || compareResults(result, previous) < 0;
  const entry = { ...result, at: new Date().toISOString() };
  if (isRecord) {
    if (mode === 'harian') mem.daily = { ...mem.daily, [levelId]: { ...entry, date: wibDate } };
    else mem.best = { ...mem.best, [`bebas:${levelId}`]: entry };
    saveAll({ ...all, memory: mem });
  }
  return { record: isRecord ? entry : previous, isRecord, previous };
};

/** Best Mode Tantangan run: { stage, cleared, timeMs, moves, at } or null. */
export const getChallengeRecord = () => loadAll().challenge?.best || null;

/** Store a finished run (failed, stopped, or cleared). Returns { isRecord, previous }. */
export const saveChallengeRun = (runResult) => {
  const all = loadAll();
  const previous = all.challenge?.best || null;
  const isRecord = !previous || compareRuns(runResult, previous) < 0;
  if (isRecord) {
    saveAll({ ...all, challenge: { ...(all.challenge || {}), best: { ...runResult, at: new Date().toISOString() } } });
  }
  return { isRecord, previous };
};
