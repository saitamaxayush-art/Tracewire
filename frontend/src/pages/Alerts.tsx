import { Link } from 'react-router-dom';
import { PlayCircle, Search, X } from 'lucide-react';
import { api } from '../api';
import { useAsync, useQueryState, useSyncedSearch } from '../lib/hooks';
import { useSession } from '../lib/session';
import { ACTION_TAKEN, SEVERITY_LEVEL, options } from '../constants/enums';
import { RULE_FAMILY_OPTIONS, ruleFamily } from '../constants/ruleFamilies';
import { ActionChip, DataView, DateTime, EmptyState, Money, PageHead, Pagination, ResolvedChip, Select, SeverityChip, SkeletonRows, SortHeader } from '../components/ui';
import { AnomalyDrawer } from '../components/AnomalyDrawer';
import type { AnomalyQuery } from '../api/types';
import { formatScore } from '../lib/format';

const DEFAULTS = { search: '', severity_level: '', action_taken: '', is_resolved: '', rule_family: '', sort: '-detected_at', page: '1', open: '' };

export default function Alerts() {
  const { values: f, set, clear, active } = useQueryState(DEFAULTS);
  const { version } = useSession();
  const [draft, setDraft] = useSyncedSearch(f.search, (v) => set({ search: v }));
  const query: AnomalyQuery = {
    search: f.search,
    severity_level: f.severity_level as AnomalyQuery['severity_level'],
    action_taken: f.action_taken as AnomalyQuery['action_taken'],
    is_resolved: f.is_resolved as AnomalyQuery['is_resolved'],
    rule_family: f.rule_family as AnomalyQuery['rule_family'],
    sort: f.sort,
    page: Number(f.page),
    page_size: 15,
  };
  const state = useAsync(() => api.listAnomalies(query), [JSON.stringify(query), version]);
  // The open alert is fetched on its own so it works from links and across pages.
  const openState = useAsync(
    () => (f.open ? api.listAnomalies({ anomaly_id: f.open, page_size: 1 }).then((r) => r.data[0] ?? null) : Promise.resolve(null)),
    [f.open, version],
  );

  return (
    <div className="app-page wrap">
      <PageHead
        eyebrow="Alerts"
        title="Alerts"
        sub="Rows from Anomaly_Patterns. Open an alert to resolve it with notes, change its action or assign a reviewer. Every action writes an Audit_Trail entry."
      />
      <div className="card">
        <form className="filters" role="search" aria-label="Filter alerts" onSubmit={(e) => e.preventDefault()}>
          <label className="field field-wide">
            <span>Search</span>
            <span className="input-icon">
              <Search size={15} aria-hidden="true" />
              <input className="input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="rule_code, flag_reason, transaction_ref, reviewer" />
            </span>
          </label>
          <label className="field">
            <span>Severity</span>
            <Select value={f.severity_level} onChange={(e) => set({ severity_level: e.target.value })} options={options(SEVERITY_LEVEL)} placeholder="All severities" />
          </label>
          <label className="field">
            <span>Action taken</span>
            <Select value={f.action_taken} onChange={(e) => set({ action_taken: e.target.value })} options={options(ACTION_TAKEN)} placeholder="All actions" />
          </label>
          <label className="field">
            <span>Resolved</span>
            <Select
              value={f.is_resolved}
              onChange={(e) => set({ is_resolved: e.target.value })}
              options={[
                { value: 'false', label: 'Unresolved' },
                { value: 'true', label: 'Resolved' },
              ]}
              placeholder="Resolved and unresolved"
            />
          </label>
          <label className="field">
            <span>Rule family</span>
            <Select value={f.rule_family} onChange={(e) => set({ rule_family: e.target.value })} options={RULE_FAMILY_OPTIONS} placeholder="All families" />
          </label>
        </form>
        <div className="filter-bar-foot">
          <span role="status">{state.data ? `${state.data.total} matching alerts` : 'Loading alerts.'}</span>
          {active > 0 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>
              <X size={14} aria-hidden="true" /> Clear {active} filter{active > 1 ? 's' : ''}
            </button>
          )}
        </div>
        <DataView state={state} isEmpty={(d) => d.total === 0} skeleton={<SkeletonRows rows={10} cols={7} />} empty={<EmptyState title="No alerts match these filters" body="Clear a filter to see more Anomaly_Patterns rows." />}>
          {(d) => (
            <>
              <div className="table-wrap">
                <table className="data">
                  <caption className="sr-only">Alerts</caption>
                  <thead>
                    <tr>
                      <SortHeader field="rule_code" sort={f.sort} onSort={(s) => set({ sort: s })}>
                        rule_code
                      </SortHeader>
                      <SortHeader field="detected_at" sort={f.sort} onSort={(s) => set({ sort: s })}>
                        detected_at
                      </SortHeader>
                      <SortHeader field="severity_level" sort={f.sort} onSort={(s) => set({ sort: s })}>
                        Severity
                      </SortHeader>
                      <SortHeader field="risk_score" sort={f.sort} onSort={(s) => set({ sort: s })} align="r">
                        Risk
                      </SortHeader>
                      <th>Action</th>
                      <th>Status</th>
                      <SortHeader field="flagged_amount" sort={f.sort} onSort={(s) => set({ sort: s })} align="r">
                        Flagged amount
                      </SortHeader>
                      <th className="r">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.data.map((a) => (
                      <tr key={a.anomaly_id} className={`clickable${f.open === a.anomaly_id ? ' selected' : ''}`} onClick={() => set({ open: a.anomaly_id, page: f.page })}>
                        <td>
                          <button
                            type="button"
                            className="link-btn mono"
                            onClick={(e) => {
                              e.stopPropagation();
                              set({ open: a.anomaly_id, page: f.page });
                            }}
                          >
                            {a.rule_code}
                          </button>
                          <div className="cell-sub mono">
                            {ruleFamily(a.rule_code)} · {a.transaction_ref}
                          </div>
                        </td>
                        <td>
                          <DateTime value={a.detected_at} />
                        </td>
                        <td>
                          <SeverityChip level={a.severity_level} />
                        </td>
                        <td className="r mono num">{formatScore(a.risk_score)}</td>
                        <td>
                          <ActionChip action={a.action_taken} />
                        </td>
                        <td>
                          <ResolvedChip resolved={a.is_resolved} />
                        </td>
                        <td className="r">
                          <Money amount={a.flagged_amount} currency={a.currency} />
                        </td>
                        <td className="r">
                          <Link to={`/replay/${a.transaction_ref}`} className="btn btn-ghost btn-sm" onClick={(e) => e.stopPropagation()} aria-label={`Replay case ${a.transaction_ref}`}>
                            <PlayCircle size={14} aria-hidden="true" /> Replay
                          </Link>
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
      <AnomalyDrawer
        anomaly={f.open ? openState.data ?? null : null}
        onClose={() => set({ open: '', page: f.page })}
        onChanged={(u) => openState.setData(() => u)}
      />
    </div>
  );
}
