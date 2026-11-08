import { Link } from 'react-router-dom';
import { ArrowRight, PlayCircle, X } from 'lucide-react';
import { api } from '../api';
import { useAsync, useQueryState } from '../lib/hooks';
import { useSession } from '../lib/session';
import { SEVERITY_TOKEN, STATUS_TOKEN, SEVERITY_LEVEL, ACTION_TOKEN, label, type SeverityLevel, type TransactionStatus, type ActionTaken } from '../constants/enums';
import { ActionChip, DataView, DateTime, EmptyState, Money, PageHead, Select, SeverityChip, SkeletonBlock, SkeletonRows, StatusChip } from '../components/ui';
import { formatInt, formatMoney, formatPercent, formatScore } from '../lib/format';
import type { CountRow } from '../api/types';

const DEFAULTS = { from: '', to: '', currency: '' };

function Meters<K extends string>({ rows, color, total, link }: { rows: CountRow<K>[]; color: (k: K) => string; total: number; link: (k: K) => string }) {
  return (
    <div>
      {rows.map((r) => (
        <Link key={r.key} to={link(r.key)} className="meter-row meter-link">
          <span className="meter-label">
            <span className="dot-sq" style={{ background: color(r.key) }} aria-hidden="true" />
            {label(r.key)}
          </span>
          <span className="meter" aria-hidden="true">
            <span style={{ width: `${total ? (r.count / total) * 100 : 0}%`, background: color(r.key) }} />
          </span>
          <span className="mono num r" aria-label={`${r.count} of ${total}`}>
            {r.count}
          </span>
        </Link>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { values: f, set, clear, active } = useQueryState(DEFAULTS);
  const { version } = useSession();
  const summary = useAsync(() => api.getSummary(f), [f.from, f.to, f.currency, version]);
  const currencies = useAsync(() => api.getSummary().then((s) => s.currencies), [version]);
  const latest = useAsync(() => api.listTransactions({ ...f, sort: '-created_at', page_size: 10 }), [f.from, f.to, f.currency, version]);
  const unresolved = useAsync(
    () => api.listAnomalies({ is_resolved: 'false', sort: '-risk_score', page_size: 200, from: f.from, to: f.to, currency: f.currency }).then((r) => r.data),
    [f.from, f.to, f.currency, version],
  );
  const qs = (extra: Record<string, string>) => new URLSearchParams(Object.fromEntries(Object.entries({ ...f, ...extra }).filter(([, v]) => v))).toString();

  return (
    <div className="app-page wrap">
      <PageHead eyebrow="Dashboard" title="Dashboard" sub="Counts and amounts computed from the six tables at load time. Amounts are grouped by currency and never added across currencies." />
      <div className="card">
        <form className="filters" aria-label="Dashboard filters" onSubmit={(e) => e.preventDefault()}>
          <label className="field">
            <span>From date</span>
            <input className="input mono" type="date" value={f.from} onChange={(e) => set({ from: e.target.value })} />
          </label>
          <label className="field">
            <span>To date</span>
            <input className="input mono" type="date" value={f.to} onChange={(e) => set({ to: e.target.value })} />
          </label>
          <label className="field">
            <span>Currency</span>
            <Select value={f.currency} onChange={(e) => set({ currency: e.target.value })} options={(currencies.data ?? []).map((c) => ({ value: c, label: c }))} placeholder="All currencies" />
          </label>
        </form>
        <div className="filter-bar-foot">
          <span>Date filters apply to created_at, detected_at and filed_at as stored.</span>
          {active > 0 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>
              <X size={14} aria-hidden="true" /> Clear {active} filter{active > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      <DataView
        state={summary}
        skeleton={
          <div className="kpis">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBlock key={i} height={128} />
            ))}
          </div>
        }
      >
        {(s) => {
          const by = (k: TransactionStatus) => s.transactions.by_status.find((x) => x.key === k)?.count ?? 0;
          const kpis = [
            { label: 'Transactions', value: formatInt(s.transactions.total), note: `${s.transactions.amount_by_currency.length} currencies`, to: `/transactions?${qs({})}` },
            { label: 'Flagged', value: formatInt(by('Flagged')), note: formatPercent(by('Flagged'), s.transactions.total, 0) + ' of transactions', to: `/transactions?${qs({ status: 'Flagged' })}` },
            { label: 'Blocked', value: formatInt(by('Blocked')), note: formatPercent(by('Blocked'), s.transactions.total, 0) + ' of transactions', to: `/transactions?${qs({ status: 'Blocked' })}` },
            { label: 'Open alerts', value: formatInt(s.anomalies.open), note: `of ${formatInt(s.anomalies.total)} in Anomaly_Patterns`, to: '/alerts?is_resolved=false' },
            { label: 'Open disputes', value: formatInt(s.disputes.open), note: `of ${formatInt(s.disputes.total)} in Dispute_Logs`, to: '/disputes' },
            { label: 'Average risk score', value: s.anomalies.average_risk_score == null ? '-' : formatScore(s.anomalies.average_risk_score), note: 'across matching alerts', to: '/risk' },
          ];
          return (
            <>
              <div className="kpis">
                {kpis.map((k, i) => (
                  <Link key={k.label} to={k.to} className={`kpi kpi-${i === 0 ? 'brand' : 'plain'}`}>
                    <span className="kpi-label">{k.label}</span>
                    <span className="kpi-value mono">{k.value}</span>
                    <span className="kpi-note">{k.note}</span>
                  </Link>
                ))}
              </div>

              <div className="dash-grid">
                <section className="card card-pad">
                  <h2 className="section-title">
                    <span className="sq" aria-hidden="true" />
                    Transaction status
                  </h2>
                  {s.transactions.total === 0 ? (
                    <p className="muted">No transactions in this range.</p>
                  ) : (
                    <Meters rows={s.transactions.by_status} total={s.transactions.total} color={(k) => STATUS_TOKEN[k]} link={(k) => `/transactions?${qs({ status: k })}`} />
                  )}
                </section>
                <section className="card card-pad">
                  <h2 className="section-title">
                    <span className="sq" aria-hidden="true" />
                    Alert severity
                  </h2>
                  {s.anomalies.total === 0 ? (
                    <p className="muted">No alerts in this range.</p>
                  ) : (
                    <Meters rows={s.anomalies.by_severity} total={s.anomalies.total} color={(k: SeverityLevel) => SEVERITY_TOKEN[k]} link={(k) => `/alerts?severity_level=${k}`} />
                  )}
                </section>
                <section className="card card-pad">
                  <h2 className="section-title">
                    <span className="sq" aria-hidden="true" />
                    Action taken
                  </h2>
                  {s.anomalies.total === 0 ? (
                    <p className="muted">No alerts in this range.</p>
                  ) : (
                    <Meters rows={s.anomalies.by_action} total={s.anomalies.total} color={(k: ActionTaken) => ACTION_TOKEN[k]} link={(k) => `/alerts?action_taken=${k}`} />
                  )}
                </section>
                <section className="card card-pad">
                  <h2 className="section-title">
                    <span className="sq" aria-hidden="true" />
                    Amounts by currency
                  </h2>
                  {s.transactions.amount_by_currency.length === 0 ? (
                    <p className="muted">No amounts in this range.</p>
                  ) : (
                    <table className="data compact">
                      <caption className="sr-only">Transaction amounts by currency</caption>
                      <thead>
                        <tr>
                          <th>Currency</th>
                          <th className="r">Rows</th>
                          <th className="r">Total</th>
                          <th className="r">Blocked</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.transactions.amount_by_currency.map((c) => {
                          const b = s.transactions.blocked_amount_by_currency.find((x) => x.currency === c.currency);
                          return (
                            <tr key={c.currency}>
                              <td className="mono">{c.currency}</td>
                              <td className="r mono num">{c.count}</td>
                              <td className="r mono num">{formatMoney(c.total, c.currency, { compact: true })}</td>
                              <td className="r mono num">{b ? formatMoney(b.total, b.currency, { compact: true }) : '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </section>
              </div>
            </>
          );
        }}
      </DataView>

      <div className="dash-grid dash-grid-2">
        <section className="card">
          <div className="card-head">
            <h2>Latest 10 transactions</h2>
            <Link to={`/transactions?${qs({})}`} className="btn btn-ghost btn-sm">
              All transactions <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <DataView state={latest} isEmpty={(d) => d.total === 0} skeleton={<SkeletonRows rows={10} cols={4} />} empty={<EmptyState title="No transactions in this range" />}>
            {(d) => (
              <div className="table-wrap">
                <table className="data">
                  <caption className="sr-only">Latest transactions</caption>
                  <thead>
                    <tr>
                      <th>Ref</th>
                      <th>created_at</th>
                      <th>Status</th>
                      <th className="r">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.data.map((t) => (
                      <tr key={t.transaction_ref}>
                        <td>
                          <Link className="row-link mono" to={`/transactions?open=${t.transaction_ref}`}>
                            {t.transaction_ref}
                          </Link>
                        </td>
                        <td>
                          <DateTime value={t.created_at} seconds={false} />
                        </td>
                        <td>
                          <StatusChip status={t.status} />
                        </td>
                        <td className="r">
                          <Money amount={t.amount} currency={t.currency} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DataView>
        </section>
        <section className="card">
          <div className="card-head">
            <h2>Unresolved alerts{unresolved.data ? ` (${unresolved.data.length})` : ''}</h2>
            <Link to="/alerts?is_resolved=false" className="btn btn-ghost btn-sm">
              Alert queue <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <DataView state={unresolved} isEmpty={(d) => d.length === 0} skeleton={<SkeletonRows rows={10} cols={3} />} empty={<EmptyState title="No unresolved alerts in this range" />}>
            {(rows) => (
              <ul className="alert-list">
                {rows.map((a) => (
                  <li key={a.anomaly_id}>
                    <Link to={`/alerts?open=${a.anomaly_id}`} className="alert-row">
                      <span className="alert-main">
                        <span className="mono">{a.rule_code}</span>
                        <span className="cell-sub">{a.flag_reason}</span>
                      </span>
                      <span className="mini-chips">
                        <SeverityChip level={a.severity_level} />
                        <ActionChip action={a.action_taken} />
                        <span className="mono num muted">{formatScore(a.risk_score)}</span>
                      </span>
                    </Link>
                    <Link to={`/replay/${a.transaction_ref}`} className="btn btn-ghost btn-sm btn-icon" aria-label={`Replay case ${a.transaction_ref}`} title="Replay case">
                      <PlayCircle size={15} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </DataView>
        </section>
      </div>
      <p className="foot-note">Severity ramp: {SEVERITY_LEVEL.join(', ')}.</p>
    </div>
  );
}
