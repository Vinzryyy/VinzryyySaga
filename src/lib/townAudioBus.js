/**
 * townAudioBus — single source of truth untuk on/off state audio
 * ArmeniacaTown (ambient procedural + main song).
 *
 * Kenapa butuh bus:
 * - AmbientAudio button (per-halaman) dan TownMusic (global, mount sekali
 *   di AppShell) hidup di komponen berbeda dan nggak punya parent/child
 *   relationship. Mereka harus sync ke flag yang sama.
 * - localStorage `storage` event cuma fire di TAB LAIN (cross-tab), nggak
 *   di tab yang nulis. Jadi bus ini juga dispatch custom event untuk
 *   sync same-tab.
 *
 * Storage key `taman-audio-enabled` deliberately reused — legacy nama
 * dari era pre-rebrand /taman → /armeniacaTown. Mempertahankan key biar
 * preference user yg udah enable sebelumnya nggak ke-reset.
 */

const KEY = 'taman-audio-enabled';
const EVENT = 'taman-audio-changed';

export const readEnabled = () => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

export const writeEnabled = (v) => {
  try {
    localStorage.setItem(KEY, v ? '1' : '0');
  } catch {
    /* storage blocked — no-op */
  }
  // Same-tab broadcast — storage event only fires in OTHER tabs.
  try {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { enabled: v } }));
  } catch {
    /* SSR / window absent — no-op */
  }
};

export const subscribeEnabled = (cb) => {
  const onCustom = (e) => cb(!!e.detail?.enabled);
  const onStorage = (e) => {
    if (e.key === KEY) cb(e.newValue === '1');
  };
  window.addEventListener(EVENT, onCustom);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, onCustom);
    window.removeEventListener('storage', onStorage);
  };
};
