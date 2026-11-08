import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useReducedMotion } from '../../lib/hooks';

const HEADLINE = 'Every flagged transfer, traced from alert to resolution.';

/** Full-bleed field of thin vertical bars. Concentric ripples radiate from the cursor. */
function RippleField({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const css = getComputedStyle(document.documentElement);
    const grey = css.getPropertyValue('--line').trim() || '#26303a';
    const grey2 = css.getPropertyValue('--muted').trim() || '#8a96a3';
    const brand = css.getPropertyValue('--brand-bright').trim() || '#22c493';

    let w = 0;
    let h = 0;
    let dpr = 1;
    const GX = 12;
    const GY = 26;
    let cols = 0;
    let rows = 0;
    let accents = new Set<number>();
    const target = { x: 0.5, y: 0.42 };
    const center = { x: 0.5, y: 0.42 };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / GX) + 1;
      rows = Math.ceil(h / GY) + 1;
      // A fixed, sparse set of bars turn brand-bright. Deterministic so it does not flicker on resize.
      accents = new Set();
      for (let i = 0; i < cols * rows; i++) if (((i * 2654435761) >>> 0) % 97 === 0) accents.add(i);
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      center.x += (target.x - center.x) * 0.06;
      center.y += (target.y - center.y) * 0.06;
      const cx = center.x * w;
      const cy = center.y * h;
      const maxD = Math.hypot(w, h);
      for (let r = 0; r < rows; r++) {
        const y = r * GY + 6;
        for (let c = 0; c < cols; c++) {
          const x = c * GX + 4;
          const d = Math.hypot(x - cx, (y - cy) * 1.25);
          const wave = Math.sin(d / 34 - t / 520);
          const fall = 1 - Math.min(1, d / (maxD * 0.75));
          const crest = Math.max(0, wave) * fall;
          const len = 3 + crest * 15;
          const idx = r * cols + c;
          const accent = accents.has(idx) && crest > 0.35;
          ctx.fillStyle = accent ? brand : crest > 0.55 ? grey2 : grey;
          ctx.globalAlpha = accent ? 1 : 0.35 + crest * 0.65;
          ctx.fillRect(x, y + (18 - len) / 2, 1.5, len);
        }
      }
      ctx.globalAlpha = 1;
    };

    resize();
    let raf = 0;
    const loop = (t: number) => {
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    let visible = true;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (reduced) return;
      if (visible && !raf) raf = requestAnimationFrame(loop);
      if (!visible && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    });
    io.observe(canvas);
    if (reduced) draw(1800);
    else raf = requestAnimationFrame(loop);

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      if (e.clientY > r.bottom) return;
      target.x = (e.clientX - r.left) / r.width;
      target.y = (e.clientY - r.top) / r.height;
    };
    const onResize = () => {
      resize();
      if (reduced) draw(1800);
    };
    window.addEventListener('resize', onResize);
    if (!reduced) window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
    };
  }, [reduced]);
  return <canvas ref={ref} className="hero-canvas" aria-hidden="true" />;
}

function TypedHeadline({ reduced }: { reduced: boolean }) {
  const [n, setN] = useState(reduced ? HEADLINE.length : 0);
  useEffect(() => {
    if (reduced) {
      setN(HEADLINE.length);
      return;
    }
    let i = 0;
    let id = 0;
    const start = window.setTimeout(function tick() {
      i += 1;
      setN(i);
      if (i < HEADLINE.length) id = window.setTimeout(tick, 34 + (HEADLINE[i - 1] === ',' ? 220 : 0));
    }, 380);
    return () => {
      clearTimeout(start);
      clearTimeout(id);
    };
  }, [reduced]);
  return (
    <h1 className="hero-title">
      <span className="sr-only">{HEADLINE}</span>
      <span aria-hidden="true">
        {HEADLINE.slice(0, n)}
        <span className={`caret${reduced ? ' caret-static' : ''}`} />
        <span className="hero-ghost">{HEADLINE.slice(n)}</span>
      </span>
    </h1>
  );
}

export function Hero() {
  const reduced = useReducedMotion();
  return (
    <section className="hero" aria-label="Introduction">
      <RippleField reduced={reduced} />
      <div className="hero-content wrap">
        <TypedHeadline reduced={reduced} />
        <div className="hero-ctas">
          <Link to="/dashboard" className="btn btn-brand">
            Open dashboard <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link to="/transactions?status=Flagged" className="btn btn-white">
            Review flagged transactions
          </Link>
        </div>
      </div>
    </section>
  );
}
