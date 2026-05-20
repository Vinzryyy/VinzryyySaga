/**
 * Arme — warga terakhir ArmeniacaTown.
 *
 * Dialog catalog: setiap entry = satu "topik" yang bisa di-trigger
 * otomatis (welcome/milestone/return/event) dan di-replay manual dari
 * drawer mascot. Tiap line di `lines[]` = satu speech bubble (di-stage
 * BUBBLE_AUTO_ADVANCE_MS).
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
      'Eh… ada yang dateng. Beneran?',
      'Halo. Namaku Arme — warga terakhir di ArmeniacaTown.',
      'Yang lain udah pergi nyelametin diri pas kota mulai kering. Aku nungguin di sini, kalau-kalau ada yang nyariin tempat ini lagi.',
      'Pohon di tengah itu yang paling kuat — masih hidup walau yang lain ninggalin.',
      'Kamu titip kebaikan ke situ, kota pelan-pelan inget cara tumbuh lagi. Mulai dari sana ya.',
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
      'Menara Jam di utara nyala lagi.',
      'Udah lama gak ada yang mukul jam itu — aku sampe lupa bunyinya.',
    ],
  },
  {
    id: 'r3-unlock',
    category: 'petakBuka',
    label: 'Tetes pertama di Telaga',
    trigger: { type: 'count-cross', at: 4000 },
    lines: [
      'Telaga di timur tetes air pertamanya.',
      'Dulu orang dateng ke situ buat nitip harapan — bukan minta, cuma nitip.',
      'Sekarang… siapa yang mau nitip duluan ya?',
    ],
  },
  {
    id: 'r5-unlock',
    category: 'petakBuka',
    label: 'Panggung Terbuka disapu',
    trigger: { type: 'count-cross', at: 4500 },
    lines: [
      'Panggung di tenggara udah disapu.',
      'Kursinya rapi lagi, walau masih sepi.',
      'Dulu sini rame anak-anak nyanyi sampai sore. Sekarang anginnya doang yang lewat.',
    ],
  },
  {
    id: 'r2-unlock',
    category: 'petakBuka',
    label: 'Perpustakaan dibuka pintunya',
    trigger: { type: 'count-cross', at: 5000 },
    lines: [
      'Perpustakaan di barat pintunya kebuka.',
      'Rak masih banyak yang kosong — yang nyimpen buku udah pindah duluan, bawa buku-bukunya buat selamet.',
      'Tapi yang ketinggalan bisa kamu baca.',
    ],
  },

  // ── Petak Pulih (restored state) ──────────────────────────────────
  {
    id: 'r1-restore',
    category: 'petakPulih',
    label: 'Lorong masuk dirapiin',
    trigger: { type: 'count-cross', at: 4000 },
    lines: [
      'Lorong di jalan masuk udah disapu.',
      'Batu-batunya rapi lagi, walau geriginya masih keliatan.',
      'Yang lewat pertama kali bakal ngira kota emang gak pernah ditinggalin.',
    ],
  },
  {
    id: 'r4-restore',
    category: 'petakPulih',
    label: 'Menara Jam pas waktu lagi',
    trigger: { type: 'count-cross', at: 5000 },
    lines: [
      'Menara Jam jalan lagi pas waktu.',
      'Dulu aku ngecek dari situ kapan kereta terakhir lewat.',
      'Kereta-nya gak pernah balik, tapi jamnya balik. Aneh ya.',
    ],
  },
  {
    id: 'r3-restore',
    category: 'petakPulih',
    label: 'Telaga penuh, harapan keluar',
    trigger: { type: 'count-cross', at: 6000 },
    lines: [
      'Air di Telaga udah penuh.',
      'Iseng aku baca harapan-harapan yang dititip orang dulu — banyak yang familiar.',
      'Mungkin sebagian dari kamu juga ngerasa gitu.',
    ],
  },
  {
    id: 'r5-restore',
    category: 'petakPulih',
    label: 'Orkes Armeniaca diputer lagi',
    trigger: { type: 'count-cross', at: 6500 },
    lines: [
      'Kamu pernah denger orkes Armeniaca? Gak ya.',
      'Pas kota pulih, aku puter lagu yang dulu sering diputer di panggung ini.',
      'Mungkin kamu suka.',
    ],
  },
  {
    id: 'r2-restore',
    category: 'petakPulih',
    label: 'Perpustakaan keurus lagi',
    trigger: { type: 'count-cross', at: 7000 },
    lines: [
      'Perpustakaan keurus lagi.',
      'Aku nemuin satu buku yang halaman terakhirnya bolong — kayak nungguin ditulisin.',
      'Mungkin kamu yang nulis.',
    ],
  },

  // ── Air Mancur Plaza (continuous tiers 0-6) ───────────────────────
  {
    id: 'am-t1',
    category: 'airMancur',
    label: 'Reruntuhan air mancur ditemuin',
    trigger: { type: 'count-cross', at: 2000 },
    lines: [
      'Plaza tengah baru keliatan reruntuhan air mancurnya.',
      'Patungnya patah, tapi bentuknya masih ada.',
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
      'Air mancur tetes-tetes tipis.',
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
      'Air mancur jalan setengah tinggi.',
      'Droplets jatuh teratur, riak ripple di permukaan.',
      'Plaza ini mulai kerasa kayak tempat orang berhenti sejenak — bukan cuma lewat.',
    ],
  },
  {
    id: 'am-t5',
    category: 'airMancur',
    label: 'Air mengalir penuh',
    trigger: { type: 'count-cross', at: 7500 },
    lines: [
      'Air mancur jalan penuh.',
      'Suara percikannya… kayak ada yang ngobrol pelan.',
      'Kota emang gak betah diem lama.',
    ],
  },
  {
    id: 'am-t6',
    category: 'airMancur',
    label: 'Empat kuncup aprikot di rim',
    trigger: { type: 'count-cross', at: 10000 },
    lines: [
      'Di rim air mancur tumbuh empat kuncup aprikot.',
      'Akarnya sama kayak Pohon di tengah.',
      'Lo bantu hidupin keduanya.',
    ],
  },

  // ── Momen Besar (milestone non-petak) ─────────────────────────────
  {
    id: 'firstbloom',
    category: 'besar',
    label: 'Sprout pertama di jalan',
    trigger: { type: 'count-cross', at: 2500 },
    lines: [
      'Coba liat ke jalan dari gerbang.',
      'Ada sprout kecil tumbuh di sela batu — tanda kehidupan pertama yang balik.',
      'Cuma rumput muda. Tapi udah lama gak ada warna sehijo itu di sini.',
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
      'Aula di tengah… pintunya gerak sendiri tadi.',
      'Dulu Helismiley sering pameran lukisan di sini — buat ngajak warga balik mampir.',
      'Sekarang temboknya pelan-pelan keisi lagi. Lukisan kebaikan, katanya.',
    ],
  },
  {
    id: 'purified',
    category: 'besar',
    label: 'Kota pulih sepenuhnya',
    cinematic: true,
    trigger: { type: 'count-cross', at: 7000 },
    lines: [
      'Kota udah pulih sepenuhnya.',
      'Pohon di tengah berbunga lagi.',
      'Tapi aneh ya — aku masih warga terakhir.',
      'Mungkin yang lain butuh waktu balik. Atau mungkin yang balik bukan mereka lagi, tapi orang baru.',
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
      'Petalnya turun terus dari mana-mana.',
      'Aku denger orang nari di alun-alun, walau aku gak liat siapa-siapanya.',
      'Festival udah di puncaknya. Mungkin yang balik lebih banyak dari yang keliatan.',
    ],
  },
  {
    id: 'legacy',
    category: 'besar',
    label: 'Kota jadi monumen permanen',
    cinematic: true,
    trigger: { type: 'count-cross', at: 10000 },
    lines: [
      'Kota ini gak cuma pulih — dia tumbuh jadi sesuatu yang dulu belum ada.',
      'Pohon di tengah jadi monumen permanen.',
      'Makasih udah nemenin sampe sini. Aku gak nyangka bisa cerita panjang lagi sama orang.',
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
      'Pohon yang tadi cuma bertahan…',
      'Sekarang bunganya tiba-tiba muncul. Satu, dua, tiga.',
      'Aku lupa nama-namanya.',
    ],
  },
  {
    id: 'sosok-pertama',
    category: 'besar',
    label: 'Sosok pertama di kejauhan',
    trigger: { type: 'count-cross', at: 7500 },
    lines: [
      'Eh — ada sosok di ujung sana.',
      'Aku gak yakin siapa. Jauh banget.',
      'Tapi udah lama banget aku gak liat ada yang lewat di luar Pohon.',
    ],
  },
  {
    id: 'sosok-balik',
    category: 'besar',
    label: 'Apakah dia balik?',
    trigger: { type: 'count-cross', at: 7750 },
    lines: [
      'Sosok yang tadi makin jelas pas matahari geser.',
      'Aku kayak inget jalannya — tapi gak pasti.',
      'Mungkin warga, mungkin angin yang main-main aja.',
    ],
  },
  {
    id: 'aura-melebar',
    category: 'besar',
    label: 'Aura Pohon melebar',
    trigger: { type: 'count-cross', at: 8200 },
    lines: [
      'Cincin baru muncul di kaki Pohon.',
      'Auranya keluar lebih lebar dari kemaren.',
      'Kayak Pohon-nya mulai panggil siapa-siapa.',
    ],
  },
  {
    id: 'lampu-pertama',
    category: 'besar',
    label: 'Lampu pertama nyala',
    trigger: { type: 'count-cross', at: 8500 },
    lines: [
      'Lampu pertama nyala malem ini.',
      'Bukan aku yang nyalain.',
      'Mungkin ada yang mau make.',
    ],
  },
  {
    id: 'nama-dipanggil',
    category: 'besar',
    label: 'Aku denger nama-ku',
    trigger: { type: 'count-cross', at: 9500 },
    lines: [
      'Aku denger nama-ku dipanggil tadi.',
      'Pelan. Cuma sekali.',
      'Mungkin angin — tapi kayaknya bukan.',
    ],
  },
  {
    id: 'mercusuar',
    category: 'besar',
    label: 'Mercusuar Armeniaca',
    trigger: { type: 'count-cross', at: 9700 },
    lines: [
      'Pohon mulai keluarin cahaya dari atas.',
      'Dulu mereka panggil Pohon ini "mercusuar Armeniaca".',
      'Sekarang baru aku ngerti kenapa.',
    ],
  },

  // ── Saat Kamu Balik (returning visit) ─────────────────────────────
  {
    id: 'return-short',
    category: 'balik',
    label: 'Pulang singkat (3-7 hari)',
    trigger: { type: 'returning', daysGte: 3, daysLte: 13 },
    lines: [
      'Eh, balik.',
      'Pohon kemaren gerimis pas kamu pergi — kamu kelewatan.',
    ],
  },
  {
    id: 'return-long-growing',
    category: 'balik',
    label: 'Pulang lama, kota tumbuh',
    trigger: { type: 'returning', daysGte: 14, requiresGrowth: true },
    lines: [
      'Lama gak liat.',
      'Sejak kamu pergi, kota nambah banyak kebaikan. Petak baru udah kebuka juga.',
      'Aku sempet ngira kamu pindah kayak warga lain.',
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
      'Itu Pohon yang paling kuat di sini.',
      'Gak tau dia tahan kering sampe segini lama — mungkin karena tau ada yang bakal dateng nyiramin lagi.',
      'Sekarang udah ada.',
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
      'Oh, kamu pilih petak itu duluan?',
      'Pilihan menarik.',
      'Yang lain biasanya ke Pohon dulu.',
    ],
  },
  {
    id: 'bonus-dismiss-quick',
    category: 'bonus',
    label: 'Dismiss aku kecepetan',
    trigger: { type: 'event', event: 'dismiss-quick' },
    lines: [
      'Ya, lanjut aja.',
      'Aku di sini kalau butuh.',
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
