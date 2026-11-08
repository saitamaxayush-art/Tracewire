import type { ListResponse, PageParams } from '../api/types';

function cell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv<T extends object>(rows: T[], columns: (keyof T)[]): string {
  const head = columns.map((c) => cell(c)).join(',');
  const body = rows.map((r) => columns.map((c) => cell(r[c])).join(','));
  return [head, ...body].join('\r\n');
}

export function downloadText(filename: string, text: string, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Fetch every page of a list endpoint for export. */
export async function fetchAll<T, Q extends PageParams>(fn: (q: Q) => Promise<ListResponse<T>>, q: NoInfer<Q>): Promise<T[]> {
  const page_size = 500;
  const first = await fn({ ...q, page: 1, page_size });
  const out = [...first.data];
  const pages = Math.ceil(first.total / page_size);
  for (let p = 2; p <= pages; p++) out.push(...(await fn({ ...q, page: p, page_size })).data);
  return out;
}
