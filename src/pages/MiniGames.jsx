/**
 * /mini-games — the Armeniaca arcade.
 *
 * Games are a way to remember moments, not the goal (docs/prinsip-armeniaca.md),
 * so the page leads with today's small routine ("Hari ini"), then one
 * featured game, then the rest. Every card shows the game's own art and
 * where this visitor stands (read from what the games keep in the browser;
 * see lib/arcadeStatus.js). Layout borrows the "pick your experience"
 * pattern (big type, thin-lined cards with a label, divider and an arrow
 * row) in Armeniaca's own colours and type.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import { POHON_APRIKOT_POOL } from '../data/pohonAprikot';
import { armepackStatus, memoryStatus, quizStatus, todayList } from '../lib/arcadeStatus';
import { useEliNotes } from '../hooks/useEliNotes';
import { QUIZ_MIN_NOTES, quizPool } from '../lib/eliNotes';
import './miniGamesHub.css';

const EM = (f) => `/EmoteLabs/${encodeURI(f)}`;
const PACK_ART = [
  EM('Arme_Lightstick 2_2026-05-27-07-49-14.webp'),
  EM('Arme_Sparkling_2026-05-27-07-52-00.webp'),
  EM('Arme_Score (10 Point)_2026-05-27-07-50-54.webp'),
];
const MEMORY_TILES = ['/archive/img-036.webp', null, '/archive/img-142.webp', null, null, '/archive/img-211.webp'];
const SOON = [
  { icon: 'ri-question-answer-line', title: 'Kuis Harian' },
  { icon: 'ri-music-2-line', title: 'Ritme' },
];

const useStatus = () => {
  const read = () => {
    const armepack = armepackStatus(POHON_APRIKOT_POOL);
    const quiz = quizStatus();
    const memory = memoryStatus();
    return { armepack, quiz, memory, today: todayList({ armepack, quiz, memory }) };
  };
  const [status, setStatus] = useState(read);
  useEffect(() => {
    // Coming back from a game in another tab: refresh the routine.
    const refresh = () => setStatus(read());
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);
  return status;
};

const Arrow = ({ children }) => (
  <span className="hub-arrow">
    {children} <i className="ri-arrow-right-line" />
  </span>
);

// ── Pieces ───────────────────────────────────────────────────────────

const Today = ({ items }) => {
  const done = items.filter((x) => x.done).length;
  return (
    <aside className="hub-today" aria-label="Rutinitas hari ini">
      <div className="hub-today__head">
        <span className="hub-eyebrow">Hari ini</span>
        <span className="hub-today__count">{done}/{items.length}</span>
      </div>
      <ul>
        {items.map((x) => (
          <li key={x.id}>
            <Link to={x.to} className={`hub-today__row ${x.done ? 'is-done' : ''}`}>
              <span className="hub-check" aria-hidden="true">{x.done ? <i className="ri-check-line" /> : null}</span>
              <span className="hub-today__text">
                <b>{x.label}</b>
                <span>{x.detail}</span>
              </span>
              {!x.done && <i className="ri-arrow-right-line hub-today__go" aria-hidden="true" />}
            </Link>
          </li>
        ))}
      </ul>
      <p className="hub-today__foot">{done === items.length ? 'Semua beres. Sampai besok!' : 'Reset setiap tengah malam WIB.'}</p>
    </aside>
  );
};

const Featured = ({ s }) => {
  const pct = s.total ? Math.round((s.owned / s.total) * 100) : 0;
  return (
    <Link to="/armepack" className="hub-featured group">
      <div className="hub-featured__art" aria-hidden="true">
        {PACK_ART.map((src, i) => (
          <img key={src} src={src} alt="" loading="lazy" className={`hub-pack hub-pack--${i}`} />
        ))}
      </div>
      <div className="hub-featured__body">
        <span className="hub-eyebrow">Unggulan · koleksi kartu harian</span>
        <h2 className="hub-title hub-title--xl">ArmePack</h2>
        <p className="hub-text">
          Tiga kartu tiap hari dari <i>The Life of Armeniaca</i>. Kumpulkan ke dalam <b>Binder</b>, lengkapi set, tukar kartu dobel jadi buah.
        </p>
        <div className="hub-stats">
          <div><b>{s.owned}/{s.total}</b><span>kartu</span></div>
          <div><b>{s.setsComplete}/{s.setsTotal}</b><span>set lengkap</span></div>
          <div><b>{s.buah}</b><span>buah</span></div>
        </div>
        <div className="hub-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progres koleksi ArmePack">
          <span style={{ width: `${pct}%` }} />
        </div>
        <div className="hub-featured__foot">
          <span className={`hub-chip ${s.canPluck ? 'is-ready' : ''}`}>
            {s.canPluck ? '● Petikan gratis siap' : 'Sudah dipetik hari ini'}
            {s.rewardsWaiting > 0 ? ` · ${s.rewardsWaiting} hadiah set menunggu` : ''}
          </span>
          <span className="hub-btn">{s.canPluck ? 'Petik sekarang' : 'Buka binder'} <i className="ri-arrow-right-line" /></span>
        </div>
      </div>
    </Link>
  );
};

const GameCard = ({ to, label, title, text, art, status, cta = 'Main', locked = false }) => {
  const Tag = locked ? 'div' : Link;
  return (
    <Tag {...(locked ? {} : { to })} className={`hub-card group ${locked ? 'is-locked' : ''}`}>
      <div className="hub-card__art" aria-hidden="true">{art}</div>
      <div className="hub-card__body">
        <span className="hub-eyebrow">{label}</span>
        <h3 className="hub-title">{title}</h3>
        <p className="hub-text">{text}</p>
        <div className="hub-card__foot">
          <span className="hub-card__status">{status}</span>
          {!locked && <Arrow>{cta}</Arrow>}
        </div>
      </div>
    </Tag>
  );
};

// ── Page ─────────────────────────────────────────────────────────────

const MiniGames = () => {
  const { armepack, memory, today } = useStatus();
  const { notes } = useEliNotes();
  const tebak = useMemo(() => quizPool(notes), [notes]);

  return (
    <div className="hub min-h-screen pb-20">
      <Seo
        path="/mini-games"
        title="Mini Games"
        description="Arcade Armeniaca: ArmePack, Pasangkan Momen, Tebak Momen, dan ArmeniacaTown. Main sebentar tiap hari sambil mengingat momen-momen Eli JKT48."
      />

      <header className="hub-hero">
        <div className="hub-wrap hub-hero__grid">
          <div>
            <span className="hub-eyebrow"><i className="ri-gamepad-line" /> Arcade Armeniaca</span>
            <h1 className="hub-hero__title">
              Main sambil<br /><span>mengingat.</span>
            </h1>
            <p className="hub-hero__lead">
              Setiap game di sini dibuat dari arsip penggemar. Menang itu bonus; yang penting momennya teringat lagi.
            </p>
          </div>
          <Today items={today} />
        </div>
      </header>

      <main className="hub-wrap">
        <Featured s={armepack} />

        <div className="hub-grid">
          <GameCard
            to="/mini-games/memory"
            label="Memori · harian & tantangan"
            title="Pasangkan Momen"
            text="Cocokkan pasangan foto Eli dari arsip. Papan harian dengan peringkat, plus Mode Tantangan 7 tingkat."
            status={<>{memory.dailyDone}/{memory.dailyTotal} papan hari ini{memory.challenge ? <> · <i className="ri-trophy-line" /> {memory.challenge}</> : ''}</>}
            art={
              <div className="hub-tiles">
                {MEMORY_TILES.map((src, i) => (
                  <span key={i} className={`hub-tile ${src ? 'is-open' : ''}`}>{src ? <img src={src} alt="" loading="lazy" /> : <i className="ri-question-mark" />}</span>
                ))}
              </div>
            }
          />
          <GameCard
            to="/mini-games/tebak-momen"
            label="Tebakan · dari Eli Notes"
            title="Tebak Momen"
            text="Eli bilang ini di live hari apa? Lima kutipan, lengkap dengan cerita di baliknya."
            locked={!tebak.ready}
            status={tebak.ready
              ? 'Siap dimainkan'
              : <>Terbuka setelah {QUIZ_MIN_NOTES} kutipan · <b>{Math.min(tebak.quoted.length, QUIZ_MIN_NOTES)}/{QUIZ_MIN_NOTES}</b></>}
            art={
              <div className="hub-quote">
                <span className="hub-quote__tape" />
                <span className="hub-quote__text">“Kok kalian bisa sih?”</span>
                <span className="hub-quote__opts"><span>Rabu</span><span className="is-right">Kamis</span><span>Sabtu</span></span>
              </div>
            }
          />
          <GameCard
            to="/armeniacaTown"
            label="Jelajah · tumbuh bersama"
            title="ArmeniacaTown"
            text="Kota kecil yang tumbuh dari setiap siraman penggemar. Jelajahi sudut-sudutnya."
            status="Sudut baru terbuka seiring kota tumbuh"
            cta="Jelajahi"
            art={
              <div className="hub-town">
                <svg viewBox="0 0 240 120" role="presentation">
                  <circle cx="200" cy="28" r="14" fill="#e3bd6a" opacity="0.9" />
                  <path d="M0 96 Q60 80 120 92 T240 88 V120 H0Z" fill="#c8b39a" />
                  <rect x="22" y="58" width="34" height="40" fill="#fffaf0" stroke="#5c4a3a" strokeWidth="2" />
                  <path d="M18 60 L39 40 L60 60Z" fill="#7c2d34" />
                  <rect x="34" y="78" width="10" height="20" fill="#5c4a3a" />
                  <rect x="70" y="48" width="44" height="50" fill="#fffaf0" stroke="#5c4a3a" strokeWidth="2" />
                  <path d="M66 50 L92 28 L118 50Z" fill="#c8952a" />
                  <rect x="78" y="58" width="10" height="10" fill="#e3bd6a" /><rect x="96" y="58" width="10" height="10" fill="#e3bd6a" />
                  <rect x="150" y="66" width="30" height="32" fill="#fffaf0" stroke="#5c4a3a" strokeWidth="2" />
                  <path d="M146 68 L165 50 L184 68Z" fill="#7c2d34" />
                  <rect x="196" y="70" width="6" height="28" fill="#5c4a3a" />
                  <circle cx="199" cy="62" r="16" fill="#4f6b5a" /><circle cx="191" cy="56" r="4" fill="#e0a3a8" /><circle cx="206" cy="64" r="4" fill="#e0a3a8" />
                </svg>
                <img src={EM('Arme_Arrive_2026-05-27-07-48-05.webp')} alt="" loading="lazy" />
              </div>
            }
          />
        </div>

        <p className="hub-soon">
          <span className="hub-eyebrow">Segera hadir</span>
          {SOON.map((g) => <span key={g.title} className="hub-soon__item"><i className={g.icon} /> {g.title}</span>)}
        </p>
      </main>
    </div>
  );
};

export default MiniGames;
