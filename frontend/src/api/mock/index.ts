// Mock adapter: serves the seed JSON, keeps writes in memory and mirrors them to localStorage.
// It enforces the same rules the live API is expected to enforce (see API_CONTRACT.md).

import customers from './customers.json';
import accounts from './accounts.json';
import transactions from './transactions.json';
import anomalyPatterns from './anomaly_patterns.json';
import disputeLogs from './dispute_logs.json';
import auditTrail from './audit_trail.json';
import { ACTION_TAKEN, DISPUTE_CLOSED, DISPUTE_STATUS, DISPUTE_TYPE } from '../../constants/enums';
import type { Tables, AnomalyPattern, DisputeLog, AuditTrail } from '../../types/db';
import { ApiError } from '../types';
import type { FraudApi, AnomalyPatch, DisputeInput, DisputePatch, AuditInput } from '../types';
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

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
  } catch {
    // Storage full or blocked: changes stay in memory for this tab.
  }
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

  resetData: () =>
    delay(() => {
      tables = seed();
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }, 80),
};
