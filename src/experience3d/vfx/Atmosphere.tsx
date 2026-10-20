import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { useAircraftRig } from '../aircraft/AircraftRig';

export const Atmosphere: React.FC = () => {
  const { currentFlightFrameRef } = useAircraftRig();
  const plumeGroupRef = useRef<THREE.Group | null>(null);
  const leftPlumeMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const rightPlumeMatRef = useRef<THREE.MeshBasicMaterial | null>(null);

  useFrame(({ clock }) => {
    const frame = currentFlightFrameRef.current;
    const group = plumeGroupRef.current;
    if (!group) return;

    const active = frame.windIntensity > 0.02;
    group.visible = active;
    if (!active) return;

    group.position.y = 1.42 + frame.jetY;
    const pulse = 0.92 + 0.08 * Math.sin(clock.elapsedTime * 18.0);
    const plumeOpacity = Math.min(0.42, frame.windIntensity * 0.45) * pulse;

    if (leftPlumeMatRef.current) leftPlumeMatRef.current.opacity = plumeOpacity;
    if (rightPlumeMatRef.current) rightPlumeMatRef.current.opacity = plumeOpacity;
  });

  return (
    <>
      <fog attach="fog" args={['#0A0A0B', 20, 48]} />

      {/* Twin Decorative Afterburner Ion Plumes during Flight Sequence */}
      <group ref={plumeGroupRef} name="DecorativeIonPlumes" visible={false}>
        <mesh position={[-0.62, 0.08, 5.85]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.26, 1.35, 24, 1, true]} />
          <meshBasicMaterial
            ref={leftPlumeMatRef}
            color="#FFB45C"
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
        <mesh position={[0.62, 0.08, 5.85]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.26, 1.35, 24, 1, true]} />
          <meshBasicMaterial
            ref={rightPlumeMatRef}
            color="#FFB45C"
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      </group>
    </>
  );
};
