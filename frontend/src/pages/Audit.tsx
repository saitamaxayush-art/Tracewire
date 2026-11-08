import { Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { api } from '../api';
import { useAsync, useQueryState, useSyncedSearch } from '../lib/hooks';
import { useSession } from '../lib/session';
import { DataView, DateTime, Dash, EmptyState, PageHead, Pagination, Select, SeverityChip, SkeletonRows, SortHeader } from '../components/ui';
import type { AuditQuery } from '../api/types';
import { formatScore } from '../lib/format';
import { fetchAll } from '../lib/csv';

const DEFAULTS = { search: '', action_type: '', performed_by: '', severity_level: '', from: '', to: '', sort: '-action_timestamp', page: '1' };

export default function Audit() {
  const { values: f, set, clear, active } = useQueryState(DEFAULTS);
  const { version } = useSession();
  const [draft, setDraft] = useSyncedSearch(f.search, (v) => set({ search: v }));
  const query: AuditQuery = { ...f, page: Number(f.page), page_size: 20 };
  const state = useAsync(() => api.listAudit(query), [JSON.stringify(query), version]);
  // Filter options are the distinct values actually present in Audit_Trail.
  const facets = useAsync(async () => {
    const all = await fetchAll(api.listAudit, {});
    const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => Boolean(x)))].sort();
    return { action_type: uniq(all.map((a) => a.action_type)), performed_by: uniq(all.map((a) => a.performed_by)), severity_level: uniq(all.map((a) => a.severity_level)) };
  }, [version]);
  const opts = (xs?: string[]) => (xs ?? []).map((x) => ({ value: x, label: x }));

  return (
    <div className="app-page wrap">
      <PageHead
        eyebrow="Audit trail"
        title="Audit trail"
        sub="Read-only timeline of Audit_Trail. Entries are written by the rule engine and by analyst actions in this console. A dash means the column is NULL."
      />
      <div className="card">
        <form className="filters" role="search" aria-label="Filter audit entries" onSubmit={(e) => e.preventDefault()}>
          <label className="field field-wide">
            <span>Search</span>
            <span className="input-icon">
              <Search size={15} aria-hidden="true" />
              <input className="input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="action, description, performer, ref or customer_id" />
            </span>
          </label>
          <label className="field">
            <span>Action type</span>
            <Select value={f.action_type} onChange={(e) => set({ action_type: e.target.value })} options={opts(facets.data?.action_type)} placeholder="All action types" />
          </label>
          <label className="field">
            <span>Performed by</span>
            <Select value={f.performed_by} onChange={(e) => set({ performed_by: e.target.value })} options={opts(facets.data?.performed_by)} placeholder="Anyone" />
          </label>
          <label className="field">
            <span>Severity</span>
            <Select value={f.severity_level} onChange={(e) => set({ severity_level: e.target.value })} options={opts(facets.data?.severity_level)} placeholder="All severities" />
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
          <span role="status">{state.data ? `${state.data.total} matching entries` : 'Loading entries.'}</span>
          {active > 0 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>
              <X size={14} aria-hidden="true" /> Clear {active} filter{active > 1 ? 's' : ''}
            </button>
          )}
        </div>
        <DataView state={state} isEmpty={(d) => d.total === 0} skeleton={<SkeletonRows rows={12} cols={6} />} empty={<EmptyState title="No audit entries match" body="Clear a filter or widen the date range." />}>
          {(d) => (
            <>
              <div className="table-wrap">
                <table className="data audit-table">
                  <caption className="sr-only">Audit trail entries</caption>
                  <thead>
                    <tr>
                      <SortHeader field="action_timestamp" sort={f.sort} onSort={(s) => set({ sort: s })}>
                        action_timestamp
                      </SortHeader>
                      <SortHeader field="action_type" sort={f.sort} onSort={(s) => set({ sort: s })}>
                        Action
                      </SortHeader>
                      <th>Description</th>
                      <SortHeader field="performed_by" sort={f.sort} onSort={(s) => set({ sort: s })}>
                        performed_by
                      </SortHeader>
                      <th>transaction_ref</th>
                      <th>customer_id</th>
                      <SortHeader field="risk_score" sort={f.sort} onSort={(s) => set({ sort: s })} align="r">
                        Risk
                      </SortHeader>
                      <th>Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.data.map((a) => (
                      <tr key={a.audit_id}>
                        <td className="tl-cell">
                          <span className="tl-node" aria-hidden="true" />
                          <DateTime value={a.action_timestamp} />
                        </td>
                        <td>
                          <strong style={{ fontWeight: 600 }}>{a.action_type}</strong>
                        </td>
                        <td className="cell-clip" title={a.action_description}>
                          {a.action_description}
                        </td>
                        <td className="mono">{a.performed_by}</td>
                        <td>{a.transaction_ref ? <Link className="row-link mono" to={`/transactions?open=${a.transaction_ref}`}>{a.transaction_ref}</Link> : <Dash label="No transaction_ref" />}</td>
                        <td>{a.customer_id ? <Link className="row-link mono" to={`/customers/${a.customer_id}`}>{a.customer_id}</Link> : <Dash label="No customer_id" />}</td>
                        <td className="r mono num">{a.risk_score == null ? <Dash /> : formatScore(a.risk_score)}</td>
                        <td>
                          <SeverityChip level={a.severity_level} />
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
