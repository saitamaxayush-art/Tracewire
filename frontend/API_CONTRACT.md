# API contract

The front end talks to one interface, `FraudApi` in `src/api/types.ts`. With `VITE_USE_MOCK=false` the HTTP adapter (`src/api/http/index.ts`) calls the endpoints below on `VITE_API_BASE_URL`. The mock adapter (`src/api/mock/engine.ts`) implements the same filtering, sorting and paging rules in memory, so it doubles as a reference for the SQL.

## Conventions

| Topic | Rule |
| --- | --- |
| Encoding | JSON, `Content-Type: application/json` |
| Field names | Identical to the SQL column names (snake_case) |
| BIGINT | Sent as a **string**, for example `"customer_id": "84920115"`. Numbers are accepted on input and normalised by the client. |
| DECIMAL | Sent as a JSON number, for example `18500.00` becomes `18500`. Strings are also accepted and converted. |
| BOOLEAN | `true`/`false`. `0`/`1` from the MySQL driver is accepted and normalised by the client. |
| DATETIME | Naive string `"YYYY-MM-DD HH:MM:SS"`, exactly as stored. **Do not convert to UTC or add a timezone.** Use `DATE_FORMAT(col, '%Y-%m-%d %H:%i:%s')` or set `dateStrings: true` in mysql2. |
| DATE | `"YYYY-MM-DD"` |
| NULL | JSON `null` |
| Sorting | `sort=field` ascending, `sort=-field` descending. Only the listed fields are allowed; anything else falls back to the default. |
| Paging | `page` starts at 1, `page_size` defaults to 25 (max 500) |
| Date ranges | `from` and `to` take `YYYY-MM-DD` or a full DATETIME. Both ends are inclusive and a date-only `to` covers the whole day (`23:59:59`). |
| Text search | `search` is a case-insensitive substring match (`LIKE CONCAT('%', ?, '%')`) on the listed columns |

### List response

```json
{ "data": [ ... ], "page": 1, "page_size": 25, "total": 50 }
```

### Single item response

```json
{ "data": { ... } }
```

### Error response

Any non-2xx status:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "dispute_reason must be 1 to 255 characters." } }
```

Codes the UI expects: `NOT_FOUND` (404), `VALIDATION_ERROR` (422), anything else is shown as-is with a retry button.

### Who writes Audit_Trail

The **client** writes the audit entry for every analyst action by calling `POST /audit` after the change succeeds (see `src/api/actions.ts`). The server must not write a second row for `PATCH /anomalies`, `POST /disputes` or `PATCH /disputes`. If you prefer to do it server-side inside one transaction, remove the `createAudit` calls in `actions.ts`.

---

## Endpoint summary

| Method and path | Reads | Writes |
| --- | --- | --- |
| `GET /customers` | Customers | none |
| `GET /customers/:customer_id` | Customers, Accounts, Transactions, Anomaly_Patterns, Dispute_Logs | none |
| `GET /accounts` | Accounts | none |
| `GET /transactions` | Transactions (Accounts when `customer_id` is used) | none |
| `GET /transactions/:transaction_ref` | Transactions, Accounts, Customers, Anomaly_Patterns, Dispute_Logs, Audit_Trail | none |
| `GET /anomalies` | Anomaly_Patterns | none |
| `PATCH /anomalies/:anomaly_id` | Anomaly_Patterns | Anomaly_Patterns: `action_taken`, `is_resolved`, `resolution_notes`, `reviewed_by`, `resolved_at` |
| `GET /disputes` | Dispute_Logs | none |
| `POST /disputes` | Transactions, Customers (to validate the FKs) | Dispute_Logs: every column except `dispute_id` (AUTO_INCREMENT) |
| `PATCH /disputes/:dispute_id` | Dispute_Logs | Dispute_Logs: `dispute_status`, `resolved_at` |
| `GET /audit` | Audit_Trail | none |
| `POST /audit` | none | Audit_Trail: every column except `audit_id` (AUTO_INCREMENT) |
| `GET /stats/summary` | All six tables | none |

---

## Customers

### `GET /customers`

| Param | Meaning |
| --- | --- |
| `search` | `customer_name`, `email`, `customer_id`, `country` |
| `country` | exact match |
| `customer_status` | exact ENUM value, for example `Under Review Status` |
| `sort` | `customer_name` (default), `customer_id`, `country`, `registration_date`, `customer_status` |
| `page`, `page_size` | paging |

```
GET /customers?search=sharma&page_size=2
```

```json
{
  "data": [
    {
      "customer_id": "84920115",
      "customer_name": "Aarav Sharma",
      "email": "aarav.sharma@email.com",
      "phone_number": "+91-9876543210",
      "country": "India",
      "nationality": "Indian",
      "preferred_currency": "INR",
      "customer_status": "Active Status",
      "registration_date": "2023-02-14"
    }
  ],
  "page": 1, "page_size": 2, "total": 1
}
```

Masking happens in the browser. Send the real values.

### `GET /customers/:customer_id`

Returns the customer plus everything linked to it. `transactions` holds every row where the sender **or** receiver account belongs to the customer, newest first.

```json
{
  "data": {
    "customer": { "customer_id": "84920115", "customer_name": "Aarav Sharma", "...": "..." },
    "accounts": [ { "account_id": "4019283741", "customer_id": "84920115", "account_number": "1002345678", "account_type": "Savings Account", "balance": 245680.5, "currency": "INR", "status": "Active Status", "ifsc_code": "HDFC0001234" } ],
    "transactions": [ { "transaction_ref": "UTR260801000050", "...": "..." } ],
    "anomalies": [ { "anomaly_id": "1", "...": "..." } ],
    "disputes": [ { "dispute_id": "1", "...": "..." } ]
  }
}
```

```sql
SELECT * FROM Customers WHERE customer_id = ?;
SELECT * FROM Accounts WHERE customer_id = ?;
SELECT t.* FROM Transactions t
 WHERE t.sender_account_id IN (SELECT account_id FROM Accounts WHERE customer_id = ?)
    OR t.receiver_account_id IN (SELECT account_id FROM Accounts WHERE customer_id = ?)
 ORDER BY t.created_at DESC;
SELECT * FROM Anomaly_Patterns WHERE customer_id = ? ORDER BY detected_at DESC;
SELECT * FROM Dispute_Logs WHERE customer_id = ? ORDER BY filed_at DESC;
```

404 with `NOT_FOUND` when the customer does not exist.

## Accounts

### `GET /accounts`

| Param | Meaning |
| --- | --- |
| `customer_id` | exact match |
| `search` | `account_number`, `account_id`, `ifsc_code` (used by the search overlay) |
| `sort` | `account_id` (default), `account_number`, `balance`, `account_type`, `status` |

```
GET /accounts?customer_id=84920115
```

```json
{ "data": [ { "account_id": "4019283741", "customer_id": "84920115", "account_number": "1002345678", "account_type": "Savings Account", "balance": 245680.5, "currency": "INR", "status": "Active Status", "ifsc_code": "HDFC0001234" } ], "page": 1, "page_size": 100, "total": 1 }
```

## Transactions

### `GET /transactions`

| Param | Meaning |
| --- | --- |
| `status` | ENUM: `Success`, `Pending`, `Failed`, `Flagged`, `Blocked`, `Reversed` |
| `transaction_type` | ENUM, for example `External Transfer Transaction` |
| `currency` | exact 3-letter code |
| `from`, `to` | range on `created_at` |
| `min_amount`, `max_amount` | inclusive range on `amount` (compared within each row's own currency) |
| `search` | `transaction_ref`, `sender_location`, `sender_account_id`, `receiver_account_id` |
| `customer_id` | rows where the sender or receiver account belongs to this customer |
| `sort` | `-created_at` (default), `transaction_ref`, `created_at`, `amount`, `status`, `transaction_type`, `currency`, `sender_location` |
| `page`, `page_size` | paging. CSV export requests `page_size=500` and walks the pages. |

```
GET /transactions?status=Flagged&currency=USD&sort=-amount&page=1&page_size=15
```

```json
{
  "data": [
    {
      "transaction_ref": "UTR260801000048",
      "sender_account_id": "3810901138",
      "receiver_account_id": "3921011239",
      "transaction_type": "External Transfer Transaction",
      "amount": 350000,
      "currency": "USD",
      "sender_location": "Hong Kong",
      "sender_latitude": 22.319304,
      "sender_longitude": 114.169361,
      "status": "Flagged",
      "created_at": "2026-08-18 13:55:20"
    }
  ],
  "page": 1, "page_size": 15, "total": 2
}
```

```sql
SELECT * FROM Transactions
 WHERE (? IS NULL OR status = ?)
   AND (? IS NULL OR transaction_type = ?)
   AND (? IS NULL OR currency = ?)
   AND (? IS NULL OR created_at >= ?)
   AND (? IS NULL OR created_at <= ?)
   AND (? IS NULL OR amount >= ?)
   AND (? IS NULL OR amount <= ?)
   AND (? IS NULL OR transaction_ref LIKE ? OR sender_location LIKE ? OR sender_account_id LIKE ? OR receiver_account_id LIKE ?)
 ORDER BY amount DESC
 LIMIT ? OFFSET ?;   -- plus SELECT COUNT(*) with the same WHERE for total
```

### `GET /transactions/:transaction_ref`

```json
{
  "data": {
    "transaction": { "transaction_ref": "UTR260801000003", "status": "Flagged", "...": "..." },
    "sender_account": { "account_id": "8192039481", "...": "..." },
    "receiver_account": { "account_id": "2938401928", "...": "..." },
    "sender_customer": { "customer_id": "67291043", "customer_name": "Oliver Brown", "...": "..." },
    "receiver_customer": { "customer_id": "30482194", "customer_name": "Rohan Mehta", "...": "..." },
    "anomalies": [ { "anomaly_id": "3", "rule_code": "FOREIGN_LOCATION_03", "...": "..." } ],
    "disputes": [ { "dispute_id": "3", "dispute_status": "Under Investigation", "...": "..." } ],
    "audit": [ { "audit_id": "3", "action_type": "Transaction Flagged", "...": "..." } ]
  }
}
```

`anomalies` sorted by `detected_at`, `disputes` by `filed_at`, `audit` by `action_timestamp`, all ascending. The case replay page builds its timeline from this single response. 404 when not found.

## Anomalies (Anomaly_Patterns)

### `GET /anomalies`

| Param | Meaning |
| --- | --- |
| `severity_level` | ENUM: `Negligible`, `Low`, `Medium`, `High`, `Critical`, `Catastrophic` |
| `action_taken` | ENUM: `Allow`, `Flag_For_Review`, `Require_2FA`, `Block_Temporary`, `Block_Permanent` |
| `is_resolved` | `true` or `false` |
| `rule_family` | `AML`, `VEL`, `GEO`, `BEH`, `FRE`, `AMT`, `BEN`, `DEV`, `INV`, `FX`, `MCC`, `Other`. See the note below. |
| `anomaly_id` | exact match (used to open one alert from a link) |
| `transaction_ref`, `customer_id` | exact match |
| `from`, `to` | range on `detected_at` |
| `currency` | exact match |
| `search` | `rule_code`, `flag_reason`, `transaction_ref`, `reviewed_by` |
| `sort` | `-detected_at` (default), `anomaly_id`, `detected_at`, `risk_score`, `severity_level`, `rule_code`, `flagged_amount`, `transaction_ref` |

**Rule family.** The seed `rule_code` values have no family prefix (`VELOCITY_LIMIT_06`). The family is a code if it starts with one (`AML_...`). Otherwise the stem (the code without its `_NN` suffix) is looked up in `src/constants/ruleFamilies.ts`. The simplest server option: return every row matching the other filters and leave `rule_family` to the client. Or copy the stem table into SQL as a lookup table.

Example row:

```json
{
  "anomaly_id": "3",
  "transaction_ref": "UTR260801000003",
  "customer_id": "67291043",
  "rule_code": "FOREIGN_LOCATION_03",
  "flag_reason": "High-value transaction originated from unfamiliar country",
  "flagged_amount": 4250,
  "currency": "GBP",
  "risk_score": 92.3,
  "severity_level": "Critical",
  "action_taken": "Block_Temporary",
  "is_resolved": false,
  "resolution_notes": "Awaiting customer verification",
  "reviewed_by": "FRAUD_ENGINE",
  "detected_at": "2026-08-02 22:57:00",
  "resolved_at": null
}
```

### `PATCH /anomalies/:anomaly_id`

Partial update. Send only what changes.

| Field | Rule |
| --- | --- |
| `action_taken` | must be an ENUM value |
| `is_resolved` | `true` requires a non-empty `resolution_notes` (in the body or already stored). `false` clears `resolved_at`. |
| `resolution_notes` | TEXT |
| `reviewed_by` | 1 to 100 characters |
| `resolved_at` | naive DATETIME or `null`, set by the client when resolving |

Mark resolved:

```http
PATCH /anomalies/3
{ "is_resolved": true, "resolution_notes": "Customer confirmed travel to UK by phone.", "resolved_at": "2026-11-08 10:42:05", "reviewed_by": "Analyst01" }
```

Change action:

```http
PATCH /anomalies/3
{ "action_taken": "Block_Permanent" }
```

Assign reviewer:

```http
PATCH /anomalies/3
{ "reviewed_by": "Analyst03" }
```

Response: `{ "data": <full updated row> }`

```sql
UPDATE Anomaly_Patterns SET is_resolved = ?, resolution_notes = ?, resolved_at = ?, reviewed_by = ? WHERE anomaly_id = ?;
SELECT * FROM Anomaly_Patterns WHERE anomaly_id = ?;
```

## Disputes (Dispute_Logs)

### `GET /disputes`

| Param | Meaning |
| --- | --- |
| `dispute_type` | ENUM: `Unauthorized Transaction`, `Duplicate Transaction`, `Incorrect Amount`, `Merchant Dispute`, `Fraud Dispute`, `Other` |
| `dispute_status` | ENUM: `Open`, `Under Investigation`, `Resolved`, `Rejected`, `Escalated` |
| `dispute_id`, `transaction_ref`, `customer_id` | exact match |
| `search` | `transaction_ref`, `dispute_reason`, `customer_id` |
| `sort` | `-filed_at` (default), `dispute_id`, `filed_at`, `dispute_amount`, `dispute_status`, `dispute_type`, `transaction_ref` |

### `POST /disputes`

```http
POST /disputes
{
  "transaction_ref": "UTR260801000020",
  "customer_id": "10111283",
  "dispute_type": "Duplicate Transaction",
  "dispute_reason": "Customer sees the same P2P transfer twice on the statement.",
  "dispute_amount": 15000,
  "currency": "INR",
  "filed_at": "2026-11-08 10:45:12"
}
```

Validation (422 `VALIDATION_ERROR` on failure):

- `transaction_ref` exists in Transactions
- `customer_id` exists in Customers
- `dispute_type` is an ENUM value
- `dispute_reason` is 1 to 255 characters
- `dispute_amount` > 0 and fits DECIMAL(18,2)
- `currency` matches `^[A-Z]{3}$`

The server sets `dispute_status = 'Open'` and `resolved_at = NULL`, and assigns `dispute_id` via AUTO_INCREMENT.

Response `201`: `{ "data": <new row with dispute_id> }`

### `PATCH /disputes/:dispute_id`

```http
PATCH /disputes/51
{ "dispute_status": "Resolved", "resolved_at": "2026-11-08 10:47:30" }
```

When the status is `Resolved` or `Rejected` the client sends `resolved_at`. For `Open`, `Under Investigation` and `Escalated` it sends `"resolved_at": null`, which clears it. The status menu follows the order Open, Under Investigation, Escalated, Resolved, Rejected but allows any transition.

Response: `{ "data": <full updated row> }`

## Audit (Audit_Trail)

### `GET /audit`

| Param | Meaning |
| --- | --- |
| `search` | `action_type`, `action_description`, `performed_by`, `transaction_ref`, `customer_id` |
| `action_type`, `performed_by`, `severity_level` | exact match |
| `transaction_ref`, `customer_id` | exact match |
| `from`, `to` | range on `action_timestamp` |
| `sort` | `-action_timestamp` (default), `audit_id`, `action_timestamp`, `action_type`, `performed_by`, `risk_score` |

`transaction_ref` and `customer_id` can be `null` (ON DELETE SET NULL, and PII reveals have no transaction). The UI shows a dash.

### `POST /audit`

```http
POST /audit
{
  "transaction_ref": null,
  "customer_id": "84920115",
  "action_type": "PII Revealed",
  "action_description": "Analyst revealed email address for customer 84920115",
  "performed_by": "Analyst01",
  "risk_score": null,
  "severity_level": null,
  "action_timestamp": "2026-11-08 10:50:01"
}
```

Validation: `action_type` 1 to 100 characters, `action_description` 1 to 255, `performed_by` 1 to 100, `severity_level` at most 30, and `transaction_ref`/`customer_id` must exist when not null.

Response `201`: `{ "data": <new row with audit_id> }`

`action_type` values the console writes: `Anomaly Resolved`, `Anomaly Reopened`, `Action Changed`, `Reviewer Assigned`, `Dispute Filed`, `Dispute Status Changed`, `PII Revealed`.

## Stats

### `GET /stats/summary`

Optional `from`, `to` (applied to `created_at`, `detected_at`, `filed_at` and `action_timestamp`) and `currency`. `tables` always holds the unfiltered row counts. **Amounts are grouped by currency and never summed across currencies.**

```json
{
  "data": {
    "tables": { "Customers": 50, "Accounts": 50, "Transactions": 50, "Anomaly_Patterns": 50, "Dispute_Logs": 50, "Audit_Trail": 50 },
    "transactions": {
      "total": 50,
      "by_status": [ { "key": "Success", "count": 31 }, { "key": "Pending", "count": 1 }, { "key": "Failed", "count": 0 }, { "key": "Flagged", "count": 11 }, { "key": "Blocked", "count": 7 }, { "key": "Reversed", "count": 0 } ],
      "by_type": [ { "key": "Transfer Transaction", "count": 11 } ],
      "amount_by_currency": [ { "currency": "AED", "total": 27500, "count": 1 } ],
      "flagged_amount_by_currency": [ { "currency": "CAD", "total": 15000, "count": 1 } ],
      "blocked_amount_by_currency": [ { "currency": "EUR", "total": 9500, "count": 1 } ]
    },
    "anomalies": {
      "total": 50, "open": 20,
      "by_severity": [ { "key": "Negligible", "count": 11 } ],
      "by_action": [ { "key": "Allow", "count": 20 } ],
      "by_rule_code": [ { "key": "NORMAL_PATTERN_01", "count": 1 } ],
      "average_risk_score": 52.05
    },
    "disputes": {
      "total": 50, "open": 20,
      "by_status": [ { "key": "Open", "count": 3 } ],
      "by_type": [ { "key": "Fraud Dispute", "count": 12 } ],
      "amount_by_currency": [ { "currency": "AUD", "total": 95500, "count": 3 } ]
    },
    "audit": { "total": 50, "first_timestamp": "2026-08-01 09:44:00", "last_timestamp": "2026-08-19 10:18:00" },
    "currencies": ["AED", "AUD", "CAD", "EUR", "GBP", "INR", "JPY", "USD"]
  }
}
```

`by_status`, `by_severity`, `by_action` and the dispute groups list every ENUM value, including zero counts, in ENUM order. "Open" alerts means `is_resolved = FALSE`. "Open" disputes means `dispute_status IN ('Open','Under Investigation','Escalated')`.

```sql
SELECT status AS `key`, COUNT(*) AS count FROM Transactions GROUP BY status;
SELECT currency, SUM(amount) AS total, COUNT(*) AS count FROM Transactions WHERE status = 'Blocked' GROUP BY currency;
SELECT rule_code AS `key`, COUNT(*) AS count FROM Anomaly_Patterns GROUP BY rule_code;
SELECT ROUND(AVG(risk_score), 2) FROM Anomaly_Patterns;
```
