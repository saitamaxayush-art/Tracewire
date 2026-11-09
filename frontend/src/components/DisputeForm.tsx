import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { fileDispute } from '../api/actions';
import { DISPUTE_TYPE, type DisputeType } from '../constants/enums';
import { useAsync } from '../lib/hooks';
import { useSession } from '../lib/session';
import type { DisputeLog } from '../types/db';
import type { TransactionDetail } from '../api/types';
import { Money, Select } from './ui';
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
  const [errors, setErrors] = useState<Errors>({});
  const [tx, setTx] = useState<TransactionDetail | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const customers = useAsync(() => (lockedCustomer ? Promise.resolve(null) : api.listCustomers({ page_size: 500, sort: 'customer_name' })), [lockedCustomer?.customer_id]);
  const currencies = useAsync(() => api.getSummary().then((s) => s.currencies), []);

  const lookup = async (value: string): Promise<TransactionDetail | null> => {
    const v = value.trim().toUpperCase();
    if (!v) {
      setTx(null);
      return null;
    }
    setChecking(true);
    try {
      const d = await api.getTransaction(v);
      setTx(d);
      setErrors((e) => ({ ...e, transaction_ref: undefined }));
      // Prefill from the transaction when the analyst has not chosen values yet.
      setAmount((a) => a || String(d.transaction.amount));
      setCurrency((c) => c || d.transaction.currency);
      setCustomer((c) => c || d.sender_customer?.customer_id || '');
      return d;
    } catch {
      setTx(null);
      setErrors((e) => ({ ...e, transaction_ref: `No transaction with transaction_ref ${v}.` }));
      return null;
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (initialRef) lookup(initialRef);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRef]);

  const parties = useMemo(() => new Set([tx?.sender_customer?.customer_id, tx?.receiver_customer?.customer_id].filter(Boolean) as string[]), [tx]);

  const validate = (d: TransactionDetail | null): Errors => {
    const e: Errors = {};
    if (!ref.trim()) e.transaction_ref = 'Enter a transaction_ref.';
    else if (!d) e.transaction_ref = errors.transaction_ref ?? `No transaction with transaction_ref ${ref.trim().toUpperCase()}.`;
    else if (ref.trim().length > 20) e.transaction_ref = 'transaction_ref holds at most 20 characters.';
    else if (lockedCustomer && d.sender_customer?.customer_id !== lockedCustomer.customer_id && d.receiver_customer?.customer_id !== lockedCustomer.customer_id)
      e.transaction_ref = 'You can only dispute your own transactions.';
    if (!customer) e.customer_id = 'Choose the customer filing the dispute.';
    if (!type) e.dispute_type = 'Choose a dispute type.';
    if (!reason.trim()) e.dispute_reason = 'Describe the reason.';
    else if (reason.length > 255) e.dispute_reason = `dispute_reason holds 255 characters. Remove ${reason.length - 255}.`;
    const n = Number(amount);
    if (amount === '' || Number.isNaN(n)) e.dispute_amount = 'Enter an amount.';
    else if (n <= 0) e.dispute_amount = 'Amount must be greater than zero.';
    else if (!/^\d{1,16}(\.\d{1,2})?$/.test(amount.trim())) e.dispute_amount = 'Use up to 16 digits and 2 decimals (DECIMAL(18,2)).';
    else if (d && n > d.transaction.amount && currency === d.transaction.currency) e.dispute_amount = `Amount is above the transaction amount of ${formatMoney(d.transaction.amount, d.transaction.currency)}.`;
    if (!/^[A-Z]{3}$/.test(currency)) e.currency = 'Choose a 3-letter currency.';
    return e;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const d = tx && tx.transaction.transaction_ref === ref.trim().toUpperCase() ? tx : await lookup(ref);
    const e = validate(d);
    setErrors(e);
    if (Object.keys(e).length) {
      const first = Object.keys(e)[0];
      document.getElementById(`df-${first}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      const created = await fileDispute(
        { transaction_ref: ref.trim().toUpperCase(), customer_id: customer, dispute_type: type as DisputeType, dispute_reason: reason.trim(), dispute_amount: Number(amount), currency },
        analyst,
      );
      bump();
      toast(lockedCustomer ? `Dispute ${created.dispute_id} filed. An analyst will review it.` : `Dispute ${created.dispute_id} filed. Audit_Trail entry written by ${analyst}.`);
      onDone(created);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

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
          onBlur={() => lookup(ref)}
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
          {tx && !parties.has(lockedCustomer.customer_id) && <span className="field-error">This transaction is not one of yours.</span>}
        </div>
      ) : (
      <label className="field">
        <span>Customer</span>
        <Select
          id="df-customer_id"
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
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
          onChange={(e) => setType(e.target.value as DisputeType)}
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
        <textarea id="df-dispute_reason" className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={Boolean(errors.dispute_reason)} aria-describedby="df-dispute_reason-err" />
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
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={Boolean(errors.dispute_amount)}
            aria-describedby="df-dispute_amount-err"
          />
        </label>
        <label className="field" style={{ flex: 1 }}>
          <span>Currency</span>
          <Select
            id="df-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            aria-invalid={Boolean(errors.currency)}
            aria-describedby="df-currency-err"
            placeholder="Code"
            options={(currencies.data ?? []).map((c) => ({ value: c, label: c }))}
          />
        </label>
      </div>
      {err('dispute_amount')}
      {err('currency')}
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-brand" disabled={saving}>
          {saving ? 'Filing...' : 'File dispute'}
        </button>
      </div>
    </form>
  );
}
