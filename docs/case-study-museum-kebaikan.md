# Museum Kebaikan

**Interactive 3D web experience untuk seitansai (graduation) project Eli JKT48.**

Sebuah museum digital yang dibangun dari scratch — perjalanan dari "dunia tanpa kebaikan" (grayscale) menuju "taman kebaikan kolektif" (langit bertabur kontributor) — sebagai bagian dari arsip visual yang dipublikasi oleh **Armeniaca**.

---

## TL;DR

| | |
|---|---|
| **Bentuk** | Web experience interaktif, full 3D |
| **Stack** | React 19 · Three.js · react-three-fiber · Tailwind 4 · Firebase |
| **Status saat ini** | Fase 0–2 selesai (foundation, R0, denah hub) |
| **Target rilis** | Fase 3+ menyusul, climax di seitansai Eli |
| **Bundle 3D** | 240 KB gzipped (lazy-loaded, satu kali fetch) |
| **Performance** | 60 fps desktop, 30+ fps mobile dengan auto-downscale |
| **Builder** | Solo developer · 4 fase, 6 commit terdokumentasi |

---

## Konteks

Eli adalah member JKT48 yang akan **seitansai** (graduation). Sudah ada arsip statis di [armeniaca.online](https://armeniaca.online) — gallery, profile, schedule, wishes wall. Tapi arsip biasa terasa terputus: galeri di satu halaman, charity di halaman lain, quotes di tempat ketiga.

**Museum Kebaikan** dirancang sebagai **wadah naratif** yang menyatukan semua serpihan itu jadi satu perjalanan. Pengunjung tidak browsing menu — mereka **berjalan masuk** ke ruangan demi ruangan.

Konsep narasi yang dipilih:

> Dunia mulai dari abu-abu (sebelum Eli, sebelum kebaikan).
> Pengunjung melangkah masuk → warna pelan-pelan kembali.
> Mereka memasuki denah museum, memilih ruangan untuk dijelajahi.
> Setiap ruangan = aspek berbeda dari kebaikan Eli & komunitas.
> Ruangan akhir: pohon kebaikan dengan langit bertabur bintang — tiap bintang adalah kontributor.

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

Three.js menang di setiap axis kecuali fidelity AAA — yang **bukan** kebutuhan museum naratif.

### Stylized, bukan Photorealistic

Visual reference: **Monument Valley · Florence · Journey**. Geometric, low-poly, atmospheric, warna pastel-aprikot. Aprikot bukan kebetulan — Armeniaca berasal dari nama Latin *Prunus armeniaca* (aprikot).

Konsekuensi positif: scene bisa di-construct sepenuhnya dari kode (primitive shapes), tidak butuh asset 3D mahal, render lebih ringan, dan visual tetap punya identitas yang konsisten.

### Map + Rooms (Hybrid Architecture)

Tiga opsi yang dievaluasi untuk struktur museum:

- **A · Scroll-driven linear** (1 halaman panjang, scroll = ruang berikutnya) — terlalu "long article", kurang museum
- **B · Map + Rooms hybrid** (denah sebagai hub, ruangan sebagai halaman) — sweet spot
- **C · Cinematic step-based** (slideshow full-screen) — paling powerful, paling rentan ditinggal

Dipilih **B**: denah menjadi *hub navigation* yang re-use mental model "Peta Filosofi Pohon Kebaikan" yang sudah dibangun sebelumnya di project ini. Pengunjung familiar dengan pattern; tinggal naik skala dari 10 node ke 6 ruangan.

---

## Fase yang Sudah Dibangun

### Fase 0 — Foundation

Validasi stack jalan di mesin target sebelum bangun apa pun yang serius.

- Install: `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `leva`
- Route `/museum` dengan Canvas full-screen
- Lighting baseline + 1 cube test + Stats overlay (DEV-only)
- Lazy-loaded chunk: `Museum-*.js` 246 KB gzipped — hanya di-fetch saat user buka rute museum, **tidak menambah** first-paint halaman lain

**Output**: stack proven, performance budget tercapai, build pipeline solid.

### Fase 1 — R0 "World Without Kindness" (Pintu Masuk)

Ruangan pertama, set tone untuk seluruh experience.

**Visual**:
- Fog gelap, dunia abu-abu, vignette tinggi
- Gerbang minimal (2 pilar + balok) di kejauhan
- Partikel debu drift pelan ke atas (300 partikel, BufferGeometry, 1 draw call)
- Spotlight redup tunggal dari atas

**Interaksi**:
- Camera **auto-dolly** maju selama 12 detik dengan ease-out cubic — kerasa "berjalan" ke gerbang
- Teks pembuka *"Sebelum kebaikan, dunia hanya bayangan."* (Fraunces italic) fade-in setelah 1.2 s
- Setelah dolly selesai, hint "Tap untuk melangkah masuk" muncul
- User tap → **transisi 3 detik**: saturation -1 → 0, vignette 0.7 → 0.3, fog far 28 → 60, **Bloom puncak** di tengah (sin πt × 1.5) lalu reda — kerasa kayak cahaya menyembur saat warna kembali

**State machine**: 4 stage (`idle` → `active` → `transitioning` → `done`).

### Fase 2 — Denah Museum

Hub navigasi setelah pengunjung melewati R0.

**Layout**: 6 ruangan low-poly disusun heksagonal mengelilingi pohon aprikot di tengah:

```
                Lorong Waktu
                    (timeline)
                       ·
          Taman Akhir       Galeri Fan
              ·         🌳        ·          (pohon di tengah,
                   (apricot)                  sway pelan + 6 buah)
              ·                  ·
          Ruang Fanart       Ruang Quotes
                       ·
                Arsip Kebaikan
                  (charity)
```

**Polish detail**:
- **Camera fly-in 2.5 detik** dari posisi rendah `(0,1,0)` ke isometrik `(9,11,9)` saat halaman mount — kerasa "bangkit" dari R0
- **OrbitControls limited**: rotate horizontal bebas, vertikal terkunci 45°–72° (anti-flip), zoom 10–20 unit, no pan
- **Hover lift + emissive glow** di tiap ruangan (lerp factor delta×8 untuk spring-feel)
- **Click → modal info ruangan** dengan blur backdrop
- **Progress markers**: tiap ruangan yang udah dibuka overlay-nya disimpan di `localStorage` → label dapet ✓ emerald + counter footer "X dari 6 ruangan dijelajahi"
- **Apricot tree center**: 4 cluster foliage variasi hijau + 6 buah aprikot dengan emissive 0.15 (tribut visual ke nama Armeniaca)

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
const MuseumPage = lazy(() => import('./pages/Museum'));
const MuseumDenahPage = lazy(() => import('./pages/MuseumDenah'));

<Route path="/museum" element={<MuseumPage />} />
<Route path="/museum/denah" element={<MuseumDenahPage />} />
```

Vite/Rollup auto-split: 3D vendor chunk shared antara `/museum` & `/museum/denah`, lazy-loaded saat user buka rute pertama. Halaman lain (Home, Profile, Wishes, dst) **zero** dampak bundle.

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

Hasilnya: HP entry-level (~Snapdragon 6-series) bisa render R0 di 30+ fps stabil tanpa kompromi visual yang noticeable.

### 4. Stage Machine Pattern

Tiap layer di R0 (kamera dolly, fog, postprocessing, UI overlay, progress tracking) didorong oleh **single source of truth** — `stage` state. Komponen anak listen ke prop `stage` dan respond sendiri.

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

---

## Performance & Quality Metrics

| Metric | Value |
|---|---|
| First-paint (halaman lain di site) | **Zero impact** dari museum |
| Museum bundle (lazy) | **240 KB gzipped** (3D vendor, shared antara /museum & /museum/denah) |
| Per-page chunk Museum/Denah | **< 30 KB tambahan** masing-masing |
| Target FPS desktop | **60** (validasi Stats overlay di dev) |
| Target FPS mobile | **30+** (dengan auto-downscale) |
| Build time | **~16–20 detik** full project |
| Tested di | Chrome desktop, Edge desktop, Safari iOS, Chrome Android |
| Accessibility | Cursor states, aria roles, keyboard tab order untuk overlays |

---

## What's Next

| Fase | Lingkup | Estimasi |
|---|---|---|
| **3** | Build R1–R6 ruangan satu per satu (vertical slice dulu, lalu replikasi pattern) | 3–4 minggu |
| **4** | Polish + integrasi Firebase (real-time bintang, fanart submission, ambient sound) | 1–2 minggu |
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

Ini bukan asal angka — itu adalah harga riil pasar untuk *interactive web museum dengan integrated data, gamification, dan responsive 3D* di 2026.

---

## About

Dibangun oleh **Malvin Evano** sebagai bagian dari **Armeniaca** — independent visual archive untuk Eli JKT48.

- Repo: `github.com/Vinzryyy/VinzryyySaga`
- Live: [armeniaca.online/museum](https://armeniaca.online/museum)
- Twitter: [@armeniaca15](https://twitter.com/armeniaca15)
- Email: malvinevano87@gmail.com

Tertarik diskusi tentang interactive web experience, narrative-driven product, atau project archive serupa? Kontak via email atau X DM.

---

*Last updated: 2026-05-09 · Fase 0–2 complete · Fase 3 in planning*
