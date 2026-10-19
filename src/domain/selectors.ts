import {
  canModifyExplode,
  canPauseOrResumeFlight,
  canReturnToShowroom,
  canSelectPart,
  canStartFlight,
  getStartFlightBlockedReason,
} from './machine';
import { getPartById } from './partRegistry';
import type { AppState } from './store';
import type { PartDefinition } from './types';

export const selectCanStartFlight = (state: AppState): boolean =>
  canStartFlight(state);

export const selectStartFlightBlockedReason = (state: AppState): string | null =>
  getStartFlightBlockedReason(state);

export const selectCanModifyExplode = (state: AppState): boolean =>
  canModifyExplode(state);

export const selectCanSelectPart = (state: AppState): boolean =>
  canSelectPart(state);

export const selectCanReturnToShowroom = (state: AppState): boolean =>
  canReturnToShowroom(state);

export const selectCanPauseOrResume = (state: AppState): boolean =>
  canPauseOrResumeFlight(state);

export const selectSelectedPart = (state: AppState): PartDefinition | null =>
  getPartById(state.selectedPartId);

export const selectHoveredPart = (state: AppState): PartDefinition | null =>
  getPartById(state.hoveredPartId);

export const selectIsFlightModeActive = (state: AppState): boolean =>
  state.mode === 'flight-transition' ||
  state.mode === 'hover' ||
  state.mode === 'return-transition';

export interface DisplayModeBadge {
  readonly code: string;
  readonly labelVi: string;
  readonly labelEn: string;
}

const DISPLAY_MODE_BADGES: Record<AppState['mode'], DisplayModeBadge> = {
  showroom: { code: '01 / SHOWROOM', labelVi: 'Trưng bày 360°', labelEn: 'Showroom Orbit' },
  inspect: { code: '02 / INSPECT', labelVi: 'Soi chi tiết bộ phận', labelEn: 'Part Inspection' },
  exploded: { code: '02 / EXPLODED', labelVi: 'Bóc tách cấu trúc', labelEn: 'Exploded Assembly' },
  'flight-transition': {
    code: '03 / TRANSITION',
    labelVi: 'Biến hình cất cánh',
    labelEn: 'Flight Transition',
  },
  hover: { code: '03 / HOVER', labelVi: 'Bay lơ lửng tại chỗ', labelEn: 'Anchored Hover' },
  'return-transition': {
    code: '03 / LANDING',
    labelVi: 'Thu hồi về bàn xoay',
    labelEn: 'Return to Showroom',
  },
  error: { code: 'ERR / HALT', labelVi: 'Gián đoạn tải tài nguyên', labelEn: 'Resource Error' },
  boot: { code: '00 / INIT', labelVi: 'Đang nạp cấu trúc 3D', labelEn: 'Loading Assembly' },
  loading: { code: '00 / INIT', labelVi: 'Đang nạp cấu trúc 3D', labelEn: 'Loading Assembly' },
};

export const selectDisplayModeBadge = (state: AppState): DisplayModeBadge =>
  DISPLAY_MODE_BADGES[state.mode] ?? DISPLAY_MODE_BADGES.loading;
