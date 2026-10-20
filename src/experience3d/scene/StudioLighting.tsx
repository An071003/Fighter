import React, { useRef } from 'react';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { QUALITY_SETTINGS } from '@/domain/config';
import { useAppStore } from '@/domain/store';
import { useAircraftRig } from '../aircraft/AircraftRig';

export const StudioLighting: React.FC = () => {
  const resolvedQuality = useAppStore((s) => s.resolvedQuality);
  const explodeProgress = useAppStore((s) => s.explodeProgress);
  const qualityCfg = QUALITY_SETTINGS[resolvedQuality];
  const { currentFlightFrameRef } = useAircraftRig();
  const rimLightRef = useRef<THREE.DirectionalLight | null>(null);
  const shadowGroupRef = useRef<THREE.Group | null>(null);

  useFrame(() => {
    const frame = currentFlightFrameRef.current;
    if (rimLightRef.current) {
      // Boost rim intensity 15% during explode or flight hover for crisp silhouette separation
      rimLightRef.current.intensity =
        2.4 + 0.5 * explodeProgress + 0.45 * frame.windIntensity;
    }
    if (shadowGroupRef.current) {
      shadowGroupRef.current.visible = frame.platformOpacity > 0.05;
    }
  });

  return (
    <group name="StudioLightingRig">
      {/* Base Ambient Fill */}
      <ambientLight intensity={0.32} color="#D8DCE2" />

      {/* 1. Cool Key Light (Upper-Left Front) */}
      <directionalLight
        position={[7.5, 11.0, -8.5]}
        intensity={2.6}
        color="#F4F6F8"
        castShadow={qualityCfg.enableShadows}
        shadow-mapSize={[qualityCfg.shadowMapSize, qualityCfg.shadowMapSize]}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-bias={-0.0004}
      />

      {/* 2. Warm Low Fill Light (Right Side) */}
      <directionalLight
        position={[-9.0, 3.2, -3.5]}
        intensity={0.9}
        color="#FFE6CC"
      />

      {/* 3. Crisp Cyan-White Back Rim Light */}
      <directionalLight
        ref={rimLightRef}
        position={[0.0, 6.5, 10.5]}
        intensity={2.4}
        color="#FFFFFF"
      />

      {/* Under-Belly Technical Fill so Landing Gear & Doors are Clearly Legible */}
      <pointLight
        position={[0, -2.2, -0.5]}
        intensity={1.1}
        distance={9}
        color="#C9CED6"
      />

      {/* Self-Contained Procedural Studio Reflection Environment (100% Offline Safe) */}
      <Environment resolution={resolvedQuality === 'low' ? 128 : 256} frames={1}>
        <color attach="background" args={['#0A0A0B']} />
        {/* Overhead Softbox Strip */}
        <Lightformer
          form="rect"
          intensity={2.4}
          color="#FFFFFF"
          position={[0, 8, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[14, 4, 1]}
        />
        {/* Left Cool Key Reflection Strip */}
        <Lightformer
          form="rect"
          intensity={1.6}
          color="#E8ECF0"
          position={[9, 3, -4]}
          rotation={[0, -Math.PI / 2.4, 0]}
          scale={[10, 2.2, 1]}
        />
        {/* Right Warm Metallic Highlight Strip */}
        <Lightformer
          form="rect"
          intensity={1.0}
          color="#FFE2C2"
          position={[-9, 2.5, 2]}
          rotation={[0, Math.PI / 2.2, 0]}
          scale={[10, 1.8, 1]}
        />
        {/* Rear Rim Accent Strip */}
        <Lightformer
          form="ring"
          intensity={1.4}
          color="#FFFFFF"
          position={[0, 4, 10]}
          scale={[6, 6, 1]}
        />
      </Environment>

      {/* Grounded Contact Shadow on Turntable Surface */}
      {qualityCfg.enableShadows && (
        <group ref={shadowGroupRef} position={[0, 0.025, 0]}>
          <ContactShadows
            opacity={0.68}
            scale={13}
            blur={2.1}
            far={4.5}
            resolution={resolvedQuality === 'high' ? 512 : 256}
            color="#000000"
          />
        </group>
      )}
    </group>
  );
};
