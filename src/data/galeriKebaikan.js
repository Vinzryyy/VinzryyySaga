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
//   proofUrl        string  (optional — receipt / dokumentasi photo, primary)
//   gallery         string[] (optional — additional photo URLs)
//   status          string  ('proposed' | 'approved' | 'executed')
//   executedAt      string  (ISO date — optional, present when status=executed)
//   proposedAt      string  (ISO date — required)
export const KEBAIKAN_ENTRIES = [
  {
    id: 'pohon-kebaikan-lingkungan-2026',
    title: 'Pohon Kebaikan — Penanaman Pohon',
    category: 'lingkungan',
    description:
      'Penanaman 26 pohon via program reforestasi LindungiHutan sebagai bentuk Harmoni Kebaikan ' +
      'atas nama Ceu Eli. Tersebar di empat kampanye pesisir — Tambakrejo (Semarang), ' +
      'PIK (Jakarta), Sukawati, dan Kartikajaya (Kendal) — sebagai simbol kebaikan yang tumbuh ' +
      'dari setiap dukungan komunitas.',
    contributorCredit: 'Armeniaca × Helismiley',
    recipient: 'LindungiHutan — 4 kampanye reforestasi pesisir (26 pohon)',
    amount: 2600000,
    proofUrl: '/Donasists26/Lingkungan/Pohon kebaikan 1.jpeg',
    gallery: [
      '/Donasists26/Lingkungan/Pohon kebaikan 1.jpeg',
      '/Donasists26/Lingkungan/Pohon kebaikan 2.jpeg',
      '/Donasists26/Lingkungan/Pohon kebaikan 3.jpeg',
      '/Donasists26/Lingkungan/sertifikat-donasi.png',
      '/Donasists26/Lingkungan/sertifikat-LindungiHutan 3.png',
      '/Donasists26/Lingkungan/sertifikat-LindungiHutan 4.png',
      '/Donasists26/Lingkungan/sertifikat-LindungiHutan 5.png',
    ],
    status: 'executed',
    executedAt: '2026-05-11',
    proposedAt: '2026-05-01',
  },
  {
    id: 'bos-konservasi-orangutan-2026',
    title: 'Konservasi Orangutan — BOS Foundation',
    category: 'satwa',
    description:
      'Donasi atas nama Ceu Eli untuk Borneo Orangutan Survival Foundation, ' +
      'mendukung konservasi dan rehabilitasi orangutan di Kalimantan.',
    contributorCredit: 'Armeniaca × Helismiley',
    recipient: 'Borneo Orangutan Survival Foundation (BOS)',
    amount: 400000,
    proofUrl: '/Donasists26/Hewan/Certificate-DON-20260519350292122145952_page-0001.jpg',
    status: 'executed',
    executedAt: '2026-05-19',
    proposedAt: '2026-05-15',
  },
  {
    id: 'kukangku-konservasi-kukang-2026',
    title: 'Penyelamatan Kukang — Kukangku',
    category: 'satwa',
    description:
      'Donasi untuk Kukangku, organisasi yang fokus pada konservasi dan ' +
      'penyelamatan kukang (slow loris) di Indonesia.',
    contributorCredit: 'Armeniaca × Helismiley',
    recipient: 'Kukangku — #PenyelamatKukang',
    amount: 400000,
    proofUrl: '/Donasists26/Hewan/kukangku.png',
    status: 'executed',
    executedAt: '2026-05-19',
    proposedAt: '2026-05-15',
  },
  {
    id: 'wildlife-uk-2026',
    title: 'Konservasi Satwa Liar — Wildlife (UK)',
    category: 'satwa',
    description:
      'Donasi untuk program konservasi satwa liar Inggris — membantu hewan-hewan ' +
      'mendapatkan kesempatan kedua untuk kembali ke alam liar.',
    contributorCredit: 'Armeniaca × Helismiley',
    recipient: 'British Wildlife Fund',
    amount: 400000,
    proofUrl: '/Donasists26/Hewan/wwif.png',
    status: 'executed',
    executedAt: '2026-05-19',
    proposedAt: '2026-05-15',
  },
  {
    id: 'konservasi-gajah-2026',
    title: 'Konservasi Gajah — Perlindungan Satwa',
    category: 'satwa',
    description:
      'Donasi untuk program konservasi dan perlindungan gajah — mendukung upaya ' +
      'menjaga habitat dan kelangsungan hidup gajah di alam liar.',
    contributorCredit: 'Armeniaca × Helismiley',
    recipient: 'Program Konservasi Gajah',
    amount: 400000,
    proofUrl: '/Donasists26/Hewan/Gajah.png',
    status: 'executed',
    executedAt: '2026-05-19',
    proposedAt: '2026-05-15',
  },
  {
    id: 'yayasan-penyu-konservasi-2026',
    title: 'Perlindungan Penyu — Yayasan Penyu Indonesia',
    category: 'satwa',
    description:
      'Donasi atas nama Ceu Eli untuk Yayasan Penyu Indonesia — mendukung program ' +
      'perlindungan penyu laut dan pelestarian habitatnya. Penyu jadi indikator ' +
      'kesehatan ekosistem laut yang sehat.',
    contributorCredit: 'Armeniaca × Helismiley',
    recipient: 'Yayasan Penyu Indonesia (yayasanpenyu.org) — Sea Turtle Protection #4868',
    amount: 20000,
    proofUrl: '/Donasists26/Hewan/thankyou-4868_page-0001.jpg',
    status: 'executed',
    executedAt: '2026-05-20',
    proposedAt: '2026-05-20',
  },
  {
    id: 'dompet-dhuafa-kemanusiaan-2026',
    title: 'Donasi Kemanusiaan — Dompet Dhuafa',
    category: 'kemanusiaan',
    description:
      'Donasi via Dompet Dhuafa untuk program kemanusiaan dan bantuan dhuafa di Indonesia.',
    contributorCredit: 'Armeniaca × Helismiley',
    recipient: 'Dompet Dhuafa',
    amount: 100000,
    proofUrl: '/Donasists26/Kemanusian/dompetdhuafa.png',
    status: 'executed',
    executedAt: '2026-05-19',
    proposedAt: '2026-05-15',
  },
  {
    id: 'save-the-children-2026',
    title: 'Masa Depan Anak — Save The Children',
    category: 'kemanusiaan',
    description:
      'Donasi untuk Save The Children Indonesia — mendukung kesejahteraan, ' +
      'pendidikan, dan masa depan anak-anak Indonesia.',
    contributorCredit: 'Armeniaca × Helismiley',
    recipient: 'Save The Children Indonesia',
    proofUrl: '/Donasists26/Kemanusian/save the chilfdren.png',
    status: 'executed',
    executedAt: '2026-05-19',
    proposedAt: '2026-05-15',
  },
  {
    id: 'unicef-anak-indonesia-2026',
    title: 'Hak Anak — UNICEF Indonesia',
    category: 'kemanusiaan',
    description:
      'Donasi untuk UNICEF Indonesia — mendukung hak dan masa depan ' +
      'anak-anak Indonesia mencapai potensi terbaik mereka.',
    contributorCredit: 'Armeniaca × Helismiley',
    recipient: 'UNICEF Indonesia',
    amount: 300000,
    proofUrl: '/Donasists26/Kemanusian/TRX_20260519123447F1210864Q_page-0001.jpg',
    status: 'executed',
    executedAt: '2026-05-19',
    proposedAt: '2026-05-15',
  },
  {
    id: 'yayasan-tumbuh-harapan-2026',
    title: 'Dukungan Anak — Yayasan Tumbuh Harapan',
    category: 'kemanusiaan',
    description:
      'Donasi atas nama Ceu Eli untuk Yayasan Tumbuh Harapan — mendukung tumbuh kembang ' +
      'dan masa depan anak-anak yang membutuhkan.',
    contributorCredit: 'Armeniaca × Helismiley',
    recipient: 'Yayasan Tumbuh Harapan',
    amount: 500000,
    proofUrl: '/Donasists26/Kemanusian/Yayasan Tumbuh Harapan.jpg',
    status: 'executed',
    executedAt: '2026-06-12',
    proposedAt: '2026-06-12',
  },
  {
    id: 'panti-helisma-kemanusiaan-2026',
    title: 'Donasi Panti Asuhan — Panti Helisma',
    category: 'kemanusiaan',
    description:
      'Donasi atas nama Ceu Eli untuk Panti Helisma — mendukung kesejahteraan ' +
      'dan kebutuhan penghuni panti asuhan.',
    contributorCredit: 'Armeniaca × Helismiley',
    recipient: 'Panti Helisma',
    amount: 2760026,
    proofUrl: '/Donasists26/Kemanusian/Sertifikat Panti Helisma_page-0001.jpg',
    status: 'executed',
    executedAt: '2026-06-13',
    proposedAt: '2026-06-13',
  },
];

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
