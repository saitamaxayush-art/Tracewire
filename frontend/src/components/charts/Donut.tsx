import { useState } from 'react';
import { formatInt } from '../../lib/format';

export interface Slice {
  key: string;
  label: string;
  count: number;
  color: string;
  ring?: boolean;
}

/** Donut with callout labels. Shares are computed from the slice counts passed in. */
export function Donut({ slices, title, centerLabel }: { slices: Slice[]; title: string; centerLabel: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const total = slices.reduce((s, x) => s + x.count, 0);
  const R = 92;
  const r = 62;
  const cx = 200;
  const cy = 170;
  let acc = 0;
  const shown = slices.filter((s) => s.count > 0);

  const arcs = shown.map((s) => {
    const a0 = (acc / total) * Math.PI * 2 - Math.PI / 2;
    acc += s.count;
    const a1 = (acc / total) * Math.PI * 2 - Math.PI / 2;
    return { ...s, a0, a1 };
  });

  const path = (a0: number, a1: number, ro: number, ri: number) => {
    // Full circle needs two arcs.
    if (a1 - a0 >= Math.PI * 2 - 1e-6) a1 = a0 + Math.PI * 2 - 1e-4;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (a: number, rr: number) => `${(cx + Math.cos(a) * rr).toFixed(2)} ${(cy + Math.sin(a) * rr).toFixed(2)}`;
    return `M ${p(a0, ro)} A ${ro} ${ro} 0 ${large} 1 ${p(a1, ro)} L ${p(a1, ri)} A ${ri} ${ri} 0 ${large} 0 ${p(a0, ri)} Z`;
  };

  // Callouts: place on left or right side, then spread vertically to avoid overlap.
  type Callout = { key: string; side: 1 | -1; ax: number; ay: number; y: number; text: string; share: string };
  const callouts: Callout[] = arcs.map((a) => {
    const mid = (a.a0 + a.a1) / 2;
    const ax = cx + Math.cos(mid) * (R + 4);
    const ay = cy + Math.sin(mid) * (R + 4);
    return { key: a.key, side: Math.cos(mid) >= 0 ? 1 : -1, ax, ay, y: cy + Math.sin(mid) * (R + 28), text: a.label, share: `${((a.count / total) * 100).toFixed(0)}%` };
  });
  for (const side of [1, -1] as const) {
    const group = callouts.filter((c) => c.side === side).sort((a, b) => a.y - b.y);
    const gap = 26;
    for (let i = 1; i < group.length; i++) if (group[i].y - group[i - 1].y < gap) group[i].y = group[i - 1].y + gap;
    const overflow = group.length ? group[group.length - 1].y - 326 : 0;
    if (overflow > 0) for (const g of group) g.y -= overflow;
    for (let i = 0; i < group.length; i++) if (group[i].y < 14 + i * gap) group[i].y = 14 + i * gap;
  }

  const active = hover ? arcs.find((a) => a.key === hover) : null;

  return (
    <figure className="donut">
      <svg viewBox="0 0 400 340" role="img" aria-label={`${title}. ${shown.map((s) => `${s.label} ${((s.count / total) * 100).toFixed(0)} percent`).join(', ')}`}>
        <title>{title}</title>
        {arcs.map((a) => (
          <path
            key={a.key}
            d={path(a.a0, a.a1, hover === a.key ? R + 6 : R, r)}
            fill={a.color}
            stroke={a.ring ? 'var(--white)' : 'var(--ink)'}
            strokeWidth={a.ring ? 1 : 2}
            onMouseEnter={() => setHover(a.key)}
            onMouseLeave={() => setHover(null)}
            style={{ transition: 'd .2s' }}
          />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fontFamily="var(--font-head)" fontSize="34" fontWeight="500" fill="var(--white)">
          {active ? `${((active.count / total) * 100).toFixed(0)}%` : formatInt(total)}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize="11" fill="var(--muted)">
          {active ? active.label : centerLabel}
        </text>
        {callouts.map((c) => {
          const ex = c.side === 1 ? 330 : 70;
          return (
            <g key={c.key} opacity={hover && hover !== c.key ? 0.35 : 1}>
              <polyline points={`${c.ax},${c.ay} ${c.side === 1 ? ex - 22 : ex + 22},${c.y} ${ex},${c.y}`} fill="none" stroke="var(--muted)" strokeWidth={1} />
              <rect x={ex - 2.5} y={c.y - 2.5} width={5} height={5} fill="var(--white)" />
              <text x={c.side === 1 ? ex + 8 : ex - 8} y={c.y - 4} textAnchor={c.side === 1 ? 'start' : 'end'} fontSize="10.5" fill="var(--muted)">
                {c.text.length > 16 ? `${c.text.slice(0, 15)}…` : c.text}
              </text>
              <text x={c.side === 1 ? ex + 8 : ex - 8} y={c.y + 10} textAnchor={c.side === 1 ? 'start' : 'end'} fontSize="12" fontFamily="var(--font-mono)" fill="var(--white)">
                {c.share}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
