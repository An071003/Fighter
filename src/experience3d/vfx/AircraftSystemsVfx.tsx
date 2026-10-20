import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/domain/store';
import { useAircraftRig } from '../aircraft/AircraftRig';

export const AircraftSystemsVfx: React.FC = () => {
  const { currentFlightFrameRef } = useAircraftRig();
  const beaconOn = useAppStore((s) => s.beaconOn);
  const strobeOn = useAppStore((s) => s.strobeOn);
  const landingLightOn = useAppStore((s) => s.landingLightOn);
  const explodeProgress = useAppStore((s) => s.explodeProgress);
  const reducedMotion = useAppStore((s) => s.reducedMotion);

  const fanLeftRef = useRef<THREE.Group | null>(null);
  const fanRightRef = useRef<THREE.Group | null>(null);
  const dorsalBeaconMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const ventralBeaconMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const strobeLeftMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const strobeRightMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const landingConeGroupRef = useRef<THREE.Group | null>(null);
  const afterburnerGroupRef = useRef<THREE.Group | null>(null);

  const bladeAngles = useMemo(
    () => Array.from({ length: 14 }, (_, i) => (i / 14) * Math.PI * 2),
    []
  );

  useFrame(({ clock }, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const t = clock.elapsedTime;
    const frame = currentFlightFrameRef.current;

    // 1. Spin twin turbofan compressor rotors (Idle 21.4% N1 -> Flight 94.8% N1)
    const fanSpeed = reducedMotion ? 0 : 4.5 + frame.windIntensity * 24.0;
    if (fanLeftRef.current) {
      fanLeftRef.current.rotation.z += fanSpeed * dt;
    }
    if (fanRightRef.current) {
      fanRightRef.current.rotation.z -= fanSpeed * dt;
    }

    // 2. 1 Hz Anti-Collision Red Beacon pulse (00:06 in reference video)
    const beaconPulse = beaconOn
      ? Math.pow(Math.max(0, Math.sin(t * Math.PI * 2.0)), 6.0)
      : 0;
    if (dorsalBeaconMatRef.current) {
      dorsalBeaconMatRef.current.opacity = 0.18 + beaconPulse * 0.82;
    }
    if (ventralBeaconMatRef.current) {
      ventralBeaconMatRef.current.opacity = 0.18 + beaconPulse * 0.82;
    }

    // 3. Double-flash white wingtip strobes (00:19 in reference video)
    const cycle = t % 1.25;
    const isFlash =
      strobeOn &&
      ((cycle > 0.0 && cycle < 0.07) || (cycle > 0.16 && cycle < 0.23));
    const strobeOpacity = isFlash ? 0.96 : 0.08;
    if (strobeLeftMatRef.current) {
      strobeLeftMatRef.current.opacity = strobeOpacity;
    }
    if (strobeRightMatRef.current) {
      strobeRightMatRef.current.opacity = strobeOpacity;
    }

    // 4. Nose gear taxi/landing light beam washing the centerline when gear is locked down on turntable (00:13-00:24)
    if (landingConeGroupRef.current) {
      const gearLockedDown =
        frame.gearRetracted < 0.05 &&
        frame.doorOpen < 0.15 &&
        frame.platformOpacity > 0.5;
      const explodeHide = explodeProgress < 0.1;
      landingConeGroupRef.current.visible =
        landingLightOn && gearLockedDown && explodeHide;
    }

    // 5. Twin Afterburner Plumes during Takeoff & Hover
    if (afterburnerGroupRef.current) {
      const abVisible = frame.windIntensity > 0.06 && explodeProgress < 0.05;
      afterburnerGroupRef.current.visible = abVisible;
      if (abVisible) {
        const pulse = 0.92 + Math.sin(t * 28.0) * 0.08;
        afterburnerGroupRef.current.scale.set(
          1,
          1,
          (0.45 + frame.windIntensity * 0.95) * pulse
        );
      }
    }
  });

  return (
    <group name="AircraftSystemsVfxRoot">
      {/* 1. Twin Spinning Turbofan Compressor Disks inside Intakes */}
      {([-1, 1] as const).map((side) => (
        <group
          key={`turbofan-${side}`}
          ref={side < 0 ? fanLeftRef : fanRightRef}
          position={[side * 0.56, 1.32, -1.45]}
        >
          {/* Spinner Cone */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.065, 0.18, 16]} />
            <meshStandardMaterial
              color="#DCE8F5"
              metalness={0.85}
              roughness={0.2}
            />
          </mesh>
          {/* 14 Titanium Compressor Fan Blades */}
          {bladeAngles.map((ang, idx) => (
            <mesh
              key={`blade-${idx}`}
              rotation={[0.35, 0, ang]}
              position={[Math.cos(ang) * 0.12, Math.sin(ang) * 0.12, 0.02]}
            >
              <boxGeometry args={[0.14, 0.028, 0.008]} />
              <meshStandardMaterial
                color="#98B4CE"
                metalness={0.9}
                roughness={0.18}
              />
            </mesh>
          ))}
        </group>
      ))}

      {/* 2. Anti-Collision Red Beacons (Top Spine & Belly - 1 Hz Flash) */}
      <mesh position={[0, 2.18, 0.72]}>
        <sphereGeometry args={[0.042, 16, 16]} />
        <meshBasicMaterial
          ref={dorsalBeaconMatRef}
          color="#FF3B30"
          transparent
          opacity={0.9}
        />
      </mesh>
      <mesh position={[0, 1.04, 0.18]}>
        <sphereGeometry args={[0.038, 16, 16]} />
        <meshBasicMaterial
          ref={ventralBeaconMatRef}
          color="#FF3B30"
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* 3. Wingtip Navigation (Red Port / Green Starboard) & White Double-Strobe Lights */}
      <mesh position={[-4.91, 1.91, 2.12]}>
        <sphereGeometry args={[0.048, 16, 16]} />
        <meshBasicMaterial
          ref={strobeLeftMatRef}
          color="#FFFFFF"
          transparent
          opacity={0.9}
        />
      </mesh>
      <mesh position={[4.91, 1.91, 2.12]}>
        <sphereGeometry args={[0.048, 16, 16]} />
        <meshBasicMaterial
          ref={strobeRightMatRef}
          color="#FFFFFF"
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* 4. Volumetric Nose-Gear Taxi & Landing Light Cone Washing the Centerline */}
      <group ref={landingConeGroupRef} position={[0, 0.68, -3.38]}>
        {/* Bright Headlamp Lens on Nose Strut */}
        <mesh position={[0, 0, -0.06]}>
          <sphereGeometry args={[0.045, 16, 16]} />
          <meshBasicMaterial color="#FFF8E7" />
        </mesh>
        {/* Volumetric Beam Cone */}
        <mesh
          position={[0, -0.32, -2.55]}
          rotation={[Math.PI * 0.455, 0, 0]}
        >
          <coneGeometry args={[1.15, 5.2, 32, 1, true]} />
          <meshBasicMaterial
            color="#FFE8B8"
            transparent
            opacity={0.11}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        {/* Ground Wash Pool on Runway Centerline */}
        <mesh
          position={[0, -0.652, -3.2]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[0.85, 2.35, 1]}
        >
          <circleGeometry args={[1.1, 32]} />
          <meshBasicMaterial
            color="#FFE5A8"
            transparent
            opacity={0.16}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/* 5. Twin Afterburner Shock-Diamond Plumes */}
      <group
        ref={afterburnerGroupRef}
        position={[0, 1.44, 4.48]}
        visible={false}
      >
        {([-0.54, 0.54] as const).map((xPos, i) => (
          <group key={`ab-plume-${i}`} position={[xPos, 0, 0]}>
            {/* Outer Plasma Plume */}
            <mesh position={[0, 0, 0.85]} rotation={[-Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.21, 1.75, 24, 1, true]} />
              <meshBasicMaterial
                color="#4AD8FF"
                transparent
                opacity={0.34}
                side={THREE.DoubleSide}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
            {/* Inner White-Amber Mach Shock Core */}
            <mesh position={[0, 0, 0.52]} rotation={[-Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.13, 1.05, 20]} />
              <meshBasicMaterial
                color="#FFB85C"
                transparent
                opacity={0.68}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
};
