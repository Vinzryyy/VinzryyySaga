/**
 * SocialStoriesRing — IG-style row of round avatars, one per social
 * platform. Each avatar gets a branded gradient ring (IG pink, X dark,
 * TikTok cyan/pink, etc) so the row reads like an Instagram Stories
 * tray at the top of a profile.
 *
 * If a SHOWROOM live status is provided (via useShowroomLive in the
 * parent), the SHOWROOM avatar gets a red pulse ring overlay and a
 * "LIVE" badge beneath it.
 *
 * Click any avatar → opens that platform in a new tab.
 */

import React from 'react';

// Per-platform brand styling. Gradient for the outer ring, accent
// color for the inner border, fa icon for the small overlay badge
// at the bottom-right of each avatar.
const STYLES = {
  Instagram: {
    ring: 'bg-[conic-gradient(from_0deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5,#feda75)]',
    iconBg: '#d62976',
    icon: 'ri-instagram-line',
  },
  X: {
    ring: 'bg-black',
    iconBg: '#000000',
    icon: 'ri-twitter-x-line',
  },
  TikTok: {
    ring: 'bg-[linear-gradient(135deg,#25f4ee,#000000_50%,#fe2c55)]',
    iconBg: '#000000',
    icon: 'ri-tiktok-line',
  },
  'IDN Live': {
    ring: 'bg-[linear-gradient(135deg,#0061ff,#60efff)]',
    iconBg: '#0061ff',
    icon: 'ri-broadcast-line',
  },
  SHOWROOM: {
    ring: 'bg-[linear-gradient(135deg,#ff5d6e,#ffb199)]',
    iconBg: '#ff5d6e',
    icon: 'ri-vidicon-line',
  },
};

const StoryAvatar = ({ social, avatar, isLive }) => {
  const style = STYLES[social.platform] || {
    ring: 'bg-[color:var(--retro-burgundy)]',
    iconBg: 'var(--retro-burgundy)',
    icon: social.icon || 'ri-link',
  };

  return (
    <a
      href={social.url}
      target="_blank"
      rel="noopener noreferrer"
      title={`${social.platform}: ${social.handle}${isLive ? ' · LIVE NOW' : ''}`}
      className="group flex flex-col items-center gap-1.5 flex-shrink-0"
    >
      <div className="relative">
        {/* Gradient ring — the IG Stories halo. Live overrides with
            a red pulse ring. */}
        <div
          className={`relative w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full p-[3px] transition-transform group-hover:scale-105 ${
            isLive
              ? 'bg-red-500 animate-pulse'
              : style.ring
          }`}
        >
          <div className="w-full h-full rounded-full p-[2px] bg-[color:var(--retro-bg-primary)]">
            <img
              src={avatar}
              alt={`Avatar ${social.platform}`}
              className="w-full h-full object-cover rounded-full"
              style={{ objectPosition: '50% 18%' }}
              loading="eager"
            />
          </div>
        </div>
        {/* Platform icon badge bottom-right */}
        <span
          className="absolute -bottom-0.5 -right-0.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-white text-xs sm:text-sm shadow-md ring-2 ring-[color:var(--retro-bg-primary)]"
          style={{ backgroundColor: style.iconBg }}
        >
          <i className={style.icon} />
        </span>
        {/* LIVE pill — only on actively-streaming platforms */}
        {isLive && (
          <span className="absolute -top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-sm bg-red-600 text-white text-[8px] font-black uppercase tracking-[0.18em] shadow-md whitespace-nowrap">
            ● LIVE
          </span>
        )}
      </div>
      <span className="text-[9px] font-black uppercase tracking-[0.18em] text-[color:var(--color-text-muted)] group-hover:text-[color:var(--retro-burgundy)] transition-colors">
        {social.platform}
      </span>
    </a>
  );
};

const SocialStoriesRing = ({ socials, avatar, liveMap = {} }) => {
  if (!socials || socials.length === 0) return null;
  return (
    <div className="overflow-x-auto -mx-1 px-1 scrollbar-hide">
      <div className="flex items-start gap-4 sm:gap-5 py-1">
        {socials.map((s) => (
          <StoryAvatar
            key={s.platform}
            social={s}
            avatar={avatar}
            isLive={!!liveMap[s.platform]}
          />
        ))}
      </div>
    </div>
  );
};

export default SocialStoriesRing;
