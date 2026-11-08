import { getResolvedAlertExample, type ReviewExample } from '../../api/selectors';
import { useAsync } from '../../lib/hooks';
import { ACTION_TAKEN, label } from '../../constants/enums';
import { formatScore } from '../../lib/format';
import { formatNaive } from '../../lib/datetime';
import type { AnomalyPattern } from '../../types/db';
import { MONO, SANS, SceneEmpty, SceneLoading, SceneSvg, SvgChip, easeInOut, easeOut, lerp, loopFade, seg, severityColor, typed, useSceneClock, wrap } from './clock';

const D = 9000;
const ROW_H = 40;
const ROW_GAP = 44;
const Q_TOP = 40;
const RESOLVED_Y = 290;

function Row({ a, y, highlight, opacity, x = 0, sub }: { a: AnomalyPattern; y: number; highlight: boolean; opacity: number; x?: number; sub?: string }) {
  return (
    <g transform={`translate(${10 + x} ${y})`} opacity={opacity}>
      <rect width={166} height={ROW_H} rx={5} fill="var(--ink)" stroke={highlight ? 'var(--brand-bright)' : 'var(--line)'} strokeWidth={highlight ? 1.5 : 1} />
      <text x={8} y={15} fontSize={8.5} fill="var(--paper)" fontFamily={MONO}>
        {a.transaction_ref}
      </text>
      <text x={158} y={15} fontSize={8.5} textAnchor="end" fill="var(--white)" fontFamily={MONO}>
        {formatScore(a.risk_score)}
      </text>
      <SvgChip x={8} y={20} color={severityColor(a.severity_level)} text={a.severity_level} ring={a.severity_level === 'Catastrophic'} size={7.5} />
      {sub && (
        <text x={158} y={33} fontSize={7.5} textAnchor="end" fill="var(--muted)" fontFamily={MONO}>
          {sub}
        </text>
      )}
    </g>
  );
}

function Frame({ ex, t, still }: { ex: ReviewExample; t: number; still: boolean }) {
  const { target, others } = ex;
  const fade = still ? 1 : loopFade(t, D);
  const move = easeInOut(seg(t, 7500, 8200));
  const cursor = easeOut(seg(t, 1500, 2300));
  const selected = t >= 2300;
  const panel = easeOut(seg(t, 2300, 2700));
  const reasonLines = wrap(target.flag_reason, 32, 3);
  const notesLines = wrap(typed(target.resolution_notes ?? '', t, 5400, 7000), 32, 3);
  const actionP = seg(t, 4000, 5400);
  const action = actionP < 1 && actionP > 0 ? label(ACTION_TAKEN[Math.floor(actionP * ACTION_TAKEN.length * 2) % ACTION_TAKEN.length]) : label(target.action_taken);
  const stamp = easeOut(seg(t, 7000, 7400));
  const rowIn = (i: number) => easeOut(seg(t, 200 + i * 180, 600 + i * 180));

  return (
    <g opacity={fade}>
      <text x={14} y={24} fontSize={8.5} fill="var(--muted)" fontFamily={MONO}>
        ALERT QUEUE · replay of anomaly {target.anomaly_id}
      </text>

      {/* Queue: the target row first, then four unresolved rows that shift up once it leaves */}
      <Row
        a={target}
        y={lerp(Q_TOP, RESOLVED_Y, move)}
        x={lerp(-12, 0, rowIn(0))}
        opacity={rowIn(0)}
        highlight={selected}
        sub={move >= 1 ? formatNaive(target.resolved_at, { seconds: false }) : undefined}
      />
      {others.map((a, i) => (
        <Row key={`${a.anomaly_id}-${i}`} a={a} y={Q_TOP + (i + 1) * ROW_GAP - move * ROW_GAP} x={lerp(-12, 0, rowIn(i + 1))} opacity={rowIn(i + 1)} highlight={false} />
      ))}
      <g opacity={seg(t, 7300, 7700)}>
        <line x1={10} x2={176} y1={RESOLVED_Y - 12} y2={RESOLVED_Y - 12} stroke="var(--line)" />
        <text x={10} y={RESOLVED_Y - 17} fontSize={8} fill="var(--st-success)" fontFamily={MONO}>
          RESOLVED
        </text>
      </g>

      {/* Cursor marker */}
      <g transform={`translate(${lerp(120, 168, cursor)} ${lerp(320, Q_TOP + 8, cursor)})`} opacity={seg(t, 1400, 1600) * (1 - seg(t, 7400, 7600))}>
        <path d="M0 0 L0 12 L3.5 9 L6 14 L8 13 L5.5 8 L10 8 Z" fill="var(--white)" stroke="var(--ink)" strokeWidth={1} />
      </g>

      {/* Detail panel */}
      <g transform={`translate(${lerp(198, 186, panel)} 40)`} opacity={panel}>
        <rect width={164} height={290} rx={6} fill="var(--ink)" stroke="var(--line)" />
        <text x={10} y={18} fontSize={9} fill="var(--paper)" fontFamily={MONO}>
          {target.rule_code}
        </text>
        <g opacity={seg(t, 2700, 3100)}>
          <text x={10} y={38} fontSize={7.5} fill="var(--muted)" fontFamily={MONO}>
            flag_reason
          </text>
          {reasonLines.map((l, i) => (
            <text key={i} x={10} y={51 + i * 11} fontSize={8.5} fill="var(--paper)" fontFamily={SANS}>
              {l}
            </text>
          ))}
        </g>
        <g opacity={seg(t, 3300, 3700)}>
          <text x={10} y={96} fontSize={7.5} fill="var(--muted)" fontFamily={MONO}>
            reviewed_by
          </text>
          <text x={10} y={109} fontSize={8.5} fill="var(--paper)" fontFamily={MONO}>
            {target.reviewed_by}
          </text>
        </g>
        <g opacity={seg(t, 3700, 4000)}>
          <text x={10} y={130} fontSize={7.5} fill="var(--muted)" fontFamily={MONO}>
            action_taken
          </text>
          <rect x={10} y={135} width={144} height={20} rx={4} fill="var(--graphite)" stroke={actionP >= 1 ? 'var(--brand-bright)' : 'var(--line)'} />
          <text x={18} y={148} fontSize={8.5} fill="var(--paper)" fontFamily={SANS}>
            {action}
          </text>
          <path d="M142 143 l4 4 l4 -4" fill="none" stroke="var(--muted)" strokeWidth={1.2} />
        </g>
        <g opacity={seg(t, 5300, 5500)}>
          <text x={10} y={176} fontSize={7.5} fill="var(--muted)" fontFamily={MONO}>
            resolution_notes
          </text>
          {notesLines.map((l, i) => (
            <text key={i} x={10} y={189 + i * 11} fontSize={8.5} fill="var(--paper)" fontFamily={SANS}>
              {l}
            </text>
          ))}
        </g>
        <g transform={`translate(82 252) rotate(-6) scale(${lerp(1.4, 1, stamp)})`} opacity={stamp}>
          <rect x={-46} y={-13} width={92} height={26} rx={3} fill="none" stroke="var(--st-success)" strokeWidth={2} />
          <text y={4.5} fontSize={12} textAnchor="middle" fill="var(--st-success)" fontFamily={MONO} letterSpacing="0.08em">
            RESOLVED
          </text>
        </g>
      </g>
    </g>
  );
}

export function ReviewScene() {
  const data = useAsync(() => getResolvedAlertExample(), []);
  const list = data.data ?? [];
  const clock = useSceneClock<SVGSVGElement>(D, list.length > 0);
  if (data.error) return <SceneEmpty text="Alerts could not be loaded." />;
  if (!data.data) return <SceneLoading />;
  if (!list.length) return <SceneEmpty text="No reviewed and resolved alert in Anomaly_Patterns yet." />;
  const ex = list[clock.loop % list.length];
  return (
    <SceneSvg svgRef={clock.ref} label={`Alert ${ex.target.rule_code} on ${ex.target.transaction_ref} reviewed by ${ex.target.reviewed_by} and resolved: ${ex.target.resolution_notes}`}>
      <Frame ex={ex} t={clock.t} still={clock.reduced} />
    </SceneSvg>
  );
}
