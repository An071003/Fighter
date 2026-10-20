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
        className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-md bg-[#111113]/90 border border-[#333438] hover:border-[#F2F3F5]/50 text-xs font-medium text-[#EDEEF0] flex items-center gap-2 transition-colors"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-[#F2F3F5]" />
        <span className="hidden sm:inline">Đồ họa:</span>
        <span className="font-mono uppercase text-[#F2F3F5]">
          {qualityTier === 'auto' ? `AUTO·${resolvedQuality}` : qualityTier}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Tùy chỉnh chất lượng và chuyển động"
          className="absolute right-0 mt-2 w-60 rounded-lg bg-[#111113]/95 backdrop-blur-xl border border-[#333438] p-3 shadow-2xl z-50"
        >
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#9A9EA4] mb-2 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-[#F2F3F5]" />
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
                      ? 'bg-[#1C1D20] text-[#F2F3F5] border-[#F2F3F5]/60'
                      : 'bg-[#0A0A0B]/60 text-[#EDEEF0] border-transparent hover:border-[#333438]'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="border-t border-[#333438] pt-2.5">
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
                  ? 'bg-[#1C1D20] text-[#F2F3F5] border-[#F2F3F5]/60'
                  : 'bg-[#0A0A0B]/60 text-[#EDEEF0] border-[#333438]'
              }`}
            >
              <span className="flex items-center gap-2">
                <EyeOff className="w-3.5 h-3.5 text-[#F2F3F5]" />
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
