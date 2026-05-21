/**
 * AtmosphericFireflies — kunang-kunang post-purified ambient life.
 *
 * Spawn dari count >= 7000 (purified onset). Density tetep (14 desktop /
 * 8 mobile), bukan tier-progressive — fireflies = ambient atmosphere
 * yang konsisten setelah kota pulih, bukan milestone visual. Posisi
 * tersebar di plaza area (radius 1.5-6 dari center), Y bervariasi
 * 0.6-1.4 unit di atas tanah (level kepala warga & atas landmark
 * kecil).
 *
 * Per-firefly:
 *   - Small additive emissive sphere, warm pastel yellow #f8e0a0
 *   - Slow drift dalam small ellipse (radius 0.3-0.7 unit, period 8-15s)
 *   - Vertical bob (0.15 amplitude)
 *   - Opacity flicker (blink-like, slow ~2.5-4s period)
 *   - Phase-offset per-idx supaya gak sinkron seragam
 *
 * Deterministic seeded values (gak Math.random tiap mount) — posisi
 * sama di setiap reload.
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

// Build firefly defs sekali at module load via deterministic PRNG.
// Max pool 24 — base 14 desktop / 8 mobile, extra slots di-unlock
// progressively dari count 10000→20000 (post-legacy ramping).
const FIREFLY_COUNT = 24;
const FIREFLY_DEFS = (() => {
  const defs = [];
  for (let i = 0; i < FIREFLY_COUNT; i++) {
    // Pseudo-random seeded by idx — stable across reloads.
    const s1 = ((i * 2654435761) % 997) / 997;
    const s2 = ((i * 1597463) % 991) / 991;
    const s3 = ((i * 8675309) % 743) / 743;
    // Polar distribution dengan jitter — fireflies tersebar gak ring-perfect
    const angle = (i / FIREFLY_COUNT) * Math.PI * 2 + s1 * 0.6;
    const radius = 1.5 + s2 * 4.5;
    defs.push({
      basePos: [
        Math.cos(angle) * radius,
        0.6 + s3 * 0.8, // Y level: 0.6 (low) sampai 1.4 (high)
        Math.sin(angle) * radius,
      ],
      phase: i * 0.7,
      driftRadius: 0.3 + s2 * 0.4,
      driftPeriod: 8 + s1 * 7, // 8-15 detik per cycle
      blinkPeriod: 2.5 + s3 * 1.5, // 2.5-4s blink cycle
      verticalBob: 0.1 + s1 * 0.08,
    });
  }
  return defs;
})();

const Firefly = ({ def, idx }) => {
  const meshRef = useRef();
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    // Drift — ellipse around basePos. Eccentricity 0.7 buat ovaler shape.
    const driftT = (t / def.driftPeriod) * Math.PI * 2 + def.phase;
    const dx = Math.cos(driftT) * def.driftRadius;
    const dz = Math.sin(driftT) * def.driftRadius * 0.7;
    meshRef.current.position.x = def.basePos[0] + dx;
    meshRef.current.position.z = def.basePos[2] + dz;
    // Vertical bob — independent slower wave
    meshRef.current.position.y =
      def.basePos[1] + def.verticalBob * Math.sin(t * 0.45 + def.phase * 1.3);
    // Blink — opacity flicker, mostly visible tapi kadang dim (kayak
    // kunang asli yang on-off). Floor 0.25 supaya gak total invisible.
    const blink = (Math.sin((t / def.blinkPeriod) * Math.PI * 2 + def.phase) + 1) / 2;
    meshRef.current.material.opacity = 0.25 + blink * 0.65;
  });
  return (
    <mesh ref={meshRef} position={def.basePos}>
      <sphereGeometry args={[0.045, 8, 6]} />
      <meshBasicMaterial
        color="#f8e0a0"
        transparent
        opacity={0.6}
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  );
};

const AtmosphericFireflies = ({ count = 0, loaded = false, isMobile = false }) => {
  // useMemo dipanggil sebelum conditional return supaya hook order
  // konsisten — kalau `loaded` toggles false→true atau isMobile berubah,
  // gak break Rules of Hooks.
  //
  // Density ramping:
  //   count 7000-9999  → base 14 desktop / 8 mobile
  //   count 10000-19999 → ramp ke 24 desktop / 16 mobile (post-legacy)
  //   count >=20000    → max pool full
  const defs = useMemo(() => {
    const postLegacy = Math.max(0, Math.min(1, (count - 10000) / 10000));
    const base = isMobile ? 8 : 14;
    const maxExtra = isMobile ? 8 : 10;
    const totalCount = base + Math.floor(postLegacy * maxExtra);
    return FIREFLY_DEFS.slice(0, totalCount);
  }, [isMobile, count]);
  if (!loaded || count < 7000) return null;
  return (
    <>
      {defs.map((d, i) => (
        <Firefly key={`firefly-${i}`} def={d} idx={i} />
      ))}
    </>
  );
};

export default AtmosphericFireflies;
