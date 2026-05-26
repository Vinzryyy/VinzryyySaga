/**
 * KartuIngatan — card front (the actual revealed memory). Book-page
 * aesthetic: cream paper + spine accent left + image hero + tier
 * eyebrow + Fraunces title + italic caption + meta footer.
 *
 * Per-tier dressing:
 *   muda     — simple, no ornaments
 *   matang   — corner flourish small
 *   langka   — corner flourish larger + dashed inner accent
 *   legenda  — full gold-foil border + ornamental seal + wax-style label
 */

import React, { useEffect, useRef, useState } from 'react';
import { TIER_CONFIG } from '../../data/pohonAprikot';
import { readEnabled, readVolume } from '../../lib/townAudioBus';

// Audio button — render saat card.audio set. Inline play/pause toggle
// dengan volume tied ke townAudioBus. Cleanup audio + listener on unmount.
const AudioPlayButton = ({ src }) => {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.volume = readEnabled() ? Math.max(0.4, readVolume() * 1.5) : 0.7;
    audioRef.current = audio;
    const onEnded = () => setPlaying(false);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('ended', onEnded);
      audio.pause();
      audioRef.current = null;
    };
  }, [src]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => {
          // Autoplay blocked or other audio error — silently fail
          setPlaying(false);
        });
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border border-[color:var(--retro-burgundy)]/30 text-[color:var(--retro-burgundy)] hover:bg-[color:var(--retro-burgundy)]/10 transition"
      aria-label={playing ? 'Jeda suara' : 'Putar suara'}
    >
      <i className={playing ? 'ri-pause-fill text-sm' : 'ri-volume-up-line text-sm'} />
      <span>{playing ? 'Jeda' : 'Dengar'}</span>
    </button>
  );
};

const CornerFlourish = ({ position, size = 18, color = 'var(--retro-burgundy)' }) => {
  const isTop = position.includes('top');
  const isLeft = position.includes('left');
  // Path: small L-shaped flourish dgn curl di ujung
  const path = `M ${isLeft ? size : 0} ${isTop ? size : 0} L ${isLeft ? 2 : size - 2} ${isTop ? size : 0} Q 0 ${isTop ? size : 0} 0 ${isTop ? 2 : size - 2} L 0 ${isTop ? size : 0}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`absolute pointer-events-none ${isTop ? 'top-2' : 'bottom-2'} ${isLeft ? 'left-2' : 'right-2'}`}
      style={{
        transform: `${isLeft ? '' : 'scaleX(-1)'} ${isTop ? '' : 'scaleY(-1)'}`.trim(),
      }}
      aria-hidden="true"
    >
      <path d={path} stroke={color} strokeWidth="1" fill="none" opacity="0.5" />
      <circle cx={isLeft ? 1 : size - 1} cy={isTop ? 1 : size - 1} r="1.5" fill={color} opacity="0.5" />
    </svg>
  );
};

const KartuIngatan = ({ card }) => {
  if (!card) return null;
  const cfg = TIER_CONFIG[card.tier] || TIER_CONFIG.muda;
  const isLegenda = card.tier === 'legenda';
  const isLangka = card.tier === 'langka';
  const isMatang = card.tier === 'matang';

  return (
    <div
      className="relative w-full h-full bg-[color:var(--retro-cream,#faf6ed)] rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(61,52,43,0.18)]"
      style={
        isLegenda
          ? {
              backgroundImage:
                'radial-gradient(circle at 30% 20%, rgba(255,217,122,0.18) 0%, transparent 55%), repeating-linear-gradient(45deg, rgba(140,100,60,0.025) 0 1px, transparent 1px 8px)',
            }
          : isLangka
            ? {
                backgroundImage:
                  'radial-gradient(ellipse at center, rgba(140,100,60,0.04) 0%, rgba(140,100,60,0.08) 100%)',
              }
            : undefined
      }
    >
      {/* Spine accent — left edge, tier color */}
      <span
        className="absolute left-0 top-0 bottom-0 z-10"
        style={{
          width: cfg.spineWidth || '4px',
          background: cfg.spineColor || 'var(--retro-burgundy)',
        }}
      />

      {/* Legenda gold-foil border */}
      {isLegenda && (
        <span
          className="absolute inset-3 rounded-xl pointer-events-none"
          style={{
            border: '1px solid rgba(218, 175, 92, 0.65)',
            boxShadow: 'inset 0 0 0 1px rgba(255, 217, 122, 0.3), inset 0 0 24px rgba(255, 217, 122, 0.12)',
          }}
        />
      )}

      {/* Langka dashed inner accent */}
      {isLangka && (
        <span
          className="absolute inset-4 rounded-lg pointer-events-none border border-[color:var(--retro-burgundy)]/25"
          style={{ borderStyle: 'dashed' }}
        />
      )}

      {/* Corner flourishes — matang+ */}
      {(isMatang || isLangka || isLegenda) && (
        <>
          <CornerFlourish position="top-left" size={isLegenda ? 22 : 16} color={isLegenda ? '#daaf5c' : 'var(--retro-burgundy)'} />
          <CornerFlourish position="top-right" size={isLegenda ? 22 : 16} color={isLegenda ? '#daaf5c' : 'var(--retro-burgundy)'} />
          <CornerFlourish position="bottom-left" size={isLegenda ? 22 : 16} color={isLegenda ? '#daaf5c' : 'var(--retro-burgundy)'} />
          <CornerFlourish position="bottom-right" size={isLegenda ? 22 : 16} color={isLegenda ? '#daaf5c' : 'var(--retro-burgundy)'} />
        </>
      )}

      {/* Content area — scrollable kalau caption panjang (uncommon) */}
      <div className="relative h-full flex flex-col px-5 pt-5 pb-5 pl-7 overflow-y-auto">
        {/* Image hero */}
        {card.image && (
          <div className="relative w-full max-w-[200px] mx-auto aspect-[3/4] mb-4 overflow-hidden rounded-md border border-[color:var(--retro-brown-dark)]/15 shadow-sm shrink-0">
            <img
              src={card.image}
              alt={card.title}
              loading="lazy"
              className="w-full h-full object-cover"
              style={{ filter: 'sepia(0.18) saturate(0.92)' }}
            />
          </div>
        )}

        {/* Tier eyebrow + date */}
        <p className="text-[9px] uppercase tracking-[0.35em] text-[color:var(--retro-burgundy)] mb-2 text-center">
          {cfg.label}
          {card.date && (
            <span className="text-[color:var(--retro-brown-dark)]/50 ml-2">
              · {card.date}
            </span>
          )}
        </p>

        {/* Title */}
        <h2
          className="text-lg sm:text-xl text-[color:var(--retro-brown-dark)] mb-2 text-center leading-tight"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontWeight: 600,
          }}
        >
          {card.title}
        </h2>

        {/* Caption */}
        <p
          className="text-xs sm:text-sm text-[color:var(--retro-brown-dark)]/80 leading-relaxed text-center italic"
          style={{ fontFamily: '"Fraunces Variable", serif' }}
        >
          {card.caption}
        </p>

        {/* Audio play button — voice cards */}
        {card.audio && (
          <div className="mt-4 flex justify-center">
            <AudioPlayButton src={card.audio} />
          </div>
        )}

        {/* Bottom meta — URL doubles as watermark untuk share-as-PNG */}
        <div className="mt-auto pt-3 text-center">
          <p className="text-[8px] uppercase tracking-[0.4em] text-[color:var(--retro-brown-dark)]/50">
            Petikan · armeniaca.online
          </p>
        </div>
      </div>
    </div>
  );
};

export default KartuIngatan;
