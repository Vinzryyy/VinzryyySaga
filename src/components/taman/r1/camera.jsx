/**
 * Camera controls untuk Konstelasi Perjalanan.
 *
 * - CAMERA_TARGETS: orbit + fpv preset (pos + look)
 * - CinematicIntro: 3.5s lerp overhead → orbit dgn cubic ease-out
 * - CameraSync: lerp camera ke CAMERA_TARGETS[viewMode] saat
 *   transitioning (toggle orbit↔fpv)
 * - FPVMovement: WASD desktop + look bebas via PointerLockControls
 *   (di parent), Y locked 1.6 dgn head bob
 * - MobileFPVMovement: joystickRef.x/y untuk gerak, lookRef.yaw/pitch
 *   untuk look. Camera rotation order YXZ untuk proper FPS feel.
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

export const CAMERA_TARGETS = {
  // Orbit: camera dekat target [0,5,-10]. Position y=4 (sedikit
  // di bawah target y=5) supaya initial polar ~1.68 within
  // maxPolar 1.75 limit (gak ada snap saat first render).
  orbit: { pos: new THREE.Vector3(4, 4, -2), look: new THREE.Vector3(0, 5, -10) },
  // FPV "tatap langit": user di tengah path, eye level, look default
  // ke atas-depan tapi bisa pan bebas via mouse/touch.
  fpv: { pos: new THREE.Vector3(0, 1.7, -8), look: new THREE.Vector3(0, 7, -14) },
};

// Cinematic intro — camera arc dari overhead high-angle ke default
// orbit position selama ~3.5s saat first visit. Bikin entrance terasa
// "dunia perlahan terbuka" — start lihat ke bawah dari atas, lerp ke
// eye-level orbit. Cubic ease-out: cepat awal, slow di akhir untuk
// settle smooth.
const INTRO_DURATION = 3.5;
const INTRO_START_POS = new THREE.Vector3(0, 13, 4);
const INTRO_END_POS = CAMERA_TARGETS.orbit.pos.clone();
const INTRO_LOOK = CAMERA_TARGETS.orbit.look.clone();

export const CinematicIntro = ({ active, onComplete }) => {
  const { camera } = useThree();
  const startTimeRef = useRef(-1);
  const completedRef = useRef(false);
  useEffect(() => {
    if (!active) return;
    // Pre-position camera ke start sebelum first frame supaya gak
    // ada jump dari default Canvas position ke INTRO_START.
    camera.position.copy(INTRO_START_POS);
    camera.lookAt(INTRO_LOOK);
    startTimeRef.current = -1;
    completedRef.current = false;
  }, [active, camera]);
  useFrame((state) => {
    if (!active || completedRef.current) return;
    const t = state.clock.elapsedTime;
    if (startTimeRef.current < 0) startTimeRef.current = t;
    const elapsed = t - startTimeRef.current;
    const progress = Math.min(1, elapsed / INTRO_DURATION);
    const eased = 1 - Math.pow(1 - progress, 3);
    camera.position.lerpVectors(INTRO_START_POS, INTRO_END_POS, eased);
    camera.lookAt(INTRO_LOOK);
    if (progress >= 1 && !completedRef.current) {
      completedRef.current = true;
      onComplete?.();
    }
  });
  return null;
};

export const CameraSync = ({ viewMode, transitioning }) => {
  const { camera } = useThree();
  // Idle FOV breathing — subtle zoom in/out ±0.5 deg saat orbit mode.
  // Modulate FOV bukan position supaya gak fight dgn OrbitControls
  // (controls compute spherical dari camera.position; modify Y akan
  // persist as new spherical state = drift). FOV gak diatur controls.
  const idleBaseFovRef = useRef(null);
  useFrame((state, delta) => {
    if (transitioning) {
      const target = CAMERA_TARGETS[viewMode] || CAMERA_TARGETS.orbit;
      const factor = Math.min(delta * 4.5, 1);
      camera.position.lerp(target.pos, factor);
      camera.lookAt(target.look);
      idleBaseFovRef.current = null;
      return;
    }
    if (viewMode !== 'orbit') return;
    if (idleBaseFovRef.current === null) {
      idleBaseFovRef.current = camera.fov;
    }
    const t = state.clock.elapsedTime;
    const breath = Math.sin(t * 0.16) * 0.5;
    camera.fov = idleBaseFovRef.current + breath;
    camera.updateProjectionMatrix();
  });
  return null;
};

const FPV_FORWARD = new THREE.Vector3();
const FPV_RIGHT = new THREE.Vector3();

// Mobile FPV — gerakan via joystickRef (left thumb), look via lookRef
// (right swipe). Camera rotation order YXZ supaya pitch+yaw composition
// behave like proper FPS camera.
export const MobileFPVMovement = ({ joystickRef, lookRef }) => {
  const { camera } = useThree();
  useEffect(() => {
    camera.rotation.order = 'YXZ';
  }, [camera]);
  useFrame((state, delta) => {
    camera.rotation.y = lookRef.current.yaw;
    camera.rotation.x = lookRef.current.pitch;
    camera.rotation.z = 0;
    const speed = 3.0 * delta;
    camera.getWorldDirection(FPV_FORWARD);
    FPV_FORWARD.y = 0;
    FPV_FORWARD.normalize();
    FPV_RIGHT.crossVectors(FPV_FORWARD, camera.up).normalize();
    const jx = joystickRef.current.x;
    const jy = joystickRef.current.y;
    if (jy !== 0) camera.position.addScaledVector(FPV_FORWARD, jy * speed);
    if (jx !== 0) camera.position.addScaledVector(FPV_RIGHT, jx * speed);
    // Endless walk: x clamp tetap (gak kabur ke sisi taman),
    // z bebas — SideTrees + Lanterns wrap di sekitar user.
    camera.position.x = Math.max(-5.5, Math.min(5.5, camera.position.x));
    const moving = jx !== 0 || jy !== 0;
    const t = state.clock.elapsedTime;
    const bobAmp = moving ? 0.025 : 0.012;
    const bobFreq = moving ? 2.4 : 1.2;
    camera.position.y = 1.6 + Math.sin(t * bobFreq) * bobAmp;
  });
  return null;
};

// Desktop FPV — listen WASD/arrow keys, update camera.position per
// frame. Y locked di 1.6 (eye level), x clamped, z bebas (endless).
export const FPVMovement = ({ enabled }) => {
  const { camera } = useThree();
  const keysRef = useRef({ w: false, a: false, s: false, d: false });

  useEffect(() => {
    if (!enabled) return undefined;
    const setKey = (e, value) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') keysRef.current.w = value;
      else if (k === 's' || k === 'arrowdown') keysRef.current.s = value;
      else if (k === 'a' || k === 'arrowleft') keysRef.current.a = value;
      else if (k === 'd' || k === 'arrowright') keysRef.current.d = value;
    };
    const onDown = (e) => setKey(e, true);
    const onUp = (e) => setKey(e, false);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      keysRef.current = { w: false, a: false, s: false, d: false };
    };
  }, [enabled]);

  useFrame((state, delta) => {
    if (!enabled) return;
    const speed = 3.5 * delta;
    camera.getWorldDirection(FPV_FORWARD);
    FPV_FORWARD.y = 0;
    FPV_FORWARD.normalize();
    FPV_RIGHT.crossVectors(FPV_FORWARD, camera.up).normalize();
    const moving =
      keysRef.current.w ||
      keysRef.current.s ||
      keysRef.current.a ||
      keysRef.current.d;
    if (keysRef.current.w) camera.position.addScaledVector(FPV_FORWARD, speed);
    if (keysRef.current.s) camera.position.addScaledVector(FPV_FORWARD, -speed);
    if (keysRef.current.a) camera.position.addScaledVector(FPV_RIGHT, -speed);
    if (keysRef.current.d) camera.position.addScaledVector(FPV_RIGHT, speed);
    camera.position.x = Math.max(-5.5, Math.min(5.5, camera.position.x));
    // Camera Y breathing: idle = subtle 1.6 ± 0.012, walking = sedikit
    // lebih besar (head bob ritmis ngikut langkah).
    const t = state.clock.elapsedTime;
    const bobAmp = moving ? 0.025 : 0.012;
    const bobFreq = moving ? 2.4 : 1.2;
    camera.position.y = 1.6 + Math.sin(t * bobFreq) * bobAmp;
  });
  return null;
};
