# Shneiderman golden rules in Tracewire

This file records where each of the five rules lives in the code. Every change carries a comment of the form `// GOLDEN RULE <n>: <name>` (or `/* ... */` in CSS and JSX) directly above it. To find every place, run:

```
grep -rn "GOLDEN RULE 3" src
```

Buttons, toasts, dialogs and form fields that carry a rule also have a `data-rule` attribute. One element can carry two rules, for example the Undo toast has `data-rule="3 6"`. To find them in the browser, use `document.querySelectorAll('[data-rule~="5"]')`.

There are no new routes, pages, layouts or animations, and the data layer's shape is unchanged. The only new data-layer code is two undo functions in `src/api/actions.ts`, and they use the existing `updateAnomaly`, `updateDispute` and `createAudit` calls. The only new CSS motion is the spinner shown on a control while its action runs, which Rule 3 asks for.

---

## Rule 1: Strive for consistency

Each fix makes the odd case match the pattern used everywhere else.

| File | Before | After |
|---|---|---|
| `src/styles/components.css` (`.field-error`, `.field-hint`) | `.field > span` outranked `.field-error`. An error placed directly inside a field (signup, login, send money receiver) showed as a grey, bold label. Errors placed outside a field were red. | Every field error is red at weight 400, and every hint is grey at weight 400, wherever it sits. |
| `src/pages/customer/SendMoney.tsx` (Receiver label) | A bare `<label>` showed "Receiver" at 16px in white. | It uses `field-label`, the same 12px grey label as every other field. |
| `src/pages/customer/CustomerDashboard.tsx` (`FlagNotices`) | "UTR... was flagged" / "was blocked", in lowercase. | "UTR... is Flagged" / "is Blocked", spelled as on the status chips. |
| `src/pages/customer/CustomerTransaction.tsx` (`Result`, other statuses) | `Transfer {status.toLowerCase()}`, for example "Transfer pending". | `Transfer {status}`, for example "Transfer Pending". |
| `src/pages/Replay.tsx` (dispute closed event) | "Dispute resolved" / "Dispute rejected". | "Dispute Resolved" / "Dispute Rejected", matching the dispute status chip. |
| `src/pages/customer/CustomerTransaction.tsx` (`Details`, disputes list) | The filed date had no seconds (`seconds={false}`), while "Created" on the same page had them. | Both dates use the same format with seconds. |
| `src/pages/customer/CustomerTransaction.tsx` (dispute button and modal) | The button said "File a dispute" and the modal was titled "File a dispute". | Both say "File dispute", the same wording as the analyst action. |
| `src/pages/Disputes.tsx` and `src/components/AnomalyDrawer.tsx` | Every analyst action showed the generic "Saving...". | Each in-flight label names its verb ("Resolving...", "Applying...", "Assigning...", "Reopening...", "Changing status..."), with the shared spinner. |
| `src/styles/layout.css` (`.nav`, `.mobile-menu`) | Raw `border-radius: 8px`. | `var(--r-card)`, which is the same value from the token. |
| `src/styles/customer.css` (`.playback-frame`) | A framed panel with `border-radius: 6px`, which is the button radius. | `var(--r-card)` (8px), like every other framed panel. |
| `src/styles/customer.css` (`.auth-card h1`) | `margin: 12px 0 22px`. | `12px 0 24px`, on the 8px rhythm. |
| `src/styles/customer.css` (`.auth-quick`) | `padding-top: 18px`. | `16px`. |
| `src/styles/customer.css` (`.auth-quick-row`) | `padding: 9px 8px`. | `8px`. |
| `src/styles/customer.css` (`.acct-card`) | `padding: 16px 18px`. | `16px`. |
| `src/styles/customer.css` (`.card-pad .open-row`) | `padding: 10px 0`. | `12px 0`, the same row height as `.open-row`. |
| `src/styles/customer.css` (`.result-reason`) | `padding: 12px 14px`. | `12px 16px`, the same as the notice padding. |

---

## Rule 3: Offer informative feedback

**The one shared channel.** All toasts come from `src/lib/session.tsx`, and no second notification system was added.

- **`toast(message, tone, opts)`** now takes `duration` and an optional `action`.
  - Small actions use `TOAST_SHORT` (2s).
  - Larger actions use `TOAST_DEFAULT` (4.2s).
  - Undoable actions use `TOAST_UNDO` (7s).
- **`ToastItem`** renders each toast (`data-rule="3"`, or `"3 6"` when it has Undo).
- **`Busy`**, in `src/components/ui.tsx`, is the shared spinner-plus-label used on every control while its action is running. The control is also disabled during that time.

| File and component | Action | Feedback now |
|---|---|---|
| `src/components/AnomalyDrawer.tsx`, `run()` | Resolve, reopen, change action, assign reviewer | Toasts that name the alert id and transaction_ref, for example "Alert 49 on UTR260801000049 marked resolved." Each button shows a spinner while saving. |
| `src/pages/Disputes.tsx`, `StatusMenu` | Change dispute status | "Dispute 12 on UTR... moved from Open to Escalated." The menu button shows a spinner. |
| `src/components/DisputeForm.tsx` | File dispute (analyst and customer) | "Dispute 51 filed on UTR... for INR 200,000.00." The submit button shows a spinner. |
| `src/pages/customer/Auth.tsx`, `Login` | Log in | "Logged in as Aarav Sharma, customer 84920115." The submit button shows a spinner. |
| `src/pages/customer/Auth.tsx`, `Signup` | Sign up | "Account created for Zoe Fernandes: customer 99000183, account •••• 7891." The submit button shows a spinner. |
| `src/components/layout/Nav.tsx`, `CustomerTools` | Log out | "Logged out of Aarav Sharma, customer 84920115." |
| `src/components/layout/Nav.tsx`, `AnalystSwitcher` | Switch acting analyst (small action) | A 2s toast: "Acting as Analyst02. New audit entries use this name." |
| `src/pages/customer/CustomerTransaction.tsx`, page effect | Send money | When the rule check playback ends: "UTR... for INR 5,000.00 sent", or "... is Flagged and held by the rule check", or "... was Blocked by the rule check". It is timed for the end so it does not spoil the playback. |
| `src/pages/customer/CustomerTransaction.tsx`, `Result` | Verify 2FA, cancel 2FA | "UTR... verified with the one-time code and sent: INR 60,000.00." / "Code step stopped. UTR... stays Flagged for analyst review." Both buttons show a spinner. |
| `src/pages/customer/CustomerDashboard.tsx`, `FlagNotices` | Dismiss a notice (small action) | A 2s toast: "Notice for UTR... dismissed." |
| `src/pages/CustomerDetail.tsx` | Reveal email or phone | "Revealed the email of customer 84920115. Logged to Audit_Trail as Analyst01." The Reveal button shows a spinner. |
| `src/components/layout/Footer.tsx` | Reset local changes | The Reset button shows a spinner. Toasts on success and on failure; before this, a failure gave no response at all. |
| `src/pages/Transactions.tsx` | Export CSV | The existing toast is kept, and the button now shows a spinner. |

**Not changed:**
- **Filters:** the "N matching" line above every table already updates live as an inline confirmation.
- **Copying ids:** the app has no copy-id control.

---

## Rule 4: Design dialogs to yield closure

| File and component | What was added |
|---|---|
| `src/components/ui.tsx`, `Steps` | A three-label step indicator built from the existing eyebrow's square marker and mono type. It is not a new visual pattern. It has `data-rule="4"`. |
| `src/pages/customer/Auth.tsx`, `Signup` | **Steps** are "Your details", "Account", "Done". They move to Account once the personal fields are valid. **Final screen:** a read-only "Account created" screen (customer_id, account, opening balance) with a single "Go to dashboard" button that receives focus. Before this, the page jumped straight to the dashboard. |
| `src/pages/customer/SendMoney.tsx` | **Steps** are "Details", "Check", "Result", shown on the form with Details current. The labels are exported as `SEND_STEPS`. |
| `src/pages/customer/CustomerTransaction.tsx` | **Steps** use the same labels on the result route. Check is current during the rule check playback and while the one-time code is pending. All three are complete on the settled result card (Sent, Held or Blocked), which has no editable fields. |
| `src/components/DisputeForm.tsx` | **Final state:** after filing, the modal shows "Dispute N filed" with its transaction_ref, type, amount and status, and a single Done button. The modal no longer disappears at once. This applies on the Disputes page and on the customer result page. |
| `src/components/AnomalyDrawer.tsx` | **Acknowledgement:** after Mark resolved, the drawer shows a settled notice ("Alert N on UTR... marked resolved", the audit author, and a pointer to Undo) with a Close panel button. It reuses the existing `.notice` style, plus a `notice-ok` colour in `src/styles/customer.css`. |

---

## Rule 5: Error prevention and simple error handling

All five forms validate as the person types or when they leave a field. Each error sits directly under its field in plain language, and the submit control stays disabled until the form is valid. The longer forms (signup, send money, file dispute) also show a one-line hint saying what unlocks the submit button.

| File and component | Form | What was added |
|---|---|---|
| `src/pages/customer/Auth.tsx`, `Login` | Log in | **Live checks:** the email is checked on blur, for example "aarav.sharma@ is not a complete email address, for example name@email.com.". The password is checked as it is typed. **Errors:** each under its own field. **Submit:** disabled until valid. |
| `src/pages/customer/Auth.tsx`, `Signup` | Sign up | **Live checks:** fields are validated as soon as they are touched. Text fields show their problem on blur and choices show at once. **Submit:** "Create account" is disabled until every field is valid. |
| `src/pages/customer/SendMoney.tsx` | Send money | **Receiver:** resolved as it is typed, with a 400ms debounce. **Amount:** a problem shows as soon as it is typed, for example "Amount cannot be more than the account balance (INR 245,680.50).". **Other errors:** an unknown receiver, a choice between several receiver accounts, and sending to the same account each get a plain message under the field. **Submit:** Send is disabled until the receiver is found and every field is valid. |
| `src/components/DisputeForm.tsx` | File dispute | **transaction_ref:** looked up as it is typed, for example "No transaction has the transaction_ref UTR000.". The customer view also gets "... is not one of your transactions." **Amount:** "Amount cannot be more than the transaction amount (...)". **Submit:** disabled until valid. |
| `src/components/AnomalyDrawer.tsx` | Resolve alert with notes, assign reviewer | **Notes:** checked on blur and while typing. Mark resolved is disabled until notes are written. **Reviewer:** checked as it is typed, including "Analyst01 is already the reviewer". Assign is disabled until valid. |
| `src/components/ui.tsx`, `ConfirmDialog` | Shared confirmation | A one-line message, a lighter ghost **Cancel** that gets focus first, and a red confirm button. |
| `src/components/AnomalyDrawer.tsx` | Change action to Block_Permanent | "This permanently blocks UTR... for alert N, and there is no Undo for it." This is shown before anything is written. |
| `src/pages/Disputes.tsx`, `StatusMenu` | Move a dispute to Rejected | "Dispute N on UTR... will close as Rejected, which sets resolved_at and removes it from the customer's open items." This is shown before anything is written. |
| `src/components/ui.tsx`, `useFocusTrap` | Supporting fix | When a confirm opens over a drawer, Escape and Tab now act only on the dialog on top. Without this, one Escape closed both the confirm and the drawer. |

---

## Rule 6: Permit easy reversal of actions

| File and component | What was added |
|---|---|
| `src/lib/session.tsx`, `ToastItem` | An Undo button inside the Rule 3 toast (`data-rule="6"`). The toast stays for 7 seconds. Clicking Undo runs the reversal, shows a spinner ("Undoing..."), then closes the toast. |
| `src/api/actions.ts`, `undoResolveAnomaly` | **Reverts:** sets the anomaly back to unresolved and restores the earlier resolution_notes, resolved_at and reviewed_by. **Audit:** writes an Audit_Trail row with action_type `Anomaly Resolution Reversed`. |
| `src/api/actions.ts`, `undoDisputeStatus` | **Reverts:** restores the earlier dispute_status and resolved_at. **Audit:** writes an Audit_Trail row with action_type `Dispute Status Reversed` ("Undo: dispute N moved back from X to Y"). |
| `src/components/AnomalyDrawer.tsx` | Mark resolved passes the undo action to the toast. |
| `src/pages/Disputes.tsx`, `StatusMenu` | Every status change passes the undo action to the toast, including a confirmed Rejected. |

**Actions that have Undo:**
- Resolving an alert.
- Changing a dispute's status.

**Actions without Undo, and why:**
- **Reopening an alert, changing action_taken, assigning a reviewer:** each can already be reversed with the same control in the drawer, and each writes its own audit row.
- **Permanent block:** guarded by a confirmation instead (Rule 5), because the request treats it as not undoable.
- **Filing a dispute:** the schema has no delete for Dispute_Logs. A filed dispute can be closed through its status, which has Undo.
- **Sending money:** it is scored and written as an immutable Transactions row. Held transfers are reversed through the review flow, not deleted.
- **Log in, log out, sign up, switching analyst, switching role, filters, revealing PII, CSV export, dismissing a notice:** none changes reviewable data, or the change (a PII reveal audit row) must stay on record.
- **Reset local changes:** it already has its own confirmation dialog.

---

## Skipped on purpose

- **Mobile action menu:** on a narrow screen the table row's "Change status" menu closes if the page scrolls while it is open. This behaviour predates this pass, and fixing it would mean changing how `MenuButton` is positioned. The same action is available from the dispute drawer footer, where it works at every width.
- **Scenes and card animations:** the home page scenes and card animations are untouched. The send result screen still uses the existing `DetectFrame` playback unchanged; only the step indicator above it is new.
