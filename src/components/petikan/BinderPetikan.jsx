/**
 * BinderPetikan — the ArmePack collection as a photocard binder: one set
 * per story era, 9-pocket pages with clear sleeves, set progress, a
 * one-time buah reward per complete set, and trading duplicates for buah.
 * Logic lives in lib/petikanBinder.js; this is only the view.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { POHON_APRIKOT_POOL, TIER_CONFIG } from '../../data/pohonAprikot';
import { BUAH_CAP, addBuah, getBuah, saveState } from '../../lib/petikanStorage';
import { DUPES_PER_BUAH, claimableSets, duplicates, loadClaimed, saveClaimed, setProgress, tradeDuplicates } from '../../lib/petikanBinder';
import FrozenWebp from './FrozenWebp';
import './binder.css';

const SERIF = { fontFamily: '"Fraunces Variable", serif' };

/** Lets the page header (buah counter) refresh right away. */
const announceBuah = () => window.dispatchEvent(new CustomEvent('aprikot:buah'));

const Pocket = ({ card, count, onOpen }) => {
  if (!card) {
    return <div className="binder-pocket binder-pocket--empty" aria-hidden="true" />;
  }
  const cfg = TIER_CONFIG[card.tier] || TIER_CONFIG.muda;
  const owned = count > 0;
  return (
    <button
      type="button"
      className={`binder-pocket ${owned ? 'binder-pocket--owned' : ''}`}
      onClick={owned ? onOpen : undefined}
      disabled={!owned}
      aria-label={owned ? `${card.title}, tier ${cfg.label}${count > 1 ? `, ${count} lembar` : ''}` : `Kantong kosong, kartu tier ${cfg.label} belum didapat`}
    >
      <span className="binder-card" style={{ '--spine': cfg.spineColor }}>
        {owned ? (
          <>
            {card.image && <FrozenWebp src={card.image} alt={card.title} objectFit="cover" style={{ filter: 'sepia(0.15) saturate(0.95)' }} />}
            <span className="binder-card__title" style={SERIF}>{card.title}</span>
            <span className="binder-card__tier">{cfg.label}</span>
            {count > 1 && <span className="binder-card__count">×{count}</span>}
          </>
        ) : (
          <span className="binder-card__ghost">
            <i className="ri-question-mark" />
            <span>{cfg.label}</span>
          </span>
        )}
      </span>
      <span className="binder-sleeve" aria-hidden="true" />
    </button>
  );
};

const BinderPetikan = ({ state, onStateChange, onOpenCard }) => {
  const buku = useMemo(() => state?.buku || {}, [state?.buku]);
  const sets = useMemo(() => setProgress(POHON_APRIKOT_POOL, buku), [buku]);
  const [setId, setSetId] = useState(sets[0]?.id);
  const [page, setPage] = useState(0);
  const [claimed, setClaimed] = useState(() => loadClaimed());
  const [msg, setMsg] = useState('');
  const set = sets.find((s) => s.id === setId) || sets[0];
  const dupes = useMemo(() => duplicates(POHON_APRIKOT_POOL, buku), [buku]);
  const claimable = claimableSets(sets, claimed);

  useEffect(() => setPage(0), [setId]);
  useEffect(() => {
    if (!msg) return undefined;
    const t = setTimeout(() => setMsg(''), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  const claim = (s) => {
    const room = BUAH_CAP - getBuah();
    const gained = Math.min(room, s.reward);
    addBuah(s.reward);
    const next = new Set(claimed).add(s.id);
    saveClaimed(next);
    setClaimed(next);
    announceBuah();
    setMsg(gained < s.reward
      ? `Set "${s.title}" lengkap! +${gained} buah (keranjang penuh, sisanya tidak muat).`
      : `Set "${s.title}" lengkap! +${s.reward} buah untuk petikan berikutnya.`);
  };

  const trade = () => {
    const room = BUAH_CAP - getBuah();
    const r = tradeDuplicates(POHON_APRIKOT_POOL, buku, room);
    if (!r.buah) {
      setMsg(room <= 0 ? 'Keranjang buah sudah penuh. Pakai dulu untuk memetik.' : `Butuh ${DUPES_PER_BUAH} kartu dobel untuk 1 buah.`);
      return;
    }
    const nextState = { ...state, buku: r.buku };
    saveState(nextState);
    onStateChange?.(nextState);
    addBuah(r.buah);
    announceBuah();
    setMsg(`${r.used} kartu dobel ditukar jadi ${r.buah} buah. Satu lembar tiap kartu tetap tersimpan.`);
  };

  if (!set) return null;
  const pages = set.pages;
  const pct = set.total ? Math.round((set.owned / set.total) * 100) : 0;
  const tradable = Math.min(Math.floor(dupes.total / DUPES_PER_BUAH), Math.max(0, BUAH_CAP - getBuah()));

  return (
    <div className="binder">
      {/* Set tabs */}
      <div className="flex flex-wrap justify-center gap-2 mb-5" role="tablist" aria-label="Set binder">
        {sets.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={s.id === set.id}
            onClick={() => setSetId(s.id)}
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] transition ${
              s.id === set.id
                ? 'bg-[color:var(--retro-burgundy)] text-white shadow-sm'
                : 'bg-white/70 text-[color:var(--retro-brown-dark)]/70 border border-[color:var(--retro-brown-dark)]/10 hover:bg-[color:var(--retro-burgundy)]/10'
            }`}
          >
            <i className={s.icon} /> {s.title}
            <span className="opacity-75">{s.owned}/{s.total}</span>
            {s.complete && <i className="ri-medal-fill text-[#daaf5c]" aria-label="lengkap" />}
          </button>
        ))}
      </div>

      {/* The binder: cover spine + one page */}
      <div className="binder-book">
        <div className="binder-rings" aria-hidden="true"><span /><span /><span /></div>
        <div className="binder-page">
          <header className="flex flex-wrap items-end justify-between gap-2 mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]">Set · {set.owned}/{set.total}</p>
              <h3 className="text-2xl text-[color:var(--retro-text-primary)]" style={{ ...SERIF, fontWeight: 700 }}>{set.title}</h3>
              <p className="text-xs italic text-[color:var(--retro-brown-dark)]/60">{set.blurb}</p>
            </div>
            <div className="w-40">
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(140,100,60,0.14)' }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Progres set ${set.title}`}>
                <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: set.complete ? 'linear-gradient(90deg,#daaf5c,#b8893f)' : 'var(--retro-burgundy)' }} />
              </div>
              <p className="mt-1 text-right text-[10px] uppercase tracking-[0.25em] text-[color:var(--retro-brown-dark)]/55">{pct}% · hadiah {set.reward} buah</p>
            </div>
          </header>

          {set.complete && <div className="binder-stamp" aria-label="Set lengkap">Set lengkap</div>}

          <div className="binder-grid">
            {pages[page].map((card, i) => (
              <Pocket key={card?.id || `empty-${i}`} card={card} count={card ? Number(buku[card.id]?.count) || (buku[card.id] ? 1 : 0) : 0} onOpen={() => onOpenCard?.(card.id)} />
            ))}
          </div>

          {pages.length > 1 && (
            <nav className="mt-4 flex items-center justify-center gap-3" aria-label="Halaman binder">
              <button type="button" className="binder-nav" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} aria-label="Halaman sebelumnya">
                <i className="ri-arrow-left-s-line" />
              </button>
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[color:var(--retro-brown-dark)]/60">Halaman {page + 1}/{pages.length}</span>
              <button type="button" className="binder-nav" onClick={() => setPage((p) => Math.min(pages.length - 1, p + 1))} disabled={page === pages.length - 1} aria-label="Halaman berikutnya">
                <i className="ri-arrow-right-s-line" />
              </button>
            </nav>
          )}
        </div>
      </div>

      {/* Rewards + duplicates */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="binder-panel">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]"><i className="ri-gift-line" /> Hadiah set</p>
          {claimable.length ? (
            claimable.map((s) => (
              <button key={s.id} type="button" onClick={() => claim(s)} className="mt-2 w-full rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white" style={{ background: 'linear-gradient(135deg,#daaf5c,#b8893f)' }}>
                Ambil +{s.reward} buah · {s.title}
              </button>
            ))
          ) : (
            <p className="mt-1 text-xs text-[color:var(--retro-brown-dark)]/65">
              Lengkapi satu set untuk mendapat buah: {sets.map((s) => `${s.title} ${claimed.has(s.id) ? '✓' : `${s.reward}`}`).join(' · ')}.
            </p>
          )}
        </div>
        <div className="binder-panel">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]"><i className="ri-exchange-line" /> Kartu dobel</p>
          <p className="mt-1 text-xs text-[color:var(--retro-brown-dark)]/65">
            {dupes.total ? `${dupes.total} lembar dobel. Tukar ${DUPES_PER_BUAH} dobel = 1 buah (kartu biasa dipakai duluan, satu lembar tetap disimpan).` : 'Belum ada kartu dobel.'}
          </p>
          {dupes.total >= DUPES_PER_BUAH && (
            <button type="button" onClick={trade} disabled={!tradable} className="mt-2 w-full rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white bg-[color:var(--retro-burgundy)] disabled:opacity-50">
              {tradable ? `Tukar jadi ${tradable} buah` : 'Keranjang buah penuh'}
            </button>
          )}
        </div>
      </div>

      <p className="mt-3 min-h-[1.25rem] text-center text-xs font-bold text-[color:var(--retro-burgundy)]" aria-live="polite">{msg}</p>
    </div>
  );
};

export default BinderPetikan;
