import React from 'react';
import { motion } from 'motion/react';
import { HelpCircle, Layers, RotateCcw, ShieldCheck } from 'lucide-react';
import {
  selectDisplayModeBadge,
  selectIsFlightModeActive,
} from '@/domain/selectors';
import { useAppStore } from '@/domain/store';
import { QualityMenu } from '../controls/QualityMenu';

export const TopBar: React.FC = () => {
  const modeBadge = useAppStore(selectDisplayModeBadge);
  const isFlightActive = useAppStore(selectIsFlightModeActive);
  const explodeProgress = useAppStore((s) => s.explodeProgress);
  const flightPhaseLabel = useAppStore((s) => s.flightPhaseLabel);
  const assetAudit = useAppStore((s) => s.assetAudit);
  const isPartsDrawerOpen = useAppStore((s) => s.isPartsDrawerOpen);
  const setPartsDrawerOpen = useAppStore((s) => s.setPartsDrawerOpen);
  const setHelpOpen = useAppStore((s) => s.setHelpOpen);
  const dispatch = useAppStore((s) => s.dispatch);

  const explodePct = Math.round(explodeProgress * 100);

  return (
    <>
      {/* Top Global Utility Header */}
      <header className="fixed top-0 inset-x-0 z-20 px-3 sm:px-6 py-2.5 flex items-center justify-between pointer-events-none">
        {/* Brand + Mode Index */}
        <div className="pointer-events-auto flex items-center gap-2 sm:gap-3 bg-[#0E141D]/85 backdrop-blur-xl border border-[#2D3B49] rounded-2xl px-3 sm:px-3.5 py-2 shadow-lg whitespace-nowrap">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#67E5DF] shadow-[0_0_10px_#67E5DF]" />
            <span className="font-mono text-[11px] sm:text-xs font-bold tracking-widest uppercase text-[#E9F0F5]">
              AERIS X-9
            </span>
          </div>
          <span className="hidden sm:inline text-[#2D3B49]">|</span>
          <div
            data-testid="active-mode-badge"
            className="hidden sm:block font-mono text-[11px] uppercase tracking-wider text-[#67E5DF] whitespace-nowrap"
          >
            <span>{modeBadge.code}</span>
            <span className="text-[#E9F0F5]"> · {modeBadge.labelVi}</span>
          </div>
        </div>

        {/* Utility Actions (Parts Explorer, Quality, Help, Reset Scene) */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
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
                : 'bg-[#0E141D]/90 text-[#E9F0F5] border-[#2D3B49] hover:border-[#67E5DF]/50 disabled:opacity-40 disabled:cursor-not-allowed'
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
            className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-[#0E141D]/90 border border-[#2D3B49] hover:border-[#67E5DF]/50 text-xs font-medium text-[#E9F0F5] flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#67E5DF]" />
            <span className="hidden lg:inline">Khôi phục</span>
          </button>

          <button
            type="button"
            data-testid="help-toggle-button"
            aria-label="Mở hướng dẫn phím tắt"
            onClick={() => setHelpOpen(true)}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-[#0E141D]/90 border border-[#2D3B49] hover:border-[#67E5DF]/50 text-[#E9F0F5] flex items-center justify-center transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-[#67E5DF]" />
          </button>
        </div>
      </header>

      {/* Left Asymmetric Editorial Hero Overlay (Unobstructed 3D Center-Right) */}
      <motion.section
        initial={{ opacity: 0, x: -18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55 }}
        aria-label="Giới thiệu tiêm kích concept AERIS X-9"
        className="fixed top-16 sm:top-20 left-3 sm:left-6 z-10 max-w-[290px] sm:max-w-[340px] pointer-events-none select-none"
      >
        <div className="font-eyebrow text-[#67E5DF] mb-1.5 flex items-center gap-2">
          <span>SIMULATIONS &amp; DYNAMICS</span>
          {assetAudit?.isHighFidelity && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#17222E]/90 border border-[#67E5DF]/30 text-[10px] text-[#9EE4BE]">
              <ShieldCheck className="w-3 h-3" />
              46 MESHES
            </span>
          )}
        </div>

        <h1 className="font-display-hero text-[#E9F0F5] tracking-tight mb-2 whitespace-nowrap drop-shadow-[0_6px_28px_rgba(0,0,0,0.85)]">
          AERIS X-9
        </h1>

        <p className="hidden sm:block font-body text-xs sm:text-sm text-[#95A5B3] max-w-[36ch] mb-4 drop-shadow">
          Trình diễn kết cấu tiêm kích concept tương lai phi vũ trang: xoay 360° trên bàn xoay,
          bóc tách 46 phân cụm cơ khí và biến hình bay tại chỗ.
        </p>

        {/* Honest Visual State Metadata Grid (No Fake Mach Numbers) */}
        <div className="hidden md:grid grid-cols-2 gap-2 p-3 rounded-2xl bg-[#0E141D]/78 backdrop-blur-md border border-[#2D3B49]/80 text-[11px] font-mono">
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
      </motion.section>
    </>
  );
};
