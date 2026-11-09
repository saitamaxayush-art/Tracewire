import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Send, X } from 'lucide-react';
import { api, ApiError } from '../../api';
import { useAsync } from '../../lib/hooks';
import { useSession } from '../../lib/session';
import { alertItems, readSeen, useCustomerSession, writeSeen, type AlertItem } from '../../lib/customerSession';
import { DISPUTE_CLOSED, label } from '../../constants/enums';
import { maskAccountNumber, maskEmail } from '../../lib/format';
import { DataView, DateTime, DisputeStatusChip, EmptyState, ErrorState, Money, SeverityChip, SkeletonBlock, SkeletonRows, StatusChip } from '../../components/ui';
import type { CustomerProfile } from '../../api/types';
import type { Transaction } from '../../types/db';

/** Shared by the dashboard, the send form and the transaction page. Refetches on every store change. */
export function useCustomerProfile() {
  const { session, signOut } = useCustomerSession();
  const { version } = useSession();
  const navigate = useNavigate();
  const state = useAsync(() => api.getCustomer(session!.customer_id), [session?.customer_id, version]);
  // The signed-in customer can disappear when local changes are reset. End the session cleanly.
  useEffect(() => {
    if (state.error instanceof ApiError && state.error.code === 'NOT_FOUND') {
      signOut();
      navigate('/login', { replace: true });
    }
  }, [state.error, signOut, navigate]);
  return state;
}

export function direction(t: Transaction, p: CustomerProfile): 'Sent' | 'Received' {
  return p.accounts.some((a) => a.account_id === t.sender_account_id) ? 'Sent' : 'Received';
}

/** Live notice for the customer's own transactions that become flagged or blocked. */
function FlagNotices({ profile }: { profile: CustomerProfile }) {
  const id = profile.customer.customer_id;
  const items = useMemo(() => alertItems(profile), [profile]);
  const [seen, setSeen] = useState<Set<string>>(() => readSeen(id) ?? new Set(items.map((i) => i.key)));
  // First visit without a baseline: everything already flagged counts as seen.
  useEffect(() => {
    if (!readSeen(id)) writeSeen(id, seen);
  }, [id, seen]);
  // Keys seen in another tab count too.
  useEffect(() => {
    const s = readSeen(id);
    if (s) setSeen(s);
  }, [id, profile]);

  const fresh = items.filter((i) => !seen.has(i.key));
  const dismiss = (i: AlertItem) => {
    const next = new Set(seen).add(i.key);
    setSeen(next);
    writeSeen(id, next);
  };

  return (
    <div className="notices" aria-live="polite">
      {fresh.map((i) => (
        <div key={i.key} className={`notice notice-${i.status === 'Blocked' ? 'blocked' : 'flagged'}`} role="status">
          <SeverityChip level={i.severity_level ?? null} />
          <div className="notice-body">
            <strong>
              <span className="mono">{i.transaction_ref}</span> was {i.status === 'Blocked' ? 'blocked' : 'flagged'}
            </strong>
            {i.flag_reason && <span className="notice-reason">{i.flag_reason}</span>}
          </div>
          <Link to={`/app/transactions/${i.transaction_ref}`} className="btn btn-white btn-sm" onClick={() => dismiss(i)}>
            View details
          </Link>
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => dismiss(i)} aria-label={`Dismiss notice for ${i.transaction_ref}`}>
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function CustomerDashboard() {
  const state = useCustomerProfile();

  if (state.error && !(state.error instanceof ApiError && state.error.code === 'NOT_FOUND')) {
    return (
      <div className="app-page wrap">
        <ErrorState error={state.error} onRetry={state.reload} />
      </div>
    );
  }

  return (
    <div className="app-page wrap">
      <DataView
        state={state}
        skeleton={
          <>
            <SkeletonBlock height={160} />
            <SkeletonRows rows={8} cols={4} />
          </>
        }
      >
        {(p) => {
          const recent = p.transactions.slice(0, 8);
          const openTx = p.transactions.filter((t) => t.status === 'Flagged' || t.status === 'Pending' || t.status === 'Blocked');
          const openDisputes = p.disputes.filter((d) => !DISPUTE_CLOSED.includes(d.dispute_status));
          return (
            <>
              <header className="cust-head">
                <div className="cust-id">
                  <span className="eyebrow">
                    <span className="sq" aria-hidden="true" />
                    Customer {p.customer.customer_id}
                  </span>
                  <h1>{p.customer.customer_name}</h1>
                  <p className="muted mono">{maskEmail(p.customer.email)}</p>
                </div>
                <Link to="/app/send" className="btn btn-brand">
                  <Send size={16} aria-hidden="true" /> Send money
                </Link>
              </header>

              <FlagNotices profile={p} />

              <ul className="acct-cards" aria-label="Your accounts">
                {p.accounts.map((a) => (
                  <li key={a.account_id} className="card acct-card">
                    <span className="acct-type">{a.account_type}</span>
                    <span className="mono muted">{maskAccountNumber(a.account_number)}</span>
                    <span className="acct-bal mono">
                      <Money amount={a.balance} currency={a.currency} />
                    </span>
                    <span className="acct-status">{label(a.status)}</span>
                  </li>
                ))}
              </ul>

              <div className="dash-grid dash-grid-2">
                <section className="card">
                  <div className="card-head">
                    <h2>Recent activity</h2>
                    <span className="muted" style={{ fontSize: 13 }}>
                      Last {recent.length} of {p.transactions.length}
                    </span>
                  </div>
                  {recent.length === 0 ? (
                    <EmptyState title="No transactions yet" body="Transfers you send or receive appear here." />
                  ) : (
                    <div className="table-wrap">
                      <table className="data">
                        <caption className="sr-only">Your last {recent.length} transactions, newest first</caption>
                        <thead>
                          <tr>
                            <th>Ref</th>
                            <th>When</th>
                            <th>Status</th>
                            <th className="r">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recent.map((t) => {
                            const dir = direction(t, p);
                            return (
                              <tr key={t.transaction_ref}>
                                <td>
                                  <Link to={`/app/transactions/${t.transaction_ref}`} className="link-btn mono">
                                    {t.transaction_ref}
                                  </Link>
                                  <span className="cell-sub">
                                    {dir} · {label(t.transaction_type)}
                                  </span>
                                </td>
                                <td className="mono">
                                  <DateTime value={t.created_at} seconds={false} />
                                </td>
                                <td>
                                  <StatusChip status={t.status} />
                                </td>
                                <td className="r mono num">
                                  {dir === 'Sent' ? '-' : '+'}
                                  <Money amount={t.amount} currency={t.currency} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="card">
                  <div className="card-head">
                    <h2>Open items</h2>
                    <span className="muted" style={{ fontSize: 13 }}>
                      {openTx.length + openDisputes.length} open
                    </span>
                  </div>
                  {openTx.length + openDisputes.length === 0 ? (
                    <EmptyState title="Nothing open" body="Held transfers and open disputes appear here." />
                  ) : (
                    <ul className="open-list">
                      {openTx.map((t) => (
                        <li key={t.transaction_ref}>
                          <Link to={`/app/transactions/${t.transaction_ref}`} className="open-row">
                            <StatusChip status={t.status} />
                            <span className="mono">{t.transaction_ref}</span>
                            <span className="mono num">
                              <Money amount={t.amount} currency={t.currency} />
                            </span>
                            <ArrowRight size={14} aria-hidden="true" />
                          </Link>
                        </li>
                      ))}
                      {openDisputes.map((d) => (
                        <li key={`d${d.dispute_id}`}>
                          <Link to={`/app/transactions/${d.transaction_ref}`} className="open-row">
                            <DisputeStatusChip status={d.dispute_status} />
                            <span>
                              Dispute {d.dispute_id} <span className="mono muted">{d.transaction_ref}</span>
                            </span>
                            <span className="muted" style={{ fontSize: 12.5 }}>
                              {d.dispute_type}
                            </span>
                            <ArrowRight size={14} aria-hidden="true" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </>
          );
        }}
      </DataView>
    </div>
  );
}
