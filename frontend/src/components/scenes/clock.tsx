// Shared timeline for the home page scenes and card animations.
// useSceneClock gives a looping time value that starts at 0 when the scene mounts
// (the slide becomes active) and pauses while the element is off screen or the tab is hidden.
// Under prefers-reduced-motion it returns the final frame and never ticks.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from '../../lib/hooks';
import { SEVERITY_TOKEN, isSeverity } from '../../constants/enums';

export interface SceneClock<T extends Element> {
  ref: React.RefObject<T>;
  /** Milliseconds into the current loop. */
  t: number;
  /** How many loops have completed. */
  loop: number;
  reduced: boolean;
}

export function useSceneClock<T extends Element = SVGSVGElement>(duration: number, ready = true): SceneClock<T> {
  const reduced = useReducedMotion();
  const ref = useRef<T>(null);
  const [state, setState] = useState({ t: 0, loop: 0 });

  useEffect(() => {
    if (reduced || !ready) return;
    let raf = 0;
    let last = 0;
    let t = 0;
    let loop = 0;
    let onScreen = true;
    const tick = (now: number) => {
      const dt = last ? Math.min(64, now - last) : 16;
      last = now;
      t += dt;
      if (t >= duration) {
        t -= duration;
        loop += 1;
      }
      setState({ t, loop });
      raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (raf || !onScreen || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    const io =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(([e]) => {
            onScreen = e.isIntersecting;
            if (onScreen) start();
            else stop();
          })
        : null;
    if (ref.current && io) io.observe(ref.current);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVis);
    setState({ t: 0, loop: 0 });
    start();
    return () => {
      stop();
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [duration, reduced, ready]);

  return { ref, t: reduced ? duration : state.t, loop: reduced ? 0 : state.loop, reduced };
}

/**
 * One-shot timeline: runs from 0 to `duration` once and stops on the last frame.
 * Under reduced motion, or after skip(), it is at the last frame straight away.
 */
export function usePlayOnce(duration: number, ready = true) {
  const reduced = useReducedMotion();
  const [t, setT] = useState(0);
  const [skipped, setSkipped] = useState(false);
  useEffect(() => {
    if (reduced || !ready || skipped) return;
    let raf = 0;
    let last = 0;
    let acc = 0;
    const tick = (now: number) => {
      acc += last ? Math.min(64, now - last) : 16;
      last = now;
      setT(Math.min(duration, acc));
      if (acc < duration) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration, reduced, ready, skipped]);
  const at = reduced || skipped ? duration : t;
  return { t: at, done: at >= duration, reduced, skip: () => setSkipped(true) };
}

// ---------- Timeline maths ----------

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Progress 0..1 of t between a and b. */
export const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
export const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
/** Characters of `text` revealed between a and b, for typing effects. */
export const typed = (text: string, t: number, a: number, b: number) => text.slice(0, Math.round(seg(t, a, b) * text.length));
/** Fade in at the start of the loop and out at the end. */
export const loopFade = (t: number, duration: number, inMs = 350, outMs = 450) => Math.min(seg(t, 0, inMs), 1 - seg(t, duration - outMs, duration));

export function clip(text: string, n: number) {
  return text.length > n ? `${text.slice(0, n - 1).trimEnd()}…` : text;
}

/** Greedy word wrap for SVG text. */
export function wrap(text: string, perLine: number, maxLines = 3): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > perLine) {
      lines.push(cur.trim());
      cur = w;
    } else cur = `${cur} ${w}`;
  }
  if (cur.trim()) lines.push(cur.trim());
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = clip(kept[maxLines - 1] + ' ' + lines[maxLines], perLine);
    return kept;
  }
  return lines;
}

// ---------- SVG atoms ----------

export const MONO = 'var(--font-mono)';
export const SANS = 'var(--font-body)';

export function SvgChip({ x, y, color, text, ring, mono, size = 9 }: { x: number; y: number; color: string; text: string; ring?: boolean; mono?: boolean; size?: number }) {
  const w = text.length * size * (mono ? 0.62 : 0.56) + 22;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height={size + 9} rx={3} fill="var(--ink)" stroke="var(--line)" />
      <rect x={6} y={(size + 9) / 2 - 3.5} width={7} height={7} fill={color} stroke={ring ? 'var(--white)' : 'none'} strokeWidth={1} />
      <text x={17} y={size + 3.5} fontSize={size} fill="var(--paper)" fontFamily={mono ? MONO : SANS}>
        {text}
      </text>
    </g>
  );
}

export function severityColor(level: string) {
  return isSeverity(level) ? SEVERITY_TOKEN[level] : 'var(--muted)';
}

export function SceneEmpty({ text }: { text: string }) {
  return (
    <div className="scene-empty" role="status">
      <span className="sq" aria-hidden="true" />
      {text}
    </div>
  );
}

export function SceneLoading() {
  return <div className="scene-empty" role="status" aria-label="Loading scene" />;
}

export function SceneSvg({ children, label, svgRef, viewBox = '0 0 360 360', className = 'scene-svg' }: { children: ReactNode; label: string; svgRef?: React.RefObject<SVGSVGElement>; viewBox?: string; className?: string }) {
  return (
    <svg ref={svgRef} viewBox={viewBox} className={className} role="img" aria-label={label}>
      <title>{label}</title>
      {children}
    </svg>
  );
}
