// The one contract every adapter implements. Components only ever talk to this interface.
// See API_CONTRACT.md for the HTTP mapping of each method.

import type {
  AccountType,
  ActionTaken,
  DisputeStatus,
  DisputeType,
  SeverityLevel,
  TransactionStatus,
  TransactionType,
} from '../constants/enums';
import type { RuleFamilyKey } from '../constants/ruleFamilies';
import type { Account, AnomalyPattern, AuditTrail, Customer, DisputeLog, Transaction } from '../types/db';

export interface ListResponse<T> {
  data: T[];
  page: number;
  page_size: number;
  total: number;
}

export interface ItemResponse<T> {
  data: T;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 0) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** "field" sorts ascending, "-field" sorts descending. */
export type Sort = string;

export interface PageParams {
  page?: number;
  page_size?: number;
  sort?: Sort;
}

export interface CustomerQuery extends PageParams {
  search?: string;
  country?: string;
  customer_status?: string;
}

export interface AccountQuery extends PageParams {
  customer_id?: string;
  search?: string;
}

export interface TransactionQuery extends PageParams {
  status?: TransactionStatus | '';
  transaction_type?: TransactionType | '';
  currency?: string;
  /** Inclusive lower bound, "YYYY-MM-DD" or "YYYY-MM-DD HH:MM:SS", compared against created_at as stored. */
  from?: string;
  /** Inclusive upper bound. A date-only value covers the whole day. */
  to?: string;
  min_amount?: number;
  max_amount?: number;
  /** Matches transaction_ref, sender_location, and sender or receiver account_id. */
  search?: string;
  /** Matches transactions where either the sender or the receiver account belongs to this customer. */
  customer_id?: string;
}

export interface AnomalyQuery extends PageParams {
  severity_level?: SeverityLevel | '';
  action_taken?: ActionTaken | '';
  /** "true" or "false". */
  is_resolved?: '' | 'true' | 'false';
  rule_family?: RuleFamilyKey | '';
  /** Exact match, used to open one alert from a link. */
  anomaly_id?: string;
  /** Range on detected_at, same rules as GET /transactions. */
  from?: string;
  to?: string;
  currency?: string;
  /** Matches rule_code, flag_reason, transaction_ref and reviewed_by. */
  search?: string;
  transaction_ref?: string;
  customer_id?: string;
}

export interface AnomalyPatch {
  action_taken?: ActionTaken;
  is_resolved?: boolean;
  resolution_notes?: string | null;
  reviewed_by?: string;
  resolved_at?: string | null;
}

export interface DisputeQuery extends PageParams {
  dispute_type?: DisputeType | '';
  dispute_status?: DisputeStatus | '';
  /** Exact match, used to open one dispute from a link. */
  dispute_id?: string;
  search?: string;
  transaction_ref?: string;
  customer_id?: string;
}

export interface DisputeInput {
  transaction_ref: string;
  customer_id: string;
  dispute_type: DisputeType;
  dispute_reason: string;
  dispute_amount: number;
  currency: string;
  /** Set by the client as a naive DATETIME so the stored value matches what the analyst saw. */
  filed_at: string;
}

export interface DisputePatch {
  dispute_status?: DisputeStatus;
  resolved_at?: string | null;
}

export interface AuditQuery extends PageParams {
  search?: string;
  action_type?: string;
  performed_by?: string;
  severity_level?: string;
  from?: string;
  to?: string;
  transaction_ref?: string;
  customer_id?: string;
}

export type AuditInput = Omit<AuditTrail, 'audit_id'>;

// ---------- Customer side ----------

export interface LoginInput {
  email: string;
  /** Demo only: the mock accepts any non-empty value. The live API must verify a stored hash. */
  password: string;
}

export interface SignupInput {
  customer_name: string;
  email: string;
  phone_number: string;
  country: string;
  nationality: string;
  preferred_currency: string;
  account_type: AccountType;
  /** Opening balance for the new Accounts row, DECIMAL(18,2), in preferred_currency. */
  opening_balance: number;
  password: string;
}

export interface AuthResult {
  customer: Customer;
  accounts: Account[];
}

/** Body of POST /transactions. transaction_ref is assigned by the server. */
export type TransactionInput = Omit<Transaction, 'transaction_ref'>;

export interface TransactionPatch {
  status: TransactionStatus;
}

/** Body of POST /anomalies. anomaly_id is AUTO_INCREMENT. */
export type AnomalyInput = Omit<AnomalyPattern, 'anomaly_id'>;

export interface SummaryQuery {
  from?: string;
  to?: string;
  currency?: string;
}

export interface CountRow<K extends string = string> {
  key: K;
  count: number;
}

export interface CurrencyAmount {
  currency: string;
  total: number;
  count: number;
}

export interface StatsSummary {
  tables: {
    Customers: number;
    Accounts: number;
    Transactions: number;
    Anomaly_Patterns: number;
    Dispute_Logs: number;
    Audit_Trail: number;
  };
  transactions: {
    total: number;
    by_status: CountRow<TransactionStatus>[];
    by_type: CountRow<TransactionType>[];
    amount_by_currency: CurrencyAmount[];
    flagged_amount_by_currency: CurrencyAmount[];
    blocked_amount_by_currency: CurrencyAmount[];
  };
  anomalies: {
    total: number;
    open: number;
    by_severity: CountRow<SeverityLevel>[];
    by_action: CountRow<ActionTaken>[];
    by_rule_code: CountRow[];
    average_risk_score: number | null;
  };
  disputes: {
    total: number;
    open: number;
    by_status: CountRow<DisputeStatus>[];
    by_type: CountRow<DisputeType>[];
    amount_by_currency: CurrencyAmount[];
  };
  audit: {
    total: number;
    first_timestamp: string | null;
    last_timestamp: string | null;
  };
  /** Distinct currency codes found across Transactions, used to build currency dropdowns. */
  currencies: string[];
}

export interface TransactionDetail {
  transaction: Transaction;
  sender_account: Account | null;
  receiver_account: Account | null;
  sender_customer: Customer | null;
  receiver_customer: Customer | null;
  anomalies: AnomalyPattern[];
  disputes: DisputeLog[];
  audit: AuditTrail[];
}

export interface CustomerProfile {
  customer: Customer;
  accounts: Account[];
  transactions: Transaction[];
  anomalies: AnomalyPattern[];
  disputes: DisputeLog[];
}

export interface FraudApi {
  readonly mode: 'mock' | 'http';

  listCustomers(q?: CustomerQuery): Promise<ListResponse<Customer>>;
  getCustomer(customer_id: string): Promise<CustomerProfile>;

  listAccounts(q?: AccountQuery): Promise<ListResponse<Account>>;

  listTransactions(q?: TransactionQuery): Promise<ListResponse<Transaction>>;
  getTransaction(transaction_ref: string): Promise<TransactionDetail>;

  listAnomalies(q?: AnomalyQuery): Promise<ListResponse<AnomalyPattern>>;
  updateAnomaly(anomaly_id: string, patch: AnomalyPatch): Promise<AnomalyPattern>;

  listDisputes(q?: DisputeQuery): Promise<ListResponse<DisputeLog>>;
  createDispute(input: DisputeInput): Promise<DisputeLog>;
  updateDispute(dispute_id: string, patch: DisputePatch): Promise<DisputeLog>;

  listAudit(q?: AuditQuery): Promise<ListResponse<AuditTrail>>;
  createAudit(input: AuditInput): Promise<AuditTrail>;

  getSummary(q?: SummaryQuery): Promise<StatsSummary>;

  /** Customer sign-in. Resolves the Customers row and its Accounts rows. */
  login(input: LoginInput): Promise<AuthResult>;
  /** Creates one Customers row and one linked Accounts row. */
  signup(input: SignupInput): Promise<AuthResult>;
  /**
   * Inserts a Transactions row with the next transaction_ref.
   * When status is Success the sender account balance is debited in the same write.
   */
  createTransaction(input: TransactionInput): Promise<Transaction>;
  /** Changes status (used after a customer passes 2FA). Moving to Success debits the sender once. */
  updateTransaction(transaction_ref: string, patch: TransactionPatch): Promise<Transaction>;
  /** Inserts an Anomaly_Patterns row written by the scoring step. */
  createAnomaly(input: AnomalyInput): Promise<AnomalyPattern>;

  /**
   * Calls `onChange` whenever data in the store changes, from this tab or another one.
   * Open views use it to refetch without a reload. Returns an unsubscribe function.
   */
  subscribe(onChange: () => void): () => void;

  /** Mock only: restore the seed data. The HTTP adapter rejects with NOT_SUPPORTED. */
  resetData(): Promise<void>;
}
