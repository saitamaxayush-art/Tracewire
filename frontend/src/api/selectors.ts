// Example-row selectors for the home page scenes and card animations.
// Every value they return is a real row read through FraudApi. If nothing matches,
// they return an empty list and the scene shows an empty state instead of filler.

import { api } from './index';
import { fetchAll } from '../lib/csv';
import { DISPUTE_STATUS } from '../constants/enums';
import type { AnomalyPattern, AuditTrail, DisputeLog, Transaction } from '../types/db';
import type { TransactionDetail, TransactionQuery } from './types';

export interface TransferExample {
  detail: TransactionDetail;
  /** The anomaly row that drives the rule check. */
  anomaly: AnomalyPattern;
}

async function withDetail(anoms: AnomalyPattern[], limit: number): Promise<TransferExample[]> {
  const out: TransferExample[] = [];
  for (const a of anoms) {
    if (out.length >= limit) break;
    const detail = await api.getTransaction(a.transaction_ref);
    out.push({ detail, anomaly: a });
  }
  return out;
}

/** Success transactions whose anomaly sits in the Medium band or lower, lowest risk first. */
export async function getCleanExample(limit = 4): Promise<TransferExample[]> {
  const [anoms, txs] = await Promise.all([fetchAll(api.listAnomalies, { sort: 'risk_score' }), fetchAll((q: TransactionQuery) => api.listTransactions(q), { status: 'Success' })]);
  const ok = new Set(txs.map((t) => t.transaction_ref));
  const picks = anoms.filter((a) => ok.has(a.transaction_ref) && ['Negligible', 'Low', 'Medium'].includes(a.severity_level));
  return withDetail(picks, limit);
}

/** Blocked or Flagged transactions with a Critical or Catastrophic anomaly, highest risk first. */
export async function getFlaggedExample(limit = 4): Promise<TransferExample[]> {
  const [anoms, blocked, flagged] = await Promise.all([
    fetchAll(api.listAnomalies, { sort: '-risk_score' }),
    fetchAll((q: TransactionQuery) => api.listTransactions(q), { status: 'Blocked' }),
    fetchAll((q: TransactionQuery) => api.listTransactions(q), { status: 'Flagged' }),
  ]);
  const bad = new Set([...blocked, ...flagged].map((t) => t.transaction_ref));
  const picks = anoms.filter((a) => bad.has(a.transaction_ref) && (a.severity_level === 'Critical' || a.severity_level === 'Catastrophic'));
  // Alternate Blocked and Flagged so both outcomes appear.
  const isBlocked = new Set(blocked.map((t) => t.transaction_ref));
  const b = picks.filter((a) => isBlocked.has(a.transaction_ref));
  const f = picks.filter((a) => !isBlocked.has(a.transaction_ref));
  const mixed: AnomalyPattern[] = [];
  for (let i = 0; i < Math.max(b.length, f.length); i++) {
    if (b[i]) mixed.push(b[i]);
    if (f[i]) mixed.push(f[i]);
  }
  return withDetail(mixed, limit);
}

export interface ReviewExample {
  /** A resolved alert, replayed from detection to resolution. */
  target: AnomalyPattern;
  /** Four other alerts that are still unresolved, shown in the queue below it. */
  others: AnomalyPattern[];
}

/** Resolved alerts that went through review (not plain Allow), each paired with unresolved queue rows. */
export async function getResolvedAlertExample(limit = 4): Promise<ReviewExample[]> {
  const all = await fetchAll(api.listAnomalies, { sort: '-risk_score' });
  const resolved = all.filter((a) => a.is_resolved && a.resolution_notes && a.resolved_at && a.action_taken !== 'Allow');
  const open = all.filter((a) => !a.is_resolved);
  return resolved.slice(0, limit).map((target, i) => ({
    target,
    others: Array.from({ length: Math.min(4, open.length) }, (_, k) => open[(i * 4 + k) % open.length]),
  }));
}

/** Disputes interleaved by status so each loop shows a different outcome. */
export async function getDisputeExample(limit = 6): Promise<DisputeLog[]> {
  const all = await fetchAll(api.listDisputes, { sort: 'filed_at' });
  const groups = DISPUTE_STATUS.map((s) => all.filter((d) => d.dispute_status === s));
  const order = ['Escalated', 'Resolved', 'Under Investigation', 'Rejected', 'Open'];
  const byStatus = new Map(DISPUTE_STATUS.map((s, i) => [s, groups[i]]));
  const out: DisputeLog[] = [];
  for (let round = 0; out.length < limit && round < all.length; round++) {
    let added = false;
    for (const s of order) {
      const row = byStatus.get(s as DisputeLog['dispute_status'])?.[round];
      if (row && out.length < limit) {
        out.push(row);
        added = true;
      }
    }
    if (!added) break;
  }
  return out;
}

export interface ChainRow {
  key: string;
  action_timestamp: string;
  action_type: string;
  performed_by: string | null;
  risk_score: number | null;
  /** Table.column the row was read from. */
  source: string;
}

export interface AuditChainExample {
  transaction: Transaction;
  rows: ChainRow[];
}

function chainOf(d: TransactionDetail): ChainRow[] {
  const t = d.transaction;
  const rows: ChainRow[] = [{ key: 'tx', action_timestamp: t.created_at, action_type: 'Transaction created', performed_by: null, risk_score: null, source: 'Transactions' }];
  for (const a of d.anomalies) {
    rows.push({ key: `ad${a.anomaly_id}`, action_timestamp: a.detected_at, action_type: `Rule ${a.rule_code}`, performed_by: a.reviewed_by, risk_score: a.risk_score, source: 'Anomaly_Patterns' });
    if (a.resolved_at) rows.push({ key: `ar${a.anomaly_id}`, action_timestamp: a.resolved_at, action_type: 'Alert resolved', performed_by: a.reviewed_by, risk_score: a.risk_score, source: 'Anomaly_Patterns' });
  }
  for (const x of d.audit as AuditTrail[])
    rows.push({ key: `au${x.audit_id}`, action_timestamp: x.action_timestamp, action_type: x.action_type, performed_by: x.performed_by, risk_score: x.risk_score, source: 'Audit_Trail' });
  for (const x of d.disputes) {
    rows.push({ key: `df${x.dispute_id}`, action_timestamp: x.filed_at, action_type: `Dispute filed`, performed_by: null, risk_score: null, source: 'Dispute_Logs' });
    if (x.resolved_at) rows.push({ key: `dc${x.dispute_id}`, action_timestamp: x.resolved_at, action_type: `Dispute ${x.dispute_status.toLowerCase()}`, performed_by: null, risk_score: null, source: 'Dispute_Logs' });
  }
  return rows.sort((a, b) => (a.action_timestamp < b.action_timestamp ? -1 : a.action_timestamp > b.action_timestamp ? 1 : 0));
}

/** Transactions with the longest recorded chain across Anomaly_Patterns, Audit_Trail and Dispute_Logs. */
export async function getAuditChainExample(limit = 3): Promise<AuditChainExample[]> {
  const [anoms, disputes, audit] = await Promise.all([fetchAll(api.listAnomalies, {}), fetchAll(api.listDisputes, {}), fetchAll(api.listAudit, {})]);
  const score = new Map<string, number>();
  const add = (ref: string | null, n: number) => ref && score.set(ref, (score.get(ref) ?? 0) + n);
  for (const a of anoms) add(a.transaction_ref, a.resolved_at ? 2 : 1);
  for (const d of disputes) add(d.transaction_ref, d.resolved_at ? 2 : 1);
  for (const a of audit) add(a.transaction_ref, 1.01);
  const refs = [...score.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, limit).map(([r]) => r);
  const out: AuditChainExample[] = [];
  for (const ref of refs) {
    const d = await api.getTransaction(ref);
    out.push({ transaction: d.transaction, rows: chainOf(d).slice(0, 8) });
  }
  return out;
}

/** The latest transactions, used by the closing scene. */
export async function getRecentTransfers(limit = 3): Promise<Transaction[]> {
  return (await api.listTransactions({ sort: '-created_at', page_size: limit })).data;
}

/** Groups of four alerts for the Analysts card: one Catastrophic row plus three others per group. */
export async function getAlertFeedGroups(): Promise<AnomalyPattern[][]> {
  const all = await fetchAll(api.listAnomalies, { sort: 'detected_at' });
  const cat = all.filter((a) => a.severity_level === 'Catastrophic');
  const rest = all.filter((a) => a.severity_level !== 'Catastrophic');
  if (!all.length) return [];
  if (!cat.length || rest.length < 3) return [all.slice(0, 4)];
  return cat.map((c, i) => {
    const three = [rest[(i * 3) % rest.length], rest[(i * 3 + 1) % rest.length], rest[(i * 3 + 2) % rest.length]];
    const slot = i % 4;
    const g = [...three];
    g.splice(slot, 0, c);
    return g;
  });
}
