// Small looping animations for the Analysts and Disputes team cards on the home page.
// Thin strokes in brand bright and muted grey, real rows only.

import { getAlertFeedGroups, getDisputeExample } from '../../api/selectors';
import { useAsync } from '../../lib/hooks';
import { label } from '../../constants/enums';
import { MONO, SANS, SceneSvg, clip, easeInOut, easeOut, lerp, seg, severityColor, useSceneClock } from './clock';
import { stepIndex, stepLabels } from './DisputeScene';

const FEED_D = 8000;

export function AlertFeedAnimation() {
  const data = useAsync(() => getAlertFeedGroups(), []);
  const groups = data.data ?? [];
  const clock = useSceneClock<SVGSVGElement>(FEED_D, groups.length > 0);
  if (!groups.length) return <div className="card-anim-empty" aria-hidden="true" />;
  const rows = groups[clock.loop % groups.length];
  const t = clock.t;
  const still = clock.reduced;
  const scroll = still ? 0 : easeInOut(seg(t, 7000, 7700));
  const scan = seg(t, 1800, 4200);

  return (
    <SceneSvg svgRef={clock.ref} viewBox="0 0 260 200" className="card-anim" label={`Alert feed: ${rows.map((r) => `${r.severity_level} ${r.transaction_ref}`).join(', ')}.`}>
      <g transform={`translate(0 ${-30 * scroll})`} opacity={1 - scroll}>
        {rows.map((a, i) => {
          const p = easeOut(seg(t, i * 380, i * 380 + 420));
          const y = 10 + i * 46;
          const cat = a.severity_level === 'Catastrophic';
          const pulse = cat ? (still ? 1 : seg(t, 3000, 3350) - 0.6 * seg(t, 3350, 4000)) : 0;
          const tag = cat ? (still ? 1 : easeOut(seg(t, 3600, 4000))) : 0;
          const tagText = a.action_taken.startsWith('Block') ? 'Blocked' : label(a.action_taken);
          return (
            <g key={a.anomaly_id} transform={`translate(0 ${lerp(-14, 0, p)})`} opacity={p}>
              <rect x={4} y={y} width={252} height={36} rx={5} fill="none" stroke="var(--line)" strokeWidth={1.5} />
              <rect x={4} y={y} width={252} height={36} rx={5} fill="none" stroke="var(--alert)" strokeWidth={1.5} opacity={pulse} />
              <rect x={14} y={y + 8} width={8} height={8} fill={severityColor(a.severity_level)} stroke={cat ? 'var(--white)' : 'none'} strokeWidth={1} />
              <text x={28} y={y + 15.5} fontSize={9} fill="var(--paper)" fontFamily={SANS}>
                {a.severity_level}
              </text>
              <text x={14} y={y + 29} fontSize={9} fill="var(--muted)" fontFamily={MONO}>
                {a.transaction_ref}
              </text>
              {cat && (
                <g opacity={tag} transform={`translate(${lerp(12, 0, tag)} 0)`}>
                  <rect x={194} y={y + 9} width={52} height={18} rx={3} fill="none" stroke="var(--alert)" strokeWidth={1.5} />
                  <text x={220} y={y + 21.5} fontSize={8.5} textAnchor="middle" fill="var(--paper)" fontFamily={SANS}>
                    {tagText}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </g>
      {!still && <line x1={4} x2={256} y1={0} y2={0} stroke="var(--brand-bright)" strokeWidth={1.5} transform={`translate(0 ${lerp(6, 194, scan)})`} opacity={scan > 0 && scan < 1 ? 0.9 : 0} />}
    </SceneSvg>
  );
}

const TRACK_D = 6000;
const NODE_X = [18, 92, 166, 240];

export function DisputeTrackAnimation() {
  const data = useAsync(() => getDisputeExample(8), []);
  const list = data.data ?? [];
  const clock = useSceneClock<SVGSVGElement>(TRACK_D, list.length > 0);
  if (!list.length) return <div className="card-anim-empty" aria-hidden="true" />;
  const d = list[clock.loop % list.length];
  const t = clock.t;
  const still = clock.reduced;
  const target = stepIndex(d.dispute_status);
  const labels = stepLabels(d.dispute_status);
  const travel = still ? 1 : easeInOut(seg(t, 900, 900 + Math.max(1, target) * 650));
  const mx = lerp(NODE_X[0], NODE_X[target], travel);
  const closed = d.dispute_status === 'Resolved' || d.dispute_status === 'Rejected';
  const tick = closed ? (still ? 1 : easeOut(seg(t, 900 + target * 650 + 200, 900 + target * 650 + 600))) : 0;
  const fade = still ? 1 : Math.min(seg(t, 0, 400), 1 - seg(t, TRACK_D - 400, TRACK_D));

  return (
    <SceneSvg svgRef={clock.ref} viewBox="0 0 260 200" className="card-anim" label={`Dispute ${d.dispute_id} on ${d.transaction_ref}, ${d.dispute_type}, status ${d.dispute_status}.`}>
      <g opacity={fade}>
        <rect x={6} y={14} width={248} height={70} rx={6} fill="none" stroke="var(--muted)" strokeWidth={1.5} />
        <text x={18} y={34} fontSize={8.5} fill="var(--muted)" fontFamily={MONO}>
          Dispute #{d.dispute_id}
        </text>
        <text x={18} y={53} fontSize={10.5} fill="var(--paper)" fontFamily={MONO}>
          {d.transaction_ref}
        </text>
        <text x={18} y={71} fontSize={9} fill="var(--paper)" fontFamily={SANS}>
          {clip(d.dispute_type, 26)}
        </text>
        <g transform="translate(226 40)" opacity={tick}>
          <path d="M-9 0 L-3 6 L9 -7" fill="none" stroke="var(--brand-bright)" strokeWidth={2} strokeLinecap="square" transform={`scale(${lerp(0.6, 1, tick)})`} />
        </g>

        <line x1={NODE_X[0]} x2={NODE_X[3]} y1={128} y2={128} stroke="var(--line)" strokeWidth={1.5} />
        <line x1={NODE_X[0]} x2={NODE_X[3]} y1={128} y2={128} stroke="var(--brand-bright)" strokeWidth={1.5} transform={`translate(${NODE_X[0]} 0) scale(${(((mx - NODE_X[0]) / (NODE_X[3] - NODE_X[0])) || 0).toFixed(4)} 1) translate(${-NODE_X[0]} 0)`} />
        {NODE_X.map((x, i) => (
          <g key={i}>
            <rect x={x - 5} y={123} width={10} height={10} fill="var(--graphite)" stroke={i <= target && travel * Math.max(1, target) >= i - 0.01 ? 'var(--brand-bright)' : 'var(--muted)'} strokeWidth={1.5} />
            <text x={x} y={152} fontSize={8} textAnchor="middle" fill={i === target ? 'var(--paper)' : 'var(--muted)'} fontFamily={SANS}>
              {labels[i] === 'Under Investigation' ? 'Investigating' : labels[i]}
            </text>
          </g>
        ))}
        <rect x={-4} y={124} width={8} height={8} fill="var(--brand-bright)" transform={`translate(${mx} 0)`} />
        <text x={6} y={186} fontSize={8.5} fill="var(--muted)" fontFamily={MONO}>
          dispute_status <tspan fill="var(--paper)">{d.dispute_status}</tspan>
        </text>
      </g>
    </SceneSvg>
  );
}
