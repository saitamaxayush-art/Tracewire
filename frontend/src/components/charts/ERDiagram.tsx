import { useState } from 'react';
import { KeyRound, Link2, X } from 'lucide-react';
import { RELATIONS, SCHEMA, TABLE_NAMES } from '../../constants/schema';
import type { TableName } from '../../types/db';
import { formatInt } from '../../lib/format';

const BOX_W = 210;
const ROW_H = 18;
const HEAD_H = 40;

/** Layout positions in a 1000 x 560 canvas. */
const POS: Record<TableName, { x: number; y: number }> = {
  Accounts: { x: 20, y: 200 },
  Customers: { x: 330, y: 20 },
  Transactions: { x: 330, y: 360 },
  Anomaly_Patterns: { x: 770, y: 20 },
  Dispute_Logs: { x: 770, y: 210 },
  Audit_Trail: { x: 770, y: 400 },
};

/** Only key columns are drawn in the box; the full list opens on click. */
function keyCols(t: TableName) {
  return SCHEMA[t].filter((c) => c.key);
}
function boxH(t: TableName) {
  return HEAD_H + keyCols(t).length * ROW_H + 10;
}
function colY(t: TableName, col: string) {
  const i = keyCols(t).findIndex((c) => c.name === col);
  return POS[t].y + HEAD_H + i * ROW_H + ROW_H / 2 + 2;
}

export function ERDiagram({ counts }: { counts?: Partial<Record<TableName, number>> }) {
  const [hover, setHover] = useState<TableName | null>(null);
  const [open, setOpen] = useState<TableName | null>(null);
  const focus = hover ?? open;
  const linked = new Set<TableName>();
  if (focus) {
    linked.add(focus);
    for (const r of RELATIONS) {
      if (r.from === focus) linked.add(r.to);
      if (r.to === focus) linked.add(r.from);
    }
  }

  const edgePath = (r: (typeof RELATIONS)[number], i: number) => {
    const a = POS[r.from];
    const b = POS[r.to];
    const y1 = colY(r.from, r.column);
    const y2 = colY(r.to, r.toColumn);
    // Leave from the side facing the target.
    const fromRight = a.x + BOX_W / 2 < b.x + BOX_W / 2;
    const x1 = fromRight ? a.x + BOX_W : a.x;
    const x2 = fromRight ? b.x : b.x + BOX_W;
    const bend = (x1 + x2) / 2 + (i % 3) * 8 - 8;
    return `M ${x1} ${y1} H ${bend} V ${y2} H ${x2}`;
  };

  return (
    <div className="er">
      <div className="er-canvas">
        <svg viewBox="0 0 1000 560" role="group" aria-label="Entity relationship diagram of the six tables">
          {RELATIONS.map((r, i) => {
            const on = focus ? r.from === focus || r.to === focus : false;
            return (
              <path
                key={`${r.from}.${r.column}`}
                d={edgePath(r, i)}
                fill="none"
                stroke={on ? 'var(--brand-bright)' : 'var(--line)'}
                strokeWidth={on ? 2 : 1.4}
                strokeDasharray={r.onDelete === 'SET NULL' ? '4 4' : undefined}
                style={{ transition: 'stroke .15s' }}
              />
            );
          })}
          <desc id="er-hint">Press Enter to list the columns of the focused table.</desc>
          {TABLE_NAMES.map((t) => {
            const p = POS[t];
            const dim = focus && !linked.has(t);
            const active = focus === t;
            return (
              <g
                key={t}
                transform={`translate(${p.x} ${p.y})`}
                opacity={dim ? 0.35 : 1}
                style={{ transition: 'opacity .15s', cursor: 'pointer' }}
                onMouseEnter={() => setHover(t)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(t)}
                onBlur={() => setHover(null)}
                onClick={() => setOpen((o) => (o === t ? null : t))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setOpen((o) => (o === t ? null : t));
                  }
                }}
                tabIndex={0}
                role="button"
                aria-pressed={open === t}
                aria-describedby="er-hint"
              >
                <g>
                <rect width={BOX_W} height={boxH(t)} rx={6} fill="var(--graphite)" stroke={active ? 'var(--brand-bright)' : 'var(--line)'} strokeWidth={active ? 2 : 1} />
                <rect width={BOX_W} height={HEAD_H - 8} rx={6} fill={active ? 'var(--brand-panel)' : 'var(--ink)'} />
                <rect y={HEAD_H - 14} width={BOX_W} height={6} fill={active ? 'var(--brand-panel)' : 'var(--ink)'} />
                <text x={12} y={21} fontFamily="var(--font-mono)" fontSize={13} fill="var(--white)">
                  {t}
                </text>
                <text x={BOX_W - 12} y={21} textAnchor="end" fontFamily="var(--font-mono)" fontSize={11} fill="var(--muted)">
                  {counts?.[t] != null ? `${formatInt(counts[t]!)} rows` : ''}
                </text>
                {keyCols(t).map((c, i) => (
                  <g key={c.name} transform={`translate(0 ${HEAD_H + i * ROW_H})`}>
                    <rect x={12} y={5} width={6} height={6} fill={c.key === 'PK' ? 'var(--brand-bright)' : c.key === 'FK' ? 'var(--paper)' : 'var(--muted)'} />
                    <text x={26} y={13} fontFamily="var(--font-mono)" fontSize={11} fill="var(--paper)">
                      {c.name}
                    </text>
                    <text x={BOX_W - 12} y={13} textAnchor="end" fontFamily="var(--font-mono)" fontSize={10} fill="var(--muted)">
                      {c.key}
                    </text>
                  </g>
                ))}
                </g>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="er-legend">
        <span>
          <span className="legend-sq" style={{ background: 'var(--brand-bright)' }} aria-hidden="true" /> Primary key
        </span>
        <span>
          <span className="legend-sq" style={{ background: 'var(--paper)' }} aria-hidden="true" /> Foreign key
        </span>
        <span>
          <span className="legend-sq" style={{ background: 'var(--muted)' }} aria-hidden="true" /> Unique
        </span>
        <span>Solid line: ON DELETE CASCADE or restrict. Dashed: ON DELETE SET NULL.</span>
      </div>
      {open && (
        <div className="er-panel" role="region" aria-label={`${open} columns`}>
          <div className="er-panel-head">
            <h3 className="mono">{open}</h3>
            <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setOpen(null)} aria-label="Close column list">
              <X size={14} aria-hidden="true" />
            </button>
          </div>
          <table className="data">
            <thead>
              <tr>
                <th>Column</th>
                <th>Type</th>
                <th>Key</th>
                <th>References</th>
              </tr>
            </thead>
            <tbody>
              {SCHEMA[open].map((c) => (
                <tr key={c.name}>
                  <td className="mono">
                    {c.name}
                    {c.nullable ? <span className="muted"> NULL</span> : null}
                  </td>
                  <td className="mono muted">{c.type}</td>
                  <td>
                    {c.key === 'PK' ? (
                      <span className="chip">
                        <KeyRound size={12} aria-hidden="true" /> PK
                      </span>
                    ) : c.key === 'FK' ? (
                      <span className="chip">
                        <Link2 size={12} aria-hidden="true" /> FK
                      </span>
                    ) : c.key === 'UQ' ? (
                      <span className="chip">Unique</span>
                    ) : (
                      <span className="muted">-</span>
                    )}
                  </td>
                  <td className="mono">
                    {c.references ? (
                      <>
                        {c.references.table}.{c.references.column}
                        {c.references.onDelete && <span className="muted"> ON DELETE {c.references.onDelete}</span>}
                      </>
                    ) : (
                      <span className="muted">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
