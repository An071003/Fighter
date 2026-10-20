import React from 'react';
import {
  Boxes,
  Eye,
  Lightbulb,
  Pause,
  Play,
  PlaneLanding,
  PlaneTakeoff,
  Route,
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
  const isCutaway = useAppStore((s) => s.isCutaway);
  const beaconOn = useAppStore((s) => s.beaconOn);
  const strobeOn = useAppStore((s) => s.strobeOn);
  const landingLightOn = useAppStore((s) => s.landingLightOn);
  const toggleCutaway = useAppStore((s) => s.toggleCutaway);
  const toggleAircraftLight = useAppStore((s) => s.toggleAircraftLight);
  const dispatch = useAppStore((s) => s.dispatch);

  const canExplode = useAppStore(selectCanModifyExplode);
  const canStartFlight = useAppStore(selectCanStartFlight);
  const canReturn = useAppStore(selectCanReturnToShowroom);
  const canPauseResume = useAppStore(selectCanPauseOrResume);
  const isFlightActive = useAppStore(selectIsFlightModeActive);
  const flightBlockedReason = useAppStore(selectStartFlightBlockedReason);

  const explodePct = Math.round(explodeProgress * 100);
  const n1Pct = isFlightActive
    ? Math.min(94.8, 21.4 + (flightElapsedUi / 3.2) * 73.4).toFixed(0)
    : '21';
  const speedKt = isFlightActive
    ? Math.round(Math.min(250, (flightElapsedUi / 7.0) * 250))
    : 0;
  const gearStatus =
    isFlightActive && flightElapsedUi > 4.4
      ? 'gear up'
      : isFlightActive && flightElapsedUi > 3.0
        ? 'gear moving'
        : 'gear down';

  return (
    <footer
      aria-label="Bảng điều khiển trình diễn và timeline 3D"
      className="fixed bottom-0 inset-x-0 z-20 p-2.5 sm:p-4 pointer-events-none"
    >
      {/* Top Row above Transport: Camera Presets + Reference-Style Systems / Lights / Telemetry Strip */}
      <div className="max-w-[1380px] mx-auto hidden xl:flex items-center justify-between mb-2 gap-3">
        <div className="pointer-events-auto rounded-2xl bg-[#0B0F17]/88 backdrop-blur-xl border border-[#263342] px-3 py-1.5 shadow-lg">
          <CameraPresets />
        </div>

        {/* Reference Video SYSTEMS & LIGHTS Bar + Status Line */}
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-[#0B0F17]/88 backdrop-blur-xl border border-[#263342] px-3.5 py-1.5 shadow-lg font-mono text-[11px]">
          <span className="text-[#95A5B3] uppercase tracking-wider text-[10px]">
            SYSTEMS
          </span>
          <button
            type="button"
            onClick={toggleCutaway}
            className={`px-2.5 py-1 rounded-lg border text-[11px] inline-flex items-center gap-1.5 transition-colors ${
              isCutaway
                ? 'bg-[#2B2112] text-[#FFB84D] border-[#FFB84D]/70'
                : 'bg-[#121924] text-[#E9F0F5] border-[#263342] hover:border-[#FFB84D]/50'
            }`}
          >
            <Eye className="w-3 h-3 text-[#FFB84D]" />
            <span>Cutaway</span>
          </button>

          <span className="text-[#263342]">|</span>
          <span className="text-[#95A5B3] uppercase tracking-wider text-[10px]">
            LIGHTS
          </span>
          <button
            type="button"
            onClick={() => toggleAircraftLight('beacon')}
            className={`px-2 py-1 rounded-lg border text-[11px] transition-colors ${
              beaconOn
                ? 'bg-[#17222E] text-[#FF6B6B] border-[#FF6B6B]/50'
                : 'bg-[#121924] text-[#95A5B3] border-[#263342]'
            }`}
          >
            Beacon {beaconOn ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            onClick={() => toggleAircraftLight('strobe')}
            className={`px-2 py-1 rounded-lg border text-[11px] transition-colors ${
              strobeOn
                ? 'bg-[#17222E] text-[#67E5DF] border-[#67E5DF]/50'
                : 'bg-[#121924] text-[#95A5B3] border-[#263342]'
            }`}
          >
            Strobe {strobeOn ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            onClick={() => toggleAircraftLight('landing')}
            className={`px-2 py-1 rounded-lg border text-[11px] inline-flex items-center gap-1 transition-colors ${
              landingLightOn
                ? 'bg-[#2B2112] text-[#FFE08A] border-[#FFE08A]/50'
                : 'bg-[#121924] text-[#95A5B3] border-[#263342]'
            }`}
          >
            <Lightbulb className="w-3 h-3" />
            <span>Nose Taxi {landingLightOn ? 'ON' : 'OFF'}</span>
          </button>

          <span className="text-[#263342]">|</span>
          <span className="text-[#95A5B3] text-[11px]">
            {flightPhaseLabel} · N1 {n1Pct}% · {speedKt} kt · {gearStatus}
          </span>
        </div>
      </div>

      <div className="max-w-[1380px] mx-auto pointer-events-auto rounded-2xl bg-[#0B0F17]/94 backdrop-blur-2xl border border-[#263342] px-3.5 py-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.75)] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Left: Segmented Mode Switch */}
        <div className="flex items-center justify-between lg:justify-start gap-2 shrink-0">
          <ModeSwitch />
        </div>

        {/* Center: Context-Aware Explode Slider OR Flight Timeline Transport */}
        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 px-1 lg:px-6">
          {!isFlightActive ? (
            <div className="flex items-center gap-3.5 w-full max-w-xl">
              <button
                type="button"
                data-testid="explode-toggle"
                disabled={!canExplode}
                onClick={() => dispatch({ type: 'TOGGLE_EXPLODE' })}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 shrink-0 whitespace-nowrap transition-colors ${
                  explodeProgress > 0.05
                    ? 'bg-[#17222E] text-[#67E5DF] border-[#67E5DF]/60'
                    : 'bg-[#070A0F] text-[#E9F0F5] border-[#263342] hover:border-[#67E5DF]/50'
                }`}
              >
                <Boxes className="w-4 h-4 text-[#67E5DF]" />
                <span>{explodeProgress > 0.05 ? 'Lắp lại (0%)' : 'Tháo rời (100%)'}</span>
              </button>

              <div className="flex-1 min-w-[160px] flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px] font-mono whitespace-nowrap">
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
              className="flex items-center gap-2.5 w-full max-w-xl"
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
                className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-[#070A0F] border border-[#263342] hover:border-[#67E5DF]/50 text-xs font-medium text-[#E9F0F5] inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
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
                className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-[#070A0F] border border-[#263342] hover:border-[#67E5DF]/50 text-xs font-medium text-[#E9F0F5] inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                title="Phát lại chu trình biến hình từ 0.0s"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#67E5DF]" />
                <span className="hidden sm:inline">Chạy lại</span>
              </button>

              {/* Progress Bar 0.0s - 7.0s */}
              <div className="flex-1 flex flex-col gap-1 min-w-[140px]">
                <div className="flex items-center justify-between text-[11px] font-mono whitespace-nowrap">
                  <span className="text-[#FFBF81] font-semibold">{flightPhaseLabel}</span>
                  <span className="text-[#E9F0F5]">
                    {flightElapsedUi.toFixed(1)}s / {FLIGHT_DURATION_SECONDS.toFixed(1)}s
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#070A0F] border border-[#263342] overflow-hidden">
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

        {/* Right: Primary Action CTA */}
        <div className="flex items-center justify-between lg:justify-end gap-2.5 shrink-0">
          {!isFlightActive ? (
            <div className="flex items-center gap-2.5">
              {flightBlockedReason && (
                <span
                  data-testid="flight-blocked-hint"
                  className="hidden md:inline-block text-[11px] font-mono text-[#FFBF81] bg-[#17222E]/90 border border-[#FFBF81]/30 px-2.5 py-1.5 rounded-lg max-w-[240px] truncate"
                  title={flightBlockedReason}
                >
                  {flightBlockedReason}
                </span>
              )}
              <button
                type="button"
                data-testid="story-start"
                disabled={!canStartFlight}
                onClick={() => dispatch({ type: 'STORY_GOTO', index: 0 })}
                title={flightBlockedReason ?? 'Hành trình bay 7 pha có chú thích (Phím 1–7)'}
                className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#070A0F] border border-[#F5A623]/60 text-[#FFD08A] font-semibold text-xs uppercase tracking-wider inline-flex items-center gap-2 whitespace-nowrap hover:bg-[#2B2112]/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Route className="w-4 h-4" />
                <span className="hidden sm:inline">Hành trình 7 pha</span>
              </button>
              <button
                type="button"
                data-testid="flight-start"
                disabled={!canStartFlight}
                onClick={() => dispatch({ type: 'START_FLIGHT' })}
                title={
                  flightBlockedReason ??
                  'Khởi động chu trình biến hình cất cánh 7 giây (Phím F)'
                }
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#67E5DF] text-[#070A0F] font-bold text-xs uppercase tracking-wider inline-flex items-center gap-2 whitespace-nowrap shadow-[0_0_24px_rgba(103,229,223,0.35)] hover:bg-[#67E5DF]/90 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed transition-all"
              >
                <PlaneTakeoff className="w-4 h-4" />
                <span>Mô phỏng bay</span>
              </button>
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
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#FFBF81] text-[#070A0F] font-bold text-xs uppercase tracking-wider inline-flex items-center gap-2 whitespace-nowrap shadow-[0_0_24px_rgba(255,191,129,0.3)] hover:bg-[#FFBF81]/90 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed transition-all"
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
