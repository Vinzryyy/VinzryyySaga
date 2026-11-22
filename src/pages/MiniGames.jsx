/**
 * /mini-games — one place for every Armeniaca game.
 *
 * Games are a way to remember moments, not the goal (docs/prinsip-armeniaca.md),
 * so each card says what you'll remember, not just how to win.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import { getChallengeRecord } from '../lib/miniGamesStorage';
import { STAGE_COUNT } from '../lib/memoryChallenge';

const GAMES = [
  {
    to: '/mini-games/memory',
    icon: 'ri-layout-grid-line',
    title: 'Pasangkan Momen',
    text: 'Cocokkan pasangan foto Eli dari arsip. Ada mode Harian dengan papan peringkat dan Mode Tantangan 7 tingkat.',
    tag: 'Baru',
    cover: '/archive/img-036.webp',
  },
  {
    to: '/armepack',
    icon: 'ri-leaf-line',
    title: 'ArmePack',
    text: 'Tiga kartu tiap hari dari The Life of Armeniaca. Kumpulkan, baca ceritanya.',
    cover: '/archive/img-142.webp',
  },
  {
    to: '/armeniacaTown',
    icon: 'ri-map-pin-2-line',
    title: 'ArmeniacaTown',
    text: 'Kota kecil yang tumbuh dari setiap siraman penggemar. Jelajahi sudut-sudutnya.',
    cover: '/archive/img-211.webp',
  },
];

const SOON = [
  { icon: 'ri-question-answer-line', title: 'Kuis Harian', text: 'Satu pertanyaan tiap hari tentang perjalanan Eli.' },
  { icon: 'ri-music-2-line', title: 'Ritme', text: 'Ikuti ketukan lagu-lagu yang dibawakan Eli.' },
];

const MiniGames = () => {
  const [record] = useState(() => getChallengeRecord());

  return (
    <div className="min-h-screen bg-[color:var(--retro-bg-primary)] pb-20">
      <Seo
        path="/mini-games"
        title="Mini Games"
        description="Mini games Armeniaca: Pasangkan Momen, ArmePack, dan ArmeniacaTown. Cara santai mengingat momen-momen Eli JKT48."
      />

      <header className="relative overflow-hidden pt-24 sm:pt-28 pb-10 px-4 sm:px-6">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'url(/archive/img-310.webp)', backgroundSize: 'cover', backgroundPosition: '50% 30%' }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, rgba(61,52,43,0.9) 0%, rgba(92,74,58,0.75) 55%, rgba(124,45,52,0.6) 100%)' }}
        />
        <div className="relative max-w-5xl mx-auto">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] inline-flex items-center gap-2 text-[color:var(--retro-gold-light)]">
            <i className="ri-gamepad-line text-base" /> Arme Games
          </p>
          <h1 className="mt-2 font-header text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Main sambil mengingat
          </h1>
          <p className="mt-2 text-sm sm:text-base text-[color:var(--retro-cream)]/85 max-w-xl">
            Setiap game di sini dibuat dari arsip penggemar. Menang itu bonus; yang penting momennya teringat lagi.
          </p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((g) => (
            <li key={g.to}>
              <Link
                to={g.to}
                className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white border border-[color:var(--retro-brown-dark)]/12 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-[color:var(--retro-cream-dark)]">
                  <img src={g.cover} alt="" loading="lazy" className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                  {g.tag && (
                    <span className="absolute top-3 left-3 rounded-full bg-[color:var(--retro-gold)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--retro-brown-dark)]">
                      {g.tag}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="font-header text-xl font-black text-[color:var(--retro-text-primary)] inline-flex items-center gap-2">
                    <i className={`${g.icon} text-[color:var(--retro-burgundy)]`} /> {g.title}
                  </h2>
                  <p className="mt-2 text-sm text-[color:var(--retro-text-secondary)] leading-relaxed flex-1">{g.text}</p>
                  {g.to === '/mini-games/memory' && record && (
                    <p className="mt-3 text-xs font-bold text-[color:var(--retro-burgundy)]">
                      <i className="ri-trophy-line" /> Rekor Tantanganmu:{' '}
                      {record.cleared ? `tamat ${STAGE_COUNT}/${STAGE_COUNT}` : `Tingkat ${record.stage}/${STAGE_COUNT}`}
                    </p>
                  )}
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.2em] text-[color:var(--retro-burgundy)]">
                    Main <i className="ri-arrow-right-line group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <h2 className="mt-12 text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-text-muted)]">Sedang disiapkan</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {SOON.map((g) => (
            <li key={g.title} className="flex items-start gap-3 rounded-2xl border border-dashed border-[color:var(--retro-brown-dark)]/20 p-4">
              <i className={`${g.icon} text-xl text-[color:var(--retro-text-muted)]`} />
              <div>
                <p className="font-bold text-sm text-[color:var(--retro-text-primary)]">{g.title}</p>
                <p className="text-xs text-[color:var(--retro-text-secondary)] mt-0.5">{g.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default MiniGames;
