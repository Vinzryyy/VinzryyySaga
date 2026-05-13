/**
 * AmbientAudio — tombol toggle on/off untuk audio ArmeniacaTown.
 *
 * Asalnya generator suara latar prosedural via Web Audio API (drone /
 * crickets / wind / paper rustle per profil halaman). Sekarang sekadar
 * UI toggle — produksi audio dialihkan ke TownMusic (scoring-music-1.mp3
 * global lintas /armeniacaTown/*).
 *
 * State on/off di-persist via townAudioBus → localStorage key
 * 'taman-audio-enabled'. TownMusic subscribe ke bus yang sama, jadi
 * satu klik tombol kontrol song global. r1/utils.js (WindChime SFX
 * one-shot) juga baca key yang sama.
 *
 * UX constraints:
 * - Browser autoplay policy: TownMusic baru bisa start setelah user
 *   gesture (klik tombol ini). Saat localStorage '1' tapi session baru,
 *   indikator 'pending' kasih tau user harus klik sekali lagi tiap
 *   session untuk re-engage.
 */

import React, { useState } from 'react';
import { readEnabled as readStored, writeEnabled as writeStored } from '../../lib/townAudioBus';

const SoundOnIcon = () => (
  <svg
    width="16"
    height="16"
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
    width="16"
    height="16"
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
  const [enabled, setEnabled] = useState(false);
  // Pending: localStorage udah '1' dari session sebelumnya, tapi state
  // ini selalu start false (browser autoplay policy — perlu klik baru
  // di session ini). Indikator beda label biar user paham harus klik.
  const [pendingEnable] = useState(() => readStored());

  const handleToggle = () => {
    const next = !enabled;
    setEnabled(next);
    writeStored(next);
  };

  const positionClass =
    position === 'top-right'
      ? 'top-5 right-20'
      : position === 'bottom-right'
        ? 'bottom-5 right-5'
        : 'bottom-5 left-5';

  const label = enabled
    ? 'Matikan suara taman'
    : pendingEnable
      ? 'Klik untuk nyalakan suara taman'
      : 'Nyalakan suara taman';

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`pointer-events-auto absolute ${positionClass} z-20 w-9 h-9 rounded-full border border-white/20 bg-black/30 backdrop-blur-sm hover:bg-white/10 transition flex items-center justify-center text-white/70`}
      aria-label={label}
      title={label}
    >
      {enabled ? <SoundOnIcon /> : <SoundOffIcon />}
    </button>
  );
};

export default AmbientAudio;
