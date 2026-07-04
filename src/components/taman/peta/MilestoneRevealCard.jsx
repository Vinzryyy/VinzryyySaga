/**
 * MilestoneRevealCard — threshold reveal overlay for TamanPeta.
 *
 * Shows a centered card when armeniacaCount crosses a key threshold
 * while the user is on the peta map. The card fades in with GSAP,
 * auto-dismisses after 4 seconds, and has an explicit close button.
 *
 * Props:
 *   milestone — { threshold, title, eyebrow, desc, accent, icon }
 *               or null (renders nothing).
 *   onClose   — called when user closes or auto-dismiss fires.
 */
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const MilestoneRevealCard = ({ milestone, onClose }) => {
  const overlayRef = useRef(null);
  const cardRef = useRef(null);
  const barRef = useRef(null);

  useEffect(() => {
    if (!milestone || !overlayRef.current || !cardRef.current) return undefined;

    const overlay = overlayRef.current;
    const card = cardRef.current;
    const bar = barRef.current;

    // Entrance
    const tl = gsap.timeline();
    tl.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' });
    tl.fromTo(
      card,
      { opacity: 0, y: 24, scale: 0.94 },
      { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: 'back.out(1.4)' },
      '-=0.15',
    );

    // Progress bar — shrinks from 100% → 0% over 4s countdown
    if (bar) {
      tl.fromTo(
        bar,
        { scaleX: 1 },
        {
          scaleX: 0,
          duration: 4,
          ease: 'none',
          transformOrigin: 'left center',
          onComplete: () => onClose?.(),
        },
        '-=0.1',
      );
    }

    return () => tl.kill();
  }, [milestone, onClose]);

  if (!milestone) return null;

  const handleClose = () => {
    const overlay = overlayRef.current;
    const card = cardRef.current;
    gsap.to(card, { opacity: 0, y: -12, scale: 0.96, duration: 0.25, ease: 'power2.in' });
    gsap.to(overlay, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
      delay: 0.1,
      onComplete: () => onClose?.(),
    });
  };

  return (
    <div
      ref={overlayRef}
      className="pointer-events-auto fixed inset-0 z-[80] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.62)' }}
      onClick={handleClose}
      aria-modal="true"
      role="dialog"
      aria-label={milestone.title}
    >
      <div
        ref={cardRef}
        className="relative mx-5 w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #1e1611 0%, #2a1f14 100%)',
          boxShadow: `0 0 0 1px ${milestone.accent}30, 0 24px 64px rgba(0,0,0,0.7)`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent top border */}
        <div
          className="h-[3px] w-full"
          style={{ background: `linear-gradient(90deg, transparent, ${milestone.accent}, transparent)` }}
        />

        <div className="px-7 pt-6 pb-7">
          {/* Icon + eyebrow */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: `${milestone.accent}20`, boxShadow: `0 0 0 1px ${milestone.accent}40` }}
            >
              <i
                className={`${milestone.icon} text-lg`}
                style={{ color: milestone.accent }}
              />
            </div>
            <span
              className="text-[10px] font-black uppercase tracking-[0.35em]"
              style={{ color: `${milestone.accent}cc` }}
            >
              {milestone.eyebrow}
            </span>
          </div>

          {/* Title */}
          <h2
            className="text-xl font-black tracking-tight mb-2 leading-snug"
            style={{ fontFamily: '"Fraunces Variable", serif', color: '#f5f0e8' }}
          >
            {milestone.title}
          </h2>

          {/* Description */}
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(245,240,232,0.65)' }}>
            {milestone.desc}
          </p>
        </div>

        {/* Auto-dismiss progress bar */}
        <div
          ref={barRef}
          className="h-[2px] w-full origin-left"
          style={{ background: milestone.accent, opacity: 0.5 }}
        />

        {/* Close hint */}
        <p
          className="text-center text-[9px] uppercase tracking-[0.3em] py-2"
          style={{ color: 'rgba(245,240,232,0.3)' }}
        >
          Ketuk di mana saja untuk tutup
        </p>
      </div>
    </div>
  );
};

export default MilestoneRevealCard;
