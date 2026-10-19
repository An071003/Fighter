import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useAppStore } from '@/domain/store';

export const QualityManager: React.FC = () => {
  const { gl } = useThree();
  const qualityTier = useAppStore((s) => s.qualityTier);
  const resolvedQuality = useAppStore((s) => s.resolvedQuality);
  const setResolvedQuality = useAppStore((s) => s.setResolvedQuality);
  const dispatch = useAppStore((s) => s.dispatch);

  const frameCountRef = useRef<number>(0);
  const accumTimeRef = useRef<number>(0);
  const lastTierChangeMsRef = useRef<number>(0);

  // Handle WebGL context loss / restoration and document visibility pause
  useEffect(() => {
    const canvas = gl.domElement;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      dispatch({ type: 'PAUSE_FLIGHT' });
    };

    const handleContextRestored = () => {
      dispatch({ type: 'RESET_VIEW' });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const state = useAppStore.getState();
        if (state.mode === 'flight-transition' || state.mode === 'return-transition') {
          dispatch({ type: 'PAUSE_FLIGHT' });
        }
      }
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [gl.domElement, dispatch]);

  useFrame((_, rawDelta) => {
    if (qualityTier !== 'auto') return;

    frameCountRef.current += 1;
    accumTimeRef.current += rawDelta;

    // Sample rolling FPS every 3.5 seconds with hysteresis cooldown
    if (accumTimeRef.current >= 3.5) {
      const fps = frameCountRef.current / accumTimeRef.current;
      frameCountRef.current = 0;
      accumTimeRef.current = 0;

      const now = performance.now();
      if (now - lastTierChangeMsRef.current < 6000) return;

      if (fps < 32 && resolvedQuality === 'high') {
        lastTierChangeMsRef.current = now;
        setResolvedQuality('medium');
      } else if (fps < 24 && resolvedQuality === 'medium') {
        lastTierChangeMsRef.current = now;
        setResolvedQuality('low');
      } else if (fps > 54 && resolvedQuality === 'low') {
        lastTierChangeMsRef.current = now;
        setResolvedQuality('medium');
      }
    }
  });

  return null;
};
