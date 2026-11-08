// Every ENUM value exactly as written in db/banking_fraud_db.sql, plus display labels.
// All dropdowns and badges read from this file.

export const CUSTOMER_STATUS = [
  'Active Status',
  'Pending Status',
  'Pending Verification Status',
  'Suspended Status',
  'Frozen Status',
  'Locked Status',
  'Closed Status',
  'Inactive Status',
  'Dormant Status',
  'Restricted Status',
  'Terminated Status',
  'Archived Status',
  'Under Review Status',
] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUS)[number];

/** Accounts.status uses the same value list as Customers.customer_status. */
export const ACCOUNT_STATUS = CUSTOMER_STATUS;
export type AccountStatus = CustomerStatus;

export const ACCOUNT_TYPE = [
  'Individual Account',
  'Personal Account',
  'Corporate Account',
  'Business Account',
  'Joint Account',
  'Savings Account',
  'Checking Account',
  'Current Account',
  'Merchant Account',
  'Admin Account',
  'System Account',
  'Trust Account',
  'Custodial Account',
  'Escrow Account',
  'Investment Account',
  'Brokerage Account',
  'Retirement Account',
  'Loan Account',
  'Credit Card Account',
] as const;
export type AccountType = (typeof ACCOUNT_TYPE)[number];

export const TRANSACTION_TYPE = [
  'Deposit Transaction',
  'Credit Transaction',
  'Withdrawal Transaction',
  'Debit Transaction',
  'Transfer Transaction',
  'Internal Transfer Transaction',
  'External Transfer Transaction',
  'Payment Transaction',
  'Refund Transaction',
  'Chargeback Transaction',
  'Reversal Transaction',
  'Fee Transaction',
  'Interest Credit Transaction',
  'Tax Deduction Transaction',
  'Adjustment Transaction',
  'Void Transaction',
  'Authorized Transaction',
  'Settled Transaction',
  'Declined Transaction',
  'Disputed Transaction',
] as const;
export type TransactionType = (typeof TRANSACTION_TYPE)[number];

export const TRANSACTION_STATUS = ['Success', 'Pending', 'Failed', 'Flagged', 'Blocked', 'Reversed'] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUS)[number];

export const SEVERITY_LEVEL = ['Negligible', 'Low', 'Medium', 'High', 'Critical', 'Catastrophic'] as const;
export type SeverityLevel = (typeof SEVERITY_LEVEL)[number];

export const ACTION_TAKEN = ['Allow', 'Flag_For_Review', 'Require_2FA', 'Block_Temporary', 'Block_Permanent'] as const;
export type ActionTaken = (typeof ACTION_TAKEN)[number];

export const DISPUTE_TYPE = [
  'Unauthorized Transaction',
  'Duplicate Transaction',
  'Incorrect Amount',
  'Merchant Dispute',
  'Fraud Dispute',
  'Other',
] as const;
export type DisputeType = (typeof DISPUTE_TYPE)[number];

export const DISPUTE_STATUS = ['Open', 'Under Investigation', 'Resolved', 'Rejected', 'Escalated'] as const;
export type DisputeStatus = (typeof DISPUTE_STATUS)[number];

/** Workflow order used by the status change menu. */
export const DISPUTE_STATUS_FLOW: readonly DisputeStatus[] = ['Open', 'Under Investigation', 'Escalated', 'Resolved', 'Rejected'];
/** Statuses that close a dispute and set resolved_at. */
export const DISPUTE_CLOSED: readonly DisputeStatus[] = ['Resolved', 'Rejected'];
export const DISPUTE_OPEN: readonly DisputeStatus[] = ['Open', 'Under Investigation', 'Escalated'];

/** Currencies present in VARCHAR(3) currency columns. Not an ENUM in SQL; derived options are built from data. */

// ---------- Labels ----------

const stripSuffix = (v: string, suffix: string) => (v.endsWith(suffix) ? v.slice(0, -suffix.length) : v);

export const ACTION_TAKEN_LABEL: Record<ActionTaken, string> = {
  Allow: 'Allow',
  Flag_For_Review: 'Flag for review',
  Require_2FA: 'Require 2FA',
  Block_Temporary: 'Block temporary',
  Block_Permanent: 'Block permanent',
};

export function label(value: string | null | undefined): string {
  if (value == null) return '';
  if (value in ACTION_TAKEN_LABEL) return ACTION_TAKEN_LABEL[value as ActionTaken];
  if ((CUSTOMER_STATUS as readonly string[]).includes(value)) return stripSuffix(value, ' Status');
  if ((TRANSACTION_TYPE as readonly string[]).includes(value)) return stripSuffix(value, ' Transaction');
  return value;
}

export function options<T extends string>(values: readonly T[]) {
  return values.map((v) => ({ value: v, label: label(v) }));
}

// ---------- Colour tokens (CSS variable names, never raw hex in components) ----------

export const SEVERITY_TOKEN: Record<SeverityLevel, string> = {
  Negligible: 'var(--sev-negligible)',
  Low: 'var(--sev-low)',
  Medium: 'var(--sev-medium)',
  High: 'var(--sev-high)',
  Critical: 'var(--sev-critical)',
  Catastrophic: 'var(--sev-catastrophic)',
};

export const STATUS_TOKEN: Record<TransactionStatus, string> = {
  Success: 'var(--st-success)',
  Pending: 'var(--st-pending)',
  Failed: 'var(--st-failed)',
  Flagged: 'var(--st-flagged)',
  Blocked: 'var(--st-blocked)',
  Reversed: 'var(--st-reversed)',
};

export const DISPUTE_STATUS_TOKEN: Record<DisputeStatus, string> = {
  Open: 'var(--st-pending)',
  'Under Investigation': 'var(--st-flagged)',
  Escalated: 'var(--st-blocked)',
  Resolved: 'var(--st-success)',
  Rejected: 'var(--st-failed)',
};

export const ACTION_TOKEN: Record<ActionTaken, string> = {
  Allow: 'var(--st-success)',
  Flag_For_Review: 'var(--st-flagged)',
  Require_2FA: 'var(--st-pending)',
  Block_Temporary: 'var(--st-blocked)',
  Block_Permanent: 'var(--sev-catastrophic)',
};

/** Ranks used to sort and band severities. */
export const SEVERITY_RANK: Record<SeverityLevel, number> = {
  Negligible: 0,
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4,
  Catastrophic: 5,
};

/** Risk gauge bands. Lower bound inclusive, derived from where each severity sits in the seed data. */
export const RISK_BANDS: { from: number; to: number; level: SeverityLevel }[] = [
  { from: 0, to: 20, level: 'Negligible' },
  { from: 20, to: 40, level: 'Low' },
  { from: 40, to: 60, level: 'Medium' },
  { from: 60, to: 80, level: 'High' },
  { from: 80, to: 95, level: 'Critical' },
  { from: 95, to: 100, level: 'Catastrophic' },
];

export function isSeverity(v: string | null | undefined): v is SeverityLevel {
  return v != null && (SEVERITY_LEVEL as readonly string[]).includes(v);
}
