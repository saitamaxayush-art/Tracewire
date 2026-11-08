// HTTP adapter: the same FraudApi contract over fetch, against VITE_API_BASE_URL.
// Endpoint shapes are documented in API_CONTRACT.md.

import { ApiError } from '../types';
import type { FraudApi, ListResponse, ApiErrorBody } from '../types';
import type { AnomalyPattern, AuditTrail, DisputeLog } from '../../types/db';

const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

type Params = Record<string, string | number | boolean | undefined | null>;

function qs(params?: object): string {
  if (!params) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params as Params)) {
    if (v === undefined || v === null || v === '') continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', `Could not reach the API at ${BASE || '(VITE_API_BASE_URL is not set)'}.`);
  }
  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      throw new ApiError('BAD_RESPONSE', `The API returned a response that is not JSON (HTTP ${res.status}).`, res.status);
    }
  }
  if (!res.ok) {
    const err = (json as ApiErrorBody | null)?.error;
    throw new ApiError(err?.code ?? `HTTP_${res.status}`, err?.message ?? `Request failed with HTTP ${res.status}.`, res.status);
  }
  return json as T;
}

/** MySQL BOOLEAN comes back as 0/1 from most drivers. Normalise to true/false. */
function normAnomaly(a: AnomalyPattern): AnomalyPattern {
  return { ...a, anomaly_id: String(a.anomaly_id), customer_id: String(a.customer_id), is_resolved: Boolean(Number(a.is_resolved)), risk_score: Number(a.risk_score), flagged_amount: Number(a.flagged_amount) };
}
function normDispute(d: DisputeLog): DisputeLog {
  return { ...d, dispute_id: String(d.dispute_id), customer_id: String(d.customer_id), dispute_amount: Number(d.dispute_amount) };
}
function normAudit(a: AuditTrail): AuditTrail {
  return { ...a, audit_id: String(a.audit_id), customer_id: a.customer_id == null ? null : String(a.customer_id), risk_score: a.risk_score == null ? null : Number(a.risk_score) };
}
function mapList<T>(r: ListResponse<T>, f: (x: T) => T): ListResponse<T> {
  return { ...r, data: r.data.map(f) };
}

const enc = encodeURIComponent;

export const httpApi: FraudApi = {
  mode: 'http',

  listCustomers: (q) => request('GET', `/customers${qs(q)}`),
  getCustomer: async (id) => {
    const r = await request<{ data: Awaited<ReturnType<FraudApi['getCustomer']>> }>('GET', `/customers/${enc(id)}`);
    return { ...r.data, anomalies: r.data.anomalies.map(normAnomaly), disputes: r.data.disputes.map(normDispute) };
  },
  listAccounts: (q) => request('GET', `/accounts${qs(q)}`),
  listTransactions: (q) => request('GET', `/transactions${qs(q)}`),
  getTransaction: async (ref) => {
    const r = await request<{ data: Awaited<ReturnType<FraudApi['getTransaction']>> }>('GET', `/transactions/${enc(ref)}`);
    return { ...r.data, anomalies: r.data.anomalies.map(normAnomaly), disputes: r.data.disputes.map(normDispute), audit: r.data.audit.map(normAudit) };
  },
  listAnomalies: async (q) => mapList(await request<ListResponse<AnomalyPattern>>('GET', `/anomalies${qs(q)}`), normAnomaly),
  updateAnomaly: async (id, patch) => normAnomaly((await request<{ data: AnomalyPattern }>('PATCH', `/anomalies/${enc(id)}`, patch)).data),
  listDisputes: async (q) => mapList(await request<ListResponse<DisputeLog>>('GET', `/disputes${qs(q)}`), normDispute),
  createDispute: async (input) => normDispute((await request<{ data: DisputeLog }>('POST', '/disputes', input)).data),
  updateDispute: async (id, patch) => normDispute((await request<{ data: DisputeLog }>('PATCH', `/disputes/${enc(id)}`, patch)).data),
  listAudit: async (q) => mapList(await request<ListResponse<AuditTrail>>('GET', `/audit${qs(q)}`), normAudit),
  createAudit: async (input) => normAudit((await request<{ data: AuditTrail }>('POST', '/audit', input)).data),
  getSummary: async (q) => (await request<{ data: Awaited<ReturnType<FraudApi['getSummary']>> }>('GET', `/stats/summary${qs(q)}`)).data,
  resetData: () => Promise.reject(new ApiError('NOT_SUPPORTED', 'Resetting data is only available when the console runs on the local JSON seed.')),
};
