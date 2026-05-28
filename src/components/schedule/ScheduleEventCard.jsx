/**
 * ScheduleEventCard — single event card rendering. Extracted dari
 * ScheduleCard biar reusable antar landing hero (EliStatusHero) dan
 * full /schedule page kalau diperlukan.
 *
 * Props:
 *   entry — single event object dari eli-schedule.json (kind, date,
 *           title, venue, members, eli_jalur, sold_out, remaining_total,
 *           is_birthday_show, is_video_call, dst.)
 *
 * Badges + states ditangani internal: theater team color, M&G category,
 * video call, off-site/event, birthday show, sold-out, remaining
 * tickets. Whole card = <a> ke jkt48.com detail.
 */

import React from 'react';

const TEAM_LABEL = {
  DREAM: 'Team Dream',
  JKT48: 'All-Team',
  LOVE: 'Team Love',
  PASSION: 'Team Passion',
};

const MG_CATEGORY_LABEL = {
  TWO_SHOT: '2Shot',
  MEET_GREET: 'Meet & Greet',
};

const ScheduleEventCard = ({ entry }) => {
  if (!entry) return null;
  const date = new Date(entry.date);
  const isMG = entry.kind === 'EXCLUSIVE';
  const isVC = entry.is_video_call === true;
  const isGeneral = entry.kind === 'GENERAL';
  const isEvent = entry.kind === 'EVENT' && !isVC;

  let primaryBadge;
  let badgeIcon;
  if (isMG) {
    primaryBadge = MG_CATEGORY_LABEL[entry.category] || 'M&G';
    badgeIcon = 'ri-user-heart-line';
  } else if (isVC) {
    primaryBadge = 'Video Call';
    badgeIcon = 'ri-vidicon-line';
  } else if (isGeneral) {
    primaryBadge = 'Off-site';
    badgeIcon = 'ri-map-pin-line';
  } else if (isEvent) {
    primaryBadge = 'Event';
    badgeIcon = 'ri-ticket-2-line';
  } else {
    primaryBadge = TEAM_LABEL[entry.team] || entry.team;
    badgeIcon = 'ri-mic-line';
  }
  const eliJalur = (entry.eli_jalur || []).join(', ');

  return (
    <a
      href={entry.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block h-full p-4 rounded-xl bg-white border border-[color:var(--retro-brown-dark)]/10 hover:border-[color:var(--retro-burgundy)]/40 hover:-translate-y-0.5 hover:shadow-md transition-all group"
    >
      <div className="flex items-stretch gap-3">
        <div className="flex-shrink-0 w-14 text-center border-r border-[color:var(--retro-brown-dark)]/10 pr-3">
          <p className="font-header text-3xl font-black text-[color:var(--retro-burgundy)] leading-none tabular-nums">
            {String(date.getDate()).padStart(2, '0')}
          </p>
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[color:var(--color-text-muted)] mt-1">
            {new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(date)}
          </p>
          <p className="text-[9px] font-black tabular-nums text-[color:var(--color-text-muted)] mt-0.5">
            {date.getFullYear()}
          </p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span
              className={`text-[9px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${
                isVC
                  ? 'bg-blue-100 text-blue-700'
                  : isMG
                    ? 'bg-[color:var(--retro-gold-light)]/30 text-[color:var(--retro-burgundy)]'
                    : isGeneral || isEvent
                      ? 'bg-[color:var(--retro-brown-dark)]/10 text-[color:var(--retro-brown-dark)]'
                      : 'bg-[color:var(--retro-burgundy)]/10 text-[color:var(--retro-burgundy)]'
              }`}
            >
              <i className={badgeIcon} />
              {primaryBadge}
            </span>
            {entry.is_birthday_show && (
              <span className="text-[9px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded bg-[color:var(--retro-gold-light)]/30 text-[color:var(--retro-burgundy)]">
                <i className="ri-cake-2-line mr-0.5" />
                Birthday
              </span>
            )}
            {isMG && entry.sold_out && (
              <span className="text-[9px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded bg-red-100 text-red-700 inline-flex items-center gap-1">
                <i className="ri-close-circle-line" />
                Sold Out
              </span>
            )}
            {isMG && !entry.sold_out && entry.remaining_total > 0 && (
              <span className="text-[9px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 inline-flex items-center gap-1">
                <i className="ri-checkbox-circle-line" />
                {entry.remaining_total} tersisa
              </span>
            )}
          </div>
          <p className="font-bold text-sm text-[color:var(--retro-text-primary)] leading-tight line-clamp-2">
            {entry.title}
          </p>
          {(entry.start_time || entry.end_time) && (
            <p className="text-xs text-[color:var(--color-text-muted)] leading-snug mt-1 tabular-nums">
              <i className="ri-time-line mr-1 align-[-2px]" />
              {entry.start_time}
              {entry.end_time ? ` – ${entry.end_time}` : ''}
            </p>
          )}
          {/* Venue ditampilkan untuk M&G/off-site/event; theater show
              gak perlu (selalu JKT48 Theater, title udah cover setlist). */}
          {entry.venue && entry.kind !== 'SHOW' && (
            <p className="text-xs text-[color:var(--color-text-muted)] leading-snug mt-1">
              <i className="ri-map-pin-line mr-1 align-[-2px]" />
              {entry.venue}
            </p>
          )}
          {isMG && eliJalur && (
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--retro-burgundy)] mt-2 inline-flex items-center gap-1.5">
              <i className="ri-arrow-right-circle-line" />
              Eli di {eliJalur}
            </p>
          )}
          {!isMG && entry.members && entry.members.length > 0 && (
            <p className="text-[10px] text-[color:var(--color-text-muted)] leading-snug mt-2 line-clamp-1 group-hover:text-[color:var(--retro-burgundy)] transition-colors">
              + {entry.members.length} member · cek detail tiket
            </p>
          )}
          <div className="mt-3 pt-3 border-t border-[color:var(--retro-brown-dark)]/8">
            {isMG && entry.sold_out ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
                <i className="ri-lock-line" />
                Tiket habis
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] text-[10px] font-black uppercase tracking-[0.2em] shadow-sm group-hover:-translate-y-0.5 group-hover:shadow-md transition-transform">
                <i className="ri-ticket-2-line" />
                {isMG ? 'Beli Tiket' : 'Cek Tiket'}
                <i className="ri-arrow-right-line" />
              </span>
            )}
          </div>
        </div>
      </div>
    </a>
  );
};

export default ScheduleEventCard;
