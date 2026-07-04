/**
 * ArmeniacaTown peta — shared constants and storage helpers.
 * Extracted from TamanPeta.jsx to keep the page file smaller.
 */

// Restoration thresholds — sinkron dgn App.jsx & Taman.jsx.
export const MAP_THRESHOLDS = {
  mapUnlock: 2000,
  firstBloom: 2500,
  r4Unlock: 3000,
  r1Restore: 4000,
  r3Unlock: 4000,
  r5Unlock: 4500,
  airMancurT3: 4750,
  r4Restore: 5000,
  r2Unlock: 5000,
  r3Restore: 6000,
  r5Restore: 6500,
  r2Restore: 7000,
  fullRestore: 7000,
  festivalPrep: 8000,
  lampuPertama: 8500,
  festivalPeak: 9000,
  mercusuar: 9700,
  legacy: 10000,
  airMancurT1: 2000,
  airMancurT2: 3000,
  airMancurT4: 6000,
  airMancurT5: 7500,
  airMancurT6: 10000,
};

// Milestone reveals — shown once per session when count crosses threshold.
export const MILESTONE_REVEALS = [
  {
    threshold: 3000,
    title: 'Menara Jam Terbit',
    eyebrow: 'Petak baru terbuka',
    desc: 'Menara di sudut utara kota mulai berdetak kembali. Kamu bisa mengunjunginya sekarang.',
    accent: '#c8a870',
    icon: 'ri-time-line',
  },
  {
    threshold: 4000,
    title: 'Konstelasi Menyala',
    eyebrow: 'Petak baru terbuka',
    desc: 'Bintang-bintang di langit Lorong Pohon kini membentuk pola. Telaga Harapan juga mulai bisa diakses.',
    accent: '#9890d0',
    icon: 'ri-star-line',
  },
  {
    threshold: 4500,
    title: 'Panggung Sorotan Terbuka',
    eyebrow: 'Petak baru terbuka',
    desc: 'Cahaya pertama menerangi panggung terbuka di sudut tenggara kota.',
    accent: '#e8a870',
    icon: 'ri-spotlight-line',
  },
  {
    threshold: 5000,
    title: 'Perpustakaan Terbuka',
    eyebrow: 'Dua petak berubah',
    desc: 'Pintu Perpustakaan kembali bisa dimasuki. Menara Jam juga telah dipulihkan sepenuhnya.',
    accent: '#a07840',
    icon: 'ri-book-open-line',
  },
  {
    threshold: 7000,
    title: 'Kota Telah Pulih',
    eyebrow: 'Pemulihan penuh',
    desc: 'Semua petak telah dipulihkan. ArmeniacaTown hidup kembali — terima kasih sudah di sini.',
    accent: '#e8d070',
    icon: 'ri-plant-line',
  },
  {
    threshold: 9700,
    title: 'Mercusuar Armeniaca',
    eyebrow: 'Fase legenda',
    desc: '"Pohon mulai memancarkan cahayanya... dulu mereka panggil Pohon ini Mercusuar Armeniaca."',
    accent: '#f8e870',
    icon: 'ri-flashlight-line',
  },
  {
    threshold: 10000,
    title: 'Armeniaca — Warisan',
    eyebrow: 'Puncak kota',
    desc: 'Kota mencapai fase legenda. Mercusuar ini akan terus bersinar, lama setelah kamu pergi.',
    accent: '#f0c840',
    icon: 'ri-award-line',
  },
];

// Milestone session storage
export const MILESTONE_SESSION_KEY = 'armeniaca-milestones-shown';
export const readShownMilestones = () => {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(MILESTONE_SESSION_KEY) || '[]'));
  } catch {
    return new Set();
  }
};
export const writeShownMilestones = (set) => {
  try {
    sessionStorage.setItem(MILESTONE_SESSION_KEY, JSON.stringify([...set]));
  } catch { /* blocked */ }
};

// Petak previewed tracking (localStorage)
export const PREVIEWED_KEY = 'taman-petak-previewed';
export const LEGACY_PREVIEWED_KEY = 'museum-rooms-previewed';

export const readPreviewed = () => {
  try {
    const raw = localStorage.getItem(PREVIEWED_KEY);
    const legacyRaw = localStorage.getItem(LEGACY_PREVIEWED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const legacyParsed = legacyRaw ? JSON.parse(legacyRaw) : [];
    return new Set([
      ...(Array.isArray(parsed) ? parsed : []),
      ...(Array.isArray(legacyParsed) ? legacyParsed : []),
    ]);
  } catch {
    return new Set();
  }
};
export const writePreviewed = (set) => {
  try {
    localStorage.setItem(PREVIEWED_KEY, JSON.stringify([...set]));
  } catch { /* storage blocked */ }
};

// Petak visit history (localStorage)
export const PETAK_VISITS_KEY = 'armeniaca-petak-visits';
export const readPetakVisits = () => {
  try {
    const raw = localStorage.getItem(PETAK_VISITS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
};
export const writePetakVisits = (visits) => {
  try {
    localStorage.setItem(PETAK_VISITS_KEY, JSON.stringify(visits));
  } catch { /* storage blocked */ }
};

// Relative time formatter — Indonesian, casual.
export const formatRelativeVisit = (isoDate) => {
  if (!isoDate) return null;
  const ts = new Date(isoDate).getTime();
  if (Number.isNaN(ts)) return null;
  const diff = Date.now() - ts;
  if (diff < 0) return null;
  const minutes = diff / (1000 * 60);
  const hours = minutes / 60;
  const days = hours / 24;
  if (minutes < 5) return 'baru saja';
  if (hours < 1) return `${Math.floor(minutes)} menit lalu`;
  if (hours < 24) return `${Math.floor(hours)} jam lalu`;
  if (days < 2) return 'kemarin';
  if (days < 7) return `${Math.floor(days)} hari lalu`;
  if (days < 30) return `${Math.floor(days / 7)} minggu lalu`;
  return `${Math.floor(days / 30)} bulan lalu`;
};
