import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd } from 'node:process';
import { describe, expect, it } from 'vitest';
import { ABOUT_MAX, BASE_CREDIT, BASE_LAYERS, CANVAS_ASPECT, DEFAULT_BG, LEMARI_ITEMS, LEMARI_SETS, SLOTS } from '../../data/lemari';
import {
  applySet,
  cleanName,
  creditsFor,
  clearSlot,
  decodeOutfit,
  defaultOutfit,
  describeOutfit,
  encodeOutfit,
  layersFor,
  matchSet,
  pushHistory,
  randomOutfit,
  setTint,
  toggleItem,
  wearItem,
} from '../lemari';

const items = [
  { id: 'bg-a', slot: 'bg', name: 'Latar A', file: 'bg_a', credit: 'X' },
  { id: 'bg-b', slot: 'bg', name: 'Latar B', file: 'bg_b', credit: 'X' },
  { id: 'dress-a', slot: 'dress', name: 'Dress A', file: 'dress_a', credit: 'Ilus 1', tintable: true },
  { id: 'top-a', slot: 'top', name: 'Atasan A', file: 'top_a', credit: 'Ilus 2' },
  { id: 'bottom-a', slot: 'bottom', name: 'Rok A', file: 'bottom_a', credit: 'Ilus 2' },
  { id: 'shoes-a', slot: 'shoes', name: 'Sepatu A', file: 'shoes_a', credit: 'Ilus 1' },
  { id: 'acc-locked', slot: 'accHead', name: 'Pita', file: 'acc_pita', credit: 'Ilus 1', unlock: 'tema-7' },
];
const find = (id) => items.find((i) => i.id === id);
const sets = [{ id: 'set-a', name: 'Set A', items: ['dress-a', 'shoes-a'], bg: 'bg-b' }];

describe('outfit rules', () => {
  it('a dress takes off top and bottom, and the other way round', () => {
    let o = wearItem(wearItem({ bg: 'bg-a' }, find('top-a')), find('bottom-a'));
    o = wearItem(o, find('dress-a'));
    expect(o).toEqual({ bg: 'bg-a', dress: 'dress-a' });
    o = wearItem(o, find('top-a'));
    expect(o).toEqual({ bg: 'bg-a', top: 'top-a' });
  });

  it('tapping a worn item takes it off, but never the background', () => {
    const o = toggleItem({ bg: 'bg-a' }, find('shoes-a'));
    expect(o.shoes).toBe('shoes-a');
    expect(toggleItem(o, find('shoes-a'))).toEqual({ bg: 'bg-a' });
    expect(toggleItem(o, find('bg-a'))).toEqual(o);
  });

  it('a set replaces the clothes and brings its background', () => {
    const o = applySet({ bg: 'bg-a', top: 'top-a' }, sets[0], items);
    expect(o).toEqual({ bg: 'bg-b', dress: 'dress-a', shoes: 'shoes-a' });
  });
});

describe('matchSet', () => {
  it('exact, modified, or none', () => {
    expect(matchSet({ bg: 'bg-a', dress: 'dress-a', shoes: 'shoes-a' }, sets)).toEqual({ set: sets[0], modified: false });
    expect(matchSet({ bg: 'bg-a', dress: 'dress-a' }, sets)).toEqual({ set: sets[0], modified: true });
    expect(matchSet({ bg: 'bg-a', top: 'top-a' }, sets)).toBeNull();
  });
});

describe('randomOutfit', () => {
  it('is always valid and skips locked items', () => {
    let seed = 1;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let n = 0; n < 200; n += 1) {
      const o = randomOutfit(items, rng);
      expect(o.bg).toBeTruthy();
      expect(o.dress && (o.top || o.bottom)).toBeFalsy();
      expect(o.accHead).toBeUndefined();
    }
  });
});

describe('share link', () => {
  it('round-trips', () => {
    const o = { bg: 'bg-b', dress: 'dress-a', shoes: 'shoes-a' };
    expect(encodeOutfit(o)).toBe('bg-b.dress-a.shoes-a');
    expect(decodeOutfit(encodeOutfit(o), items)).toEqual(o);
  });

  it('ignores junk, locked items and conflicting pieces', () => {
    expect(decodeOutfit('nope.<script>.acc-locked', items)).toEqual(defaultOutfit());
    expect(decodeOutfit('top-a.dress-a', items)).toEqual({ ...defaultOutfit(), dress: 'dress-a' });
    expect(decodeOutfit(undefined, items)).toEqual(defaultOutfit());
  });
});

describe('layers, text, credits', () => {
  it('stacks bottom to top', () => {
    expect(layersFor({ bg: 'bg-a', dress: 'dress-a', shoes: 'shoes-a' }, items).map((l) => l.file)).toEqual([
      'bg_a', BASE_LAYERS.body, 'dress_a', 'shoes_a',
    ]);
  });

  it('describes the look', () => {
    expect(describeOutfit({ bg: 'bg-a' }, items)).toBe('Eli memakai baju latihan, latar Latar A');
    expect(describeOutfit({ bg: 'bg-a', dress: 'dress-a', shoes: 'shoes-a' }, items)).toBe('Eli memakai Dress A dan Sepatu A, latar Latar A');
  });

  it('lists each credit once, starting with the base drawing', () => {
    expect(creditsFor({ bg: 'bg-a', dress: 'dress-a', shoes: 'shoes-a' }, items)).toEqual([BASE_CREDIT, 'X', 'Ilus 1']);
    expect(creditsFor({ bg: 'bg-a' }, [{ ...find('bg-a'), credit: BASE_CREDIT }])).toEqual([BASE_CREDIT]);
  });

  it('cleans the name', () => {
    expect(cleanName('  Fans <b>Eli</b>\n  dari   Bandung yang sangat panjang ')).toBe('Fans bEli/b dari Bandung');
  });
});

describe('tints', () => {
  const dressed = { bg: 'bg-a', dress: 'dress-a', shoes: 'shoes-a' };

  it('colours tintable items only, and "asli" removes the colour', () => {
    const o = setTint(dressed, 'dress', 'burgundy', items);
    expect(o.tints).toEqual({ dress: 'burgundy' });
    expect(setTint(dressed, 'shoes', 'burgundy', items)).toBe(dressed);
    expect(setTint(o, 'dress', 'asli', items)).toEqual(dressed);
    expect(setTint(dressed, 'dress', 'nope', items)).toBe(dressed);
  });

  it('applies the filter to that layer and names the colour', () => {
    const o = setTint(dressed, 'dress', 'biru', items);
    expect(layersFor(o, items).find((l) => l.file === 'dress_a').filter).toMatch(/hue-rotate/);
    expect(layersFor(o, items).find((l) => l.file === 'shoes_a').filter).toBeNull();
    expect(describeOutfit(o, items)).toBe('Eli memakai Dress A (Biru Dream) dan Sepatu A, latar Latar A');
  });

  it('drops the colour when the item changes or comes off', () => {
    const o = setTint(dressed, 'dress', 'emas', items);
    expect(wearItem(o, find('top-a')).tints).toBeUndefined();
    expect(clearSlot(o, 'dress').tints).toBeUndefined();
    expect(wearItem(o, find('dress-a')).tints).toEqual({ dress: 'emas' });
  });

  it('round-trips in the share link and marks a set as modified', () => {
    const o = setTint(dressed, 'dress', 'aprikot', items);
    expect(encodeOutfit(o)).toBe('bg-a.dress-a~aprikot.shoes-a');
    expect(decodeOutfit(encodeOutfit(o), items)).toEqual(o);
    expect(decodeOutfit('dress-a~zzz.shoes-a~burgundy', items)).toEqual({ ...defaultOutfit(), dress: 'dress-a', shoes: 'shoes-a' });
    expect(matchSet(o, sets)).toEqual({ set: sets[0], modified: true });
  });
});

describe('undo history', () => {
  it('skips repeats and keeps the last entries', () => {
    let h = pushHistory([], { bg: 'bg-a' });
    h = pushHistory(h, { bg: 'bg-a' });
    expect(h).toHaveLength(1);
    for (let n = 0; n < 40; n += 1) h = pushHistory(h, { bg: n % 2 ? 'bg-a' : 'bg-b' });
    expect(h).toHaveLength(30);
  });
});

describe('real wardrobe data', () => {
  const manifest = JSON.parse(readFileSync(resolve(cwd(), 'public/minigames/lemari/manifest.json'), 'utf8'));
  const slotKeys = new Set(SLOTS.map((s) => s.key));

  it('every item has a valid slot, a unique id and a built file', () => {
    const ids = new Set();
    for (const item of LEMARI_ITEMS) {
      expect(slotKeys.has(item.slot), item.id).toBe(true);
      expect(ids.has(item.id), item.id).toBe(false);
      ids.add(item.id);
      expect(manifest.files[item.file], item.file).toBeTruthy();
      expect(item.credit, item.id).toBeTruthy();
    }
    expect(manifest.files[BASE_LAYERS.body]).toBeTruthy();
    expect(ids.has(DEFAULT_BG)).toBe(true);
  });

  it('the page and the built art use the same canvas', () => {
    expect(CANVAS_ASPECT).toBeCloseTo(manifest.canvas.width / manifest.canvas.height, 4);
  });

  it('every set points at existing items', () => {
    const ids = new Set(LEMARI_ITEMS.map((i) => i.id));
    for (const set of LEMARI_SETS) {
      for (const id of [...set.items, set.bg].filter(Boolean)) expect(ids.has(id), `${set.id}: ${id}`).toBe(true);
    }
  });

  it("a set's story is text, with an optional link inside the site", () => {
    for (const set of LEMARI_SETS) {
      if (set.moment === null) continue;
      expect(set.moment.text?.trim().length, set.id).toBeGreaterThan(0);
      if (set.moment.to !== undefined) expect(set.moment.to, set.id).toMatch(/^\/[a-z]/);
    }
  });

  it("a song's one-line story is short enough for the card", () => {
    for (const set of LEMARI_SETS) {
      if (set.about === undefined) continue;
      expect(set.about.trim().length, set.id).toBeGreaterThan(0);
      expect(set.about.length, set.id).toBeLessThanOrEqual(ABOUT_MAX);
    }
  });
});
