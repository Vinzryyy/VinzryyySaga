/**
 * Site Configuration
 * Central configuration for Armeniaca - Eli JKT48 Fan Gallery
 * All hardcoded content should be moved here
 */

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
      {
        label: 'Profil',
        icon: 'ri-user-3-line',
        children: [
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
          {
            label: 'Profil Lengkap',
            hash: 'profile',
            description: 'Timeline, diskografi, fight',
            icon: 'ri-route-line',
          },
        ],
      },
      {
        label: 'Archive',
        hash: 'gallery',
        icon: 'ri-gallery-line',
        children: [
          {
            label: 'Semua Arsip',
            hash: 'gallery',
            description: 'Lihat seluruh frame',
            icon: 'ri-stack-line',
          },
          // Era pills are appended dynamically from the gallery data
        ],
      },
      { label: 'Countdown', hash: 'countdown', icon: 'ri-cake-2-line' },
      // Wishes feature di-disable sementara — un-comment baris di bawah
      // (dan baris route di src/App.jsx) untuk re-enable.
      // { label: 'Wishes', hash: 'wishes', icon: 'ri-mail-send-line' },
      { label: 'About', hash: 'about', icon: 'ri-information-line' },
    ],
  },

  // Birthday Countdown
  countdown: {
    targetIso: '2026-06-15T00:00:00+07:00',
    targetLabel: '15 Juni 2026 · 00:00 WIB',
    eyebrow: 'Countdown',
    title: 'Menghitung Hari',
    titleAccent: 'untuk Ceu Eli.',
    lead:
      'Helisma Putri akan merayakan ulang tahun ke-26 pada 15 Juni 2026. Armeniaca menghitung mundur menjelang harinya — momen kecil sebelum stage besar.',
    age: 26,
    backgroundImage: '/archive/img-127.jpg',
    completedTitle: 'Selamat Ulang Tahun',
    completedAccent: 'Ceu Eli!',
    completedLead:
      '15 Juni 2026 sudah tiba. Terima kasih sudah menemani perjalanan Eli dari panggung ke panggung — Armeniaca tetap berjaga, satu frame demi satu frame.',
  },

  // Birthday Wishes Wall — fans submit ucapan menjelang 15 Juni 2026.
  // endpoint kosong = form akan tampil dengan "demo mode" notice. Set ke
  // Formspree (https://formspree.io/), Web3Forms, atau backend lain yang
  // menerima POST application/x-www-form-urlencoded untuk aktifkan.
  wishes: {
    eyebrow: 'Birthday Wishes',
    title: 'Ucapkan untuk',
    titleAccent: 'Ceu Eli.',
    lead:
      'Tinggalkan pesan ulang tahun untuk Eli menjelang 15 Juni 2026. Pesan akan dimoderasi Armeniaca lalu masuk ke dinding ini — jadi catatan kolektif penggemar.',
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
        name: 'Helismiley OFC',
        handle: '@helismiley_ofc',
        message:
          'Happy birthday Eli! 26 tahun yang penuh perjuangan dan dedikasi. Helismiley selalu di belakangmu — kapanpun, dimanapun.',
        date: '2026-04-20',
      },
      {
        name: 'Roni',
        handle: '@helismikepo',
        message:
          'Dari yang dulu cuma nonton lewat layar TV, sekarang udah bisa lihat langsung di teater. Terima kasih udah selalu jadi alasan untuk datang. Selamat 26, Ceu!',
        date: '2026-04-22',
      },
      {
        name: 'Bunga',
        handle: '@bungaforeli',
        message:
          'Ulang tahun pertama bareng Team Dream! Semoga Fight 2026 jadi babak terbaik buat Eli. We bloom in spring with you 🌸',
        date: '2026-04-25',
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
    generation: 'Generasi 7 JKT48',
    team: 'Team Dream',
    joined: '29 September 2018',
    origin: 'Bandung',
    catchphrase:
      'Bagai Lembayung Senja, Dengan Energi Kehangatan ku aku akan menghangatkan suasana.',
    portrait: '/archive/img-364.jpg',
  },

  // Home Page (corsyava-style flow)
  home: {
    hero: {
      eyebrow: 'Arsip Penggemar Resmi',
      title: 'Selamat Datang di Armeniaca',
      subtitle: 'Arsip Visual Helisma Putri — Eli JKT48',
      lead:
        'Sebuah dedikasi visual untuk Ceu Eli, sang “lovely mermaid” dari Team Dream. Armeniaca merawat setiap senyum, setiap panggung, dan setiap momen yang membuat Eli bersinar.',
      backgrounds: [
        '/archive/img-310.jpg',
        '/archive/img-305.jpg',
        '/archive/img-211.jpg',
        '/archive/img-119.jpg',
        '/archive/img-087.jpg',
        '/archive/img-083.jpg',
        '/archive/img-335.jpg',
      ],
      backgroundIntervalMs: 10000,
      primaryCta: { label: 'Jelajahi Arsip', hash: 'gallery', icon: 'ri-arrow-right-up-line' },
      secondaryCta: { label: 'Mengenal Armeniaca', hash: 'about', icon: 'ri-information-line' },
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
        'Helisma Putri Kurnia, atau yang akrab dikenal sebagai Eli JKT48, kini menempati posisi strategis sebagai anggota Team Dream dalam format kompetisi JKT48 Fight yang berlangsung di tahun 2026 ini.',
        'Sebagai salah satu member senior dari generasi ketujuh, mahasiswi Sastra Korea ini tidak hanya mengandalkan kemampuan vokal dan visualnya yang matang, tetapi juga membawa kepemimpinan yang kuat bagi rekan-rekan setimnya.',
        'Kehadirannya di Team Dream memperkuat dinamika grup dalam menghadapi tantangan baru di era ini, sekaligus membuktikan dedikasinya yang tak goyah dalam menjaga standar performa tinggi di tengah persaingan antar tim yang semakin kompetitif.',
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
      ctaLabel: 'Lihat Semua Arsip',
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
          title: 'Stage Debut',
          subtitle: 'Team T · Te wo Tsunaginagara · 16 Desember 2018',
          // Frames cleared — fill with real frame paths when curated.
          frames: [],
        },
        {
          title: 'Sousenkyo 2026',
          subtitle: 'Bibir yang Telah Dicuri · Undergirls #22',
          frames: [],
        },
        {
          title: 'JKT48 Fight 2026',
          subtitle: 'Team Dream · 1 April 2026',
          frames: [
            '/archive/img-127.jpg',
            '/archive/img-305.jpg',
            '/archive/img-119.jpg',
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
      { label: 'Karier Aktif', value: '6+ Tahun' },
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
      // Base path; the page derives .avif / .webp / .jpg <picture>
      // sources from this stem so modern browsers get AVIF (smaller),
      // Safari/old browsers fall back to JPG.
      portrait: '/archive/img-157.jpg',
      portraitAlt: 'Helisma Putri (Eli JKT48) di panggung — momen menyanyi.',
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
    emptyDescription: 'Try adjusting your filters to explore different eras of the Mermaid Archive.',
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
  },
};

export default SITE_CONFIG;
