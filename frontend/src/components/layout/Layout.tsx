import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Nav } from './Nav';
import { Footer } from './Footer';
import { Spotlight } from './Spotlight';

export function Layout() {
  const [spot, setSpot] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSpot((s) => !s);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
      {spot && <Spotlight open onClose={closeSpot} />}
    </>
  );
}
