/**
 * ArchiveProfileHeader — Instagram-style profile bar for /gallery.
 *
 * Mirrors the layout of an IG/X profile page header so visitors land
 * on the gallery and immediately recognise the social-media metaphor:
 * round avatar, handle, follow-style CTA, then a stats row, bio, and
 * inline link to the source X account. The avatar is the same Eli
 * portrait used elsewhere in the site so branding stays consistent.
 *
 * Stats it surfaces (all derived from the enriched gallery dataset):
 *   - frame total
 *   - unique events covered
 *   - era span (oldest → newest event date)
 */

import React, { memo, useMemo } from 'react';
import { useGallery } from '../../context';
import { SITE_CONFIG } from '../../config/siteConfig';

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

  return (
    <section
      aria-label="Profil arsip"
      className="px-5 sm:px-6 md:px-12 lg:px-20 pt-24 sm:pt-28 md:pt-36 pb-6 md:pb-10"
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-10 md:gap-14">
          {/* Avatar — round portrait with subtle ring like IG verified
              accounts. Sized down on mobile so the header doesn't push
              the grid below the fold. */}
          <div className="flex-shrink-0">
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full overflow-hidden ring-2 ring-[color:var(--retro-burgundy)]/20 ring-offset-4 ring-offset-[color:var(--retro-bg-primary)] shadow-[0_8px_28px_rgba(61,52,43,0.12)]">
              <img
                src={avatar}
                alt={`Avatar ${handle}`}
                className="w-full h-full object-cover"
                style={{ objectPosition: '50% 18%' }}
                loading="eager"
              />
            </div>
          </div>

          {/* Right column — handle row, stats row, name + bio, link */}
          <div className="flex-1 min-w-0 text-center sm:text-left w-full">
            {/* Handle + CTAs */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
              <h1 className="font-header text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-[color:var(--retro-text-primary)] flex items-center justify-center sm:justify-start gap-2">
                @{handle}
                <i
                  className="ri-checkbox-circle-fill text-[color:var(--retro-burgundy)] text-base sm:text-lg"
                  aria-label="Verified archive"
                  title="Arsip resmi"
                />
              </h1>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <a
                  href={SITE_CONFIG.social.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] text-[10px] font-black uppercase tracking-[0.2em] hover:-translate-y-0.5 hover:shadow-md transition-all"
                >
                  <i className="ri-twitter-x-line text-sm" />
                  Follow
                </a>
                <a
                  href={SITE_CONFIG.social.fanbase || 'https://x.com/helismiley_ofc'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white border border-[color:var(--retro-burgundy)]/15 text-[color:var(--retro-burgundy)] hover:bg-[color:var(--retro-burgundy)]/10 transition-colors"
                  title="Helismiley fanbase"
                  aria-label="Helismiley"
                >
                  <i className="ri-share-line text-sm" />
                </a>
              </div>
            </div>

            {/* Stats row — IG-style three stat strip. Uses tabular-nums
                so the digits don't shift on hover/refresh. */}
            <dl className="flex items-center justify-center sm:justify-start gap-6 sm:gap-10 mb-5 text-[color:var(--retro-text-primary)]">
              <div className="text-center sm:text-left">
                <dd className="font-header text-base sm:text-lg md:text-xl font-black tabular-nums leading-tight">
                  {stats.frames.toLocaleString('id-ID')}
                </dd>
                <dt className="text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] mt-0.5">
                  Frames
                </dt>
              </div>
              <div className="text-center sm:text-left">
                <dd className="font-header text-base sm:text-lg md:text-xl font-black tabular-nums leading-tight">
                  {stats.events.toLocaleString('id-ID')}
                </dd>
                <dt className="text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] mt-0.5">
                  Events
                </dt>
              </div>
              <div className="text-center sm:text-left">
                <dd className="font-header text-base sm:text-lg md:text-xl font-black tabular-nums leading-tight">
                  {stats.yearRange}
                </dd>
                <dt className="text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] mt-0.5">
                  Era
                </dt>
              </div>
            </dl>

            {/* Display name + bio */}
            <p className="font-bold text-sm sm:text-base text-[color:var(--retro-text-primary)] mb-1">
              {SITE_CONFIG.branding?.fullName || 'Armeniaca'}
              <span className="text-[color:var(--color-text-muted)] font-normal ml-2">
                {SITE_CONFIG.branding?.tagline}
              </span>
            </p>
            {bio && (
              <p className="text-xs sm:text-sm text-[color:var(--color-text-secondary)] leading-relaxed max-w-xl mx-auto sm:mx-0">
                {bio}
              </p>
            )}
            <a
              href={SITE_CONFIG.site?.url || 'https://armeniaca.online'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs sm:text-sm text-[color:var(--retro-burgundy)] font-bold hover:underline"
            >
              <i className="ri-link" />
              {(SITE_CONFIG.site?.url || 'armeniaca.online').replace(/^https?:\/\//, '')}
            </a>
          </div>
        </div>
      </div>

      {/* Subtle divider — matches IG's hairline between header and grid */}
      <div className="max-w-5xl mx-auto mt-8 md:mt-12 h-px bg-[color:var(--retro-brown-dark)]/10" />
    </section>
  );
});

export default ArchiveProfileHeader;
