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
| Hub card | `LEMARI_IN_HUB` in `src/data/lemari.js`: off, the game is link-only for now (see below) |

**Link-only for now.** At the site owner's request the game is hidden from the
public: no card on `/mini-games`, `noindex` on the page (`PAGES.lemari` in
`src/lib/pageMeta.js`, written into the built HTML too) and no entry in
`public/sitemap.xml`. Anyone with the link can still play, and shared links
keep their preview. To list it, turn `LEMARI_IN_HUB` on, drop `noindex` and
add the URL to the sitemap. A test checks that the hub card and `noindex`
agree, and that a hidden game stays out of the sitemap.

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
- **Bentuk kartu:** Klasik, Polaroid, Tiket Teater (`TEMPLATES` in the page),
  with a live preview beside the choice. On phones the card section comes
  after the wardrobe, so the sticky stage never covers it.
- **Urungkan:** button or Ctrl/Cmd+Z, last 30 changes (`pushHistory`).
- **First visit and Reset** show `DEFAULT_SET` (`startingOutfit()`), never the
  bare base. Share links still decode on top of the bare `defaultOutfit()`.
  The next visit reopens the look saved in the browser (`openingOutfit()`),
  except a saved bare base: older versions saved it on every first visit, so
  it counts as nothing chosen.
- **Cerita kostum** sits under the stage: always shown on wide screens, behind
  a "Cerita kostum" button on phones (the stage stays short there, and the
  tabs stick right under it).
- **Cuplikan lagu** (`listen` on a set): a play button for the 30-second
  preview of the song's official JKT48 release, which is Apple's own file
  (iTunes Search API `previewUrl`), loaded only on tap, with a link to the song
  on Apple Music. Never add song files to this repo: it is public and the
  recordings belong to JKT48 (a test checks no audio file is here). The Ramune
  setlist has no official JKT48 release: at the site owner's request, Usotsuki
  na Dachou and Manazashi Sayonara play a fan upload of the JKT48 version on
  YouTube (`youtube`, youtube-nocookie player on tap; it breaks if the upload
  is removed, and SKE48's originals on Apple Music are the fallback), and Nice
  To Meet You plays SKE48's original.

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
- **Backgrounds** (`bg_<id>.png`, not transparent): keep the middle clear for
  the figure (centred on x 1166, feet at y 3296, floor from y 3170) and put
  detail at the sides, top and floor. No logos or text. The current eight are
  Armeniaca's vector stand-ins: a commissioned one with the same file name
  replaces it (share links keep working), and new places are added as new
  files.
- Tell us the name to credit (e.g. "Ilustrasi: @nama"). It is kept in the data;
  the game prints no credit line for now.

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
   (`{ text, to? }`; `to` is e.g. `/profile#timeline`) and, once verified,
   `about`: one line on what the song tells, in our own words (never a lyric
   line), at most `ABOUT_MAX` characters so it fits the card.
4. `npm run test:run`: the data test checks every file exists in the manifest.

## Current art

- **Commissioned illustrations** (`credit: 'Ilustrasi: komisi Armeniaca'`, also
  `BASE_CREDIT`; kept in the data, not printed on the card or the page):
  the base, nine stage looks and a black tee. Each look is the costume of a
  unit song Eli performed in theater: Ame no Pianist, Kinjirareta Futari,
  Manatsu no Christmas Rose, Manazashi Sayonara, Nice To Meet You (file
  `ntmy`, first drafted as "NTMU Isshou"; isshou = costume), Renai Kinshi
  Jourei, Sahabat atau Cinta, Usotsuki na Dachou and Wimbledon e Tsureteitte.
  Each look became a dress, a pair of shoes and a Set Panggung, whose
  "Cerita kostum" (`moment`) comes from Eli's show record. Manatsu and RKJ
  share one pair of boots (the files are identical). The originals came as
  `comms @Vinzryyy (armeniaca)`; the SVGs below are drawn in their
  2480 × 3507 units.
- **Simple vector drawings by Armeniaca** in `assets/lemari/*.svg`: thirty-one
  accessories, drawn in the 342 × 730 draft base's units and moved onto the
  illustrated base with one transform (both bases have the same proportions).
  Besides the first four (pita, bando, kalung bunga aprikot, gelang mutiara)
  they follow Eli and her fans: kerang, mutiara and a starfish for "our beloved
  mermaid", a seitansai tiara, a cat clip and cat ears for TanTan, lembayung
  senja colours (her catchphrase), apricot blossoms for Armeniaca and
  #BloomInSpring, a festival wristband, a black stage choker, an oshi-style
  towel, an E for Eli, a school ribbon for Tunas di Balik Seragam (her solo
  Kareha no Station) and a friendship bracelet for Sahabat atau Cinta. Cute
  pieces asked for by the site owner sit with them: a beret, a party hat, a
  padded polka-dot headband, bunny ears, a pink polka-dot bow, twin apricot
  bows, and a watch whose hands show 15.06 (Eli's birthday). Most carry a
  `note`, shown when worn. Then eight backgrounds:
  Studio Krem, Panggung Teater, Teater Sementara, Panggung Konser, Festival
  Prambanan, Seitansai, Meet & Greet and Kamar Live. Each is after a place in
  Eli's archive, and its `note` (shown when picked in Latar) says which. No
  logos or text are drawn in them.
- The first draft (`public/FashionTime/`: `Base.png`, `NTMU ISSHOU.png`) is
  no longer used by the game.

## Phase 2 hooks (not used yet)

`tags` on items (for *Tema Hari Ini*: a daily theme scored by matching tags)
and `unlock` (for *Koleksi*: items opened by playing) are already in the data,
so phase 2 doesn't change the format.
