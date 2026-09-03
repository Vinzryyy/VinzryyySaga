/**
 * VivoPage — /vivo. Live streaming archive (YouTube playlist embeds).
 *
 * Layout:
 *   1. Cover banner with title (matches Memoria's banner pattern)
 *   2. Lead paragraph
 *   3. One section per platform (IDN Live, SHOWROOM, …) — each with
 *      a YouTube playlist iframe + open-in-YouTube link.
 *
 * Iframes lazy-load via IntersectionObserver so visitors who only
 * land on the IDN section don't pull the SHOWROOM iframe (and the
 * YT player JS that comes with it) until they scroll there.
 */

import React, { useEffect, useRef, useState } from 'react';
import Seo from '../components/Seo';
import { SITE_CONFIG } from '../config/siteConfig';

const VIVO = SITE_CONFIG.vivo;

// Lite YouTube embed — show thumbnail + play button until clicked, then
// swap to the actual iframe. Saves a player-JS download per card on
// page load (only the cards the user actually clicks load the player).
// Uses youtube-nocookie + autoplay=1 so the click→play feels instant.
const TopPickCard = ({ videoId }) => {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
          title={`Video ${videoId}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label="Putar video"
      className="group relative block aspect-video rounded-xl overflow-hidden bg-black/80 cursor-pointer w-full"
    >
      {/* maxresdefault often doesn't exist for older live recordings;
          hqdefault is guaranteed and looks fine at this size. */}
      <img
        src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
        alt=""
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      />
      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-600/95 group-hover:bg-red-600 group-hover:scale-110 flex items-center justify-center shadow-lg shadow-black/40 transition-all">
          <i className="ri-play-fill text-white text-3xl sm:text-4xl ml-1" />
        </span>
      </span>
    </button>
  );
};

const TopPicksGrid = ({ videoIds }) => {
  // De-dupe in case the source list has duplicates
  const unique = [...new Set(videoIds)];
  if (unique.length === 0) return null;
  return (
    <div className="mb-6 md:mb-8">
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)]/80 mb-3 inline-flex items-center gap-2">
        <i className="ri-star-fill text-[color:var(--retro-gold)]" />
        Top Picks
        <span className="text-[color:var(--retro-text-muted)] tabular-nums">· {unique.length}</span>
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {unique.map((id) => (
          <TopPickCard key={id} videoId={id} />
        ))}
      </div>
    </div>
  );
};

const PlaylistEmbed = ({ playlistId, title }) => {
  const wrapperRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (!wrapperRef.current || shouldLoad) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <div
      ref={wrapperRef}
      className="relative w-full aspect-video rounded-2xl overflow-hidden bg-[color:var(--retro-brown-dark)]/10 shadow-xl shadow-[color:var(--retro-brown-dark)]/10 border border-[color:var(--retro-burgundy)]/10"
    >
      {shouldLoad ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/videoseries?list=${playlistId}&rel=0&modestbranding=1`}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-[color:var(--retro-text-muted)]">
          <i className="ri-youtube-line text-5xl text-[color:var(--retro-burgundy)]/40 mb-3" />
          <span className="text-xs font-black uppercase tracking-[0.3em]">Memuat playlist…</span>
        </div>
      )}
    </div>
  );
};

const PlatformSection = ({ entry }) => (
  <section
    id={entry.id}
    aria-labelledby={`${entry.id}-title`}
    className="scroll-mt-24 md:scroll-mt-32"
  >
    <div className="flex items-baseline justify-between gap-3 mb-3 md:mb-4 flex-wrap">
      <div className="flex items-center gap-3">
        <span
          className="inline-flex items-center justify-center w-9 h-9 rounded-full text-white shadow-md shadow-black/20"
          style={{ backgroundColor: entry.platformColor }}
        >
          <i className={`${entry.platformIcon} text-lg`} />
        </span>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)]">
          {entry.platform}
        </p>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {entry.liveProfileUrl && (
          <a
            href={entry.liveProfileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.25em] text-white shadow-md shadow-black/20 hover:-translate-y-0.5 transition-all"
            style={{ backgroundColor: entry.platformColor }}
            title={`Profile Eli di ${entry.platform}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            {entry.liveProfileLabel || `Tonton Live di ${entry.platform}`}
            <i className="ri-arrow-right-up-line text-base" />
          </a>
        )}
        <a
          href={entry.playlistUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--retro-burgundy)] hover:text-[color:var(--retro-burgundy)]/70 transition-colors"
        >
          <i className="ri-youtube-line text-base" />
          Buka di YouTube
          <i className="ri-arrow-right-up-line text-base" />
        </a>
      </div>
    </div>

    <h2
      id={`${entry.id}-title`}
      className="font-header text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter leading-[1.05] text-[color:var(--retro-text-primary)] mb-3"
    >
      {entry.title}
    </h2>
    <p className="text-sm md:text-base text-[color:var(--retro-text-secondary)] leading-relaxed mb-6 max-w-2xl">
      {entry.description}
    </p>

    {/* Curated top picks above the full playlist embed. Lite-embed
        cards (thumbnail → click → player) so the page doesn't load
        N YouTube iframes upfront. */}
    {entry.topPicks?.length > 0 && (
      <TopPicksGrid videoIds={entry.topPicks} />
    )}

    {/* Divider between top picks and the full playlist */}
    {entry.topPicks?.length > 0 && (
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-text-muted)] mb-3 inline-flex items-center gap-2">
        <i className="ri-play-list-line text-base" />
        Playlist Lengkap
      </p>
    )}

    <PlaylistEmbed playlistId={entry.playlistId} title={entry.title} />
  </section>
);

const VivoPage = () => {
  return (
    <main className="relative bg-[color:var(--retro-bg-primary)] min-h-screen overflow-x-hidden">
      <Seo
        title="Vivo — Live Streaming Eli"
        description="Arsip live streaming Helisma Putri di IDN Live dan SHOWROOM. Playlist YouTube tertanam, auto-update kalau ada video baru."
        path="/vivo"
      />

      {/* Decorative icon scatter — same vocabulary as Memoria so the
          pages feel like a set; positioned for this page's flow.
          pointer-events-none + z-0 so they never intercept clicks. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <i className="absolute ri-mic-fill text-[color:var(--retro-burgundy)]/[0.06] text-[200px] sm:text-[260px] md:text-[340px]"
           style={{ top: '12%', left: '-5%', transform: 'rotate(-14deg)' }} />
        <i className="absolute ri-broadcast-fill text-[color:var(--retro-gold)]/[0.10] text-[120px] sm:text-[160px] md:text-[200px]"
           style={{ top: '36%', right: '-3%', transform: 'rotate(10deg)' }} />
        <i className="absolute ri-music-2-fill text-[color:var(--retro-burgundy)]/[0.05] text-[140px] sm:text-[180px] md:text-[240px]"
           style={{ top: '62%', left: '-4%', transform: 'rotate(8deg)' }} />
        <i className="absolute ri-vidicon-fill text-[color:var(--retro-gold-dark,#a07d3a)]/[0.08] text-[160px] sm:text-[200px] md:text-[260px]"
           style={{ top: '85%', right: '-5%', transform: 'rotate(-18deg)' }} />
      </div>

      {/* Cover banner — full-bleed top, matches Memoria's pattern so
          /vivo and /gallery feel like sibling pages. */}
      <header className="relative w-full h-56 sm:h-72 md:h-80 lg:h-96 overflow-hidden bg-[color:var(--retro-brown-dark)]">
        <img
          src={VIVO.coverImage}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
          style={{ objectPosition: VIVO.coverPosition }}
          loading="eager"
        />
        {/* Top fade for navbar legibility */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[color:var(--retro-brown-dark)]/65 to-transparent"
        />
        {/* Bottom fade so the title sits cleanly over the photo */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[color:var(--retro-brown-dark)]/85 via-[color:var(--retro-brown-dark)]/30 to-transparent"
        />

        {/* Decorative glyphs floating over the banner — same vocab as
            the Memoria banner so the rebrand stays consistent. */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <i className="absolute ri-live-fill text-white/35 text-2xl md:text-3xl drop-shadow-md" style={{ top: '22%', left: '8%', transform: 'rotate(-10deg)' }} />
          <i className="absolute ri-mic-line text-white/30 text-xl md:text-2xl drop-shadow-md" style={{ top: '38%', right: '12%', transform: 'rotate(15deg)' }} />
          <i className="absolute ri-music-2-fill text-[color:var(--retro-gold-light)]/55 text-base md:text-xl drop-shadow-md" style={{ top: '60%', left: '22%' }} />
          <i className="absolute ri-broadcast-line text-white/30 text-xl md:text-2xl drop-shadow-md" style={{ bottom: '24%', right: '20%', transform: 'rotate(-8deg)' }} />
        </div>

        {/* Title block, anchored bottom-left of banner */}
        <div className="absolute inset-x-0 bottom-0 px-5 sm:px-6 md:px-12 lg:px-20 pb-6 md:pb-10">
          <div className="max-w-5xl mx-auto">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-gold-light)] mb-2 inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {VIVO.eyebrow}
            </p>
            <h1 className="font-header text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter text-white leading-[0.95] drop-shadow-[0_2px_18px_rgba(0,0,0,0.4)]">
              {VIVO.title}
              <span className="text-[color:var(--retro-gold-light)]"> {VIVO.titleAccent}</span>
            </h1>
          </div>
        </div>
      </header>

      <div className="relative z-10">
        {/* Lead paragraph + quick-jump links */}
        <section className="px-5 sm:px-6 md:px-12 lg:px-20 pt-8 md:pt-12 pb-2">
          <div className="max-w-5xl mx-auto">
            <p className="text-sm md:text-base text-[color:var(--retro-text-secondary)] leading-relaxed max-w-3xl mb-5">
              {VIVO.lead}
            </p>
            <div className="flex flex-wrap gap-2">
              {VIVO.platforms.map((p) => (
                <a
                  key={p.id}
                  href={`#${p.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[color:var(--retro-burgundy)]/15 text-[color:var(--retro-burgundy)] text-[10px] font-black uppercase tracking-[0.25em] hover:bg-[color:var(--retro-burgundy)] hover:text-[color:var(--retro-cream)] hover:border-[color:var(--retro-burgundy)] transition-colors"
                >
                  <i className={`${p.platformIcon} text-base`} />
                  {p.platform}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* One block per platform, generous spacing between */}
        <section className="px-5 sm:px-6 md:px-12 lg:px-20 pt-8 md:pt-10 pb-16 md:pb-24">
          <div className="max-w-5xl mx-auto space-y-14 md:space-y-20">
            {VIVO.platforms.map((entry) => (
              <PlatformSection key={entry.id} entry={entry} />
            ))}
          </div>
        </section>

        {/* Footer micro-sig — same pattern as Memoria's footer for
            visual continuity between sibling pages. */}
        <div className="max-w-5xl mx-auto px-5 sm:px-6 md:px-12 lg:px-20 pb-12 md:pb-16">
          <div className="flex items-center gap-3 text-[color:var(--retro-text-muted)]">
            <div className="w-10 h-px bg-[color:var(--retro-gold)]/50" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">
              {SITE_CONFIG.branding.name} · Vivo · {SITE_CONFIG.branding.tagline}
            </span>
          </div>
        </div>
      </div>
    </main>
  );
};

export default VivoPage;
