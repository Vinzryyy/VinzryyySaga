/**
 * ArmeMascot — warga terakhir ArmeniacaTown.
 *
 * Mascot overlay yang nyambut pengunjung, ngenarrate milestone pas
 * kebaikan numpuk, dan inget kalo user lama gak balik. Replay-able:
 * tap Arme kapan aja buka drawer "Topik" — semua dialog yang pernah
 * fire bisa di-replay (plus yang pre-crossed pas first visit).
 *
 * Assets: /Arme/ELI_2_a.png (idle, hand-to-chin) + /Arme/ELI_1_a.png
 * (talking, pointing). Swap berdasarkan `isTalking` — pose berubah saat
 * dialog active biar avatar kerasa hidup. Paper-doll dress-up future
 * feature beda track (lihat memory project_dressup_feature).
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
import { writeDuckFactor } from '../../../lib/townAudioBus';

const STORAGE_KEY = 'armeniaca-arme';
const AVATAR_IDLE = '/Arme/ELI_2_a.png';
const AVATAR_TALK = '/Arme/ELI_1_a.png';

const BUBBLE_AUTO_ADVANCE_MS = 3200;
const FINAL_DISMISS_DELAY_MS = 4500;
const WELCOME_DELAY_INTRO_MS = 11_500;
const WELCOME_DELAY_RETURNING_MS = 1_500;
// Catatan: konstanta IDLE_TIMEOUT_MS / IDLE_COOLDOWN_MS /
// DISMISS_QUICK_THRESHOLD_MS udah di-remove. Arme sekarang strict
// achievement-based — gak self-fire dari diam (idle) atau reaktif
// ke dismiss gesture. Dialog 'bonus-idle' + 'bonus-dismiss-quick'
// tetep ada di catalog buat manual replay dari drawer.
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
// Two layout modes:
//   - 'corner': bubble absolutely positioned di samping avatar pojok
//     (default routine dialog). Tail menghadap kiri ke avatar.
//   - 'cinematic': VN-style. Mobile = bubble di atas Arme (kepepet
//     width), tail bawah-tengah. Desktop = Arme di tengah viewport +
//     bubble di kanannya, tail kiri-tengah ke avatar (visual novel).
const SpeechBubble = ({
  text,
  currentIdx,
  total,
  isMobile,
  mode = 'corner',
  onAdvance,
  onDismiss,
}) => {
  if (mode === 'cinematic') {
    // Tail menghadap avatar:
    //   mobile (bubble di atas Arme)  → tail bawah, point ke bawah
    //   desktop (bubble di samping)   → tail kiri, point ke kiri
    const tailPositionClass = isMobile
      ? 'absolute left-1/2 -bottom-2 -translate-x-1/2 w-4 h-4 rotate-45'
      : 'absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rotate-45';
    const tailClipPath = isMobile
      ? 'polygon(100% 0, 100% 100%, 0 100%)' // down-pointing wedge
      : 'polygon(0 0, 0 100%, 100% 100%)'; // left-pointing wedge

    return (
      <div className="pointer-events-auto relative z-30 w-[min(86vw,440px)]">
        <div className="relative rounded-2xl bg-white/97 backdrop-blur-sm shadow-2xl ring-1 ring-black/10 px-5 py-4 md:px-6 md:py-5">
          <span
            className={`${tailPositionClass} bg-white/97 ring-1 ring-black/10`}
            style={{ clipPath: tailClipPath }}
            aria-hidden
          />
          {/* Dismiss */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#2a1f30] text-white/85 text-sm leading-none ring-1 ring-white/20 hover:bg-[#3a2f40] transition-colors flex items-center justify-center"
            aria-label="Tutup"
          >
            ×
          </button>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9a5b4a] mb-2">
            Arme
          </div>
          <button
            type="button"
            onClick={onAdvance}
            className="block w-full text-left text-sm md:text-[15px] leading-relaxed text-[#1c1f2a] focus:outline-none"
          >
            {text}
          </button>
          <div className="mt-3 flex items-center justify-center gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i <= currentIdx ? 'w-4 bg-[#9a5b4a]' : 'w-2 bg-[#9a5b4a]/25'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        isMobile
          ? 'pointer-events-auto absolute left-[148px] bottom-[152px] w-[min(60vw,200px)] z-30'
          : 'pointer-events-auto absolute left-[210px] bottom-[170px] w-[320px] z-30'
      }
    >
      <div className="relative rounded-2xl bg-white/95 backdrop-blur-sm shadow-2xl ring-1 ring-black/10 px-4 py-3">
        <span
          className="absolute -left-2 bottom-4 w-4 h-4 rotate-45 bg-white/95 ring-1 ring-black/10"
          style={{ clipPath: 'polygon(0 0, 100% 100%, 0 100%)' }}
          aria-hidden
        />
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
        <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#9a5b4a] mb-1">
          Arme
        </div>
        <button
          type="button"
          onClick={onAdvance}
          className="block w-full text-left text-[13px] md:text-sm leading-snug text-[#1c1f2a] focus:outline-none"
        >
          {text}
        </button>
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
      // z-index extreme: drei <Html> labels (landmark text di scene
      // 3D) pakai default zIndexRange max ~16.7M. Modal harus di atas
      // itu supaya labels gak nongol nembus backdrop.
      className="fixed inset-0 z-[2147483640] bg-black/55 backdrop-blur-sm flex items-end md:items-center justify-center px-3 md:px-6 py-6"
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
  // Active HTMLAudioElement untuk voice line yang lagi diputer. Distop
  // pas user advance/dismiss atau line berubah. Voice file di /public/AI/
  // didefinisikan per-line di dialog.audio[i] (parallel ke lines[i]).
  const audioRef = useRef(null);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {
        /* noop */
      }
      audioRef.current = null;
    }
  }, []);

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
  }, [queue, activeDialogId, modalOpen]);

  // ── Effect: duck background music while Arme talks ───────────────
  // Dispatch ke townAudioBus pas activeDialogId transition. TownMusic
  // ramp via existing FADE_IN/OUT_DUR — smooth, gak abrupt cut. Restore
  // ke 1 on cleanup juga (component unmount mid-dialog).
  useEffect(() => {
    if (activeDialogId) {
      writeDuckFactor(0);
      return () => writeDuckFactor(1);
    }
    return undefined;
  }, [activeDialogId]);

  // ── Effect: auto-dismiss dialog saat modal/landmark kebuka ───────
  // Mencegah overlap: audio Arme keep playing di background sementara
  // user lagi di petak preview, dan cinematic backdrop tetep nyala
  // di belakang modal landmark. Dialog yang lagi jalan di-mark heard
  // (bisa di-replay dari drawer), queue tetep persist supaya kalau
  // user tutup modal lagi, milestone berikutnya tetep fire.
  useEffect(() => {
    if (modalOpen && activeDialogId) {
      markHeard(activeDialogId, 'heard');
      refreshHeard();
      setActiveDialogId(null);
      setActiveLineIdx(0);
      // Audio stop + un-duck auto via cleanup di two effects sebelumnya
      // (auto-advance + duck) saat activeDialogId nge-null.
    }
  }, [modalOpen, activeDialogId, refreshHeard]);

  // ── Effect: auto-advance through lines ───────────────────────────
  // Two paths:
  //   - Line punya audio (dialog.audio[i]): play wav, advance pas
  //     `ended`/`error` + breath delay 600ms (last line dapet delay
  //     lebih panjang biar user sempet baca + lihat avatar).
  //   - Line ga punya audio (legacy + dialog yg belum di-record):
  //     fixed timer 3200ms (last line FINAL_DISMISS_DELAY_MS).
  useEffect(() => {
    if (!activeDialogId) return undefined;
    const dialog = ARME_DIALOGS.find((d) => d.id === activeDialogId);
    if (!dialog) {
      setActiveDialogId(null);
      return undefined;
    }
    const isLast = activeLineIdx >= dialog.lines.length - 1;

    const advance = () => {
      if (isLast) {
        markHeard(activeDialogId, 'heard');
        refreshHeard();
        setActiveDialogId(null);
        setActiveLineIdx(0);
      } else {
        setActiveLineIdx((idx) => idx + 1);
      }
    };

    const audioSrc = dialog.audio?.[activeLineIdx];
    if (audioSrc) {
      const audio = new Audio(audioSrc);
      audioRef.current = audio;

      const breathMs = isLast ? FINAL_DISMISS_DELAY_MS - BUBBLE_AUTO_ADVANCE_MS : 600;
      let scheduled = false;
      const onEnd = () => {
        if (scheduled) return;
        scheduled = true;
        advanceTimerRef.current = setTimeout(advance, Math.max(breathMs, 400));
      };
      audio.addEventListener('ended', onEnd, { once: true });
      audio.addEventListener('error', onEnd, { once: true });
      // Autoplay block / decode fail → fallback ke timer via onEnd.
      audio.play().catch(onEnd);

      return () => {
        audio.pause();
        audio.removeEventListener('ended', onEnd);
        audio.removeEventListener('error', onEnd);
        clearTimeout(advanceTimerRef.current);
        if (audioRef.current === audio) audioRef.current = null;
      };
    }

    const ms = isLast ? FINAL_DISMISS_DELAY_MS : BUBBLE_AUTO_ADVANCE_MS;
    advanceTimerRef.current = setTimeout(advance, ms);
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
        const heardMapSaved = saved.heard || {};

        // Returning variant — fire saat user balik. Achievement-style:
        // returning dialog itself = "user balik" achievement (eksplisit
        // user action, bukan random self-fire), boleh fire.
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

        // Milestones crossed sejak last visit — SKIP yang udah pernah
        // heard (status='heard') supaya gak re-fire kalau localStorage
        // lastSeenCount reset tapi heard map masih ada. User cuma denger
        // sekali per achievement, bahkan kalau session state confused.
        ARME_DIALOGS.filter(
          (d) =>
            d.trigger.type === 'count-cross' &&
            d.trigger.at > lastSeenCount &&
            d.trigger.at <= armeniacaCount &&
            heardMapSaved[d.id]?.status !== 'heard',
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
  // Achievement-only: fire dialog cuma kalo user crossed milestone yang
  // BELUM PERNAH didenger (status !== 'heard'). Sebelumnya bisa re-fire
  // kalau lastSeenCount confused tapi heard map masih punya entry —
  // sekarang guarded supaya gak "Arme berdialog sendiri" di re-mount.
  useEffect(() => {
    if (flyInActive || !armeniacaLoaded) return;
    if (initialMountRef.current) return;
    const prev = lastProcessedCountRef.current ?? armeniacaCount;
    if (armeniacaCount <= prev) return;

    const heardMapSaved = loadState()?.heard || {};
    ARME_DIALOGS.filter(
      (d) =>
        d.trigger.type === 'count-cross' &&
        d.trigger.at > prev &&
        d.trigger.at <= armeniacaCount &&
        heardMapSaved[d.id]?.status !== 'heard',
    )
      .sort((a, b) => a.trigger.at - b.trigger.at)
      .forEach((d) => enqueueDialog(d.id));

    lastProcessedCountRef.current = armeniacaCount;
    saveState({ lastSeenCount: armeniacaCount });
  }, [armeniacaCount, armeniacaLoaded, flyInActive, enqueueDialog]);

  // ── Effect: external window events ───────────────────────────────
  // Achievement-based events only — pohon-click, petak-first-pick.
  // 'idle' & 'dismiss-quick' events di-NO-OP (handler ignore) supaya
  // Arme gak self-fire dari diam atau dismiss reaktif.
  useEffect(() => {
    const handler = (e) => {
      const eventId = e.detail;
      // Block non-achievement events (idle, dismiss-quick) — user didn't
      // "achieve" anything, jangan ganggu.
      if (eventId === 'idle' || eventId === 'dismiss-quick') return;

      const dialog = ARME_DIALOGS.find(
        (d) => d.trigger.type === 'event' && d.trigger.event === eventId,
      );
      if (!dialog) return;

      const saved = loadState();
      const heard = saved?.heard?.[dialog.id];

      // Once-flag: kalo udah heard, skip. Berlaku ke semua event
      // (pohon-click + petak-first-pick).
      if (dialog.trigger.once && heard?.status === 'heard') return;
      enqueueDialog(dialog.id);
    };
    window.addEventListener('arme:trigger', handler);
    return () => window.removeEventListener('arme:trigger', handler);
  }, [enqueueDialog]);

  // ── Handlers ─────────────────────────────────────────────────────
  const handleAdvance = useCallback(() => {
    clearTimeout(advanceTimerRef.current);
    stopAudio();
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
  }, [activeDialogId, activeLineIdx, refreshHeard, stopAudio]);

  const handleDismiss = useCallback(() => {
    clearTimeout(advanceTimerRef.current);
    stopAudio();
    if (activeDialogId) {
      markHeard(activeDialogId, 'heard');
      refreshHeard();
      setActiveDialogId(null);
      setActiveLineIdx(0);
    }
    // Note: dismiss-quick auto-fire (reaktif ke welcome dismiss cepet)
    // udah di-disable supaya Arme strict achievement-based — gak
    // berbicara sendiri reaksi ke user gesture. Dialog 'bonus-dismiss-
    // quick' tetep di catalog buat manual replay dari drawer.
  }, [activeDialogId, refreshHeard, stopAudio]);

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
  const isTalking = Boolean(activeDialog);
  // Cinematic dialog (6 momen besar: welcome, aula, purified, festival
  // peak, legacy, seitansai) — Arme pindah ke tengah + backdrop dim
  // map, kerasa cutscene. Sisanya tetap di pojok kiri-bawah.
  const isCinematic = isTalking && activeDialog?.cinematic === true;
  // Newcomer = user belum pernah heard dialog apapun. Pakai stronger
  // attention cues (bounce + bigger pill) buat ngajak first interaction.
  const isNewcomer = Object.keys(heardMap).length === 0;

  // Talking highlight — warm apricot glow stack di drop-shadow (efek
  // "rim light" hangat sekitar avatar) + brightness boost ringan. Idle
  // tetep ada drop-shadow gelap + glow tipis biar gak ngeblend ke map.
  const avatarFilter = isTalking
    ? 'drop-shadow(0 0 22px rgba(244,200,150,0.75)) drop-shadow(0 0 44px rgba(244,200,150,0.4)) drop-shadow(0 8px 18px rgba(0,0,0,0.45)) brightness(1.08)'
    : 'drop-shadow(0 0 14px rgba(244,200,150,0.2)) drop-shadow(0 8px 18px rgba(0,0,0,0.45))';
  // Cinematic avatar pakai stronger glow biar dominant di center vs
  // backdrop blur, plus brightness boost lebih kuat.
  const cinematicAvatarFilter =
    'drop-shadow(0 0 32px rgba(244,200,150,0.85)) drop-shadow(0 0 64px rgba(244,200,150,0.5)) drop-shadow(0 12px 24px rgba(0,0,0,0.6)) brightness(1.12)';

  return (
    <>
      {/* Keyframe animations untuk Arme — halo breath + idle bob +
          mirror-flip (Arme balik badan, kerasa hidup). Inline supaya
          self-contained, gak nempel global CSS.

          armeIdleMirror: 9s cycle. ~side-A bob (0-30%) → squish flip
          via scaleX(0) (37-50%) → side-B bob (60-80%) → squish back
          (87-100%). scaleX going through 0 bikin "turn around" reads
          smooth instead of sudden mirror snap. */}
      <style>{`
        @keyframes armeHaloBreath {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes armeIdleMirror {
          0%   { transform: translateY(0)    scaleX(1);    }
          15%  { transform: translateY(-4px) scaleX(1);    }
          30%  { transform: translateY(0)    scaleX(1);    }
          37%  { transform: translateY(0)    scaleX(0.1);  }
          43%  { transform: translateY(0)    scaleX(-0.1); }
          50%  { transform: translateY(0)    scaleX(-1);   }
          65%  { transform: translateY(-4px) scaleX(-1);   }
          80%  { transform: translateY(0)    scaleX(-1);   }
          87%  { transform: translateY(0)    scaleX(-0.1); }
          93%  { transform: translateY(0)    scaleX(0.1);  }
          100% { transform: translateY(0)    scaleX(1);    }
        }
        @keyframes armeNewcomerWave {
          0%, 100% { transform: translateY(0) rotate(0); }
          20% { transform: translateY(-6px) rotate(-1.5deg); }
          40% { transform: translateY(0) rotate(1deg); }
          60% { transform: translateY(-3px) rotate(-0.5deg); }
        }
        @keyframes armePillPulse {
          0%, 100% { transform: translateX(0) scale(1); opacity: 1; }
          50% { transform: translateX(2px) scale(1.04); opacity: 0.92; }
        }
      `}</style>

      {/* Cinematic backdrop — fixed full-viewport dim + blur saat
          dialog 'momen besar' aktif. Klik backdrop = dismiss dialog.
          z-[15] (di bawah Arme cinematic z-[25] tapi di atas Canvas).
          Hide pas hidden (modal kebuka) supaya gak nge-dim belakang
          landmark modal yang sedang aktif. */}
      <div
        className={`fixed inset-0 z-[15] bg-black/45 backdrop-blur-[2px] transition-opacity duration-700 ${
          isCinematic && !hidden
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        onClick={isCinematic && !hidden ? handleDismiss : undefined}
        aria-hidden
      />

      {/* Corner Arme — hidden saat cinematic dialog aktif (cinematic
          layer takes over) atau modal kebuka.

          Positioning: breathing room dari edge (mobile 12px/8px,
          desktop 20px/16px). `bottom` pake max(N, env(safe-area-inset-
          bottom)) supaya iOS home indicator gak nutupin feet Arme.
          `left` pake env(safe-area-inset-left) buat iPad/landscape. */}
      <div
        className={`pointer-events-none fixed z-20 select-none transition-opacity duration-500 ${
          hidden || isCinematic ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          bottom: isMobile
            ? 'max(12px, env(safe-area-inset-bottom, 0px))'
            : 'max(20px, env(safe-area-inset-bottom, 0px))',
          left: isMobile
            ? 'max(8px, env(safe-area-inset-left, 0px))'
            : 'max(16px, env(safe-area-inset-left, 0px))',
        }}
        aria-hidden={hidden || isCinematic}
      >
        <div className="relative">
          {/* Halo glow behind avatar — selalu ada tipis biar Arme gak
              ngeblend ke map gelap, full brightness pas talking. Breath
              animation pas talking; static low-opacity idle. */}
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-700"
            style={{ opacity: isTalking ? 1 : 0.55 }}
            aria-hidden
          >
            <div
              className={`absolute left-1/2 -translate-x-1/2 rounded-full ${
                isMobile ? 'w-48 h-48 bottom-2' : 'w-64 h-64 bottom-4'
              }`}
              style={{
                background: isTalking
                  ? 'radial-gradient(circle, rgba(244,200,150,0.5) 0%, rgba(244,200,150,0.2) 35%, rgba(244,200,150,0) 70%)'
                  : 'radial-gradient(circle, rgba(244,200,150,0.28) 0%, rgba(244,200,150,0.1) 40%, rgba(244,200,150,0) 70%)',
                filter: 'blur(12px)',
                animation: isTalking ? 'armeHaloBreath 3.4s ease-in-out infinite' : 'none',
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleAvatarClick}
            className="pointer-events-auto relative block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a574]/70 rounded-tr-2xl"
            aria-label={activeDialog ? 'Lanjut dialog' : 'Buka topik Arme'}
          >
            <img
              src={isTalking ? AVATAR_TALK : AVATAR_IDLE}
              alt="Arme — warga terakhir ArmeniacaTown"
              draggable={false}
              className={`block w-auto object-bottom transition-all duration-500 hover:scale-[1.05] ${
                isMobile ? 'h-44' : 'h-60'
              } ${isTalking ? 'scale-[1.04]' : 'scale-100'}`}
              style={{
                filter: avatarFilter,
                animation: isTalking
                  ? 'none'
                  : isNewcomer
                    ? 'armeNewcomerWave 2.6s ease-in-out infinite'
                    : 'armeIdleMirror 9s ease-in-out infinite',
              }}
            />
            {/* Name plate + hint — cuma show saat idle, hidden pas
                talking biar gak overlap visual Arme (bubble udah punya
                label "Arme" sendiri di top kiri). */}
            {!isTalking && (
            <span
              className={`absolute left-3 ${
                isMobile ? 'bottom-2' : 'bottom-3'
              } flex flex-col items-start gap-1`}
            >
              <span
                className="rounded-full backdrop-blur-sm px-2.5 py-0.5 text-[10px] md:text-[11px] font-semibold tracking-wider text-white ring-1 bg-[#1c1f2a]/85 ring-[#d4a574]/35"
              >
                Arme · pemandu
              </span>
              {!activeDialog && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full backdrop-blur-sm px-2.5 py-1 text-[10px] md:text-[11px] font-medium text-white ring-1 shadow-[0_0_14px_rgba(244,200,150,0.4)] ${
                    isNewcomer
                      ? 'bg-[#c97a5e] ring-[#f4c896]/50'
                      : 'bg-[#9a5b4a]/90 ring-white/15'
                  }`}
                  style={{
                    animation: isNewcomer
                      ? 'armePillPulse 1.4s ease-in-out infinite'
                      : 'armePillPulse 2.2s ease-in-out infinite',
                  }}
                >
                  <span
                    aria-hidden
                    className="inline-block w-1.5 h-1.5 rounded-full bg-white/95"
                  />
                  <span>
                    {isNewcomer ? 'tap aku — aku pandu kotanya' : 'tap untuk ngobrol'}
                  </span>
                </span>
              )}
            </span>
            )}
          </button>

          {activeDialog && activeLine && !isCinematic && (
            <SpeechBubble
              text={activeLine}
              currentIdx={activeLineIdx}
              total={activeDialog.lines.length}
              isMobile={isMobile}
              mode="corner"
              onAdvance={handleAdvance}
              onDismiss={handleDismiss}
            />
          )}
        </div>
      </div>

      {/* Cinematic Arme — VN/film lower-third positioning.
          Mobile (column-reverse stacked): pt-[10vh] pb-[5vh] = stack
            centered di band 10-95vh, stack-center landing di ~52vh
            tapi karena avatar di bagian bawah stack (col-reverse =
            bubble top, arme bottom), avatar-center jatuh di ~66-70%
            viewport = proper lower-third.
          Desktop (row): pt-[25vh] pb-[5vh] = band 25-95vh, row vertical
            center di ~60vh = lower-third. justify-center bikin row
            (avatar + bubble side by side) centered, tapi karena bubble
            lebih lebar dari avatar, avatar natural mendarat di sekitar
            30-35% dari kiri (asymmetric VN feel). */}
      <div
        className={`pointer-events-none fixed inset-0 z-[25] flex flex-col-reverse md:flex-row items-center justify-center gap-3 md:gap-8 px-4 md:px-8 pt-[10vh] md:pt-[25vh] pb-[5vh] select-none transition-opacity duration-700 ${
          isCinematic && !hidden ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden={!isCinematic || hidden}
      >
        <div className="relative">
          {/* Halo cinematic — bigger, more dominant */}
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div
              className={`absolute left-1/2 -translate-x-1/2 rounded-full ${
                isMobile ? 'w-60 h-60 bottom-2' : 'w-80 h-80 bottom-4'
              }`}
              style={{
                background:
                  'radial-gradient(circle, rgba(244,200,150,0.55) 0%, rgba(244,200,150,0.25) 35%, rgba(244,200,150,0) 70%)',
                filter: 'blur(16px)',
                animation: isCinematic ? 'armeHaloBreath 3.4s ease-in-out infinite' : 'none',
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleAdvance}
            className="pointer-events-auto relative block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a574]/70 rounded-tr-2xl"
            aria-label="Lanjut dialog"
          >
            <img
              src={AVATAR_TALK}
              alt="Arme"
              draggable={false}
              className={`block w-auto object-bottom ${
                isMobile ? 'h-56' : 'h-[22rem]'
              }`}
              style={{ filter: cinematicAvatarFilter }}
            />
            {/* Name plate cinematic — di bawah, centered */}
            <span className="absolute left-1/2 -translate-x-1/2 bottom-1 rounded-full bg-[#9a5b4a]/95 backdrop-blur-sm px-3 py-0.5 text-[11px] md:text-xs font-semibold tracking-wider text-white ring-1 ring-[#f4c896]/40 shadow-[0_0_14px_rgba(244,200,150,0.6)]">
              Arme
            </span>
          </button>
        </div>

        {isCinematic && activeLine && (
          <SpeechBubble
            text={activeLine}
            currentIdx={activeLineIdx}
            total={activeDialog.lines.length}
            isMobile={isMobile}
            mode="cinematic"
            onAdvance={handleAdvance}
            onDismiss={handleDismiss}
          />
        )}
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
