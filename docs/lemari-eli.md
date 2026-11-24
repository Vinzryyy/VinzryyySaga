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
| Hub card | `LEMARI_IN_HUB` in `src/data/lemari.js` (off while art is draft) |

## Layers (bottom → top)

1. `bg_*`: background
2. `base_body`: Eli in training tee and shorts (shown when a slot is empty)
3. `bottom_*`: skirt, trousers
4. `top_*` / `dress_*`: a dress replaces top and bottom
5. `outer_*`: jacket, cardigan
6. `shoes_*`
7. `base_hair-front`: the hair strands in front of the shoulders, so clothes don't cover long hair
8. `acc-head_*`, `acc-neck_*`, `acc-hand_*`: accessories

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
  `base_body` (recommended **1200 × 2560 px**), transparent background.
- **Draw clothes in place.** Each item sits exactly where it falls on the body,
  so the game stacks files at 0,0 with no moving or scaling.
- **The base comes in parts:** `base_body` (body, face, hair behind the
  shoulders, training clothes) and `base_hair-front` (only the strands that fall
  in front of the shoulders/chest).
- **One item per file:** dress, shoes and each accessory separately.
- **Name files** `<slot>_<id>.png`: `dress_ntmu-isshou.png`,
  `shoes_boots-hitam.png`, `acc-head_pita-merah.png`, `bg_teater.png`.
- Same pose as the base for every item. No logos of official brands.
- Tell us the name to print as credit (e.g. "Ilustrasi: @nama").

The build script refuses a file whose aspect ratio differs from `base_body`, so
a layer on the wrong canvas can't slip in.

## Adding an item

1. Put the PNG in `assets/lemari/` and run `npm run build-lemari`.
2. Add an entry to `LEMARI_ITEMS` in `src/data/lemari.js` (id, slot, name, file,
   credit; `setId` if it belongs to a set). Never rename an existing id: share
   links use it.
3. For a full look, add a `LEMARI_SETS` entry with its `moment`
   (`{ text, date, to }`, e.g. a link to `/profile#timeline`).
4. `npm run test:run`: the data test checks every file exists in the manifest.

## Current art

The four accessories (pita, bando, kalung bunga aprikot, gelang mutiara) and
the two backgrounds are simple vector drawings by Armeniaca in
`assets/lemari/*.svg`.

### Draft

The first items were cut from `public/FashionTime/` (`Base.png`,
`NTMU ISSHOU.png`, 342×730) and are marked `draft: true`; the page shows a
"Gambar draft" label while one is worn. `base_hair-front` was separated
automatically from the base, so its edges are rough. Replace these with the
illustrator's layered files; no code changes are needed.

## Phase 2 hooks (not used yet)

`tags` on items (for *Tema Hari Ini*: a daily theme scored by matching tags)
and `unlock` (for *Koleksi*: items opened by playing) are already in the data,
so phase 2 doesn't change the format.
