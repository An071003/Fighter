/**
 * Guided "Hành trình bay" story — 7 phases adapted from the reference video
 * (Gate → Push & start → Taxi → Line-up → Take-off → Climb → 10,000 ft).
 * Each phase owns a camera shot, one numbered callout pinned to a part,
 * one big telemetry readout, a system/light preset and a flight-timeline segment.
 */

export type StoryFlightSegment =
  | { kind: 'ground' }
  | { kind: 'segment'; fromSeconds: number; toSeconds: number }
  | { kind: 'hover' };

export interface StoryCallout {
  index: number;
  partId: string;
  title: string;
  body: string;
  status: string;
  /** Pixel offset from the projected anchor to the leader-line elbow dot. */
  offsetPx: [number, number];
  /** Which side of the dot the label text sits on. */
  side: 'left' | 'right';
}

export interface StoryMetric {
  label: string;
  value: number;
  unit: string;
  decimals: number;
  /** Count-up duration when entering the phase (default 1.1s). */
  rampSeconds?: number;
}

export interface StoryPhase {
  id: string;
  key: string;
  label: string;
  metric: StoryMetric;
  statusLine: string;
  camera: {
    position: [number, number, number];
    target: [number, number, number];
    fov: number;
  };
  systems: {
    cutaway: boolean;
    beacon: boolean;
    strobe: boolean;
    landing: boolean;
  };
  flight: StoryFlightSegment;
  callout: StoryCallout;
}

export const STORY_PHASES: readonly StoryPhase[] = [
  {
    id: 'gate',
    key: '1',
    label: 'Sân đỗ',
    metric: { label: 'N1 · ĐỘNG CƠ', value: 0, unit: '%', decimals: 1 },
    statusLine: 'Sân đỗ · CONF 0 · động cơ tắt · 0 kt · càng hạ',
    camera: { position: [-7.4, 3.6, -10.6], target: [0, 1.8, -3.6], fov: 30 },
    systems: { cutaway: false, beacon: false, strobe: false, landing: false },
    flight: { kind: 'ground' },
    callout: {
      index: 1,
      partId: 'canopy-glass',
      title: 'Vòm kính buồng lái',
      body: 'Vòm kính liền khối. Khi khóa lại, gioăng áp suất ép kín toàn bộ khoang lái.',
      status: 'ĐÓNG · KHÓA ÁP SUẤT',
      offsetPx: [-150, -110],
      side: 'left',
    },
  },
  {
    id: 'start',
    key: '2',
    label: 'Khởi động',
    metric: { label: 'N1 · ĐỘNG CƠ', value: 21.4, unit: '%', decimals: 1, rampSeconds: 4.5 },
    statusLine: 'Khởi động · CONF 0 · N1 21% · 0 kt · càng hạ',
    camera: { position: [-3.1, 1.5, -8.9], target: [-0.95, 1.31, -2.9], fov: 24 },
    systems: { cutaway: false, beacon: true, strobe: false, landing: false },
    flight: { kind: 'ground' },
    callout: {
      index: 2,
      partId: 'intake-shell-left',
      title: 'Cửa hút gió DSI · quạt nén',
      body: 'Cửa hút gió không vách ngăn (DSI) nạp khí vào quạt nén 14 cánh đang lên vòng tua không tải. Đèn chống va chạm đỏ nháy 1 Hz.',
      status: 'N1 21.4% · EGT 498°C',
      offsetPx: [190, -150],
      side: 'right',
    },
  },
  {
    id: 'taxi',
    key: '3',
    label: 'Lăn bánh',
    metric: { label: 'TỐC ĐỘ MẶT ĐẤT', value: 12, unit: 'kt', decimals: 0 },
    statusLine: 'Lăn bánh · CONF 1 · N1 24% · 12 kt · càng hạ',
    camera: { position: [-5.6, 1.35, -9.6], target: [-0.1, 0.9, -4.3], fov: 32 },
    systems: { cutaway: false, beacon: true, strobe: false, landing: true },
    flight: { kind: 'ground' },
    callout: {
      index: 3,
      partId: 'gear-strut-front',
      title: 'Càng mũi · đèn lăn',
      body: 'Càng mũi lái hướng khi lăn bánh. Đèn lăn chiếu vệt sáng xuống đường tâm phía trước.',
      status: 'LÁI HƯỚNG · ĐÈN LĂN BẬT',
      offsetPx: [-160, -150],
      side: 'left',
    },
  },
  {
    id: 'lineup',
    key: '4',
    label: 'Vào đường băng',
    metric: { label: 'N1 · ĐỘNG CƠ', value: 32.0, unit: '%', decimals: 1 },
    statusLine: 'Vào đường băng · CONF 1 · N1 32% · 0 kt · càng hạ',
    camera: { position: [0.2, 24, 1.6], target: [0, 1.2, -0.8], fov: 34 },
    systems: { cutaway: false, beacon: true, strobe: true, landing: true },
    flight: { kind: 'ground' },
    callout: {
      index: 4,
      partId: 'tip-light-left',
      title: 'Đèn chớp đầu cánh',
      body: 'Đèn trắng chớp kép bật khi vào đường băng, giúp máy bay dễ được nhìn thấy từ xa.',
      status: 'STROBE BẬT · CHỚP KÉP',
      offsetPx: [-90, -150],
      side: 'left',
    },
  },
  {
    id: 'takeoff',
    key: '5',
    label: 'Cất cánh',
    metric: { label: 'TỐC ĐỘ BAY', value: 145, unit: 'kt', decimals: 0 },
    statusLine: 'Cất cánh · CONF 1 · N1 92% · 145 kt · càng hạ',
    camera: { position: [-8.6, 3.0, 12.6], target: [0, 1.4, 2.2], fov: 30 },
    systems: { cutaway: false, beacon: true, strobe: true, landing: true },
    flight: { kind: 'segment', fromSeconds: 0, toSeconds: 2.95 },
    callout: {
      index: 5,
      partId: 'exhaust-ring-left',
      title: 'Lực đẩy cất cánh',
      body: 'Động cơ lên lực đẩy tối đa, vòi phun răng cưa 16 lá mở rộng và luồng khí nóng phụt ra phía sau.',
      status: 'N1 92.0% · TOGA',
      offsetPx: [150, -190],
      side: 'right',
    },
  },
  {
    id: 'climb',
    key: '6',
    label: 'Thu càng',
    metric: { label: 'ĐỘ CAO', value: 1904, unit: 'ft', decimals: 0 },
    statusLine: 'Thu càng · CONF 1 · N1 92% · 178 kt · càng đang thu',
    camera: { position: [-12.2, 2.3, -5.8], target: [-0.4, 1.15, 0.4], fov: 30 },
    systems: { cutaway: true, beacon: true, strobe: true, landing: true },
    flight: { kind: 'segment', fromSeconds: 2.95, toSeconds: 7.0 },
    callout: {
      index: 6,
      partId: 'gear-strut-left',
      title: 'Càng chính',
      body: 'Cửa khoang mở, ba cụm càng gập vào bụng trong 1.1 giây rồi cửa đóng kín lại.',
      status: 'CÀNG THU · 3 CỤM',
      offsetPx: [190, 110],
      side: 'right',
    },
  },
  {
    id: 'cruise',
    key: '7',
    label: '10.000 ft',
    metric: { label: 'ĐỘ CAO', value: 10000, unit: 'ft', decimals: 0 },
    statusLine: '10.000 ft · CONF 0 · N1 85% · 250 kt · càng thu',
    camera: { position: [11.6, 4.4, -13.6], target: [0, 1.3, 0], fov: 28 },
    systems: { cutaway: false, beacon: true, strobe: true, landing: false },
    flight: { kind: 'hover' },
    callout: {
      index: 7,
      partId: 'elevon-right',
      title: 'Cánh sạch',
      body: 'Elevon về trung tính, khoang càng đóng kín. Trên 10.000 ft đèn hạ cánh tắt, đèn nháy vẫn bật.',
      status: 'CONF 0 · ĐÈN HẠ CÁNH TẮT',
      offsetPx: [-120, -170],
      side: 'left',
    },
  },
];

export const STORY_PHASE_COUNT = STORY_PHASES.length;

export function getStoryPhase(index: number | null): StoryPhase | null {
  if (index === null) return null;
  return STORY_PHASES[index] ?? null;
}

export function clampStoryIndex(index: number): number {
  return Math.max(0, Math.min(STORY_PHASE_COUNT - 1, Math.round(index)));
}

/**
 * Non-reactive screen-space anchor written by the 3D projector every frame and read by the
 * HTML callout overlay in its own rAF loop (never through React state at 60fps).
 */
export interface StoryAnchorScreen {
  x: number;
  y: number;
  visible: boolean;
  phaseIndex: number;
}

export const storyAnchorScreenRef: StoryAnchorScreen = {
  x: 0,
  y: 0,
  visible: false,
  phaseIndex: -1,
};
