# Armeniaca — Arsip Visual Eli JKT48

Fan archive independen untuk **Helisma Putri (Eli JKT48)**. Mendokumentasikan panggung, event, dan momen Eli dari Generasi 7 sampai era Team Dream JKT48 Fight 2026.

🌐 Live: [armeniaca.online](https://armeniaca.online)

## Stack

- **React 19** + **Vite 7** + **Tailwind CSS 4** (React Compiler enabled)
- **Firebase** (Firestore) — wishes & tree DB
- **GSAP**, **ScrollReveal** — animasi
- **HLS.js** — IDN livestream player
- **react-router-dom 7**, **react-helmet-async** — routing & SEO
- **Vercel** — hosting + serverless API (`/api/idn-status`, `/api/showroom-status`)

## Halaman utama

| Route | Deskripsi |
|-------|-----------|
| `/` | Hero, schedule terdekat, live-now card, archive marquee |
| `/profile` | Profil lengkap Eli |
| `/about` | Tentang proyek Armeniaca |
| `/gallery` · `/gallery/:year` | Foto archive dari X (auto-sync) |
| `/schedule` | Jadwal theater & event |
| `/countdown` | Countdown ulang tahun Eli |
| `/wishes` | Pesan dari fans (Firebase) |
| `/26`, `/vivo` | Easter egg pages |

## Fitur

- **Live status realtime** — pantau status live Eli di IDN Live & Showroom via serverless endpoints di `api/`. Card live muncul otomatis di home saat streaming.
- **Birthday overlay** — confetti + balon site-wide saat 15 Juni (24-jam window).
- **X archive sync** — pull foto dari X API v2 dengan `since_id` cursor; metadata di-enrich (event date, hashtags, dimensions).
- **Image pipeline** — sharp generate AVIF/WebP/JPG variants + responsive `srcSet` dipakai di `<picture>`.
- **Gallery lightbox** — keyboard nav, swipe, zoom, panel metadata.
- **OG card generator** — auto generate `og-card.png` untuk preview link.

## Setup

```bash
npm install
cp .env.example .env  # isi Firebase + X bearer token
npm run dev
```

## Scripts

```bash
npm run dev               # dev server (Vite)
npm run build             # production build → dist/
npm run preview           # preview build
npm run lint              # ESLint

npm run sync-x            # pull foto baru dari X API v2
npm run import-x-archive  # import bulk archive JSON
npm run generate-gallery  # bangun src/data/galleryData.js dari archive
npm run optimize-images   # AVIF/WebP/JPG via sharp
npm run generate-og       # generate og-card.png
npm run scrape-schedule   # python scraper untuk jadwal Eli (jkt48.com)
```

## Struktur

```
src/
├── components/    # UI components, dikelompokkan per fitur (gallery, schedule, home, ...)
├── pages/         # Route-level components (lazy-loaded)
├── hooks/         # Custom hooks (useIdnLive, useShowroomLive, useIsBirthdayToday, ...)
├── context/       # ThemeProvider, GalleryProvider, LightboxProvider
├── config/        # siteConfig.js — central config
├── data/          # Static data (eliProfile, galleryData)
├── lib/           # Firebase setup, wishesDb, treeDb
└── utils/         # constants, routes, security, image optimizer

api/               # Vercel serverless functions (live status proxies)
scripts/           # Build pipeline (image optimize, OG gen, X enrichment, scrape)
public/archive/    # Static archive assets
```

## Deploy

Auto-deploy via Vercel. `vercel.json` rewrite semua path non-`/api/` ke `index.html` (SPA fallback).

## Kredit

Independent fan project. Bukan official, tidak berafiliasi dengan JKT48 Operation Team. Sumber foto dari X (dengan attribution di setiap frame).
