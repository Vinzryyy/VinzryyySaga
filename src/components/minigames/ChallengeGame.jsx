/**
 * Mode Tantangan — climb 7 stages of Pasangkan Momen in one run.
 * Logic: lib/memoryChallenge.js. This file is UI, timers and run flow.
 */
import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import MemoryCard from './MemoryCard';
import { Celebration, SITE_URL, btnGhost, btnPrimary, preload, scrollToEl } from './shared';
import { sfx } from '../../lib/gameSfx';
import { formatDuration, hashSeed } from '../../lib/memoryGame';
import {
  MAX_LIVES,
  MISMATCH_MS,
  STAGES,
  STAGE_COUNT,
  challengeReducer,
  challengeShareText,
  createStage,
  initialStage,
  livesAfterClear,
  stageFor,
} from '../../lib/memoryChallenge';
import { getChallengeRecord, saveChallengeRun } from '../../lib/miniGamesStorage';

const Hearts = ({ lives, hit }) => (
  <span key={hit} className={`inline-flex items-center gap-0.5 ${hit ? 'mm-heart-hit' : ''}`} aria-label={`${lives} dari ${MAX_LIVES} nyawa`}>
    {Array.from({ length: MAX_LIVES }, (_, i) => (
      <i
        key={i}
        className={i < lives ? 'ri-heart-fill text-[color:var(--retro-burgundy)]' : 'ri-heart-line text-[color:var(--retro-text-muted)]/60'}
      />
    ))}
  </span>
);

const StageDots = ({ current, cleared }) => (
  <span className="inline-flex items-center gap-1" aria-hidden="true">
    {STAGES.map((st, i) => (
      <span
        key={st.n}
        className={`h-1.5 rounded-full transition-all ${
          i < cleared ? 'w-4 bg-[color:var(--retro-gold)]' : i === current ? 'w-4 bg-[color:var(--retro-burgundy)]' : 'w-1.5 bg-[color:var(--retro-brown-dark)]/20'
        }`}
      />
    ))}
  </span>
);

const EVENT_TEXT = {
  joker: (e) => (e.photoId ? 'Joker! Pasangannya langsung cocok.' : 'Dua Joker terpakai.'),
  bomb: () => 'BOM! Kartu tertutup diacak ulang.',
  swap: () => 'Papan gelisah: dua kartu bertukar tempat.',
  life: (e) => (e.lives > 0 ? '−1 nyawa: pasangannya tadi di kartu yang menyala.' : 'Nyawa habis!'),
  match: (e) => (e.combo > 1 ? `Combo ×${e.combo}` : 'Cocok!'),
};

const ChallengeGame = ({ pool, onBusyChange }) => {
  const [phase, setPhase] = useState('idle'); // idle | loading | peek | play | cleared | over
  // Phones get the 30-card Master (decided once per run so it can't change mid-run).
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches);
  const [hint, setHint] = useState(null); // { slot, seq } — forgotten partner flash
  const [stageIdx, setStageIdx] = useState(0);
  const [photos, setPhotos] = useState([]);
  const [game, dispatch] = useReducer(challengeReducer, initialStage([], STAGES[0]));
  const [totals, setTotals] = useState({ timeMs: 0, moves: 0 }); // cleared stages only
  const [result, setResult] = useState(null);
  const [record, setRecord] = useState(() => getChallengeRecord());
  const [now, setNow] = useState(() => Date.now());
  const [paused, setPaused] = useState(false);
  const [focusIdx, setFocusIdx] = useState(0);
  const [toast, setToast] = useState(null);
  const [fx, setFx] = useState(null); // { type, seq, slots? }
  const [shareState, setShareState] = useState(null);
  const [pausedMs, setPausedMs] = useState(0);
  const [pauseStart, setPauseStart] = useState(null);
  const usedRef = useRef(new Set());
  const compactRef = useRef(false);
  const runRef = useRef(0);
  const handledRef = useRef(null);
  const cardRefs = useRef([]);
  const hudRef = useRef(null);
  const resultRef = useRef(null);

  const stage = stageFor(stageIdx, compact);
  const peekMs = stage.peekMs || stage.specialPeekMs || 0;
  const peekSpecialOnly = !stage.peekMs && Boolean(stage.specialPeekMs);
  const photoById = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos]);
  const inRun = phase === 'loading' || phase === 'peek' || phase === 'play' || phase === 'cleared';

  useEffect(() => {
    onBusyChange?.(inRun);
  }, [inRun, onBusyChange]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);

  const stageTime = (g = game) =>
    g.startedAt == null ? 0 : (g.finishedAt ?? g.failedAt ?? (paused ? pauseStart : now)) - g.startedAt - pausedMs;

  const loadStage = useCallback(
    async (idx, lives) => {
      const run = runRef.current;
      setPhase('loading');
      setStageIdx(idx);
      setToast(null);
      setFx(null);
      setPaused(false);
      setPausedMs(0);
      setPauseStart(null);
      handledRef.current = null;
      const b = createStage(pool, idx, hashSeed(`tantangan:${Date.now()}:${Math.random()}`), usedRef.current, compactRef.current);
      await preload(b.photos);
      if (run !== runRef.current) return;
      b.photos.forEach((p) => usedRef.current.add(p.id));
      setPhotos(b.photos);
      dispatch({ type: 'reset', deck: b.deck, stage: b.stage, lives });
      setFocusIdx(0);
      setHint(null);
      setPhase(b.stage.peekMs || b.stage.specialPeekMs ? 'peek' : 'play');
      requestAnimationFrame(() => scrollToEl(hudRef.current, -88));
    },
    [pool],
  );

  const startRun = useCallback(() => {
    if (!pool?.length) return;
    const isCompact = window.matchMedia('(max-width: 639px)').matches;
    compactRef.current = isCompact;
    setCompact(isCompact);
    runRef.current += 1;
    usedRef.current = new Set();
    setTotals({ timeMs: 0, moves: 0 });
    setResult(null);
    setShareState(null);
    loadStage(0, MAX_LIVES);
  }, [pool, loadStage]);

  const endRun = useCallback(
    (outcome, clearedCount, sum) => {
      const run = { stage: clearedCount, cleared: clearedCount === STAGE_COUNT, timeMs: sum.timeMs, moves: sum.moves };
      const saved = saveChallengeRun(run);
      setRecord(getChallengeRecord());
      setResult({ ...run, outcome, ...saved });
      setPhase('over');
      requestAnimationFrame(() => scrollToEl(resultRef.current));
    },
    [],
  );

  // Peek.
  useEffect(() => {
    if (phase !== 'peek') return undefined;
    const t = setTimeout(() => setPhase('play'), peekMs);
    return () => clearTimeout(t);
  }, [phase, peekMs]);

  // Mismatch auto-hide (may trigger a papan-gelisah swap).
  useEffect(() => {
    if (game.open.length !== 2 || game.failedAt != null) return undefined;
    const t = setTimeout(() => dispatch({ type: 'hide', rand: Math.random() }), MISMATCH_MS);
    return () => clearTimeout(t);
  }, [game.open, game.failedAt]);

  // Clock.
  const running = phase === 'play' && game.startedAt != null && game.finishedAt == null && game.failedAt == null && !paused;
  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [running]);

  const pause = useCallback(() => {
    if (phase !== 'play' || game.finishedAt != null || game.failedAt != null || paused) return;
    setPauseStart(Date.now());
    setPaused(true);
  }, [phase, game.finishedAt, game.failedAt, paused]);

  const resume = useCallback(() => {
    if (!paused) return;
    if (pauseStart != null && game.startedAt != null) setPausedMs((ms) => ms + Date.now() - pauseStart);
    setPauseStart(null);
    setPaused(false);
    setNow(Date.now());
  }, [paused, pauseStart, game.startedAt]);

  useEffect(() => {
    const onVis = () => document.visibilityState === 'hidden' && pause();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [pause]);

  // Events → toast + board effects.
  useEffect(() => {
    const e = game.event;
    if (!e) return undefined;
    setToast({ ...e, text: EVENT_TEXT[e.type]?.(e) });
    if (e.type === 'bomb' || e.type === 'swap') setFx(e);
    if (e.type === 'life' && e.slot >= 0) setHint({ slot: e.slot, seq: e.seq });
    if (e.type === 'life' && e.lives <= 0) sfx('fail');
    else sfx(e.type, { combo: e.combo });
    const t = setTimeout(() => setToast(null), e.type === 'match' ? 1400 : 2200);
    return () => clearTimeout(t);
  }, [game.event]);

  // Plain mismatch (no life lost): a soft thud.
  const lastMissRef = useRef({ n: 0, seq: 0 });
  useEffect(() => {
    const last = lastMissRef.current;
    const lifeJustLost = game.event?.type === 'life' && game.seq !== last.seq;
    if (game.mismatches > last.n && !lifeJustLost) sfx('miss');
    lastMissRef.current = { n: game.mismatches, seq: game.seq };
  }, [game.mismatches, game.seq, game.event]);

  useEffect(() => {
    if (!hint) return undefined;
    const t = setTimeout(() => setHint(null), 1300);
    return () => clearTimeout(t);
  }, [hint]);

  useEffect(() => {
    if (!fx) return undefined;
    const t = setTimeout(() => setFx(null), 950);
    return () => clearTimeout(t);
  }, [fx]);

  // Stage cleared / run failed.
  useEffect(() => {
    if (phase !== 'play') return undefined;
    const endAt = game.finishedAt ?? game.failedAt;
    if (endAt == null || handledRef.current === endAt) return undefined;
    handledRef.current = endAt;
    const spent = { timeMs: Math.max(0, endAt - game.startedAt - pausedMs), moves: game.moves };
    const sum = { timeMs: totals.timeMs + spent.timeMs, moves: totals.moves + spent.moves };
    // No cleanup: once handled, this must fire even if deps change; a new
    // run (runRef) makes it a no-op instead.
    const run = runRef.current;
    setTimeout(() => {
      if (run !== runRef.current) return;
      if (game.failedAt != null) {
        endRun('failed', stageIdx, sum);
      } else {
        setTotals(sum);
        if (stageIdx === STAGE_COUNT - 1) {
          sfx('win');
          endRun('complete', STAGE_COUNT, sum);
        } else {
          sfx('clear');
          setPhase('cleared');
        }
      }
    }, game.failedAt != null ? 1100 : 650);
    return undefined;
  }, [phase, game.finishedAt, game.failedAt, game.startedAt, game.moves, pausedMs, totals, stageIdx, endRun]);

  const flip = useCallback(
    (i) => {
      if (phase !== 'play' || paused) return;
      sfx('flip');
      dispatch({ type: 'flip', index: i, now: Date.now(), rand: Math.random() });
    },
    [phase, paused],
  );

  const onGridKeyDown = (e) => {
    const cols = window.matchMedia('(min-width: 640px)').matches ? stage.wide[0] : stage.cols;
    const n = game.deck.length;
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols };
    let next = null;
    if (e.key in step) next = focusIdx + step[e.key];
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    if (next == null) return;
    e.preventDefault();
    next = Math.max(0, Math.min(n - 1, next));
    setFocusIdx(next);
    cardRefs.current[next]?.focus();
  };

  const share = async () => {
    const text = challengeShareText({ ...result, url: `${SITE_URL}/mini-games/memory?mode=tantangan`, formatDuration });
    try {
      if (navigator.share) return void (await navigator.share({ text }));
      await navigator.clipboard.writeText(text);
      setShareState('copied');
    } catch (err) {
      if (err?.name !== 'AbortError') setShareState('failed');
    }
  };

  const boardVars = { '--c': stage.cols, '--r': stage.rows, '--cw': stage.wide[0], '--rw': stage.wide[1] };
  const showBoard = phase !== 'idle' && phase !== 'loading' && game.deck.length > 0;
  const clearedCount = phase === 'over' ? (result?.stage ?? 0) : phase === 'cleared' ? stageIdx + 1 : stageIdx;
  const revealAll = phase === 'over' || game.failedAt != null;
  const next = STAGES[stageIdx + 1];
  const pairsDone = game.done.filter((u) => u.endsWith('-a')).length;

  return (
    <>
      <p className="mt-2 text-xs text-[color:var(--retro-text-light)]">
        {STAGE_COUNT} tingkat · {MAX_LIVES} nyawa · Joker, Bom, dan papan gelisah muncul bertahap
        {record && (
          <>
            {' · '}Rekor{' '}
            <b className="text-[color:var(--retro-text-secondary)]">
              {record.cleared ? `Tamat ${STAGE_COUNT}/${STAGE_COUNT}` : `Tingkat ${record.stage}`}
            </b>{' '}
            ({formatDuration(record.timeMs)})
          </>
        )}
      </p>

      {/* HUD */}
      <div ref={hudRef} className="mt-5 mb-3 flex flex-wrap items-center justify-between gap-3 min-h-[40px]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-bold tabular-nums text-[color:var(--retro-text-primary)]">
          <span className="inline-flex items-center gap-2">
            <span className="font-header font-black">Tingkat {stage.n}</span>
            <StageDots current={stageIdx} cleared={clearedCount} />
          </span>
          <Hearts lives={phase === 'idle' ? MAX_LIVES : game.lives} hit={game.event?.type === 'life' ? game.seq : 0} />
          <span className="inline-flex items-center gap-1.5">
            <i className="ri-time-line text-[color:var(--retro-burgundy)]" />
            {formatDuration(totals.timeMs + (phase === 'play' || phase === 'peek' ? stageTime() : 0))}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5">
            <i className="ri-footprint-line text-[color:var(--retro-burgundy)]" />
            {totals.moves + (phase === 'play' || phase === 'peek' ? game.moves : 0)}
          </span>
          {showBoard && (
            <span className="hidden sm:inline text-[color:var(--retro-text-light)]">
              {pairsDone}/{stage.pairs} cocok
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {phase === 'play' && game.finishedAt == null && game.failedAt == null && (
            <button type="button" onClick={paused ? resume : pause} className="px-3 py-1.5 rounded-full text-xs font-bold border border-[color:var(--retro-brown-dark)]/20 text-[color:var(--retro-text-secondary)] hover:border-[color:var(--retro-burgundy)]/40">
              <i className={paused ? 'ri-play-fill mr-1' : 'ri-pause-fill mr-1'} />
              {paused ? 'Lanjut' : 'Jeda'}
            </button>
          )}
          {(phase === 'idle' || phase === 'over' || phase === 'play' || phase === 'peek') && (
            <button type="button" onClick={startRun} disabled={!pool?.length} className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] hover:bg-[color:var(--retro-burgundy-light)] disabled:opacity-50">
              {phase === 'idle' ? 'Mulai' : 'Ulang dari Tingkat 1'}
            </button>
          )}
        </div>
      </div>

      {/* Board */}
      <div className="relative">
        {showBoard ? (
          <div
            className={`mm-board${fx?.type === 'bomb' ? ' fx-bomb' : ''}`}
            key={fx?.type === 'bomb' ? `b${fx.seq}` : 'board'}
            role="grid"
            aria-label={`Tingkat ${stage.n}, ${game.deck.length} kartu`}
            style={boardVars}
            onKeyDown={onGridKeyDown}
          >
            {game.deck.map((card, i) => {
              const isDone = game.done.includes(card.uid);
              const matched = isDone && card.kind === 'photo';
              const spent = isDone && card.kind !== 'photo';
              return (
                <MemoryCard
                  key={card.uid}
                  ref={(el) => {
                    cardRefs.current[i] = el;
                  }}
                  index={i}
                  kind={card.kind}
                  photo={card.kind === 'photo' ? photoById.get(card.photoId) : null}
                  faceUp={
                    (phase === 'peek' && (!peekSpecialOnly || card.kind !== 'photo')) ||
                    revealAll ||
                    game.open.includes(i) ||
                    hint?.slot === i
                  }
                  hint={hint?.slot === i}
                  matched={matched}
                  spent={spent}
                  justMatched={matched && game.event?.photoId === card.photoId}
                  swapped={fx?.type === 'swap' && fx.slots?.includes(i)}
                  disabled={phase !== 'play' || paused}
                  tabIndex={i === focusIdx ? 0 : -1}
                  onFlip={flip}
                  onFocus={setFocusIdx}
                />
              );
            })}
          </div>
        ) : (
          <div className="mm-board" style={boardVars} aria-hidden="true">
            {Array.from({ length: stage.cols * stage.rows }, (_, i) => (
              <div key={i} className="mm-card" style={{ cursor: 'default' }}>
                <span className="mm-inner">
                  <span className="mm-face mm-back"><span>A</span></span>
                </span>
              </div>
            ))}
          </div>
        )}

        {(phase === 'idle' || phase === 'loading') && (
          <div className="absolute inset-0 grid place-items-center p-4">
            <div className="bg-[color:var(--retro-cream)]/95 backdrop-blur-sm rounded-2xl border border-[color:var(--retro-brown-dark)]/15 shadow-lg px-6 py-5 text-center max-w-sm">
              {phase === 'loading' || !pool ? (
                <p className="font-bold text-[color:var(--retro-text-primary)]" role="status">
                  <i className="ri-loader-4-line animate-spin inline-block mr-2" />
                  {phase === 'loading' ? `Menyiapkan Tingkat ${stage.n}…` : 'Memuat foto…'}
                </p>
              ) : (
                <>
                  <p className="font-header text-xl font-black text-[color:var(--retro-text-primary)]">Mode Tantangan</p>
                  <ul className="mt-2 text-left text-xs text-[color:var(--retro-text-secondary)] space-y-1">
                    <li>• {STAGE_COUNT} tingkat, makin lama makin banyak kartu.</li>
                    <li>• <b>🌸 Joker</b> (bunga aprikot) cocok dengan kartu apa saja.</li>
                    <li>• <b>💣 Bom</b> kelihatan di awal tingkat. Ingat letaknya: kalau terbuka, kartu tertutup diacak ulang.</li>
                    <li>• <b>Papan gelisah</b>: tiap 3 kali salah, dua kartu bertukar.</li>
                    <li>• <b>{MAX_LIVES} nyawa</b>, berkurang kalau salah padahal pasangannya sudah pernah terlihat (kartunya akan menyala). +1 tiap naik tingkat.</li>
                  </ul>
                  <button type="button" onClick={startRun} className={`mt-4 ${btnPrimary}`}>Mulai</button>
                </>
              )}
            </div>
          </div>
        )}

        {phase === 'peek' && (
          <div className="absolute inset-x-0 -top-1 flex justify-center pointer-events-none">
            <span className="px-3 py-1 rounded-full bg-[color:var(--retro-text-primary)] text-[color:var(--retro-cream)] text-xs font-bold" role="status">
              {peekSpecialOnly ? 'Ingat letak Bom dan Joker…' : 'Ingat posisinya…'}
            </span>
          </div>
        )}

        {paused && (
          <div className="absolute inset-0 grid place-items-center bg-[color:var(--retro-bg-primary)]/85 backdrop-blur-md rounded-xl">
            <div className="text-center">
              <p className="font-header text-2xl font-black text-[color:var(--retro-text-primary)]">Dijeda</p>
              <button type="button" onClick={resume} className={`mt-3 ${btnPrimary}`}>Lanjut</button>
            </div>
          </div>
        )}

        {/* Stage clear: offer the next, harder stage. */}
        {phase === 'cleared' && next && (
          <div className="absolute inset-0 grid place-items-center p-4 bg-[color:var(--retro-bg-primary)]/70 backdrop-blur-[2px] rounded-xl">
            <Celebration key={`c${stageIdx}`} count={22} />
            <div className="mm-pop-in bg-white rounded-2xl border border-[color:var(--retro-gold)]/60 shadow-xl px-6 py-5 text-center max-w-sm" role="dialog" aria-labelledby="mm-clear">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-gold)]">Tingkat {stage.n} selesai</p>
              <h3 id="mm-clear" className="font-header text-2xl font-black text-[color:var(--retro-text-primary)] mt-1">
                Naik ke Tingkat {next.n}?
              </h3>
              <p className="mt-2 text-sm text-[color:var(--retro-text-secondary)]">{stageFor(stageIdx + 1, compact).intro}</p>
              <p className="mt-2 text-xs text-[color:var(--retro-text-light)]">
                {(() => { const ns = stageFor(stageIdx + 1, compact); return ns.pairs * 2 + ns.jokers + ns.bombs; })()} kartu · nyawa jadi {livesAfterClear(game.lives)} · total {formatDuration(totals.timeMs)}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button type="button" autoFocus onClick={() => loadStage(stageIdx + 1, livesAfterClear(game.lives))} className={btnPrimary}>
                  Naik tingkat <i className="ri-arrow-right-line" />
                </button>
                <button type="button" onClick={() => endRun('stopped', stageIdx + 1, totals)} className={btnGhost}>
                  Berhenti di sini
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Event toast */}
        <div className="absolute inset-x-0 -bottom-2 translate-y-full flex justify-center pointer-events-none" aria-live="polite">
          {toast && phase === 'play' && toast.text && (
            <span
              key={toast.seq}
              className={`mm-combo mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold shadow ${
                toast.type === 'bomb' || toast.type === 'life'
                  ? 'bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] border-[color:var(--retro-burgundy)]'
                  : 'bg-white text-[color:var(--retro-text-primary)] border-[color:var(--retro-gold)]'
              }`}
            >
              {toast.text}
            </span>
          )}
        </div>
      </div>

      {/* Run result */}
      {phase === 'over' && result && (
        <section ref={resultRef} className="relative mt-12 rounded-2xl bg-white border border-[color:var(--retro-brown-dark)]/12 shadow-sm p-5 sm:p-7" aria-labelledby="mm-run">
          {(result.outcome === 'complete' || (result.isRecord && result.stage > 0)) && <Celebration count={36} />}
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]">Mode Tantangan</p>
          <h2 id="mm-run" className="font-header text-3xl sm:text-4xl font-black text-[color:var(--retro-text-primary)] mt-1">
            {result.outcome === 'complete'
              ? 'Tamat! Semua tingkat beres.'
              : result.outcome === 'failed'
              ? `Nyawa habis di Tingkat ${result.stage + 1}`
              : `Berhenti di Tingkat ${result.stage}`}
          </h2>
          {result.isRecord && result.stage > 0 && <p className="mt-1 text-sm font-bold text-[color:var(--retro-gold)]">Rekor baru!</p>}
          <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
            {[
              ['Tingkat selesai', `${result.stage}/${STAGE_COUNT}`],
              ['Total waktu', formatDuration(result.timeMs)],
              ['Langkah', result.moves],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-[color:var(--retro-bg-primary)] py-3">
                <dt className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--retro-text-light)]">{k}</dt>
                <dd className="font-header text-2xl font-black tabular-nums text-[color:var(--retro-text-primary)]">{v}</dd>
              </div>
            ))}
          </dl>
          {result.previous && !result.isRecord && (
            <p className="mt-3 text-xs text-[color:var(--retro-text-secondary)]">
              Rekor: {result.previous.cleared ? 'Tamat' : `Tingkat ${result.previous.stage}`} ({formatDuration(result.previous.timeMs)})
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={startRun} className={btnPrimary}>Main lagi</button>
            <button type="button" onClick={share} className={btnGhost}>
              <i className="ri-share-forward-line mr-1" />
              {shareState === 'copied' ? 'Tersalin!' : shareState === 'failed' ? 'Gagal menyalin' : 'Bagikan'}
            </button>
          </div>
        </section>
      )}
    </>
  );
};

export default ChallengeGame;
