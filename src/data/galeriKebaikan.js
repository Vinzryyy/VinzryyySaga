/**
 * Galeri Kebaikan — Archive of kindness acts done in Eli's name as part
 * of the Harmoni Kebaikan project (Helismiley × Armeniaca collab for
 * 15 Juni 2026 seitansai).
 *
 * Curation model: Armeniaca admin-only. New entries land here via
 * direct edit + git commit (no public submission form, no Firebase
 * write path). Status flows: proposed -> approved -> executed.
 *
 * Granularity: 1 entry = 1 kebaikan act (e.g. "Donasi panti asuhan X
 * — Rp 5jt"). Multi-donor acts list the aggregate; individual donors
 * stay in `contributorCredit` as a flexible string.
 */

export const KEBAIKAN_CATEGORIES = [
  {
    id: 'kemanusiaan',
    label: 'Kemanusiaan',
    icon: 'ri-hand-heart-line',
    description: 'Palestina, panti asuhan, panti jompo, penyintas KS, bencana alam',
  },
  {
    id: 'satwa',
    label: 'Satwa & Konservasi',
    icon: 'ri-bear-smile-line',
    description: 'Shelter hewan, konservasi satwa liar',
  },
  {
    id: 'kesehatan',
    label: 'Kesehatan',
    icon: 'ri-heart-pulse-line',
    description: 'Penyintas kanker, dukungan kesehatan',
  },
  {
    id: 'lingkungan',
    label: 'Lingkungan',
    icon: 'ri-leaf-line',
    description: 'Pemulihan lahan, konservasi alam',
  },
  {
    id: 'pendidikan',
    label: 'Pendidikan',
    icon: 'ri-book-open-line',
    description: 'Dukungan fasilitas pendidikan',
  },
];

// Entry shape (for reference — JS so no enforced types):
//   id              string  (slug, unique)
//   title           string  ("Donasi Panti Asuhan X")
//   category        string  (one of KEBAIKAN_CATEGORIES[].id)
//   description     string  (short paragraph — what was done, why)
//   contributorCredit string  ("Helismiley Fans" / "@handle" / "Anonymous")
//   amount          number  (IDR; omit/null for non-monetary acts)
//   recipient       string  (organization or beneficiary, e.g. "Panti Asuhan X")
//   proofUrl        string  (optional — receipt / dokumentasi photo)
//   status          string  ('proposed' | 'approved' | 'executed')
//   executedAt      string  (ISO date — optional, present when status=executed)
//   proposedAt      string  (ISO date — required)
export const KEBAIKAN_ENTRIES = [];

export const formatRupiah = (n) => {
  if (n == null || Number.isNaN(n)) return null;
  return `Rp ${Number(n).toLocaleString('id-ID')}`;
};

export const getKebaikanStats = (entries) => {
  const totalEntries = entries.length;
  const totalAmount = entries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const byCategory = KEBAIKAN_CATEGORIES.map((cat) => {
    const items = entries.filter((e) => e.category === cat.id);
    const amount = items.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    return { ...cat, count: items.length, amount };
  });
  return { totalEntries, totalAmount, byCategory };
};
