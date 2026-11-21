import React from 'react';

/**
 * One card of Pasangkan Momen. Pure presentation: the board decides state.
 */
const MemoryCard = React.forwardRef(function MemoryCard(
  { index, photo, faceUp, matched, justMatched, disabled, tabIndex, onFlip, onFocus },
  ref,
) {
  const label = matched
    ? `Kartu ${index + 1}, cocok${photo?.event ? `: ${photo.event}` : ''}`
    : faceUp
    ? `Kartu ${index + 1}, terbuka${photo?.event ? `: ${photo.event}` : ''}`
    : `Kartu ${index + 1}, tertutup`;

  return (
    <button
      ref={ref}
      type="button"
      role="gridcell"
      className={`mm-card${faceUp || matched ? ' is-up' : ''}${matched ? ' is-matched' : ''}${justMatched ? ' is-just-matched' : ''}`}
      aria-label={label}
      aria-disabled={disabled || matched ? 'true' : undefined}
      tabIndex={tabIndex}
      onClick={() => onFlip(index)}
      onFocus={() => onFocus(index)}
    >
      <span className="mm-inner">
        <span className="mm-face mm-back" aria-hidden="true">
          <span>A</span>
        </span>
        <span className="mm-face mm-front" aria-hidden="true">
          {photo && <img src={photo.webp} alt="" draggable="false" decoding="async" />}
          {matched && (
            <span className="mm-check">
              <i className="ri-check-line" />
            </span>
          )}
        </span>
      </span>
    </button>
  );
});

export default MemoryCard;
