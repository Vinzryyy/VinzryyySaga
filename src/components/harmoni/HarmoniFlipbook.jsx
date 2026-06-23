/**
 * HarmoniFlipbook — 3D CSS flipbook "Frame yang Tersimpan".
 *
 * Arsip visual Armeniaca yang diambil kembali untuk dikenang —
 * photo spreads spanning different eras of Eli's journey.
 *
 * Each spread = two pages side by side. Navigation flips the full spread
 * around the vertical center axis using GSAP + CSS perspective.
 *
 * Interaction: arrow buttons · keyboard ←→ · drag/swipe
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { gsap } from 'gsap';

/* ── Book dimensions (logical px, scaled down on small screens) ─── */
const PAGE_W = 360;
const PAGE_H = 500;
const BOOK_W  = PAGE_W * 2; // 720

/* ── Spread data — Frame yang Tersimpan ─────────────────────────── */
const SPREADS = [
  { type: 'cover' },
  {
    chapter: 'Venue',
    left:  { img: '/cgv/layout/cgv layout.png',  caption: 'CGV FX Sudirman F7' },
    right: { img: '/cgv/layout/sts poster.png',  caption: '' },
  },
  {
    chapter: 'Dinding Kebaikan',
    left:  { img: '/cgv/layout/dinding kebaikan.png',   caption: '' },
    right: { img: '/cgv/layout/dinding kebaikan 2.png', caption: '' },
  },
  {
    chapter: 'Apresiasi',
    left:  { img: '/cgv/layout/cgv top spender.png', caption: '' },
    right: { img: '/cgv/layout/table.png',           caption: '' },
  },
  {
    chapter: 'Ceu Eli',
    left:  { img: '/cgv/eli.png',         caption: '' },
    right: { img: '/cgv/eliwithfans.png', caption: '' },
  },
  {
    chapter: 'Komunitas',
    left:  { img: '/cgv/queen cemot.png', caption: '' },
    right: { img: '/cgv/cemot.png',       caption: '' },
  },
  {
    chapter: 'Kenangan',
    left:  { img: '/cgv/cangcorang.png',     caption: '' },
    right: { img: '/cgv/armephotostrip.png', caption: '' },
  },
  { type: 'back-cover' },
];

/* ── Spread renderers ────────────────────────────────────────────── */

const CoverSpread = () => (
  <div style={{ display: 'flex', width: BOOK_W, height: PAGE_H }}>
    {/* Left — decorative endpaper */}
    <div style={{
      width: PAGE_W, height: '100%', flexShrink: 0,
      background: 'linear-gradient(155deg, #2a1f17 0%, #3D342B 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `repeating-linear-gradient(45deg,
          rgba(201,169,97,0.045) 0px, rgba(201,169,97,0.045) 1px,
          transparent 1px, transparent 18px)`,
      }} />
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        border: '1px solid rgba(201,169,97,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ color: 'rgba(229,197,117,0.45)', fontSize: 30, lineHeight: 1, userSelect: 'none' }}>✿</span>
      </div>
    </div>

    {/* Right — title page */}
    <div style={{
      width: PAGE_W, height: '100%', flexShrink: 0,
      background: 'linear-gradient(160deg, #4a3428 0%, #5C4A3A 50%, #3D342B 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 36px', textAlign: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -80, right: -80,
        width: 240, height: 240, borderRadius: '50%',
        background: 'rgba(201,169,97,0.07)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -40, left: -40,
        width: 160, height: 160, borderRadius: '50%',
        background: 'rgba(201,169,97,0.05)', pointerEvents: 'none',
      }} />

      <p style={{
        color: 'rgba(229,197,117,0.75)',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 9, fontWeight: 900,
        textTransform: 'uppercase', letterSpacing: '0.45em',
        marginBottom: 22, position: 'relative',
      }}>Armeniaca · Arsip Visual</p>

      <h1 style={{
        color: '#FDF6E3',
        fontFamily: 'Fraunces Variable, Fraunces, Georgia, serif',
        fontSize: 40, fontWeight: 900,
        lineHeight: 0.92, letterSpacing: '-0.02em',
        marginBottom: 6, position: 'relative',
      }}>
        Frame yang<br />
        <span style={{ color: '#E5C575' }}>Tersimpan</span>
      </h1>

      <div style={{
        width: 44, height: 1,
        background: 'rgba(229,197,117,0.3)',
        margin: '18px auto', position: 'relative',
      }} />

      <p style={{
        color: 'rgba(253,246,227,0.5)',
        fontFamily: 'Fraunces Variable, Fraunces, Georgia, serif',
        fontStyle: 'italic',
        fontSize: 11,
        position: 'relative',
        lineHeight: 1.6,
        maxWidth: 220,
      }}>Momen-momen yang Armeniaca rawat — diambil dari arsip, ditampilkan kembali untuk dikenang.</p>
    </div>
  </div>
);

const BackCoverSpread = () => (
  <div style={{ display: 'flex', width: BOOK_W, height: PAGE_H }}>
    {/* Left — closing message */}
    <div style={{
      width: PAGE_W, height: '100%', flexShrink: 0,
      background: '#FCF4E6',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 36px', textAlign: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `repeating-linear-gradient(0deg,
          rgba(139,64,64,0.035) 0px, rgba(139,64,64,0.035) 1px,
          transparent 1px, transparent 22px)`,
      }} />

      <p style={{
        color: 'rgba(139,64,64,0.4)',
        fontSize: 9, fontWeight: 900,
        textTransform: 'uppercase', letterSpacing: '0.4em',
        fontFamily: 'system-ui, sans-serif',
        marginBottom: 14, position: 'relative',
      }}>Terima kasih</p>

      <h2 style={{
        fontFamily: 'Fraunces Variable, Fraunces, Georgia, serif',
        color: '#3D2B1F',
        fontSize: 26, fontWeight: 900,
        letterSpacing: '-0.02em', lineHeight: 1.05,
        marginBottom: 14, position: 'relative',
      }}>
        Setiap frame<br />
        yang tersimpan<br />
        <span style={{ color: '#8B4040' }}>adalah kenangan.</span>
      </h2>

      <div style={{
        width: 36, height: 1,
        background: 'rgba(139,64,64,0.18)',
        margin: '10px auto', position: 'relative',
      }} />

      <p style={{
        color: '#7A6A5F',
        fontFamily: 'Fraunces Variable, Fraunces, Georgia, serif',
        fontStyle: 'italic',
        fontSize: 11, lineHeight: 1.65,
        maxWidth: 240, position: 'relative',
      }}>
        Dirawat oleh Armeniaca — untuk Ceu Eli, untuk semua yang ikut merayakan.
      </p>

      <p style={{
        marginTop: 22,
        color: 'rgba(139,64,64,0.38)',
        fontSize: 9, fontWeight: 900,
        textTransform: 'uppercase', letterSpacing: '0.3em',
        fontFamily: 'system-ui, sans-serif', position: 'relative',
      }}>Armeniaca · 2026</p>
    </div>

    {/* Right — decorative endpaper */}
    <div style={{
      width: PAGE_W, height: '100%', flexShrink: 0,
      background: 'linear-gradient(155deg, #3D342B 0%, #2a1f17 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `repeating-linear-gradient(-45deg,
          rgba(201,169,97,0.04) 0px, rgba(201,169,97,0.04) 1px,
          transparent 1px, transparent 18px)`,
      }} />
      <span style={{ color: 'rgba(229,197,117,0.2)', fontSize: 44, lineHeight: 1, userSelect: 'none' }}>✿</span>
    </div>
  </div>
);

const PhotoSpread = ({ spread, spreadIdx }) => {
  const renderPage = (side, data, pageNum) => (
    <div style={{
      width: PAGE_W, height: '100%', flexShrink: 0,
      position: 'relative', overflow: 'hidden',
      background: '#1a1210',
    }}>
      <img
        src={data.img}
        alt={data.caption || ''}
        loading="lazy"
        draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      {/* Gradient vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, transparent 35%, rgba(0,0,0,0.65) 100%)',
        pointerEvents: 'none',
      }} />
      {data.caption && (
        <p style={{
          position: 'absolute', bottom: 34, left: 14, right: 14,
          color: '#FDF6E3',
          fontFamily: 'Fraunces Variable, Fraunces, Georgia, serif',
          fontStyle: 'italic', fontSize: '0.78rem',
          textShadow: '0 1px 6px rgba(0,0,0,0.55)',
          lineHeight: 1.4,
        }}>{data.caption}</p>
      )}
      {/* Page number */}
      <p style={{
        position: 'absolute', bottom: 11,
        ...(side === 'left' ? { left: 12 } : { right: 12 }),
        color: 'rgba(253,246,227,0.28)',
        fontSize: 9, letterSpacing: '0.18em',
        fontFamily: 'system-ui, sans-serif', fontWeight: 900,
        textTransform: 'uppercase', userSelect: 'none',
      }}>{pageNum}</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', width: BOOK_W, height: PAGE_H }}>
      {renderPage('left',  spread.left,  spreadIdx * 2)}
      {renderPage('right', spread.right, spreadIdx * 2 + 1)}
    </div>
  );
};

const SpreadContent = ({ spread, idx }) => {
  if (!spread) return null;
  if (spread.type === 'cover')      return <CoverSpread />;
  if (spread.type === 'back-cover') return <BackCoverSpread />;
  return <PhotoSpread spread={spread} spreadIdx={idx} />;
};

/* ── Main flipbook ───────────────────────────────────────────────── */

const HarmoniFlipbook = () => {
  const [page, setPage]         = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [scale, setScale]       = useState(1);

  const spreadRef      = useRef(null);
  const tlRef          = useRef(null);
  const pendingFlipRef = useRef(null);
  const dragStartX     = useRef(null);

  /* — Responsive scale — */
  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth;
      const pad = 40;
      const maxW = Math.min(vw - pad, BOOK_W);
      setScale(+(maxW / BOOK_W).toFixed(4));
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  /* — Kill GSAP on unmount — */
  useEffect(() => {
    return () => { if (tlRef.current) tlRef.current.kill(); };
  }, []);

  /* — Start animation after React renders new content — */
  // Runs after EVERY render (intentional: fires after setIsFlipping re-render).
  useEffect(() => {
    const pending = pendingFlipRef.current;
    if (!pending || !spreadRef.current) return;
    pendingFlipRef.current = null;

    const { dir, targetPage } = pending;
    const el = spreadRef.current;
    const exitY  = dir === 'next' ? -90 : 90;
    const enterY = dir === 'next' ?  90 : -90;

    if (tlRef.current) tlRef.current.kill();

    tlRef.current = gsap.timeline({
      onComplete: () => setIsFlipping(false),
    });

    tlRef.current.to(el, {
      rotateY: exitY,
      duration: 0.28,
      ease: 'power2.in',
      transformOrigin: '50% 50%',
      onComplete: () => setPage(targetPage),
    });

    tlRef.current.fromTo(
      el,
      { rotateY: enterY },
      { rotateY: 0, duration: 0.28, ease: 'power2.out', transformOrigin: '50% 50%' },
    );
  });

  /* — Flip trigger — */
  const flip = useCallback((dir) => {
    if (isFlipping) return;
    const targetPage = dir === 'next' ? page + 1 : page - 1;
    if (targetPage < 0 || targetPage >= SPREADS.length) return;
    setIsFlipping(true);
    pendingFlipRef.current = { dir, targetPage };
  }, [isFlipping, page]);

  /* — Drag/swipe — */
  const onPointerDown = useCallback((e) => {
    dragStartX.current = e.clientX;
  }, []);

  const onPointerUp = useCallback((e) => {
    if (dragStartX.current === null) return;
    const delta = e.clientX - dragStartX.current;
    dragStartX.current = null;
    if (Math.abs(delta) < 40) return;
    flip(delta < 0 ? 'next' : 'prev');
  }, [flip]);

  /* — Keyboard — */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight') flip('next');
      if (e.key === 'ArrowLeft')  flip('prev');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [flip]);

  const cur      = SPREADS[page];
  const canNext  = page < SPREADS.length - 1;
  const canPrev  = page > 0;
  const chapter  = cur.chapter || (cur.type === 'cover' ? 'Cover' : 'Penutup');

  return (
    <div className="flex flex-col items-center select-none py-8">
      {/* Chapter label */}
      <div className="mb-5 text-center">
        <p className="text-[9px] font-black uppercase tracking-[0.45em] text-[color:var(--retro-burgundy)] mb-1">
          Frame yang Tersimpan · Armeniaca
        </p>
        <h2 className="font-header text-base sm:text-lg font-black tracking-tight text-[color:var(--retro-text-primary)]">
          {chapter}
        </h2>
      </div>

      {/* Perspective container — sized to the scaled book */}
      <div
        style={{
          perspective: '2800px',
          perspectiveOrigin: '50% 45%',
          width:  BOOK_W * scale,
          height: PAGE_H * scale,
          position: 'relative',
        }}
      >
        {/* Drop shadow beneath the book */}
        <div style={{
          position: 'absolute',
          bottom: -12,
          left: '50%',
          transform: 'translateX(-50%)',
          width: BOOK_W * scale * 0.88,
          height: 24,
          background: 'radial-gradient(ellipse, rgba(0,0,0,0.35) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Book at logical size, then scaled */}
        <div style={{
          width: BOOK_W,
          height: PAGE_H,
          transformOrigin: '0 0',
          transform: `scale(${scale})`,
          position: 'absolute',
          top: 0,
          left: 0,
        }}>
          {/* Flippable spread */}
          <div
            ref={spreadRef}
            style={{
              width: BOOK_W,
              height: PAGE_H,
              overflow: 'hidden',
              borderRadius: 4,
              position: 'relative',
              cursor: isFlipping ? 'default' : 'grab',
              touchAction: 'none',
              boxShadow: '0 18px 55px rgba(0,0,0,0.42), 0 6px 18px rgba(0,0,0,0.28)',
            }}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
          >
            <SpreadContent spread={cur} idx={page} />

            {/* Spine shadow */}
            <div style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              transform: 'translateX(-50%)',
              width: 8,
              height: '100%',
              background: 'linear-gradient(90deg, rgba(0,0,0,0.2), rgba(0,0,0,0.06), rgba(0,0,0,0.2))',
              pointerEvents: 'none',
              zIndex: 5,
            }} />

            {/* Left edge vignette */}
            <div style={{
              position: 'absolute', left: 0, top: 0,
              width: 20, height: '100%',
              background: 'linear-gradient(90deg, rgba(0,0,0,0.15), transparent)',
              pointerEvents: 'none', zIndex: 4,
            }} />

            {/* Right edge vignette */}
            <div style={{
              position: 'absolute', right: 0, top: 0,
              width: 20, height: '100%',
              background: 'linear-gradient(270deg, rgba(0,0,0,0.15), transparent)',
              pointerEvents: 'none', zIndex: 4,
            }} />

            {/* Page curl hint */}
            {canNext && !isFlipping && (
              <div style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 36, height: 36,
                background: 'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.1) 50%)',
                borderTopLeftRadius: 36,
                pointerEvents: 'none', zIndex: 6,
              }} />
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-6 mt-7">
        <button
          type="button"
          onClick={() => flip('prev')}
          disabled={!canPrev || isFlipping}
          aria-label="Halaman sebelumnya"
          className="w-10 h-10 rounded-full border-2 border-[color:var(--retro-burgundy)]/25 text-[color:var(--retro-burgundy)] flex items-center justify-center hover:bg-[color:var(--retro-burgundy)] hover:text-[color:var(--retro-cream)] hover:border-[color:var(--retro-burgundy)] transition-all disabled:opacity-25 disabled:cursor-not-allowed"
        >
          <i className="ri-arrow-left-line" />
        </button>

        {/* Dot indicators */}
        <div className="flex items-center gap-1.5">
          {SPREADS.map((_, i) => (
            <div
              key={i}
              style={{
                height: 6,
                borderRadius: 3,
                width:      i === page ? 20 : 6,
                background: i === page ? 'var(--retro-burgundy)' : 'rgba(139,64,64,0.22)',
                transition: 'width 0.3s ease, background 0.3s ease',
              }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => flip('next')}
          disabled={!canNext || isFlipping}
          aria-label="Halaman berikutnya"
          className="w-10 h-10 rounded-full border-2 border-[color:var(--retro-burgundy)]/25 text-[color:var(--retro-burgundy)] flex items-center justify-center hover:bg-[color:var(--retro-burgundy)] hover:text-[color:var(--retro-cream)] hover:border-[color:var(--retro-burgundy)] transition-all disabled:opacity-25 disabled:cursor-not-allowed"
        >
          <i className="ri-arrow-right-line" />
        </button>
      </div>

      <p className="mt-3 text-[9px] font-black uppercase tracking-[0.35em] text-[color:var(--color-text-muted)]">
        Geser atau ←→ untuk membalik halaman
      </p>
    </div>
  );
};

export default HarmoniFlipbook;
