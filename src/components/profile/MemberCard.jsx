/**
 * MemberCard — live profile data pulled from jkt48.com.
 *
 * Reads /data/eli-member.json (refreshed every 6h by the production
 * scraper) and renders a compact strip with Eli's official photo,
 * team badge, bio facts, and social links. Sits between the Profile
 * hero and the sticky sub-nav so it acts as a "live profile" badge
 * confirming the static data on the page is in sync.
 *
 * Falls back silently to nothing if the JSON fails to load — the
 * static Profile content is the canonical source for the page.
 */

import React, { useEffect, useState } from 'react';
import { SITE_CONFIG } from '../../config/siteConfig';

// jkt48.com kirim Cross-Origin-Resource-Policy: same-site untuk member photo,
// jadi cross-origin embed dari armeniaca.online ke-block. Fallback ke local
// arsip portrait kalau remote load gagal (CORP block atau network error).
const LOCAL_PHOTO_FALLBACK = SITE_CONFIG.eli.portrait;

const TEAM_LABEL = {
  DREAM: 'Team Dream',
  LOVE: 'Team Love',
  PASSION: 'Team Passion',
  KIII: 'Team KIII',
  T: 'Team T',
  J: 'Team J',
};

const formatBirth = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
};

const SOCIAL_LINKS = [
  {
    key: 'instagram',
    label: 'Instagram',
    icon: 'ri-instagram-line',
    url: (h) => `https://instagram.com/${h}`,
    handle: (h) => `@${h}`,
  },
  {
    key: 'twitter',
    label: 'X / Twitter',
    icon: 'ri-twitter-x-line',
    url: (h) => `https://x.com/${h}`,
    handle: (h) => `@${h}`,
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    icon: 'ri-tiktok-line',
    url: (h) => `https://tiktok.com/@${h}`,
    handle: (h) => `@${h}`,
  },
  {
    key: 'youtube',
    label: 'YouTube',
    icon: 'ri-youtube-line',
    url: (h) => h,
    handle: () => 'Kanal',
  },
];

const MemberCard = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/eli-member.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.member) setData(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const [remotePhotoFailed, setRemotePhotoFailed] = useState(false);

  if (!data) return null;
  const m = data.member;
  const remotePhoto = m.photoUrls?.[0];
  const photo = remotePhotoFailed ? LOCAL_PHOTO_FALLBACK : remotePhoto;
  const teamLabel = TEAM_LABEL[m.type] || m.type;

  return (
    <section
      aria-label="Profil resmi JKT48"
      className="px-6 md:px-12 lg:px-20 mb-6 md:mb-8"
    >
      <div className="max-w-7xl mx-auto">
        <div className="rounded-2xl bg-white border border-[color:var(--retro-brown-dark)]/10 p-4 md:p-5 shadow-sm flex flex-col md:flex-row gap-4 md:gap-6 md:items-center">
          {/* Header / photo */}
          <div className="flex items-center gap-3 md:gap-4 md:flex-shrink-0">
            {photo && (
              <img
                src={photo}
                alt={m.name}
                loading="lazy"
                onError={() => {
                  if (!remotePhotoFailed) setRemotePhotoFailed(true);
                }}
                className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover border-2 border-[color:var(--retro-burgundy)]/20"
              />
            )}
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live JKT48
                </span>
                {teamLabel && (
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] px-1.5 py-0.5 rounded bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)]">
                    {teamLabel}
                  </span>
                )}
              </div>
              <p className="font-header text-base md:text-lg font-black text-[color:var(--retro-text-primary)] leading-tight">
                {m.name}
                {m.nickname && (
                  <span className="text-[color:var(--color-text-muted)] font-bold text-sm md:text-base ml-1.5">
                    · {m.nickname}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Bio facts — only show fields the API returned */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.15em] text-[color:var(--color-text-secondary)] md:flex-1">
            {m.birthDate && (
              <span className="inline-flex items-center gap-1.5">
                <i className="ri-cake-2-line text-base text-[color:var(--retro-burgundy)]/70" />
                {formatBirth(m.birthDate)}
              </span>
            )}
            {m.bodyHeight && (
              <span className="inline-flex items-center gap-1.5">
                <i className="ri-ruler-line text-base text-[color:var(--retro-burgundy)]/70" />
                {m.bodyHeight} cm
              </span>
            )}
            {m.bloodType && (
              <span className="inline-flex items-center gap-1.5">
                <i className="ri-drop-line text-base text-[color:var(--retro-burgundy)]/70" />
                Gol. {m.bloodType}
              </span>
            )}
            {m.horoscope && (
              <span className="inline-flex items-center gap-1.5">
                <i className="ri-star-line text-base text-[color:var(--retro-burgundy)]/70" />
                {m.horoscope}
              </span>
            )}
          </div>

          {/* Social links — pulls in whichever handles the API returned */}
          <div className="flex flex-wrap gap-2 md:flex-shrink-0">
            {SOCIAL_LINKS.map((s) => {
              const handle = m[s.key];
              if (!handle) return null;
              return (
                <a
                  key={s.key}
                  href={s.url(handle)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`${s.label} ${s.handle(handle)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[color:var(--retro-burgundy)]/8 hover:bg-[color:var(--retro-burgundy)] hover:text-[color:var(--retro-cream)] text-[color:var(--retro-burgundy)] text-[10px] font-black uppercase tracking-[0.2em] transition-colors"
                >
                  <i className={`${s.icon} text-sm`} />
                  <span className="hidden sm:inline">{s.handle(handle)}</span>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MemberCard;
