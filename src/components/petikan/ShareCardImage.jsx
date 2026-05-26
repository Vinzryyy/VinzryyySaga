/**
 * ShareCardImage — capture KartuIngatan sebagai PNG dan share/download.
 * Mobile: Web Share API kalau available (file sharing supported).
 * Desktop / fallback: download via <a download>.
 *
 * Capture target = off-screen clone KartuIngatan (fixed position
 * -10000px). Live card di KartuFlip pakai CSS rotateY 180 buat front,
 * yang bikin html-to-image capture-nya backwards. Off-screen instance
 * normal-oriented → clean capture.
 *
 * Pre-flight: tunggu document.fonts.ready biar Fraunces Variable
 * loaded sebelum capture — kalau gak fonts fall back ke generic serif
 * di hasil PNG.
 *
 * html-to-image di-dynamic-import biar gak masuk first-paint bundle
 * Petikan page. Cost cuma ~5KB lazy.
 */

import React, { useRef, useState } from 'react';
import KartuIngatan from './KartuIngatan';

const ShareCardImage = ({ card }) => {
  const captureRef = useRef(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'capturing' | 'success' | 'error'

  const slug = (card.id || 'petikan').replace(/[^a-z0-9-]/gi, '-');
  const filename = `petikan-${slug}.png`;

  const handleShare = async () => {
    if (!captureRef.current) return;
    setStatus('capturing');
    try {
      // Wait for fonts (Fraunces Variable) — critical for typography
      // match dgn live card.
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      // Dynamic import — html-to-image masuk lazy chunk biar bundle
      // utama Petikan tetep ringan.
      const { toBlob } = await import('html-to-image');
      const blob = await toBlob(captureRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#faf6ed', // retro-cream literal
      });

      if (!blob) {
        throw new Error('Capture returned null blob');
      }

      // Mobile Web Share API — try file share first
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], filename, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `${card.title} — Petikan`,
              text: 'Satu kenangan dari Pohon Aprikot · armeniaca.online/petikan',
            });
            setStatus('success');
            setTimeout(() => setStatus('idle'), 2000);
            return;
          } catch (shareErr) {
            // User cancelled share dialog — not an error
            if (shareErr?.name === 'AbortError') {
              setStatus('idle');
              return;
            }
            // Other share error — fall through to download
          }
        }
      }

      // Desktop / fallback — trigger download via temporary anchor
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      console.error('[Petikan] Share failed:', err);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const label =
    status === 'capturing'
      ? 'Menyiapkan…'
      : status === 'success'
        ? 'Berhasil ✓'
        : status === 'error'
          ? 'Gagal — coba lagi'
          : 'Bagikan kartu';

  const icon =
    status === 'capturing'
      ? 'ri-loader-4-line animate-spin'
      : status === 'success'
        ? 'ri-check-line'
        : status === 'error'
          ? 'ri-error-warning-line'
          : 'ri-share-line';

  return (
    <>
      {/* Off-screen capture target — fixed position outside viewport,
          rendered always (no display:none), captured on demand */}
      <div
        ref={captureRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: '-10000px',
          top: 0,
          width: '320px',
          minHeight: '480px',
          pointerEvents: 'none',
        }}
      >
        <KartuIngatan card={card} />
      </div>

      <button
        type="button"
        onClick={handleShare}
        disabled={status === 'capturing'}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-[0.18em] border transition ${
          status === 'error'
            ? 'border-[color:var(--retro-burgundy)]/50 text-[color:var(--retro-burgundy)] bg-[color:var(--retro-burgundy)]/5'
            : 'border-[color:var(--retro-burgundy)]/30 text-[color:var(--retro-burgundy)] hover:bg-[color:var(--retro-burgundy)]/10'
        } disabled:opacity-60 disabled:cursor-wait`}
        aria-label={label}
      >
        <i className={`${icon} text-sm`} />
        <span>{label}</span>
      </button>
    </>
  );
};

export default ShareCardImage;
