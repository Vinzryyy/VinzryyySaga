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
import SocialStoriesRing from '../SocialStoriesRing';
import IdnLiveStreamPlayer from '../IdnLiveStreamPlayer';
import { useShowroomLive } from '../../hooks/useShowroomLive';
import { useIdnLive } from '../../hooks/useIdnLive';

const COVER_IMAGE = '/archive/img-024.webp';

// 252586 → "253K", 1500000 → "1.5M". Compact format for IG-style
// stat strip where space is tight. Uses Indonesian formatting.
const formatCompact = (n) => {
  if (n == null || Number.isNaN(n)) return '—';
  if (n < 1000) return n.toLocaleString('id-ID');
  if (n < 1_000_000) return `${Math.round(n / 1000)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
};

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
  const showroomLive = useShowroomLive('JKT48_Eli');
  const idnLive = useIdnLive('jkt48_eli');
  const liveMap = {
    SHOWROOM: showroomLive.isLive,
    'IDN Live': idnLive.isLive,
  };

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

  const avatar = SITE_CONFIG.eli?.portrait || '/archive/img-364.webp';
  const handle = (SITE_CONFIG.social.twitter || 'https://x.com/armeniaca15')
    .split('/')
    .pop();
  const bio = SITE_CONFIG.site?.description || SITE_CONFIG.branding?.description;
  const fullName = SITE_CONFIG.branding?.fullName || 'Armeniaca';
  const tagline = SITE_CONFIG.branding?.tagline;

  return (
    <section aria-label="Profil arsip">
      {/* Cover banner — full-bleed from the very top of the viewport
          so the fixed navbar sits over it (no white gap above). Height
          accounts for the ~72px navbar + a usable visible band below.
          Bottom gradient ensures the avatar + handle row reads cleanly
          even on light banner content. */}
      <div className="relative w-full h-56 sm:h-72 md:h-80 lg:h-96 overflow-hidden bg-[color:var(--retro-brown-dark)]">
        <img
          src={COVER_IMAGE}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
          style={{ objectPosition: '55% 30%' }}
          loading="eager"
        />
        {/* Top-fade overlay — gives the navbar a darker backdrop so
            its links/icons stay legible against the photo. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[color:var(--retro-brown-dark)]/60 to-transparent"
        />
        {/* Decorative icon scatter — Armeniaca theme (flower for the
            #BloomInSpring tagline, sparkle/heart for stage moments,
            music note for performance). Positioned percent-based so
            they reflow on resize. Soft white at low opacity so they
            read as ornament against any banner photo without
            stealing focus from the avatar/handle below. */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <i className="ri-flower-fill absolute text-white/25 text-2xl sm:text-3xl md:text-4xl drop-shadow-md" style={{ top: '18%', left: '6%', transform: 'rotate(-12deg)' }} />
          <i className="ri-sparkling-2-fill absolute text-[color:var(--retro-gold-light)]/70 text-lg sm:text-xl md:text-2xl drop-shadow-md" style={{ top: '32%', left: '18%' }} />
          <i className="ri-heart-fill absolute text-white/20 text-base sm:text-lg drop-shadow-md" style={{ top: '52%', left: '11%' }} />
          <i className="ri-flower-line absolute text-white/30 text-xl sm:text-2xl md:text-3xl drop-shadow-md" style={{ top: '22%', right: '8%', transform: 'rotate(15deg)' }} />
          <i className="ri-sparkling-line absolute text-white/35 text-2xl sm:text-3xl drop-shadow-md" style={{ top: '14%', right: '22%' }} />
          <i className="ri-music-2-fill absolute text-white/20 text-lg sm:text-xl drop-shadow-md" style={{ bottom: '32%', right: '14%', transform: 'rotate(-8deg)' }} />
          <i className="ri-leaf-fill absolute text-[color:var(--retro-gold-light)]/40 text-base sm:text-lg drop-shadow-md" style={{ bottom: '18%', right: '6%', transform: 'rotate(20deg)' }} />
          <i className="ri-flower-fill absolute text-white/15 text-3xl sm:text-4xl md:text-5xl drop-shadow-md" style={{ bottom: '24%', left: '38%', transform: 'rotate(8deg)' }} />
          <i className="ri-sparkling-2-line absolute text-white/30 text-base sm:text-lg drop-shadow-md" style={{ top: '40%', right: '38%' }} />
          <i className="ri-heart-line absolute text-[color:var(--retro-gold-light)]/50 text-sm sm:text-base drop-shadow-md" style={{ bottom: '40%', left: '24%' }} />
        </div>
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

          {/* IDN inline player — when Eli is live on IDN, embed the
              raw HLS stream directly so visitors get a clean watch
              experience without the platform's gift animation chrome.
              Falls back to a "Tonton di IDN App" CTA inside the
              player frame on CORS rejection. */}
          {idnLive.isLive && idnLive.liveStream?.playbackUrl && (
            <div className="mt-5 max-w-2xl">
              <IdnLiveStreamPlayer
                playbackUrl={idnLive.liveStream.playbackUrl}
                posterUrl={idnLive.liveStream.imageUrl}
                externalUrl={idnLive.liveStream.url}
                title={idnLive.liveStream.title}
                viewCount={idnLive.liveStream.viewCount}
              />
            </div>
          )}

          {/* SHOWROOM live banner (no inline embed — SHOWROOM uses
              their own proprietary player, not HLS). Click drops to
              the live room on showroom-live.com. */}
          {!idnLive.isLive && showroomLive.isLive && (
            <a
              href="https://www.showroom-live.com/r/JKT48_Eli"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-3 px-4 py-2.5 rounded-full bg-red-600 text-white shadow-md shadow-red-500/30 hover:-translate-y-0.5 transition-transform"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                Live Now · SHOWROOM
              </span>
              <i className="ri-arrow-right-up-line text-base ml-auto" />
            </a>
          )}

          {/* Stories ring — IG-style avatar tray for Eli's social
              accounts. Avatar gets a red pulse + LIVE badge when the
              corresponding live-status proxy reports is_live=true. */}
          {SITE_CONFIG.eli?.socials?.length > 0 && (
            <div className="mt-5">
              <SocialStoriesRing
                socials={SITE_CONFIG.eli.socials}
                avatar={avatar}
                liveMap={liveMap}
              />
            </div>
          )}

          {/* Stats — IG-style strip. Adds an IDN follower count
              when the proxy returns one (live data, refreshes per
              page load). 4-up grid on mobile gets a tighter gap so
              all numbers fit without wrapping. */}
          <dl className="mt-6 grid grid-cols-4 gap-2 sm:gap-6 max-w-lg text-[color:var(--retro-text-primary)]">
            <div className="text-center sm:text-left">
              <dd className="font-header text-base sm:text-xl md:text-2xl font-black tabular-nums leading-tight">
                {stats.frames.toLocaleString('id-ID')}
              </dd>
              <dt className="text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] mt-0.5">
                Frames
              </dt>
            </div>
            <div className="text-center sm:text-left border-l sm:border-0 border-[color:var(--retro-brown-dark)]/10 pl-2 sm:pl-0">
              <dd className="font-header text-base sm:text-xl md:text-2xl font-black tabular-nums leading-tight">
                {stats.events.toLocaleString('id-ID')}
              </dd>
              <dt className="text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] mt-0.5">
                Events
              </dt>
            </div>
            <div className="text-center sm:text-left border-l sm:border-0 border-[color:var(--retro-brown-dark)]/10 pl-2 sm:pl-0">
              <dd className="font-header text-base sm:text-xl md:text-2xl font-black tabular-nums leading-tight">
                {stats.yearRange}
              </dd>
              <dt className="text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] mt-0.5">
                Era
              </dt>
            </div>
            <div className="text-center sm:text-left border-l sm:border-0 border-[color:var(--retro-brown-dark)]/10 pl-2 sm:pl-0">
              <dd className="font-header text-base sm:text-xl md:text-2xl font-black tabular-nums leading-tight">
                {idnLive.profile?.followerCount != null
                  ? formatCompact(idnLive.profile.followerCount)
                  : '—'}
              </dd>
              <dt className="text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] mt-0.5 inline-flex items-center gap-1">
                <i className="ri-broadcast-line text-[10px]" />
                IDN
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
