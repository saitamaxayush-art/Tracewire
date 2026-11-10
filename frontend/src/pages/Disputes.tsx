import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FilePlus2, PlayCircle, Search, X } from 'lucide-react';
import { api } from '../api';
import { changeDisputeStatus, undoDisputeStatus } from '../api/actions';
import { useAsync, useQueryState, useSyncedSearch } from '../lib/hooks';
import { useSession } from '../lib/session';
import { DISPUTE_CLOSED, DISPUTE_STATUS_FLOW, DISPUTE_TYPE, DISPUTE_STATUS, options, type DisputeStatus } from '../constants/enums';
import { Busy, ConfirmDialog, DataView, DateTime, DisputeStatusChip, Drawer, EmptyState, Id, MenuButton, Modal, Money, PageHead, Pagination, Select, SkeletonRows, SortHeader } from '../components/ui';
import { DisputeForm } from '../components/DisputeForm';
import type { DisputeQuery } from '../api/types';
import type { DisputeLog } from '../types/db';

const DEFAULTS = { search: '', dispute_type: '', dispute_status: '', sort: '-filed_at', page: '1', open: '', new: '', customer: '' };

function StatusMenu({ d, onChanged }: { d: DisputeLog; onChanged: (u: DisputeLog) => void }) {
  const { analyst, toast, bump } = useSession();
  const [busy, setBusy] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);

  const apply = async (s: DisputeStatus) => {
    const before = d;
    setBusy(true);
    try {
      const u = await changeDisputeStatus(d, s, analyst);
      onChanged(u);
      bump();
      // GOLDEN RULE 3: Offer informative feedback
      toast(`Dispute ${d.dispute_id} on ${d.transaction_ref} moved from ${before.dispute_status} to ${s}.`, 'ok', {
        // GOLDEN RULE 6: Permit easy reversal of actions
        action: {
          label: 'Undo',
          run: async () => {
            try {
              const r = await undoDisputeStatus(before, s, analyst);
              onChanged(r);
              bump();
              toast(`Undone: dispute ${before.dispute_id} is back to ${before.dispute_status}. Reversal logged to Audit_Trail.`);
            } catch (e) {
              toast(`Undo failed: ${(e as Error).message}`, 'error');
            }
          },
        },
      });
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <MenuButton
        label={
          <Busy busy={busy} label="Changing status...">
            Change status
          </Busy>
        }
        disabled={busy}
        align="right"
        items={DISPUTE_STATUS_FLOW.map((s) => ({
          key: s,
          current: s === d.dispute_status,
          disabled: s === d.dispute_status,
          label: (
            <>
              <DisputeStatusChip status={s} />
              <span className="muted" style={{ fontSize: 12, marginLeft: 'auto' }}>
                {s === d.dispute_status ? 'Current' : DISPUTE_CLOSED.includes(s) ? 'Sets resolved_at' : DISPUTE_CLOSED.includes(d.dispute_status) ? 'Clears resolved_at' : ''}
              </span>
            </>
          ),
          // GOLDEN RULE 5: Error prevention and simple error handling (rejecting asks first)
          onSelect: () => (s === 'Rejected' ? setConfirmReject(true) : apply(s as DisputeStatus)),
        }))}
      />
      <ConfirmDialog
        open={confirmReject}
        title="Reject this dispute?"
        message={
          <>
            Dispute {d.dispute_id} on <span className="mono">{d.transaction_ref}</span> will close as Rejected, which sets resolved_at and removes it from the customer's open items.
          </>
        }
        confirmLabel="Reject dispute"
        busy={busy}
        onCancel={() => setConfirmReject(false)}
        onConfirm={async () => {
          await apply('Rejected');
          setConfirmReject(false);
        }}
      />
    </>
  );
}

export default function Disputes() {
  const { values: f, set, clear, active } = useQueryState(DEFAULTS);
  const { version } = useSession();
  const [draft, setDraft] = useSyncedSearch(f.search, (v) => set({ search: v }));
  const [formOpen, setFormOpen] = useState(false);
  const query: DisputeQuery = {
    search: f.search,
    dispute_type: f.dispute_type as DisputeQuery['dispute_type'],
    dispute_status: f.dispute_status as DisputeQuery['dispute_status'],
    sort: f.sort,
    page: Number(f.page),
    page_size: 15,
  };
  const state = useAsync(() => api.listDisputes(query), [JSON.stringify(query), version]);
  const openState = useAsync(() => (f.open ? api.listDisputes({ dispute_id: f.open, page_size: 1 }).then((r) => r.data[0] ?? null) : Promise.resolve(null)), [f.open, version]);
  const showForm = formOpen || Boolean(f.new);
  const closeForm = () => {
    setFormOpen(false);
    if (f.new || f.customer) set({ new: '', customer: '', page: f.page });
  };
  const od = f.open ? openState.data : null;

  return (
    <div className="app-page wrap">
      <PageHead
        eyebrow="Cases"
        title="Disputes"
        sub="Rows from Dispute_Logs. File a dispute against an existing transaction_ref and move it through Open, Under Investigation, Escalated, Resolved and Rejected."
        actions={
          <button type="button" className="btn btn-brand" onClick={() => setFormOpen(true)}>
            <FilePlus2 size={16} aria-hidden="true" /> File dispute
          </button>
        }
      />
      <div className="card">
        <form className="filters" role="search" aria-label="Filter disputes" onSubmit={(e) => e.preventDefault()}>
          <label className="field field-wide">
            <span>Search</span>
            <span className="input-icon">
              <Search size={15} aria-hidden="true" />
              <input className="input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="transaction_ref, reason or customer_id" />
            </span>
          </label>
          <label className="field">
            <span>Dispute type</span>
            <Select value={f.dispute_type} onChange={(e) => set({ dispute_type: e.target.value })} options={options(DISPUTE_TYPE)} placeholder="All types" />
          </label>
          <label className="field">
            <span>Dispute status</span>
            <Select value={f.dispute_status} onChange={(e) => set({ dispute_status: e.target.value })} options={options(DISPUTE_STATUS)} placeholder="All statuses" />
          </label>
        </form>
        <div className="filter-bar-foot">
          <span role="status">{state.data ? `${state.data.total} matching disputes` : 'Loading disputes.'}</span>
          {active > 0 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>
              <X size={14} aria-hidden="true" /> Clear {active} filter{active > 1 ? 's' : ''}
            </button>
          )}
        </div>
        <DataView state={state} isEmpty={(d) => d.total === 0} skeleton={<SkeletonRows rows={10} cols={6} />} empty={<EmptyState title="No disputes match these filters" body="Clear a filter, or file a new dispute." />}>
          {(d) => (
            <>
              <div className="table-wrap">
                <table className="data">
                  <caption className="sr-only">Disputes</caption>
                  <thead>
                    <tr>
                      <SortHeader field="dispute_id" sort={f.sort} onSort={(s) => set({ sort: s })}>
                        ID
                      </SortHeader>
                      <SortHeader field="filed_at" sort={f.sort} onSort={(s) => set({ sort: s })}>
                        filed_at
                      </SortHeader>
                      <SortHeader field="dispute_type" sort={f.sort} onSort={(s) => set({ sort: s })}>
                        Type
                      </SortHeader>
                      <th>Reason</th>
                      <SortHeader field="dispute_status" sort={f.sort} onSort={(s) => set({ sort: s })}>
                        Status
                      </SortHeader>
                      <SortHeader field="dispute_amount" sort={f.sort} onSort={(s) => set({ sort: s })} align="r">
                        Amount
                      </SortHeader>
                      <th className="r">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.data.map((x) => (
                      <tr key={x.dispute_id} className={`clickable${f.open === x.dispute_id ? ' selected' : ''}`} onClick={() => set({ open: x.dispute_id, page: f.page })}>
                        <td>
                          <button
                            type="button"
                            className="link-btn mono"
                            onClick={(e) => {
                              e.stopPropagation();
                              set({ open: x.dispute_id, page: f.page });
                            }}
                          >
                            #{x.dispute_id}
                          </button>
                          <div className="cell-sub mono">{x.transaction_ref}</div>
                        </td>
                        <td>
                          <DateTime value={x.filed_at} />
                        </td>
                        <td>{x.dispute_type}</td>
                        <td className="cell-clip" title={x.dispute_reason}>
                          {x.dispute_reason}
                        </td>
                        <td>
                          <DisputeStatusChip status={x.dispute_status} />
                        </td>
                        <td className="r">
                          <Money amount={x.dispute_amount} currency={x.currency} />
                        </td>
                        <td className="r" onClick={(e) => e.stopPropagation()}>
                          <div className="cell-actions">
                            <StatusMenu d={x} onChanged={() => undefined} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={d.page} pageSize={d.page_size} total={d.total} onPage={(p) => set({ page: String(p) })} />
            </>
          )}
        </DataView>
      </div>

      <Drawer
        open={Boolean(f.open && od)}
        onClose={() => set({ open: '', page: f.page })}
        title={od ? `Dispute #${od.dispute_id}` : ''}
        subtitle={od ? <span className="mono">{od.transaction_ref}</span> : undefined}
        footer={
          od && (
            <>
              <Link to={`/replay/${od.transaction_ref}`} className="btn btn-brand">
                <PlayCircle size={16} aria-hidden="true" /> Replay case
              </Link>
              <StatusMenu d={od} onChanged={(u) => openState.setData(() => u)} />
            </>
          )
        }
      >
        {od && (
          <dl className="kv">
            <dt>Status</dt>
            <dd>
              <DisputeStatusChip status={od.dispute_status} />
            </dd>
            <dt>Type</dt>
            <dd>{od.dispute_type}</dd>
            <dt>dispute_reason</dt>
            <dd>{od.dispute_reason}</dd>
            <dt>Amount</dt>
            <dd>
              <Money amount={od.dispute_amount} currency={od.currency} />
            </dd>
            <dt>transaction_ref</dt>
            <dd>
              <Link className="row-link mono" to={`/transactions?open=${od.transaction_ref}`}>
                {od.transaction_ref}
              </Link>
            </dd>
            <dt>customer_id</dt>
            <dd>
              <Link className="row-link" to={`/customers/${od.customer_id}`}>
                <Id>{od.customer_id}</Id>
              </Link>
            </dd>
            <dt>filed_at</dt>
            <dd>
              <DateTime value={od.filed_at} />
            </dd>
            <dt>resolved_at</dt>
            <dd>
              <DateTime value={od.resolved_at} />
            </dd>
          </dl>
        )}
      </Drawer>

      <Modal open={showForm} onClose={closeForm} title="File dispute">
        <DisputeForm
          initialRef={f.new}
          initialCustomer={f.customer}
          onCancel={closeForm}
          onDone={(created) => {
            setFormOpen(false);
            set({ new: '', customer: '', open: created.dispute_id, dispute_status: '', dispute_type: '', search: '' });
          }}
        />
      </Modal>
    </div>
  );
}
