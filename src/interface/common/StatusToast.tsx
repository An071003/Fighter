import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Compass, Sparkles, X } from 'lucide-react';
import { selectHoveredPart } from '@/domain/selectors';
import { useAppStore } from '@/domain/store';

export const StatusToast: React.FC = () => {
  const statusToast = useAppStore((s) => s.statusToast);
  const clearToast = useAppStore((s) => s.clearToast);
  const hoveredPart = useAppStore(selectHoveredPart);
  const isTourActive = useAppStore((s) => s.isTourActive);
  const tourStepIndex = useAppStore((s) => s.tourStepIndex);
  const nextGuidedTourStep = useAppStore((s) => s.nextGuidedTourStep);
  const stopGuidedTour = useAppStore((s) => s.stopGuidedTour);

  useEffect(() => {
    if (!statusToast) return;
    const timer = window.setTimeout(() => {
      clearToast();
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [statusToast, clearToast]);

  return (
    <>
      {/* Live polite announcer & toast */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center gap-2 w-full max-w-md px-4"
      >
        <AnimatePresence mode="wait">
          {statusToast && (
            <motion.div
              key={statusToast}
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.22 }}
              data-testid="status-toast"
              className="pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#111113]/95 backdrop-blur-md border border-[#F2F3F5]/40 text-xs text-[#EDEEF0] shadow-[0_12px_32px_rgba(0,0,0,0.55)]"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F2F3F5] shrink-0" />
              <span>{statusToast}</span>
              <button
                type="button"
                aria-label="Đóng thông báo"
                onClick={clearToast}
                className="ml-1 text-[#9A9EA4] hover:text-[#EDEEF0]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subtle Hover Part Tag */}
        <AnimatePresence>
          {hoveredPart && (
            <motion.div
              key={hoveredPart.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
              className="px-3 py-1 rounded-full bg-[#0A0A0B]/85 border border-[#333438] text-[11px] font-mono text-[#F2F3F5]"
            >
              {hoveredPart.label.vi} · <span className="text-[#9A9EA4]">{hoveredPart.label.en}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Guided Tour Floating Pill */}
      <AnimatePresence>
        {isTourActive && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            data-testid="guided-tour-bar"
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 rounded-lg bg-[#111113]/95 backdrop-blur-xl border border-[#F2F3F5]/50 shadow-2xl"
          >
            <Compass className="w-4 h-4 text-[#F2F3F5]" />
            <span className="text-xs font-mono text-[#EDEEF0]">
              Tour Cấu Trúc: Bước {tourStepIndex + 1}/8
            </span>
            <button
              type="button"
              data-testid="tour-next-button"
              onClick={nextGuidedTourStep}
              className="min-h-[36px] px-3 py-1 rounded-lg bg-[#F2F3F5] text-[#0A0A0B] text-xs font-semibold hover:bg-[#F2F3F5]/90 transition-colors"
            >
              Tiếp theo →
            </button>
            <button
              type="button"
              data-testid="tour-stop-button"
              onClick={stopGuidedTour}
              className="min-h-[36px] px-2.5 py-1 rounded-lg bg-[#1C1D20] text-[#9A9EA4] hover:text-[#EDEEF0] text-xs transition-colors"
            >
              Kết thúc
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
