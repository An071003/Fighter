import { describe, expect, it, beforeEach } from 'vitest';
import {
  PART_MANIFEST,
  clearRegisteredRestPoses,
  evaluateExplodedPartPose,
  getPartById,
  listAllParts,
  registerPartRestPose,
} from '@/domain/partRegistry';
import {
  evaluateFlightFrame,
  evaluateHoverFrame,
  evaluateReturnFrame,
  wheelAngleAt,
} from '@/domain/timeline';
import { resetVisualClock, useAppStore } from '@/domain/store';
import {
  selectCanModifyExplode,
  selectCanSelectPart,
  selectCanStartFlight,
} from '@/domain/selectors';

describe('AERIS X-9 Domain Contracts (G1 / G3 / G4)', () => {
  beforeEach(() => {
    clearRegisteredRestPoses();
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
    });
  });

  describe('Part Manifest & Registry (A01, A02)', () => {
    it('contains at least 32 unique selectable parts (46 authored)', () => {
      const parts = listAllParts();
      expect(parts.length).toBeGreaterThanOrEqual(32);
      expect(parts.length).toBe(46);

      const uniqueIds = new Set(parts.map((p) => p.id));
      const uniqueNodes = new Set(parts.map((p) => p.nodeName));
      expect(uniqueIds.size).toBe(parts.length);
      expect(uniqueNodes.size).toBe(parts.length);
    });

    it('defines 3 distinct landing gear assemblies (front, left, right) with struts, wheels, hubs, and doors', () => {
      for (const side of ['front', 'left', 'right']) {
        expect(getPartById(`gear-strut-${side}`)).not.toBeNull();
        expect(getPartById(`gear-wheel-${side}`)).not.toBeNull();
        expect(getPartById(`gear-hub-${side}`)).not.toBeNull();
        expect(getPartById(`gear-door-${side}`)).not.toBeNull();
      }
      expect(getPartById('gear-wheel-front')?.parentId).toBe('gear-strut-front');
      expect(getPartById('gear-hub-front')?.parentId).toBe('gear-wheel-front');
    });

    it('has symmetric left and right wing offsets', () => {
      const leftWing = getPartById('wing-left')!;
      const rightWing = getPartById('wing-right')!;
      expect(leftWing.explode.offset[0]).toBeCloseTo(-rightWing.explode.offset[0], 5);
      expect(leftWing.explode.offset[1]).toBeCloseTo(rightWing.explode.offset[1], 5);
      expect(leftWing.explode.offset[2]).toBeCloseTo(rightWing.explode.offset[2], 5);
    });
  });

  describe('Deterministic Exploded View & 20-Cycle Reset Invariant (B04, B05)', () => {
    it('evaluates exact rest pose at p=0 and distinct poses at 0%, 25%, 50%, 75%, 100%', () => {
      registerPartRestPose('wing-left', {
        position: [-1.5, 0.2, 0.1],
        quaternion: [0, 0, 0, 1],
        scale: [1, 1, 1],
      });

      const p0 = evaluateExplodedPartPose('wing-left', 0);
      const p25 = evaluateExplodedPartPose('wing-left', 0.25);
      const p50 = evaluateExplodedPartPose('wing-left', 0.5);
      const p75 = evaluateExplodedPartPose('wing-left', 0.75);
      const p100 = evaluateExplodedPartPose('wing-left', 1.0);

      expect(p0.position).toEqual([-1.5, 0.2, 0.1]);
      expect(p25.position[0]).toBeLessThan(p0.position[0]);
      expect(p50.position[0]).toBeLessThan(p25.position[0]);
      expect(p75.position[0]).toBeLessThan(p50.position[0]);
      expect(p100.position[0]).toBeCloseTo(-1.5 - 2.4, 5);
    });

    it('returns all 46 parts to exact rest matrices within 1e-5 after 20 explode/reassemble cycles', () => {
      for (const part of PART_MANIFEST.parts) {
        registerPartRestPose(part.id, {
          position: [0.123, -0.456, 0.789],
          quaternion: [0, 0, 0, 1],
          scale: [1, 1, 1],
        });
      }

      for (let cycle = 0; cycle < 20; cycle++) {
        for (const p of [0, 0.25, 0.5, 0.75, 1.0, 0.6, 0.2, 0]) {
          for (const part of PART_MANIFEST.parts) {
            const pose = evaluateExplodedPartPose(part.id, p);
            if (p === 0) {
              expect(Math.abs(pose.position[0] - 0.123)).toBeLessThan(1e-5);
              expect(Math.abs(pose.position[1] - -0.456)).toBeLessThan(1e-5);
              expect(Math.abs(pose.position[2] - 0.789)).toBeLessThan(1e-5);
              expect(Math.abs(pose.quaternion[0])).toBeLessThan(1e-5);
              expect(Math.abs(pose.quaternion[1])).toBeLessThan(1e-5);
              expect(Math.abs(pose.quaternion[2])).toBeLessThan(1e-5);
              expect(Math.abs(pose.quaternion[3] - 1)).toBeLessThan(1e-5);
            }
          }
        }
      }
    });
  });

  describe('Flight Timeline & Return Choreography (C02, C03, C04, C05, C07)', () => {
    it('locks aircraft anchorX=0 and anchorZ=0 across all flight, hover, and return samples', () => {
      const sampleTimes = [0, 0.35, 0.7, 1.2, 1.8, 2.4, 3.0, 3.6, 4.1, 4.7, 5.4, 6.2, 7.0];
      for (const t of sampleTimes) {
        const frame = evaluateFlightFrame(t);
        expect(frame.anchorX).toBe(0);
        expect(frame.anchorZ).toBe(0);
      }

      for (const h of [0, 5, 15, 30]) {
        const hover = evaluateHoverFrame(h);
        expect(hover.anchorX).toBe(0);
        expect(hover.anchorZ).toBe(0);
        expect(hover.jetY).toBeGreaterThanOrEqual(1.3 - 0.04);
        expect(hover.jetY).toBeLessThanOrEqual(1.3 + 0.04);
      }
    });

    it('enforces strict gear sequence: wheels spin -> doors open -> gear retracts -> doors close', () => {
      const t0 = evaluateFlightFrame(0);
      const t18 = evaluateFlightFrame(1.8);
      const t30 = evaluateFlightFrame(3.0);
      const t36 = evaluateFlightFrame(3.6);
      const t42 = evaluateFlightFrame(4.2);
      const t47 = evaluateFlightFrame(4.7);
      const t54 = evaluateFlightFrame(5.4);
      const t70 = evaluateFlightFrame(7.0);

      // At t=0: grounded on turntable
      expect(t0.jetY).toBe(0);
      expect(t0.platformOpacity).toBe(1);
      expect(t0.doorOpen).toBe(0);
      expect(t0.gearRetracted).toBe(0);

      // By t=1.8: turntable stopped spinning, wheels spinning
      expect(t18.baseSpinFactor).toBe(0);
      expect(wheelAngleAt(1.8)).toBeGreaterThan(wheelAngleAt(0.7));

      // By t=3.0: platform lowered and faded out, doors starting to open
      expect(t30.platformOpacity).toBe(0);
      expect(t30.platformVisible).toBe(false);
      expect(t30.gearRetracted).toBe(0);

      // At t=3.6: doors fully open BEFORE gear retracts
      expect(t36.doorOpen).toBeCloseTo(1, 4);
      expect(t36.gearRetracted).toBeCloseTo(0, 4);

      // At t=4.2: doors open while gear is mid-retraction
      expect(t42.doorOpen).toBeCloseTo(1, 4);
      expect(t42.gearRetracted).toBeGreaterThan(0.3);
      expect(t42.gearRetracted).toBeLessThan(0.8);

      // At t=4.7: gear fully retracted inside bay BEFORE doors close
      expect(t47.gearRetracted).toBeCloseTo(1, 4);
      expect(t47.doorOpen).toBeCloseTo(1, 4);

      // At t=5.4 & 7.0: doors closed, jet at hover altitude y=1.3
      expect(t54.doorOpen).toBeCloseTo(0, 4);
      expect(t70.doorOpen).toBeCloseTo(0, 4);
      expect(t70.gearRetracted).toBeCloseTo(1, 4);
      expect(t70.jetY).toBeCloseTo(1.3, 4);
    });

    it('enforces legal reverse choreography on return without door/gear collision', () => {
      const rStart = evaluateReturnFrame(0);
      const rDoorsOpen = evaluateReturnFrame(0.18);
      const rMidExtend = evaluateReturnFrame(0.33);
      const rExtended = evaluateReturnFrame(0.48);
      const rDoorsClosed = evaluateReturnFrame(0.62);
      const rDone = evaluateReturnFrame(1.0);

      expect(rStart.gearRetracted).toBe(1);
      expect(rStart.doorOpen).toBe(0);

      // Doors open first while gear is still retracted
      expect(rDoorsOpen.doorOpen).toBeCloseTo(1, 4);
      expect(rDoorsOpen.gearRetracted).toBeCloseTo(1, 4);

      // Gear extends while doors remain open
      expect(rMidExtend.doorOpen).toBeCloseTo(1, 4);
      expect(rMidExtend.gearRetracted).toBeLessThan(0.6);

      // Gear fully extended before doors close
      expect(rExtended.gearRetracted).toBeCloseTo(0, 4);
      expect(rExtended.doorOpen).toBeCloseTo(1, 4);

      // Doors closed after gear extended
      expect(rDoorsClosed.doorOpen).toBeCloseTo(0, 4);
      expect(rDoorsClosed.gearRetracted).toBeCloseTo(0, 4);

      // Touchdown on visible turntable at q=1.0
      expect(rDone.jetY).toBeCloseTo(0, 4);
      expect(rDone.platformOpacity).toBeCloseTo(1, 4);
      expect(rDone.platformVisible).toBe(true);
    });
  });

  describe('State Machine Guards & Concurrency (B06, C01, C08)', () => {
    it('blocks START_FLIGHT when exploded or inspecting a part', () => {
      const store = useAppStore.getState();
      expect(selectCanStartFlight(useAppStore.getState())).toBe(true);

      store.dispatch({ type: 'SET_EXPLODE_PROGRESS', value: 0.5 });
      expect(useAppStore.getState().mode).toBe('exploded');
      expect(selectCanStartFlight(useAppStore.getState())).toBe(false);

      store.dispatch({ type: 'START_FLIGHT' });
      expect(useAppStore.getState().mode).toBe('exploded');

      store.dispatch({ type: 'SET_EXPLODE_PROGRESS', value: 0 });
      store.dispatch({ type: 'SELECT_PART', partId: 'wing-left' });
      expect(useAppStore.getState().mode).toBe('inspect');
      expect(selectCanStartFlight(useAppStore.getState())).toBe(false);
    });

    it('blocks part selection and explode while flight is active, and supports 10 flight/return cycles', () => {
      const store = useAppStore.getState();

      for (let run = 0; run < 10; run++) {
        store.dispatch({ type: 'START_FLIGHT' });
        expect(useAppStore.getState().mode).toBe('flight-transition');
        expect(selectCanModifyExplode(useAppStore.getState())).toBe(false);
        expect(selectCanSelectPart(useAppStore.getState())).toBe(false);

        // Attempt illegal actions during flight
        store.dispatch({ type: 'SELECT_PART', partId: 'canopy-glass' });
        expect(useAppStore.getState().selectedPartId).toBeNull();
        store.dispatch({ type: 'TOGGLE_EXPLODE' });
        expect(useAppStore.getState().explodeProgress).toBe(0);

        // Pause and resume
        store.dispatch({ type: 'PAUSE_FLIGHT' });
        expect(useAppStore.getState().flightPaused).toBe(true);
        store.dispatch({ type: 'RESUME_FLIGHT' });
        expect(useAppStore.getState().flightPaused).toBe(false);

        // Complete flight -> hover -> return -> showroom
        store.dispatch({ type: 'COMPLETE_FLIGHT' });
        expect(useAppStore.getState().mode).toBe('hover');

        store.dispatch({ type: 'RETURN_TO_SHOWROOM' });
        expect(useAppStore.getState().mode).toBe('return-transition');

        store.dispatch({ type: 'COMPLETE_RETURN' });
        expect(useAppStore.getState().mode).toBe('showroom');
      }
    });
  });
});
