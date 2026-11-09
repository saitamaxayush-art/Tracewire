import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { brand } from '../config/brand';
import { formatNaive } from '../lib/datetime';

interface Section {
  id: string;
  title: string;
  body: ReactNode;
}

function LegalPage({ eyebrow, title, intro, sections }: { eyebrow: string; title: string; intro: ReactNode; sections: Section[] }) {
  const [active, setActive] = useState(sections[0].id);
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: '-20% 0px -70% 0px' },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [sections]);

  return (
    <div className="legal on-light">
      <div className="wrap legal-head">
        <span className="eyebrow eyebrow-dark">
          <span className="sq" aria-hidden="true" />
          {eyebrow}
        </span>
        <h1>{title}</h1>
        <p className="legal-meta">
          Effective date: <time dateTime={brand.legalEffectiveDate}>{formatNaive(brand.legalEffectiveDate, { dateOnly: true })}</time>
        </p>
        <div className="legal-intro">{intro}</div>
      </div>
      <div className="wrap legal-grid">
        <nav className="legal-toc" aria-label="On this page">
          <p className="legal-toc-title">On this page</p>
          <ol>
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} aria-current={active === s.id ? 'location' : undefined}>
                  <span className="mono">{String(i + 1).padStart(2, '0')}</span> {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <article className="legal-body">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`}>
              <h2 id={`${s.id}-h`}>
                <span className="mono">{String(i + 1).padStart(2, '0')}</span> {s.title}
              </h2>
              {s.body}
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}

const Contact = () => (
  <p>
    Questions about this page go to the {brand.contactLabel}: <a href={`mailto:${brand.contactEmail}`}>{brand.contactEmail}</a>. This address is a placeholder set in <code>src/config/brand.ts</code> and should be replaced
    by the project team before the console is shared.
  </p>
);

export function Privacy() {
  const sections: Section[] = [
    {
      id: 'about',
      title: 'What this project is',
      body: (
        <>
          <p>
            {brand.name} is a {brand.courseLabel}. It is an analyst console for a fictional bank fraud detection system, built to show how six linked database tables (Customers, Accounts, Transactions,
            Anomaly_Patterns, Dispute_Logs and Audit_Trail) support a fraud review workflow.
          </p>
          <p>It is not operated by a bank, does not process real payments and is not offered to the public as a service.</p>
        </>
      ),
    },
    {
      id: 'records',
      title: 'The records are fictional',
      body: (
        <>
          <p>
            Every customer, account, transaction, alert, dispute and audit entry shown in the console was created by the project team for coursework. Names, email addresses, phone numbers, account
            numbers, IFSC codes and coordinates are invented. Any resemblance to a real person or account is a coincidence.
          </p>
          <p>Please do not enter real personal or financial information into any form in the console, including the dispute form and the reviewer field.</p>
        </>
      ),
    },
    {
      id: 'stores',
      title: 'What the app stores',
      body: (
        <>
          <p>The console keeps a small amount of information in your own browser, and nowhere else:</p>
          <ul>
            <li>
              <strong>Display preferences.</strong> The analyst name you pick in the navigation (Analyst01 or Analyst02) is kept in local storage. When you use the customer view, the signed-in customer (customer_id, name and preferred currency) is kept there too, separately from the analyst name. Log out removes it.
            </li>
            <li>
              <strong>Local record changes.</strong> When the console runs on its local JSON seed, the changes you make (resolving alerts, filing disputes, new audit entries) are saved in local storage so they
              survive a reload. The footer button "Reset local changes" deletes them.
            </li>
          </ul>
          <p>
            When the console is connected to the project database instead, those changes are sent to the project team's own API and stored in its MySQL database, in the same six tables described above.
          </p>
        </>
      ),
    },
    {
      id: 'no-tracking',
      title: 'No tracking, analytics or third-party scripts',
      body: (
        <>
          <p>The console sets no cookies and uses no analytics, advertising or tracking tools. It does not record which pages you visit or what you click.</p>
          <p>
            It loads no third-party scripts. Fonts are bundled with the app and served from the same place as the app itself, so opening a page does not contact a font or content delivery service. Charts,
            maps and illustrations are drawn in the browser with SVG; the map uses no map tiles or location services.
          </p>
        </>
      ),
    },
    {
      id: 'masking',
      title: 'Masked fields and reveal logging',
      body: (
        <>
          <p>
            Email addresses and phone numbers are masked by default in customer lists and profiles, the way a real console limits exposure of personal data. Only the first character of an email and the
            last two digits of a phone number are shown.
          </p>
          <p>
            Pressing "Reveal" on a customer profile shows the full value for that page view only. Each reveal writes a row to Audit_Trail with the action type "PII Revealed", the customer_id, the analyst name
            selected in the navigation and the time of the reveal. Those rows appear on the audit trail page like any other entry and cannot be edited from the console.
          </p>
        </>
      ),
    },
    {
      id: 'audit',
      title: 'Audit entries for analyst actions',
      body: (
        <p>
          Resolving or reopening an alert, changing its action, assigning a reviewer, filing a dispute and changing a dispute status each add a row to Audit_Trail. The row holds the analyst name, a short
          description of the change and a timestamp. This is part of the demonstration of an audit trail, not a record of you as a person.
        </p>
      ),
    },
    {
      id: 'rights',
      title: 'Removing your data',
      body: (
        <p>
          Because the only stored information lives in your browser, you can remove it at any time by pressing "Reset local changes" in the footer, or by clearing site data for this page in your browser
          settings.
        </p>
      ),
    },
    {
      id: 'changes',
      title: 'Changes to this policy',
      body: <p>If the project changes what it stores, this page will be updated and the effective date above will change.</p>,
    },
    { id: 'contact', title: 'Contact', body: <Contact /> },
  ];
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro={<p>This policy explains what the {brand.name} console stores, what it does not, and how masked customer details and reveal logging work. It is written in plain language.</p>}
      sections={sections}
    />
  );
}

export function Terms() {
  const sections: Section[] = [
    {
      id: 'agreement',
      title: 'About these terms',
      body: (
        <p>
          These terms cover your use of the {brand.name} console, a {brand.courseLabel}. By opening the console you agree to use it as described here. If you do not agree, please close the page.
        </p>
      ),
    },
    {
      id: 'use',
      title: 'Acceptable use of the demo',
      body: (
        <>
          <p>You may browse, filter and export the records, try the alert and dispute workflows, and use the console to study or present the database design.</p>
          <p>Please do not:</p>
          <ul>
            <li>enter real personal, banking or card details into any field;</li>
            <li>try to break, overload or gain unauthorised access to the console or the project API;</li>
            <li>present the console or its fictional data as a real bank, a real fraud service or real customer records.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'not-advice',
      title: 'Not financial advice, not real banking',
      body: (
        <p>
          Nothing in the console is financial, legal or compliance advice. No real money moves, no real account is checked and no real dispute is filed with any bank. Risk scores, severity levels and actions
          are invented values for teaching purposes and must not be used to judge a real person or transaction.
        </p>
      ),
    },
    {
      id: 'fictional',
      title: 'The data is fictional',
      body: (
        <p>
          All customers, accounts, transactions, alerts, disputes and audit entries were made up for coursework. They can be changed or reset at any time, and the project team may replace them without notice.
        </p>
      ),
    },
    {
      id: 'warranty',
      title: 'No warranty',
      body: <p>The console is provided as is, as student work. The project team does not promise that it is complete, accurate, available at any given time or free of errors.</p>,
    },
    {
      id: 'liability',
      title: 'Limitation of liability',
      body: (
        <p>
          To the extent the law allows, the project team is not responsible for any loss or harm that comes from using or being unable to use the console, including decisions made from its fictional data or loss
          of changes stored in your browser.
        </p>
      ),
    },
    {
      id: 'changes',
      title: 'Changes to these terms',
      body: <p>These terms may be updated as the project develops. The effective date above shows when they last changed. Continuing to use the console after a change means you accept the updated terms.</p>,
    },
    {
      id: 'contact',
      title: 'Contact',
      body: (
        <>
          <Contact />
          <p>
            See also the <Link to="/privacy">Privacy Policy</Link>.
          </p>
        </>
      ),
    },
  ];
  return <LegalPage eyebrow="Legal" title="Terms of Use" intro={<p>Plain-language terms for using the {brand.name} demo console and its fictional data.</p>} sections={sections} />;
}
