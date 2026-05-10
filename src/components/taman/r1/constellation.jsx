/**
 * Konstelasi milestone — bintang per milestone career Eli, line
 * connections per era, era labels.
 *
 * - StarMilestone: emissive sphere + halo + Html year/title label.
 *   Reaktif ke hovered/selected/spotlit/signature event/upcoming.
 * - ConstellationLines: vanilla THREE.LineSegments segments connecting
 *   stars adjacent dalam ERA_DEFS milestoneIds order. Vertex colors
 *   per era. Fade in 4s setelah mount.
 * - ConstellationLabels: Html era name di atas konstelasi center, fade
 *   in saat camera looking toward (dot product > 0.65).
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { hashSeed } from './utils';
import { ERA_DEFS, skyPosition } from './era';

// Visual: emissive sphere body + halo 2.7x larger transparent,
// emissiveIntensity di-pulse via useFrame (twinkle subtle), boost
// glow + scale saat hover, sustained pulse saat star di-select untuk
// continuity di MilestoneOverlay.
export const StarMilestone = ({
  star,
  hovered,
  selected,
  spotlit,
  previewLit,
  signatureEvent,
  modalOpen,
  onPointerOver,
  onPointerOut,
  onClick,
}) => {
  const groupRef = useRef();
  const matRef = useRef();
  const haloMatRef = useRef();
  // Twinkle phase deterministic per id supaya bintang-bintang gak
  // pulse synchronously (busy + unrealistic).
  const twinklePhase = useMemo(
    () => hashSeed(`${star.id}-tw`) * Math.PI * 2,
    [star.id],
  );
  // Upcoming (date null) dim outline only — dapet treatment beda.
  const isUpcoming = star.upcoming === true;
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const twinkle = 0.95 + Math.sin(t * 0.6 + twinklePhase) * 0.22;
    let glow = isUpcoming ? 0.32 : 0.72;
    let scaleMul = 1.0;
    if (hovered) {
      glow += 0.8;
      scaleMul = 1.15;
    }
    if (selected) {
      glow += 0.4 + Math.sin(t * 1.4) * 0.2;
      scaleMul *= 1.08;
    }
    // Era spotlight — saat user click chip di EraGuide, semua bintang
    // dalam era pulse dgn rhythm cepat 4 detik.
    if (spotlit) {
      glow += 0.7 + Math.sin(t * 5) * 0.4;
      scaleMul *= 1.18;
    }
    // Era preview — saat user hover chip (belum click), softer glow
    // boost untuk identify era stars tanpa committed spotlight.
    if (previewLit) {
      glow += 0.35 + Math.sin(t * 3) * 0.15;
      scaleMul *= 1.08;
    }
    // Signature event — first/last star anchor dapat subtle pulse
    // saat 'recent'/'old' event aktif (cross-scene effect coordinated
    // with lentera/highlight stars di parent).
    if (signatureEvent) {
      const dt = t - signatureEvent.time;
      if (dt > 0 && dt < 3.0) {
        const u = dt / 3.0;
        const env = Math.sin(u * Math.PI);
        if (signatureEvent.type === 'recent' && star.isRecentAnchor) {
          glow += env * 0.6;
        } else if (signatureEvent.type === 'old' && star.isOldAnchor) {
          glow += env * 0.6;
        }
      }
    }
    if (matRef.current) {
      matRef.current.emissiveIntensity = glow * twinkle;
    }
    if (haloMatRef.current) {
      const haloOp = Math.max(
        0.06,
        (isUpcoming ? 0.09 : 0.18) +
          (hovered ? 0.18 : 0) +
          (selected ? 0.12 : 0),
      );
      haloMatRef.current.opacity = haloOp;
    }
    groupRef.current.scale.setScalar(scaleMul);
  });
  const baseSize = 0.26;
  return (
    <group
      ref={groupRef}
      position={[star.x, star.y, star.z]}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(star);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onPointerOver?.(star.id);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onPointerOut?.(star.id);
      }}
    >
      <mesh>
        <sphereGeometry args={[baseSize, 16, 12]} />
        {isUpcoming ? (
          <meshStandardMaterial
            ref={matRef}
            color={star.color}
            emissive={star.color}
            emissiveIntensity={0.4}
            roughness={0.9}
            transparent
            opacity={0.55}
            toneMapped={false}
          />
        ) : (
          <meshStandardMaterial
            ref={matRef}
            color={star.color}
            emissive={star.color}
            emissiveIntensity={1.0}
            roughness={0.85}
            toneMapped={false}
          />
        )}
      </mesh>
      <mesh>
        <sphereGeometry args={[baseSize * 2.7, 12, 8]} />
        <meshBasicMaterial
          ref={haloMatRef}
          color={star.color}
          transparent
          opacity={0.2}
          depthWrite={false}
        />
      </mesh>
      {/* Year label — visible saat hovered/selected/no-modal-open.
          Saat modal open di star LAIN, label hidden supaya gak
          overlap dgn modal content. */}
      {(!modalOpen || hovered || selected) && (
        <Html
          position={[0, -baseSize * 1.8, 0]}
          center
          distanceFactor={8}
          occlude={false}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="text-center whitespace-nowrap"
            style={{
              fontFamily: '"Fraunces Variable", serif',
              fontStyle: 'italic',
              color: star.color,
              transition: 'opacity 300ms ease-out',
              textShadow: '0 0 8px rgba(0,0,0,0.85)',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                letterSpacing: '0.18em',
                opacity: hovered ? 0.95 : selected ? 0.85 : 0.45,
              }}
            >
              {star.year}
            </div>
            {(hovered || selected) && (
              <div
                style={{
                  fontSize: '10px',
                  marginTop: '3px',
                  color: 'rgba(255,255,255,0.85)',
                  fontStyle: 'italic',
                  maxWidth: '180px',
                  whiteSpace: 'normal',
                  lineHeight: '1.25',
                  animation: 'fadeIn 250ms ease-out',
                }}
              >
                {star.title}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};

// Per-era line segments — single era → 1 lineSegments mesh dgn own
// fade-in timing. Stagger reveal cascade: era 0 mulai fade @1.5s,
// era 1 @1.9s, era 2 @2.3s, dst (gap 0.4s per era). Bikin konstelasi
// kerasa "terbentuk satu per satu" oldest → newest.
const EraLines = ({ era, stars, startDelay }) => {
  const matRef = useRef();
  const startTimeRef = useRef(-1);
  const { positions, color } = useMemo(() => {
    const byId = new Map(stars.map((s) => [s.id, s]));
    const pos = [];
    const ids = era.milestoneIds;
    for (let i = 0; i < ids.length - 1; i++) {
      const a = byId.get(ids[i]);
      const c = byId.get(ids[i + 1]);
      if (!a || !c) continue;
      pos.push(a.x, a.y, a.z, c.x, c.y, c.z);
    }
    const hex = era.color.replace('#', '');
    return {
      positions: new Float32Array(pos),
      color: era.color,
    };
  }, [era, stars]);
  useFrame((state) => {
    if (!matRef.current) return;
    const t = state.clock.elapsedTime;
    if (startTimeRef.current < 0) startTimeRef.current = t;
    const dt = t - startTimeRef.current - startDelay;
    // Cubic ease-in over 2.5s per era — feels like garis "drawn"
    // bukan crossfade flat.
    const u = Math.min(1, Math.max(0, dt / 2.5));
    const eased = u * u * (3 - 2 * u); // smoothstep
    const breath = 0.92 + Math.sin(t * 0.3) * 0.08;
    matRef.current.opacity = 0.42 * eased * breath;
  });
  if (positions.length === 0) return null;
  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={positions.length / 3}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        ref={matRef}
        color={color}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </lineSegments>
  );
};

// Garis konstelasi per-era — 7 lineSegments mesh terpisah, masing
// punya start delay incremental (gap 0.4s) untuk progressive reveal
// sequential oldest → newest era. User feel "konstelasi terbentuk
// pelan-pelan" sebagai entry experience.
export const ConstellationLines = ({ stars }) => (
  <>
    {ERA_DEFS.map((era, i) => (
      <EraLines
        key={era.id}
        era={era}
        stars={stars}
        startDelay={1.5 + i * 0.4}
      />
    ))}
  </>
);

// Era label — Html floating di atas konstelasi center, fade in saat
// camera pointing dekat ke arah era itu (dot product > 0.65). Subtle,
// gak persistent — kasih hint nama era tanpa clutter scene.
export const ConstellationLabels = () => {
  const groupRefs = useRef([]);
  useFrame((state) => {
    const camDir = new THREE.Vector3();
    state.camera.getWorldDirection(camDir);
    ERA_DEFS.forEach((era, i) => {
      const ref = groupRefs.current[i];
      if (!ref) return;
      const eraCenter = skyPosition(era.azimuth, era.altitude);
      const toCenter = new THREE.Vector3(
        eraCenter[0],
        eraCenter[1],
        eraCenter[2],
      )
        .sub(state.camera.position)
        .normalize();
      const dot = camDir.dot(toCenter);
      const op = Math.max(0, (dot - 0.65) / 0.35);
      ref.style.opacity = String(op * 0.85);
    });
  });
  return (
    <>
      {ERA_DEFS.map((era, i) => {
        const center = skyPosition(era.azimuth, era.altitude);
        const labelPos = [center[0], center[1] + 1.2, center[2]];
        return (
          <Html
            key={era.id}
            position={labelPos}
            center
            distanceFactor={9}
            occlude={false}
            style={{ pointerEvents: 'none' }}
          >
            <div
              ref={(el) => {
                groupRefs.current[i] = el;
              }}
              className="whitespace-nowrap text-center"
              style={{
                fontFamily: '"Fraunces Variable", serif',
                fontStyle: 'italic',
                fontSize: '13px',
                color: era.color,
                opacity: 0,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                textShadow: '0 0 8px rgba(0,0,0,0.7)',
                transition: 'opacity 400ms ease-out',
              }}
            >
              {era.name}
            </div>
          </Html>
        );
      })}
    </>
  );
};
