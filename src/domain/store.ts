import { create } from 'zustand';
import type { SceneEvent } from './events';
import {
  canModifyExplode,
  canPauseOrResumeFlight,
  canReturnToShowroom,
  canSelectPart,
  canStartFlight,
  getStartFlightBlockedReason,
  resolveBaseModeForExplodeAndSelection,
} from './machine';
import { getPartById } from './partRegistry';
import type {
  AssetAuditReport,
  CameraPresetName,
  FlightPhaseLabel,
  PartCategory,
  QualityTier,
  ResolvedQualityTier,
  SceneMode,
} from './types';

/**
 * Authoritative non-reactive high-frequency clock state read & mutated only inside R3F useFrame.
 * Prevents 60fps React re-renders while keeping timeline 100% deterministic.
 */
export interface VisualClockState {
  flightTimeSeconds: number;
  hoverElapsedSeconds: number;
  returnProgress01: number;
  turntableAngleRad: number;
  explodeAnimatedProgress01: number;
  anchorWorldX: number;
  anchorWorldY: number;
  anchorWorldZ: number;
  lastUiSyncMs: number;
}

export const visualClockRef: VisualClockState = {
  flightTimeSeconds: 0,
  hoverElapsedSeconds: 0,
  returnProgress01: 0,
  turntableAngleRad: 0,
  explodeAnimatedProgress01: 0,
  anchorWorldX: 0,
  anchorWorldY: 0,
  anchorWorldZ: 0,
  lastUiSyncMs: 0,
};

export function resetVisualClock(): void {
  visualClockRef.flightTimeSeconds = 0;
  visualClockRef.hoverElapsedSeconds = 0;
  visualClockRef.returnProgress01 = 0;
  visualClockRef.explodeAnimatedProgress01 = 0;
  visualClockRef.anchorWorldX = 0;
  visualClockRef.anchorWorldY = 0;
  visualClockRef.anchorWorldZ = 0;
  visualClockRef.lastUiSyncMs = 0;
}

export interface AppState {
  mode: SceneMode;
  assetReady: boolean;
  assetAudit: AssetAuditReport | null;
  errorReason: string | null;

  selectedPartId: string | null;
  hoveredPartId: string | null;
  isIsolated: boolean;
  categoryFilter: PartCategory | 'ALL';
  searchQuery: string;

  explodeProgress: number; // 0..1 target/slider value

  flightPaused: boolean;
  flightElapsedUi: number; // 0..7s throttled ~10Hz for UI display
  returnProgressUi: number; // 0..1 throttled ~10Hz for UI display
  flightPhaseLabel: FlightPhaseLabel;

  cameraPreset: CameraPresetName;
  cameraResetNonce: number;
  isUserOrbiting: boolean;

  qualityTier: QualityTier;
  resolvedQuality: ResolvedQualityTier;
  reducedMotion: boolean;

  isPartsDrawerOpen: boolean;
  isHelpOpen: boolean;
  isTourActive: boolean;
  tourStepIndex: number;
  statusToast: string | null;

  // Actions
  dispatch: (event: SceneEvent) => void;
  setHoveredPartId: (partId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setIsUserOrbiting: (orbiting: boolean) => void;
  setPartsDrawerOpen: (open: boolean) => void;
  setHelpOpen: (open: boolean) => void;
  setResolvedQuality: (tier: ResolvedQualityTier) => void;
  syncTimelineUi: (
    flightSeconds: number,
    returnProgress01: number,
    phaseLabel: FlightPhaseLabel
  ) => void;
  startGuidedTour: () => void;
  nextGuidedTourStep: () => void;
  stopGuidedTour: () => void;
  clearToast: () => void;
}

const TOUR_PART_IDS = [
  'nose-shell',
  'canopy-glass',
  'wing-left',
  'intake-shell-left',
  'exhaust-ring-left',
  'gear-strut-front',
  'gear-strut-left',
  'panel-left-1',
];

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

export const useAppStore = create<AppState>((set, get) => ({
  mode: 'loading',
  assetReady: false,
  assetAudit: null,
  errorReason: null,

  selectedPartId: null,
  hoveredPartId: null,
  isIsolated: false,
  categoryFilter: 'ALL',
  searchQuery: '',

  explodeProgress: 0,

  flightPaused: false,
  flightElapsedUi: 0,
  returnProgressUi: 0,
  flightPhaseLabel: 'STANDBY',

  cameraPreset: 'hero',
  cameraResetNonce: 0,
  isUserOrbiting: false,

  qualityTier: 'auto',
  resolvedQuality: 'high',
  reducedMotion: false,

  isPartsDrawerOpen: false,
  isHelpOpen: false,
  isTourActive: false,
  tourStepIndex: 0,
  statusToast: null,

  setHoveredPartId: (partId) => {
    const state = get();
    if (
      state.mode === 'flight-transition' ||
      state.mode === 'hover' ||
      state.mode === 'return-transition'
    ) {
      if (state.hoveredPartId !== null) set({ hoveredPartId: null });
      return;
    }
    if (state.hoveredPartId !== partId) {
      set({ hoveredPartId: partId });
    }
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setIsUserOrbiting: (isUserOrbiting) => set({ isUserOrbiting }),

  setPartsDrawerOpen: (isPartsDrawerOpen) => set({ isPartsDrawerOpen }),

  setHelpOpen: (isHelpOpen) => set({ isHelpOpen }),

  setResolvedQuality: (resolvedQuality) => set({ resolvedQuality }),

  syncTimelineUi: (flightElapsedUi, returnProgressUi, flightPhaseLabel) =>
    set({ flightElapsedUi, returnProgressUi, flightPhaseLabel }),

  clearToast: () => set({ statusToast: null }),

  startGuidedTour: () => {
    const state = get();
    if (!canSelectPart(state)) {
      set({ statusToast: 'Chỉ có thể chạy Tour cấu trúc khi ở chế độ Trưng bày hoặc Tách lớp.' });
      return;
    }
    const firstPartId = TOUR_PART_IDS[0];
    set({
      isTourActive: true,
      tourStepIndex: 0,
      selectedPartId: firstPartId,
      isPartsDrawerOpen: true,
      mode: resolveBaseModeForExplodeAndSelection(state.explodeProgress, firstPartId),
      statusToast: 'Bắt đầu hành trình khám phá 8 cụm cấu trúc tiêu biểu.',
    });
  },

  nextGuidedTourStep: () => {
    const state = get();
    if (!state.isTourActive) return;
    const nextIdx = (state.tourStepIndex + 1) % TOUR_PART_IDS.length;
    const nextPartId = TOUR_PART_IDS[nextIdx];
    set({
      tourStepIndex: nextIdx,
      selectedPartId: nextPartId,
      mode: resolveBaseModeForExplodeAndSelection(state.explodeProgress, nextPartId),
    });
  },

  stopGuidedTour: () => {
    const state = get();
    set({
      isTourActive: false,
      selectedPartId: null,
      isIsolated: false,
      mode: resolveBaseModeForExplodeAndSelection(state.explodeProgress, null),
    });
  },

  dispatch: (event: SceneEvent) => {
    const state = get();

    switch (event.type) {
      case 'LOAD_SUCCESS': {
        set({
          assetReady: true,
          assetAudit: event.audit,
          errorReason: null,
          mode: resolveBaseModeForExplodeAndSelection(
            state.explodeProgress,
            state.selectedPartId
          ),
        });
        return;
      }

      case 'LOAD_FAILURE': {
        set({
          assetReady: false,
          mode: 'error',
          errorReason: event.reason,
          statusToast: `Lỗi tải mô hình 3D: ${event.reason}`,
        });
        return;
      }

      case 'RETRY': {
        resetVisualClock();
        set({
          mode: 'loading',
          errorReason: null,
          selectedPartId: null,
          explodeProgress: 0,
          flightElapsedUi: 0,
          returnProgressUi: 0,
          flightPhaseLabel: 'STANDBY',
        });
        return;
      }

      case 'SELECT_PART': {
        if (!canSelectPart(state, event.partId)) {
          set({
            statusToast:
              state.mode === 'flight-transition' ||
              state.mode === 'hover' ||
              state.mode === 'return-transition'
                ? 'Không thể chọn bộ phận khi tiêm kích đang trong chu trình mô phỏng bay.'
                : 'Bộ phận không hợp lệ hoặc chưa sẵn sàng.',
          });
          return;
        }
        const part = getPartById(event.partId);
        if (!part) return;
        const nextMode = resolveBaseModeForExplodeAndSelection(
          state.explodeProgress,
          part.id
        );
        set({
          selectedPartId: part.id,
          mode: nextMode,
          isPartsDrawerOpen: true,
          statusToast: `Đang soi: ${part.label.vi} (${part.label.en})`,
        });
        return;
      }

      case 'DESELECT_PART': {
        if (
          state.mode === 'flight-transition' ||
          state.mode === 'hover' ||
          state.mode === 'return-transition'
        ) {
          return;
        }
        const nextMode = resolveBaseModeForExplodeAndSelection(state.explodeProgress, null);
        set({
          selectedPartId: null,
          isIsolated: false,
          isTourActive: false,
          mode: nextMode,
        });
        return;
      }

      case 'TOGGLE_ISOLATE_PART': {
        if (!state.selectedPartId) return;
        set({
          isIsolated: !state.isIsolated,
          statusToast: !state.isIsolated
            ? 'Đã cô lập bộ phận đang chọn.'
            : 'Đã hiện lại toàn bộ cấu trúc.',
        });
        return;
      }

      case 'SET_CATEGORY_FILTER': {
        set({ categoryFilter: event.category });
        return;
      }

      case 'SET_EXPLODE_PROGRESS': {
        if (!canModifyExplode(state)) {
          set({
            statusToast: 'Khóa tháo rời cấu trúc khi đang trong chế độ mô phỏng bay.',
          });
          return;
        }
        const p = clamp01(event.value);
        const nextMode = resolveBaseModeForExplodeAndSelection(p, state.selectedPartId);
        set({
          explodeProgress: p,
          mode: nextMode,
        });
        return;
      }

      case 'TOGGLE_EXPLODE': {
        if (!canModifyExplode(state)) {
          set({
            statusToast: 'Khóa tháo rời cấu trúc khi đang trong chế độ mô phỏng bay.',
          });
          return;
        }
        const target = state.explodeProgress > 0.05 ? 0 : 1;
        const nextMode = resolveBaseModeForExplodeAndSelection(
          target,
          target === 0 ? null : state.selectedPartId
        );
        set({
          explodeProgress: target,
          selectedPartId: target === 0 ? null : state.selectedPartId,
          isIsolated: target === 0 ? false : state.isIsolated,
          mode: nextMode,
          statusToast:
            target === 1
              ? 'Bóc tách 46 phân cụm cấu trúc theo 4 tầng cơ khí.'
              : 'Đã lắp ghép toàn bộ cấu trúc về vị trí chuẩn.',
        });
        return;
      }

      case 'START_FLIGHT': {
        if (!canStartFlight(state)) {
          const reason = getStartFlightBlockedReason(state);
          set({
            statusToast:
              reason ?? 'Vui lòng đưa máy bay về trạng thái trưng bày nguyên vẹn trước khi bay.',
          });
          return;
        }
        visualClockRef.flightTimeSeconds = state.reducedMotion ? 7.0 : 0;
        visualClockRef.hoverElapsedSeconds = 0;
        visualClockRef.returnProgress01 = 0;
        visualClockRef.explodeAnimatedProgress01 = 0;

        if (state.reducedMotion) {
          set({
            mode: 'hover',
            flightPaused: false,
            flightElapsedUi: 7.0,
            returnProgressUi: 0,
            flightPhaseLabel: 'HOVERING',
            selectedPartId: null,
            hoveredPartId: null,
            isIsolated: false,
            isPartsDrawerOpen: false,
            statusToast: 'Chế độ giảm chuyển động: Đã chuyển trực tiếp sang trạng thái bay lơ lửng.',
          });
        } else {
          set({
            mode: 'flight-transition',
            flightPaused: false,
            flightElapsedUi: 0,
            returnProgressUi: 0,
            flightPhaseLabel: 'LOCK-IN',
            selectedPartId: null,
            hoveredPartId: null,
            isIsolated: false,
            isPartsDrawerOpen: false,
            statusToast: 'Khởi động chu trình biến hình bay 7.0 giây.',
          });
        }
        return;
      }

      case 'PAUSE_FLIGHT': {
        if (!canPauseOrResumeFlight(state)) return;
        set({
          flightPaused: true,
          statusToast: 'Đã tạm dừng timeline mô phỏng.',
        });
        return;
      }

      case 'RESUME_FLIGHT': {
        if (!canPauseOrResumeFlight(state)) return;
        set({
          flightPaused: false,
          statusToast: 'Tiếp tục chu trình mô phỏng.',
        });
        return;
      }

      case 'REPLAY_FLIGHT': {
        if (
          state.mode !== 'flight-transition' &&
          state.mode !== 'hover' &&
          state.mode !== 'return-transition' &&
          !canStartFlight(state)
        ) {
          return;
        }
        visualClockRef.flightTimeSeconds = 0;
        visualClockRef.hoverElapsedSeconds = 0;
        visualClockRef.returnProgress01 = 0;
        set({
          mode: 'flight-transition',
          flightPaused: false,
          explodeProgress: 0,
          selectedPartId: null,
          isIsolated: false,
          flightElapsedUi: 0,
          returnProgressUi: 0,
          flightPhaseLabel: 'LOCK-IN',
          statusToast: 'Phát lại chu trình biến hình bay từ mốc 0.0s.',
        });
        return;
      }

      case 'COMPLETE_FLIGHT': {
        if (state.mode !== 'flight-transition') return;
        visualClockRef.flightTimeSeconds = 7.0;
        visualClockRef.hoverElapsedSeconds = 0;
        set({
          mode: 'hover',
          flightPaused: false,
          flightElapsedUi: 7.0,
          flightPhaseLabel: 'HOVERING',
        });
        return;
      }

      case 'RETURN_TO_SHOWROOM': {
        if (!canReturnToShowroom(state)) {
          set({
            statusToast: 'Chỉ có thể hạ cánh trở về bàn xoay khi đã hoàn tất pha chuyển tiếp.',
          });
          return;
        }
        visualClockRef.returnProgress01 = state.reducedMotion ? 1.0 : 0;
        if (state.reducedMotion) {
          resetVisualClock();
          set({
            mode: 'showroom',
            flightPaused: false,
            flightElapsedUi: 0,
            returnProgressUi: 0,
            flightPhaseLabel: 'STANDBY',
            cameraPreset: 'hero',
            cameraResetNonce: state.cameraResetNonce + 1,
            statusToast: 'Đã khôi phục trạng thái bàn xoay trưng bày.',
          });
        } else {
          set({
            mode: 'return-transition',
            flightPaused: false,
            returnProgressUi: 0,
            flightPhaseLabel: 'RETURNING',
            statusToast: 'Đang mở cửa khoang, hạ càng đáp và nâng bàn xoay trưng bày.',
          });
        }
        return;
      }

      case 'COMPLETE_RETURN': {
        resetVisualClock();
        set({
          mode: 'showroom',
          flightPaused: false,
          explodeProgress: 0,
          selectedPartId: null,
          isIsolated: false,
          flightElapsedUi: 0,
          returnProgressUi: 0,
          flightPhaseLabel: 'STANDBY',
          cameraPreset: 'hero',
          cameraResetNonce: state.cameraResetNonce + 1,
          statusToast: 'Tiêm kích AERIS X-9 đã hạ cánh về bàn xoay trưng bày.',
        });
        return;
      }

      case 'SEEK_TIMELINE': {
        const clampedT = Math.max(0, Math.min(7, event.timeSeconds));
        visualClockRef.flightTimeSeconds = clampedT;
        visualClockRef.hoverElapsedSeconds = 0;
        visualClockRef.returnProgress01 = 0;
        visualClockRef.explodeAnimatedProgress01 = 0;
        set({
          mode: clampedT >= 7 ? 'hover' : 'flight-transition',
          flightPaused: true,
          explodeProgress: 0,
          selectedPartId: null,
          isIsolated: false,
          flightElapsedUi: clampedT,
        });
        return;
      }

      case 'SET_CAMERA_PRESET': {
        set({
          cameraPreset: event.preset,
          cameraResetNonce: state.cameraResetNonce + 1,
        });
        return;
      }

      case 'RESET_VIEW': {
        set({
          cameraPreset: 'hero',
          cameraResetNonce: state.cameraResetNonce + 1,
          statusToast: 'Đã đặt lại góc máy quay chuẩn 3/4.',
        });
        return;
      }

      case 'RESET_SCENE': {
        resetVisualClock();
        set({
          mode: state.assetReady ? 'showroom' : 'loading',
          selectedPartId: null,
          hoveredPartId: null,
          isIsolated: false,
          isTourActive: false,
          explodeProgress: 0,
          flightPaused: false,
          flightElapsedUi: 0,
          returnProgressUi: 0,
          flightPhaseLabel: 'STANDBY',
          cameraPreset: 'hero',
          cameraResetNonce: state.cameraResetNonce + 1,
          statusToast: 'Đã khôi phục toàn bộ cảnh và cấu trúc máy bay về mặc định.',
        });
        return;
      }

      case 'SET_QUALITY': {
        const resolved: ResolvedQualityTier =
          event.tier === 'auto' ? state.resolvedQuality : event.tier;
        set({
          qualityTier: event.tier,
          resolvedQuality: resolved,
          statusToast: `Chất lượng đồ họa: ${event.tier.toUpperCase()}`,
        });
        return;
      }

      case 'SET_REDUCED_MOTION': {
        set({
          reducedMotion: event.enabled,
          statusToast: event.enabled
            ? 'Đã bật chế độ giảm chuyển động (Reduced Motion).'
            : 'Đã bật lại hiệu ứng chuyển động đầy đủ.',
        });
        return;
      }
    }
  },
}));
