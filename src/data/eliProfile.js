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

export const ELI_TIMELINE = [
  {
    id: 'audition',
    date: '2018-09-29',
    period: 'September 2018',
    title: 'Lulus Audisi Generasi 7',
    body:
      'Helisma Putri lulus audisi JKT48 generasi 7 dan langsung ditempatkan di Academy Class A setelah melewati Step 1 dan Step 2.',
    badge: 'Trainee',
  },
  {
    id: 'theater-debut',
    date: '2018-12-16',
    period: 'Desember 2018',
    title: 'Debut Teater bersama Team T',
    body:
      'Naik panggung pertama bersama Team T (T1 Revival — “Te wo Tsunaginagara”) bareng Angelina Christy dan Aurel Mayori. Detail unit songs tersedia di section Theater.',
    badge: 'Team T',
  },
  {
    id: 'sousenkyo-2018',
    date: '2018-10-01',
    period: 'Oktober 2018',
    title: 'JKT48 Senbatsu Sousenkyo Pertama',
    body:
      'Mengikuti JKT48 Senbatsu Sousenkyo 2018 sebagai member baru, belum berhasil masuk ranking.',
    badge: 'Sousenkyo',
  },
  {
    id: 'team-kiii',
    date: '2019-07-01',
    period: 'Juli 2019',
    title: 'Transfer ke Team KIII',
    body:
      'Resmi dipindahkan ke Team KIII pada konser graduation Cindy Yuvia, menandai awal era panggung reguler Eli.',
    badge: 'Team KIII',
  },
  {
    id: 'first-senbatsu',
    date: '2020-01-01',
    period: 'Single “Rapsodi”',
    title: 'Senbatsu Pertama',
    body:
      'Posisi Senbatsu pertama Eli tercatat di single “Rapsodi”, salah satu titik balik karier teater dan rilisnya.',
    badge: 'Senbatsu',
  },
  {
    id: 'new-formation-2021',
    date: '2021-03-13',
    period: '13 Maret 2021',
    title: 'JKT48 New Era — Formasi Tunggal',
    body:
      'JKT48 mengumumkan New Formation: tiga tim (Team J, Team KIII, Team T) digabung menjadi satu tim tunggal bernama JKT48 New Era. Eli ikut transisi ke formasi baru ini, mengakhiri eranya di Team KIII.',
    badge: 'New Formation',
  },
  {
    id: 'three-team-announce',
    date: '2025-12-20',
    period: '20 Desember 2025',
    title: 'Pengumuman Sistem 3 Tim & Tagline Fight',
    body:
      'Di ICE BSD, JKT48 mengumumkan rencana kembalinya sistem tim dengan tiga formasi baru: Team Passion, Team Dream, dan Team Love. Pengumuman ini sekaligus memperkenalkan tagline baru "JKT48 Fight".',
    badge: 'Reshuffle',
  },
  {
    id: 'fight-tagline',
    date: '2026-01-17',
    period: '17 Januari 2026',
    title: 'JKT48 14th Anniversary — Tagline “Fight!”',
    body:
      'Di ICE BSD, JKT48 merayakan 14 tahun perjalanan dan meluncurkan semangat baru “Fight!” sebagai tagline tahun 2026.',
    badge: 'Anniversary',
  },
  {
    id: 'team-dream',
    date: '2026-04-01',
    period: '1 April 2026',
    title: 'Bergabung dengan Team Dream',
    body:
      'Sistem tiga tim resmi berlaku. Eli ditempatkan di Team Dream, dipimpin oleh Captain Freya Jayawardana, untuk format kompetisi JKT48 Fight 2026.',
    badge: 'Team Dream',
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

// Undergirls JKT48 Sousenkyo 2026 — rank 13–24 (Senbatsu mengisi 1–12).
// Eli (Helisma Putri) di rank 22 dengan 28.925 suara, turun 7 peringkat
// dari Sousenkyo #KuSangatSuka.
const SOUSENKYO_2026_UNDERGIRLS = [
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
    year: '2026',
    position: 'Undergirls',
    note: 'Track Undergirls dari JKT48 Sousenkyo 2026. Eli masuk Undergirls di rank 22 dengan 28.925 suara, turun 7 peringkat dari Sousenkyo #KuSangatSuka.',
    rosterLabel: 'Undergirls Roster',
    members: SOUSENKYO_2026_UNDERGIRLS,
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

// Theater setlists Eli has performed in. Unit songs include optional notes
// (Under = substitute role, Shonichi Support = first-day support, Swap =
// swapped position, Since = entered the unit on a specific date,
// Graduation Stage = special context for a member's send-off).
export const ELI_THEATER = [
  {
    code: 'T1 Revival',
    setlist: 'Te wo Tsunaginagara',
    team: 'Team T',
    debutDate: '2018-12-16',
    note: 'Setlist debut panggung Eli, revival klasik bersama Team T.',
    isDebut: true,
    units: [
      { song: 'Wimbledon e Tsureteitte', note: 'Under + Shonichi Support' },
      { song: 'Innocence', note: 'Since 23 Februari 2019' },
    ],
  },
  {
    code: 'ACA1',
    setlist: 'Pajama Drive',
    team: 'Academy',
    debutDate: null,
    note: 'Setlist klasik AKB48 yang dibawakan ulang oleh kelas Academy.',
    units: [
      { song: 'Junjou Shugi' },
      { song: 'Temodemo no Namida' },
      { song: 'Kagami no Naka no Jean Da Arc' },
    ],
  },
  {
    code: 'KIII4',
    setlist: 'Saka Agari',
    team: 'Team KIII',
    debutDate: null,
    note: 'Setlist Team KIII tahap awal era reguler Eli.',
    units: [
      { song: 'Ai no Iro', note: 'Swap' },
    ],
  },
  {
    code: 'Produce Stage',
    setlist: 'Romansa Sang Gadis',
    team: 'Special',
    debutDate: null,
    note: 'Stage produksi khusus.',
    units: [
      { song: 'Himawari', note: "Yona's Graduation Stage" },
    ],
  },
  {
    code: 'KIII5',
    setlist: 'Ramune no Nomikata',
    team: 'Team KIII',
    debutDate: null,
    note: 'Setlist Team KIII edisi berikutnya.',
    units: [
      { song: 'Usotsuki na Dachou' },
    ],
  },
  {
    code: 'JKT1',
    setlist: 'Renai Kinshi Jourei',
    team: 'JKT All Teams',
    debutDate: null,
    note: 'Setlist adaptasi pertama yang melibatkan semua tim JKT48.',
    units: [
      { song: 'Renai Kinshi Jourei', note: 'Unit Song' },
      { song: 'Manatsu no Christmas Rose' },
    ],
  },
  {
    code: 'JKT2',
    setlist: 'Seishun Girls',
    team: 'JKT All Teams',
    debutDate: null,
    note: 'Setlist adaptasi kedua, melibatkan semua tim JKT48.',
    units: [
      { song: 'Blue Rose' },
      { song: 'Fushidara na Natsu' },
    ],
  },
  {
    code: 'JKT3',
    setlist: 'Seifuku no Me',
    team: 'JKT All Teams',
    debutDate: null,
    note: 'Setlist adaptasi ketiga, melibatkan semua tim JKT48.',
    units: [
      { song: 'Onna no Ko no Dairokkan' },
      { song: 'Kareha no Station', note: 'Swap' },
    ],
  },
  {
    code: 'JKT4',
    setlist: 'Ramune no Nomikata',
    team: 'JKT All Teams',
    debutDate: null,
    note: 'Setlist adaptasi keempat — meminjam judul Ramune no Nomikata.',
    status: 'active',
    units: [
      { song: 'Nice to meet you!' },
    ],
  },
  {
    code: 'Dream',
    setlist: 'Dream Bakudan',
    team: 'Team Dream',
    debutDate: null,
    note: 'Setlist perdana Team Dream dalam format JKT48 Fight 2026 (mulai 1 April 2026).',
    status: 'active',
    units: [
      { song: 'Kinjirareta Futari', note: 'Unit Song' },
    ],
  },
  {
    code: 'Dream2',
    setlist: 'Te wo Tsunaginagara',
    team: 'Team Dream',
    debutDate: null,
    note: 'Revival "Te wo Tsunaginagara" yang dibawakan Team Dream.',
    status: 'active',
    units: [
      { song: 'Ame No Pianist', note: 'Unit Song' },
      { song: 'Innocent' },
    ],
  },
];

// Tagline / hashtag yang dipakai Eli per tahun di sosial media —
// catatan personal yang berubah seiring fase karier.
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
    captainNote: 'Member generasi 7, satu generasi dengan Eli.',
    color: 'Dream',
    members: [
      'Freya Jayawardana',
      'Eli',
      'Delynn',
      'Amanda',
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
    label: 'Close Friend',
    value: 'Keluarga roleplay bareng Gita & Muthe',
  },
];

export const ELI_PROFILE_SECTIONS = [
  { id: 'timeline', label: 'Timeline', icon: 'ri-route-line' },
  { id: 'fight', label: 'JKT48 Fight 2026', icon: 'ri-flashlight-line' },
  { id: 'discography', label: 'Diskografi', icon: 'ri-album-line' },
  { id: 'theater', label: 'Theater', icon: 'ri-mic-line' },
  { id: 'trivia', label: 'Trivia', icon: 'ri-information-line' },
];
