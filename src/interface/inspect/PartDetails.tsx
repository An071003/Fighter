import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Crosshair, Eye, Layers, X } from 'lucide-react';
import { CATEGORY_LABELS } from '@/domain/config';
import { selectSelectedPart } from '@/domain/selectors';
import { useAppStore } from '@/domain/store';
import { PartsTree } from './PartsTree';

export const PartDetails: React.FC = () => {
  const selectedPart = useAppStore(selectSelectedPart);
  const isIsolated = useAppStore((s) => s.isIsolated);
  const isPartsDrawerOpen = useAppStore((s) => s.isPartsDrawerOpen);
  const setPartsDrawerOpen = useAppStore((s) => s.setPartsDrawerOpen);
  const dispatch = useAppStore((s) => s.dispatch);

  const isOpen = isPartsDrawerOpen || selectedPart !== null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 28 }}
          transition={{ duration: 0.24 }}
          aria-label="Bảng thông tin và danh mục bộ phận 3D"
          data-testid="part-details-drawer"
          className="fixed z-30 right-3 md:right-6 top-16 md:top-16 bottom-44 md:bottom-36 w-[calc(100vw-1.5rem)] sm:w-[360px] max-h-[54vh] md:max-h-none rounded-lg bg-[#111113]/92 backdrop-blur-2xl border border-[#333438] shadow-[0_24px_80px_rgba(0,0,0,0.65)] flex flex-col overflow-hidden pointer-events-auto"
        >
          {/* Drawer Header */}
          <div className="px-4 py-3 border-b border-[#333438] flex items-center justify-between bg-[#0A0A0B]/60">
            <div>
              <div className="font-eyebrow text-[#F2F3F5]">
                {selectedPart ? 'CHI TIẾT CẤU KIỆN 3D' : 'DANH MỤC HỆ THỐNG'}
              </div>
              <h2 className="text-sm font-semibold text-[#EDEEF0]">
                {selectedPart ? selectedPart.label.vi : 'Khám phá 46 bộ phận độc lập'}
              </h2>
            </div>

            <button
              type="button"
              data-testid="close-parts-drawer"
              aria-label="Đóng bảng cấu trúc"
              onClick={() => {
                dispatch({ type: 'DESELECT_PART' });
                setPartsDrawerOpen(false);
              }}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-[#9A9EA4] hover:text-[#EDEEF0] hover:bg-[#1C1D20]/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Selected Part Inspector Card (if a part is selected) */}
          {selectedPart && (
            <div
              data-testid="selected-part-card"
              className="p-4 border-b border-[#333438] bg-[#1C1D20]/55 space-y-3 shrink-0"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-base font-bold text-[#EDEEF0]">
                    {selectedPart.label.vi}
                  </div>
                  <div className="text-xs text-[#9A9EA4] font-mono">
                    {selectedPart.label.en} · #{selectedPart.inspectOrder}/46
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-[#0A0A0B] border border-[#F2F3F5]/40 text-[11px] font-mono text-[#F2F3F5]">
                  {CATEGORY_LABELS[selectedPart.category].vi}
                </span>
              </div>

              <p className="text-xs text-[#EDEEF0]/90 leading-relaxed">
                {selectedPart.description?.vi}
              </p>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-[#0A0A0B]/80 p-2.5 rounded-md border border-[#333438]/80">
                <div>
                  <span className="text-[#9A9EA4] block">NODE GLB:</span>
                  <span className="text-[#F2F3F5] truncate block" title={selectedPart.nodeName}>
                    {selectedPart.nodeName}
                  </span>
                </div>
                <div>
                  <span className="text-[#9A9EA4] block">VECTOR TÁCH:</span>
                  <span className="text-[#EDEEF0]">
                    [{selectedPart.explode.offset.map((n) => n.toFixed(1)).join(', ')}]
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  data-testid="part-focus-button"
                  onClick={() =>
                    dispatch({ type: 'SELECT_PART', partId: selectedPart.id })
                  }
                  className="flex-1 min-h-[44px] px-3 py-2 rounded-md bg-[#F2F3F5] text-[#0A0A0B] font-semibold text-xs inline-flex items-center justify-center gap-1.5 hover:bg-[#F2F3F5]/90 transition-colors"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Tập trung</span>
                </button>

                <button
                  type="button"
                  data-testid="part-isolate-toggle"
                  aria-pressed={isIsolated}
                  onClick={() => dispatch({ type: 'TOGGLE_ISOLATE_PART' })}
                  className={`flex-1 min-h-[44px] px-3 py-2 rounded-md font-semibold text-xs inline-flex items-center justify-center gap-1.5 border transition-colors ${
                    isIsolated
                      ? 'bg-[#F5A623] text-[#0A0A0B] border-[#F5A623]'
                      : 'bg-[#0A0A0B] text-[#EDEEF0] border-[#333438] hover:border-[#F2F3F5]/50'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{isIsolated ? 'Hiện tất cả' : 'Cô lập'}</span>
                </button>

                <button
                  type="button"
                  data-testid="part-deselect-button"
                  onClick={() => dispatch({ type: 'DESELECT_PART' })}
                  className="min-h-[44px] px-3 py-2 rounded-md bg-[#0A0A0B] text-[#9A9EA4] hover:text-[#EDEEF0] border border-[#333438] text-xs inline-flex items-center justify-center gap-1"
                  title="Bỏ chọn bộ phận (Esc)"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Tất cả</span>
                </button>
              </div>
            </div>
          )}

          {/* Full 46-Part Explorer Tree */}
          <div className="flex-1 min-h-0">
            <PartsTree />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
