/**
 * PortraitCardStack
 *
 * Drag-based stack of portraits used as the About hero visual.
 * Top card follows the pointer with a subtle rotation; flicking past
 * SWIPE_THRESHOLD sends it to the back of the stack. Keyboard users can
 * tab to the top card and press Enter/Space to cycle. Pointer events
 * cover both touch and mouse.
 *
 * No new deps — pointer events + CSS transforms only.
 */

import React, { useEffect, useRef, useState } from 'react';

const SWIPE_THRESHOLD = 90;          // px of horizontal drag to discard
const ROTATION_PER_PX = 0.06;        // deg of card tilt per px dragged
const STACK_OFFSET_Y = 14;           // px each layer drops behind
const STACK_SCALE_STEP = 0.04;       // each layer behind shrinks by this
const STACK_REST_ROTATE = 3;         // alternating tilt for resting cards
const EXIT_DURATION_MS = 350;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const PortraitImage = ({ stem, alt, eager }) => (
  <picture>
    <source srcSet={`${stem}.avif`} type="image/avif" />
    <source srcSet={`${stem}.webp`} type="image/webp" />
    <img
      src={`${stem}.jpg`}
      alt={alt}
      className="w-full h-full object-cover pointer-events-none select-none"
      loading={eager ? 'eager' : 'lazy'}
      draggable={false}
    />
  </picture>
);

const PortraitCardStack = ({ portraits, wrapperStyle }) => {
  // `order` holds indices into `portraits`; order[0] is the visible top card.
  const [order, setOrder] = useState(() => portraits.map((_, i) => i));
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [exiting, setExiting] = useState(null); // { x, y, rot } once flicked
  // Index of the card that should skip its transition for one frame
  // (used after a discard so the just-flown card teleports to the back
  // instead of sliding back across the screen).
  const [skipTransitionFor, setSkipTransitionFor] = useState(null);
  const startRef = useRef({ x: 0, y: 0 });
  const reducedRef = useRef(false);

  useEffect(() => {
    reducedRef.current = prefersReducedMotion();
  }, []);

  const cycleTopToBack = () => {
    setOrder((prev) => {
      const [head, ...rest] = prev;
      setSkipTransitionFor(head);
      return [...rest, head];
    });
    setExiting(null);
    setDrag({ x: 0, y: 0, active: false });
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setSkipTransitionFor(null)),
    );
  };

  const handlePointerDown = (e) => {
    if (exiting) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY };
    setDrag({ x: 0, y: 0, active: true });
  };

  const handlePointerMove = (e) => {
    if (!drag.active) return;
    setDrag({
      x: e.clientX - startRef.current.x,
      y: e.clientY - startRef.current.y,
      active: true,
    });
  };

  const endDrag = (e) => {
    if (!drag.active) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    const { x, y } = drag;
    if (Math.abs(x) > SWIPE_THRESHOLD) {
      const sign = x > 0 ? 1 : -1;
      setExiting({ x: sign * 600, y: y + sign * 40, rot: sign * 35 });
      setDrag({ x: 0, y: 0, active: false });
      window.setTimeout(cycleTopToBack, EXIT_DURATION_MS);
    } else {
      setDrag({ x: 0, y: 0, active: false });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      cycleTopToBack();
    }
  };

  return (
    <div className="relative aspect-[3/4]" style={wrapperStyle}>
      {order.map((portraitIdx, depth) => {
        const portrait = portraits[portraitIdx];
        const isTop = depth === 0;
        const restRot =
          depth === 0 ? 0 : (depth % 2 === 0 ? -1 : 1) * STACK_REST_ROTATE;
        const restY = depth * STACK_OFFSET_Y;
        const restScale = 1 - depth * STACK_SCALE_STEP;

        let tx = 0;
        let ty = restY;
        let rot = restRot;
        const scale = restScale;

        if (isTop) {
          if (exiting) {
            tx = exiting.x;
            ty = exiting.y;
            rot = exiting.rot;
          } else if (drag.active || drag.x !== 0 || drag.y !== 0) {
            tx = drag.x;
            ty = drag.y;
            rot = drag.x * ROTATION_PER_PX;
          }
        }

        const skipTransition =
          skipTransitionFor === portraitIdx ||
          (isTop && drag.active) ||
          reducedRef.current;
        const transition = skipTransition
          ? 'none'
          : 'transform 350ms cubic-bezier(.22,1,.36,1)';

        return (
          <div
            key={portraitIdx}
            className="absolute inset-0 rounded-[2rem] overflow-hidden shadow-2xl shadow-[color:var(--retro-burgundy)]/20 bg-[color:var(--retro-bg-secondary)]"
            style={{
              transform: `translate3d(${tx}px, ${ty}px, 0) rotate(${rot}deg) scale(${scale})`,
              transition,
              zIndex: portraits.length - depth,
              cursor: isTop ? (drag.active ? 'grabbing' : 'grab') : 'default',
              touchAction: 'none',
              willChange: isTop ? 'transform' : undefined,
            }}
            onPointerDown={isTop ? handlePointerDown : undefined}
            onPointerMove={isTop ? handlePointerMove : undefined}
            onPointerUp={isTop ? endDrag : undefined}
            onPointerCancel={isTop ? endDrag : undefined}
            onKeyDown={isTop ? handleKeyDown : undefined}
            tabIndex={isTop ? 0 : -1}
            role={isTop ? 'button' : undefined}
            aria-label={
              isTop
                ? `${portrait.alt}. Geser kartu atau tekan Enter untuk foto berikutnya.`
                : undefined
            }
          >
            <PortraitImage
              stem={portrait.src.replace(/\.(jpe?g|png|webp|avif)$/i, '')}
              alt={portrait.alt}
              eager={depth <= 1}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--retro-brown-dark)]/40 via-transparent to-transparent pointer-events-none" />
          </div>
        );
      })}
    </div>
  );
};

export default PortraitCardStack;
