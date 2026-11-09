// Customer session for the customer-facing half of the app.
// This is a mock: it stores who is signed in (customer_id, name, preferred_currency) in localStorage,
// under its own key so it never touches the analyst session. There is no token and no real authentication.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api } from '../api';
import type { AuthResult, CustomerProfile } from '../api/types';

export interface CustomerSession {
  customer_id: string;
  customer_name: string;
  preferred_currency: string;
}

const KEY = 'tracewire.customer.session';
const SEEN_PREFIX = 'tracewire.customer.seen.';

function read(): CustomerSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as CustomerSession;
    return v && typeof v.customer_id === 'string' ? v : null;
  } catch {
    return null;
  }
}

interface Value {
  session: CustomerSession | null;
  signIn: (r: AuthResult) => Promise<void>;
  signOut: () => void;
}

const Ctx = createContext<Value | null>(null);

export function CustomerSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<CustomerSession | null>(read);

  const signIn = useCallback(async (r: AuthResult) => {
    const s = { customer_id: r.customer.customer_id, customer_name: r.customer.customer_name, preferred_currency: r.customer.preferred_currency };
    // Start the alert baseline at sign-in, so only flags that happen from now on are announced.
    try {
      writeSeen(s.customer_id, alertItems(await api.getCustomer(s.customer_id)).map((a) => a.key));
    } catch {
      writeSeen(s.customer_id, []);
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* stays in memory for this tab */
    }
    setSession(s);
  }, []);

  // Storage is cleared at once; the state update waits a tick so a navigation away from /app
  // started in the same handler commits first (otherwise the /app guard redirects to /login).
  const signOut = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setTimeout(() => setSession(null), 0);
  }, []);

  const value = useMemo(() => ({ session, signIn, signOut }), [session, signIn, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCustomerSession(): Value {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCustomerSession must be used inside CustomerSessionProvider');
  return v;
}

/** Wraps every /app/* route. Without a session it sends the visitor to /login. */
export function RequireCustomer({ children }: { children: ReactNode }) {
  const { session } = useCustomerSession();
  const loc = useLocation();
  if (!session) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  return <>{children}</>;
}

/** performed_by for actions a customer takes themselves (filing a dispute, cancelling 2FA). */
export const customerActor = (customer_id: string) => `Customer ${customer_id}`;

// ---------- Flag notifications ----------

export interface AlertItem {
  /** Changes whenever the transaction status or the alert action changes, so each change is announced once. */
  key: string;
  transaction_ref: string;
  status: string;
  severity_level: string | null;
  flag_reason: string | null;
}

const STOPPING = new Set(['Flag_For_Review', 'Require_2FA', 'Block_Temporary', 'Block_Permanent']);

/** The customer's transactions that are currently flagged or blocked, from either the status or an open alert. */
export function alertItems(p: CustomerProfile): AlertItem[] {
  const out: AlertItem[] = [];
  for (const t of p.transactions) {
    const open = p.anomalies.filter((a) => a.transaction_ref === t.transaction_ref && !a.is_resolved && STOPPING.has(a.action_taken));
    const latest = [...p.anomalies.filter((a) => a.transaction_ref === t.transaction_ref)].sort((a, b) => (a.detected_at < b.detected_at ? 1 : -1))[0];
    if (t.status !== 'Flagged' && t.status !== 'Blocked' && open.length === 0) continue;
    out.push({
      key: `${t.transaction_ref}|${t.status}|${open.map((a) => `${a.anomaly_id}:${a.action_taken}`).join(',')}`,
      transaction_ref: t.transaction_ref,
      status: t.status,
      severity_level: latest?.severity_level ?? null,
      flag_reason: latest?.flag_reason ?? null,
    });
  }
  return out;
}

export function readSeen(customer_id: string): Set<string> | null {
  try {
    const raw = localStorage.getItem(SEEN_PREFIX + customer_id);
    return raw ? new Set(JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

export function writeSeen(customer_id: string, keys: Iterable<string>) {
  try {
    localStorage.setItem(SEEN_PREFIX + customer_id, JSON.stringify([...keys]));
  } catch {
    /* ignore */
  }
}

// ---------- Role switch ----------

export type Role = 'customer' | 'analyst';
const LAST_PREFIX = 'tracewire.lastpath.';

export function roleOf(pathname: string): Role | null {
  if (pathname.startsWith('/app') || pathname === '/login' || pathname === '/signup') return 'customer';
  if (/^\/(dashboard|transactions|alerts|disputes|audit|customers|risk|replay)(\/|$)/.test(pathname)) return 'analyst';
  return null;
}

export function rememberPath(role: Role, path: string) {
  try {
    localStorage.setItem(LAST_PREFIX + role, path);
  } catch {
    /* ignore */
  }
}

export function lastPath(role: Role): string {
  try {
    const v = localStorage.getItem(LAST_PREFIX + role);
    if (v && roleOf(v.split('?')[0]) === role) return v;
  } catch {
    /* ignore */
  }
  return role === 'customer' ? '/app/dashboard' : '/dashboard';
}
