/**
 * ArchiveProfileHeader — X-style profile header for /gallery.
 *
 * Layout, top to bottom:
 *   1. Cover banner — wide aspect (3:1) image of Eli with a soft
 *      bottom gradient so the avatar + handle stay legible.
 *   2. Avatar — round portrait overlapping the banner's bottom-left
 *      edge by half its height (X profile pattern).
 *   3. Identity row — handle + verified tick on the left, action
 *      buttons (Follow, share) on the right.
 *   4. Display name + tagline + bio + link.
 *   5. Stats row — frames / events / era span (IG-style).
 *
 * Cover image is a single curated landscape frame (img-036) — already
 * proven on /schedule. Avatar uses Eli's portrait so the branding
 * matches other surfaces.
 */

import React, { memo, useMemo } from 'react';
import { useGallery } from '../../context';
import { SITE_CONFIG } from '../../config/siteConfig';

const COVER_IMAGE = '/archive/img-036.jpg';

const formatYearRange = (images) => {
  if (!images || images.length === 0) return '—';
  const years = images
    .map((img) => Number((img.eventDate || img.date || '').slice(0, 4)))
    .filter((y) => Number.isFinite(y) && y > 2000 && y < 2100);
  if (years.length === 0) return '—';
  const min = Math.min(...years);
  const max = Math.max(...years);
  return min === max ? `${min}` : `${min}–${max}`;
};

const ArchiveProfileHeader = memo(function ArchiveProfileHeader() {
  const { images, totalImages } = useGallery();

  const stats = useMemo(() => {
    const events = new Set(
      images
        .map((img) => img.eventName)
        .filter((n) => n && n !== 'Eli JKT48 Moment'),
    );
    return {
      frames: totalImages,
      events: events.size,
      yearRange: formatYearRange(images),
    };
  }, [images, totalImages]);

  const avatar = SITE_CONFIG.eli?.portrait || '/archive/img-364.jpg';
  const handle = (SITE_CONFIG.social.twitter || 'https://x.com/armeniaca15')
    .split('/')
    .pop();
  const bio = SITE_CONFIG.site?.description || SITE_CONFIG.branding?.description;
  const fullName = SITE_CONFIG.branding?.fullName || 'Armeniaca';
  const tagline = SITE_CONFIG.branding?.tagline;

  return (
    <section aria-label="Profil arsip" className="pt-16 sm:pt-20">
      {/* Cover banner — full-bleed, ~3:1 aspect. Bottom gradient
          ensures the avatar + handle row reads cleanly even on light
          banner content. */}
      <div className="relative w-full h-40 sm:h-52 md:h-64 lg:h-72 overflow-hidden bg-[color:var(--retro-brown-dark)]">
        <img
          src={COVER_IMAGE}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
          style={{ objectPosition: '50% 35%' }}
          loading="eager"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[color:var(--retro-bg-primary)] via-[color:var(--retro-bg-primary)]/30 to-transparent"
        />
      </div>

      {/* Profile content — sits on bg-primary just below the banner.
          Avatar uses negative top margin so it half-overlaps the
          banner edge (X pattern). */}
      <div className="px-5 sm:px-6 md:px-12 lg:px-20">
        <div className="max-w-5xl mx-auto">
          {/* Avatar + action row. Avatar floats left, actions float
              right. mt negative pulls avatar up over the banner. */}
          <div className="flex items-end justify-between gap-4 -mt-12 sm:-mt-16 md:-mt-20 mb-4">
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full overflow-hidden ring-4 ring-[color:var(--retro-bg-primary)] shadow-[0_8px_28px_rgba(61,52,43,0.18)] flex-shrink-0">
              <img
                src={avatar}
                alt={`Avatar ${handle}`}
                className="w-full h-full object-cover"
                style={{ objectPosition: '50% 18%' }}
                loading="eager"
              />
            </div>
            {/* Actions — sized down on mobile so they fit next to the
                avatar without wrapping. */}
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <a
                href={SITE_CONFIG.social.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] hover:-translate-y-0.5 hover:shadow-md transition-all"
              >
                <i className="ri-twitter-x-line text-sm" />
                Follow
              </a>
              <a
                href={SITE_CONFIG.social.fanbase || 'https://x.com/helismiley_ofc'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white border border-[color:var(--retro-burgundy)]/15 text-[color:var(--retro-burgundy)] hover:bg-[color:var(--retro-burgundy)]/10 transition-colors"
                title="Helismiley fanbase"
                aria-label="Helismiley"
              >
                <i className="ri-share-line text-sm" />
              </a>
            </div>
          </div>

          {/* Identity block */}
          <div className="mb-4">
            <h1 className="font-header text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-[color:var(--retro-text-primary)] flex items-center gap-2 leading-tight">
              {fullName}
              <i
                className="ri-checkbox-circle-fill text-[color:var(--retro-burgundy)] text-base sm:text-lg"
                aria-label="Verified archive"
                title="Arsip resmi"
              />
            </h1>
            <p className="text-sm sm:text-base text-[color:var(--color-text-muted)] font-bold mt-0.5">
              @{handle}
              {tagline && (
                <span className="text-[color:var(--retro-burgundy)] font-black ml-2">
                  {tagline}
                </span>
              )}
            </p>
          </div>

          {/* Bio + link */}
          {bio && (
            <p className="text-xs sm:text-sm text-[color:var(--color-text-secondary)] leading-relaxed max-w-xl mb-2">
              {bio}
            </p>
          )}
          <a
            href={SITE_CONFIG.site?.url || 'https://armeniaca.online'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs sm:text-sm text-[color:var(--retro-burgundy)] font-bold hover:underline"
          >
            <i className="ri-link" />
            {(SITE_CONFIG.site?.url || 'armeniaca.online').replace(/^https?:\/\//, '')}
          </a>

          {/* Stats — IG-style, equal columns, centered text on mobile. */}
          <dl className="mt-6 grid grid-cols-3 gap-2 sm:gap-6 max-w-md text-[color:var(--retro-text-primary)]">
            <div className="text-center sm:text-left">
              <dd className="font-header text-lg sm:text-xl md:text-2xl font-black tabular-nums leading-tight">
                {stats.frames.toLocaleString('id-ID')}
              </dd>
              <dt className="text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] mt-0.5">
                Frames
              </dt>
            </div>
            <div className="text-center sm:text-left border-l sm:border-0 border-[color:var(--retro-brown-dark)]/10 pl-2 sm:pl-0">
              <dd className="font-header text-lg sm:text-xl md:text-2xl font-black tabular-nums leading-tight">
                {stats.events.toLocaleString('id-ID')}
              </dd>
              <dt className="text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] mt-0.5">
                Events
              </dt>
            </div>
            <div className="text-center sm:text-left border-l sm:border-0 border-[color:var(--retro-brown-dark)]/10 pl-2 sm:pl-0">
              <dd className="font-header text-lg sm:text-xl md:text-2xl font-black tabular-nums leading-tight">
                {stats.yearRange}
              </dd>
              <dt className="text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] mt-0.5">
                Era
              </dt>
            </div>
          </dl>
        </div>
      </div>

      {/* Hairline below profile, before sticky filter bar. Keeps the
          two sections visually distinct without a heavy divider. */}
      <div className="max-w-5xl mx-auto mt-6 md:mt-8 px-5 sm:px-6 md:px-12 lg:px-20">
        <div className="h-px bg-[color:var(--retro-brown-dark)]/10" />
      </div>
    </section>
  );
});

export default ArchiveProfileHeader;
