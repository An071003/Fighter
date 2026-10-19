/** AERIS X-9 — Pure cinematic visual evaluator; demo code, not a ready aircraft rig. */
export type FlightVisualFrame = Readonly<{
  anchorX: 0; anchorZ: 0; jetY: number;
  platformY: number; platformOpacity: number;
  baseSpinFactor: number; wheelAngleRad: number;
  doorOpen: number; gearRetracted: number;
  windIntensity: number; parallaxSpeed: number;
  cameraDolly: number;
}>;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
export const smooth = (n: number) => {
  const t = clamp01(n);
  return t * t * (3 - 2 * t);
};
export const phase = (t: number, start: number, end: number) =>
  smooth((t - start) / (end - start));

// For deterministic seek and replay, cache a wheel-spin *angle* table.
const SPIN_DT = 1 / 120;
const SPIN_LENGTH = Math.ceil(7 / SPIN_DT) + 1;
const wheelTable = (() => {
  const values = new Float64Array(SPIN_LENGTH);
  const velocity = (t: number) => 6 * phase(t, 0.7, 1.8) * (1 - phase(t, 2.3, 3.5));
  for (let i = 1; i < SPIN_LENGTH; i++) {
    const t0 = (i - 1) * SPIN_DT;
    const t1 = i * SPIN_DT;
    values[i] = values[i - 1] + 0.5 * (velocity(t0) + velocity(t1)) * SPIN_DT;
  }
  return values;
})();
function wheelAngle(t: number) {
  const u = Math.max(0, Math.min(t / SPIN_DT, SPIN_LENGTH - 1));
  const i = Math.floor(u);
  return wheelTable[i] + (wheelTable[Math.min(i + 1, SPIN_LENGTH - 1)] - wheelTable[i]) * (u - i);
}

export function evaluateFlightFrame(timeSeconds: number): FlightVisualFrame {
  const t = Math.max(0, Math.min(7, timeSeconds));
  const rise = 0.65 * phase(t, 1.8, 3.0) + 0.65 * phase(t, 4.7, 5.4);
  const doorOpen = phase(t, 3.0, 3.6) * (1 - phase(t, 4.7, 5.4));
  return {
    anchorX: 0, anchorZ: 0, jetY: rise,
    platformY: -1.7 * phase(t, 1.8, 3.0),
    platformOpacity: 1 - phase(t, 1.8, 3.0),
    baseSpinFactor: 1 - phase(t, 0.0, 0.7),
    wheelAngleRad: wheelAngle(t),
    doorOpen, gearRetracted: phase(t, 3.6, 4.7),
    windIntensity: 0.82 * phase(t, 0.7, 5.7),
    parallaxSpeed: 0.9 * phase(t, 0.7, 5.7),
    cameraDolly: 0.7 * phase(t, 4.7, 5.4),
  };
}

export function evaluateReturnFrame(progress01: number): FlightVisualFrame {
  const q = clamp01(progress01);
  return {
    anchorX: 0, anchorZ: 0,
    jetY: 1.3 * (1 - phase(q, 0.60, 0.96)),
    platformY: -1.7 * (1 - phase(q, 0.54, 0.92)),
    platformOpacity: phase(q, 0.68, 0.95),
    baseSpinFactor: phase(q, 0.94, 1.0),
    wheelAngleRad: wheelAngle(7),
    doorOpen: phase(q, 0.05, 0.18) * (1 - phase(q, 0.48, 0.62)),
    gearRetracted: 1 - phase(q, 0.18, 0.48),
    windIntensity: 0.82 * (1 - phase(q, 0.02, 0.65)),
    parallaxSpeed: 0.9 * (1 - phase(q, 0.02, 0.65)),
    cameraDolly: 0.7 * (1 - phase(q, 0.40, 0.98)),
  };
}

export function evaluateHoverFrame(elapsedSinceHandoff: number) {
  const t = Math.max(0, elapsedSinceHandoff);
  return {
    anchorX: 0 as const, anchorZ: 0 as const,
    jetY: 1.3 + 0.035 * Math.sin(2 * Math.PI * 0.7 * t),
    bankDeg: 1.2 * Math.sin(2 * Math.PI * 0.22 * t),
    pitchDeg: 0.45 * Math.sin(2 * Math.PI * 0.3 * t),
  };
}

// Runtime: evaluate one frame in useFrame, apply to Object3D refs; never call
// React setState each frame. Note: program should add tests for frame continuity.
