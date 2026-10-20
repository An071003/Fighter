import React, { useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  EXPLODE_LIFT_Y,
  FLIGHT_DURATION_SECONDS,
  RETURN_DURATION_SECONDS,
  TURNTABLE_DEG_PER_SEC,
} from '@/domain/config';
import { useAppStore, visualClockRef } from '@/domain/store';
import {
  SHOWROOM_REST_FRAME,
  evaluateFlightFrame,
  evaluateHoverFrame,
  evaluateReturnFrame,
} from '@/domain/timeline';
import { useAircraftRig } from '../aircraft/AircraftRig';

const DEG2RAD = Math.PI / 180;

export const FlightDirector: React.FC = () => {
  const {
    jetAnchorRef,
    jetVisualRigRef,
    turntableRootRef,
    currentFlightFrameRef,
  } = useAircraftRig();

  // Support deterministic ?testTime= query parameter in dev/test mode for QA screenshot verification
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const testTimeStr = params.get('testTime');
    if (testTimeStr !== null) {
      const t = parseFloat(testTimeStr);
      if (!Number.isNaN(t)) {
        useAppStore.getState().dispatch({ type: 'SEEK_TIMELINE', timeSeconds: t });
      }
    }
  }, []);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const state = useAppStore.getState();

    // 1. Evaluate authoritative timeline frame based on current mode
    if (state.mode === 'flight-transition') {
      if (!state.flightPaused) {
        // Story segments may hold the clock before the hover hand-off (e.g. end of take-off roll).
        const limit = Math.min(
          FLIGHT_DURATION_SECONDS,
          state.flightHoldSeconds ?? FLIGHT_DURATION_SECONDS
        );
        visualClockRef.flightTimeSeconds = Math.max(
          visualClockRef.flightTimeSeconds,
          Math.min(limit, visualClockRef.flightTimeSeconds + dt)
        );
      }

      const frame = evaluateFlightFrame(visualClockRef.flightTimeSeconds);
      currentFlightFrameRef.current = frame;

      // Smoothly damp turntable angle back toward 0 during lock-in / liftoff
      visualClockRef.turntableAngleRad *= Math.max(0, 1 - dt * 3.5);

      const nowMs = performance.now();
      if (nowMs - visualClockRef.lastUiSyncMs > 90) {
        visualClockRef.lastUiSyncMs = nowMs;
        state.syncTimelineUi(
          visualClockRef.flightTimeSeconds,
          0,
          frame.phaseLabel
        );
      }

      if (visualClockRef.flightTimeSeconds >= FLIGHT_DURATION_SECONDS && !state.flightPaused) {
        state.dispatch({ type: 'COMPLETE_FLIGHT' });
      }
    } else if (state.mode === 'hover') {
      if (!state.flightPaused) {
        visualClockRef.hoverElapsedSeconds += dt;
      }
      const frame = evaluateHoverFrame(
        visualClockRef.hoverElapsedSeconds,
        state.reducedMotion
      );
      currentFlightFrameRef.current = frame;
      visualClockRef.turntableAngleRad = 0;
      if (state.flightPhaseLabel !== frame.phaseLabel) {
        state.syncTimelineUi(FLIGHT_DURATION_SECONDS, 0, frame.phaseLabel);
      }
    } else if (state.mode === 'return-transition') {
      if (!state.flightPaused) {
        visualClockRef.returnProgress01 = Math.min(
          1.0,
          visualClockRef.returnProgress01 + dt / RETURN_DURATION_SECONDS
        );
      }
      const frame = evaluateReturnFrame(visualClockRef.returnProgress01);
      currentFlightFrameRef.current = frame;

      const nowMs = performance.now();
      if (nowMs - visualClockRef.lastUiSyncMs > 90) {
        visualClockRef.lastUiSyncMs = nowMs;
        state.syncTimelineUi(
          FLIGHT_DURATION_SECONDS * (1 - visualClockRef.returnProgress01),
          visualClockRef.returnProgress01,
          frame.phaseLabel
        );
      }

      if (visualClockRef.returnProgress01 >= 1.0 && !state.flightPaused) {
        state.dispatch({ type: 'COMPLETE_RETURN' });
      }
    } else {
      // Showroom, Inspect, or Exploded mode
      currentFlightFrameRef.current = SHOWROOM_REST_FRAME;

      const shouldAutoSpin =
        state.mode === 'showroom' &&
        state.storyPhaseIndex === null &&
        state.cameraPreset === 'hero' &&
        !state.reducedMotion &&
        !state.isUserOrbiting &&
        state.selectedPartId === null &&
        state.explodeProgress <= 0.001;

      if (shouldAutoSpin) {
        visualClockRef.turntableAngleRad =
          (visualClockRef.turntableAngleRad +
            TURNTABLE_DEG_PER_SEC * DEG2RAD * dt) %
          (Math.PI * 2);
      } else if (state.cameraPreset !== 'hero' || state.storyPhaseIndex !== null) {
        visualClockRef.turntableAngleRad = 0;
      }
    }

    // 2. Apply evaluated pose to 3D rig refs (Strict Invariant: JetAnchor X=0, Z=0)
    const frame = currentFlightFrameRef.current;

    if (jetAnchorRef.current) {
      jetAnchorRef.current.position.set(frame.anchorX, 0, frame.anchorZ);
      visualClockRef.anchorWorldX = jetAnchorRef.current.position.x;
      visualClockRef.anchorWorldY = jetAnchorRef.current.position.y;
      visualClockRef.anchorWorldZ = jetAnchorRef.current.position.z;
    }

    if (jetVisualRigRef.current) {
      // Exploded view floats the assembly above the turntable (rest frame only, never in flight).
      const explodeLift = EXPLODE_LIFT_Y * visualClockRef.explodeAnimatedProgress01;
      jetVisualRigRef.current.position.set(0, frame.jetY + explodeLift, 0);
      jetVisualRigRef.current.rotation.set(
        frame.pitchDeg * DEG2RAD,
        visualClockRef.turntableAngleRad,
        frame.bankDeg * DEG2RAD,
        'YXZ'
      );
    }

    if (turntableRootRef.current) {
      turntableRootRef.current.rotation.y = visualClockRef.turntableAngleRad;
    }
  });

  return null;
};
