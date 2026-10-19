import type { CameraPresetName, PartCategory, ResolvedQualityTier } from './types';

export const AIRCRAFT_MODEL_URL = '/assets/aircraft/aeris-x9.glb';

export const FLIGHT_DURATION_SECONDS = 7.0;
export const RETURN_DURATION_SECONDS = 4.2;
export const TURNTABLE_DEG_PER_SEC = 9.0;

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
    position: [8.4, 4.1, -9.2],
    target: [0, 0.25, 0],
    fov: 38,
  },
  top: {
    id: 'top',
    label: { vi: 'Mặt Bằng Đỉnh', en: 'Top Plan' },
    position: [0.01, 14.5, -0.5],
    target: [0, 0, 0],
    fov: 36,
  },
  front: {
    id: 'front',
    label: { vi: 'Chính Diện Mũi', en: 'Front Elevation' },
    position: [0, 1.8, -12.6],
    target: [0, 0.2, 0],
    fov: 35,
  },
  side: {
    id: 'side',
    label: { vi: 'Cắt Ngang Thân', en: 'Side Profile' },
    position: [-13.2, 2.1, 0],
    target: [0, 0.25, 0],
    fov: 35,
  },
  detail: {
    id: 'detail',
    label: { vi: 'Cận Cảnh Cơ Khí', en: 'Close-Up Detail' },
    position: [4.8, 1.9, -5.2],
    target: [0, 0.1, -0.8],
    fov: 32,
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
