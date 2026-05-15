/**
 * AmbientAudio — UI control untuk audio ArmeniacaTown.
 *
 * Sekarang punya 2 control: mute icon button (toggle enabled) + volume
 * slider (0-100). State persisted via townAudioBus → localStorage.
 * TownMusic (global di AppShell) subscribe ke bus yang sama.
 *
 * Default state: enabled=true (auto-ON), volume=0.25. User cuma butuh
 * geser slider atau klik mute manual kalau mau matiin. First user
 * gesture di page (click di mana aja) bakal trigger TownMusic.play()
 * walaupun gak klik button ini — handle autoplay-blocked browser case.
 *
 * Click mute icon ↔ toggle enabled (gain ke 0 kalau muted, balik ke
 * volume slider value kalau unmuted). Slider value 0 ≠ muted (enabled
 * tetep true, gain 0). Mute = explicit kill switch.
 */

import React, { useEffect, useState } from 'react';
import {
  readEnabled,
  writeEnabled,
  readVolume,
  writeVolume,
  subscribeEnabled,
  subscribeVolume,
} from '../../lib/townAudioBus';

const SoundOnIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

const SoundOffIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);

const AmbientAudio = ({ position = 'top-right' }) => {
  const [enabled, setEnabled] = useState(() => readEnabled());
  const [volume, setVolume] = useState(() => readVolume());

  // Sync cross-tab + cross-component (kalau ada AmbientAudio lain).
  useEffect(() => {
    const unsubE = subscribeEnabled(setEnabled);
    const unsubV = subscribeVolume(setVolume);
    return () => {
      unsubE();
      unsubV();
    };
  }, []);

  const handleToggle = () => {
    const next = !enabled;
    setEnabled(next);
    writeEnabled(next);
  };

  const handleVolumeChange = (e) => {
    const v = parseFloat(e.target.value) / 100;
    setVolume(v);
    writeVolume(v);
    // Geser slider dari 0 ke >0 saat muted → auto-unmute, friendly UX.
    if (!enabled && v > 0) {
      setEnabled(true);
      writeEnabled(true);
    }
  };

  const positionClass =
    position === 'top-right'
      ? 'top-5 right-20'
      : position === 'bottom-right'
        ? 'bottom-5 right-5'
        : 'bottom-5 left-5';

  const muted = !enabled || volume === 0;

  return (
    <div
      className={`pointer-events-auto absolute ${positionClass} z-20 flex items-center gap-2 h-9 px-3 rounded-full border border-white/20 bg-black/30 backdrop-blur-sm text-white/70`}
    >
      <button
        type="button"
        onClick={handleToggle}
        aria-label={muted ? 'Nyalakan suara' : 'Matikan suara'}
        title={muted ? 'Nyalakan suara' : 'Matikan suara'}
        className="flex items-center justify-center hover:text-white transition"
      >
        {muted ? <SoundOffIcon /> : <SoundOnIcon />}
      </button>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        value={Math.round((enabled ? volume : 0) * 100)}
        onChange={handleVolumeChange}
        aria-label="Volume suara taman"
        className="taman-volume-slider w-20 h-1 appearance-none bg-white/15 rounded-full outline-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.7) ${
            Math.round((enabled ? volume : 0) * 100)
          }%, rgba(255,255,255,0.15) ${
            Math.round((enabled ? volume : 0) * 100)
          }%, rgba(255,255,255,0.15) 100%)`,
        }}
      />
      <style>{`
        .taman-volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
          cursor: pointer;
          border: none;
        }
        .taman-volume-slider::-moz-range-thumb {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
};

export default AmbientAudio;
