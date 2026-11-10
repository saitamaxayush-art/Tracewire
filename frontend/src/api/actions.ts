// Analyst actions. Each one performs the write and then records it in Audit_Trail
// through POST /audit, so both adapters behave the same way.

import { api } from './index';
import { ACTION_TAKEN_LABEL, type ActionTaken, type DisputeStatus, DISPUTE_CLOSED } from '../constants/enums';
import { nowNaive } from '../lib/datetime';
import type { AnomalyPattern, DisputeLog, Customer } from '../types/db';
import type { DisputeInput } from './types';

function clip(s: string, n = 255) {
  return s.length > n ? `${s.slice(0, n - 1)}.` : s;
}

export async function resolveAnomaly(a: AnomalyPattern, notes: string, performed_by: string) {
  const ts = nowNaive();
  const updated = await api.updateAnomaly(a.anomaly_id, { is_resolved: true, resolution_notes: notes.trim(), resolved_at: ts, reviewed_by: performed_by });
  await api.createAudit({
    transaction_ref: a.transaction_ref,
    customer_id: a.customer_id,
    action_type: 'Anomaly Resolved',
    action_description: clip(`Anomaly ${a.anomaly_id} (${a.rule_code}) marked resolved: ${notes.trim()}`),
    performed_by,
    risk_score: a.risk_score,
    severity_level: a.severity_level,
    action_timestamp: ts,
  });
  return updated;
}

// GOLDEN RULE 6: Permit easy reversal of actions
/** Undo for resolveAnomaly: puts back every field the resolve changed and logs the reversal. */
export async function undoResolveAnomaly(before: AnomalyPattern, performed_by: string) {
  const ts = nowNaive();
  const updated = await api.updateAnomaly(before.anomaly_id, {
    is_resolved: false,
    resolution_notes: before.resolution_notes,
    resolved_at: before.resolved_at,
    reviewed_by: before.reviewed_by,
  });
  await api.createAudit({
    transaction_ref: before.transaction_ref,
    customer_id: before.customer_id,
    action_type: 'Anomaly Resolution Reversed',
    action_description: clip(`Undo: anomaly ${before.anomaly_id} (${before.rule_code}) set back to unresolved, reviewed_by restored to ${before.reviewed_by}`),
    performed_by,
    risk_score: before.risk_score,
    severity_level: before.severity_level,
    action_timestamp: ts,
  });
  return updated;
}

export async function reopenAnomaly(a: AnomalyPattern, performed_by: string) {
  const ts = nowNaive();
  const updated = await api.updateAnomaly(a.anomaly_id, { is_resolved: false, resolved_at: null });
  await api.createAudit({
    transaction_ref: a.transaction_ref,
    customer_id: a.customer_id,
    action_type: 'Anomaly Reopened',
    action_description: clip(`Anomaly ${a.anomaly_id} (${a.rule_code}) reopened for review`),
    performed_by,
    risk_score: a.risk_score,
    severity_level: a.severity_level,
    action_timestamp: ts,
  });
  return updated;
}

export async function changeAnomalyAction(a: AnomalyPattern, action_taken: ActionTaken, performed_by: string) {
  const ts = nowNaive();
  const updated = await api.updateAnomaly(a.anomaly_id, { action_taken });
  await api.createAudit({
    transaction_ref: a.transaction_ref,
    customer_id: a.customer_id,
    action_type: 'Action Changed',
    action_description: clip(`Anomaly ${a.anomaly_id} action changed from ${ACTION_TAKEN_LABEL[a.action_taken]} to ${ACTION_TAKEN_LABEL[action_taken]}`),
    performed_by,
    risk_score: a.risk_score,
    severity_level: a.severity_level,
    action_timestamp: ts,
  });
  return updated;
}

export async function assignReviewer(a: AnomalyPattern, reviewed_by: string, performed_by: string) {
  const ts = nowNaive();
  const updated = await api.updateAnomaly(a.anomaly_id, { reviewed_by });
  await api.createAudit({
    transaction_ref: a.transaction_ref,
    customer_id: a.customer_id,
    action_type: 'Reviewer Assigned',
    action_description: clip(`Anomaly ${a.anomaly_id} assigned from ${a.reviewed_by} to ${reviewed_by}`),
    performed_by,
    risk_score: a.risk_score,
    severity_level: a.severity_level,
    action_timestamp: ts,
  });
  return updated;
}

export async function fileDispute(input: Omit<DisputeInput, 'filed_at'>, performed_by: string) {
  const ts = nowNaive();
  const created = await api.createDispute({ ...input, filed_at: ts });
  await api.createAudit({
    transaction_ref: created.transaction_ref,
    customer_id: created.customer_id,
    action_type: 'Dispute Filed',
    action_description: clip(`Dispute ${created.dispute_id} filed (${created.dispute_type}): ${created.dispute_reason}`),
    performed_by,
    risk_score: null,
    severity_level: null,
    action_timestamp: ts,
  });
  return created;
}

export async function changeDisputeStatus(d: DisputeLog, dispute_status: DisputeStatus, performed_by: string) {
  const ts = nowNaive();
  const closing = DISPUTE_CLOSED.includes(dispute_status);
  const updated = await api.updateDispute(d.dispute_id, { dispute_status, resolved_at: closing ? ts : null });
  await api.createAudit({
    transaction_ref: d.transaction_ref,
    customer_id: d.customer_id,
    action_type: 'Dispute Status Changed',
    action_description: clip(`Dispute ${d.dispute_id} moved from ${d.dispute_status} to ${dispute_status}`),
    performed_by,
    risk_score: null,
    severity_level: null,
    action_timestamp: ts,
  });
  return updated;
}

// GOLDEN RULE 6: Permit easy reversal of actions
/** Undo for changeDisputeStatus: restores the previous status and resolved_at, and logs the reversal. */
export async function undoDisputeStatus(before: DisputeLog, from: DisputeStatus, performed_by: string) {
  const ts = nowNaive();
  const updated = await api.updateDispute(before.dispute_id, { dispute_status: before.dispute_status, resolved_at: before.resolved_at });
  await api.createAudit({
    transaction_ref: before.transaction_ref,
    customer_id: before.customer_id,
    action_type: 'Dispute Status Reversed',
    action_description: clip(`Undo: dispute ${before.dispute_id} moved back from ${from} to ${before.dispute_status}`),
    performed_by,
    risk_score: null,
    severity_level: null,
    action_timestamp: ts,
  });
  return updated;
}

export async function logReveal(c: Customer, field: 'email' | 'phone_number', performed_by: string) {
  return api.createAudit({
    transaction_ref: null,
    customer_id: c.customer_id,
    action_type: 'PII Revealed',
    action_description: clip(`Analyst revealed ${field === 'email' ? 'email address' : 'phone number'} for customer ${c.customer_id}`),
    performed_by,
    risk_score: null,
    severity_level: null,
    action_timestamp: nowNaive(),
  });
}
