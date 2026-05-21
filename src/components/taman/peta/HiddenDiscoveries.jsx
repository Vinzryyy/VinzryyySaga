/**
 * HiddenDiscoveries — sistem easter egg di /armeniacaTown/peta.
 *
 * 8 objek kecil tersembunyi di sudut-sudut peta yang kalau diklik kasih
 * "fakta Eli" (data real dari src/data/eliProfile.js: ELI_TRIVIA + ELI_FUN_FACTS).
 * Tujuan: ngundang user explore corner-corner map yang biasanya cuma
 * lewat, dan kasih reward kecil yang spesifik personal — bukan generic
 * trivia, tapi hal yang bener-bener bikin user kerasa "kenal" Eli.
 *
 * Mekanika:
 * - Object tampil saat count >= UNLOCK_THRESHOLD (4000, sinkron dgn
 *   "manusia pertama" muncul — kota mulai punya cerita)
 * - Subtle pulse glow ketika belum ditemuin, dim ketika udah
 * - Klik → reveal card HTML overlay (icon + label + value)
 * - Progress ke-track via localStorage 'armeniaca-discoveries'
 * - Badge "Rahasia X/8" di pojok kiri-bawah (offset dari compass kanan-
 *   bawah biar gak tabrakan)
 *
 * Positioning: tiap objek ditempatin >=4 unit dari landmark terdekat
 * supaya gak overlap sama tap-target petak/air mancur/dll.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { playSfx } from '../../../lib/townSfx';

const STORAGE_KEY = 'armeniaca-discoveries';
const COMPLETION_KEY = 'armeniaca-discoveries-completed';
const UNLOCK_THRESHOLD = 4000;

// 8 hidden objects — pos verified safe (>=4 unit) dari semua landmark:
// Gerbang [0,0,8], Telaga [-7,0,-1], Arsip [7,0,-1], Menara [0,0,-8],
// Panggung [5,0,5], AirMancur [-3,0,3.5], Lorong (corridor z=1..7).
//
// Visual types map ke render branch di HiddenInteractable. Tiap object
// kasih fakta yang ringkas + intim — bukan stat kaku, tapi sesuatu yg
// bikin user senyum kecil.
const HIDDEN_DISCOVERY_DEFS = [
  {
    id: 'apricot-bloom',
    pos: [-2, 0.05, 11.5],
    visual: 'flower',
    icon: 'ri-cake-2-line',
    label: 'Tanggal Lahir',
    value: '15 Juni 2000',
    note: 'Hari yang sedang kita tunggu bersama.',
  },
  {
    id: 'sundanese-kendi',
    pos: [-9, 0.4, -7],
    visual: 'kendi',
    icon: 'ri-map-pin-2-line',
    label: 'Asal',
    value: 'Bandung, Jawa Barat',
    note: 'Sebuah kendi tua — pengingat tanah kelahiran.',
  },
  {
    id: 'gen7-plank',
    pos: [4, 0.05, -10.5],
    visual: 'plank',
    icon: 'ri-team-line',
    label: 'Generasi',
    value: 'Generasi 7 JKT48',
    note: 'Papan kayu dengan angka "7" — ditandai oleh tangan yang ingat.',
  },
  {
    id: 'height-signpost',
    pos: [-9.5, 0, 6.5],
    visual: 'signpost-mini',
    icon: 'ri-ruler-line',
    label: 'Tinggi Badan',
    value: '167 cm',
    note: 'Rambu kayu kecil — penanda tinggi yang pas.',
  },
  {
    id: 'cat-bowl',
    pos: [10.5, 0.05, 4],
    visual: 'bowl',
    icon: 'ri-bear-smile-line',
    label: 'Hewan Peliharaan',
    value: 'Kucing (TanTan) & anjing',
    note: 'Mangkuk kecil — TanTan pernah duduk di sini.',
  },
  {
    id: 'retro-cassette',
    pos: [-10.5, 0.05, -4],
    visual: 'cassette',
    icon: 'ri-music-2-line',
    label: 'K-Pop Bias',
    value: 'Jaehyun NCT',
    note: 'Kaset retro tertinggal — lagunya masih tersimpan.',
  },
  {
    id: 'forgotten-book',
    pos: [7, 0.05, -7],
    visual: 'book',
    icon: 'ri-book-open-line',
    label: 'Hobi',
    value: 'Baca — di sela ngemil, dance, dan tidur',
    note: 'Buku terbuka di rerumputan — penanda yang lupa diangkat.',
  },
  {
    id: 'cangcorang-basket',
    pos: [9.5, 0.4, 7.5],
    visual: 'basket',
    icon: 'ri-group-line',
    label: 'Cangcorang Family',
    value: 'Eli, Gita, Muthe',
    note: 'Keranjang anyaman — tempat cerita-cerita kecil sering dibawa pulang.',
  },
];

const TOTAL = HIDDEN_DISCOVERY_DEFS.length;

// localStorage helpers — defensive (private mode, SSR safe).
const readDiscovered = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
};

const writeDiscovered = (set) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    /* private mode — no-op */
  }
};

/**
 * useDiscoveries — hook yang manage discovered Set + reveal card state.
 * Pakai di TamanPetaPage (root level).
 */
export const useDiscoveries = () => {
  const [discovered, setDiscovered] = useState(() => readDiscovered());
  const [revealed, setRevealed] = useState(null);
  const [showCompletion, setShowCompletion] = useState(false);

  const markDiscovered = useCallback((def) => {
    setDiscovered((prev) => {
      if (prev.has(def.id)) {
        // Already found — show card again (re-read), gak update storage.
        setRevealed(def);
        return prev;
      }
      const next = new Set(prev);
      next.add(def.id);
      writeDiscovered(next);
      setRevealed(def);
      // Trigger completion celebration kalau ini discovery ke-8 dan
      // belum pernah ditampilkan. Delay 4.5s supaya reveal card sempet
      // dilihat + ditutup user organik dulu, baru completion modal
      // muncul layered di atas. Persist localStorage flag — one-shot.
      if (next.size === TOTAL) {
        try {
          const alreadyShown =
            localStorage.getItem(COMPLETION_KEY) === '1';
          if (!alreadyShown) {
            setTimeout(() => setShowCompletion(true), 4500);
            localStorage.setItem(COMPLETION_KEY, '1');
          }
        } catch {
          /* private mode — no-op */
        }
      }
      return next;
    });
  }, []);

  const dismissReveal = useCallback(() => setRevealed(null), []);
  const dismissCompletion = useCallback(() => setShowCompletion(false), []);

  return {
    discovered,
    revealed,
    markDiscovered,
    dismissReveal,
    showCompletion,
    dismissCompletion,
  };
};

// =============================================================
// 3D VISUALS — primitive geometries per visual type. Lightweight
// (no shared meshes, no instancing — total 8 objects, fine).
// =============================================================

const FlowerBloom = () => (
  <group>
    {/* Stem */}
    <mesh position={[0, 0.2, 0]}>
      <cylinderGeometry args={[0.015, 0.02, 0.4, 6]} />
      <meshStandardMaterial color="#3a5a3a" roughness={0.9} />
    </mesh>
    {/* Petals — pink apricot bloom */}
    <mesh position={[0, 0.45, 0]}>
      <sphereGeometry args={[0.14, 8, 8]} />
      <meshStandardMaterial
        color="#f4c8d0"
        emissive="#c8869a"
        emissiveIntensity={0.18}
        roughness={0.7}
      />
    </mesh>
    {/* Center bud */}
    <mesh position={[0, 0.45, 0]}>
      <sphereGeometry args={[0.05, 6, 6]} />
      <meshStandardMaterial color="#e8a648" />
    </mesh>
  </group>
);

const Kendi = () => (
  <group>
    {/* Body */}
    <mesh position={[0, 0.22, 0]}>
      <cylinderGeometry args={[0.18, 0.22, 0.4, 10]} />
      <meshStandardMaterial color="#8a5840" roughness={0.95} />
    </mesh>
    {/* Neck */}
    <mesh position={[0, 0.5, 0]}>
      <cylinderGeometry args={[0.08, 0.12, 0.18, 10]} />
      <meshStandardMaterial color="#7a4a32" roughness={0.95} />
    </mesh>
    {/* Lip */}
    <mesh position={[0, 0.6, 0]}>
      <torusGeometry args={[0.08, 0.02, 6, 12]} />
      <meshStandardMaterial color="#6a3a25" roughness={0.95} />
    </mesh>
  </group>
);

const Plank = () => (
  <group>
    <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0.3]}>
      <boxGeometry args={[0.5, 0.04, 0.7]} />
      <meshStandardMaterial color="#5a3e28" roughness={0.95} />
    </mesh>
    {/* Carved "7" notch — small darker rect */}
    <mesh position={[0.05, 0.07, -0.05]} rotation={[-Math.PI / 2, 0, 0.3]}>
      <boxGeometry args={[0.18, 0.005, 0.04]} />
      <meshStandardMaterial color="#2a1810" roughness={1} />
    </mesh>
    <mesh position={[0.12, 0.07, 0.05]} rotation={[-Math.PI / 2, 0, 0.3]}>
      <boxGeometry args={[0.04, 0.005, 0.24]} />
      <meshStandardMaterial color="#2a1810" roughness={1} />
    </mesh>
  </group>
);

const SignpostMini = () => (
  <group>
    {/* Stick */}
    <mesh position={[0, 0.35, 0]}>
      <cylinderGeometry args={[0.025, 0.025, 0.7, 6]} />
      <meshStandardMaterial color="#4a3220" roughness={0.95} />
    </mesh>
    {/* Plank — angled */}
    <mesh position={[0.05, 0.55, 0]} rotation={[0, 0, -0.15]}>
      <boxGeometry args={[0.32, 0.12, 0.03]} />
      <meshStandardMaterial color="#6a4a30" roughness={0.95} />
    </mesh>
  </group>
);

const CatBowl = () => (
  <group>
    {/* Bowl exterior */}
    <mesh position={[0, 0.05, 0]}>
      <cylinderGeometry args={[0.18, 0.14, 0.1, 12]} />
      <meshStandardMaterial color="#a8c8e0" roughness={0.6} />
    </mesh>
    {/* Bowl interior (dark) */}
    <mesh position={[0, 0.08, 0]}>
      <cylinderGeometry args={[0.14, 0.1, 0.06, 12]} />
      <meshStandardMaterial color="#3a4858" roughness={0.85} />
    </mesh>
  </group>
);

const RetroCassette = () => (
  <group>
    {/* Main casing */}
    <mesh position={[0, 0.03, 0]}>
      <boxGeometry args={[0.4, 0.06, 0.25]} />
      <meshStandardMaterial color="#1a1a22" roughness={0.5} />
    </mesh>
    {/* Tape window */}
    <mesh position={[0, 0.065, 0]}>
      <boxGeometry args={[0.22, 0.005, 0.1]} />
      <meshStandardMaterial color="#3a3a4a" roughness={0.3} />
    </mesh>
    {/* Reels */}
    <mesh position={[-0.08, 0.07, 0]}>
      <cylinderGeometry args={[0.035, 0.035, 0.005, 8]} />
      <meshStandardMaterial color="#dadada" roughness={0.4} />
    </mesh>
    <mesh position={[0.08, 0.07, 0]}>
      <cylinderGeometry args={[0.035, 0.035, 0.005, 8]} />
      <meshStandardMaterial color="#dadada" roughness={0.4} />
    </mesh>
  </group>
);

const Book = () => (
  <group>
    {/* Cover */}
    <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0.2]}>
      <boxGeometry args={[0.32, 0.06, 0.42]} />
      <meshStandardMaterial color="#7a3a30" roughness={0.9} />
    </mesh>
    {/* Pages slightly lighter */}
    <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0.2]}>
      <boxGeometry args={[0.3, 0.005, 0.4]} />
      <meshStandardMaterial color="#e8d8b8" roughness={0.95} />
    </mesh>
  </group>
);

const WovenBasket = () => (
  <group>
    {/* Open cylinder body */}
    <mesh position={[0, 0.18, 0]}>
      <cylinderGeometry args={[0.25, 0.2, 0.36, 12, 1, true]} />
      <meshStandardMaterial color="#a07a48" roughness={0.95} side={2} />
    </mesh>
    {/* Rim */}
    <mesh position={[0, 0.36, 0]}>
      <torusGeometry args={[0.25, 0.025, 6, 14]} />
      <meshStandardMaterial color="#705028" roughness={0.95} />
    </mesh>
    {/* Inside shadow base */}
    <mesh position={[0, 0.04, 0]}>
      <cylinderGeometry args={[0.19, 0.19, 0.04, 12]} />
      <meshStandardMaterial color="#2a1810" roughness={1} />
    </mesh>
  </group>
);

const VisualFor = ({ visual }) => {
  switch (visual) {
    case 'flower':
      return <FlowerBloom />;
    case 'kendi':
      return <Kendi />;
    case 'plank':
      return <Plank />;
    case 'signpost-mini':
      return <SignpostMini />;
    case 'bowl':
      return <CatBowl />;
    case 'cassette':
      return <RetroCassette />;
    case 'book':
      return <Book />;
    case 'basket':
      return <WovenBasket />;
    default:
      return null;
  }
};

// =============================================================
// HiddenInteractable — single object di scene.
// =============================================================
const HiddenInteractable = ({ def, found, onDiscover, phase }) => {
  const groupRef = useRef();
  const glowRef = useRef();

  // Gentle bob + hint pulse glow saat belum found.
  useFrame((state) => {
    const t = state.clock.elapsedTime + phase;
    if (groupRef.current) {
      // Subtle vertical bob — bring to attention without being garish.
      groupRef.current.position.y = Math.sin(t * 1.2) * 0.025;
    }
    if (glowRef.current && !found) {
      // Pulse intensity 0.15 → 0.45 over ~3s.
      const pulse = 0.3 + Math.sin(t * 2.1) * 0.15;
      glowRef.current.material.opacity = pulse;
    }
  });

  return (
    <group
      ref={groupRef}
      position={def.pos}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'auto';
      }}
      onClick={(e) => {
        e.stopPropagation();
        playSfx('chime');
        onDiscover(def);
      }}
    >
      {/* Invisible larger hitbox — easier to click esp di mobile.
          Bumped 0.8u → 1.2u (~17% screen width @ camera dist ≈ 64px on
          375px viewport) supaya nyaman tap di portrait. */}
      <mesh position={[0, 0.5, 0]} visible={false}>
        <boxGeometry args={[1.2, 1.4, 1.2]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Hint glow ring — cuma tampil saat undiscovered. Sangat subtle
          biar feel "rahasia" — bukan signpost neon. Outer radius mild
          bump 0.5→0.6 supaya footprint tap nyambung sama hitbox. */}
      {!found && (
        <mesh
          ref={glowRef}
          position={[0, 0.02, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.3, 0.6, 24]} />
          <meshBasicMaterial
            color="#f4d8a8"
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
      )}

      <VisualFor visual={def.visual} />
    </group>
  );
};

// =============================================================
// HiddenInteractables — render semua 8 sekaligus. Wrap di sini biar
// caller (TamanScene) tinggal pasang satu element.
// =============================================================
export const HiddenInteractables = ({
  armeniacaCount = 0,
  armeniacaLoaded = false,
  discovered,
  onDiscover,
}) => {
  // Threshold gate — sebelum 4000, objek belum exist di kota (sejalan
  // dgn "manusia pertama" yang muncul di count 4000).
  if (!armeniacaLoaded) return null;
  if (armeniacaCount < UNLOCK_THRESHOLD) return null;

  return (
    <group>
      {HIDDEN_DISCOVERY_DEFS.map((def, i) => (
        <HiddenInteractable
          key={def.id}
          def={def}
          found={discovered.has(def.id)}
          onDiscover={onDiscover}
          phase={i * 0.7}
        />
      ))}
    </group>
  );
};

// =============================================================
// HTML overlay UI — reveal card + progress badge.
// Render di luar Canvas (parent: TamanPetaPage).
// =============================================================

// Reveal card enter/exit pattern: `displayDef` mirror `def` tapi delay
// unmount 220ms supaya exit anim sempet jalan. `isExiting` flag toggle
// class animate-out. Cancel timer kalau def baru datang mid-exit (rapid
// klik antar discovery) — instant swap, restart enter anim.
export const DiscoveryRevealCard = ({ def, onClose }) => {
  const [displayDef, setDisplayDef] = useState(def);
  const [isExiting, setIsExiting] = useState(false);

  // Wrap onClose dgn paperSlide SFX — manual close (backdrop/ESC/btn)
  // semua lewat sini. Auto-close via def→null tetep silent (rare case).
  const handleClose = useCallback(() => {
    playSfx('paperSlide');
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (def && (!displayDef || displayDef.id !== def.id)) {
      setDisplayDef(def);
      setIsExiting(false);
      return undefined;
    }
    if (!def && displayDef && !isExiting) {
      setIsExiting(true);
      const t = setTimeout(() => {
        setDisplayDef(null);
        setIsExiting(false);
      }, 220);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [def, displayDef, isExiting]);

  useEffect(() => {
    if (!displayDef) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [displayDef, handleClose]);

  if (!displayDef) return null;

  return (
    <div
      className={`absolute inset-0 z-50 flex items-center justify-center px-4 pb-4 bg-black/60 backdrop-blur-sm ${
        isExiting ? 'animate-discoveryBackdropOut' : 'animate-discoveryBackdropIn'
      }`}
      style={{ paddingTop: '6rem' }}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative max-w-sm w-full max-h-[80vh] overflow-y-auto bg-gradient-to-br from-[#3a2a20]/95 to-[#1a1208]/95 border border-[color:var(--retro-burgundy-light)]/40 rounded-2xl p-5 sm:p-6 shadow-2xl ${
          isExiting ? 'animate-discoveryCardOut' : 'animate-discoveryCardIn'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy-light)]">
            Rahasia ditemukan
          </span>
          <span className="flex-1 h-px bg-[color:var(--retro-burgundy-light)]/30" />
        </div>

        <div className="flex items-start gap-4 mb-4">
          <div className="shrink-0 w-12 h-12 rounded-full bg-[color:var(--retro-burgundy)]/30 ring-1 ring-[color:var(--retro-burgundy-light)]/40 flex items-center justify-center">
            <i
              className={`${displayDef.icon} text-2xl text-[color:var(--retro-cream)]`}
              aria-hidden="true"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/55 mb-1">
              {displayDef.label}
            </p>
            <p
              className="text-lg font-bold text-[color:var(--retro-cream)] leading-tight"
              style={{ fontFamily: '"Fraunces Variable", serif' }}
            >
              {displayDef.value}
            </p>
          </div>
        </div>

        <p
          className="text-sm text-[color:var(--retro-cream)]/75 leading-relaxed italic mb-5"
          style={{ fontFamily: '"Fraunces Variable", serif' }}
        >
          {displayDef.note}
        </p>

        <button
          type="button"
          onClick={handleClose}
          className="w-full px-5 py-2.5 rounded-full bg-[color:var(--retro-burgundy)]/40 hover:bg-[color:var(--retro-burgundy)]/60 border border-[color:var(--retro-burgundy-light)]/40 text-[color:var(--retro-cream)] text-[11px] font-black uppercase tracking-[0.3em] transition"
        >
          Tutup
        </button>
      </div>
      <style>{`
        @keyframes discoveryBackdropIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes discoveryBackdropOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes discoveryCardIn {
          0%   { opacity: 0; transform: translateY(20px) scale(0.94); }
          100% { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes discoveryCardOut {
          0%   { opacity: 1; transform: translateY(0)    scale(1); }
          100% { opacity: 0; transform: translateY(12px) scale(0.97); }
        }
        .animate-discoveryBackdropIn  { animation: discoveryBackdropIn  220ms ease-out both; }
        .animate-discoveryBackdropOut { animation: discoveryBackdropOut 200ms ease-in  both; }
        .animate-discoveryCardIn      { animation: discoveryCardIn      320ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        .animate-discoveryCardOut     { animation: discoveryCardOut     220ms cubic-bezier(0.65, 0, 0.85, 0) both; }
        @media (prefers-reduced-motion: reduce) {
          .animate-discoveryBackdropIn,
          .animate-discoveryBackdropOut,
          .animate-discoveryCardIn,
          .animate-discoveryCardOut { animation: none !important; }
        }
      `}</style>
    </div>
  );
};

export const DiscoveryProgressBadge = ({ discovered, armeniacaCount = 0, modalOpen = false }) => {
  const count = discovered.size;
  // pulseKey naik tiap discovery baru — re-mount badge dgn key supaya
  // animasi `discoveryBadgePulse` restart dari awal (animation: ... both
  // tetep di end-state, jadi butuh re-mount buat replay). floatKey trigger
  // "+1" floating teks one-shot per finding.
  const prevCountRef = useRef(count);
  const [pulseKey, setPulseKey] = useState(0);
  const [floatKey, setFloatKey] = useState(0);

  useEffect(() => {
    if (count > prevCountRef.current) {
      setPulseKey((k) => k + 1);
      setFloatKey((k) => k + 1);
    }
    prevCountRef.current = count;
  }, [count]);

  // Hide before unlock threshold — gak ngasih spoiler "ada rahasia"
  // sebelum kota mulai punya kehidupan.
  if (armeniacaCount < UNLOCK_THRESHOLD) return null;
  if (modalOpen) return null;

  const isComplete = count >= TOTAL;

  // Pindah dari bottom-left ke top-left (below TamanHeader) — sebelumnya
  // overlap dgn ArmeMascot avatar h-40/h-60 di pojok bottom-left.
  // Sekarang clean separation: bottom-left dedicated ke Arme, top-left
  // ke navigation+info column.
  return (
    <div className="pointer-events-none absolute top-[120px] left-4 md:top-[140px] md:left-6 z-10">
      <div className="relative">
        <div
          key={`badge-${pulseKey}`}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/35 backdrop-blur-sm ring-1 transition-colors ${
            pulseKey > 0 ? 'animate-discoveryBadgePulse' : ''
          } ${
            isComplete
              ? 'ring-[color:var(--retro-gold-light)]/60'
              : 'ring-white/15'
          }`}
        >
          <i
            className={`${isComplete ? 'ri-treasure-map-fill text-[color:var(--retro-gold-light)]' : 'ri-treasure-map-line text-white/70'} text-base`}
            aria-hidden="true"
          />
          <span className="text-white/85 text-[11px] font-bold tracking-wider tabular-nums">
            {count}/{TOTAL}
          </span>
        </div>
        {floatKey > 0 && (
          <span
            key={`plus-${floatKey}`}
            className="absolute left-1/2 -translate-x-1/2 -top-1 text-[11px] font-black tracking-wider text-[color:var(--retro-gold-light)] animate-discoveryPlusOne"
            aria-hidden="true"
          >
            +1
          </span>
        )}
      </div>
      <style>{`
        @keyframes discoveryBadgePulse {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.12); }
          100% { transform: scale(1); }
        }
        @keyframes discoveryPlusOne {
          0%   { opacity: 0; transform: translate(-50%, 0)    scale(0.8); }
          15%  { opacity: 1; transform: translate(-50%, -8px) scale(1); }
          75%  { opacity: 1; transform: translate(-50%, -22px) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -30px) scale(0.95); }
        }
        .animate-discoveryBadgePulse { animation: discoveryBadgePulse 480ms cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        .animate-discoveryPlusOne    { animation: discoveryPlusOne    1300ms ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .animate-discoveryBadgePulse,
          .animate-discoveryPlusOne { animation: none !important; }
        }
      `}</style>
    </div>
  );
};

// =============================================================
// DiscoveryCompletionCard — celebration moment saat user dapet 8/8.
// One-shot (persist localStorage flag), modal layered di atas peta.
// Triggered ~4.5s setelah discovery ke-8 supaya reveal card sempet
// di-tutup organik dulu, lalu completion fade in over it.
// =============================================================
export const DiscoveryCompletionCard = ({ open, onClose }) => {
  const [mounted, setMounted] = useState(open);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (open && !mounted) {
      setMounted(true);
      setIsExiting(false);
      // Spawn chime saat muncul — celebratory ting
      playSfx('chime');
      return undefined;
    }
    if (!open && mounted && !isExiting) {
      setIsExiting(true);
      const t = setTimeout(() => {
        setMounted(false);
        setIsExiting(false);
      }, 280);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open, mounted, isExiting]);

  useEffect(() => {
    if (!mounted) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        playSfx('paperSlide');
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mounted, onClose]);

  if (!mounted) return null;

  const handleClose = () => {
    playSfx('paperSlide');
    onClose();
  };

  return (
    <div
      className={`absolute inset-0 z-[60] flex items-center justify-center px-4 pb-4 bg-black/70 backdrop-blur-sm ${
        isExiting ? 'animate-discoveryBackdropOut' : 'animate-discoveryBackdropIn'
      }`}
      style={{ paddingTop: '5rem' }}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative max-w-md w-full max-h-[80vh] overflow-y-auto bg-gradient-to-br from-[#4a3220]/95 to-[#1a0f08]/95 border border-[color:var(--retro-gold-light)]/50 rounded-3xl p-5 sm:p-8 shadow-[0_0_60px_rgba(244,216,168,0.25)] ${
          isExiting ? 'animate-discoveryCardOut' : 'animate-completionCardIn'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Golden eyebrow header */}
        <div className="text-center mb-5">
          <div className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-gold-light)]/90 mb-2">
            8 / 8 Rahasia Terkuak
          </div>
          <div className="mx-auto w-14 h-px bg-[color:var(--retro-gold-light)]/55" />
        </div>

        {/* Main title */}
        <p
          className="text-center text-[color:var(--retro-cream)] text-xl sm:text-[1.4rem] mb-5 leading-tight italic"
          style={{ fontFamily: '"Fraunces Variable", serif' }}
        >
          Kamu sudah mengenal Eli<br />sedikit lebih dalam.
        </p>

        {/* Body */}
        <p
          className="text-center text-[color:var(--retro-cream)]/75 text-[13px] sm:text-sm leading-relaxed italic mb-6"
          style={{ fontFamily: '"Fraunces Variable", serif' }}
        >
          Setiap fakta kecil yang kamu temukan di sudut kota — tanggal lahir,
          asal Bandung, mangkuk TanTan, kaset Jaehyun, keranjang Cangcorang —
          satu per satu menyusun gambar yang lebih lengkap. Kota ini sekarang
          tahu kamu juga peduli.
        </p>

        <button
          type="button"
          onClick={handleClose}
          className="w-full px-5 py-3 rounded-full bg-[color:var(--retro-gold)]/30 hover:bg-[color:var(--retro-gold)]/50 border border-[color:var(--retro-gold-light)]/50 text-[color:var(--retro-cream)] text-[11px] font-black uppercase tracking-[0.3em] transition"
        >
          Lanjut menjelajah
        </button>
      </div>

      <style>{`
        @keyframes completionCardIn {
          0%   { opacity: 0; transform: translateY(28px) scale(0.9); }
          55%  { opacity: 1; transform: translateY(-4px) scale(1.03); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-completionCardIn {
          animation: completionCardIn 560ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-completionCardIn { animation: none; }
        }
      `}</style>
    </div>
  );
};

export { HIDDEN_DISCOVERY_DEFS, UNLOCK_THRESHOLD };
