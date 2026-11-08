# Tracewire analyst console

Front end for a bank fraud detection DBMS course project. It covers transactions, anomaly alerts, disputes, an audit trail, customer 360 profiles, a risk breakdown and a case replay. Everything is built on the six tables in `db/banking_fraud_db.sql`.

The product name is a placeholder. Change it in `src/config/brand.ts`, along with the contact email used on the legal pages.

## Run it

Requires Node 18 or later.

```bash
npm install
npm run dev        # http://localhost:5173
```

Production build:

```bash
npm run build      # type-checks, then writes dist/
npm run preview    # serves dist/
```

`dist/` is a static single-page app. Any host that rewrites unknown paths to `index.html` will serve it.

## Data: local JSON seed or the live database

The app reads data only through `src/api`. One environment variable picks the source:

| Variable | Values | Meaning |
| --- | --- | --- |
| `VITE_USE_MOCK` | `true` (default) / `false` | `true` serves the seed JSON in the browser. `false` calls the HTTP API. |
| `VITE_API_BASE_URL` | URL | Base URL of the live API, for example `http://localhost:4000/api` |

### Switch from mock to the live API

1. Build the API described in **API_CONTRACT.md**. It lists every endpoint, its parameters, request and response examples, which table each endpoint reads and which columns it writes.
2. Create `.env.local` (it overrides `.env`):

   ```
   VITE_USE_MOCK=false
   VITE_API_BASE_URL=http://localhost:4000/api
   ```

3. Restart `npm run dev` (Vite reads env files at start-up), or rebuild.
4. If the API is on another origin, enable CORS for the front-end origin with methods `GET, POST, PATCH`.

No component changes are needed. The footer shows which data source is active.

Things the API must get right (details in the contract):

- Return BIGINT ids as strings and DATETIME as naive `YYYY-MM-DD HH:MM:SS` strings (`dateStrings: true` in mysql2). The UI shows datetimes exactly as stored and never shifts them by timezone.
- Lists use `{ data, page, page_size, total }`. Errors use `{ error: { code, message } }`.
- The client writes Audit_Trail rows itself through `POST /audit` after each analyst action, so the server should not write a second one.

### Regenerating the seed JSON

```bash
npm run seed       # node scripts/seed-to-json.mjs [path/to/file.sql]
```

The script parses `db/banking_fraud_db.sql` and writes `src/api/mock/*.json`, one file per table, plus `schema_enums.json` with every ENUM definition. Values are copied exactly: BIGINT becomes a string, DECIMAL a number, BOOLEAN true/false. AUTO_INCREMENT ids missing from the INSERTs (`anomaly_id`, `dispute_id`, `audit_id`) are numbered 1, 2, 3 in insert order, the same values MySQL assigns on a fresh import.

In mock mode, writes such as resolving an alert or filing a dispute are kept in memory and in `localStorage`. "Reset local changes" in the footer restores the seed. To test error states, add `?simulate_error=1` to any URL.

## Project layout

```
db/banking_fraud_db.sql          schema and seed rows (source of truth)
scripts/seed-to-json.mjs         SQL to JSON converter
src/config/brand.ts              product name and contact placeholder
src/types/db.ts                  one interface per table, SQL column names
src/constants/enums.ts           every ENUM value and its display label
src/constants/ruleFamilies.ts    rule_code to rule family mapping
src/constants/schema.ts          column list used by the ER diagram
src/api/types.ts                 FraudApi interface and query and response types
src/api/index.ts                 picks the adapter from VITE_USE_MOCK
src/api/mock/                    seed JSON and in-memory query engine
src/api/http/                    fetch adapter
src/api/actions.ts               analyst actions plus their Audit_Trail entries
src/pages/                       routes
src/components/                  layout, drawers, charts, isometric SVG
```

## Routes

| Path | What it does |
| --- | --- |
| `/` | Landing page with live counts, ER diagram and rule families |
| `/dashboard` | KPIs, status, severity and action breakdowns, latest transactions, unresolved alerts |
| `/transactions` | Filter, sort, paginate, CSV export; the drawer has sender and receiver details |
| `/alerts` | Anomaly_Patterns: resolve with notes, change action, assign reviewer |
| `/disputes` | File disputes with validation and move them through the status flow |
| `/audit` | Read-only Audit_Trail timeline |
| `/customers`, `/customers/:id` | List and 360 profile, with masked contact details and logged reveal |
| `/risk` | Donut and list of shares by severity, action, transaction status or dispute status |
| `/replay`, `/replay/:transaction_ref` | Case replay: merged timeline, risk gauge, dot-grid map |
| `/privacy`, `/terms` | Legal pages |

Filters live in the query string, so every filtered view can be shared as a link. Press Cmd+K or Ctrl+K anywhere to search customers, emails, account numbers, transaction refs and rule codes. The analyst picker in the nav sets `performed_by` for new audit entries.

## A note on rule families

The seed `rule_code` values (`VELOCITY_LIMIT_06`, `SANCTION_BLOCK_29`) have no family prefix. `src/constants/ruleFamilies.ts` maps each code stem to one of AML, VEL, GEO, BEH, FRE, AMT, BEN, DEV, INV, FX and MCC. Codes that do start with a family key, such as `AML_...`, use that prefix directly. Unknown codes are counted as "Other". Edit the table if your team classifies a code differently.

## Accessibility and motion

Every control is keyboard reachable with a visible focus ring. Colour chips always carry a text label. With `prefers-reduced-motion`, the hero ripple, the letter-by-letter headline, the scroll reveals, the sticky slide sequence and the marquee are replaced with static versions.
