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
    url: 'https://vinzryyysaga.com',
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
      'Bagai sinar senja yang hangat, dengan energiku yang ceria, aku akan menghangatkan suasana. Halo halo, aku Ceu Eli!',
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
      subtitle: 'Delapan momen pilihan dari arsip Armeniaca.',
      ctaLabel: 'Lihat Semua Arsip',
      ctaHash: 'gallery',
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
    pageEyebrow: 'Tentang Proyek',
    pageTitle: 'Tentang Armeniaca',
    pageSubtitle:
      'Arsip visual independen yang merawat perjalanan Eli JKT48 — dari panggung pertama Generasi 7 hingga era Team Dream di JKT48 Fight 2026.',
    bio: {
      title: 'Catatan dari Armeniaca',
      paragraphs: [
        'Armeniaca adalah arsip visual independen yang berdedikasi untuk Helisma Putri — member JKT48 yang akrab disapa Eli atau Ceu Eli. Nama "Armeniaca" sendiri diambil dari Prunus armeniaca, pohon aprikot, sebagai akar dari palet hangat yang menjadi identitas visual arsip ini.',
        'Proyek ini berdiri sejak Eli aktif di JKT48 dan terus mengikuti perjalanannya: dari debut bersama Team T pada Desember 2018, transfer ke Team KIII pada Juli 2019, hingga sekarang bergabung di Team Dream dalam format kompetisi JKT48 Fight 2026.',
        'Setiap frame yang masuk arsip dikurasi manual — bukan sekadar repost. Tujuannya bukan kuantitas, melainkan kontinuitas: menjaga cerita panjang Eli dalam satu tempat yang stabil dan rapi.',
        'Sumber utama arsip ini adalah akun @armeniaca15 di X, dilengkapi dokumentasi personal dari berbagai panggung, event, dan momen yang sering luput dari sorotan. Armeniaca berdiri berdampingan dengan fanbase resmi Helismiley — bukan menggantikan, tetapi melengkapi.',
      ],
      quickStats: [
        { value: '350+', label: 'Frame Diarsipkan' },
        { value: 'Gen 7', label: 'Generasi Eli' },
        { value: 'Team Dream', label: 'Team Saat Ini' },
      ],
      signature: 'Armeniaca · @armeniaca15',
    },
    philosophy: {
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
