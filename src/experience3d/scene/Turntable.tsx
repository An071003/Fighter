import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/domain/store';
import { useAircraftRig } from '../aircraft/AircraftRig';

const TICK_COUNT = 72;

export const Turntable: React.FC = () => {
  const { turntableRootRef, currentFlightFrameRef } = useAircraftRig();
  const ticksMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const materialsRef = useRef<THREE.MeshStandardMaterial[]>([]);

  const registerMat = (mat: THREE.MeshStandardMaterial | null) => {
    if (mat && !materialsRef.current.includes(mat)) {
      materialsRef.current.push(mat);
    }
  };

  const tickMatrices = useMemo(() => {
    const dummy = new THREE.Object3D();
    const matrices: THREE.Matrix4[] = [];
    const radius = 5.55;
    for (let i = 0; i < TICK_COUNT; i++) {
      const angle = (i / TICK_COUNT) * Math.PI * 2;
      const isMajor = i % 6 === 0;
      dummy.position.set(
        Math.cos(angle) * radius,
        0.02,
        Math.sin(angle) * radius
      );
      dummy.rotation.set(0, -angle, 0);
      dummy.scale.set(isMajor ? 1.8 : 1.0, 1.0, isMajor ? 1.5 : 1.0);
      dummy.updateMatrix();
      matrices.push(dummy.matrix.clone());
    }
    return matrices;
  }, []);

  useEffect(() => {
    const inst = ticksMeshRef.current;
    if (!inst) return;
    tickMatrices.forEach((mat, idx) => {
      inst.setMatrixAt(idx, mat);
    });
    inst.instanceMatrix.needsUpdate = true;
  }, [tickMatrices]);

  useFrame(() => {
    const frame = currentFlightFrameRef.current;
    const root = turntableRootRef.current;
    if (!root) return;

    root.position.y = frame.platformY;
    root.visible = frame.platformVisible && useAppStore.getState().storyPhaseIndex === null;

    for (const mat of materialsRef.current) {
      const isTransparent = frame.platformOpacity < 0.995;
      if (mat.transparent !== isTransparent) {
        mat.transparent = isTransparent;
        mat.needsUpdate = true;
      }
      mat.opacity = frame.platformOpacity;
    }
  });

  return (
    <group ref={turntableRootRef} name="TurntableRoot" position={[0, 0, 0]}>
      {/* Central Brushed Dark Titanium Disk */}
      <mesh position={[0, -0.12, 0]} receiveShadow>
        <cylinderGeometry args={[5.2, 5.4, 0.22, 96]} />
        <meshStandardMaterial
          ref={registerMat}
          color="#111214"
          metalness={0.25}
          roughness={0.82}
        />
      </mesh>

      {/* Inner Machined Recessed Platform Ring */}
      <mesh position={[0, 0.0, 0]} receiveShadow>
        <cylinderGeometry args={[3.85, 3.95, 0.04, 96]} />
        <meshStandardMaterial
          ref={registerMat}
          color="#151618"
          metalness={0.2}
          roughness={0.86}
        />
      </mesh>

      {/* Concentric Outer Beveled Collar Ring */}
      <mesh position={[0, -0.18, 0]} receiveShadow>
        <cylinderGeometry args={[6.15, 6.45, 0.18, 96]} />
        <meshStandardMaterial
          ref={registerMat}
          color="#0C0D0E"
          metalness={0.2}
          roughness={0.9}
        />
      </mesh>

      {/* Thin White Stage Ring */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.12, 5.19, 96]} />
        <meshStandardMaterial
          ref={registerMat}
          color="#D9DDE2"
          emissive="#D9DDE2"
          emissiveIntensity={0.45}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>

      {/* Inner Warm Amber Alignment Ring */}
      <mesh position={[0, 0.022, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.35, 2.38, 72]} />
        <meshStandardMaterial
          ref={registerMat}
          color="#BFC4CA"
          emissive="#BFC4CA"
          emissiveIntensity={0.25}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>

      {/* Longitudinal Amber Datum Centerline (Z-Axis Reference Line from Fig 1 Reference) */}
      <mesh position={[0, 0.024, 0]}>
        <boxGeometry args={[0.032, 0.004, 10.6]} />
        <meshStandardMaterial
          ref={registerMat}
          color="#F5A623"
          emissive="#F5A623"
          emissiveIntensity={1.1}
          roughness={0.2}
        />
      </mesh>

      {/* Transverse Wheel-Axis Datum Line */}
      <mesh position={[0, 0.023, 0.65]}>
        <boxGeometry args={[7.4, 0.003, 0.022]} />
        <meshStandardMaterial
          ref={registerMat}
          color="#8A9097"
          emissive="#8A9097"
          emissiveIntensity={0.2}
          roughness={0.25}
        />
      </mesh>

      {/* Runway / Stage Optical Alignment LED Nodes (Green Centerline + Blue Taxi Markers) */}
      {[-4.6, -2.8, 2.4, 4.4].map((zPos, i) => (
        <mesh key={`center-led-${i}`} position={[0, 0.028, zPos]}>
          <cylinderGeometry args={[0.045, 0.055, 0.012, 16]} />
          <meshStandardMaterial
            ref={registerMat}
            color="#4DFF9B"
            emissive="#4DFF9B"
            emissiveIntensity={1.2}
          />
        </mesh>
      ))}
      {[
        [-1.85, -2.6],
        [1.85, -2.6],
        [-2.35, 1.45],
        [2.35, 1.45],
      ].map(([xPos, zPos], i) => (
        <mesh key={`side-led-${i}`} position={[xPos, 0.028, zPos]}>
          <cylinderGeometry args={[0.042, 0.052, 0.012, 16]} />
          <meshStandardMaterial
            ref={registerMat}
            color="#3D7BFF"
            emissive="#3D7BFF"
            emissiveIntensity={1.2}
          />
        </mesh>
      ))}

      {/* Instanced Radial Degree Tick Marks */}
      <instancedMesh
        ref={ticksMeshRef}
        args={[undefined, undefined, TICK_COUNT]}
        position={[0, 0, 0]}
      >
        <boxGeometry args={[0.14, 0.015, 0.025]} />
        <meshStandardMaterial
          ref={registerMat}
          color="#9CA2A9"
          emissive="#9CA2A9"
          emissiveIntensity={0.3}
        />
      </instancedMesh>
    </group>
  );
};
