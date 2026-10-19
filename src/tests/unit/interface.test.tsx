import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetVisualClock, useAppStore } from '@/domain/store';
import { TopBar } from '@/interface/shell/TopBar';
import { BottomTransport } from '@/interface/shell/BottomTransport';
import { PartDetails } from '@/interface/inspect/PartDetails';
import { KeyboardHelp } from '@/interface/common/KeyboardHelp';

describe('AERIS X-9 Editorial Interface & Accessibility (G6 / Group D)', () => {
  beforeEach(() => {
    resetVisualClock();
    useAppStore.setState({
      mode: 'showroom',
      assetReady: true,
      selectedPartId: null,
      hoveredPartId: null,
      isIsolated: false,
      explodeProgress: 0,
      flightPaused: false,
      flightElapsedUi: 0,
      returnProgressUi: 0,
      flightPhaseLabel: 'STANDBY',
      isPartsDrawerOpen: false,
      isHelpOpen: false,
      reducedMotion: false,
    });
  });

  it('renders TopBar, BottomTransport, and triggers explode toggle & slider (D01, B04)', () => {
    render(
      <>
        <TopBar />
        <PartDetails />
        <BottomTransport />
        <KeyboardHelp />
      </>
    );

    expect(screen.getByRole('heading', { name: 'AERIS X-9' })).toBeInTheDocument();

    const explodeBtn = screen.getByTestId('explode-toggle');
    fireEvent.click(explodeBtn);
    expect(useAppStore.getState().explodeProgress).toBe(1);
    expect(useAppStore.getState().mode).toBe('exploded');

    // Flight start CTA must be disabled while exploded with helpful message
    const flightBtn = screen.getByTestId('flight-start');
    expect(flightBtn).toBeDisabled();
    expect(screen.getByTestId('flight-blocked-hint')).toHaveTextContent(
      'Lắp lại cấu trúc về 0% trước khi khởi động mô phỏng bay.'
    );

    // Reassemble to 0%
    fireEvent.click(explodeBtn);
    expect(useAppStore.getState().explodeProgress).toBe(0);
    expect(useAppStore.getState().mode).toBe('showroom');
    expect(flightBtn).not.toBeDisabled();
  });

  it('opens 46-part explorer, selects a part from DOM, and supports keyboard Esc to deselect (B02, D03)', () => {
    render(
      <>
        <TopBar />
        <PartDetails />
        <BottomTransport />
        <KeyboardHelp />
      </>
    );

    const drawerToggle = screen.getByTestId('parts-drawer-toggle');
    fireEvent.click(drawerToggle);
    expect(screen.getByTestId('part-details-drawer')).toBeInTheDocument();

    const leftWingRow = screen.getByTestId('part-item-wing-left');
    fireEvent.click(leftWingRow);

    expect(useAppStore.getState().selectedPartId).toBe('wing-left');
    expect(useAppStore.getState().mode).toBe('inspect');
    expect(screen.getByTestId('selected-part-card')).toHaveTextContent('Cánh trái');

    // Toggle isolate
    const isolateBtn = screen.getByTestId('part-isolate-toggle');
    fireEvent.click(isolateBtn);
    expect(useAppStore.getState().isIsolated).toBe(true);

    // Press Escape key to deselect part
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useAppStore.getState().selectedPartId).toBeNull();
    expect(useAppStore.getState().mode).toBe('showroom');
  });

  it('supports reduced motion mode reaching hover and returning immediately without perpetual loops (C09)', () => {
    useAppStore.setState({ reducedMotion: true });

    render(
      <>
        <TopBar />
        <BottomTransport />
      </>
    );

    const flightBtn = screen.getByTestId('flight-start');
    fireEvent.click(flightBtn);

    expect(useAppStore.getState().mode).toBe('hover');

    const returnBtn = screen.getByTestId('flight-return');
    fireEvent.click(returnBtn);
    expect(useAppStore.getState().mode).toBe('showroom');
  });
});
