/**
 * Petikan backup — encrypted export/import via Web Crypto API.
 *
 * Format:
 *   { v: 1, salt: base64, iv: base64, ciphertext: base64 }
 *
 * Crypto:
 *   - PBKDF2 (SHA-256, 100k iter) derives 256-bit AES key dari passphrase
 *   - AES-GCM 128-bit auth-tag (built into Web Crypto output)
 *   - Salt: 16 bytes random per export
 *   - IV: 12 bytes random per export
 *
 * Payload = semua aprikot_* localStorage keys di-dump as object plaintext
 * JSON sebelum encrypt. Restore re-write semua keys + dispatch storage
 * event biar UI consumers refresh.
 *
 * Referensi: encrypted backup/restore feature dari Tierlist-JKT48
 * (MrcellSbst) — Petikan-specific pakai Web Crypto native (no CryptoJS).
 */

const FORMAT_VERSION = 1;
const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const AES_KEY_BITS = 256;

// Keys yang di-include di backup. Single source biar export + import
// konsisten. Tambah key baru di sini saat storage layer di-extend.
const BACKUP_KEYS = [
  'aprikot_last_pluck',
  'aprikot_buku',
  'aprikot_legenda',
  'aprikot_pity',
  'aprikot_recent',
  'aprikot_buah',
];

// ── base64 helpers (ArrayBuffer ↔ string) ─────────────────────────
const bufToB64 = (buf) => {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const b64ToBytes = (b64) => {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  // Return Uint8Array (not .buffer) — jsdom + some browsers reject plain
  // ArrayBuffer from a different realm at crypto.subtle boundary.
  return bytes;
};

// ── Key derivation ───────────────────────────────────────────────
const deriveKey = async (passphrase, salt) => {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: AES_KEY_BITS },
    false,
    ['encrypt', 'decrypt'],
  );
};

// ── Plaintext gather/apply ───────────────────────────────────────
const gatherPayload = () => {
  const obj = {};
  for (const k of BACKUP_KEYS) {
    try {
      const v = localStorage.getItem(k);
      if (v !== null) obj[k] = v;
    } catch {
      // storage blocked — skip
    }
  }
  return obj;
};

const applyPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload tidak valid');
  }
  // Validation pass — accept hanya keys yang kita kenal, drop sisanya.
  // Anti-tamper: kalau backup file dari source asing punya key lain,
  // gak akan ke-write.
  let writeCount = 0;
  for (const k of BACKUP_KEYS) {
    if (typeof payload[k] === 'string') {
      try {
        localStorage.setItem(k, payload[k]);
        writeCount++;
      } catch {
        // storage blocked / quota — keep going
      }
    }
  }
  return writeCount;
};

// ── Public API ───────────────────────────────────────────────────
/**
 * Export current state ke encrypted JSON Blob. Caller bisa download via
 * URL.createObjectURL atau pass ke navigator.share.
 *
 * @param {string} passphrase — min 4 char (caller harus validate UX)
 * @returns {Promise<Blob>} application/json blob
 */
export const exportEncrypted = async (passphrase) => {
  if (typeof passphrase !== 'string' || passphrase.length < 4) {
    throw new Error('Passphrase minimal 4 karakter');
  }
  if (!('crypto' in globalThis) || !crypto.subtle) {
    throw new Error('Browser tidak mendukung Web Crypto');
  }

  const payload = gatherPayload();
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));

  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext,
  );

  const file = {
    v: FORMAT_VERSION,
    salt: bufToB64(salt),
    iv: bufToB64(iv),
    ciphertext: bufToB64(ciphertext),
    exportedAt: new Date().toISOString(),
  };
  return new Blob([JSON.stringify(file, null, 2)], {
    type: 'application/json',
  });
};

/**
 * Decrypt a backup file Blob/File dan apply ke localStorage. Throws
 * kalau passphrase salah (AES-GCM auth tag fail), file corrupt, atau
 * format version unsupported.
 *
 * @param {Blob|File} file — backup file dari exportEncrypted
 * @param {string} passphrase — same passphrase yang dipakai saat export
 * @returns {Promise<{ written: number }>}
 */
export const importEncrypted = async (file, passphrase) => {
  if (!file || typeof file.text !== 'function') {
    throw new Error('File backup tidak valid');
  }
  if (typeof passphrase !== 'string' || passphrase.length < 1) {
    throw new Error('Passphrase wajib diisi');
  }
  if (!('crypto' in globalThis) || !crypto.subtle) {
    throw new Error('Browser tidak mendukung Web Crypto');
  }

  let parsed;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('File backup bukan JSON valid');
  }
  if (parsed?.v !== FORMAT_VERSION) {
    throw new Error('Versi format backup tidak didukung');
  }
  if (!parsed.salt || !parsed.iv || !parsed.ciphertext) {
    throw new Error('File backup tidak lengkap');
  }

  const salt = b64ToBytes(parsed.salt);
  const iv = b64ToBytes(parsed.iv);
  const ciphertext = b64ToBytes(parsed.ciphertext);

  const key = await deriveKey(passphrase, salt);
  let plaintextBuf;
  try {
    plaintextBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext,
    );
  } catch {
    // AES-GCM auth tag fail = wrong passphrase atau ciphertext tampered.
    // Generic error message biar gak nge-leak which one (anti-oracle).
    throw new Error('Passphrase salah atau file rusak');
  }

  const plaintext = new TextDecoder().decode(plaintextBuf);
  let payload;
  try {
    payload = JSON.parse(plaintext);
  } catch {
    throw new Error('Isi backup corrupt');
  }

  const written = applyPayload(payload);
  return { written };
};

// Surfaced for tests + debugging.
export const _BACKUP_KEYS = BACKUP_KEYS;
