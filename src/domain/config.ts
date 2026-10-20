import type { CameraPresetName, PartCategory, ResolvedQualityTier } from './types';

const rawBase = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL ? import.meta.env.BASE_URL : '/';
export const AIRCRAFT_MODEL_URL = `${rawBase.replace(/\/$/, '')}/assets/aircraft/aeris-x9.glb`;

export const FLIGHT_DURATION_SECONDS = 7.0;
export const RETURN_DURATION_SECONDS = 4.2;
export const TURNTABLE_DEG_PER_SEC = 9.0;

/** Whole-aircraft lift at 100% explode so downward-moving gear/belly parts stay above the deck. */
export const EXPLODE_LIFT_Y = 1.55;

export const CATEGORY_LABELS: Record<PartCategory, { vi: string; en: string; layer: number }> = {
  PANEL: { vi: 'Tấm bảo trì ngoại vi', en: 'Service Panels', layer: 1 },
  CANOPY: { vi: 'Vòm kính & Buồng lái', en: 'Canopy & Cockpit', layer: 2 },
  SURFACE: { vi: 'Cánh & Bề mặt khí động', en: 'Wings & Control Surfaces', layer: 2 },
  LIGHT: { vi: 'Đèn định vị quang học', en: 'Optical Beacons', layer: 2 },
  DUCT: { vi: 'Cửa hút & Vành xả', en: 'Intake & Exhaust Ducts', layer: 3 },
  GEAR: { vi: 'Hệ thống càng đáp 3 điểm', en: 'Landing Gear Assembly', layer: 4 },
  CORE: { vi: 'Khung thân trung tâm', en: 'Core Fuselage', layer: 4 },
};

export interface CameraPresetConfig {
  id: CameraPresetName;
  label: { vi: string; en: string };
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export const CAMERA_PRESETS: Record<CameraPresetName, CameraPresetConfig> = {
  hero: {
    id: 'hero',
    label: { vi: 'Góc 3/4 Điện Ảnh', en: '3/4 Hero' },
    position: [12.4, 6.2, -12.8],
    target: [-0.35, 0.95, 0.15],
    fov: 28,
  },
  top: {
    id: 'top',
    label: { vi: 'Mặt Bằng Đỉnh', en: 'Top Plan' },
    position: [0, 26.8, 0.85],
    target: [0, 1.42, -0.65],
    fov: 28,
  },
  front: {
    id: 'front',
    label: { vi: 'Chính Diện Mũi', en: 'Front Elevation' },
    position: [0, 1.48, -16.8],
    target: [0, 1.42, 0],
    fov: 26,
  },
  side: {
    id: 'side',
    label: { vi: 'Cắt Ngang Thân', en: 'Side Profile' },
    position: [-18.5, 1.55, -0.4],
    target: [0, 1.42, -0.4],
    fov: 26,
  },
  detail: {
    id: 'detail',
    label: { vi: 'Cận Cảnh Cơ Khí', en: 'Close-Up Detail' },
    position: [6.4, 3.1, -6.8],
    target: [0, 1.35, -0.6],
    fov: 28,
  },
};

export interface QualityPresetSettings {
  dpr: [number, number];
  windStreakCount: number;
  parallaxParticles: number;
  shadowMapSize: number;
  enableShadows: boolean;
  enableRimShader: boolean;
}

export const QUALITY_SETTINGS: Record<ResolvedQualityTier, QualityPresetSettings> = {
  high: {
    dpr: [1, 1.75],
    windStreakCount: 180,
    parallaxParticles: 240,
    shadowMapSize: 2048,
    enableShadows: true,
    enableRimShader: true,
  },
  medium: {
    dpr: [1, 1.25],
    windStreakCount: 96,
    parallaxParticles: 120,
    shadowMapSize: 1024,
    enableShadows: true,
    enableRimShader: true,
  },
  low: {
    dpr: [1, 1],
    windStreakCount: 28,
    parallaxParticles: 40,
    shadowMapSize: 512,
    enableShadows: false,
    enableRimShader: false,
  },
};
