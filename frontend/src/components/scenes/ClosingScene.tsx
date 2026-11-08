import { getRecentTransfers } from '../../api/selectors';
import { useAsync } from '../../lib/hooks';
import { formatMoney } from '../../lib/format';
import { MONO, SceneEmpty, SceneLoading, SceneSvg, easeInOut, lerp, seg, useSceneClock } from './clock';

const D = 9000;
const WIRE_Y = 186;

/** Quiet loop: three real transfers travel along one wire into a single ledger stack. */
export function ClosingScene() {
  const data = useAsync(() => getRecentTransfers(3), []);
  const list = data.data ?? [];
  const clock = useSceneClock<SVGSVGElement>(D, list.length > 0);
  if (data.error) return <SceneEmpty text="Transactions could not be loaded." />;
  if (!data.data) return <SceneLoading />;
  if (!list.length) return <SceneEmpty text="No transactions yet." />;
  const t = clock.t;
  const arrivals = list.map((_, i) => 3000 * i + 2600);

  return (
    <SceneSvg svgRef={clock.ref} label={`The latest transfers ${list.map((x) => x.transaction_ref).join(', ')} flowing into the ledger.`}>
      <g opacity={0.75}>
        <line x1={16} y1={WIRE_Y} x2={256} y2={WIRE_Y} stroke="var(--line)" strokeWidth={1.5} />
        {/* Ledger stack */}
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={262} y={WIRE_Y + 18 - i * 11} width={84} height={8} rx={2} fill="none" stroke={i === 4 ? 'var(--muted)' : 'var(--line)'} strokeWidth={1.5} />
        ))}
        <text x={304} y={WIRE_Y + 44} fontSize={8} textAnchor="middle" fill="var(--muted)" fontFamily={MONO}>
          Ledger
        </text>
        <rect x={262} y={WIRE_Y - 26} width={84} height={8} rx={2} fill="var(--brand-panel)" opacity={clock.reduced ? 0 : 0.5 * (1 - seg(t % 3000, 2600, 3000)) * (t % 3000 > 2600 ? 1 : 0)} />
        {list.map((x, i) => {
          const start = 3000 * i;
          const local = clock.reduced ? 1 : seg(t, start, arrivals[i]);
          const gone = clock.reduced ? 1 : seg(t, arrivals[i], arrivals[i] + 400);
          const cx = lerp(-100, 160, easeInOut(local));
          const show = clock.reduced ? 0 : local > 0 ? (1 - gone) * 0.9 : 0;
          return (
            <g key={x.transaction_ref} transform={`translate(${cx + 60 * gone} ${WIRE_Y - 46})`} opacity={show}>
              <rect width={96} height={34} rx={4} fill="var(--ink)" stroke="var(--muted)" strokeWidth={1.5} />
              <text x={8} y={14} fontSize={7.5} fill="var(--muted)" fontFamily={MONO}>
                {x.transaction_ref}
              </text>
              <text x={8} y={27} fontSize={8.5} fill="var(--paper)" fontFamily={MONO}>
                {formatMoney(x.amount, x.currency, { compact: true })}
              </text>
              <line x1={48} x2={48} y1={34} y2={46} stroke="var(--line)" strokeDasharray="2 3" />
            </g>
          );
        })}
        {clock.reduced &&
          list.map((x, i) => (
            <text key={x.transaction_ref} x={20} y={86 + i * 16} fontSize={8.5} fill="var(--muted)" fontFamily={MONO}>
              {x.transaction_ref} · {formatMoney(x.amount, x.currency)}
            </text>
          ))}
        <text x={16} y={WIRE_Y + 44} fontSize={8} fill="var(--muted)" fontFamily={MONO}>
          Latest {list.length} rows from Transactions
        </text>
      </g>
    </SceneSvg>
  );
}
