/**
 * ArmeChatWidget — floating AI chat with Arme persona.
 *
 * Floating button bottom-right (ELI_1_a.png avatar). Click → opens panel
 * with message history. Backend POST /api/arme-chat proxies OpenRouter
 * (Kimi K2.6 free) — API key stays server-side.
 *
 * Auto-hidden on /armeniacaTown/peta to avoid colliding with ArmeMascot
 * (the scripted dialog mascot lives there exclusively).
 *
 * Persistence: localStorage 'armeniaca-arme-chat-v1' = { messages }.
 * Cleared via the reset button in panel header.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getQuoteOfTheDay, getRandomQuote } from '../lib/quoteOfTheDay';

const STORAGE_KEY = 'armeniaca-arme-chat-v1';
// Two-pose set — matches ArmeMascot's idle/talk asset convention.
const AVATAR_IDLE = '/Arme/ELI_2_a.png'; // hand-to-chin, default
const AVATAR_TALK = '/Arme/ELI_1_a.png'; // pointing, while answering
const MAX_HISTORY = 16;
const MAX_INPUT_CHARS = 1200;

const GREETING_INTRO =
  'Halo. Aku Arme — pemandu situs ini, bukan Eli. Aku bantu kamu nemu halaman atau jawab info dasar soal Eli. Mau mulai dari mana?';
const GREETING_QUOTE_PREFIX = 'Sebelum mulai, kata dari Arme —';

const PROMPT_SUGGESTIONS = [
  'Halaman apa aja yang ada di sini?',
  'Eli di JKT48 sejak kapan?',
  'Cara kirim ucapan ulang tahun?',
];

// Whitelisted routes — only these become clickable when mentioned by
// Arme. Anything else parsed as `/something` stays as plain text so we
// never navigate to a hallucinated path.
const KNOWN_ROUTES = new Set([
  '/',
  '/profile',
  '/about',
  '/gallery',
  '/vivo',
  '/schedule',
  '/wishes',
  '/countdown',
  '/26',
  '/byu-music',
  '/armepack',
  '/galeri-kebaikan',
  '/denyut',
  '/armeniacaTown',
  '/armeniacaTown/peta',
  '/armeniacaTown/r1',
  '/armeniacaTown/r2',
  '/armeniacaTown/r3',
  '/armeniacaTown/r4',
  '/armeniacaTown/r5',
  '/armeniacaTown/r6',
]);

// Match `/segment` or `/segment/segment`. Starts at a non-word boundary
// (whitespace, punctuation, line start) — avoids matching paths inside
// URLs (https://x.com/foo) or fractions like "1/2".
const ROUTE_REGEX = /(^|[\s(,])(\/[a-zA-Z][\w-]*(?:\/[a-zA-Z0-9][\w-]*)*)/g;

// Follow-up suggestion library — pick 3 contextual chips after each
// assistant reply. Keyed by route mentioned in the reply; falls back
// to GENERIC_FOLLOWUPS when no route keyword matches.
const FOLLOWUPS_BY_ROUTE = {
  '/wishes': ['Aturan kirim ucapan apa?', 'Berapa karakter maksimal?'],
  '/profile': ['Diskografi Eli apa aja?', 'Posisi Eli di Team Dream?'],
  '/gallery': ['Era apa aja di galeri?', 'Berapa total foto Eli di sini?'],
  '/schedule': ['Eli show terdekat kapan?', 'Cara cek jadwal theater?'],
  '/26': ['Cara siram pohon gimana?', 'Pohon udah tahap apa?'],
  '/byu-music': ['Apa itu by-U?', 'Kapan lagunya kebuka?'],
  '/galeri-kebaikan': ['Donasi apa aja yang udah jalan?', 'Cara ikut donasi?'],
  '/armeniacaTown': ['Petak apa aja di kota?', 'Cara buka petak baru?'],
  '/armeniacaTown/peta': ['Apa yang ada di Peta?', 'Petak mana yang dulu kebuka?'],
  '/armepack': ['Apa itu Petikan?', 'Berapa kartu di batch pertama?'],
  '/countdown': ['Apa yang spesial di hari-H?', 'Berapa hari lagi seitansai?'],
  '/about': ['Apa itu "Sang Mermaid"?', 'Eli orang mana?'],
  '/vivo': ['Eli aktif IDN Live atau Showroom?', 'Berapa playlist arsipnya?'],
};

const GENERIC_FOLLOWUPS = [
  'Halaman apa lagi yang menarik?',
  'Cerita dong soal kotanya',
  'Kapan seitansai Eli?',
  'Eli sekarang di tim apa?',
  'Apa itu Harmoni Kebaikan?',
  'Cara siram Pohon Kebaikan?',
  'Apa itu ArmeniacaTown?',
];

const pickFollowups = (lastAssistantText, askedSet, count = 3) => {
  if (!lastAssistantText) return [];
  const chosen = [];
  const taken = new Set();
  const push = (q) => {
    if (taken.has(q) || askedSet.has(q.toLowerCase())) return;
    taken.add(q);
    chosen.push(q);
  };
  // Route-keyed first
  for (const route of Object.keys(FOLLOWUPS_BY_ROUTE)) {
    if (lastAssistantText.includes(route)) {
      for (const q of FOLLOWUPS_BY_ROUTE[route]) {
        push(q);
        if (chosen.length === count) return chosen;
      }
    }
  }
  // Fill rest with generic, shuffled-ish (date-seeded so it changes per
  // minute but stays stable across re-renders in same minute).
  const seed = Math.floor(Date.now() / 60000);
  const rotated = [
    ...GENERIC_FOLLOWUPS.slice(seed % GENERIC_FOLLOWUPS.length),
    ...GENERIC_FOLLOWUPS.slice(0, seed % GENERIC_FOLLOWUPS.length),
  ];
  for (const q of rotated) {
    push(q);
    if (chosen.length === count) break;
  }
  return chosen;
};

const renderTextWithRoutes = (text, onRouteClick) => {
  if (!text) return null;
  const out = [];
  let lastEnd = 0;
  let match;
  let key = 0;
  ROUTE_REGEX.lastIndex = 0;
  while ((match = ROUTE_REGEX.exec(text)) !== null) {
    const [, leading, route] = match;
    const startOfRoute = match.index + leading.length;
    if (startOfRoute > lastEnd) out.push(text.slice(lastEnd, startOfRoute));
    if (KNOWN_ROUTES.has(route)) {
      out.push(
        <button
          key={`r-${key++}`}
          type="button"
          onClick={() => onRouteClick(route)}
          className="inline-flex items-baseline gap-0.5 px-1.5 py-0 mx-0.5 rounded-md bg-[#9a5b4a]/10 hover:bg-[#9a5b4a]/20 text-[#7a3f30] ring-1 ring-[#9a5b4a]/25 hover:ring-[#9a5b4a]/45 font-medium transition-colors cursor-pointer"
        >
          {route}
        </button>,
      );
    } else {
      out.push(route);
    }
    lastEnd = startOfRoute + route.length;
  }
  if (lastEnd < text.length) out.push(text.slice(lastEnd));
  return out;
};

const loadHistory = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.messages) ? parsed.messages : [];
  } catch {
    return [];
  }
};

const saveHistory = (messages) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages }));
  } catch {
    /* storage blocked */
  }
};

const isMobileViewport = () =>
  typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;

const Avatar = ({ size = 36, talking = false }) => (
  <span
    className="inline-flex items-center justify-center rounded-full overflow-hidden bg-[#f4e3cc] ring-1 ring-[#d4a574]/60 shrink-0 transition-all"
    style={{
      width: size,
      height: size,
      boxShadow: talking
        ? '0 0 0 2px rgba(244,200,150,0.55), 0 0 12px rgba(244,200,150,0.6)'
        : 'none',
    }}
    aria-hidden
  >
    <img
      src={talking ? AVATAR_TALK : AVATAR_IDLE}
      alt=""
      draggable={false}
      className="w-full h-full object-cover object-top"
      style={{
        filter: talking
          ? 'drop-shadow(0 0 8px rgba(244,200,150,0.7)) brightness(1.05)'
          : 'drop-shadow(0 0 6px rgba(244,200,150,0.4))',
      }}
    />
  </span>
);

const TypingDots = () => (
  <span className="inline-flex items-center gap-1" aria-label="Arme lagi ngetik">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="w-1.5 h-1.5 rounded-full bg-[#9a5b4a]/70"
        style={{
          animation: 'armeChatDot 1.2s ease-in-out infinite',
          animationDelay: `${i * 0.18}s`,
        }}
      />
    ))}
  </span>
);

const ArmeChatWidget = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => loadHistory());
  // streamingContent is the partial assistant reply being streamed in
  // right now. Rendered as an extra bubble below `messages` while non-
  // null; committed to `messages` (and cleared) on stream completion.
  // Kept out of `messages` to avoid noisy localStorage writes per delta.
  const [streamingContent, setStreamingContent] = useState(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(() => isMobileViewport());
  // Mobile: amount of viewport hidden by the soft keyboard. Used to
  // anchor the sheet's bottom edge above the keyboard on iOS where
  // visualViewport shrinks but layout viewport (and CSS `bottom: 0`)
  // doesn't, leaving the input bar covered by default.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  // Mobile: vertical drag offset while the user is swiping the sheet
  // down to dismiss. Reset to 0 on release (either committed to close
  // or sprung back). Negative drags ignored (no over-pull).
  const [dragOffset, setDragOffset] = useState(0);

  const scrollerRef = useRef(null);
  const textareaRef = useRef(null);
  const abortRef = useRef(null);
  const dragStartRef = useRef(null);

  const handleRouteClick = useCallback(
    (route) => {
      // Pop the chat history marker (if we pushed one for the Android
      // back-button intercept) BEFORE navigating, so the new route
      // pushes onto the original page state instead of onto a ghost
      // marker entry. Without this, a back-press from the destination
      // would land on the marker (same URL as before chat opened) and
      // visually rewind one extra step.
      if (typeof window !== 'undefined' && window.history.state?.armeChatModal === true) {
        const handlePop = () => {
          window.removeEventListener('popstate', handlePop);
          // Schedule navigate after browser commits the popstate so we
          // don't race the close cleanup.
          requestAnimationFrame(() => navigate(route));
        };
        window.addEventListener('popstate', handlePop, { once: true });
        setOpen(false);
        window.history.back();
      } else {
        setOpen(false);
        navigate(route);
      }
    },
    [navigate],
  );

  // Hide on /peta (ArmeMascot owns that route) and on the standalone
  // birthday page /26 (cake/gift takeover — don't clutter).
  const hidden =
    pathname === '/armeniacaTown/peta' || pathname.startsWith('/armeniacaTown/peta/');

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Track soft-keyboard height via visualViewport API (iOS Safari +
  // Android Chrome). When keyboard opens, vv.height shrinks; the
  // difference equals the obscured area. We use that to slide the
  // sheet up so the input bar stays visible above the keyboard.
  useEffect(() => {
    if (!isMobile || !open) {
      setKeyboardHeight(0);
      return undefined;
    }
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const update = () => {
      const h = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardHeight(h);
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [isMobile, open]);

  // History intercept — when panel opens on mobile, push a synthetic
  // history entry so the Android hardware back button closes the panel
  // instead of navigating away from the page. iOS doesn't have a back
  // button but the entry doesn't hurt; it gets popped on UI close so
  // the history stack stays tidy.
  useEffect(() => {
    if (!open || !isMobile) return undefined;
    const marker = { armeChatModal: true, ts: Date.now() };
    window.history.pushState(marker, '');
    const onPop = () => {
      // Back button pressed — close panel. State already popped by
      // the browser, so cleanup below skips the back() call.
      setOpen(false);
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      // If the panel was closed via UI (X / backdrop / drag-dismiss),
      // popstate never fired and our marker is still on top. Pop it
      // so back() from the page doesn't surface the dead marker.
      if (window.history.state?.armeChatModal === true) {
        window.history.back();
      }
    };
  }, [open, isMobile]);

  useEffect(() => {
    saveHistory(messages);
  }, [messages]);

  // Auto-scroll to bottom on new message / typing indicator / stream tick
  useEffect(() => {
    if (!open) return;
    const el = scrollerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages, streamingContent, sending, open]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [open]);

  // Esc closes panel
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const send = useCallback(
    async (textArg) => {
      const text = (textArg ?? input).trim();
      if (!text || sending) return;
      setError(null);
      setInput('');
      const next = [...messages, { role: 'user', content: text }].slice(-MAX_HISTORY);
      setMessages(next);
      setSending(true);
      setStreamingContent('');

      const controller = new AbortController();
      abortRef.current = controller;
      let accumulated = '';
      let serverError = null;

      try {
        const res = await fetch('/api/arme-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
          body: JSON.stringify({
            messages: next,
            stream: true,
            // Page Arme is on — backend uses this to inject "user
            // sedang di /gallery" etc into the system prompt.
            pathname,
          }),
          signal: controller.signal,
        });

        const ctype = res.headers.get('content-type') || '';
        if (!res.ok || !ctype.includes('text/event-stream')) {
          // Non-stream error fallthrough — backend returned JSON error
          // body (e.g. 4xx validation) or refused to upgrade. Parse it
          // the old way so the user still sees a useful message.
          const data = await res.json().catch(() => ({}));
          setError(data?.error || 'Arme lagi gak bisa jawab. Coba lagi sebentar.');
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          // Drain complete SSE events (separated by blank lines).
          let nlIdx;
          while ((nlIdx = buf.indexOf('\n\n')) >= 0) {
            const chunk = buf.slice(0, nlIdx);
            buf = buf.slice(nlIdx + 2);
            const dataLines = chunk
              .split('\n')
              .filter((l) => l.startsWith('data:'))
              .map((l) => l.slice(5).trimStart());
            if (!dataLines.length) continue;
            const payload = dataLines.join('\n');
            try {
              const obj = JSON.parse(payload);
              if (obj.delta) {
                accumulated += obj.delta;
                setStreamingContent(accumulated);
              }
              if (obj.error) serverError = obj.error;
              if (obj.done) break;
            } catch {
              /* malformed line — ignore */
            }
          }
        }
      } catch (err) {
        if (err?.name !== 'AbortError') {
          setError('Jaringan terputus. Cek koneksi lalu coba lagi.');
        }
      } finally {
        abortRef.current = null;
        // Commit streamed content to history (if any), then clear the
        // ephemeral streaming bubble.
        if (accumulated.trim()) {
          setMessages((prev) =>
            [...prev, { role: 'assistant', content: accumulated.trim() }].slice(-MAX_HISTORY),
          );
        } else if (serverError) {
          setError(serverError);
        } else if (!accumulated && !serverError) {
          setError('Jawaban Arme kosong. Coba tanya lagi.');
        }
        setStreamingContent(null);
        setSending(false);
      }
    },
    [input, messages, sending, pathname],
  );

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleInput = (e) => {
    const value = e.target.value.slice(0, MAX_INPUT_CHARS);
    setInput(value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
    }
  };

  // Chat greeting quote — random pick from the QOTD pool, re-rolled
  // every time the panel transitions from closed→open. While the panel
  // stays open the quote is stable. Avoids the deterministic day's
  // quote so the chat greeting and home strip don't echo each other.
  // Declared before the `hidden` early return so hooks order stays
  // consistent across renders.
  const [chatQuote, setChatQuote] = useState(() =>
    getRandomQuote(getQuoteOfTheDay()),
  );
  useEffect(() => {
    if (open) setChatQuote(getRandomQuote(getQuoteOfTheDay()));
  }, [open]);

  if (hidden) return null;

  const showSuggestions = !sending && messages.length === 0;
  // Contextual follow-up chips — shown after the last assistant message
  // (when not streaming). Picks 3 chips keyed by routes Arme mentioned
  // in her last reply; falls back to a rotating generic set.
  const lastMsg = messages[messages.length - 1];
  const showFollowups =
    !sending &&
    streamingContent === null &&
    lastMsg?.role === 'assistant' &&
    messages.length > 0;
  const followupChips = showFollowups
    ? pickFollowups(
        lastMsg.content,
        new Set(
          messages
            .filter((m) => m.role === 'user')
            .map((m) => m.content.toLowerCase().trim()),
        ),
        3,
      )
    : [];

  return (
    <>
      <style>{`
        @keyframes armeChatDot {
          0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-3px); }
        }
        @keyframes armeChatFabPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(244,200,150,0.55), 0 10px 24px rgba(0,0,0,0.35); }
          50%      { box-shadow: 0 0 0 10px rgba(244,200,150,0.05), 0 10px 24px rgba(0,0,0,0.35); }
        }
        @keyframes armeChatPanelIn {
          0%   { opacity: 0; transform: translateY(12px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes armeChatSheetIn {
          0%   { opacity: 0; transform: translateY(100%); }
          100% { opacity: 1; transform: translateY(0);    }
        }
        @keyframes armeChatCaret {
          0%, 49%   { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
      `}</style>

      {/* Floating action button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka chat dengan Arme"
          className="fixed z-[2147483600] rounded-full bg-[#9a5b4a] ring-2 ring-[#f4c896]/60 hover:bg-[#a86a58] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#f4c896]/80 transition-colors flex items-center justify-center"
          style={{
            right: 'max(16px, env(safe-area-inset-right, 0px))',
            bottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
            width: 56,
            height: 56,
            animation: 'armeChatFabPulse 2.4s ease-in-out infinite',
          }}
        >
          <img
            src={AVATAR_IDLE}
            alt="Arme"
            draggable={false}
            className="w-12 h-12 rounded-full object-cover object-top"
          />
          <span className="sr-only">Chat dengan Arme</span>
        </button>
      )}

      {/* Backdrop (mobile only) */}
      {open && isMobile && (
        <div
          className="fixed inset-0 z-[2147483601] bg-black/45 backdrop-blur-[1px]"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Chat panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Chat dengan Arme"
          className={
            isMobile
              ? 'fixed left-0 right-0 bottom-0 z-[2147483602] flex flex-col bg-[#fdf6ee] ring-1 ring-[#d4a574]/40 shadow-2xl rounded-t-3xl overflow-hidden'
              : 'fixed z-[2147483602] flex flex-col bg-[#fdf6ee] ring-1 ring-[#d4a574]/40 shadow-2xl rounded-2xl overflow-hidden'
          }
          style={
            isMobile
              ? {
                  // When keyboard is up, fill exactly the visible
                  // viewport so the input bar sits above the keyboard
                  // (vh units track layout viewport, which doesn't
                  // shrink on iOS — visualViewport.height does).
                  height:
                    keyboardHeight > 0 && typeof window !== 'undefined'
                      ? `${window.visualViewport?.height || window.innerHeight}px`
                      : 'min(82vh, 640px)',
                  bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : 0,
                  paddingBottom:
                    keyboardHeight > 0
                      ? '0px'
                      : 'env(safe-area-inset-bottom, 0px)',
                  // While dragging, translate the sheet by the drag
                  // offset (additive on top of the entrance animation).
                  transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
                  // Skip the entrance animation while dragging so the
                  // user-controlled gesture doesn't visually conflict.
                  animation:
                    dragOffset > 0
                      ? 'none'
                      : 'armeChatSheetIn 320ms cubic-bezier(0.2, 0.7, 0.3, 1) both',
                  // Disable transition during active drag (instant
                  // follow), spring back via short transition on
                  // release (handled in touchEnd).
                  transition: dragOffset > 0 ? 'none' : 'transform 200ms ease-out',
                  touchAction: 'pan-y',
                }
              : {
                  right: 'max(16px, env(safe-area-inset-right, 0px))',
                  bottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
                  width: 380,
                  height: 'min(620px, calc(100vh - 32px))',
                  animation:
                    'armeChatPanelIn 280ms cubic-bezier(0.2, 0.7, 0.3, 1) both',
                }
          }
        >
          {/* Header — also functions as the drag handle on mobile. Touch
              events here translate the sheet down; releasing past the
              threshold closes the panel (a la WhatsApp / Slack sheets). */}
          <div
            className="flex items-center gap-3 px-4 py-3 bg-[#9a5b4a] text-white relative"
            onTouchStart={(e) => {
              if (!isMobile) return;
              dragStartRef.current = e.touches[0].clientY;
            }}
            onTouchMove={(e) => {
              if (!isMobile || dragStartRef.current === null) return;
              const delta = e.touches[0].clientY - dragStartRef.current;
              if (delta > 0) setDragOffset(delta);
            }}
            onTouchEnd={() => {
              if (!isMobile || dragStartRef.current === null) return;
              const finalOffset = dragOffset;
              dragStartRef.current = null;
              setDragOffset(0);
              // Threshold: 100px commits to close, less springs back.
              if (finalOffset > 100) setOpen(false);
            }}
            onTouchCancel={() => {
              dragStartRef.current = null;
              setDragOffset(0);
            }}
          >
            {/* Mobile drag handle pill — visual cue that the sheet is
                swipe-down-dismissable. Hidden on desktop where the
                panel doesn't have a "drag" affordance. */}
            {isMobile && (
              <span
                className="absolute left-1/2 -translate-x-1/2 -top-0 mt-1 h-1 w-10 rounded-full bg-white/35"
                aria-hidden
              />
            )}
            <Avatar size={36} />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#f4c896]">
                Pemandu Situs
              </div>
              <div className="text-sm font-semibold truncate">Arme · bukan Eli</div>
            </div>
            <button
              type="button"
              onClick={reset}
              className="text-[11px] text-white/80 hover:text-white px-2 py-1 rounded ring-1 ring-white/20 hover:ring-white/40 transition-colors"
              aria-label="Reset percakapan"
              disabled={sending || messages.length === 0}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/90 transition-colors flex items-center justify-center"
              aria-label="Tutup chat"
            >
              ×
            </button>
          </div>

          {/* Message list */}
          <div
            ref={scrollerRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#fdf6ee]"
            style={{ scrollBehavior: 'smooth' }}
          >
            {/* Greeting bubble — intro + daily quote (same source as
                home strip; quote flips at WIB midnight). */}
            <div className="flex items-start gap-2">
              <Avatar size={28} />
              <div className="flex-1 max-w-[85%] rounded-2xl rounded-tl-sm bg-white ring-1 ring-[#d4a574]/30 px-3.5 py-2.5 text-[13px] leading-relaxed text-[#1c1f2a] shadow-sm">
                <p>{GREETING_INTRO}</p>
                {chatQuote && (
                  <p className="mt-2 pt-2 border-t border-[#d4a574]/25 text-[12px]">
                    <span className="text-[#9a5b4a]/80">{GREETING_QUOTE_PREFIX}</span>{' '}
                    <span
                      className="italic text-[#3a2818]"
                      style={{ fontFamily: '"Fraunces Variable", "Fraunces", serif' }}
                    >
                      “{chatQuote}”
                    </span>
                  </p>
                )}
              </div>
            </div>

            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#9a5b4a] text-white px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap shadow-sm">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex items-start gap-2">
                  <Avatar size={28} />
                  <div className="flex-1 max-w-[85%] rounded-2xl rounded-tl-sm bg-white ring-1 ring-[#d4a574]/30 px-3.5 py-2.5 text-[13px] leading-relaxed text-[#1c1f2a] whitespace-pre-wrap shadow-sm">
                    {renderTextWithRoutes(m.content, handleRouteClick)}
                  </div>
                </div>
              ),
            )}

            {/* Streaming bubble — visible while Arme is still generating.
                Avatar swaps to talking pose (ELI_1_a + glow) so the
                avatar feels alive while text streams in. Routes aren't
                parsed here (partial paths would flicker between text
                /button mid-stream); final commit renders via the main
                messages map with full parsing. */}
            {streamingContent !== null && (
              <div className="flex items-start gap-2">
                <Avatar size={28} talking />
                <div className="flex-1 max-w-[85%] rounded-2xl rounded-tl-sm bg-white ring-1 ring-[#d4a574]/30 px-3.5 py-2.5 text-[13px] leading-relaxed text-[#1c1f2a] whitespace-pre-wrap shadow-sm">
                  {streamingContent || <TypingDots />}
                  {streamingContent && (
                    <span
                      className="inline-block w-[2px] h-[1em] bg-[#9a5b4a] ml-0.5 align-middle"
                      style={{ animation: 'armeChatCaret 1s steps(1) infinite' }}
                      aria-hidden
                    />
                  )}
                </div>
              </div>
            )}

            {sending && streamingContent === null && (
              <div className="flex items-start gap-2">
                <Avatar size={28} />
                <div className="rounded-2xl rounded-tl-sm bg-white ring-1 ring-[#d4a574]/30 px-3.5 py-3 shadow-sm">
                  <TypingDots />
                </div>
              </div>
            )}

            {error && (
              <div className="text-[12px] text-[#9a3a2a] bg-[#fde7df] ring-1 ring-[#e5b890]/50 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {showSuggestions && (
              <div className="pt-1 flex flex-wrap gap-2">
                {PROMPT_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="text-[12px] px-3 py-1.5 rounded-full bg-white ring-1 ring-[#d4a574]/40 text-[#9a5b4a] hover:bg-[#fff3e2] transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Follow-up chips after a completed assistant reply.
                Subtler styling than the initial suggestions to read as
                "by the way…" rather than "click me first". */}
            {followupChips.length > 0 && (
              <div className="pt-1 pl-9 flex flex-wrap gap-1.5">
                <div className="w-full text-[10px] uppercase tracking-[0.15em] text-[#9a5b4a]/60 mb-0.5">
                  Tanya lagi
                </div>
                {followupChips.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-[#9a5b4a]/8 ring-1 ring-[#9a5b4a]/20 text-[#7a3f30] hover:bg-[#9a5b4a]/15 hover:ring-[#9a5b4a]/35 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="border-t border-[#d4a574]/30 bg-white px-3 py-3 flex items-end gap-2"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Tanya Arme sesuatu…"
              disabled={sending}
              className="flex-1 resize-none bg-[#fdf6ee] ring-1 ring-[#d4a574]/30 focus:ring-2 focus:ring-[#9a5b4a]/50 focus:outline-none rounded-xl px-3 py-2 text-[13px] leading-relaxed text-[#1c1f2a] placeholder-[#9a5b4a]/45 max-h-[120px]"
              style={{ minHeight: 38 }}
              maxLength={MAX_INPUT_CHARS}
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              aria-label="Kirim"
              className="h-10 w-10 rounded-full bg-[#9a5b4a] hover:bg-[#a86a58] disabled:bg-[#9a5b4a]/40 text-white transition-colors flex items-center justify-center shrink-0"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M22 2 11 13" />
                <path d="m22 2-7 20-4-9-9-4 20-7Z" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default ArmeChatWidget;
