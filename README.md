# Armeniaca — Independent Visual Archive

An editorial fan archive for **Helisma Putri (Eli JKT48)**, documenting her performances, events, and milestones from Gen 7 through Team Dream / Fight 2026.

**Live site → [armeniaca.online](https://armeniaca.online)**

---

## What this project is

Armeniaca is a fully custom-built fan site — not a template, not a CMS. It's a personal project I built from scratch to practice real-world frontend engineering at depth: data pipelines, performance budgets, animation systems, and live integrations.

The archive covers 350+ curated frames, real-time livestream detection, a birthday event system, an interactive virtual city (Armeniaca Town), and a gacha-style card collection feature (Petikan).

---

## Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| UI | **React 19** + **Vite 7** | React Compiler enabled — zero manual `useMemo`/`useCallback` needed |
| Styling | **Tailwind CSS v4** | Vite-native plugin (no PostCSS config), CSS-first variable theming |
| Animation | **GSAP 3.15** + **SplitText** | Chosen over Framer Motion for smaller runtime bundle and finer control over character-level text animation |
| Database | **Firebase Firestore** | Wishes wall + tree interaction state (real-time, offline-tolerant) |
| Video | **HLS.js** | In-page IDN Live stream player with quality selection |
| Routing | **React Router v7** | File-based route structure with lazy-loaded page chunks |
| Hosting | **Vercel** | Edge CDN + serverless `/api` functions for live status proxies |

---

## Key features

### Real-time live detection
Two Vercel serverless endpoints poll IDN Live and Showroom every 30s. When Eli goes live, the hero section automatically surfaces a live card with a direct stream link. Built to fail silently in dev with no `/api` routes.

### Archive pipeline
Photos are pulled from X via API v2 (`since_id` cursor pagination), enriched with event metadata and dimensions, then processed through a Sharp pipeline that generates AVIF + WebP + JPEG variants with responsive `srcSet`. The output feeds `galleryData.js` at build time — zero runtime fetches for gallery data.

### Font optimization
Self-hosted Fraunces + Plus Jakarta Sans as single variable WOFF2 files. Cut font payload from ~3.7MB (8 static weights) to ~185KB.

### Animation system
- **Hero**: Ken Burns crossfade between 12 rotating backgrounds (idle-prefetched)
- **Title**: GSAP SplitText char-level 3D entrance (lazy-loaded, fires once)
- **Sections**: Spring-eased scroll reveals (`cubic-bezier(0.16, 1, 0.3, 1)`) via custom `useScrollReveal` hook
- **Headings**: Word-level GSAP reveal on scroll via `useSplitTextReveal` hook
- **Interactions**: CSS shimmer sweep on image hover, tactile button press feedback
- All animations respect `prefers-reduced-motion`

### Interactive Armeniaca Town
SVG-based virtual city with 6+ "petak" (zones), each gating content behind fan engagement milestones. Includes animated EliTree with butterfly flutter, lantern flame, falling leaves, water-drop interactions, and stage-advance burst effects — all in custom CSS keyframes.

### Petikan card system
Gacha-style daily card draw from a 51-card illustrated pool (Aikatsu-inspired PNG layering). Cards are rendered to image via `html-to-image`, animated with GSAP + CSS 3D transforms. No Three.js — kept 2D for the book-page aesthetic and bundle cost.

---

## Architecture decisions

**Why no CSS-in-JS?** Pure CSS + Tailwind utilities keeps the bundle lean and makes animation keyframes easy to audit in one file.

**Why GSAP over Framer Motion?** SplitText for character-level animation doesn't exist in Framer Motion. GSAP is lazy-loaded only on pages that need it, keeping the initial bundle clean.

**Why static `galleryData.js`?** Gallery has 350+ entries. Generating the data at build time (via `npm run generate-gallery`) means zero waterfall fetches on page load. The tradeoff is a build step, which is acceptable for a content archive.

**Why Tailwind v4?** It uses a CSS-first config model and integrates directly with Vite — no `tailwind.config.js`, no PostCSS. It was in beta when I adopted it; I wanted hands-on experience with the new architecture before it went mainstream.

---

## Project structure

```
src/
├── components/        # Feature-grouped UI (gallery/, home/, schedule/, town/, ...)
├── pages/             # Route-level components (lazy-loaded via React.lazy)
├── hooks/             # 15+ custom hooks (useIdnLive, useScrollReveal, useSplitTextReveal, ...)
├── context/           # GalleryProvider, LightboxContext, ThemeProvider
├── config/            # siteConfig.js — single source of truth for all copy + data
├── data/              # Build-time generated data (galleryData.js, eliProfile.js)
├── lib/               # Firebase setup, wishesDb, treeDb
└── utils/             # Routes, security helpers, image utilities

api/                   # Vercel serverless functions (IDN + Showroom live proxies)
scripts/               # Build pipeline (image optimize, OG gen, X enrichment, schedule scraper)
public/archive/        # 350+ WebP archive frames
```

---

## Local setup

```bash
npm install
cp .env.example .env   # add Firebase credentials + X bearer token
npm run dev
```

### Build pipeline scripts

```bash
npm run sync-x            # pull new photos from X API v2
npm run generate-gallery  # build src/data/galleryData.js from archive
npm run optimize-images   # generate AVIF/WebP/JPEG variants via Sharp
npm run scrape-schedule   # Python scraper for Eli's JKT48 schedule
npm run generate-og       # generate og-card.png for link previews
```

---

## What I'd do differently at scale

- Move `galleryData.js` generation to a proper CMS or edge database to avoid manual build steps
- Add E2E tests (Playwright) for the live detection flow and lightbox navigation
- Extract the animation system into a standalone package — `useSplitTextReveal` and `useScrollReveal` are generic enough to reuse

---

## Disclaimer

Independent fan project. Not affiliated with JKT48 Operation Team. Photo sources attributed per frame. Built and maintained by [@Vinzryyy](https://github.com/Vinzryyy) / Armeniaca.
