import React, { useState } from 'react';
import { EyeOff, Gauge, SlidersHorizontal } from 'lucide-react';
import { useAppStore } from '@/domain/store';
import type { QualityTier } from '@/domain/types';

const TIERS: Array<{ id: QualityTier; label: string }> = [
  { id: 'auto', label: 'Tự động (Auto)' },
  { id: 'high', label: 'Cao (High)' },
  { id: 'medium', label: 'Trung bình (Med)' },
  { id: 'low', label: 'Nhẹ (Low)' },
];

export const QualityMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const qualityTier = useAppStore((s) => s.qualityTier);
  const resolvedQuality = useAppStore((s) => s.resolvedQuality);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const dispatch = useAppStore((s) => s.dispatch);

  return (
    <div className="relative">
      <button
        type="button"
        data-testid="quality-menu-button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-[#0E141D]/90 border border-[#2D3B49] hover:border-[#67E5DF]/50 text-xs font-medium text-[#E9F0F5] flex items-center gap-2 transition-colors"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-[#67E5DF]" />
        <span className="hidden sm:inline">Đồ họa:</span>
        <span className="font-mono uppercase text-[#67E5DF]">
          {qualityTier === 'auto' ? `AUTO·${resolvedQuality}` : qualityTier}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Tùy chỉnh chất lượng và chuyển động"
          className="absolute right-0 mt-2 w-60 rounded-2xl bg-[#0E141D]/95 backdrop-blur-xl border border-[#2D3B49] p-3 shadow-2xl z-50"
        >
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#95A5B3] mb-2 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-[#67E5DF]" />
            <span>Cấu hình kết xuất 3D</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {TIERS.map((t) => {
              const active = qualityTier === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  data-testid={`quality-option-${t.id}`}
                  onClick={() => {
                    dispatch({ type: 'SET_QUALITY', tier: t.id });
                    setOpen(false);
                  }}
                  className={`min-h-[40px] px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors border ${
                    active
                      ? 'bg-[#17222E] text-[#67E5DF] border-[#67E5DF]/60'
                      : 'bg-[#070A0F]/60 text-[#E9F0F5] border-transparent hover:border-[#2D3B49]'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="border-t border-[#2D3B49] pt-2.5">
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={reducedMotion}
              data-testid="reduced-motion-toggle"
              onClick={() => {
                dispatch({ type: 'SET_REDUCED_MOTION', enabled: !reducedMotion });
              }}
              className={`w-full min-h-[44px] px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between border transition-colors ${
                reducedMotion
                  ? 'bg-[#17222E] text-[#67E5DF] border-[#67E5DF]/60'
                  : 'bg-[#070A0F]/60 text-[#E9F0F5] border-[#2D3B49]'
              }`}
            >
              <span className="flex items-center gap-2">
                <EyeOff className="w-3.5 h-3.5 text-[#67E5DF]" />
                <span>Giảm chuyển động</span>
              </span>
              <span className="font-mono text-[11px] uppercase">
                {reducedMotion ? 'BẬT' : 'TẮT'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
