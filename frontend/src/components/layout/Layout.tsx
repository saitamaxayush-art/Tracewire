import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Nav } from './Nav';
import { Footer } from './Footer';
import { Spotlight } from './Spotlight';
import { rememberPath, roleOf } from '../../lib/customerSession';

export function Layout() {
  const [spot, setSpot] = useState(false);
  const loc = useLocation();

  const customerSide = roleOf(loc.pathname) === 'customer';

  // Remember the last page on each side so the role switch returns to it.
  useEffect(() => {
    const role = roleOf(loc.pathname);
    // A send result plays its animation once, so coming back lands on the plain transaction page.
    const path = loc.pathname.replace(/^\/app\/send\/(.+)$/, '/app/transactions/$1');
    if (role === 'analyst' || (role === 'customer' && path.startsWith('/app'))) rememberPath(role, path + loc.search);
  }, [loc.pathname, loc.search]);

  useEffect(() => {
    // Search covers every customer's records, so it is an analyst tool only.
    if (customerSide) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSpot((s) => !s);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [customerSide]);

  useEffect(() => {
    if (!loc.hash) window.scrollTo(0, 0);
  }, [loc.pathname, loc.hash]);

  const closeSpot = useCallback(() => setSpot(false), []);

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Nav onSearch={() => setSpot(true)} />
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
      {spot && !customerSide && <Spotlight open onClose={closeSpot} />}
    </>
  );
}
