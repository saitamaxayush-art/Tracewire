import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CornerDownLeft, Search } from 'lucide-react';
import { api } from '../../api';
import { useDebounced } from '../../lib/hooks';
import { CONSOLE_LINKS } from './Nav';
import { formatMoney } from '../../lib/format';

interface Result {
  id: string;
  group: string;
  title: string;
  meta: string;
  to: string;
}

async function runSearch(q: string): Promise<Result[]> {
  const [customers, accounts, txs, anomalies] = await Promise.all([
    api.listCustomers({ search: q, page_size: 6 }),
    /^\d{3,}$/.test(q) ? api.listAccounts({ search: q, page_size: 6 }) : Promise.resolve({ data: [], page: 1, page_size: 6, total: 0 }),
    api.listTransactions({ search: q, page_size: 6 }),
    api.listAnomalies({ search: q, page_size: 6 }),
  ]);
  const out: Result[] = [];
  for (const c of customers.data) out.push({ id: `c${c.customer_id}`, group: 'Customers', title: c.customer_name, meta: `${c.customer_id} · ${c.country}`, to: `/customers/${c.customer_id}` });
  for (const a of accounts.data) out.push({ id: `a${a.account_id}`, group: 'Accounts', title: `Account ${a.account_number}`, meta: `${a.account_type} · ${a.currency}`, to: `/customers/${a.customer_id}` });
  for (const t of txs.data)
    out.push({ id: `t${t.transaction_ref}`, group: 'Transactions', title: t.transaction_ref, meta: `${t.status} · ${formatMoney(t.amount, t.currency)}`, to: `/transactions?open=${t.transaction_ref}` });
  const ql = q.toLowerCase();
  for (const a of anomalies.data.filter((x) => x.rule_code.toLowerCase().includes(ql)))
    out.push({ id: `r${a.anomaly_id}`, group: 'Rule codes', title: a.rule_code, meta: `${a.severity_level} · ${a.transaction_ref}`, to: `/alerts?open=${a.anomaly_id}` });
  return out;
}

export function Spotlight({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const dq = useDebounced(q.trim(), 160);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  /** Enter pressed while results were still loading: open the first result once they arrive. */
  const pendingEnter = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      pendingEnter.current = false;
      setQ('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  useEffect(() => {
    if (!dq) {
      setResults([]);
      setError(null);
      return;
    }
    let alive = true;
    setLoading(true);
    runSearch(dq)
      .then((r) => {
        if (!alive) return;
        setResults(r);
        setError(null);
        setActive(0);
        if (pendingEnter.current) {
          pendingEnter.current = false;
          if (r[0]) {
            onClose();
            navigate(r[0].to);
          }
        }
      })
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);

  const list: Result[] = useMemo(
    () => (dq ? results : CONSOLE_LINKS.map((l) => ({ id: l.to, group: 'Go to', title: l.label, meta: l.hint, to: l.to }))),
    [dq, results],
  );

  const groups = useMemo(() => {
    const m = new Map<string, Result[]>();
    for (const r of list) m.set(r.group, [...(m.get(r.group) ?? []), r]);
    return [...m.entries()];
  }, [list]);

  if (!open) return null;

  const go = (r: Result | undefined) => {
    if (!r) return;
    onClose();
    navigate(r.to);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(list.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (q.trim() && (q.trim() !== dq || loading)) pendingEnter.current = true;
      else go(list[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Tab') {
      e.preventDefault();
    }
  };

  let idx = -1;
  return createPortal(
    <div className="spot-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="spot" role="dialog" aria-modal="true" aria-label="Search records" onKeyDown={onKey}>
        <div className="spot-field">
          <Search size={20} aria-hidden="true" />
          <input
            ref={inputRef}
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Customer, email, account number, transaction ref or rule code"
            aria-label="Search records"
            role="combobox"
            aria-expanded="true"
            aria-controls="spot-list"
            aria-activedescendant={list[active] ? `spot-${list[active].id}` : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd>Esc</kbd>
        </div>
        <div className="spot-list" id="spot-list" role="listbox" aria-label="Results">
          {error && <p className="spot-empty">Search failed: {error}</p>}
          {!error && dq && !loading && list.length === 0 && <p className="spot-empty">No customer, account, transaction or rule code matches "{dq}".</p>}
          {!error && dq && loading && list.length === 0 && <p className="spot-empty">Searching...</p>}
          {groups.map(([g, items]) => (
            <div key={g} role="group" aria-label={g}>
              <div className="spot-group">{g}</div>
              {items.map((r) => {
                idx += 1;
                const i = idx;
                return (
                  <div
                    key={r.id}
                    id={`spot-${r.id}`}
                    role="option"
                    aria-selected={i === active}
                    className="spot-item"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(r)}
                  >
                    <span className="sq" aria-hidden="true" />
                    <span className="spot-title mono">{r.title}</span>
                    <span className="spot-meta">{r.meta}</span>
                    {i === active ? <CornerDownLeft size={14} aria-hidden="true" /> : <ArrowRight size={14} aria-hidden="true" className="muted" />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="spot-foot">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> to move
          </span>
          <span>
            <kbd>Enter</kbd> to open
          </span>
          <span>
            <kbd>Esc</kbd> to close
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
