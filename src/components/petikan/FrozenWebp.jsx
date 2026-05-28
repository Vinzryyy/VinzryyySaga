/**
 * FrozenWebp — render animated WebP/GIF yang freeze di first frame
 * default state. Animasi mulai jalan saat pointer hover / focus.
 * Solves lag waktu grid render 50+ animated WebPs barengan (BukuPetikan
 * koleksi, Memori Hari Ini journal, Pack Terakhir row).
 *
 * Trik: paint first frame ke <canvas> untuk resting state. Saat pointer
 * masuk, mount overlay <img> animated di atas canvas — browser decode
 * + animate dari frame 0 setiap kali mount, jadi gak ada state animasi
 * yang persist saat unhover.
 *
 * Props mirror <img>: src + alt + className + style + objectFit.
 * className applied ke wrapper; canvas + img inherit dimensi via inset.
 * Filter passed via style — applied ke kedua canvas + img biar visual
 * konsisten antar hover state.
 */

import React, { useEffect, useRef, useState } from 'react';

const FrozenWebp = ({
  src,
  alt = '',
  className = '',
  style,
  objectFit = 'cover',
}) => {
  const [playing, setPlaying] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!src) return undefined;
    let cancelled = false;
    const img = new Image();
    img.decoding = 'async';
    const onLoad = () => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const w = img.naturalWidth || 200;
      const h = img.naturalHeight || 200;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
    };
    img.addEventListener('load', onLoad);
    img.src = src;
    return () => {
      cancelled = true;
      img.removeEventListener('load', onLoad);
    };
  }, [src]);

  const handleEnter = () => setPlaying(true);
  const handleLeave = () => setPlaying(false);

  return (
    <span
      className={`relative block w-full h-full ${className}`}
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
    >
      <canvas
        ref={canvasRef}
        aria-label={alt}
        role="img"
        style={{
          width: '100%',
          height: '100%',
          objectFit,
          display: 'block',
          ...style,
        }}
      />
      {playing && (
        <img
          src={src}
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit,
            ...style,
          }}
        />
      )}
    </span>
  );
};

export default FrozenWebp;
