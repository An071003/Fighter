import React, { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAircraftRig } from '../aircraft/AircraftRig';

const GROUND_COLOR = new THREE.Color('#0A0A0B');
/** Overcast grey the scene drifts toward while climbing (reference video: climb through cloud). */
const SKY_COLOR = new THREE.Color('#2A2D32');

export const Atmosphere: React.FC = () => {
  const { currentFlightFrameRef } = useAircraftRig();
  const { scene, gl } = useThree();
  const fog = useMemo(() => new THREE.Fog(GROUND_COLOR.clone(), 20, 48), []);
  const tint = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    if (scene.fog !== fog) scene.fog = fog;
    const k = Math.min(1, currentFlightFrameRef.current.windIntensity / 0.82);
    tint.copy(GROUND_COLOR).lerp(SKY_COLOR, k * 0.85);
    fog.color.copy(tint);
    fog.near = 20 - 6 * k;
    fog.far = 48 - 10 * k;
    gl.setClearColor(tint, 1);
  });

  return null;
};
