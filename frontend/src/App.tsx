import { lazy, Suspense, useEffect } from 'react';
import { createBrowserRouter, Navigate, RouterProvider, useLocation } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { SessionProvider } from './lib/session';
import { CustomerSessionProvider, RequireCustomer } from './lib/customerSession';
import { brand } from './config/brand';
import { SkeletonRows } from './components/ui';
import Home from './pages/home/Home';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Alerts = lazy(() => import('./pages/Alerts'));
const Disputes = lazy(() => import('./pages/Disputes'));
const Audit = lazy(() => import('./pages/Audit'));
const Customers = lazy(() => import('./pages/Customers'));
const CustomerDetail = lazy(() => import('./pages/CustomerDetail'));
const Risk = lazy(() => import('./pages/Risk'));
const Replay = lazy(() => import('./pages/Replay'));
const Privacy = lazy(() => import('./pages/Legal').then((m) => ({ default: m.Privacy })));
const Terms = lazy(() => import('./pages/Legal').then((m) => ({ default: m.Terms })));
const NotFound = lazy(() => import('./pages/NotFound'));
const Login = lazy(() => import('./pages/customer/Auth').then((m) => ({ default: m.Login })));
const Signup = lazy(() => import('./pages/customer/Auth').then((m) => ({ default: m.Signup })));
const CustomerDashboard = lazy(() => import('./pages/customer/CustomerDashboard'));
const SendMoney = lazy(() => import('./pages/customer/SendMoney'));
const CustomerTransaction = lazy(() => import('./pages/customer/CustomerTransaction'));

const TITLES: [RegExp, string][] = [
  [/^\/$/, 'Fraud analyst console'],
  [/^\/dashboard/, 'Dashboard'],
  [/^\/transactions/, 'Transactions'],
  [/^\/alerts/, 'Alerts'],
  [/^\/disputes/, 'Disputes'],
  [/^\/audit/, 'Audit trail'],
  [/^\/customers\/.+/, 'Customer profile'],
  [/^\/customers/, 'Customers'],
  [/^\/risk/, 'Risk breakdown'],
  [/^\/replay\/.+/, 'Case replay'],
  [/^\/replay/, 'Case replay'],
  [/^\/privacy/, 'Privacy Policy'],
  [/^\/terms/, 'Terms of Use'],
  [/^\/login/, 'Log in'],
  [/^\/signup/, 'Create an account'],
  [/^\/app\/dashboard/, 'Your accounts'],
  [/^\/app\/send\/.+/, 'Transfer result'],
  [/^\/app\/send/, 'Send money'],
  [/^\/app\/transactions\/.+/, 'Transaction'],
];

function Page({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  useEffect(() => {
    const t = TITLES.find(([re]) => re.test(loc.pathname))?.[1] ?? 'Page not found';
    document.title = `${t} | ${brand.name}`;
  }, [loc.pathname]);
  return (
    <Suspense
      fallback={
        <div className="app-page wrap">
          <SkeletonRows rows={8} cols={4} />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Page><Home /></Page> },
      { path: '/dashboard', element: <Page><Dashboard /></Page> },
      { path: '/transactions', element: <Page><Transactions /></Page> },
      { path: '/alerts', element: <Page><Alerts /></Page> },
      { path: '/disputes', element: <Page><Disputes /></Page> },
      { path: '/audit', element: <Page><Audit /></Page> },
      { path: '/customers', element: <Page><Customers /></Page> },
      { path: '/customers/:customer_id', element: <Page><CustomerDetail /></Page> },
      { path: '/risk', element: <Page><Risk /></Page> },
      { path: '/replay', element: <Page><Replay /></Page> },
      { path: '/replay/:transaction_ref', element: <Page><Replay /></Page> },
      { path: '/privacy', element: <Page><Privacy /></Page> },
      { path: '/terms', element: <Page><Terms /></Page> },
      { path: '/login', element: <Page><Login /></Page> },
      { path: '/signup', element: <Page><Signup /></Page> },
      { path: '/app', element: <Navigate to="/app/dashboard" replace /> },
      { path: '/app/dashboard', element: <RequireCustomer><Page><CustomerDashboard /></Page></RequireCustomer> },
      { path: '/app/send', element: <RequireCustomer><Page><SendMoney /></Page></RequireCustomer> },
      { path: '/app/send/:transaction_ref', element: <RequireCustomer><Page><CustomerTransaction playback /></Page></RequireCustomer> },
      { path: '/app/transactions/:transaction_ref', element: <RequireCustomer><Page><CustomerTransaction /></Page></RequireCustomer> },
      { path: '/app/*', element: <RequireCustomer><Page><NotFound /></Page></RequireCustomer> },
      { path: '*', element: <Page><NotFound /></Page> },
    ],
  },
], {
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
});

export default function App() {
  return (
    <SessionProvider>
      <CustomerSessionProvider>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </CustomerSessionProvider>
    </SessionProvider>
  );
}
