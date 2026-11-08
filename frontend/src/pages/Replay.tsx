import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pause, Play, Search, SkipBack, SkipForward } from 'lucide-react';
import { api } from '../api';
import { ApiError } from '../api/types';
import type { TransactionDetail } from '../api/types';
import { useAsync, useReducedMotion, useSyncedSearch, useQueryState } from '../lib/hooks';
import { useSession } from '../lib/session';
import { formatGap, parseNaive } from '../lib/datetime';
import { label, isSeverity, type SeverityLevel } from '../constants/enums';
import { ActionChip, DataView, DateTime, DisputeStatusChip, EmptyState, Id, Money, Pagination, ResolvedChip, SeverityChip, SkeletonRows, StatusChip } from '../components/ui';
import { RiskGauge } from '../components/charts/RiskGauge';
import { GeoMap, type GeoPoint } from '../components/charts/GeoMap';
import type { Transaction } from '../types/db';
import NotFound from './NotFound';

type Kind = 'transaction' | 'anomaly_detected' | 'anomaly_resolved' | 'dispute_filed' | 'dispute_closed' | 'audit';

interface ReplayEvent {
  id: string;
  kind: Kind;
  at: string;
  title: string;
  source: string;
  detail: string;
  by?: string;
  risk?: number | null;
  severity?: string | null;
}

const ORDER: Record<Kind, number> = { transaction: 0, anomaly_detected: 1, audit: 2, dispute_filed: 3, anomaly_resolved: 4, dispute_closed: 5 };

function buildEvents(d: TransactionDetail): ReplayEvent[] {
  const t = d.transaction;
  const ev: ReplayEvent[] = [
    {
      id: 'tx',
      kind: 'transaction',
      at: t.created_at,
      title: `${label(t.transaction_type)} created`,
      source: 'Transactions.created_at',
      detail: `${t.status} at ${t.sender_location ?? 'unknown location'}`,
    },
  ];
  for (const a of d.anomalies) {
    ev.push({
      id: `ad${a.anomaly_id}`,
      kind: 'anomaly_detected',
      at: a.detected_at,
      title: `Rule ${a.rule_code} fired`,
      source: 'Anomaly_Patterns.detected_at',
      detail: a.flag_reason,
      by: a.reviewed_by,
      risk: a.risk_score,
      severity: a.severity_level,
    });
    if (a.resolved_at)
      ev.push({
        id: `ar${a.anomaly_id}`,
        kind: 'anomaly_resolved',
        at: a.resolved_at,
        title: 'Alert resolved',
        source: 'Anomaly_Patterns.resolved_at',
        detail: a.resolution_notes ?? 'No resolution notes recorded.',
        by: a.reviewed_by,
        risk: a.risk_score,
        severity: a.severity_level,
      });
  }
  for (const x of d.disputes) {
    ev.push({ id: `df${x.dispute_id}`, kind: 'dispute_filed', at: x.filed_at, title: `Dispute filed: ${x.dispute_type}`, source: 'Dispute_Logs.filed_at', detail: x.dispute_reason });
    if (x.resolved_at) ev.push({ id: `dc${x.dispute_id}`, kind: 'dispute_closed', at: x.resolved_at, title: `Dispute ${x.dispute_status.toLowerCase()}`, source: 'Dispute_Logs.resolved_at', detail: `Status ${x.dispute_status}` });
  }
  for (const a of d.audit) {
    ev.push({
      id: `au${a.audit_id}`,
      kind: 'audit',
      at: a.action_timestamp,
      title: a.action_type,
      source: 'Audit_Trail.action_timestamp',
      detail: a.action_description,
      by: a.performed_by,
      risk: a.risk_score,
      severity: a.severity_level,
    });
  }
  return ev.sort((x, y) => (x.at < y.at ? -1 : x.at > y.at ? 1 : ORDER[x.kind] - ORDER[y.kind]));
}

const KIND_LABEL: Record<Kind, string> = {
  transaction: 'Transfer',
  anomaly_detected: 'Alert',
  anomaly_resolved: 'Alert',
  dispute_filed: 'Dispute',
  dispute_closed: 'Dispute',
  audit: 'Audit',
};

function ReplayView({ d, related }: { d: TransactionDetail; related: Transaction[] | undefined }) {
  const events = useMemo(() => buildEvents(d), [d]);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reduced = useReducedMotion();
  const listRef = useRef<HTMLOListElement>(null);
  const t0 = parseNaive(d.transaction.created_at) ?? 0;

  useEffect(() => {
    if (!playing) return;
    if (step >= events.length - 1) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setStep((s) => s + 1), reduced ? 900 : 1500);
    return () => clearTimeout(id);
  }, [playing, step, events.length, reduced]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-step="${step}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
  }, [step, reduced]);

  const cur = events[Math.min(step, events.length - 1)];
  const seen = events.slice(0, step + 1);
  const lastRisk = [...seen].reverse().find((e) => e.risk != null);
  const at = cur.at;
  const anomalyState = d.anomalies.map((a) => ({ a, detected: a.detected_at <= at, resolved: Boolean(a.resolved_at && a.resolved_at <= at) }));
  const disputeState = d.disputes.map((x) => ({ x, filed: x.filed_at <= at, closed: Boolean(x.resolved_at && x.resolved_at <= at) }));

  const t = d.transaction;
  const sender = d.sender_account;
  const points: GeoPoint[] = [];
  if (t.sender_latitude != null && t.sender_longitude != null) points.push({ id: t.transaction_ref, lat: t.sender_latitude, lon: t.sender_longitude, label: t.sender_location ?? t.transaction_ref, kind: 'current' });
  for (const r of related ?? []) {
    if (r.transaction_ref === t.transaction_ref || r.sender_latitude == null || r.sender_longitude == null) continue;
    points.push({ id: r.transaction_ref, lat: r.sender_latitude, lon: r.sender_longitude, label: r.sender_location ?? r.transaction_ref, kind: sender && r.sender_account_id === sender.account_id ? 'sent' : 'received' });
  }

  return (
    <div className="replay-grid">
      <section className="card replay-left" aria-label="Case timeline">
        <div className="replay-controls">
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} aria-label="Previous event">
            <SkipBack size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn btn-brand btn-sm"
            onClick={() => {
              if (step >= events.length - 1) setStep(0);
              setPlaying((p) => !p);
            }}
          >
            {playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
            {playing ? 'Pause' : step >= events.length - 1 ? 'Replay' : 'Play'}
          </button>
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setStep((s) => Math.min(events.length - 1, s + 1))} disabled={step >= events.length - 1} aria-label="Next event">
            <SkipForward size={15} aria-hidden="true" />
          </button>
          <label className="scrubber">
            <span className="sr-only">Timeline position</span>
            <input
              type="range"
              min={0}
              max={events.length - 1}
              value={step}
              onChange={(e) => {
                setPlaying(false);
                setStep(Number(e.target.value));
              }}
              aria-valuetext={`Event ${step + 1} of ${events.length}: ${cur.title}`}
            />
          </label>
          <span className="mono num muted step-count">
            {step + 1}/{events.length}
          </span>
        </div>
        <ol className="timeline" ref={listRef}>
          {events.map((e, i) => {
            const ts = parseNaive(e.at) ?? t0;
            const prev = i > 0 ? parseNaive(events[i - 1].at) ?? ts : ts;
            return (
              <li key={e.id} data-step={i} className={`tl-item${i === step ? ' current' : ''}${i > step ? ' future' : ''}`}>
                <button type="button" className="tl-btn" onClick={() => { setPlaying(false); setStep(i); }} aria-current={i === step ? 'step' : undefined}>
                  <span className="tl-dot" aria-hidden="true" />
                  <span className="tl-meta">
                    <span className="tl-kind mono">{KIND_LABEL[e.kind]}</span>
                    <DateTime value={e.at} />
                  </span>
                  <span className="tl-title">{e.title}</span>
                  <span className="tl-gap">
                    {i === 0 ? 'Start of case' : `${formatGap(ts - t0)} after transfer`}
                    {i > 1 && ts - prev > 0 ? `, ${formatGap(ts - prev)} after previous` : ''}
                    {ts < t0 ? ' (recorded before created_at)' : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="replay-right" aria-live="polite" aria-label="State at the selected event">
        <div className="card card-pad replay-now">
          <div className="replay-now-head">
            <span className="eyebrow">
              <span className="sq" aria-hidden="true" />
              Step {step + 1}: {KIND_LABEL[cur.kind]}
            </span>
            <span className="mono muted" style={{ fontSize: 12 }}>
              {cur.source}
            </span>
          </div>
          <h2 className="replay-title">{cur.title}</h2>
          <p className="replay-detail">{cur.detail}</p>
          <div className="replay-chips">
            <DateTime value={cur.at} />
            {cur.by && <span className="chip chip-mono">by {cur.by}</span>}
            {cur.severity && <SeverityChip level={cur.severity} />}
          </div>
        </div>

        <div className="replay-panels">
          <div className="card card-pad">
            <h3 className="section-title">
              <span className="sq" aria-hidden="true" />
              Risk at this step
            </h3>
            <RiskGauge
              score={lastRisk?.risk ?? null}
              severity={lastRisk && isSeverity(lastRisk.severity) ? (lastRisk.severity as SeverityLevel) : null}
              caption={lastRisk ? `From ${lastRisk.source.split('.')[0]}, severity ${lastRisk.severity ?? 'not recorded'}` : 'No risk score recorded yet'}
            />
          </div>
          <div className="card card-pad">
            <h3 className="section-title">
              <span className="sq" aria-hidden="true" />
              Case state
            </h3>
            <dl className="kv">
              <dt>Transaction</dt>
              <dd>
                <StatusChip status={t.status} /> <Money amount={t.amount} currency={t.currency} />
              </dd>
              {anomalyState.map(({ a, detected, resolved }) => (
                <FragmentRow key={a.anomaly_id} label={`Alert ${a.rule_code}`}>
                  {detected ? (
                    <>
                      <ResolvedChip resolved={resolved} /> <ActionChip action={a.action_taken} />
                    </>
                  ) : (
                    <span className="muted">Not detected yet</span>
                  )}
                </FragmentRow>
              ))}
              {disputeState.map(({ x, filed, closed }) => (
                <FragmentRow key={x.dispute_id} label={`Dispute #${x.dispute_id}`}>
                  {!filed ? <span className="muted">Not filed yet</span> : closed ? <DisputeStatusChip status={x.dispute_status} /> : <span className="chip">Open at this step</span>}
                </FragmentRow>
              ))}
              <dt>Events so far</dt>
              <dd className="mono">
                {seen.length} of {events.length}
              </dd>
            </dl>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Sender location</h3>
            <span className="muted" style={{ fontSize: 12 }}>
              {d.sender_customer ? `${d.sender_customer.customer_name}, ${points.length} plotted` : ''}
            </span>
          </div>
          {points.length ? <GeoMap points={points} title={`Sender coordinates for ${t.transaction_ref} and related transactions`} /> : <EmptyState title="No coordinates recorded" body="sender_latitude and sender_longitude are NULL for this transaction." />}
        </div>
      </section>
    </div>
  );
}

function FragmentRow({ label: l, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="mono" style={{ fontSize: 11.5 }}>
        {l}
      </dt>
      <dd>{children}</dd>
    </>
  );
}

function Picker() {
  const { values: f, set } = useQueryState({ search: '', status: '', page: '1' });
  const [draft, setDraft] = useSyncedSearch(f.search, (v) => set({ search: v }));
  const navigate = useNavigate();
  const state = useAsync(() => api.listTransactions({ search: f.search, status: f.status as Transaction['status'] | '', sort: '-created_at', page: Number(f.page), page_size: 12 }), [f.search, f.status, f.page]);
  return (
    <div className="app-page wrap">
      <header className="page-head">
        <div>
          <span className="eyebrow">
            <span className="sq" aria-hidden="true" />
            Case replay
          </span>
          <h1>Pick a transaction to replay</h1>
          <p className="page-sub">Replay merges Transactions.created_at, Anomaly_Patterns detected_at and resolved_at, Dispute_Logs filed_at and resolved_at, and every Audit_Trail action_timestamp for one transaction_ref.</p>
        </div>
      </header>
      <div className="card">
        <form className="filters" role="search" onSubmit={(e) => e.preventDefault()} aria-label="Find a transaction">
          <label className="field field-wide">
            <span>Search</span>
            <span className="input-icon">
              <Search size={15} aria-hidden="true" />
              <input className="input mono" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="UTR2608..." />
            </span>
          </label>
          <div className="field field-wide">
            <span className="field-label" id="replay-quick">
              Quick filter
            </span>
            <div className="seg-row" role="group" aria-labelledby="replay-quick">
              {['', 'Flagged', 'Blocked', 'Pending', 'Success'].map((s) => (
                <button key={s || 'all'} type="button" className={`btn btn-sm ${f.status === s ? 'btn-white' : 'btn-ghost'}`} aria-pressed={f.status === s} onClick={() => set({ status: s })}>
                  {s || 'All'}
                </button>
              ))}
            </div>
          </div>
        </form>
        <DataView state={state} isEmpty={(d) => d.total === 0} skeleton={<SkeletonRows rows={8} cols={4} />}>
          {(d) => (
            <>
              <ul className="pick-list">
                {d.data.map((t) => (
                  <li key={t.transaction_ref}>
                    <button type="button" className="pick" onClick={() => navigate(`/replay/${t.transaction_ref}`)}>
                      <span className="mono">{t.transaction_ref}</span>
                      <span className="muted">{t.sender_location}</span>
                      <StatusChip status={t.status} />
                      <Money amount={t.amount} currency={t.currency} />
                      <Play size={14} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
              <Pagination page={d.page} pageSize={d.page_size} total={d.total} onPage={(p) => set({ page: String(p) })} />
            </>
          )}
        </DataView>
      </div>
    </div>
  );
}

export default function Replay() {
  const { transaction_ref } = useParams();
  const { version } = useSession();
  const state = useAsync(() => (transaction_ref ? api.getTransaction(transaction_ref) : Promise.resolve(null)), [transaction_ref, version]);
  const custId = state.data?.sender_customer?.customer_id;
  const related = useAsync(() => (custId ? api.listTransactions({ customer_id: custId, page_size: 200 }).then((r) => r.data) : Promise.resolve([])), [custId, version]);

  if (!transaction_ref) return <Picker />;
  if (state.error instanceof ApiError && state.error.code === 'NOT_FOUND') return <NotFound what={`Transaction ${transaction_ref}`} />;

  return (
    <div className="app-page wrap">
      <Link to="/replay" className="back-link">
        <ArrowLeft size={14} aria-hidden="true" /> Pick another transaction
      </Link>
      <header className="page-head">
        <div>
          <span className="eyebrow">
            <span className="sq" aria-hidden="true" />
            Case replay
          </span>
          <h1 className="mono replay-h1">{transaction_ref}</h1>
          {state.data && (
            <p className="page-sub">
              {label(state.data.transaction.transaction_type)} of <Money amount={state.data.transaction.amount} currency={state.data.transaction.currency} /> from{' '}
              {state.data.sender_customer?.customer_name ?? 'unknown sender'} to {state.data.receiver_customer?.customer_name ?? 'unknown receiver'}. Account <Id>{state.data.transaction.sender_account_id}</Id> to{' '}
              <Id>{state.data.transaction.receiver_account_id}</Id>.
            </p>
          )}
        </div>
        <Link to={`/transactions?open=${transaction_ref}`} className="btn btn-ghost">
          Open record
        </Link>
      </header>
      <DataView state={state} skeleton={<SkeletonRows rows={10} cols={2} />}>
        {(d) => (d ? <ReplayView key={d.transaction.transaction_ref} d={d} related={related.data} /> : null)}
      </DataView>
    </div>
  );
}
