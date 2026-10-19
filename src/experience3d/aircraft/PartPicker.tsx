import React, { useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type * as THREE from 'three';
import { useAppStore } from '@/domain/store';

function resolvePartIdFromObject(obj: THREE.Object3D | null): string | null {
  let curr: THREE.Object3D | null = obj;
  while (curr) {
    if (typeof curr.userData?.partId === 'string') {
      return curr.userData.partId;
    }
    curr = curr.parent;
  }
  return null;
}

export const PartPicker: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const dispatch = useAppStore((s) => s.dispatch);
  const setHoveredPartId = useAppStore((s) => s.setHoveredPartId);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (pointerDownPosRef.current) {
      const dx = e.clientX - pointerDownPosRef.current.x;
      const dy = e.clientY - pointerDownPosRef.current.y;
      // Drag > 4px is treated as camera orbit gesture, not part click
      if (Math.hypot(dx, dy) > 4) {
        return;
      }
    }
    const partId = resolvePartIdFromObject(e.object);
    if (partId) {
      dispatch({ type: 'SELECT_PART', partId });
    }
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const partId = resolvePartIdFromObject(e.object);
    setHoveredPartId(partId);
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHoveredPartId(null);
  };

  return (
    <group
      name="PartPickerBoundary"
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
    >
      {children}
    </group>
  );
};
