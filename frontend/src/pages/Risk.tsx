import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { api } from '../api';
import { useAsync, useQueryState } from '../lib/hooks';
import { useSession } from '../lib/session';
import { ACTION_TOKEN, DISPUTE_STATUS_TOKEN, SEVERITY_TOKEN, STATUS_TOKEN, label, type ActionTaken, type DisputeStatus, type SeverityLevel, type TransactionStatus } from '../constants/enums';
import { DataView, SkeletonBlock } from '../components/ui';
import { Donut, type Slice } from '../components/charts/Donut';
import type { StatsSummary } from '../api/types';
import { formatInt, formatPercent } from '../lib/format';

type Dim = 'severity_level' | 'action_taken' | 'status' | 'dispute_status';

const DIMS: { key: Dim; label: string; table: string; noun: string }[] = [
  { key: 'severity_level', label: 'Severity level', table: 'Anomaly_Patterns', noun: 'alerts' },
  { key: 'action_taken', label: 'Action taken', table: 'Anomaly_Patterns', noun: 'alerts' },
  { key: 'status', label: 'Transaction status', table: 'Transactions', noun: 'transactions' },
  { key: 'dispute_status', label: 'Dispute status', table: 'Dispute_Logs', noun: 'disputes' },
];

const DESCRIPTIONS: Record<string, string> = {
  Negligible: 'Within the customer baseline. Allowed and closed by the rule engine.',
  Low: 'Small deviation, usually cleared after a quick check.',
  Medium: 'Needs a step-up check such as 2FA before release.',
  High: 'Held for manual review by compliance or an analyst.',
  Critical: 'Blocked or queued for investigation; customer contact likely.',
  Catastrophic: 'Hard block. Account state or amount rules out release.',
  Allow: 'Transaction released with no further action.',
  Flag_For_Review: 'Sent to the analyst queue for a decision.',
  Require_2FA: 'Customer asked to confirm with a second factor.',
  Block_Temporary: 'Held until verification or screening completes.',
  Block_Permanent: 'Refused outright and not released.',
  Success: 'Settled normally.',
  Pending: 'Not yet settled.',
  Failed: 'Did not complete.',
  Flagged: 'Raised for review by a rule.',
  Blocked: 'Stopped before settlement.',
  Reversed: 'Settled and later reversed.',
  Open: 'Filed and waiting to be picked up.',
  'Under Investigation': 'An analyst is working the case.',
  Escalated: 'Moved up for a senior or compliance decision.',
  Resolved: 'Closed in favour of a decision; resolved_at is set.',
  Rejected: 'Closed without upholding the claim; resolved_at is set.',
};

function slicesFor(dim: Dim, s: StatsSummary): { slices: Slice[]; total: number; link: (k: string) => string } {
  switch (dim) {
    case 'severity_level':
      return {
        slices: s.anomalies.by_severity.map((r) => ({ key: r.key, label: r.key, count: r.count, color: SEVERITY_TOKEN[r.key as SeverityLevel], ring: r.key === 'Catastrophic' })),
        total: s.anomalies.total,
        link: (k) => `/alerts?severity_level=${k}`,
      };
    case 'action_taken':
      return {
        slices: s.anomalies.by_action.map((r) => ({ key: r.key, label: label(r.key), count: r.count, color: ACTION_TOKEN[r.key as ActionTaken], ring: r.key === 'Block_Permanent' })),
        total: s.anomalies.total,
        link: (k) => `/alerts?action_taken=${k}`,
      };
    case 'status':
      return {
        slices: s.transactions.by_status.map((r) => ({ key: r.key, label: r.key, count: r.count, color: STATUS_TOKEN[r.key as TransactionStatus] })),
        total: s.transactions.total,
        link: (k) => `/transactions?status=${k}`,
      };
    case 'dispute_status':
      return {
        slices: s.disputes.by_status.map((r) => ({ key: r.key, label: r.key, count: r.count, color: DISPUTE_STATUS_TOKEN[r.key as DisputeStatus] })),
        total: s.disputes.total,
        link: (k) => `/disputes?dispute_status=${encodeURIComponent(k)}`,
      };
  }
}

export default function Risk() {
  const { values: f, set } = useQueryState({ dim: 'severity_level' });
  const { version } = useSession();
  const state = useAsync(() => api.getSummary(), [version]);
  const dim = (DIMS.find((d) => d.key === f.dim) ?? DIMS[0]).key;
  const meta = DIMS.find((d) => d.key === dim)!;

  return (
    <div className="risk-page">
      <section className="risk-hero dot-grid">
        <div className="wrap">
          <span className="eyebrow">
            <span className="sq" aria-hidden="true" />
            Risk breakdown
          </span>
          <h1>Where the risk sits</h1>
          <p>Shares of alerts, transactions and disputes by severity, action and status, calculated from the current rows of Anomaly_Patterns, Transactions and Dispute_Logs.</p>
        </div>
      </section>
      <section className="risk-body on-light">
        <div className="wrap">
          <div className="risk-switch" role="radiogroup" aria-label="Dimension">
            {DIMS.map((d) => (
              <button key={d.key} type="button" role="radio" aria-checked={dim === d.key} className={`seg${dim === d.key ? ' on' : ''}`} onClick={() => set({ dim: d.key })}>
                {d.label}
                <span className="seg-sub mono">{d.table}</span>
              </button>
            ))}
          </div>
          <DataView
            state={state}
            skeleton={
              <div className="risk-grid">
                <SkeletonBlock height={420} />
                <SkeletonBlock height={420} />
              </div>
            }
          >
            {(s) => {
              const { slices, total, link } = slicesFor(dim, s);
              return (
                <div className="risk-grid">
                  <ul className="risk-list">
                    {slices.map((sl) => (
                      <li key={sl.key}>
                        <span className="risk-bullet" style={{ background: sl.color, boxShadow: sl.ring ? '0 0 0 1px var(--ink)' : undefined }} aria-hidden="true" />
                        <div>
                          <h2>{sl.label}</h2>
                          <p className="risk-status mono">
                            {formatInt(sl.count)} of {formatInt(total)} {meta.noun}, {formatPercent(sl.count, total)}
                          </p>
                          <p className="risk-desc">{DESCRIPTIONS[sl.key] ?? ''}</p>
                        </div>
                        <Link to={link(sl.key)} className="btn btn-black btn-sm btn-icon" aria-label={`Open ${sl.label} ${meta.noun}`}>
                          <ArrowRight size={15} aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <div className="risk-card">
                    <div className="risk-card-head">
                      <span className="mono">{meta.table}</span>
                      <span>{meta.label}</span>
                    </div>
                    {total === 0 ? <p className="muted">No rows.</p> : <Donut slices={slices} title={`${meta.label} share of ${meta.noun}`} centerLabel={`${meta.noun} in ${meta.table}`} />}
                  </div>
                </div>
              );
            }}
          </DataView>
        </div>
      </section>
    </div>
  );
}
