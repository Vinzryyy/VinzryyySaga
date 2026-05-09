/**
 * Taman Kebaikan — Petak R3: Kolam Kata.
 *
 * Petak quote — kutipan dari catchphrase Eli + 10 quotes pilihan dari
 * siteConfig.countdown.gifts.quotes (yang dipake juga di gift box
 * reveal di /countdown). Visual: kolam teratai malam-hari dengan
 * lily pads mengambang, tiap pad punya kutipan kecil sebagai preview.
 * Hover pad → glow & label terang; click → modal full quote.
 *
 * Catchphrase Eli ditempatkan di tengah kolam sebagai "lily pad
 * besar" — iconic & jadi anchor visual. 10 quotes lain scatter
 * mengelilingi catchphrase di radius variasi.
 *
 * Palette lebih gelap dari Peta Taman (deeper night blue) — kolam
 * di waktu malam, bukan senja. Memberi sense of intimacy & quiet
 * reflection sesuai sifat kutipan.
 */

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, Stats } from '@react-three/drei';
import Seo from '../components/Seo';
import AmbientAudio from '../components/taman/AmbientAudio';
import { SITE_CONFIG } from '../config/siteConfig';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isMobile;
};

const lerp = (a, b, t) => a + (b - a) * t;

// Truncate kutipan untuk label di lily pad — supaya nggak ngerampokin
// scene visual. Ambil 3-4 kata pertama, kasih ellipsis.
const shortLabel = (text, maxWords = 4) => {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '…';
};

// Lily pad mengambang — disc datar dengan slight tilt random per pad
// supaya nggak kerasa kayak grid. Hover lift Y + emissive glow di
// material. Click → trigger modal di parent.
const LilyPad = ({ pad, hovered, onPointerOver, onPointerOut, onClick }) => {
  const groupRef = useRef();
  const matRef = useRef();

  useFrame((state, delta) => {
    if (!groupRef.current || !matRef.current) return;

    // Idle gentle bob — masing-masing pad ngambang naik turun pelan
    // sesuai phase berbeda (deterministik dari posisi). Sin wave
    // multiplied by 0.04 = ~4cm amplitude.
    const idleY = Math.sin(state.clock.elapsedTime * 0.6 + pad.phase) * 0.04;
    const targetY = (hovered ? 0.18 : 0) + idleY;
    const targetEmissive = hovered ? 0.5 : 0.05;
    const factor = Math.min(delta * 7, 1);
    groupRef.current.position.y = lerp(
      groupRef.current.position.y,
      targetY,
      factor
    );
    matRef.current.emissiveIntensity = lerp(
      matRef.current.emissiveIntensity,
      targetEmissive,
      factor
    );
  });

  const padRadius = pad.isCenter ? 1.0 : 0.62;

  return (
    <group
      ref={groupRef}
      position={pad.pos}
      rotation={[0, pad.tilt, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        onPointerOver(pad.id);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onPointerOut(pad.id);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(pad);
      }}
    >
      {/* Lily pad: disc datar dengan sedikit thickness biar kelihatan
          dari 3/4 angle. Pakai cylinderGeometry rendah, bukan
          planeGeometry, supaya ada side surface yang catch light. */}
      <mesh rotation={[0, 0, 0]}>
        <cylinderGeometry args={[padRadius, padRadius, 0.05, 24]} />
        <meshStandardMaterial
          ref={matRef}
          color={pad.color}
          emissive={pad.color}
          emissiveIntensity={0.05}
          roughness={0.65}
          metalness={0.0}
        />
      </mesh>
      {/* Bunga teratai kecil di tengah pad untuk yang catchphrase —
          highlight visual */}
      {pad.isCenter && (
        <mesh position={[0, 0.04, 0]}>
          <sphereGeometry args={[0.18, 12, 8]} />
          <meshStandardMaterial
            color="#f4c8d8"
            emissive="#f4c8d8"
            emissiveIntensity={0.25}
            roughness={0.5}
          />
        </mesh>
      )}
      <Html
        position={[0, pad.isCenter ? 0.5 : 0.4, 0]}
        center
        distanceFactor={11}
        occlude={false}
      >
        <div
          className={`text-center pointer-events-none select-none transition-all duration-300 ease-out ${
            hovered ? '-translate-y-1' : ''
          }`}
          style={{ minWidth: pad.isCenter ? '180px' : '140px' }}
        >
          {pad.isCenter && (
            <div className="text-emerald-300/80 text-[8px] uppercase tracking-[0.25em] mb-1">
              Catchphrase
            </div>
          )}
          <div
            className={`leading-snug transition-colors ${
              pad.isCenter
                ? 'text-[11px] font-medium'
                : 'text-[10px]'
            } ${hovered ? 'text-white' : 'text-white/75'}`}
            style={{
              fontFamily: pad.isCenter
                ? '"Fraunces Variable", serif'
                : 'inherit',
              fontStyle: pad.isCenter ? 'italic' : 'normal',
            }}
          >
            {pad.isCenter ? shortLabel(pad.text, 6) : shortLabel(pad.text, 4)}
          </div>
        </div>
      </Html>
    </group>
  );
};

// Permukaan air kolam — plane besar warna deep night blue dengan
// metalness sedikit + roughness moderate biar ada subtle reflection.
// Sengaja static (no wave) untuk simpenan — bisa di-upgrade ke
// shaderMaterial dengan vertex displacement nanti kalau perlu.
const Water = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
    <planeGeometry args={[28, 28]} />
    <meshStandardMaterial
      color="#0d1f3a"
      roughness={0.55}
      metalness={0.35}
    />
  </mesh>
);

// Lapisan ground di luar kolam — kasih frame visual supaya kolam
// nggak kerasa floating in void.
const Edge = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]}>
    <planeGeometry args={[60, 60]} />
    <meshStandardMaterial color="#0a1320" roughness={1} />
  </mesh>
);

const KolamScene = ({
  pads,
  hoveredPadId,
  onPadHover,
  onPadOut,
  onPadClick,
}) => (
  <>
    <fog attach="fog" args={['#0a1320', 14, 38]} />
    <color attach="background" args={['#0a1320']} />
    <ambientLight intensity={0.4} color="#a8c5e0" />
    <directionalLight
      position={[6, 10, 4]}
      intensity={0.9}
      color="#cfe0f0"
    />
    <directionalLight
      position={[-4, 6, -4]}
      intensity={0.4}
      color="#d8b8a0"
    />
    <Edge />
    <Water />
    {pads.map((pad) => (
      <LilyPad
        key={pad.id}
        pad={pad}
        hovered={hoveredPadId === pad.id}
        onPointerOver={onPadHover}
        onPointerOut={onPadOut}
        onClick={onPadClick}
      />
    ))}
    <OrbitControls
      target={[0, 0, 0]}
      enableZoom
      minDistance={10}
      maxDistance={22}
      enablePan={false}
      minPolarAngle={Math.PI / 4.5}
      maxPolarAngle={Math.PI / 2.5}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.4}
    />
  </>
);

const SceneFallback = () => (
  <div className="absolute inset-0 grid place-items-center bg-[#0a1320] text-white/50 text-sm">
    Memuat kolam kata...
  </div>
);

const KolamHeader = () => (
  <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-5">
    <div className="pointer-events-auto">
      <Link
        to="/taman/peta"
        className="text-white/50 hover:text-white/85 text-xs tracking-[0.2em] uppercase transition"
      >
        ← Peta Taman
      </Link>
    </div>
    <div
      className="text-white/85 text-sm tracking-wide"
      style={{
        fontFamily: '"Fraunces Variable", serif',
        fontStyle: 'italic',
      }}
    >
      Kolam Kata
    </div>
    <div className="pointer-events-auto">
      <Link
        to="/"
        className="text-white/50 hover:text-white/85 text-xs tracking-[0.2em] uppercase transition"
      >
        Keluar →
      </Link>
    </div>
  </div>
);

const KolamFooter = ({ hoveredPadId, totalPads }) => {
  const hint = hoveredPadId
    ? 'Klik untuk baca lengkap'
    : `Pilih satu dari ${totalPads} kata yang mengambang · drag untuk berputar`;
  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-white/40 text-[10px] uppercase tracking-[0.2em] text-center">
      {hint}
    </div>
  );
};

const QuoteOverlay = ({ pad, onClose }) => {
  useEffect(() => {
    if (!pad) return undefined;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = orig;
    };
  }, [pad]);

  if (!pad) return null;
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 backdrop-blur-md"
      onClick={onClose}
      style={{ animation: 'fadeIn 300ms ease-out' }}
    >
      <div
        className="bg-[#0d1f3a]/95 border border-white/15 rounded-2xl px-8 py-9 max-w-lg mx-6"
        onClick={(e) => e.stopPropagation()}
      >
        {pad.isCenter && (
          <div className="text-emerald-300/80 text-[10px] uppercase tracking-[0.25em] mb-4">
            Catchphrase Eli
          </div>
        )}
        <p
          className="text-white text-xl md:text-2xl leading-relaxed mb-6"
          style={{
            fontFamily: '"Fraunces Variable", serif',
            fontStyle: 'italic',
          }}
        >
          “{pad.text}”
        </p>
        {!pad.isCenter && (
          <p className="text-white/45 text-xs leading-relaxed mb-6 tracking-wide">
            Kata ini termasuk dalam koleksi yang muncul di gift reveal
            countdown ulang tahun Eli.
          </p>
        )}
        <button
          type="button"
          onClick={onClose}
          className="w-full px-5 py-2.5 rounded-full border border-white/30 text-white/85 text-sm hover:bg-white/10 transition"
        >
          Kembali ke kolam
        </button>
      </div>
    </div>
  );
};

const TamanKolamKataPage = () => {
  const isMobile = useIsMobile();
  const [hoveredPadId, setHoveredPadId] = useState(null);
  const [selectedPad, setSelectedPad] = useState(null);

  // Susun pads: 1 catchphrase di tengah, 10 quotes scatter di sekeliling.
  // Posisi deterministik berdasar index — angle bertambah 36° per quote
  // (10 quotes = 360°), radius variasi 4-5.5 supaya nggak kelihatan
  // kayak ring perfect. Tilt random per pad.
  const pads = useMemo(() => {
    const items = [];
    items.push({
      id: 'catchphrase',
      text: SITE_CONFIG.eli.catchphrase,
      isCenter: true,
      pos: [0, 0, 0],
      color: '#9bc474',
      tilt: 0,
      phase: 0,
    });
    const quotes = SITE_CONFIG.countdown.gifts.quotes || [];
    quotes.forEach((q, i) => {
      const angle = (i / quotes.length) * Math.PI * 2 + 0.4;
      const radius = 4 + (i % 3) * 0.8;
      const tilt = ((i * 73) % 360) * (Math.PI / 180);
      items.push({
        id: `q-${i}`,
        text: q,
        isCenter: false,
        pos: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
        color: i % 3 === 0 ? '#7a9d5e' : i % 3 === 1 ? '#86a868' : '#94b878',
        tilt,
        phase: i * 0.7,
      });
    });
    return items;
  }, []);

  useEffect(() => {
    document.body.style.cursor = hoveredPadId ? 'pointer' : 'auto';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hoveredPadId]);

  const handlePadHover = (id) => setHoveredPadId(id);
  const handlePadOut = (id) =>
    setHoveredPadId((c) => (c === id ? null : c));
  const handlePadClick = (pad) => {
    setSelectedPad(pad);
    setHoveredPadId(null);
  };
  const handleClose = () => setSelectedPad(null);

  return (
    <>
      <Seo
        title="Kolam Kata"
        description="Kolam teratai dengan kata-kata Eli mengambang — catchphrase + kutipan dari koleksi Armeniaca."
        path="/taman/r3"
      />
      <div className="relative w-full h-screen bg-[#0a1320] overflow-hidden select-none">
        <Suspense fallback={<SceneFallback />}>
          <Canvas
            camera={{ fov: 40, position: [8, 9, 8] }}
            dpr={isMobile ? [1, 1] : [1, 2]}
            gl={{
              antialias: !isMobile,
              powerPreference: 'high-performance',
            }}
            shadows={false}
            onCreated={({ camera }) => {
              camera.lookAt(0, 0, 0);
            }}
          >
            <KolamScene
              pads={pads}
              hoveredPadId={hoveredPadId}
              onPadHover={handlePadHover}
              onPadOut={handlePadOut}
              onPadClick={handlePadClick}
            />
            {import.meta.env.DEV && <Stats />}
          </Canvas>
        </Suspense>

        <KolamHeader />
        <KolamFooter hoveredPadId={hoveredPadId} totalPads={pads.length} />
        <QuoteOverlay pad={selectedPad} onClose={handleClose} />
        <AmbientAudio profile="taman" position="top-right" />
      </div>
    </>
  );
};

export default TamanKolamKataPage;
