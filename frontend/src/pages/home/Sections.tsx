import { Fragment, useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { StatsSummary } from '../../api/types';
import type { AuditTrail } from '../../types/db';
import { Corners, SkeletonBlock, ErrorState } from '../../components/ui';
import { LedgerStack } from '../../components/illustrations/iso';
import { DetectScene, type DetectCycle } from '../../components/scenes/DetectScene';
import { ReviewScene } from '../../components/scenes/ReviewScene';
import { DisputeScene } from '../../components/scenes/DisputeScene';
import { AuditScene } from '../../components/scenes/AuditScene';
import { ClosingScene } from '../../components/scenes/ClosingScene';
import { AlertFeedAnimation, DisputeTrackAnimation } from '../../components/scenes/CardAnimations';
import { ERDiagram } from '../../components/charts/ERDiagram';
import { useInView, useReducedMotion, useScrollProgress } from '../../lib/hooks';
import { formatInt, formatMoney } from '../../lib/format';
import { RULE_FAMILIES, OTHER_FAMILY, ruleFamily } from '../../constants/ruleFamilies';
import type { AsyncState } from '../../lib/hooks';

// ---------- 4. Sticky split-screen ----------

const SLIDES = [
  { word: 'Detect.', caption: '01  Anomaly_Patterns', Scene: DetectScene },
  { word: 'Review.', caption: '02  Analyst queue', Scene: ReviewScene },
  { word: 'Dispute.', caption: '03  Dispute_Logs', Scene: DisputeScene },
  { word: 'Audit.', caption: '04  Audit_Trail', Scene: AuditScene },
];
const ENDING = 'Whether you analyse alerts or handle disputes, it starts here.';

export function StickySplit({ summary }: { summary?: StatsSummary }) {
  const reduced = useReducedMotion();
  const { ref, progress } = useScrollProgress<HTMLElement>('sticky');
  const [cycle, setCycle] = useState<DetectCycle>('clean');
  const onCycle = useCallback((c: DetectCycle) => setCycle(c), []);
  // Five states: four slides then the closing line.
  const states = SLIDES.length + 1;
  const pos = Math.min(states - 0.0001, progress * states);
  const idx = Math.floor(pos);
  const local = pos - idx;
  const slide = SLIDES[Math.min(idx, SLIDES.length - 1)];
  const ending = idx >= SLIDES.length;
  const by = (k: string) => summary?.transactions.by_status.find((x) => x.key === k)?.count ?? 0;
  const detectCaption = cycle === 'clean' ? '01  Transactions · clean transfer' : '01  Anomaly_Patterns · flagged transfer';
  const detectFact = summary
    ? cycle === 'clean'
      ? `${formatInt(by('Success'))} of ${formatInt(summary.transactions.total)} transactions settled as Success`
      : `${formatInt(by('Flagged'))} flagged and ${formatInt(by('Blocked'))} blocked transactions`
    : '';
  const facts = summary
    ? [
        detectFact,
        `${formatInt(summary.anomalies.by_action.find((a) => a.key === 'Flag_For_Review')?.count ?? 0)} alerts set to Flag for review, ${formatInt(summary.anomalies.open)} unresolved`,
        `${formatInt(summary.disputes.total)} disputes, ${formatInt(summary.disputes.open)} still open`,
        `${formatInt(summary.audit.total)} audit entries recorded`,
      ]
    : [];
  const captionFor = (i: number) => (i === 0 ? detectCaption : SLIDES[i].caption);

  if (reduced) {
    return (
      <section className="split-static" aria-label="How a case moves">
        {SLIDES.map((s, i) => (
          <div key={s.word} className="split-stage">
            <div className="split-left corners">
              <Corners />
              <p className="split-caption mono">{captionFor(i)}</p>
              <p className="split-phrase">{s.word}</p>
              <p className="split-fact">{facts[i]}</p>
            </div>
            <div className="split-right dot-grid">
              <div className="split-frame">{i === 0 ? <DetectScene onCycle={onCycle} /> : <s.Scene />}</div>
            </div>
          </div>
        ))}
        <div className="split-stage">
          <div className="split-left corners">
            <Corners />
            <p className="split-phrase split-phrase-long">{ENDING}</p>
          </div>
          <div className="split-right dot-grid">
            <div className="split-frame">
              <ClosingScene />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} className="split" style={{ height: `${states * 90 + 30}vh` }} aria-label="How a case moves">
      <div className="split-stage split-sticky">
        <div className="split-left corners">
          <Corners />
          <p className="split-caption mono">{ending ? '05  One console' : captionFor(idx)}</p>
          <p className={`split-phrase${ending ? ' split-phrase-long' : ''}`} key={ending ? 'end' : slide.word} aria-live="polite">
            {ending ? ENDING : slide.word}
          </p>
          <p className="split-fact">{ending ? 'Six linked tables, one record of every decision.' : facts[idx]}</p>
          <div className="split-dashes" aria-hidden="true">
            {SLIDES.map((s, i) => (
              <span key={s.word} className="dash">
                <span style={{ width: `${i < idx || ending ? 100 : i === idx ? local * 100 : 0}%` }} />
              </span>
            ))}
          </div>
        </div>
        <div className="split-right dot-grid">
          <div className="split-frame" key={ending ? 'end' : slide.word}>
            {ending ? <ClosingScene /> : idx === 0 ? <DetectScene onCycle={onCycle} /> : <slide.Scene />}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- 5. Hairline with sliding squares ----------

export function Hairline() {
  const { ref, progress } = useScrollProgress<HTMLDivElement>('through');
  return (
    <div ref={ref} className="hairline" aria-hidden="true">
      <span className="hl-sq" style={{ left: `${4 + progress * 42}%` }} />
      <span className="hl-sq" style={{ left: `${96 - progress * 42}%` }} />
    </div>
  );
}

// ---------- 6. Audience cards ----------

function FadeUp({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.15 });
  return (
    <div ref={ref} className={`fade-up ${inView ? 'in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

export function AudienceCards({ summary }: { summary?: StatsSummary }) {
  const cards = [
    {
      title: 'Analysts',
      Art: AlertFeedAnimation,
      bullets: [
        summary ? `${formatInt(summary.anomalies.open)} unresolved alerts in Anomaly_Patterns` : 'Unresolved alerts in Anomaly_Patterns',
        'Filter by severity, action taken and rule family',
        'Resolve with notes, each change written to Audit_Trail',
      ],
      cta: 'Open the alert queue',
      to: '/alerts?is_resolved=false',
    },
    {
      title: 'Disputes team',
      Art: DisputeTrackAnimation,
      bullets: [
        summary ? `${formatInt(summary.disputes.open)} disputes open, under investigation or escalated` : 'Open disputes in Dispute_Logs',
        'File a dispute against a real transaction_ref',
        'Move cases from Open to Resolved or Rejected',
      ],
      cta: 'Open the dispute log',
      to: '/disputes',
    },
  ];
  return (
    <section className="wrap audience" aria-label="Who uses the console">
      {cards.map((c, i) => (
        <FadeUp key={c.title} delay={i * 120}>
          <article className="aud-card">
            <div className="aud-art">
              <c.Art />
            </div>
            <h2>{c.title}</h2>
            <ul className="aud-list">
              {c.bullets.map((b) => (
                <li key={b}>
                  <span className="sq" aria-hidden="true" />
                  {b}
                </li>
              ))}
            </ul>
            <div className="cta-pair">
              <Link to={c.to} className="btn btn-brand">
                {c.cta}
              </Link>
              <Link to={c.to} className="btn btn-white" aria-label={`${c.cta}, arrow`} tabIndex={-1}>
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </article>
        </FadeUp>
      ))}
    </section>
  );
}

// ---------- 7. Data model ----------

const PARA: { w: string; i?: boolean }[] = [
  { w: 'The' },
  { w: 'six', i: true },
  { w: 'tables' },
  { w: 'below' },
  { w: 'carry' },
  { w: 'every', i: true },
  { w: 'case' },
  { w: 'from' },
  { w: 'first', i: true },
  { w: 'flag' },
  { w: 'to' },
  { w: 'final', i: true },
  { w: 'audit' },
  { w: 'entry.' },
];

export function DataModel({ summary }: { summary?: StatsSummary }) {
  const reduced = useReducedMotion();
  const { ref, progress } = useScrollProgress<HTMLDivElement>('through');
  // Reveal across the middle of the element's pass through the viewport.
  const lit = reduced ? PARA.length : Math.round(Math.min(1, Math.max(0, (progress - 0.12) / 0.3)) * PARA.length);
  return (
    <section className="wrap datamodel" aria-labelledby="dm-title">
      <span className="eyebrow">
        <span className="sq" aria-hidden="true" />
        The data model
      </span>
      <div ref={ref}>
        <h2 id="dm-title" className="reveal-para">
          {PARA.map((p, i) => (
            <Fragment key={i}>
              <span className={`${i < lit ? 'lit' : ''}${p.i ? ' it' : ''}`}>{p.w}</span>{' '}
            </Fragment>
          ))}
        </h2>
      </div>
      <p className="dm-hint">Hover a table to highlight the tables it links to. Click or press Enter to list its columns.</p>
      <ERDiagram counts={summary?.tables} />
    </section>
  );
}

// ---------- 8. Stats band ----------

interface Block {
  label: string;
  value: string;
  tone: 'brand' | 'ink' | 'grey' | 'white';
}

export function StatsBand({ state }: { state: AsyncState<StatsSummary> }) {
  const reduced = useReducedMotion();
  const s = state.data;
  if (state.error) return <div className="wrap"><ErrorState error={state.error} onRetry={state.reload} /></div>;
  if (!s) return <div className="wrap" style={{ padding: '40px var(--gutter)' }}><SkeletonBlock height={200} /></div>;
  const by = (k: string) => s.transactions.by_status.find((x) => x.key === k)?.count ?? 0;
  const tones: Block['tone'][] = ['brand', 'ink', 'grey', 'white'];
  const blocks: Block[] = [
    { label: 'Total transactions', value: formatInt(s.transactions.total) },
    { label: 'Flagged', value: formatInt(by('Flagged')) },
    { label: 'Blocked', value: formatInt(by('Blocked')) },
    { label: 'Open alerts', value: formatInt(s.anomalies.open) },
    { label: 'Open disputes', value: formatInt(s.disputes.open) },
    ...s.transactions.blocked_amount_by_currency.map((c) => ({ label: `Blocked amount, ${c.currency}`, value: formatMoney(c.total, c.currency, { compact: true }) })),
  ].map((b, i) => ({ ...b, tone: tones[i % tones.length] }));

  const row = (hidden: boolean) => (
    <div className="band-row" aria-hidden={hidden || undefined}>
      {blocks.map((b, i) => (
        <div key={i} className={`band-block band-${b.tone}`}>
          <span className="band-label">{b.label}</span>
          <span className="band-value mono">{b.value}</span>
        </div>
      ))}
    </div>
  );
  return (
    <section className={`band${reduced ? ' band-static' : ''}`} aria-label="Totals from the data">
      <div className="band-track">
        {row(false)}
        {!reduced && row(true)}
      </div>
    </section>
  );
}

// ---------- 9. Paper section ----------

export function RecordSection({ audit }: { audit: AsyncState<AuditTrail[]> }) {
  const rows = audit.data ? [...audit.data].reverse().map((a) => a.action_timestamp) : undefined;
  return (
    <section className="paper-section on-light" aria-labelledby="rec-title">
      <div className="wrap paper-grid">
        <div>
          <h2 id="rec-title" className="paper-title">
            Every action leaves a record.
          </h2>
          <p className="paper-sub">
            Resolving an alert, changing its action, assigning a reviewer, filing or moving a dispute and revealing masked contact details each write a row to Audit_Trail with the analyst name and
            timestamp.
          </p>
          <div className="paper-ctas">
            <Link to="/audit" className="btn btn-brand">
              Open audit trail <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link to="/privacy" className="btn btn-black">
              Read the privacy policy
            </Link>
          </div>
        </div>
        <div className="paper-art">
          {audit.error ? (
            <ErrorState error={audit.error} onRetry={audit.reload} />
          ) : rows ? (
            <>
              <LedgerStack dark rows={rows} />
              <p className="paper-art-cap mono">Latest {rows.length} action_timestamp values from Audit_Trail, newest on top</p>
            </>
          ) : (
            <SkeletonBlock height={320} />
          )}
        </div>
      </div>
    </section>
  );
}

// ---------- 10. Method ----------

export function Method({ summary }: { summary?: StatsSummary }) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.25 });
  const reduced = useReducedMotion();
  const counts = new Map<string, number>();
  for (const r of summary?.anomalies.by_rule_code ?? []) {
    const f = ruleFamily(r.key);
    counts.set(f, (counts.get(f) ?? 0) + r.count);
  }
  const families = [...RULE_FAMILIES, ...(counts.get('Other') ? [OTHER_FAMILY] : [])];
  const max = Math.max(1, ...families.map((f) => counts.get(f.key) ?? 0));
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => setSel(null), [summary]);
  const total = summary?.anomalies.total ?? 0;
  return (
    <section className="method" aria-labelledby="method-title">
      <div className="wrap method-head">
        <span className="eyebrow">
          <span className="sq" aria-hidden="true" />
          Method
        </span>
        <h2 id="method-title" className="method-statement">
          Each alert in Anomaly_Patterns comes from a rule. Grouped by family, the {formatInt(total)} alerts show which checks fire most.
        </h2>
        <p className="method-note">Families are read from the rule_code. Codes without a family prefix are matched by their stem; the mapping lives in src/constants/ruleFamilies.ts.</p>
      </div>
      <div ref={ref} className={`method-bars wrap${inView || reduced ? ' in' : ''}`} style={{ ['--n' as string]: families.length }}>
        {families.map((f, i) => {
          const n = counts.get(f.key) ?? 0;
          return (
            <Link
              key={f.key}
              to={`/alerts?rule_family=${f.key}`}
              className={`mbar${sel === f.key ? ' sel' : ''}`}
              onMouseEnter={() => setSel(f.key)}
              onMouseLeave={() => setSel(null)}
            >
              <div className="mbar-text">
                <span className="mbar-key mono">{f.key}</span>
                <span className="mbar-count mono">
                  {formatInt(n)}
                  <span className="sr-only"> alerts</span>
                </span>
                <span className="mbar-name">{f.name}</span>
                <span className="mbar-desc">{f.description}</span>
              </div>
              <span className="mbar-fill" style={{ ['--h' as string]: n / max, transitionDelay: `${i * 60}ms` }} data-tone={i % 2 ? 'panel' : 'bright'} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
