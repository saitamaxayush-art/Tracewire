import { getAuditChainExample, type AuditChainExample } from '../../api/selectors';
import { useAsync } from '../../lib/hooks';
import { STATUS_TOKEN } from '../../constants/enums';
import { formatMoney, formatScore } from '../../lib/format';
import { formatNaive } from '../../lib/datetime';
import { MONO, SANS, SceneEmpty, SceneLoading, SceneSvg, SvgChip, clip, easeOut, lerp, loopFade, seg, useSceneClock } from './clock';

const D = 9000;
const TOP = 112;
const ROW = 27;
const COLS = [30, 116, 236, 346];

function Frame({ ex, t, still }: { ex: AuditChainExample; t: number; still: boolean }) {
  const fade = still ? 1 : loopFade(t, D);
  const tx = ex.transaction;
  const n = ex.rows.length;
  const step = (7000 - 1000) / Math.max(1, n);
  const card = easeOut(seg(t, 200, 700));
  const lastY = TOP + 22 + (n - 1) * ROW + 10;
  const spine = n ? seg(t, 1000, 1000 + n * step) : 0;

  return (
    <g opacity={fade}>
      {/* Transaction card */}
      <g opacity={card} transform={`translate(0 ${lerp(-8, 0, card)})`}>
        <rect x={10} y={14} width={340} height={60} rx={6} fill="var(--ink)" stroke="var(--brand-bright)" strokeWidth={1.5} />
        <text x={20} y={32} fontSize={7.5} fill="var(--muted)" fontFamily={MONO}>
          AUDIT CHAIN · {n} rows in time order
        </text>
        <text x={20} y={50} fontSize={10.5} fill="var(--white)" fontFamily={MONO}>
          {tx.transaction_ref}
        </text>
        <text x={20} y={65} fontSize={9} fill="var(--paper)" fontFamily={MONO}>
          {formatMoney(tx.amount, tx.currency)}
        </text>
        <SvgChip x={262} y={40} color={STATUS_TOKEN[tx.status]} text={tx.status} size={8.5} />
      </g>

      {/* Ledger header */}
      <g opacity={seg(t, 600, 1000)} fontFamily={MONO} fontSize={7.5} fill="var(--muted)">
        <text x={COLS[0]} y={TOP - 6}>action_timestamp</text>
        <text x={COLS[1]} y={TOP - 6}>action_type</text>
        <text x={COLS[2]} y={TOP - 6}>performed_by</text>
        <text x={COLS[3]} y={TOP - 6} textAnchor="end">risk_score</text>
        <line x1={10} x2={350} y1={TOP} y2={TOP} stroke="var(--line)" />
      </g>

      {/* Spine linking rows back to the card */}
      <line x1={18} y1={74} x2={18} y2={lastY} stroke="var(--brand-bright)" strokeWidth={1.5} transform={`translate(0 74) scale(1 ${spine.toFixed(4)}) translate(0 -74)`} />

      {ex.rows.map((r, i) => {
        const at = 1000 + i * step;
        const p = easeOut(seg(t, at, at + 350));
        const flash = still ? 0 : seg(t, at, at + 150) - seg(t, at + 450, at + 900);
        const y = TOP + 8 + i * ROW;
        return (
          <g key={r.key} opacity={p} transform={`translate(${lerp(10, 0, p)} 0)`}>
            <rect x={24} y={y} width={326} height={ROW - 4} rx={3} fill="var(--brand-panel)" opacity={0.55 * Math.max(0, flash)} />
            <line x1={18} x2={26} y1={y + 12} y2={y + 12} stroke="var(--brand-bright)" strokeWidth={1.5} />
            <text x={COLS[0]} y={y + 10} fontSize={7.5} fill="var(--paper)" fontFamily={MONO}>
              {formatNaive(r.action_timestamp, { seconds: false })}
            </text>
            <text x={COLS[0]} y={y + 20} fontSize={6.5} fill="var(--muted)" fontFamily={MONO}>
              {r.source}
            </text>
            <text x={COLS[1]} y={y + 15} fontSize={8.5} fill="var(--white)" fontFamily={SANS}>
              {clip(r.action_type, 23)}
            </text>
            <text x={COLS[2]} y={y + 15} fontSize={7.5} fill="var(--paper)" fontFamily={MONO}>
              {r.performed_by ? clip(r.performed_by, 16) : '-'}
            </text>
            <text x={COLS[3]} y={y + 15} fontSize={8.5} textAnchor="end" fill="var(--white)" fontFamily={MONO}>
              {r.risk_score == null ? '-' : formatScore(r.risk_score)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function AuditScene() {
  const data = useAsync(() => getAuditChainExample(), []);
  const list = data.data ?? [];
  const clock = useSceneClock<SVGSVGElement>(D, list.length > 0);
  if (data.error) return <SceneEmpty text="Audit entries could not be loaded." />;
  if (!data.data) return <SceneLoading />;
  if (!list.length || !list[0].rows.length) return <SceneEmpty text="No Audit_Trail rows yet." />;
  const ex = list[clock.loop % list.length];
  return (
    <SceneSvg svgRef={clock.ref} label={`Audit chain for ${ex.transaction.transaction_ref}: ${ex.rows.map((r) => r.action_type).join(', ')}.`}>
      <Frame ex={ex} t={clock.t} still={clock.reduced} />
    </SceneSvg>
  );
}
