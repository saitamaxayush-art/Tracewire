import { getDisputeExample } from '../../api/selectors';
import { useAsync } from '../../lib/hooks';
import { formatMoney } from '../../lib/format';
import { formatNaive } from '../../lib/datetime';
import type { DisputeLog } from '../../types/db';
import { MONO, SANS, SceneEmpty, SceneLoading, SceneSvg, easeOut, loopFade, seg, typed, useSceneClock, wrap } from './clock';

const D = 9000;

/** Index of the furthest step for a dispute_status on the four-step track. */
export function stepIndex(status: DisputeLog['dispute_status']) {
  return status === 'Open' ? 0 : status === 'Under Investigation' ? 1 : status === 'Escalated' ? 2 : 3;
}

export function stepLabels(status: DisputeLog['dispute_status']) {
  return ['Open', 'Under Investigation', 'Escalated', status === 'Rejected' ? 'Rejected' : 'Resolved'];
}

function Field({ y, label, value, h = 22, w = 340, x = 10, active, lines }: { y: number; label: string; value: string; h?: number; w?: number; x?: number; active: boolean; lines?: string[] }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <text y={0} fontSize={7.5} fill="var(--muted)" fontFamily={MONO}>
        {label}
      </text>
      <rect y={4} width={w} height={h} rx={4} fill="var(--ink)" stroke={active ? 'var(--brand-bright)' : 'var(--line)'} strokeWidth={active ? 1.5 : 1} />
      {(lines ?? [value]).map((l, i) => (
        <text key={i} x={8} y={19 + i * 12} fontSize={9} fill="var(--paper)" fontFamily={label === 'dispute_reason' || label === 'dispute_type' ? SANS : MONO}>
          {l}
        </text>
      ))}
    </g>
  );
}

function Frame({ d, t, still }: { d: DisputeLog; t: number; still: boolean }) {
  const fade = still ? 1 : loopFade(t, D);
  const reached = stepIndex(d.dispute_status);
  const labels = stepLabels(d.dispute_status);
  const reason = wrap(typed(d.dispute_reason, t, 1800, 3800), 58, 2);
  const amount = t >= 3900 ? formatMoney(d.dispute_amount, d.currency).replace(`${d.currency} `, '') : '';
  const press = seg(t, 4600, 4750) - seg(t, 4750, 4900);
  const stepsStart = 5000;
  const doneAt = stepsStart + reached * 600 + 400;
  const closed = d.dispute_status === 'Resolved' || d.dispute_status === 'Rejected';

  return (
    <g opacity={fade}>
      <text x={14} y={24} fontSize={8.5} fill="var(--muted)" fontFamily={MONO}>
        FILE DISPUTE · Dispute_Logs #{d.dispute_id}
      </text>
      <Field y={44} label="transaction_ref" value={typed(d.transaction_ref, t, 400, 1100)} active={t > 400 && t < 1150} />
      <Field y={84} label="dispute_type" value={t >= 1300 ? d.dispute_type : ''} active={t > 1200 && t < 1750} />
      <Field y={124} label="dispute_reason" value="" h={34} lines={reason} active={t > 1800 && t < 3850} />
      <Field y={176} label="dispute_amount" value={amount} w={240} active={t > 3900 && t < 4300} />
      <Field y={176} x={260} label="currency" value={t >= 4300 ? d.currency : ''} w={90} active={t > 4300 && t < 4550} />

      <g transform={`translate(10 214) translate(48 11) scale(${1 - press * 0.06}) translate(-48 -11)`}>
        <rect width={96} height={22} rx={5} fill={t >= 4600 ? 'var(--brand-bright)' : 'none'} stroke="var(--brand-bright)" strokeWidth={1.5} />
        <text x={48} y={14.5} fontSize={9} textAnchor="middle" fill={t >= 4600 ? 'var(--ink)' : 'var(--brand-bright)'} fontFamily={SANS} fontWeight={600}>
          File dispute
        </text>
      </g>

      {/* Status stepper */}
      <g transform="translate(26 266)">
        {labels.map((l, i) => {
          const x = i * 102;
          const hit = t >= stepsStart + i * 600 && i <= reached;
          const p = i <= reached ? easeOut(seg(t, stepsStart + i * 600, stepsStart + i * 600 + 300)) : 0;
          const color = i === 3 && d.dispute_status === 'Rejected' ? 'var(--alert)' : 'var(--brand-bright)';
          return (
            <g key={l}>
              {i < 3 && <line x1={x + 12} x2={x + 102} y1={6} y2={6} stroke="var(--line)" strokeWidth={1.5} />}
              {i < 3 && i < reached && <line x1={x + 12} x2={x + 102} y1={6} y2={6} stroke="var(--brand-bright)" strokeWidth={1.5} transform={`translate(${x + 12} 0) scale(${easeOut(seg(t, stepsStart + i * 600 + 200, stepsStart + (i + 1) * 600))} 1) translate(${-(x + 12)} 0)`} />}
              <rect x={x} y={0} width={12} height={12} fill="var(--graphite)" stroke={i <= reached ? color : 'var(--muted)'} strokeWidth={1.5} />
              <rect x={x + 2.5} y={2.5} width={7} height={7} fill={color} opacity={p} />
              <text x={x + 6} y={28} fontSize={7.5} textAnchor="middle" fill={hit ? 'var(--paper)' : 'var(--muted)'} fontFamily={SANS}>
                {l === 'Under Investigation' ? 'Investigation' : l}
              </text>
            </g>
          );
        })}
      </g>
      <g opacity={seg(t, doneAt, doneAt + 400)}>
        <text x={14} y={322} fontSize={8} fill="var(--muted)" fontFamily={MONO}>
          filed_at <tspan fill="var(--paper)">{formatNaive(d.filed_at)}</tspan>
        </text>
        <text x={14} y={337} fontSize={8} fill="var(--muted)" fontFamily={MONO}>
          {closed && d.resolved_at ? (
            <>
              resolved_at <tspan fill="var(--paper)">{formatNaive(d.resolved_at)}</tspan>
            </>
          ) : (
            <>
              status <tspan fill="var(--paper)">{d.dispute_status}</tspan>, resolved_at not set
            </>
          )}
        </text>
      </g>
    </g>
  );
}

export function DisputeScene() {
  const data = useAsync(() => getDisputeExample(), []);
  const list = data.data ?? [];
  const clock = useSceneClock<SVGSVGElement>(D, list.length > 0);
  if (data.error) return <SceneEmpty text="Disputes could not be loaded." />;
  if (!data.data) return <SceneLoading />;
  if (!list.length) return <SceneEmpty text="No rows in Dispute_Logs yet." />;
  const d = list[clock.loop % list.length];
  return (
    <SceneSvg svgRef={clock.ref} label={`Dispute ${d.dispute_id} on ${d.transaction_ref}: ${d.dispute_type}, ${formatMoney(d.dispute_amount, d.currency)}, status ${d.dispute_status}.`}>
      <Frame d={d} t={clock.t} still={clock.reduced} />
    </SceneSvg>
  );
}
