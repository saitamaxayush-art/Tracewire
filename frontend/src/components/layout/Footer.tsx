import { useState } from 'react';
import { Link } from 'react-router-dom';
import { brand } from '../../config/brand';
import { LogoMark } from './Logo';
import { api, USE_MOCK } from '../../api';
import { useSession } from '../../lib/session';
import { Modal } from '../ui';

const COLUMNS = [
  {
    title: 'Console',
    links: [
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/transactions', label: 'Transactions' },
      { to: '/alerts', label: 'Alerts' },
      { to: '/disputes', label: 'Disputes' },
      { to: '/audit', label: 'Audit trail' },
    ],
  },
  {
    title: 'Analyse',
    links: [
      { to: '/risk', label: 'Risk breakdown' },
      { to: '/replay', label: 'Case replay' },
      { to: '/customers', label: 'Customers' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { to: '/privacy', label: 'Privacy Policy' },
      { to: '/terms', label: 'Terms of Use' },
    ],
  },
];

export function Footer() {
  const { toast, bump } = useSession();
  const [confirm, setConfirm] = useState(false);
  return (
    <footer className="footer">
      <div className="footer-top wrap">
        <div className="footer-brand">
          <span className="logo logo-on-brand">
            <LogoMark size={26} />
            <span className="logo-word">{brand.name}</span>
          </span>
          <p>
            {brand.tagline}. A {brand.courseLabel} built on six linked tables: Customers, Accounts, Transactions, Anomaly_Patterns, Dispute_Logs and Audit_Trail.
          </p>
          {USE_MOCK && (
            <button type="button" className="btn btn-sm footer-reset" onClick={() => setConfirm(true)}>
              Reset local changes
            </button>
          )}
        </div>
        <div className="footer-cols">
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <h2>{c.title}</h2>
              <ul>
                {c.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="footer-meta wrap">
        <span>Fictional records created for coursework. Not a bank, not financial advice.</span>
        <span className="mono">{USE_MOCK ? 'Data source: local JSON seed' : 'Data source: live API'}</span>
      </div>
      <div className="footer-word" aria-hidden="true">
        {brand.name}
      </div>
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Reset local changes?">
        <p className="muted" style={{ marginBottom: 18 }}>
          This removes every change made in this browser (resolved alerts, filed disputes, audit entries) and reloads the original rows from the SQL seed.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={() => setConfirm(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={async () => {
              await api.resetData();
              setConfirm(false);
              bump();
              toast('Local changes cleared. Records restored from the SQL seed.');
            }}
          >
            Reset data
          </button>
        </div>
      </Modal>
    </footer>
  );
}
