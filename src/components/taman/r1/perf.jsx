/**
 * Perf monitor — opt-in via `?perf=1` URL param. Logs FPS rolling
 * average + warns saat drops di console + shows simple HUD.
 *
 * Cara pake (mobile):
 * 1. Buka URL `https://...path/r1?perf=1`
 * 2. HUD muncul top-right, nampilin avg FPS rolling 60 frames
 * 3. Warna: hijau >55fps, kuning 40-55fps, oranye 25-40fps, merah <25
 * 4. Console log warning kalau drop di bawah 45fps untuk window lebih
 *    dari 30 frames (sustained slow)
 *
 * Test scenarios untuk profile:
 * - Scene initial load + auto-rotate idle (ambient cost)
 * - Manual drag/pan kencang (interaction cost)
 * - Click bintang → modal open (modal mount cost)
 * - FPV mode jalan WASD/joystick (SkyGroup follow + FPV cost)
 * - Era spotlight chip click (highlight pulse cost)
 * - FlyingLeavesGust active (rare event, watch saat gust trigger)
 */

import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';

export const isPerfEnabled = () => {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('perf') === '1';
  } catch {
    return false;
  }
};

// Canvas-side FPS sampler — rolling avg 60 frames, exposed via ref
// untuk DOM HUD di parent.
export const PerfSampler = ({ statsRef }) => {
  const samplesRef = useRef([]);
  const lastTimeRef = useRef(-1);
  const sustainedSlowRef = useRef(0);
  useFrame((state) => {
    const now = state.clock.elapsedTime;
    if (lastTimeRef.current >= 0) {
      const dt = now - lastTimeRef.current;
      if (dt > 0) {
        samplesRef.current.push(dt);
        if (samplesRef.current.length > 60) samplesRef.current.shift();
        // Compute avg
        const avgDt =
          samplesRef.current.reduce((a, b) => a + b, 0) /
          samplesRef.current.length;
        const fps = avgDt > 0 ? 1 / avgDt : 0;
        statsRef.current = fps;
        // Sustained slow detection
        if (fps < 45) {
          sustainedSlowRef.current++;
          if (sustainedSlowRef.current === 30) {
            // First time hitting 30 slow frames in a row
            // eslint-disable-next-line no-console
            console.warn(
              `[r1 perf] sustained <45fps for 30+ frames (current avg: ${fps.toFixed(1)}fps)`,
            );
          }
        } else {
          sustainedSlowRef.current = 0;
        }
      }
    }
    lastTimeRef.current = now;
  });
  return null;
};

// DOM HUD — read FPS from ref tiap 200ms via setInterval, render
// color-coded number. Lebih readable di mobile dari drei <Stats>.
export const PerfHUD = ({ statsRef }) => {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    const int = setInterval(() => {
      setFps(statsRef.current ?? 0);
    }, 200);
    return () => clearInterval(int);
  }, [statsRef]);
  let color = 'rgba(180,255,180,0.95)';
  if (fps < 25) color = 'rgba(255,120,100,0.95)';
  else if (fps < 40) color = 'rgba(255,180,100,0.95)';
  else if (fps < 55) color = 'rgba(255,235,140,0.95)';
  return (
    <div
      className="pointer-events-none absolute z-40"
      style={{
        top: '50%',
        right: '12px',
        transform: 'translateY(-50%)',
        background: 'rgba(10,13,24,0.85)',
        borderRadius: '8px',
        padding: '10px 14px',
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(255,255,255,0.12)',
        fontFamily: 'monospace',
        fontVariantNumeric: 'tabular-nums',
        textAlign: 'center',
        minWidth: '70px',
      }}
    >
      <div
        style={{
          fontSize: '10px',
          color: 'rgba(255,255,255,0.5)',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          marginBottom: '2px',
        }}
      >
        FPS
      </div>
      <div
        style={{
          fontSize: '24px',
          fontWeight: 700,
          color,
          lineHeight: 1,
        }}
      >
        {fps.toFixed(0)}
      </div>
    </div>
  );
};
