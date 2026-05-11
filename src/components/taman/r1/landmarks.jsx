/**
 * Interactive landmarks + creatures untuk Konstelasi Perjalanan.
 *
 * - Lanterns: 5 lentera kayu sepanjang path (1 dead intentionally),
 *   flicker pulse sync ke 'recent' signature event, endless wrap di FPV
 * - Owls: 3 burung hantu perched di foliage GardenAnchorTrees, head
 *   sway + alert event + click-to-notice + eye glow on signature
 * - Bats: 3 V-shape silhouette drift di sky (mobile skipped via parent)
 * - Rabbits: 4 ekor ground-level cute moments
 * - DistantFigure: silhouette di z=-34, glow on signature events
 * - StoneMonument: clickable obelisk di z=-32 dgn engraving Html
 * - OldBench: clickable kayu tua di z=-15 dgn click → poetic line
 * - TreeSwing: ayunan di z=-18, click → boost amplitudo 3s
 * - WindChime: chime di z=-8, click → tinkle audio + wobble decay
 * - MonumentProximity: trigger saat FPV camera z<-27.5
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { getWind } from './utils';

// Lentera kayu di sepanjang lorong — way-finding + memory metaphor
// (cahaya sebagai penanda waktu yang lewat). Flicker via combo slow
// sin (breath) + fast sin (jitter) → simulate flame instability tanpa
// random noise yang bikin reactive.
//
// Position: 5 lantern di antara tree pairs, alternating side (kiri/
// kanan) supaya cahaya distribute even sepanjang lorong. x=±3.5 (di
// luar PATH_X_OFFSET=2.6 supaya nggak overlap pohon).
// Lentera #3 (z=-17, tengah path) sengaja `dead: true` — path
// storytelling: ada satu yang udah mati, kasih hint waktu lewat.
const LANTERN_DEFS = [
  { pos: [-3.5, 0, -5], phase: 0 },
  { pos: [3.5, 0, -11], phase: 1.3 },
  { pos: [-3.5, 0, -17], phase: 2.5, dead: true },
  { pos: [3.5, 0, -23], phase: 0.7 },
  { pos: [-3.5, 0, -29], phase: 1.8 },
];

const TILE_SIZE_LANTERNS = 50;
const LanternPost = ({ pos, phase, dead = false, signatureEvent, viewMode }) => {
  const lightRef = useRef();
  const matRef = useRef();
  const groupRef = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const wind = getWind(t, phase * 1.7);
    // Endless wrap: di FPV, position z di-wrap relatif terhadap
    // camera z. Bikin lentera kerasa "muncul terus" di depan saat
    // user jalan (gak ada ujung).
    if (groupRef.current) {
      let displayZ = pos[2];
      if (viewMode === 'fpv') {
        const camZ = state.camera.position.z;
        let relZ = pos[2] - camZ;
        relZ =
          ((relZ + TILE_SIZE_LANTERNS / 2) % TILE_SIZE_LANTERNS +
            TILE_SIZE_LANTERNS) %
            TILE_SIZE_LANTERNS -
          TILE_SIZE_LANTERNS / 2;
        displayZ = camZ + relZ;
      }
      groupRef.current.position.x = pos[0];
      groupRef.current.position.y = pos[1];
      groupRef.current.position.z = displayZ;
      groupRef.current.rotation.z = wind.total * 0.012;
    }
    if (dead) {
      // Lentera mati — no light, no glow
      if (lightRef.current) lightRef.current.intensity = 0;
      if (matRef.current) matRef.current.emissiveIntensity = 0;
      return;
    }
    const slow = Math.sin(t * 0.7 + phase * 1.4) * 0.18;
    const fast = Math.sin(t * 8 + phase) * 0.05;
    const gustDip = Math.max(0, Math.abs(wind.gust) - 0.4) * 0.35;
    let factor = (1 + slow + fast) * (1 - gustDip);
    // Signature 'recent' — sync flicker (semua lentera ramp peak bareng)
    if (signatureEvent && signatureEvent.type === 'recent') {
      const dt = t - signatureEvent.time;
      if (dt > 0 && dt < 3) {
        let boost = 0;
        if (dt < 0.5) boost = dt / 0.5;
        else if (dt < 2.0) boost = 1;
        else boost = (3 - dt) / 1;
        factor *= 1 + boost * 1.4;
      }
    }
    if (lightRef.current) lightRef.current.intensity = 1.6 * factor;
    if (matRef.current) matRef.current.emissiveIntensity = 1.2 * factor;
  });
  return (
    <group ref={groupRef} position={pos}>
      {/* Tiang kayu */}
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 1.8, 6]} />
        <meshStandardMaterial color="#3a2a1f" roughness={0.95} />
      </mesh>
      {/* Lamp body — panel emissive warna api */}
      <mesh position={[0, 1.95, 0]}>
        <boxGeometry args={[0.28, 0.32, 0.28]} />
        <meshStandardMaterial
          ref={matRef}
          color="#a8784a"
          emissive="#ffaa44"
          emissiveIntensity={1.2}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>
      {/* Frame edges (kayu gelap) di 4 sudut */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`f-${sx}-${sz}`} position={[sx * 0.13, 1.95, sz * 0.13]}>
            <boxGeometry args={[0.04, 0.34, 0.04]} />
            <meshStandardMaterial color="#1a0d08" roughness={0.95} />
          </mesh>
        ))
      )}
      {/* Atap pyramid */}
      <mesh position={[0, 2.18, 0]}>
        <coneGeometry args={[0.22, 0.16, 4]} />
        <meshStandardMaterial color="#2a1d14" roughness={0.9} />
      </mesh>
      {/* Point light flickering */}
      <pointLight
        ref={lightRef}
        position={[0, 1.95, 0]}
        intensity={1.6}
        color="#ffaa44"
        distance={6}
        decay={2}
      />
    </group>
  );
};

export const Lanterns = ({ signatureEvent, viewMode }) => (
  <>
    {LANTERN_DEFS.map((l, i) => (
      <LanternPost
        key={`lantern-${i}`}
        pos={l.pos}
        phase={l.phase}
        dead={l.dead}
        signatureEvent={signatureEvent}
        viewMode={viewMode}
      />
    ))}
  </>
);

// Burung hantu nemplok di pohon — quiet life signal di lorong malam.
// Body static, cuma kepala rotate slow (left-right) supaya kerasa

// sepasang titik kuning yang gerak pelan di antara pohon-pohon.
const Owl = ({ pos, headPhase = 0, signatureEvent }) => {
  const headRef = useRef();
  const eye1Ref = useRef(); // mesh ref — pakai .material untuk emissive
  const eye2Ref = useRef();
  // Rare alert event — owl tiba-tiba snap kepala 90° ke samping, hold,
  // kembali normal. Trigger interval random 60-120s per owl (phase
  // beda jadi 2 owl nggak alert bareng).
  const alertRef = useRef({
    active: false,
    t0: 0,
    next: 60 + Math.random() * 60 + headPhase * 5,
  });
  // Click "noticed" — saat user click owl, head turn ke camera + eyes
  // boost 1.8s. triggered flag di-set di click handler, useFrame
  // pickup di tick berikutnya untuk activate dgn t0 valid.
  const noticedRef = useRef({ triggered: false, active: false, t0: 0 });
  const handleClick = (e) => {
    e.stopPropagation();
    noticedRef.current.triggered = true;
  };
  useFrame((state) => {
    if (!headRef.current) return;
    const t = state.clock.elapsedTime;
    const wind = getWind(t, headPhase);
    // Default head sway
    let headAngle = Math.sin(t * 0.4 + headPhase) * 0.55;
    // Alert event override
    if (!alertRef.current.active && t > alertRef.current.next) {
      alertRef.current = { active: true, t0: t, next: 0 };
    }
    if (alertRef.current.active) {
      const dt = t - alertRef.current.t0;
      if (dt < 2.4) {
        if (dt < 0.25) headAngle = (dt / 0.25) * 1.4;
        else if (dt < 1.8) headAngle = 1.4;
        else headAngle = 1.4 - ((dt - 1.8) / 0.6) * 1.4;
      } else {
        alertRef.current = {
          active: false,
          t0: 0,
          next: t + 60 + Math.random() * 60,
        };
      }
    }
    // Pickup noticed trigger — set t0 di tick berikutnya
    if (noticedRef.current.triggered && !noticedRef.current.active) {
      noticedRef.current = { triggered: false, active: true, t0: t };
    }
    // Compute camera angle untuk head turn (used by both tracking and noticed)
    const camWorld = state.camera.position;
    const dxw = camWorld.x - pos[0];
    const dzw = camWorld.z - pos[2];
    const camAngleWorld = Math.atan2(dxw, dzw);
    if (noticedRef.current.active) {
      const dt = t - noticedRef.current.t0;
      if (dt < 1.8) {
        // Lerp head dari current ke camera angle, hold, return
        let blend = 0;
        if (dt < 0.3) blend = dt / 0.3;
        else if (dt < 1.4) blend = 1;
        else blend = (1.8 - dt) / 0.4;
        // Clamp camera angle ke range [-1.2, 1.2] supaya nggak rotate full
        const clampedAngle = Math.max(-1.2, Math.min(1.2, camAngleWorld));
        headAngle = headAngle * (1 - blend) + clampedAngle * blend;
      } else {
        noticedRef.current.active = false;
      }
    }
    headRef.current.rotation.y = headAngle;
    // Eye tracking — saat camera dekat, eyes shift toward camera.
    // Force tracking=1 saat noticed active (force eyes lock on user)
    const cam = state.camera.position;
    const dx = cam.x - pos[0];
    const dy = cam.y - pos[1];
    const dz = cam.z - pos[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    let tracking = Math.max(0, Math.min(1, (8 - dist) / 4));
    if (noticedRef.current.active) tracking = 1;
    let eyeBaseX = 0;
    let eyeBaseZ = 0.13;
    let eyeBaseY = 0.03;
    if (tracking > 0) {
      // Camera direction projected ke head local frame (XZ plane only).
      // Head Y rotation = headAngle. Inverse rotate camera direction ke
      // local space.
      const camAngleWorld = Math.atan2(dx, dz); // angle dari +z di world XZ
      const localCamAngle = camAngleWorld - headAngle;
      const shift = tracking * 0.013;
      eyeBaseX = Math.sin(localCamAngle) * shift;
      eyeBaseZ = 0.13 + Math.cos(localCamAngle) * shift * 0.4;
      eyeBaseY = 0.03 + Math.max(-0.5, Math.min(0.5, dy / Math.max(dist, 0.01))) * shift * 0.6;
    }
    if (eye1Ref.current) {
      eye1Ref.current.position.x = 0.06 + eyeBaseX;
      eye1Ref.current.position.y = eyeBaseY;
      eye1Ref.current.position.z = eyeBaseZ;
    }
    if (eye2Ref.current) {
      eye2Ref.current.position.x = -0.06 + eyeBaseX;
      eye2Ref.current.position.y = eyeBaseY;
      eye2Ref.current.position.z = eyeBaseZ;
    }
    // Mata kedip saat gust + dim juga saat alert
    const blink = Math.max(0, Math.abs(wind.gust) - 0.6) * 0.7;
    const alertBoost = alertRef.current.active ? 0.3 : 0;
    const trackBoost = tracking * 0.2;
    // Signature 'old' — owl mata blink (dim → bright cycle, "noticing")
    let sigDim = 0;
    if (signatureEvent && signatureEvent.type === 'old') {
      const dt = t - signatureEvent.time;
      if (dt > 0.2 && dt < 2.4) {
        // 2 blinks: dim sharp → bright sharp → dim → back
        const u = (dt - 0.2) / 2.2;
        const blinkCycle = Math.cos(u * Math.PI * 4);
        sigDim = blinkCycle * 0.5; // -0.5..0.5 oscillation
      }
    }
    // Noticed boost — eyes max bright saat owl aware of user
    const noticedBoost = noticedRef.current.active ? 0.8 : 0;
    const eyeIntensity = 1.1 + alertBoost + trackBoost - blink + sigDim + noticedBoost;
    if (eye1Ref.current) eye1Ref.current.material.emissiveIntensity = eyeIntensity;
    if (eye2Ref.current) eye2Ref.current.material.emissiveIntensity = eyeIntensity;
  });
  return (
    <group
      position={pos}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Body — ellipsoid coklat gelap */}
      <mesh scale={[0.18, 0.22, 0.16]}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshStandardMaterial color="#3a2818" roughness={0.85} />
      </mesh>
      {/* Head group — rotate slow */}
      <group ref={headRef} position={[0, 0.22, 0]}>
        <mesh>
          <sphereGeometry args={[0.16, 14, 12]} />
          <meshStandardMaterial color="#4a3220" roughness={0.85} />
        </mesh>
        {/* Mata — kuning emissive sebagai focal point malam. Ref di
            mesh (bukan material) supaya bisa shift posisi ke camera */}
        <mesh ref={eye1Ref} position={[0.06, 0.03, 0.13]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial
            color="#fae650"
            emissive="#fae650"
            emissiveIntensity={1.1}
          />
        </mesh>
        <mesh ref={eye2Ref} position={[-0.06, 0.03, 0.13]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial
            color="#fae650"
            emissive="#fae650"
            emissiveIntensity={1.1}
          />
        </mesh>
        {/* Pupil hitam */}
        <mesh position={[0.06, 0.03, 0.16]}>
          <sphereGeometry args={[0.018, 6, 6]} />
          <meshStandardMaterial color="#000" />
        </mesh>
        <mesh position={[-0.06, 0.03, 0.16]}>
          <sphereGeometry args={[0.018, 6, 6]} />
          <meshStandardMaterial color="#000" />
        </mesh>
        {/* Paruh */}
        <mesh position={[0, -0.03, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.022, 0.06, 4]} />
          <meshStandardMaterial color="#2a1810" roughness={0.85} />
        </mesh>
      </group>
      {/* Sayap kiri — tucked di sisi body */}
      <mesh position={[-0.15, 0, 0]} rotation={[0, 0, 0.2]} scale={[0.5, 0.8, 0.4]}>
        <sphereGeometry args={[0.13, 10, 8]} />
        <meshStandardMaterial color="#2a1e10" roughness={0.85} />
      </mesh>
      {/* Sayap kanan */}
      <mesh position={[0.15, 0, 0]} rotation={[0, 0, -0.2]} scale={[0.5, 0.8, 0.4]}>
        <sphereGeometry args={[0.13, 10, 8]} />
        <meshStandardMaterial color="#2a1e10" roughness={0.85} />
      </mesh>
      {/* Tail kecil di belakang */}
      <mesh position={[0, -0.10, -0.14]} rotation={[Math.PI / 4, 0, 0]}>
        <coneGeometry args={[0.06, 0.14, 4]} />
        <meshStandardMaterial color="#3a2818" roughness={0.85} />
      </mesh>
    </group>
  );
};

// 2 owls perched di canopy edge — y=4.0 (foliage top 3.65, owl body
// extends 0.22 down → bottom y=3.78, jelas di atas foliage). X
// offset toward path supaya owl perched di tepi foliage menghadap
// lorong, nggak ketutupan dari camera angle. 1 di pohon era debut,
// 1 di pohon era recent.
// Owls perched di foliage tops dari GardenAnchorTrees. y=4 = atas
// foliage anchor tree (1.9 + 0.55 + 0.85 = 3.3 base, * scale 1.2 ≈
// 3.96). 3 owls scattered across path biar life signal terdistribusi.
export const Owls = ({ signatureEvent }) => (
  <>
    {/* Owl di bench area tree (anchor scale 1.2) */}
    <Owl pos={[5.4, 4.0, -14.6]} headPhase={0} signatureEvent={signatureEvent} />
    {/* Owl di wind chime area tree (anchor scale 1.15) */}
    <Owl pos={[-3.4, 3.8, -7.8]} headPhase={1.2} signatureEvent={signatureEvent} />
    {/* Owl di monument frame tree (anchor scale 1.25) */}
    <Owl pos={[-4.8, 4.1, -29.5]} headPhase={2.4} signatureEvent={signatureEvent} />
  </>
);

// Siluet figur di kejauhan ujung lorong — heavily fogged, barely
// visible. Open to interpretation: bisa Eli muda berdiri menatap ke
// arah camera (ke masa depan), atau just visitor lain. Subtle breathing
// sway supaya kerasa "alive" tanpa explicit movement.
export const DistantFigure = ({ signatureEvent }) => {
  const groupRef = useRef();
  const bodyMatRef = useRef();
  const headMatRef = useRef();
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.position.y = Math.sin(t * 0.9) * 0.012;
    let glow = 0;
    if (signatureEvent) {
      const dt = t - signatureEvent.time;
      if (signatureEvent.type === 'recent' && dt > 0.4 && dt < 2.6) {
        // Recent signature: amber glow strong
        const u = (dt - 0.4) / 2.2;
        if (u < 0.2) glow = u / 0.2;
        else if (u < 0.8) glow = 1;
        else glow = (1 - u) / 0.2;
      } else if (signatureEvent.type === 'old' && dt > 0.6 && dt < 3.2) {
        // Old signature: cool blue halo subtle (figure "menjawab" present)
        const u = (dt - 0.6) / 2.6;
        if (u < 0.25) glow = u / 0.25 * 0.6;
        else if (u < 0.75) glow = 0.6;
        else glow = (1 - u) / 0.25 * 0.6;
      } else if (signatureEvent.type === 'monument' && dt > 0.3 && dt < 5.0) {
        // Monument signature: amber halo SUSTAIN — figure "diakui" oleh
        // user yang sampe ujung lorong. Lebih lama + intens dari recent.
        const u = (dt - 0.3) / 4.7;
        if (u < 0.15) glow = u / 0.15 * 1.2;
        else if (u < 0.85) glow = 1.2;
        else glow = (1 - u) / 0.15 * 1.2;
      }
    }
    if (bodyMatRef.current) {
      bodyMatRef.current.opacity = 0.75 + glow * 0.25;
      bodyMatRef.current.emissiveIntensity = glow * 1.4;
    }
    if (headMatRef.current) {
      headMatRef.current.opacity = 0.75 + glow * 0.25;
      headMatRef.current.emissiveIntensity = glow * 1.4;
    }
  });
  return (
    <group ref={groupRef} position={[0, 0, -34]}>
      {/* Body — capsule tinggi sebagai siluet */}
      <mesh position={[0, 0.65, 0]}>
        <capsuleGeometry args={[0.16, 0.7, 4, 8]} />
        <meshStandardMaterial
          ref={bodyMatRef}
          color="#0a0d18"
          emissive="#ffaa50"
          emissiveIntensity={0}
          roughness={1}
          transparent
          opacity={0.75}
        />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.32, 0]}>
        <sphereGeometry args={[0.13, 12, 10]} />
        <meshStandardMaterial
          ref={headMatRef}
          color="#0a0d18"
          emissive="#ffaa50"
          emissiveIntensity={0}
          roughness={1}
          transparent
          opacity={0.75}
        />
      </mesh>
    </group>
  );
};

// Corridor doorway — samar arch silhouette di belakang DistantFigure,
// hint visual bahwa lorong ini terhubung ke "ruangan lain" (memori
// lain). Dark silhouette dgn arched curved top + warm glow di dalamnya
// + light rays radiating + stepping stones approach + whisper text.
// Pull player ke ujung. Pose di z=-37 (di belakang figure z=-34 +
// monument z=-32).
export const CorridorDoorway = () => {
  const glowMatRef = useRef();
  const raysRef = useRef();
  const whisperRef = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Inner glow slow pulse
    if (glowMatRef.current) {
      glowMatRef.current.opacity = 0.32 + Math.sin(t * 0.6) * 0.08;
    }
    // Light rays slow rotate around arch center axis
    if (raysRef.current) {
      raysRef.current.rotation.z = t * 0.08;
    }
    // Whisper text fade in/out over 8s cycle
    if (whisperRef.current) {
      const u = (t / 8) % 1;
      let op = 0;
      if (u < 0.15) op = (u / 0.15) * 0.6;
      else if (u < 0.55) op = 0.6;
      else if (u < 0.7) op = 0.6 - ((u - 0.55) / 0.15) * 0.6;
      whisperRef.current.style.opacity = String(op);
    }
  });
  // 6 radial light rays — thin plane meshes from arch center outward,
  // slow rotation supaya kerasa "cahaya hidup" bukan static.
  const rayAngles = [0, 1, 2, 3, 4, 5].map((i) => (i / 6) * Math.PI * 2);
  // Stepping stones approaching portal — 4 stones IN FRONT of portal
  // (z positif dalam group = closer to player). World z=-37+z, so
  // z=+1.5 → world -35.5 (between StoneMonument z=-32 + DistantFigure
  // z=-34). Path visual leading INTO portal.
  const stoneDefs = [
    { z: 1.5, x: 0.15, scale: 0.9, rot: 0.3 },
    { z: 2.5, x: -0.18, scale: 0.85, rot: -0.4 },
    { z: 3.5, x: 0.1, scale: 1.0, rot: 0.6 },
    { z: 4.6, x: -0.05, scale: 0.95, rot: 1.1 },
  ];
  return (
    <group position={[0, 0, -37]}>
      {/* Pillar kiri */}
      <mesh position={[-1.55, 1.5, 0]}>
        <boxGeometry args={[0.28, 3.0, 0.28]} />
        <meshStandardMaterial color="#0a0d18" roughness={1} />
      </mesh>
      {/* Pillar kanan */}
      <mesh position={[1.55, 1.5, 0]}>
        <boxGeometry args={[0.28, 3.0, 0.28]} />
        <meshStandardMaterial color="#0a0d18" roughness={1} />
      </mesh>
      {/* Arched top — half torus dari pillar kiri ke kanan, inner
          radius 1.55 = pillar offset. thetaLength PI = setengah ring.
          Top dari arc di y=3+1.55=4.55. */}
      <mesh position={[0, 3, 0]}>
        <torusGeometry args={[1.55, 0.18, 6, 20, Math.PI]} />
        <meshStandardMaterial color="#0a0d18" roughness={1} />
      </mesh>
      {/* Keystone — small box di puncak arch sebagai detail */}
      <mesh position={[0, 4.55, 0]}>
        <boxGeometry args={[0.36, 0.3, 0.32]} />
        <meshStandardMaterial color="#0a0d18" roughness={1} />
      </mesh>
      {/* Light rays — 6 thin radiating planes dari arch center.
          Rotation slow di z-axis, kasih kesan god-rays subtle. */}
      <group ref={raysRef} position={[0, 1.7, 0.04]}>
        {rayAngles.map((a, i) => (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0]}
            rotation={[0, 0, a]}
          >
            <planeGeometry args={[4.5, 0.08]} />
            <meshBasicMaterial
              color="#ffb060"
              transparent
              opacity={0.18}
              fog
            />
          </mesh>
        ))}
      </group>
      {/* Inner glow plane — warm amber, opacity pulsing. Posisi
          tepat di tengah lorong arch. */}
      <mesh position={[0, 1.7, 0.05]}>
        <planeGeometry args={[3.0, 2.8]} />
        <meshBasicMaterial
          ref={glowMatRef}
          color="#ffaa50"
          transparent
          opacity={0.32}
          fog
        />
      </mesh>
      {/* Whisper text floating di depan portal — "lewat sini" fade
          in/out cycle. Distance 9 supaya readable saat user mendekat. */}
      <Html position={[0, 0.5, 0.6]} center distanceFactor={9} occlude={false}>
        <div
          ref={whisperRef}
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontStyle: 'italic',
            fontSize: '13px',
            color: 'rgba(255, 215, 168, 0.9)',
            letterSpacing: '0.05em',
            textShadow: '0 0 12px rgba(0,0,0,0.7), 0 0 24px rgba(255,170,80,0.3)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            opacity: 0,
          }}
        >
          lewat sini, ruangan lain menunggu
        </div>
      </Html>
      {/* Stepping stones approaching portal — flat low stones di path
          z negatif (depan arch). Visual flow ke gate. */}
      {stoneDefs.map((s, i) => (
        <mesh
          key={`step-${i}`}
          position={[s.x, 0.03, s.z]}
          rotation={[-Math.PI / 2, 0, s.rot]}
          scale={s.scale}
        >
          <circleGeometry args={[0.32, 8]} />
          <meshStandardMaterial color="#4a4d58" roughness={1} />
        </mesh>
      ))}
      {/* Subtle pointLight di mulut arch — bikin scene sekitar dapet
          warm rim dari portal. */}
      <pointLight
        position={[0, 1.7, 0.5]}
        intensity={1.4}
        color="#ffb060"
        distance={8}
        decay={2}
      />
    </group>
  );
};

// Big Tree Return Portal — replaces CorridorDoorway di ujung lorong.
// Visual: pohon besar (trunk 4m + 4 foliage clusters). Proximity hit-
// detect via useFrame: kalau camera (FPV player) masuk radius < 3.2
// dari tree base (z=-37), trigger onTrigger() sekali. Parent wire ke
// navigate('/taman/peta') = pulang ke map.
//
// Triggered guard: triggeredRef supaya gak fire repeated saat camera
// terus deket pas navigation transition jalan. Component unmount waktu
// route ganti, ref reset di mount selanjutnya — clean lifecycle.
const BIG_TREE_FOLIAGE = [
  { pos: [0, 5.2, 0], r: 2.2 },
  { pos: [1.2, 5.8, 0.4], r: 1.5 },
  { pos: [-1.1, 5.5, -0.3], r: 1.6 },
  { pos: [0.3, 6.6, -0.2], r: 1.2 },
];
export const BigTreeReturnPortal = ({
  onTrigger,
  viewMode,
  restorationLevel = 1,
}) => {
  const restored = restorationLevel >= 0.5;
  const triggeredRef = useRef(false);
  const foliageMatRefs = useRef([]);
  const TREE_POS_X = 0;
  const TREE_POS_Z = -37;
  const TRIGGER_DISTANCE = 3.2;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Subtle living pulse on foliage emissive — hanya di restored mode
    if (restored) {
      foliageMatRefs.current.forEach((mat, i) => {
        if (!mat) return;
        mat.emissiveIntensity = 0.22 + Math.sin(t * 0.6 + i * 0.5) * 0.08;
      });
    }

    if (triggeredRef.current) return;
    // Hanya trigger di FPV — orbit camera nggak pernah deket cukup
    // tapi defensive guard biar gak ada edge-case false fire.
    if (viewMode !== 'fpv') return;
    const cam = state.camera.position;
    const dx = cam.x - TREE_POS_X;
    const dz = cam.z - TREE_POS_Z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < TRIGGER_DISTANCE) {
      triggeredRef.current = true;
      onTrigger?.();
    }
  });

  return (
    <group position={[TREE_POS_X, 0, TREE_POS_Z]}>
      {/* Trunk — tall thick, taper bawah lebih lebar.
          Drought: warna lebih kering/abu */}
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.45, 0.7, 4, 12]} />
        <meshStandardMaterial
          color={restored ? '#3a2a1f' : '#4e4030'}
          roughness={0.95}
        />
      </mesh>
      {restored ? (
        <>
          {/* Foliage clusters — soft green dgn emissive warm-pale glow */}
          {BIG_TREE_FOLIAGE.map((c, i) => (
            <mesh key={`bigtree-foliage-${i}`} position={c.pos}>
              <sphereGeometry args={[c.r, 16, 12]} />
              <meshStandardMaterial
                ref={(m) => {
                  foliageMatRefs.current[i] = m;
                }}
                color="#5e8470"
                emissive="#a8d8b0"
                emissiveIntensity={0.22}
                roughness={0.85}
              />
            </mesh>
          ))}
          <pointLight
            position={[0, 5.5, 0]}
            intensity={1.6}
            color="#c8e0a8"
            distance={12}
            decay={2}
          />
        </>
      ) : (
        <>
          {/* Drought big tree — pohon raksasa mati, cabang patah, gak
              ada foliage, gak ada beacon glow. Tetap functional hit-detect. */}
          <mesh position={[1.2, 5.5, 0.3]} rotation={[0, 0, -1.1]}>
            <cylinderGeometry args={[0.08, 0.18, 2.4, 6]} />
            <meshStandardMaterial color="#2a1f15" roughness={1} />
          </mesh>
          <mesh position={[-1.1, 5.2, -0.2]} rotation={[0, 0, 1.0]}>
            <cylinderGeometry args={[0.08, 0.17, 2.2, 6]} />
            <meshStandardMaterial color="#2a1f15" roughness={1} />
          </mesh>
          <mesh position={[0.2, 6.0, -0.4]} rotation={[0.3, 0, 0.25]}>
            <cylinderGeometry args={[0.06, 0.12, 1.6, 6]} />
            <meshStandardMaterial color="#2a1f15" roughness={1} />
          </mesh>
          <mesh position={[-0.3, 6.4, 0.3]} rotation={[-0.2, 0, -0.3]}>
            <cylinderGeometry args={[0.05, 0.1, 1.4, 6]} />
            <meshStandardMaterial color="#2a1f15" roughness={1} />
          </mesh>
        </>
      )}
      <Html position={[0, 8.4, 0]} center distanceFactor={11} occlude={false}>
        <div
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontStyle: 'italic',
            color: restored ? 'rgba(220,255,200,0.85)' : 'rgba(220,200,180,0.65)',
            fontSize: '13px',
            letterSpacing: '0.05em',
            textShadow: restored
              ? '0 0 12px rgba(0,0,0,0.7), 0 0 24px rgba(200,255,180,0.3)'
              : '0 0 12px rgba(0,0,0,0.7)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {restored
            ? 'dekati pohon ini untuk pulang'
            : 'sentuh apa yang tersisa untuk pulang'}
        </div>
      </Html>
    </group>
  );
};

// Bat silhouette — V-shape gelap drifting di langit malam. 3 bat
// dengan x drift speed beda, wrap saat lewat batas. Wing flap via

const Bat = ({ def }) => {
  const groupRef = useRef();
  const wingsRef = useRef();
  const xRef = useRef(def.startX);
  useFrame((state, delta) => {
    if (!groupRef.current || !wingsRef.current) return;
    xRef.current += def.speed * delta;
    if (xRef.current > 25) xRef.current = -25;
    const t = state.clock.elapsedTime;
    groupRef.current.position.x = xRef.current;
    groupRef.current.position.y = def.y + Math.sin(t * 1.2 + def.phase) * 0.4;
    groupRef.current.position.z = def.z;
    wingsRef.current.rotation.z = Math.sin(t * 7 + def.phase) * 0.28;
  });
  return (
    <group ref={groupRef}>
      <group ref={wingsRef}>
        {/* Sayap kiri — sharper angle dari Bird */}
        <mesh rotation={[0, 0, 0.85]}>
          <coneGeometry args={[0.16, 0.42, 3]} />
          <meshStandardMaterial color="#0a0a12" roughness={1} />
        </mesh>
        {/* Sayap kanan */}
        <mesh rotation={[0, 0, -0.85]}>
          <coneGeometry args={[0.16, 0.42, 3]} />
          <meshStandardMaterial color="#0a0a12" roughness={1} />
        </mesh>
        {/* Body kecil di tengah */}
        <mesh>
          <sphereGeometry args={[0.05, 8, 6]} />
          <meshStandardMaterial color="#0a0a12" roughness={1} />
        </mesh>
      </group>
    </group>
  );
};

const BAT_DEFS = [
  { startX: -22, y: 11, z: -15, speed: 1.4, phase: 0 },
  { startX: -28, y: 13, z: -22, speed: 1.0, phase: 1.5 },
  { startX: -18, y: 9, z: -8, speed: 1.7, phase: 0.8 },
];

export const Bats = () => (
  <>
    {BAT_DEFS.map((def, i) => (
      <Bat key={`bat-${i}`} def={def} />
    ))}
  </>
);

// Kelinci di tepi lorong — ground-level cute moment. Body putih-cream
// stationary, head rotate slow alert (mirroring Owl pattern). Posisi

const Rabbit = ({ pos }) => {
  const headRef = useRef();
  useFrame((state) => {
    if (!headRef.current) return;
    const t = state.clock.elapsedTime;
    // Reactive freeze — saat camera dekat, head stop bergerak (alert/freeze).
    // Threshold 10 unit, smooth ramp dari 10..6 unit.
    const cam = state.camera.position;
    const dx = cam.x - pos[0];
    const dy = cam.y - pos[1];
    const dz = cam.z - pos[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const alertness = Math.max(0, Math.min(1, (10 - dist) / 4));
    // Normal head amplitude 0.4, alert reduces ke 0.06 (almost frozen)
    const amp = 0.4 * (1 - alertness * 0.85);
    headRef.current.rotation.y = Math.sin(t * 0.8) * amp;
  });
  return (
    <group position={pos}>
      {/* Body — ellipsoid bawah */}
      <mesh position={[0, 0.07, 0]} scale={[0.10, 0.07, 0.13]}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshStandardMaterial color="#d8c8b0" roughness={0.85} />
      </mesh>
      {/* Head group — rotate alert */}
      <group ref={headRef} position={[0.05, 0.13, 0]}>
        <mesh>
          <sphereGeometry args={[0.07, 12, 10]} />
          <meshStandardMaterial color="#e0d0b8" roughness={0.85} />
        </mesh>
        {/* Telinga kiri */}
        <mesh
          position={[0.005, 0.10, 0.03]}
          rotation={[0, 0, -0.2]}
          scale={[0.4, 1.5, 0.4]}
        >
          <capsuleGeometry args={[0.025, 0.06, 4, 6]} />
          <meshStandardMaterial color="#d8c8b0" roughness={0.85} />
        </mesh>
        {/* Telinga kanan */}
        <mesh
          position={[0.005, 0.10, -0.03]}
          rotation={[0, 0, -0.2]}
          scale={[0.4, 1.5, 0.4]}
        >
          <capsuleGeometry args={[0.025, 0.06, 4, 6]} />
          <meshStandardMaterial color="#d8c8b0" roughness={0.85} />
        </mesh>
        {/* Mata kiri & kanan */}
        <mesh position={[0.06, 0.01, 0.04]}>
          <sphereGeometry args={[0.012, 6, 6]} />
          <meshStandardMaterial color="#1a0e08" />
        </mesh>
        <mesh position={[0.06, 0.01, -0.04]}>
          <sphereGeometry args={[0.012, 6, 6]} />
          <meshStandardMaterial color="#1a0e08" />
        </mesh>
        {/* Hidung */}
        <mesh position={[0.085, -0.005, 0]}>
          <sphereGeometry args={[0.010, 6, 6]} />
          <meshStandardMaterial color="#3a1a14" />
        </mesh>
      </group>
      {/* Ekor putih bulat */}
      <mesh position={[-0.10, 0.08, 0]}>
        <sphereGeometry args={[0.025, 8, 6]} />
        <meshStandardMaterial color="#fff8ea" roughness={0.85} />
      </mesh>
    </group>
  );
};

// 1 rabbit di tepi path antar owl — z=-14 (between owl#1 z=-8.67 dan
// owl#2 z=-25.33). x=-3.2 di kiri path, menghadap +x (default — head
// di +x default). Jadi rabbit "watches" path.
// Rabbits — 4 ekor kelinci scattered di tepi path, ground-level
// cute moment. Position di sisi path yang gak overlap dengan tree
// foliage atau lentera.
export const Rabbits = () => (
  <>
    <Rabbit pos={[-3.2, 0, -14]} />
    <Rabbit pos={[3.0, 0, -8]} />
    <Rabbit pos={[-2.8, 0, -25]} />
    <Rabbit pos={[2.7, 0, -3.5]} />
  </>
);



// Stone monument di end-of-path z=-32 — tujuan emosional saat user
// jalan sampai ujung lorong di FPV. Engraving puitis. DistantFigure
// (z=-34) berdiri SETELAH monument — viewer baca monument dulu, lalu

export const StoneMonument = ({ onClick }) => (
  <group
    position={[0, 0, -32]}
    onClick={(e) => {
      e.stopPropagation();
      onClick?.();
    }}
    onPointerOver={(e) => {
      e.stopPropagation();
      document.body.style.cursor = 'pointer';
    }}
    onPointerOut={(e) => {
      e.stopPropagation();
      document.body.style.cursor = 'auto';
    }}
  >
    {/* Base block — wider stone foundation */}
    <mesh position={[0, 0.2, 0]} castShadow>
      <boxGeometry args={[1.5, 0.4, 0.6]} />
      <meshStandardMaterial color="#3a3530" roughness={0.95} />
    </mesh>
    {/* Vertical slab (main body) */}
    <mesh position={[0, 1.2, 0]} castShadow>
      <boxGeometry args={[1.0, 1.6, 0.18]} />
      <meshStandardMaterial color="#4a4540" roughness={0.92} />
    </mesh>
    {/* Curved arch top — half cylinder */}
    <mesh position={[0, 2.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.5, 0.5, 0.18, 16, 1, false, 0, Math.PI]} />
      <meshStandardMaterial color="#4a4540" roughness={0.92} />
    </mesh>
    {/* Engraving Html — text terukir di slab */}
    <Html
      position={[0, 1.4, 0.10]}
      center
      distanceFactor={5.5}
      occlude={false}
      transform
      rotation={[0, 0, 0]}
    >
      <div
        className="text-center pointer-events-none select-none whitespace-nowrap"
        style={{
          fontFamily: '"Fraunces Variable", serif',
          fontStyle: 'italic',
          fontSize: '11px',
          color: '#1a0d05',
          fontWeight: 500,
          lineHeight: '1.4',
          letterSpacing: '0.04em',
          textShadow: '0 0 1px rgba(180, 150, 100, 0.3)',
        }}
      >
        Untuk yang menunggu
        <br />
        di ujung lorong
      </div>
    </Html>
    {/* Subtle moss growth at base — small dark green patches */}
    <mesh position={[-0.5, 0.42, 0.28]} rotation={[-Math.PI / 2, 0, 0.4]}>
      <planeGeometry args={[0.18, 0.12]} />
      <meshStandardMaterial color="#2a3a20" roughness={1} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0.45, 0.42, 0.28]} rotation={[-Math.PI / 2, 0, -0.5]}>
      <planeGeometry args={[0.16, 0.10]} />
      <meshStandardMaterial color="#2a3a20" roughness={1} side={THREE.DoubleSide} />
    </mesh>
  </group>
);

// Bangku kayu tua — weathered, di-side path antara owl dan rabbit
// (z=-15 right side, opposite rabbit di kiri). Dengan 2 daun gugur

export const OldBench = ({ onClick }) => (
  <group
    position={[3.0, 0, -15]}
    rotation={[0, -Math.PI / 2.4, 0]}
    onClick={(e) => {
      e.stopPropagation();
      onClick?.();
    }}
    onPointerOver={(e) => {
      e.stopPropagation();
      document.body.style.cursor = 'pointer';
    }}
    onPointerOut={(e) => {
      e.stopPropagation();
      document.body.style.cursor = 'auto';
    }}
  >
    {/* Seat plank */}
    <mesh position={[0, 0.4, 0]} castShadow>
      <boxGeometry args={[1.4, 0.05, 0.36]} />
      <meshStandardMaterial color="#3a2818" roughness={0.95} />
    </mesh>
    {/* Backrest */}
    <mesh position={[0, 0.66, -0.16]} castShadow>
      <boxGeometry args={[1.4, 0.45, 0.05]} />
      <meshStandardMaterial color="#3a2818" roughness={0.95} />
    </mesh>
    {/* Legs kiri-kanan */}
    <mesh position={[-0.55, 0.2, 0]}>
      <boxGeometry args={[0.07, 0.4, 0.28]} />
      <meshStandardMaterial color="#2a1d10" roughness={1} />
    </mesh>
    <mesh position={[0.55, 0.2, 0]}>
      <boxGeometry args={[0.07, 0.4, 0.28]} />
      <meshStandardMaterial color="#2a1d10" roughness={1} />
    </mesh>
    {/* Sandaran tangan */}
    <mesh position={[-0.68, 0.5, 0]}>
      <boxGeometry args={[0.07, 0.22, 0.36]} />
      <meshStandardMaterial color="#2a1d10" roughness={1} />
    </mesh>
    <mesh position={[0.68, 0.5, 0]}>
      <boxGeometry args={[0.07, 0.22, 0.36]} />
      <meshStandardMaterial color="#2a1d10" roughness={1} />
    </mesh>
    {/* Daun gugur di seat — kerasa "udah lama nggak diduduki" */}
    <mesh position={[-0.3, 0.43, 0.05]} rotation={[-Math.PI / 2, 0, 0.3]}>
      <planeGeometry args={[0.14, 0.10]} />
      <meshStandardMaterial
        color="#7a4828"
        transparent
        opacity={0.85}
        side={THREE.DoubleSide}
      />
    </mesh>
    <mesh position={[0.4, 0.43, -0.08]} rotation={[-Math.PI / 2, 0, -0.5]}>
      <planeGeometry args={[0.16, 0.12]} />
      <meshStandardMaterial
        color="#a06430"
        transparent
        opacity={0.85}
        side={THREE.DoubleSide}
      />
    </mesh>
  </group>
);

// Ayunan pohon — branch horizontal dari foliage tree[5] (z≈-18.67,
// x=2.6) cantilever toward path. Swing assembly hanging dari branch
// tip dengan 2 rope + plank seat. Pendulum motion sync dengan wind

export const TreeSwing = ({ activeRef, onClick }) => {
  const swingRef = useRef();
  const windPhase = -18.67 * 0.13 + 1.0;
  useFrame((state) => {
    if (!swingRef.current) return;
    const t = state.clock.elapsedTime;
    const wind = getWind(t, windPhase);
    // Decay 0→1→0 over 3s setelah click. Boost amplitudo + frequency
    // supaya kerasa "didorong" — physics fakery.
    const dt = t - (activeRef?.current ?? -Infinity);
    let boost = 0;
    let pushFreq = 0;
    if (dt >= 0 && dt < 3) {
      const u = dt / 3;
      // Initial spike yang decay exponential
      boost = (1 - u) * Math.exp(-u * 1.2);
      // Sinusoidal push at ~0.7 Hz (natural pendulum cadence)
      pushFreq = Math.sin(dt * 4.4) * boost * 0.6;
    }
    // Pendulum forward-back (rotation X) + idle drift + push
    swingRef.current.rotation.x =
      wind.total * 0.12 + Math.sin(t * 0.6) * 0.04 + pushFreq;
  });
  const handleClick = (e) => {
    e.stopPropagation();
    onClick?.();
  };
  const handleOver = (e) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };
  const handleOut = (e) => {
    e.stopPropagation();
    document.body.style.cursor = 'auto';
  };
  return (
    <>
      {/* Branch horizontal di foliage tree[5] (y=2.7 = foliage center) */}
      <mesh position={[1.95, 2.7, -18.67]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.07, 1.3, 6]} />
        <meshStandardMaterial color="#3a2818" roughness={1} />
      </mesh>
      {/* Swing pivot di tip cabang (1.3, 2.7, -18.67), rope 2.1 ke plank */}
      <group position={[1.3, 2.7, -18.67]}>
        <group
          ref={swingRef}
          onClick={handleClick}
          onPointerOver={handleOver}
          onPointerOut={handleOut}
        >
          {/* 2 rope hanging — 2.1 panjang */}
          <mesh position={[-0.16, -1.05, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 2.1, 6]} />
            <meshStandardMaterial color="#5a4530" roughness={1} />
          </mesh>
          <mesh position={[0.16, -1.05, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 2.1, 6]} />
            <meshStandardMaterial color="#5a4530" roughness={1} />
          </mesh>
          {/* Plank seat — di y=0.6 world (rest level) */}
          <mesh position={[0, -2.12, 0]} castShadow>
            <boxGeometry args={[0.42, 0.04, 0.15]} />
            <meshStandardMaterial color="#4a3220" roughness={0.9} />
          </mesh>
        </group>
      </group>
    </>
  );
};

// Wind chime — branch dari tree[2] (z≈-8.67, x=-2.6) cantilever
// toward path. Chime assembly: top wood disc + 5 metal tubes hang dari
// strings + center clapper sphere. Group sway via rotation Z+X dari

const CHIME_TUBE_LENGTHS = [0.30, 0.25, 0.32, 0.27, 0.28];
const CHIME_TUBE_X = [-0.06, -0.03, 0, 0.03, 0.06];

export const WindChime = ({ activeRef, onClick }) => {
  const groupRef = useRef();
  const windPhase = -8.67 * 0.13 + 2.0;
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const wind = getWind(t, windPhase);
    // Click boost — quick wobble decay over ~2s
    const dt = t - (activeRef?.current ?? -Infinity);
    let boostZ = 0;
    let boostX = 0;
    if (dt >= 0 && dt < 2) {
      const u = dt / 2;
      const env = Math.exp(-u * 2.2);
      boostZ = Math.sin(dt * 8.0) * env * 0.18;
      boostX = Math.sin(dt * 11.5) * env * 0.10;
    }
    // Sway 2 axis — chime swings sideways (Z) lebih dominant, slight forward (X)
    groupRef.current.rotation.z = wind.total * 0.08 + boostZ;
    groupRef.current.rotation.x = wind.sway * 0.04 + boostX;
  });
  const handleClick = (e) => {
    e.stopPropagation();
    onClick?.();
  };
  const handleOver = (e) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };
  const handleOut = (e) => {
    e.stopPropagation();
    document.body.style.cursor = 'auto';
  };
  return (
    <>
      {/* Branch horizontal di foliage tree[2] (y=2.85 sedikit upper foliage) */}
      <mesh position={[-1.95, 2.85, -8.67]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.06, 1.0, 6]} />
        <meshStandardMaterial color="#3a2818" roughness={1} />
      </mesh>
      {/* Chime pivot di tip cabang (-1.45, 2.85, -8.67) */}
      <group position={[-1.45, 2.85, -8.67]}>
        <group
          ref={groupRef}
          onClick={handleClick}
          onPointerOver={handleOver}
          onPointerOut={handleOut}
        >
          {/* String dari branch ke top disc */}
          <mesh position={[0, -0.18, 0]}>
            <cylinderGeometry args={[0.005, 0.005, 0.3, 4]} />
            <meshStandardMaterial color="#5a4530" roughness={1} />
          </mesh>
          {/* Top wooden disc */}
          <mesh position={[0, -0.36, 0]}>
            <cylinderGeometry args={[0.10, 0.10, 0.025, 12]} />
            <meshStandardMaterial color="#3a2818" roughness={0.9} />
          </mesh>
          {/* 5 chime tubes — metal silver sedikit emissive */}
          {CHIME_TUBE_X.map((dx, i) => {
            const len = CHIME_TUBE_LENGTHS[i];
            return (
              <group key={`tube-${i}`}>
                {/* String tube ke disc */}
                <mesh position={[dx, -0.45, 0]}>
                  <cylinderGeometry args={[0.003, 0.003, 0.15, 4]} />
                  <meshStandardMaterial color="#5a4530" roughness={1} />
                </mesh>
                {/* Metal tube */}
                <mesh position={[dx, -0.55 - len / 2, 0]}>
                  <cylinderGeometry args={[0.013, 0.013, len, 8]} />
                  <meshStandardMaterial
                    color="#bcbcad"
                    roughness={0.35}
                    metalness={0.7}
                    emissive="#bcbcad"
                    emissiveIntensity={0.08}
                  />
                </mesh>
              </group>
            );
          })}
          {/* Center clapper — kecil bulat di antara tubes */}
          <mesh position={[0, -0.78, 0.04]}>
            <sphereGeometry args={[0.025, 8, 6]} />
            <meshStandardMaterial color="#5a4530" roughness={0.9} />
          </mesh>
        </group>
      </group>
    </>
  );
};

// Detect saat user FPV mendekati monument (z < -27.5). Auto-trigger
// monument signature event sekali per session — supaya "perjalanan"
// dapat ending moment yang earned, bukan harus klik manual. triggered
// ref-only (no rerender) supaya gak loop.
export const MonumentProximity = ({ viewMode, onTrigger }) => {
  const triggered = useRef(false);
  useFrame((state) => {
    if (viewMode !== 'fpv') return;
    if (triggered.current) return;
    if (state.camera.position.z < -27.5) {
      triggered.current = true;
      onTrigger?.();
    }
  });
  // Reset triggered flag saat user balik ke orbit (biar kalau masuk
  // FPV lagi & dekati monument lagi, dapat moment-nya lagi)
  useEffect(() => {
    if (viewMode === 'orbit') triggered.current = false;
  }, [viewMode]);
  return null;
};

