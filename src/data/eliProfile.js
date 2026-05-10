/**
 * Eli JKT48 — Structured profile data
 *
 * Sources: AKB48 Wiki, JKT48 Indonesia Wiki, Bunshun English profile,
 * dofflzla 50-fakta blog, IDN Times JKT48 Fight announcement, and
 * 48time team rosters. Where sources conflict (e.g. blood type), the
 * more recent / more detailed source wins, or the field is omitted.
 *
 * Data marked TODO needs verification or expansion before publishing.
 */

// Linimasa perjalanan Helisma Putri Kurnia di JKT48 — disusun
// kronologis dari debut Generasi 7 (2018) hingga era JKT48 Fight 2026.
// Show milestone (100/200/300/400) diberi `category: 'show-recap'`
// supaya bisa di-filter terpisah dari narrative milestones (career
// transitions, single, sousenkyo) di komponen yang butuh distingsi.
//
// Catatan tanggal:
// - Show 100 ditulis sesuai input editorial (29 Des 2019). TSV
//   #JumlahShowJKT48 menyatakan show ke-100 jatuh 15 Des 2019 di
//   setlist "Saka Agari" — kalau ingin selaraskan ke canonical, ubah
//   date ke 2019-12-15 + period "15 Desember 2019".
// - Show 200 (2021-11-20) & 300 (2024-07-07) diambil dari TSV
//   scripts/eli-show-log.tsv (canonical via @jehaes_).
// - Show 400 belum tercapai per 24 April 2026 (count = 385). Entry
//   ditandai upcoming dengan date: null.
export const ELI_TIMELINE = [
  {
    id: 'audition',
    date: '2018-09-29',
    period: '29 September 2018',
    title: 'Lulus Audisi JKT48 Generasi 7',
    body:
      'Helisma Putri Kurnia resmi diperkenalkan sebagai salah satu member JKT48 Generasi 7 dalam pengumuman trainee baru JKT48. Berasal dari Bandung, Eli langsung menarik perhatian karena karakter ceria, logat Sunda yang khas, dan kemampuan membangun suasana di antara member lain. Setelah lolos tahap seleksi, Eli ditempatkan di Academy Class B sebagai awal perjalanan resminya di JKT48.',
    badge: 'Trainee',
  },
  {
    id: 'sousenkyo-2018',
    date: '2018-10-27',
    period: '27 Oktober 2018',
    title: 'Partisipasi Sousenkyo Pertama',
    body:
      'Eli mengikuti JKT48 Senbatsu Sousenkyo 2018 sebagai member trainee generasi baru. Walaupun belum berhasil masuk peringkat, pengalaman ini menjadi langkah awal Eli mengenal sistem kompetisi dan dukungan fanbase dalam budaya idol JKT48.',
    badge: 'Sousenkyo',
  },
  {
    id: 'class-a',
    date: '2018-10-30',
    period: '30 Oktober 2018',
    title: 'Promosi ke Academy Class A',
    body:
      'Hanya sekitar satu bulan setelah debut, Eli berhasil naik dari Academy Class B ke Academy Class A. Kenaikan ini menunjukkan perkembangan performa dan adaptasinya yang cepat dalam latihan dance, vokal, dan theater sebagai member baru Generasi 7.',
    badge: 'Academy',
  },
  {
    id: 'theater-debut',
    date: '2018-12-23',
    period: '23 Desember 2018',
    title: 'Debut Theater Pertama',
    body:
      'Eli menjalani debut theater pertamanya dalam stage revival Team T "Te wo Tsunaginagara". Penampilan ini menjadi titik awal perjalanan panggung Eli di Theater JKT48, sekaligus mulai dikenal oleh penonton theater karena energi dan ekspresinya yang natural di atas panggung.',
    badge: 'Theater',
  },
  {
    id: 'team-kiii',
    date: '2019-07-21',
    period: '21 Juli 2019',
    title: 'Dipromosikan ke Team KIII',
    body:
      'Pada konser graduation Cindy Yuvia, Eli diumumkan resmi dipromosikan menjadi member Team KIII. Promosi ini menjadi milestone penting karena menandai peralihan Eli dari trainee academy menjadi member tim reguler JKT48 dengan jadwal theater dan event yang lebih aktif.',
    badge: 'Team KIII',
  },
  {
    id: 'show-100',
    date: '2019-12-29',
    period: '29 Desember 2019',
    title: 'Mencapai 100 Show Theater',
    body:
      'Di tahun pertamanya sebagai member tim reguler, Eli berhasil mencapai 100 pertunjukan theater JKT48. Konsistensinya tampil di theater membuatnya semakin dikenal sebagai member dengan pembawaan hangat, lucu, dan komunikatif.',
    badge: 'Theater · 100 Show',
    category: 'show-recap',
  },
  {
    id: 'first-senbatsu',
    date: '2020-01-22',
    period: '22 Januari 2020',
    title: 'Senbatsu Pertama — "Rapsodi"',
    body:
      'Eli berhasil mencatatkan posisi Senbatsu pertamanya melalui single original JKT48 "Rapsodi". Lagu ini menjadi salah satu rilisan paling bersejarah bagi JKT48 karena merupakan original song pertama grup. Masuknya Eli ke formasi Senbatsu menjadi pencapaian besar dalam kariernya sejak debut Generasi 7.',
    badge: 'Senbatsu',
  },
  {
    id: 'new-formation-2021',
    date: '2021-03-13',
    period: '13 Maret 2021',
    title: 'Bergabung ke Formasi JKT48 New Era',
    body:
      'JKT48 mengumumkan restrukturisasi besar dengan membubarkan sistem Team J, Team KIII, dan Team T menjadi satu formasi tunggal bernama JKT48 New Era. Eli menjadi bagian dari formasi baru tersebut dan ikut melewati masa transisi besar JKT48 setelah perubahan sistem grup.',
    badge: 'New Era',
  },
  {
    id: 'darashinai-aishikata',
    date: '2021-05-26',
    period: '26 Mei 2021',
    title: 'Partisipasi "Darashinai Aishikata"',
    body:
      'Eli kembali tampil dalam single utama JKT48 "Darashinai Aishikata". Partisipasi ini memperlihatkan konsistensinya dalam line-up rilisan utama JKT48 di era New Era.',
    badge: 'Single',
  },
  {
    id: 'show-200',
    date: '2021-11-20',
    period: '20 November 2021',
    title: 'Mencapai 200 Show Theater',
    body:
      'Genap dua tahun setelah angka 100, Eli melewati 200 pertunjukan theater JKT48. Pencapaian ini didapatkan di tengah era New Era — masa transisi besar grup pasca-restrukturisasi tim — di setlist Renai Kinshi Jourei yang sedang aktif di periode tersebut. Konsistensi tampilnya jadi sinyal komitmen Eli pada panggung theater.',
    badge: 'Theater · 200 Show',
    category: 'show-recap',
  },
  {
    id: 'sayonara-crawl',
    date: '2023-10-11',
    period: '11 Oktober 2023',
    title: 'Partisipasi "Sayonara Crawl"',
    body:
      'Eli kembali berpartisipasi dalam single A-Side "Sayonara Crawl". Di periode ini, Eli semakin dikenal karena kemampuan variety, interaksi theater, dan image "Ceu Eli" yang kuat di kalangan fans maupun member.',
    badge: 'Single',
  },
  {
    id: 'spv-langit-biru-2024',
    date: '2024-03-13',
    period: '13 Maret 2024',
    title: 'SPV "Langit Biru Cinta Searah"',
    body:
      'Eli tampil dalam Special Performance Video "Langit Biru Cinta Searah" bersama beberapa member utama JKT48. Performance video ini mendapat perhatian besar dari fans karena konsep visual dan nuansa emosionalnya, sekaligus memperlihatkan perkembangan kualitas performa Eli di atas panggung dan kamera.',
    badge: 'SPV',
  },
  {
    id: 'show-300',
    date: '2024-07-07',
    period: '7 Juli 2024',
    title: 'Mencapai 300 Show Theater',
    body:
      'Lebih dari lima tahun setelah debut, Eli menyentuh angka 300 pertunjukan theater. Diraih di setlist Ramune no Nomikata, milestone ini menempatkan Eli sebagai salah satu member yang konsisten tampil sejak Generasi 7 hingga era theater modern JKT48.',
    badge: 'Theater · 300 Show',
    category: 'show-recap',
  },
  {
    id: 'undergirl-bibir-2024',
    date: '2024-12-15',
    period: '15 Desember 2024',
    title: 'Undergirls — "Bibir yang Telah Dicuri"',
    body:
      'Pada hasil akhir Sousenkyo, Eli berhasil meraih posisi #22 dan masuk formasi Undergirls untuk lagu "Bibir yang Telah Dicuri" (Nusumareta Kuchibiru). Hasil ini menjadi bukti bertumbuhnya dukungan fanbase Eli setelah beberapa tahun konsisten aktif di theater, event, dan rilisan JKT48.',
    badge: 'Undergirls',
  },
  {
    id: 'three-team-announce',
    date: '2025-12-20',
    period: '20 Desember 2025',
    title: 'Pengumuman Sistem 3 Tim Baru',
    body:
      'Dalam acara besar di ICE BSD, JKT48 mengumumkan era baru bertajuk "Fight!" dengan menghidupkan kembali sistem tiga tim: Team Passion, Team Dream, dan Team Love. Pada pengumuman tersebut, Eli diumumkan menjadi bagian dari Team Dream, menandai awal fase baru dalam perjalanan kariernya di JKT48.',
    badge: 'JKT48 Fight',
  },
  {
    id: 'fight-tagline',
    date: '2026-01-17',
    period: '17 Januari 2026',
    title: 'JKT48 14th Anniversary — "Fight!"',
    body:
      'Dalam konser ulang tahun ke-14 JKT48, tagline baru "Fight!" resmi diperkenalkan sebagai semangat baru grup untuk tahun 2026. Eli ikut menjadi bagian dari generasi member yang membawa identitas baru JKT48 di era kompetitif antar tim.',
    badge: 'Anniversary',
  },
  {
    id: 'team-dream',
    date: '2026-04-01',
    period: '1 April 2026',
    title: 'Resmi Bergabung dengan Team Dream',
    body:
      'Sistem tiga tim resmi mulai dijalankan dan Eli aktif sebagai member Team Dream bersama Freya Jayawardana dan member lainnya. Setelah melewati perjalanan panjang dari trainee Generasi 7, Team KIII, hingga New Era, Eli memasuki fase baru sebagai salah satu member berpengalaman di era JKT48 Fight 2026.',
    badge: 'Team Dream',
  },
  {
    id: 'show-400',
    date: null,
    period: 'Belum tercapai',
    title: 'Menuju 400 Show Theater',
    body:
      'Per April 2026, Eli mencatat 385 pertunjukan theater JKT48 (sumber: recap #JumlahShowJKT48 oleh @jehaes_). Angka 400 tinggal selangkah lagi — milestone karier yang lazim dirayakan komunitas teater JKT48 sebagai penanda longevitas di panggung. Entry ini akan diperbarui dengan tanggal pasti ketika tercapai.',
    badge: 'Theater · Menuju 400',
    category: 'show-recap',
    upcoming: true,
  },
];

// Roster member shape (shared by Rapsodi Senbatsu + 2026 Undergirls):
//   rank, name, group, votes, status, position?, isEli?
// `status` shows rank movement (▲N up, ▼N down, NEW = first time in
// that bracket); `position` is reserved for designations like
// "Senbatsu Center" / "Undergirls Center".

// Senbatsu hasil Pemilihan Member Single Original JKT48 untuk single
// "Rapsodi" (2020) — 16 member. Eli (Helisma Putri) menempati posisi
// 15 dengan 15.842 suara, menjadikannya Senbatsu pertama Eli.
const SOUSENKYO_RAPSODI = [
  { rank: 1, name: 'Shani Indira Natio', group: 'Team KIII', votes: 72707, status: '▲1', position: 'Senbatsu Center' },
  { rank: 2, name: 'Feni Fitriyanti', group: 'Team J', votes: 44434, status: '▲2' },
  { rank: 3, name: 'Riska Amelia Putri', group: 'Team J', votes: 31367, status: 'NEW' },
  { rank: 4, name: 'Nurhayati', group: 'Team KIII', votes: 28440, status: '▲1' },
  { rank: 5, name: 'Nadila Cindi Wantari', group: 'Team J', votes: 24798, status: '▲18' },
  { rank: 6, name: 'Gabryela Marcelina', group: 'Team T', votes: 23404, status: '▲10' },
  { rank: 7, name: 'Cindy Hapsari Maharani Pujiantoro Putri', group: 'Team J', votes: 22525, status: '▲20' },
  { rank: 8, name: 'Beby Chaesara Anadila', group: 'Team KIII', votes: 21792, status: '▲3' },
  { rank: 9, name: 'Tan Zhi Hui Celine', group: 'Team T', votes: 21350, status: '▲13' },
  { rank: 10, name: 'Shania Gracia', group: 'Team KIII', votes: 20601, status: '▼2' },
  { rank: 11, name: 'Melati Putri Rahel Sesilia', group: 'Team T', votes: 19342, status: '▲9' },
  { rank: 12, name: 'Jinan Safa Safira', group: 'Team T', votes: 18064, status: '▲2' },
  { rank: 13, name: 'Angelina Christy', group: 'Team KIII', votes: 17477, status: 'NEW' },
  { rank: 14, name: 'Diani Amalia Ramadhani', group: 'Team J', votes: 15951, status: 'NEW' },
  { rank: 15, name: 'Helisma Putri', group: 'Team KIII', votes: 15842, status: 'NEW', isEli: true },
  { rank: 16, name: 'Viona Fadrin', group: 'Academy Class A', votes: 14566, status: 'NEW' },
];

// Undergirls JKT48 Sousenkyo 2024 — rank 13–24 (Senbatsu mengisi 1–12).
// Hasil diumumkan 16 Desember 2024 di press conference pasca konser ulang
// tahun ke-13 "Wonderland" di The Plaza IDN HQ. Eli (Helisma Putri) di
// rank 22 dengan 28.925 suara, turun 7 peringkat dari Sousenkyo
// #KuSangatSuka. Single tied to these results dirilis tahun 2025.
const SOUSENKYO_2024_UNDERGIRLS = [
  { rank: 13, name: 'Indah Cahya', group: 'JKT48', votes: 45716, status: 'NEW', position: 'Undergirls Center' },
  { rank: 14, name: 'Febriola Sinambela', group: 'JKT48', votes: 45028, status: 'NEW' },
  { rank: 15, name: 'Aurhel Alana', group: 'Trainee', votes: 42213, status: 'NEW' },
  { rank: 16, name: 'Indira Seruni', group: 'JKT48', votes: 39086, status: 'NEW' },
  { rank: 17, name: 'Grace Octaviani', group: 'JKT48', votes: 38029, status: 'NEW' },
  { rank: 18, name: 'Catherina Vallencia', group: 'Trainee', votes: 37957, status: 'NEW' },
  { rank: 19, name: 'Kathrina Irene', group: 'JKT48', votes: 34359, status: 'NEW' },
  { rank: 20, name: 'Cathleen Nixie', group: 'JKT48', votes: 34080, status: 'NEW' },
  { rank: 21, name: 'Greesella Adhalia', group: 'JKT48', votes: 33241, status: 'NEW' },
  { rank: 22, name: 'Helisma Putri', group: 'JKT48', votes: 28925, status: '▼7', isEli: true },
  { rank: 23, name: 'Gabriela Abigail', group: 'JKT48', votes: 28172, status: 'NEW' },
  { rank: 24, name: 'Adeline Wijaya', group: 'Trainee', votes: 26947, status: 'NEW' },
];

export const ELI_DISCOGRAPHY = [
  {
    title: 'Rapsodi',
    type: 'Single',
    year: '2020',
    position: 'Senbatsu',
    note: 'Senbatsu pertama Eli — hasil Pemilihan Member Single Original JKT48, posisi 15 dengan 15.842 suara.',
    highlight: true,
    rosterLabel: 'Senbatsu Roster',
    members: SOUSENKYO_RAPSODI,
  },
  {
    title: 'Bibir yang Telah Dicuri (Nusumareta Kuchibiru)',
    type: 'Single',
    year: '2025',
    position: 'Undergirls',
    note: 'Track Undergirls dari JKT48 Sousenkyo 2024 (#Semangka, hasil diumumkan 16 Desember 2024). Single dirilis tahun 2025. Eli masuk Undergirls di rank 22 dengan 28.925 suara, turun 7 peringkat dari Sousenkyo #KuSangatSuka.',
    campaignTagline: '#Semangka',
    rosterLabel: 'Undergirls Roster',
    members: SOUSENKYO_2024_UNDERGIRLS,
  },
  // Single JKT48 lainnya yang melibatkan Eli akan ditambah seiring data
  // posisi per single terverifikasi.
  { title: 'Single JKT48 lainnya', type: 'Reference', year: '2020 - 2026', position: 'Berbagai posisi', note: 'Daftar lengkap akan diperbarui.', placeholder: true },
];

// Album appearances — JKT48 album tracks Eli was part of. Pulled from
// fan-curated participation list (JOY KICK! TEARS, THIS IS JKT48 NEW ERA,
// Mahagita Vol. 2). Year column left blank when not yet verified.
export const ELI_ALBUMS = [
  {
    title: 'JOY KICK! TEARS',
    year: null,
    cover: null,
    tracks: [
      { song: 'Teacher Teacher' },
    ],
  },
  {
    title: 'THIS IS JKT48 NEW ERA',
    year: null,
    cover: null,
    tracks: [
      { song: '109 (Marukyu)' },
      { song: 'Fushidara na Natsu' },
    ],
  },
  {
    title: 'Mahagita Vol. 2',
    year: null,
    cover: null,
    tracks: [
      { song: 'Bokura no Eureka' },
      { song: 'NEW SHIP' },
      { song: 'Sakura no Ki ni Narou' },
      { song: 'Green Flash' },
      { song: 'Yume wo Shinaseru Wake ni Ikanai' },
      { song: 'Jiwaru DAYS' },
    ],
  },
];

// Tagline / hashtag personal yang dipakai Eli per tahun di sosial
// media — catatan personal yang berubah seiring fase karier. Tagline
// kampanye Sousenkyo / per-single tinggal di entry diskografinya
// masing-masing (lihat `campaignTagline` pada ELI_DISCOGRAPHY).
export const ELI_TAGLINES = [
  { year: '2019', tag: '#Survive' },
  { year: '2024', tag: '#Semangka' },
];

export const ELI_FIGHT_2026 = {
  tagline: 'Fight!',
  anniversary: 'JKT48 14th Anniversary — ICE BSD, 17 Januari 2026',
  effective: '1 April 2026',
  format:
    'JKT48 membagi member regular menjadi tiga tim untuk format kompetisi tahun 2026: Team Love, Team Dream, dan Team Passion. Setiap tim membawa setlist, identitas, dan penampilan masing-masing.',
  team: {
    name: 'Team Dream',
    captain: 'Freya Jayawardana',
    captainTitle: 'Kapten JKT48',
    captainNote: 'Kapten JKT48 secara keseluruhan; member generasi 7, satu generasi dengan Eli.',
    color: 'Dream',
    members: [
      'Freya Jayawardana',
      'Eli',
      'Delynn',
      'Chelsea',
      'Olla',
      'Ella',
      'Gendis',
      'Gita',
      'Greesel',
      'Lyn',
      'Marsha',
      'Nachia',
      'Oline',
      'Nala',
    ],
  },
  rivals: [
    { name: 'Team Love', note: 'Salah satu dari tiga tim dalam JKT48 Fight 2026.' },
    { name: 'Team Passion', note: 'Salah satu dari tiga tim dalam JKT48 Fight 2026.' },
  ],
};

export const ELI_TRIVIA = [
  { icon: 'ri-cake-2-line', label: 'Tanggal Lahir', value: '15 Juni 2000' },
  { icon: 'ri-map-pin-2-line', label: 'Asal', value: 'Bandung, Jawa Barat' },
  { icon: 'ri-calendar-event-line', label: 'Zodiak', value: 'Gemini' },
  { icon: 'ri-ruler-line', label: 'Tinggi Badan', value: '165 cm' },
  { icon: 'ri-graduation-cap-line', label: 'Pendidikan', value: 'Mahasiswi Sastra Korea' },
  { icon: 'ri-team-line', label: 'Generasi', value: 'Generasi 7 JKT48' },
  { icon: 'ri-flag-line', label: 'Team Saat Ini', value: 'Team Dream' },
  { icon: 'ri-heart-line', label: 'Fanbase Resmi', value: 'Helismiley' },
];

export const ELI_FUN_FACTS = [
  {
    icon: 'ri-restaurant-line',
    label: 'Makanan Favorit',
    value: 'Seblak & Martabak',
  },
  {
    icon: 'ri-music-2-line',
    label: 'K-Pop Bias',
    value: 'Jaehyun NCT',
  },
  {
    icon: 'ri-heart-3-line',
    label: 'Fandom',
    value: 'Antusias K-Pop & NCTzen',
  },
  {
    icon: 'ri-bear-smile-line',
    label: 'Hewan Peliharaan',
    value: 'Kucing',
  },
  {
    icon: 'ri-dance-line',
    label: 'Hobi Utama',
    value: 'Dance cover, ngemil, baca, tidur',
  },
  {
    icon: 'ri-star-smile-line',
    label: 'Bias AKB48',
    value: 'Tomu Mutou (Tommuto)',
  },
  {
    icon: 'ri-tv-2-line',
    label: 'Tontonan',
    value: 'Drama Korea',
  },
  {
    icon: 'ri-group-line',
    label: 'Cangcorang Family',
    value: 'Teman dekat bareng Gita & Muthe',
  },
];

export const ELI_PROFILE_SECTIONS = [
  { id: 'timeline', label: 'Timeline', icon: 'ri-route-line' },
  { id: 'fight', label: 'JKT48 Fight 2026', icon: 'ri-flashlight-line' },
  { id: 'discography', label: 'Diskografi', icon: 'ri-album-line' },
  { id: 'trivia', label: 'Trivia', icon: 'ri-information-line' },
];
