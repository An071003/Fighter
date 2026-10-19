import type { FlightPhaseLabel } from './types';

export type FlightVisualFrame = Readonly<{
  anchorX: 0;
  anchorZ: 0;
  jetY: number;
  pitchDeg: number;
  bankDeg: number;
  platformY: number;
  platformOpacity: number;
  platformVisible: boolean;
  baseSpinFactor: number;
  wheelAngleRad: number;
  doorOpen: number;
  gearRetracted: number;
  windIntensity: number;
  parallaxSpeed: number;
  cameraDolly: number;
  phaseLabel: FlightPhaseLabel;
}>;

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

export const smooth = (n: number): number => {
  const t = clamp01(n);
  return t * t * (3 - 2 * t);
};

export const phase = (t: number, start: number, end: number): number =>
  smooth((t - start) / (end - start));

// Precompute deterministic wheel-spin angle lookup table for 0..7s at 120Hz
const SPIN_DT = 1 / 120;
const SPIN_LENGTH = Math.ceil(7 / SPIN_DT) + 1;
const wheelTable = (() => {
  const values = new Float64Array(SPIN_LENGTH);
  const velocity = (t: number) => 9.5 * phase(t, 0.7, 1.8) * (1 - phase(t, 2.3, 3.55));
  for (let i = 1; i < SPIN_LENGTH; i++) {
    const t0 = (i - 1) * SPIN_DT;
    const t1 = i * SPIN_DT;
    values[i] = values[i - 1] + 0.5 * (velocity(t0) + velocity(t1)) * SPIN_DT;
  }
  return values;
})();

export function wheelAngleAt(tSeconds: number): number {
  const u = Math.max(0, Math.min(tSeconds / SPIN_DT, SPIN_LENGTH - 1));
  const i = Math.floor(u);
  const next = Math.min(i + 1, SPIN_LENGTH - 1);
  return wheelTable[i] + (wheelTable[next] - wheelTable[i]) * (u - i);
}

export function getFlightPhaseLabel(tSeconds: number): FlightPhaseLabel {
  const t = Math.max(0, tSeconds);
  if (t < 0.7) return 'LOCK-IN';
  if (t < 1.8) return 'POWER-UP';
  if (t < 3.0) return 'LIFTOFF';
  if (t < 3.6) return 'GEAR DOOR OPEN';
  if (t < 4.7) return 'GEAR RETRACT';
  if (t < 5.4) return 'GEAR DOOR CLOSE';
  if (t < 7.0) return 'HOVER HANDOFF';
  return 'HOVERING';
}

/**
 * Pure deterministic evaluator for 0..7.0s flight transition.
 * Anchor X and Z are strictly locked to 0.
 */
export function evaluateFlightFrame(timeSeconds: number): FlightVisualFrame {
  const t = Math.max(0, Math.min(7, timeSeconds));
  const rise = 0.65 * phase(t, 1.8, 3.0) + 0.65 * phase(t, 4.7, 5.4);
  const doorOpen = phase(t, 3.0, 3.6) * (1 - phase(t, 4.7, 5.4));
  const platformOpacity = 1 - phase(t, 1.8, 3.0);

  // Subtle nose-up pitch during liftoff, settling smoothly at handoff
  const liftoffPitch = 1.6 * phase(t, 1.8, 3.2) * (1 - 0.7 * phase(t, 5.0, 7.0));
  const subtleBank = 0.8 * Math.sin(Math.PI * phase(t, 3.0, 6.8));

  return {
    anchorX: 0,
    anchorZ: 0,
    jetY: rise,
    pitchDeg: liftoffPitch,
    bankDeg: subtleBank,
    platformY: -1.7 * phase(t, 1.8, 3.0),
    platformOpacity,
    platformVisible: platformOpacity > 0.005,
    baseSpinFactor: 1 - phase(t, 0.0, 0.7),
    wheelAngleRad: wheelAngleAt(t),
    doorOpen,
    gearRetracted: phase(t, 3.6, 4.7),
    windIntensity: 0.82 * phase(t, 0.7, 5.7),
    parallaxSpeed: 0.9 * phase(t, 0.7, 5.7),
    cameraDolly: 0.7 * phase(t, 4.7, 5.4),
    phaseLabel: getFlightPhaseLabel(t),
  };
}

/**
 * Pure deterministic evaluator for continuous hover state after t=7.0s handoff.
 */
export function evaluateHoverFrame(
  elapsedSinceHandoffSeconds: number,
  reducedMotion = false
): FlightVisualFrame {
  const t = Math.max(0, elapsedSinceHandoffSeconds);
  const bob = reducedMotion ? 0 : 0.035 * Math.sin(2 * Math.PI * 0.7 * t);
  const bankDeg = reducedMotion ? 0 : 1.2 * Math.sin(2 * Math.PI * 0.22 * t);
  const pitchDeg = reducedMotion ? 0 : 0.45 * Math.sin(2 * Math.PI * 0.3 * t);

  return {
    anchorX: 0,
    anchorZ: 0,
    jetY: 1.3 + bob,
    pitchDeg,
    bankDeg,
    platformY: -1.7,
    platformOpacity: 0,
    platformVisible: false,
    baseSpinFactor: 0,
    wheelAngleRad: wheelAngleAt(7),
    doorOpen: 0,
    gearRetracted: 1,
    windIntensity: reducedMotion ? 0.15 : 0.82,
    parallaxSpeed: reducedMotion ? 0 : 0.9,
    cameraDolly: 0.7,
    phaseLabel: 'HOVERING',
  };
}

/**
 * Separate legal reverse choreography for returning from HOVER to SHOWROOM:
 * 1. Doors open FIRST (q: 0.05 -> 0.18)
 * 2. Gear struts extend out of bay (q: 0.18 -> 0.48)
 * 3. Doors close AFTER gear extended (q: 0.48 -> 0.62)
 * 4. Platform rises & fades in (q: 0.54 -> 0.95) while jet lowers to touchdown (q: 0.60 -> 0.96)
 * 5. Turntable spin resumes smoothly (q: 0.94 -> 1.0)
 */
export function evaluateReturnFrame(progress01: number): FlightVisualFrame {
  const q = clamp01(progress01);
  const platformOpacity = phase(q, 0.68, 0.95);
  const doorOpen = phase(q, 0.05, 0.18) * (1 - phase(q, 0.48, 0.62));

  return {
    anchorX: 0,
    anchorZ: 0,
    jetY: 1.3 * (1 - phase(q, 0.6, 0.96)),
    pitchDeg: 0.6 * phase(q, 0.5, 0.8) * (1 - phase(q, 0.82, 0.98)),
    bankDeg: 0,
    platformY: -1.7 * (1 - phase(q, 0.54, 0.92)),
    platformOpacity,
    platformVisible: platformOpacity > 0.005,
    baseSpinFactor: phase(q, 0.94, 1.0),
    wheelAngleRad: wheelAngleAt(7) * (1 - phase(q, 0.7, 1.0)),
    doorOpen,
    gearRetracted: 1 - phase(q, 0.18, 0.48),
    windIntensity: 0.82 * (1 - phase(q, 0.02, 0.65)),
    parallaxSpeed: 0.9 * (1 - phase(q, 0.02, 0.65)),
    cameraDolly: 0.7 * (1 - phase(q, 0.4, 0.98)),
    phaseLabel: q >= 1 ? 'STANDBY' : 'RETURNING',
  };
}

export const SHOWROOM_REST_FRAME: FlightVisualFrame = evaluateFlightFrame(0);
