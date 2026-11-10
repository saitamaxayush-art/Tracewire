import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, PlayCircle, Search, X } from 'lucide-react';
import { api } from '../api';
import { useAsync, useQueryState, useSyncedSearch } from '../lib/hooks';
import { useSession } from '../lib/session';
import { TRANSACTION_STATUS, TRANSACTION_TYPE, label, options } from '../constants/enums';
import { Busy, DataView, DateTime, EmptyState, Id, Money, PageHead, Pagination, Select, SkeletonRows, SortHeader, StatusChip } from '../components/ui';
import { TransactionDrawer } from '../components/TransactionDrawer';
import { downloadText, fetchAll, toCsv } from '../lib/csv';
import type { TransactionQuery } from '../api/types';
import type { Transaction } from '../types/db';

const DEFAULTS = {
  search: '',
  status: '',
  transaction_type: '',
  currency: '',
  min_amount: '',
  max_amount: '',
  from: '',
  to: '',
  sort: '-created_at',
  page: '1',
  page_size: '15',
  open: '',
};

export default function Transactions() {
  const { values: f, set, clear, active } = useQueryState(DEFAULTS);
  const { version, toast } = useSession();
  const [searchDraft, setSearchDraft] = useSyncedSearch(f.search, (v) => set({ search: v }));
  const currencies = useAsync(() => api.getSummary().then((s) => s.currencies), []);

  const query: TransactionQuery = {
    search: f.search,
    status: f.status as TransactionQuery['status'],
    transaction_type: f.transaction_type as TransactionQuery['transaction_type'],
    currency: f.currency,
    min_amount: f.min_amount === '' ? undefined : Number(f.min_amount),
    max_amount: f.max_amount === '' ? undefined : Number(f.max_amount),
    from: f.from,
    to: f.to,
    sort: f.sort,
    page: Number(f.page),
    page_size: Number(f.page_size),
  };
  const state = useAsync(() => api.listTransactions(query), [JSON.stringify(query), version]);
  const [exporting, setExporting] = useState(false);
  const rangeError = f.min_amount !== '' && f.max_amount !== '' && Number(f.min_amount) > Number(f.max_amount) ? 'Minimum is above maximum.' : f.from && f.to && f.from > f.to ? 'Start date is after end date.' : '';

  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = await fetchAll(api.listTransactions, { ...query, page: 1 });
      const cols: (keyof Transaction)[] = ['transaction_ref', 'sender_account_id', 'receiver_account_id', 'transaction_type', 'amount', 'currency', 'sender_location', 'sender_latitude', 'sender_longitude', 'status', 'created_at'];
      downloadText(`transactions-${rows.length}-rows.csv`, toCsv(rows, cols));
      toast(`Exported ${rows.length} transactions to CSV.`);
    } catch (e) {
      toast(`Export failed: ${(e as Error).message}`, 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="app-page wrap">
      <PageHead
        eyebrow="Transactions"
        title="Transactions"
        sub="Every row in the Transactions table. Filter by any ENUM, amount or date, sort any column and open a row for the sender, receiver and linked records."
        actions={
          <button type="button" className="btn btn-ghost" onClick={exportCsv} disabled={exporting || !state.data?.total}>
            {/* GOLDEN RULE 3: Offer informative feedback */}
            <Busy busy={exporting} label="Exporting...">
              <Download size={16} aria-hidden="true" /> {`Export CSV${state.data ? ` (${state.data.total})` : ''}`}
            </Busy>
          </button>
        }
      />
      <div className="card">
        <form className="filters" role="search" onSubmit={(e) => e.preventDefault()} aria-label="Filter transactions">
          <label className="field field-wide">
            <span>Search</span>
            <span className="input-icon">
              <Search size={15} aria-hidden="true" />
              <input className="input" value={searchDraft} onChange={(e) => setSearchDraft(e.target.value)} placeholder="transaction_ref, location or account_id" />
            </span>
          </label>
          <label className="field">
            <span>Status</span>
            <Select value={f.status} onChange={(e) => set({ status: e.target.value })} options={options(TRANSACTION_STATUS)} placeholder="All statuses" />
          </label>
          <label className="field">
            <span>Type</span>
            <Select value={f.transaction_type} onChange={(e) => set({ transaction_type: e.target.value })} options={options(TRANSACTION_TYPE)} placeholder="All types" />
          </label>
          <label className="field">
            <span>Currency</span>
            <Select value={f.currency} onChange={(e) => set({ currency: e.target.value })} options={(currencies.data ?? []).map((c) => ({ value: c, label: c }))} placeholder="All currencies" />
          </label>
          <label className="field">
            <span>Min amount</span>
            <input className="input mono" type="number" min={0} step="0.01" inputMode="decimal" value={f.min_amount} onChange={(e) => set({ min_amount: e.target.value })} aria-invalid={Boolean(rangeError && f.min_amount)} />
          </label>
          <label className="field">
            <span>Max amount</span>
            <input className="input mono" type="number" min={0} step="0.01" inputMode="decimal" value={f.max_amount} onChange={(e) => set({ max_amount: e.target.value })} aria-invalid={Boolean(rangeError && f.max_amount)} />
          </label>
          <label className="field">
            <span>From date</span>
            <input className="input mono" type="date" value={f.from} onChange={(e) => set({ from: e.target.value })} />
          </label>
          <label className="field">
            <span>To date</span>
            <input className="input mono" type="date" value={f.to} onChange={(e) => set({ to: e.target.value })} />
          </label>
        </form>
        <div className="filter-bar-foot">
          <span role="status">
            {rangeError ? <span className="field-error">{rangeError}</span> : state.data ? `${state.data.total} matching rows. Amounts are compared within each row's own currency.` : 'Loading rows.'}
          </span>
          {active > 0 && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSearchDraft('');
                clear();
              }}
            >
              <X size={14} aria-hidden="true" /> Clear {active} filter{active > 1 ? 's' : ''}
            </button>
          )}
        </div>
        <DataView
          state={state}
          isEmpty={(d) => d.total === 0}
          skeleton={<SkeletonRows rows={10} cols={7} />}
          empty={<EmptyState title="No transactions match these filters" body="Try clearing the amount or date range." />}
        >
          {(d) => (
            <>
              <div className="table-wrap">
                <table className="data">
                  <caption className="sr-only">Transactions, sorted by {f.sort.replace('-', '')}</caption>
                  <thead>
                    <tr>
                      <SortHeader field="transaction_ref" sort={f.sort} onSort={(s) => set({ sort: s })}>
                        Ref
                      </SortHeader>
                      <SortHeader field="created_at" sort={f.sort} onSort={(s) => set({ sort: s })}>
                        created_at
                      </SortHeader>
                      <SortHeader field="transaction_type" sort={f.sort} onSort={(s) => set({ sort: s })}>
                        Type
                      </SortHeader>
                      <SortHeader field="sender_location" sort={f.sort} onSort={(s) => set({ sort: s })}>
                        Sender location
                      </SortHeader>
                      <SortHeader field="status" sort={f.sort} onSort={(s) => set({ sort: s })}>
                        Status
                      </SortHeader>
                      <SortHeader field="amount" sort={f.sort} onSort={(s) => set({ sort: s })} align="r">
                        Amount
                      </SortHeader>
                      <th className="r">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.data.map((t) => (
                      <tr key={t.transaction_ref} className={`clickable${f.open === t.transaction_ref ? ' selected' : ''}`} onClick={() => set({ open: t.transaction_ref, page: f.page })}>
                        <td>
                          <button
                            type="button"
                            className="link-btn mono"
                            onClick={(e) => {
                              e.stopPropagation();
                              set({ open: t.transaction_ref, page: f.page });
                            }}
                          >
                            {t.transaction_ref}
                          </button>
                        </td>
                        <td>
                          <DateTime value={t.created_at} />
                        </td>
                        <td>{label(t.transaction_type)}</td>
                        <td>{t.sender_location}</td>
                        <td>
                          <StatusChip status={t.status} />
                        </td>
                        <td className="r">
                          <Money amount={t.amount} currency={t.currency} />
                        </td>
                        <td className="r">
                          <Link to={`/replay/${t.transaction_ref}`} className="btn btn-ghost btn-sm" onClick={(e) => e.stopPropagation()} aria-label={`Replay case ${t.transaction_ref}`}>
                            <PlayCircle size={14} aria-hidden="true" /> Replay
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pager-row">
                <Pagination page={d.page} pageSize={d.page_size} total={d.total} onPage={(p) => set({ page: String(p) })} />
                <label className="field page-size">
                  <span>Rows per page</span>
                  <Select value={f.page_size} onChange={(e) => set({ page_size: e.target.value })} options={['15', '25', '50'].map((v) => ({ value: v, label: v }))} />
                </label>
              </div>
            </>
          )}
        </DataView>
      </div>
      <TransactionDrawer transactionRef={f.open || null} onClose={() => set({ open: '', page: f.page })} />
      <p className="foot-note">
        <Id>Transactions</Id> is read through <Id>GET /transactions</Id>. Datetimes are shown exactly as stored.
      </p>
    </div>
  );
}
