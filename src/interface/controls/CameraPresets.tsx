import React from 'react';
import { Camera, RotateCcw } from 'lucide-react';
import { CAMERA_PRESETS } from '@/domain/config';
import { selectIsFlightModeActive } from '@/domain/selectors';
import { useAppStore } from '@/domain/store';
import type { CameraPresetName } from '@/domain/types';

const PRESET_ORDER: CameraPresetName[] = ['hero', 'front', 'side', 'top', 'detail'];

export const CameraPresets: React.FC = () => {
  const cameraPreset = useAppStore((s) => s.cameraPreset);
  const mode = useAppStore((s) => s.mode);
  const isFlightActive = useAppStore(selectIsFlightModeActive);
  const dispatch = useAppStore((s) => s.dispatch);

  const isLocked = mode === 'flight-transition' || mode === 'return-transition';

  return (
    <div
      role="group"
      aria-label="Góc máy quay thiết lập sẵn"
      className="flex items-center gap-1 flex-nowrap whitespace-nowrap"
    >
      <span className="hidden 2xl:inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-[#95A5B3] mr-1">
        <Camera className="w-3.5 h-3.5 text-[#67E5DF]" />
        <span>Góc nhìn:</span>
      </span>

      {PRESET_ORDER.map((presetKey) => {
        const cfg = CAMERA_PRESETS[presetKey];
        const isActive = cameraPreset === presetKey && !isFlightActive;
        return (
          <button
            key={presetKey}
            type="button"
            disabled={isLocked}
            data-testid={`camera-preset-${presetKey}`}
            onClick={() => dispatch({ type: 'SET_CAMERA_PRESET', preset: presetKey })}
            className={`min-h-[36px] px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors border whitespace-nowrap ${
              isActive
                ? 'bg-[#17222E] text-[#67E5DF] border-[#67E5DF]/50'
                : 'bg-[#070A0F]/75 text-[#95A5B3] hover:text-[#E9F0F5] border-[#2D3B49]/70 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            {cfg.label.vi}
          </button>
        );
      })}

      <button
        type="button"
        data-testid="camera-reset-button"
        onClick={() => dispatch({ type: 'RESET_VIEW' })}
        title="Đặt lại góc máy quay (Phím R)"
        className="min-h-[36px] min-w-[36px] px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#070A0F]/80 text-[#E9F0F5] hover:text-[#67E5DF] border border-[#2D3B49] hover:border-[#67E5DF]/50 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Đặt lại góc</span>
      </button>
    </div>
  );
};
