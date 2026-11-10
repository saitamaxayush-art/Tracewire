import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { signupCustomer } from '../../api/customer';
import { CheckCircle2 } from 'lucide-react';
import { ACCOUNT_TYPE, type AccountType } from '../../constants/enums';
import { formatMoney, maskAccountNumber } from '../../lib/format';
import type { AuthResult } from '../../api/types';
import { useAsync } from '../../lib/hooks';
import { useCustomerSession } from '../../lib/customerSession';
import { Busy, Select, Steps } from '../../components/ui';
import { useSession } from '../../lib/session';

function AuthShell({ eyebrow, title, children, foot, steps }: { eyebrow: string; title: string; children: ReactNode; foot?: ReactNode; steps?: ReactNode }) {
  return (
    <div className="auth-page dot-grid">
      <section className="auth-card card" aria-labelledby="auth-title">
        {steps}
        <span className="eyebrow">
          <span className="sq" aria-hidden="true" />
          {eyebrow}
        </span>
        <h1 id="auth-title">{title}</h1>
        {children}
        {foot && <p className="auth-foot">{foot}</p>}
      </section>
    </div>
  );
}

function useAfterAuth() {
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from;
  return from && from.startsWith('/app') ? from : '/app/dashboard';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Login() {
  const { session, signIn } = useCustomerSession();
  const { toast } = useSession();
  const navigate = useNavigate();
  const target = useAfterAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const seeded = useAsync(() => api.listCustomers({ page_size: 6, sort: 'customer_name' }).then((r) => r.data), []);

  if (session && !busy) return <Navigate to={target} replace />;

  // GOLDEN RULE 5: Error prevention and simple error handling (checked as the person types, shown under each field)
  const emailError = !email.trim() ? 'Enter the email you registered with.' : !EMAIL_RE.test(email.trim()) ? `${email.trim()} is not a complete email address, for example name@email.com.` : '';
  // Demo only: any non-empty password is accepted. There is no real authentication here.
  const passwordError = password ? '' : 'Enter a password. Any value works in this demo.';
  const valid = !emailError && !passwordError;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setTouched({ email: true, password: true });
    if (!valid) return;
    setBusy(true);
    try {
      const r = await api.login({ email: email.trim(), password });
      await signIn(r);
      // GOLDEN RULE 3: Offer informative feedback
      toast(`Logged in as ${r.customer.customer_name}, customer ${r.customer.customer_id}.`);
      navigate(target, { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Customer view"
      title="Log in"
      foot={
        <>
          New here? <Link to="/signup">Create an account</Link>
        </>
      }
    >
      <form className="stack" onSubmit={submit} noValidate>
        <label className="field">
          <span>Email</span>
          <input
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            aria-invalid={touched.email && Boolean(emailError)}
            aria-describedby="login-email-err"
            data-rule="5"
          />
          {touched.email && emailError && (
            <span className="field-error" id="login-email-err" role="alert">
              {emailError}
            </span>
          )}
        </label>
        <label className="field">
          <span>Password</span>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
              setTouched((t) => ({ ...t, password: true }));
            }}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            aria-invalid={touched.password && Boolean(passwordError)}
            aria-describedby="login-hint login-password-err"
            data-rule="5"
          />
          {touched.password && passwordError && (
            <span className="field-error" id="login-password-err" role="alert">
              {passwordError}
            </span>
          )}
          <span className="field-hint" id="login-hint">
            Demo sign-in: any password is accepted.
          </span>
        </label>
        <span className="field-error" id="login-err" role="alert">
          {error}
        </span>
        <button type="submit" className="btn btn-brand" disabled={busy || !valid} data-rule="5">
          <Busy busy={busy} label="Logging in...">
            Log in
          </Busy>
        </button>
      </form>

      <div className="auth-quick">
        <h2 className="field-label">Existing customers</h2>
        {seeded.data ? (
          <ul>
            {seeded.data.map((c) => (
              <li key={c.customer_id}>
                <button type="button" className="auth-quick-row" onClick={() => {
                    setEmail(c.email);
                    setTouched((t) => ({ ...t, email: true }));
                  }}
                  aria-label={`Use the email of ${c.customer_name}`}>
                  <span>{c.customer_name}</span>
                  <span className="mono muted">{c.email}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{seeded.error ? 'Customers could not be loaded.' : 'Loading customers...'}</p>
        )}
      </div>
    </AuthShell>
  );
}

interface SignupForm {
  customer_name: string;
  email: string;
  phone_number: string;
  country: string;
  nationality: string;
  preferred_currency: string;
  account_type: AccountType | '';
  opening_balance: string;
  password: string;
}

const EMPTY: SignupForm = { customer_name: '', email: '', phone_number: '', country: '', nationality: '', preferred_currency: '', account_type: '', opening_balance: '', password: '' };

export function Signup() {
  const { session, signIn } = useCustomerSession();
  const navigate = useNavigate();
  const [f, setF] = useState<SignupForm>(EMPTY);
  const [touched, setTouched] = useState<Set<keyof SignupForm>>(new Set());
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<AuthResult | null>(null);
  const { toast } = useSession();
  const customers = useAsync(() => api.listCustomers({ page_size: 500 }).then((r) => r.data), []);
  const lists = useMemo(() => {
    const cs = customers.data ?? [];
    const uniq = (xs: string[]) => [...new Set(xs)].sort();
    return { countries: uniq(cs.map((c) => c.country)), nationalities: uniq(cs.map((c) => c.nationality)), currencies: uniq(cs.map((c) => c.preferred_currency)) };
  }, [customers.data]);

  if (session && !busy && !created) return <Navigate to="/app/dashboard" replace />;

  const touch = (k: keyof SignupForm) => setTouched((t) => (t.has(k) ? t : new Set(t).add(k)));
  // Text fields show their problem once the person leaves them; choices show at once.
  const set = (k: keyof SignupForm, immediate = false) => (e: { target: { value: string } }) => {
    setF((p) => ({ ...p, [k]: e.target.value }));
    if (immediate) touch(k);
  };

  // GOLDEN RULE 5: Error prevention and simple error handling (validated live, each problem under its own field)
  const validate = () => {
    const e: Partial<Record<keyof SignupForm, string>> = {};
    if (!f.customer_name.trim()) e.customer_name = 'Enter your full name.';
    else if (f.customer_name.length > 100) e.customer_name = 'customer_name holds at most 100 characters.';
    if (!f.email.trim()) e.email = 'Enter your email address.';
    else if (!EMAIL_RE.test(f.email.trim())) e.email = `${f.email.trim()} is not a complete email address, for example name@email.com.`;
    else if (f.email.length > 150) e.email = 'email holds at most 150 characters.';
    if (!f.phone_number.trim()) e.phone_number = 'Enter a phone number.';
    else if (!/^[+\d][\d\s-]{5,29}$/.test(f.phone_number.trim())) e.phone_number = 'Use digits, spaces and dashes, with an optional leading +.';
    if (!f.country.trim()) e.country = 'Enter your country.';
    else if (f.country.length > 60) e.country = 'country holds at most 60 characters.';
    if (!f.nationality.trim()) e.nationality = 'Enter your nationality.';
    else if (f.nationality.length > 60) e.nationality = 'nationality holds at most 60 characters.';
    if (!f.preferred_currency) e.preferred_currency = 'Choose a currency.';
    if (!f.account_type) e.account_type = 'Choose an account type.';
    const n = Number(f.opening_balance);
    if (f.opening_balance.trim() === '' || Number.isNaN(n)) e.opening_balance = 'Enter an opening balance.';
    else if (n < 0) e.opening_balance = 'Opening balance cannot be below zero.';
    else if (!/^\d{1,16}(\.\d{1,2})?$/.test(f.opening_balance.trim())) e.opening_balance = 'Use up to 16 digits and 2 decimals (DECIMAL(18,2)).';
    if (!f.password) e.password = 'Enter a password. Any value works in this demo.';
    return e;
  };

  const live = validate();
  const valid = Object.keys(live).length === 0;
  const errors = Object.fromEntries(Object.entries(live).filter(([k]) => touched.has(k as keyof SignupForm))) as Partial<Record<keyof SignupForm, string>>;
  const PERSONAL: (keyof SignupForm)[] = ['customer_name', 'email', 'phone_number', 'country', 'nationality'];
  const personalDone = PERSONAL.every((k) => !live[k]);

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    setFormError('');
    const first = Object.keys(live)[0];
    if (first) {
      setTouched(new Set(Object.keys(live) as (keyof SignupForm)[]));
      document.getElementById(`su-${first}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const r = await signupCustomer({
        customer_name: f.customer_name.trim(),
        email: f.email.trim(),
        phone_number: f.phone_number.trim(),
        country: f.country.trim(),
        nationality: f.nationality.trim(),
        preferred_currency: f.preferred_currency,
        account_type: f.account_type as AccountType,
        opening_balance: Number(f.opening_balance),
        password: f.password,
      });
      await signIn(r);
      setCreated(r);
      // GOLDEN RULE 3: Offer informative feedback
      toast(`Account created for ${r.customer.customer_name}: customer ${r.customer.customer_id}, account ${maskAccountNumber(r.accounts[0]?.account_number ?? '')}.`);
    } catch (err) {
      setFormError((err as Error).message);
      setBusy(false);
    }
  };

  // GOLDEN RULE 4: Design dialogs to yield closure
  const SIGNUP_STEPS = ['Your details', 'Account', 'Done'];
  if (created) {
    const acc = created.accounts[0];
    return (
      <AuthShell eyebrow="Customer view" title="Account created" steps={<Steps steps={SIGNUP_STEPS} current={SIGNUP_STEPS.length} />}>
        {/* GOLDEN RULE 4: Design dialogs to yield closure (final, read-only screen) */}
        <div className="stack auth-done" role="status" data-rule="4">
          <div className="result-title result-ok">
            <CheckCircle2 size={22} aria-hidden="true" />
            <h2>Welcome, {created.customer.customer_name}</h2>
          </div>
          <dl className="kv">
            <dt>customer_id</dt>
            <dd className="mono">{created.customer.customer_id}</dd>
            {acc && (
              <>
                <dt>Account</dt>
                <dd>
                  {acc.account_type} <span className="mono">{maskAccountNumber(acc.account_number)}</span>
                </dd>
                <dt>Opening balance</dt>
                <dd className="mono">{formatMoney(acc.balance, acc.currency)}</dd>
              </>
            )}
          </dl>
          <button type="button" className="btn btn-brand" onClick={() => navigate('/app/dashboard', { replace: true })} autoFocus>
            Go to dashboard
          </button>
        </div>
      </AuthShell>
    );
  }

  const field = (k: keyof SignupForm, labelText: string, input: ReactNode) => (
    <label className="field">
      <span>{labelText}</span>
      {input}
      {errors[k] && (
        <span className="field-error" id={`su-${k}-err`} role="alert">
          {errors[k]}
        </span>
      )}
    </label>
  );
  const attrs = (k: keyof SignupForm) => ({ id: `su-${k}`, 'aria-invalid': Boolean(errors[k]), 'aria-describedby': `su-${k}-err`, onBlur: () => touch(k), 'data-rule': '5' });

  return (
    <AuthShell
      eyebrow="Customer view"
      title="Create an account"
      steps={<Steps steps={SIGNUP_STEPS} current={personalDone ? 1 : 0} />}
      foot={
        <>
          Already registered? <Link to="/login">Log in</Link>
        </>
      }
    >
      <form className="stack" onSubmit={submit} noValidate>
        {field('customer_name', 'Full name', <input className="input" autoComplete="name" value={f.customer_name} onChange={set('customer_name')} maxLength={100} {...attrs('customer_name')} />)}
        {field('email', 'Email', <input className="input" type="email" autoComplete="email" value={f.email} onChange={set('email')} maxLength={150} {...attrs('email')} />)}
        {field('phone_number', 'Phone number', <input className="input mono" type="tel" autoComplete="tel" placeholder="+91-9876543210" value={f.phone_number} onChange={set('phone_number')} maxLength={30} {...attrs('phone_number')} />)}
        <div className="auth-two">
          {field('country', 'Country', <input className="input" list="su-countries" autoComplete="country-name" value={f.country} onChange={set('country')} maxLength={60} {...attrs('country')} />)}
          {field('nationality', 'Nationality', <input className="input" list="su-nationalities" value={f.nationality} onChange={set('nationality')} maxLength={60} {...attrs('nationality')} />)}
        </div>
        <datalist id="su-countries">
          {lists.countries.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <datalist id="su-nationalities">
          {lists.nationalities.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <div className="auth-two">
          {field(
            'preferred_currency',
            'Currency',
            <Select value={f.preferred_currency} onChange={set('preferred_currency', true)} placeholder={customers.data ? 'Choose' : 'Loading...'} options={lists.currencies.map((c) => ({ value: c, label: c }))} {...attrs('preferred_currency')} />,
          )}
          {field('account_type', 'Account type', <Select value={f.account_type} onChange={set('account_type', true)} placeholder="Choose" options={ACCOUNT_TYPE.map((v) => ({ value: v, label: v }))} {...attrs('account_type')} />)}
        </div>
        {field(
          'opening_balance',
          `Opening balance${f.preferred_currency ? ` (${f.preferred_currency})` : ''}`,
          <input className="input mono" inputMode="decimal" value={f.opening_balance} onChange={set('opening_balance')} {...attrs('opening_balance')} />,
        )}
        {field('password', 'Password', <input className="input" type="password" autoComplete="new-password" value={f.password} onChange={set('password', true)} {...attrs('password')} />)}
        <span className="field-error" role="alert">
          {formError}
        </span>
        <button type="submit" className="btn btn-brand" disabled={busy || !valid} data-rule="5" aria-describedby="su-ready-hint">
          <Busy busy={busy} label="Creating account...">
            Create account
          </Busy>
        </button>
        {!valid && (
          <span className="field-hint" id="su-ready-hint">
            Create account unlocks once every field above is filled in correctly.
          </span>
        )}
      </form>
    </AuthShell>
  );
}
