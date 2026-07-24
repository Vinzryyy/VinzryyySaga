/**
 * Photostrip — web photobox experience.
 *
 * Features:
 *  - 3-shot or 6-shot capture (user-selectable)
 *  - Gallery upload mode: pick photos from device (twibon-style)
 *  - Camera mode: 3-2-1 GSAP-animated countdown, shutter sound, auto-capture
 *  - Live thumbnail strip below camera (fills as shots are taken)
 *  - Review phase: per-slot re-take / re-upload + filter selector before compositing
 *  - Front / back camera toggle
 *  - Filters: Normal · Grayscale · Warm · Vintage (CSS + canvas)
 *  - Petal burst animation on result reveal
 *  - Web Share API (native share sheet on mobile)
 *  - iOS download: blob URL + share-first fallback
 *
 * Template: /Photobox/FRAME ARMEN 2.png  (1180 × 1770 px dual-strip)
 * Slot boundaries measured from PNG alpha-channel pixel scan.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import gsap from 'gsap';

// ─── Slot pixel boundaries (exact, from PNG alpha scan) ─────────────────────
const SLOT_PX = [
  { x: 41,  y: 192,  w: 495, h: 348 }, // left  1
  { x: 41,  y: 598,  w: 508, h: 348 }, // left  2
  { x: 41,  y: 1004, w: 508, h: 348 }, // left  3
  { x: 631, y: 192,  w: 508, h: 348 }, // right 1
  { x: 631, y: 598,  w: 508, h: 348 }, // right 2
  { x: 631, y: 1004, w: 508, h: 348 }, // right 3
];

// slot-to-shot mapping per shot count
// 3 shots: duplicate left column into right column
// 6 shots: each slot gets a unique photo
const SLOT_SHOT_MAP_3 = [0, 1, 2, 0, 1, 2];
const SLOT_SHOT_MAP_6 = [0, 1, 2, 3, 4, 5];

const FRAME_SRC        = '/Photobox/FRAME ARMEN 2.png';
const COUNTDOWN_START  = 3;
const BETWEEN_SHOTS_MS = 900;

const FILTERS = {
  none:      { label: 'Normal',    css: 'none' },
  grayscale: { label: 'Grayscale', css: 'grayscale(100%)' },
  warm:      { label: 'Warm',      css: 'sepia(40%) saturate(130%) brightness(108%)' },
  vintage:   { label: 'Vintage',   css: 'sepia(60%) contrast(88%) brightness(96%)' },
};

// ─── Web Audio shutter click ─────────────────────────────────────────────────
function playShutter() {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const len = Math.floor(ac.sampleRate * 0.06);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1);
    const src  = ac.createBufferSource();
    const gain = ac.createGain();
    src.buffer = buf;
    gain.gain.setValueAtTime(0.22, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.06);
    src.connect(gain);
    gain.connect(ac.destination);
    src.start();
    src.stop(ac.currentTime + 0.06);
    src.addEventListener('ended', () => ac.close());
  } catch {}
}

// ─── Petal burst at an element center ───────────────────────────────────────
function triggerPetalBurst(el) {
  if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top  + rect.height / 3;
  const FILLS = [
    'var(--retro-burgundy-light)', 'var(--retro-burgundy)',
    'var(--retro-sepia)', 'var(--retro-gold-light)',
  ];
  for (let i = 0; i < 14; i++) {
    const size = 8 + (i % 3) * 5;
    const fill = FILLS[i % FILLS.length];
    const node = document.createElement('div');
    node.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:9998;';
    node.innerHTML = `<svg width="${size}" height="${Math.round(size * 1.3)}" viewBox="0 0 24 32" aria-hidden="true">
      <path d="M12 2 C18 6,21 14,19 22 C17 28,13 30,12 30 C11 30,7 28,5 22 C3 14,6 6,12 2 Z" fill="${fill}"/>
    </svg>`;
    document.body.appendChild(node);
    const jit  = Date.now() % 1000;
    const ang  = (i / 14) * 360 + ((jit + i * 17) % 40) - 20;
    const rad  = (ang * Math.PI) / 180;
    const dist = 60 + ((jit + i * 31) % 70);
    gsap.fromTo(node,
      { x: cx - size / 2, y: cy - size / 2, scale: 0.2, opacity: 0.9, rotation: (jit + i * 53) % 360 },
      {
        x: cx - size / 2 + Math.cos(rad) * dist,
        y: cy - size / 2 + Math.sin(rad) * dist,
        scale: 1.2, opacity: 0,
        rotation: `+=${120 + (i % 3) * 80}`,
        duration: 0.65 + (i % 3) * 0.1,
        ease: 'power2.out',
        onComplete: () => node.remove(),
      }
    );
  }
}

// ─── Cover-crop helper ───────────────────────────────────────────────────────
function drawCoverCrop(ctx, shot, x, y, w, h, filterCss) {
  if (!shot) return;
  const sw0 = shot.videoWidth  ?? shot.naturalWidth  ?? shot.width;
  const sh0 = shot.videoHeight ?? shot.naturalHeight ?? shot.height;
  if (!sw0 || !sh0) return;
  const slotAR = w / h;
  const shotAR = sw0 / sh0;
  let sx = 0, sy = 0, sw = sw0, sh = sh0;
  if (shotAR > slotAR) {
    sw = Math.round(sh0 * slotAR);
    sx = Math.round((sw0 - sw) / 2);
  } else {
    sh = Math.round(sw0 / slotAR);
    sy = Math.round((sh0 - sh) / 2);
  }
  if (filterCss && filterCss !== 'none') ctx.filter = filterCss;
  ctx.drawImage(shot, sx, sy, sw, sh, x, y, w, h);
  ctx.filter = 'none';
}

// ─── dataURL → Blob ──────────────────────────────────────────────────────────
async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return res.blob();
}

// ────────────────────────────────────────────────────────────────────────────
export default function PhotostripPage() {
  // phase: 'idle' | 'camera' | 'gallery' | 'combo' | 'review' | 'result'
  const [phase, setPhase]               = useState('idle');
  const [shotCount, setShotCount]       = useState(3);       // 3 or 6
  const [inputMode, setInputMode]       = useState('camera'); // 'camera' | 'gallery' | 'combo'
  const [shotsTaken, setShotsTaken]     = useState(0);
  const [shotPreviews, setShotPreviews] = useState([]);
  const [countdown, setCountdown]       = useState(null);
  const [flash, setFlash]               = useState(false);
  const [resultUrl, setResultUrl]       = useState(null);
  const [cameraError, setCameraError]   = useState(null);
  const [facingMode, setFacingMode]     = useState('user');
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [canShare, setCanShare]         = useState(false);

  const videoRef             = useRef(null);
  const streamRef            = useRef(null);
  const canvasRef            = useRef(null);
  const frameImgRef          = useRef(null);
  const shotBufferRef        = useRef([]); // HTMLCanvasElement (camera) or HTMLImageElement (gallery)
  const timerRef             = useRef(null);
  const retakeSlotRef        = useRef(null);
  const facingModeRef        = useRef('user');
  const shotCountRef         = useRef(3);
  const countdownElRef       = useRef(null);
  const resultImgRef         = useRef(null);
  const galleryInputRef       = useRef(null);
  const pendingGallerySlotRef = useRef(null);
  const returnPhaseRef        = useRef('review'); // where retake-mode camera returns to

  // Keep refs in sync with state
  useEffect(() => { shotCountRef.current = shotCount; }, [shotCount]);

  // Preload frame image
  useEffect(() => {
    const img = new Image();
    img.src = FRAME_SRC;
    frameImgRef.current = img;
  }, []);

  // Check Web Share API support
  useEffect(() => {
    setCanShare(typeof navigator.share === 'function');
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    stopCamera();
    clearTimeout(timerRef.current);
  }, [stopCamera]);

  // ── GSAP animate countdown on each tick ──────────────────────────────────
  useEffect(() => {
    if (countdown !== null && countdownElRef.current) {
      gsap.fromTo(
        countdownElRef.current,
        { scale: 1.7, opacity: 1 },
        { scale: 1, opacity: 1, duration: 0.85, ease: 'power3.out' },
      );
    }
  }, [countdown]);

  // ── Composite shots + frame onto hidden canvas ────────────────────────────
  const composeStrip = useCallback(async (shots, filter, slotMap) => {
    const frameImg = frameImgRef.current;
    if (!frameImg.complete) {
      await new Promise(res => { frameImg.onload = res; });
    }
    const W = frameImg.naturalWidth;
    const H = frameImg.naturalHeight;
    const canvas = canvasRef.current;
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    SLOT_PX.forEach((slot, i) => {
      const shot = shots[slotMap[i]];
      drawCoverCrop(ctx, shot, slot.x, slot.y, slot.w, slot.h, FILTERS[filter].css);
    });

    ctx.filter = 'none';
    ctx.drawImage(frameImg, 0, 0, W, H);

    const url = canvas.toDataURL('image/jpeg', 0.95);
    setResultUrl(url);
    setPhase('result');

    // Petal burst after image renders
    requestAnimationFrame(() => {
      requestAnimationFrame(() => triggerPetalBurst(resultImgRef.current));
    });
  }, []);

  // ── Capture one frame from the live video ────────────────────────────────
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    const tmp = document.createElement('canvas');
    tmp.width  = video.videoWidth;
    tmp.height = video.videoHeight;
    const ctx = tmp.getContext('2d');

    // Mirror only for front camera (matches mirrored preview)
    if (facingModeRef.current === 'user') {
      ctx.translate(tmp.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    playShutter();
    setFlash(true);
    setTimeout(() => setFlash(false), 170);

    const previewUrl = tmp.toDataURL('image/jpeg', 0.6);

    if (retakeSlotRef.current !== null) {
      // Retake mode: replace single slot
      const slot = retakeSlotRef.current;
      shotBufferRef.current[slot] = tmp;
      setShotPreviews(prev => {
        const next = [...prev];
        next[slot] = previewUrl;
        return next;
      });
      retakeSlotRef.current = null;
      stopCamera();
      setCountdown(null);
      setPhase(returnPhaseRef.current);
    } else {
      // Normal mode: accumulate shots
      shotBufferRef.current.push(tmp);
      setShotPreviews(prev => [...prev, previewUrl]);
      const newCount = shotBufferRef.current.length;
      setShotsTaken(newCount);

      if (newCount >= shotCountRef.current) {
        stopCamera();
        setCountdown(null);
        setPhase('review');
      } else {
        timerRef.current = setTimeout(() => startCountdown(), BETWEEN_SHOTS_MS);
      }
    }
  }, [stopCamera]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 3-2-1 countdown then capture ─────────────────────────────────────────
  const startCountdown = useCallback(() => {
    let t = COUNTDOWN_START;
    setCountdown(t);
    const tick = () => {
      t--;
      if (t <= 0) {
        setCountdown(null);
        captureFrame();
      } else {
        setCountdown(t);
        timerRef.current = setTimeout(tick, 1000);
      }
    };
    timerRef.current = setTimeout(tick, 1000);
  }, [captureFrame]);

  // ── Start (or restart) camera stream ─────────────────────────────────────
  const startStream = useCallback(async (facing) => {
    setCameraError(null);
    stopCamera();
    clearTimeout(timerRef.current);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setPhase('camera');
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().then(() => {
            timerRef.current = setTimeout(() => startCountdown(), 700);
          });
        }
      });
    } catch {
      setCameraError('Tidak bisa mengakses kamera. Pastikan izin kamera sudah diberikan di browser kamu.');
    }
  }, [stopCamera, startCountdown]);

  // ── Gallery: open file picker for a specific slot ─────────────────────────
  const openGalleryPicker = useCallback((slotIndex) => {
    pendingGallerySlotRef.current = slotIndex;
    galleryInputRef.current?.click();
  }, []);

  // ── Gallery: handle file selected ─────────────────────────────────────────
  const handleGalleryFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset so same file can be picked again

    const reader = new FileReader();
    const dataUrl = await new Promise(resolve => {
      reader.onload = ev => resolve(ev.target.result);
      reader.readAsDataURL(file);
    });

    const img = new Image();
    await new Promise(resolve => { img.onload = resolve; img.src = dataUrl; });

    const slotIndex = pendingGallerySlotRef.current;
    if (slotIndex === null) return;

    shotBufferRef.current[slotIndex] = img;
    setShotPreviews(prev => {
      const next = [...prev];
      next[slotIndex] = dataUrl;
      return next;
    });
  }, []);

  // ── Combo: open camera for a single slot, return to combo after ──────────
  const handleComboCamera = useCallback((slotIndex) => {
    retakeSlotRef.current  = slotIndex;
    returnPhaseRef.current = 'combo';
    startStream(facingMode);
  }, [facingMode, startStream]);

  const handleStart = useCallback(() => {
    const n = shotCountRef.current;
    setShotsTaken(0);
    retakeSlotRef.current = null;

    if (inputMode === 'gallery' || inputMode === 'combo') {
      shotBufferRef.current = new Array(n).fill(null); // index-based assignment
      setShotPreviews(new Array(n).fill(null));
      setPhase(inputMode === 'combo' ? 'combo' : 'gallery');
    } else {
      returnPhaseRef.current = 'review';
      shotBufferRef.current  = []; // push-based, must start empty
      setShotPreviews([]);
      startStream(facingMode);
    }
  }, [facingMode, inputMode, startStream]);

  const handleFlip = useCallback(async () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    facingModeRef.current = next;
    setFacingMode(next);
    setCountdown(null);
    await startStream(next);
  }, [facingMode, startStream]);

  const handleRetakeSlot = useCallback((slotIndex) => {
    if (inputMode === 'gallery') {
      openGalleryPicker(slotIndex);
    } else if (inputMode === 'combo') {
      // Return to combo phase so user can pick camera or gallery for that slot
      setPhase('combo');
    } else {
      returnPhaseRef.current = 'review';
      retakeSlotRef.current  = slotIndex;
      startStream(facingMode);
    }
  }, [facingMode, inputMode, openGalleryPicker, startStream]);

  const handleBuildStrip = useCallback(() => {
    const map = shotCountRef.current === 6 ? SLOT_SHOT_MAP_6 : SLOT_SHOT_MAP_3;
    composeStrip(shotBufferRef.current, selectedFilter, map);
  }, [composeStrip, selectedFilter]);

  // ── Download / Share ──────────────────────────────────────────────────────
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  const handleDownload = async () => {
    try {
      const blob = await dataUrlToBlob(resultUrl);
      const file = new File([blob], `armeniaca-photostrip-${Date.now()}.jpg`, { type: 'image/jpeg' });

      if (isIos) {
        // iOS: try share sheet first (saves directly to camera roll)
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Armeniaca Photostrip' });
          return;
        }
        // Fallback: blob URL in new tab — user long-press saves
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
        return;
      }

      // Desktop / Android: anchor download via blob URL
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (err) {
      if (err.name === 'AbortError') return; // user cancelled share sheet
      // Final fallback: data URL
      const a = document.createElement('a');
      a.href = resultUrl;
      a.download = `armeniaca-photostrip-${Date.now()}.jpg`;
      a.click();
    }
  };

  const handleShare = async () => {
    if (!navigator.share) return;
    try {
      const blob = await dataUrlToBlob(resultUrl);
      const file = new File([blob], 'armeniaca-photostrip.jpg', { type: 'image/jpeg' });
      const payload = { title: 'HarmoniKebaikan × Armeniaca', files: [file] };
      if (navigator.canShare?.(payload)) {
        await navigator.share(payload);
      } else {
        await navigator.share({ title: 'HarmoniKebaikan × Armeniaca', url: window.location.href });
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.warn('Share failed', e);
    }
  };

  const handleRetry = () => {
    clearTimeout(timerRef.current);
    stopCamera();
    setResultUrl(null);
    setShotsTaken(0);
    setShotPreviews([]);
    setCountdown(null);
    setFlash(false);
    setSelectedFilter('none');
    setPhase('idle');
    // Keep shotCount and inputMode so user doesn't have to reselect
  };

  // Gallery phase: count of filled slots
  const gallerySlotsFilledCount = shotPreviews.filter(Boolean).length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <main
      className="min-h-screen flex flex-col items-center py-10 px-4"
      style={{ backgroundColor: 'var(--retro-bg-primary)' }}
    >
      <Helmet>
        <title>Web Photobox · Armeniaca</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Hidden canvas for compositing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden file input for gallery mode */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleGalleryFile}
      />

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-serif text-3xl mb-1" style={{ color: 'var(--retro-text-primary)' }}>
          Web Photobox
        </h1>
        <p className="text-sm" style={{ color: 'var(--retro-text-secondary)' }}>
          HarmoniKebaikan × Armeniaca
        </p>
      </div>

      {/* ── IDLE ─────────────────────────────────────────────────────────── */}
      {phase === 'idle' && (
        <div className="flex flex-col items-center gap-5 max-w-xs w-full">
          <img src={FRAME_SRC} alt="Bingkai HarmoniKebaikan" className="w-52 rounded-xl shadow-md" />

          {/* Shot count selector */}
          <div className="flex flex-col items-center gap-2 w-full">
            <span className="text-xs" style={{ color: 'var(--retro-text-muted)' }}>Jumlah foto</span>
            <div className="flex gap-2">
              {[3, 6].map(n => (
                <button
                  key={n}
                  onClick={() => setShotCount(n)}
                  className="px-5 py-1.5 rounded-full text-xs font-medium border-2 transition"
                  style={{
                    borderColor: shotCount === n ? 'var(--retro-burgundy)' : 'var(--retro-border)',
                    backgroundColor: shotCount === n ? 'var(--retro-burgundy)' : 'transparent',
                    color: shotCount === n ? 'var(--retro-cream)' : 'var(--retro-text-secondary)',
                  }}
                >
                  {n} foto
                </button>
              ))}
            </div>
          </div>

          {/* Input mode selector */}
          <div className="flex flex-col items-center gap-2 w-full">
            <span className="text-xs" style={{ color: 'var(--retro-text-muted)' }}>Mode</span>
            <div className="flex gap-2">
              {[
                { key: 'camera',  label: 'Kamera' },
                { key: 'gallery', label: 'Dari Galeri' },
                { key: 'combo',   label: 'Combo' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setInputMode(key)}
                  className="px-4 py-1.5 rounded-full text-xs font-medium border-2 transition"
                  style={{
                    borderColor: inputMode === key ? 'var(--retro-burgundy)' : 'var(--retro-border)',
                    backgroundColor: inputMode === key ? 'var(--retro-burgundy)' : 'transparent',
                    color: inputMode === key ? 'var(--retro-cream)' : 'var(--retro-text-secondary)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-sm text-center leading-relaxed" style={{ color: 'var(--retro-text-secondary)' }}>
            {inputMode === 'gallery'
              ? <>Pilih <strong>{shotCount} foto</strong> dari galeri untuk dimasukkan ke bingkai.</>
              : inputMode === 'combo'
              ? <>Tiap slot bisa kamu isi dari <strong>kamera</strong> atau <strong>galeri</strong> — bebas campur sesuai keinginan.</>
              : <>Abadikan momen bersama bingkai HarmoniKebaikan.<br />Ambil <strong>{shotCount} foto</strong> — hasilnya langsung bisa kamu download!</>
            }
          </p>

          {cameraError && (
            <p className="text-sm text-red-600 text-center">{cameraError}</p>
          )}

          <button
            onClick={handleStart}
            className="px-8 py-2.5 rounded-full font-semibold text-sm transition hover:opacity-90 active:scale-95"
            style={{ backgroundColor: 'var(--retro-burgundy)', color: 'var(--retro-cream)' }}
          >
            Mulai
          </button>
        </div>
      )}

      {/* ── CAMERA ───────────────────────────────────────────────────────── */}
      {phase === 'camera' && (
        <div className="flex flex-col items-center gap-3 w-full max-w-lg">
          {/* Progress dots */}
          <div className="flex items-center gap-2">
            {Array.from({ length: shotCount }, (_, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full border-2 transition-colors duration-300"
                style={{
                  borderColor: 'var(--retro-burgundy)',
                  backgroundColor: i < shotsTaken ? 'var(--retro-burgundy)' : 'transparent',
                }}
              />
            ))}
            <span className="ml-2 text-sm" style={{ color: 'var(--retro-text-secondary)' }}>
              Foto {Math.min(shotsTaken + 1, shotCount)} / {shotCount}
              {retakeSlotRef.current !== null && ` — ulangi slot ${retakeSlotRef.current + 1}`}
            </span>
          </div>

          {/* Camera viewport */}
          <div className="relative w-full aspect-[3/2] bg-black rounded-xl overflow-hidden shadow-lg">
            <video
              ref={videoRef}
              autoPlay playsInline muted
              className="w-full h-full object-cover"
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />

            {/* Countdown */}
            {countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <span
                  ref={countdownElRef}
                  className="text-white font-bold select-none text-[5rem] sm:text-[7rem]"
                  style={{ lineHeight: 1, textShadow: '0 2px 20px #000c' }}
                >
                  {countdown}
                </span>
              </div>
            )}

            {/* Flash */}
            {flash && <div className="absolute inset-0 bg-white pointer-events-none" />}

            {/* Flip camera button */}
            <button
              onClick={handleFlip}
              className="absolute bottom-3 right-3 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition active:scale-90"
              aria-label="Balik kamera"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 4v6h6"/><path d="M23 20v-6h-6"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
              </svg>
            </button>
          </div>

          {/* Live thumbnails */}
          <div className={`grid gap-2 w-full ${shotCount === 6 ? 'grid-cols-6' : 'grid-cols-3'}`}>
            {Array.from({ length: shotCount }, (_, i) => (
              <div
                key={i}
                className="aspect-[3/2] rounded-lg overflow-hidden border-2 transition-colors"
                style={{
                  borderColor: i < shotsTaken ? 'var(--retro-burgundy)' : 'var(--retro-border)',
                  backgroundColor: 'var(--retro-bg-secondary)',
                }}
              >
                {shotPreviews[i] ? (
                  <img src={shotPreviews[i]} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-xs" style={{ color: 'var(--retro-text-muted)' }}>{i + 1}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="text-xs" style={{ color: 'var(--retro-text-muted)' }}>
            Foto diambil otomatis saat hitungan mundur selesai
          </p>
        </div>
      )}

      {/* ── GALLERY ──────────────────────────────────────────────────────── */}
      {phase === 'gallery' && (
        <div className="flex flex-col items-center gap-5 w-full max-w-sm">
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--retro-text-primary)' }}>
              Pilih {shotCount} foto dari galeri
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--retro-text-muted)' }}>
              {gallerySlotsFilledCount} / {shotCount} foto dipilih
            </p>
          </div>

          {/* Upload slots grid */}
          <div className={`grid gap-3 w-full ${shotCount === 6 ? 'grid-cols-3' : 'grid-cols-3'}`}>
            {Array.from({ length: shotCount }, (_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <button
                  onClick={() => openGalleryPicker(i)}
                  className="w-full aspect-[3/2] rounded-lg overflow-hidden border-2 transition hover:opacity-80 flex items-center justify-center"
                  style={{
                    borderColor: shotPreviews[i] ? 'var(--retro-burgundy)' : 'var(--retro-border)',
                    backgroundColor: 'var(--retro-bg-secondary)',
                  }}
                  aria-label={shotPreviews[i] ? `Ganti foto ${i + 1}` : `Pilih foto ${i + 1}`}
                >
                  {shotPreviews[i] ? (
                    <img src={shotPreviews[i]} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--retro-text-muted)' }}>
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                      <path d="M21 15l-5-5L5 21"/>
                    </svg>
                  )}
                </button>
                <span className="text-[10px]" style={{ color: 'var(--retro-text-muted)' }}>
                  {shotPreviews[i] ? (
                    <button
                      onClick={() => openGalleryPicker(i)}
                      className="underline hover:opacity-70 transition"
                      style={{ color: 'var(--retro-text-secondary)' }}
                    >
                      Ganti
                    </button>
                  ) : `Slot ${i + 1}`}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setPhase('review')}
            disabled={gallerySlotsFilledCount < shotCount}
            className="w-full py-2.5 rounded-full font-semibold text-sm transition hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--retro-burgundy)', color: 'var(--retro-cream)' }}
          >
            Lanjut →
          </button>
          <button
            onClick={handleRetry}
            className="text-xs underline"
            style={{ color: 'var(--retro-text-muted)' }}
          >
            Mulai ulang
          </button>
        </div>
      )}

      {/* ── COMBO ────────────────────────────────────────────────────────── */}
      {phase === 'combo' && (
        <div className="flex flex-col items-center gap-5 w-full max-w-sm">
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--retro-text-primary)' }}>
              Pilih sumber tiap foto
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--retro-text-muted)' }}>
              {gallerySlotsFilledCount} / {shotCount} slot terisi · tap slot kosong untuk mengisi
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 w-full">
            {Array.from({ length: shotCount }, (_, i) => (
              <div key={i} className="flex flex-col gap-1">
                {shotPreviews[i] ? (
                  /* Filled slot — show preview + two replace buttons */
                  <>
                    <div
                      className="w-full aspect-[3/2] rounded-lg overflow-hidden border-2"
                      style={{ borderColor: 'var(--retro-burgundy)' }}
                    >
                      <img src={shotPreviews[i]} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleComboCamera(i)}
                        className="flex-1 py-0.5 rounded text-[10px] border transition hover:opacity-80 flex items-center justify-center"
                        style={{ borderColor: 'var(--retro-border-dark)', color: 'var(--retro-text-secondary)' }}
                        aria-label={`Ganti slot ${i + 1} via kamera`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => openGalleryPicker(i)}
                        className="flex-1 py-0.5 rounded text-[10px] border transition hover:opacity-80 flex items-center justify-center"
                        style={{ borderColor: 'var(--retro-border-dark)', color: 'var(--retro-text-secondary)' }}
                        aria-label={`Ganti slot ${i + 1} via galeri`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                        </svg>
                      </button>
                    </div>
                  </>
                ) : (
                  /* Empty slot — two stacked action buttons */
                  <div
                    className="w-full aspect-[3/2] rounded-lg border-2 flex flex-col overflow-hidden"
                    style={{ borderColor: 'var(--retro-border)', backgroundColor: 'var(--retro-bg-secondary)' }}
                  >
                    <button
                      onClick={() => handleComboCamera(i)}
                      className="flex-1 flex flex-col items-center justify-center gap-0.5 border-b transition hover:bg-black/5 active:scale-95"
                      style={{ borderColor: 'var(--retro-border)', color: 'var(--retro-text-secondary)' }}
                      aria-label={`Foto slot ${i + 1} via kamera`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                      </svg>
                      <span className="text-[9px]">Kamera</span>
                    </button>
                    <button
                      onClick={() => openGalleryPicker(i)}
                      className="flex-1 flex flex-col items-center justify-center gap-0.5 transition hover:bg-black/5 active:scale-95"
                      style={{ color: 'var(--retro-text-secondary)' }}
                      aria-label={`Foto slot ${i + 1} via galeri`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                      </svg>
                      <span className="text-[9px]">Galeri</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => setPhase('review')}
            disabled={gallerySlotsFilledCount < shotCount}
            className="w-full py-2.5 rounded-full font-semibold text-sm transition hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--retro-burgundy)', color: 'var(--retro-cream)' }}
          >
            Lanjut →
          </button>
          <button
            onClick={handleRetry}
            className="text-xs underline"
            style={{ color: 'var(--retro-text-muted)' }}
          >
            Mulai ulang
          </button>
        </div>
      )}

      {/* ── REVIEW ───────────────────────────────────────────────────────── */}
      {phase === 'review' && (
        <div className="flex flex-col items-center gap-5 w-full max-w-sm">
          <p className="text-sm font-medium" style={{ color: 'var(--retro-text-primary)' }}>
            Cek foto kamu
          </p>

          {/* Thumbnail slots with re-take / re-upload buttons */}
          <div className={`grid gap-2 w-full ${shotCount === 6 ? 'grid-cols-3' : 'grid-cols-3'}`}>
            {Array.from({ length: shotCount }, (_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className="w-full aspect-[3/2] rounded-lg overflow-hidden border-2"
                  style={{ borderColor: 'var(--retro-border)' }}
                >
                  {shotPreviews[i] && (
                    <img
                      src={shotPreviews[i]}
                      alt={`Foto ${i + 1}`}
                      className="w-full h-full object-cover"
                      style={{ filter: FILTERS[selectedFilter].css }}
                    />
                  )}
                </div>
                <button
                  onClick={() => handleRetakeSlot(i)}
                  className="text-[10px] px-2 py-0.5 rounded-full border transition hover:opacity-80"
                  style={{ borderColor: 'var(--retro-border-dark)', color: 'var(--retro-text-secondary)' }}
                >
                  {inputMode === 'camera' ? 'Ulangi' : 'Ganti'}
                </button>
              </div>
            ))}
          </div>

          {/* Filter selector */}
          <div className="flex flex-col items-center gap-2 w-full">
            <span className="text-xs" style={{ color: 'var(--retro-text-muted)' }}>Filter</span>
            <div className="flex gap-2 flex-wrap justify-center">
              {Object.entries(FILTERS).map(([key, { label }]) => (
                <button
                  key={key}
                  onClick={() => setSelectedFilter(key)}
                  className="px-3 py-1 rounded-full text-xs font-medium border-2 transition"
                  style={{
                    borderColor: selectedFilter === key ? 'var(--retro-burgundy)' : 'var(--retro-border)',
                    backgroundColor: selectedFilter === key ? 'var(--retro-burgundy)' : 'transparent',
                    color: selectedFilter === key ? 'var(--retro-cream)' : 'var(--retro-text-secondary)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleBuildStrip}
            className="w-full py-2.5 rounded-full font-semibold text-sm transition hover:opacity-90 active:scale-95"
            style={{ backgroundColor: 'var(--retro-burgundy)', color: 'var(--retro-cream)' }}
          >
            Buat Strip
          </button>
          <button
            onClick={handleRetry}
            className="text-xs underline"
            style={{ color: 'var(--retro-text-muted)' }}
          >
            Mulai ulang
          </button>
        </div>
      )}

      {/* ── RESULT ───────────────────────────────────────────────────────── */}
      {phase === 'result' && resultUrl && (
        <div className="flex flex-col items-center gap-5 w-full max-w-xs">
          <img
            ref={resultImgRef}
            src={resultUrl}
            alt="Hasil photostrip kamu"
            className="w-full rounded-xl shadow-lg"
          />
          <p className="text-xs text-center" style={{ color: 'var(--retro-text-muted)' }}>
            {isIos
              ? 'Tekan Download — pilih "Simpan Gambar" di menu share'
              : 'Tekan Download untuk menyimpan ke perangkat'}
          </p>
          <div className="flex gap-2 w-full">
            <button
              onClick={handleDownload}
              className="flex-1 py-2.5 rounded-full font-semibold text-sm transition hover:opacity-90 active:scale-95"
              style={{ backgroundColor: 'var(--retro-burgundy)', color: 'var(--retro-cream)' }}
            >
              Download
            </button>
            {canShare && !isIos && (
              <button
                onClick={handleShare}
                className="flex-1 py-2.5 rounded-full font-semibold text-sm border-2 transition hover:opacity-80 active:scale-95"
                style={{ borderColor: 'var(--retro-burgundy)', color: 'var(--retro-burgundy)' }}
              >
                Bagikan
              </button>
            )}
          </div>
          <button
            onClick={handleRetry}
            className="text-xs underline"
            style={{ color: 'var(--retro-text-muted)' }}
          >
            Foto ulang
          </button>
        </div>
      )}
    </main>
  );
}
