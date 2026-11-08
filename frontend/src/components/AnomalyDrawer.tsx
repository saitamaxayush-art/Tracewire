import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, PlayCircle, RotateCcw, UserPlus } from 'lucide-react';
import { ACTION_TAKEN, ACTION_TAKEN_LABEL, type ActionTaken } from '../constants/enums';
import { familyInfo, ruleFamily } from '../constants/ruleFamilies';
import { assignReviewer, changeAnomalyAction, reopenAnomaly, resolveAnomaly } from '../api/actions';
import { ANALYSTS, useSession } from '../lib/session';
import type { AnomalyPattern } from '../types/db';
import { ActionChip, DateTime, Drawer, Id, Money, ResolvedChip, SeverityChip, Select, Dash } from './ui';
import { RiskGauge } from './charts/RiskGauge';
import { formatScore } from '../lib/format';

export function AnomalyDrawer({ anomaly, onClose, onChanged }: { anomaly: AnomalyPattern | null; onClose: () => void; onChanged: (a: AnomalyPattern) => void }) {
  const { analyst, toast, bump } = useSession();
  const [notes, setNotes] = useState('');
  const [notesError, setNotesError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [action, setAction] = useState<ActionTaken | ''>('');
  const [reviewer, setReviewer] = useState('');
  const [reviewerError, setReviewerError] = useState('');

  useEffect(() => {
    setNotes('');
    setNotesError('');
    setAction(anomaly?.action_taken ?? '');
    setReviewer('');
    setReviewerError('');
  }, [anomaly?.anomaly_id, anomaly?.action_taken]);

  const run = async (key: string, fn: () => Promise<AnomalyPattern>, ok: string) => {
    setBusy(key);
    try {
      const updated = await fn();
      onChanged(updated);
      bump();
      toast(`${ok} Audit_Trail entry written by ${analyst}.`);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  if (!anomaly) return <Drawer open={false} onClose={onClose} title="">{null}</Drawer>;
  const a = anomaly;
  const fam = familyInfo(ruleFamily(a.rule_code));

  return (
    <Drawer
      open
      onClose={onClose}
      title={<span className="mono">{a.rule_code}</span>}
      subtitle={
        <>
          Anomaly {a.anomaly_id} on <span className="mono">{a.transaction_ref}</span>
        </>
      }
      footer={
        <>
          <Link to={`/replay/${a.transaction_ref}`} className="btn btn-brand">
            <PlayCircle size={16} aria-hidden="true" /> Replay case
          </Link>
          <Link to={`/transactions?open=${a.transaction_ref}`} className="btn btn-ghost">
            Open transaction
          </Link>
        </>
      }
    >
      <section className="drawer-gauge">
        <RiskGauge score={a.risk_score} severity={a.severity_level} caption={`risk_score ${formatScore(a.risk_score)}, severity ${a.severity_level}`} />
      </section>
      <section>
        <h3 className="section-title">
          <span className="sq" aria-hidden="true" />
          Alert
        </h3>
        <dl className="kv">
          <dt>flag_reason</dt>
          <dd>{a.flag_reason}</dd>
          <dt>Rule family</dt>
          <dd>
            <span className="mono">{fam.key}</span> {fam.name}
          </dd>
          <dt>Severity</dt>
          <dd>
            <SeverityChip level={a.severity_level} />
          </dd>
          <dt>Action taken</dt>
          <dd>
            <ActionChip action={a.action_taken} />
          </dd>
          <dt>Flagged amount</dt>
          <dd>
            <Money amount={a.flagged_amount} currency={a.currency} />
          </dd>
          <dt>Status</dt>
          <dd>
            <ResolvedChip resolved={a.is_resolved} />
          </dd>
          <dt>reviewed_by</dt>
          <dd className="mono">{a.reviewed_by}</dd>
          <dt>resolution_notes</dt>
          <dd>{a.resolution_notes ?? <Dash />}</dd>
          <dt>detected_at</dt>
          <dd>
            <DateTime value={a.detected_at} />
          </dd>
          <dt>resolved_at</dt>
          <dd>
            <DateTime value={a.resolved_at} />
          </dd>
          <dt>customer_id</dt>
          <dd>
            <Link className="row-link" to={`/customers/${a.customer_id}`}>
              <Id>{a.customer_id}</Id>
            </Link>
          </dd>
        </dl>
      </section>

      <section aria-labelledby="act-resolve">
        <h3 className="section-title" id="act-resolve">
          <span className="sq" aria-hidden="true" />
          {a.is_resolved ? 'Reopen' : 'Mark resolved'}
        </h3>
        {a.is_resolved ? (
          <button type="button" className="btn btn-ghost" disabled={busy !== null} onClick={() => run('reopen', () => reopenAnomaly(a, analyst), 'Alert reopened.')}>
            <RotateCcw size={16} aria-hidden="true" /> {busy === 'reopen' ? 'Saving...' : 'Reopen alert'}
          </button>
        ) : (
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              if (!notes.trim()) {
                setNotesError('Resolution notes are required.');
                return;
              }
              run('resolve', () => resolveAnomaly(a, notes, analyst), 'Alert marked resolved.');
            }}
          >
            <label className="field">
              <span>Resolution notes (required)</span>
              <textarea
                className="textarea"
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  if (e.target.value.trim()) setNotesError('');
                }}
                aria-invalid={Boolean(notesError)}
                aria-describedby="notes-err"
                maxLength={2000}
                placeholder={a.resolution_notes ? `Current note: ${a.resolution_notes}` : 'What did the review find?'}
              />
              <span id="notes-err" className="field-error" role="alert">
                {notesError}
              </span>
            </label>
            <button type="submit" className="btn btn-brand" disabled={busy !== null}>
              <CheckCircle2 size={16} aria-hidden="true" /> {busy === 'resolve' ? 'Saving...' : 'Mark resolved'}
            </button>
          </form>
        )}
      </section>

      <section aria-labelledby="act-action">
        <h3 className="section-title" id="act-action">
          <span className="sq" aria-hidden="true" />
          Change action_taken
        </h3>
        <form
          className="row-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (action && action !== a.action_taken) run('action', () => changeAnomalyAction(a, action, analyst), `Action set to ${ACTION_TAKEN_LABEL[action]}.`);
          }}
        >
          <label className="field" style={{ flex: 1 }}>
            <span className="sr-only">Action taken</span>
            <Select value={action} onChange={(e) => setAction(e.target.value as ActionTaken)} options={ACTION_TAKEN.map((v) => ({ value: v, label: ACTION_TAKEN_LABEL[v] }))} />
          </label>
          <button type="submit" className={`btn ${action === 'Block_Permanent' ? 'btn-danger' : 'btn-white'}`} disabled={busy !== null || !action || action === a.action_taken}>
            {busy === 'action' ? 'Saving...' : 'Apply'}
          </button>
        </form>
      </section>

      <section aria-labelledby="act-assign">
        <h3 className="section-title" id="act-assign">
          <span className="sq" aria-hidden="true" />
          Assign reviewer
        </h3>
        <form
          className="row-form"
          onSubmit={(e) => {
            e.preventDefault();
            const r = reviewer.trim();
            if (!r) return setReviewerError('Pick or type a reviewer.');
            if (r.length > 100) return setReviewerError('reviewed_by holds at most 100 characters.');
            if (r === a.reviewed_by) return setReviewerError(`${r} is already the reviewer.`);
            run('assign', () => assignReviewer(a, r, analyst), `Assigned to ${r}.`);
          }}
        >
          <label className="field" style={{ flex: 1 }}>
            <span className="sr-only">Reviewer</span>
            <input
              className="input"
              list="reviewer-options"
              value={reviewer}
              onChange={(e) => {
                setReviewer(e.target.value);
                setReviewerError('');
              }}
              placeholder={`Current: ${a.reviewed_by}`}
              aria-invalid={Boolean(reviewerError)}
              aria-describedby="rev-err"
              maxLength={100}
            />
            <datalist id="reviewer-options">
              {ANALYSTS.map((x) => (
                <option key={x} value={x} />
              ))}
            </datalist>
          </label>
          <button type="button" className="btn btn-ghost" onClick={() => setReviewer(analyst)} title="Assign to yourself">
            Me
          </button>
          <button type="submit" className="btn btn-white" disabled={busy !== null}>
            <UserPlus size={16} aria-hidden="true" /> {busy === 'assign' ? 'Saving...' : 'Assign'}
          </button>
        </form>
        <span id="rev-err" className="field-error" role="alert">
          {reviewerError}
        </span>
      </section>
    </Drawer>
  );
}
