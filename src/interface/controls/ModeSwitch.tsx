import React from 'react';
import { Box, Compass, Plane } from 'lucide-react';
import {
  selectCanModifyExplode,
  selectCanReturnToShowroom,
  selectCanStartFlight,
  selectIsFlightModeActive,
  selectStartFlightBlockedReason,
} from '@/domain/selectors';
import { useAppStore } from '@/domain/store';

export const ModeSwitch: React.FC = () => {
  const mode = useAppStore((s) => s.mode);
  const explodeProgress = useAppStore((s) => s.explodeProgress);
  const dispatch = useAppStore((s) => s.dispatch);
  const setPartsDrawerOpen = useAppStore((s) => s.setPartsDrawerOpen);

  const canExplode = useAppStore(selectCanModifyExplode);
  const canStartFlight = useAppStore(selectCanStartFlight);
  const canReturn = useAppStore(selectCanReturnToShowroom);
  const isFlightActive = useAppStore(selectIsFlightModeActive);
  const flightBlockedReason = useAppStore(selectStartFlightBlockedReason);

  const isShowroomActive = mode === 'showroom' && explodeProgress <= 0.01;
  const isExploreActive = mode === 'exploded' || mode === 'inspect' || explodeProgress > 0.01;

  const handleSelectShowroom = () => {
    if (isFlightActive) {
      if (canReturn) {
        dispatch({ type: 'RETURN_TO_SHOWROOM' });
      }
      return;
    }
    dispatch({ type: 'SET_EXPLODE_PROGRESS', value: 0 });
    dispatch({ type: 'DESELECT_PART' });
    setPartsDrawerOpen(false);
  };

  const handleSelectExplore = () => {
    if (!canExplode) return;
    if (explodeProgress < 0.1) {
      dispatch({ type: 'SET_EXPLODE_PROGRESS', value: 1 });
    }
    setPartsDrawerOpen(true);
  };

  const handleSelectFlight = () => {
    if (isFlightActive) return;
    dispatch({ type: 'START_FLIGHT' });
  };

  return (
    <div
      role="tablist"
      aria-label="Chế độ trình diễn AERIS X-9"
      className="inline-flex items-center gap-1 rounded-md bg-[#0A0A0B]/90 p-1 border border-[#333438]"
    >
      <button
        type="button"
        role="tab"
        aria-selected={isShowroomActive}
        data-testid="mode-tab-showroom"
        onClick={handleSelectShowroom}
        disabled={isFlightActive && !canReturn}
        className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all flex items-center gap-2 ${
          isShowroomActive
            ? 'bg-[#1C1D20] text-[#F2F3F5] border border-[#F2F3F5]/50'
            : 'text-[#9A9EA4] hover:text-[#EDEEF0] border border-transparent disabled:opacity-40 disabled:cursor-not-allowed'
        }`}
      >
        <Compass className="w-3.5 h-3.5 shrink-0" />
        <span>01 Trưng bày</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={isExploreActive}
        data-testid="mode-tab-explore"
        onClick={handleSelectExplore}
        disabled={!canExplode}
        title={!canExplode ? 'Khóa tháo rời khi đang bay' : 'Tách cấu trúc 46 bộ phận'}
        className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all flex items-center gap-2 ${
          isExploreActive
            ? 'bg-[#1C1D20] text-[#F2F3F5] border border-[#F2F3F5]/50'
            : 'text-[#9A9EA4] hover:text-[#EDEEF0] border border-transparent disabled:opacity-40 disabled:cursor-not-allowed'
        }`}
      >
        <Box className="w-3.5 h-3.5 shrink-0" />
        <span>02 Bóc tách</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={isFlightActive}
        data-testid="mode-tab-flight"
        onClick={handleSelectFlight}
        disabled={!isFlightActive && !canStartFlight}
        title={flightBlockedReason ?? 'Khởi động chu trình biến hình bay 7 giây'}
        className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all flex items-center gap-2 ${
          isFlightActive
            ? 'bg-[#1C1D20] text-[#F5A623] border border-[#F5A623]/60'
            : 'text-[#9A9EA4] hover:text-[#EDEEF0] border border-transparent disabled:opacity-40 disabled:cursor-not-allowed'
        }`}
      >
        <Plane className="w-3.5 h-3.5 shrink-0" />
        <span>03 Bay tại chỗ</span>
      </button>
    </div>
  );
};
