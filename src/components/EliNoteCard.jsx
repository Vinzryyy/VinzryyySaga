/**
 * EliNoteCard — one Eli Notes entry as a paper note pinned to a board
 * (washi tape in the mood colour, ruled paper, a platform stamp).
 * Used on /eli-notes, Rekap 2026 and Album Momen.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { MOODS, PLATFORMS, fmtMinute } from '../lib/eliNotes';
import '../pages/eliNotes.css';

const dateFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const prettyDate = (iso) => dateFmt.format(new Date(`${iso}T00:00:00Z`));
const credit = (n) => `${PLATFORMS[n.platform]} · ${prettyDate(n.date)} · menit ${fmtMinute(n.at)}`;

// Small, stable tilt per note so the board looks hand-pinned (same every visit).
const tiltOf = (id) => {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) | 0;
  return ((Math.abs(h) % 7) - 3) * 0.45;
};

export const Stamp = ({ platform }) => (
  <span className="en-stamp" aria-hidden="true">
    <span>
      <i className={platform === 'showroom' ? 'ri-vidicon-line' : 'ri-broadcast-line'} />
      {platform === 'showroom' ? 'SR' : 'IDN'}
    </span>
  </span>
);

/** One paper note card. `featured` = the big newest note at the top. */
export const NoteCard = ({ note, featured = false }) => {
  const mood = MOODS[note.mood];
  return (
    <Link
      to={`/eli-notes/${note.id}`}
      className={`en-card ${featured ? 'en-featured' : ''}`}
      style={{ '--tone': mood.tone, '--tilt': `${featured ? -0.5 : tiltOf(note.id)}deg` }}
      aria-label={`${note.quote ? `“${note.quote}”, ` : ''}${credit(note)}`}
    >
      <span className="en-tape" aria-hidden="true" />
      <Stamp platform={note.platform} />
      <span className="en-mood"><i className={mood.icon} /> {mood.label}{featured ? ' · catatan terbaru' : ''}</span>
      {note.quote ? <p className="en-quote">{note.quote}</p> : null}
      <p className={`en-story ${note.quote ? '' : 'no-quote'}`}>{note.story}</p>
      <span className="en-foot">
        <span>
          <span className="en-time"><i className="ri-time-line" /> {fmtMinute(note.at)}</span>{' '}
          {prettyDate(note.date)}
        </span>
        <span className="en-more">Baca <i className="ri-arrow-right-line" /></span>
      </span>
    </Link>
  );
};
