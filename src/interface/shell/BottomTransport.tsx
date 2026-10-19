import React from 'react';
import {
  Boxes,
  Pause,
  Play,
  PlaneLanding,
  PlaneTakeoff,
  RotateCcw,
} from 'lucide-react';
import { FLIGHT_DURATION_SECONDS } from '@/domain/config';
import {
  selectCanModifyExplode,
  selectCanPauseOrResume,
  selectCanReturnToShowroom,
  selectCanStartFlight,
  selectIsFlightModeActive,
  selectStartFlightBlockedReason,
} from '@/domain/selectors';
import { useAppStore } from '@/domain/store';
import { CameraPresets } from '../controls/CameraPresets';
import { ModeSwitch } from '../controls/ModeSwitch';

export const BottomTransport: React.FC = () => {
  const mode = useAppStore((s) => s.mode);
  const explodeProgress = useAppStore((s) => s.explodeProgress);
  const flightPaused = useAppStore((s) => s.flightPaused);
  const flightElapsedUi = useAppStore((s) => s.flightElapsedUi);
  const flightPhaseLabel = useAppStore((s) => s.flightPhaseLabel);
  const dispatch = useAppStore((s) => s.dispatch);

  const canExplode = useAppStore(selectCanModifyExplode);
  const canStartFlight = useAppStore(selectCanStartFlight);
  const canReturn = useAppStore(selectCanReturnToShowroom);
  const canPauseResume = useAppStore(selectCanPauseOrResume);
  const isFlightActive = useAppStore(selectIsFlightModeActive);
  const flightBlockedReason = useAppStore(selectStartFlightBlockedReason);

  const explodePct = Math.round(explodeProgress * 100);

  return (
    <footer
      aria-label="Bảng điều khiển trình diễn và timeline 3D"
      className="fixed bottom-0 inset-x-0 z-20 p-2.5 sm:p-5 pointer-events-none"
    >
      <div className="max-w-[1380px] mx-auto pointer-events-auto rounded-2xl bg-[#0E141D]/90 backdrop-blur-2xl border border-[#2D3B49] px-3.5 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.7)] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Left: Segmented Mode Switch */}
        <div className="flex items-center justify-between lg:justify-start gap-2">
          <ModeSwitch />
        </div>

        {/* Center: Context-Aware Explode Slider OR Flight Timeline Transport */}
        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 px-1 lg:px-4">
          {!isFlightActive ? (
            <div className="flex items-center gap-3 w-full max-w-md">
              <button
                type="button"
                data-testid="explode-toggle"
                disabled={!canExplode}
                onClick={() => dispatch({ type: 'TOGGLE_EXPLODE' })}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 shrink-0 transition-colors ${
                  explodeProgress > 0.05
                    ? 'bg-[#17222E] text-[#67E5DF] border-[#67E5DF]/60'
                    : 'bg-[#070A0F] text-[#E9F0F5] border-[#2D3B49] hover:border-[#67E5DF]/50'
                }`}
              >
                <Boxes className="w-4 h-4 text-[#67E5DF]" />
                <span>{explodeProgress > 0.05 ? 'Lắp lại (0%)' : 'Tháo rời (100%)'}</span>
              </button>

              <div className="flex-1 flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <label htmlFor="explode-range-slider" className="text-[#95A5B3]">
                    ĐỘ TÁCH CẤU TRÚC
                  </label>
                  <span className="text-[#67E5DF] font-semibold">{explodePct}%</span>
                </div>
                <input
                  id="explode-range-slider"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  disabled={!canExplode}
                  value={explodePct}
                  aria-label="Thanh trượt độ tách cấu trúc 0 đến 100 phần trăm"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={explodePct}
                  aria-valuetext={`${explodePct} phần trăm`}
                  data-testid="explode-slider"
                  onChange={(e) =>
                    dispatch({
                      type: 'SET_EXPLODE_PROGRESS',
                      value: Number(e.target.value) / 100,
                    })
                  }
                  className="aeris-slider w-full h-5"
                />
              </div>
            </div>
          ) : (
            <div
              data-testid="flight-transport-controls"
              className="flex items-center gap-2.5 w-full max-w-lg"
            >
              <button
                type="button"
                data-testid="flight-pause-toggle"
                disabled={!canPauseResume}
                onClick={() =>
                  dispatch({
                    type: flightPaused ? 'RESUME_FLIGHT' : 'PAUSE_FLIGHT',
                  })
                }
                className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-[#070A0F] border border-[#2D3B49] hover:border-[#67E5DF]/50 text-xs font-medium text-[#E9F0F5] inline-flex items-center justify-center gap-1.5"
              >
                {flightPaused ? (
                  <>
                    <Play className="w-3.5 h-3.5 text-[#67E5DF]" />
                    <span>Tiếp tục</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 text-[#FFBF81]" />
                    <span>Tạm dừng</span>
                  </>
                )}
              </button>

              <button
                type="button"
                data-testid="flight-replay"
                onClick={() => dispatch({ type: 'REPLAY_FLIGHT' })}
                className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-[#070A0F] border border-[#2D3B49] hover:border-[#67E5DF]/50 text-xs font-medium text-[#E9F0F5] inline-flex items-center justify-center gap-1.5"
                title="Phát lại chu trình biến hình từ 0.0s"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#67E5DF]" />
                <span className="hidden sm:inline">Chạy lại</span>
              </button>

              {/* Progress Bar 0.0s - 7.0s */}
              <div className="flex-1 flex flex-col gap-1 min-w-[110px]">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[#FFBF81] font-semibold">{flightPhaseLabel}</span>
                  <span className="text-[#E9F0F5]">
                    {flightElapsedUi.toFixed(1)}s / {FLIGHT_DURATION_SECONDS.toFixed(1)}s
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#070A0F] border border-[#2D3B49] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#67E5DF] to-[#FFBF81] transition-all duration-100"
                    style={{
                      width: `${Math.min(
                        100,
                        (flightElapsedUi / FLIGHT_DURATION_SECONDS) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Primary Action CTA + Camera Presets */}
        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5">
          <div className="hidden xl:block">
            <CameraPresets />
          </div>

          {!isFlightActive ? (
            <div className="flex flex-col items-end">
              <button
                type="button"
                data-testid="flight-start"
                disabled={!canStartFlight}
                onClick={() => dispatch({ type: 'START_FLIGHT' })}
                title={
                  flightBlockedReason ??
                  'Khởi động chu trình biến hình cất cánh 7 giây (Phím F)'
                }
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#67E5DF] text-[#070A0F] font-bold text-xs uppercase tracking-wider inline-flex items-center gap-2 shadow-[0_0_24px_rgba(103,229,223,0.35)] hover:bg-[#67E5DF]/90 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed transition-all"
              >
                <PlaneTakeoff className="w-4 h-4" />
                <span>Mô phỏng bay</span>
              </button>
              {flightBlockedReason && (
                <span
                  data-testid="flight-blocked-hint"
                  className="text-[10px] font-mono text-[#FFBF81] mt-0.5"
                >
                  {flightBlockedReason}
                </span>
              )}
            </div>
          ) : (
            <button
              type="button"
              data-testid="flight-return"
              disabled={!canReturn}
              onClick={() => dispatch({ type: 'RETURN_TO_SHOWROOM' })}
              title={
                canReturn
                  ? 'Hạ càng đáp và đưa máy bay trở về bàn xoay trưng bày'
                  : 'Đang trong quá trình chuyển tiếp (chờ hoàn tất 7.0s)'
              }
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#FFBF81] text-[#070A0F] font-bold text-xs uppercase tracking-wider inline-flex items-center gap-2 shadow-[0_0_24px_rgba(255,191,129,0.3)] hover:bg-[#FFBF81]/90 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed transition-all"
            >
              <PlaneLanding className="w-4 h-4" />
              <span>{mode === 'return-transition' ? 'Đang hạ cánh...' : 'Về trưng bày'}</span>
            </button>
          )}
        </div>
      </div>
    </footer>
  );
};
