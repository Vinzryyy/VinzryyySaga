/**
 * MomentStories — approved fan stories for one moment (Album Momen detail).
 *
 *   <MomentStories slug="dream-bakudan-2026-11-28" label="Dream Bakudan · 28 Nov 2026" />
 *
 * Shows up to 5 stories and a link to /cerita with the moment prefilled.
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StoryCard from './StoryCard';
import { MOMENT_RE, fetchStories } from '../../lib/fanStory';

const SHOW = 5;

const MomentStories = ({ slug, label }) => {
  const valid = MOMENT_RE.test(String(slug || ''));
  const [state, setState] = useState({ slug: null, stories: [] });

  useEffect(() => {
    if (!valid) return undefined;
    let alive = true;
    fetchStories({ moment: slug, limit: SHOW })
      .then((stories) => alive && setState({ slug, stories }))
      .catch(() => alive && setState({ slug, stories: [] }));
    return () => {
      alive = false;
    };
  }, [slug, valid]);

  if (!valid) return null;
  const loading = state.slug !== slug;
  const stories = loading ? [] : state.stories.slice(0, SHOW);

  const qs = new URLSearchParams({ moment: slug });
  if (label) qs.set('label', label);

  return (
    <section aria-labelledby={`ms-${slug}`} className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <h2 id={`ms-${slug}`} className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-text-muted)] inline-flex items-center gap-2">
          <i className="ri-chat-heart-line text-sm text-[color:var(--retro-burgundy)]" /> Cerita penggemar
        </h2>
        <Link
          to={`/cerita?${qs}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--retro-burgundy)] px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-[color:var(--retro-cream)] hover:opacity-90 transition-opacity"
        >
          <i className="ri-quill-pen-line" /> Ceritakan momen ini
        </Link>
      </div>

      {loading && <div className="h-24 rounded-2xl bg-white/60 animate-pulse" aria-hidden="true" />}

      {!loading && stories.length === 0 && (
        <p className="rounded-2xl border border-dashed border-[color:var(--retro-brown-dark)]/20 p-4 text-sm text-[color:var(--retro-text-secondary)]">
          Belum ada cerita untuk momen ini. Kamu ada di sana, atau punya kenangan tentangnya? Ceritakan, yuk.
        </p>
      )}

      {stories.length > 0 && (
        <ul className="space-y-3">
          {stories.map((s) => (
            <li key={s.id}>
              <StoryCard story={s} showMoment={false} compact />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default MomentStories;
