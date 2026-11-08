import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'react-router-dom';

// ---------- Async data ----------

export interface AsyncState<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  reload: () => void;
  setData: (updater: (prev: T | undefined) => T | undefined) => void;
}

/** Runs `fn` whenever `deps` change. Stale responses are dropped. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setDataState] = useState<T>();
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(undefined);
    fnRef
      .current()
      .then((d) => {
        if (alive) {
          setDataState(d);
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (alive) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((u: (prev: T | undefined) => T | undefined) => setDataState((p) => u(p)), []);
  return { data, error, loading, reload, setData };
}

// ---------- URL query state ----------

const NON_FILTER_KEYS: string[] = ['page', 'sort', 'open', 'page_size', 'new', 'customer'];

/**
 * Filters live in the query string so every view is shareable.
 * Returns the current values (with defaults) and a setter that merges and resets page to 1
 * unless `page` itself is being set.
 */
export function useQueryState<K extends string>(defaults: Record<K, string>) {
  const [params, setParams] = useSearchParams();
  const keys = Object.keys(defaults) as K[];
  const values = useMemo(() => {
    const out = {} as Record<K, string>;
    for (const k of keys) out[k] = params.get(k) ?? defaults[k];
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const set = useCallback(
    (patch: Partial<Record<K, string>>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch) as [K, string | undefined][]) {
            if (v === undefined || v === '' || v === defaults[k]) next.delete(k);
            else next.set(k, v);
          }
          if (!('page' in patch)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setParams],
  );

  const clear = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const k of keys) next.delete(k);
        return next;
      },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setParams]);

  const active = keys.filter((k) => !NON_FILTER_KEYS.includes(k) && values[k] !== defaults[k]).length;
  return { values, set, clear, active };
}

// ---------- Debounce ----------

export function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

// ---------- Reduced motion ----------

const mq = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      mq?.addEventListener('change', cb);
      return () => mq?.removeEventListener('change', cb);
    },
    () => Boolean(mq?.matches),
    () => false,
  );
}

// ---------- Element in view ----------

export function useInView<T extends Element>(opts: IntersectionObserverInit = { threshold: 0.2 }, once = true) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        if (once) io.disconnect();
      } else if (!once) setInView(false);
    }, opts);
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { ref, inView };
}

/** Progress 0..1 of an element scrolling through the viewport. */
export function useScrollProgress<T extends HTMLElement>(mode: 'through' | 'sticky' = 'through') {
  const ref = useRef<T>(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      let v: number;
      if (mode === 'sticky') v = -r.top / Math.max(1, r.height - vh);
      else v = (vh - r.top) / (vh + r.height);
      setP(Math.min(1, Math.max(0, v)));
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [mode]);
  return { ref, progress: p };
}

// ---------- Search box synced to the URL ----------

/** Local draft for a search input that commits to the URL after a pause, and follows external URL changes. */
export function useSyncedSearch(urlValue: string, commit: (v: string) => void, ms = 250): [string, (v: string) => void] {
  const [draft, setDraft] = useState(urlValue);
  const debounced = useDebounced(draft, ms);
  const committed = useRef(urlValue);
  const commitRef = useRef(commit);
  commitRef.current = commit;
  useEffect(() => {
    if (debounced !== committed.current) {
      committed.current = debounced;
      commitRef.current(debounced);
    }
  }, [debounced]);
  useEffect(() => {
    if (urlValue !== committed.current) {
      committed.current = urlValue;
      setDraft(urlValue);
    }
  }, [urlValue]);
  return [draft, setDraft];
}
