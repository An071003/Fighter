import React, { useEffect, useMemo, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { CAMERA_PRESETS } from '@/domain/config';
import { getPartById } from '@/domain/partRegistry';
import { useAppStore } from '@/domain/store';
import { useAircraftRig } from '../aircraft/AircraftRig';

export const CameraRig: React.FC = () => {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera, size } = useThree();
  const { partNodesMapRef, currentFlightFrameRef } = useAircraftRig();

  const cameraPreset = useAppStore((s) => s.cameraPreset);
  const cameraResetNonce = useAppStore((s) => s.cameraResetNonce);
  const selectedPartId = useAppStore((s) => s.selectedPartId);
  const explodeProgress = useAppStore((s) => s.explodeProgress);
  const mode = useAppStore((s) => s.mode);
  const setIsUserOrbiting = useAppStore((s) => s.setIsUserOrbiting);

  const isTransitionActiveRef = useRef<boolean>(false);

  const desiredPosRef = useRef<THREE.Vector3>(
    new THREE.Vector3(...CAMERA_PRESETS.hero.position)
  );
  const desiredTargetRef = useRef<THREE.Vector3>(
    new THREE.Vector3(...CAMERA_PRESETS.hero.target)
  );
  const worldBoxRef = useMemo(() => new THREE.Box3(), []);
  const boxCenterRef = useMemo(() => new THREE.Vector3(), []);

  // Recompute target camera goal whenever preset, selection, or mode changes
  useEffect(() => {
    const presetCfg = CAMERA_PRESETS[cameraPreset] ?? CAMERA_PRESETS.hero;
    const isMobile = size.width < 768;
    const mobileScale = isMobile ? 1.32 : 1.0;
    const explodeScale = 1.0 + explodeProgress * 0.36;

    const perspCam = camera as THREE.PerspectiveCamera;
    if (perspCam.isPerspectiveCamera && perspCam.fov !== presetCfg.fov) {
      perspCam.fov = presetCfg.fov;
      perspCam.updateProjectionMatrix();
    }

    if (selectedPartId && (mode === 'inspect' || mode === 'exploded')) {
      const part = getPartById(selectedPartId);
      const node = partNodesMapRef.current.get(selectedPartId);
      if (part && node) {
        worldBoxRef.setFromObject(node);
        worldBoxRef.getCenter(boxCenterRef);

        const dist = Math.max(6.8, 9.2 * (part.focus.distanceMultiplier || 0.78)) * mobileScale;
        const elevY = part.category === 'GEAR' ? 0.55 : 2.35;
        const sideSign = boxCenterRef.x < -0.25 ? -1 : 1;

        // Offset target slightly so the part sits in the open viewport between left hero text and right inspector drawer
        desiredTargetRef.current.set(
          boxCenterRef.x + sideSign * 0.35,
          boxCenterRef.y,
          boxCenterRef.z
        );
        desiredPosRef.current.set(
          boxCenterRef.x + sideSign * dist * 0.78,
          boxCenterRef.y + elevY,
          boxCenterRef.z - dist * 0.82
        );
        isTransitionActiveRef.current = true;
        return;
      }
    }

    // Default preset camera position scaled for mobile & explode bounds
    desiredTargetRef.current.set(...presetCfg.target);
    desiredPosRef.current.set(
      presetCfg.position[0] * mobileScale * explodeScale,
      presetCfg.position[1] * mobileScale * explodeScale,
      presetCfg.position[2] * mobileScale * explodeScale
    );
    isTransitionActiveRef.current = true;
  }, [
    camera,
    cameraPreset,
    cameraResetNonce,
    selectedPartId,
    explodeProgress,
    mode,
    size.width,
    partNodesMapRef,
    worldBoxRef,
    boxCenterRef,
  ]);

  useFrame(({ clock }, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const controls = controlsRef.current;
    if (!controls) return;

    const state = useAppStore.getState();

    // During flight-transition or return-transition, director owns camera dolly/framing
    if (state.mode === 'flight-transition' || state.mode === 'return-transition') {
      const frame = currentFlightFrameRef.current;
      const isMobile = size.width < 768;
      const mobileScale = isMobile ? 1.28 : 1.0;

      // Subtle cinematic camera choreography showing gear doors & undercarriage during t=2.8..5.0s
      const gearInspectionWindow =
        state.mode === 'flight-transition'
          ? Math.sin(
              Math.PI *
                Math.max(0, Math.min(1, (state.flightElapsedUi - 2.4) / 3.0))
            )
          : 0.35;

      const swayX = state.reducedMotion
        ? 0
        : Math.sin(clock.elapsedTime * 0.45) * 0.25;

      const targetCamX = (9.4 - frame.cameraDolly * 0.9 + swayX) * mobileScale;
      const targetCamY =
        (3.8 - gearInspectionWindow * 1.65 + frame.jetY * 0.65) * mobileScale;
      const targetCamZ = (-10.2 - frame.cameraDolly * 0.8) * mobileScale;

      desiredPosRef.current.set(targetCamX, targetCamY, targetCamZ);
      desiredTargetRef.current.set(0, 0.72 + frame.jetY * 0.85, 0.1);

      camera.position.lerp(desiredPosRef.current, Math.min(1, dt * 3.8));
      controls.target.lerp(desiredTargetRef.current, Math.min(1, dt * 4.5));
      controls.update();
      return;
    }

    if (isTransitionActiveRef.current) {
      const factor = state.reducedMotion ? 1.0 : Math.min(1, dt * 4.5);
      camera.position.lerp(desiredPosRef.current, factor);
      controls.target.lerp(desiredTargetRef.current, factor);
      controls.update();

      if (
        camera.position.distanceTo(desiredPosRef.current) < 0.03 &&
        controls.target.distanceTo(desiredTargetRef.current) < 0.02
      ) {
        isTransitionActiveRef.current = false;
      }
    }
  });

  const orbitLocked =
    mode === 'flight-transition' || mode === 'return-transition';

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={!orbitLocked}
      enableDamping
      dampingFactor={0.07}
      enablePan={false}
      minDistance={4.2}
      maxDistance={21.0}
      minPolarAngle={0.14}
      maxPolarAngle={Math.PI * 0.485}
      onStart={() => {
        isTransitionActiveRef.current = false;
        setIsUserOrbiting(true);
      }}
      onEnd={() => {
        setIsUserOrbiting(false);
      }}
    />
  );
};
