import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, Search, UserRound, X } from 'lucide-react';
import { Logo } from './Logo';
import { brand } from '../../config/brand';
import { ANALYSTS, useSession, type Analyst } from '../../lib/session';
import { USE_MOCK } from '../../api';
import { lastPath, roleOf, useCustomerSession } from '../../lib/customerSession';

export const PRIMARY_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/alerts', label: 'Alerts' },
  { to: '/disputes', label: 'Cases' },
  { to: '/risk', label: 'Risk' },
];

export const CONSOLE_LINKS = [
  { to: '/dashboard', label: 'Dashboard', hint: 'KPIs and queues' },
  { to: '/transactions', label: 'Transactions', hint: 'Every transfer' },
  { to: '/alerts', label: 'Alerts', hint: 'Anomaly_Patterns' },
  { to: '/disputes', label: 'Disputes', hint: 'Dispute_Logs' },
  { to: '/audit', label: 'Audit trail', hint: 'Audit_Trail' },
  { to: '/customers', label: 'Customers', hint: '360 profiles' },
  { to: '/risk', label: 'Risk breakdown', hint: 'Shares by dimension' },
  { to: '/replay', label: 'Case replay', hint: 'Play a case back' },
];

export const CUSTOMER_LINKS = [
  { to: '/app/dashboard', label: 'Dashboard' },
  { to: '/app/send', label: 'Send money' },
];

/** Switches between the two halves of the app. Each side keeps its own session and last page. */
function RoleSwitch() {
  const loc = useLocation();
  const navigate = useNavigate();
  const role = roleOf(loc.pathname);
  return (
    <div className="role-switch" role="group" aria-label="Switch view">
      <button type="button" aria-pressed={role === 'customer'} onClick={() => role !== 'customer' && navigate(lastPath('customer'))}>
        Customer view
      </button>
      <button type="button" aria-pressed={role === 'analyst'} onClick={() => role !== 'analyst' && navigate(lastPath('analyst'))}>
        Analyst console
      </button>
    </div>
  );
}

function CustomerTools() {
  const { session, signOut } = useCustomerSession();
  const navigate = useNavigate();
  if (!session) {
    return (
      <Link to="/login" className="btn btn-brand btn-sm nav-cta">
        Log in
      </Link>
    );
  }
  return (
    <>
      <span className="nav-who" title={`Signed in as customer ${session.customer_id}`}>
        <UserRound size={14} aria-hidden="true" />
        {session.customer_name}
      </span>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => {
          navigate('/');
          signOut();
        }}
      >
        <LogOut size={14} aria-hidden="true" /> Log out
      </button>
    </>
  );
}

function AnalystSwitcher({ compact }: { compact?: boolean }) {
  const { analyst, setAnalyst } = useSession();
  return (
    <label className={`analyst${compact ? ' analyst-compact' : ''}`} title={USE_MOCK ? 'Acting analyst, written to performed_by' : 'Acting analyst'}>
      <UserRound size={14} aria-hidden="true" />
      <span className="sr-only">Acting analyst</span>
      <select value={analyst} onChange={(e) => setAnalyst(e.target.value as Analyst)}>
        {ANALYSTS.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
    </label>
  );
}

function ConsoleMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    setTimeout(() => ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus(), 0);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  const onKey = (e: React.KeyboardEvent) => {
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(i + 1) % items.length]?.focus();
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(i - 1 + items.length) % items.length]?.focus();
    }
    if (e.key === 'Escape') {
      setOpen(false);
      ref.current?.querySelector<HTMLElement>('.nav-console')?.focus();
    }
  };
  return (
    <div className="console-wrap" ref={ref} onKeyDown={onKey}>
      <button type="button" className="nav-console" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Console <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div className="menu console-menu" role="menu" aria-label="Console pages">
          {CONSOLE_LINKS.map((l) => (
            <button
              type="button"
              role="menuitem"
              key={l.to}
              className="menu-item"
              aria-current={loc.pathname.startsWith(l.to) ? 'true' : undefined}
              onClick={() => navigate(l.to)}
            >
              <span className="sq" aria-hidden="true" />
              <span style={{ flex: 1 }}>{l.label}</span>
              <span className="muted mono" style={{ fontSize: 11 }}>
                {l.hint}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Nav({ onSearch }: { onSearch: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setMobileOpen(false), [loc.pathname]);
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobileOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  const customerSide = roleOf(loc.pathname) === 'customer';
  const { session } = useCustomerSession();
  const primary = customerSide ? (session ? CUSTOMER_LINKS : []) : PRIMARY_LINKS;
  const menuLinks = customerSide ? (session ? CUSTOMER_LINKS : [{ to: '/login', label: 'Log in' }, { to: '/signup', label: 'Sign up' }]) : CONSOLE_LINKS;

  return (
    <header className="nav-shell">
      <nav className="nav" aria-label="Main">
        <Link to="/" className="nav-logo" aria-label={`${brand.name} home`}>
          <Logo />
        </Link>
        <ul className="nav-links">
          {primary.map((l) => (
            <li key={l.to}>
              <NavLink to={l.to}>{l.label}</NavLink>
            </li>
          ))}
        </ul>
        <div className="nav-tools">
          <RoleSwitch />
          {customerSide ? (
            <CustomerTools />
          ) : (
            <>
              <button type="button" className="nav-icon" onClick={onSearch} aria-label={`Search (${isMac ? 'Command' : 'Control'} K)`} title={`Search, ${isMac ? 'Cmd' : 'Ctrl'}+K`}>
                <Search size={16} aria-hidden="true" />
              </button>
              <AnalystSwitcher compact />
              <ConsoleMenu />
            </>
          )}
        </div>
        <button type="button" className="nav-burger" aria-expanded={mobileOpen} aria-controls="mobile-menu" onClick={() => setMobileOpen((o) => !o)}>
          {mobileOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          <span className="sr-only">{mobileOpen ? 'Close menu' : 'Open menu'}</span>
        </button>
      </nav>
      {mobileOpen && (
        <div className="mobile-menu" id="mobile-menu">
          <RoleSwitch />
          <ul>
            {menuLinks.map((l) => (
              <li key={l.to}>
                <NavLink to={l.to}>
                  <span className="sq" aria-hidden="true" /> {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="mobile-tools">
            {customerSide ? (
              <CustomerTools />
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setMobileOpen(false);
                    onSearch();
                  }}
                >
                  <Search size={14} aria-hidden="true" /> Search
                </button>
                <AnalystSwitcher />
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
