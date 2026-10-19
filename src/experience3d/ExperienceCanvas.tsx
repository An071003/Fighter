import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { CAMERA_PRESETS, QUALITY_SETTINGS } from '@/domain/config';
import { useAppStore } from '@/domain/store';
import { SceneRoot } from './SceneRoot';

function detectWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

export const ExperienceCanvas: React.FC = () => {
  const resolvedQuality = useAppStore((s) => s.resolvedQuality);
  const dispatch = useAppStore((s) => s.dispatch);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);

  useEffect(() => {
    const supported = detectWebGLSupport();
    setWebglSupported(supported);
    if (!supported) {
      dispatch({
        type: 'LOAD_FAILURE',
        reason: 'Trình duyệt hoặc thiết bị hiện tại không hỗ trợ WebGL.',
      });
    }
  }, [dispatch]);

  if (!webglSupported) {
    return null;
  }

  const qualityCfg = QUALITY_SETTINGS[resolvedQuality];

  return (
    <div
      className="fixed inset-0 z-0 w-full h-full"
      aria-label="Khung cảnh 3D tương tác tiêm kích concept AERIS X-9"
      role="region"
    >
      <Canvas
        shadows={qualityCfg.enableShadows ? 'percentage' : false}
        dpr={qualityCfg.dpr}
        camera={{
          position: CAMERA_PRESETS.hero.position,
          fov: CAMERA_PRESETS.hero.fov,
          near: 0.1,
          far: 120,
        }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,
        }}
        onPointerMissed={() => {
          const state = useAppStore.getState();
          if (state.selectedPartId !== null) {
            state.dispatch({ type: 'DESELECT_PART' });
          }
        }}
      >
        <SceneRoot />
      </Canvas>
    </div>
  );
};
