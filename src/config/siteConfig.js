/**
 * Site Configuration
 * Central configuration for Armeniaca - Eli JKT48 Fan Gallery
 * All hardcoded content should be moved here
 */

// Photo Frame Project (Palette.id × Armeniaca) launch gate. Until this
// moment, the Home card, the navbar entry, and the AnnouncementPopup
// stay hidden. Bump the date here when planning to launch earlier/later;
// everything else flows from this single constant.
const PHOTO_FRAME_AVAILABLE_FROM_ISO = '2026-06-01T00:00:00+07:00';
const PHOTO_FRAME_AVAILABLE_UNTIL_ISO = '2026-07-16T00:00:00+07:00';

export const PHOTO_FRAME_CAMPAIGN = {
  availableFromIso: PHOTO_FRAME_AVAILABLE_FROM_ISO,
  availableUntilIso: PHOTO_FRAME_AVAILABLE_UNTIL_ISO,
};

// Videotron Project (Armeniaca) launch gate — same mechanic as Photo Frame.
const VIDEOTRON_AVAILABLE_FROM_ISO = '2026-06-13T00:00:00+07:00';

const VIDEOTRON_AVAILABLE_UNTIL_ISO = '2026-06-16T00:00:00+07:00';

export const VIDEOTRON_CAMPAIGN = {
  availableFromIso: VIDEOTRON_AVAILABLE_FROM_ISO,
  availableUntilIso: VIDEOTRON_AVAILABLE_UNTIL_ISO,
};

export const SITE_CONFIG = {
  // Branding
  branding: {
    name: 'Armeniaca',
    tagline: '#BloomInSpring',
    fullName: 'ARMENIACA',
    description: 'A dedicated fan gallery preserving the most beautiful moments of Helisma Putri (Eli JKT48)',
  },

  // Site Metadata
  site: {
    title: 'Armeniaca — Arsip Visual Eli JKT48',
    description:
      'Arsip visual independen untuk Helisma Putri (Eli JKT48). Mendokumentasikan panggung, event, dan momen Ceu Eli dari Generasi 7 hingga era Team Dream JKT48 Fight 2026.',
    url: 'https://armeniaca.online',
    keywords: ['Eli JKT48', 'Helisma Putri', 'JKT48', 'Team Dream', 'JKT48 Fight 2026', 'fan archive', 'Armeniaca'],
  },

  // Social Links
  social: {
    instagram: '',
    twitter: 'https://x.com/armeniaca15',
    eliTwitter: 'https://x.com/H_EliJKT48',
    fanbase: 'https://x.com/helismiley_ofc',
  },

  // Navigation — items with `children` render as dropdowns. The top-level
  // `hash` (when present alongside children) becomes the dropdown's primary
  // landing target and the parent label remains clickable.
  navigation: {
    main: [
      { label: 'Home', hash: 'home', icon: 'ri-home-4-line' },
      { label: 'Harmoni Kebaikan', hash: 'happy-helisma-day-26', icon: 'ri-hand-heart-line' },
      {
        label: 'Eli',
        hash: 'profile',
        icon: 'ri-user-3-line',
        children: [
          {
            label: 'Profil Lengkap',
            hash: 'profile',
            description: 'Timeline, diskografi, fight',
            icon: 'ri-route-line',
          },
          {
            label: 'Profil Singkat',
            hash: 'data',
            description: 'Biodata cepat di home',
            icon: 'ri-id-card-line',
          },
          {
            label: 'About Eli',
            hash: 'about-preview',
            description: 'Cerita Sang Mermaid',
            icon: 'ri-quill-pen-line',
          },
        ],
      },
      {
        label: 'Memoria',
        hash: 'gallery',
        icon: 'ri-gallery-line',
        children: [
          {
            label: 'Foto · Semua Memoria',
            hash: 'gallery',
            description: 'Lihat seluruh frame',
            icon: 'ri-image-2-line',
          },
          {
            label: 'Live · Vivo',
            hash: 'vivo',
            description: 'Playlist IDN & SHOWROOM Eli',
            icon: 'ri-live-line',
          },
          {
            label: 'IDN Live',
            hash: 'vivo-idn',
            description: 'Arsip live di IDN',
            icon: 'ri-broadcast-line',
          },
          {
            label: 'SHOWROOM',
            hash: 'vivo-showroom',
            description: 'Arsip live di SHOWROOM',
            icon: 'ri-vidicon-line',
          },
          // Era pills are appended dynamically from the gallery data
        ],
      },
      {
        label: 'Arme Games',
        hash: 'armeniacaTown',
        icon: 'ri-gamepad-line',
        children: [
          {
            label: 'ArmeniacaTown',
            hash: 'armeniacaTown',
            description: 'Kota yang tumbuh dari setiap siraman.',
            icon: 'ri-map-pin-2-line',
          },
          {
            label: 'ArmePack',
            hash: 'armepack',
            description: 'Tiga kartu tiap hari — The Life of Armeniaca.',
            icon: 'ri-leaf-line',
          },
        ],
      },
      { label: 'News', hash: 'news', icon: 'ri-newspaper-line' },
      { label: 'Jadwal', hash: 'schedule', icon: 'ri-calendar-event-line' },
      { label: 'About', hash: 'about', icon: 'ri-information-line' },
    ],
  },

  // Birthday Countdown
  //
  // `completed*` fields take over the page from the moment
  // `targetIso` passes (live, second-by-second via the page's
  // setInterval — no refresh needed). Form/timer cards hide and
  // celebration copy slots in place. Mirrors the Wishes takeover so
  // both pages stay editorially consistent.
  // Aula petak (r6) — virtual companion event di FX Sudirman.
  // `eventDateIso` placeholder pakai 15 Juni 2026 (ultah Eli) karena
  // jadwal resmi dari office JKT48 belum confirmed. Update saat jadwal
  // umum keluar — petak code baca dari sini, gak perlu code change.
  // `permanent: true` artinya setelah eventDate lewat, petak stay open
  // selamanya (companion archive). Set false kalau mau event window-only.
  aulaGaleri: {
    eventDateIso: '2026-06-15T10:00:00+07:00',
    permanent: true,
    venue: 'FX Sudirman',
  },

  countdown: {
    targetIso: '2026-06-15T00:00:00+07:00',
    targetLabel: '15 Juni 2026 · 00:00 WIB',
    eyebrow: 'Countdown',
    title: 'Menghitung Hari',
    titleAccent: 'untuk Ceu Eli.',
    lead:
      'Helisma Putri akan merayakan ulang tahun ke-26 pada 15 Juni 2026. Armeniaca menghitung mundur menjelang harinya — momen kecil sebelum stage besar.',
    age: 26,
    backgroundImage: '/cgv/queen cemot.png',
    completedEyebrow: 'Rekap Seitansai',
    completedTitle: 'Momen ke-26',
    completedAccent: 'sudah berlalu.',
    completedLead:
      '15 Juni 2026 sudah lewat — tapi jejaknya tetap di sini. Setiap ucapan, setiap kebaikan, setiap lagu yang menunggu dibuka. Ini adalah catatan kolektif dari mereka yang merayakan bersama.',
    completedAboutEyebrow: 'Kilas Balik',
    completedAboutTitle: '15 Juni 2026, momen ke-{age}.',
    completedAboutBody:
      'Helisma Putri Kurnia lahir di Bandung pada 15 Juni 2000. Di tengah era JKT48 Fight 2026 dan posisinya di Team Dream, ulang tahun ke-{age}-nya menandai satu dekade lebih perjalanan musiknya — satu frame yang Armeniaca rawat untuk selalu diingat.',
    // Gift box reveal pool — random pairing of one photo + one quote
    // shown when fans open the gift on the celebration plate. Photos
    // and quotes are paired independently on each open, so 10 × 10 =
    // 100 unique combinations.
    gifts: {
      photos: [
        '/archive/img-310.jpg',
        '/archive/img-211.jpg',
        '/archive/img-119.jpg',
        '/archive/img-087.jpg',
        '/archive/img-083.jpg',
        '/archive/img-335.jpg',
        '/archive/img-070.jpg',
        '/archive/img-022.jpg',
        '/archive/img-359.jpg',
        '/archive/img-148.jpg',
      ],
      quotes: [
        'Bagai lembayung senja — menghangatkan setiap panggung.',
        'Dari Generasi 7 sampai Team Dream, setiap frame disimpan rapi.',
        'Sang mermaid dari Bandung yang tak pernah berhenti bersinar.',
        'Helismiley selalu ada di setiap stage Eli.',
        'We bloom in spring with you, Ceu Eli.',
        'Satu dekade lebih, dan masih terus tumbuh.',
        'Senyum Eli adalah cahaya yang Armeniaca rawat.',
        'Dari layar TV ke teater, perjalanan yang panjang.',
        'Di setiap frame, Eli selalu jadi yang paling hangat.',
        'Mekar di akhir musim dingin — itulah Armeniaca, itulah Eli.',
      ],
    },
  },

  // Birthday Wishes Wall — fans submit ucapan menjelang 15 Juni 2026.
  // endpoint kosong = form akan tampil dengan "demo mode" notice. Set ke
  // Formspree (https://formspree.io/), Web3Forms, atau backend lain yang
  // menerima POST application/x-www-form-urlencoded untuk aktifkan.
  //
  // `completed*` fields take over the page header from 15 Juni 2026
  // onward (date check uses countdown.targetIso). Form stays open so
  // late wishes still land — the takeover is purely editorial.
  wishes: {
    eyebrow: 'Birthday Wishes',
    title: 'Ucapkan untuk',
    titleAccent: 'Ceu Eli.',
    lead:
      'Tinggalkan pesan untuk Eli — meski 15 Juni 2026 sudah lewat, pesanmu tetap kami terima. Pesan akan dimoderasi Armeniaca lalu masuk ke dinding ini — catatan kolektif yang terus bertambah.',
    completedEyebrow: 'Selamat Ulang Tahun',
    completedTitle: 'Terima kasih atas',
    completedTitleAccent: 'semua ucapannya.',
    completedLead:
      '15 Juni 2026 sudah lewat — Eli kini berusia 26. Wall ini penuh dengan pesan yang tertulis menjelang harinya. Telat? Boleh banget, masih kami terima — pesannya tetap masuk dinding ini.',
    completedCountdownLink: 'Lihat momen 15 Juni 2026',
    formCta: 'Kirim Ucapan',
    successMessage:
      'Pesanmu sudah masuk! Armeniaca akan moderasi dan tampilkan di wall dalam waktu dekat.',
    pendingMessage:
      'Pesan akan dikurasi sebelum tampil — biasanya dalam 24 jam. Pastikan nama & handle benar ya.',
    demoMessage:
      'Form dalam mode demo — endpoint backend belum dikonfigurasi. Pesan tidak akan terkirim sampai owner men-set endpoint.',
    charLimit: 240,
    endpoint: '', // contoh: 'https://formspree.io/f/xxxxxxxx'
    seeds: [
      {
        name: 'Armeniaca',
        handle: '@armeniaca15',
        message:
          'Selamat ulang tahun, Ceu Eli. Tetap jadi sinar senja yang menghangatkan panggung — kami akan terus mengabadikan setiap momennya.',
        date: '2026-04-15',
      },
      {
        name: 'Helismiley',
        handle: '@helismiley_',
        message:
          'Happy birthday Eli! Dari panggung pertama sampai sekarang, kamu selalu jadi alasan kami datang ke teater. Semoga tahun ke-26 penuh kebahagiaan.',
        date: '2026-06-15',
      },
      {
        name: 'Penggemar Bandung',
        handle: '',
        message:
          'Ceu Eli tetap kebanggaan Bandung. Dari audisi 2018 sampai Team Dream, perjalanannya selalu menginspirasi. HBD ke-26!',
        date: '2026-06-14',
      },
      {
        name: 'Fans Lama Gen 7',
        handle: '',
        message:
          'Masih ingat pertama kali lihat Eli di Academy Class B. Sekarang sudah 8 tahun lebih dan masih di sini — terus bersinar ya, Ceu.',
        date: '2026-06-13',
      },
      {
        name: 'NCTzen × Helismiley',
        handle: '',
        message:
          'Eli yang suka Jaehyun, kami yang suka Eli. Selamat ulang tahun, semoga semakin sukses di JKT48 dan selalu bahagia!',
        date: '2026-06-15',
      },
    ],
  },

  // Hero Slider Content
  hero: {
    slides: [
      {
        id: 1,
        image: '/archive/img-000.jpg',
        title: 'Eli',
        subtitle: 'The Lovely Mermaid',
        meta: 'JKT48 Eli | ARCHIVE',
      },
      {
        id: 2,
        image: '/archive/img-002.jpg',
        title: 'The Most',
        subtitle: 'Beautiful Woman',
        meta: 'JKT48 Eli | SEASONS',
      },
      {
        id: 3,
        image: '/archive/img-004.jpg',
        title: 'Capturing Every',
        subtitle: 'Moment',
        meta: 'JKT48 Eli | MOMENTS',
      },
    ],
    autoPlayDelay: 5500,
  },

  // Home Page Stats
  stats: [
    { number: '1,000+', label: 'Moments Captured', icon: 'ri-camera-lens-line' },
    { number: 'JKT48', label: 'Primary Era', icon: 'ri-shining-line' },
    { number: '15.06', label: 'Golden Date', icon: 'ri-star-smile-line' },
    { number: '43', label: 'Latest Updates', icon: 'ri-refresh-line' },
  ],

  // Eli Profile Facts (sourced from JKT48 Wiki / generasia)
  eli: {
    fullName: 'Helisma Mauludzunia Putri Kurnia',
    stageName: 'Eli',
    nickname: 'Ceu Eli',
    birthplace: 'Bandung, Jawa Barat',
    birthdate: '15 Juni 2000',
    // ISO form of birthdate for live age math (used by Countdown's
    // EliAgeClock — keep in sync with `birthdate` above).
    birthdateIso: '2000-06-15T00:00:00+07:00',
    generation: 'Generasi 7 JKT48',
    team: 'Team Dream',
    joined: '29 September 2018',
    origin: 'Bandung',
    catchphrase:
      'Bagai Lembayung Senja, Dengan Energi Kegembiraan ku aku akan menghangatkan suasana.',
    portrait: '/archive/img-364.jpg',
    // Eli's official social / live-streaming handles. Rendered in the
    // "Profil Singkat" (Data Eli) section on Home as inline icon
    // links. To add more (Instagram, TikTok, etc), append to this
    // array — the row layout adapts.
    socials: [
      { platform: 'Instagram', handle: '@jkt48.eli', url: 'https://www.instagram.com/jkt48.eli/', icon: 'ri-instagram-line' },
      { platform: 'X', handle: '@H_EliJKT48', url: 'https://x.com/H_EliJKT48', icon: 'ri-twitter-x-line' },
      { platform: 'TikTok', handle: '@elijkt48', url: 'https://www.tiktok.com/@elijkt48', icon: 'ri-tiktok-line' },
      { platform: 'IDN Live', handle: 'jkt48_eli', url: 'https://www.idn.app/jkt48_eli', icon: 'ri-broadcast-line' },
      { platform: 'SHOWROOM', handle: 'JKT48_Eli', url: 'https://www.showroom-live.com/r/JKT48_Eli', icon: 'ri-vidicon-line' },
    ],
    // Career stats anchor for the LiveCounter on /schedule.
    //
    // Why a manual baseline: jkt48.com's `/api/v1/schedules` has gaps
    // for older shows (especially 2018-2020 era) — an automated walk
    // catches ~98% of theater appearances but misses a handful of
    // revival/Sousenkyo nights. Manual count diperbarui via TSV log
    // di scripts/eli-show-log.tsv. LiveCounter ambil baseline ini dan
    // tambahkan shows di eli-schedule.json dengan date > asOfDate
    // untuk compute live total tanpa re-run manual count.
    //
    // Update protocol: bump `theater` + `asOfDate` saat TSV diperbarui.
    careerStats: {
      asOfDate: '2026-04-26',
      // Lifetime theater shows (SHOW + in-theater EVENT). Includes
      // regular stages, Sousenkyo concerts, anniversary nights,
      // dedicated theater sessions. Excludes Video Calls, M&G, off-site.
      theater: 385,
    },
  },

  // Home Page (corsyava-style flow)
  home: {
    hero: {
      eyebrow: 'Arsip Visual Independen',
      title: 'Selamat Datang di Armeniaca',
      subtitle: 'Arsip Visual Helisma Putri — Eli JKT48',
      lead:
        'Arsip visual independen untuk Helisma Putri (Eli JKT48) — member aktif Generasi 7 dari Bandung, kini di Team Dream untuk Fight 2026. Kami rawat panggung-panggungnya satu per satu, dari perayaan ulang tahun ke-26 hingga momen-momen yang belum datang.',
      backgrounds: [
        '/archive/img-310.jpg',
        '/archive/img-305.jpg',
        '/archive/img-211.jpg',
        '/archive/img-119.jpg',
        '/archive/img-087.jpg',
        '/archive/img-083.jpg',
        '/archive/img-335.jpg',
        '/archive/img-364.jpg',
        '/archive/img-148.jpg',
        '/archive/img-050.jpg',
        '/archive/img-207.jpg',
        '/archive/img-359.jpg',
      ],
      backgroundIntervalMs: 18000,
      primaryCta: { label: 'Jelajahi Memoria', hash: 'gallery', icon: 'ri-arrow-right-up-line' },
      secondaryCta: { label: 'Mengenal Armeniaca', hash: 'about', icon: 'ri-information-line' },
    },
    // Notice block — three sub-pages of the birthday/charity hub
    // surfaced together so visitors landing on Home immediately see
    // the project even if they skip the navbar dropdown.
    harmoniKebaikan: {
      eyebrow: 'Notice · Harmoni Kebaikan',
      title: 'Harmoni Kebaikan',
      titleAccent: 'untuk Ceu Eli.',
      lead:
        'Ulang tahun ke-26 Ceu Eli pada 15 Juni 2026 telah berlalu — tapi arsip perayaannya tetap hidup di sini. Pohon kebaikan terus bertumbuh, ucapan tetap masuk, dan momen itu diabadikan selamanya. Hadiah dari penggemar, untuk Eli.',
      cards: [
        {
          eyebrow: 'Project Inti',
          label: '#26 — Pohon Kebaikan',
          description:
            'Pohon untuk Eli yang tumbuh dari setiap dukungan komunitas. 100 dukungan = naik satu tahap, sampai berbuah aprikot.',
          ctaLabel: 'Sirami pohonnya',
          icon: 'ri-plant-line',
          hash: '26',
        },
        {
          eyebrow: 'Bukti Nyata',
          label: 'Galeri Kebaikan',
          description:
            'Arsip donasi yang sudah disalurkan atas nama Ceu Eli — lingkungan, satwa, kemanusiaan. Project Helismiley × Armeniaca.',
          ctaLabel: 'Lihat arsipnya',
          icon: 'ri-heart-3-line',
          hash: 'galeri-kebaikan',
        },
        {
          eyebrow: 'Pengumuman',
          label: 'Photo Frame Project',
          description:
            'Cetak photobox dengan bingkai khusus Helisma Day di booth Palette.id. 3 lokasi, 15 Juni — 15 Juli 2026.',
          ctaLabel: 'Lihat infonya',
          icon: 'ri-camera-2-line',
          hash: 'photo-frame-popup',
          availableFromIso: PHOTO_FRAME_AVAILABLE_FROM_ISO,
          availableUntilIso: PHOTO_FRAME_AVAILABLE_UNTIL_ISO,
        },
        {
          eyebrow: 'Pengumuman',
          label: 'Videotron Project',
          description:
            'Double-sided videotron di Pillar MRT Blok M — 3 pilar, 6 layar. Senin, 15 Juni 2026, 06.00–24.00 WIB.',
          ctaLabel: 'Lihat infonya',
          icon: 'ri-vidicon-line',
          hash: 'videotron-popup',
          availableFromIso: VIDEOTRON_AVAILABLE_FROM_ISO,
          availableUntilIso: VIDEOTRON_AVAILABLE_UNTIL_ISO,
        },
        {
          eyebrow: 'Rekap',
          label: 'Rekap Seitansai',
          description:
            'Kilas balik momen ke-26 Ceu Eli — ucapan, kebaikan, lagu, dan kenangan yang terangkum di satu halaman.',
          ctaLabel: 'Lihat rekapnya',
          icon: 'ri-time-line',
          hash: 'countdown',
        },
        {
          eyebrow: 'Pesan Komunitas',
          label: 'Wishes Wall',
          description:
            'Tinggalkan ucapan untuk Eli. Pesan masuk dinding setelah dimoderasi — jadi catatan kolektif Helismiley.',
          ctaLabel: 'Kirim ucapan',
          icon: 'ri-mail-send-line',
          hash: 'wishes',
        },
        {
          eyebrow: 'Lagu Penanda',
          label: 'ByU Music — Putri Helisma',
          description:
            'Lagu By-U untuk Eli, dirilis 15 Juni 2026. Player sudah terbuka — dengarkan kolaborasi khusus dari komunitas.',
          ctaLabel: 'Buka ByU Music',
          icon: 'ri-music-line',
          hash: 'byu-music',
        },
        {
          eyebrow: 'Kota Tumbuh',
          label: 'ArmeniacaTown',
          description:
            'Kota yang tumbuh dari setiap kebaikan. Reforest area yang dulu kering, panggung untuk donasi nyata, peta dengan landmark — semua hidup bertahap per siraman.',
          ctaLabel: 'Masuki Kota',
          icon: 'ri-map-pin-2-line',
          hash: 'armeniacaTown',
        },
      ],
    },
    data: {
      eyebrow: 'Data Eli',
      title: 'Profil Singkat',
      subtitle: 'Fakta dasar tentang Helisma Putri — Eli JKT48.',
    },
    about: {
      eyebrow: 'About Eli',
      title: 'Sang Mermaid dari Bandung',
      paragraphs: [
        'Helisma Putri Kurnia — atau Ceu Eli — debut sebagai member Generasi 7 JKT48 pada 29 September 2018. Lahir di Bandung 15 Juni 2000, ia membagi waktu antara panggung dan kuliah Sastra Korea.',
        'Sejak debut, namanya melekat dengan vokal matang, presence panggung yang hangat, dan kepemimpinan yang muncul natural di tiap unit yang ia tempati.',
        'Tahun ini Eli tergabung di Team Dream untuk JKT48 Fight 2026 — babak baru dengan format kompetisi yang menempatkan setiap member di tim baru. Armeniaca merawat setiap momennya, dari perayaan ulang tahun ke-26 yang telah berlalu hingga panggung-panggung selanjutnya.',
      ],
      ctaLabel: 'Selengkapnya',
      ctaHash: 'about',
      portrait: '/archive/img-070.jpg',
      portraitAlt: 'Helisma Putri (Eli JKT48)',
    },
    gallery: {
      eyebrow: 'Gallery Eli',
      title: 'Frame Pilihan',
      subtitle: 'Momen-momen pilihan dari arsip Armeniaca.',
      ctaLabel: 'Lihat Semua Memoria',
      ctaHash: 'gallery',
      // Hover-reveal highlight reel — each entry shows 3 frames floating
      // around the hovered title with mouse parallax. Edit the array to
      // add/remove memorable moments; first 3 image paths render as the
      // floating frames. Frame paths can be .jpg / .webp / .avif (the
      // page derives all three formats from the stem).
      highlightsEyebrow: 'Memorable',
      highlightsTitle: 'Hover untuk lihat momennya.',
      highlights: [
        {
          title: 'Armeniaca Debut',
          subtitle: '231015 · Indomaret Fresh Pahlawan Seribu, BSD',
          frames: [
            '/archive/img-365.webp',
            '/archive/img-363.jpg',
            '/archive/img-353.jpg',
          ],
        },
        {
          title: 'TV Station',
          subtitle: '240111 · Konser Raya 29 Tahun Indosiar Luar Biasa',
          frames: [
            '/archive/img-335.jpg',
            '/archive/img-334.jpg',
            '/archive/img-333.jpg',
            '/archive/img-332.webp',
          ],
        },
        {
          title: 'Airport Fashion',
          subtitle: 'Every Airport',
          frames: [
            '/archive/img-207.jpg',
            '/archive/img-142.jpg',
            '/archive/img-050.jpg',
            '/archive/img-033.jpg',
          ],
        },
        {
          title: 'JKT48 Event',
          subtitle: 'JKT48 Official Event',
          frames: [
            '/archive/img-090.jpg',
            '/archive/img-106.jpg',
            '/archive/img-073.jpg',
          ],
        },
        {
          title: 'Team Dream',
          subtitle: 'Adventure with Team Dream',
          frames: [
            '/archive/img-366.jpg',
            '/archive/img-369.jpg',
            '/archive/img-372.jpg',
            '/archive/img-377.jpg',
          ],
        },
      ],
    },
    community: {
      eyebrow: 'About Helismiley',
      title: 'Komunitas Penggemar Eli',
      body:
        'Helismiley adalah fanbase resmi Helisma Putri. Armeniaca adalah arsip independen yang berdampingan dengan komunitas, fokus pada dokumentasi visual jangka panjang.',
      links: [
        { label: 'Helismiley (X)', url: 'https://x.com/helismiley_ofc', icon: 'ri-twitter-x-line' },
        { label: 'Helismiley (Instagram)', url: 'https://www.instagram.com/helismiley_ofc/', icon: 'ri-instagram-line' },
        { label: 'Eli JKT48 (X)', url: 'https://x.com/H_EliJKT48', icon: 'ri-twitter-x-line' },
      ],
    },
  },

  // Vivo — live streaming archive page (/vivo). Two YouTube playlists
  // covering Eli's IDN Live and SHOWROOM sessions. Each platform gets
  // its own anchored section so deep links from the navbar dropdown
  // (#vivo-idn, #vivo-showroom) jump directly to the right embed.
  vivo: {
    eyebrow: 'Live Streaming · Arsip',
    title: 'Vivo',
    titleAccent: 'momen live Eli.',
    lead:
      'Arsip lengkap live streaming Helisma Putri di IDN Live dan SHOWROOM — tertawa, lagu, ngobrol panjang dengan Helismiley. Auto-update kalau playlist YouTube ditambah.',
    coverImage: '/archive/img-211.jpg',
    coverPosition: '50% 30%',
    platforms: [
      {
        id: 'vivo-idn',
        platform: 'IDN Live',
        platformIcon: 'ri-broadcast-line',
        platformColor: '#0061ff',
        title: 'IDN Live Sessions',
        description:
          'Sesi panjang dengan tema bebas — quiz, makan bareng, talk show kecil. Eli sering bawakan ini dengan member lain di IDN App.',
        playlistId: 'PLfEpwox-vkk4QauAvybcmXzOs1RVb2EZn',
        playlistUrl:
          'https://www.youtube.com/playlist?list=PLfEpwox-vkk4QauAvybcmXzOs1RVb2EZn',
        liveProfileUrl: 'https://www.idn.app/jkt48_eli',
        liveProfileLabel: 'Tonton Live di IDN',
        // Curated top picks — featured above the full playlist embed.
        // Order matters: shown left-to-right. Click loads YT iframe in place.
        topPicks: [
          'uTjBJoSPlDs',
          'zoK9cNDRNs4',
          'nxTI_wyYdyw',
        ],
      },
      {
        id: 'vivo-showroom',
        platform: 'SHOWROOM',
        platformIcon: 'ri-vidicon-line',
        platformColor: '#ff5d6e',
        title: 'SHOWROOM Sessions',
        description:
          'Live intim Eli di platform SHOWROOM — bercakap dengan fans, request lagu, momen kecil sebelum dan sesudah show.',
        playlistId: 'PLX15XB_3XZuSFq7SLPIuyXbdPJjxhwd0M',
        playlistUrl:
          'https://www.youtube.com/playlist?list=PLX15XB_3XZuSFq7SLPIuyXbdPJjxhwd0M',
        liveProfileUrl: 'https://www.showroom-live.com/r/JKT48_Eli',
        liveProfileLabel: 'Tonton Live di SHOWROOM',
        topPicks: [
          'X6aJYiK4N08',
          'fSbR0-01sfA',
          'p3LF7VpQWKk',
        ],
      },
    ],
  },

  // Sedang Dijual — manual merch list shown on /schedule. Distinct
  // from OnSaleStrip (which reads /data/eli-sales.json for live M&G +
  // photobook sales). Use this for physical merch (t-shirts, photobook
  // bonus items, anything not surfaced by the API). `link: null`
  // renders the disabled "Link Menyusul" badge until the listing
  // goes live.
  sedangDijual: {
    eyebrow: 'Sedang Dijual',
    title: 'Merchandise Eli',
    titleAccent: 'pre-order & official store.',
    lead:
      'Daftar merchandise resmi yang sedang dijual. Update manual oleh tim Armeniaca tiap ada drop baru.',
    products: [
      {
        name: 'JKT48 Birthday T-Shirt Helisma Putri 2026',
        price: 'Rp225.000',
        priceNote: '3XL & 4XL: Rp240.000',
        sizes: ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'],
        preorderUntil: '16 Mei 2026',
        bonus: 'Bonus 1 pcs random birthday card',
        image: '/bdts/bdts.jpg',
        imageAlt:
          'JKT48 Birthday T-Shirt Helisma Putri 2026 — desain hijau dengan ilustrasi tarot mermaid',
        store: 'JKT48 Official Store · Tokopedia',
        // PO ditutup 16 Mei 2026. Link sengaja di-null-kan supaya
        // MerchCard render "PO Sudah Tutup" pill (gaya non-interactive
        // sama dengan state Link Menyusul) — informasi merch tetap
        // terlihat tanpa nge-link ke listing yang sudah expired.
        link: null,
        linkPendingLabel: 'PO Sudah Tutup',
      },
    ],
  },

  // Profil Lengkap (multi-section profile page)
  profile: {
    issue: 'Issue No. 01',
    edition: 'JKT48 Fight 2026 Edition',
    eyebrow: 'Profil Lengkap',
    title: 'Arsip Eli,',
    titleAccent: 'Bab demi Bab.',
    lead:
      'Riwayat karier Eli, partisipasi single, setlist teater, posisinya di JKT48 Fight 2026, sampai trivia ringan — semua dirangkum dalam satu tempat.',
    heroCollage: [
      '/archive/img-310.jpg',
      '/archive/img-142.jpg',
      '/archive/img-211.jpg',
    ],
    quickStats: [
      { label: 'Generasi', value: '7' },
      { label: 'Karier Aktif', value: '7+ Tahun' },
      { label: 'Team', value: 'Dream' },
      { label: 'Frame Arsip', value: '350+' },
    ],
  },

  // About Page Content
  about: {
    hero: {
      eyebrow: 'Tentang Proyek',
      title: 'Tentang',
      titleAccent: 'Armeniaca.',
      lead:
        'Arsip visual independen untuk Helisma Putri (Eli JKT48) — mendokumentasikan dari Generasi 7 hingga Team Dream.',
      // Era-range chips rendered next to the lead. Update the right-hand
      // value when Eli moves to a new team so the scope stays current.
      scope: {
        from: { label: 'Generasi 7', sub: '2018 · Debut' },
        to: { label: 'Team Dream', sub: '2026 · Fight' },
      },
      // Stack of portraits rendered as a draggable card-stack in the hero.
      // First entry is the resting top card. Each `src` stem auto-derives
      // .avif / .webp / .jpg <picture> sources at render time.
      portraits: [
        { src: '/archive/img-359.jpg', alt: 'Helisma Putri (Eli JKT48) — potret arsip.' },
        { src: '/archive/img-148.jpg', alt: 'Helisma Putri (Eli JKT48) — potret arsip.' },
        { src: '/archive/img-085.jpg', alt: 'Helisma Putri (Eli JKT48) — potret arsip.' },
        { src: '/archive/img-022.jpg', alt: 'Helisma Putri (Eli JKT48) — potret arsip.' },
        { src: '/archive/img-011.jpg', alt: 'Helisma Putri (Eli JKT48) — potret arsip.' },
        { src: '/archive/img-379.jpg', alt: 'Helisma Putri (Eli JKT48) — potret arsip.' },
      ],
    },
    etymology: {
      eyebrow: 'Tema & Simbolisme',
      title: 'Setelah musim dingin, yang mekar.',
      paragraphs: [
        'Nama "Armeniaca" diambil dari Prunus armeniaca — nama Latin untuk pohon aprikot. Bunga aprikot mekar di akhir musim dingin atau awal musim semi: putih hingga merah muda pucat, harum, muncul pada cabang yang masih gundul setelah musim dingin lewat.',
        'Tema Armeniaca berakar di momen itu — yang dingin akan lewat, yang baru akan mekar. Setiap simbol di logo membawa cerita kecilnya sendiri: dari bunga yang mekar, kupu-kupu yang siap terbang, sampai bintang yang menandai mimpi.',
      ],
      logo: {
        src: '/logo-armeniaca.png',
        alt: 'Wordmark Armeniaca dengan motif bunga aprikot, kupu-kupu, kepingan salju, dan bintang.',
      },
      motifsTitle: 'Setiap simbol punya arti.',
      motifs: [
        {
          name: 'Bunga aprikot mekar',
          meaning: 'Eli yang sudah dewasa.',
        },
        {
          name: 'Buah aprikot terbagi dua',
          meaning: 'Armeniaca yang sedang berkembang.',
        },
        {
          name: 'Daun arme yang lama',
          meaning: 'Akar yang sudah lama menemani — proyek yang tumbuh perlahan dan stabil.',
        },
        {
          name: 'Pita',
          meaning: 'Eli yang feminin dan cantik.',
        },
        {
          name: 'Kumbang',
          meaning: 'Eli pencinta hewan.',
        },
        {
          name: 'Kupu-kupu',
          meaning: 'Eli akan terbang jauh seperti kupu-kupu.',
        },
        {
          name: 'Kepingan salju (es)',
          meaning: 'Setelah musim dingin akan ada musim semi.',
        },
        {
          name: 'Bintang',
          meaning: 'Dreams — mimpi yang terus dijaga.',
        },
      ],
      paletteTitle: 'Palette',
      swatches: [
        { name: 'Cream', cssVar: 'var(--retro-cream)', hex: '#FDF6E3' },
        { name: 'Sepia', cssVar: 'var(--retro-sepia)', hex: '#D4A574' },
        { name: 'Gold', cssVar: 'var(--retro-gold)', hex: '#C9A961' },
        { name: 'Burgundy', cssVar: 'var(--retro-burgundy)', hex: '#8B4040' },
        { name: 'Brown Dark', cssVar: 'var(--retro-brown-dark)', hex: '#5C4A3A' },
      ],
    },
    philosophy: {
      eyebrow: 'Filosofi',
      quote:
        'Setiap panggung Eli adalah momen yang sekejap. Tugas Armeniaca adalah memastikan cahaya itu tetap terjaga di dalam frame, bahkan setelah lampu studio dimatikan.',
      author: 'Armeniaca',
    },
  },

  // Gallery Configuration
  gallery: {
    emptyMessage: 'No moments found',
    emptyDescription: 'Coba sesuaikan filter untuk menjelajahi era lain di arsip Armeniaca.',
    endMessage: 'End of Archive',
    endQuote: '"Her light continues to shine..."',
    loadingMessage: 'Loading more moments',
  },

  // Footer
  footer: {
    description:
      'Arsip visual independen untuk Helisma Putri (Eli JKT48). Mendokumentasikan panggung, event, dan momen Ceu Eli — dari Generasi 7 hingga era Team Dream JKT48 Fight 2026.',
    creditPrefix: 'Dibuat dengan',
    creditSuffix: 'untuk Eli JKT48',
    // Legal/transparency line — important for an unofficial fan
    // archive. Surfaced beside the copyright to make affiliation clear.
    disclaimer:
      'Arsip penggemar independen. Tidak berafiliasi resmi dengan JKT48 Operation Team.',
    // Editorial label for the footer eyebrow (replaces hardcoded
    // "Est. 2024"). Mirrors the rotated side caption in the hero.
    eyebrow: 'Mermaid Archive',
    // Data + collaboration credits — one row of attributed sources
    // replaces the generic "Crafted with ♥" credit so visitors can
    // trace what feeds the site.
    sources: [
      { label: 'jkt48.com', url: 'https://jkt48.com', note: 'Schedule & news' },
      { label: '@armeniaca15', url: 'https://x.com/armeniaca15', note: 'Frame archive' },
      { label: '@helismiley_', url: 'https://x.com/helismiley_', note: 'Komunitas Eli' },
    ],
  },
};

export default SITE_CONFIG;
