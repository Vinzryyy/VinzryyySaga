/**
 * Petikan backup tests — encrypt/decrypt roundtrip, passphrase mismatch,
 * format version + corrupt input handling. Uses Web Crypto via node's
 * built-in crypto.webcrypto (jsdom passthrough).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  exportEncrypted,
  importEncrypted,
  _BACKUP_KEYS,
} from '../petikanBackup';

describe('petikanBackup encrypt/decrypt roundtrip', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it('exportEncrypted → importEncrypted restores all backup keys', async () => {
    // Seed localStorage with values across all keys
    localStorage.setItem('aprikot_last_pluck', '2026-05-26');
    localStorage.setItem(
      'aprikot_buku',
      JSON.stringify({ 'card-1': { count: 3, firstPluckedAt: '2026-05-20' } }),
    );
    localStorage.setItem('aprikot_legenda', JSON.stringify(['arme']));
    localStorage.setItem('aprikot_pity', JSON.stringify({ langka: 7, legenda: 33 }));
    localStorage.setItem(
      'aprikot_recent',
      JSON.stringify([{ cardId: 'a', tier: 'muda', at: '2026-05-26T10:00:00Z' }]),
    );
    localStorage.setItem('aprikot_buah', '5');

    const blob = await exportEncrypted('secretpass');
    expect(blob).toBeInstanceOf(Blob);

    // Clear and restore
    localStorage.clear();
    const result = await importEncrypted(blob, 'secretpass');
    expect(result.written).toBe(6);

    expect(localStorage.getItem('aprikot_last_pluck')).toBe('2026-05-26');
    expect(JSON.parse(localStorage.getItem('aprikot_buku'))['card-1'].count).toBe(3);
    expect(JSON.parse(localStorage.getItem('aprikot_legenda'))).toContain('arme');
    expect(JSON.parse(localStorage.getItem('aprikot_pity')).langka).toBe(7);
    expect(JSON.parse(localStorage.getItem('aprikot_recent'))[0].cardId).toBe('a');
    expect(localStorage.getItem('aprikot_buah')).toBe('5');
  });

  it('throws on wrong passphrase', async () => {
    localStorage.setItem('aprikot_buah', '10');
    const blob = await exportEncrypted('correctpass');
    await expect(importEncrypted(blob, 'wrongpass')).rejects.toThrow(
      /Passphrase salah/,
    );
  });

  it('throws on passphrase too short (export)', async () => {
    await expect(exportEncrypted('abc')).rejects.toThrow(/minimal 4/);
  });

  it('throws on missing passphrase (import)', async () => {
    const blob = await exportEncrypted('validpass');
    await expect(importEncrypted(blob, '')).rejects.toThrow(/wajib/);
  });

  it('throws on unsupported format version', async () => {
    const fakeFile = new Blob(
      [JSON.stringify({ v: 99, salt: 'x', iv: 'y', ciphertext: 'z' })],
      { type: 'application/json' },
    );
    await expect(importEncrypted(fakeFile, 'pass')).rejects.toThrow(
      /Versi format/,
    );
  });

  it('throws on incomplete backup file', async () => {
    const fakeFile = new Blob([JSON.stringify({ v: 1 })], {
      type: 'application/json',
    });
    await expect(importEncrypted(fakeFile, 'pass')).rejects.toThrow(
      /tidak lengkap/,
    );
  });

  it('throws on non-JSON file', async () => {
    const garbage = new Blob(['not json at all'], { type: 'application/json' });
    await expect(importEncrypted(garbage, 'pass')).rejects.toThrow(
      /bukan JSON/,
    );
  });

  it('roundtrip drops unknown payload keys (anti-tamper)', async () => {
    // Seed only one valid key
    localStorage.setItem('aprikot_buah', '7');
    const blob = await exportEncrypted('passw');
    localStorage.clear();

    // Inject a non-backup key — backup gather should not see it
    localStorage.setItem('aprikot_unrelated', 'should-not-restore');
    await importEncrypted(blob, 'passw');
    // 'aprikot_unrelated' tetep ada karena gak ke-touch import (kita gak
    // wipe-restore, hanya overwrite keys di BACKUP_KEYS).
    expect(localStorage.getItem('aprikot_unrelated')).toBe('should-not-restore');
    expect(localStorage.getItem('aprikot_buah')).toBe('7');
  });

  it('_BACKUP_KEYS exports 6 known keys', () => {
    expect(_BACKUP_KEYS.length).toBe(6);
    expect(_BACKUP_KEYS).toContain('aprikot_buku');
    expect(_BACKUP_KEYS).toContain('aprikot_pity');
    expect(_BACKUP_KEYS).toContain('aprikot_recent');
  });
});
