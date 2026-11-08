import { useNavigate, Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { api } from '../api';
import { useAsync, useQueryState, useSyncedSearch } from '../lib/hooks';
import { useSession } from '../lib/session';
import { CUSTOMER_STATUS, label, options } from '../constants/enums';
import { Chip, DataView, DateTime, EmptyState, Id, PageHead, Pagination, Select, SkeletonRows, SortHeader } from '../components/ui';
import { maskEmail } from '../lib/format';
import type { CustomerQuery } from '../api/types';
import { fetchAll } from '../lib/csv';

const DEFAULTS = { search: '', country: '', customer_status: '', sort: 'customer_name', page: '1' };

export function customerStatusColor(s: string) {
  if (s === 'Active Status') return 'var(--st-success)';
  if (['Suspended Status', 'Terminated Status', 'Locked Status', 'Frozen Status'].includes(s)) return 'var(--st-blocked)';
  if (['Under Review Status', 'Restricted Status', 'Pending Verification Status', 'Pending Status'].includes(s)) return 'var(--st-flagged)';
  return 'var(--st-failed)';
}

export default function Customers() {
  const { values: f, set, clear, active } = useQueryState(DEFAULTS);
  const { version } = useSession();
  const navigate = useNavigate();
  const [draft, setDraft] = useSyncedSearch(f.search, (v) => set({ search: v }));
  const query: CustomerQuery = { ...f, page: Number(f.page), page_size: 15 };
  const state = useAsync(() => api.listCustomers(query), [JSON.stringify(query), version]);
  const countries = useAsync(() => fetchAll(api.listCustomers, {}).then((all) => [...new Set(all.map((c) => c.country))].sort()), []);

  return (
    <div className="app-page wrap">
      <PageHead eyebrow="Customers" title="Customers" sub="Rows from Customers. Open a customer for a 360 profile with accounts, transactions, alerts and disputes. Email and phone stay masked until revealed." />
      <div className="card">
        <form className="filters" role="search" aria-label="Filter customers" onSubmit={(e) => e.preventDefault()}>
          <label className="field field-wide">
            <span>Search</span>
            <span className="input-icon">
              <Search size={15} aria-hidden="true" />
              <input className="input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Name, email, customer_id or country" />
            </span>
          </label>
          <label className="field">
            <span>Country</span>
            <Select value={f.country} onChange={(e) => set({ country: e.target.value })} options={(countries.data ?? []).map((c) => ({ value: c, label: c }))} placeholder="All countries" />
          </label>
          <label className="field">
            <span>Customer status</span>
            <Select value={f.customer_status} onChange={(e) => set({ customer_status: e.target.value })} options={options(CUSTOMER_STATUS)} placeholder="All statuses" />
          </label>
        </form>
        <div className="filter-bar-foot">
          <span role="status">{state.data ? `${state.data.total} matching customers` : 'Loading customers.'}</span>
          {active > 0 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>
              <X size={14} aria-hidden="true" /> Clear {active} filter{active > 1 ? 's' : ''}
            </button>
          )}
        </div>
        <DataView state={state} isEmpty={(d) => d.total === 0} skeleton={<SkeletonRows rows={10} cols={6} />} empty={<EmptyState title="No customers match" body="Clear a filter to see more rows." />}>
          {(d) => (
            <>
              <div className="table-wrap">
                <table className="data">
                  <caption className="sr-only">Customers</caption>
                  <thead>
                    <tr>
                      <SortHeader field="customer_name" sort={f.sort} onSort={(s) => set({ sort: s })}>
                        Name
                      </SortHeader>
                      <SortHeader field="customer_id" sort={f.sort} onSort={(s) => set({ sort: s })}>
                        customer_id
                      </SortHeader>
                      <th>Email</th>
                      <SortHeader field="country" sort={f.sort} onSort={(s) => set({ sort: s })}>
                        Country
                      </SortHeader>
                      <SortHeader field="customer_status" sort={f.sort} onSort={(s) => set({ sort: s })}>
                        Status
                      </SortHeader>
                      <SortHeader field="registration_date" sort={f.sort} onSort={(s) => set({ sort: s })}>
                        Registered
                      </SortHeader>
                    </tr>
                  </thead>
                  <tbody>
                    {d.data.map((c) => (
                      <tr key={c.customer_id} className="clickable" onClick={() => navigate(`/customers/${c.customer_id}`)}>
                        <td>
                          <Link className="row-link" to={`/customers/${c.customer_id}`} onClick={(e) => e.stopPropagation()}>
                            {c.customer_name}
                          </Link>
                        </td>
                        <td>
                          <Id>{c.customer_id}</Id>
                        </td>
                        <td className="mono muted">{maskEmail(c.email)}</td>
                        <td>{c.country}</td>
                        <td>
                          <Chip color={customerStatusColor(c.customer_status)} text={label(c.customer_status)} />
                        </td>
                        <td>
                          <DateTime value={c.registration_date} />
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
    </div>
  );
}
