import { RISK_BANDS, SEVERITY_TOKEN, type SeverityLevel } from '../../constants/enums';
import { formatScore } from '../../lib/format';

/** Half-circle gauge from 0 to 100, banded by the severity ramp. */
export function RiskGauge({ score, severity, caption }: { score: number | null; severity?: SeverityLevel | null; caption?: string }) {
  const cx = 150;
  const cy = 150;
  const R = 118;
  const W = 22;
  const ang = (v: number) => Math.PI + (v / 100) * Math.PI;
  const pt = (v: number, rr: number) => [cx + Math.cos(ang(v)) * rr, cy + Math.sin(ang(v)) * rr];
  const band = (from: number, to: number) => {
    const [x0, y0] = pt(from, R);
    const [x1, y1] = pt(to, R);
    const [x2, y2] = pt(to, R - W);
    const [x3, y3] = pt(from, R - W);
    return `M ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1} L ${x2} ${y2} A ${R - W} ${R - W} 0 0 0 ${x3} ${y3} Z`;
  };
  const v = score == null ? 0 : Math.max(0, Math.min(100, score));
  const [nx, ny] = pt(v, R + 6);
  const bandNow = RISK_BANDS.find((b) => v >= b.from && v <= b.to)?.level;
  const level = severity ?? bandNow;
  return (
    <figure className="gauge">
      <svg viewBox="0 0 300 180" role="img" aria-label={score == null ? 'Risk score not recorded' : `Risk score ${formatScore(score)} out of 100, ${level}`}>
        {RISK_BANDS.map((b) => (
          <path
            key={b.level}
            d={band(b.from, b.to)}
            fill={SEVERITY_TOKEN[b.level]}
            opacity={score == null || b.level === bandNow ? 1 : 0.32}
            stroke={b.level === 'Catastrophic' ? 'var(--white)' : 'var(--ink)'}
            strokeWidth={b.level === 'Catastrophic' ? 1 : 1.5}
          />
        ))}
        {[0, 20, 40, 60, 80, 100].map((t) => {
          const [x, y] = pt(t, R - W - 12);
          return (
            <text key={t} x={x} y={y + 4} fontSize="9.5" fill="var(--muted)" textAnchor="middle" fontFamily="var(--font-mono)">
              {t}
            </text>
          );
        })}
        {score != null && (
          <g style={{ transition: 'transform .5s' }}>
            <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="var(--white)" strokeWidth={2.5} strokeLinecap="square" />
            <rect x={cx - 6} y={cy - 6} width={12} height={12} fill="var(--white)" />
          </g>
        )}
      </svg>
      <figcaption>
        <span className="gauge-value mono">{score == null ? '-' : formatScore(score)}</span>
        <span className="gauge-label">{caption ?? (level ? `Band: ${level}` : 'No risk score at this step')}</span>
      </figcaption>
    </figure>
  );
}
