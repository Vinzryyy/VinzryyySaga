/**
 * EliXTimeline — embed @H_EliJKT48's X timeline using the official
 * widgets.js script. Lazy-mounts the embed when it enters the viewport
 * so the third-party script and network calls don't block the rest of
 * Home from settling first.
 *
 * Falls back to a "Buka di X" link if the script fails to load (script
 * blocker, X outage, etc.) so the slot is never empty.
 */

import React, { useEffect, useRef, useState } from 'react';
import { SITE_CONFIG } from '../../config/siteConfig';

const SCRIPT_ID = 'twitter-wjs';
const SCRIPT_SRC = 'https://platform.twitter.com/widgets.js';
// X often takes 2–4s to render. Extend the failure window so slow
// connections don't trigger the fallback prematurely.
const FALLBACK_TIMEOUT_MS = 8000;

const loadTwitterScript = () => {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.twttr?.widgets) return Promise.resolve(window.twttr);

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.twttr));
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = SCRIPT_SRC;
    script.charset = 'utf-8';
    script.onload = () => resolve(window.twttr);
    script.onerror = reject;
    document.body.appendChild(script);
  });
};

const EliXTimeline = () => {
  const wrapperRef = useRef(null);
  const widgetSlotRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | failed

  // IntersectionObserver — only kick off the embed once the section
  // is near the viewport. Saves network for visitors who never scroll
  // this far down Home.
  useEffect(() => {
    if (!wrapperRef.current) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setStatus((s) => (s === 'idle' ? 'loading' : s));
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (status !== 'loading') return undefined;
    let cancelled = false;
    let timeoutId;

    loadTwitterScript()
      .then((twttr) => {
        if (cancelled || !twttr?.widgets || !widgetSlotRef.current) return;
        twttr.widgets
          .load(widgetSlotRef.current)
          .then(() => {
            if (!cancelled) setStatus('ready');
          })
          .catch(() => {
            if (!cancelled) setStatus('failed');
          });
      })
      .catch(() => {
        if (!cancelled) setStatus('failed');
      });

    timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        setStatus((s) => (s === 'ready' ? s : 'failed'));
      }
    }, FALLBACK_TIMEOUT_MS);

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [status]);

  const handle = SITE_CONFIG.social.eliTwitter || 'https://x.com/H_EliJKT48';
  const username = handle.split('/').pop() || 'H_EliJKT48';

  return (
    <div ref={wrapperRef}>
      <div
        ref={widgetSlotRef}
        className="rounded-2xl border border-[color:var(--retro-burgundy)]/15 bg-white overflow-hidden shadow-[0_4px_18px_rgba(61,52,43,0.06)]"
        style={{ minHeight: '420px' }}
      >
        {/* Skeleton — visible until the X widget swaps in. */}
        {status !== 'ready' && (
          <div className="flex flex-col items-center justify-center text-center px-6 py-16 gap-4 text-[color:var(--color-text-muted)]">
            <i className="ri-twitter-x-line text-3xl text-[color:var(--retro-burgundy)]/60" />
            {status === 'failed' ? (
              <>
                <p className="text-sm">
                  Embed timeline tidak bisa dimuat (mungkin script-blocker atau X
                  lagi rewel). Buka langsung saja:
                </p>
                <a
                  href={handle}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] text-xs font-black uppercase tracking-[0.3em] hover:-translate-y-0.5 transition-transform"
                >
                  @{username}
                  <i className="ri-arrow-right-up-line text-base" />
                </a>
              </>
            ) : (
              <p className="text-xs font-black uppercase tracking-[0.3em]">
                Memuat timeline @{username}…
              </p>
            )}
          </div>
        )}

        {/* X widget mount point. data-* attributes are read by widgets.js
            on initial render; they don't update reactively, so changing
            the handle requires a full remount (which never happens here
            since the handle is static). */}
        <a
          className="twitter-timeline"
          data-height="640"
          data-theme="light"
          data-chrome="noheader nofooter noborders transparent"
          data-tweet-limit="6"
          data-dnt="true"
          data-lang="id"
          href={handle}
        >
          Tweets by @{username}
        </a>
      </div>
    </div>
  );
};

export default EliXTimeline;
