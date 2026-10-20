import React, { useEffect, useRef } from 'react';
import { animate, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAppStore } from '@/domain/store';
import {
  STORY_PHASES,
  STORY_PHASE_COUNT,
  getStoryPhase,
  storyAnchorScreenRef,
  type StoryMetric,
  type StoryPhase,
} from '@/domain/story';

const pad2 = (n: number): string => String(n).padStart(2, '0');

const formatMetric = (value: number, decimals: number): string =>
  value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

/** Big telemetry readout that counts between phase values without React re-renders. */
const StoryMetricReadout: React.FC<{ metric: StoryMetric; reducedMotion: boolean }> = ({
  metric,
  reducedMotion,
}) => {
  const valueRef = useRef<HTMLSpanElement | null>(null);
  const lastValueRef = useRef<number>(metric.value);

  useEffect(() => {
    const el = valueRef.current;
    if (!el) return;
    const from = lastValueRef.current;
    lastValueRef.current = metric.value;
    if (reducedMotion || from === metric.value) {
      el.textContent = formatMetric(metric.value, metric.decimals);
      return;
    }
    const controls = animate(from, metric.value, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        el.textContent = formatMetric(v, metric.decimals);
      },
    });
    return () => controls.stop();
  }, [metric.value, metric.decimals, reducedMotion]);

  return (
    <div data-testid="story-metric" className="select-none">
      <div className="font-mono text-[10px] sm:text-[11px] tracking-[0.18em] text-[#95A5B3] uppercase">
        {metric.label}
      </div>
      <div className="flex items-baseline gap-1.5 text-[#F2F6FA]">
        <span
          ref={valueRef}
          data-testid="story-metric-value"
          className="font-mono font-medium tabular-nums text-[40px] sm:text-[56px] leading-none tracking-tight"
        >
          {formatMetric(metric.value, metric.decimals)}
        </span>
        <span className="font-mono text-base sm:text-xl text-[#C9D4DE]">{metric.unit}</span>
      </div>
    </div>
  );
};

/**
 * Numbered callout pinned to a 3D part: ring on the anchor, leader line to an elbow dot,
 * title / body / status text. Positioned in its own rAF loop from `storyAnchorScreenRef`.
 */
const StoryCalloutOverlay: React.FC<{ phase: StoryPhase; phaseIndex: number }> = ({
  phase,
  phaseIndex,
}) => {
  const labelRef = useRef<HTMLDivElement | null>(null);
  const svgGroupRef = useRef<SVGGElement | null>(null);
  const lineRef = useRef<SVGPolylineElement | null>(null);
  const ringRef = useRef<SVGCircleElement | null>(null);
  const coreRef = useRef<SVGCircleElement | null>(null);
  const elbowRef = useRef<SVGCircleElement | null>(null);
  const { callout } = phase;

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const label = labelRef.current;
      const group = svgGroupRef.current;
      if (!label || !group) return;

      const a = storyAnchorScreenRef;
      const show = a.visible && a.phaseIndex === phaseIndex;
      label.style.visibility = show ? 'visible' : 'hidden';
      group.style.visibility = show ? 'visible' : 'hidden';
      if (!show) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const compact = vw < 768;
      const w = label.offsetWidth;
      const h = label.offsetHeight;
      const gap = 10;
      const scale = compact ? 0.55 : 1;

      // Elbow dot = anchor + phase offset, clamped so the label stays inside the frame.
      let dx = a.x + callout.offsetPx[0] * scale;
      let dy = a.y + callout.offsetPx[1] * scale;
      if (callout.side === 'left') {
        dx = Math.max(w + gap + 20, Math.min(vw - 20, dx));
      } else {
        dx = Math.max(20, Math.min(vw - w - gap - 20, dx));
      }
      dy = Math.max(96, Math.min(vh - 190 - h, dy));

      const left = callout.side === 'left' ? dx - gap - w : dx + gap;
      label.style.transform = `translate3d(${left.toFixed(1)}px, ${(dy - 14).toFixed(1)}px, 0)`;

      const kneeX = dx + (callout.side === 'left' ? 28 : -28) * scale;
      lineRef.current?.setAttribute(
        'points',
        `${dx.toFixed(1)},${dy.toFixed(1)} ${kneeX.toFixed(1)},${dy.toFixed(1)} ${a.x.toFixed(1)},${a.y.toFixed(1)}`
      );
      for (const c of [ringRef.current, coreRef.current]) {
        c?.setAttribute('cx', a.x.toFixed(1));
        c?.setAttribute('cy', a.y.toFixed(1));
      }
      elbowRef.current?.setAttribute('cx', dx.toFixed(1));
      elbowRef.current?.setAttribute('cy', dy.toFixed(1));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [callout, phaseIndex]);

  return (
    <>
      <svg className="absolute inset-0 w-full h-full overflow-visible" aria-hidden="true">
        <g ref={svgGroupRef} style={{ visibility: 'hidden' }}>
          <motion.polyline
            key={`line-${phase.id}`}
            ref={lineRef}
            fill="none"
            stroke="#E9F0F5"
            strokeOpacity={0.85}
            strokeWidth={1}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35 }}
          />
          <circle ref={ringRef} r={11} fill="none" stroke="#F5A623" strokeWidth={1.25} />
          <circle ref={coreRef} r={3.5} fill="#F2F6FA" />
          <circle ref={elbowRef} r={3} fill="#F2F6FA" />
        </g>
      </svg>

      <div
        ref={labelRef}
        data-testid="story-callout"
        data-part-id={callout.partId}
        className="absolute left-0 top-0 w-[min(300px,62vw)] will-change-transform"
        style={{ visibility: 'hidden' }}
      >
        <motion.div
          key={phase.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.25 }}
          className={`relative isolate ${callout.side === 'left' ? 'text-right' : 'text-left'}`}
        >
          {/* Soft scrim so text stays legible over bright fuselage reflections */}
          <div
            aria-hidden="true"
            className="absolute -inset-x-8 -inset-y-6 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(7,10,15,0.78)_0%,rgba(7,10,15,0.5)_45%,transparent_72%)]"
          />
          <div
            className={`flex items-baseline gap-2 ${callout.side === 'left' ? 'justify-end' : ''}`}
          >
            <span className="font-mono text-xs text-[#F5A623]">{pad2(callout.index)}</span>
            <span className="font-sans text-lg sm:text-[22px] font-semibold text-[#F2F6FA] leading-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
              {callout.title}
            </span>
          </div>
          <p className="hidden sm:block mt-1.5 font-sans text-[13px] leading-snug text-[#C9D4DE] drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
            {callout.body}
          </p>
          <div className="mt-1.5 font-mono text-[10px] sm:text-[11px] tracking-[0.14em] text-[#E9F0F5]">
            {callout.status}
          </div>
        </motion.div>
      </div>
    </>
  );
};

interface StripButtonProps {
  hotkey: string;
  label: string;
  hint?: string;
  active?: boolean;
  accent?: boolean;
  testId?: string;
  onClick: () => void;
}

const StripButton: React.FC<StripButtonProps> = ({
  hotkey,
  label,
  hint,
  active = false,
  accent = false,
  testId,
  onClick,
}) => (
  <button
    type="button"
    data-testid={testId}
    aria-pressed={active}
    onClick={onClick}
    className={`shrink-0 min-h-[44px] sm:min-h-[36px] inline-flex items-center gap-2 pl-1.5 pr-3 rounded-md border text-[13px] transition-colors ${
      accent
        ? 'border-[#F5A623]/80 bg-[#2B2112]/70 text-[#FFD08A]'
        : active
          ? 'border-[#E9F0F5]/70 bg-[#1A222D] text-[#F2F6FA]'
          : 'border-[#2A3542] bg-[#0E131A] text-[#AEBBC7] hover:border-[#95A5B3]/60 hover:text-[#E9F0F5]'
    }`}
  >
    <kbd className="min-w-[20px] h-5 px-1 inline-flex items-center justify-center rounded border border-current/40 font-mono text-[10px] opacity-80">
      {hotkey}
    </kbd>
    <span className="whitespace-nowrap">{label}</span>
    {hint && <span className="font-mono text-[10px] text-[#7D8B98] whitespace-nowrap">{hint}</span>}
  </button>
);

const StripRow: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="flex items-center gap-3 min-w-0">
    <span className="w-[72px] sm:w-[88px] shrink-0 font-mono text-[10px] tracking-[0.2em] text-[#7D8B98] uppercase">
      {title}
    </span>
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar min-w-0 py-0.5">{children}</div>
  </div>
);

export const StoryHud: React.FC = () => {
  const storyPhaseIndex = useAppStore((s) => s.storyPhaseIndex);
  const mode = useAppStore((s) => s.mode);
  const flightPhaseLabel = useAppStore((s) => s.flightPhaseLabel);
  const isCutaway = useAppStore((s) => s.isCutaway);
  const beaconOn = useAppStore((s) => s.beaconOn);
  const strobeOn = useAppStore((s) => s.strobeOn);
  const landingLightOn = useAppStore((s) => s.landingLightOn);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const toggleCutaway = useAppStore((s) => s.toggleCutaway);
  const toggleAircraftLight = useAppStore((s) => s.toggleAircraftLight);
  const dispatch = useAppStore((s) => s.dispatch);

  const phase = getStoryPhase(storyPhaseIndex);
  if (!phase || storyPhaseIndex === null) return null;

  const autoCutaway =
    mode === 'flight-transition' &&
    (flightPhaseLabel === 'GEAR DOOR OPEN' || flightPhaseLabel === 'GEAR RETRACT');
  const cutawayShown = isCutaway || autoCutaway;
  const calloutPart = phase.callout.partId;

  return (
    <section
      data-testid="story-hud"
      data-story-phase={phase.id}
      aria-label={`Hành trình bay, pha ${storyPhaseIndex + 1} trên ${STORY_PHASE_COUNT}: ${phase.label}`}
      className="fixed inset-0 z-20 pointer-events-none text-[#E9F0F5]"
    >
      {/* Callout + leader line (screen space) */}
      <StoryCalloutOverlay phase={phase} phaseIndex={storyPhaseIndex} />

      {/* Thin figure frame */}
      <div className="absolute left-3 right-3 top-3 sm:left-5 sm:right-5 sm:top-5 bottom-[170px] sm:bottom-[150px] border border-[#E9F0F5]/25 rounded-[2px]">
        <div className="absolute left-4 top-3 sm:left-5 sm:top-4 flex flex-col gap-3 sm:gap-5">
          <span className="font-mono text-xs sm:text-sm text-[#E9F0F5]">
            {cutawayShown ? 'Fig 1 — cutaway' : 'Fig 1'}
          </span>
          <StoryMetricReadout metric={phase.metric} reducedMotion={reducedMotion} />
        </div>

        <div className="absolute right-3 top-3 sm:right-5 sm:top-4 flex items-center gap-3">
          <span className="hidden sm:inline font-mono text-xs sm:text-sm tracking-[0.3em] text-[#C9D4DE]">
            AERIS X-9 · CONCEPT
          </span>
          <button
            type="button"
            data-testid="story-exit"
            onClick={() => dispatch({ type: 'STORY_EXIT' })}
            aria-label="Thoát hành trình bay (Esc)"
            title="Thoát hành trình bay (Esc)"
            className="pointer-events-auto min-h-[36px] min-w-[36px] inline-flex items-center justify-center gap-1.5 px-2 rounded-md border border-[#2A3542] bg-[#0E131A]/80 text-[#AEBBC7] hover:text-[#F2F6FA] hover:border-[#95A5B3]/60 font-mono text-[11px]"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Esc</span>
          </button>
        </div>

        <div className="absolute left-4 bottom-3 sm:left-5 sm:bottom-4 flex items-center gap-2">
          <button
            type="button"
            aria-label="Pha trước"
            disabled={storyPhaseIndex === 0}
            onClick={() => dispatch({ type: 'STORY_PREV' })}
            className="pointer-events-auto min-h-[32px] min-w-[32px] inline-flex items-center justify-center rounded border border-[#2A3542] bg-[#0E131A]/80 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span
            data-testid="story-phase-label"
            className="font-mono text-[11px] sm:text-xs tracking-[0.22em] text-[#C9D4DE] uppercase whitespace-nowrap"
          >
            Pha {pad2(storyPhaseIndex + 1)} / {pad2(STORY_PHASE_COUNT)} · {phase.label}
          </span>
          <button
            type="button"
            aria-label="Pha tiếp theo"
            disabled={storyPhaseIndex >= STORY_PHASE_COUNT - 1}
            onClick={() => dispatch({ type: 'STORY_NEXT' })}
            className="pointer-events-auto min-h-[32px] min-w-[32px] inline-flex items-center justify-center rounded border border-[#2A3542] bg-[#0E131A]/80 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div
          data-testid="story-status-line"
          className="hidden md:block absolute right-5 bottom-4 font-mono text-xs text-[#E9F0F5] whitespace-nowrap"
        >
          {phase.statusLine}
        </div>
      </div>

      {/* PHASES / SYSTEMS / LIGHTS control strip */}
      <nav
        aria-label="Điều khiển hành trình bay"
        className="pointer-events-auto absolute left-3 right-3 sm:left-5 sm:right-5 bottom-3 sm:bottom-4 flex flex-col gap-1.5"
      >
        <StripRow title="Pha">
          {STORY_PHASES.map((p, i) => (
            <StripButton
              key={p.id}
              hotkey={p.key}
              label={p.label}
              active={i === storyPhaseIndex}
              testId={`story-phase-${p.id}`}
              onClick={() => dispatch({ type: 'STORY_GOTO', index: i })}
            />
          ))}
        </StripRow>
        <StripRow title="Hệ thống">
          <StripButton
            hotkey="C"
            label="Cutaway"
            active={cutawayShown}
            accent={cutawayShown}
            testId="story-toggle-cutaway"
            onClick={toggleCutaway}
          />
          <StripButton
            hotkey="I"
            label="Soi chi tiết"
            hint={phase.callout.title}
            onClick={() => dispatch({ type: 'SELECT_PART', partId: calloutPart })}
          />
          <StripButton
            hotkey="E"
            label="Bóc tách"
            onClick={() => dispatch({ type: 'TOGGLE_EXPLODE' })}
          />
        </StripRow>
        <StripRow title="Đèn">
          <StripButton
            hotkey="B"
            label="Đèn nháy đỏ"
            hint={beaconOn ? 'bật' : 'tắt'}
            active={beaconOn}
            testId="story-toggle-beacon"
            onClick={() => toggleAircraftLight('beacon')}
          />
          <StripButton
            hotkey="S"
            label="Đèn chớp"
            hint={strobeOn ? 'bật' : 'tắt'}
            active={strobeOn}
            testId="story-toggle-strobe"
            onClick={() => toggleAircraftLight('strobe')}
          />
          <StripButton
            hotkey="L"
            label="Đèn lăn / hạ cánh"
            hint={landingLightOn ? 'bật' : 'tắt'}
            active={landingLightOn}
            testId="story-toggle-landing"
            onClick={() => toggleAircraftLight('landing')}
          />
        </StripRow>
      </nav>
    </section>
  );
};
