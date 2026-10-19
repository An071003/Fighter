export type SceneMode =
  | 'boot'
  | 'loading'
  | 'showroom'
  | 'inspect'
  | 'exploded'
  | 'flight-transition'
  | 'hover'
  | 'return-transition'
  | 'error';

export type QualityTier = 'auto' | 'high' | 'medium' | 'low';
export type ResolvedQualityTier = 'high' | 'medium' | 'low';

export type CameraPresetName = 'hero' | 'top' | 'front' | 'side' | 'detail';

export type PartCategory =
  | 'CORE'
  | 'CANOPY'
  | 'SURFACE'
  | 'DUCT'
  | 'GEAR'
  | 'PANEL'
  | 'LIGHT';

export type PartSide = 'CENTER' | 'LEFT' | 'RIGHT' | 'FRONT';

export interface PartDefinition {
  id: string;
  nodeName: string;
  label: {
    vi: string;
    en: string;
  };
  description?: {
    vi: string;
    en: string;
  };
  category: PartCategory;
  side: PartSide;
  parentId: string | null;
  inspectOrder?: number;
  selectable: boolean;
  explode: {
    offset: [number, number, number];
    rotationDeg: [number, number, number];
  };
  focus: {
    preferredAzimuthDeg: number;
    distanceMultiplier: number;
  };
  interaction?: {
    canOpen?: boolean;
    canSpin?: boolean;
    canHide?: boolean;
  };
}

export interface PartManifest {
  schemaVersion: string;
  model: string;
  axis: {
    up: string;
    nose: string;
    wings: string;
  };
  minRequiredParts: number;
  modelGlbUrl: string;
  notes?: string[];
  parts: PartDefinition[];
}

export interface RestPoseSnapshot {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  scale: [number, number, number];
}

export interface EvaluatedPartTransform {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  scale: [number, number, number];
}

export interface AssetAuditReport {
  loaded: boolean;
  isHighFidelity: boolean;
  totalNamedPartsFound: number;
  expectedPartsCount: number;
  missingPartIds: string[];
  triangleCount: number;
  meshCount: number;
  hasThreeLandingGear: boolean;
  hasGearDoors: boolean;
  timestamp: string;
}

export type FlightPhaseLabel =
  | 'LOCK-IN'
  | 'POWER-UP'
  | 'LIFTOFF'
  | 'GEAR DOOR OPEN'
  | 'GEAR RETRACT'
  | 'GEAR DOOR CLOSE'
  | 'HOVER HANDOFF'
  | 'HOVERING'
  | 'RETURNING'
  | 'STANDBY';
