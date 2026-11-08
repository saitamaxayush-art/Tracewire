// Rule families for Anomaly_Patterns.rule_code.
//
// The seed rule codes do not carry a family prefix (they look like VELOCITY_LIMIT_06),
// so a code is classified in two steps:
//   1. If the code already starts with a family key and an underscore (for example "AML_..."),
//      that family is used. This is how codes from the live database are expected to look.
//   2. Otherwise the code's stem (the code without its trailing _NN number) is looked up in STEM_FAMILY.
// Codes that match neither are counted under "Other", so nothing is dropped.

export const RULE_FAMILIES = [
  { key: 'AML', name: 'Anti-money laundering', description: 'Sanctions, high-risk jurisdictions and offshore flows.' },
  { key: 'VEL', name: 'Velocity', description: 'Too many transfers, or a balance moved out too fast.' },
  { key: 'GEO', name: 'Geolocation', description: 'Origin far from the customer, or travel that is not possible.' },
  { key: 'BEH', name: 'Behaviour and account state', description: 'Activity that breaks the customer baseline or the account status.' },
  { key: 'FRE', name: 'Frequency and recurrence', description: 'Recurring and scheduled payments checked against their pattern.' },
  { key: 'AMT', name: 'Amount', description: 'Amounts near a threshold or far above the usual range.' },
  { key: 'BEN', name: 'Beneficiary', description: 'New payees, peer transfers and supplier recipients.' },
  { key: 'DEV', name: 'Device and session', description: 'Unrecognised devices and unusual session conditions.' },
  { key: 'INV', name: 'Investment and treasury', description: 'Portfolio, pension and treasury movements.' },
  { key: 'FX', name: 'Cross-border and currency', description: 'Foreign wires, SEPA and remittance corridors.' },
  { key: 'MCC', name: 'Merchant category', description: 'Card and checkout payments matched to merchant type.' },
] as const;

export type RuleFamilyKey = (typeof RULE_FAMILIES)[number]['key'] | 'Other';

export const OTHER_FAMILY = { key: 'Other' as const, name: 'Other', description: 'Codes with no family mapping yet.' };

const STEM_FAMILY: Record<string, RuleFamilyKey> = {
  // AML
  HIGH_RISK_JUR: 'AML',
  SANCTION_BLOCK: 'AML',
  GEOPOLITICAL_RISK: 'AML',
  OFFSHORE_FLOW: 'AML',
  // Velocity
  VELOCITY_LIMIT: 'VEL',
  RAPID_DRAIN: 'VEL',
  // Geolocation
  FOREIGN_LOCATION: 'GEO',
  LOCATION_VARIANCE: 'GEO',
  UNUSUAL_GEO: 'GEO',
  IMPOSSIBLE_TRAVEL: 'GEO',
  // Behaviour and account state
  NORMAL_PATTERN: 'BEH',
  LOW_VARIANCE: 'BEH',
  FROZEN_ATTEMPT: 'BEH',
  SUSP_STATUS: 'BEH',
  LOCKED_BREACH: 'BEH',
  DORMANT_DRAIN: 'BEH',
  TERMINATED_USE: 'BEH',
  // Frequency and recurrence
  TRANSFER_VARIANCE: 'FRE',
  ROUTINE_PAY: 'FRE',
  BULK_SETTLE: 'FRE',
  SMALL_PAY: 'FRE',
  MICRO_TEST: 'FRE',
  // Amount
  LOW_AMOUNT: 'AMT',
  THRESHOLD_AMOUNT: 'AMT',
  AMOUNT_SPIKE: 'AMT',
  CORP_SURGE: 'AMT',
  CASH_INFLOW: 'AMT',
  HIGH_TICKET: 'AMT',
  ATM_SPIKE: 'AMT',
  // Beneficiary
  DOMESTIC_P2P: 'BEN',
  NEW_BENEFICIARY: 'BEN',
  B2B_SUPPLY: 'BEN',
  FAST_P2P: 'BEN',
  TAX_ADVANCE: 'BEN',
  // Device and session
  SUSP_HOURS: 'DEV',
  // Investment and treasury
  INVESTMENT_SPIKE: 'INV',
  CORP_DIVIDEND: 'INV',
  PORTFOLIO_ADJ: 'INV',
  TREASURY_SWEEP: 'INV',
  PACIFIC_SETTLE: 'INV',
  // Cross-border and currency
  CROSS_BORDER: 'FX',
  FOREIGN_WIRE: 'FX',
  INTL_CORP: 'FX',
  DEPOSIT_CREDIT: 'FX',
  SEPA_TRANSFER: 'FX',
  SWIFT_INVOICE: 'FX',
  // Merchant category
  MERCHANT_CHECK: 'MCC',
  POS_DEVIATION: 'MCC',
  ECOM_PURCHASE: 'MCC',
  ECOMMERCE_CHECK: 'MCC',
};

const FAMILY_KEYS = RULE_FAMILIES.map((f) => f.key) as string[];

export function ruleStem(rule_code: string): string {
  return rule_code.replace(/_\d+$/, '');
}

export function ruleFamily(rule_code: string): RuleFamilyKey {
  const prefix = rule_code.split('_')[0];
  if (FAMILY_KEYS.includes(prefix)) return prefix as RuleFamilyKey;
  return STEM_FAMILY[ruleStem(rule_code)] ?? 'Other';
}

export function familyInfo(key: RuleFamilyKey) {
  return RULE_FAMILIES.find((f) => f.key === key) ?? OTHER_FAMILY;
}

export const RULE_FAMILY_OPTIONS = [...RULE_FAMILIES.map((f) => ({ value: f.key, label: `${f.key}: ${f.name}` })), { value: 'Other', label: 'Other' }];
