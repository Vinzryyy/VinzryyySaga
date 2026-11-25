# Lemari Eli

Dress-up game at `/mini-games/lemari`. Visitors dress Eli layer by layer, wear a
**Set Panggung** (a full stage look) in one tap, save the look as a 1080×1350
card, or share it as a link (`?o=<item ids>`). Each set carries the story of
where Eli wore it, so the game leads back to real moments.

| Part | File |
|---|---|
| Page | `src/pages/Lemari.jsx` |
| Rules (pure, tested) | `src/lib/lemari.js`, `src/lib/__tests__/lemari.test.js` |
| Wardrobe data | `src/data/lemari.js` |
| Source art | `assets/lemari/*.png`, `*.svg` |
| Built art | `public/minigames/lemari/{full,thumb}/*.webp`, `manifest.json` |
| Build script | `npm run build-lemari` (`scripts/build-lemari-assets.mjs`) |
| Look splitter | `scripts/split-lemari-look.mjs` (one full look → dress + shoes) |
| Hub card | `LEMARI_IN_HUB` in `src/data/lemari.js` (on; turn it off while the wardrobe is only draft art) |

## Layers (bottom → top)

1. `bg_*`: background
2. `base_body`: Eli in a black tube top and shorts (shown when a slot is empty).
   All of her hair falls behind the shoulders, so clothes never cover it.
3. `acc-hand_*`: a bracelet sits on the skin, so sleeves, gloves and the skirts
   drawn in front of the hands cover it
4. `bottom_*`: skirt, trousers
5. `top_*` / `dress_*`: a dress replaces top and bottom
6. `outer_*`: jacket, cardigan
7. `shoes_*`
8. `acc-head_*`, `acc-neck_*`: accessories

## Colours, cards, undo

- **Warna:** items with `tintable: true` can be recoloured with `TINTS`
  (CSS filters on that layer). The share link stores it as `id~tint`, e.g.
  `dress-ntmu-isshou~burgundy`. A colour belongs to the item: changing or
  removing the item drops it. Draw tintable items in neutral or black-and-white
  tones so the colours come out clean.
- **Bentuk kartu:** Klasik, Polaroid, Tiket Teater (`TEMPLATES` in the page).
- **Urungkan:** button or Ctrl/Cmd+Z, last 30 changes (`pushHistory`).

## Brief for the illustrator

- **One canvas for everything.** Every file has exactly the same size as
  `base_body` (the commissioned set is **2480 × 3507 px**, A4 at 300 dpi),
  transparent background.
- **The repo is public,** so `assets/lemari/` holds web-size copies
  (1240 × 1754), no larger than what the site shows. The illustrator's
  originals stay with the admin. The split script writes at `base_body`'s
  size, and the build halves anything taller than 1800 px.
- **Draw clothes in place.** Each item sits exactly where it falls on the body,
  so the game stacks files at 0,0 with no moving or scaling.
- **The base:** body, face, all of the hair behind the shoulders, and simple
  clothes (black tube top and shorts).
- **One look per file is fine:** the illustrator draws a stage look whole
  (dress, its accessories and shoes); `scripts/split-lemari-look.mjs` cuts it
  into a dress and shoes at the empty band between hem and shoes. Pieces that
  aren't part of a look (a tee, a separate accessory) come one per file.
- **Name files** `<slot>_<id>.png`: `dress_ntmu-isshou.png`,
  `shoes_boots-hitam.png`, `acc-head_pita-merah.png`, `bg_teater.png`.
- Same pose as the base for every item. No logos of official brands.
- Tell us the name to print as credit (e.g. "Ilustrasi: @nama").

The build script refuses a file whose aspect ratio differs from `base_body`, so
a layer on the wrong canvas can't slip in.

## Adding an item

1. Put the PNG in `assets/lemari/`. A full look is split first:
   `node scripts/split-lemari-look.mjs <look.png> dress_<id> shoes_<id>` (it
   refuses a look with no gap, such as a floor-length gown: add that one whole).
   Then run `npm run build-lemari`. Shoes that are pixel-identical to a pair
   already in the wardrobe go in once and are shared by both sets.
2. Add an entry to `LEMARI_ITEMS` in `src/data/lemari.js` (id, slot, name, file,
   credit; `setId` if it belongs to a set). Never rename an existing id: share
   links use it.
3. For a full look, add a `LEMARI_SETS` entry with its `moment`
   (`{ text, date, to }`, e.g. a link to `/profile#timeline`).
4. `npm run test:run`: the data test checks every file exists in the manifest.

## Current art

- **Commissioned illustrations** (`credit: 'Ilustrasi: komisi Armeniaca'`, also
  `BASE_CREDIT`, printed on every card because the base is always on screen):
  the base, nine stage looks (Ame no Pianist, Kinjirareta, Manatsu, Manazashi
  Sayonara, NTMU Isshou, RKJ, Sahabat atau Cinta, Usotsuki na Dachou,
  Wimbledon) and a black tee. Each look became a dress, a pair of shoes and a
  Set Panggung. Manatsu and RKJ share one pair of boots (the files are
  identical). The originals came as `comms @Vinzryyy (armeniaca)`; the
  SVGs below are drawn in their 2480 × 3507 units.
- **Simple vector drawings by Armeniaca** in `assets/lemari/*.svg`: the four
  accessories (pita, bando, kalung bunga aprikot, gelang mutiara), first drawn
  on the 342 × 730 draft base and moved onto the illustrated base with one
  transform (both bases have the same proportions), and the two backgrounds.
- The first draft (`public/FashionTime/`: `Base.png`, `NTMU ISSHOU.png`) is
  no longer used by the game.

## Phase 2 hooks (not used yet)

`tags` on items (for *Tema Hari Ini*: a daily theme scored by matching tags)
and `unlock` (for *Koleksi*: items opened by playing) are already in the data,
so phase 2 doesn't change the format.
