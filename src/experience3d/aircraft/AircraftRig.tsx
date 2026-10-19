import React, { createContext, useContext, useRef } from 'react';
import type * as THREE from 'three';
import type { FlightVisualFrame } from '@/domain/timeline';
import { SHOWROOM_REST_FRAME } from '@/domain/timeline';

export interface AircraftRigContextValue {
  jetAnchorRef: React.RefObject<THREE.Group | null>;
  jetVisualRigRef: React.RefObject<THREE.Group | null>;
  turntableRootRef: React.RefObject<THREE.Group | null>;
  partNodesMapRef: React.RefObject<Map<string, THREE.Object3D>>;
  currentFlightFrameRef: React.RefObject<FlightVisualFrame>;
}

const AircraftRigContext = createContext<AircraftRigContextValue | null>(null);

export function useAircraftRig(): AircraftRigContextValue {
  const ctx = useContext(AircraftRigContext);
  if (!ctx) {
    throw new Error('useAircraftRig must be used inside <AircraftRigProvider>');
  }
  return ctx;
}

export const AircraftRigProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const jetAnchorRef = useRef<THREE.Group | null>(null);
  const jetVisualRigRef = useRef<THREE.Group | null>(null);
  const turntableRootRef = useRef<THREE.Group | null>(null);
  const partNodesMapRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const currentFlightFrameRef = useRef<FlightVisualFrame>(SHOWROOM_REST_FRAME);

  return (
    <AircraftRigContext.Provider
      value={{
        jetAnchorRef,
        jetVisualRigRef,
        turntableRootRef,
        partNodesMapRef,
        currentFlightFrameRef,
      }}
    >
      {children}
    </AircraftRigContext.Provider>
  );
};

export const AircraftRig: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { jetAnchorRef, jetVisualRigRef } = useAircraftRig();

  return (
    <group ref={jetAnchorRef} name="JetAnchor_WorldOrigin" position={[0, 0, 0]}>
      <group ref={jetVisualRigRef} name="JetVisualRig">
        {children}
      </group>
    </group>
  );
};
