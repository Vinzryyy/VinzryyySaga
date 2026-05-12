/**
 * BookOverlay — modal halaman terbuka untuk Arsip Ingatan (r2).
 *
 * Rendering body sesuai book.getBody().type:
 *   - quote              : focal piece di meja, kutipan + epilogue
 *   - prose-with-motifs  : etimologi Armeniaca + grid simbol
 *   - philosophy         : philosophy quote + paragraf community
 *   - timeline-section   : multi-milestone (era), tiap milestone block
 *   - era-fight          : Team Dream context + member list + milestones
 *   - diskografi         : single info + roster table
 *   - kebaikan           : aksi descriptions + gallery thumbnails
 *
 * Tipografi: Fraunces (existing project) untuk body & title, sans untuk
 * eyebrow & meta. Background paper cream dengan noise texture halus
 * via CSS. Spine accent strip 4px di kiri pakai book.spineColor.
 *
 * Navigasi: prev/next dalam rak yang sama (bukan global). Arrow keys
 * & Escape. Reading progress bar di top. Mark as read on >80% scroll.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getRakSiblings,
  getNextStoryBook,
} from '../../../data/arsipBooks';

// =====================================================================
// Body type renderers
// =====================================================================

const QuoteBody = ({ body }) => (
  <div className="space-y-6">
    <blockquote
      className="text-[color:var(--retro-brown-dark)] text-lg sm:text-xl leading-relaxed"
      style={{
        fontFamily: '"Fraunces Variable", serif',
        fontStyle: 'italic',
      }}
    >
      <span className="text-[color:var(--retro-burgundy)] text-3xl leading-none align-top mr-1">
        “
      </span>
      {body.quote}
      <span className="text-[color:var(--retro-burgundy)] text-3xl leading-none ml-1">
        ”
      </span>
    </blockquote>
    <div className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]">
      — {body.author}
    </div>
    {body.epilogue && (
      <p
        className="text-[color:var(--retro-brown-dark)]/85 leading-[1.75] pt-2"
        style={{ fontFamily: '"Fraunces Variable", serif' }}
      >
        {body.epilogue}
      </p>
    )}
  </div>
);

const ProseWithMotifsBody = ({ body }) => (
  <div className="space-y-6">
    {body.paragraphs.map((p, i) => (
      <p
        key={i}
        className="text-[color:var(--retro-brown-dark)] leading-[1.75]"
        style={{
          fontFamily: '"Fraunces Variable", serif',
          fontSize: '17px',
        }}
      >
        {i === 0 && (
          <span
            className="float-left text-[color:var(--retro-burgundy)] mr-2"
            style={{
              fontFamily: '"Fraunces Variable", serif',
              fontSize: '54px',
              lineHeight: '0.85',
              fontWeight: 600,
            }}
          >
            {p.charAt(0)}
          </span>
        )}
        {i === 0 ? p.slice(1) : p}
      </p>
    ))}
    {body.motifsTitle && (
      <div className="pt-4">
        <h3
          className="text-[color:var(--retro-brown-dark)] text-lg mb-4"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontWeight: 600,
          }}
        >
          {body.motifsTitle}
        </h3>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {body.motifs.map((m, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--retro-burgundy)] mt-2 flex-shrink-0" />
              <div>
                <div
                  className="text-[color:var(--retro-brown-dark)] text-sm font-semibold"
                  style={{ fontFamily: '"Fraunces Variable", serif' }}
                >
                  {m.name}
                </div>
                <div className="text-[color:var(--retro-brown-dark)]/75 text-xs leading-relaxed">
                  {m.meaning}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

// ProseStoryBody — long-form prose narrative (3-6 paragraphs).
// Drop cap di paragraf pertama, italic typographic break antar
// paragraf. Untuk story/curated content panjang.
const ProseStoryBody = ({ body }) => (
  <div className="space-y-5">
    {body.paragraphs.map((p, i) => (
      <p
        key={i}
        className="text-[color:var(--retro-brown-dark)] leading-[1.75]"
        style={{
          fontFamily: '"Fraunces Variable", serif',
          fontSize: '17px',
        }}
      >
        {i === 0 && p.length > 1 && (
          <span
            className="float-left text-[color:var(--retro-burgundy)] mr-2"
            style={{
              fontFamily: '"Fraunces Variable", serif',
              fontSize: '54px',
              lineHeight: '0.85',
              fontWeight: 600,
            }}
          >
            {p.charAt(0)}
          </span>
        )}
        {i === 0 ? p.slice(1) : p}
      </p>
    ))}
  </div>
);

const PhilosophyBody = ({ body }) => (
  <div className="space-y-6">
    <blockquote
      className="text-[color:var(--retro-brown-dark)] text-lg leading-relaxed border-l-2 border-[color:var(--retro-burgundy)] pl-5 py-1"
      style={{
        fontFamily: '"Fraunces Variable", serif',
        fontStyle: 'italic',
      }}
    >
      {body.quote}
    </blockquote>
    <div className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]">
      — {body.author}
    </div>
    {body.communityTitle && (
      <div className="pt-4 border-t border-[color:var(--retro-brown-dark)]/15">
        <h3
          className="text-[color:var(--retro-brown-dark)] text-lg mb-3"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontWeight: 600,
          }}
        >
          {body.communityTitle}
        </h3>
        <p
          className="text-[color:var(--retro-brown-dark)]/85 leading-[1.75]"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontSize: '17px',
          }}
        >
          {body.communityBody}
        </p>
      </div>
    )}
  </div>
);

const TimelineSectionBody = ({ body }) => (
  <div className="space-y-8">
    {body.milestones.map((m) => (
      <div key={m.id} className="space-y-2">
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <div className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]">
            {m.period}
          </div>
          {m.badge && (
            <div className="text-[10px] text-[color:var(--retro-brown-dark)]/60 italic">
              {m.badge}
            </div>
          )}
        </div>
        <h3
          className="text-[color:var(--retro-brown-dark)] text-xl leading-tight"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontWeight: 500,
          }}
        >
          {m.title}
        </h3>
        <p
          className="text-[color:var(--retro-brown-dark)]/85 leading-[1.75]"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontSize: '16px',
          }}
        >
          {m.body}
        </p>
      </div>
    ))}
  </div>
);

const EraFightBody = ({ body }) => {
  const { fight, milestones } = body;
  return (
    <div className="space-y-6">
      <p
        className="text-[color:var(--retro-brown-dark)]/85 leading-[1.75]"
        style={{
          fontFamily: '"Fraunces Variable", serif',
          fontSize: '17px',
        }}
      >
        {fight.format}
      </p>

      <div className="rounded-lg border border-[color:var(--retro-brown-dark)]/15 bg-[color:var(--retro-cream)]/40 p-4 space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]">
              Tim Eli
            </div>
            <h4
              className="text-[color:var(--retro-brown-dark)] text-xl"
              style={{
                fontFamily: '"Fraunces Variable", serif',
                fontWeight: 600,
              }}
            >
              {fight.team.name}
            </h4>
          </div>
          <div className="text-[10px] text-[color:var(--retro-brown-dark)]/70 italic text-right">
            efektif {fight.effective}
          </div>
        </div>
        <div className="text-[12px] text-[color:var(--retro-brown-dark)]/85">
          <span className="font-semibold">{fight.team.captainTitle}: </span>
          {fight.team.captain}
        </div>
        <p className="text-[11px] text-[color:var(--retro-brown-dark)]/70 italic">
          {fight.team.captainNote}
        </p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {fight.team.members.map((name) => {
            const isEli = name === 'Eli';
            return (
              <span
                key={name}
                className={`text-[11px] px-2 py-0.5 rounded-full ${
                  isEli
                    ? 'bg-[color:var(--retro-burgundy)]/15 text-[color:var(--retro-burgundy)] font-semibold border border-[color:var(--retro-burgundy)]/30'
                    : 'bg-[color:var(--retro-brown-dark)]/10 text-[color:var(--retro-brown-dark)]/80'
                }`}
              >
                {name}
              </span>
            );
          })}
        </div>
      </div>

      <div className="pt-2">
        <h3
          className="text-[color:var(--retro-brown-dark)] text-lg mb-4"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontWeight: 600,
          }}
        >
          Linimasa era Fight
        </h3>
        <TimelineSectionBody body={{ milestones }} />
      </div>
    </div>
  );
};

const DiskografiBody = ({ body }) => {
  const { entry } = body;
  if (!entry) return null;
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]">
          {entry.type} · {entry.year} · {entry.position}
        </div>
        <h3
          className="text-[color:var(--retro-brown-dark)] text-2xl leading-tight"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontStyle: 'italic',
            fontWeight: 500,
          }}
        >
          {entry.title}
        </h3>
        {entry.campaignTagline && (
          <div className="text-xs text-[color:var(--retro-brown-dark)]/70 italic">
            Kampanye: {entry.campaignTagline}
          </div>
        )}
      </div>

      <p
        className="text-[color:var(--retro-brown-dark)]/85 leading-[1.75]"
        style={{
          fontFamily: '"Fraunces Variable", serif',
          fontSize: '16px',
        }}
      >
        {entry.note}
      </p>

      {entry.members && entry.members.length > 0 && (
        <div className="pt-2">
          <div className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)] mb-3">
            {entry.rosterLabel || 'Roster'}
          </div>
          <ul className="space-y-1.5">
            {entry.members.map((m) => {
              const isEli = m.isEli;
              return (
                <li
                  key={`${m.rank}-${m.name}`}
                  className={`flex items-baseline gap-3 text-[13px] py-1 px-2 rounded ${
                    isEli
                      ? 'bg-[color:var(--retro-burgundy)]/12 border border-[color:var(--retro-burgundy)]/25'
                      : ''
                  }`}
                >
                  <span
                    className={`w-6 text-right font-mono ${
                      isEli
                        ? 'text-[color:var(--retro-burgundy)] font-semibold'
                        : 'text-[color:var(--retro-brown-dark)]/60'
                    }`}
                  >
                    {m.rank}
                  </span>
                  <span
                    className={`flex-1 ${
                      isEli
                        ? 'text-[color:var(--retro-burgundy)] font-semibold'
                        : 'text-[color:var(--retro-brown-dark)]/85'
                    }`}
                  >
                    {m.name}
                    {m.position && (
                      <span className="text-[10px] text-[color:var(--retro-brown-dark)]/60 italic ml-2">
                        · {m.position}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-[color:var(--retro-brown-dark)]/60">
                    {m.group}
                  </span>
                  <span className="text-[10px] text-[color:var(--retro-brown-dark)]/70 font-mono w-12 text-right">
                    {m.votes ? m.votes.toLocaleString('id-ID') : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

const KebaikanBody = ({ body }) => (
  <div className="space-y-6">
    {body.entries.map((e) => (
      <div
        key={e.id}
        className="rounded-lg border border-[color:var(--retro-brown-dark)]/15 bg-[color:var(--retro-cream)]/40 p-4 space-y-3"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h3
            className="text-[color:var(--retro-brown-dark)] text-lg leading-tight"
            style={{
              fontFamily: '"Fraunces Variable", serif',
              fontWeight: 600,
            }}
          >
            {e.title}
          </h3>
          <div className="text-[10px] text-[color:var(--retro-brown-dark)]/60 italic whitespace-nowrap">
            {e.status === 'executed' && e.executedAt ? `selesai ${e.executedAt}` : e.status}
          </div>
        </div>
        <p
          className="text-[color:var(--retro-brown-dark)]/85 leading-[1.7]"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontSize: '15px',
          }}
        >
          {e.description}
        </p>
        <div className="flex items-baseline gap-2 text-[11px] text-[color:var(--retro-brown-dark)]/70">
          <span className="font-semibold">Untuk:</span>
          <span>{e.recipient}</span>
        </div>
        <div className="flex items-baseline gap-2 text-[11px] text-[color:var(--retro-brown-dark)]/70">
          <span className="font-semibold">Oleh:</span>
          <span>{e.contributorCredit}</span>
        </div>
        {e.gallery && e.gallery.length > 0 && (
          <div className="grid grid-cols-3 gap-2 pt-1">
            {e.gallery.slice(0, 3).map((src, i) => (
              <div
                key={i}
                className="aspect-square rounded overflow-hidden bg-[color:var(--retro-brown-dark)]/10"
              >
                <img
                  src={src}
                  alt={`Bukti ${e.title} ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    ))}
  </div>
);

// =====================================================================
// Cross-link footer — relasi buku ke ruangan/halaman lain
// =====================================================================

// Map dari book category/era ke list cross-links yang relevant.
// Tujuan: bantu user explore lebih jauh setelah baca, gak dead-end di
// dalam Arsip. Tiap link punya eyebrow (kategori) + label (CTA).
const buildCrossLinks = (book) => {
  const links = [];

  // Buku linimasa/diskografi/era-fight punya era → link ke Konstelasi
  // bintang yang sama (hash navigation ke milestone id).
  if (book.era) {
    links.push({
      key: `konstelasi-${book.era}`,
      to: '/armeniacaTown/r1',
      eyebrow: 'Petak R1',
      label: 'Lihat bintang ini di Konstelasi Perjalanan',
    });
  }

  // Buku kebaikan → link ke Pohon Kebaikan (/26) — sumber data
  // & action untuk siram.
  if (book.category === 'kebaikan') {
    links.push({
      key: 'pohon-kebaikan',
      to: '/26',
      eyebrow: 'Pohon Kebaikan',
      label: 'Siram Pohon Aprikot di /26',
    });
  }

  // Buku refleksi (etimologi/filosofi) tanpa era → link ke /about
  // (Armeniaca etymology fuller version + motif legend).
  if (book.category === 'refleksi' && !book.era) {
    links.push({
      key: 'about-armeniaca',
      to: '/about',
      eyebrow: 'Tentang Armeniaca',
      label: 'Lihat selengkapnya tentang proyek',
    });
  }

  return links;
};

const CrossLinkFooter = ({ book, onClose, onNavigate, restored }) => {
  const links = useMemo(() => buildCrossLinks(book), [book]);
  const nextStoryBook = useMemo(
    () => getNextStoryBook(book.id, restored),
    [book.id, restored],
  );
  if (links.length === 0 && !nextStoryBook) return null;
  return (
    <div className="mt-8 pt-5 border-t border-[color:var(--retro-brown-dark)]/15 space-y-4">
      {/* "Lanjut baca" — primary CTA narrative arc */}
      {nextStoryBook && (
        <div>
          <div className="text-[10px] uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)]/70 mb-3">
            Lanjut baca
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.(nextStoryBook.id)}
            className="w-full text-left block px-4 py-3 rounded-lg border-2 border-[color:var(--retro-burgundy)]/30 hover:border-[color:var(--retro-burgundy)]/60 hover:bg-[color:var(--retro-burgundy)]/5 transition group"
          >
            <div className="text-[9px] uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]/85 mb-1">
              {nextStoryBook.eyebrow}
            </div>
            <div
              className="text-[color:var(--retro-burgundy)] text-base transition"
              style={{
                fontFamily: '"Fraunces Variable", serif',
                fontStyle: 'italic',
                fontWeight: 500,
              }}
            >
              {nextStoryBook.title} →
            </div>
            <div
              className="text-[color:var(--retro-brown-dark)]/60 text-xs mt-1 italic"
              style={{ fontFamily: '"Fraunces Variable", serif' }}
            >
              {nextStoryBook.preview}
            </div>
          </button>
        </div>
      )}
      {/* Cross-room links (Konstelasi, Pohon, About) — secondary */}
      {links.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-[0.4em] text-[color:var(--retro-brown-dark)]/55 mb-3">
            Lihat juga
          </div>
          <div className="space-y-2">
            {links.map((l) => (
              <Link
                key={l.key}
                to={l.to}
                onClick={() => onClose?.()}
                className="block px-4 py-3 rounded-lg border border-[color:var(--retro-brown-dark)]/15 hover:border-[color:var(--retro-burgundy)]/40 hover:bg-[color:var(--retro-cream)]/60 transition group"
              >
                <div className="text-[9px] uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]/75 mb-1">
                  {l.eyebrow}
                </div>
                <div
                  className="text-[color:var(--retro-brown-dark)]/90 group-hover:text-[color:var(--retro-burgundy)] text-sm transition"
                  style={{
                    fontFamily: '"Fraunces Variable", serif',
                    fontStyle: 'italic',
                  }}
                >
                  {l.label} →
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// =====================================================================
// Body dispatcher
// =====================================================================

const BookBody = ({ book }) => {
  const body = useMemo(() => book.getBody(), [book]);

  switch (body.type) {
    case 'quote':
      return <QuoteBody body={body} />;
    case 'prose-with-motifs':
      return <ProseWithMotifsBody body={body} />;
    case 'prose-story':
      return <ProseStoryBody body={body} />;
    case 'philosophy':
      return <PhilosophyBody body={body} />;
    case 'timeline-section':
      return <TimelineSectionBody body={body} />;
    case 'era-fight':
      return <EraFightBody body={body} />;
    case 'diskografi':
      return <DiskografiBody body={body} />;
    case 'kebaikan':
      return <KebaikanBody body={body} />;
    default:
      return (
        <div className="text-[color:var(--retro-brown-dark)]/60 italic">
          Halaman ini belum dapat ditampilkan.
        </div>
      );
  }
};

// =====================================================================
// Main overlay
// =====================================================================

const BookOverlay = ({ book, restored, onClose, onNavigate, onMarkRead }) => {
  const scrollRef = useRef(null);
  const [progress, setProgress] = useState(0);
  // bookId di-extract supaya useEffect deps tracking identity-only,
  // bukan referensi object. Buku itu sendiri reused antar render (objek
  // di ARSIP_BOOKS array stabil), tapi pakai ?.id biar lint happy +
  // jelas intent: re-run saat user pindah buku, bukan saat React
  // re-render dengan same book object.
  const bookId = book?.id ?? null;

  // Compute prev/next within same rak
  const siblings = useMemo(() => {
    if (!book) return { prev: null, next: null, idx: 0, total: 0 };
    return getRakSiblings(book.id, restored);
  }, [book, restored]);

  // Keyboard nav
  useEffect(() => {
    if (!book) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      else if (e.key === 'ArrowLeft' && siblings.prev) {
        onNavigate?.(siblings.prev.id);
      } else if (e.key === 'ArrowRight' && siblings.next) {
        onNavigate?.(siblings.next.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [book, siblings, onClose, onNavigate]);

  // Lock body scroll while open
  useEffect(() => {
    if (!book) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [book]);

  // Reset scroll + progress saat ganti buku
  useEffect(() => {
    if (!bookId) return;
    setProgress(0);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [bookId]);

  // Scroll progress tracking + mark-as-read at >80%
  const handleScroll = () => {
    if (!scrollRef.current || !book) return;
    const el = scrollRef.current;
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 0) {
      setProgress(1);
      onMarkRead?.(book.id);
      return;
    }
    const u = Math.min(1, Math.max(0, el.scrollTop / max));
    setProgress(u);
    if (u > 0.8) onMarkRead?.(book.id);
  };

  // Mark short books as read on open (no scroll needed)
  useEffect(() => {
    if (!bookId || !scrollRef.current) return;
    const el = scrollRef.current;
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 0) {
      setProgress(1);
      onMarkRead?.(bookId);
    }
  }, [bookId, onMarkRead]);

  if (!book) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-3 sm:px-6 pb-3 sm:pb-6"
      style={{
        // Top offset = navbar height (~80px scrolled / ~100px expanded).
        // Modal mulai di bawah navbar, gak overlap.
        paddingTop: '6rem',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="arsip-book-title"
      onClick={(e) => {
        // Desktop: backdrop click closes. Mobile: dismiss only via X button
        // (per design — prevent accidental dismiss while scrolling).
        if (window.matchMedia('(min-width: 768px)').matches) {
          if (e.target === e.currentTarget) onClose?.();
        }
      }}
    >
      <div className="arsipBackdropEnter absolute inset-0 bg-black/70 backdrop-blur-md" />

      {/* Custom scrollbar styling untuk modal body — biar lebih kerasa
          "buku" daripada default browser. Sepia tone, slim, tanpa
          arrow buttons. Plus entrance animations untuk modal & backdrop. */}
      <style>{`
        .arsipBookScroll::-webkit-scrollbar { width: 6px; }
        .arsipBookScroll::-webkit-scrollbar-track { background: transparent; }
        .arsipBookScroll::-webkit-scrollbar-thumb {
          background: rgba(139, 64, 64, 0.22);
          border-radius: 3px;
        }
        .arsipBookScroll::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 64, 64, 0.4);
        }
        .arsipBookScroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(139, 64, 64, 0.22) transparent;
        }
        @keyframes arsipBackdropEnter {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .arsipBackdropEnter {
          animation: arsipBackdropEnter 280ms ease-out both;
        }
        @keyframes arsipModalEnter {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .arsipModalEnter {
          animation: arsipModalEnter 400ms cubic-bezier(0.2, 0.8, 0.3, 1) both;
        }
      `}</style>

      <article
        className="arsipModalEnter relative w-full max-w-2xl max-h-full flex flex-col rounded-sm overflow-hidden shadow-2xl"
        style={{
          backgroundColor: '#FDF6E3',
          // Layered background: SVG fractal noise (paper grain) +
          // radial gradient warm/cool tints (subtle paper aging).
          backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.6 0 0 0 0 0.5 0 0 0 0 0.4 0 0 0 0.08 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>',
          )}"),
          radial-gradient(circle at 30% 20%, rgba(212, 165, 116, 0.06) 0%, transparent 50%),
          radial-gradient(circle at 70% 80%, rgba(139, 64, 64, 0.05) 0%, transparent 60%)`,
          backgroundBlendMode: 'multiply, normal, normal',
          border: '1px solid rgba(58, 36, 24, 0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Book spine — left edge, lebar 8px dengan gradient ke kanan
            biar kerasa "ridge of book binding" (3D depth illusion).
            pointer-events-none supaya gak block click pada header buttons. */}
        <div
          className="pointer-events-none absolute top-0 bottom-0 left-0 w-2"
          style={{
            background: `linear-gradient(to right, ${book.spineColor}, ${book.spineColor}cc 70%, rgba(58, 36, 24, 0.5))`,
            boxShadow: 'inset -1px 0 0 rgba(0,0,0,0.15)',
          }}
        />
        {/* Page depth shadow — gradient gelap di sebelah kanan spine,
            kerasa "halaman bertemu binding." */}
        <div
          className="pointer-events-none absolute top-0 bottom-0"
          style={{
            left: '8px',
            width: '12px',
            background:
              'linear-gradient(to right, rgba(58, 36, 24, 0.18) 0%, rgba(58, 36, 24, 0.06) 50%, transparent 100%)',
          }}
        />
        {/* Page edge texture — top edge tipis darker, kerasa "tepi
            halaman kertas tebal." */}
        <div
          className="pointer-events-none absolute top-0 left-0 right-0 h-1"
          style={{
            background:
              'linear-gradient(to bottom, rgba(139, 90, 60, 0.3), transparent)',
          }}
        />
        {/* Bottom page edge */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-1"
          style={{
            background:
              'linear-gradient(to top, rgba(139, 90, 60, 0.25), transparent)',
          }}
        />

        {/* Header bar */}
        <header
          className="relative flex-shrink-0 px-6 sm:px-10 pt-5 pb-4 border-b border-[color:var(--retro-brown-dark)]/10"
          style={{ paddingLeft: 'calc(1.5rem + 8px)' }}
        >
          <div className="flex items-center justify-between gap-3 mb-1">
            <button
              type="button"
              onClick={onClose}
              className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--retro-brown-dark)]/60 hover:text-[color:var(--retro-burgundy)] transition"
              aria-label="Tutup halaman, kembali ke rak"
            >
              ← rak
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 -mr-2 rounded-full flex items-center justify-center text-[color:var(--retro-brown-dark)]/60 hover:text-[color:var(--retro-burgundy)] hover:bg-[color:var(--retro-brown-dark)]/5 transition text-xl"
              aria-label="Tutup"
            >
              ×
            </button>
          </div>
          {/* Reading progress bar */}
          <div
            className="h-px bg-[color:var(--retro-brown-dark)]/10 overflow-hidden -mx-6 sm:-mx-10"
            style={{ marginLeft: 'calc(-1.5rem - 8px)' }}
          >
            <div
              className="h-full transition-[width] duration-150"
              style={{
                width: `${progress * 100}%`,
                backgroundColor: 'var(--retro-burgundy)',
              }}
            />
          </div>
        </header>

        {/* Scrollable body — direct child of article flex column.
            flex-1 ngambil ruang antara header & footer. */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="arsipBookScroll flex-1 overflow-y-auto px-6 sm:px-10 py-6 sm:py-8"
          style={{ paddingLeft: 'calc(1.5rem + 8px)' }}
        >
          <div className="mb-6">
            <div className="text-[10px] uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-3">
              {book.eyebrow}
            </div>
            <h2
              id="arsip-book-title"
              className="text-[color:var(--retro-brown-dark)] leading-[1.15] mb-2"
              style={{
                fontFamily: '"Fraunces Variable", serif',
                fontStyle: 'italic',
                fontSize: 'clamp(24px, 4vw, 32px)',
                fontWeight: 500,
              }}
            >
              {book.title}
            </h2>
            <div className="text-[12px] text-[color:var(--retro-brown-dark)]/60">
              Sumber: {book.source}
            </div>
          </div>

          <div className="border-t border-[color:var(--retro-brown-dark)]/15 pt-6">
            <BookBody book={book} />
          </div>

          {/* Cross-link footer — "Lihat juga" untuk buku yang punya
              relasi ke ruangan lain. Tujuan: ngehubungin Arsip ke
              Konstelasi (via book.era) & Pohon (via category kebaikan).
              Untuk buku refleksi (tanpa era), kasih link ke /about
              (Armeniaca etymology fuller version). */}
          <CrossLinkFooter
            book={book}
            onClose={onClose}
            onNavigate={onNavigate}
            restored={restored}
          />
        </div>

        {/* Footer prev/next */}
        <footer
          className="relative flex-shrink-0 px-6 sm:px-10 py-3 border-t border-[color:var(--retro-brown-dark)]/10 bg-[color:var(--retro-cream)]/60 flex items-center justify-between gap-3 text-[11px]"
          style={{ paddingLeft: 'calc(1.5rem + 8px)' }}
        >
          {siblings.prev ? (
            <button
              type="button"
              onClick={() => onNavigate?.(siblings.prev.id)}
              className="flex-1 text-left text-[color:var(--retro-brown-dark)]/70 hover:text-[color:var(--retro-burgundy)] transition truncate"
            >
              ← <span className="italic">{siblings.prev.title}</span>
            </button>
          ) : (
            <div className="flex-1 text-[color:var(--retro-brown-dark)]/35 italic">
              buku pertama di rak ini
            </div>
          )}
          <div className="text-[10px] text-[color:var(--retro-brown-dark)]/50 px-2 whitespace-nowrap">
            {siblings.idx + 1} / {siblings.total}
          </div>
          {siblings.next ? (
            <button
              type="button"
              onClick={() => onNavigate?.(siblings.next.id)}
              className="flex-1 text-right text-[color:var(--retro-brown-dark)]/70 hover:text-[color:var(--retro-burgundy)] transition truncate"
            >
              <span className="italic">{siblings.next.title}</span> →
            </button>
          ) : (
            <div className="flex-1 text-right text-[color:var(--retro-brown-dark)]/35 italic">
              buku terakhir di rak ini
            </div>
          )}
        </footer>
      </article>
    </div>
  );
};

export default BookOverlay;
