import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { fileDispute } from '../api/actions';
import { DISPUTE_TYPE, type DisputeType } from '../constants/enums';
import { useAsync } from '../lib/hooks';
import { useSession } from '../lib/session';
import type { DisputeLog } from '../types/db';
import type { TransactionDetail } from '../api/types';
import { CheckCircle2 } from 'lucide-react';
import { Busy, DisputeStatusChip, Money, Select } from './ui';
import { formatMoney } from '../lib/format';

interface Errors {
  transaction_ref?: string;
  customer_id?: string;
  dispute_type?: string;
  dispute_reason?: string;
  dispute_amount?: string;
  currency?: string;
}

export function DisputeForm({
  initialRef = '',
  initialCustomer = '',
  lockedCustomer,
  performedBy,
  onDone,
  onCancel,
}: {
  initialRef?: string;
  initialCustomer?: string;
  /** Customer view: the filing customer is fixed to the signed-in customer and the picker is hidden. */
  lockedCustomer?: { customer_id: string; customer_name: string };
  /** performed_by for the Audit_Trail row. Defaults to the acting analyst. */
  performedBy?: string;
  onDone: (d: DisputeLog) => void;
  onCancel: () => void;
}) {
  const { analyst: actingAnalyst, toast, bump } = useSession();
  const analyst = performedBy ?? actingAnalyst;
  const [ref, setRef] = useState(initialRef);
  const [customer, setCustomer] = useState(lockedCustomer?.customer_id ?? initialCustomer);
  const [type, setType] = useState<DisputeType | ''>('');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('');
  const [touched, setTouched] = useState<Set<keyof Errors>>(new Set());
  const [tx, setTx] = useState<TransactionDetail | null>(null);
  /** The transaction_ref the last lookup ran for, so a stale result is never trusted. */
  const [lookedUp, setLookedUp] = useState('');
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filed, setFiled] = useState<DisputeLog | null>(null);
  const customers = useAsync(() => (lockedCustomer ? Promise.resolve(null) : api.listCustomers({ page_size: 500, sort: 'customer_name' })), [lockedCustomer?.customer_id]);
  const currencies = useAsync(() => api.getSummary().then((s) => s.currencies), []);
  const refU = ref.trim().toUpperCase();

  const lookup = async (value: string): Promise<TransactionDetail | null> => {
    const v = value.trim().toUpperCase();
    if (!v) {
      setTx(null);
      setLookedUp('');
      return null;
    }
    setChecking(true);
    try {
      const d = await api.getTransaction(v);
      setTx(d);
      // Prefill from the transaction when the analyst has not chosen values yet.
      setAmount((a) => a || String(d.transaction.amount));
      setCurrency((c) => c || d.transaction.currency);
      setCustomer((c) => c || d.sender_customer?.customer_id || '');
      return d;
    } catch {
      setTx(null);
      return null;
    } finally {
      setLookedUp(v);
      setChecking(false);
    }
  };

  // GOLDEN RULE 5: Error prevention and simple error handling (the transaction_ref is checked as it is typed)
  useEffect(() => {
    if (!refU || refU === lookedUp) return;
    const t = setTimeout(() => lookup(refU), initialRef && refU === initialRef.toUpperCase() ? 0 : 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refU]);

  const parties = useMemo(() => new Set([tx?.sender_customer?.customer_id, tx?.receiver_customer?.customer_id].filter(Boolean) as string[]), [tx]);
  const current = tx && lookedUp === refU ? tx : null;

  // GOLDEN RULE 5: Error prevention and simple error handling (plain-language problems, one per field)
  const validate = (): Errors => {
    const e: Errors = {};
    const d = current;
    if (!refU) e.transaction_ref = 'Enter the transaction_ref you want to dispute.';
    else if (refU.length > 20) e.transaction_ref = 'transaction_ref holds at most 20 characters.';
    else if (lookedUp === refU && !d) e.transaction_ref = `No transaction has the transaction_ref ${refU}.`;
    else if (d && lockedCustomer && !parties.has(lockedCustomer.customer_id)) e.transaction_ref = `${refU} is not one of your transactions. You can only dispute your own.`;
    if (!customer) e.customer_id = 'Choose the customer filing the dispute.';
    if (!type) e.dispute_type = 'Choose a dispute type.';
    if (!reason.trim()) e.dispute_reason = 'Describe what went wrong with this transaction.';
    else if (reason.length > 255) e.dispute_reason = `The reason is ${reason.length} characters. dispute_reason holds 255, so remove ${reason.length - 255}.`;
    const n = Number(amount);
    if (amount.trim() === '' || Number.isNaN(n)) e.dispute_amount = 'Enter the amount you are disputing, in numbers.';
    else if (n <= 0) e.dispute_amount = 'Amount must be more than zero.';
    else if (!/^\d{1,16}(\.\d{1,2})?$/.test(amount.trim())) e.dispute_amount = 'Use up to 16 digits and 2 decimals (DECIMAL(18,2)).';
    else if (d && n > d.transaction.amount && currency === d.transaction.currency)
      e.dispute_amount = `Amount cannot be more than the transaction amount (${formatMoney(d.transaction.amount, d.transaction.currency)}).`;
    if (!/^[A-Z]{3}$/.test(currency)) e.currency = 'Choose a currency.';
    return e;
  };
  const live = validate();
  const ready = Object.keys(live).length === 0 && Boolean(current) && !checking;
  const touch = (k: keyof Errors) => setTouched((t) => (t.has(k) ? t : new Set(t).add(k)));
  // Prefilled values count as touched so their problems show at once.
  const errors: Errors = Object.fromEntries(Object.entries(live).filter(([k]) => touched.has(k as keyof Errors) || (k === 'transaction_ref' && lookedUp === refU && refU))) as Errors;

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!ready || saving) {
      setTouched(new Set(Object.keys(live) as (keyof Errors)[]));
      document.getElementById(`df-${Object.keys(live)[0]}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      const created = await fileDispute(
        { transaction_ref: refU, customer_id: customer, dispute_type: type as DisputeType, dispute_reason: reason.trim(), dispute_amount: Number(amount), currency },
        analyst,
      );
      bump();
      // GOLDEN RULE 3: Offer informative feedback
      toast(`Dispute ${created.dispute_id} filed on ${created.transaction_ref} for ${formatMoney(created.dispute_amount, created.currency)}.`);
      setFiled(created);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (filed) {
    return (
      // GOLDEN RULE 4: Design dialogs to yield closure (a settled final state before the dialog closes)
      <div className="stack" role="status" data-rule="4">
        <div className="result-title result-ok">
          <CheckCircle2 size={22} aria-hidden="true" />
          <h2>Dispute {filed.dispute_id} filed</h2>
        </div>
        <dl className="kv">
          <dt>transaction_ref</dt>
          <dd className="mono">{filed.transaction_ref}</dd>
          <dt>Type</dt>
          <dd>{filed.dispute_type}</dd>
          <dt>Amount</dt>
          <dd>
            <Money amount={filed.dispute_amount} currency={filed.currency} />
          </dd>
          <dt>Status</dt>
          <dd>
            <DisputeStatusChip status={filed.dispute_status} />
          </dd>
        </dl>
        <p className="muted">{lockedCustomer ? 'An analyst will review it. Its status shows on your dashboard under Open items.' : `Audit_Trail entry written by ${analyst}.`}</p>
        <div className="form-actions">
          <button type="button" className="btn btn-brand" onClick={() => onDone(filed)} data-autofocus>
            Done
          </button>
        </div>
      </div>
    );
  }

  const err = (k: keyof Errors) =>
    errors[k] ? (
      <span className="field-error" id={`df-${k}-err`} role="alert">
        {errors[k]}
      </span>
    ) : null;

  return (
    <form className="stack" onSubmit={submit} noValidate>
      <label className="field">
        <span>transaction_ref</span>
        <input
          id="df-transaction_ref"
          className="input mono"
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          onBlur={() => {
            touch('transaction_ref');
            if (refU && refU !== lookedUp) lookup(refU);
          }}
          data-rule="5"
          placeholder="UTR260801000001"
          maxLength={20}
          aria-invalid={Boolean(errors.transaction_ref)}
          aria-describedby="df-transaction_ref-err df-tx-hint"
          autoComplete="off"
          data-autofocus={initialRef ? undefined : true}
        />
        {err('transaction_ref')}
        <span className="field-hint" id="df-tx-hint">
          {checking ? 'Checking Transactions...' : tx ? (
            <>
              Found: {tx.transaction.status}, <Money amount={tx.transaction.amount} currency={tx.transaction.currency} />, {tx.transaction.sender_location}
            </>
          ) : (
            'Must match an existing Transactions row.'
          )}
        </span>
      </label>
      {lockedCustomer ? (
        <div className="field">
          <span>Filed by</span>
          <span className="input input-static">
            {lockedCustomer.customer_name} <span className="mono muted">({lockedCustomer.customer_id})</span>
          </span>
        </div>
      ) : (
      <label className="field">
        <span>Customer</span>
        <Select
          id="df-customer_id"
          value={customer}
          onChange={(e) => {
            setCustomer(e.target.value);
            touch('customer_id');
          }}
          onBlur={() => touch('customer_id')}
          aria-invalid={Boolean(errors.customer_id)}
          aria-describedby="df-customer_id-err"
          placeholder={customers.data ? 'Choose a customer' : 'Loading customers...'}
          options={(customers.data?.data ?? []).map((c) => ({ value: c.customer_id, label: `${c.customer_name} (${c.customer_id})${parties.has(c.customer_id) ? ', party to this transaction' : ''}` }))}
        />
        {err('customer_id')}
        {customer && tx && !parties.has(customer) && <span className="field-hint">This customer is neither the sender nor the receiver of the transaction.</span>}
      </label>
      )}
      <label className="field">
        <span>Dispute type</span>
        <Select
          id="df-dispute_type"
          value={type}
          onChange={(e) => {
            setType(e.target.value as DisputeType);
            touch('dispute_type');
          }}
          onBlur={() => touch('dispute_type')}
          aria-invalid={Boolean(errors.dispute_type)}
          aria-describedby="df-dispute_type-err"
          placeholder="Choose a type"
          options={DISPUTE_TYPE.map((v) => ({ value: v, label: v }))}
        />
        {err('dispute_type')}
      </label>
      <label className="field">
        <span>
          Reason <span className="mono" style={{ float: 'right', color: reason.length > 255 ? 'var(--alert)' : undefined }}>{reason.length}/255</span>
        </span>
        <textarea
          id="df-dispute_reason"
          className="textarea"
          data-rule="5"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (e.target.value.length > 255) touch('dispute_reason');
          }}
          onBlur={() => touch('dispute_reason')}
          aria-invalid={Boolean(errors.dispute_reason)} aria-describedby="df-dispute_reason-err" />
        {err('dispute_reason')}
      </label>
      <div className="row-form">
        <label className="field" style={{ flex: 2 }}>
          <span>Amount</span>
          <input
            id="df-dispute_amount"
            className="input mono"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              touch('dispute_amount');
            }}
            onBlur={() => touch('dispute_amount')}
            data-rule="5"
            aria-invalid={Boolean(errors.dispute_amount)}
            aria-describedby="df-dispute_amount-err"
          />
        </label>
        <label className="field" style={{ flex: 1 }}>
          <span>Currency</span>
          <Select
            id="df-currency"
            value={currency}
            onChange={(e) => {
              setCurrency(e.target.value);
              touch('currency');
              touch('dispute_amount');
            }}
            aria-invalid={Boolean(errors.currency)}
            aria-describedby="df-currency-err"
            placeholder="Code"
            options={(currencies.data ?? []).map((c) => ({ value: c, label: c }))}
          />
        </label>
      </div>
      {err('dispute_amount')}
      {err('currency')}
      {!ready && !saving && (
        <span className="field-hint" id="df-ready-hint">
          {checking ? 'Checking the transaction_ref...' : 'File dispute unlocks once every field above is filled in correctly.'}
        </span>
      )}
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-brand" disabled={saving || !ready} data-rule="5" aria-describedby="df-ready-hint">
          <Busy busy={saving} label="Filing...">
            File dispute
          </Busy>
        </button>
      </div>
    </form>
  );
}
