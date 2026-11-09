import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { signupCustomer } from '../../api/customer';
import { ACCOUNT_TYPE, type AccountType } from '../../constants/enums';
import { useAsync } from '../../lib/hooks';
import { useCustomerSession } from '../../lib/customerSession';
import { Select } from '../../components/ui';

function AuthShell({ eyebrow, title, children, foot }: { eyebrow: string; title: string; children: ReactNode; foot: ReactNode }) {
  return (
    <div className="auth-page dot-grid">
      <section className="auth-card card" aria-labelledby="auth-title">
        <span className="eyebrow">
          <span className="sq" aria-hidden="true" />
          {eyebrow}
        </span>
        <h1 id="auth-title">{title}</h1>
        {children}
        <p className="auth-foot">{foot}</p>
      </section>
    </div>
  );
}

function useAfterAuth() {
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from;
  return from && from.startsWith('/app') ? from : '/app/dashboard';
}

export function Login() {
  const { session, signIn } = useCustomerSession();
  const navigate = useNavigate();
  const target = useAfterAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const seeded = useAsync(() => api.listCustomers({ page_size: 6, sort: 'customer_name' }).then((r) => r.data), []);

  if (session && !busy) return <Navigate to={target} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) return setError('Enter your email.');
    // Demo only: any non-empty password is accepted. There is no real authentication here.
    if (!password) return setError('Enter a password. Any value works in this demo.');
    setBusy(true);
    try {
      await signIn(await api.login({ email: email.trim(), password }));
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
          <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(error)} aria-describedby="login-err" />
        </label>
        <label className="field">
          <span>Password</span>
          <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-describedby="login-hint login-err" />
          <span className="field-hint" id="login-hint">
            Demo sign-in: any password is accepted.
          </span>
        </label>
        <span className="field-error" id="login-err" role="alert">
          {error}
        </span>
        <button type="submit" className="btn btn-brand" disabled={busy}>
          {busy ? 'Logging in...' : 'Log in'}
        </button>
      </form>

      <div className="auth-quick">
        <h2 className="field-label">Existing customers</h2>
        {seeded.data ? (
          <ul>
            {seeded.data.map((c) => (
              <li key={c.customer_id}>
                <button type="button" className="auth-quick-row" onClick={() => setEmail(c.email)} aria-label={`Use the email of ${c.customer_name}`}>
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
  const [errors, setErrors] = useState<Partial<Record<keyof SignupForm, string>>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const customers = useAsync(() => api.listCustomers({ page_size: 500 }).then((r) => r.data), []);
  const lists = useMemo(() => {
    const cs = customers.data ?? [];
    const uniq = (xs: string[]) => [...new Set(xs)].sort();
    return { countries: uniq(cs.map((c) => c.country)), nationalities: uniq(cs.map((c) => c.nationality)), currencies: uniq(cs.map((c) => c.preferred_currency)) };
  }, [customers.data]);

  if (session && !busy) return <Navigate to="/app/dashboard" replace />;

  const set = (k: keyof SignupForm) => (e: { target: { value: string } }) => {
    setF((p) => ({ ...p, [k]: e.target.value }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const validate = () => {
    const e: Partial<Record<keyof SignupForm, string>> = {};
    if (!f.customer_name.trim()) e.customer_name = 'Enter your full name.';
    else if (f.customer_name.length > 100) e.customer_name = 'customer_name holds at most 100 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Enter a valid email address.';
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
    else if (n < 0) e.opening_balance = 'Opening balance cannot be negative.';
    else if (!/^\d{1,16}(\.\d{1,2})?$/.test(f.opening_balance.trim())) e.opening_balance = 'Use up to 16 digits and 2 decimals (DECIMAL(18,2)).';
    if (!f.password) e.password = 'Enter a password. Any value works in this demo.';
    return e;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    setFormError('');
    const e = validate();
    setErrors(e);
    const first = Object.keys(e)[0];
    if (first) {
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
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      setFormError((err as Error).message);
      setBusy(false);
    }
  };

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
  const attrs = (k: keyof SignupForm) => ({ id: `su-${k}`, 'aria-invalid': Boolean(errors[k]), 'aria-describedby': `su-${k}-err` });

  return (
    <AuthShell
      eyebrow="Customer view"
      title="Create an account"
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
            <Select value={f.preferred_currency} onChange={set('preferred_currency')} placeholder={customers.data ? 'Choose' : 'Loading...'} options={lists.currencies.map((c) => ({ value: c, label: c }))} {...attrs('preferred_currency')} />,
          )}
          {field('account_type', 'Account type', <Select value={f.account_type} onChange={set('account_type')} placeholder="Choose" options={ACCOUNT_TYPE.map((v) => ({ value: v, label: v }))} {...attrs('account_type')} />)}
        </div>
        {field(
          'opening_balance',
          `Opening balance${f.preferred_currency ? ` (${f.preferred_currency})` : ''}`,
          <input className="input mono" inputMode="decimal" value={f.opening_balance} onChange={set('opening_balance')} {...attrs('opening_balance')} />,
        )}
        {field('password', 'Password', <input className="input" type="password" autoComplete="new-password" value={f.password} onChange={set('password')} {...attrs('password')} />)}
        <span className="field-error" role="alert">
          {formError}
        </span>
        <button type="submit" className="btn btn-brand" disabled={busy}>
          {busy ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}
