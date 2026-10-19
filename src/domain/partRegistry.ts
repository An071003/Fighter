import rawManifest from '../../examples/part-manifest.json';
import type {
  EvaluatedPartTransform,
  PartCategory,
  PartDefinition,
  PartManifest,
  RestPoseSnapshot,
} from './types';

const CATEGORY_DESCRIPTIONS: Record<PartCategory, { vi: string; en: string }> = {
  CORE: {
    vi: 'Cấu trúc thân nguyên khối hợp kim Titan-Carbon phủ gốm mờ, chịu lực chính và định hình khí động học trung tâm.',
    en: 'Monocoque titanium-carbon composite core hull with matte ceramic finish, forming the primary structural spine.',
  },
  CANOPY: {
    vi: 'Vòm kính đa lớp quang học chống chói với khung hợp kim cắt CNC chính xác và giao diện hiển thị trừu tượng.',
    en: 'Multi-layer optical polycarbonate canopy with precision CNC-milled frame and abstract holographic display plate.',
  },
  SURFACE: {
    vi: 'Bề mặt cánh tam giác liền thân (Blended Delta) và cánh điều hướng vát nghiêng tối ưu dòng chảy tầng.',
    en: 'Blended delta wing and canted control surface engineered for laminar airflow visual sculpting.',
  },
  DUCT: {
    vi: 'Cửa hút khí đạo lưu không gờ và vành xả hậu cảnh mạ nhiệt gốm đen tạo điểm nhấn cơ khí.',
    en: 'Diverterless intake shell and dark ceramic thermal exhaust ring providing sculptural mechanical depth.',
  },
  GEAR: {
    vi: 'Cơ cấu càng đáp 3 điểm độc lập với bản lề xoay thu gọn, trục bánh xe lăn và nắp khoang đóng mở tuần tự.',
    en: 'Independent 3-point retractable landing gear assembly with articulated strut pivot, rolling wheel axle, and bay door.',
  },
  PANEL: {
    vi: 'Tấm vỏ bảo trì ngoại vi tháo lắp nhanh, phơi bày lớp kết cấu khung sườn bên dưới khi bóc tách.',
    en: 'Quick-release exterior service panel revealing underlying structural ribs during exploded inspection.',
  },
  LIGHT: {
    vi: 'Dải đèn định vị quang học phát sáng mảnh tích hợp liền mạch tại đầu mút cánh.',
    en: 'Recessed optical navigation beacon integrated seamlessly into the wingtip fairing.',
  },
};

const manifestData = rawManifest as unknown as PartManifest;

export const PART_MANIFEST: PartManifest = {
  ...manifestData,
  parts: manifestData.parts.map((part, idx) => ({
    ...part,
    inspectOrder: idx + 1,
    description: part.description ?? CATEGORY_DESCRIPTIONS[part.category],
    interaction: {
      canOpen: part.category === 'CANOPY' || part.category === 'PANEL' || part.id.includes('door'),
      canSpin: part.id.includes('wheel') || part.id.includes('hub'),
      canHide: part.category !== 'CORE',
    },
  })),
};

const partsById = new Map<string, PartDefinition>();
const partsByNodeName = new Map<string, PartDefinition>();

for (const part of PART_MANIFEST.parts) {
  partsById.set(part.id, part);
  partsByNodeName.set(part.nodeName, part);
}

/**
 * Immutable storage of initial GLB rest transforms per partId.
 * Populated once when the GLB scene loads, never mutated during animations.
 */
const restPoses = new Map<string, RestPoseSnapshot>();

export function registerPartRestPose(partId: string, snapshot: RestPoseSnapshot): void {
  restPoses.set(partId, {
    position: [...snapshot.position] as [number, number, number],
    quaternion: [...snapshot.quaternion] as [number, number, number, number],
    scale: [...snapshot.scale] as [number, number, number],
  });
}

export function getPartRestPose(partId: string): RestPoseSnapshot {
  const existing = restPoses.get(partId);
  if (existing) {
    return {
      position: [...existing.position] as [number, number, number],
      quaternion: [...existing.quaternion] as [number, number, number, number],
      scale: [...existing.scale] as [number, number, number],
    };
  }
  return {
    position: [0, 0, 0],
    quaternion: [0, 0, 0, 1],
    scale: [1, 1, 1],
  };
}

export function clearRegisteredRestPoses(): void {
  restPoses.clear();
}

export function listAllParts(): PartDefinition[] {
  return PART_MANIFEST.parts;
}

export function getPartById(partId: string | null | undefined): PartDefinition | null {
  if (!partId) return null;
  return partsById.get(partId) ?? null;
}

export function getPartByNodeName(nodeName: string): PartDefinition | null {
  return partsByNodeName.get(nodeName) ?? null;
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

export function smoothstep01(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/**
 * Staged rollout per category following docs/05_EXPLODED_VIEW.md:
 * - exterior service panels: t=(p-0.0)/0.55
 * - wings/fairings/canopy/lights: t=(p-0.10)/0.65
 * - tail/ducts: t=(p-0.18)/0.70
 * - gear/core: t=(p-0.25)/0.75
 * Always reaches 0 at p=0 and 1 at p=1.
 */
export function getCategoryEasedProgress(category: PartCategory, progress01: number): number {
  const p = clamp01(progress01);
  if (p <= 0) return 0;
  if (p >= 1) return 1;

  switch (category) {
    case 'PANEL':
      return smoothstep01((p - 0.0) / 0.55);
    case 'CANOPY':
    case 'SURFACE':
    case 'LIGHT':
      return smoothstep01((p - 0.1) / 0.65);
    case 'DUCT':
      return smoothstep01((p - 0.18) / 0.7);
    case 'GEAR':
    case 'CORE':
    default:
      return smoothstep01((p - 0.25) / 0.75);
  }
}

/**
 * Pure quaternion multiplication: a * b
 */
function multiplyQuaternions(
  a: [number, number, number, number],
  b: [number, number, number, number]
): [number, number, number, number] {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    ax * bw + aw * bx + ay * bz - az * by,
    ay * bw + aw * by + az * bx - ax * bz,
    az * bw + aw * bz + ax * by - ay * bx,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

/**
 * Convert Euler XYZ in degrees to quaternion [x, y, z, w]
 */
function eulerDegToQuaternion(deg: [number, number, number]): [number, number, number, number] {
  const deg2rad = Math.PI / 180;
  const x = (deg[0] * deg2rad) / 2;
  const y = (deg[1] * deg2rad) / 2;
  const z = (deg[2] * deg2rad) / 2;

  const cx = Math.cos(x);
  const sx = Math.sin(x);
  const cy = Math.cos(y);
  const sy = Math.sin(y);
  const cz = Math.cos(z);
  const sz = Math.sin(z);

  return [
    sx * cy * cz + cx * sy * sz,
    cx * sy * cz - sx * cy * sz,
    cx * cy * sz + sx * sy * cz,
    cx * cy * cz - sx * sy * sz,
  ];
}

/**
 * Pure deterministic evaluator for a part's local transform at a given explode progress [0..1]
 * and optional selectedPartId (which adds a subtle inspect lift when selected).
 * Never accumulates offsets! At progress=0 and not selected, returns exact restPose.
 */
export function evaluateExplodedPartPose(
  partId: string,
  explodeProgress01: number,
  selectedPartId: string | null = null
): EvaluatedPartTransform {
  const part = getPartById(partId);
  const rest = getPartRestPose(partId);

  if (!part) {
    return rest;
  }

  const e = getCategoryEasedProgress(part.category, explodeProgress01);

  // If this part has a parent in the manifest (e.g., gear-wheel-front -> gear-strut-front),
  // compute relative authored offset so child doesn't double-translate its parent's world offset.
  let authoredDx = part.explode.offset[0];
  let authoredDy = part.explode.offset[1];
  let authoredDz = part.explode.offset[2];

  if (part.parentId) {
    const parentPart = getPartById(part.parentId);
    if (parentPart) {
      authoredDx -= parentPart.explode.offset[0];
      authoredDy -= parentPart.explode.offset[1];
      authoredDz -= parentPart.explode.offset[2];
    }
  }

  // Individual inspect lift when selected (and not in core fuselage)
  const isSelected = selectedPartId === part.id;
  let inspectLiftX = 0;
  let inspectLiftY = 0;
  let inspectLiftZ = 0;

  if (isSelected && part.category !== 'CORE') {
    const norm = Math.hypot(authoredDx, authoredDy, authoredDz) || 1;
    inspectLiftX = (authoredDx / norm) * 0.28;
    inspectLiftY = (authoredDy / norm) * 0.28 + (part.category === 'CANOPY' ? 0.22 : 0.08);
    inspectLiftZ = (authoredDz / norm) * 0.28;
  }

  const pos: [number, number, number] = [
    rest.position[0] + authoredDx * e + inspectLiftX,
    rest.position[1] + authoredDy * e + inspectLiftY,
    rest.position[2] + authoredDz * e + inspectLiftZ,
  ];

  const rotDeg: [number, number, number] = [
    part.explode.rotationDeg[0] * e,
    part.explode.rotationDeg[1] * e + (isSelected && part.side === 'LEFT' ? -3 : isSelected && part.side === 'RIGHT' ? 3 : 0),
    part.explode.rotationDeg[2] * e,
  ];

  const deltaQuat = eulerDegToQuaternion(rotDeg);
  const quat = multiplyQuaternions(rest.quaternion, deltaQuat);

  return {
    position: pos,
    quaternion: quat,
    scale: [...rest.scale] as [number, number, number],
  };
}
