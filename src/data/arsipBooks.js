/**
 * Arsip Ingatan — book registry for /armeniacaTown/r2.
 *
 * Konten 100% derived dari sumber existing — gak ada copy baru di sini.
 * Tiap entry punya `getBody()` yang resolve isi dari ELI_TIMELINE,
 * ELI_DISCOGRAPHY, ELI_FIGHT_2026, SITE_CONFIG.about, atau
 * KEBAIKAN_ENTRIES. Saat sumber data tumbuh (timeline tambah entry,
 * kebaikan tambah aksi), Perpustakaan otomatis ikut tumbuh tanpa
 * sync manual.
 *
 * State tier: drought (rak utuh + meja + S — 6 buku) vs restored
 * (semua rak — 11 buku). Drought tier diatur supaya cerita "selamat
 * dari kehancuran" konsisten: Etimologi/Filosofi (rooting Armeniaca),
 * 3 era awal Eli (Trainee/Theater/Senbatsu-NewEra), dan satu cross-
 * link Galeri Kebaikan. Era akhir (Mature/Variety/Fight + diskografi)
 * unlock setelah ruangan pulih (count >= 5000).
 */

import { ELI_TIMELINE, ELI_DISCOGRAPHY, ELI_FIGHT_2026 } from './eliProfile';
import { SITE_CONFIG } from '../config/siteConfig';
import { KEBAIKAN_ENTRIES } from './galeriKebaikan';

// Era groupings — milestone IDs di ELI_TIMELINE dikelompokin ke buku.
// Sinkron dengan ERA_DEFS Konstelasi tapi gak hard-import (avoid coupling
// — kalau ERA_DEFS pivot, buku-buku Perpustakaan tetap stabil).
const ERA_GROUPS = {
  trainee: ['audition', 'sousenkyo-2018', 'class-a'],
  theater: ['theater-debut', 'team-kiii', 'show-100'],
  'senbatsu-newera': [
    'first-senbatsu',
    'new-formation-2021',
    'darashinai-aishikata',
    'show-200',
  ],
  mature: [
    'sayonara-crawl',
    'spv-langit-biru-2024',
    'show-300',
    'undergirl-bibir-2024',
  ],
  variety: ['belajar-konseling'],
  fight: [
    'pertaruhan-cinta-shonichi',
    'three-team-announce',
    'fight-tagline',
    'team-dream',
    'dream-bakudan-shonichi',
    'show-400',
  ],
};

const getTimelineByEra = (eraKey) => {
  const ids = ERA_GROUPS[eraKey] || [];
  return ELI_TIMELINE.filter((m) => ids.includes(m.id));
};

// Rak slot constants — match dengan posisi 3D di TamanArsipIngatan scene.
export const RAK_SLOTS = {
  MEJA: 'meja',
  NW: 'nw',
  NE: 'ne',
  W: 'w',
  E: 'e',
  S: 's',
};

// Tier unlock — drought tier accessible dari count >= 2000 (peta open),
// restored tier accessible dari count >= 5000 (r2Restore threshold).
export const UNLOCK_TIERS = {
  DROUGHT: 'drought',
  RESTORED: 'restored',
};

export const CATEGORIES = {
  REFLEKSI: 'refleksi',
  LINIMASA: 'linimasa',
  DISKOGRAFI: 'diskografi',
  ERA: 'era',
  KEBAIKAN: 'kebaikan',
};

// Book registry. Order dalam array juga = order prev/next dalam rak
// yang sama (sortable by rakSlot lalu by position dalam array).
export const ARSIP_BOOKS = [
  // === MEJA (focal point — pertama dilihat saat masuk) ===
  {
    id: 'halaman-terakhir',
    title: 'Halaman Terakhir',
    eyebrow: 'Filosofi · Halaman Pembuka',
    category: CATEGORIES.REFLEKSI,
    era: null,
    source: 'Armeniaca',
    rakSlot: RAK_SLOTS.MEJA,
    unlockTier: UNLOCK_TIERS.DROUGHT,
    spineColor: '#8B4040',
    preview:
      'Buku ini terbuka di meja, menunggu siapa pun yang melangkah masuk.',
    getBody: () => {
      const phil = SITE_CONFIG.about.philosophy;
      return {
        type: 'quote',
        quote: phil.quote,
        author: phil.author,
        epilogue:
          'Inilah yang tersisa dari apa yang tidak boleh hilang. ' +
          'Sebagian rak masih berdiri. Sebagian halaman masih bisa dibaca. ' +
          'Silakan.',
      };
    },
  },

  // === RAK NW (utuh, drought) — Tentang Armeniaca (root identity) ===
  {
    id: 'etimologi-armeniaca',
    title: 'Setelah Musim Dingin, yang Mekar',
    eyebrow: 'Refleksi · Etimologi',
    category: CATEGORIES.REFLEKSI,
    era: null,
    source: 'siteConfig.about.etymology',
    rakSlot: RAK_SLOTS.NW,
    unlockTier: UNLOCK_TIERS.DROUGHT,
    spineColor: '#C9A961',
    preview: 'Kenapa "Armeniaca"? Apa arti tiap simbol di logo?',
    getBody: () => {
      const ety = SITE_CONFIG.about.etymology;
      return {
        type: 'prose-with-motifs',
        paragraphs: ety.paragraphs,
        motifsTitle: ety.motifsTitle,
        motifs: ety.motifs,
      };
    },
  },
  {
    id: 'filosofi-armeniaca',
    title: 'Filosofi Armeniaca',
    eyebrow: 'Refleksi · Voice',
    category: CATEGORIES.REFLEKSI,
    era: null,
    source: 'siteConfig.about.philosophy',
    rakSlot: RAK_SLOTS.NW,
    unlockTier: UNLOCK_TIERS.DROUGHT,
    spineColor: '#D4A574',
    preview:
      'Setiap panggung Eli adalah momen yang sekejap. Tugas Armeniaca...',
    getBody: () => {
      const phil = SITE_CONFIG.about.philosophy;
      const community = SITE_CONFIG.home.community;
      return {
        type: 'philosophy',
        quote: phil.quote,
        author: phil.author,
        communityTitle: community.title,
        communityBody: community.body,
      };
    },
  },

  // === RAK NE (utuh, drought) — Origin & behind-the-scenes stories ===
  // Buku-buku linimasa lama (trainee, theater, senbatsu-newera) diganti
  // dengan stories yang gak duplikat dengan Konstelasi Perjalanan (r1).
  // Linimasa kronologis udah di-cover di sana via bintang per milestone.
  // Di Arsip Ingatan, fokus ke biographical/anecdotal content.
  {
    id: 'anak-pohon',
    title: 'Anak yang Lebih Suka Pohon',
    eyebrow: 'Cerita · Masa Kecil',
    category: CATEGORIES.REFLEKSI,
    era: null,
    source: 'Eli IDN Live · curated by Armeniaca',
    rakSlot: RAK_SLOTS.NE,
    unlockTier: UNLOCK_TIERS.DROUGHT,
    spineColor: '#7aa858',
    preview:
      'Saat TK, dia lebih suka memanjat pohon atau sembunyi di pasir.',
    getBody: () => ({
      type: 'prose-story',
      paragraphs: [
        'Sebelum dipanggil "Ceu Eli," sebelum jadi member JKT48, sebelum pelajaran-pelajaran panggung yang akan datang — Eli kecil sudah punya kepribadian yang khas.',
        'Di Taman Kanak-Kanak, sementara teman-teman lain duduk anteng di kelas, mengikuti aktivitas terstruktur yang sudah disiapkan guru — Eli lebih banyak di luar. Bukan karena dia gak mau ikut. Tapi karena ada satu hal yang lebih menarik baginya: dunia di luar kelas.',
        'Ada satu pohon besar yang jadi tempat favorit. Pohon yang cukup tinggi untuk dipanjat, cukup teduh untuk diduduki, cukup tersembunyi untuk membuatnya merasa di tempat sendiri. Dia bisa naik ke atas pohon itu, lalu duduk berjam-jam. Dunia di bawah dia abaikan — yang penting dia di atas, di tempat yang dia pilih sendiri.',
        'Kalau bukan di pohon, dia ada di area pasir di bawah perosotan. Tempat tersembunyi — kebanyakan anak lewat begitu saja, gak terpikir buat berhenti. Tapi Eli tahu: di bawah perosotan itu ada ruang kecil yang cukup untuk satu anak yang ingin punya dunia sendiri.',
        'Ini bukan kejadian sekali atau dua kali. Ini kebiasaan yang bertahan untuk waktu yang cukup lama di masa kanak-kanak awal. Bukan karena dia menolak teman-temannya — dia hanya sudah punya dunia sendiri yang dia sukai lebih dari ruang kelas yang seragam.',
        'Bertahun-tahun setelahnya, kita bisa lihat: kepribadian itu gak hilang. Eli yang sekarang tampil di panggung Theater JKT48 punya energi yang sama dengan anak kecil yang naik pohon di TK. Masih punya dunia sendiri di tengah keramaian, masih bikin ruang kecilnya sendiri walau dikelilingi banyak member dan ribuan penonton.',
        'Pohon yang dulu jadi tempat naik, sekarang jadi panggung. Pasir yang dulu tempat sembunyi, sekarang jadi setlist. Tapi yang naik dan yang sembunyi, masih orang yang sama: anak kecil yang sudah lebih dulu tahu bahwa kadang-kadang dunia yang paling menarik adalah yang dia bikin sendiri.',
      ],
    }),
  },
  {
    id: 'jaipong-akar',
    title: 'Akar Jaipong yang Tidak Mau Diam',
    eyebrow: 'Cerita · Bahasa Tubuh',
    category: CATEGORIES.REFLEKSI,
    era: null,
    source: 'Eli IDN Live · curated by Armeniaca',
    rakSlot: RAK_SLOTS.NE,
    unlockTier: UNLOCK_TIERS.DROUGHT,
    spineColor: '#c8a060',
    preview:
      'Saat dia hype di panggung, gerakan Jaipong-nya muncul tanpa diminta.',
    getBody: () => ({
      type: 'prose-story',
      paragraphs: [
        'Sebelum panggung JKT48, sebelum koreografi J-Pop yang presisi dan seragam, Eli sudah punya satu bahasa tubuh yang lain: Tari Jaipong. Tari tradisional Sunda yang akar gerakannya — pinggul yang berputar, tangan yang bercerita, kepala yang bergerak dengan tegas — sudah lebih dulu nempel di tubuhnya sebelum dia mengenal istilah "8 hitungan" atau "8 count."',
        'Di JKT48, koreografi adalah ilmu yang berbeda. Setiap gerakan harus seragam dengan member lain. Setiap detail — angle tangan, tinggi lompatan, arah kepala — diukur. Tidak ada ruang untuk improvisasi. Bahkan ekspresi wajah ada bagiannya sendiri.',
        'Dan di situlah cerita ini muncul: Jaipong yang sudah dia pelajari sejak kecil ternyata punya pikiran sendiri.',
        'Pernah, saat membawakan lagu "Kinjirareta Futari," gerakan-gerakan khas Jaipong terbawa secara tidak sadar ke tengah koreografi. Bukan sengaja. Bukan rebellious. Hanya tubuhnya yang, di tengah keseruan momen, kembali ke bahasa yang paling dia kenal.',
        'Dan ini bukan kejadian sekali. Eli menyadari pola tersebut setelah menonton ulang video penampilannya. Setiap kali dia merasa terlalu bersemangat, terlalu energetik, terlalu hype di panggung — gerakan Jaipong itu yang muncul ke permukaan. Tubuhnya, saat akal pelannya lengah, langsung berbicara dalam dialek Sunda.',
        'Sekarang, dia tahu. Saat energinya memuncak di panggung, ada bagian dari dirinya yang harus berbisik: "tetap ikuti porsi koreografi." Karena kalau tidak, akar Jaipongnya yang akan mengambil alih.',
        'Mungkin itu juga yang membuatnya begitu khas. Bahkan ketika dia sangat patuh pada koreografi, ada sesuatu di gerakannya yang berbeda — sesuatu yang lebih hidup, lebih bercerita, lebih akar. Bandung yang kadang-kadang bocor ke panggung Jakarta. Tari yang tidak mau diam, karena tubuhnya sudah lebih dulu mengenalnya sebelum koreografi yang sekarang dia bawakan.',
      ],
    }),
  },
  {
    id: 'sebelum-panggung',
    title: 'Sebelum Panggung — Jalan yang Hampir Berbeda',
    eyebrow: 'Cerita · Sebelum JKT48',
    category: CATEGORIES.REFLEKSI,
    era: null,
    source: 'Armeniaca · curated trivia',
    rakSlot: RAK_SLOTS.NE,
    unlockTier: UNLOCK_TIERS.DROUGHT,
    spineColor: '#fff5c8',
    preview:
      'Teknik elektro, akademi pramugari, dan pilihan terakhir yang membawanya ke panggung.',
    getBody: () => ({
      type: 'prose-story',
      paragraphs: [
        'Cerita yang jarang diceritakan: sebelum Eli dikenal sebagai idol JKT48, hidupnya hampir mengalir ke dua jalan yang sama sekali berbeda.',
        'Pertama, teknik elektro. Eli sempat masuk jurusan teknik elektro — pilihan yang praktis, jalur yang aman. Tapi rutinitas kuliah teknik bukan tempat yang membuat suaranya didengar. Akademisnya jalan, tapi bagian yang paling hidup dalam dirinya — bagian yang ingin tampil, ingin bernyanyi, ingin bertemu banyak orang — tetap diam.',
        'Kedua, pramugari. Eli hampir saja menempuh jalan ini. Sudah sampai tahap akan training di Malaysia. Hampir terbang. Bayangkan kalau cerita itu yang jadi: Eli dengan seragam pramugari, melayani penumpang di kabin pesawat, melintasi negara-negara, hidup yang glamor tapi anonim.',
        'Tapi entah bagaimana — di tengah persimpangan itu — audisi JKT48 muncul. Dan Eli memilih panggung.',
        'Pilihan itu bukan tanpa risiko. JKT48 berarti meninggalkan teknik, meninggalkan rencana pramugari, meninggalkan jalur yang sudah hampir terlihat ujungnya. Tapi Eli memilih cahaya panggung yang belum pernah dia rasakan, daripada langit yang sudah pernah dia bayangkan.',
        'Sekarang, bertahun-tahun setelahnya, kita bisa lihat: pilihan itu yang membuat kita mengenalnya sebagai Ceu Eli, bukan sebagai Pramugari Helisma Putri Kurnia di salah satu maskapai. Dan dunia, di area kecilnya yang bernama Theater JKT48, jadi sedikit lebih hangat karena pilihan itu.',
      ],
    }),
  },
  {
    id: 'suara-memanggil',
    title: 'Suaranya yang Memanggil',
    eyebrow: 'Cerita · Vokal',
    category: CATEGORIES.REFLEKSI,
    era: null,
    source: 'Armeniaca · curated observation',
    rakSlot: RAK_SLOTS.NE,
    unlockTier: UNLOCK_TIERS.DROUGHT,
    spineColor: '#e8b878',
    preview:
      'Bukan suara paling melengking, tapi yang menenangkan dengan kejujurannya.',
    getBody: () => ({
      type: 'prose-story',
      paragraphs: [
        'Sebelum jadi senbatsu, sebelum jadi shonichi singer — Eli punya satu hal yang langsung dikenali sejak masa trainee: suaranya.',
        'Vokalnya yang menonjol. Bukan suara paling melengking, bukan suara paling tinggi, bukan teknik vokal yang paling sempurna. Tapi ada kehangatan dan kejernihan tertentu di suaranya yang membuat orang di Theater berhenti sebentar saat dia menyanyi solo. Kerasa seperti suara yang memanggil pulang — bukan suara yang menarik perhatian dengan kemewahan, tapi suara yang menenangkan dengan kejujurannya.',
        'Vokalnya kemudian membawanya ke partisipasi di banyak single — dari Rapsodi sebagai senbatsu pertama, ke Darashinai Aishikata di era New Era, Sayonara Crawl, sampai SPV Langit Biru Cinta Searah. Tiap penampilan bukan sekadar slot — ada bagian solo atau bridge yang dia bawa dengan cara yang khas dirinya.',
        'Dan tidak hanya di studio. Di theater, di event, di live streaming — suaranya yang membuat fans betah. Bahkan ketika hanya ngobrol di IDN Live, ada nada di suaranya yang membuat orang merasa diajak ngobrol oleh teman lama, bukan oleh idol di layar.',
        'Suara itu yang membawa dirinya melewati transisi besar JKT48 — dari Team KIII, ke New Era, sampai Team Dream di era Fight 2026. Tim berganti, sistem berganti, tapi suara yang membawa pesan tetap sama. Suara yang memanggil pulang.',
      ],
    }),
  },
  {
    id: 'new-era-saat-sistem',
    title: 'New Era — Saat Sistem Lama Bubar',
    eyebrow: 'Cerita · Transisi 2021',
    category: CATEGORIES.REFLEKSI,
    era: null,
    source: 'Armeniaca · curated reflection',
    rakSlot: RAK_SLOTS.NE,
    unlockTier: UNLOCK_TIERS.DROUGHT,
    spineColor: '#3a4858',
    preview:
      'Saat Team J, KIII, dan T dibubarkan. Apa rasanya bertahan ketika rumahmu hilang?',
    getBody: () => ({
      type: 'prose-story',
      paragraphs: [
        'Maret 2021, JKT48 mengumumkan sesuatu yang mengejutkan: sistem Team J, Team KIII, dan Team T resmi dibubarkan. Tidak ada lagi tim. Semua member dilebur menjadi satu formasi tunggal — JKT48 New Era.',
        'Bagi member yang sudah lama berada di tim tertentu, ini bukan sekadar reshuffle administratif. Ini perubahan identitas. Selama bertahun-tahun, "Team KIII" bukan cuma label — itu adalah keluarga harian, jadwal harian, bahkan kostum harian. Dan tiba-tiba semua itu hilang.',
        'Eli, yang sudah promosi dari Academy ke Team KIII pada Juli 2019, ikut melewati transisi ini. Dari segi karier, dia sudah punya momentum: senbatsu pertama di Rapsodi (Januari 2020), 100 show theater di Saka Agari (Desember 2019). Tapi New Era artinya semua momentum itu di-reset — bukan diturunkan, tapi dimasukkan ke wadah baru yang belum dikenal siapa-siapa.',
        'Era New Era bukan masa yang glamor. Pandemi membatasi aktivitas live, jadwal theater dikurangi, sosial media jadi panggung utama. Single Darashinai Aishikata dirilis di tengah masa yang penuh ketidakpastian. Tapi Eli tetap konsisten — penampilannya di theater terus berlanjut, sampai akhirnya mencapai 200 show pada November 2021 di setlist Renai Kinshi Jourei.',
        'Dari sudut pandang penggemar, era New Era adalah masa krisis identitas grup. Tapi dari sudut pandang Eli secara personal, era ini adalah ujian kesabaran: bertahan ketika sistem yang membentukmu tiba-tiba dibubarkan, dan tetap bekerja seperti tidak ada yang berubah.',
        'Era ini berlangsung sampai akhir 2025, sebelum sistem 3 tim dibangkitkan kembali dalam format JKT48 Fight. Tapi Eli yang melewati New Era bukan Eli yang masuk audisi 2018. Dia sudah jadi Eli yang lain — Eli yang tahu rasanya sistem yang dia kenal hilang, dan tetap memilih untuk bertahan.',
      ],
    }),
  },

  // === RAK W (tumbang, restored) — Origin story tambahan ===
  {
    id: 'asal-nama',
    title: 'Asal Nama, Asal Cerita',
    eyebrow: 'Cerita · Identitas',
    category: CATEGORIES.REFLEKSI,
    era: null,
    source: 'Armeniaca · curated trivia',
    rakSlot: RAK_SLOTS.W,
    unlockTier: UNLOCK_TIERS.RESTORED,
    spineColor: '#7a3030',
    preview:
      'Dua nama melekat: yang dibuat ayahnya, dan yang lahir dari komunitas.',
    getBody: () => ({
      type: 'prose-story',
      paragraphs: [
        'Ada dua nama yang melekat ke Eli: nama yang dia bawa sejak lahir, dan nama yang diberikan oleh komunitas.',
        '— Helisma Mauludzunia Putri Kurnia.',
        'Nama "Helisma" bukan nama yang umum. Bahkan jarang ditemukan di luar diri Eli sendiri. Ada cerita di balik itu: nama ini dibuat oleh ayahnya, dirakit secara spontan dari gabungan nama keluarga dan beberapa kata tambahan. Tidak dari kitab nama bayi, tidak dari nama tokoh, tidak dari nama yang sedang trend pada masanya. Dirakit. Dari potongan-potongan keluarga + intuisi ayah pada satu momen tertentu.',
        'Mungkin itu sebabnya namanya terasa khusus. Karena memang dibuat khusus untuknya saja.',
        '— Ceu Eli.',
        'Tapi ada nama kedua yang membuat namanya melekat di hati banyak orang. Bukan nama lahir, tapi nama yang lahir dari komunitas: "Ceu Eli."',
        'Awalnya julukan ini muncul dari senior di Team T. "Ceu" dalam bahasa Sunda berarti "kakak perempuan" — bentuk penyebutan hormat yang akrab. Mungkin sekadar candaan di awal, mungkin sekadar penegasan tentang asal-usulnya yang Bandung. Tapi entah bagaimana, julukan itu melekat. Pelan-pelan menyebar dari senior, ke teman segen, ke fans, sampai sekarang lebih banyak orang yang memanggilnya "Ceu Eli" daripada memanggilnya "Helisma."',
        'Dua nama, dua cerita. Yang pertama menandai dia sebagai anak yang istimewa di keluarganya. Yang kedua menandai dia sebagai sosok kakak perempuan yang dijaga oleh komunitasnya. Tidak ada yang lebih sah dari yang lain — keduanya benar.',
      ],
    }),
  },
  {
    id: 'linimasa-variety',
    title: 'Era Variety — Belajar Konseling',
    eyebrow: 'Linimasa · 2025',
    category: CATEGORIES.LINIMASA,
    era: 'variety',
    source: 'ELI_TIMELINE',
    rakSlot: RAK_SLOTS.W,
    unlockTier: UNLOCK_TIERS.RESTORED,
    spineColor: '#c8a060',
    preview:
      'Buna Eli, host JKT48 TV, format yang menemukan tone-nya sendiri.',
    getBody: () => ({
      type: 'timeline-section',
      milestones: getTimelineByEra('variety'),
    }),
  },

  // === RAK E (miring, restored) — Era Fight + Diskografi ===
  {
    id: 'era-fight-team-dream',
    title: 'Era JKT48 Fight — Team Dream',
    eyebrow: 'Era Terkini · 2026',
    category: CATEGORIES.ERA,
    era: 'fight',
    source: 'ELI_FIGHT_2026 + ELI_TIMELINE',
    rakSlot: RAK_SLOTS.E,
    unlockTier: UNLOCK_TIERS.RESTORED,
    spineColor: '#5a8aa8',
    preview:
      'Format kompetisi tiga tim, line-up Team Dream, era baru bersama Freya.',
    getBody: () => ({
      type: 'era-fight',
      fight: ELI_FIGHT_2026,
      milestones: getTimelineByEra('fight'),
    }),
  },
  {
    id: 'diskografi-rapsodi',
    title: 'Diskografi — Rapsodi',
    eyebrow: 'Single · 2020 · Senbatsu',
    category: CATEGORIES.DISKOGRAFI,
    era: 'senbatsu-newera',
    source: 'ELI_DISCOGRAPHY',
    rakSlot: RAK_SLOTS.E,
    unlockTier: UNLOCK_TIERS.RESTORED,
    spineColor: '#e8d4a8',
    preview:
      'Senbatsu pertama Eli — original song pertama JKT48, posisi 15.',
    getBody: () => ({
      type: 'diskografi',
      entry: ELI_DISCOGRAPHY.find((e) => e.title === 'Rapsodi'),
    }),
  },
  {
    id: 'diskografi-bibir',
    title: 'Diskografi — Bibir yang Telah Dicuri',
    eyebrow: 'Single · 2025 · Undergirls',
    category: CATEGORIES.DISKOGRAFI,
    era: 'mature',
    source: 'ELI_DISCOGRAPHY',
    rakSlot: RAK_SLOTS.E,
    unlockTier: UNLOCK_TIERS.RESTORED,
    spineColor: '#8B4040',
    preview:
      'Undergirls Sousenkyo 2024 — #Semangka, posisi 22 dengan 28.925 suara.',
    getBody: () => ({
      type: 'diskografi',
      entry: ELI_DISCOGRAPHY.find((e) =>
        (e.title || '').startsWith('Bibir'),
      ),
    }),
  },

  // === RAK S (kecil, drought) — Cross-link Galeri Kebaikan ===
  {
    id: 'kebaikan-pohon',
    title: 'Lembar Kebaikan — Pohon Lingkungan',
    eyebrow: 'Aksi · Harmoni Kebaikan',
    category: CATEGORIES.KEBAIKAN,
    era: null,
    source: 'KEBAIKAN_ENTRIES',
    rakSlot: RAK_SLOTS.S,
    unlockTier: UNLOCK_TIERS.DROUGHT,
    spineColor: '#7aa858',
    preview:
      'Tiga pohon ditanam atas nama Eli — kebaikan yang akarnya tumbuh.',
    getBody: () => ({
      type: 'kebaikan',
      entries: KEBAIKAN_ENTRIES,
    }),
  },
];

// Books interactive berdasarkan tier ruangan.
export const getInteractiveBooks = (restored) => {
  if (restored) return ARSIP_BOOKS;
  return ARSIP_BOOKS.filter(
    (b) => b.unlockTier === UNLOCK_TIERS.DROUGHT,
  );
};

// Books grouped by rakSlot — untuk render di scene.
export const groupBooksByRak = (restored) => {
  const interactive = getInteractiveBooks(restored);
  const grouped = {};
  Object.values(RAK_SLOTS).forEach((slot) => {
    grouped[slot] = interactive.filter((b) => b.rakSlot === slot);
  });
  return grouped;
};

// Prev/next dalam rak yang sama. Scope sengaja dibatasi per-rak (bukan
// global) supaya kerasa "ambil buku berikutnya dari rak yang sama,"
// bukan teleport ke rak lain.
export const getRakSiblings = (bookId, restored = true) => {
  const interactive = getInteractiveBooks(restored);
  const book = interactive.find((b) => b.id === bookId);
  if (!book) return { prev: null, next: null, idx: -1, total: 0 };
  const sameRak = interactive.filter((b) => b.rakSlot === book.rakSlot);
  const idx = sameRak.findIndex((b) => b.id === bookId);
  return {
    prev: idx > 0 ? sameRak[idx - 1] : null,
    next: idx < sameRak.length - 1 ? sameRak[idx + 1] : null,
    idx,
    total: sameRak.length,
  };
};

// Pedestal positions — angle dalam derajat dari +X axis CCW di sekitar
// meja baca. Tiap buku interactive (kecuali Halaman Terakhir yang udah
// di meja) di-host di pedestal kayu radius 2.2 dari meja. Layout:
// utara (depan) untuk era awal/refleksi, timur untuk linimasa tengah,
// selatan untuk diskografi + kebaikan.
export const PEDESTAL_ANGLES = {
  'etimologi-armeniaca': 135,        // NW
  'filosofi-armeniaca': 165,         // W-NW
  'anak-pohon': 180,                 // W (childhood story)
  'jaipong-akar': 195,               // W-SW
  'sebelum-panggung': 105,           // N-NE
  'suara-memanggil': 75,             // NE
  'new-era-saat-sistem': 45,         // E-NE
  'asal-nama': 15,                   // E (restored unlock)
  'linimasa-variety': 345,           // E-SE
  'era-fight-team-dream': 315,       // SE
  'diskografi-rapsodi': 285,         // S-SE
  'diskografi-bibir': 255,           // SSW
  'kebaikan-pohon': 225,             // SW
};

// Reading order — narrative arc untuk user. Mulai dari "Halaman Terakhir"
// (manifesto Armeniaca, focal di meja) → 2 refleksi tentang project →
// 3 linimasa kronologis era awal → 3 linimasa kronologis era akhir
// (restored unlock) → 2 diskografi → 1 era fight terkini → closing
// dengan call-to-action kebaikan.
//
// Drought tier (saat count < 5000): user disarankan ke kebaikan-pohon
// di akhir drought arc (jangan terlantar di tengah).
// Restored tier (count >= 5000): full arc 12 buku.
export const ARSIP_STORY_ORDER = [
  'halaman-terakhir',
  'etimologi-armeniaca',
  'filosofi-armeniaca',
  'anak-pohon',           // childhood, paling awal kronologis hidup
  'sebelum-panggung',
  'jaipong-akar',
  'suara-memanggil',
  'new-era-saat-sistem',
  'asal-nama',
  'linimasa-variety',
  'era-fight-team-dream',
  'diskografi-rapsodi',
  'diskografi-bibir',
  'kebaikan-pohon',
];

// Get next book di narrative arc setelah bookId. Restored gate: kalau
// next book restored tier dan user belum restored, skip ke kebaikan
// (drought closing).
export const getNextStoryBook = (bookId, restored = true) => {
  const idx = ARSIP_STORY_ORDER.indexOf(bookId);
  if (idx === -1 || idx === ARSIP_STORY_ORDER.length - 1) return null;
  // Find next book yang masuk current tier
  for (let i = idx + 1; i < ARSIP_STORY_ORDER.length; i++) {
    const nextId = ARSIP_STORY_ORDER[i];
    const nextBook = ARSIP_BOOKS.find((b) => b.id === nextId);
    if (!nextBook) continue;
    if (nextBook.unlockTier === UNLOCK_TIERS.RESTORED && !restored) {
      // Skip restored book di drought tier — lompat ke kebaikan
      // (story closing untuk drought arc)
      continue;
    }
    return nextBook;
  }
  return null;
};

// Persistence — track buku yang udah dibaca lewat localStorage.
// Marker visual di rak (subtle emissive) + counter di petak peta.
const READ_KEY = 'arsip-books-read';

export const getReadBookIds = () => {
  try {
    const raw = localStorage.getItem(READ_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const markBookRead = (id) => {
  try {
    const current = new Set(getReadBookIds());
    if (current.has(id)) return;
    current.add(id);
    localStorage.setItem(READ_KEY, JSON.stringify([...current]));
  } catch {
    /* storage blocked — no-op */
  }
};
