// One interface per table in db/banking_fraud_db.sql.
// Field names are identical to the SQL column names.
// BIGINT -> string, DECIMAL -> number, DATETIME -> naive "YYYY-MM-DD HH:MM:SS" string, DATE -> "YYYY-MM-DD".

import type {
  AccountStatus,
  AccountType,
  ActionTaken,
  CustomerStatus,
  DisputeStatus,
  DisputeType,
  SeverityLevel,
  TransactionStatus,
  TransactionType,
} from '../constants/enums';

/** Naive DATETIME exactly as stored, for example "2026-08-01 09:42:15". Never shifted by timezone. */
export type DateTimeString = string;
/** DATE exactly as stored, for example "2023-02-14". */
export type DateString = string;
/** BIGINT carried as a string so no digits are lost. */
export type BigIntString = string;

export interface Customer {
  customer_id: BigIntString;
  customer_name: string;
  email: string;
  phone_number: string;
  country: string;
  nationality: string;
  preferred_currency: string;
  customer_status: CustomerStatus;
  registration_date: DateString;
}

export interface Account {
  account_id: BigIntString;
  customer_id: BigIntString;
  account_number: BigIntString;
  account_type: AccountType;
  balance: number;
  currency: string;
  status: AccountStatus;
  ifsc_code: string | null;
}

export interface Transaction {
  transaction_ref: string;
  sender_account_id: BigIntString;
  receiver_account_id: BigIntString;
  transaction_type: TransactionType;
  amount: number;
  currency: string;
  sender_location: string | null;
  sender_latitude: number | null;
  sender_longitude: number | null;
  status: TransactionStatus;
  created_at: DateTimeString;
}

export interface AnomalyPattern {
  anomaly_id: BigIntString;
  transaction_ref: string;
  customer_id: BigIntString;
  rule_code: string;
  flag_reason: string;
  flagged_amount: number;
  currency: string;
  risk_score: number;
  severity_level: SeverityLevel;
  action_taken: ActionTaken;
  is_resolved: boolean;
  resolution_notes: string | null;
  reviewed_by: string;
  detected_at: DateTimeString;
  resolved_at: DateTimeString | null;
}

export interface DisputeLog {
  dispute_id: BigIntString;
  transaction_ref: string;
  customer_id: BigIntString;
  dispute_type: DisputeType;
  dispute_reason: string;
  dispute_amount: number;
  currency: string;
  dispute_status: DisputeStatus;
  filed_at: DateTimeString;
  resolved_at: DateTimeString | null;
}

export interface AuditTrail {
  audit_id: BigIntString;
  transaction_ref: string | null;
  customer_id: BigIntString | null;
  action_type: string;
  action_description: string;
  performed_by: string;
  risk_score: number | null;
  /** VARCHAR(30) in SQL, not an ENUM. Usually one of the severity levels. */
  severity_level: string | null;
  action_timestamp: DateTimeString;
}

export interface Tables {
  Customers: Customer[];
  Accounts: Account[];
  Transactions: Transaction[];
  Anomaly_Patterns: AnomalyPattern[];
  Dispute_Logs: DisputeLog[];
  Audit_Trail: AuditTrail[];
}

export type TableName = keyof Tables;
