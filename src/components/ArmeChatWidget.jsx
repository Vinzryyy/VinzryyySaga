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
import { useLocation } from 'react-router-dom';

const STORAGE_KEY = 'armeniaca-arme-chat-v1';
const AVATAR = '/Arme/ELI_1_a.png';
const MAX_HISTORY = 16;
const MAX_INPUT_CHARS = 1200;

const GREETING =
  'Halo. Aku Arme — pemandu situs ini, bukan Eli. Aku bisa bantu kamu nemu halaman, jawab info dasar soal Eli, atau cerita ringan soal kota. Mau mulai dari mana?';

const PROMPT_SUGGESTIONS = [
  'Halaman apa aja yang ada di sini?',
  'Eli di JKT48 sejak kapan?',
  'Cara kirim ucapan ulang tahun?',
];

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

const Avatar = ({ size = 36 }) => (
  <span
    className="inline-flex items-center justify-center rounded-full overflow-hidden bg-[#f4e3cc] ring-1 ring-[#d4a574]/60 shrink-0"
    style={{ width: size, height: size }}
    aria-hidden
  >
    <img
      src={AVATAR}
      alt=""
      draggable={false}
      className="w-full h-full object-cover object-top"
      style={{ filter: 'drop-shadow(0 0 6px rgba(244,200,150,0.4))' }}
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
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => loadHistory());
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(() => isMobileViewport());

  const scrollerRef = useRef(null);
  const textareaRef = useRef(null);

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

  useEffect(() => {
    saveHistory(messages);
  }, [messages]);

  // Auto-scroll to bottom on new message / typing indicator
  useEffect(() => {
    if (!open) return;
    const el = scrollerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages, sending, open]);

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
      try {
        const res = await fetch('/api/arme-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: next }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.error || 'Arme lagi gak bisa jawab. Coba lagi sebentar.');
        } else if (data?.reply) {
          setMessages((prev) =>
            [...prev, { role: 'assistant', content: data.reply }].slice(-MAX_HISTORY),
          );
        } else {
          setError('Jawaban Arme kosong. Coba tanya lagi.');
        }
      } catch {
        setError('Jaringan terputus. Cek koneksi lalu coba lagi.');
      } finally {
        setSending(false);
      }
    },
    [input, messages, sending],
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

  if (hidden) return null;

  const showSuggestions = !sending && messages.length === 0;

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
            src={AVATAR}
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
                  height: 'min(82vh, 640px)',
                  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                  animation: 'armeChatSheetIn 320ms cubic-bezier(0.2, 0.7, 0.3, 1) both',
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
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#9a5b4a] text-white">
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
            {/* Greeting bubble */}
            <div className="flex items-start gap-2">
              <Avatar size={28} />
              <div className="flex-1 max-w-[85%] rounded-2xl rounded-tl-sm bg-white ring-1 ring-[#d4a574]/30 px-3.5 py-2.5 text-[13px] leading-relaxed text-[#1c1f2a] shadow-sm">
                {GREETING}
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
                    {m.content}
                  </div>
                </div>
              ),
            )}

            {sending && (
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
