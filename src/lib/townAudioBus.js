/**
 * townAudioBus — single source of truth untuk on/off + volume state
 * audio ArmeniacaTown.
 *
 * Dua state independen:
 * - enabled (bool): user mau music play atau gak. Default true (auto-ON).
 *   User cuma matiin manual kalau geser slider ke 0 atau klik mute.
 * - volume (0..1): gain target saat enabled. Default 0.5. Slider UI di
 *   AmbientAudio.
 *
 * Kenapa butuh bus:
 * - AmbientAudio (per-halaman UI) dan TownMusic (global mount sekali di
 *   AppShell) hidup di komponen berbeda. Mereka sync via bus + localStorage.
 * - localStorage `storage` event cuma fire di TAB LAIN. Bus dispatch custom
 *   event buat sync same-tab.
 *
 * Storage keys legacy: `taman-audio-enabled` dipertahanin dari era
 * pre-rebrand /taman → /armeniacaTown supaya preference lama nggak reset.
 */

const KEY_ENABLED = 'taman-audio-enabled';
const KEY_VOLUME = 'taman-audio-volume';
const EVENT = 'taman-audio-changed';

const DEFAULT_VOLUME = 0.5;

export const readEnabled = () => {
  try {
    const raw = localStorage.getItem(KEY_ENABLED);
    // Default true (auto-ON) — kalau user belum pernah set, anggap mau on.
    // Yang explicit set '0' aja yg di-treat off.
    return raw !== '0';
  } catch {
    return true;
  }
};

export const writeEnabled = (v) => {
  try {
    localStorage.setItem(KEY_ENABLED, v ? '1' : '0');
  } catch {
    /* storage blocked — no-op */
  }
  try {
    window.dispatchEvent(
      new CustomEvent(EVENT, { detail: { enabled: v, volume: readVolume() } })
    );
  } catch {
    /* SSR / window absent — no-op */
  }
};

export const readVolume = () => {
  try {
    const raw = localStorage.getItem(KEY_VOLUME);
    if (raw === null) return DEFAULT_VOLUME;
    const n = parseFloat(raw);
    if (Number.isNaN(n)) return DEFAULT_VOLUME;
    return Math.max(0, Math.min(1, n));
  } catch {
    return DEFAULT_VOLUME;
  }
};

export const writeVolume = (v) => {
  const clamped = Math.max(0, Math.min(1, v));
  try {
    localStorage.setItem(KEY_VOLUME, String(clamped));
  } catch {
    /* storage blocked — no-op */
  }
  try {
    window.dispatchEvent(
      new CustomEvent(EVENT, {
        detail: { enabled: readEnabled(), volume: clamped },
      })
    );
  } catch {
    /* SSR / window absent — no-op */
  }
};

export const subscribeEnabled = (cb) => {
  const onCustom = (e) => cb(!!e.detail?.enabled);
  const onStorage = (e) => {
    if (e.key === KEY_ENABLED) cb(e.newValue !== '0');
  };
  window.addEventListener(EVENT, onCustom);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, onCustom);
    window.removeEventListener('storage', onStorage);
  };
};

export const subscribeVolume = (cb) => {
  const onCustom = (e) => {
    const v = e.detail?.volume;
    if (typeof v === 'number') cb(v);
  };
  const onStorage = (e) => {
    if (e.key === KEY_VOLUME) {
      const n = parseFloat(e.newValue);
      if (!Number.isNaN(n)) cb(Math.max(0, Math.min(1, n)));
    }
  };
  window.addEventListener(EVENT, onCustom);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, onCustom);
    window.removeEventListener('storage', onStorage);
  };
};
