/**
 * Environment elements untuk scene Menara Jam — sky/fog/lighting +
 * plaza ground. Tone palette match `/armeniacaTown/peta` twilight
 * (drought = dusty warm rose, restored = soft dawn).
 */

import React from 'react';

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
    {/* Key — angled spotlight high di belakang kamera, ngenain dial */}
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

// Plaza ground — stone disc dengan ring rim di tepi (no pebble detail
// di Stage B fase awal — cukup baseline supaya tower gak melayang).
export const Plaza = ({ restored }) => (
  <group>
    {/* Main plaza disc */}
    <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[8, 48]} />
      <meshStandardMaterial
        color={restored ? '#4a3828' : '#3a2a20'}
        roughness={0.95}
      />
    </mesh>
    {/* Center pad — slightly raised tile di sekitar base menara */}
    <mesh position={[0, 0.01, 0]}>
      <cylinderGeometry args={[3.2, 3.4, 0.04, 24]} />
      <meshStandardMaterial
        color={restored ? '#6a4830' : '#4a3828'}
        roughness={0.92}
      />
    </mesh>
    {/* Concentric rim ring */}
    <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[3.15, 3.4, 48]} />
      <meshStandardMaterial
        color={restored ? '#8a6038' : '#5a3a20'}
        roughness={0.9}
      />
    </mesh>
  </group>
);
