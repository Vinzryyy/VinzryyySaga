/**
 * SiteUpdates — "Baru di Armeniaca": a short, hand-written list of what
 * changed on the site (data/siteUpdates.js). Items added since this
 * visitor's last visit get a "Baru" badge (lib/siteUpdates.js).
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SITE_UPDATES } from '../../data/siteUpdates';
import { isNewSince, latestDate, markSeen, readLastSeen } from '../../lib/siteUpdates';

const SHOWN = 4;
const dateFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const fmt = (ymd) => dateFmt.format(new Date(`${ymd}T00:00:00Z`));

const SiteUpdates = () => {
  // Read before marking, so this visit still shows what's new since the last one.
  const [lastSeen] = useState(readLastSeen);
  const [all, setAll] = useState(false);

  useEffect(() => {
    const newest = latestDate(SITE_UPDATES);
    if (newest) markSeen(newest);
  }, []);

  if (!SITE_UPDATES.length) return null;
  const items = all ? SITE_UPDATES : SITE_UPDATES.slice(0, SHOWN);
  const newCount = SITE_UPDATES.filter((u) => isNewSince(u, lastSeen)).length;

  return (
    <section aria-labelledby="site-updates-title" className="mt-10">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h3 id="site-updates-title" className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)] inline-flex items-center gap-2">
          <i className="ri-sparkling-line text-sm" /> Baru di Armeniaca
          {newCount > 0 && (
            <span className="rounded-full bg-[color:var(--retro-burgundy)] px-2 py-0.5 text-[9px] tracking-[0.15em] text-[color:var(--retro-cream)]">
              {newCount} sejak kunjungan terakhir
            </span>
          )}
        </h3>
        {SITE_UPDATES.length > SHOWN && (
          <button
            type="button"
            onClick={() => setAll((v) => !v)}
            aria-expanded={all}
            className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--retro-text-muted)] hover:text-[color:var(--retro-burgundy)]"
          >
            {all ? 'Ringkas' : `Lihat semua (${SITE_UPDATES.length})`}
          </button>
        )}
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((u) => (
          <li key={`${u.date}-${u.title}`}>
            <Link
              to={u.to}
              className="group flex items-start gap-3 rounded-2xl border border-[color:var(--retro-brown-dark)]/10 bg-white/60 px-4 py-3 hover:border-[color:var(--retro-burgundy)]/30 hover:bg-white transition-colors"
            >
              <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[color:var(--retro-burgundy)]/10 text-[color:var(--retro-burgundy)]">
                <i className={`${u.icon} text-base`} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <b className="truncate text-sm text-[color:var(--retro-text-primary)]">{u.title}</b>
                  {isNewSince(u, lastSeen) && (
                    <span className="flex-shrink-0 rounded-full bg-[color:var(--retro-gold)]/25 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] text-[color:var(--retro-burgundy)]">Baru</span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-[color:var(--retro-text-muted)]">{u.text}</span>
              </span>
              <span className="flex-shrink-0 text-[10px] font-bold tabular-nums text-[color:var(--retro-text-muted)]/80">{fmt(u.date)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default SiteUpdates;
