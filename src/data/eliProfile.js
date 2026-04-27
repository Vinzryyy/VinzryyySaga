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
      'Debut panggung pertama di setlist “Show Theater no Megami” bersama Team T, bareng Angelina Christy dan Aurel Mayori.',
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
    date: '2022-01-01',
    period: 'Single “Rapsodi”',
    title: 'Senbatsu Pertama',
    body:
      'Posisi Senbatsu pertama Eli tercatat di single “Rapsodi”, salah satu titik balik karier teater dan rilisnya.',
    badge: 'Senbatsu',
  },
  {
    id: 'three-team-announce',
    date: '2025-12-20',
    period: '20 Desember 2025',
    title: 'Pengumuman Sistem 3 Tim',
    body:
      'Manajemen JKT48 mengumumkan sistem tiga tim baru: Team Love, Team Dream, Team Passion. Susunan member baru disampaikan ke publik.',
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

export const ELI_DISCOGRAPHY = [
  {
    title: 'Rapsodi',
    type: 'Single',
    year: '2022',
    position: 'Senbatsu',
    note: 'Senbatsu pertama Eli.',
    highlight: true,
  },
  // Single-single setelahnya menyusul; ditampilkan sebagai placeholder untuk
  // dilengkapi dengan posisi spesifik per single.
  { title: 'Single JKT48 lainnya', type: 'Reference', year: '2022 - 2026', position: 'Berbagai posisi', note: 'Daftar lengkap akan diperbarui.', placeholder: true },
];

export const ELI_THEATER = [
  {
    setlist: 'Show Theater no Megami',
    team: 'Team T',
    debutDate: '2018-12-16',
    note: 'Setlist debut panggung pertama bersama Team T.',
    units: [],
  },
  {
    setlist: 'Te wo Tsunaginagara',
    team: 'Team KIII',
    debutDate: null,
    note: 'Setlist reguler Team KIII di periode pertengahan karier Eli.',
    units: ['Innocence', 'Wimbledon e Tsureteitte'],
  },
  {
    setlist: 'Pajama Drive',
    team: 'Team KIII',
    debutDate: null,
    note: 'Setlist klasik AKB48 yang dibawakan ulang oleh Team KIII.',
    units: ['Junjou Shugi', 'Temodemo no Namida'],
  },
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
    icon: 'ri-football-line',
    label: 'Klub Bola',
    value: 'Persib & Liverpool',
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
