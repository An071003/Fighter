import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getPartRestPose } from '@/domain/partRegistry';
import { useAppStore } from '@/domain/store';
import { useAircraftRig } from './AircraftRig';

const DEG2RAD = Math.PI / 180;

export const GearRig: React.FC = () => {
  const { partNodesMapRef, currentFlightFrameRef } = useAircraftRig();

  // Scratch objects allocated once to avoid GC inside useFrame
  const scratch = useMemo(
    () => ({
      restQuat: new THREE.Quaternion(),
      deltaQuat: new THREE.Quaternion(),
      euler: new THREE.Euler(),
    }),
    []
  );

  useFrame(() => {
    const state = useAppStore.getState();
    const isFlightActive =
      state.mode === 'flight-transition' ||
      state.mode === 'hover' ||
      state.mode === 'return-transition';

    if (!isFlightActive) {
      return;
    }

    const frame = currentFlightFrameRef.current;
    const nodes = partNodesMapRef.current;

    // 1. Bay Doors (hinged along local Z axis on belly edges)
    const doorConfigs: Array<{ id: string; openAngleDeg: number }> = [
      { id: 'gear-door-front', openAngleDeg: -82 },
      { id: 'gear-door-left', openAngleDeg: -86 },
      { id: 'gear-door-right', openAngleDeg: 86 },
    ];

    for (const cfg of doorConfigs) {
      const doorObj = nodes.get(cfg.id);
      if (!doorObj) continue;
      const rest = getPartRestPose(cfg.id);
      scratch.restQuat.set(
        rest.quaternion[0],
        rest.quaternion[1],
        rest.quaternion[2],
        rest.quaternion[3]
      );
      scratch.euler.set(0, 0, cfg.openAngleDeg * frame.doorOpen * DEG2RAD, 'XYZ');
      scratch.deltaQuat.setFromEuler(scratch.euler);
      doorObj.position.set(rest.position[0], rest.position[1], rest.position[2]);
      doorObj.quaternion.copy(scratch.restQuat).multiply(scratch.deltaQuat);
    }

    // 2. Landing Gear Struts (3 distinct articulated pivots retracting into fuselage bays)
    const strutConfigs: Array<{
      id: string;
      rxDeg: number;
      ryDeg: number;
      rzDeg: number;
      retractLiftY: number;
    }> = [
      // Front nose gear swings forward/upward along X into nose bay
      { id: 'gear-strut-front', rxDeg: 86, ryDeg: 0, rzDeg: 0, retractLiftY: 0.12 },
      // Left main gear swings inward (+Z) and slightly aft (+X) into left belly bay
      { id: 'gear-strut-left', rxDeg: 14, ryDeg: 0, rzDeg: 84, retractLiftY: 0.14 },
      // Right main gear swings inward (-Z) and slightly aft (+X) into right belly bay
      { id: 'gear-strut-right', rxDeg: 14, ryDeg: 0, rzDeg: -84, retractLiftY: 0.14 },
    ];

    for (const cfg of strutConfigs) {
      const strutObj = nodes.get(cfg.id);
      if (!strutObj) continue;
      const rest = getPartRestPose(cfg.id);
      scratch.restQuat.set(
        rest.quaternion[0],
        rest.quaternion[1],
        rest.quaternion[2],
        rest.quaternion[3]
      );
      scratch.euler.set(
        cfg.rxDeg * frame.gearRetracted * DEG2RAD,
        cfg.ryDeg * frame.gearRetracted * DEG2RAD,
        cfg.rzDeg * frame.gearRetracted * DEG2RAD,
        'XYZ'
      );
      scratch.deltaQuat.setFromEuler(scratch.euler);
      strutObj.position.set(
        rest.position[0],
        rest.position[1] + cfg.retractLiftY * frame.gearRetracted,
        rest.position[2]
      );
      strutObj.quaternion.copy(scratch.restQuat).multiply(scratch.deltaQuat);
    }

    // 3. Wheels (children of struts; spin around local X axle)
    const wheelIds = ['gear-wheel-front', 'gear-wheel-left', 'gear-wheel-right'];
    for (const wId of wheelIds) {
      const wheelObj = nodes.get(wId);
      if (!wheelObj) continue;
      const rest = getPartRestPose(wId);
      scratch.restQuat.set(
        rest.quaternion[0],
        rest.quaternion[1],
        rest.quaternion[2],
        rest.quaternion[3]
      );
      scratch.euler.set(-frame.wheelAngleRad, 0, 0, 'XYZ');
      scratch.deltaQuat.setFromEuler(scratch.euler);
      wheelObj.position.set(rest.position[0], rest.position[1], rest.position[2]);
      wheelObj.quaternion.copy(scratch.restQuat).multiply(scratch.deltaQuat);
    }
  });

  return null;
};
