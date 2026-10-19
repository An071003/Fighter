import React, { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { AIRCRAFT_MODEL_URL } from '@/domain/config';
import {
  PART_MANIFEST,
  getPartByNodeName,
  registerPartRestPose,
} from '@/domain/partRegistry';
import { useAppStore } from '@/domain/store';
import type { AssetAuditReport } from '@/domain/types';
import { useAircraftRig } from './AircraftRig';

export const JetModel: React.FC = () => {
  const gltf = useGLTF(AIRCRAFT_MODEL_URL);
  const { partNodesMapRef } = useAircraftRig();
  const dispatch = useAppStore((s) => s.dispatch);

  // Clone scene graph and materials once so per-part highlights never mutate cached useGLTF state
  const clonedScene = useMemo(() => {
    const root = gltf.scene.clone(true);
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((m) => m.clone());
        } else if (mesh.material) {
          const clonedMat = mesh.material.clone() as THREE.MeshStandardMaterial;
          clonedMat.envMapIntensity = 1.45;
          mesh.material = clonedMat;
        }
      }
    });
    return root;
  }, [gltf.scene]);

  useEffect(() => {
    const map = partNodesMapRef.current;
    map.clear();

    let triangleCount = 0;
    let meshCount = 0;

    clonedScene.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        meshCount += 1;
        const geom = (node as THREE.Mesh).geometry;
        if (geom) {
          if (geom.index) {
            triangleCount += geom.index.count / 3;
          } else if (geom.attributes.position) {
            triangleCount += geom.attributes.position.count / 3;
          }
        }
      }

      const partDef = getPartByNodeName(node.name);
      if (partDef) {
        node.userData.partId = partDef.id;
        // Propagate partId to child meshes of this semantic part node
        node.traverse((child) => {
          if (!child.userData.partId) {
            child.userData.partId = partDef.id;
          }
        });

        registerPartRestPose(partDef.id, {
          position: [node.position.x, node.position.y, node.position.z],
          quaternion: [
            node.quaternion.x,
            node.quaternion.y,
            node.quaternion.z,
            node.quaternion.w,
          ],
          scale: [node.scale.x, node.scale.y, node.scale.z],
        });

        map.set(partDef.id, node);
      }
    });

    const missingPartIds: string[] = [];
    for (const part of PART_MANIFEST.parts) {
      if (!map.has(part.id)) {
        missingPartIds.push(part.id);
      }
    }

    const hasThreeLandingGear =
      map.has('gear-strut-front') &&
      map.has('gear-wheel-front') &&
      map.has('gear-strut-left') &&
      map.has('gear-wheel-left') &&
      map.has('gear-strut-right') &&
      map.has('gear-wheel-right');

    const hasGearDoors =
      map.has('gear-door-front') &&
      map.has('gear-door-left') &&
      map.has('gear-door-right');

    const audit: AssetAuditReport = {
      loaded: true,
      isHighFidelity:
         map.size >= PART_MANIFEST.minRequiredParts &&
        missingPartIds.length === 0 &&
        hasThreeLandingGear &&
        hasGearDoors &&
        triangleCount >= 30000,
      totalNamedPartsFound: map.size,
      expectedPartsCount: PART_MANIFEST.parts.length,
      missingPartIds,
      triangleCount: Math.round(triangleCount),
      meshCount,
      hasThreeLandingGear,
      hasGearDoors,
      timestamp: new Date().toISOString(),
    };

    if (map.size < PART_MANIFEST.minRequiredParts) {
      dispatch({
        type: 'LOAD_FAILURE',
        reason: `Mô hình GLB thiếu bộ phận bắt buộc (${map.size}/${PART_MANIFEST.minRequiredParts}).`,
      });
    } else {
      dispatch({ type: 'LOAD_SUCCESS', audit });
    }
  }, [clonedScene, dispatch, partNodesMapRef]);

  return (
    <group name="AircraftAssemblyRoot" position={[0, 1.42, 0]}>
      <primitive object={clonedScene} dispose={null} />
    </group>
  );
};

useGLTF.preload(AIRCRAFT_MODEL_URL);
