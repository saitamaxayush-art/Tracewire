// Display formatting. Money is always formatted in its own currency and never summed across currencies.

const moneyCache = new Map<string, Intl.NumberFormat>();

export function formatMoney(amount: number | null | undefined, currency: string, opts: { compact?: boolean } = {}): string {
  if (amount == null || Number.isNaN(amount)) return '';
  const key = `${currency}|${opts.compact ? 'c' : 'f'}`;
  let f = moneyCache.get(key);
  if (!f) {
    try {
      f = new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency,
        currencyDisplay: 'code',
        notation: opts.compact ? 'compact' : 'standard',
        maximumFractionDigits: opts.compact ? 1 : undefined,
      });
    } catch {
      // Unknown ISO code: fall back to a plain number with the code in front.
      const n = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return `${currency} ${n.format(amount)}`;
    }
    moneyCache.set(key, f);
  }
  // Use a regular space between the code and the number for readability.
  return f.format(amount).replace(/ /g, ' ');
}

const intFmt = new Intl.NumberFormat('en-GB');
export function formatInt(n: number | null | undefined): string {
  if (n == null) return '';
  return intFmt.format(n);
}

const scoreFmt = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function formatScore(n: number | null | undefined): string {
  if (n == null) return '';
  return scoreFmt.format(n);
}

export function formatPercent(part: number, whole: number, digits = 0): string {
  if (!whole) return '0%';
  return `${((part / whole) * 100).toFixed(digits)}%`;
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return '•••';
  return `${user.slice(0, 1)}${'•'.repeat(Math.max(3, user.length - 1))}@${domain}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const tail = digits.slice(-2);
  const prefix = phone.startsWith('+') ? phone.split(/[-\s]/)[0] : '';
  return `${prefix} ••• ••• ${tail}`.trim();
}

export function maskAccountNumber(n: string): string {
  return `•••• ${n.slice(-4)}`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${formatInt(n)} ${n === 1 ? one : many}`;
}
