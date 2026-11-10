import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, PlayCircle, RotateCcw, UserPlus } from 'lucide-react';
import { ACTION_TAKEN, ACTION_TAKEN_LABEL, type ActionTaken } from '../constants/enums';
import { familyInfo, ruleFamily } from '../constants/ruleFamilies';
import { assignReviewer, changeAnomalyAction, reopenAnomaly, resolveAnomaly, undoResolveAnomaly } from '../api/actions';
import { REVIEWERS, useSession, type ToastOptions } from '../lib/session';
import type { AnomalyPattern } from '../types/db';
import { ActionChip, Busy, ConfirmDialog, DateTime, Drawer, Id, Money, ResolvedChip, SeverityChip, Select, Dash } from './ui';
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
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [ack, setAck] = useState('');

  useEffect(() => {
    setNotes('');
    setNotesError('');
    setAction(anomaly?.action_taken ?? '');
    setReviewer('');
    setReviewerError('');
    setConfirmBlock(false);
  }, [anomaly?.anomaly_id, anomaly?.action_taken]);
  useEffect(() => setAck(''), [anomaly?.anomaly_id]);

  // GOLDEN RULE 3: Offer informative feedback (each toast names the alert and transaction it changed)
  const run = async (key: string, fn: () => Promise<AnomalyPattern>, ok: string, opts?: ToastOptions) => {
    setBusy(key);
    try {
      const updated = await fn();
      onChanged(updated);
      bump();
      toast(ok, 'ok', opts);
      return true;
    } catch (e) {
      toast((e as Error).message, 'error');
      return false;
    } finally {
      setBusy(null);
    }
  };

  // GOLDEN RULE 5: Error prevention and simple error handling (checked as the analyst types, not only on submit)
  const notesProblem = (v: string) => (v.trim() ? '' : 'Resolution notes cannot be empty. Say what the review found.');
  const reviewerProblem = (v: string, current: string) => {
    const r = v.trim();
    if (!r) return 'Pick or type a reviewer.';
    if (r.length > 100) return `Reviewer name is ${r.length} characters. reviewed_by holds at most 100.`;
    if (r === current) return `${r} is already the reviewer.`;
    return '';
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
          <>
            {ack && (
              // GOLDEN RULE 4: Design dialogs to yield closure (a settled acknowledgement before the panel closes)
              <div className="notice notice-ok" role="status" data-rule="4">
                <CheckCircle2 size={18} aria-hidden="true" />
                <div className="notice-body">
                  <strong>{ack}</strong>
                  <span className="notice-reason">Audit_Trail entry written by {analyst}. Use Undo in the notice to reverse it.</span>
                </div>
                <button type="button" className="btn btn-white btn-sm" onClick={onClose}>
                  Close panel
                </button>
              </div>
            )}
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy !== null}
              onClick={() => run('reopen', () => reopenAnomaly(a, analyst), `Alert ${a.anomaly_id} on ${a.transaction_ref} reopened.`)}
            >
              <Busy busy={busy === 'reopen'} label="Reopening...">
                <RotateCcw size={16} aria-hidden="true" /> Reopen alert
              </Busy>
            </button>
          </>
        ) : (
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const problem = notesProblem(notes);
              setNotesError(problem);
              if (problem) return;
              const before = a;
              const msg = `Alert ${a.anomaly_id} on ${a.transaction_ref} marked resolved.`;
              const ok = await run('resolve', () => resolveAnomaly(a, notes, analyst), msg, {
                // GOLDEN RULE 6: Permit easy reversal of actions
                action: {
                  label: 'Undo',
                  run: async () => {
                    try {
                      await undoResolveAnomaly(before, analyst);
                      bump();
                      toast(`Undone: alert ${before.anomaly_id} on ${before.transaction_ref} is unresolved again. Reversal logged to Audit_Trail.`);
                    } catch (err) {
                      toast(`Undo failed: ${(err as Error).message}`, 'error');
                    }
                  },
                },
              });
              if (ok) setAck(msg);
            }}
          >
            <label className="field">
              <span>Resolution notes (required)</span>
              {/* GOLDEN RULE 5: Error prevention and simple error handling */}
              <textarea
                className="textarea"
                data-rule="5"
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  if (notesError) setNotesError(notesProblem(e.target.value));
                }}
                onBlur={() => setNotesError(notesProblem(notes))}
                aria-invalid={Boolean(notesError)}
                aria-describedby="notes-err"
                maxLength={2000}
                placeholder={a.resolution_notes ? `Current note: ${a.resolution_notes}` : 'What did the review find?'}
              />
              <span id="notes-err" className="field-error" role="alert">
                {notesError}
              </span>
            </label>
            <button type="submit" className="btn btn-brand" disabled={busy !== null || Boolean(notesProblem(notes))} data-rule="5">
              <Busy busy={busy === 'resolve'} label="Resolving...">
                <CheckCircle2 size={16} aria-hidden="true" /> Mark resolved
              </Busy>
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
            if (!action || action === a.action_taken) return;
            // GOLDEN RULE 5: Error prevention and simple error handling (a permanent block asks first)
            if (action === 'Block_Permanent') return setConfirmBlock(true);
            run('action', () => changeAnomalyAction(a, action, analyst), `Alert ${a.anomaly_id} on ${a.transaction_ref}: action set to ${ACTION_TAKEN_LABEL[action]}.`);
          }}
        >
          <label className="field" style={{ flex: 1 }}>
            <span className="sr-only">Action taken</span>
            <Select value={action} onChange={(e) => setAction(e.target.value as ActionTaken)} options={ACTION_TAKEN.map((v) => ({ value: v, label: ACTION_TAKEN_LABEL[v] }))} />
          </label>
          <button type="submit" className={`btn ${action === 'Block_Permanent' ? 'btn-danger' : 'btn-white'}`} disabled={busy !== null || !action || action === a.action_taken}>
            <Busy busy={busy === 'action'} label="Applying...">
              Apply
            </Busy>
          </button>
        </form>
        <ConfirmDialog
          open={confirmBlock}
          title="Block permanently?"
          message={
            <>
              This permanently blocks <span className="mono">{a.transaction_ref}</span> for alert {a.anomaly_id}, and there is no Undo for it.
            </>
          }
          confirmLabel="Block permanently"
          busy={busy === 'action'}
          onCancel={() => setConfirmBlock(false)}
          onConfirm={async () => {
            await run('action', () => changeAnomalyAction(a, 'Block_Permanent', analyst), `Alert ${a.anomaly_id} on ${a.transaction_ref}: action set to ${ACTION_TAKEN_LABEL.Block_Permanent}.`);
            setConfirmBlock(false);
          }}
        />
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
            const problem = reviewerProblem(r, a.reviewed_by);
            setReviewerError(problem);
            if (problem) return;
            run('assign', () => assignReviewer(a, r, analyst), `Alert ${a.anomaly_id} on ${a.transaction_ref} assigned to ${r}.`);
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
                setReviewerError(e.target.value ? reviewerProblem(e.target.value, a.reviewed_by) : '');
              }}
              onBlur={() => reviewer && setReviewerError(reviewerProblem(reviewer, a.reviewed_by))}
              data-rule="5"
              placeholder={`Current: ${a.reviewed_by}`}
              aria-invalid={Boolean(reviewerError)}
              aria-describedby="rev-err"
              maxLength={100}
            />
            <datalist id="reviewer-options">
              {REVIEWERS.map((x) => (
                <option key={x} value={x} />
              ))}
            </datalist>
          </label>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setReviewer(analyst);
              setReviewerError(reviewerProblem(analyst, a.reviewed_by));
            }}
            title="Assign to yourself"
          >
            Me
          </button>
          <button type="submit" className="btn btn-white" disabled={busy !== null || Boolean(reviewerProblem(reviewer, a.reviewed_by))} data-rule="5">
            <Busy busy={busy === 'assign'} label="Assigning...">
              <UserPlus size={16} aria-hidden="true" /> Assign
            </Busy>
          </button>
        </form>
        <span id="rev-err" className="field-error" role="alert">
          {reviewerError}
        </span>
      </section>
    </Drawer>
  );
}
