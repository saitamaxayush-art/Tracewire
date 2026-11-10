import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { findReceiver, sendMoney, type ReceiverMatch } from '../../api/customer';
import { api } from '../../api';
import { useAsync } from '../../lib/hooks';
import { useSession } from '../../lib/session';
import { CUSTOMER_TRANSFER_TYPES, type CustomerTransferType } from '../../lib/scoring';
import { formatMoney, maskAccountNumber } from '../../lib/format';
import { label } from '../../constants/enums';
import { Busy, DataView, PageHead, Select, SkeletonRows, Steps } from '../../components/ui';
import { useCustomerProfile } from './CustomerDashboard';

/** Shared with the result screen so both show the same three steps. */
export const SEND_STEPS = ['Details', 'Check', 'Result'];

type Errors = Partial<Record<'from' | 'receiver' | 'amount' | 'currency' | 'type' | 'note' | 'form', string>>;

/** First name and last initial only: enough to confirm the payee without exposing the full record. */
function shortName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
}

export default function SendMoney() {
  const state = useCustomerProfile();
  const navigate = useNavigate();
  const { toast } = useSession();
  const currencies = useAsync(() => api.getSummary().then((s) => s.currencies), []);
  const [from, setFrom] = useState('');
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<ReceiverMatch[] | null>(null);
  const [receiverId, setReceiverId] = useState('');
  const [looking, setLooking] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('');
  const [currencyTouched, setCurrencyTouched] = useState(false);
  const [type, setType] = useState<CustomerTransferType>('Transfer Transaction');
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState<Set<keyof Errors>>(new Set());
  const [formError, setFormError] = useState('');
  /** The receiver text the last lookup ran for, so stale matches are never used. */
  const [lookedUp, setLookedUp] = useState('');
  const [busy, setBusy] = useState(false);

  const p = state.data;
  const sender = p?.accounts.find((a) => a.account_id === from);

  // Default to the first account, and keep the currency on the sender's until the customer changes it.
  useEffect(() => {
    if (p && !from && p.accounts[0]) setFrom(p.accounts[0].account_id);
  }, [p, from]);
  useEffect(() => {
    if (sender && !currencyTouched) setCurrency(sender.currency);
  }, [sender, currencyTouched]);

  const lookup = async (): Promise<ReceiverMatch | null> => {
    const q = query.trim();
    if (!q) {
      setMatches(null);
      setReceiverId('');
      setLookedUp('');
      return null;
    }
    setLooking(true);
    try {
      const m = await findReceiver(q);
      setMatches(m);
      const pick = m.length === 1 ? m[0] : m.find((x) => x.account.account_id === receiverId) ?? null;
      setReceiverId(pick?.account.account_id ?? '');
      return pick;
    } finally {
      setLookedUp(q);
      setLooking(false);
    }
  };

  // GOLDEN RULE 5: Error prevention and simple error handling (the receiver is resolved as it is typed)
  useEffect(() => {
    const q = query.trim();
    if (!q || q === lookedUp) return;
    const t = setTimeout(() => lookup(), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const receiver = matches?.find((m) => m.account.account_id === receiverId) ?? null;
  const n = Number(amount);
  const sameCurrency = sender && currency === sender.currency;
  const resolved = lookedUp === query.trim() && !looking;

  // GOLDEN RULE 5: Error prevention and simple error handling (plain-language problem under each field)
  const validate = (): Errors => {
    const e: Errors = {};
    const q = query.trim();
    if (!sender) e.from = 'Choose the account to send from.';
    if (!q) e.receiver = 'Enter the receiver account number or email.';
    else if (resolved && matches && matches.length === 0) e.receiver = `No account matches ${q}. Enter a 10-digit account number or the receiver's email.`;
    else if (resolved && matches && matches.length > 1 && !receiver) e.receiver = `${q} has ${matches.length} accounts. Choose which one to pay.`;
    else if (receiver && sender && receiver.account.account_id === sender.account_id) e.receiver = 'You cannot send money to the same account it comes from. Choose a different receiver.';
    if (amount.trim() === '' || Number.isNaN(n)) e.amount = 'Enter an amount, in numbers.';
    else if (!(n > 0)) e.amount = 'Amount must be more than zero.';
    else if (!/^\d{1,16}(\.\d{1,2})?$/.test(amount.trim())) e.amount = 'Use up to 16 digits and 2 decimals.';
    else if (sender && sameCurrency && n > sender.balance) e.amount = `Amount cannot be more than the account balance (${formatMoney(sender.balance, sender.currency)}).`;
    if (!/^[A-Z]{3}$/.test(currency)) e.currency = 'Choose a currency.';
    if (note.length > 80) e.note = `The note is ${note.length} characters. Notes hold 80, so remove ${note.length - 80}.`;
    return e;
  };
  const live = validate();
  const valid = Object.keys(live).length === 0 && Boolean(receiver) && resolved;
  const touch = (k: keyof Errors) => setTouched((t) => (t.has(k) ? t : new Set(t).add(k)));
  // Lookup and balance problems show as soon as they are known; empty fields wait until the person leaves them.
  const errors: Errors = Object.fromEntries(
    Object.entries(live).filter(([k]) => touched.has(k as keyof Errors) || (k === 'receiver' && resolved && query.trim()) || (k === 'amount' && amount.trim()) || k === 'note'),
  ) as Errors;
  if (formError) errors.form = formError;

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!p || busy) return;
    if (!valid) {
      setTouched(new Set(Object.keys(live) as (keyof Errors)[]));
      document.getElementById(`sm-${Object.keys(live)[0] ?? 'receiver'}`)?.focus();
      return;
    }
    setBusy(true);
    setFormError('');
    try {
      const res = await sendMoney(
        { sender_account_id: sender!.account_id, receiver_account_id: receiver!.account.account_id, amount: n, currency, transaction_type: type },
        p.customer,
        note,
      );
      const t = res.transaction;
      navigate(`/app/send/${t.transaction_ref}`, { state: { evaluation: res.evaluation, fresh: true } });
    } catch (err) {
      setFormError((err as Error).message);
      toast((err as Error).message, 'error');
      setBusy(false);
    }
  };

  const err = (k: keyof Errors) =>
    errors[k] ? (
      <span className="field-error" id={`sm-${k}-err`} role="alert">
        {errors[k]}
      </span>
    ) : null;

  return (
    <div className="app-page wrap narrow">
      <Link to="/app/dashboard" className="back-link">
        <ArrowLeft size={14} aria-hidden="true" /> Dashboard
      </Link>
      <PageHead eyebrow="Send money" title="Send money" sub="Each transfer is scored before it is written. A transfer that trips a rule is held or blocked and shows up in the analyst queue." />
      {/* GOLDEN RULE 4: Design dialogs to yield closure */}
      <Steps steps={SEND_STEPS} current={0} />
      <DataView state={state} skeleton={<SkeletonRows rows={6} cols={2} />}>
        {(prof) => (
          <form className="card card-pad stack" onSubmit={submit} noValidate>
            <label className="field">
              <span>From</span>
              <Select
                id="sm-from"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  touch('from');
                }}
                aria-invalid={Boolean(errors.from)}
                aria-describedby="sm-from-err"
                options={prof.accounts.map((a) => ({ value: a.account_id, label: `${a.account_type} ${maskAccountNumber(a.account_number)}, ${formatMoney(a.balance, a.currency)}` }))}
              />
              {err('from')}
            </label>

            <div className="field">
              {/* GOLDEN RULE 1: Strive for consistency (same label style as every other field) */}
              <label htmlFor="sm-receiver" className="field-label">
                Receiver
              </label>
              <div className="row-form">
                <input
                  id="sm-receiver"
                  className="input"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setMatches(null);
                    setReceiverId('');
                  }}
                  onBlur={() => {
                    touch('receiver');
                    if (query.trim() && query.trim() !== lookedUp) lookup();
                  }}
                  data-rule="5"
                  placeholder="Account number or email"
                  autoComplete="off"
                  aria-invalid={Boolean(errors.receiver)}
                  aria-describedby="sm-receiver-hint sm-receiver-err"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    touch('receiver');
                    lookup();
                  }}
                  disabled={looking}
                >
                  <Busy busy={looking} label="Finding...">
                    <Search size={14} aria-hidden="true" /> Find
                  </Busy>
                </button>
              </div>
              {err('receiver')}
              <span className="field-hint" id="sm-receiver-hint">
                {matches && matches.length === 1 && receiver ? (
                  <>
                    Pays {receiver.customer ? shortName(receiver.customer.customer_name) : 'an account'}, {receiver.account.account_type} <span className="mono">{maskAccountNumber(receiver.account.account_number)}</span>
                    {receiver.customer ? `, ${receiver.customer.country}` : ''}
                  </>
                ) : (
                  'Must match an account in Accounts.'
                )}
              </span>
              {matches && matches.length > 1 && (
                <Select
                  aria-label="Receiver account"
                  value={receiverId}
                  onChange={(e) => {
                    setReceiverId(e.target.value);
                    touch('receiver');
                  }}
                  placeholder="Choose an account"
                  options={matches.map((m) => ({ value: m.account.account_id, label: `${m.account.account_type} ${maskAccountNumber(m.account.account_number)} (${m.account.currency})` }))}
                />
              )}
            </div>

            <div className="row-form">
              <label className="field" style={{ flex: 2 }}>
                <span>Amount</span>
                <input
                  id="sm-amount"
                  className="input mono"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onBlur={() => touch('amount')}
                  data-rule="5"
                  aria-invalid={Boolean(errors.amount)} aria-describedby="sm-amount-err sm-amount-hint" />
              </label>
              <label className="field" style={{ flex: 1 }}>
                <span>Currency</span>
                <Select
                  id="sm-currency"
                  value={currency}
                  onChange={(e) => {
                    setCurrency(e.target.value);
                    setCurrencyTouched(true);
                  }}
                  aria-invalid={Boolean(errors.currency)}
                  aria-describedby="sm-currency-err"
                  options={[...new Set([...(currencies.data ?? []), ...(sender ? [sender.currency] : [])])].sort().map((c) => ({ value: c, label: c }))}
                />
              </label>
            </div>
            {err('amount')}
            {err('currency')}
            {sender && (
              <span className="field-hint" id="sm-amount-hint">
                {sameCurrency
                  ? `Available: ${formatMoney(sender.balance, sender.currency)}`
                  : `The account holds ${sender.currency}. No exchange rates are stored, so a ${currency} transfer is not checked against or taken from the balance, and it is scored as a currency mismatch.`}
              </span>
            )}

            <label className="field">
              <span>Type</span>
              <Select id="sm-type" value={type} onChange={(e) => setType(e.target.value as CustomerTransferType)} options={CUSTOMER_TRANSFER_TYPES.map((t) => ({ value: t, label: label(t) }))} />
            </label>

            <label className="field">
              <span>
                Note, optional <span className="mono" style={{ float: 'right', color: note.length > 80 ? 'var(--alert)' : undefined }}>{note.length}/80</span>
              </span>
              <input id="sm-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} data-rule="5" aria-invalid={Boolean(errors.note)} aria-describedby="sm-note-err sm-note-hint" />
              <span className="field-hint" id="sm-note-hint">
                Transactions has no note column, so the note is kept in the transfer's Audit_Trail entry.
              </span>
              {err('note')}
            </label>

            {err('form')}
            {!valid && !busy && (
              <span className="field-hint" id="sm-ready-hint">
                {looking ? 'Looking up the receiver...' : 'Send unlocks once the receiver is found and the amount is valid.'}
              </span>
            )}
            <div className="form-actions">
              <Link to="/app/dashboard" className="btn btn-ghost">
                Cancel
              </Link>
              <button type="submit" className="btn btn-brand" disabled={busy || !valid} data-rule="5" aria-describedby="sm-ready-hint">
                <Busy busy={busy} label="Checking...">
                  Send
                </Busy>
              </button>
            </div>
          </form>
        )}
      </DataView>
    </div>
  );
}
