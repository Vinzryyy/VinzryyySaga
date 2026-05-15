/**
 * WanderingCat — TanTan, kucing Eli, jalan-jalan di peta.
 *
 * Reference ke discovery `cat-bowl` (TanTan = nama kucing Eli per
 * eliProfile.js). Cat muncul setelah user discover cat-bowl untuk
 * pertama kali — story justification: "dia keluar sembunyiannya."
 *
 * Behavior:
 * - Spawn dekat cat-bowl [10.5, 0.05, 4], home-base buat re-anchor
 * - Random walk antar 8 titik dalam zone NE peta (avoid landmark)
 * - State machine: walking → arrive → (sit | pause) → walking
 * - Body bob subtle saat walking, tail sway konstan
 * - Click → instant sit + speech bubble (4.2s fade in/out)
 * - Speech tone third-person, match cerita-rakyat narrator peta
 *
 * 3D primitives only — no external asset. Match aesthetic
 * HiddenDiscoveries (low-poly, painted-look). Total ~10 mesh, cheap.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { playSfx } from '../../../lib/townSfx';

// Spawn home + safe wander targets — semua di NE quadrant peta, radius
// >=3 dari petak utama. cat-bowl pos: [10.5, 0.05, 4].
const HOME_POS = [10.5, 0.05, 4];
const WANDER_TARGETS = [
  [10.5, 0.05, 4],
  [9, 0.05, 6.5],
  [11, 0.05, 2],
  [8, 0.05, 5],
  [10, 0.05, 6],
  [11.5, 0.05, 4.5],
  [8.5, 0.05, 3.5],
  [9.5, 0.05, 5.5],
];

// Tone: third-person narrator, cerita-rakyat. Hindari emote/cute -ese
// yg gak fit aesthetic peta. Mix observational + intimate.
const MESSAGES = [
  'TanTan duduk, mengeong pelan.',
  'TanTan meregangkan badan.',
  'TanTan menatapmu, lalu memalingkan muka.',
  'TanTan: nyao~',
  'TanTan menggesek kakinya pelan.',
  'TanTan tahu kamu sayang Eli.',
  'TanTan suka di sini.',
  'Mangkuknya masih hangat.',
];

const WALK_SPEED = 0.5;          // unit per detik
const ARRIVE_THRESHOLD = 0.15;
const SIT_DURATION_RANGE = [3.5, 7];
const PAUSE_DURATION_RANGE = [0.6, 1.5];

const WanderingCat = () => {
  const groupRef = useRef();
  const tailRef = useRef();
  // 4 leg refs untuk trot animation. Order: FL, FR, BL, BR (depan-kiri,
  // depan-kanan, belakang-kiri, belakang-kanan).
  const legFLRef = useRef();
  const legFRRef = useRef();
  const legBLRef = useRef();
  const legBRRef = useRef();
  // Head group ref untuk idle look-around (sit/pause) + nod tipis saat
  // jalan. Wrap semua bagian kepala (sphere, ears, eyes, nose) supaya
  // rotate sebagai unit.
  const headGroupRef = useRef();
  const leftEyeRef = useRef();
  const rightEyeRef = useRef();
  // Tail flick — transient burst tambahan saat di-click, decay 0.6s.
  // Stored as ref karena gak butuh re-render, cuma dibaca per-frame.
  const tailFlickStartRef = useRef(-Infinity);
  // Random offsets per-instance — bikin blink/look gak full sync sama
  // clock. Sekali generate, gak re-render. Math.random aman karena
  // useRef init sekali.
  const phaseOffsetRef = useRef({
    blink: Math.random() * 5,
    look: Math.random() * 3,
  });
  const positionRef = useRef([...HOME_POS]);
  const targetRef = useRef([...HOME_POS]);
  const stateRef = useRef('walking'); // 'walking' | 'sitting' | 'pausing'
  const stateTimerRef = useRef(0);
  const facingRef = useRef(0);
  const [speech, setSpeech] = useState(null);
  const speechTimerRef = useRef(null);

  const pickNextTarget = useCallback(() => {
    // 30% home anchor, 70% random non-current target.
    if (Math.random() < 0.3) {
      targetRef.current = [...HOME_POS];
      return;
    }
    const pool = WANDER_TARGETS.filter(
      (t) =>
        Math.hypot(t[0] - targetRef.current[0], t[2] - targetRef.current[2]) >
        1,
    );
    // Bias avoid U-turn: prefer target yang gak butuh >135° rotation
    // dari current facing. Hindari "freeze-then-walk" yang keliatan
    // patah-patah. Kalau semua target di belakang, fall back ke pool
    // full (rare — cuma kalau cat lagi nyudut).
    const [px, , pz] = positionRef.current;
    const inFrontPool = pool.filter((target) => {
      const dx = target[0] - px;
      const dz = target[2] - pz;
      const angleToTarget = Math.atan2(dx, dz);
      let diff = angleToTarget - facingRef.current;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      return Math.abs(diff) < Math.PI * 0.75;
    });
    const finalPool = inFrontPool.length > 0 ? inFrontPool : pool;
    const next = finalPool[Math.floor(Math.random() * finalPool.length)];
    targetRef.current = [...next];
  }, []);

  const startWalk = useCallback(() => {
    pickNextTarget();
    stateRef.current = 'walking';
    stateTimerRef.current = 0;
  }, [pickNextTarget]);

  const startSit = useCallback(() => {
    stateRef.current = 'sitting';
    stateTimerRef.current =
      SIT_DURATION_RANGE[0] +
      Math.random() * (SIT_DURATION_RANGE[1] - SIT_DURATION_RANGE[0]);
  }, []);

  const startPause = useCallback(() => {
    stateRef.current = 'pausing';
    stateTimerRef.current =
      PAUSE_DURATION_RANGE[0] +
      Math.random() * (PAUSE_DURATION_RANGE[1] - PAUSE_DURATION_RANGE[0]);
  }, []);

  useEffect(() => {
    startWalk();
  }, [startWalk]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(0.1, delta);
    const t = state.clock.elapsedTime;
    const s = stateRef.current;

    if (s === 'walking') {
      const [px, , pz] = positionRef.current;
      const [tx, , tz] = targetRef.current;
      const dx = tx - px;
      const dz = tz - pz;
      const dist = Math.hypot(dx, dz);
      if (dist < ARRIVE_THRESHOLD) {
        if (Math.random() < 0.4) startSit();
        else startPause();
      } else {
        // Rotate toward target first
        const targetFacing = Math.atan2(dx, dz);
        const cur = facingRef.current;
        let diff = targetFacing - cur;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        facingRef.current = cur + diff * Math.min(1, dt * 6);
        // Gate forward motion on facing alignment — cegah slide sideways/
        // mundur saat muter ke target di belakang. cos(diff)=1 aligned,
        // 0 perpendicular, <0 facing menjauh (clamped). Hasilnya: kucing
        // muter di tempat dulu kalau target di belakang, baru jalan.
        const alignment = Math.max(0, Math.cos(diff));
        const step = WALK_SPEED * dt * alignment;
        const ratio = Math.min(1, step / dist);
        positionRef.current[0] = px + dx * ratio;
        positionRef.current[2] = pz + dz * ratio;
      }
    } else {
      stateTimerRef.current -= dt;
      if (stateTimerRef.current <= 0) startWalk();
    }

    const [px, py, pz] = positionRef.current;
    const bob = s === 'walking' ? Math.sin(t * 8) * 0.03 : 0;
    groupRef.current.position.set(px, py + bob, pz);
    groupRef.current.rotation.y = facingRef.current;

    // Leg trot cycle — diagonal pairs (FL+BR vs FR+BL) phase π apart.
    // Tanpa ini, body slide forward sementara cylinder kaki diam =
    // "moving doll" effect klasik (patah-patah). Setiap kaki lift naik
    // ke max(0, sin(...)) supaya cuma "step up" — gak nyemplung ke
    // bawah tanah. Saat sitting/pausing, leg balik ke base.
    const legBaseY = 0.04;
    const legLiftAmp = 0.05;
    const cycleFreq = 7.5;
    const trotPhase = t * cycleFreq;
    if (s === 'walking') {
      const pairA = Math.max(0, Math.sin(trotPhase)) * legLiftAmp;
      const pairB = Math.max(0, Math.sin(trotPhase + Math.PI)) * legLiftAmp;
      if (legFLRef.current) legFLRef.current.position.y = legBaseY + pairA;
      if (legBRRef.current) legBRRef.current.position.y = legBaseY + pairA;
      if (legFRRef.current) legFRRef.current.position.y = legBaseY + pairB;
      if (legBLRef.current) legBLRef.current.position.y = legBaseY + pairB;
    } else {
      if (legFLRef.current) legFLRef.current.position.y = legBaseY;
      if (legFRRef.current) legFRRef.current.position.y = legBaseY;
      if (legBLRef.current) legBLRef.current.position.y = legBaseY;
      if (legBRRef.current) legBRRef.current.position.y = legBaseY;
    }

    // Body roll — sync sama leg trot. Saat pair A (FL+BR) lift, body
    // lean tipis ke arah pair B yang nopang. Quadruped feel, bukan
    // rigid plank. rotation.z independent dari .y (yaw facing).
    groupRef.current.rotation.z =
      s === 'walking' ? Math.sin(trotPhase) * 0.04 : 0;

    // Head animation:
    //  - walking: nod halus (Y) + sedikit pitch (X) — alert forward
    //  - sit/pause: idle look-around lambat (slower Y, periodic peek X)
    if (headGroupRef.current) {
      if (s === 'walking') {
        headGroupRef.current.rotation.y = Math.sin(t * 1.3) * 0.05;
        headGroupRef.current.rotation.x = Math.sin(t * 4 + 0.3) * 0.025;
      } else {
        const lookT = t + phaseOffsetRef.current.look;
        headGroupRef.current.rotation.y = Math.sin(lookT * 0.55) * 0.4;
        headGroupRef.current.rotation.x = Math.sin(lookT * 0.32) * 0.07;
      }
    }

    // Eye blink — sekali setiap ~3.5s, closure ~0.16s. Symmetric scaleY
    // dari 1 → 0.12 → 1 lewat cos curve. Phase offset per-instance bikin
    // kalo nanti ada multi-cat, gak blink barengan.
    const blinkCycle = 3.5;
    const blinkDur = 0.16;
    const blinkT = (t + phaseOffsetRef.current.blink) % blinkCycle;
    let eyeScaleY = 1;
    if (blinkT < blinkDur) {
      const u = blinkT / blinkDur;
      // cos(π·u) goes 1 → -1; map to 1 → 0.12 → 1 via abs+blend
      eyeScaleY = 0.12 + 0.88 * Math.abs(Math.cos(u * Math.PI));
    }
    if (leftEyeRef.current) leftEyeRef.current.scale.y = eyeScaleY;
    if (rightEyeRef.current) rightEyeRef.current.scale.y = eyeScaleY;

    // Tail sway base + transient flick boost saat di-click. Flick decay
    // 0.6s lewat exp curve, ditambahin ke amplitude dasar.
    if (tailRef.current) {
      // Handoff sentinel -1 → capture current clock.elapsedTime sebagai
      // flick start. Click handler set sentinel; useFrame resolve di
      // frame berikutnya pakai basis yg sama dgn t.
      if (tailFlickStartRef.current === -1) {
        tailFlickStartRef.current = t;
      }
      const baseSpeed = s === 'walking' ? 3.5 : 1.4;
      const baseAmp = s === 'walking' ? 0.22 : 0.12;
      const flickElapsed = t - tailFlickStartRef.current;
      const flickBoost =
        flickElapsed >= 0 && flickElapsed < 0.6
          ? Math.exp(-flickElapsed * 5) * 0.35
          : 0;
      tailRef.current.rotation.y =
        Math.sin(t * (baseSpeed + flickBoost * 8)) * (baseAmp + flickBoost);
    }
  });

  const handleClick = useCallback(
    (e) => {
      e.stopPropagation();
      playSfx('meow');
      startSit();
      // Sentinel -1: tell useFrame to capture current clock.elapsedTime
      // as flick baseline next frame. performance.now() bukan basis yg
      // sama dgn three.js clock, jadi pake handoff via sentinel.
      tailFlickStartRef.current = -1;
      const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
      setSpeech(msg);
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
      speechTimerRef.current = setTimeout(() => setSpeech(null), 4200);
    },
    [startSit],
  );

  useEffect(() => {
    return () => {
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    };
  }, []);

  return (
    <group
      ref={groupRef}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'auto';
      }}
      onClick={handleClick}
    >
      {/* Hitbox utk easier tap esp mobile */}
      <mesh position={[0, 0.18, 0]} visible={false}>
        <boxGeometry args={[0.85, 0.6, 0.85]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Body — ellipsoid flattened on Y */}
      <mesh position={[0, 0.13, 0]} scale={[0.25, 0.16, 0.32]}>
        <sphereGeometry args={[1, 14, 10]} />
        <meshStandardMaterial color="#3a2e26" roughness={0.92} />
      </mesh>

      {/* Belly cream — sedikit nongol di bagian bawah-depan */}
      <mesh position={[0, 0.07, 0.06]} scale={[0.18, 0.1, 0.22]}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshStandardMaterial color="#d8c0a4" roughness={0.9} />
      </mesh>

      {/* Head group — all head meshes wrap di sini supaya bisa
          rotate sebagai unit (idle look-around saat sit/pause, nod tipis
          saat walk). Group origin di head center [0, 0.18, 0.24]; semua
          mesh child diposisikan relatif ke origin itu. */}
      <group ref={headGroupRef} position={[0, 0.18, 0.24]}>
        {/* Head sphere */}
        <mesh scale={[0.13, 0.12, 0.12]}>
          <sphereGeometry args={[1, 14, 12]} />
          <meshStandardMaterial color="#3a2e26" roughness={0.92} />
        </mesh>

        {/* Ears — 2 cones tilted out */}
        <mesh position={[-0.07, 0.1, -0.01]} rotation={[0, 0, 0.32]}>
          <coneGeometry args={[0.04, 0.09, 6]} />
          <meshStandardMaterial color="#2a201a" roughness={0.95} />
        </mesh>
        <mesh position={[0.07, 0.1, -0.01]} rotation={[0, 0, -0.32]}>
          <coneGeometry args={[0.04, 0.09, 6]} />
          <meshStandardMaterial color="#2a201a" roughness={0.95} />
        </mesh>

        {/* Inner ear tint — subtle pink */}
        <mesh position={[-0.07, 0.09, -0.005]} rotation={[0, 0, 0.32]}>
          <coneGeometry args={[0.02, 0.05, 6]} />
          <meshStandardMaterial color="#a07060" roughness={0.95} />
        </mesh>
        <mesh position={[0.07, 0.09, -0.005]} rotation={[0, 0, -0.32]}>
          <coneGeometry args={[0.02, 0.05, 6]} />
          <meshStandardMaterial color="#a07060" roughness={0.95} />
        </mesh>

        {/* Eyes — small dots with subtle warm emissive (catch light).
            Refs untuk blink scale.y mutation. */}
        <mesh ref={leftEyeRef} position={[-0.05, 0.02, 0.09]}>
          <sphereGeometry args={[0.018, 8, 8]} />
          <meshStandardMaterial
            color="#1a0e08"
            emissive="#f4d895"
            emissiveIntensity={0.2}
          />
        </mesh>
        <mesh ref={rightEyeRef} position={[0.05, 0.02, 0.09]}>
          <sphereGeometry args={[0.018, 8, 8]} />
          <meshStandardMaterial
            color="#1a0e08"
            emissive="#f4d895"
            emissiveIntensity={0.2}
          />
        </mesh>

        {/* Nose — tiny */}
        <mesh position={[0, -0.02, 0.1]}>
          <sphereGeometry args={[0.012, 6, 6]} />
          <meshStandardMaterial color="#5a3028" roughness={0.9} />
        </mesh>
      </group>

      {/* Tail group — rotates Y via tailRef sway */}
      <group position={[0, 0.13, -0.22]} ref={tailRef}>
        <mesh position={[0, 0.06, -0.13]} rotation={[Math.PI / 3.2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.04, 0.32, 6]} />
          <meshStandardMaterial color="#3a2e26" roughness={0.92} />
        </mesh>
      </group>

      {/* Legs — 4 small cylinders. Refs untuk trot cycle animation
          (FL+BR pair vs FR+BL pair, diagonal). X/Z stay fixed; cuma Y
          yang di-mutate per frame. */}
      <mesh ref={legFLRef} position={[-0.13, 0.04, 0.13]}>
        <cylinderGeometry args={[0.025, 0.025, 0.08, 6]} />
        <meshStandardMaterial color="#2a201a" roughness={0.95} />
      </mesh>
      <mesh ref={legFRRef} position={[0.13, 0.04, 0.13]}>
        <cylinderGeometry args={[0.025, 0.025, 0.08, 6]} />
        <meshStandardMaterial color="#2a201a" roughness={0.95} />
      </mesh>
      <mesh ref={legBLRef} position={[-0.13, 0.04, -0.12]}>
        <cylinderGeometry args={[0.025, 0.025, 0.08, 6]} />
        <meshStandardMaterial color="#2a201a" roughness={0.95} />
      </mesh>
      <mesh ref={legBRRef} position={[0.13, 0.04, -0.12]}>
        <cylinderGeometry args={[0.025, 0.025, 0.08, 6]} />
        <meshStandardMaterial color="#2a201a" roughness={0.95} />
      </mesh>

      {/* Speech bubble — HTML overlay attached to cat head. distanceFactor
          consistent dgn pattern Html lain di TamanPeta (10). */}
      {speech && (
        <Html
          position={[0, 0.52, 0]}
          center
          distanceFactor={9}
          occlude={false}
        >
          <div className="catSpeechBubble pointer-events-none whitespace-nowrap">
            {speech}
          </div>
          <style>{`
            .catSpeechBubble {
              padding: 4px 11px;
              background: rgba(26, 18, 10, 0.85);
              border: 1px solid rgba(244, 216, 168, 0.4);
              color: #f4d8a8;
              font-family: 'Fraunces Variable', serif;
              font-style: italic;
              font-size: 11px;
              letter-spacing: 0.02em;
              border-radius: 999px;
              backdrop-filter: blur(4px);
              animation: catSpeechFade 4200ms ease-in-out both;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            }
            @keyframes catSpeechFade {
              0%   { opacity: 0; transform: translateY(8px) scale(0.92); }
              10%  { opacity: 1; transform: translateY(0)    scale(1); }
              80%  { opacity: 1; transform: translateY(-2px) scale(1); }
              100% { opacity: 0; transform: translateY(-6px) scale(0.96); }
            }
            @media (prefers-reduced-motion: reduce) {
              .catSpeechBubble { animation: none; opacity: 1; }
            }
          `}</style>
        </Html>
      )}
    </group>
  );
};

export default WanderingCat;
