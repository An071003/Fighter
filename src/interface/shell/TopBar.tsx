import React from 'react';
import { motion } from 'motion/react';
import { Eye, HelpCircle, Layers, RotateCcw, ShieldCheck } from 'lucide-react';
import {
  selectDisplayModeBadge,
  selectIsFlightModeActive,
} from '@/domain/selectors';
import { getPartById } from '@/domain/partRegistry';
import { useAppStore } from '@/domain/store';
import { QualityMenu } from '../controls/QualityMenu';

export const TopBar: React.FC = () => {
  const mode = useAppStore((s) => s.mode);
  const modeBadge = useAppStore(selectDisplayModeBadge);
  const isFlightActive = useAppStore(selectIsFlightModeActive);
  const explodeProgress = useAppStore((s) => s.explodeProgress);
  const flightElapsedUi = useAppStore((s) => s.flightElapsedUi);
  const flightPhaseLabel = useAppStore((s) => s.flightPhaseLabel);
  const selectedPartId = useAppStore((s) => s.selectedPartId);
  const isCutaway = useAppStore((s) => s.isCutaway);
  const toggleCutaway = useAppStore((s) => s.toggleCutaway);
  const assetAudit = useAppStore((s) => s.assetAudit);
  const isPartsDrawerOpen = useAppStore((s) => s.isPartsDrawerOpen);
  const setPartsDrawerOpen = useAppStore((s) => s.setPartsDrawerOpen);
  const setHelpOpen = useAppStore((s) => s.setHelpOpen);
  const dispatch = useAppStore((s) => s.dispatch);

  const explodePct = Math.round(explodeProgress * 100);
  const selectedPart = getPartById(selectedPartId);

  const autoFlightCutaway =
    mode === 'flight-transition' &&
    (flightPhaseLabel === 'GEAR DOOR OPEN' || flightPhaseLabel === 'GEAR RETRACT');
  const effectiveCutaway = isCutaway || autoFlightCutaway;

  // Compute live engineering telemetry inspired by Reference Video (N1 %, Airspeed kt, Altitude ft)
  const n1Pct = isFlightActive
    ? Math.min(94.8, 21.4 + (flightElapsedUi / 3.2) * 73.4)
    : 21.4;
  const airspeedKt = isFlightActive
    ? Math.round(Math.min(250, (flightElapsedUi / 7.0) * 250))
    : 0;
  const altitudeFt = isFlightActive
    ? Math.round(Math.max(0, ((flightElapsedUi - 1.8) / 5.2) * 10000))
    : 0;

  return (
    <>
      {/* Top Global Utility Header */}
      <header className="fixed top-0 inset-x-0 z-20 px-3 sm:px-6 py-2.5 flex items-center justify-between pointer-events-none">
        {/* Brand + Fig 1 Blueprint Tag + Mode Index */}
        <div className="pointer-events-auto flex items-center gap-2 sm:gap-3 bg-[#0B0F17]/90 backdrop-blur-xl border border-[#263342] rounded-2xl px-3 sm:px-3.5 py-2 shadow-lg whitespace-nowrap">
          <span className="font-mono text-[11px] font-semibold tracking-wider text-[#95A5B3] border-r border-[#263342] pr-2.5">
            {effectiveCutaway ? 'Fig 1 — cutaway' : 'Fig 1'}
          </span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#67E5DF] shadow-[0_0_10px_#67E5DF]" />
            <span className="font-mono text-[11px] sm:text-xs font-bold tracking-widest uppercase text-[#E9F0F5]">
              AERIS X-9
            </span>
          </div>
          <span className="hidden sm:inline text-[#263342]">|</span>
          <div
            data-testid="active-mode-badge"
            className="hidden sm:block font-mono text-[11px] uppercase tracking-wider text-[#67E5DF] whitespace-nowrap"
          >
            <span>{modeBadge.code}</span>
            <span className="text-[#E9F0F5]"> · {modeBadge.labelVi}</span>
          </div>
        </div>

        {/* Utility Actions (Cutaway X-Ray, Parts Explorer, Quality, Help, Reset Scene) */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            data-testid="cutaway-toggle"
            aria-pressed={effectiveCutaway}
            onClick={toggleCutaway}
            title="Chế độ Cutaway X-Ray: Làm trong suốt vỏ thân để quan sát cơ cấu càng đáp & khung sườn bên trong"
            className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-mono font-medium flex items-center gap-1.5 transition-colors ${
              effectiveCutaway
                ? 'bg-[#2B2112]/95 text-[#FFB84D] border-[#FFB84D]/70 shadow-[0_0_18px_rgba(245,166,35,0.25)]'
                : 'bg-[#0B0F17]/90 text-[#E9F0F5] border-[#263342] hover:border-[#FFB84D]/50'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-[#FFB84D]" />
            <span className="hidden sm:inline">Cutaway</span>
          </button>

          <button
            type="button"
            data-testid="parts-drawer-toggle"
            aria-expanded={isPartsDrawerOpen}
            disabled={isFlightActive}
            onClick={() => setPartsDrawerOpen(!isPartsDrawerOpen)}
            title={
              isFlightActive
                ? 'Khóa danh mục bộ phận khi đang bay'
                : 'Mở danh mục 46 bộ phận 3D'
            }
            className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs font-medium flex items-center gap-2 transition-colors ${
              isPartsDrawerOpen
                ? 'bg-[#17222E] text-[#67E5DF] border-[#67E5DF]/60'
                : 'bg-[#0B0F17]/90 text-[#E9F0F5] border-[#263342] hover:border-[#67E5DF]/50 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#67E5DF]" />
            <span className="hidden md:inline">46 Bộ phận</span>
          </button>

          <QualityMenu />

          <button
            type="button"
            data-testid="scene-reset"
            onClick={() => dispatch({ type: 'RESET_SCENE' })}
            title="Khôi phục toàn bộ cảnh về mặc định"
            className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-[#0B0F17]/90 border border-[#263342] hover:border-[#67E5DF]/50 text-xs font-medium text-[#E9F0F5] flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#67E5DF]" />
            <span className="hidden lg:inline">Khôi phục</span>
          </button>

          <button
            type="button"
            data-testid="help-toggle-button"
            aria-label="Mở hướng dẫn phím tắt"
            onClick={() => setHelpOpen(true)}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-[#0B0F17]/90 border border-[#263342] hover:border-[#67E5DF]/50 text-[#E9F0F5] flex items-center justify-center transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-[#67E5DF]" />
          </button>
        </div>
      </header>

      {/* Left Asymmetric Technical Blueprint & Telemetry Overlay */}
      <motion.section
        initial={{ opacity: 0, x: -18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55 }}
        aria-label="Giới thiệu tiêm kích concept AERIS X-9"
        className="fixed top-16 sm:top-20 left-3 sm:left-6 z-10 max-w-[280px] sm:max-w-[320px] pointer-events-none select-none"
      >
        <div className="font-eyebrow text-[#67E5DF] mb-1 flex items-center gap-2">
          <span>SIMULATIONS &amp; DYNAMICS</span>
          {assetAudit?.isHighFidelity && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#141E2B]/90 border border-[#67E5DF]/30 text-[10px] text-[#9EE4BE]">
              <ShieldCheck className="w-3 h-3" />
              46 MESHES
            </span>
          )}
        </div>

        <h1 className="font-display-hero text-[#E9F0F5] tracking-tight mb-1.5 whitespace-nowrap drop-shadow-[0_6px_28px_rgba(0,0,0,0.85)]">
          AERIS X-9
        </h1>

        <p className="hidden sm:block font-body text-xs text-[#95A5B3] max-w-[34ch] mb-3 drop-shadow">
          Trình diễn kết cấu tiêm kích concept tương lai phi vũ trang: xoay 360° trên bàn xoay,
          bóc tách 46 phân cụm cơ khí và biến hình bay tại chỗ.
        </p>

        {/* Live Big Monospace Telemetry Readout (Reference Video Style: N1 % / Airspeed kt / Altitude ft) */}
        <div className="hidden sm:flex items-baseline gap-4 mb-2.5 px-3 py-2 rounded-xl bg-[#0B0F17]/82 backdrop-blur-md border border-[#263342]/80 font-mono">
          <div>
            <span className="text-[9px] uppercase tracking-wider text-[#95A5B3] block">
              {isFlightActive && altitudeFt > 100 ? 'ALTITUDE' : 'N1 • TWIN FAN'}
            </span>
            <span className="text-xl font-bold text-[#E9F0F5] tracking-tight">
              {isFlightActive && altitudeFt > 100
                ? `${altitudeFt.toLocaleString('en-US')} ft`
                : `${n1Pct.toFixed(1)} %`}
            </span>
          </div>
          <div className="border-l border-[#263342] pl-3">
            <span className="text-[9px] uppercase tracking-wider text-[#95A5B3] block">
              AIRSPEED
            </span>
            <span className="text-sm font-semibold text-[#FFB84D]">
              {airspeedKt} kt
            </span>
          </div>
          <div className="border-l border-[#263342] pl-3">
            <span className="text-[9px] uppercase tracking-wider text-[#95A5B3] block">
              GEAR
            </span>
            <span className="text-xs font-semibold text-[#67E5DF]">
              {isFlightActive && flightElapsedUi > 4.2 ? 'UP' : 'DOWN'}
            </span>
          </div>
        </div>

        {/* Honest Visual State Metadata Grid */}
        <div className="hidden md:grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-[#0B0F17]/80 backdrop-blur-md border border-[#263342]/80 text-[11px] font-mono">
          <div>
            <span className="text-[#95A5B3] block text-[10px]">TRẠNG THÁI</span>
            <span className="text-[#E9F0F5] font-semibold">{modeBadge.labelVi}</span>
          </div>
          <div>
            <span className="text-[#95A5B3] block text-[10px]">ĐỘ BÓC TÁCH</span>
            <span className="text-[#67E5DF] font-semibold" data-testid="hud-explode-pct">
              {explodePct}% ({explodePct === 0 ? 'Nguyên khối' : 'Tách lớp'})
            </span>
          </div>
          <div>
            <span className="text-[#95A5B3] block text-[10px]">PHA ĐỘNG HỌC</span>
            <span className="text-[#FFBF81] font-semibold" data-testid="hud-flight-phase">
              {flightPhaseLabel}
            </span>
          </div>
          <div>
            <span className="text-[#95A5B3] block text-[10px]">TÂM MÔ HÌNH XZ</span>
            <span className="text-[#9EE4BE] font-semibold" data-testid="hud-anchor-xz">
              [0.00, 0.00] CỐ ĐỊNH
            </span>
          </div>
        </div>

        {/* Active Callout Annotation Banner (Reference Video Style: 01..08 Callout) */}
        {(selectedPart || isFlightActive || effectiveCutaway) && (
          <div className="hidden lg:block mt-2.5 p-3 rounded-xl bg-[#0B0F17]/90 border-l-2 border-[#FFB84D] border-t border-r border-b border-t-[#263342] border-r-[#263342] border-b-[#263342] font-mono text-xs shadow-xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#FFB84D] font-bold">
                {selectedPart
                  ? String(selectedPart.inspectOrder ?? 1).padStart(2, '0')
                  : autoFlightCutaway
                    ? '08'
                    : isFlightActive
                      ? '07'
                      : '00'}
              </span>
              <span className="text-[#E9F0F5] font-semibold">
                {selectedPart
                  ? `${selectedPart.label.vi} · ${selectedPart.label.en}`
                  : autoFlightCutaway
                    ? 'Main & Nose Landing Gear (Cutaway)'
                    : isFlightActive
                      ? 'Take-off & In-Place Flight Illusion'
                      : 'Cutaway X-Ray Structural View'}
              </span>
            </div>
            <p className="font-body text-[11px] text-[#95A5B3] leading-relaxed">
              {selectedPart
                ? selectedPart.description?.vi
                : autoFlightCutaway
                  ? '3 cụm càng đáp xoay thu gọn vào khoang bụng trong 1.7s, hiển thị xuyên thấu X-Ray màu hổ phách.'
                  : isFlightActive
                    ? 'Hai động cơ tăng tốc N1 94.8%, bàn xoay hạ xuống và luồng khí động chạy qua cánh trong khi tâm XZ khóa tại [0, 0].'
                    : 'Chế độ xuyên thấu vỏ tàng hình, làm nổi bật hệ thống cơ khí, càng đáp và buồng lái bên trong.'}
            </p>
          </div>
        )}
      </motion.section>
    </>
  );
};
