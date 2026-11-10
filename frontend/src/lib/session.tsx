// Analyst session: who is acting (performed_by in mock mode), a toast channel,
// and a version counter that bumps whenever the shared store changes.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '../api';

export const ANALYSTS = ['Analyst01', 'Analyst02'] as const;
export type Analyst = (typeof ANALYSTS)[number];
/** performed_by and reviewed_by for automated actions, matching the SQL default of Anomaly_Patterns.reviewed_by. */
export const SYSTEM_ACTOR = 'System';
/** Options offered when assigning a reviewer. */
export const REVIEWERS = [...ANALYSTS, SYSTEM_ACTOR] as const;

const KEY = 'tracewire.analyst';

export interface ToastOptions {
  /** How long the toast stays, in ms. Small confirmations use TOAST_SHORT, undoable ones TOAST_UNDO. */
  duration?: number;
  /** An inline action, used for Undo. The toast closes when the action finishes. */
  action?: { label: string; run: () => Promise<void> | void };
}

/** Durations shared by every toast in the app. */
export const TOAST_SHORT = 2000;
export const TOAST_DEFAULT = 4200;
export const TOAST_UNDO = 7000;

interface Toast extends ToastOptions {
  id: number;
  message: string;
  tone: 'ok' | 'error';
}

interface SessionValue {
  analyst: Analyst;
  setAnalyst: (a: Analyst) => void;
  toast: (message: string, tone?: Toast['tone'], opts?: ToastOptions) => void;
  /** Bumped after any write so open views can refetch. */
  version: number;
  bump: () => void;
}

const Ctx = createContext<SessionValue | null>(null);

function readAnalyst(): Analyst {
  try {
    const v = localStorage.getItem(KEY);
    if (v && (ANALYSTS as readonly string[]).includes(v)) return v as Analyst;
  } catch {
    /* ignore */
  }
  return 'Analyst01';
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [analyst, setAnalystState] = useState<Analyst>(readAnalyst);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [version, setVersion] = useState(0);

  const setAnalyst = useCallback((a: Analyst) => {
    setAnalystState(a);
    try {
      localStorage.setItem(KEY, a);
    } catch {
      /* ignore */
    }
  }, []);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  // GOLDEN RULE 3: Offer informative feedback (one shared toast channel, timed by the size of the action)
  const toast = useCallback(
    (message: string, tone: Toast['tone'] = 'ok', opts: ToastOptions = {}) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, message, tone, ...opts }]);
      setTimeout(() => dismiss(id), opts.duration ?? (opts.action ? TOAST_UNDO : TOAST_DEFAULT));
    },
    [dismiss],
  );

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  // Live sync: any write to the store, from this tab or another, bumps version once.
  // Several writes in a row (transaction, anomaly, audit) are coalesced into one refetch.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = api.subscribe(() => {
      clearTimeout(timer);
      timer = setTimeout(() => setVersion((v) => v + 1), 60);
    });
    return () => {
      clearTimeout(timer);
      off();
    };
  }, []);

  const value = useMemo(() => ({ analyst, setAnalyst, toast, version, bump }), [analyst, setAnalyst, toast, version, bump]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <ToastItem key={t.id} t={t} onDone={() => dismiss(t.id)} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

function ToastItem({ t, onDone }: { t: Toast; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    // GOLDEN RULE 3: Offer informative feedback
    <div className={`toast toast-${t.tone}`} data-rule={t.action ? '3 6' : '3'}>
      <span className="sq" aria-hidden="true" />
      <span className="toast-msg">{t.message}</span>
      {t.action && (
        // GOLDEN RULE 6: Permit easy reversal of actions (Undo reverts the data and writes an Audit_Trail row)
        <button
          type="button"
          className="btn btn-black btn-sm toast-action"
          data-rule="6"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await t.action!.run();
            } finally {
              onDone();
            }
          }}
        >
          {busy && <Loader2 size={14} className="spin" aria-hidden="true" />}
          {busy ? 'Undoing...' : t.action.label}
        </button>
      )}
    </div>
  );
}

export function useSession(): SessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession must be used inside SessionProvider');
  return v;
}

/** Scroll to top on route change. */
export function useScrollTopOnChange(key: string) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [key]);
}
