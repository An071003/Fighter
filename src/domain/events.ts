import type {
  AssetAuditReport,
  CameraPresetName,
  PartCategory,
  QualityTier,
} from './types';

export type SceneEvent =
  | { type: 'LOAD_SUCCESS'; audit: AssetAuditReport }
  | { type: 'LOAD_FAILURE'; reason: string }
  | { type: 'SELECT_PART'; partId: string }
  | { type: 'DESELECT_PART' }
  | { type: 'TOGGLE_ISOLATE_PART' }
  | { type: 'SET_EXPLODE_PROGRESS'; value: number }
  | { type: 'TOGGLE_EXPLODE' }
  | { type: 'SET_CATEGORY_FILTER'; category: PartCategory | 'ALL' }
  | { type: 'START_FLIGHT' }
  | { type: 'PAUSE_FLIGHT' }
  | { type: 'RESUME_FLIGHT' }
  | { type: 'REPLAY_FLIGHT' }
  | { type: 'COMPLETE_FLIGHT' }
  | { type: 'RETURN_TO_SHOWROOM' }
  | { type: 'COMPLETE_RETURN' }
  | { type: 'SEEK_TIMELINE'; timeSeconds: number }
  | { type: 'SET_CAMERA_PRESET'; preset: CameraPresetName }
  | { type: 'RESET_VIEW' }
  | { type: 'RESET_SCENE' }
  | { type: 'SET_QUALITY'; tier: QualityTier }
  | { type: 'SET_REDUCED_MOTION'; enabled: boolean }
  | { type: 'RETRY' }
  | { type: 'STORY_GOTO'; index: number }
  | { type: 'STORY_NEXT' }
  | { type: 'STORY_PREV' }
  | { type: 'STORY_EXIT' };
