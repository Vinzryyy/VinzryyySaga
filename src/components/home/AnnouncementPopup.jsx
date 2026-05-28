/**
 * AnnouncementPopup — one-shot campaign modal for the Photo Frame Project.
 *
 * Shows on first Home visit (~1.5s after mount). Dismissed state persists
 * in localStorage via POPUP_VERSION key so the modal only nags once.
 * To re-launch when the next campaign arrives, bump POPUP_VERSION and
 * swap the inner content.
 */

import React, { useEffect, useState } from 'react';

const POPUP_VERSION = 'photo-frame-2026';
const STORAGE_KEY = `armeniaca-popup-${POPUP_VERSION}`;
const SHOW_DELAY_MS = 1500;

const AnnouncementPopup = () => {
  const [visible, setVisible] = useState(false);

  const handleClose = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, 'dismissed');
    } catch {
      // Storage write blocked — popup still closes for the session.
    }
    setVisible(false);
  };

  useEffect(() => {
    // Skip users who already dismissed this campaign.
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === 'dismissed') return undefined;
    } catch {
      // localStorage blocked (private mode) — popup still shows; dismiss
      // will be session-only, which is acceptable.
    }
    const id = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(id);
  }, []);

  // Manual re-open via custom event — fired by the Home Harmoni Kebaikan
  // card and the Navbar dropdown entry so dismissed users can revisit.
  // Bypasses the localStorage check on purpose: user is asking for it.
  useEffect(() => {
    const onOpen = () => setVisible(true);
    window.addEventListener('announcement:open', onOpen);
    return () => window.removeEventListener('announcement:open', onOpen);
  }, []);

  // ESC close + body scroll lock while open.
  useEffect(() => {
    if (!visible) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-popup-title"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop — click anywhere outside the card to dismiss. */}
      <button
        type="button"
        onClick={handleClose}
        aria-label="Tutup pengumuman"
        className="absolute inset-0 w-full h-full bg-black/70 backdrop-blur-sm cursor-default animate-fadein"
      />

      {/* Card */}
      <div className="relative w-full max-w-md md:max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-[color:var(--retro-cream)] shadow-2xl ring-1 ring-[color:var(--retro-gold)]/40 animate-popup-card">
        {/* Hero image — Photo Frame Project mockup */}
        <div className="relative aspect-[4/5] overflow-hidden rounded-t-3xl bg-[color:var(--retro-brown-dark)]">
          <img
            src="/ProjectSts2k26/PhotoStrip.jpeg"
            alt="Photo Frame Project — Happy Helisma Day 2026"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Top gradient gives the X button legibility against any photo. */}
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
          <button
            type="button"
            onClick={handleClose}
            aria-label="Tutup"
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition"
          >
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-2 inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--retro-gold)] animate-pulse" />
            Pengumuman Armeniaca
          </p>
          <h2
            id="announcement-popup-title"
            className="font-header text-3xl md:text-4xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-tight mb-3"
          >
            Photo Frame Project
            <br />
            <span className="text-[color:var(--retro-burgundy)]">Happy Helisma Day.</span>
          </h2>
          <p className="text-sm md:text-base text-[color:var(--color-text-secondary)] leading-relaxed mb-5">
            Cetak photobox di booth{' '}
            <span className="font-bold text-[color:var(--retro-text-primary)]">Palette.id</span>{' '}
            dengan bingkai khusus Helisma Day. Buat kenangan visual buat seitansai ke-26 Ceu Eli.
          </p>

          {/* Period strip */}
          <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl bg-[color:var(--retro-burgundy)]/8 border border-[color:var(--retro-burgundy)]/15">
            <span className="w-9 h-9 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] flex items-center justify-center flex-shrink-0">
              <i className="ri-calendar-event-line" />
            </span>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] mb-0.5">
                Periode
              </p>
              <p className="text-sm font-bold text-[color:var(--retro-text-primary)]">
                15 Juni — 15 Juli 2026
              </p>
            </div>
          </div>

          {/* Locations */}
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] mb-2 inline-flex items-center gap-1.5">
            <i className="ri-map-pin-2-line text-base" />
            Lokasi Booth Palette.id
          </p>
          <ul className="space-y-1.5 mb-6 text-sm text-[color:var(--retro-text-secondary)]">
            {['F4, FX Sudirman', 'SMYD', 'Blok M Square'].map((loc) => (
              <li key={loc} className="flex items-start gap-2">
                <i className="ri-checkbox-circle-line text-[color:var(--retro-burgundy)] mt-0.5 flex-shrink-0" />
                <span>{loc}</span>
              </li>
            ))}
          </ul>

          {/* Close CTA */}
          <button
            type="button"
            onClick={handleClose}
            className="w-full px-6 py-3 rounded-full bg-[color:var(--retro-burgundy)] hover:bg-[color:var(--retro-brown-dark)] text-[color:var(--retro-cream)] font-bold text-xs uppercase tracking-widest transition-colors"
          >
            Tutup
          </button>

          <p className="mt-4 text-center text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">
            Armeniaca × Harmoni Kebaikan
          </p>
        </div>
      </div>

      <style>{`
        @keyframes announcementFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes announcementCardIn {
          0%   { opacity: 0; transform: scale(0.94) translateY(8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fadein {
          animation: announcementFadeIn 220ms ease-out;
        }
        .animate-popup-card {
          animation: announcementCardIn 320ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-fadein,
          .animate-popup-card {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AnnouncementPopup;
