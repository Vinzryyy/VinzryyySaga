/**
 * Wishes Page — birthday wishes wall. Fans submit a short message + handle;
 * after moderation, owner adds it to siteConfig.wishes.seeds and redeploys
 * (or wires Formspree-style endpoint via siteConfig.wishes.endpoint to skip
 * manual moderation).
 *
 * Pure client-side — no live database. Each submission posts to the
 * configured endpoint, then the form swaps to a success state. The wall
 * displays seed wishes from config (curated list).
 */

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SITE_CONFIG } from '../config/siteConfig';
import { useScrollReveal } from '../hooks/useScrollReveal';

const formatRelative = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
};

// Subtle decorative rotation for each card so the wall feels like sticky
// notes pinned up rather than a uniform grid. Deterministic per index.
const cardTilt = (idx) => {
  const tilts = [-1.2, 0.8, -0.4, 1.5, -0.9, 0.5, -1.6, 1.1];
  return tilts[idx % tilts.length];
};

const WishesPage = () => {
  const wishes = SITE_CONFIG.wishes;
  const eli = SITE_CONFIG.eli;

  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [error, setError] = useState('');

  const charsLeft = wishes.charLimit - message.length;
  const isOverLimit = charsLeft < 0;
  const hasEndpoint = Boolean(wishes.endpoint);
  const formDisabled = status === 'submitting' || isOverLimit || !name.trim() || !message.trim();

  const seeds = useMemo(
    () =>
      [...(wishes.seeds || [])].sort(
        (a, b) => (b.date || '').localeCompare(a.date || '')
      ),
    [wishes.seeds]
  );

  const { elementRef: wallRef, isVisible: wallVisible } = useScrollReveal({
    threshold: 0.05,
    rootMargin: '-40px',
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!hasEndpoint) {
      setStatus('error');
      setError(wishes.demoMessage);
      return;
    }
    setStatus('submitting');
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('handle', handle.trim());
      formData.append('message', message.trim());
      formData.append('_subject', `Birthday wish for ${eli.stageName}`);
      const res = await fetch(wishes.endpoint, {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Submission failed (${res.status})`);
      setStatus('success');
      setName('');
      setHandle('');
      setMessage('');
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Pesan gagal terkirim, coba lagi sebentar lagi.');
    }
  };

  return (
    <main className="bg-[color:var(--retro-bg-primary)] min-h-screen overflow-x-hidden">
      {/* Editorial header */}
      <header className="relative pt-28 sm:pt-32 md:pt-40 pb-10 md:pb-14 px-5 sm:px-6 md:px-12 lg:px-20 overflow-hidden">
        {/* Watermark wordmark */}
        <div
          aria-hidden="true"
          className="absolute right-0 top-0 bottom-0 w-2/5 hidden lg:block pointer-events-none opacity-[0.05]"
          style={{
            maskImage: 'url(/logo-armeniaca.png)',
            WebkitMaskImage: 'url(/logo-armeniaca.png)',
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            maskPosition: 'right center',
            WebkitMaskPosition: 'right center',
            backgroundColor: 'var(--retro-burgundy)',
          }}
        />
        <div className="relative max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-5 text-[color:var(--retro-burgundy)]">
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">{wishes.eyebrow}</span>
            <span className="w-10 h-px bg-[color:var(--retro-burgundy)]/30" />
            <Link
              to="/countdown"
              className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] hover:text-[color:var(--retro-burgundy)] transition-colors inline-flex items-center gap-2"
            >
              <i className="ri-cake-2-line text-base" />
              Cek countdown 15 Juni 2026
            </Link>
          </div>

          <h1 className="font-header text-[2rem] sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tighter text-[color:var(--retro-text-primary)] leading-[0.95] max-w-4xl">
            {wishes.title} <br />
            <span className="text-[color:var(--retro-burgundy)]">{wishes.titleAccent}</span>
          </h1>
          <p className="mt-5 sm:mt-6 text-sm sm:text-base md:text-lg text-[color:var(--color-text-secondary)] leading-relaxed max-w-2xl">
            {wishes.lead}
          </p>
          <div className="mt-8 h-px bg-gradient-to-r from-[color:var(--retro-burgundy)]/40 via-[color:var(--retro-brown-dark)]/10 to-transparent" />
        </div>
      </header>

      {/* Submission form */}
      <section className="px-5 sm:px-6 md:px-12 lg:px-20 mb-12 md:mb-16">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-[2rem] bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] p-6 sm:p-8 md:p-10 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full bg-[color:var(--retro-gold)]/15 blur-3xl pointer-events-none" />

            <div className="relative">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--retro-gold-light)] mb-3">
                Form Ucapan
              </p>
              <h2 className="font-header text-2xl sm:text-3xl md:text-4xl font-black leading-tight tracking-tighter mb-2">
                Tulis pesan singkat untuk {eli.nickname}.
              </h2>
              <p className="text-sm text-[color:var(--retro-cream)]/70 mb-6">
                {hasEndpoint ? wishes.pendingMessage : wishes.demoMessage}
              </p>

              {status === 'success' ? (
                <div className="rounded-2xl bg-[color:var(--retro-cream)]/10 border border-[color:var(--retro-cream)]/15 p-6 text-center">
                  <i className="ri-checkbox-circle-line text-4xl text-[color:var(--retro-gold-light)] mb-3 inline-block" />
                  <p className="font-bold mb-2">{wishes.successMessage}</p>
                  <button
                    type="button"
                    onClick={() => setStatus('idle')}
                    className="mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-gold-light)] hover:text-[color:var(--retro-cream)] transition-colors"
                  >
                    <i className="ri-add-line" /> Tulis lagi
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/70">
                        Nama <span className="text-[color:var(--retro-gold-light)]">*</span>
                      </span>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={60}
                        placeholder="Nama panggilan"
                        className="mt-1 w-full px-4 py-3 rounded-xl bg-[color:var(--retro-cream)]/10 border border-[color:var(--retro-cream)]/15 focus:border-[color:var(--retro-gold-light)] focus:ring-2 focus:ring-[color:var(--retro-gold-light)]/30 focus:outline-none text-[color:var(--retro-cream)] placeholder-[color:var(--retro-cream)]/40 text-sm transition-colors"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/70">
                        Handle (opsional)
                      </span>
                      <input
                        type="text"
                        value={handle}
                        onChange={(e) => setHandle(e.target.value)}
                        maxLength={40}
                        placeholder="@handle X / IG"
                        className="mt-1 w-full px-4 py-3 rounded-xl bg-[color:var(--retro-cream)]/10 border border-[color:var(--retro-cream)]/15 focus:border-[color:var(--retro-gold-light)] focus:ring-2 focus:ring-[color:var(--retro-gold-light)]/30 focus:outline-none text-[color:var(--retro-cream)] placeholder-[color:var(--retro-cream)]/40 text-sm transition-colors"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-cream)]/70">
                        Pesan <span className="text-[color:var(--retro-gold-light)]">*</span>
                      </span>
                      <span
                        className={`text-[10px] font-black tabular-nums ${
                          isOverLimit
                            ? 'text-[#FF8B7A]'
                            : charsLeft < 30
                            ? 'text-[color:var(--retro-gold-light)]'
                            : 'text-[color:var(--retro-cream)]/50'
                        }`}
                      >
                        {charsLeft}
                      </span>
                    </div>
                    <textarea
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      placeholder="Tulis ucapan singkat untuk Ceu Eli..."
                      className="mt-1 w-full px-4 py-3 rounded-xl bg-[color:var(--retro-cream)]/10 border border-[color:var(--retro-cream)]/15 focus:border-[color:var(--retro-gold-light)] focus:ring-2 focus:ring-[color:var(--retro-gold-light)]/30 focus:outline-none text-[color:var(--retro-cream)] placeholder-[color:var(--retro-cream)]/40 text-sm leading-relaxed transition-colors resize-none"
                    />
                  </label>

                  {status === 'error' && error && (
                    <p className="text-xs text-[#FFB1A2] bg-[#FF8B7A]/10 border border-[#FF8B7A]/30 rounded-lg px-3 py-2">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={formDisabled}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-7 py-3.5 rounded-full bg-[color:var(--retro-cream)] text-[color:var(--retro-burgundy)] font-bold text-sm uppercase tracking-widest shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 transition-all"
                  >
                    {status === 'submitting' ? (
                      <>
                        <i className="ri-loader-4-line animate-spin" />
                        Mengirim...
                      </>
                    ) : (
                      <>
                        <i className="ri-send-plane-line" />
                        {wishes.formCta}
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Wall */}
      <section className="px-5 sm:px-6 md:px-12 lg:px-20 pb-16 md:pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-baseline justify-between mb-6">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
              Wall · {seeds.length} ucapan
            </p>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] hidden sm:block">
              Kurasi terbaru di atas
            </p>
          </div>

          {seeds.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-[color:var(--retro-brown-dark)]/15 bg-[color:var(--retro-burgundy)]/[0.02] p-10 text-center">
              <i className="ri-mail-send-line text-4xl text-[color:var(--retro-burgundy)]/40 mb-3 inline-block" />
              <p className="text-[color:var(--retro-text-primary)] font-bold">
                Belum ada ucapan yang dimoderasi.
              </p>
              <p className="text-sm text-[color:var(--color-text-muted)] mt-1">
                Jadilah yang pertama lewat form di atas.
              </p>
            </div>
          ) : (
            <div
              ref={wallRef}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
            >
              {seeds.map((wish, idx) => {
                const tilt = cardTilt(idx);
                const date = formatRelative(wish.date);
                return (
                  <article
                    key={`${wish.name}-${wish.date}-${idx}`}
                    style={{
                      transitionDelay: `${idx * 50}ms`,
                      transform: `rotate(${tilt}deg)`,
                    }}
                    className={`relative rounded-2xl bg-[color:var(--retro-bg-primary)] border border-[color:var(--retro-brown-dark)]/15 p-5 md:p-6 shadow-sm hover:shadow-xl hover:rotate-0 transition-all duration-500 ${
                      wallVisible
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-6'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[color:var(--retro-burgundy)]/10 text-[color:var(--retro-burgundy)] flex items-center justify-center flex-shrink-0">
                          <i className="ri-user-smile-line text-base" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-[color:var(--retro-text-primary)] leading-tight truncate">
                            {wish.name}
                          </p>
                          {wish.handle && (
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--color-text-muted)] truncate">
                              {wish.handle}
                            </p>
                          )}
                        </div>
                      </div>
                      {date && (
                        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[color:var(--color-text-muted)] flex-shrink-0">
                          {date}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[color:var(--retro-text-secondary)] leading-relaxed">
                      "{wish.message}"
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default WishesPage;
