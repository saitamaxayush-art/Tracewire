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
import { DataView, PageHead, Select, SkeletonRows } from '../../components/ui';
import { useCustomerProfile } from './CustomerDashboard';

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
  const [errors, setErrors] = useState<Errors>({});
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
      return null;
    }
    setLooking(true);
    try {
      const m = await findReceiver(q);
      setMatches(m);
      const pick = m.length === 1 ? m[0] : m.find((x) => x.account.account_id === receiverId) ?? null;
      setReceiverId(pick?.account.account_id ?? '');
      setErrors((e) => ({ ...e, receiver: m.length ? undefined : `No account matches ${q}. Enter a 10-digit account number or the receiver's email.` }));
      return pick;
    } finally {
      setLooking(false);
    }
  };

  const receiver = matches?.find((m) => m.account.account_id === receiverId) ?? null;
  const n = Number(amount);
  const sameCurrency = sender && currency === sender.currency;

  const validate = (r: ReceiverMatch | null): Errors => {
    const e: Errors = {};
    if (!sender) e.from = 'Choose the account to send from.';
    if (!query.trim()) e.receiver = 'Enter the receiver account number or email.';
    else if (!r) e.receiver = matches && matches.length > 1 ? 'Choose which of the receiver accounts to pay.' : errors.receiver ?? 'No matching account.';
    else if (sender && r.account.account_id === sender.account_id) e.receiver = 'Sender and receiver accounts must be different.';
    if (amount.trim() === '' || Number.isNaN(n)) e.amount = 'Enter an amount.';
    else if (!(n > 0)) e.amount = 'Amount must be above zero.';
    else if (!/^\d{1,16}(\.\d{1,2})?$/.test(amount.trim())) e.amount = 'Use up to 16 digits and 2 decimals.';
    else if (sender && sameCurrency && n > sender.balance) e.amount = `Amount is above the account balance of ${formatMoney(sender.balance, sender.currency)}.`;
    if (!/^[A-Z]{3}$/.test(currency)) e.currency = 'Choose a currency.';
    if (note.length > 80) e.note = `Notes hold 80 characters. Remove ${note.length - 80}.`;
    return e;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!p || busy) return;
    const r = receiver && receiver.account.account_id === receiverId && matches ? receiver : await lookup();
    const e = validate(r);
    setErrors(e);
    const first = Object.keys(e)[0];
    if (first) {
      document.getElementById(`sm-${first}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const res = await sendMoney(
        { sender_account_id: sender!.account_id, receiver_account_id: r!.account.account_id, amount: n, currency, transaction_type: type },
        p.customer,
        note,
      );
      navigate(`/app/send/${res.transaction.transaction_ref}`, { state: { evaluation: res.evaluation, fresh: true } });
    } catch (err) {
      setErrors({ form: (err as Error).message });
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
      <DataView state={state} skeleton={<SkeletonRows rows={6} cols={2} />}>
        {(prof) => (
          <form className="card card-pad stack" onSubmit={submit} noValidate>
            <label className="field">
              <span>From</span>
              <Select
                id="sm-from"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                aria-invalid={Boolean(errors.from)}
                aria-describedby="sm-from-err"
                options={prof.accounts.map((a) => ({ value: a.account_id, label: `${a.account_type} ${maskAccountNumber(a.account_number)}, ${formatMoney(a.balance, a.currency)}` }))}
              />
              {err('from')}
            </label>

            <div className="field">
              <label htmlFor="sm-receiver">Receiver</label>
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
                  onBlur={() => query.trim() && !matches && lookup()}
                  placeholder="Account number or email"
                  autoComplete="off"
                  aria-invalid={Boolean(errors.receiver)}
                  aria-describedby="sm-receiver-hint sm-receiver-err"
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn btn-ghost" onClick={lookup} disabled={looking}>
                  <Search size={14} aria-hidden="true" /> {looking ? 'Finding...' : 'Find'}
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
                  onChange={(e) => setReceiverId(e.target.value)}
                  placeholder="Choose an account"
                  options={matches.map((m) => ({ value: m.account.account_id, label: `${m.account.account_type} ${maskAccountNumber(m.account.account_number)} (${m.account.currency})` }))}
                />
              )}
            </div>

            <div className="row-form">
              <label className="field" style={{ flex: 2 }}>
                <span>Amount</span>
                <input id="sm-amount" className="input mono" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={Boolean(errors.amount)} aria-describedby="sm-amount-err sm-amount-hint" />
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
              <input id="sm-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={Boolean(errors.note)} aria-describedby="sm-note-err sm-note-hint" />
              <span className="field-hint" id="sm-note-hint">
                Transactions has no note column, so the note is kept in the transfer's Audit_Trail entry.
              </span>
              {err('note')}
            </label>

            {err('form')}
            <div className="form-actions">
              <Link to="/app/dashboard" className="btn btn-ghost">
                Cancel
              </Link>
              <button type="submit" className="btn btn-brand" disabled={busy}>
                {busy ? 'Checking...' : 'Send'}
              </button>
            </div>
          </form>
        )}
      </DataView>
    </div>
  );
}
