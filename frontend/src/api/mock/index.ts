// Mock adapter: serves the seed JSON, keeps writes in memory and mirrors them to localStorage.
// It enforces the same rules the live API is expected to enforce (see API_CONTRACT.md).

import customers from './customers.json';
import accounts from './accounts.json';
import transactions from './transactions.json';
import anomalyPatterns from './anomaly_patterns.json';
import disputeLogs from './dispute_logs.json';
import auditTrail from './audit_trail.json';
import { ACCOUNT_TYPE, ACTION_TAKEN, DISPUTE_CLOSED, DISPUTE_STATUS, DISPUTE_TYPE, SEVERITY_LEVEL, TRANSACTION_STATUS, TRANSACTION_TYPE } from '../../constants/enums';
import type { Tables, Account, AnomalyPattern, Customer, DisputeLog, AuditTrail, Transaction } from '../../types/db';
import { ApiError } from '../types';
import type { FraudApi, AnomalyPatch, AnomalyInput, DisputeInput, DisputePatch, AuditInput, SignupInput, TransactionInput } from '../types';
import * as engine from './engine';

const STORAGE_KEY = 'tracewire.mock.tables.v1';

function seed(): Tables {
  return structuredClone({
    Customers: customers,
    Accounts: accounts,
    Transactions: transactions,
    Anomaly_Patterns: anomalyPatterns,
    Dispute_Logs: disputeLogs,
    Audit_Trail: auditTrail,
  }) as Tables;
}

function load(): Tables {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Tables;
      if (parsed && Array.isArray(parsed.Customers) && Array.isArray(parsed.Audit_Trail)) return parsed;
    }
  } catch {
    // Storage blocked or corrupted: fall back to the seed.
  }
  return seed();
}

let tables: Tables = load();

// ---------- Change subscription ----------
// Every write calls persist(), which notifies listeners in this tab. Other tabs hear the
// same write through the browser "storage" event, reload the tables and notify theirs.
// This is what lets a transfer sent from the customer view appear in an open analyst tab.

const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      /* a listener failing must not stop the others */
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return;
    tables = load();
    emit();
  });
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
  } catch {
    // Storage full or blocked: changes stay in memory for this tab.
  }
  // Notify after the current write resolves so readers see the new rows.
  setTimeout(emit, 0);
}

/** Small artificial delay so loading states are visible and behave like the network. */
function delay<T>(fn: () => T, ms = 220): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        if (shouldFail()) throw new ApiError('SIMULATED', 'Simulated failure. Remove ?simulate_error from the address to stop it.', 500);
        resolve(structuredClone(fn()));
      } catch (e) {
        reject(e);
      }
    }, ms);
  });
}

/** Add ?simulate_error=1 to any URL to exercise error states in mock mode. */
function shouldFail() {
  try {
    return new URLSearchParams(window.location.search).get('simulate_error') === '1';
  } catch {
    return false;
  }
}

function nextId(rows: { [k: string]: unknown }[], field: string): string {
  let max = 0;
  for (const r of rows) max = Math.max(max, Number(r[field]) || 0);
  return String(max + 1);
}

function validation(message: string): never {
  throw new ApiError('VALIDATION_ERROR', message, 422);
}

/** BIGINT max + 1, kept as a string so no digits are lost. */
function nextBigInt(values: string[]): string {
  let max = 0n;
  for (const v of values) if (/^\d+$/.test(v) && BigInt(v) > max) max = BigInt(v);
  return String(max + 1n);
}

/**
 * Next transaction_ref after the highest existing one, keeping its letter prefix and digit width.
 * The seed uses UTR plus 12 digits, so UTR260801000050 is followed by UTR260801000051.
 */
function nextTransactionRef(): string {
  let best: { prefix: string; n: bigint; width: number } | null = null;
  for (const t of tables.Transactions) {
    const m = /^([A-Z]*)(\d+)$/.exec(t.transaction_ref);
    if (!m) continue;
    const n = BigInt(m[2]);
    if (!best || n > best.n) best = { prefix: m[1], n, width: m[2].length };
  }
  if (!best) return 'TXN0001';
  return `${best.prefix}${String(best.n + 1n).padStart(best.width, '0')}`;
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Debit the sender for a Success transaction. Only same-currency amounts move a balance: no exchange rates are stored. */
function debitSender(tx: Transaction) {
  const acc = tables.Accounts.find((a) => a.account_id === tx.sender_account_id);
  if (!acc || acc.currency !== tx.currency) return;
  if (tx.amount > acc.balance) validation(`Amount is above the account balance of ${acc.balance.toFixed(2)} ${acc.currency}.`);
  acc.balance = round2(acc.balance - tx.amount);
}

function accountsOf(customer_id: string): Account[] {
  return tables.Accounts.filter((a) => a.customer_id === customer_id);
}

export const mockApi: FraudApi = {
  mode: 'mock',

  listCustomers: (q) => delay(() => engine.queryCustomers(tables, q)),
  getCustomer: (id) => delay(() => engine.customerProfile(tables, id)),
  listAccounts: (q) => delay(() => engine.queryAccounts(tables, q)),
  listTransactions: (q) => delay(() => engine.queryTransactions(tables, q)),
  getTransaction: (ref) => delay(() => engine.transactionDetail(tables, ref)),
  listAnomalies: (q) => delay(() => engine.queryAnomalies(tables, q)),
  listDisputes: (q) => delay(() => engine.queryDisputes(tables, q)),
  listAudit: (q) => delay(() => engine.queryAudit(tables, q)),
  getSummary: (q) => delay(() => engine.summary(tables, q), 160),

  updateAnomaly: (id, patch: AnomalyPatch) =>
    delay(() => {
      const row = tables.Anomaly_Patterns.find((a) => a.anomaly_id === id);
      if (!row) throw new ApiError('NOT_FOUND', `Anomaly ${id} was not found.`, 404);
      if (patch.action_taken !== undefined && !ACTION_TAKEN.includes(patch.action_taken)) validation('action_taken is not a valid ENUM value.');
      if (patch.is_resolved === true && !(patch.resolution_notes ?? row.resolution_notes)?.trim()) validation('resolution_notes is required to resolve an anomaly.');
      if (patch.reviewed_by !== undefined && (!patch.reviewed_by.trim() || patch.reviewed_by.length > 100)) validation('reviewed_by must be 1 to 100 characters.');
      const next: AnomalyPattern = { ...row, ...patch } as AnomalyPattern;
      if (patch.is_resolved === false) next.resolved_at = null;
      Object.assign(row, next);
      persist();
      return row;
    }),

  createDispute: (input: DisputeInput) =>
    delay(() => {
      const tx = tables.Transactions.find((x) => x.transaction_ref === input.transaction_ref);
      if (!tx) validation(`transaction_ref ${input.transaction_ref} does not exist in Transactions.`);
      if (!tables.Customers.some((c) => c.customer_id === input.customer_id)) validation(`customer_id ${input.customer_id} does not exist in Customers.`);
      if (!DISPUTE_TYPE.includes(input.dispute_type)) validation('dispute_type is not a valid ENUM value.');
      if (!input.dispute_reason.trim() || input.dispute_reason.length > 255) validation('dispute_reason must be 1 to 255 characters.');
      if (!(input.dispute_amount > 0)) validation('dispute_amount must be greater than zero.');
      if (!/^[A-Z]{3}$/.test(input.currency)) validation('currency must be a 3-letter code.');
      const row: DisputeLog = {
        dispute_id: nextId(tables.Dispute_Logs as never, 'dispute_id'),
        transaction_ref: input.transaction_ref,
        customer_id: input.customer_id,
        dispute_type: input.dispute_type,
        dispute_reason: input.dispute_reason.trim(),
        dispute_amount: Math.round(input.dispute_amount * 100) / 100,
        currency: input.currency,
        dispute_status: 'Open',
        filed_at: input.filed_at,
        resolved_at: null,
      };
      tables.Dispute_Logs.push(row);
      persist();
      return row;
    }),

  updateDispute: (id, patch: DisputePatch) =>
    delay(() => {
      const row = tables.Dispute_Logs.find((d) => d.dispute_id === id);
      if (!row) throw new ApiError('NOT_FOUND', `Dispute ${id} was not found.`, 404);
      if (patch.dispute_status !== undefined) {
        if (!DISPUTE_STATUS.includes(patch.dispute_status)) validation('dispute_status is not a valid ENUM value.');
        row.dispute_status = patch.dispute_status;
        row.resolved_at = DISPUTE_CLOSED.includes(patch.dispute_status) ? patch.resolved_at ?? row.resolved_at : null;
      }
      persist();
      return row;
    }),

  createAudit: (input: AuditInput) =>
    delay(() => {
      if (!input.action_type.trim() || input.action_type.length > 100) validation('action_type must be 1 to 100 characters.');
      if (!input.action_description.trim() || input.action_description.length > 255) validation('action_description must be 1 to 255 characters.');
      const row: AuditTrail = { audit_id: nextId(tables.Audit_Trail as never, 'audit_id'), ...input };
      tables.Audit_Trail.push(row);
      persist();
      return row;
    }, 80),

  // Demo sign-in: any non-empty password is accepted. This is not authentication.
  login: ({ email, password }) =>
    delay(() => {
      if (!password) validation('Enter a password.');
      const customer = tables.Customers.find((c) => c.email.toLowerCase() === email.trim().toLowerCase());
      if (!customer) throw new ApiError('NOT_FOUND', `No customer is registered with ${email.trim()}.`, 404);
      return { customer, accounts: accountsOf(customer.customer_id) };
    }),

  signup: (input: SignupInput) =>
    delay(() => {
      const email = input.email.trim();
      if (!input.customer_name.trim() || input.customer_name.length > 100) validation('customer_name must be 1 to 100 characters.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150) validation('email must be a valid address of at most 150 characters.');
      if (tables.Customers.some((c) => c.email.toLowerCase() === email.toLowerCase())) validation(`${email} is already registered. Log in instead.`);
      if (!input.phone_number.trim() || input.phone_number.length > 30) validation('phone_number must be 1 to 30 characters.');
      if (!input.country.trim() || input.country.length > 60) validation('country must be 1 to 60 characters.');
      if (!input.nationality.trim() || input.nationality.length > 60) validation('nationality must be 1 to 60 characters.');
      if (!/^[A-Z]{3}$/.test(input.preferred_currency)) validation('preferred_currency must be a 3-letter code.');
      if (!ACCOUNT_TYPE.includes(input.account_type)) validation('account_type is not a valid ENUM value.');
      if (!(input.opening_balance >= 0)) validation('Opening balance cannot be negative.');
      if (!input.password) validation('Enter a password.');
      const customer: Customer = {
        customer_id: nextBigInt(tables.Customers.map((c) => c.customer_id)),
        customer_name: input.customer_name.trim(),
        email,
        phone_number: input.phone_number.trim(),
        country: input.country.trim(),
        nationality: input.nationality.trim(),
        preferred_currency: input.preferred_currency,
        customer_status: 'Active Status',
        registration_date: today(),
      };
      const account: Account = {
        account_id: nextBigInt(tables.Accounts.map((a) => a.account_id)),
        customer_id: customer.customer_id,
        account_number: nextBigInt(tables.Accounts.map((a) => a.account_number)),
        account_type: input.account_type,
        balance: round2(input.opening_balance),
        currency: input.preferred_currency,
        status: 'Active Status',
        ifsc_code: null,
      };
      tables.Customers.push(customer);
      tables.Accounts.push(account);
      persist();
      return { customer, accounts: [account] };
    }),

  createTransaction: (input: TransactionInput) =>
    delay(() => {
      const sender = tables.Accounts.find((a) => a.account_id === input.sender_account_id);
      const receiver = tables.Accounts.find((a) => a.account_id === input.receiver_account_id);
      if (!sender) validation(`sender_account_id ${input.sender_account_id} does not exist in Accounts.`);
      if (!receiver) validation(`receiver_account_id ${input.receiver_account_id} does not exist in Accounts.`);
      if (sender.account_id === receiver.account_id) validation('Sender and receiver must be different accounts.');
      if (!TRANSACTION_TYPE.includes(input.transaction_type)) validation('transaction_type is not a valid ENUM value.');
      if (!TRANSACTION_STATUS.includes(input.status)) validation('status is not a valid ENUM value.');
      if (!(input.amount > 0)) validation('amount must be greater than zero.');
      if (!/^[A-Z]{3}$/.test(input.currency)) validation('currency must be a 3-letter code.');
      const row: Transaction = { ...input, amount: round2(input.amount), transaction_ref: nextTransactionRef() };
      if (row.status === 'Success') debitSender(row);
      tables.Transactions.push(row);
      persist();
      return row;
    }),

  updateTransaction: (ref, patch) =>
    delay(() => {
      const row = tables.Transactions.find((x) => x.transaction_ref === ref);
      if (!row) throw new ApiError('NOT_FOUND', `Transaction ${ref} was not found.`, 404);
      if (!TRANSACTION_STATUS.includes(patch.status)) validation('status is not a valid ENUM value.');
      if (patch.status === 'Success' && row.status !== 'Success') debitSender(row);
      row.status = patch.status;
      persist();
      return row;
    }),

  createAnomaly: (input: AnomalyInput) =>
    delay(() => {
      if (!tables.Transactions.some((x) => x.transaction_ref === input.transaction_ref)) validation(`transaction_ref ${input.transaction_ref} does not exist in Transactions.`);
      if (!tables.Customers.some((c) => c.customer_id === input.customer_id)) validation(`customer_id ${input.customer_id} does not exist in Customers.`);
      if (!input.rule_code.trim() || input.rule_code.length > 50) validation('rule_code must be 1 to 50 characters.');
      if (!input.flag_reason.trim() || input.flag_reason.length > 255) validation('flag_reason must be 1 to 255 characters.');
      if (!(input.risk_score >= 0 && input.risk_score <= 100)) validation('risk_score must be between 0 and 100.');
      if (!SEVERITY_LEVEL.includes(input.severity_level)) validation('severity_level is not a valid ENUM value.');
      if (!ACTION_TAKEN.includes(input.action_taken)) validation('action_taken is not a valid ENUM value.');
      const row: AnomalyPattern = { ...input, anomaly_id: nextId(tables.Anomaly_Patterns as never, 'anomaly_id'), risk_score: round2(input.risk_score) };
      tables.Anomaly_Patterns.push(row);
      persist();
      return row;
    }),

  subscribe: (onChange) => {
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  },

  resetData: () =>
    delay(() => {
      tables = seed();
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      setTimeout(emit, 0);
    }, 80),
};
