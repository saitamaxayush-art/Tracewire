// Pure query functions over the six tables. The mock adapter calls these;
// API_CONTRACT.md describes the equivalent SQL for each one.

import { DISPUTE_OPEN, SEVERITY_LEVEL, ACTION_TAKEN, DISPUTE_STATUS, DISPUTE_TYPE, TRANSACTION_STATUS, TRANSACTION_TYPE } from '../../constants/enums';
import { ruleFamily } from '../../constants/ruleFamilies';
import { naiveKey } from '../../lib/datetime';
import type { Tables, Transaction, Customer, Account, AnomalyPattern, DisputeLog, AuditTrail } from '../../types/db';
import type {
  AccountQuery,
  AnomalyQuery,
  AuditQuery,
  CountRow,
  CurrencyAmount,
  CustomerProfile,
  CustomerQuery,
  DisputeQuery,
  ListResponse,
  PageParams,
  StatsSummary,
  SummaryQuery,
  TransactionDetail,
  TransactionQuery,
} from '../types';
import { ApiError } from '../types';

const lc = (s: unknown) => String(s ?? '').toLowerCase();
const has = (v: unknown) => v !== undefined && v !== null && v !== '';

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  const sa = String(a);
  const sb = String(b);
  // BIGINT strings compare numerically.
  if (/^\d+$/.test(sa) && /^\d+$/.test(sb)) return sa.length - sb.length || (sa < sb ? -1 : sa > sb ? 1 : 0);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

export function sortRows<T>(rows: T[], sort: string | undefined, allowed: (keyof T)[], fallback: string): T[] {
  const spec = sort && allowed.includes(sort.replace(/^-/, '') as keyof T) ? sort : fallback;
  const desc = spec.startsWith('-');
  const field = spec.replace(/^-/, '') as keyof T;
  return [...rows].sort((x, y) => {
    const c = compare(x[field], y[field]);
    return desc ? -c : c;
  });
}

export function paginate<T>(rows: T[], q: PageParams): ListResponse<T> {
  const page_size = Math.min(Math.max(Number(q.page_size) || 25, 1), 500);
  const total = rows.length;
  const maxPage = Math.max(1, Math.ceil(total / page_size));
  const page = Math.min(Math.max(Number(q.page) || 1, 1), maxPage);
  return { data: rows.slice((page - 1) * page_size, page * page_size), page, page_size, total };
}

function inRange(value: string, from?: string, to?: string) {
  if (from && value < naiveKey(from)) return false;
  if (to && value > naiveKey(to, true)) return false;
  return true;
}

// ---------- Customers and accounts ----------

export function queryCustomers(t: Tables, q: CustomerQuery = {}): ListResponse<Customer> {
  let rows = t.Customers;
  if (has(q.search)) {
    const s = lc(q.search);
    rows = rows.filter((c) => lc(c.customer_name).includes(s) || lc(c.email).includes(s) || c.customer_id.includes(s) || lc(c.country).includes(s));
  }
  if (has(q.country)) rows = rows.filter((c) => c.country === q.country);
  if (has(q.customer_status)) rows = rows.filter((c) => c.customer_status === q.customer_status);
  rows = sortRows(rows, q.sort, ['customer_name', 'customer_id', 'country', 'registration_date', 'customer_status'], 'customer_name');
  return paginate(rows, q);
}

export function customerProfile(t: Tables, customer_id: string): CustomerProfile {
  const customer = t.Customers.find((c) => c.customer_id === customer_id);
  if (!customer) throw new ApiError('NOT_FOUND', `Customer ${customer_id} was not found.`, 404);
  const accounts = t.Accounts.filter((a) => a.customer_id === customer_id);
  const ids = new Set(accounts.map((a) => a.account_id));
  const transactions = sortRows(
    t.Transactions.filter((x) => ids.has(x.sender_account_id) || ids.has(x.receiver_account_id)),
    '-created_at',
    ['created_at'],
    '-created_at',
  );
  const anomalies = sortRows(t.Anomaly_Patterns.filter((a) => a.customer_id === customer_id), '-detected_at', ['detected_at'], '-detected_at');
  const disputes = sortRows(t.Dispute_Logs.filter((d) => d.customer_id === customer_id), '-filed_at', ['filed_at'], '-filed_at');
  return { customer, accounts, transactions, anomalies, disputes };
}

export function queryAccounts(t: Tables, q: AccountQuery = {}): ListResponse<Account> {
  let rows = t.Accounts;
  if (has(q.customer_id)) rows = rows.filter((a) => a.customer_id === q.customer_id);
  if (has(q.search)) {
    const s = lc(q.search);
    rows = rows.filter((a) => a.account_number.includes(s) || a.account_id.includes(s) || lc(a.ifsc_code).includes(s));
  }
  rows = sortRows(rows, q.sort, ['account_id', 'account_number', 'balance', 'account_type', 'status'], 'account_id');
  return paginate(rows, { page_size: 100, ...q });
}

// ---------- Transactions ----------

export function filterTransactions(t: Tables, q: TransactionQuery = {}): Transaction[] {
  let rows = t.Transactions;
  if (has(q.status)) rows = rows.filter((x) => x.status === q.status);
  if (has(q.transaction_type)) rows = rows.filter((x) => x.transaction_type === q.transaction_type);
  if (has(q.currency)) rows = rows.filter((x) => x.currency === q.currency);
  if (has(q.from) || has(q.to)) rows = rows.filter((x) => inRange(x.created_at, q.from, q.to));
  if (has(q.min_amount)) rows = rows.filter((x) => x.amount >= Number(q.min_amount));
  if (has(q.max_amount)) rows = rows.filter((x) => x.amount <= Number(q.max_amount));
  if (has(q.customer_id)) {
    const ids = new Set(t.Accounts.filter((a) => a.customer_id === q.customer_id).map((a) => a.account_id));
    rows = rows.filter((x) => ids.has(x.sender_account_id) || ids.has(x.receiver_account_id));
  }
  if (has(q.search)) {
    const s = lc(q.search);
    rows = rows.filter(
      (x) => lc(x.transaction_ref).includes(s) || lc(x.sender_location).includes(s) || x.sender_account_id.includes(s) || x.receiver_account_id.includes(s),
    );
  }
  return sortRows(rows, q.sort, ['transaction_ref', 'created_at', 'amount', 'status', 'transaction_type', 'currency', 'sender_location'], '-created_at');
}

export function queryTransactions(t: Tables, q: TransactionQuery = {}): ListResponse<Transaction> {
  return paginate(filterTransactions(t, q), q);
}

export function transactionDetail(t: Tables, ref: string): TransactionDetail {
  const transaction = t.Transactions.find((x) => x.transaction_ref === ref);
  if (!transaction) throw new ApiError('NOT_FOUND', `Transaction ${ref} was not found.`, 404);
  const sender_account = t.Accounts.find((a) => a.account_id === transaction.sender_account_id) ?? null;
  const receiver_account = t.Accounts.find((a) => a.account_id === transaction.receiver_account_id) ?? null;
  const sender_customer = sender_account ? t.Customers.find((c) => c.customer_id === sender_account.customer_id) ?? null : null;
  const receiver_customer = receiver_account ? t.Customers.find((c) => c.customer_id === receiver_account.customer_id) ?? null : null;
  return {
    transaction,
    sender_account,
    receiver_account,
    sender_customer,
    receiver_customer,
    anomalies: sortRows(t.Anomaly_Patterns.filter((a) => a.transaction_ref === ref), 'detected_at', ['detected_at'], 'detected_at'),
    disputes: sortRows(t.Dispute_Logs.filter((d) => d.transaction_ref === ref), 'filed_at', ['filed_at'], 'filed_at'),
    audit: sortRows(t.Audit_Trail.filter((a) => a.transaction_ref === ref), 'action_timestamp', ['action_timestamp'], 'action_timestamp'),
  };
}

// ---------- Anomalies ----------

export function queryAnomalies(t: Tables, q: AnomalyQuery = {}): ListResponse<AnomalyPattern> {
  let rows = t.Anomaly_Patterns;
  if (has(q.severity_level)) rows = rows.filter((a) => a.severity_level === q.severity_level);
  if (has(q.action_taken)) rows = rows.filter((a) => a.action_taken === q.action_taken);
  if (q.is_resolved === 'true' || q.is_resolved === 'false') rows = rows.filter((a) => a.is_resolved === (q.is_resolved === 'true'));
  if (has(q.rule_family)) rows = rows.filter((a) => ruleFamily(a.rule_code) === q.rule_family);
  if (has(q.anomaly_id)) rows = rows.filter((a) => a.anomaly_id === q.anomaly_id);
  if (has(q.currency)) rows = rows.filter((a) => a.currency === q.currency);
  if (has(q.from) || has(q.to)) rows = rows.filter((a) => inRange(a.detected_at, q.from, q.to));
  if (has(q.transaction_ref)) rows = rows.filter((a) => a.transaction_ref === q.transaction_ref);
  if (has(q.customer_id)) rows = rows.filter((a) => a.customer_id === q.customer_id);
  if (has(q.search)) {
    const s = lc(q.search);
    rows = rows.filter((a) => lc(a.rule_code).includes(s) || lc(a.flag_reason).includes(s) || lc(a.transaction_ref).includes(s) || lc(a.reviewed_by).includes(s));
  }
  rows = sortRows(rows, q.sort, ['anomaly_id', 'detected_at', 'risk_score', 'severity_level', 'rule_code', 'flagged_amount', 'transaction_ref'], '-detected_at');
  return paginate(rows, q);
}

// ---------- Disputes ----------

export function queryDisputes(t: Tables, q: DisputeQuery = {}): ListResponse<DisputeLog> {
  let rows = t.Dispute_Logs;
  if (has(q.dispute_type)) rows = rows.filter((d) => d.dispute_type === q.dispute_type);
  if (has(q.dispute_status)) rows = rows.filter((d) => d.dispute_status === q.dispute_status);
  if (has(q.dispute_id)) rows = rows.filter((d) => d.dispute_id === q.dispute_id);
  if (has(q.transaction_ref)) rows = rows.filter((d) => d.transaction_ref === q.transaction_ref);
  if (has(q.customer_id)) rows = rows.filter((d) => d.customer_id === q.customer_id);
  if (has(q.search)) {
    const s = lc(q.search);
    rows = rows.filter((d) => lc(d.transaction_ref).includes(s) || lc(d.dispute_reason).includes(s) || d.customer_id.includes(s));
  }
  rows = sortRows(rows, q.sort, ['dispute_id', 'filed_at', 'dispute_amount', 'dispute_status', 'dispute_type', 'transaction_ref'], '-filed_at');
  return paginate(rows, q);
}

// ---------- Audit ----------

export function queryAudit(t: Tables, q: AuditQuery = {}): ListResponse<AuditTrail> {
  let rows = t.Audit_Trail;
  if (has(q.action_type)) rows = rows.filter((a) => a.action_type === q.action_type);
  if (has(q.performed_by)) rows = rows.filter((a) => a.performed_by === q.performed_by);
  if (has(q.severity_level)) rows = rows.filter((a) => a.severity_level === q.severity_level);
  if (has(q.transaction_ref)) rows = rows.filter((a) => a.transaction_ref === q.transaction_ref);
  if (has(q.customer_id)) rows = rows.filter((a) => a.customer_id === q.customer_id);
  if (has(q.from) || has(q.to)) rows = rows.filter((a) => inRange(a.action_timestamp, q.from, q.to));
  if (has(q.search)) {
    const s = lc(q.search);
    rows = rows.filter(
      (a) =>
        lc(a.action_type).includes(s) ||
        lc(a.action_description).includes(s) ||
        lc(a.performed_by).includes(s) ||
        lc(a.transaction_ref).includes(s) ||
        lc(a.customer_id).includes(s),
    );
  }
  rows = sortRows(rows, q.sort, ['audit_id', 'action_timestamp', 'action_type', 'performed_by', 'risk_score'], '-action_timestamp');
  return paginate(rows, q);
}

// ---------- Summary ----------

function countBy<T, K extends string>(rows: T[], get: (r: T) => K, order?: readonly K[]): CountRow<K>[] {
  const m = new Map<K, number>();
  if (order) for (const k of order) m.set(k, 0);
  for (const r of rows) m.set(get(r), (m.get(get(r)) ?? 0) + 1);
  return [...m.entries()].map(([key, count]) => ({ key, count }));
}

function sumByCurrency<T>(rows: T[], amount: (r: T) => number, currency: (r: T) => string): CurrencyAmount[] {
  const m = new Map<string, CurrencyAmount>();
  for (const r of rows) {
    const c = currency(r);
    const cur = m.get(c) ?? { currency: c, total: 0, count: 0 };
    // Sum in cents to avoid floating point drift on DECIMAL(18,2) values.
    cur.total = Math.round(cur.total * 100 + amount(r) * 100) / 100;
    cur.count += 1;
    m.set(c, cur);
  }
  return [...m.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}

export function summary(t: Tables, q: SummaryQuery = {}): StatsSummary {
  const dateOk = (v: string) => inRange(v, q.from, q.to);
  const curOk = (c: string) => !has(q.currency) || c === q.currency;
  const tx = t.Transactions.filter((x) => dateOk(x.created_at) && curOk(x.currency));
  const an = t.Anomaly_Patterns.filter((a) => dateOk(a.detected_at) && curOk(a.currency));
  const di = t.Dispute_Logs.filter((d) => dateOk(d.filed_at) && curOk(d.currency));
  const au = t.Audit_Trail.filter((a) => dateOk(a.action_timestamp));
  const ts = au.map((a) => a.action_timestamp).sort();
  const scored = an.map((a) => a.risk_score);
  return {
    tables: {
      Customers: t.Customers.length,
      Accounts: t.Accounts.length,
      Transactions: t.Transactions.length,
      Anomaly_Patterns: t.Anomaly_Patterns.length,
      Dispute_Logs: t.Dispute_Logs.length,
      Audit_Trail: t.Audit_Trail.length,
    },
    transactions: {
      total: tx.length,
      by_status: countBy(tx, (x) => x.status, TRANSACTION_STATUS),
      by_type: countBy(tx, (x) => x.transaction_type, TRANSACTION_TYPE).filter((r) => r.count > 0),
      amount_by_currency: sumByCurrency(tx, (x) => x.amount, (x) => x.currency),
      flagged_amount_by_currency: sumByCurrency(tx.filter((x) => x.status === 'Flagged'), (x) => x.amount, (x) => x.currency),
      blocked_amount_by_currency: sumByCurrency(tx.filter((x) => x.status === 'Blocked'), (x) => x.amount, (x) => x.currency),
    },
    anomalies: {
      total: an.length,
      open: an.filter((a) => !a.is_resolved).length,
      by_severity: countBy(an, (a) => a.severity_level, SEVERITY_LEVEL),
      by_action: countBy(an, (a) => a.action_taken, ACTION_TAKEN),
      by_rule_code: countBy(an, (a) => a.rule_code),
      average_risk_score: scored.length ? Math.round((scored.reduce((s, n) => s + n, 0) / scored.length) * 100) / 100 : null,
    },
    disputes: {
      total: di.length,
      open: di.filter((d) => DISPUTE_OPEN.includes(d.dispute_status)).length,
      by_status: countBy(di, (d) => d.dispute_status, DISPUTE_STATUS),
      by_type: countBy(di, (d) => d.dispute_type, DISPUTE_TYPE),
      amount_by_currency: sumByCurrency(di, (d) => d.dispute_amount, (d) => d.currency),
    },
    audit: {
      total: au.length,
      first_timestamp: ts[0] ?? null,
      last_timestamp: ts[ts.length - 1] ?? null,
    },
    currencies: [...new Set(t.Transactions.map((x) => x.currency))].sort(),
  };
}
