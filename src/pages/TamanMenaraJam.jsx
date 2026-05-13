/**
 * ArmeniacaTown — Petak R4: Menara Jam.
 *
 * STUB FASE AWAL — peta entry udah live di /armeniacaTown/peta dengan
 * Petak Menara hover/click/preview wiring, tapi indoor scene-nya belum
 * dibangun. Page ini render placeholder "sedang dibangun" supaya route
 * /armeniacaTown/r4 gak 404 sambil scene-nya nyusul.
 *
 * Core mechanic yg disusun (per memory project_armeniacaTown_r4_menarajam.md):
 *   drought   (3000 ≤ count < 5000) — real-time WIB clock, hour-only
 *                                     (jarum menit hilang), bandul =
 *                                     countdown event terdekat ≤30 hari
 *                                     dgn fallback diam.
 *   restored  (count ≥ 5000)        — WIB clock 2-jarum, kaca patri glow,
 *                                     bel hourly chime (default mute),
 *                                     "Almanak Kota" panel = milestone
 *                                     ELI_TIMELINE + anniversary trigger.
 *
 * State: prop `restored` dari TamanR4RouteChooser di App.jsx.
 *   locked (count < 3000) ditangani di chooser (redirect ke peta).
 */

import React from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';

const TamanMenaraJamPage = ({ restored = false }) => {
  const eyebrow = restored ? 'Menara pulih' : 'Menara baru jalan';
  const bodyCopy = restored
    ? 'Menara jam pulih. Dua jarum lengkap, bel hourly chime sebentar lagi berdentang. Almanak Kota — daftar milestone perjalanan Eli — sedang ditulis ulang. Konten penuh menyusul.'
    : 'Menara jam mulai jalan. Hanya jarum hour yang akurat — jarum menit masih hilang. Bandul di bawah dial nungguin event Eli terdekat. Konten penuh menyusul.';

  return (
    <>
      <Seo
        title={`ArmeniacaTown — Menara Jam${restored ? ' (Pulih)' : ''}`}
        description="Petak Menara Jam di ArmeniacaTown — kota yang mulai inget waktu lagi."
        path="/armeniacaTown/r4"
      />
      <div className="relative min-h-screen bg-[#1a1018] text-white overflow-hidden">
        {/* Header — back link ke peta */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-20 md:px-6 md:pt-24 pb-4 md:pb-5">
          <Link
            to="/armeniacaTown/peta"
            className="text-white/50 hover:text-white/85 text-[10px] md:text-xs tracking-[0.15em] md:tracking-[0.2em] uppercase transition"
          >
            ← Peta Kota
          </Link>
          <div className="text-center">
            <div className="text-white/45 text-[8px] md:text-[9px] uppercase tracking-[0.35em] md:tracking-[0.45em] mb-0.5">
              ArmeniacaTown
            </div>
            <div
              className="text-white/85 text-[13px] md:text-sm tracking-wide"
              style={{
                fontFamily: '"Fraunces Variable", serif',
                fontStyle: 'italic',
              }}
            >
              Menara Jam
            </div>
          </div>
          <div className="w-[68px] md:w-[110px]" aria-hidden />
        </div>

        {/* Centered placeholder card */}
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <div className="max-w-md text-center">
            <div
              className="text-[9px] uppercase tracking-[0.4em] mb-3"
              style={{ color: restored ? '#f4d4a0' : '#c8a060' }}
            >
              {eyebrow}
            </div>
            <h1
              className="text-2xl sm:text-3xl mb-5 leading-tight text-white/90"
              style={{
                fontFamily: '"Fraunces Variable", serif',
                fontStyle: 'italic',
              }}
            >
              Menara Jam
            </h1>
            <p
              className="text-white/70 text-[13px] sm:text-sm leading-relaxed mb-8"
              style={{ fontFamily: '"Fraunces Variable", serif' }}
            >
              {bodyCopy}
            </p>
            <Link
              to="/armeniacaTown/peta"
              className="inline-block px-5 py-2.5 rounded-full border border-white/20 text-white/70 text-xs sm:text-sm hover:bg-white/10 hover:text-white transition"
            >
              ← Kembali ke peta
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default TamanMenaraJamPage;
