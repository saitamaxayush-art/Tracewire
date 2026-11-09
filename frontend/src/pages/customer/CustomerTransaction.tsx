import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, FileWarning, ShieldAlert, ShieldCheck } from 'lucide-react';
import { api, ApiError } from '../../api';
import { cancelTwoFactor, verifyTwoFactor } from '../../api/customer';
import { useAsync } from '../../lib/hooks';
import { useSession } from '../../lib/session';
import { alertItems, customerActor, readSeen, useCustomerSession, writeSeen } from '../../lib/customerSession';
import { severityForScore, type Evaluation } from '../../lib/scoring';
import { DISPUTE_CLOSED, label } from '../../constants/enums';
import { formatMoney, formatScore, maskAccountNumber } from '../../lib/format';
import { DateTime, DisputeStatusChip, EmptyState, ErrorState, Id, Modal, Money, SeverityChip, SkeletonBlock, StatusChip } from '../../components/ui';
import { DisputeForm } from '../../components/DisputeForm';
import { DETECT_DURATION, DetectFrame, type FrameAnomaly } from '../../components/scenes/DetectScene';
import { SceneSvg, usePlayOnce } from '../../components/scenes/clock';
import type { TransactionDetail, CustomerProfile } from '../../api/types';
import type { AnomalyPattern } from '../../types/db';

/** The frame's last element settles at about 6.6 s; stop a little after that instead of the full home-page loop. */
const PLAY_MS = Math.min(DETECT_DURATION, 7200);

function latest(rows: AnomalyPattern[]) {
  return [...rows].sort((a, b) => (a.detected_at < b.detected_at ? 1 : a.detected_at > b.detected_at ? -1 : Number(b.anomaly_id) - Number(a.anomaly_id)))[0] ?? null;
}

function stopNote(a: FrameAnomaly | null, status: string) {
  if (status === 'Blocked') return 'Transfer stopped before reaching the receiver.';
  if (a?.action_taken === 'Require_2FA') return 'Held until the one-time code is confirmed.';
  return 'Held for analyst review before it reaches the receiver.';
}

/** Plays this transaction through the rule check once, using the home page Detect visuals. */
function Playback({ snapshot, evaluation, onDone }: { snapshot: TransactionDetail; evaluation?: Evaluation; onDone: () => void }) {
  const tx = snapshot.transaction;
  const flagged = tx.status !== 'Success';
  const a = latest(snapshot.anomalies);
  const auditScore = snapshot.audit.find((x) => x.risk_score != null)?.risk_score ?? null;
  const score = a?.risk_score ?? evaluation?.risk_score ?? auditScore ?? 0;
  const anomaly: FrameAnomaly = a ?? {
    risk_score: score,
    rule_code: 'No rule tripped',
    flag_reason: '',
    flagged_amount: tx.amount,
    currency: tx.currency,
    severity_level: severityForScore(score),
    action_taken: 'Allow',
  };
  const play = usePlayOnce(PLAY_MS);
  const done = play.done;
  useEffect(() => {
    if (done) onDone();
  }, [done, onDone]);

  return (
    <div className="playback">
      <div className="playback-frame">
        <SceneSvg label={`Transaction ${tx.transaction_ref} goes through the rule check with risk score ${formatScore(score)} and ends ${tx.status}.`}>
          <DetectFrame ex={{ detail: snapshot, anomaly }} cycle={flagged ? 'flagged' : 'clean'} t={play.t} still note={stopNote(anomaly, tx.status)} />
        </SceneSvg>
      </div>
      {!done && (
        <div className="playback-bar" role="status">
          <span>Running the rule check on {tx.transaction_ref}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={play.skip}>
            Skip to result
          </button>
        </div>
      )}
    </div>
  );
}

function Signals({ evaluation }: { evaluation?: Evaluation }) {
  if (!evaluation?.signals.length) return null;
  return (
    <div className="signals">
      <h3 className="section-title">
        <span className="sq" aria-hidden="true" />
        What the check found
      </h3>
      <ul>
        {evaluation.signals.map((s) => (
          <li key={s.key}>
            <span>{s.reason}</span>
            <span className="mono muted">+{formatScore(s.weight)}</span>
          </li>
        ))}
      </ul>
      <p className="muted" style={{ fontSize: 12.5 }}>
        Total risk_score {formatScore(evaluation.risk_score)} of 100.
      </p>
    </div>
  );
}

function TwoFactor({ onVerify, onCancel, busy }: { onVerify: () => void; onCancel: () => void; busy: boolean }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    // Demo only: any six digits are accepted. No code is sent or checked.
    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code.');
    onVerify();
  };
  return (
    <form className="otp" onSubmit={submit} noValidate>
      <label className="field">
        <span>One-time code</span>
        <input
          className="input mono otp-input"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
            setError('');
          }}
          aria-invalid={Boolean(error)}
          aria-describedby="otp-hint otp-err"
        />
        <span className="field-hint" id="otp-hint">
          Demo step: any six digits are accepted.
        </span>
        <span className="field-error" id="otp-err" role="alert">
          {error}
        </span>
      </label>
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
          Cancel transfer check
        </button>
        <button type="submit" className="btn btn-brand" disabled={busy}>
          {busy ? 'Verifying...' : 'Verify and send'}
        </button>
      </div>
    </form>
  );
}

function Result({ d, evaluation, customerId, customerName }: { d: TransactionDetail; evaluation?: Evaluation; customerId: string; customerName: string }) {
  const { toast } = useSession();
  const tx = d.transaction;
  const open = latest(d.anomalies.filter((a) => !a.is_resolved));
  const shown = open ?? latest(d.anomalies);
  const isSender = d.sender_customer?.customer_id === customerId;
  const [busy, setBusy] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const openDispute = d.disputes.find((x) => !DISPUTE_CLOSED.includes(x.dispute_status));
  const needs2fa = tx.status === 'Flagged' && open?.action_taken === 'Require_2FA' && isSender;

  const verify = async () => {
    if (!open) return;
    setBusy(true);
    try {
      await verifyTwoFactor(tx, open);
      toast(`${tx.transaction_ref} verified and sent.`);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };
  const cancel = async () => {
    if (!open) return;
    setBusy(true);
    try {
      await cancelTwoFactor(tx, open);
      setCancelled(true);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const disputeButton = openDispute ? (
    <p className="result-note">
      Dispute {openDispute.dispute_id} is <DisputeStatusChip status={openDispute.dispute_status} />. An analyst is handling it.
    </p>
  ) : (
    <button type="button" className="btn btn-white" onClick={() => setDisputeOpen(true)}>
      <FileWarning size={16} aria-hidden="true" /> File a dispute
    </button>
  );

  let body;
  if (tx.status === 'Success') {
    const acc = isSender ? d.sender_account : d.receiver_account;
    body = (
      <>
        <div className="result-title result-ok">
          <CheckCircle2 size={22} aria-hidden="true" />
          <h2>{isSender ? 'Transfer sent' : 'Transfer received'}</h2>
        </div>
        <dl className="kv">
          <dt>transaction_ref</dt>
          <dd>
            <Id>{tx.transaction_ref}</Id>
          </dd>
          <dt>Amount</dt>
          <dd className="mono">
            <Money amount={tx.amount} currency={tx.currency} />
          </dd>
          {acc && (
            <>
              <dt>{isSender ? 'Balance now' : 'Account balance'}</dt>
              <dd className="mono">
                <Money amount={acc.balance} currency={acc.currency} />
                {isSender && acc.currency !== tx.currency && <span className="cell-sub">Not debited: the account holds {acc.currency} and no exchange rate is stored.</span>}
              </dd>
            </>
          )}
        </dl>
        {shown?.is_resolved && shown.action_taken === 'Allow' && shown.resolution_notes && <p className="result-note">{shown.resolution_notes}</p>}
      </>
    );
  } else if (needs2fa && !cancelled) {
    body = (
      <>
        <div className="result-title result-hold">
          <ShieldCheck size={22} aria-hidden="true" />
          <h2>Confirm it is you</h2>
        </div>
        <p>
          This transfer of <Money amount={tx.amount} currency={tx.currency} /> scored <span className="mono">{formatScore(open!.risk_score)}</span>, which needs a one-time code before it is sent.
        </p>
        <p className="result-reason">{open!.flag_reason}</p>
        <TwoFactor onVerify={verify} onCancel={cancel} busy={busy} />
      </>
    );
  } else if (tx.status === 'Flagged' || tx.status === 'Blocked') {
    const blocked = tx.status === 'Blocked';
    body = (
      <>
        <div className={`result-title ${blocked ? 'result-stop' : 'result-hold'}`}>
          <ShieldAlert size={22} aria-hidden="true" />
          <h2>{blocked ? 'Transfer blocked' : 'Transfer held for review'}</h2>
        </div>
        {shown ? (
          <>
            <p className="result-sev">
              <SeverityChip level={shown.severity_level} />
              <span>
                {shown.severity_level} risk, score <span className="mono">{formatScore(shown.risk_score)}</span> of 100. Action: {label(shown.action_taken)}.
              </span>
            </p>
            <p className="result-reason">{shown.flag_reason}</p>
          </>
        ) : (
          <p>This transfer is marked {tx.status}.</p>
        )}
        <p>
          {blocked ? 'The money has not left your account.' : 'The money stays in your account until the check is complete.'} An analyst will review it, and the outcome will show here and on your dashboard.
          {needs2fa && cancelled && ' You stopped the code step, so the transfer stays Flagged.'}
        </p>
        <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
          {disputeButton}
          {needs2fa && cancelled && (
            <button type="button" className="btn btn-ghost" onClick={() => setCancelled(false)}>
              Enter a code instead
            </button>
          )}
        </div>
      </>
    );
  } else {
    body = (
      <>
        <div className="result-title result-hold">
          <h2>Transfer {tx.status.toLowerCase()}</h2>
        </div>
        <p>This transaction is marked {tx.status}.</p>
        <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
          {disputeButton}
        </div>
      </>
    );
  }

  return (
    <section className="card card-pad result" aria-live="polite">
      {body}
      {(tx.status === 'Flagged' || tx.status === 'Blocked') && <Signals evaluation={evaluation} />}
      <Modal open={disputeOpen} onClose={() => setDisputeOpen(false)} title="File a dispute">
        <DisputeForm
          initialRef={tx.transaction_ref}
          lockedCustomer={{ customer_id: customerId, customer_name: customerName }}
          performedBy={customerActor(customerId)}
          onDone={() => setDisputeOpen(false)}
          onCancel={() => setDisputeOpen(false)}
        />
      </Modal>
    </section>
  );
}

function Details({ d, customerId }: { d: TransactionDetail; customerId: string }) {
  const tx = d.transaction;
  const isSender = d.sender_customer?.customer_id === customerId;
  return (
    <section className="card card-pad">
      <h2 className="section-title">
        <span className="sq" aria-hidden="true" />
        Details
      </h2>
      <dl className="kv">
        <dt>Status</dt>
        <dd>
          <StatusChip status={tx.status} />
        </dd>
        <dt>Created</dt>
        <dd className="mono">
          <DateTime value={tx.created_at} />
        </dd>
        <dt>Type</dt>
        <dd>{label(tx.transaction_type)}</dd>
        <dt>Amount</dt>
        <dd className="mono">{formatMoney(tx.amount, tx.currency)}</dd>
        <dt>From</dt>
        <dd className="mono">{d.sender_account ? `${isSender ? 'Your account ' : ''}${maskAccountNumber(d.sender_account.account_number)}` : '-'}</dd>
        <dt>To</dt>
        <dd className="mono">{d.receiver_account ? `${isSender ? '' : 'Your account '}${maskAccountNumber(d.receiver_account.account_number)}` : '-'}</dd>
      </dl>
      {d.disputes.length > 0 && (
        <>
          <h3 className="section-title" style={{ marginTop: 20 }}>
            <span className="sq" aria-hidden="true" />
            Disputes
          </h3>
          <ul className="open-list">
            {d.disputes.map((x) => (
              <li key={x.dispute_id} className="open-row">
                <DisputeStatusChip status={x.dispute_status} />
                <span>Dispute {x.dispute_id}</span>
                <span className="muted" style={{ fontSize: 12.5 }}>
                  {x.dispute_type}, filed <DateTime value={x.filed_at} seconds={false} />
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export default function CustomerTransaction({ playback = false }: { playback?: boolean }) {
  const { transaction_ref = '' } = useParams();
  const { session } = useCustomerSession();
  const { version } = useSession();
  const loc = useLocation();
  const evaluation = (loc.state as { evaluation?: Evaluation } | null)?.evaluation;
  const state = useAsync(() => api.getTransaction(transaction_ref), [transaction_ref, version]);
  const snapshot = useRef<TransactionDetail | null>(null);
  const [played, setPlayed] = useState(!playback);
  const onDone = useMemo(() => () => setPlayed(true), []);
  const d = state.data;
  const mine = Boolean(d && session && (d.sender_customer?.customer_id === session.customer_id || d.receiver_customer?.customer_id === session.customer_id));
  if (d && mine && !snapshot.current) snapshot.current = d;

  // Opening a transaction from the dashboard counts as seeing its flag notice.
  // The send result screen does not, so the dashboard still announces a flag raised by Send money.
  useEffect(() => {
    if (playback || !d || !mine || !session) return;
    const keys = alertItems({ transactions: [d.transaction], anomalies: d.anomalies } as CustomerProfile).map((i) => i.key);
    if (!keys.length) return;
    const seen = readSeen(session.customer_id) ?? new Set<string>();
    keys.forEach((k) => seen.add(k));
    writeSeen(session.customer_id, seen);
  }, [d, mine, session, playback]);

  const notFound = (state.error instanceof ApiError && state.error.code === 'NOT_FOUND') || (d && !mine);

  return (
    <div className="app-page wrap narrow">
      <Link to="/app/dashboard" className="back-link">
        <ArrowLeft size={14} aria-hidden="true" /> Dashboard
      </Link>
      <header className="page-head">
        <div>
          <span className="eyebrow">
            <span className="sq" aria-hidden="true" />
            {playback ? 'Transfer result' : 'Transaction'}
          </span>
          <h1 className="mono tx-title">{transaction_ref}</h1>
        </div>
      </header>
      {notFound ? (
        <EmptyState title="Transaction not found" body="No transaction with this reference belongs to your accounts." action={<Link to="/app/dashboard" className="btn btn-ghost btn-sm">Back to dashboard</Link>} />
      ) : state.error ? (
        <ErrorState error={state.error} onRetry={state.reload} />
      ) : !d || !session ? (
        <SkeletonBlock height={320} />
      ) : (
        <div className="result-stack">
          {played && <Result d={d} evaluation={evaluation} customerId={session.customer_id} customerName={session.customer_name} />}
          {playback && snapshot.current && <Playback snapshot={snapshot.current} evaluation={evaluation} onDone={onDone} />}
          {played && <Details d={d} customerId={session.customer_id} />}
        </div>
      )}
    </div>
  );
}
