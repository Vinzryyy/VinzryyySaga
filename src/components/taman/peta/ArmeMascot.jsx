/**
 * ArmeMascot — warga terakhir ArmeniacaTown.
 *
 * Mascot overlay yang nyambut pengunjung, ngenarrate milestone pas
 * kebaikan numpuk, dan inget kalo user lama gak balik. Replay-able:
 * tap Arme kapan aja buka drawer "Topik" — semua dialog yang pernah
 * fire bisa di-replay (plus yang pre-crossed pas first visit).
 *
 * Asset placeholder: /FashionTime/Base.png (paper-doll dress-up base).
 * Mascot apricot final tinggal swap AVATAR_SRC.
 *
 * State persist di localStorage 'armeniaca-arme':
 *   { lastSeen: ISO date, lastSeenCount: int,
 *     heard: { [dialogId]: { status: 'heard'|'pre-crossed', at: ISO } } }
 *
 * External trigger dari TamanPeta:
 *   window.dispatchEvent(new CustomEvent('arme:trigger', { detail: 'pohon-click' }))
 *   window.dispatchEvent(new CustomEvent('arme:trigger', { detail: 'petak-first-pick' }))
 *
 * Trigger ordering (kalau multi fire pas mount):
 *   welcome → returning → date-match → count-cross (ascending by `at`)
 *   queue FIFO; user dismiss satu → next play.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ARME_DIALOGS, ARME_CATEGORIES } from '../../../data/armeDialogs';

const STORAGE_KEY = 'armeniaca-arme';
const AVATAR_SRC = '/FashionTime/Base.png';

const BUBBLE_AUTO_ADVANCE_MS = 3200;
const FINAL_DISMISS_DELAY_MS = 4500;
const WELCOME_DELAY_INTRO_MS = 11_500;
const WELCOME_DELAY_RETURNING_MS = 1_500;
const IDLE_TIMEOUT_MS = 60_000;
const IDLE_COOLDOWN_MS = 5 * 60_000;
const DISMISS_QUICK_THRESHOLD_MS = 2_400;
const PETA_INTRO_KEY = 'taman-peta-intro-seen'; // sinkron sama TamanPetaIntroTitle

// ── Storage helpers ────────────────────────────────────────────────
const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveState = (patch) => {
  try {
    const prev = loadState() || {};
    const next = { ...prev, ...patch };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
};

const markHeard = (dialogId, status = 'heard') => {
  const prev = loadState() || {};
  const heard = { ...(prev.heard || {}) };
  const existing = heard[dialogId];
  // Promote pre-crossed → heard pada replay; gak pernah downgrade.
  if (!existing || (existing.status === 'pre-crossed' && status === 'heard')) {
    heard[dialogId] = { status, at: new Date().toISOString() };
  }
  return saveState({ heard });
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const daysSince = (iso) => {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
};

// ── Speech Bubble ──────────────────────────────────────────────────
const SpeechBubble = ({ text, currentIdx, total, isMobile, onAdvance, onDismiss }) => {
  return (
    <div
      className={
        isMobile
          ? 'pointer-events-auto absolute left-[88px] bottom-[140px] w-[min(72vw,260px)] z-30'
          : 'pointer-events-auto absolute left-[180px] bottom-[170px] w-[320px] z-30'
      }
    >
      <div className="relative rounded-2xl bg-white/95 backdrop-blur-sm shadow-2xl ring-1 ring-black/10 px-4 py-3">
        {/* Tail pointer menghadap avatar (kiri-bawah) */}
        <span
          className="absolute -left-2 bottom-4 w-4 h-4 rotate-45 bg-white/95 ring-1 ring-black/10"
          style={{ clipPath: 'polygon(0 0, 100% 100%, 0 100%)' }}
          aria-hidden
        />
        {/* Dismiss button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#2a1f30] text-white/85 text-xs leading-none ring-1 ring-white/20 hover:bg-[#3a2f40] transition-colors flex items-center justify-center"
          aria-label="Tutup"
        >
          ×
        </button>
        {/* Speaker label */}
        <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#9a5b4a] mb-1">
          Arme
        </div>
        {/* Bubble text — clickable to advance */}
        <button
          type="button"
          onClick={onAdvance}
          className="block w-full text-left text-[13px] md:text-sm leading-snug text-[#1c1f2a] focus:outline-none"
        >
          {text}
        </button>
        {/* Progress dots */}
        <div className="mt-2 flex items-center gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all ${
                i <= currentIdx ? 'w-3 bg-[#9a5b4a]' : 'w-1.5 bg-[#9a5b4a]/25'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Replay Drawer ──────────────────────────────────────────────────
const ReplayDrawer = ({ heardMap, onClose, onReplay }) => {
  const grouped = useMemo(() => {
    const out = {};
    ARME_DIALOGS.forEach((d) => {
      const status = heardMap?.[d.id]?.status;
      if (!status) return; // unheard — hide
      (out[d.category] ||= []).push({ ...d, status });
    });
    return Object.entries(out)
      .map(([catKey, items]) => ({
        key: catKey,
        meta: ARME_CATEGORIES[catKey] || { label: catKey, order: 99 },
        items,
      }))
      .sort((a, b) => a.meta.order - b.meta.order);
  }, [heardMap]);

  return (
    <div
      className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm flex items-end md:items-center justify-center px-3 md:px-6 py-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md max-h-[80vh] overflow-y-auto rounded-2xl bg-[#1c1f2a] ring-1 ring-white/12 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#1c1f2a]/95 backdrop-blur-sm border-b border-white/10 px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-white/55 text-[10px] uppercase tracking-[0.3em]">Topik</div>
            <div className="text-white text-base font-semibold">Cerita dari Arme</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 text-white/80 transition-colors flex items-center justify-center"
            aria-label="Tutup"
          >
            ×
          </button>
        </div>

        {grouped.length === 0 ? (
          <div className="px-5 py-10 text-center text-white/60 text-sm leading-relaxed">
            Belum ada cerita yang pernah Arme bagi.
            <br />
            Mulai siram Pohon di tengah dulu, ya.
          </div>
        ) : (
          <div className="px-5 py-4 space-y-5">
            {grouped.map(({ key, meta, items }) => (
              <div key={key}>
                <div className="text-[10px] uppercase tracking-[0.25em] text-[#d4a574] mb-2">
                  {meta.label}
                </div>
                <ul className="space-y-1">
                  {items.map((d) => (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => onReplay(d.id)}
                        className="w-full text-left flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors group"
                      >
                        <span className="mt-0.5 text-white/40 group-hover:text-[#d4a574] transition-colors text-sm">
                          ↻
                        </span>
                        <span className="flex-1">
                          <span className="block text-white/90 text-[13px] leading-snug">
                            {d.label}
                          </span>
                          {d.status === 'pre-crossed' && (
                            <span className="block text-white/40 text-[10px] mt-0.5">
                              Kelewatan pas kamu pertama dateng — bisa dibaca sekarang.
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────
const ArmeMascot = ({ armeniacaCount, armeniacaLoaded, flyInActive, modalOpen, isMobile }) => {
  const [queue, setQueue] = useState([]);
  const [activeDialogId, setActiveDialogId] = useState(null);
  const [activeLineIdx, setActiveLineIdx] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [heardMap, setHeardMap] = useState(() => loadState()?.heard || {});

  const initialMountRef = useRef(true);
  const lastProcessedCountRef = useRef(null);
  const advanceTimerRef = useRef(null);
  const dialogStartedAtRef = useRef(0);
  const idleTimerRef = useRef(null);

  // ── Helpers ──────────────────────────────────────────────────────
  const enqueueDialog = useCallback((id) => {
    setQueue((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const refreshHeard = useCallback(() => {
    setHeardMap(loadState()?.heard || {});
  }, []);

  // ── Effect: dequeue → activate ───────────────────────────────────
  useEffect(() => {
    if (modalOpen) return;
    if (activeDialogId) return;
    if (queue.length === 0) return;
    const nextId = queue[0];
    setQueue((prev) => prev.slice(1));
    setActiveDialogId(nextId);
    setActiveLineIdx(0);
    dialogStartedAtRef.current = Date.now();
  }, [queue, activeDialogId, modalOpen]);

  // ── Effect: auto-advance through lines ───────────────────────────
  useEffect(() => {
    if (!activeDialogId) return undefined;
    const dialog = ARME_DIALOGS.find((d) => d.id === activeDialogId);
    if (!dialog) {
      setActiveDialogId(null);
      return undefined;
    }
    const isLast = activeLineIdx >= dialog.lines.length - 1;
    const ms = isLast ? FINAL_DISMISS_DELAY_MS : BUBBLE_AUTO_ADVANCE_MS;

    advanceTimerRef.current = setTimeout(() => {
      if (isLast) {
        markHeard(activeDialogId, 'heard');
        refreshHeard();
        setActiveDialogId(null);
        setActiveLineIdx(0);
      } else {
        setActiveLineIdx((idx) => idx + 1);
      }
    }, ms);

    return () => clearTimeout(advanceTimerRef.current);
  }, [activeDialogId, activeLineIdx, refreshHeard]);

  // ── Effect: initial mount triggers ───────────────────────────────
  useEffect(() => {
    if (flyInActive || !armeniacaLoaded) return;
    if (!initialMountRef.current) return;
    initialMountRef.current = false;

    const saved = loadState();
    const isFirstVisit = !saved;
    const introSeen = (() => {
      try {
        return localStorage.getItem(PETA_INTRO_KEY) === '1';
      } catch {
        return true;
      }
    })();

    const welcomeDelay =
      isFirstVisit && !introSeen ? WELCOME_DELAY_INTRO_MS : WELCOME_DELAY_RETURNING_MS;

    const t = setTimeout(() => {
      if (isFirstVisit) {
        // Mark milestone yang udah lewat sebagai pre-crossed (replayable
        // dari drawer tapi gak fire otomatis di first visit).
        ARME_DIALOGS.filter(
          (d) => d.trigger.type === 'count-cross' && d.trigger.at <= armeniacaCount,
        ).forEach((d) => markHeard(d.id, 'pre-crossed'));
        enqueueDialog('welcome');
      } else {
        const lastSeenCount = saved.lastSeenCount ?? armeniacaCount;
        const lastSeenISO = saved.lastSeen;
        const days = daysSince(lastSeenISO);
        const growth = armeniacaCount > lastSeenCount;

        // Returning variant
        const returningDialog = ARME_DIALOGS.find((d) => {
          if (d.trigger.type !== 'returning') return false;
          const { daysGte, daysLte, requiresGrowth } = d.trigger;
          if (daysGte != null && days < daysGte) return false;
          if (daysLte != null && days > daysLte) return false;
          if (requiresGrowth === true && !growth) return false;
          if (requiresGrowth === false && growth) return false;
          return true;
        });
        if (returningDialog) enqueueDialog(returningDialog.id);

        // Milestones crossed sejak last visit
        ARME_DIALOGS.filter(
          (d) =>
            d.trigger.type === 'count-cross' &&
            d.trigger.at > lastSeenCount &&
            d.trigger.at <= armeniacaCount,
        )
          .sort((a, b) => a.trigger.at - b.trigger.at)
          .forEach((d) => enqueueDialog(d.id));
      }

      // Date-match (seitansai) — fire kalau hari ini cocok & belum heard hari ini
      ARME_DIALOGS.filter((d) => d.trigger.type === 'date-match').forEach((d) => {
        if (d.trigger.iso !== todayISO()) return;
        const last = loadState()?.heard?.[d.id];
        if (last?.at?.slice(0, 10) === todayISO()) return;
        enqueueDialog(d.id);
      });

      saveState({ lastSeen: todayISO(), lastSeenCount: armeniacaCount });
      lastProcessedCountRef.current = armeniacaCount;
      refreshHeard();
    }, welcomeDelay);

    return () => clearTimeout(t);
  }, [flyInActive, armeniacaLoaded, armeniacaCount, enqueueDialog, refreshHeard]);

  // ── Effect: count change → new crossings ─────────────────────────
  useEffect(() => {
    if (flyInActive || !armeniacaLoaded) return;
    if (initialMountRef.current) return;
    const prev = lastProcessedCountRef.current ?? armeniacaCount;
    if (armeniacaCount <= prev) return;

    ARME_DIALOGS.filter(
      (d) =>
        d.trigger.type === 'count-cross' &&
        d.trigger.at > prev &&
        d.trigger.at <= armeniacaCount,
    )
      .sort((a, b) => a.trigger.at - b.trigger.at)
      .forEach((d) => enqueueDialog(d.id));

    lastProcessedCountRef.current = armeniacaCount;
    saveState({ lastSeenCount: armeniacaCount });
  }, [armeniacaCount, armeniacaLoaded, flyInActive, enqueueDialog]);

  // ── Effect: external window events ───────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const eventId = e.detail;
      const dialog = ARME_DIALOGS.find(
        (d) => d.trigger.type === 'event' && d.trigger.event === eventId,
      );
      if (!dialog) return;

      const saved = loadState();
      const heard = saved?.heard?.[dialog.id];

      if (dialog.trigger.once && heard?.status === 'heard') return;
      // Idle event cooldown
      if (eventId === 'idle' && heard) {
        const lastAt = new Date(heard.at).getTime();
        if (Date.now() - lastAt < IDLE_COOLDOWN_MS) return;
      }
      enqueueDialog(dialog.id);
    };
    window.addEventListener('arme:trigger', handler);
    return () => window.removeEventListener('arme:trigger', handler);
  }, [enqueueDialog]);

  // ── Effect: idle detection ───────────────────────────────────────
  useEffect(() => {
    const reset = () => {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        window.dispatchEvent(new CustomEvent('arme:trigger', { detail: 'idle' }));
      }, IDLE_TIMEOUT_MS);
    };
    reset();
    const events = ['mousemove', 'pointerdown', 'keydown', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
    return () => {
      clearTimeout(idleTimerRef.current);
      events.forEach((ev) => window.removeEventListener(ev, reset));
    };
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────
  const handleAdvance = useCallback(() => {
    clearTimeout(advanceTimerRef.current);
    const dialog = ARME_DIALOGS.find((d) => d.id === activeDialogId);
    if (!dialog) return;
    if (activeLineIdx >= dialog.lines.length - 1) {
      markHeard(activeDialogId, 'heard');
      refreshHeard();
      setActiveDialogId(null);
      setActiveLineIdx(0);
    } else {
      setActiveLineIdx((idx) => idx + 1);
    }
  }, [activeDialogId, activeLineIdx, refreshHeard]);

  const handleDismiss = useCallback(() => {
    clearTimeout(advanceTimerRef.current);
    const elapsed = Date.now() - dialogStartedAtRef.current;
    const dialog = ARME_DIALOGS.find((d) => d.id === activeDialogId);
    const wasEarlyDismiss =
      dialog &&
      dialog.id === 'welcome' &&
      elapsed < DISMISS_QUICK_THRESHOLD_MS &&
      activeLineIdx < dialog.lines.length - 1;

    if (activeDialogId) {
      markHeard(activeDialogId, 'heard');
      refreshHeard();
      setActiveDialogId(null);
      setActiveLineIdx(0);
    }

    if (wasEarlyDismiss) {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('arme:trigger', { detail: 'dismiss-quick' }));
      }, 600);
    }
  }, [activeDialogId, activeLineIdx, refreshHeard]);

  const handleAvatarClick = useCallback(() => {
    if (activeDialogId) {
      handleAdvance();
      return;
    }
    setDrawerOpen(true);
  }, [activeDialogId, handleAdvance]);

  const handleReplay = useCallback(
    (id) => {
      setDrawerOpen(false);
      enqueueDialog(id);
    },
    [enqueueDialog],
  );

  // ── Render ───────────────────────────────────────────────────────
  if (flyInActive) return null;

  const activeDialog = activeDialogId
    ? ARME_DIALOGS.find((d) => d.id === activeDialogId)
    : null;
  const activeLine = activeDialog?.lines[activeLineIdx];
  const hidden = modalOpen;

  return (
    <>
      <div
        className={`pointer-events-none fixed bottom-0 left-0 z-20 select-none transition-opacity duration-500 ${
          hidden ? 'opacity-0' : 'opacity-100'
        }`}
        aria-hidden={hidden}
      >
        <div className="relative">
          <button
            type="button"
            onClick={handleAvatarClick}
            className="pointer-events-auto relative block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a574]/70 rounded-tr-2xl"
            aria-label={activeDialog ? 'Lanjut dialog' : 'Buka topik Arme'}
          >
            <img
              src={AVATAR_SRC}
              alt="Arme — warga terakhir ArmeniacaTown"
              draggable={false}
              className={`block w-auto object-bottom transition-transform duration-300 hover:scale-[1.03] ${
                isMobile ? 'h-40' : 'h-60'
              }`}
              style={{ filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.45))' }}
            />
            {/* Name plate + hint */}
            <span
              className={`absolute left-3 ${
                isMobile ? 'bottom-2' : 'bottom-3'
              } flex flex-col items-start gap-1`}
            >
              <span className="rounded-full bg-[#1c1f2a]/80 backdrop-blur-sm px-2.5 py-0.5 text-[10px] md:text-[11px] font-semibold tracking-wider text-white ring-1 ring-white/15">
                Arme
              </span>
              {!activeDialog && (
                <span className="rounded-full bg-[#9a5b4a]/85 backdrop-blur-sm px-2 py-0.5 text-[9px] md:text-[10px] text-white/95 ring-1 ring-white/15 animate-pulse">
                  tap untuk ngobrol
                </span>
              )}
            </span>
          </button>

          {activeDialog && activeLine && (
            <SpeechBubble
              text={activeLine}
              currentIdx={activeLineIdx}
              total={activeDialog.lines.length}
              isMobile={isMobile}
              onAdvance={handleAdvance}
              onDismiss={handleDismiss}
            />
          )}
        </div>
      </div>

      {drawerOpen && (
        <ReplayDrawer
          heardMap={heardMap}
          onClose={() => setDrawerOpen(false)}
          onReplay={handleReplay}
        />
      )}
    </>
  );
};

export default ArmeMascot;
