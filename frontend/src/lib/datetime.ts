// Naive DATETIME helpers. Values are compared and displayed exactly as stored.
// Nothing here goes through the browser timezone: parsing is done by hand into UTC arithmetic
// purely to compute differences, and output strings are assembled from the stored parts.

const RE = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/;

export function parseNaive(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = RE.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, h = '0', mi = '0', s = '0'] = m;
  return Date.UTC(+y, +mo - 1, +d, +h, +mi, +s);
}

/** Comparable key for sorting and range filters. Date-only "to" values extend to the end of the day. */
export function naiveKey(value: string, endOfDay = false): string {
  const v = value.trim().replace('T', ' ');
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return endOfDay ? `${v} 23:59:59` : `${v} 00:00:00`;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(v)) return `${v}:${endOfDay ? '59' : '00'}`;
  return v;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Current wall-clock time of the analyst's machine as a naive DATETIME string. */
export function nowNaive(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-08-01 09:42:15" -> "01 Aug 2026, 09:42:15". Built from the stored parts. */
export function formatNaive(value: string | null | undefined, opts: { seconds?: boolean; dateOnly?: boolean } = {}): string {
  if (!value) return '';
  const m = RE.exec(value.trim());
  if (!m) return value;
  const [, y, mo, d, h, mi, s] = m;
  const date = `${d} ${MONTHS[+mo - 1]} ${y}`;
  if (opts.dateOnly || h === undefined) return date;
  return `${date}, ${h}:${mi}${opts.seconds === false ? '' : `:${s ?? '00'}`}`;
}

/** Human gap such as "2 min", "1 h 5 min", "3 days". */
export function formatGap(ms: number): string {
  const abs = Math.abs(ms);
  const sec = Math.round(abs / 1000);
  if (sec < 60) return `${sec} s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rm = min % 60;
  if (h < 48) return rm ? `${h} h ${rm} min` : `${h} h`;
  const days = Math.round(h / 24);
  return `${days} days`;
}
