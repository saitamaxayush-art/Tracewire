import { useEffect } from 'react';
import type { AnomalyPattern } from '../../types/db';
import { getCleanExample, getFlaggedExample, type TransferExample } from '../../api/selectors';
import { useAsync } from '../../lib/hooks';
import { RISK_BANDS, SEVERITY_TOKEN, STATUS_TOKEN, label } from '../../constants/enums';
import { formatMoney, formatScore } from '../../lib/format';
import { MONO, SANS, SceneEmpty, SceneLoading, SceneSvg, SvgChip, clip, easeInOut, easeOut, lerp, loopFade, seg, severityColor, useSceneClock } from './clock';

export type DetectCycle = 'clean' | 'flagged';
const D = 9000;
const CARD_W = 150;
const CARD_H = 84;

function bandColor(score: number) {
  const b = RISK_BANDS.find((x) => score >= x.from && score <= x.to) ?? RISK_BANDS[RISK_BANDS.length - 1];
  return SEVERITY_TOKEN[b.level];
}

/** Fields of an Anomaly_Patterns row the frame draws. A clean transfer can pass a display-only stand-in. */
export type FrameAnomaly = Pick<AnomalyPattern, 'risk_score' | 'rule_code' | 'flag_reason' | 'flagged_amount' | 'currency' | 'severity_level' | 'action_taken'>;
export interface FrameExample {
  detail: TransferExample['detail'];
  anomaly: FrameAnomaly;
}

/** Duration of one pass of the frame, used by the home loop and by the one-shot playback. */
export const DETECT_DURATION = D;

export function DetectFrame({ ex, cycle, t, still, note = 'Transfer stopped before reaching the receiver.' }: { ex: FrameExample; cycle: DetectCycle; t: number; still: boolean; note?: string }) {
  const { detail, anomaly } = ex;
  const tx = detail.transaction;
  const flagged = cycle === 'flagged';
  const fade = still ? 1 : loopFade(t, D);

  // Card position: slide to the rule check, then on to the receiver only if clean.
  const arrive = easeOut(seg(t, 400, 2600));
  const onward = flagged ? 0 : easeInOut(seg(t, 4600, 6600));
  let cx = lerp(-90, 180, arrive);
  cx = lerp(cx, 266, onward);
  const shake = flagged ? Math.sin(seg(t, 5000, 5500) * Math.PI * 6) * 4 * (1 - seg(t, 5000, 5500)) : 0;
  const decided = flagged ? t >= 5000 : t >= 4200;
  const status = decided ? tx.status : 'Pending';
  const statusColor = decided ? STATUS_TOKEN[tx.status] : STATUS_TOKEN.Pending;
  const border = decided ? (flagged ? 'var(--alert)' : 'var(--st-success)') : 'var(--line)';

  const meterP = flagged ? easeOut(seg(t, 3000, 5000)) : easeOut(seg(t, 2600, 4200));
  const score = anomaly.risk_score * meterP;
  const receiverLit = !flagged && t >= 6400;
  const panel = flagged ? easeOut(seg(t, 5800, 6600)) : 0;
  const ruleLines = flagged
    ? [
        ['rule_code', anomaly.rule_code],
        ['flag_reason', clip(anomaly.flag_reason, 40)],
        ['flagged_amount', formatMoney(anomaly.flagged_amount, anomaly.currency)],
      ]
    : [
        ['rule_code', anomaly.rule_code],
        ['severity_level', anomaly.severity_level],
        ['action_taken', label(anomaly.action_taken)],
      ];
  const lineStart = flagged ? 2600 : 4200;

  const sender = detail.sender_account;
  const receiver = detail.receiver_account;

  return (
    <g opacity={fade}>
      <text x={14} y={24} fontSize={8.5} fill="var(--muted)" fontFamily={MONO}>
        {flagged ? 'FLAGGED TRANSFER' : 'CLEAN TRANSFER'} · Transactions + Anomaly_Patterns
      </text>

      {/* Wire */}
      <line x1={76} y1={172} x2={173} y2={172} stroke="var(--muted)" strokeWidth={1.5} />
      <line x1={187} y1={172} x2={284} y2={172} stroke="var(--muted)" strokeWidth={1.5} strokeDasharray={flagged && decided ? '3 4' : undefined} opacity={flagged && decided ? 0.4 : 1} />

      {/* Sender and receiver nodes */}
      <g>
        <rect x={14} y={150} width={62} height={44} rx={4} fill="var(--ink)" stroke="var(--muted)" strokeWidth={1.5} />
        <text x={22} y={166} fontSize={8} fill="var(--muted)" fontFamily={SANS}>
          Sender
        </text>
        <text x={22} y={182} fontSize={9.5} fill="var(--paper)" fontFamily={MONO}>
          {sender ? `••${sender.account_number.slice(-4)}` : '-'}
        </text>
      </g>
      <g opacity={flagged ? 0.3 : 1}>
        <rect x={284} y={150} width={62} height={44} rx={4} fill="var(--ink)" stroke={receiverLit ? 'var(--brand-bright)' : 'var(--muted)'} strokeWidth={1.5} />
        <text x={292} y={166} fontSize={8} fill="var(--muted)" fontFamily={SANS}>
          Receiver
        </text>
        <text x={292} y={182} fontSize={9.5} fill="var(--paper)" fontFamily={MONO}>
          {receiver ? `••${receiver.account_number.slice(-4)}` : '-'}
        </text>
      </g>

      {/* Rule check */}
      <text x={193} y={160} fontSize={8.5} fill="var(--paper)" fontFamily={SANS}>
        Rule check
      </text>
      <rect x={173} y={148} width={14} height={48} rx={2} fill="var(--ink)" stroke={flagged && decided ? 'var(--alert)' : 'var(--brand-bright)'} strokeWidth={1.5} />

      {/* Transaction card */}
      <g transform={`translate(${cx - CARD_W / 2 + shake} 40)`}>
        <line x1={CARD_W / 2} y1={CARD_H} x2={CARD_W / 2} y2={132} stroke="var(--muted)" strokeDasharray="2 3" />
        <rect x={CARD_W / 2 - 3} y={129} width={6} height={6} fill={decided && flagged ? 'var(--alert)' : 'var(--brand-bright)'} />
        <rect width={CARD_W} height={CARD_H} rx={6} fill="var(--ink)" stroke={border} strokeWidth={decided && flagged ? 2 : 1.5} />
        <text x={10} y={17} fontSize={9.5} fill="var(--paper)" fontFamily={MONO}>
          {tx.transaction_ref}
        </text>
        <text x={10} y={37} fontSize={12} fill="var(--white)" fontFamily={MONO}>
          {formatMoney(tx.amount, tx.currency)}
        </text>
        <text x={10} y={51} fontSize={8.5} fill="var(--muted)" fontFamily={SANS}>
          {clip(tx.sender_location ?? 'Location not recorded', 28)}
        </text>
        <SvgChip x={10} y={58} color={statusColor} text={status} size={8.5} />
      </g>

      {/* Risk meter */}
      <text x={14} y={212} fontSize={8.5} fill="var(--muted)" fontFamily={MONO}>
        risk_score
      </text>
      <text x={346} y={212} fontSize={11} textAnchor="end" fill="var(--white)" fontFamily={MONO}>
        {formatScore(score)}
      </text>
      <g transform="translate(14 218)">
        {RISK_BANDS.map((b) => (
          <rect key={b.level} x={(b.from / 100) * 332} width={((b.to - b.from) / 100) * 332} height={8} fill={SEVERITY_TOKEN[b.level]} opacity={0.18} />
        ))}
        <rect width={332} height={8} fill={bandColor(anomaly.risk_score)} transform={`scale(${(score / 100).toFixed(4)} 1)`} />
        <rect width={332} height={8} fill="none" stroke="var(--line)" />
      </g>

      {/* Rule lines */}
      {ruleLines.map(([k, v], i) => {
        const p = easeOut(seg(t, lineStart + i * 600, lineStart + i * 600 + 400));
        return (
          <g key={k} opacity={p} transform={`translate(${lerp(-8, 0, p)} 0)`}>
            <rect x={14} y={244 + i * 15} width={5} height={5} fill={flagged ? 'var(--alert)' : 'var(--brand-bright)'} />
            <text x={26} y={250 + i * 15} fontSize={8.5} fill="var(--muted)" fontFamily={MONO}>
              {k}
            </text>
            <text x={112} y={250 + i * 15} fontSize={8.5} fill="var(--paper)" fontFamily={k === 'flag_reason' ? SANS : MONO}>
              {v}
            </text>
          </g>
        );
      })}

      {/* Alert panel */}
      {flagged && (
        <g transform={`translate(10 ${lerp(372, 290, panel)})`} opacity={panel}>
          <rect width={340} height={62} rx={6} fill="var(--ink)" stroke="var(--alert)" strokeWidth={1.5} />
          <SvgChip x={10} y={9} color={severityColor(anomaly.severity_level)} text={anomaly.severity_level} ring={anomaly.severity_level === 'Catastrophic'} size={8.5} />
          <text x={104} y={22} fontSize={9} fill="var(--paper)" fontFamily={MONO}>
            {clip(anomaly.rule_code, 20)}
          </text>
          <text x={330} y={22} fontSize={9} textAnchor="end" fill="var(--white)" fontFamily={MONO}>
            {formatScore(anomaly.risk_score)}
          </text>
          <text x={10} y={40} fontSize={8.5} fill="var(--muted)" fontFamily={SANS}>
            Action taken: <tspan fill="var(--paper)">{label(anomaly.action_taken)}</tspan>
          </text>
          <text x={10} y={54} fontSize={8.5} fill="var(--paper)" fontFamily={SANS}>
            {note}
          </text>
        </g>
      )}
    </g>
  );
}

export function DetectScene({ onCycle }: { onCycle?: (c: DetectCycle) => void }) {
  const data = useAsync(() => Promise.all([getCleanExample(), getFlaggedExample()]), []);
  const clean = data.data?.[0] ?? [];
  const flagged = data.data?.[1] ?? [];
  const ready = clean.length > 0 && flagged.length > 0;
  const clock = useSceneClock<SVGSVGElement>(D, ready);
  // Alternate clean and flagged loops. Reduced motion shows the flagged final frame.
  const cycle: DetectCycle = clock.reduced ? 'flagged' : clock.loop % 2 === 0 ? 'clean' : 'flagged';
  const round = Math.floor(clock.loop / 2);

  useEffect(() => {
    if (ready) onCycle?.(cycle);
  }, [cycle, ready, onCycle]);

  if (data.error) return <SceneEmpty text="Transactions could not be loaded." />;
  if (!data.data) return <SceneLoading />;
  if (!ready) return <SceneEmpty text="No clean and flagged transaction pair in the data yet." />;
  const ex = cycle === 'clean' ? clean[round % clean.length] : flagged[round % flagged.length];

  return (
    <SceneSvg
      svgRef={clock.ref}
      label={`Transaction ${ex.detail.transaction.transaction_ref} passes the rule check with risk score ${formatScore(ex.anomaly.risk_score)} and ends ${ex.detail.transaction.status}.`}
    >
      <DetectFrame ex={ex} cycle={cycle} t={clock.t} still={clock.reduced} />
    </SceneSvg>
  );
}
