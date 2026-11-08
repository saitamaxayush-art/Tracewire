import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type SelectHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ArrowDown, ArrowUp, ChevronDown, ChevronLeft, ChevronRight, Inbox, RotateCw, X } from 'lucide-react';
import {
  ACTION_TOKEN,
  DISPUTE_STATUS_TOKEN,
  SEVERITY_TOKEN,
  STATUS_TOKEN,
  isSeverity,
  label,
  type ActionTaken,
  type DisputeStatus,
  type TransactionStatus,
} from '../constants/enums';
import { formatMoney, formatInt } from '../lib/format';
import { formatNaive } from '../lib/datetime';

// ---------- Chips ----------

export function Chip({ color, text, ring, mono, title }: { color: string; text: string; ring?: boolean; mono?: boolean; title?: string }) {
  return (
    <span className={`chip${mono ? ' chip-mono' : ''}`} title={title}>
      <span className={`dot${ring ? ' ring' : ''}`} style={{ background: color }} aria-hidden="true" />
      {text}
    </span>
  );
}

export function SeverityChip({ level }: { level: string | null | undefined }) {
  if (!level) return <Dash />;
  if (!isSeverity(level)) return <Chip color="var(--muted)" text={level} />;
  return <Chip color={SEVERITY_TOKEN[level]} text={level} ring={level === 'Catastrophic'} />;
}

export function StatusChip({ status }: { status: TransactionStatus }) {
  return <Chip color={STATUS_TOKEN[status] ?? 'var(--muted)'} text={status} />;
}

export function DisputeStatusChip({ status }: { status: DisputeStatus }) {
  return <Chip color={DISPUTE_STATUS_TOKEN[status] ?? 'var(--muted)'} text={status} />;
}

export function ActionChip({ action }: { action: ActionTaken }) {
  return <Chip color={ACTION_TOKEN[action] ?? 'var(--muted)'} text={label(action)} ring={action === 'Block_Permanent'} />;
}

export function ResolvedChip({ resolved }: { resolved: boolean }) {
  return <Chip color={resolved ? 'var(--st-success)' : 'var(--st-pending)'} text={resolved ? 'Resolved' : 'Unresolved'} />;
}

// ---------- Values ----------

export function Dash({ label: l = 'Not recorded' }: { label?: string }) {
  return (
    <span className="muted" aria-label={l} title={l}>
      -
    </span>
  );
}

export function Money({ amount, currency, compact }: { amount: number | null | undefined; currency: string; compact?: boolean }) {
  if (amount == null) return <Dash />;
  return <span className="mono num">{formatMoney(amount, currency, { compact })}</span>;
}

export function DateTime({ value, seconds = true }: { value: string | null | undefined; seconds?: boolean }) {
  if (!value) return <Dash />;
  return (
    <time className="mono num" dateTime={value.replace(' ', 'T')} title={value}>
      {formatNaive(value, { seconds })}
    </time>
  );
}

export function Id({ children }: { children: ReactNode }) {
  return <span className="mono">{children}</span>;
}

// ---------- Select ----------

export function Select({
  options,
  placeholder,
  className = '',
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <span className="select-wrap">
      <select className={`select ${className}`} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={15} aria-hidden="true" />
    </span>
  );
}

// ---------- States ----------

export function SkeletonRows({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" role="status" style={{ padding: '6px 16px 16px' }}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
          {Array.from({ length: cols }).map((__, c) => (
            <div key={c} className="skeleton" style={{ height: 12, width: `${55 + ((r * 7 + c * 13) % 40)}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonBlock({ height = 120 }: { height?: number }) {
  return <div className="skeleton" role="status" aria-label="Loading" style={{ height, width: '100%' }} />;
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="state">
      <Inbox size={22} className="muted" aria-hidden="true" />
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="state state-error" role="alert">
      <AlertTriangle size={22} className="state-icon" aria-hidden="true" />
      <h3>The data could not be loaded</h3>
      <p>{error.message}</p>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
        <RotateCw size={14} aria-hidden="true" /> Retry
      </button>
    </div>
  );
}

/** Renders loading, error, empty or the content. */
export function DataView<T>({
  state,
  isEmpty,
  skeleton,
  empty,
  children,
}: {
  state: { data: T | undefined; error: Error | undefined; loading: boolean; reload: () => void };
  isEmpty?: (d: T) => boolean;
  skeleton?: ReactNode;
  empty?: ReactNode;
  children: (d: T) => ReactNode;
}) {
  if (state.error) return <ErrorState error={state.error} onRetry={state.reload} />;
  if (state.data === undefined) return <>{skeleton ?? <SkeletonRows />}</>;
  if (isEmpty?.(state.data)) return <>{empty ?? <EmptyState title="Nothing matches these filters" body="Clear a filter or widen the range to see more records." />}</>;
  return <div style={{ opacity: state.loading ? 0.55 : 1, transition: 'opacity .15s' }}>{children(state.data)}</div>;
}

// ---------- Sorting and paging ----------

export function SortHeader({ field, sort, onSort, children, align }: { field: string; sort: string; onSort: (s: string) => void; children: ReactNode; align?: 'r' }) {
  const active = sort.replace(/^-/, '') === field;
  const desc = active && sort.startsWith('-');
  return (
    <th className={align} aria-sort={active ? (desc ? 'descending' : 'ascending') : 'none'}>
      <button type="button" className="th-sort" data-active={active} onClick={() => onSort(active && !desc ? `-${field}` : field)}>
        {children}
        {active ? desc ? <ArrowDown size={12} aria-hidden="true" /> : <ArrowUp size={12} aria-hidden="true" /> : null}
      </button>
    </th>
  );
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(total, page * pageSize);
  return (
    <nav className="pager" aria-label="Pagination">
      <span className="num">
        {formatInt(from)} to {formatInt(to)} of {formatInt(total)}
      </span>
      <div className="pager-btns">
        <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <span className="num" aria-current="page">
          Page {page} of {pages}
        </span>
        <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Next page">
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}

// ---------- Overlays ----------

function useFocusTrap(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const focusables = () =>
      Array.from(el?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])') ?? []);
    setTimeout(() => {
      // Do not pull focus out of another dialog, such as the search overlay, that opened first.
      if (document.activeElement?.closest('.spot, .modal')) return;
      (el?.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0])?.focus();
    }, 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
      }
      if (e.key === 'Tab') {
        const f = focusables();
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open]);
  return ref;
}

export function Drawer({ open, onClose, title, subtitle, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const ref = useFocusTrap(open, onClose);
  const id = useId();
  if (!open) return null;
  return createPortal(
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="drawer" role="dialog" aria-modal="true" aria-labelledby={id} ref={ref}>
        <div className="drawer-head">
          <div>
            <h2 id={id}>{title}</h2>
            {subtitle && <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>{subtitle}</div>}
          </div>
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={onClose} aria-label="Close panel">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </div>
    </>,
    document.body,
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useFocusTrap(open, onClose);
  const id = useId();
  if (!open) return null;
  return createPortal(
    <>
      <div className="modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={id} ref={ref}>
        <div className="drawer-head">
          <h2 id={id} style={{ fontSize: 20 }}>
            {title}
          </h2>
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={onClose} aria-label="Close dialog">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </>,
    document.body,
  );
}

/** Button that opens a keyboard-navigable menu. The menu renders in a portal so table overflow cannot clip it. */
export function MenuButton({
  label: buttonLabel,
  items,
  className = 'btn btn-ghost btn-sm',
  align = 'left',
  disabled,
}: {
  label: ReactNode;
  items: { key: string; label: ReactNode; onSelect: () => void; disabled?: boolean; current?: boolean }[];
  className?: string;
  align?: 'left' | 'right';
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number }>({ top: 0 });
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();

  const place = () => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom > 260;
    const top = below ? r.bottom + 6 : Math.max(8, r.top - 6 - (menu.current?.offsetHeight ?? 240));
    setPos(align === 'right' ? { top, right: Math.max(8, window.innerWidth - r.right) } : { top, left: Math.max(8, r.left) });
  };

  useEffect(() => {
    if (!open) return;
    place();
    const onDoc = (e: MouseEvent) => {
      if (!menu.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    const t = setTimeout(() => {
      place();
      menu.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus();
    }, 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const list = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []);
    const i = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      list[(i + 1) % list.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      list[(i - 1 + list.length) % list.length]?.focus();
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      btn.current?.focus();
    }
  };

  return (
    <>
      <button ref={btn} type="button" className={className} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen((o) => !o)} disabled={disabled}>
        {buttonLabel} <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div ref={menu} className="menu" role="menu" id={id} style={{ position: 'fixed', ...pos, zIndex: 950 }} onKeyDown={onKey}>
            {items.map((it) => (
              <button
                key={it.key}
                type="button"
                role="menuitem"
                className="menu-item"
                disabled={it.disabled}
                aria-current={it.current ? 'true' : undefined}
                onClick={() => {
                  setOpen(false);
                  btn.current?.focus();
                  it.onSelect();
                }}
              >
                {it.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

// ---------- Decorations ----------

export function Corners() {
  return (
    <>
      <span className="corner tl" aria-hidden="true" />
      <span className="corner tr" aria-hidden="true" />
      <span className="corner bl" aria-hidden="true" />
      <span className="corner br" aria-hidden="true" />
    </>
  );
}

export function PageHead({ eyebrow, title, sub, actions }: { eyebrow: string; title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <span className="eyebrow">
          <span className="sq" aria-hidden="true" />
          {eyebrow}
        </span>
        <h1>{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}
