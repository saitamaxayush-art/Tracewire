// Analyst session: who is acting (performed_by in mock mode) and a toast channel.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export const ANALYSTS = ['Analyst01', 'Analyst02', 'Analyst03', 'Analyst04'] as const;
export type Analyst = (typeof ANALYSTS)[number];

const KEY = 'tracewire.analyst';

interface Toast {
  id: number;
  message: string;
  tone: 'ok' | 'error';
}

interface SessionValue {
  analyst: Analyst;
  setAnalyst: (a: Analyst) => void;
  toast: (message: string, tone?: Toast['tone']) => void;
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

  const toast = useCallback((message: string, tone: Toast['tone'] = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const value = useMemo(() => ({ analyst, setAnalyst, toast, version, bump }), [analyst, setAnalyst, toast, version, bump]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            <span className="sq" aria-hidden="true" />
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
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
