import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, PlayCircle } from 'lucide-react';
import { api } from '../api';
import { logReveal } from '../api/actions';
import { useAsync } from '../lib/hooks';
import { useSession } from '../lib/session';
import { label } from '../constants/enums';
import { ActionChip, Chip, DataView, DateTime, DisputeStatusChip, EmptyState, Id, Money, ResolvedChip, SeverityChip, SkeletonRows, StatusChip, Dash } from '../components/ui';
import { maskEmail, maskPhone } from '../lib/format';
import { customerStatusColor } from './Customers';
import NotFound from './NotFound';
import { ApiError } from '../api/types';

function Masked({ value, masked, onReveal, field }: { value: string; masked: string; onReveal: () => Promise<void>; field: string }) {
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <span className="masked">
      <span className="mono" aria-live="polite">
        {shown ? value : masked}
      </span>
      {!shown && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onReveal();
              setShown(true);
            } finally {
              setBusy(false);
            }
          }}
          aria-label={`Reveal ${field}. This writes an Audit_Trail entry.`}
        >
          <Eye size={14} aria-hidden="true" /> {busy ? 'Logging...' : 'Reveal'}
        </button>
      )}
    </span>
  );
}

export default function CustomerDetail() {
  const { customer_id = '' } = useParams();
  const { version, analyst, toast, bump } = useSession();
  const state = useAsync(() => api.getCustomer(customer_id), [customer_id, version]);

  if (state.error instanceof ApiError && state.error.code === 'NOT_FOUND') return <NotFound what={`Customer ${customer_id}`} />;

  return (
    <div className="app-page wrap">
      <Link to="/customers" className="back-link">
        <ArrowLeft size={14} aria-hidden="true" /> All customers
      </Link>
      <DataView state={state} skeleton={<SkeletonRows rows={10} cols={3} />}>
        {(p) => {
          const c = p.customer;
          const reveal = (field: 'email' | 'phone_number') => async () => {
            try {
              await logReveal(c, field, analyst);
              bump();
              toast(`Revealed ${field === 'email' ? 'email' : 'phone'}. Logged to Audit_Trail as ${analyst}.`);
            } catch (e) {
              toast(`Reveal not logged: ${(e as Error).message}`, 'error');
              throw e;
            }
          };
          return (
            <>
              <header className="page-head">
                <div>
                  <span className="eyebrow">
                    <span className="sq" aria-hidden="true" />
                    Customer 360
                  </span>
                  <h1>{c.customer_name}</h1>
                  <p className="page-sub">
                    <Id>{c.customer_id}</Id> · {c.country} · {c.nationality} · registered <DateTime value={c.registration_date} />
                  </p>
                </div>
                <Chip color={customerStatusColor(c.customer_status)} text={label(c.customer_status)} />
              </header>

              <div className="grid-360">
                <section className="card card-pad">
                  <h2 className="section-title">
                    <span className="sq" aria-hidden="true" />
                    Contact
                  </h2>
                  <dl className="kv">
                    <dt>Email</dt>
                    <dd>
                      <Masked value={c.email} masked={maskEmail(c.email)} onReveal={reveal('email')} field="email address" />
                    </dd>
                    <dt>Phone</dt>
                    <dd>
                      <Masked value={c.phone_number} masked={maskPhone(c.phone_number)} onReveal={reveal('phone_number')} field="phone number" />
                    </dd>
                    <dt>Preferred currency</dt>
                    <dd className="mono">{c.preferred_currency}</dd>
                  </dl>
                  <p className="field-hint" style={{ marginTop: 12 }}>
                    Reveal shows the value for this page view only and writes a PII Revealed row to Audit_Trail.
                  </p>
                </section>

                <section className="card card-pad">
                  <h2 className="section-title">
                    <span className="sq" aria-hidden="true" />
                    Accounts ({p.accounts.length})
                  </h2>
                  {p.accounts.length === 0 && <p className="muted">No Accounts rows.</p>}
                  {p.accounts.map((a) => (
                    <dl className="kv" key={a.account_id} style={{ marginBottom: 12 }}>
                      <dt>account_number</dt>
                      <dd>
                        <Id>{a.account_number}</Id>
                      </dd>
                      <dt>Type</dt>
                      <dd>{label(a.account_type)}</dd>
                      <dt>Status</dt>
                      <dd>
                        <Chip color={customerStatusColor(a.status)} text={label(a.status)} />
                      </dd>
                      <dt>Balance</dt>
                      <dd>
                        <Money amount={a.balance} currency={a.currency} />
                      </dd>
                      <dt>ifsc_code</dt>
                      <dd>{a.ifsc_code ? <Id>{a.ifsc_code}</Id> : <Dash />}</dd>
                    </dl>
                  ))}
                </section>
              </div>

              <section className="card" style={{ marginTop: 16 }}>
                <div className="card-head">
                  <h2>Transactions ({p.transactions.length})</h2>
                </div>
                {p.transactions.length === 0 ? (
                  <EmptyState title="No transactions" />
                ) : (
                  <div className="table-wrap">
                    <table className="data">
                      <caption className="sr-only">Transactions for {c.customer_name}</caption>
                      <thead>
                        <tr>
                          <th>Ref</th>
                          <th>Direction</th>
                          <th>created_at</th>
                          <th>Status</th>
                          <th className="r">Amount</th>
                          <th className="r">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.transactions.map((t) => {
                          const sent = p.accounts.some((a) => a.account_id === t.sender_account_id);
                          return (
                            <tr key={t.transaction_ref}>
                              <td>
                                <Link className="row-link mono" to={`/transactions?open=${t.transaction_ref}`}>
                                  {t.transaction_ref}
                                </Link>
                              </td>
                              <td>{sent ? 'Sent' : 'Received'}</td>
                              <td>
                                <DateTime value={t.created_at} />
                              </td>
                              <td>
                                <StatusChip status={t.status} />
                              </td>
                              <td className="r">
                                <Money amount={t.amount} currency={t.currency} />
                              </td>
                              <td className="r">
                                <Link to={`/replay/${t.transaction_ref}`} className="btn btn-ghost btn-sm" aria-label={`Replay case ${t.transaction_ref}`}>
                                  <PlayCircle size={14} aria-hidden="true" /> Replay
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <div className="grid-360" style={{ marginTop: 16 }}>
                <section className="card">
                  <div className="card-head">
                    <h2>Alerts ({p.anomalies.length})</h2>
                  </div>
                  <div style={{ padding: '8px 12px' }}>
                    {p.anomalies.length === 0 && <p className="muted" style={{ padding: 8 }}>No Anomaly_Patterns rows.</p>}
                    {p.anomalies.map((a) => (
                      <Link key={a.anomaly_id} to={`/alerts?open=${a.anomaly_id}`} className="mini-row">
                        <span>
                          <span className="mono">{a.rule_code}</span>
                          <span className="cell-sub">
                            <DateTime value={a.detected_at} />
                          </span>
                        </span>
                        <span className="mini-chips">
                          <SeverityChip level={a.severity_level} />
                          <ActionChip action={a.action_taken} />
                          <ResolvedChip resolved={a.is_resolved} />
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
                <section className="card">
                  <div className="card-head">
                    <h2>Disputes ({p.disputes.length})</h2>
                    <Link to={`/disputes?new=${p.transactions[0]?.transaction_ref ?? ''}&customer=${c.customer_id}`} className="btn btn-ghost btn-sm">
                      File dispute
                    </Link>
                  </div>
                  <div style={{ padding: '8px 12px' }}>
                    {p.disputes.length === 0 && <p className="muted" style={{ padding: 8 }}>No Dispute_Logs rows.</p>}
                    {p.disputes.map((x) => (
                      <Link key={x.dispute_id} to={`/disputes?open=${x.dispute_id}`} className="mini-row">
                        <span>
                          <span className="mono muted">#{x.dispute_id}</span> {x.dispute_type}
                          <span className="cell-sub">
                            <DateTime value={x.filed_at} />
                          </span>
                        </span>
                        <span className="mini-chips">
                          <Money amount={x.dispute_amount} currency={x.currency} />
                          <DisputeStatusChip status={x.dispute_status} />
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              </div>
            </>
          );
        }}
      </DataView>
    </div>
  );
}
