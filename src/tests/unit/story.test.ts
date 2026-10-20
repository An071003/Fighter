import { beforeEach, describe, expect, it } from 'vitest';
import { getPartById } from '@/domain/partRegistry';
import { resetVisualClock, useAppStore, visualClockRef } from '@/domain/store';
import { STORY_PHASES, STORY_PHASE_COUNT } from '@/domain/story';
import { getFlightPhaseLabel } from '@/domain/timeline';

const store = () => useAppStore.getState();

describe('Guided 7-phase story (reference narrative)', () => {
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
      reducedMotion: false,
      storyPhaseIndex: null,
      flightHoldSeconds: null,
    });
  });

  it('defines 7 phases with unique ids/keys, sequential callouts and real part anchors', () => {
    expect(STORY_PHASE_COUNT).toBe(7);
    expect(new Set(STORY_PHASES.map((p) => p.id)).size).toBe(7);
    expect(STORY_PHASES.map((p) => p.key)).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    STORY_PHASES.forEach((p, i) => {
      expect(p.callout.index).toBe(i + 1);
      expect(getPartById(p.callout.partId)).not.toBeNull();
    });
  });

  it('ground phases stay in showroom with the phase light preset and no turntable spin', () => {
    visualClockRef.turntableAngleRad = 1.2;
    store().dispatch({ type: 'STORY_GOTO', index: 2 });
    const s = store();
    expect(s.storyPhaseIndex).toBe(2);
    expect(s.mode).toBe('showroom');
    expect(s.landingLightOn).toBe(STORY_PHASES[2].systems.landing);
    expect(s.beaconOn).toBe(STORY_PHASES[2].systems.beacon);
    expect(visualClockRef.turntableAngleRad).toBe(0);
  });

  it('entering the story resets explode and selection', () => {
    useAppStore.setState({ mode: 'exploded', explodeProgress: 0.6, selectedPartId: 'wing-left' });
    store().dispatch({ type: 'STORY_GOTO', index: 0 });
    expect(store().explodeProgress).toBe(0);
    expect(store().selectedPartId).toBeNull();
    expect(store().mode).toBe('showroom');
  });

  it('take-off plays the flight timeline from 0 and holds at 2.95s (before the gear-door cutaway window)', () => {
    store().dispatch({ type: 'STORY_GOTO', index: 4 });
    expect(store().mode).toBe('flight-transition');
    expect(store().flightHoldSeconds).toBe(2.95);
    // Hold must stay in LIFTOFF: 3.0s starts GEAR DOOR OPEN, which auto-enables the cutaway.
    expect(getFlightPhaseLabel(2.95)).toBe('LIFTOFF');
    expect(visualClockRef.flightTimeSeconds).toBe(0);
  });

  it('climb continues from the take-off hold and runs to hover hand-off', () => {
    store().dispatch({ type: 'STORY_GOTO', index: 4 });
    visualClockRef.flightTimeSeconds = 2.95;
    store().dispatch({ type: 'STORY_NEXT' });
    expect(store().storyPhaseIndex).toBe(5);
    expect(store().mode).toBe('flight-transition');
    expect(store().flightHoldSeconds).toBeNull();
    expect(visualClockRef.flightTimeSeconds).toBe(2.95);
    expect(store().isCutaway).toBe(true);
  });

  it('cruise jumps straight to hover; going back to a ground phase lands instantly', () => {
    store().dispatch({ type: 'STORY_GOTO', index: 6 });
    expect(store().mode).toBe('hover');
    expect(store().landingLightOn).toBe(false);
    store().dispatch({ type: 'STORY_GOTO', index: 0 });
    expect(store().mode).toBe('showroom');
    expect(visualClockRef.flightTimeSeconds).toBe(0);
  });

  it('reduced motion skips segment playback to the segment end', () => {
    useAppStore.setState({ reducedMotion: true });
    store().dispatch({ type: 'STORY_GOTO', index: 4 });
    expect(visualClockRef.flightTimeSeconds).toBe(2.95);
    expect(store().flightElapsedUi).toBe(2.95);
  });

  it('next/prev are bounded to the 7 phases', () => {
    store().dispatch({ type: 'STORY_PREV' });
    expect(store().storyPhaseIndex).toBeNull();
    store().dispatch({ type: 'STORY_GOTO', index: 6 });
    store().dispatch({ type: 'STORY_NEXT' });
    expect(store().storyPhaseIndex).toBe(6);
    store().dispatch({ type: 'STORY_GOTO', index: 0 });
    store().dispatch({ type: 'STORY_PREV' });
    expect(store().storyPhaseIndex).toBe(0);
  });

  it('exit from hover lands through the return choreography; exit on ground returns to hero', () => {
    store().dispatch({ type: 'STORY_GOTO', index: 6 });
    store().dispatch({ type: 'STORY_EXIT' });
    expect(store().storyPhaseIndex).toBeNull();
    expect(store().mode).toBe('return-transition');

    useAppStore.setState({ mode: 'showroom' });
    store().dispatch({ type: 'STORY_GOTO', index: 1 });
    const nonce = store().cameraResetNonce;
    store().dispatch({ type: 'STORY_EXIT' });
    expect(store().mode).toBe('showroom');
    expect(store().cameraPreset).toBe('hero');
    expect(store().cameraResetNonce).toBe(nonce + 1);
  });

  it('manual takeover (select part / explode) ends the story first, then applies', () => {
    store().dispatch({ type: 'STORY_GOTO', index: 0 });
    store().dispatch({ type: 'SELECT_PART', partId: 'canopy-glass' });
    expect(store().storyPhaseIndex).toBeNull();
    expect(store().selectedPartId).toBe('canopy-glass');

    store().dispatch({ type: 'DESELECT_PART' });
    store().dispatch({ type: 'STORY_GOTO', index: 6 });
    store().dispatch({ type: 'TOGGLE_EXPLODE' });
    expect(store().storyPhaseIndex).toBeNull();
    // Airborne: exit lands first, so explode stays locked during the return.
    expect(store().mode).toBe('return-transition');
    expect(store().explodeProgress).toBe(0);
  });

  it('is unavailable before the asset is ready', () => {
    useAppStore.setState({ assetReady: false, mode: 'loading' });
    store().dispatch({ type: 'STORY_GOTO', index: 0 });
    expect(store().storyPhaseIndex).toBeNull();
  });
});
