import React, { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/domain/store';
import { getStoryPhase, storyAnchorScreenRef } from '@/domain/story';
import { useAircraftRig } from '../aircraft/AircraftRig';

/**
 * Projects the active story callout's part (bounding-box centre) to screen pixels every frame
 * and writes it into the shared non-reactive `storyAnchorScreenRef` for the HTML overlay.
 */
export const StoryAnchorProjector: React.FC = () => {
  const { partNodesMapRef } = useAircraftRig();
  const { camera, size } = useThree();
  const box = useMemo(() => new THREE.Box3(), []);
  const point = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const phaseIndex = useAppStore.getState().storyPhaseIndex;
    const phase = getStoryPhase(phaseIndex);
    const node = phase ? partNodesMapRef.current.get(phase.callout.partId) : undefined;
    if (!phase || !node) {
      storyAnchorScreenRef.visible = false;
      storyAnchorScreenRef.phaseIndex = -1;
      return;
    }

    box.setFromObject(node);
    box.getCenter(point);
    point.project(camera);

    storyAnchorScreenRef.x = (point.x * 0.5 + 0.5) * size.width;
    storyAnchorScreenRef.y = (-point.y * 0.5 + 0.5) * size.height;
    storyAnchorScreenRef.visible = point.z > -1 && point.z < 1;
    storyAnchorScreenRef.phaseIndex = phaseIndex ?? -1;
  });

  return null;
};
