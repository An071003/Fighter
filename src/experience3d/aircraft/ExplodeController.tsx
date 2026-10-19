import React from 'react';
import { useFrame } from '@react-three/fiber';
import { PART_MANIFEST, evaluateExplodedPartPose } from '@/domain/partRegistry';
import { useAppStore, visualClockRef } from '@/domain/store';
import { useAircraftRig } from './AircraftRig';

export const ExplodeController: React.FC = () => {
  const { partNodesMapRef } = useAircraftRig();

  useFrame((_, rawDelta) => {
    const state = useAppStore.getState();
    // During flight modes, GearRig owns landing gear transforms and all other parts stay at rest (p=0)
    const isFlightActive =
      state.mode === 'flight-transition' ||
      state.mode === 'hover' ||
      state.mode === 'return-transition';

    const targetP = isFlightActive ? 0 : state.explodeProgress;
    const dt = Math.min(rawDelta, 0.05);

    if (state.reducedMotion || Math.abs(targetP - visualClockRef.explodeAnimatedProgress01) < 1e-4) {
      visualClockRef.explodeAnimatedProgress01 = targetP;
    } else {
      // Smooth exponential damping (~1.8s full travel feel)
      const speed = 4.2;
      visualClockRef.explodeAnimatedProgress01 +=
        (targetP - visualClockRef.explodeAnimatedProgress01) * Math.min(1, dt * speed);
    }

    const currentP = visualClockRef.explodeAnimatedProgress01;
    const activeSelectedId = isFlightActive ? null : state.selectedPartId;
    const nodesMap = partNodesMapRef.current;

    for (const part of PART_MANIFEST.parts) {
      // Skip gear parts when flight is active so GearRig has sole ownership
      if (isFlightActive && part.category === 'GEAR') {
        continue;
      }

      const obj = nodesMap.get(part.id);
      if (!obj) continue;

      const evaluated = evaluateExplodedPartPose(part.id, currentP, activeSelectedId);
      obj.position.set(
        evaluated.position[0],
        evaluated.position[1],
        evaluated.position[2]
      );
      obj.quaternion.set(
        evaluated.quaternion[0],
        evaluated.quaternion[1],
        evaluated.quaternion[2],
        evaluated.quaternion[3]
      );
      obj.scale.set(evaluated.scale[0], evaluated.scale[1], evaluated.scale[2]);
    }
  });

  return null;
};
