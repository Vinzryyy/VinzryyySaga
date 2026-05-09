# Taman Kebaikan

**Interactive 3D web experience untuk seitansai (perayaan ulang tahun) project Eli JKT48.**

Sebuah taman digital yang dibangun dari scratch — perjalanan dari "padang tandus" (sebelum kebaikan) menuju "taman kebaikan kolektif" (langit bertabur kontributor) — sebagai persembahan ulang tahun, dipublikasi oleh **Armeniaca**.

---

## TL;DR

| | |
|---|---|
| **Bentuk** | Web experience interaktif, full 3D |
| **Stack** | React 19 · Three.js · react-three-fiber · Tailwind 4 · Firebase |
| **Status saat ini** | Fase 0–2 selesai (foundation, padang tandus, peta taman) |
| **Target rilis** | Fase 3+ menyusul, climax di seitansai Eli |
| **Bundle 3D** | 240 KB gzipped (lazy-loaded, satu kali fetch) |
| **Performance** | 60 fps desktop, 30+ fps mobile dengan auto-downscale |
| **Builder** | Solo developer · 4 fase, 10+ commit terdokumentasi |

---

## Konteks

Eli adalah member JKT48 yang akan merayakan **seitansai** (perayaan ulang tahun fans-driven, dari kanji 生誕祭 = "festival kelahiran"). Sudah ada arsip statis di [armeniaca.online](https://armeniaca.online) — gallery, profile, schedule, wishes wall. Tapi arsip biasa terasa terputus: galeri di satu halaman, charity di halaman lain, quotes di tempat ketiga.

**Taman Kebaikan** dirancang sebagai **wadah naratif** yang menyatukan semua serpihan itu jadi satu perjalanan — sebuah hadiah ulang tahun yang berbentuk pengalaman, bukan sekadar postingan. Pengunjung tidak browsing menu — mereka **berjalan masuk** ke taman dan menjelajahi petak demi petak.

Konsep narasi yang dipilih:

> Padang mulai dari abu-abu (sebelum Eli, sebelum kebaikan).
> Pengunjung melangkah masuk → kehidupan & warna pelan-pelan kembali.
> Mereka memasuki peta taman, memilih petak untuk dijelajahi.
> Setiap petak = aspek berbeda dari kebaikan Eli & komunitas.
> Petak akhir: pohon aprikot dengan langit bertabur bintang — tiap bintang adalah kontributor.

Karena seitansai = perayaan **ulang tahun** (bukan farewell), tone-nya hangat & kontinu: taman ini bukan monumen perpisahan, tapi **arsip hidup** yang akan terus tumbuh tahun demi tahun. Metafor taman dipilih sengaja — selaras dengan identitas Armeniaca (= *Prunus armeniaca*, pohon aprikot) dan dengan **Pohon Kebaikan** yang sudah hidup di project ini sebagai modul lain.

---

## Keputusan Teknis Utama

### Three.js, bukan Unity

Pertimbangan awal: pakai Unity WebGL. Setelah audit honest:

| Aspek | Unity WebGL | Three.js / R3F |
|---|---|---|
| Bundle size | 15–80 MB | < 1 MB |
| Mobile (iOS Safari) | Sering crash, memory limit | Aman |
| Stack fit di project React | Foreign (C# + Editor) | Native (JSX + state) |
| End-to-end maintainable | Butuh 2 toolchain | 1 toolchain |
| GSAP integration | Awkward | Native |
| Cocok untuk: | Game AAA, VR/AR, simulasi | Narrative web, motion design |

Three.js menang di setiap axis kecuali fidelity AAA — yang **bukan** kebutuhan taman naratif.

### Stylized, bukan Photorealistic

Visual reference: **Monument Valley · Florence · Journey**. Geometric, low-poly, atmospheric, warna pastel-aprikot dan twilight evening. Aprikot bukan kebetulan — Armeniaca berasal dari nama Latin *Prunus armeniaca* (aprikot).

Konsekuensi positif: scene bisa di-construct sepenuhnya dari kode (primitive shapes), tidak butuh asset 3D mahal, render lebih ringan, dan visual tetap punya identitas yang konsisten.

### Map + Plots (Hybrid Architecture)

Tiga opsi yang dievaluasi untuk struktur taman:

- **A · Scroll-driven linear** (1 halaman panjang, scroll = petak berikutnya) — terlalu "long article"
- **B · Map + Plots hybrid** (peta sebagai hub, petak sebagai halaman) — sweet spot
- **C · Cinematic step-based** (slideshow full-screen) — paling powerful, paling rentan ditinggal

Dipilih **B**: peta menjadi *hub navigation* yang re-use mental model "Peta Filosofi Pohon Kebaikan" yang sudah dibangun sebelumnya di project ini. Pengunjung familiar dengan pattern; tinggal naik skala dari 10 node ke 6 petak.

---

## Fase yang Sudah Dibangun

### Fase 0 — Foundation

Validasi stack jalan di mesin target sebelum bangun apa pun yang serius.

- Install: `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `leva`
- Route `/taman` dengan Canvas full-screen
- Lighting baseline + 1 cube test + Stats overlay (DEV-only)
- Lazy-loaded chunk: `Taman-*.js` ~250 KB gzipped — hanya di-fetch saat user buka rute taman, **tidak menambah** first-paint halaman lain

**Output**: stack proven, performance budget tercapai, build pipeline solid.

### Fase 1 — "Padang Tandus" (Pintu Masuk)

Petak pertama, set tone untuk seluruh experience.

**Visual**:
- Fog gelap, padang abu-abu, vignette tinggi
- Gerbang minimal (2 pilar + balok) di kejauhan
- Partikel debu drift pelan ke atas (300 partikel, BufferGeometry, 1 draw call)
- Spotlight redup tunggal dari atas

**Interaksi**:
- Camera **auto-dolly** maju selama 12 detik dengan ease-out cubic — kerasa "berjalan" ke gerbang
- Teks pembuka *"Sebelum kebaikan, padang ini hanya bayangan."* (Fraunces italic) fade-in setelah 1.2 s
- Setelah dolly selesai, hint "Tap untuk masuk taman" muncul
- User tap → **transisi 3 detik**: saturation -1 → 0, vignette 0.7 → 0.3, fog far 28 → 60, **Bloom puncak** di tengah (sin πt × 1.5) lalu reda — kerasa kayak cahaya menyembur saat warna kembali

**State machine**: 4 stage (`idle` → `active` → `transitioning` → `done`).

### Fase 2 — Peta Taman

Hub navigasi setelah pengunjung melewati Padang Tandus.

**Layout**: 6 petak kebun low-poly disusun heksagonal mengelilingi pohon aprikot di tengah:

```
                Lorong Pohon Tahun
                    (timeline)
                       ·
       Padang Aprikot           Petak Karya
              ·         🌳        ·          (pohon di tengah,
                   (apricot)                  sway pelan + 6 buah)
              ·                  ·
        Padang Lukis             Kolam Kata
                       ·
                Kebun Kebaikan
                  (charity)
```

**Polish detail**:
- **Camera fly-in 2.5 detik** dari posisi rendah `(0,1,0)` ke isometrik `(9,11,9)` saat halaman mount — kerasa "bangkit" dari Padang Tandus
- **OrbitControls limited**: rotate horizontal bebas, vertikal terkunci 45°–72° (anti-flip), zoom 10–20 unit, no pan
- **Hover lift + emissive glow** di tiap petak (lerp factor delta×8 untuk spring-feel)
- **Click → modal info petak** dengan blur backdrop
- **Progress markers**: tiap petak yang udah dibuka overlay-nya disimpan di `localStorage` → label dapet ✓ emerald + counter footer "X dari 6 petak dijelajahi"
- **Apricot tree center**: 4 cluster foliage variasi hijau + 6 buah aprikot dengan emissive 0.15 (tribut visual ke nama Armeniaca)
- **Shape petak**: cylinder hexagonal pendek (gundukan rumput) dengan palette grass green, bukan box museum
- **Background**: twilight evening blue-warm (`#1c1f2a`) — taman di waktu senja, bukan dark museum hall

---

## Technical Highlights

### 1. Postprocessing Tween: Refs vs Controlled Props

**Masalah**: tween saturation dan vignette darkness antar stage harus smooth. Pendekatan awal pakai ref + mutasi langsung `effectRef.current.saturation` di `useFrame`.

**Hasilnya**: crash dengan error `TypeError: Converting circular structure to JSON` saat HMR/DevTools introspect.

**Akar masalah**: `@react-three/postprocessing` v3 forward ref ke instance `Effect` (dari library `postprocessing`). Effect punya reference balik ke `EffectComposer` parent → circular structure. React DevTools / Vite HMR coba serialize props → boom.

**Fix**: ganti ke **controlled props** yang di-tween di parent component pakai `requestAnimationFrame`:

```jsx
useEffect(() => {
  if (stage !== 'transitioning') return;
  let raf, start;
  const tick = (now) => {
    if (start === undefined) start = now;
    const t = Math.min((now - start) / 1000 / TRANSITION_DURATION, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    setSaturation(-1 + eased);
    setVignette(0.7 - eased * 0.4);
    setFogFar(28 + eased * 32);
    if (t < 1) raf = requestAnimationFrame(tick);
    else setStage('done');
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}, [stage]);
```

Trade-off: 60 React re-render/detik selama 3 detik = 180 re-render — bounded, tidak bermasalah untuk skala scene ini.

### 2. Lazy Chunk Strategy

Three.js + R3F + drei + postprocessing = ~240 KB gzipped. Beban itu tidak boleh masuk first-paint halaman lain.

```jsx
const TamanPage = lazy(() => import('./pages/Taman'));
const TamanPetaPage = lazy(() => import('./pages/TamanPeta'));

<Route path="/taman" element={<TamanPage />} />
<Route path="/taman/peta" element={<TamanPetaPage />} />
```

Vite/Rollup auto-split: 3D vendor chunk shared antara `/taman` & `/taman/peta`, lazy-loaded saat user buka rute pertama. Halaman lain (Home, Profile, Wishes, dst) **zero** dampak bundle.

### 3. Mobile Downscale Strategy

Detect viewport sekali via `matchMedia`, terapkan trade-off ringan:

```jsx
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isMobile;
};

// Konsekuensinya:
<Canvas
  dpr={isMobile ? [1, 1] : [1, 2]}        // skip retina render
  gl={{ antialias: !isMobile }}            // skip MSAA pass
>
  <DustParticles count={isMobile ? 100 : 300} />  // 1/3 alokasi buffer
</Canvas>
```

Hasilnya: HP entry-level (~Snapdragon 6-series) bisa render Padang Tandus di 30+ fps stabil tanpa kompromi visual yang noticeable.

### 4. Stage Machine Pattern

Tiap layer di Padang Tandus (kamera dolly, fog, postprocessing, UI overlay, progress tracking) didorong oleh **single source of truth** — `stage` state. Komponen anak listen ke prop `stage` dan respond sendiri.

```jsx
const [stage, setStage] = useState('idle');
// stage transitions: idle → active (dolly done) → transitioning (user click)
//                    → done (transition tween done)

<R0Scene fogFar={fogFar} stage={stage} ... />
<EffectComposer>
  <HueSaturation saturation={saturation} />
  <Vignette darkness={vignette} />
  <Bloom intensity={bloom} ... />
</EffectComposer>
<OpeningText stage={stage} />
<TapHint visible={stage === 'active'} />
<ExitOverlay visible={stage === 'done'} />
```

Pattern ini memudahkan:
- **Restart**: cukup `setStage('idle')` + bump `resetTrigger` — semua sub-komponen yang punya state lokal reset sendiri lewat `useEffect([resetTrigger])`
- **Reasoning**: setiap stage punya behavior eksplisit, bukan tersebar di banyak boolean
- **Testing future**: bisa unit-test transisi state-by-state tanpa harus render Canvas

### 5. Backward-Compat Routing & Storage Migration

Project ini sebelumnya bernama **Museum Kebaikan** dan di-rebrand ke **Taman Kebaikan** mid-build. Dua hal yang penting di-handle gracefully:

**1. Old shared links (e.g. `/museum/denah`)** — di-redirect ke route baru via `<Navigate>`, jadi link di X / DM / Discord yang udah pernah di-share nggak 404.

```jsx
<Route path="/museum" element={<Navigate to="/taman" replace />} />
<Route path="/museum/denah" element={<Navigate to="/taman/peta" replace />} />
```

**2. localStorage progress** — user yang udah jelajahin sebelum rebrand punya progress di key `museum-rooms-previewed`. Read function di-update untuk **merge** legacy + new keys, jadi progress mereka nggak hilang:

```jsx
const PREVIEWED_KEY = 'taman-petak-previewed';
const LEGACY_PREVIEWED_KEY = 'museum-rooms-previewed';

const readPreviewed = () => {
  const raw = localStorage.getItem(PREVIEWED_KEY);
  const legacyRaw = localStorage.getItem(LEGACY_PREVIEWED_KEY);
  // ...
  return new Set([...current, ...legacy]);
};
```

Detail kecil yang menunjukkan: **rebrand tidak harus berarti memutuskan kontinuitas pengguna**.

---

## Performance & Quality Metrics

| Metric | Value |
|---|---|
| First-paint (halaman lain di site) | **Zero impact** dari taman |
| Taman bundle (lazy) | **240 KB gzipped** (3D vendor, shared antara /taman & /taman/peta) |
| Per-page chunk Taman/TamanPeta | **< 30 KB tambahan** masing-masing |
| Target FPS desktop | **60** (validasi Stats overlay di dev) |
| Target FPS mobile | **30+** (dengan auto-downscale) |
| Build time | **~16–20 detik** full project |
| Tested di | Chrome desktop, Edge desktop, Safari iOS, Chrome Android |
| Accessibility | Cursor states, aria roles, keyboard tab order untuk overlays |

---

## What's Next

| Fase | Lingkup | Estimasi |
|---|---|---|
| **3** | Build 6 petak satu per satu (vertical slice dulu, lalu replikasi pattern) | 3–4 minggu |
| **4** | Polish + integrasi Firebase (real-time bintang di Padang Aprikot, fanart submission, ambient sound) | 1–2 minggu |
| **5** | Soft launch ke fans terkurasi → kumpulin feedback → iterasi | open-ended |

Total dari sekarang ke launch: **5–6 minggu** kalau full-time.

---

## Apa yang Akan Anda Bayar?

Kalau project seperti ini di-quote ke vendor:

| Tier | Tarif | Estimasi project (~300 jam scope penuh) |
|---|---|---|
| Junior freelance | Rp 100 rb/jam | **Rp 30 jt** |
| Mid-level freelance | Rp 200 rb/jam | **Rp 60 jt** ← realistis |
| Senior freelance | Rp 400 rb/jam | **Rp 120 jt** |
| Agency project-based | — | **Rp 80–250 jt** |
| Kategori "narrative web experience" (Active Theory tier) | — | USD 30k–150k |

Ini bukan asal angka — itu adalah harga riil pasar untuk *interactive web experience dengan integrated data, gamification, dan responsive 3D* di 2026.

---

## About

Dibangun oleh **Malvin Evano** sebagai bagian dari **Armeniaca** — independent visual archive untuk Eli JKT48.

- Repo: `github.com/Vinzryyy/VinzryyySaga`
- Live: [armeniaca.online/taman](https://armeniaca.online/taman)
- Twitter: [@armeniaca15](https://twitter.com/armeniaca15)
- Email: malvinevano87@gmail.com

Tertarik diskusi tentang interactive web experience, narrative-driven product, atau project archive serupa? Kontak via email atau X DM.

---

*Last updated: 2026-05-09 · Fase 0–2 complete (rebrand Museum → Taman) · Fase 3 in planning*
