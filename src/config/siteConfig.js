/**
 * Site Configuration
 * Central configuration for Armeniaca - Eli JKT48 Fan Gallery
 * All hardcoded content should be moved here
 */

export const SITE_CONFIG = {
  // Branding
  branding: {
    name: 'Armeniaca',
    tagline: 'One Call Fight',
    fullName: 'ARMENIACA',
    description: 'A dedicated fan gallery preserving the most beautiful moments of Helisma Putri (Eli JKT48)',
  },

  // Site Metadata
  site: {
    title: 'Armeniaca - The Mermaid Archive',
    description: 'Capturing the light and spirit of our lovely mermaid, Eli JKT48. A curated journey through Helisma Putri\'s iconic moments.',
    url: 'https://vinzryyysaga.com',
    keywords: ['Eli JKT48', 'Helisma Putri', 'JKT48', 'fan gallery', 'photography', 'Armeniaca'],
  },

  // Social Links
  social: {
    instagram: '',
    twitter: 'https://x.com/armeniaca15',
    eliTwitter: 'https://x.com/H_EliJKT48',
    fanbase: 'https://x.com/helismiley_ofc',
  },

  // Navigation
  navigation: {
    main: [
      { label: 'Home', hash: 'home' },
      { label: 'Profil Singkat', hash: 'data' },
      { label: 'About Eli', hash: 'about-preview' },
      { label: 'Archive', hash: 'gallery' },
      { label: 'About', hash: 'about' },
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

  // Storyline (derived from local @armeniaca15 archive export)
  storyline: {
    sourceLabel: '@armeniaca15',
    period: 'October 16, 2023 - March 1, 2024',
    chapters: [
      {
        id: 'origin',
        period: 'Oct 2023',
        title: 'Origin: The Archive Begins',
        summary: 'The account establishes a consistent visual identity and starts documenting Eli moments as a focused archive project.',
        highlight: '15 captured moments',
      },
      {
        id: 'consistency',
        period: 'Nov - Dec 2023',
        title: 'Consistency: Weekly Rhythm',
        summary: 'Posting stabilizes into a regular cadence, building continuity and making the archive feel dependable for followers.',
        highlight: '15 captured moments',
      },
      {
        id: 'momentum',
        period: 'Jan - Feb 2024',
        title: 'Momentum: Broader Coverage',
        summary: 'Coverage broadens with denser posting windows, showing stronger momentum and tighter documentation across events.',
        highlight: '13 captured moments',
      },
      {
        id: 'new-chapter',
        period: 'Mar 1, 2024',
        title: 'New Chapter: Transition Point',
        summary: 'The latest frame in this export marks a natural transition point for the next era of the archive timeline.',
        highlight: 'Latest point in source export',
      },
    ],
  },

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
      portrait: '/archive/img-142.jpg',
      portraitAlt: 'Helisma Putri (Eli JKT48)',
    },
    gallery: {
      eyebrow: 'Gallery Eli',
      title: 'Frame Pilihan',
      subtitle: 'Delapan momen pilihan dari arsip Armeniaca.',
      ctaLabel: 'Lihat Semua Arsip',
      ctaHash: 'gallery',
    },
    storyline: {
      eyebrow: 'Eli di Arsip X',
      title: 'Kronik @armeniaca15',
      subtitle:
        'Linimasa visual yang dirangkum dari arsip resmi @armeniaca15 — setiap bulan adalah satu bab kecil dari perjalanan Eli.',
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

  // About Page Content
  about: {
    bio: {
      title: 'Dedicated to Eli JKT48',
      paragraphs: [
        'My name is Armeniaca, and this gallery is a tribute to my favorite JKT48 member, Helisma Putri, famously known as Eli. To me, Eli is more than just an idol; she is a "lovely mermaid" who radiates grace, talent, and kindness.',
        'Through this platform, I aim to preserve the most beautiful moments of Eli\'s journey with JKT48. Every photo, whether it\'s from a theater performance, an event, or a rare candid shot, is carefully curated to showcase her multifaceted charm.',
        'I specialize in documenting idol activities, focusing on the raw emotions and the vibrant energy that Eli brings to the stage. This project is "Made for JKT48 Eli," and it serves as a digital archive for fans who share the same admiration for her.',
        'My work is driven by the belief that every stage performance is a fleeting moment of art. By capturing these instances, I hope to keep the spirit of Eli\'s dedication alive in the hearts of the community.',
      ],
      quickStats: [
        { value: 'Eli', label: 'Main Focus' },
        { value: 'JKT48', label: 'Community' },
        { value: '15.06', label: 'Birthday' },
      ],
      signature: 'Armeniaca',
    },
    philosophy: {
      quote: 'Photography is the art of frozen time... the ability to store emotion and feelings within a frame. Every picture tells a story, and I\'m here to help tell yours.',
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
    description: 'Capturing the light and spirit of our lovely mermaid, Eli JKT48. A dedicated fan gallery preserving the most beautiful moments of her journey.',
    creditPrefix: 'Made with',
    creditSuffix: 'for Eli JKT48',
  },
};

export default SITE_CONFIG;
