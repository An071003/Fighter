import React, { useMemo, useRef } from 'react';
import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Line2, LineMaterial } from 'three-stdlib';
import { useAppStore } from '@/domain/store';
import { useAircraftRig } from '../aircraft/AircraftRig';

/** Assembly offset of the GLB inside the rig (see JetModel). */
const BODY_Y = 1.42;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

type Station = [number, number, number, number]; // hw, top, bot, chine

const TIP: Station = [0.012, -0.02, -0.04, -0.03];
const RADOME: Station = [0.64, 0.38, -0.34, -0.03];
const COCKPIT: Station = [0.76, 0.5, -0.46, 0.02];
const MID: Station = [1.16, 0.58, -0.56, 0.08];
const AFT: Station = [1.09, 0.55, -0.52, 0.07];
const TAIL: Station = [0.54, 0.44, -0.44, 0.0];

const mixStation = (a: Station, b: Station, t: number): Station =>
  a.map((v, i) => v + (b[i] - v) * t) as Station;

/** TS port of the generator's stealth fuselage envelope (scripts/generate_aeris_x9.py, v8). */
function envelope(z: number): { hw: number; top: number; bot: number; chine: number } {
  let s: Station;
  if (z < -6.5 || z > 4.1) return { hw: 0, top: 0, bot: 0, chine: 0 };
  if (z < -4.55) s = mixStation(TIP, RADOME, clamp01((z + 6.5) / 1.95) ** 0.72);
  else if (z < -3.2) s = mixStation(RADOME, COCKPIT, smoothstep(-4.55, -3.2, z));
  else if (z < -0.6) s = mixStation(COCKPIT, MID, smoothstep(-3.2, -0.6, z));
  else if (z < 2.2) s = mixStation(MID, AFT, smoothstep(-0.6, 2.2, z));
  else s = mixStation(AFT, TAIL, smoothstep(2.2, 4.1, z));
  return { hw: s[0], top: s[1], bot: s[2], chine: s[3] };
}

/** Bubble canopy + dorsal hump height above the deck at (x, z). */
function dorsal(x: number, z: number): number {
  let w: number;
  let dh: number;
  if (z < -4.42 || z > 3.0) return 0;
  if (z < -3.45) {
    const s = smoothstep(0, 1, clamp01((z + 4.42) / 0.97));
    w = 0.1 + 0.28 * s ** 0.6;
    dh = 0.01 + 0.43 * s ** 0.8;
  } else if (z < -2.4) {
    const u = clamp01((z + 3.45) / 1.05);
    w = 0.38 + 0.02 * u;
    dh = 0.44 - 0.16 * smoothstep(0, 1, u);
  } else {
    const t = (1 - smoothstep(0, 1, clamp01((z + 2.4) / 5.4))) ** 1.1;
    w = 0.06 + 0.36 * t;
    dh = 0.005 + 0.275 * t;
  }
  const r = Math.abs(x) / Math.max(w, 1e-3);
  return r >= 1 ? 0 : dh * Math.sqrt(1 - r * r);
}

const TAN35 = Math.tan((35 * Math.PI) / 180);
const TAN14 = Math.tan((14 * Math.PI) / 180);

/** Upper/lower airframe surface (body + trapezoid wing + tailplane) at (x, z) in assembly space. */
function surface(x: number, z: number): { top: number; bot: number } | null {
  const e = envelope(z);
  const ax = Math.abs(x);
  if (e.hw > 0 && ax < e.hw) {
    const r = ax / e.hw;
    const top = e.chine + (e.top - e.chine) * (1 - r ** 2.6) ** 0.85 + dorsal(x, z);
    const bot = r >= 0.8 ? e.chine + (e.bot + 0.04 - e.chine) * ((1 - r) / 0.2) : e.bot + 0.04 * (r / 0.8) ** 2;
    return { top, bot };
  }
  if (ax >= 0.95 && ax <= 3.85) {
    const zLe = Math.min(-1.4 + (ax - 1.05) * TAN35, -3.05 + (ax - 1.0) * 3.6);
    const zTe = 2.5 - (ax - 1.05) * TAN14;
    if (z >= zLe && z <= zTe) {
      const u = clamp01((ax - 1.05) / 2.8);
      const f = (z - zLe) / (zTe - zLe);
      const ht = 0.5 * 0.15 * (1 - 0.62 * u) * Math.sin(Math.PI * f ** 0.86);
      const yc = 0.1 - 0.04 * u;
      return { top: yc + ht, bot: yc - ht };
    }
  }
  if (ax <= 2.55) {
    const zLe = 2.8 + (ax - 0.55) * TAN35;
    if (z >= zLe && z <= 4.7) return { top: 0.03, bot: -0.03 };
  }
  return null;
}

interface Streamline {
  points: THREE.Vector3[];
  colors: [number, number, number][];
  speed: number;
  dash: number;
}

const Z_START = -10;
const Z_END = 11;

/**
 * Builds a streamline that rides `gap` above (or below) the airframe, easing back to its free-stream
 * height upstream/downstream, and is lightly smoothed so it bends around canopy, spine and wings.
 */
function buildStreamline(x: number, gap: number, side: 1 | -1, freeY: number): THREE.Vector3[] {
  const raw: number[] = [];
  const zs: number[] = [];
  for (let z = Z_START; z <= Z_END; z += 0.2) {
    const s = surface(x, z);
    let y = freeY;
    if (s) {
      const hug = side > 0 ? s.top + gap : s.bot - gap;
      y = side > 0 ? Math.max(freeY, hug) : Math.min(freeY, hug);
    }
    raw.push(y);
    zs.push(z);
  }
  // Two passes of box smoothing so the flow anticipates the body (no kinks)
  let ys = raw;
  for (let pass = 0; pass < 3; pass++) {
    ys = ys.map((_, i) => {
      let acc = 0;
      let n = 0;
      for (let k = -4; k <= 4; k++) {
        const j = Math.min(ys.length - 1, Math.max(0, i + k));
        acc += side > 0 ? Math.max(ys[j], raw[j]) : Math.min(ys[j], raw[j]);
        n++;
      }
      return acc / n;
    });
  }
  return zs.map((z, i) => {
    // Gentle outward spread past the wing trailing edge (downwash / wake)
    const spread = 1 + 0.05 * smoothstep(2.5, 11, z);
    return new THREE.Vector3(x * spread, BODY_Y + ys[i] - 0.06 * smoothstep(2.5, 11, z) * side, z);
  });
}

/** Helical wingtip vortex trailing aft from the winglet tip. */
function buildVortex(sign: 1 | -1): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const turns = 6;
  const n = 260;
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const z = 1.8 + f * 7;
    const r = 0.02 + 0.14 * f ** 0.8;
    const a = sign * f * turns * Math.PI * 2;
    pts.push(new THREE.Vector3(sign * 3.88 + Math.cos(a) * r, BODY_Y + 0.06 + Math.sin(a) * r - 0.25 * f, z));
  }
  return pts;
}

/** White-to-black ramp at both ends so additive lines fade in/out instead of being cut. */
function fadeColors(count: number, tint: [number, number, number]): [number, number, number][] {
  return Array.from({ length: count }, (_, i) => {
    const f = i / (count - 1);
    const k = smoothstep(0, 0.18, f) * (1 - smoothstep(0.72, 1, f));
    return [tint[0] * k, tint[1] * k, tint[2] * k];
  });
}

export const AirflowStreamlines: React.FC = () => {
  const { currentFlightFrameRef } = useAircraftRig();
  const resolvedQuality = useAppStore((s) => s.resolvedQuality);
  const groupRef = useRef<THREE.Group | null>(null);
  const lineRefs = useRef<(Line2 | null)[]>([]);

  const lines = useMemo<Streamline[]>(() => {
    const out: Streamline[] = [];
    const white: [number, number, number] = [0.92, 0.94, 0.97];
    const cool: [number, number, number] = [0.72, 0.82, 1.0];
    // Over canopy & spine
    for (const x of [-0.32, -0.16, 0, 0.16, 0.32]) {
      const pts = buildStreamline(x, 0.05 + Math.abs(x) * 0.15, 1, 0.5);
      out.push({ points: pts, colors: fadeColors(pts.length, white), speed: 3.4, dash: 2.4 });
    }
    // Over the wings and chines
    for (const x of [-3.5, -2.8, -2.1, -1.5, -0.95, 0.95, 1.5, 2.1, 2.8, 3.5]) {
      const pts = buildStreamline(x, 0.06, 1, 0.12);
      out.push({ points: pts, colors: fadeColors(pts.length, white), speed: 3.8, dash: 2.0 });
    }
    // Under belly & wings
    for (const x of [-2.6, -1.3, -0.5, 0.5, 1.3, 2.6]) {
      const pts = buildStreamline(x, 0.07, -1, -0.45);
      out.push({ points: pts, colors: fadeColors(pts.length, cool), speed: 3.0, dash: 2.6 });
    }
    // Wingtip vortices
    for (const sign of [-1, 1] as const) {
      const pts = buildVortex(sign);
      out.push({ points: pts, colors: fadeColors(pts.length, [1.0, 0.86, 0.62]), speed: 2.2, dash: 2.2 });
    }
    return out;
  }, []);

  const maxLines = resolvedQuality === 'high' ? lines.length : resolvedQuality === 'medium' ? 15 : 7;
  const visibleLines = useMemo(() => {
    if (maxLines >= lines.length) return lines;
    const step = lines.length / maxLines;
    // Always keep the two vortices (last entries)
    const picked = Array.from({ length: maxLines - 2 }, (_, i) => lines[Math.floor(i * step) % (lines.length - 2)]);
    return [...picked, ...lines.slice(-2)];
  }, [lines, maxLines]);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const state = useAppStore.getState();
    const frame = currentFlightFrameRef.current;
    const strength = clamp01(frame.windIntensity / 0.82);
    const visible = strength > 0.03 && state.explodeProgress < 0.02;
    if (groupRef.current) groupRef.current.visible = visible;
    if (!visible) return;
    const running = !state.reducedMotion && !state.flightPaused;
    lineRefs.current.forEach((line, i) => {
      if (!line) return;
      const mat = line.material as LineMaterial;
      mat.opacity = 0.85 * strength;
      if (running) mat.dashOffset -= dt * visibleLines[i].speed * (0.6 + strength);
    });
  });


  return (
    <group ref={groupRef} name="AirflowStreamlines" visible={false}>
      {visibleLines.map((l, i) => (
        <Line
          key={`flow-${i}`}
          ref={(el) => {
            lineRefs.current[i] = el as unknown as Line2 | null;
          }}
          points={l.points}
          vertexColors={l.colors}
          lineWidth={i >= visibleLines.length - 2 ? 2.0 : 1.5}
          dashed
          dashSize={l.dash}
          gapSize={l.dash * 0.55}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      ))}
    </group>
  );
};
