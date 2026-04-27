/**
 * LightboxContext — global lightbox state. Any component can call
 * useLightbox().open(images, index) to launch the fullscreen viewer.
 *
 * The Lightbox modal itself is mounted by the provider (after children),
 * so opening it doesn't require prop-drilling a portal target. Body
 * scroll is locked while open.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import Lightbox from '../components/ui/Lightbox';

const LightboxContext = createContext(null);

export const LightboxProvider = ({ children }) => {
  const [images, setImages] = useState([]);
  const [index, setIndex] = useState(-1);
  const isOpen = index >= 0 && images.length > 0;

  const open = useCallback((nextImages, nextIndex = 0) => {
    if (!Array.isArray(nextImages) || nextImages.length === 0) return;
    const safe = Math.max(0, Math.min(nextIndex, nextImages.length - 1));
    setImages(nextImages);
    setIndex(safe);
  }, []);

  const close = useCallback(() => {
    setIndex(-1);
  }, []);

  const next = useCallback(() => {
    setIndex((i) => (i < 0 ? -1 : (i + 1) % images.length));
  }, [images.length]);

  const prev = useCallback(() => {
    setIndex((i) => (i < 0 ? -1 : (i - 1 + images.length) % images.length));
  }, [images.length]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  return (
    <LightboxContext.Provider value={{ open, close, next, prev, images, index, isOpen }}>
      {children}
      <Lightbox />
    </LightboxContext.Provider>
  );
};

export const useLightbox = () => {
  const ctx = useContext(LightboxContext);
  if (!ctx) throw new Error('useLightbox must be used within LightboxProvider');
  return ctx;
};

export default LightboxContext;
