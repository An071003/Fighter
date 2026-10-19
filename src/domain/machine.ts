import { getPartById } from './partRegistry';
import type { SceneMode } from './types';

export interface MachineContextSnapshot {
  mode: SceneMode;
  explodeProgress: number;
  selectedPartId: string | null;
  assetReady: boolean;
  flightPaused: boolean;
}

const EPSILON = 1e-4;

export function canStartFlight(ctx: MachineContextSnapshot): boolean {
  return (
    ctx.assetReady &&
    ctx.mode === 'showroom' &&
    ctx.explodeProgress <= EPSILON &&
    ctx.selectedPartId === null
  );
}

export function getStartFlightBlockedReason(ctx: MachineContextSnapshot): string | null {
  if (!ctx.assetReady) {
    return 'Mô hình 3D đang tải hoặc chưa sẵn sàng.';
  }
  if (ctx.explodeProgress > EPSILON || ctx.mode === 'exploded') {
    return 'Lắp lại cấu trúc về 0% trước khi khởi động mô phỏng bay.';
  }
  if (ctx.selectedPartId !== null || ctx.mode === 'inspect') {
    return 'Đóng chế độ soi chi tiết bộ phận trước khi khởi động bay.';
  }
  if (
    ctx.mode === 'flight-transition' ||
    ctx.mode === 'hover' ||
    ctx.mode === 'return-transition'
  ) {
    return 'Chu trình bay đang hoạt động.';
  }
  return null;
}

export function canModifyExplode(ctx: MachineContextSnapshot): boolean {
  return (
    ctx.assetReady &&
    (ctx.mode === 'showroom' || ctx.mode === 'inspect' || ctx.mode === 'exploded')
  );
}

export function canSelectPart(ctx: MachineContextSnapshot, partId?: string): boolean {
  if (!ctx.assetReady) return false;
  if (
    ctx.mode !== 'showroom' &&
    ctx.mode !== 'inspect' &&
    ctx.mode !== 'exploded'
  ) {
    return false;
  }
  if (partId !== undefined) {
    const part = getPartById(partId);
    if (!part || !part.selectable) return false;
  }
  return true;
}

export function canReturnToShowroom(ctx: MachineContextSnapshot): boolean {
  return ctx.assetReady && ctx.mode === 'hover';
}

export function canPauseOrResumeFlight(ctx: MachineContextSnapshot): boolean {
  return (
    ctx.assetReady &&
    (ctx.mode === 'flight-transition' || ctx.mode === 'hover' || ctx.mode === 'return-transition')
  );
}

export function resolveBaseModeForExplodeAndSelection(
  explodeProgress: number,
  selectedPartId: string | null
): SceneMode {
  if (explodeProgress > EPSILON) {
    return 'exploded';
  }
  if (selectedPartId !== null) {
    return 'inspect';
  }
  return 'showroom';
}
