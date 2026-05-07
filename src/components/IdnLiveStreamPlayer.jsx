/**
 * IdnLiveStreamPlayer — clean HLS player for IDN live streams.
 *
 * Why this exists: watching the same stream on idn.app shows full-screen
 * gift animations, comment overlays, and platform chrome that distract
 * from just hearing/seeing the broadcaster. This component pulls the raw
 * AWS-IVS .m3u8 playback URL from our /api/idn-status proxy and plays
 * it in a plain <video>, no overlays.
 *
 * Two playback paths:
 *   1. Native HLS (Safari, iOS, some Android) — set src directly,
 *      browser handles the manifest.
 *   2. hls.js (Chrome, Firefox, Edge) — lazy-loaded so it only ships
 *      to viewers who actually open a live stream.
 *
 * Failure handling is **soft**: AWS-IVS commonly rejects manifest fetches
 * from any origin that isn't idn.app, so playback failure is the *expected*
 * path for many viewers, not the exception. Instead of surfacing a red
 * error card, we drop into "poster mode" — the existing posterUrl fills
 * the frame, gradient overlay for legibility, and a single inviting CTA
 * to open IDN App. Visually it reads as a preview card, not a crash.
 *
 * NOTE: Bypassing IDN's player means the broadcaster doesn't see this
 * viewer's view count or receive their gifts. This is a conscious
 * tradeoff for a less-distracting watch experience; the "Tonton di IDN
 * App" CTA stays prominently visible so engaged viewers can switch
 * over when they want to send support.
 */

import React, { useEffect, useRef, useState } from 'react';

const IdnLiveStreamPlayer = ({
  playbackUrl,
  posterUrl,
  externalUrl,
  title,
  viewCount,
}) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | failed
  const [failReason, setFailReason] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!playbackUrl || !videoRef.current) return undefined;
    const video = videoRef.current;

    // Native HLS path — Safari, iOS, some Android. Trying this first
    // means desktop Safari users skip the hls.js download entirely.
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = playbackUrl;
      const onLoaded = () => setStatus('ready');
      const onError = () => {
        setStatus('failed');
        setFailReason('manifest');
      };
      video.addEventListener('loadedmetadata', onLoaded, { once: true });
      video.addEventListener('error', onError, { once: true });
      setStatus('loading');
      return () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onError);
        video.removeAttribute('src');
        video.load();
      };
    }

    // Non-native HLS path — lazy-load hls.js. The chunk is ~30KB
    // gzip; only viewers who actually open a live stream pay for it.
    let cancelled = false;
    setStatus('loading');
    (async () => {
      try {
        const { default: Hls } = await import('hls.js');
        if (cancelled) return;
        if (!Hls.isSupported()) {
          setStatus('failed');
          setFailReason('manifest');
          return;
        }
        const hls = new Hls({
          // Low-latency knobs — IDN streams typically run ~3-6s behind
          // realtime; these settings push toward the lower bound.
          maxBufferLength: 8,
          maxMaxBufferLength: 16,
          liveSyncDuration: 3,
          // Quietly retry transient network blips before giving up.
          manifestLoadingMaxRetry: 3,
          fragLoadingMaxRetry: 3,
        });
        hlsRef.current = hls;
        hls.loadSource(playbackUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!cancelled) setStatus('ready');
        });
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (cancelled) return;
          if (data.fatal) {
            // Distinguish CORS/manifest rejection from mid-stream
            // network drops so the fallback copy reads accurately.
            const reason =
              data.type === Hls.ErrorTypes.NETWORK_ERROR &&
              data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR
                ? 'manifest'
                : 'network';
            setStatus('failed');
            setFailReason(reason);
          }
        });
      } catch {
        if (!cancelled) {
          setStatus('failed');
          setFailReason('manifest');
        }
      }
    })();

    return () => {
      cancelled = true;
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch {
          /* noop */
        }
        hlsRef.current = null;
      }
    };
  }, [playbackUrl]);

  const handlePlayClick = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = false;
    videoRef.current.play().then(
      () => setIsPlaying(true),
      () => setIsPlaying(false),
    );
  };

  if (!playbackUrl) return null;

  // When playback fails, we slip into poster mode and the LIVE badge is
  // only honest if the stream is still actually live. `ended` is the one
  // failure reason where the upstream told us the broadcast is over.
  const isFailed = status === 'failed';
  const isEnded = isFailed && failReason === 'ended';
  const showLiveBadge = !isEnded;
  // Hide the corner IDN App link in failed state — the central CTA takes
  // over so we don't render two competing buttons in one card.
  const showCornerExternalLink = externalUrl && !isFailed;

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-xl shadow-black/30">
      {/* The actual video element. autoplay+muted satisfies browser
          autoplay policies; an explicit unmute button below kicks in
          full audio when the viewer asks for it. playsInline keeps
          iOS in inline mode instead of forcing fullscreen. */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        controls={isPlaying}
        poster={posterUrl}
        className="absolute inset-0 w-full h-full object-contain bg-black"
      />

      {/* Top-left LIVE badge */}
      {showLiveBadge && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-md">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
            </span>
            Live
          </span>
          {typeof viewCount === 'number' && viewCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-black/55 backdrop-blur-sm text-white text-[10px] font-black tabular-nums">
              <i className="ri-eye-line" />
              {viewCount.toLocaleString('id-ID')}
            </span>
          )}
        </div>
      )}

      {/* Top-right "open in IDN" — visible while playing so engaged
          viewers can switch over to leave gifts/comments. */}
      {showCornerExternalLink && (
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/55 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black/75 transition-colors"
          title="Tonton di IDN App"
        >
          <i className="ri-broadcast-line" />
          IDN App
          <i className="ri-arrow-right-up-line" />
        </a>
      )}

      {/* Title overlay — bottom of the player */}
      {title && (
        <div className="absolute inset-x-0 bottom-0 z-[5] px-3 pt-8 pb-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none">
          <p className="text-white text-sm font-bold leading-tight line-clamp-2 drop-shadow-md">
            {title}
          </p>
        </div>
      )}

      {/* Loading state */}
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-none">
          <div className="flex flex-col items-center gap-3 text-white">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">
              Memuat live…
            </span>
          </div>
        </div>
      )}

      {/* Unmute prompt — shows when ready+autoplaying muted, hides
          once the user has explicitly enabled audio. */}
      {status === 'ready' && !isPlaying && (
        <button
          type="button"
          onClick={handlePlayClick}
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 hover:bg-black/45 transition-colors"
          aria-label="Aktifkan suara live"
        >
          <span className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/95 text-black text-xs font-black uppercase tracking-[0.2em] shadow-2xl">
            <i className="ri-volume-up-line text-base" />
            Aktifkan Suara
          </span>
        </button>
      )}

      {/* Failure fallback — soft poster mode. The poster fills the
          frame (so the card reads as a preview, not a broken player)
          and the entire surface is one big tappable CTA into IDN App. */}
      {isFailed && (
        <>
          {posterUrl && (
            <img
              src={posterUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/30"
          />
          {externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={isEnded ? 'Live sudah selesai — buka di IDN App' : 'Tonton di IDN App'}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 group focus:outline-none"
            >
              <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-600/95 group-hover:bg-red-600 group-hover:scale-110 shadow-2xl shadow-black/40 transition-all">
                <i className={`${isEnded ? 'ri-history-line' : 'ri-broadcast-line'} text-white text-3xl`} />
              </span>
              <span className="px-4 py-2 rounded-full bg-white/95 text-black text-[10px] font-black uppercase tracking-[0.25em] shadow-xl">
                {isEnded ? 'Live Selesai · IDN App' : 'Tonton di IDN App'}
              </span>
            </a>
          )}
        </>
      )}
    </div>
  );
};

export default IdnLiveStreamPlayer;
