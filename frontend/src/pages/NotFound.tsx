import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function NotFound({ what }: { what?: string }) {
  const loc = useLocation();
  return (
    <div className="app-page wrap notfound dot-grid">
      <p className="nf-code mono" aria-hidden="true">
        404
      </p>
      <h1>{what ? `${what} was not found.` : 'This page does not exist.'}</h1>
      <p className="page-sub">
        {what ? 'No row matches that key in the data layer. It may have been removed, or the link has a typo.' : <>Nothing is routed at <span className="mono">{loc.pathname}</span>.</>}
      </p>
      <div className="page-actions" style={{ marginTop: 28 }}>
        <Link to="/dashboard" className="btn btn-brand">
          Open dashboard <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <Link to="/" className="btn btn-ghost">
          Back to home
        </Link>
      </div>
    </div>
  );
}
