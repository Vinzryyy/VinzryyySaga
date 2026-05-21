/**
 * Arme — warga terakhir ArmeniacaTown.
 *
 * Dialog catalog: setiap entry = satu "topik" yang bisa di-trigger
 * otomatis (welcome/milestone/return/event) dan di-replay manual dari
 * drawer mascot. Tiap line di `lines[]` = satu speech bubble (di-stage
 * BUBBLE_AUTO_ADVANCE_MS).
 *
 * Audio (opsional): `audio[i]` parallel ke `lines[i]`. Kalau null/undefined
 * → text-only fallback (timer). Kalau ada path → play wav, advance ke
 * line berikutnya pas audio `ended`. Voice file di /public/AI/ pakai
 * legacy "N. CAPS.wav" naming dari sesi recording — encodeURI() handle
 * spasi tanpa rename file.
 *
 * Trigger types:
 *   - 'welcome'             — fire sekali, first Arme encounter
 *   - 'count-cross' { at }  — fire saat armeniacaCount nyebrang `at`
 *   - 'returning' { daysGte, daysLte?, requiresGrowth? }
 *                           — fire saat user balik setelah daysGte hari
 *   - 'date-match' { iso }  — fire saat tanggal hari ini == iso
 *   - 'event' { event, once? }
 *                           — fire dari window.dispatchEvent('arme:trigger', ...)
 *
 * Status (di localStorage 'armeniaca-arme' under heard[id].status):
 *   - 'heard'      — pernah di-play sampe selesai
 *   - 'pre-crossed' — count udah lewat saat first-visit (skipped, tapi
 *                     bisa di-replay dari drawer)
 */

const AI = (filename) => `/AI/${encodeURI(filename)}`;

export const ARME_CATEGORIES = {
  sambutan: { label: 'Sambutan', order: 1 },
  petakBuka: { label: 'Petak Mulai Buka', order: 2 },
  petakPulih: { label: 'Petak Pulih', order: 3 },
  airMancur: { label: 'Air Mancur Plaza', order: 4 },
  besar: { label: 'Momen Besar', order: 5 },
  balik: { label: 'Saat Kamu Balik', order: 6 },
  bonus: { label: 'Cerita Lain', order: 7 },
};

export const ARME_DIALOGS = [
  // ── Sambutan ──────────────────────────────────────────────────────
  {
    id: 'welcome',
    category: 'sambutan',
    label: 'Selamat datang ke ArmeniacaTown',
    cinematic: true,
    trigger: { type: 'welcome' },
    lines: [
      'Arme adalah warga terakhir. ArmeniacaTown.',
      'Warga lain udah pergi nyelametin diri pas kotanya kering.',
      'Dia nungguin di sini, kalau ada yang nyariin tempat ini lagi.',
    ],
    audio: [
      AI('1. ARME ADALAH WARGA TERAKHIR DI ARMENIACA TOWN.wav'),
      AI('2. WARGA LAIN UDAH PERGI NYELAMETIN DIRI PAS KOTANYA KERING.wav'),
      AI('3. DIA NUNGGIN DISINI, KALAU ADA YANG NYARIIN TEMPAT INI LAGI..wav'),
    ],
  },

  // ── Petak Mulai Buka (drought state) ──────────────────────────────
  {
    id: 'r4-unlock',
    category: 'petakBuka',
    label: 'Lonceng Menara Jam terdengar',
    trigger: { type: 'count-cross', at: 3000 },
    lines: [
      'Eh, denger lonceng tadi?',
      'Menara Jam di utara itu nyala lagi.',
      'Udah lama gak ada yang mukul jam itu.',
      'Aku sampe lupa bunyinya.',
    ],
    audio: [
      AI('4. EH DENGER LONCENG TADI.wav'),
      AI('5. MENARA JAM DI UTARA ITU MENYALA LAGI.wav'),
      AI('6. UDAH LAMA GAK ADA YANG MUKUL JAM ITU.wav'),
      AI('7. AKU SAMPE LUPA BUNYI NYA.wav'),
    ],
  },
  {
    id: 'r3-unlock',
    category: 'petakBuka',
    label: 'Tetes pertama di Telaga',
    trigger: { type: 'count-cross', at: 4000 },
    lines: [
      'Telaga di timur tetes air pertamanya.',
      'Dulu orang dateng ke situ buat menitipkan harapan mereka.',
      'Dan sekarang…',
      'Siapa orang pertama yang mau menitipkan harapan di telaga itu lagi ya?',
    ],
    audio: [
      AI('8. TELAGA DI TIMUR TETES AIR PERTAMA NYA.wav'),
      AI('9. DULU ORANG DATANG KE SITU BUAT MENITIPKAN HARAPAN MEREKA.wav'),
      AI('10. DAN SEKARANG.wav'),
      AI('11. SIAPA ORANG PERTAMA YANG MENITIPKAN HARAPAN DI TELAGA ITU LAGI YA.wav'),
    ],
  },
  {
    id: 'r5-unlock',
    category: 'petakBuka',
    label: 'Panggung Terbuka disapu',
    trigger: { type: 'count-cross', at: 4500 },
    lines: [
      'Panggung di tenggara udah dibersihkan.',
      'Kursinya berjejer rapi, tetapi suasana masih sepi.',
      'Di sini dulu rame anak-anak bernyanyi riang gembira. Sekarang hanya angin sunyi berhembus.',
    ],
    audio: [
      AI('12. PANGGUNG DI TENGGARA SUDAH DI BERSIHKAN.wav'),
      AI('13. KURSI BERJEJER RAPI, TAPI SUASANA MASIH SEPI.wav'),
      AI('14. DISINI DULU RAME ANAK-ANAK BERNYANYI RIANG GEMBIRA, SEKARANG HANYA ANGIN SUNYI BERHEMBUS.wav'),
    ],
  },
  {
    id: 'r2-unlock',
    category: 'petakBuka',
    label: 'Perpustakaan dibuka pintunya',
    trigger: { type: 'count-cross', at: 5000 },
    lines: [
      'Perpustakaan di barat pintunya mulai terbuka.',
      'Rak buku masih banyak yang kosong.',
      'Tapi rak buku satu per satu sudah mulai terisi dengan yang baru.',
    ],
    audio: [
      AI("15. PERPUSTAKAAN DI BARAT, PINTUNYA MULAI TERBUKA'.wav"),
      AI('16. RAK BUKU MASIH BANYAK YANG KOSONG.wav'),
      AI('17. TAPI RAK BUKU 1 PER 1 SUDAH MULAI TERISI DENGAN YANG BARU.wav'),
    ],
  },

  // ── Petak Pulih (restored state) ──────────────────────────────────
  {
    id: 'r1-restore',
    category: 'petakPulih',
    label: 'Lorong masuk dirapiin',
    trigger: { type: 'count-cross', at: 4000 },
    lines: [
      'Lorong di jalan masuk udah bersih.',
      'Jalan-jalan sudah diperbaiki, walau masih ada beberapa yang berlubang.',
      'Penduduk yang lewat pertama kali bakal mengira kota ini emang tidak pernah ditinggalin.',
    ],
    audio: [
      AI('18. LORONG DI JALAN MASUK UDAH TELAH BERSIH.wav'),
      AI('19. JALAN-JALAN SUDAH MULAI DI PERBAIKI, WALAU MASI ADA BEBERAPA YANG BERLUBANG.wav'),
      AI('20. PENDUDUK YANG LEWAT PERTAMA KALI, BAKAL MENGIRA KOTA INI EMANG TIDAK PERNAH DI TINGGALI.wav'),
    ],
  },
  {
    id: 'r4-restore',
    category: 'petakPulih',
    label: 'Menara Jam pas waktu lagi',
    trigger: { type: 'count-cross', at: 5000 },
    lines: [
      'Jarum jam Menara itu tetap berdetak.',
      'Dulu aku melihat jam itu untuk mengecek jadwal kereta kota ini.',
      'Sekarang…',
      'Kereta-nya tidak pernah jalan, tapi jamnya tetap jalan.',
      'Aneh ya.',
    ],
    audio: [
      AI('21. JARUM DI JAM MENARA ITU TETAP BERDETAK.wav'),
      AI('22. DULU AKU MELIHAT JAM ITU UNTUK MENGECEK JADWAL KERETA INI.wav'),
      AI('23. SEKARANG.wav'),
      AI('24. KERETANYA TIDAK PERNAH JALAN, TETAPI JAM NYA TETAP JALAN.wav'),
      AI('25. ANEH YAA.wav'),
    ],
  },
  {
    id: 'r3-restore',
    category: 'petakPulih',
    label: 'Telaga penuh, harapan keluar',
    trigger: { type: 'count-cross', at: 6000 },
    lines: [
      'Air di Telaga ini udah penuh.',
      'Aku iseng membaca harapan-harapan yang dititip orang dulu. Banyak pesan yang familiar.',
      'Mungkin sebagian dari kamu juga merasakan hal itu.',
    ],
    audio: [
      AI('26. AIR DI TELAGA INI UDAH PENUH.wav'),
      null,
      null,
    ],
  },
  {
    id: 'r5-restore',
    category: 'petakPulih',
    label: 'Orkes Armeniaca diputer lagi',
    trigger: { type: 'count-cross', at: 6500 },
    lines: [
      'Kamu pernah mendengar Orkes Armeniaca?',
      'Hmm, gak pernah ya.',
      'Pas kota pulih nanti, akan aku putar lagu yang dulu sering diputar di panggung ini.',
      'Mungkin kamu akan suka.',
    ],
  },
  {
    id: 'r2-restore',
    category: 'petakPulih',
    label: 'Perpustakaan keurus lagi',
    trigger: { type: 'count-cross', at: 7000 },
    lines: [
      'Perpustakaan mulai direnovasi lagi.',
      'Aku nemuin satu buku yang halaman terakhirnya kosong — kayak menunggu seseorang untuk menulis halaman itu.',
      'Mungkin kamu yang akan menulis.',
    ],
  },

  // ── Air Mancur Plaza (continuous tiers 0-6) ───────────────────────
  {
    id: 'am-t1',
    category: 'airMancur',
    label: 'Reruntuhan air mancur ditemuin',
    trigger: { type: 'count-cross', at: 2000 },
    lines: [
      'Plaza tengah terlihat banyak reruntuhan bangunan.',
      'Patung-patung banyak yang runtuh, tetapi masih bisa dibangun kembali.',
    ],
  },
  {
    id: 'am-t2',
    category: 'airMancur',
    label: 'Genangan tipis di basin',
    trigger: { type: 'count-cross', at: 3000 },
    lines: [
      'Lengan patung di air mancur balik nempel.',
      'Di dasar basin, genangan tipis pertama — refleksi langit pulang, walau sebentar.',
    ],
  },
  {
    id: 'am-t3',
    category: 'airMancur',
    label: 'Tetesan pertama dari patung',
    trigger: { type: 'count-cross', at: 4750 },
    lines: [
      'Air mancur menetes sedikit demi sedikit.',
      'Bukan mancur sih — tapi udah lebih dari kering.',
      'Air mulai inget jalan pulangnya.',
    ],
  },
  {
    id: 'am-t4',
    category: 'airMancur',
    label: 'Air mancur setengah pulih',
    trigger: { type: 'count-cross', at: 6000 },
    lines: [
      'Setiap tetesan air menciptakan riak di permukaan air.',
      'Plaza ini mulai terasa seperti tempat orang singgah dan menikmati keindahan kota.',
    ],
  },
  {
    id: 'am-t5',
    category: 'airMancur',
    label: 'Air mengalir penuh',
    trigger: { type: 'count-cross', at: 7500 },
    lines: [
      'Suara percikannya terdengar seperti suara orang berinteraksi satu dengan yang lain.',
      'Kota ini seperti ingin mengatakan sesuatu.',
    ],
  },
  {
    id: 'am-t6',
    category: 'airMancur',
    label: 'Empat kuncup aprikot di rim',
    trigger: { type: 'count-cross', at: 10000 },
    lines: [
      'Di pinggiran kolam air mancur tumbuh empat kuncup bunga aprikot.',
      'Akarnya berambat ke seluruh penjuru kota sama seperti Pohon lainnya.',
      'Kita harus menumbuhkan pohon tersebut.',
    ],
  },

  // ── Momen Besar (milestone non-petak) ─────────────────────────────
  {
    id: 'firstbloom',
    category: 'besar',
    label: 'Sprout pertama di jalan',
    trigger: { type: 'count-cross', at: 2500 },
    lines: [
      'Lihatlah ke jalan arah gerbang itu.',
      'Ada tanaman-tanaman kecil yang mulai tumbuh di sela batu — tanda kehidupan pertama yang mulai pulih.',
      'Walaupun hanya rumput kecil, tapi udah lama sejak tanaman hijau tumbuh terakhir di sini.',
    ],
  },
  {
    id: 'aula-reveal',
    category: 'besar',
    label: 'Aula Galeri di tengah kebuka',
    cinematic: true,
    // H-1 sebelum seitansai Eli (2026-06-15) — sync sama Galeri
    // Kebaikan offline CGV FX. Aula petak juga hidden di scene sampai
    // tanggal ini (lihat AulaLandmark gating di TamanPeta.jsx).
    trigger: { type: 'date-match', iso: '2026-06-14' },
    lines: [
      'Aula di tengah… pintunya bergerak sendiri tadi, apakah kamu melihatnya?',
      'Dulu sekelompok komunitas bernama "Helismiley" sering mengadakan pameran lukisan di sini.',
      'Perlahan tapi pasti, temboknya mulai terpajang lagi dengan lukisan-lukisan kebaikan.',
    ],
  },
  {
    id: 'purified',
    category: 'besar',
    label: 'Kota pulih sepenuhnya',
    cinematic: true,
    trigger: { type: 'count-cross', at: 7000 },
    lines: [
      'Kota terlihat sudah mulai pulih sepenuhnya.',
      'Pohon-pohon di tengah kota sudah mulai berbunga kembali.',
      'Tapi aneh ya, aku masih satu-satunya di sini.',
      'Mungkin yang lain masih butuh waktu balik. Atau mungkin mereka tidak akan kembali, tapi orang baru.',
      'Kayak kamu.',
    ],
  },
  {
    id: 'festival-prep',
    category: 'besar',
    label: 'Lampion dipasang sepanjang jalan',
    trigger: { type: 'count-cross', at: 8000 },
    lines: [
      'Ada yang masang string lampion sepanjang jalan.',
      'Aku gak liat siapa yang masang.',
      'Kota mulai siap-siap buat perayaan — pertama kali setelah bertahun-tahun.',
    ],
  },
  {
    id: 'festival-peak',
    category: 'besar',
    label: 'Perayaan puncak di alun-alun',
    cinematic: true,
    trigger: { type: 'count-cross', at: 9000 },
    lines: [
      'Mahkota bunga mulai berjatuhan dari pohon.',
      'Aku mendengar seperti ada orang yang menari di alun-alun, suasana kota mulai dipenuhi orang-orang.',
      'Festival udah di puncaknya.',
      'Semua orang berkumpul di alun-alun kota — ada warga kota yang kembali lagi, ada juga warga baru yang baru saja datang ke kota ini.',
    ],
  },
  {
    id: 'legacy',
    category: 'besar',
    label: 'Kota jadi monumen permanen',
    cinematic: true,
    trigger: { type: 'count-cross', at: 10000 },
    lines: [
      'Kota ini tidak cuma pulih — dia tumbuh jadi sesuatu yang dulu belum pernah ada.',
      'Pohon di tengah jadi monumen permanen.',
      'Sudah lama kita tidak bercerita satu sama lain.',
      'Aku tidak menyangka bisa bercerita sepanjang ini.',
    ],
  },

  // ── Gap-filler post-purified (7250 → 9700) ────────────────────────
  // Ngerespon ke visual baru: warga balik appear di 7500+, Pohon ring 4
  // di ~8200, ring 5 + light beams di ~9550. Semua non-cinematic
  // (corner mode), gak interrupt eksplorasi peta.
  {
    id: 'pohon-berbunga',
    category: 'besar',
    label: 'Pohon mulai berbunga lagi',
    trigger: { type: 'count-cross', at: 7250 },
    lines: [
      'Pohon yang tadinya kering dan layu…',
      'Sekarang bunganya perlahan-lahan muncul.',
      'Satu, dua, tiga, empat — ada banyak pokoknya.',
    ],
  },
  {
    id: 'sosok-pertama',
    category: 'besar',
    label: 'Sosok pertama di kejauhan',
    trigger: { type: 'count-cross', at: 7500 },
    lines: [
      'Eh, apakah kamu melihat ada seseorang di sana?',
      'Aku tidak tahu itu siapa, aku baru pertama kali melihat silhouette itu.',
      'Tapi udah lama juga tidak melihat ada orang yang lewat di luar area pohon tersebut.',
    ],
  },
  {
    id: 'sosok-balik',
    category: 'besar',
    label: 'Apakah dia balik?',
    trigger: { type: 'count-cross', at: 7750 },
    lines: [
      'Sosok misterius di balik bayang-bayang kini terlihat jelas ketika matahari mulai memindahkan sinarnya.',
      'Aku seperti déjà vu karena sosok itu, tapi tidak bisa memastikannya.',
      'Mungkin warga baru, mungkin angin yang berhembus aja.',
    ],
  },
  {
    id: 'aura-melebar',
    category: 'besar',
    label: 'Aura Pohon melebar',
    trigger: { type: 'count-cross', at: 8200 },
    lines: [
      'Sebuah cincin baru muncul di kaki Pohon.',
      'Terpancar auranya yang lebih terang dari yang kemarin.',
      'Sepertinya Pohon itu ingin mengatakan sesuatu.',
    ],
  },
  {
    id: 'lampu-pertama',
    category: 'besar',
    label: 'Lampu pertama nyala',
    trigger: { type: 'count-cross', at: 8500 },
    lines: [
      'Lampu pertama itu mulai menyala malam ini.',
      'Aku? Oh tidak, bukan aku yang menyalakan lampu itu.',
      'Mungkin ada yang menggunakan lampu tersebut.',
    ],
  },
  {
    id: 'nama-dipanggil',
    category: 'besar',
    label: 'Aku denger nama-ku',
    trigger: { type: 'count-cross', at: 9500 },
    lines: [
      'Aku mendengar namaku dipanggil di balik bayang-bayang dan dinginnya malam.',
      'Terdengar pelan, dan cuma terdengar sekali.',
      'Mungkin angin — tapi untuk kali ini sepertinya ada orang yang benar-benar memanggil namaku.',
    ],
  },
  {
    id: 'mercusuar',
    category: 'besar',
    label: 'Mercusuar Armeniaca',
    trigger: { type: 'count-cross', at: 9700 },
    lines: [
      'Pohon mulai memancarkan cahayanya.',
      'Dulu mereka menyebut Pohon ini "Mercusuar Armeniaca".',
      'Sekarang aku baru mengerti kenapa.',
    ],
  },

  // ── Saat Kamu Balik (returning visit) ─────────────────────────────
  {
    id: 'return-short',
    category: 'balik',
    label: 'Pulang singkat (3-7 hari)',
    trigger: { type: 'returning', daysGte: 3, daysLte: 13 },
    lines: [
      'Ehh, hai.',
      'Dirimu kembali lagi ke kota ini.',
      'Saat kamu pergi, Pohon ini tumbuh subur dan menghidupi kota ini.',
    ],
  },
  {
    id: 'return-long-growing',
    category: 'balik',
    label: 'Pulang lama, kota tumbuh',
    trigger: { type: 'returning', daysGte: 14, requiresGrowth: true },
    lines: [
      'Sudah lama tidak melihatmu, dan akhirnya kamu kembali.',
      'Sejak kamu pergi, kota ini melahirkan banyak kebaikan.',
      'Petak baru dan bangunan-bangunan baru juga sudah dibangun.',
      'Aku sempat mengira kamu keluar dari kota ini dan tidak akan kembali lagi.',
    ],
  },
  {
    id: 'return-long-stagnant',
    category: 'balik',
    label: 'Pulang lama, kota diem',
    trigger: { type: 'returning', daysGte: 14, requiresGrowth: false },
    lines: [
      'Lama gak liat.',
      'Kota masih kayak yang kamu tinggalin — tapi gak apa, kadang dia juga butuh istirahat.',
      'Pohon di tengah tetep nungguin.',
    ],
  },

  // ── Cerita Lain (bonus / event-driven) ────────────────────────────
  {
    id: 'bonus-pohon-click',
    category: 'bonus',
    label: 'Klik Pohon pertama kali',
    trigger: { type: 'event', event: 'pohon-click', once: true },
    lines: [
      'Pohon yang berada di tengah kota itu adalah pohon paling kuat di sini.',
      'Dia tahan terhadap cuaca apa pun.',
      'Cuaca panas terik dan kering dia lewati sampai sejauh ini.',
      'Mungkin karena dia tahu, bakal ada yang menyiram dan merawatnya.',
      'Dan sekarang sudah ada yang merawat pohon itu, yaitu warga kota ini.',
    ],
  },
  {
    id: 'bonus-seitansai',
    category: 'bonus',
    label: 'Hari seitansai Eli',
    cinematic: true,
    // Seitansai Eli = 2026-06-15 (canonical project birthday ISO,
    // sinkron dgn BirthdayMusic, ByuTitipan, siteConfig.eli.eventDateIso).
    trigger: { type: 'date-match', iso: '2026-06-15' },
    lines: [
      'Hari ini istimewa, ya.',
      'Pohon di tengah keliatan beda dari kemaren — kayak lagi nungguin sesuatu.',
      'Atau seseorang.',
    ],
  },
  {
    id: 'bonus-petak-first-pick',
    category: 'bonus',
    label: 'Pilih petak pertama (selain Pohon)',
    trigger: { type: 'event', event: 'petak-first-pick', once: true },
    lines: [
      'Oh, kamu penasaran petak atau bangunan itu?',
      'Pilihan menarik.',
      'Para pendatang baru perhatiannya biasa tertuju ke pohon besar itu.',
    ],
  },
  {
    id: 'bonus-dismiss-quick',
    category: 'bonus',
    label: 'Dismiss aku kecepetan',
    trigger: { type: 'event', event: 'dismiss-quick' },
    lines: [
      'Ya, silahkan explore sesukamu.',
      'Aku akan menunggu di sini jika kamu membutuhkanku.',
    ],
  },
  {
    id: 'bonus-idle',
    category: 'bonus',
    label: 'Diam terlalu lama',
    trigger: { type: 'event', event: 'idle' },
    lines: [
      'Pelan-pelan aja.',
      'Kota ini gak ke mana-mana.',
    ],
  },
];
