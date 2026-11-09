// Customer-side actions. Like actions.ts, each one performs its writes through the FraudApi
// and records them in Audit_Trail, so the analyst console sees the same rows with no special casing.

import { api } from './index';
import { nowNaive } from '../lib/datetime';
import { formatMoney } from '../lib/format';
import { evaluateTransaction, type Evaluation, type TransactionDraft } from '../lib/scoring';
import { customerActor } from '../lib/customerSession';
import { SYSTEM_ACTOR } from '../lib/session';
import type { Account, AnomalyPattern, Customer, Transaction } from '../types/db';
import type { AuthResult, SignupInput } from './types';

const clip = (s: string, n = 255) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export async function signupCustomer(input: SignupInput): Promise<AuthResult> {
  const r = await api.signup(input);
  const acc = r.accounts[0];
  await api.createAudit({
    transaction_ref: null,
    customer_id: r.customer.customer_id,
    action_type: 'Customer Registered',
    action_description: clip(`Customer ${r.customer.customer_id} signed up and opened ${acc.account_type} ${acc.account_number} with ${formatMoney(acc.balance, acc.currency)}`),
    performed_by: customerActor(r.customer.customer_id),
    risk_score: null,
    severity_level: null,
    action_timestamp: nowNaive(),
  });
  return r;
}

export interface ReceiverMatch {
  account: Account;
  customer: Customer | null;
}

/** Resolves an account_number or a customer email to real Accounts rows. */
export async function findReceiver(query: string): Promise<ReceiverMatch[]> {
  const q = query.trim();
  if (!q) return [];
  if (q.includes('@')) {
    const cs = (await api.listCustomers({ search: q, page_size: 50 })).data.filter((c) => c.email.toLowerCase() === q.toLowerCase());
    const out: ReceiverMatch[] = [];
    for (const c of cs) for (const a of (await api.listAccounts({ customer_id: c.customer_id })).data) out.push({ account: a, customer: c });
    return out;
  }
  if (!/^\d+$/.test(q)) return [];
  const accounts = (await api.listAccounts({ search: q, page_size: 50 })).data.filter((a) => a.account_number === q);
  return Promise.all(accounts.map(async (a) => ({ account: a, customer: await api.getCustomer(a.customer_id).then((p) => p.customer).catch(() => null) })));
}

export interface SendResult {
  transaction: Transaction;
  evaluation: Evaluation;
  anomaly: AnomalyPattern | null;
}

/**
 * Scores the transfer with evaluateTransaction, then writes Transactions, and when a rule
 * trips, Anomaly_Patterns. Every transfer also gets one Audit_Trail row from System,
 * the same way each seed transaction has one.
 */
export async function sendMoney(draft: TransactionDraft, sender: Customer, note: string): Promise<SendResult> {
  const now = nowNaive();
  const [senderProfile, receiverAccount] = await Promise.all([
    api.getCustomer(sender.customer_id),
    api.listAccounts({ search: draft.receiver_account_id, page_size: 50 }).then((r) => r.data.find((a) => a.account_id === draft.receiver_account_id)),
  ]);
  const senderAccount = senderProfile.accounts.find((a) => a.account_id === draft.sender_account_id);
  if (!senderAccount) throw new Error('The sending account does not belong to this customer.');
  if (!receiverAccount) throw new Error('The receiving account no longer exists.');
  const receiverCustomer = await api
    .getCustomer(receiverAccount.customer_id)
    .then((p) => p.customer)
    .catch(() => null);

  const evaluation = evaluateTransaction(draft, {
    now,
    senderAccount,
    senderCustomer: senderProfile.customer,
    receiverAccount,
    receiverCustomer,
    senderHistory: senderProfile.transactions.filter((t) => t.sender_account_id === senderAccount.account_id),
  });

  const transaction = await api.createTransaction({
    ...draft,
    // The customer's registered country; the browser location is not collected.
    sender_location: senderProfile.customer.country,
    sender_latitude: null,
    sender_longitude: null,
    status: evaluation.status,
    created_at: now,
  });

  let anomaly: AnomalyPattern | null = null;
  if (evaluation.action_taken && evaluation.rule_code) {
    anomaly = await api.createAnomaly({
      transaction_ref: transaction.transaction_ref,
      customer_id: sender.customer_id,
      rule_code: evaluation.rule_code,
      flag_reason: evaluation.flag_reason,
      flagged_amount: transaction.amount,
      currency: transaction.currency,
      risk_score: evaluation.risk_score,
      severity_level: evaluation.severity_level,
      action_taken: evaluation.action_taken,
      is_resolved: false,
      resolution_notes: null,
      reviewed_by: SYSTEM_ACTOR,
      detected_at: now,
      resolved_at: null,
    });
  }

  const noteText = note.trim() ? ` Customer note: "${note.trim()}".` : '';
  const audits: Record<string, [string, string]> = {
    Success: ['Transaction Approved', `Scored ${evaluation.risk_score.toFixed(2)} by evaluateTransaction, below every threshold. Sent ${formatMoney(transaction.amount, transaction.currency)}.`],
    Flag_For_Review: ['Transaction Flagged', `Scored ${evaluation.risk_score.toFixed(2)} (${evaluation.rule_code}), held for analyst review. Anomaly ${anomaly?.anomaly_id}.`],
    Require_2FA: ['2FA Requested', `Scored ${evaluation.risk_score.toFixed(2)} (${evaluation.rule_code}), held until the customer confirms a one-time code. Anomaly ${anomaly?.anomaly_id}.`],
    Block_Temporary: ['Transaction Blocked', `Scored ${evaluation.risk_score.toFixed(2)} (${evaluation.rule_code}), blocked temporarily. Anomaly ${anomaly?.anomaly_id}.`],
  };
  const audit = audits[evaluation.action_taken ?? 'Success'] ?? audits.Success;
  await api.createAudit({
    transaction_ref: transaction.transaction_ref,
    customer_id: sender.customer_id,
    action_type: audit[0],
    action_description: clip(audit[1] + noteText),
    performed_by: SYSTEM_ACTOR,
    risk_score: evaluation.risk_score,
    severity_level: evaluation.severity_level,
    action_timestamp: now,
  });

  return { transaction, evaluation, anomaly };
}

/** Demo 2FA: any six digits pass. Moves the transfer to Success and resolves the alert as allowed. */
export async function verifyTwoFactor(tx: Transaction, anomaly: AnomalyPattern) {
  const ts = nowNaive();
  await api.updateTransaction(tx.transaction_ref, { status: 'Success' });
  await api.updateAnomaly(anomaly.anomaly_id, {
    is_resolved: true,
    action_taken: 'Allow',
    resolution_notes: 'Customer confirmed the one-time code.',
    reviewed_by: SYSTEM_ACTOR,
    resolved_at: ts,
  });
  await api.createAudit({
    transaction_ref: tx.transaction_ref,
    customer_id: anomaly.customer_id,
    action_type: '2FA Authentication Passed',
    action_description: clip(`One-time code confirmed for anomaly ${anomaly.anomaly_id}; transfer released as Success and the alert resolved as Allow`),
    performed_by: SYSTEM_ACTOR,
    risk_score: anomaly.risk_score,
    severity_level: anomaly.severity_level,
    action_timestamp: ts,
  });
}

/** The customer stopped at the code step. The transfer stays Flagged and the alert stays open. */
export async function cancelTwoFactor(tx: Transaction, anomaly: AnomalyPattern) {
  await api.createAudit({
    transaction_ref: tx.transaction_ref,
    customer_id: anomaly.customer_id,
    action_type: '2FA Not Completed',
    action_description: clip(`Customer cancelled the one-time code step for anomaly ${anomaly.anomaly_id}; transfer stays Flagged`),
    performed_by: customerActor(anomaly.customer_id),
    risk_score: anomaly.risk_score,
    severity_level: anomaly.severity_level,
    action_timestamp: nowNaive(),
  });
}
