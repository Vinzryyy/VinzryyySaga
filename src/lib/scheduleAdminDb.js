/**
 * scheduleAdminDb — client for /admin/jadwal.
 *
 * Reads RTDB /eli_schedule through the public REST endpoint; writes go
 * through /api/admin-schedule, which checks the daily password and writes
 * as the service account. The password lives only in the page's memory.
 */

import { ADMIN_SCHEDULE_PATH } from './scheduleSource';

const databaseUrl = () => import.meta.env.VITE_FIREBASE_DATABASE_URL?.replace(/\/+$/, '') || null;
export const isDatabaseConfigured = () => Boolean(databaseUrl());

export class AdminApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

const callApi = async (body) => {
  let r;
  try {
    r = await fetch('/api/admin-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AdminApiError('Tidak bisa menghubungi server.', 0);
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new AdminApiError(j.error || `HTTP ${r.status}`, r.status);
  return j;
};

export const checkPassword = (password) => callApi({ password, action: 'check' });
export const saveEntry = (password, entry, id) => callApi({ password, action: 'save', entry, id });
export const deleteEntry = (password, id) => callApi({ password, action: 'delete', id });

/** All entries as [{ id, ...fields }]. */
export const fetchEntries = async () => {
  const url = databaseUrl();
  if (!url) return [];
  const r = await fetch(`${url}/${ADMIN_SCHEDULE_PATH}.json`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const val = (await r.json()) || {};
  return Object.entries(val).map(([id, v]) => ({ ...v, id }));
};
