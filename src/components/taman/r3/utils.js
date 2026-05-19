/**
 * Utility helpers untuk scene Telaga Harapan.
 */

// Re-export centralized useIsMobile — kept here for backward compat
// dengan files yang import dari `r3/utils`. Single source of truth di
// `src/hooks/useMediaQuery.js`.
export { useIsMobile } from '../../../hooks/useMediaQuery';

export const lerp = (a, b, t) => a + (b - a) * t;

// Truncate untuk preview label di pad — biar nggak ngerampokin scene.
export const shortLabel = (text, maxWords = 4) => {
  const words = (text || '').trim().split(/\s+/);
  if (words.length <= maxWords) return text || '';
  return words.slice(0, maxWords).join(' ') + '…';
};

export const formatDate = (raw) => {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};
