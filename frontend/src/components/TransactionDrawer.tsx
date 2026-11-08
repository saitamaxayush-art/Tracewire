import { Link, useNavigate } from 'react-router-dom';
import { FilePlus2, PlayCircle } from 'lucide-react';
import { api } from '../api';
import { useAsync } from '../lib/hooks';
import { useSession } from '../lib/session';
import { label } from '../constants/enums';
import { ActionChip, DataView, DateTime, DisputeStatusChip, Drawer, Id, Money, SeverityChip, SkeletonRows, StatusChip, Dash, ResolvedChip } from './ui';
import type { Account, Customer } from '../types/db';

function Party({ title, account, customer }: { title: string; account: Account | null; customer: Customer | null }) {
  return (
    <section>
      <h3 className="section-title">
        <span className="sq" aria-hidden="true" />
        {title}
      </h3>
      {account ? (
        <dl className="kv">
          <dt>Customer</dt>
          <dd>{customer ? <Link className="row-link" to={`/customers/${customer.customer_id}`}>{customer.customer_name}</Link> : <Dash />}</dd>
          <dt>customer_id</dt>
          <dd>
            <Id>{account.customer_id}</Id>
          </dd>
          <dt>Country</dt>
          <dd>{customer?.country ?? <Dash />}</dd>
          <dt>Customer status</dt>
          <dd>{customer ? label(customer.customer_status) : <Dash />}</dd>
          <dt>account_id</dt>
          <dd>
            <Id>{account.account_id}</Id>
          </dd>
          <dt>account_number</dt>
          <dd>
            <Id>{account.account_number}</Id>
          </dd>
          <dt>Account type</dt>
          <dd>{label(account.account_type)}</dd>
          <dt>Account status</dt>
          <dd>{label(account.status)}</dd>
          <dt>Balance</dt>
          <dd>
            <Money amount={account.balance} currency={account.currency} />
          </dd>
          <dt>ifsc_code</dt>
          <dd>{account.ifsc_code ? <Id>{account.ifsc_code}</Id> : <Dash />}</dd>
        </dl>
      ) : (
        <p className="muted">Account not found.</p>
      )}
    </section>
  );
}

export function TransactionDrawer({ transactionRef, onClose }: { transactionRef: string | null; onClose: () => void }) {
  const { version } = useSession();
  const navigate = useNavigate();
  const state = useAsync(() => (transactionRef ? api.getTransaction(transactionRef) : Promise.resolve(undefined)), [transactionRef, version]);
  const open = Boolean(transactionRef);
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={<span className="mono">{transactionRef}</span>}
      subtitle="Transactions row with sender, receiver, alerts, disputes and audit entries"
      footer={
        transactionRef && (
          <>
            <Link to={`/replay/${transactionRef}`} className="btn btn-brand">
              <PlayCircle size={16} aria-hidden="true" /> Replay case
            </Link>
            <button
              type="button"
              className="btn btn-white"
              onClick={() => {
                const d = state.data;
                const p = new URLSearchParams({ new: transactionRef });
                if (d?.sender_customer) p.set('customer', d.sender_customer.customer_id);
                navigate(`/disputes?${p.toString()}`);
              }}
            >
              <FilePlus2 size={16} aria-hidden="true" /> File dispute
            </button>
          </>
        )
      }
    >
      <DataView state={state} skeleton={<SkeletonRows rows={8} cols={2} />}>
        {(d) =>
          d ? (
            <>
              <section>
                <h3 className="section-title">
                  <span className="sq" aria-hidden="true" />
                  Transaction
                </h3>
                <dl className="kv">
                  <dt>transaction_ref</dt>
                  <dd>
                    <Id>{d.transaction.transaction_ref}</Id>
                  </dd>
                  <dt>Status</dt>
                  <dd>
                    <StatusChip status={d.transaction.status} />
                  </dd>
                  <dt>Type</dt>
                  <dd>{label(d.transaction.transaction_type)}</dd>
                  <dt>Amount</dt>
                  <dd>
                    <Money amount={d.transaction.amount} currency={d.transaction.currency} />
                  </dd>
                  <dt>created_at</dt>
                  <dd>
                    <DateTime value={d.transaction.created_at} />
                  </dd>
                  <dt>Sender location</dt>
                  <dd>{d.transaction.sender_location ?? <Dash />}</dd>
                  <dt>Coordinates</dt>
                  <dd className="mono">
                    {d.transaction.sender_latitude != null ? `${d.transaction.sender_latitude}, ${d.transaction.sender_longitude}` : <Dash />}
                  </dd>
                </dl>
              </section>
              <Party title="Sender" account={d.sender_account} customer={d.sender_customer} />
              <Party title="Receiver" account={d.receiver_account} customer={d.receiver_customer} />
              <section>
                <h3 className="section-title">
                  <span className="sq" aria-hidden="true" />
                  Alerts ({d.anomalies.length})
                </h3>
                {d.anomalies.length === 0 && <p className="muted">No Anomaly_Patterns rows for this transaction.</p>}
                {d.anomalies.map((a) => (
                  <Link key={a.anomaly_id} to={`/alerts?open=${a.anomaly_id}`} className="mini-row">
                    <span className="mono">{a.rule_code}</span>
                    <span className="mini-chips">
                      <SeverityChip level={a.severity_level} />
                      <ActionChip action={a.action_taken} />
                      <ResolvedChip resolved={a.is_resolved} />
                    </span>
                  </Link>
                ))}
              </section>
              <section>
                <h3 className="section-title">
                  <span className="sq" aria-hidden="true" />
                  Disputes ({d.disputes.length})
                </h3>
                {d.disputes.length === 0 && <p className="muted">No Dispute_Logs rows for this transaction.</p>}
                {d.disputes.map((x) => (
                  <Link key={x.dispute_id} to={`/disputes?open=${x.dispute_id}`} className="mini-row">
                    <span>
                      <span className="mono muted">#{x.dispute_id}</span> {x.dispute_type}
                    </span>
                    <DisputeStatusChip status={x.dispute_status} />
                  </Link>
                ))}
              </section>
              <section>
                <h3 className="section-title">
                  <span className="sq" aria-hidden="true" />
                  Audit entries ({d.audit.length})
                </h3>
                {d.audit.length === 0 && <p className="muted">No Audit_Trail rows for this transaction.</p>}
                <ol className="mini-timeline">
                  {d.audit.map((a) => (
                    <li key={a.audit_id}>
                      <DateTime value={a.action_timestamp} />
                      <span>
                        <strong>{a.action_type}</strong> <span className="muted">by {a.performed_by}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          ) : null
        }
      </DataView>
    </Drawer>
  );
}
