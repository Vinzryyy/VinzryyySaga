import React from 'react';

/**
 * One card of Pasangkan Momen. Pure presentation: the board decides state.
 *
 * kind: 'photo' (default) | 'joker' | 'bomb' (Mode Tantangan).
 * spent: a used joker / exploded bomb — shown face up, faded, not clickable.
 * swapped: just moved by "papan gelisah" — brief highlight.
 */
const MemoryCard = React.forwardRef(function MemoryCard(
  { index, photo, kind = 'photo', faceUp, matched, justMatched, spent, swapped, hint, disabled, tabIndex, onFlip, onFocus },
  ref,
) {
  const what =
    kind === 'joker' ? 'Joker' : kind === 'bomb' ? 'Bom' : photo?.event ? photo.event : null;
  const label = spent
    ? `Kartu ${index + 1}, ${kind === 'bomb' ? 'bom sudah meledak' : 'joker sudah dipakai'}`
    : matched
    ? `Kartu ${index + 1}, cocok${what ? `: ${what}` : ''}`
    : faceUp
    ? `Kartu ${index + 1}, terbuka${what ? `: ${what}` : ''}`
    : `Kartu ${index + 1}, tertutup`;

  const up = faceUp || matched || spent;
  const cls = [
    'mm-card',
    up && 'is-up',
    matched && 'is-matched',
    justMatched && 'is-just-matched',
    spent && 'is-spent',
    swapped && 'is-swapped',
    hint && 'is-hint',
    kind !== 'photo' && `is-${kind}`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      type="button"
      role="gridcell"
      className={cls}
      aria-label={label}
      aria-disabled={disabled || matched || spent ? 'true' : undefined}
      tabIndex={tabIndex}
      onClick={() => onFlip(index)}
      onFocus={() => onFocus(index)}
    >
      <span className="mm-inner">
        <span className="mm-face mm-back" aria-hidden="true">
          <span>A</span>
        </span>
        <span className="mm-face mm-front" aria-hidden="true">
          {kind === 'photo' && photo && <img src={photo.webp} alt="" draggable="false" decoding="async" />}
          {kind === 'joker' && (
            <span className="mm-special">
              <i className="ri-star-smile-fill" />
              <b>Joker</b>
            </span>
          )}
          {kind === 'bomb' && (
            <span className="mm-special">
              <span className="mm-special-emoji">{spent ? '💥' : '💣'}</span>
              <b>Bom</b>
            </span>
          )}
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
