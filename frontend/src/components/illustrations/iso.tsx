// Isometric drawing helpers and the four slide illustrations.
// Everything is plain SVG built from projected boxes, no raster images.

import type { ReactNode } from 'react';

const C = Math.cos(Math.PI / 6);
const S = 0.5;

export type Pt = [number, number];
/** Project world (x right-back, y left-back, z up) into screen space. */
export function iso(x: number, y: number, z = 0): Pt {
  return [(x - y) * C, (x + y) * S - z];
}
const pts = (p: Pt[]) => p.map(([a, b]) => `${a.toFixed(2)},${b.toFixed(2)}`).join(' ');

export interface Look {
  stroke: string;
  top: string;
  left: string;
  right: string;
  sw?: number;
}

export const LIGHT: Look = { stroke: 'var(--ink)', top: 'var(--white)', left: 'var(--paper)', right: 'var(--white)', sw: 1.3 };
export const LIGHT_BRAND: Look = { stroke: 'var(--ink)', top: 'var(--brand-bright)', left: 'var(--brand-panel)', right: 'var(--brand-bright)', sw: 1.3 };
export const DARK: Look = { stroke: 'var(--muted)', top: 'var(--graphite)', left: 'var(--ink)', right: 'var(--graphite)', sw: 1 };
export const DARK_BRAND: Look = { stroke: 'var(--brand-bright)', top: 'var(--brand-panel)', left: 'var(--ink)', right: 'var(--graphite)', sw: 1 };

/** A box with its near corner at (x,y,z) and size w (x), d (y), h (z). Draws the three visible faces. */
export function Box({ x, y, z = 0, w, d, h, look = LIGHT, className }: { x: number; y: number; z?: number; w: number; d: number; h: number; look?: Look; className?: string }) {
  const top = [iso(x, y, z + h), iso(x + w, y, z + h), iso(x + w, y + d, z + h), iso(x, y + d, z + h)];
  const left = [iso(x, y + d, z), iso(x + w, y + d, z), iso(x + w, y + d, z + h), iso(x, y + d, z + h)];
  const right = [iso(x + w, y, z), iso(x + w, y + d, z), iso(x + w, y + d, z + h), iso(x + w, y, z + h)];
  const common = { stroke: look.stroke, strokeWidth: look.sw ?? 1.2, strokeLinejoin: 'round' as const };
  return (
    <g className={className}>
      <polygon points={pts(left)} fill={look.left} {...common} />
      <polygon points={pts(right)} fill={look.right} {...common} />
      <polygon points={pts(top)} fill={look.top} {...common} />
    </g>
  );
}

export function Line({ a, b, stroke = 'var(--ink)', sw = 1.2, dash }: { a: [number, number, number]; b: [number, number, number]; stroke?: string; sw?: number; dash?: string }) {
  const [x1, y1] = iso(...a);
  const [x2, y2] = iso(...b);
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} strokeLinecap="square" />;
}

/** Flat rectangle on the ground plane (z constant). */
export function Plate({ x, y, z = 0, w, d, fill = 'none', stroke = 'var(--ink)', sw = 1.2, dash }: { x: number; y: number; z?: number; w: number; d: number; fill?: string; stroke?: string; sw?: number; dash?: string }) {
  return <polygon points={pts([iso(x, y, z), iso(x + w, y, z), iso(x + w, y + d, z), iso(x, y + d, z)])} fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} strokeLinejoin="round" />;
}

/** Matrix that maps a 2D drawing onto the face that faces +x (the right face), origin at world (x,y,z). */
export function rightFace(x: number, y: number, z: number) {
  const [tx, ty] = iso(x, y, z);
  // u runs along +y (left-down on screen), v runs down (-z).
  return `matrix(${-C} ${S} 0 1 ${tx} ${ty})`;
}
/** Matrix for the face that faces +y (the left face). u runs along +x. */
export function leftFace(x: number, y: number, z: number) {
  const [tx, ty] = iso(x, y, z);
  return `matrix(${C} ${S} 0 1 ${tx} ${ty})`;
}
/** Matrix for the top face, u along +x, v along +y. */
export function topFace(x: number, y: number, z: number) {
  const [tx, ty] = iso(x, y, z);
  return `matrix(${C} ${S} ${-C} ${S} ${tx} ${ty})`;
}

export function IsoSvg({ children, viewBox, title, className }: { children: ReactNode; viewBox: string; title: string; className?: string }) {
  return (
    <svg viewBox={viewBox} role="img" aria-label={title} className={className} preserveAspectRatio="xMidYMid meet">
      <title>{title}</title>
      {children}
    </svg>
  );
}

// ---------- Slide 1: rule gate ----------

export function RuleGate({ dark = false }: { dark?: boolean }) {
  const base = dark ? DARK : LIGHT;
  const brand = dark ? DARK_BRAND : LIGHT_BRAND;
  const ln = dark ? 'var(--muted)' : 'var(--ink)';
  return (
    <IsoSvg viewBox="-200 -150 400 300" title="Isometric rule gate: transactions pass through a gate and one is diverted">
      <Plate x={-150} y={-40} w={300} d={80} stroke={ln} dash="3 4" />
      <Line a={[-150, 0, 0]} b={[150, 0, 0]} stroke={ln} dash="2 5" />
      {/* diverted lane */}
      <Plate x={30} y={40} w={60} d={70} stroke={ln} dash="3 4" />
      <Box x={-12} y={-56} w={14} d={14} h={110} look={base} />
      <Box x={-12} y={42} w={14} d={14} h={110} look={base} />
      <Box x={-12} y={-56} z={110} w={14} d={112} h={16} look={brand} />
      {/* sensor marks on the beam */}
      {[-30, -6, 18].map((yy) => (
        <Line key={yy} a={[-5, yy, 110]} b={[-5, yy, 96]} stroke={ln} />
      ))}
      <g className="iso-flow">
        <Box x={-130} y={-12} w={24} d={24} h={22} look={base} />
        <Box x={-80} y={-12} w={24} d={24} h={22} look={base} />
        <Box x={60} y={-12} w={24} d={24} h={22} look={base} />
      </g>
      <g className="iso-bob">
        <Box x={48} y={66} w={24} d={24} h={22} look={brand} />
      </g>
      <Line a={[36, 12, 1]} b={[56, 60, 1]} stroke="var(--brand-bright)" sw={2} />
    </IsoSvg>
  );
}

// ---------- Slide 2: review queue ----------

export function ReviewQueue({ dark = false }: { dark?: boolean }) {
  const base = dark ? DARK : LIGHT;
  const brand = dark ? DARK_BRAND : LIGHT_BRAND;
  const ln = dark ? 'var(--muted)' : 'var(--ink)';
  const cards = [0, 1, 2, 3, 4];
  return (
    <IsoSvg viewBox="-200 -150 400 300" title="Isometric review queue: alert cards waiting in line, one lifted for review">
      <Box x={-150} y={-30} w={300} d={60} h={10} look={base} />
      {cards.map((i) => {
        const x = -130 + i * 52;
        const lifted = i === 3;
        return (
          <g key={i} className={lifted ? 'iso-bob' : undefined}>
            <Box x={x} y={-22} z={lifted ? 46 : 10} w={8} d={44} h={58} look={lifted ? brand : base} />
            <g transform={rightFace(x + 8, -22, (lifted ? 46 : 10) + 58)}>
              {[10, 20, 30].map((v) => (
                <line key={v} x1={6} y1={v} x2={v === 10 ? 34 : 26} y2={v} stroke={lifted ? 'var(--ink)' : ln} strokeWidth={1.4} />
              ))}
            </g>
          </g>
        );
      })}
      <Line a={[-150, 50, 0]} b={[150, 50, 0]} stroke={ln} dash="2 5" />
      {/* reviewer stand */}
      <Box x={90} y={60} w={34} d={34} h={34} look={base} />
      <Plate x={90} y={60} z={34} w={34} d={34} fill={dark ? 'var(--graphite)' : 'var(--white)'} stroke={ln} />
      <Line a={[107, 77, 34]} b={[107, 77, 70]} stroke={ln} />
      <Box x={97} y={67} z={70} w={20} d={20} h={4} look={brand} />
    </IsoSvg>
  );
}

// ---------- Slide 3: case folder ----------

export function CaseFolder({ dark = false }: { dark?: boolean }) {
  const base = dark ? DARK : LIGHT;
  const brand = dark ? DARK_BRAND : LIGHT_BRAND;
  const ln = dark ? 'var(--muted)' : 'var(--ink)';
  return (
    <IsoSvg viewBox="-200 -150 400 300" title="Isometric case folder holding dispute papers">
      <Plate x={-120} y={-80} w={240} d={160} stroke={ln} dash="3 4" />
      <Box x={-90} y={-60} w={180} d={120} h={10} look={base} />
      {/* papers */}
      <Box x={-78} y={-48} z={10} w={156} d={96} h={3} look={base} />
      <g className="iso-bob">
        <Box x={-66} y={-40} z={22} w={130} d={80} h={2} look={base} />
        <g transform={topFace(-66, -40, 24)}>
          {[14, 26, 38, 50].map((v, i) => (
            <line key={v} x1={12} y1={v} x2={i === 0 ? 70 : 110} y2={v} stroke={ln} strokeWidth={1.3} />
          ))}
          <rect x={86} y={58} width={30} height={14} fill="var(--brand-bright)" stroke={ln} strokeWidth={1.2} />
        </g>
      </g>
      {/* folder flap with tab */}
      <Box x={-90} y={-60} z={10} w={8} d={120} h={70} look={brand} />
      <Box x={-90} y={-20} z={80} w={8} d={40} h={12} look={brand} />
      <g transform={leftFace(-90, 60, 10)}>
        <line x1={0} y1={-10} x2={8} y2={-10} stroke={ln} />
      </g>
    </IsoSvg>
  );
}

// ---------- Slide 4: ledger stack ----------

export function LedgerStack({ dark = false, rows }: { dark?: boolean; rows?: string[] }) {
  const base = dark ? DARK : LIGHT;
  const brand = dark ? DARK_BRAND : LIGHT_BRAND;
  const ln = dark ? 'var(--muted)' : 'var(--ink)';
  const n = rows?.length ?? 5;
  const h = 20;
  return (
    <IsoSvg viewBox="-210 -170 420 330" title={rows ? `Isometric ledger stack with ${n} audit timestamps` : 'Isometric ledger stack of audit entries'}>
      <Plate x={-120} y={-80} w={240} d={160} stroke={ln} dash="3 4" />
      {Array.from({ length: n }).map((_, i) => {
        const z = i * (h + 4);
        const top = i === n - 1;
        const offset = i % 2 === 0 ? 0 : 6;
        return (
          <g key={i} className={top ? 'iso-bob' : undefined}>
            <Box x={-70 + offset} y={-60} z={z} w={140} d={120} h={h} look={top ? brand : base} />
            <g transform={leftFace(-70 + offset, 60, z + h)}>
              {rows ? (
                <text x={10} y={14} fontFamily="var(--font-mono)" fontSize={10.5} fill={top && !dark ? 'var(--ink)' : dark ? (top ? 'var(--brand-bright)' : 'var(--paper)') : 'var(--ink)'}>
                  {rows[i]}
                </text>
              ) : (
                <>
                  <line x1={10} y1={10} x2={70} y2={10} stroke={ln} strokeWidth={1.3} />
                  <line x1={84} y1={10} x2={124} y2={10} stroke={ln} strokeWidth={1.3} />
                </>
              )}
            </g>
            <g transform={rightFace(70 + offset, -60, z + h)}>
              <rect x={8} y={6} width={8} height={8} fill={top ? 'var(--ink)' : 'var(--brand-bright)'} />
            </g>
          </g>
        );
      })}
    </IsoSvg>
  );
}
