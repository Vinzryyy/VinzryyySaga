/**
 * Arsip Ingatan — book registry for /armeniacaTown/r2.
 *
 * KEBIJAKAN KONTEN (per user instruction): Perpustakaan ini eksklusif
 * funfact tentang Eli yang TIDAK ADA di page lain di project ini.
 * Semua konten yang sumbernya juga ditampilkan di /about, /profil,
 * /armeniacaTown/r1 (Konstelasi), /26, dst — DIHAPUS dari Arsip.
 *
 * Kurasi akhir: 13 buku terbaik dari batch funfact yang user kasih
 * (sumber: Eli IDN Live + Showroom Live, plus 1-2 dari interviews).
 * 5 S-tier + 5 A-tier + 2 B-tier + 1 C-tier.
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
// 13 slots melingkari meja.
export const PEDESTAL_ANGLES = {
  'anak-pohon': 135,              // NW
  'bukan-kolonial': 100,          // N-NE (introvert)
  'sebelum-panggung': 75,         // NE (pre-JKT48)
  'jaipong-akar': 50,             // E-NE (bahasa tubuh)
  'culture-shock': 25,            // E (Bandung→Jakarta)
  'panggung-kecil': 0,            // E (industry reality)
  'vocal-bertanya': 335,          // E-SE (professionalism)
  'stay-in-place': 305,           // SE (backstage discipline)
  'fangirl-dewasa': 275,          // S (perspektif fan)
  'tas-tiga-kilo': 245,           // SW (self-reliance)
  'pengangguran-dananya': 215,    // SW (escapist dream)
  'revenge-2023': 185,            // W (reclaim performer pride)
  'asal-nama': 160,               // W-NW (identitas, restored unlock)
};

// Decoratif floor books — model buku yang tampil di lantai drought
// tapi gak punya story (gak bisa dibuka). Filler visual supaya floor
// gak kosong setelah cleanup 21 → 13 interactive books. Drought-only
// (gak render di restored). 8 buku berbeda spine color biar varied
// visual scatter.
export const DECORATIVE_BOOKS = [
  { id: 'deco-1', spineColor: '#e8b878', angle: 117 },  // antara anak-pohon & bukan-kolonial
  { id: 'deco-2', spineColor: '#6a5878', angle: 87 },   // antara bukan-kolonial & sebelum-panggung
  { id: 'deco-3', spineColor: '#b88858', angle: 62 },   // antara sebelum-panggung & jaipong-akar
  { id: 'deco-4', spineColor: '#c08858', angle: 350 },  // antara panggung-kecil & vocal-bertanya
  { id: 'deco-5', spineColor: '#b07878', angle: 290 },  // antara stay-in-place & fangirl-dewasa
  { id: 'deco-6', spineColor: '#7a6848', angle: 260 },  // antara fangirl-dewasa & tas-tiga-kilo
  { id: 'deco-7', spineColor: '#5a8aa8', angle: 230 },  // antara tas-tiga-kilo & pengangguran
  { id: 'deco-8', spineColor: '#a05848', angle: 200 },  // antara pengangguran & revenge-2023
];

// Reading order — narrative arc kronologis hidup Eli.
// Halaman Pembuka di paling depan sebagai meta-intro ruangan ini.
export const ARSIP_STORY_ORDER = [
  'halaman-pembuka',       // intro ruangan ini (focal di meja)
  'anak-pohon',            // masa TK (childhood)
  'bukan-kolonial',        // adult introvert (continuation)
  'sebelum-panggung',      // pre-JKT48
  'culture-shock',         // adaptasi Bandung→Jakarta
  'jaipong-akar',          // bahasa tubuh Sundanese
  'asal-nama',             // identitas (Helisma + Ceu Eli)
  'vocal-bertanya',        // professionalism (cara bertanya)
  'stay-in-place',         // backstage discipline
  'fangirl-dewasa',        // perspektif fan changing
  'tas-tiga-kilo',         // self-reliance / hidup sendiri
  'revenge-2023',          // reclaim performer pride
  'panggung-kecil',        // industry reality (mature)
  'pengangguran-dananya',  // escapist dream (closing)
];

export const ARSIP_BOOKS = [
  {
    id: 'halaman-pembuka',
    title: 'Tentang Ruangan Ini',
    eyebrow: 'Pengantar · Arsip Ingatan',
    category: CATEGORIES.REFLEKSI,
    era: null,
    source: 'Armeniaca',
    rakSlot: RAK_SLOTS.MEJA,
    unlockTier: UNLOCK_TIERS.DROUGHT,
    spineColor: '#8B4040',
    preview:
      'Sebelum kamu mulai baca yang lain, pahami dulu kenapa ruangan ini ada.',
    getBody: () => ({
      type: 'prose-story',
      paragraphs: [
        'Selamat datang di Arsip Ingatan. Sebelum kamu mulai baca buku-buku lain di ruangan ini, baca yang ini dulu — untuk paham kenapa ruangan ini ada.',
        'Arsip Ingatan adalah ruang khusus untuk cerita-cerita Eli yang TIDAK ditampilkan di tempat lain di project Armeniaca. Di Konstelasi Perjalanan ada milestone karier yang sudah dikenal banyak orang. Di Profil ada data dasar. Di Pohon Kebaikan ada aksi kebaikan. Di About ada cerita Armeniaca sebagai project itu sendiri.',
        'Tapi Eli yang sebenarnya — bukan Eli yang ada di press release, bukan Eli yang ada di profile box — adalah orang yang punya cerita di luar semua itu. Cerita pohon yang dipanjat saat TK. Cerita teknik elektro yang ditinggalkan. Cerita Jaipong yang bocor ke koreografi JKT48. Cerita "vocal" yang bukan oposisi tapi cara dia bertanya. Cerita-cerita yang dia bagikan secara organik di livestream, di interview, di obrolan dengan fans.',
        'Inilah yang Arsip Ingatan kumpulkan. Cerita-cerita kecil yang gak banyak dibahas, tapi yang membuatnya kerasa lebih utuh sebagai manusia. Tiap buku di rak adalah satu cerita panjang — bukan rangkuman, bukan list bullet, tapi narasi yang dirajut dari kalimat-kalimat yang Eli sendiri keluarkan.',
        'Konten di sini gak duplikat dengan apa pun di project. Kalau kamu udah baca milestone karier di Konstelasi, di sini kamu akan menemukan apa yang TIDAK ada di sana. Kalau kamu udah lihat fakta profil, di sini kamu temui cerita di balik fakta itu.',
        'Tiap buku interactive punya indicator orb gold mengambang di atasnya — itu tanda buku yang bisa dibuka. Buku yang gak punya indicator hanya visual filler, gak ada cerita di dalamnya. Cari titik cahaya, klik bukunya, baca pelan-pelan.',
        'Ada urutan baca yang disarankan — dari masa kecil ke perjalanan dewasa, lewat persimpangan-persimpangan yang membentuk dia. Tapi gak harus berurutan. Pilih buku yang resonance dengan kamu, baca dengan cara kamu.',
        'Inilah yang tersisa dari apa yang tidak boleh hilang. Sebagian rak masih berdiri. Sebagian halaman masih bisa dibaca. Silakan.',
        'Yang lebih penting daripada menyelesaikan semua buku adalah menemukan satu yang membuatmu lebih kenal Eli sebagai manusia. Karena pada akhirnya, itulah tujuan Arsip Ingatan ada.',
      ],
    }),
  },
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
    id: 'bukan-kolonial',
    title: 'Bukan Kolonial — Eli yang Lebih Tenang dari Bayangan',
    eyebrow: 'Cerita · Diam yang Sebenarnya',
    category: CATEGORIES.REFLEKSI,
    era: null,
    source: 'Eli IDN Live · curated by Armeniaca',
    rakSlot: RAK_SLOTS.NE,
    unlockTier: UNLOCK_TIERS.DROUGHT,
    spineColor: '#4a5a68',
    preview:
      'Aktif di panggung bukan default-nya. Di backstage, dia memilih sunyi.',
    getBody: () => ({
      type: 'prose-story',
      paragraphs: [
        'Ada cerita yang seringkali tidak terlihat dari panggung. Eli yang fans kenal — yang aktif, yang random, yang penuh energi — ternyata hanya satu sisi dari dirinya.',
        'Pernah Eli buka secara terbuka di livestreamnya: sebenarnya, di belakang panggung dia bisa banget jauh lebih tenang. Lebih observant. Lebih dalam mode yang gak orang lihat di Theater atau di MV.',
        '"Aktif" yang fans lihat di panggung bukan bohong — itu beneran dia. Tapi itu juga bukan default-nya. Dia bisa "random" karena memang ada bagian dari kepribadiannya yang playful dan spontan. Tapi itu muncul, bukan terus-menerus dia tampilkan.',
        'Di JKT48, ada istilah internal: "kolonial." Member yang selalu bergerak dalam rombongan, selalu hangout, selalu ada di tempat yang ramai. Yang antusias-nya tetap ke kerumunan. Eli mengakui — dia bukan tipe itu.',
        'Dia lebih nyaman dengan dirinya sendiri. Lebih cocok dipanggil loner — bukan dalam arti negatif yang menjauhkan dari orang lain, tapi dalam arti yang lebih sederhana: dia bisa menikmati keberadaannya sendiri tanpa butuh kerumunan.',
        'Mungkin ini terasa familiar buat anak yang dulu naik pohon di TK. Kepribadian itu gak berubah jauh. Yang berubah adalah konteks: dulu pohon dan area pasir di bawah perosotan, sekarang sudut backstage atau kamar dressing yang sepi.',
        'Tidak ada yang lebih atau kurang sah antara "aktif di panggung" dan "tenang di belakang." Keduanya bagian dari satu orang yang sama. Eli yang di panggung melakukan tugasnya sebagai performer dengan semua energi yang dia bawa. Eli yang di backstage memberi dirinya ruang untuk pulih, untuk diam, untuk jadi dirinya sendiri.',
        'Mungkin itu juga yang bikin energi panggungnya berkualitas. Bukan dipaksakan dari kosong, tapi dipanggil dari ruang yang dia jaga dengan tenang.',
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
    id: 'culture-shock',
    title: 'Aku-Kamu di Tengah Gue-Elo',
    eyebrow: 'Cerita · Pindah ke Jakarta',
    category: CATEGORIES.REFLEKSI,
    era: null,
    source: 'Eli IDN Live · curated by Armeniaca',
    rakSlot: RAK_SLOTS.NE,
    unlockTier: UNLOCK_TIERS.DROUGHT,
    spineColor: '#7a5840',
    preview:
      'Klakson sopan, salim ke semua orang, dan kata ganti yang bikin bingung di kota baru.',
    getBody: () => ({
      type: 'prose-story',
      paragraphs: [
        'Pindah dari Bandung ke Jakarta bukan cuma perpindahan kota. Itu perpindahan budaya yang kecil-kecil tapi terus-menerus. Eli pernah cerita tentang kejutan-kejutan yang dia alami di awal.',
        'Bahasa, untuk satu. Di Bandung, dia tumbuh dengan "aku-kamu" — pasangan kata ganti yang sopan, akrab tapi gak terlalu kasar. Wajar dipakai dengan teman, dengan keluarga, dengan siapa saja yang dia kenal. Tapi di Jakarta, dia disambut dengan reaksi aneh saat pakai "aku-kamu." Norma sosial di sini "gue-elo" — kata ganti yang lebih kasual, sedikit lebih kasar di telinga orang luar. Setiap kali dia bilang "aku," ada yang reaksinya heran. Setiap kali dia bilang "kamu," ada yang ngerasa terlalu formal.',
        'Lalu klakson. Di Bandung, klakson dipakai sebagai sapaan tetangga, tanda kecil yang akrab. Lewat depan rumah teman, sapa pakai klakson. Di Jakarta, klakson adalah bahasa ketidaksabaran. Setiap lampu merah berubah hijau, sebelum mobil di depan bahkan sempat ngegas, klakson sudah berbunyi. Dan bukan satu kali. Berkali-kali, dari mobil yang berbeda, dari arah yang berbeda. Bandung yang santai vs Jakarta yang buru-buru.',
        'Salim — tradisi cium tangan ke orang yang lebih tua sebagai bentuk hormat. Di Bandung, ini lazim. Eli melakukannya ke siapa saja yang dia anggap lebih tua atau lebih senior. Tapi di Jakarta, kebiasaan ini malah kadang dianggap "caper" — cari perhatian. Sopan santun yang di tempat asalnya wajar, di tempat baru dianggap pretensius.',
        'Plus hal-hal kecil lain. Cara orang Jakarta lebih kasual dalam hal pinjam barang — kadang tanpa nanya dulu. Itu hal yang asing buat etika hidupnya yang dibesarkan di Bandung.',
        'Tapi ini bukan cerita keluhan. Bukan "Jakarta jelek, Bandung lebih baik." Ini cerita tentang adaptasi yang sederhana, tapi yang bikin orang bertumbuh.',
        'Eli belajar pelan-pelan. "Gue-elo" dia adopsi untuk percakapan kasual. Klakson Jakarta dia terima sebagai bahasa kota besar. Salim dia kurangi di setting tertentu — bukan menghilang, tapi disesuaikan dengan konteks.',
        'Pelan-pelan, Bandung di dalam dirinya tetap ada — tapi sekarang ditemani Jakarta yang dia kenal lewat tinggal di sini bertahun-tahun. Dua budaya yang dia bawa, dengan caranya sendiri menemukan damai di tubuh yang sama.',
        'Mungkin itu juga sebabnya banyak fans yang merasa dekat dengan dia. Karena ada bagian dari Eli yang masih "aku-kamu," masih sapa-tetangga, masih salim ke siapa saja. Hometown yang gak hilang walau pindah, akar yang tetap di tanah walaupun cabangnya tumbuh ke arah yang lain.',
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
    id: 'vocal-bertanya',
    title: 'Vocal — Tapi Bukan Tipe yang Membantah',
    eyebrow: 'Cerita · Cara Bertanya',
    category: CATEGORIES.REFLEKSI,
    era: null,
    source: 'Eli IDN Live · curated by Armeniaca',
    rakSlot: RAK_SLOTS.NE,
    unlockTier: UNLOCK_TIERS.DROUGHT,
    spineColor: '#a08858',
    preview:
      'Dia dikenal "vocal" — bukan karena melawan, tapi karena butuh ngerti "kenapa."',
    getBody: () => ({
      type: 'prose-story',
      paragraphs: [
        'Ada label tertentu yang melekat ke Eli di kalangan member dan fans: "vocal." Kata yang bisa diartikan positif (berani bicara) atau negatif (susah diatur), tergantung sudut pandang. Eli pernah membicarain hal ini sendiri.',
        'Sebagai senior member JKT48, Eli memang dikenal sebagai member yang sering bertanya. Tentang keputusan manajemen, tentang arahan, tentang sistem yang dia gak fully paham. Tapi dia sendiri klarifikasi — labelnya "vocal" bukan berarti dia tipe oposisi.',
        'Bukan dia mau melawan setiap keputusan. Bukan dia menolak instruksi. Trait dasarnya adalah: dia butuh ngerti "kenapa" dan "gimana" dari awal sampai akhir.',
        'Kalau ada arahan baru, dia mau tahu reasoning di belakangnya. Kalau ada perubahan formasi, dia mau ngerti logika-nya. Kalau ada perubahan policy, dia mau lihat full picture-nya. Bukan untuk membantah — untuk memahami.',
        'Buat dia, ini cara untuk bisa committed dengan tulus. Lebih mudah mengerjakan sesuatu kalau lo ngerti kenapa lo melakukannya. Member yang tahu reasoning di belakang instruksi akan execute dengan lebih baik daripada member yang sekadar nurut.',
        'Eli mengakui — ini lebih sering terjadi di angkatan senior sekarang. Member-member junior dulu mungkin lebih jarang nanya, lebih nurut saja. Tapi senior member yang sudah lama di industri ini, dengan pengalaman bertahun-tahun, lebih natural mempertanyakan.',
        'Yang penting: Eli pilih untuk mengarahkan kekhawatiran dan feedback-nya langsung ke pihak manajemen — ke Om Jot, ke orang yang berwenang. Bukan ke fans di public. Bukan ke sosmed yang viral. Bukan ke ranjau-ranjau drama.',
        'Ini adalah professionalisme yang dewasa. Punya pertanyaan? Tanya. Punya feedback? Sampaikan. Tapi sampaikan ke orang yang bisa menjawab atau yang bisa mengubah. Bukan ke kerumunan yang akan reinforcing emosi tanpa solusi.',
        '"Vocal" yang seperti ini bukan attack vector. Ini cara dewasa untuk tetap terlibat dengan profesional di industri yang kadang terasa opaque. Eli yang vocal adalah Eli yang mau ngerti, mau improve, mau jadi member yang execute dengan informed consent — bukan sekadar mesin yang nurut.',
        'Mungkin itulah perbedaan antara "complaining" dan "asking questions for clarity." Yang pertama berhenti di emosi. Yang kedua bergerak ke solusi. Eli memilih yang kedua.',
      ],
    }),
  },
  {
    id: 'tas-tiga-kilo',
    title: 'Tiga Kilogram Kemandirian',
    eyebrow: 'Cerita · Hidup Sendiri',
    category: CATEGORIES.REFLEKSI,
    era: null,
    source: 'Eli IDN Live · curated by Armeniaca',
    rakSlot: RAK_SLOTS.NE,
    unlockTier: UNLOCK_TIERS.DROUGHT,
    spineColor: '#6a7868',
    preview:
      'Tas berat 3kg berisi survival kit lengkap. Karena dia tahu, gak ada yang akan siapin selain dia sendiri.',
    getBody: () => ({
      type: 'prose-story',
      paragraphs: [
        'Eli pernah cerita tentang isi tasnya. Bukan tas glamor brand mewah — tasnya berisi sesuatu yang lebih praktis. Sebuah "survival kit" yang menurut dia sendiri beratnya bisa sampai 3 kilogram.',
        'Apa isinya? Obat-obatan berbagai macam. Vitamin. Acne patches. Skincare. Setiap kategori health & wellness yang mungkin dia butuh dalam sehari.',
        'Bukan paranoia. Ini cara Eli mengatasi salah satu realita hidupnya: dia tinggal sendiri.',
        'Hidup sendiri di Jakarta sebagai mahasiswi dan idol berarti gak ada keluarga di rumah yang ngingetin minum vitamin. Gak ada ibu yang siapin obat saat tiba-tiba pusing. Gak ada saudara yang punya stok medkit di laci. Kalau dia gak siapin sendiri, gak ada yang siap untuknya.',
        'Jadi dia siapin sendiri. Tas yang berat itu adalah konsekuensi dari kemandirian. Tiga kilogram bukan sekadar berat fisik — itu bobot tanggung jawab atas dirinya sendiri.',
        'Eli punya philosophy tertentu soal ini. Dia gak suka rely heavily ke orang lain. Bukan karena dia gak percaya orang — tapi karena dia tahu pikiran dan situasi manusia tidak bisa diprediksi. Orang bisa lupa. Orang bisa berhalangan. Orang bisa berubah pikiran.',
        'Lebih aman kalau dia jaga dirinya sendiri. Lebih sustainable. Lebih sederhana. Bawa supplies sendiri, dan dia bisa handle apa pun yang muncul.',
        'Ada poin yang menarik di filosofi ini. Bagi orang luar yang lihat Eli sebagai idol dengan tim besar di JKT48 — mungkin terkesan dia punya banyak support system. Tapi support system di pekerjaan bukan support system di hidup pribadi. Saat dia pulang ke kamar kost dengan kepala pusing jam 11 malam, yang ada di sekelilingnya cuma tasnya. Dan tasnya yang berisi 3 kilogram persiapan adalah yang menyelamatkan.',
        'Mungkin ini juga bentuk dari kepribadian yang sama yang muncul di anak-pohon dan bukan-kolonial: dia bisa berdiri sendiri. Dia gak takut akan kebersamaan, tapi dia juga tahu dia bisa selesaikan banyak hal tanpa harus minta tolong terus-menerus.',
        'Tiga kilogram kemandirian. Itu bukan beban — itu kebebasan.',
      ],
    }),
  },
  {
    id: 'fangirl-dewasa',
    title: 'Bintang yang Pernah Jauh, Sekarang Sebelah Meja',
    eyebrow: 'Cerita · Perspektif Fan',
    category: CATEGORIES.REFLEKSI,
    era: null,
    source: 'Eli IDN Live · curated by Armeniaca',
    rakSlot: RAK_SLOTS.NE,
    unlockTier: UNLOCK_TIERS.DROUGHT,
    spineColor: '#3a4858',
    preview:
      'Dia hilang spark fangirling. Kecuali untuk NCT 127.',
    getBody: () => ({
      type: 'prose-story',
      paragraphs: [
        'Sebagai fan K-Pop sejak lama, Eli punya sisi yang familiar buat banyak orang: pernah dia juga jadi fangirl. Mata bersinar saat lihat idol favorit, jantung berdebar di MV release, hidup penuh oleh jadwal "comeback."',
        'Tapi waktu berjalan. Eli sekarang bukan cuma fan — dia juga ada di industri ini. Member JKT48, bertahun-tahun. Tahu rasanya backstage, tahu rasanya promosi single, tahu rasanya nyiapin choreography sampai larut malam.',
        'Dan dengan pengetahuan itu, ada sesuatu yang berubah.',
        'Idol yang dulu kerasa jauh, sekarang gak sejauh itu. Bukan karena dia gak appreciate karya mereka — tapi karena dia tahu sekarang gimana karya itu dibuat. Bisa lihat behind-the-scenes proses. Bisa bayangkan choreography practice, vocal coach session, comeback prep yang melelahkan.',
        'Pernah dia kebetulan ketemu beberapa idol di setting di luar panggung — entah event entertainment, atau di sela acara TV, atau di tempat-tempat industri. Dan saat lihat mereka tanpa makeup pekat, tanpa lighting studio, tanpa choreography — mereka cuma orang biasa. Manusia yang capek, manusia yang ada masalahnya sendiri, manusia yang sama-sama bekerja keras seperti dia.',
        'Insight ini bikin "spark" fangirling dia berubah. Bukan hilang sepenuhnya — tapi maturing. Dari "wow, mereka super-human!" jadi "wow, mereka super-talented dan super-keras-kerja, tapi tetap manusia."',
        'Tapi ada satu pengecualian yang masih bikin dia bersinar: NCT 127. Sampai sekarang, dia masih merasa "spark" itu untuk musik dan karya mereka. Mungkin karena Jaehyun bias yang udah lama. Mungkin karena musik NCT 127 secara objektif memang nyentuh telinga Eli yang sudah tuned ke industri ini. Apapun alasannya — ada satu grup yang masih bisa nge-trigger reaksi fan-mode lama dia.',
        'Mungkin itu juga sebabnya cerita ini relatable. Sebagai pekerja di industri, dia gak naif lagi. Tapi sebagai manusia yang masih punya selera musik dan apresiasi pada karya — dia masih bisa jatuh cinta sama sesuatu yang luar biasa.',
        'Tidak ada yang lebih dewasa daripada bisa appreciate sesuatu tanpa harus naif. Idol bukan lagi figur ideal yang tidak tersentuh, tapi karya yang bagus tetap karya yang bagus. NCT 127 yang bagus tetap NCT 127 yang bagus. Dan Eli yang sekarang bisa lihat dua sisi itu sekaligus.',
      ],
    }),
  },
  {
    id: 'stay-in-place',
    title: 'Stay in Place — Sudut yang Ditugaskan',
    eyebrow: 'Cerita · Backstage Discipline',
    category: CATEGORIES.REFLEKSI,
    era: null,
    source: 'Eli IDN Live · curated by Armeniaca',
    rakSlot: RAK_SLOTS.NE,
    unlockTier: UNLOCK_TIERS.DROUGHT,
    spineColor: '#5a6878',
    preview:
      'Setelah make-up siap, member-member JKT48 wajib diam di satu sudut.',
    getBody: () => ({
      type: 'prose-story',
      paragraphs: [
        'Ada peraturan tak tertulis yang jarang dibahas tentang JKT48 backstage. Eli pernah cerita: setelah member tiba di tempat event, ada protokol disiplin yang harus diikuti.',
        'Bayangkan: jam 18.30 atau sekitarnya, member-member JKT48 sampai di venue acara. Bukan langsung tampil. Pertama-tama, mereka ke ruang dressing untuk make-up dan hair styling. Itu rutinitas standar.',
        'Tapi setelah make-up dan rambut siap, ada satu instruksi tersirat: stay in place. Tetap di satu spot. Jangan jalan-jalan, jangan keliling venue, jangan mingling dengan orang-orang di area lain.',
        'Eli describe pengalaman ini sebagai "caged" — seperti dikurung di satu area. Mereka gak boleh wander off. Gak boleh pindah-pindah antar area venue. Ada sudut tertentu yang ditetapkan untuk mereka, dan di situlah mereka menunggu sampai giliran tampil.',
        'Buat orang yang belum kenal industri ini, mungkin kedengarannya restriktif. Tapi Eli jelaskan dengan sederhana — ini ada alasannya.',
        'Pertama, logistik. Mengatur grup besar performer butuh struktur. Kalau setiap member jalan-jalan kemana mereka mau, manajemen susah ngumpulin mereka pas waktunya tampil. Stay in place = standby siap dipanggil.',
        'Kedua, energi. Member-member JKT48 sering punya jadwal yang back-to-back. Sebelum event tertentu, mereka mungkin udah baru pulang dari theater atau acara lain. Mingling, jalan-jalan, ngobrol panjang dengan banyak orang — itu menghabiskan energi yang sudah tipis. Lebih bijak menyimpan energi untuk panggung.',
        'Jadi yang fans lihat sebagai "energi tinggi di panggung" itu hasil dari disiplin diam di backstage. Bukan kebetulan, bukan natural-state. Disiplin yang sengaja, dengan tujuan yang jelas: tampil maksimal saat waktunya.',
        'Mungkin ini juga sebabnya beberapa member kerasa sangat "on" saat panggung, dan sangat "off" di sela-sela. Bukan dua-muka — itu profesionalisme. Energi yang dijaga, dipanggil keluar pas dibutuhkan, lalu disimpan kembali.',
      ],
    }),
  },
  {
    id: 'revenge-2023',
    title: 'Revenge 2023 — Cara Eli Kembali ke Panggung',
    eyebrow: 'Cerita · Bangkit',
    category: CATEGORIES.REFLEKSI,
    era: null,
    source: 'Eli IDN Live · curated by Armeniaca',
    rakSlot: RAK_SLOTS.NE,
    unlockTier: UNLOCK_TIERS.DROUGHT,
    spineColor: '#5a4858',
    preview:
      'Sakit, Changmin TVXQ, revenge — perjalanan reclaim pride sebagai performer.',
    getBody: () => ({
      type: 'prose-story',
      paragraphs: [
        'Tahun 2022 bukan tahun yang mudah untuk Eli. Ada periode di mana dia hadapi struggle kesehatan fisik — kondisi yang sempat menjauhkannya dari panggung untuk beberapa waktu.',
        'Untuk performer, gak bisa tampil bukan cuma soal jadwal yang kosong. Itu soal identitas. Bertahun-tahun Eli adalah performer — orang yang punya pride sebagai sosok di atas panggung, orang yang punya peran sebagai pelaku acara. Saat tubuh memaksa dia untuk berhenti, sebagian identitasnya juga ikut tertunda.',
        'Kembali ke panggung pun bukan hanya soal kembali bisa dance. Eli pernah bilang — buatnya, return to stage adalah reclaim pride. Reclaim professional identity. Memungkinkan dia kembali jadi diri yang dia kenali.',
        'Lalu ada momen yang dia ingat dengan jelas: Juli 2022. Saat itu dia nonton penampilan Changmin dari TVXQ. Bukan sekadar nonton, tapi merasakan sesuatu yang sudah lama tidak dia rasakan — keinginan untuk jadi "stage performer" lagi. Bukan member yang sekadar "going through the motions," tapi performer yang punya energy dan stage presence yang dia akui pernah hilang.',
        'Changmin yang menonjol itu — dia adalah trigger. Dia adalah cermin yang bilang ke Eli: "Lo punya kapasitas untuk itu. Lo udah lupa, tapi lo punya."',
        'Dari titik itu, Eli pelan-pelan bangun kembali. Dia bilang dia pakai struggle yang dia lewati sebagai bahan untuk build mental state yang lebih stabil. Bukan ignore lukanya, tapi pakai sebagai foundation untuk grow.',
        'Dan dia frame 2023 sebagai "revenge" — bukan revenge ke orang lain, tapi revenge ke versi dirinya yang sempat tertunda. Goal-nya: prove ke dirinya sendiri kalau dia bisa kembali ke level performance yang dia hargai. Bukan untuk dilihat orang lain, bukan untuk klaim sesuatu — untuk kepuasan internal-nya sendiri.',
        'Ada satu lagi insight yang Eli share, sebagai fan yang dulu menonton concert: dia tahu rasanya. Dan dia bilang — yang paling menyenangkan dari concert bukan interaksi individual dengan artist. Tapi "vibe" kolektif yang muncul saat banyak orang berkumpul untuk apresiasi karya yang sama.',
        'Itu juga sebabnya sebagai performer dia gak fokus ke pressure dari fan interaction. Karena dia tahu dari sisi fan, yang dinikmati adalah seni-nya, atmosfir-nya, momen-nya. Bukan pressure dari setiap individual interaction yang dia bawa.',
        'Jadi gabungan dari semua itu — pulih dari sakit, kebakar lagi sama Changmin, revenge personal di 2023, dan perspective sebagai fan tentang concert — bikin Eli yang sekarang lebih grounded. Bukan performer yang naik karena ambisi. Performer yang naik karena dia pilih untuk naik, untuk dirinya sendiri.',
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
  {
    id: 'pengangguran-dananya',
    title: 'Pengangguran yang Banyak Dananya',
    eyebrow: 'Cerita · Mimpi Sederhana',
    category: CATEGORIES.REFLEKSI,
    era: null,
    source: 'Eli IDN Live · curated by Armeniaca',
    rakSlot: RAK_SLOTS.NE,
    unlockTier: UNLOCK_TIERS.DROUGHT,
    spineColor: '#6a8868',
    preview:
      'Saldo unlimited, keliling dunia lihat hewan. Mimpi yang menjaga kewarasannya.',
    getBody: () => ({
      type: 'prose-story',
      paragraphs: [
        'Setelah obrolan tentang industri yang melelahkan, Eli pernah bicara soal "mimpi"-nya — mimpi yang berbeda dari ambisi karier idol pada umumnya.',
        '"Pengangguran yang banyak dananya." Kalimat lucu, tapi serius juga di baliknya. Eli mengakui dia ingin jadi pengangguran — bukan pengangguran yang susah, tapi pengangguran yang punya saldo unlimited. Bisa rehat, bisa santai, tanpa harus mikirin jadwal kerja besok.',
        'Sebagai member JKT48 selama bertahun-tahun, Eli tahu rasanya hidup dengan kalender yang penuh: theater show, latihan choreography, vocal coach, event, live stream, MnG, photoshoot single, comeback prep. Energi yang luar biasa harus terus dipanggil keluar.',
        'Mimpinya bukan ambisi besar tentang ladder karier. Bukan "saya ingin jadi sentral terus." Bukan "saya ingin populer setinggi-tingginya." Mimpinya, dengan jujur, lebih sederhana: hidup tenang dengan finansial yang aman, tanpa beban kerja.',
        'Dan dengan saldo unlimited itu, dia mau apa? Keliling dunia. Tapi bukan untuk wisata mewah atau pemandangan ikonik. Eli ingin keliling dunia khusus untuk lihat hewan. Singa di Afrika, panda di China, koala di Australia, paus di Atlantik. Hewan yang gak bisa dia temui dalam kehidupan sehari-hari.',
        'Cinta dia ke hewan bukan rahasia — di profilnya tertulis dia punya kucing peliharaan. Tapi mimpi keliling dunia untuk lihat hewan-hewan yang jauh menambahkan satu lapisan lagi: ingin tahu, ingin melihat, ingin merasakan dunia yang berisi lebih dari sekadar manusia dan jadwal kerja.',
        'Sebenarnya ini bukan mimpi escapist murni. Ini cara Eli menjaga kewarasan. Bisa membayangkan masa depan yang lebih tenang membuat masa sekarang yang penuh kerja jadi lebih bisa dihadapi. Mimpi ini berfungsi seperti pulang ke rumah — tempat yang dia bisa kunjungi secara mental sambil ngerjain hal di realita.',
        'Jadi setiap kali Eli kerja keras di panggung, di backstage, di studio — ada bagian dari dirinya yang masih menyimpan mimpi sederhana itu. Mimpi tentang hari di mana dia bisa leha-leha, lihat hewan, tanpa jadwal yang mengejar.',
        'Mungkin itulah mimpi yang paling jujur. Bukan ingin lebih banyak. Tapi ingin cukup untuk bisa diam dan menikmati.',
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
