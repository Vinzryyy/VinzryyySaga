/**
 * Photostrip — web photobox experience.
 *
 * Features:
 *  - 3-shot capture with 3-2-1 GSAP-animated countdown
 *  - Shutter click sound (Web Audio, no file needed)
 *  - Live thumbnail strip below camera (fills as shots are taken)
 *  - Review phase: per-slot re-take + filter selector before compositing
 *  - Front / back camera toggle
 *  - Filters: Normal · Grayscale · Warm · Vintage (CSS + canvas)
 *  - Petal burst animation on result reveal
 *  - Web Share API (native share sheet on mobile)
 *  - iOS-aware download fallback
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
const SLOT_SHOT_MAP = [0, 1, 2, 0, 1, 2];

const FRAME_SRC   = '/Photobox/FRAME ARMEN 2.png';
const TOTAL_SHOTS = 3;
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
  const slotAR = w / h;
  const shotAR = shot.width / shot.height;
  let sx = 0, sy = 0, sw = shot.width, sh = shot.height;
  if (shotAR > slotAR) {
    sw = Math.round(shot.height * slotAR);
    sx = Math.round((shot.width - sw) / 2);
  } else {
    sh = Math.round(shot.width / slotAR);
    sy = Math.round((shot.height - sh) / 2);
  }
  if (filterCss && filterCss !== 'none') ctx.filter = filterCss;
  ctx.drawImage(shot, sx, sy, sw, sh, x, y, w, h);
  ctx.filter = 'none';
}

// ────────────────────────────────────────────────────────────────────────────
export default function PhotostripPage() {
  // phase: 'idle' | 'camera' | 'review' | 'result'
  const [phase, setPhase]               = useState('idle');
  const [shotsTaken, setShotsTaken]     = useState(0);
  const [shotPreviews, setShotPreviews] = useState([]); // data URLs for thumbnails
  const [countdown, setCountdown]       = useState(null);
  const [flash, setFlash]               = useState(false);
  const [resultUrl, setResultUrl]       = useState(null);
  const [cameraError, setCameraError]   = useState(null);
  const [facingMode, setFacingMode]     = useState('user');
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [canShare, setCanShare]         = useState(false);

  const videoRef       = useRef(null);
  const streamRef      = useRef(null);
  const canvasRef      = useRef(null);
  const frameImgRef    = useRef(null);
  const shotBufferRef  = useRef([]); // raw HTMLCanvasElements
  const timerRef       = useRef(null);
  const retakeSlotRef  = useRef(null); // null = normal flow, N = retake slot N
  const facingModeRef  = useRef('user');
  const countdownElRef = useRef(null);
  const resultImgRef   = useRef(null);

  // Preload frame image
  useEffect(() => {
    const img = new Image();
    img.src = FRAME_SRC;
    frameImgRef.current = img;
  }, []);

  // Check Web Share API file support
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

  // ── GSAP animate countdown on each tick ────────────────────────────────
  useEffect(() => {
    if (countdown !== null && countdownElRef.current) {
      gsap.fromTo(
        countdownElRef.current,
        { scale: 1.7, opacity: 1 },
        { scale: 1, opacity: 1, duration: 0.85, ease: 'power3.out' },
      );
    }
  }, [countdown]);

  // ── Composite shots + frame onto hidden canvas ──────────────────────────
  const composeStrip = useCallback(async (shots, filter) => {
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
      drawCoverCrop(ctx, shots[SLOT_SHOT_MAP[i]], slot.x, slot.y, slot.w, slot.h, FILTERS[filter].css);
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

  // ── Capture one frame from the live video ──────────────────────────────
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
      setPhase('review');
    } else {
      // Normal mode: accumulate shots
      shotBufferRef.current.push(tmp);
      setShotPreviews(prev => [...prev, previewUrl]);
      const newCount = shotBufferRef.current.length;
      setShotsTaken(newCount);

      if (newCount >= TOTAL_SHOTS) {
        stopCamera();
        setCountdown(null);
        setPhase('review');
      } else {
        timerRef.current = setTimeout(() => startCountdown(), BETWEEN_SHOTS_MS);
      }
    }
  }, [stopCamera]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 3-2-1 countdown then capture ────────────────────────────────────────
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

  const handleStart = useCallback(() => {
    shotBufferRef.current = [];
    setShotsTaken(0);
    setShotPreviews([]);
    retakeSlotRef.current = null;
    startStream(facingMode);
  }, [facingMode, startStream]);

  const handleFlip = useCallback(async () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    facingModeRef.current = next;
    setFacingMode(next);
    setCountdown(null);
    await startStream(next);
  }, [facingMode, startStream]);

  const handleRetakeSlot = useCallback((slotIndex) => {
    retakeSlotRef.current = slotIndex;
    startStream(facingMode);
  }, [facingMode, startStream]);

  const handleBuildStrip = useCallback(() => {
    composeStrip(shotBufferRef.current, selectedFilter);
  }, [composeStrip, selectedFilter]);

  // ── Download / Share ──────────────────────────────────────────────────────
  const handleDownload = () => {
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIos) { window.open(resultUrl, '_blank'); return; }
    const a = document.createElement('a');
    a.href     = resultUrl;
    a.download = `armeniaca-photostrip-${Date.now()}.jpg`;
    a.click();
  };

  const handleShare = async () => {
    if (!navigator.share) return;
    try {
      const blob = await fetch(resultUrl).then(r => r.blob());
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
    setResultUrl(null);
    setShotsTaken(0);
    setShotPreviews([]);
    setCountdown(null);
    setFlash(false);
    setSelectedFilter('none');
    setPhase('idle');
  };

  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

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

      <canvas ref={canvasRef} className="hidden" />

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
        <div className="flex flex-col items-center gap-6 max-w-xs w-full">
          <img src={FRAME_SRC} alt="Bingkai HarmoniKebaikan" className="w-52 rounded-xl shadow-md" />
          <p className="text-sm text-center leading-relaxed" style={{ color: 'var(--retro-text-secondary)' }}>
            Abadikan momen bersama bingkai HarmoniKebaikan.<br />
            Ambil <strong>3 foto</strong> — hasilnya langsung bisa kamu download!
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
            {Array.from({ length: TOTAL_SHOTS }, (_, i) => (
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
              Foto {Math.min(shotsTaken + 1, TOTAL_SHOTS)} / {TOTAL_SHOTS}
              {retakeSlotRef.current !== null && ` — ulangi slot ${retakeSlotRef.current + 1}`}
            </span>
          </div>

          {/* Camera viewport — aspect matches actual slot ratio (508×348 ≈ 3:2) */}
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
          <div className="flex gap-2 w-full justify-center">
            {Array.from({ length: TOTAL_SHOTS }, (_, i) => (
              <div
                key={i}
                className="flex-1 aspect-[3/2] rounded-lg overflow-hidden border-2 transition-colors"
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

      {/* ── REVIEW ───────────────────────────────────────────────────────── */}
      {phase === 'review' && (
        <div className="flex flex-col items-center gap-5 w-full max-w-sm">
          <p className="text-sm font-medium" style={{ color: 'var(--retro-text-primary)' }}>
            Cek foto kamu
          </p>

          {/* 3 thumbnail slots with re-take buttons */}
          <div className="flex gap-2 w-full">
            {Array.from({ length: TOTAL_SHOTS }, (_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
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
                  Ulangi
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

          {/* CTA */}
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
              ? 'Tahan foto di atas → Simpan Gambar'
              : 'Tekan Download untuk menyimpan'}
          </p>
          <div className="flex gap-2 w-full">
            <button
              onClick={handleDownload}
              className="flex-1 py-2.5 rounded-full font-semibold text-sm transition hover:opacity-90 active:scale-95"
              style={{ backgroundColor: 'var(--retro-burgundy)', color: 'var(--retro-cream)' }}
            >
              Download
            </button>
            {canShare && (
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
