#!/usr/bin/env node
/**
 * Hash the weekday admin passwords for /api/admin-schedule.
 *
 * Reads JSON from stdin: {"mon":"…","tue":"…","wed":"…","thu":"…","fri":"…","sat":"…"}
 * Prints the ADMIN_PASSWORD_HASHES value (scrypt, random salt per password).
 * Plain passwords are never written anywhere.
 *
 *   npm run -s hash-admin-passwords < passwords.json
 */
import { randomBytes, scryptSync } from 'node:crypto';

const N = 32768;
const r = 8;
const p = 1;
const KEYLEN = 32;
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

let input = '';
process.stdin.on('data', (c) => {
  input += c;
});
process.stdin.on('end', () => {
  const pw = JSON.parse(input);
  const out = {};
  for (const d of DAYS) {
    if (typeof pw[d] !== 'string' || !pw[d]) {
      console.error(`missing password for "${d}"`);
      process.exit(1);
    }
    const salt = randomBytes(16);
    const hash = scryptSync(pw[d], salt, KEYLEN, { N, r, p, maxmem: 256 * N * r * p });
    out[d] = ['scrypt', N, r, p, salt.toString('base64'), hash.toString('base64')].join('$');
  }
  process.stdout.write(JSON.stringify(out));
});
