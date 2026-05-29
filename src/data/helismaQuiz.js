/**
 * Kuis Helisma — pool 50 soal mudah untuk daily quiz mechanic.
 *
 * Tujuan: kasih fans cara dapat buah (gacha point) extra di /petikan
 * dengan menjawab 1 soal per hari WIB. Correct → reward buah. Wrong →
 * no reward, no retry sampai besok.
 *
 * Soal sumber: data Helisma di siteConfig.eli + eliProfile.ELI_TIMELINE
 * (single, theater milestones, sousenkyo, career events). Difficulty
 * easy — fans yang follow Helisma reasonably should be able to answer.
 *
 * Schema:
 *   {
 *     id: string,            unique
 *     question: string,      pertanyaan singkat
 *     options: string[4],    4 pilihan jawaban
 *     correctIndex: number,  index 0-3
 *     category?: string,     'personal' | 'career' | 'discography' | 'theater' | 'social' | 'trivia'
 *     explanation?: string,  short post-answer fact (optional)
 *   }
 *
 * Daily pick: deterministic dari YYYY-MM-DD string supaya semua user
 * dapat soal sama di hari itu — community talk angle. Lihat
 * `pickDailyQuiz()` di bawah.
 */

export const HELISMA_QUIZ_POOL = [
  // ── PERSONAL (10 soal) ────────────────────────────────────────────
  {
    id: 'fullname',
    question: 'Nama lengkap Helisma adalah?',
    options: [
      'Helisma Putri Cahyani',
      'Helisma Mauludzunia Putri Kurnia',
      'Helisma Putri Indah',
      'Helisma Cahyani Kurnia',
    ],
    correctIndex: 1,
    category: 'personal',
  },
  {
    id: 'hometown',
    question: 'Helisma berasal dari kota apa?',
    options: ['Surabaya', 'Bandung', 'Jakarta', 'Yogyakarta'],
    correctIndex: 1,
    category: 'personal',
  },
  {
    id: 'birthdate',
    question: 'Helisma lahir tanggal berapa?',
    options: ['15 Mei 2000', '15 Juni 2000', '15 Juli 2000', '15 Agustus 2000'],
    correctIndex: 1,
    category: 'personal',
  },
  {
    id: 'birth-province',
    question: 'Helisma berasal dari provinsi apa?',
    options: ['Jawa Tengah', 'Jawa Barat', 'Jawa Timur', 'DKI Jakarta'],
    correctIndex: 1,
    category: 'personal',
  },
  {
    id: 'nickname',
    question: 'Nama panggilan akrab Helisma di JKT48?',
    options: ['Ceu Eli', 'Kak Eli', 'Neng Eli', 'Tante Eli'],
    correctIndex: 0,
    category: 'personal',
  },
  {
    id: 'stage-name',
    question: 'Stage name Helisma di JKT48?',
    options: ['Helli', 'Eli', 'Lisma', 'Putri'],
    correctIndex: 1,
    category: 'personal',
  },
  {
    id: 'age-2026',
    question: 'Usia Helisma di tahun 2026 (saat ulang tahun ke-26)?',
    options: ['24 tahun', '25 tahun', '26 tahun', '27 tahun'],
    correctIndex: 2,
    category: 'personal',
  },
  {
    id: 'catchphrase-imagery',
    question: 'Catchphrase Helisma menggunakan kiasan apa?',
    options: ['Lembayung Senja', 'Bunga Aprikot', 'Cahaya Bulan', 'Bintang Pagi'],
    correctIndex: 0,
    category: 'personal',
  },
  {
    id: 'birthday-event',
    question: 'Ulang tahun Helisma dirayakan sebagai apa di JKT48?',
    options: ['Sotsugyo', 'Seitansai', 'Soukyo', 'Sotsuei'],
    correctIndex: 1,
    category: 'personal',
    explanation: 'Seitansai (生誕祭) = fan birthday celebration JKT48.',
  },
  {
    id: 'generation',
    question: 'Helisma adalah member Generasi ke berapa di JKT48?',
    options: ['Generasi 5', 'Generasi 6', 'Generasi 7', 'Generasi 8'],
    correctIndex: 2,
    category: 'personal',
  },

  // ── CAREER (15 soal) ──────────────────────────────────────────────
  {
    id: 'join-year',
    question: 'Tahun berapa Helisma resmi bergabung JKT48?',
    options: ['2016', '2017', '2018', '2019'],
    correctIndex: 2,
    category: 'career',
  },
  {
    id: 'join-date',
    question: 'Helisma lulus audisi Generasi 7 pada tanggal?',
    options: [
      '29 Agustus 2018',
      '29 September 2018',
      '29 Oktober 2018',
      '29 November 2018',
    ],
    correctIndex: 1,
    category: 'career',
  },
  {
    id: 'gen7-year',
    question: 'Tahun pengumuman Generasi 7 JKT48?',
    options: ['2017', '2018', '2019', '2020'],
    correctIndex: 1,
    category: 'career',
  },
  {
    id: 'current-team',
    question: 'Helisma saat ini tergabung dalam tim apa di JKT48?',
    options: ['Team Passion', 'Team Dream', 'Team Love', 'Team Star'],
    correctIndex: 1,
    category: 'career',
  },
  {
    id: 'old-team',
    question: 'Sebelum Team Dream, Helisma sempat tergabung di tim apa?',
    options: ['Team J', 'Team T', 'Team KIII', 'Team L'],
    correctIndex: 2,
    category: 'career',
  },
  {
    id: 'academy-class-debut',
    question: 'Helisma debut sebagai member kelas mana di JKT48 Academy?',
    options: ['Class A', 'Class B', 'Class C', 'Class D'],
    correctIndex: 1,
    category: 'career',
  },
  {
    id: 'promotion-class-a',
    question: 'Helisma promosi dari Academy Class B ke Class A pada tahun?',
    options: ['2018', '2019', '2020', '2021'],
    correctIndex: 0,
    category: 'career',
  },
  {
    id: 'promotion-kiii',
    question: 'Pada 21 Juli 2019, Helisma dipromosikan ke tim apa?',
    options: ['Team J', 'Team KIII', 'Team T', 'Team Dream'],
    correctIndex: 1,
    category: 'career',
  },
  {
    id: 'new-era-year',
    question: 'Restrukturisasi JKT48 menjadi "New Era" (satu formasi) terjadi tahun?',
    options: ['2020', '2021', '2022', '2023'],
    correctIndex: 1,
    category: 'career',
  },
  {
    id: 'fight-tagline-year',
    question: 'Tahun berapa JKT48 mengumumkan era baru "Fight!"?',
    options: ['2024', '2025', '2026', '2027'],
    correctIndex: 1,
    category: 'career',
  },
  {
    id: 'three-team-announce',
    question: 'Sistem 3 tim JKT48 (Passion/Dream/Love) diumumkan tanggal?',
    options: [
      '20 November 2025',
      '20 Desember 2025',
      '17 Januari 2026',
      '1 April 2026',
    ],
    correctIndex: 1,
    category: 'career',
  },
  {
    id: 'three-team-venue',
    question: 'Pengumuman sistem 3 tim Fight diadakan di venue apa?',
    options: ['Senayan', 'ICE BSD', 'JIExpo', 'Plaza Indonesia'],
    correctIndex: 1,
    category: 'career',
  },
  {
    id: 'fight-anniversary-year',
    question: 'Konser ulang tahun JKT48 yang memperkenalkan tagline "Fight!" adalah?',
    options: ['12th Anniversary', '13th Anniversary', '14th Anniversary', '15th Anniversary'],
    correctIndex: 2,
    category: 'career',
  },
  {
    id: 'team-dream-resmi',
    question: 'Tanggal berapa Helisma resmi bergabung dengan Team Dream (era Fight 2026)?',
    options: [
      '1 Januari 2026',
      '1 Februari 2026',
      '1 Maret 2026',
      '1 April 2026',
    ],
    correctIndex: 3,
    category: 'career',
  },
  {
    id: 'tagline-2026',
    question: 'Tagline baru JKT48 sejak 2026 adalah?',
    options: ['Bloom', 'Fight!', 'New Era', 'Memoria'],
    correctIndex: 1,
    category: 'career',
  },

  // ── THEATER (10 soal) ─────────────────────────────────────────────
  {
    id: 'theater-debut-setlist',
    question: 'Apa nama setlist theater debut Helisma di JKT48?',
    options: [
      'Saka Agari',
      'Theater no Megami',
      'Pajama Drive',
      'Ramune no Nomikata',
    ],
    correctIndex: 1,
    category: 'theater',
  },
  {
    id: 'show-100-year',
    question: 'Di tahun berapa Helisma mencapai 100 theater show?',
    options: ['2018', '2019', '2020', '2021'],
    correctIndex: 1,
    category: 'theater',
  },
  {
    id: 'show-100-setlist',
    question: 'Setlist apa yang sedang berjalan saat Helisma menyentuh 100 show?',
    options: [
      'Theater no Megami',
      'Saka Agari',
      'Renai Kinshi Jourei',
      'Pajama Drive',
    ],
    correctIndex: 1,
    category: 'theater',
  },
  {
    id: 'show-200-year',
    question: 'Tahun berapa Helisma mencapai 200 theater show?',
    options: ['2020', '2021', '2022', '2023'],
    correctIndex: 1,
    category: 'theater',
  },
  {
    id: 'show-200-setlist',
    question: 'Setlist apa di 200 show milestone Helisma?',
    options: [
      'Saka Agari',
      'Renai Kinshi Jourei',
      'Ramune no Nomikata',
      'Pajama Drive',
    ],
    correctIndex: 1,
    category: 'theater',
  },
  {
    id: 'show-300-year',
    question: 'Tahun berapa Helisma mencapai 300 theater show?',
    options: ['2023', '2024', '2025', '2026'],
    correctIndex: 1,
    category: 'theater',
  },
  {
    id: 'show-300-setlist',
    question: 'Setlist apa di 300 show milestone Helisma?',
    options: [
      'Pertaruhan Cinta',
      'Renai Kinshi Jourei',
      'Ramune no Nomikata',
      'Theater no Megami',
    ],
    correctIndex: 2,
    category: 'theater',
  },
  {
    id: 'show-count-2026',
    question: 'Total per April 2026, jumlah theater show Helisma telah mencapai sekitar?',
    options: ['250', '350', '385', '500'],
    correctIndex: 2,
    category: 'theater',
  },
  {
    id: 'pertaruhan-shonichi-date',
    question: 'Helisma tampil di Pertaruhan Cinta shonichi pada tanggal?',
    options: [
      '10 Oktober 2025',
      '11 Oktober 2025',
      '12 Oktober 2025',
      '13 Oktober 2025',
    ],
    correctIndex: 2,
    category: 'theater',
  },
  {
    id: 'dream-bakudan-shonichi',
    question: 'Setlist shonichi Team Dream di era Fight 2026 berjudul?',
    options: [
      'Renai Kinshi Jourei',
      'Dream Bakudan',
      'Pertaruhan Cinta',
      'Pajama Drive',
    ],
    correctIndex: 1,
    category: 'theater',
  },

  // ── DISCOGRAPHY (8 soal) ──────────────────────────────────────────
  {
    id: 'first-senbatsu-single',
    question: 'Single original JKT48 pertama yang melibatkan Helisma sebagai Senbatsu?',
    options: [
      'Pertaruhan Cinta',
      'Dream Bakudan',
      'Rapsodi',
      'Darashinai Aishikata',
    ],
    correctIndex: 2,
    category: 'discography',
  },
  {
    id: 'first-senbatsu-year',
    question: 'Helisma pertama kali masuk Senbatsu di tahun?',
    options: ['2019', '2020', '2021', '2022'],
    correctIndex: 1,
    category: 'discography',
  },
  {
    id: 'rapsodi-rank',
    question: 'Saat sousenkyo Rapsodi (2020), Helisma menempati peringkat berapa?',
    options: ['13', '14', '15', '16'],
    correctIndex: 2,
    category: 'discography',
  },
  {
    id: 'rapsodi-votes',
    question: 'Suara Helisma di Sousenkyo Rapsodi (Senbatsu, 2020)?',
    options: ['~10.000', '~15.000', '~20.000', '~25.000'],
    correctIndex: 1,
    category: 'discography',
  },
  {
    id: 'sousenkyo-2024-rank',
    question: 'Sousenkyo 2024 (Undergirls), Helisma di rank berapa?',
    options: ['20', '21', '22', '23'],
    correctIndex: 2,
    category: 'discography',
  },
  {
    id: 'undergirls-single',
    question: 'Helisma tampil di Undergirls untuk single apa di tahun 2025?',
    options: [
      'Sayonara Crawl',
      'Darashinai Aishikata',
      'Bibir yang Telah Dicuri',
      'Rapsodi',
    ],
    correctIndex: 2,
    category: 'discography',
  },
  {
    id: 'single-2023',
    question: 'Salah satu single JKT48 yang Helisma ikuti pada 2023?',
    options: ['Pertaruhan Cinta', 'Sayonara Crawl', 'Rapsodi', 'Dream Bakudan'],
    correctIndex: 1,
    category: 'discography',
  },
  {
    id: 'spv-2024',
    question: 'Helisma muncul di Special Performance Video JKT48 berjudul?',
    options: [
      'Lembayung Senja',
      'Langit Biru Cinta Searah',
      'Cinta yang Hilang',
      'Sayonara Crawl',
    ],
    correctIndex: 1,
    category: 'discography',
  },

  // ── SOCIAL & TRIVIA (7 soal) ──────────────────────────────────────
  {
    id: 'instagram',
    question: 'Akun Instagram resmi Helisma?',
    options: ['@jkt48_eli', '@jkt48.eli', '@eli_jkt48', '@h_eli_jkt'],
    correctIndex: 1,
    category: 'social',
  },
  {
    id: 'twitter',
    question: 'Username X (Twitter) Helisma?',
    options: ['@ElijktOfficial', '@H_EliJKT48', '@jkt48eli', '@CeuEli'],
    correctIndex: 1,
    category: 'social',
  },
  {
    id: 'tiktok',
    question: 'Username TikTok Helisma?',
    options: ['@elijkt48', '@jkt48eli', '@h_eli', '@ceueli_official'],
    correctIndex: 0,
    category: 'social',
  },
  {
    id: 'belajar-konseling',
    question: 'Program varietas Helisma di JKT48 TV (Juli 2025)?',
    options: [
      'Belajar Bersama',
      'Belajar Konseling',
      'Belajar Theater',
      'Belajar Mengajar',
    ],
    correctIndex: 1,
    category: 'trivia',
  },
  {
    id: 'belajar-konseling-role',
    question: 'Di program Belajar Konseling, Helisma berperan sebagai?',
    options: ['Senpai Eli', 'Buna Eli', 'Kakak Eli', 'Sensei Eli'],
    correctIndex: 1,
    category: 'trivia',
  },
  {
    id: 'pertaruhan-original',
    question: 'Setlist "Pertaruhan Cinta" istimewa karena?',
    options: [
      'Adaptasi dari AKB48',
      'Ditulis khusus untuk JKT48',
      'Cover lagu daerah',
      'Lagu sebelum era 2010',
    ],
    correctIndex: 1,
    category: 'trivia',
  },
  {
    id: 'sousenkyo-2018-date',
    question: 'Sousenkyo 2018 yang diikuti Helisma sebagai trainee tepatnya tanggal?',
    options: [
      '27 September 2018',
      '27 Oktober 2018',
      '27 November 2018',
      '27 Desember 2018',
    ],
    correctIndex: 1,
    category: 'trivia',
  },
];

/**
 * Reward config:
 *   - 5 soal per hari (random dari pool 50, deterministic per date)
 *   - 3 buah per correct answer
 *   - Max 15 buah/hari dari kuis (5 × 3)
 *   - Wrong: 0 buah, no retry sampai midnight WIB next day
 */
export const QUIZ_REWARD_BUAH = 3;
export const QUIZ_QUESTIONS_PER_DAY = 5;
export const QUIZ_MAX_BUAH_PER_DAY =
  QUIZ_REWARD_BUAH * QUIZ_QUESTIONS_PER_DAY; // 15

/**
 * Hash-based seed dari date string (YYYY-MM-DD). djb2 algorithm,
 * stable across runs.
 */
const djb2 = (str) => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

// Seeded PRNG — mulberry32. Dipakai untuk shuffle quiz pool secara
// deterministic per date (semua user same shuffle order untuk hari sama).
const mulberry32 = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Pick N quiz dari pool untuk hari tertentu — deterministic dari
 * date string. Same date = same set untuk semua user (community
 * angle). Set per hari beda total (Fisher-Yates shuffle seeded).
 */
export const pickDailyQuizSet = (
  dateStr,
  count = QUIZ_QUESTIONS_PER_DAY,
) => {
  const seed = djb2(dateStr || 'default');
  const rng = mulberry32(seed);
  const indices = Array.from(
    { length: HELISMA_QUIZ_POOL.length },
    (_, i) => i,
  );
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, count).map((idx) => HELISMA_QUIZ_POOL[idx]);
};
