/**
 * Arsip Ingatan — book registry for /armeniacaTown/r2.
 *
 * KEBIJAKAN KONTEN (per user instruction): Perpustakaan ini eksklusif
 * funfact tentang Eli yang TIDAK ADA di page lain di project ini.
 * Semua konten yang sumbernya juga ditampilkan di /about, /profil,
 * /armeniacaTown/r1 (Konstelasi), /26, dst — DIHAPUS dari Arsip.
 *
 * Surviving books: 6 prose-story berdasarkan funfact unik yang
 * di-curate dari Eli livestream + observation Armeniaca:
 *   1. Anak yang Lebih Suka Pohon — masa kecil di TK
 *   2. Sebelum Panggung — pre-JKT48 (teknik elektro + pramugari)
 *   3. Akar Jaipong yang Tidak Mau Diam — bahasa tubuh
 *   4. Suaranya yang Memanggil — observasi vokal
 *   5. Asal Nama, Asal Cerita — Helisma + Ceu Eli origin
 *   6. Panggung yang Lebih Kecil, Suara yang Tetap Penuh — industry reality
 *
 * State tier: 5 drought + 1 restored. Drought = always accessible
 * sejak peta open. Restored unlock saat count >= 5000.
 */

export const RAK_SLOTS = {
  MEJA: 'meja',
  NW: 'nw',
  NE: 'ne',
  W: 'w',
  E: 'e',
  S: 's',
};

export const UNLOCK_TIERS = {
  DROUGHT: 'drought',
  RESTORED: 'restored',
};

export const CATEGORIES = {
  REFLEKSI: 'refleksi',
};

// Pedestal angles untuk drought floor layout (radius 3.0 dari meja).
export const PEDESTAL_ANGLES = {
  'anak-pohon': 135,              // NW (kronologis paling awal)
  'sebelum-panggung': 105,        // N-NE
  'jaipong-akar': 75,             // NE
  'suara-memanggil': 45,          // E-NE
  'panggung-kecil': 15,           // E
  'asal-nama': 195,               // W-SW (restored unlock)
};

// Reading order — narrative arc kronologis hidup Eli.
export const ARSIP_STORY_ORDER = [
  'anak-pohon',          // masa TK
  'sebelum-panggung',    // pre-JKT48
  'jaipong-akar',        // bahasa tubuh
  'suara-memanggil',     // vokal
  'asal-nama',           // identitas
  'panggung-kecil',      // industry reality (mature)
];

export const ARSIP_BOOKS = [
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
    id: 'sebelum-panggung',
    title: 'Sebelum Panggung — Jalan yang Hampir Berbeda',
    eyebrow: 'Cerita · Sebelum JKT48',
    category: CATEGORIES.REFLEKSI,
    era: null,
    source: 'Eli interviews · curated by Armeniaca',
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
        'Vokalnya kemudian membawanya ke partisipasi di banyak single. Tiap penampilan bukan sekadar slot — ada bagian solo atau bridge yang dia bawa dengan cara yang khas dirinya.',
        'Dan tidak hanya di studio. Di theater, di event, di live streaming — suaranya yang membuat fans betah. Bahkan ketika hanya ngobrol di IDN Live, ada nada di suaranya yang membuat orang merasa diajak ngobrol oleh teman lama, bukan oleh idol di layar.',
        'Suara itu yang membawa dirinya melewati transisi-transisi besar JKT48. Tim berganti, sistem berganti, tapi suara yang membawa pesan tetap sama. Suara yang memanggil pulang.',
      ],
    }),
  },
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
    id: 'panggung-kecil',
    title: 'Panggung yang Lebih Kecil, Suara yang Tetap Penuh',
    eyebrow: 'Cerita · Realita Idol',
    category: CATEGORIES.REFLEKSI,
    era: null,
    source: 'Eli IDN Live · curated by Armeniaca',
    rakSlot: RAK_SLOTS.NE,
    unlockTier: UNLOCK_TIERS.DROUGHT,
    spineColor: '#5a4868',
    preview:
      'Saat sistem tidak memberikan spotlight, Eli memilih bikin panggungnya sendiri.',
    getBody: () => ({
      type: 'prose-story',
      paragraphs: [
        'Ada perbedaan antara cita-cita dan kenyataan. Eli, dengan kejujurannya yang khas, pernah membicarakannya secara terbuka di salah satu live streamnya.',
        'Cita-citanya selalu jelas: bernyanyi dan tampil untuk fans. Itu yang membuatnya memilih JKT48 dulu — bukan dengan ekspektasi instan menjadi sentral, tapi karena di sana dia bisa berdiri di atas panggung dan bertemu orang-orang yang akan menemani perjalanan.',
        'Tapi industri idol punya logika sendiri. Spotlight terbatas. Slot solo terbatas. Kesempatan untuk menampilkan potensi penuh — bukan sesuatu yang dijamin, bahkan untuk member yang sudah konsisten sejak bertahun-tahun.',
        'Eli tahu ini. Dan dia juga tahu bahwa keputusan tentang siapa yang mendapat slot, siapa yang masuk formasi tertentu, siapa yang difokuskan untuk single mana — semua itu di luar kendalinya. Sistem akan terus berputar, fokus akan terus bergeser ke member-member baru yang baru naik. Itu cara industri ini bekerja.',
        'Dia mengakuinya tanpa pahit, tanpa keluhan yang berlebihan. Tapi dia juga jujur: ini berdampak pada pertumbuhannya sebagai performer. Setiap kali tidak ada kesempatan untuk solo, untuk lead vocal, untuk momen spotlight — bagian dari dirinya yang sudah berlatih bertahun-tahun untuk siap dipanggung tidak terpakai.',
        'Tapi cerita Eli tidak berakhir di sana. Dia menemukan jalannya sendiri.',
        'Live streaming — yang dulu mungkin dianggap "panggung sampingan" — jadi panggung utamanya. Di IDN Live, di SHOWROOM, di setiap sesi live yang dia buka, dia bisa bernyanyi tanpa kompetisi slot. Dia bisa berinteraksi dengan fans tanpa harus melalui filter manajemen. Dia bisa jadi versi terbaik dari dirinya sebagai performer, dengan caranya sendiri.',
        'Mungkin panggungnya lebih kecil. Mungkin tidak ada lampu studio yang menyorot. Mungkin tidak ada penonton ribuan di gedung theater. Tapi yang penting: ada koneksi. Ada suara yang dibagikan. Ada fans yang menunggu sesi berikutnya dengan tulus.',
        'Sikap dewasa yang dia bawa: tidak menyerah, tidak juga keras kepala. Menerima realitas industri, sambil tetap setia pada apa yang dia cintai. Live demi live, momen demi momen, dia tetap memilih untuk hadir.',
        'Karena pada akhirnya, panggung bukan cuma tempat di mana lampu menyala. Panggung adalah di mana kamu memilih untuk bernyanyi.',
      ],
    }),
  },
];

export const getInteractiveBooks = (restored) => {
  if (restored) return ARSIP_BOOKS;
  return ARSIP_BOOKS.filter(
    (b) => b.unlockTier === UNLOCK_TIERS.DROUGHT,
  );
};

export const groupBooksByRak = (restored) => {
  const interactive = getInteractiveBooks(restored);
  const grouped = {};
  Object.values(RAK_SLOTS).forEach((slot) => {
    grouped[slot] = interactive.filter((b) => b.rakSlot === slot);
  });
  return grouped;
};

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

export const getNextStoryBook = (bookId, restored = true) => {
  const idx = ARSIP_STORY_ORDER.indexOf(bookId);
  if (idx === -1 || idx === ARSIP_STORY_ORDER.length - 1) return null;
  for (let i = idx + 1; i < ARSIP_STORY_ORDER.length; i++) {
    const nextId = ARSIP_STORY_ORDER[i];
    const nextBook = ARSIP_BOOKS.find((b) => b.id === nextId);
    if (!nextBook) continue;
    if (nextBook.unlockTier === UNLOCK_TIERS.RESTORED && !restored) {
      continue;
    }
    return nextBook;
  }
  return null;
};

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
