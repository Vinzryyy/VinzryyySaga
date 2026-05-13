/**
 * Environment elements untuk scene Menara Jam — sky/fog/lighting +
 * gravel plaza. Tone palette match `/armeniacaTown/peta` Japanese
 * garden (drought = desert dusk warm dusty rose, restored = soft dawn).
 *
 * Plaza redesign: dari stone disc Eropa → karesansui-style gravel
 * platform (raked sand) dengan stepping stones, mengikuti tema Japanese
 * shrine grounds di peta.
 */

import React from 'react';
import * as THREE from 'three';

export const SkyBackdrop = ({ restored }) => (
  <>
    <fog
      attach="fog"
      args={restored ? ['#7a5868', 28, 60] : ['#5a3540', 22, 52]}
    />
    <color attach="background" args={[restored ? '#2a1d28' : '#1a1018']} />
  </>
);

export const SceneLights = ({ restored }) => (
  <>
    <ambientLight
      intensity={restored ? 0.34 : 0.28}
      color={restored ? '#e0c0a8' : '#c0a090'}
    />
    {/* Key — angled spotlight high di belakang kamera */}
    <directionalLight
      position={[6, 12, 8]}
      intensity={restored ? 1.5 : 1.4}
      color={restored ? '#f8c898' : '#f4b078'}
    />
    {/* Fill — sisi opposite, warm dusty */}
    <directionalLight
      position={[-5, 7, -3]}
      intensity={0.45}
      color={restored ? '#c8a890' : '#b8907a'}
    />
  </>
);

// Plaza — karesansui-inspired raked gravel platform. Rectangular base
// matching twin-yagura+honden footprint. Concentric ring rim suggests
// raked gravel pattern (sand patterns around stones di Japanese garden).
export const Plaza = ({ restored }) => (
  <group>
    {/* Outer gravel disc — wider, dust gravel */}
    <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[9, 48]} />
      <meshStandardMaterial
        color={restored ? '#c4b098' : '#5a4a3a'}
        roughness={0.98}
      />
    </mesh>
    {/* Center pad — slightly raised stone tile mirroring building footprint.
        Rectangular shape matching twin + honden composition (~8 wide, ~3 deep). */}
    <mesh position={[0, 0.01, 0]}>
      <boxGeometry args={[8.4, 0.04, 3.6]} />
      <meshStandardMaterial
        color={restored ? '#7a6850' : '#3a2d22'}
        roughness={0.92}
      />
    </mesh>
    {/* Concentric raked rings — 3 thin rings around center pad suggesting
        karesansui raked-sand pattern. */}
    {[3.8, 4.6, 5.4].map((r, i) => (
      <mesh
        key={`rake-${i}`}
        position={[0, 0.022, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[r - 0.04, r, 64]} />
        <meshStandardMaterial
          color={restored ? '#9a8068' : '#6a5040'}
          roughness={0.95}
          transparent
          opacity={0.55 - i * 0.1}
        />
      </mesh>
    ))}
    {/* Stepping stones (tobi-ishi) — 3 stones leading up to the
        center plaza dari +Z (camera side). Drought variant: tilted +
        partially missing. */}
    {[
      [0, 0.04, 3.0, 0],
      [-0.3, 0.04, 4.2, 0],
      [0.2, 0.04, 5.4, 0],
    ].map(([x, y, z], i) => (
      <mesh
        key={`tobi-${i}`}
        position={[x, restored ? y : y - 0.02, z]}
        rotation={[
          -Math.PI / 2 + (restored ? 0 : (i % 2) * 0.1),
          0,
          (i * 0.4) % Math.PI,
        ]}
      >
        <cylinderGeometry args={[0.32 - i * 0.02, 0.36 - i * 0.02, 0.06, 8]} />
        <meshStandardMaterial
          color={restored ? '#7a6850' : '#3a2818'}
          roughness={0.95}
        />
      </mesh>
    ))}

    {/* DROUGHT-only: scattered rubble + dead grass patches on plaza */}
    {!restored && (
      <>
        {/* Rubble stones scattered around outer plaza */}
        {[
          { x: 3.2, z: 2.5, scale: 0.22, rot: 0.4 },
          { x: -3.5, z: 1.8, scale: 0.18, rot: 1.1 },
          { x: 2.8, z: -2.6, scale: 0.2, rot: 2.2 },
          { x: -3.0, z: -2.0, scale: 0.16, rot: 0.7 },
          { x: 4.0, z: 0.5, scale: 0.24, rot: 1.8 },
          { x: -4.2, z: -0.3, scale: 0.2, rot: 0.3 },
          { x: 0.5, z: 3.5, scale: 0.17, rot: 1.5 },
          { x: -0.8, z: -3.6, scale: 0.19, rot: 2.5 },
        ].map((r, i) => (
          <mesh
            key={`plaza-rubble-${i}`}
            position={[r.x, r.scale / 2, r.z]}
            rotation={[r.rot * 0.3, r.rot, r.rot * 0.2]}
          >
            <boxGeometry args={[r.scale, r.scale, r.scale * 0.85]} />
            <meshStandardMaterial color="#4a3828" roughness={0.98} />
          </mesh>
        ))}
        {/* Dead grass / weed patches (small green-brown discs) */}
        {[
          [2.4, 3.0, 0.5],
          [-2.6, 2.8, 0.6],
          [3.4, -1.8, 0.45],
          [-3.0, -2.4, 0.55],
          [1.4, -3.2, 0.5],
        ].map(([x, z, r], i) => (
          <mesh
            key={`weed-${i}`}
            position={[x, 0.025, z]}
            rotation={[-Math.PI / 2, 0, i * 0.6]}
          >
            <circleGeometry args={[r, 10]} />
            <meshStandardMaterial
              color={i % 2 ? '#3a3818' : '#4a4828'}
              roughness={1}
              transparent
              opacity={0.7}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </>
    )}
  </group>
);
