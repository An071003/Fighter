import React, { useEffect } from 'react';
import { AlertTriangle, Keyboard, RefreshCw, X } from 'lucide-react';
import { selectCanStartFlight } from '@/domain/selectors';
import { useAppStore } from '@/domain/store';
import { STORY_PHASES } from '@/domain/story';

export const KeyboardHelp: React.FC = () => {
  const isHelpOpen = useAppStore((s) => s.isHelpOpen);
  const setHelpOpen = useAppStore((s) => s.setHelpOpen);
  const mode = useAppStore((s) => s.mode);
  const errorReason = useAppStore((s) => s.errorReason);
  const dispatch = useAppStore((s) => s.dispatch);

  // Global keyboard shortcuts matching docs/04_FEATURES.md F02
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      // Guided story: 1–7 jump to a phase, arrows step, C/B/S/L toggle systems & lights.
      const story = useAppStore.getState();
      if (e.key >= '1' && e.key <= '7' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (story.storyPhaseIndex !== null || selectCanStartFlight(story)) {
          dispatch({ type: 'STORY_GOTO', index: Number(e.key) - 1 });
        }
        return;
      }
      if (story.storyPhaseIndex !== null) {
        const k = e.key.toLowerCase();
        if (e.key === 'Escape' && !story.isHelpOpen) {
          dispatch({ type: 'STORY_EXIT' });
          return;
        }
        if (e.key === 'ArrowRight') return dispatch({ type: 'STORY_NEXT' });
        if (e.key === 'ArrowLeft') return dispatch({ type: 'STORY_PREV' });
        if (k === 'c') return story.toggleCutaway();
        if (k === 'b') return story.toggleAircraftLight('beacon');
        if (k === 's') return story.toggleAircraftLight('strobe');
        if (k === 'l') return story.toggleAircraftLight('landing');
        if (k === 'i') {
          const partId = STORY_PHASES[story.storyPhaseIndex].callout.partId;
          return dispatch({ type: 'SELECT_PART', partId });
        }
      }

      if (e.key === 'Escape') {
        const state = useAppStore.getState();
        if (state.isHelpOpen) {
          state.setHelpOpen(false);
          return;
        }
        if (state.selectedPartId !== null) {
          state.dispatch({ type: 'DESELECT_PART' });
          return;
        }
        if (state.isPartsDrawerOpen) {
          state.setPartsDrawerOpen(false);
        }
      } else if (e.key === 'r' || e.key === 'R') {
        dispatch({ type: 'RESET_VIEW' });
      } else if (e.key === 'e' || e.key === 'E') {
        dispatch({ type: 'TOGGLE_EXPLODE' });
      } else if (e.key === 'f' || e.key === 'F') {
        const state = useAppStore.getState();
        if (state.mode === 'hover') {
          dispatch({ type: 'RETURN_TO_SHOWROOM' });
        } else {
          dispatch({ type: 'START_FLIGHT' });
        }
      } else if (e.key === '?') {
        setHelpOpen(!useAppStore.getState().isHelpOpen);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, setHelpOpen]);

  // Honest Error / WebGL Fallback UI (docs/11_PERFORMANCE.md & docs/12_QA_ACCEPTANCE.md A05)
  if (mode === 'error') {
    return (
      <div
        role="alert"
        data-testid="error-fallback-screen"
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0B]/95 p-6"
      >
        <div className="max-w-md w-full rounded-lg bg-[#111113] border border-[#FA8E91]/50 p-6 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-[#FA8E91]/15 text-[#FA8E91] flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-[#EDEEF0] mb-2">
            Không thể khởi tạo cảnh 3D AERIS X-9
          </h2>
          <p className="text-sm text-[#9A9EA4] mb-5">
            {errorReason ??
              'Tài nguyên mô hình GLB hoặc ngữ cảnh WebGL không khả dụng trên thiết bị này.'}
          </p>
          <button
            type="button"
            data-testid="error-retry-button"
            onClick={() => dispatch({ type: 'RETRY' })}
            className="min-h-[44px] px-5 py-2.5 rounded-md bg-[#F2F3F5] text-[#0A0A0B] font-semibold text-xs uppercase tracking-wider inline-flex items-center gap-2 hover:bg-[#F2F3F5]/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Thử tải lại mô hình</span>
          </button>
        </div>
      </div>
    );
  }

  if (!isHelpOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-help-title"
      data-testid="keyboard-help-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0B]/80 backdrop-blur-md p-4"
    >
      <div className="max-w-md w-full rounded-lg bg-[#111113] border border-[#333438] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-[#F2F3F5]" />
            <h2 id="keyboard-help-title" className="text-base font-semibold text-[#EDEEF0]">
              Phím tắt &amp; Điều khiển tương tác
            </h2>
          </div>
          <button
            type="button"
            data-testid="close-help-modal"
            aria-label="Đóng bảng phím tắt"
            onClick={() => setHelpOpen(false)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#9A9EA4] hover:text-[#EDEEF0]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5 text-xs">
          {[
            { key: 'Kéo chuột / Chạm 1 ngón', desc: 'Xoay camera 360° quanh tiêm kích' },
            { key: 'Cuộn chuột / Chụm 2 ngón', desc: 'Thu phóng cận cảnh giới hạn an toàn' },
            { key: 'Click vào bộ phận 3D', desc: 'Chọn, nhấc nhẹ và mở bảng thông số' },
            { key: 'E', desc: 'Bật / Tắt bóc tách cấu trúc (Exploded View)' },
            { key: 'F', desc: 'Khởi động bay hoặc Hạ cánh về bàn xoay' },
            { key: 'R', desc: 'Đặt lại góc máy quay chuẩn 3/4 Hero' },
            { key: 'Esc', desc: 'Bỏ chọn bộ phận / Đóng bảng chi tiết' },
            { key: '1 – 7', desc: 'Hành trình bay: nhảy tới pha (Sân đỗ → 10.000 ft)' },
            { key: '← / →', desc: 'Hành trình bay: pha trước / pha sau' },
            { key: 'C · B · S · L', desc: 'Hành trình bay: Cutaway, đèn nháy, đèn chớp, đèn lăn' },
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between py-2 px-3 rounded-md bg-[#0A0A0B]/70 border border-[#333438]/60"
            >
              <span className="font-mono text-[#F2F3F5] font-semibold">{item.key}</span>
              <span className="text-[#9A9EA4] text-right">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
