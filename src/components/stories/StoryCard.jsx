import React from 'react';
import { Link } from 'react-router-dom';
import { formatStoryDate } from '../../lib/fanStory';

/** One approved fan story: text, "— name", optional moment chip, date. */
const StoryCard = ({ story, showMoment = true, compact = false }) => (
  <article className={`rounded-2xl bg-white border border-[color:var(--retro-brown-dark)]/10 shadow-sm ${compact ? 'p-4' : 'p-5'}`}>
    <p className={`whitespace-pre-line text-[color:var(--retro-text-primary)] leading-relaxed break-words ${compact ? 'text-sm' : 'text-sm sm:text-base'}`}>
      {story.story}
    </p>
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      <p className="text-sm font-bold text-[color:var(--retro-burgundy)]">— {story.name}</p>
      <time
        dateTime={story.createdAt ? new Date(story.createdAt).toISOString() : undefined}
        className="text-xs text-[color:var(--retro-text-muted)]"
      >
        {formatStoryDate(story.createdAt)}
      </time>
      {showMoment && story.moment && (
        <Link
          to={`/momen/${story.moment}`}
          className="inline-flex max-w-full items-center gap-1 rounded-full bg-[color:var(--retro-burgundy)]/8 border border-[color:var(--retro-burgundy)]/15 px-2.5 py-1 text-xs font-bold text-[color:var(--retro-burgundy)] hover:bg-[color:var(--retro-burgundy)]/15 transition-colors"
        >
          <i className="ri-camera-line flex-shrink-0" />
          <span className="truncate">{story.momentLabel || 'Lihat momen'}</span>
        </Link>
      )}
    </div>
  </article>
);

export default StoryCard;
