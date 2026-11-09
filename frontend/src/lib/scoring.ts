// evaluateTransaction: the client-side stand-in for the bank's scoring engine.
//
// It runs before a customer transfer is written and decides the Transactions.status, and,
// when a rule trips, the Anomaly_Patterns row that goes with it. Every input comes from rows
// already in the store (see ScoringContext); nothing is random. The live backend is expected to
// replace this function with its own engine that reads the same fields (API_CONTRACT.md,
// "Scoring inputs"), so keep it pure and keep every number in SCORING below.

import { RISK_BANDS, type ActionTaken, type SeverityLevel, type TransactionStatus, type TransactionType } from '../constants/enums';
import { parseNaive } from './datetime';
import { formatMoney } from './format';
import type { Account, Customer, Transaction } from '../types/db';

const bandFrom = (level: SeverityLevel) => RISK_BANDS.find((b) => b.level === level)!.from;

/** Every threshold and weight used by evaluateTransaction. Tune here and nowhere else. */
export const SCORING = {
  /** Score cut-offs for the outcome. They default to the lower edges of the existing severity bands. */
  thresholds: {
    /** At or above: Flagged, Flag_For_Review. Below: Success. */
    medium: bandFrom('Medium'),
    /** At or above: Flagged, Require_2FA. */
    high: bandFrom('High'),
    /** At or above: Blocked, Block_Temporary. */
    critical: bandFrom('Critical'),
  },
  /** Transfers out of the same account in the window before this one. */
  velocity: { windowMinutes: 60, tripAt: 2, perTransfer: 10, max: 30 },
  /** This amount divided by the account's own average outgoing amount in the same currency. */
  amountDeviation: { tripRatio: 2, base: 10, perExtraRatio: 5, max: 30 },
  /** External transfer type, or a receiver whose customer country differs from the sender's. */
  geography: { external: 15, crossBorder: 20, max: 30 },
  /** Amount as a share of the sender account balance. */
  balanceImpact: { tripShare: 0.5, base: 15, perExtraShare: 50, max: 40 },
  /** Transfer currency differs from the sender account currency. */
  currency: { mismatch: 20 },
  /** Cross-border and large (amount or balance check tripped) at the same time. */
  aml: { largeCrossBorder: 10 },
} as const;

export const CUSTOMER_TRANSFER_TYPES = ['Transfer Transaction', 'Payment Transaction', 'External Transfer Transaction'] as const satisfies readonly TransactionType[];
export type CustomerTransferType = (typeof CUSTOMER_TRANSFER_TYPES)[number];

/** The transfer being scored, before it has a transaction_ref. */
export interface TransactionDraft {
  sender_account_id: string;
  receiver_account_id: string;
  amount: number;
  currency: string;
  transaction_type: TransactionType;
}

/** Everything the score reads besides the draft itself. */
export interface ScoringContext {
  /** Naive DATETIME the transfer is created at. The velocity window ends here. */
  now: string;
  senderAccount: Account;
  senderCustomer: Customer;
  receiverAccount: Account;
  receiverCustomer: Customer | null;
  /** Transactions rows where sender_account_id is the sender account, any status. */
  senderHistory: Transaction[];
}

export type SignalKey = 'velocity' | 'amount' | 'geography' | 'balance' | 'currency' | 'aml';

export interface Signal {
  key: SignalKey;
  rule_code: string;
  /** Points added to risk_score. */
  weight: number;
  /** One sentence, written for both the analyst queue and the customer. */
  reason: string;
}

export interface Evaluation {
  risk_score: number;
  severity_level: SeverityLevel;
  status: TransactionStatus;
  /** Null when the transfer goes straight to Success and no Anomaly_Patterns row is written. */
  action_taken: ActionTaken | null;
  /** Signals that tripped, highest weight first. */
  signals: Signal[];
  /** rule_code of the highest-weight signal, or null. */
  rule_code: string | null;
  /** Reasons joined, at most 255 characters (Anomaly_Patterns.flag_reason). */
  flag_reason: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function severityForScore(score: number): SeverityLevel {
  let level: SeverityLevel = RISK_BANDS[0].level;
  for (const b of RISK_BANDS) if (score >= b.from) level = b.level;
  return level;
}

export function outcomeForScore(score: number): { status: TransactionStatus; action_taken: ActionTaken | null } {
  const t = SCORING.thresholds;
  if (score >= t.critical) return { status: 'Blocked', action_taken: 'Block_Temporary' };
  if (score >= t.high) return { status: 'Flagged', action_taken: 'Require_2FA' };
  if (score >= t.medium) return { status: 'Flagged', action_taken: 'Flag_For_Review' };
  return { status: 'Success', action_taken: null };
}

export function evaluateTransaction(tx: TransactionDraft, ctx: ScoringContext): Evaluation {
  const signals: Signal[] = [];
  const S = SCORING;

  // Velocity: outgoing transfers from this account in the last window.
  const end = parseNaive(ctx.now) ?? 0;
  const start = end - S.velocity.windowMinutes * 60_000;
  const recent = ctx.senderHistory.filter((x) => {
    const at = parseNaive(x.created_at);
    return at != null && at >= start && at <= end;
  }).length;
  if (recent >= S.velocity.tripAt) {
    signals.push({
      key: 'velocity',
      rule_code: 'VEL_HOURLY_BURST',
      weight: Math.min(S.velocity.max, recent * S.velocity.perTransfer),
      reason: `${recent} transfers from this account in the last ${S.velocity.windowMinutes} minutes`,
    });
  }

  // Amount deviation: against this account's own average in the same currency.
  const same = ctx.senderHistory.filter((x) => x.currency === tx.currency);
  const avg = same.length ? same.reduce((s, x) => s + x.amount, 0) / same.length : null;
  let amountTripped = false;
  if (avg && avg > 0) {
    const ratio = tx.amount / avg;
    if (ratio >= S.amountDeviation.tripRatio) {
      amountTripped = true;
      signals.push({
        key: 'amount',
        rule_code: 'AMT_ABOVE_AVERAGE',
        weight: Math.min(S.amountDeviation.max, S.amountDeviation.base + (ratio - S.amountDeviation.tripRatio) * S.amountDeviation.perExtraRatio),
        reason: `Amount is ${ratio.toFixed(1)} times this account's average transfer of ${formatMoney(r2(avg), tx.currency)}`,
      });
    }
  }

  // Geography.
  const external = tx.transaction_type === 'External Transfer Transaction';
  const crossBorder = Boolean(ctx.receiverCustomer && ctx.receiverCustomer.country !== ctx.senderCustomer.country);
  if (external || crossBorder) {
    const weight = Math.min(S.geography.max, (external ? S.geography.external : 0) + (crossBorder ? S.geography.crossBorder : 0));
    const parts = [external ? 'External transfer' : null, crossBorder ? `receiver is in ${ctx.receiverCustomer!.country}, sender is in ${ctx.senderCustomer.country}` : null].filter(Boolean);
    signals.push({ key: 'geography', rule_code: crossBorder ? 'GEO_CROSS_BORDER' : 'GEO_EXTERNAL_TRANSFER', weight, reason: capital(parts.join(', ')) });
  }

  // Balance impact, only meaningful in the account's own currency.
  let balanceTripped = false;
  if (tx.currency === ctx.senderAccount.currency && ctx.senderAccount.balance > 0) {
    const share = tx.amount / ctx.senderAccount.balance;
    if (share >= S.balanceImpact.tripShare) {
      balanceTripped = true;
      signals.push({
        key: 'balance',
        rule_code: 'BEH_BALANCE_DRAIN',
        weight: Math.min(S.balanceImpact.max, S.balanceImpact.base + (share - S.balanceImpact.tripShare) * S.balanceImpact.perExtraShare),
        reason: `Transfer moves ${Math.round(share * 100)}% of the account balance`,
      });
    }
  }

  // Currency.
  if (tx.currency !== ctx.senderAccount.currency) {
    signals.push({ key: 'currency', rule_code: 'FX_CURRENCY_MISMATCH', weight: S.currency.mismatch, reason: `Sent in ${tx.currency} from an account held in ${ctx.senderAccount.currency}` });
  }

  // AML: a large transfer leaving the country.
  if (crossBorder && (amountTripped || balanceTripped)) {
    signals.push({ key: 'aml', rule_code: 'AML_LARGE_CROSS_BORDER', weight: S.aml.largeCrossBorder, reason: 'Large amount sent across a border' });
  }

  for (const s of signals) s.weight = r2(s.weight);
  signals.sort((a, b) => b.weight - a.weight);
  const risk_score = r2(Math.min(100, signals.reduce((s, x) => s + x.weight, 0)));
  const { status, action_taken } = outcomeForScore(risk_score);
  const joined = signals.map((s) => s.reason).join('; ');
  return {
    risk_score,
    severity_level: severityForScore(risk_score),
    status,
    action_taken,
    signals,
    rule_code: signals[0]?.rule_code ?? null,
    flag_reason: joined.length > 255 ? `${joined.slice(0, 254)}…` : joined || 'No rule tripped',
  };
}

function capital(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
