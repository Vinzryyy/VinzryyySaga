/**
 * VideotronDisplay — side-by-side portrait screens for the Videotron Project.
 *
 * Two 486×972 (1:2) screens. Autoplays muted on mount.
 * Replay button appears after the video ends.
 */

import React, { useRef, useState, useEffect } from 'react';

const SCREENS = [
  {
    id: 'sisi-a',
    src: '/videotron2k26sts/0601a.mp4',
    label: 'Sisi A',
    sublabel: 'Arah Taman Literasi',
  },
  {
    id: 'sisi-b',
    src: '/videotron2k26sts/0601b.mp4',
    label: 'Sisi B',
    sublabel: 'Arah MRT Blok M',
  },
];

const VideotronScreen = ({ src, label, sublabel }) => {
  const videoRef = useRef(null);
  const [ended, setEnded] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return undefined;
    const tryPlay = () => {
      el.play()
        .then(() => setPlaying(true))
        .catch(() => {});
    };
    // Small delay so the page has painted before autoplaying
    const id = window.setTimeout(tryPlay, 300);
    const onPlay  = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => { setPlaying(false); setEnded(true); };
    el.addEventListener('play',  onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onEnded);
    return () => {
      window.clearTimeout(id);
      el.removeEventListener('play',  onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onEnded);
    };
  }, []);

  const handleReplay = () => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = 0;
    el.play().catch(() => {});
    setEnded(false);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Outer monitor frame */}
      <div
        className="relative w-full"
        style={{ aspectRatio: '486 / 972' }}
      >
        {/* Bezel */}
        <div className="absolute inset-0 rounded-2xl bg-[color:var(--retro-brown-dark)] shadow-[0_20px_60px_rgba(0,0,0,0.45)] p-[6px]">
          {/* Screen */}
          <div className="relative w-full h-full rounded-[14px] overflow-hidden bg-black">
            <video
              ref={videoRef}
              src={src}
              className="w-full h-full object-cover"
              muted
              playsInline
              preload="auto"
            />

            {/* Replay overlay — shown after video ends */}
            {ended && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={handleReplay}
                  aria-label={`Putar ulang ${label}`}
                  className="flex flex-col items-center gap-3 group"
                >
                  <span className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/15 border border-white/30 flex items-center justify-center group-hover:bg-white/25 transition-colors text-3xl sm:text-4xl">
                    🔁
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-[0.35em] text-white/70">
                    Putar Ulang
                  </span>
                </button>
              </div>
            )}

            {/* Playing indicator dot */}
            {playing && !ended && (
              <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                <span className="text-[8px] font-black uppercase tracking-wider text-white/70">Live</span>
              </div>
            )}
          </div>
        </div>

        {/* Screen glare overlay */}
        <div
          aria-hidden="true"
          className="absolute inset-[6px] rounded-[14px] pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%)',
          }}
        />
      </div>

      {/* Screen label */}
      <div className="text-center">
        <p className="text-xs sm:text-sm font-black tracking-tight text-[color:var(--retro-text-primary)]">
          {label}
        </p>
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] mt-0.5">
          {sublabel}
        </p>
      </div>
    </div>
  );
};

const VideotronDisplay = () => (
  <div className="flex flex-col items-center gap-8">
    {/* Screens wrapper — constrained so portrait screens don't tower too tall */}
    <div className="grid grid-cols-2 gap-5 sm:gap-8 md:gap-10 w-full max-w-sm sm:max-w-md md:max-w-lg mx-auto">
      {SCREENS.map((s) => (
        <VideotronScreen
          key={s.id}
          src={s.src}
          label={s.label}
          sublabel={s.sublabel}
        />
      ))}
    </div>

    {/* Location note */}
    <p className="inline-flex items-center gap-2 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.35em] text-[color:var(--color-text-muted)]">
      <i className="ri-map-pin-2-line" />
      Pillar MRT Blok M · 15 Juni 2026
    </p>
  </div>
);

export default VideotronDisplay;
