/**
 * VivoSection — Vivo (live streaming archive) embedded inside the
 * Memoria/Gallery page as a single segment.
 *
 * Each platform (IDN Live, SHOWROOM) renders as a YouTube playlist
 * iframe inside its own anchored sub-section (#vivo-idn,
 * #vivo-showroom). The native YouTube playlist UI handles its own
 * scrollable video list inside the iframe — no extra wrapping
 * scrollbar from us.
 *
 * Iframes lazy-load via IntersectionObserver so visitors who only
 * skim Memoria don't pull the YouTube player JS until they actually
 * scroll past the section.
 */

import React, { useEffect, useRef, useState } from 'react';
import { SITE_CONFIG } from '../../config/siteConfig';

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
        <div className="absolute inset-0 flex flex-col items-center justify-center text-[color:var(--color-text-muted)]">
          <i className="ri-youtube-line text-5xl text-[color:var(--retro-burgundy)]/40 mb-3" />
          <span className="text-xs font-black uppercase tracking-[0.3em]">Memuat playlist…</span>
        </div>
      )}
    </div>
  );
};

const VivoSection = () => {
  const vivo = SITE_CONFIG.vivo;
  if (!vivo || !vivo.platforms?.length) return null;

  return (
    <section
      id="vivo"
      aria-labelledby="vivo-title"
      className="relative scroll-mt-24 md:scroll-mt-32 px-5 sm:px-6 md:px-12 lg:px-20 pt-12 md:pt-16 pb-4"
    >
      <div className="max-w-5xl mx-auto">
        {/* Section header — clear divider above so visitors know the
            grid above ends and a new content type begins. */}
        <div className="border-t border-[color:var(--retro-brown-dark)]/15 pt-10 md:pt-14 mb-8 md:mb-10">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-3 inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            {vivo.eyebrow}
          </p>
          <h2
            id="vivo-title"
            className="font-header text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95] mb-4"
          >
            {vivo.title}
            <span className="text-[color:var(--retro-burgundy)]"> {vivo.titleAccent}</span>
          </h2>
          <p className="text-sm md:text-base text-[color:var(--color-text-secondary)] leading-relaxed max-w-3xl mb-5">
            {vivo.lead}
          </p>

          {/* Quick-jump pills to each platform sub-section */}
          <div className="flex flex-wrap gap-2">
            {vivo.platforms.map((p) => (
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

        {/* One block per platform. Each block has its own anchored
            sub-section so dropdown deep links (#vivo-idn,
            #vivo-showroom) jump directly to the right embed. */}
        <div className="space-y-12 md:space-y-16">
          {vivo.platforms.map((entry) => (
            <article
              key={entry.id}
              id={entry.id}
              aria-labelledby={`${entry.id}-title`}
              className="scroll-mt-24 md:scroll-mt-32"
            >
              <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white shadow-md shadow-black/20 flex-shrink-0"
                    style={{ backgroundColor: entry.platformColor }}
                  >
                    <i className={`${entry.platformIcon} text-base`} />
                  </span>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)]">
                    {entry.platform}
                  </p>
                </div>
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

              <h3
                id={`${entry.id}-title`}
                className="font-header text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight text-[color:var(--retro-text-primary)] mb-2"
              >
                {entry.title}
              </h3>
              <p className="text-sm text-[color:var(--color-text-secondary)] leading-relaxed mb-5 max-w-2xl">
                {entry.description}
              </p>

              <PlaylistEmbed playlistId={entry.playlistId} title={entry.title} />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VivoSection;
