/**
 * RecapShareCard — "Bagikan rekap" button for one live recap. Renders an
 * off-screen 540×960 board (exported at 2× = 1080×1920, story size) and
 * shares it as a PNG (Web Share API on phones, download elsewhere).
 * Same capture approach as components/petikan/ShareCardImage.jsx.
 */

import React, { useRef, useState } from 'react';
import { fmtMinute } from '../lib/eliNotes';
import { fmtDuration, perMinuteAvg } from '../lib/liveRecaps';

const PLATFORM = { idn: 'IDN LIVE', showroom: 'SHOWROOM' };
const dayFmt = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
const fmtN = (n) => Number(n || 0).toLocaleString('id-ID');
const SERIF = "'Fraunces Variable', 'Fraunces', Georgia, serif";
const SANS = "'Plus Jakarta Sans Variable', 'Plus Jakarta Sans', system-ui, sans-serif";

const Board = ({ recap, insights }) => {
  const max = Math.max(1, ...recap.perMinute);
  const momentMinutes = new Set(recap.moments.map((m) => Math.floor(m.t / 60)));
  const day = dayFmt.format(new Date(recap.startedAt || `${recap.date}T12:00:00+07:00`));
  const stat = (value, label) => (
    <div>
      <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 44, lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ marginTop: 6, fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.55 }}>{label}</div>
    </div>
  );
  return (
    <div style={{ width: 540, height: 960, background: '#16110e', color: '#f4ece4', fontFamily: SANS, padding: '56px 44px 40px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, fontWeight: 900, letterSpacing: '0.22em' }}>
        <span style={{ background: '#e0464e', color: '#fff', borderRadius: 999, padding: '5px 11px' }}>● {PLATFORM[recap.platform]}</span>
        <span style={{ opacity: 0.6, textTransform: 'uppercase' }}>Rekap live</span>
      </div>
      <div style={{ marginTop: 18, fontSize: 15, opacity: 0.75 }}>{day}</div>
      <div style={{ marginTop: 26, fontFamily: SERIF, fontWeight: 900, textTransform: 'uppercase', fontSize: 74, lineHeight: 0.92, letterSpacing: '-0.02em' }}>
        {fmtDuration(recap.durationSec)}<br /><span style={{ color: '#c8952a' }}>bareng Eli.</span>
      </div>
      {recap.title && <div style={{ marginTop: 18, fontSize: 16, opacity: 0.7 }}>“{recap.title.slice(0, 70)}”</div>}

      {insights.length > 0 && (
        <div style={{ marginTop: 22, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {insights.slice(0, 2).map((b) => (
            <span key={b.text} style={{ border: '1px solid rgba(200,149,42,0.6)', color: '#e3bd6a', borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 800 }}>{b.text}</span>
          ))}
        </div>
      )}

      <div style={{ marginTop: 'auto', border: '1px solid rgba(244,236,228,0.14)', borderRadius: 18, padding: 22, background: '#201915' }}>
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.28em', color: '#e3bd6a' }}>DENYUT LIVE</div>
        <div style={{ marginTop: 14, height: 120, display: 'flex', alignItems: 'flex-end', gap: 2 }}>
          {recap.perMinute.slice(0, 180).map((v, i) => (
            <div key={i} style={{ flex: 1, height: `${Math.max(4, (v / max) * 100)}%`, borderRadius: '2px 2px 0 0', background: momentMinutes.has(i) ? '#c8952a' : i === recap.peak?.minute ? '#e0464e' : 'rgba(244,236,228,0.3)' }} />
          ))}
        </div>
        <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {stat(fmtN(recap.comments), 'komentar')}
          {stat(fmtN(recap.commenters), 'penonton berkomentar')}
          {stat(fmtN(perMinuteAvg(recap)), 'komentar / menit')}
          {stat(recap.moments[0] ? fmtMinute(recap.moments[0].t) : '-', 'momen paling ramai')}
        </div>
      </div>

      <div style={{ marginTop: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 24 }}>Armeniaca<span style={{ color: '#7c2d34' }}>.</span></span>
        <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.6 }}>armeniaca.online/rekap-live</span>
      </div>
    </div>
  );
};

const RecapShareCard = ({ recap, insights = [] }) => {
  const ref = useRef(null);
  const [status, setStatus] = useState('idle');
  const filename = `rekap-live-eli-${recap.id}.png`;

  const share = async () => {
    if (!ref.current) return;
    setStatus('capturing');
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      const { toBlob } = await import('html-to-image');
      const blob = await toBlob(ref.current, { pixelRatio: 2, cacheBust: true, backgroundColor: '#16110e' });
      if (!blob) throw new Error('empty image');
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Rekap live Eli', text: `Rekap live Eli · armeniaca.online/rekap-live/${recap.id}` });
          setStatus('done');
          setTimeout(() => setStatus('idle'), 2000);
          return;
        } catch (e) {
          if (e?.name === 'AbortError') { setStatus('idle'); return; }
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus('done');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (e) {
      console.error('[RekapLive] share failed:', e);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const label = { idle: 'Bagikan rekap', capturing: 'Menyiapkan gambar…', done: 'Berhasil ✓', error: 'Gagal, coba lagi' }[status];
  const icon = { idle: 'ri-share-line', capturing: 'ri-loader-4-line animate-spin', done: 'ri-check-line', error: 'ri-error-warning-line' }[status];

  return (
    <>
      {/* Off-screen holder; the capture target is the board inside it (capturing the
          moved holder itself would give an empty image). */}
      <div aria-hidden="true" style={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none' }}>
        <div ref={ref}><Board recap={recap} insights={insights} /></div>
      </div>
      <button
        type="button"
        onClick={share}
        disabled={status === 'capturing'}
        className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-[#16110e] disabled:opacity-60"
        style={{ background: 'var(--retro-gold)' }}
      >
        <i className={icon} /> {label}
      </button>
    </>
  );
};

export default RecapShareCard;
