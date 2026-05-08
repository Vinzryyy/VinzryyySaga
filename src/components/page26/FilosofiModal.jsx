import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Filosofi Pohon Kebaikan modal — opens the standalone parchment
 * poster at /filosofi-pohon-kebaikan.html inside an iframe so the
 * HTML stays the single source of truth (still shareable directly,
 * still readable on its own). The HTML hides its own back-link in
 * embed mode via the ?embed=1 query param.
 */
const FilosofiModal = ({ isOpen, onClose }) => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) setLoaded(false);
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Peta Filosofi Pohon Kebaikan"
    >
      <button
        type="button"
        aria-label="Tutup peta"
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-sm cursor-default animate-fade-in"
      />

      <div className="relative w-full h-full max-w-[1320px] flex flex-col animate-fade-in">
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full bg-[color:var(--retro-cream)] text-[color:var(--retro-burgundy)] hover:bg-[color:var(--retro-burgundy)] hover:text-[color:var(--retro-cream)] shadow-[0_4px_18px_rgba(0,0,0,0.4)] border-2 border-[color:var(--retro-burgundy)] transition-all duration-200"
        >
          <i className="ri-close-line text-xl sm:text-2xl" aria-hidden="true" />
        </button>

        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-[color:var(--retro-cream)]/80 font-header italic text-sm tracking-wide animate-pulse">
              Membuka peta filosofi…
            </div>
          </div>
        )}

        <iframe
          src="/filosofi-pohon-kebaikan.html?embed=1"
          title="Peta Filosofi Pohon Kebaikan"
          className="w-full h-full bg-[#2a201a] border-0 rounded shadow-2xl"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>,
    document.body,
  );
};

export default FilosofiModal;
