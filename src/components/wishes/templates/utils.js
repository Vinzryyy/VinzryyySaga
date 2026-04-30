/**
 * Shared helpers for wish templates.
 */

export const formatWishDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
};

export const formatWishDateNumeric = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}.${mm}.${yy}`;
};

/**
 * Relative-time string in Indonesian for wishes < 7 days old.
 * Falls back to formatWishDate (absolute "30 Apr 2026") for older wishes
 * and for wishes with future timestamps (clock skew).
 */
export const formatWishTimeRelative = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return formatWishDate(iso);

  const sec = Math.floor(diffMs / 1000);
  if (sec < 30) return 'Baru saja';
  if (sec < 60) return `${sec} detik lalu`;

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} menit lalu`;

  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} jam lalu`;

  const day = Math.floor(hour / 24);
  if (day < 7) return `${day} hari lalu`;

  return formatWishDate(iso);
};
