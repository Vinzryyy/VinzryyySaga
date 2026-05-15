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
    const next = pool[Math.floor(Math.random() * pool.length)];
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
        const step = WALK_SPEED * dt;
        const ratio = Math.min(1, step / dist);
        positionRef.current[0] = px + dx * ratio;
        positionRef.current[2] = pz + dz * ratio;
        // Smooth facing — lerp toward target dir
        const targetFacing = Math.atan2(dx, dz);
        const cur = facingRef.current;
        let diff = targetFacing - cur;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        facingRef.current = cur + diff * Math.min(1, dt * 6);
      }
    } else {
      stateTimerRef.current -= dt;
      if (stateTimerRef.current <= 0) startWalk();
    }

    const [px, py, pz] = positionRef.current;
    const bob = s === 'walking' ? Math.sin(t * 8) * 0.015 : 0;
    groupRef.current.position.set(px, py + bob, pz);
    groupRef.current.rotation.y = facingRef.current;

    if (tailRef.current) {
      // Tail sway — faster saat walking, lazy saat sitting
      const speed = s === 'walking' ? 3.5 : 1.4;
      const amp = s === 'walking' ? 0.22 : 0.12;
      tailRef.current.rotation.y = Math.sin(t * speed) * amp;
    }
  });

  const handleClick = useCallback(
    (e) => {
      e.stopPropagation();
      playSfx('meow');
      startSit();
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

      {/* Head */}
      <mesh position={[0, 0.18, 0.24]} scale={[0.13, 0.12, 0.12]}>
        <sphereGeometry args={[1, 14, 12]} />
        <meshStandardMaterial color="#3a2e26" roughness={0.92} />
      </mesh>

      {/* Ears — 2 cones tilted out */}
      <mesh position={[-0.07, 0.28, 0.23]} rotation={[0, 0, 0.32]}>
        <coneGeometry args={[0.04, 0.09, 6]} />
        <meshStandardMaterial color="#2a201a" roughness={0.95} />
      </mesh>
      <mesh position={[0.07, 0.28, 0.23]} rotation={[0, 0, -0.32]}>
        <coneGeometry args={[0.04, 0.09, 6]} />
        <meshStandardMaterial color="#2a201a" roughness={0.95} />
      </mesh>

      {/* Inner ear tint — subtle pink */}
      <mesh position={[-0.07, 0.27, 0.235]} rotation={[0, 0, 0.32]}>
        <coneGeometry args={[0.02, 0.05, 6]} />
        <meshStandardMaterial color="#a07060" roughness={0.95} />
      </mesh>
      <mesh position={[0.07, 0.27, 0.235]} rotation={[0, 0, -0.32]}>
        <coneGeometry args={[0.02, 0.05, 6]} />
        <meshStandardMaterial color="#a07060" roughness={0.95} />
      </mesh>

      {/* Eyes — small dots with subtle warm emissive (catch light) */}
      <mesh position={[-0.05, 0.2, 0.33]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshStandardMaterial
          color="#1a0e08"
          emissive="#f4d895"
          emissiveIntensity={0.2}
        />
      </mesh>
      <mesh position={[0.05, 0.2, 0.33]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshStandardMaterial
          color="#1a0e08"
          emissive="#f4d895"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Nose — tiny */}
      <mesh position={[0, 0.16, 0.34]}>
        <sphereGeometry args={[0.012, 6, 6]} />
        <meshStandardMaterial color="#5a3028" roughness={0.9} />
      </mesh>

      {/* Tail group — rotates Y via tailRef sway */}
      <group position={[0, 0.13, -0.22]} ref={tailRef}>
        <mesh position={[0, 0.06, -0.13]} rotation={[Math.PI / 3.2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.04, 0.32, 6]} />
          <meshStandardMaterial color="#3a2e26" roughness={0.92} />
        </mesh>
      </group>

      {/* Legs — 4 small cylinders */}
      <mesh position={[-0.13, 0.04, 0.13]}>
        <cylinderGeometry args={[0.025, 0.025, 0.08, 6]} />
        <meshStandardMaterial color="#2a201a" roughness={0.95} />
      </mesh>
      <mesh position={[0.13, 0.04, 0.13]}>
        <cylinderGeometry args={[0.025, 0.025, 0.08, 6]} />
        <meshStandardMaterial color="#2a201a" roughness={0.95} />
      </mesh>
      <mesh position={[-0.13, 0.04, -0.12]}>
        <cylinderGeometry args={[0.025, 0.025, 0.08, 6]} />
        <meshStandardMaterial color="#2a201a" roughness={0.95} />
      </mesh>
      <mesh position={[0.13, 0.04, -0.12]}>
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
