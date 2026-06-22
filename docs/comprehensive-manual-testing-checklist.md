# Debtulator Comprehensive Manual Testing Checklist

This document is the manual QA source of truth for Debtulator. It covers the current app routes, user-visible actions, financial state changes, local-only and authenticated modes, shared workflows, failure handling, and platform behavior.

It is deliberately broader than `manual-qa-scripts.md`, which remains the short release smoke suite. Execute the relevant sections here for full regression testing.

## How to use this checklist

For every test, record one result: `Pass`, `Fail`, `Blocked`, or `Not applicable`. A pass requires the stated app response, correct persisted data, and no unexpected console error, crash, duplicate record, or silent financial change.

When a test fails, capture:

- Test ID, build, environment, device, and account.
- Exact steps, expected result, and actual result.
- Screenshot or recording and relevant timestamp.
- Network state and whether the record was local, shared, pending, verified, disputed, settled, or archived.
- Record IDs and sync/conflict IDs when available; never include passwords, tokens, private notes, or attachment contents.

## Test run record

| Field | Value |
|---|---|
| Release/version | |
| Build number | |
| Git commit | |
| Backend environment | Development / Staging / Production smoke |
| Migration version | |
| Platform/device | |
| OS version | |
| Tester | |
| Date | |
| Network | Online / Offline / Constrained |
| Result summary | Pass / Fail / Blocked |
| Defect links | |

## Required test data and actors

- **Local user L:** never signed in; has two local members, a private group, debts, expenses, and payments.
- **User A:** authenticated owner/admin with a completed profile.
- **User B:** authenticated user linked to A through an accepted member link.
- **User C:** authenticated user with a pending or rejected link request from A.
- **User D:** authenticated user with no link to A and no shared-group membership.
- **Group roles:** one owner, admin, member, viewer, invited user, removed user, and unlinked placeholder.
- **Devices:** device A1 and A2 signed into User A; device B1 signed into User B.
- **Currencies:** at least SEK, EUR, USD, GBP, and AUD, including a group with multiple allowed currencies.
- **Record states:** active, partially paid, paid/settled, overpaid, pending verification, partially verified, verified, rejected, disputed, resolved, archived, failed sync, and conflicted.
- **Files:** valid image, PDF, CSV, unsupported file, empty file, malformed CSV/JSON, 10 MB boundary attachment, oversized attachment, and 5 MB boundary restore file.

## Coverage matrix

Run applicable financial and shared tests across the following dimensions. Pairwise coverage is acceptable for routine regression; release-critical authorization, money, backup, and deletion cases require every applicable combination.

| Dimension | Required values |
|---|---|
| Platform | iOS phone, Android phone, web if included in release |
| Identity | First run, local-only, signed in, expired session, signed out after prior sync |
| Network | Online, offline at launch, offline during save, reconnect, slow/intermittent |
| Visibility | Private, shared with linked member, private group, shared group |
| Role | Owner, admin, member, viewer, non-participant, removed participant |
| Trust state | Local-only, pending, partially verified, verified, rejected, disputed, resolved |
| Lifecycle | Planning, active, finalising/locked, settled/read-only, archived |
| Payment state | Unpaid, partial, paid, overpaid, rejected/cancelled |
| Data volume | Empty, one record, normal dataset, large dataset |
| Currency | Same currency, mixed native currencies, estimated base conversion |

## 1. Installation, launch, and app initialization

- [ ] **BOOT-001** Fresh install opens the first-run screen without seeded financial or sync records.
- [ ] **BOOT-002** App name, icon, splash image, status bar, and launch transition are correct on iOS and Android.
- [ ] **BOOT-003** Relaunch after completing first run opens Home and does not repeat onboarding.
- [ ] **BOOT-004** Upgrade an install containing local data; records remain intact and first-run is not shown again.
- [ ] **BOOT-005** Launch offline in local-only mode; the ledger remains usable and no authentication error blocks the UI.
- [ ] **BOOT-006** Launch offline with a previously authenticated session; cached permitted data is readable and sync shows an honest waiting/offline state.
- [ ] **BOOT-007** Launch with an expired/invalid session; the app does not expose another account's uncached data, crash, or delete local-only records.
- [ ] **BOOT-008** Force-close during database initialization, reopen, and verify the database is consistent without duplicate defaults.
- [ ] **BOOT-009** Simulate initialization failure; the error boundary/retry action is understandable and retry succeeds after the cause is removed.
- [ ] **BOOT-010** Background and foreground the app on every major screen; state is retained unless a refresh is required.
- [ ] **BOOT-011** Rotate or resize during launch and after launch; content remains reachable and no modal is stranded.
- [ ] **BOOT-012** Open every registered route directly with a missing/invalid ID; show the appropriate not-found state and a safe way back.

## 2. Navigation and global interactions

- [ ] **NAV-001** Bottom tabs open Home, Debts, Members, and Groups; the selected tab and accessibility state update correctly.
- [ ] **NAV-002** Re-tapping the active tab behaves consistently and never creates duplicate navigation stacks.
- [ ] **NAV-003** Floating add opens and closes; outside tap, close action, and system back dismiss it.
- [ ] **NAV-004** Floating actions route correctly to Add debt, Record payment, Split expense, Invite member, and Add group.
- [ ] **NAV-005** Global menu opens and closes from all supported screens without losing unsaved form state unexpectedly.
- [ ] **NAV-006** Global menu Browse links open Home, Debts, Members, Groups, and Requests.
- [ ] **NAV-007** Global menu Tools links open Recurring, Analytics, Suggestions, Export, and Import CSV.
- [ ] **NAV-008** Global menu Safety links open Settings, Sync, Conflicts, Backup, Privacy, and Notifications.
- [ ] **NAV-009** Hidden Requests and Settings tab routes open without adding incorrect visible tab items.
- [ ] **NAV-010** Header back, Android system back, swipe-back, modal close, and browser back return to the correct prior state.
- [ ] **NAV-011** Rapidly tap navigation/actions; only one screen or mutation is created.
- [ ] **NAV-012** Scroll each long screen to the final action at small and large text sizes; fixed footers do not obscure content.
- [ ] **NAV-013** Keyboard open/close, Return/Done, outside tap, and form scrolling keep the focused field and primary action reachable.
- [ ] **NAV-014** Deep link with the `debtulator://` scheme opens the intended route when supported and fails safely for unknown paths.

## 3. First run, authentication, and profile

- [ ] **AUTH-001** First-run Continue stays disabled until configured backend, valid email, and password of at least six characters are entered.
- [ ] **AUTH-002** Valid sign-in completes first run and opens Home with the correct account identity.
- [ ] **AUTH-003** Wrong password, unknown account, malformed email, offline request, and unavailable backend show user-safe errors and preserve entered email.
- [ ] **AUTH-004** Skip for now opens Local setup; name is required and all supported default currencies can be selected.
- [ ] **AUTH-005** Completing Local setup persists display name, base currency, and onboarding state across restart.
- [ ] **AUTH-006** Create account validates required first/last name, email, password, phone/country fields, and displays backend duplicate-account errors safely.
- [ ] **AUTH-007** Successful account creation handles email-confirmation-required and immediate-session configurations correctly.
- [ ] **AUTH-008** Skip from sign-up returns to local setup without creating an account.
- [ ] **AUTH-009** Sign in from Settings or Requests returns to an appropriate app destination and loads only permitted remote data.
- [ ] **AUTH-010** Password reset validates email and displays a clear success/error result without exposing account existence unnecessarily.
- [ ] **AUTH-011** Edit profile name, phone, country, and base currency; save, refresh, restart, and verify local/remote profile agreement.
- [ ] **AUTH-012** Sign out returns to local-only behavior and prevents access to account-only remote records.
- [ ] **AUTH-013** Sign out while offline reports honestly and does not corrupt the local database.
- [ ] **AUTH-014** Switch from User A to User B on one device; A's private/account-scoped data is not visible to B.
- [ ] **AUTH-015** Authentication buttons disable during submission and duplicate taps create only one request/session.

## 4. Home dashboard

- [ ] **HOME-001** Empty account shows zero/empty metrics, no recent debts/activity, and working creation actions.
- [ ] **HOME-002** Owing, owed, due-soon, and request metrics match the underlying records and exclude inappropriate archived/rejected data.
- [ ] **HOME-003** Mixed currencies remain clearly labeled; estimated base-currency totals are visually identified as estimates.
- [ ] **HOME-004** Quick actions open the correct prefilled forms and Cancel/Back returns to Home.
- [ ] **HOME-005** Pending requests card opens Requests and displays the same pending count.
- [ ] **HOME-006** Due-soon rows use correct dates and ordering for today, tomorrow, overdue, future, and no due date.
- [ ] **HOME-007** Recent debts open the matching debt/expense/group record and never the wrong entity with a colliding ID.
- [ ] **HOME-008** Recent activity ordering and wording match Activity; View all opens the Activity screen.
- [ ] **HOME-009** Create/edit/payment/verification actions update dashboard metrics immediately and after restart/sync.
- [ ] **HOME-010** Large values, negative values, long names, long titles, and empty notes do not break cards.

## 5. Members and member linking

- [ ] **MEM-001** Empty Members screen shows the correct state and Add member/Invite opens the form.
- [ ] **MEM-002** Create a local member with first name only; the member appears in list/detail and persists after restart.
- [ ] **MEM-003** Create with last name, email, phone, notes, and tags; values are normalized and displayed correctly.
- [ ] **MEM-004** Required-name, malformed email/phone, whitespace-only, extremely long text, Unicode, emoji, and duplicate-contact inputs fail or save according to defined validation without crashing.
- [ ] **MEM-005** Search signed-up profiles by name, email, and phone; loading, no-result, offline, and backend-error states are clear.
- [ ] **MEM-006** Select a signed-up profile; identity fields become read-only, clear-selection restores local entry, and save creates the intended linked/pending member.
- [ ] **MEM-007** Search never returns the current user as a link target and does not expose profiles beyond allowed public fields.
- [ ] **MEM-008** Member list search matches name and intended metadata case-insensitively; clearing restores the list.
- [ ] **MEM-009** All/Linked/Shared/Owed to you/You owe filters show correct members and correct zero-result state.
- [ ] **MEM-010** Owing and owed stat cards toggle quick filters and reflect open balances, not settled/archived noise.
- [ ] **MEM-011** Member row balances match Debts, payments, and member detail in each currency.
- [ ] **MEM-012** Member detail shows contact, tags, open debts, payment history, groups, and appropriate empty sections.
- [ ] **MEM-013** Edit member identity/contact/notes/tags; Cancel leaves data unchanged and Save persists once.
- [ ] **MEM-014** Inline note and tag save shows progress, blocks duplicate save, handles failure, and preserves the prior stored value on failure.
- [ ] **MEM-015** Open a debt, payment, and group from member detail; each navigation target is correct.
- [ ] **MEM-016** Settle up and Add payment from member detail prefill the intended parties and open obligations.
- [ ] **MEM-017** Archive/delete an unused local member only after confirmation; Cancel is non-destructive.
- [ ] **MEM-018** Attempt to remove a member referenced by financial history; ledger integrity is preserved and the UI explains archive/restriction behavior.
- [ ] **MEM-019** Send a link request while signed out; sign-in requirement is clear and no remote request is created.
- [ ] **MEM-020** Send a link request to User B; both sides show pending state exactly once.
- [ ] **MEM-021** Accept a link request; both users show linked identity and the accepted link survives refresh/restart.
- [ ] **MEM-022** Reject, cancel, and expire a link request; status updates on both sides and can be retried only when allowed.
- [ ] **MEM-023** Re-invite a previously accepted pair; the accepted relationship is reused without a duplicate pending link.
- [ ] **MEM-024** Unlink a member; shared history remains auditable but new shared confirmation is gated until a link is accepted again.
- [ ] **MEM-025** Concurrent accept/reject actions on two devices resolve deterministically without two active links.

## 6. Simple debts

- [ ] **DEBT-001** Add debt is disabled until member, non-empty title, and amount greater than zero are present.
- [ ] **DEBT-002** Create both directions: they owe me and I owe them; list section, arrow, wording, and totals are correct.
- [ ] **DEBT-003** Create in every supported currency; stored and displayed native amount/currency remain unchanged by base-currency settings.
- [ ] **DEBT-004** Amount input handles decimal separator, leading zeros, pasted text, maximum supported precision, very large values, negative values, zero, NaN, and whitespace safely.
- [ ] **DEBT-005** Title, private notes, optional due date, and tags persist and appear in search/detail/activity as intended.
- [ ] **DEBT-006** Due date before creation date is rejected; same-day and future dates save.
- [ ] **DEBT-007** No due date and clearing an existing due date work without creating an invalid date.
- [ ] **DEBT-008** Default debt visibility follows Privacy settings, but never shares with an unlinked user.
- [ ] **DEBT-009** Creating a debt for a pending/rejected link remains locally available and does not bypass confirmation rules.
- [ ] **DEBT-010** Debts list separates You owe and Owed to you and excludes settled/archived records from active sections.
- [ ] **DEBT-011** Search matches title, notes, direction, and group case-insensitively; unmatched search shows No debts found.
- [ ] **DEBT-012** All, You owe, Owed to you, and Due soon filters show the correct open records; tapping the active quick filter clears it.
- [ ] **DEBT-013** History opens settled debts only; selecting a history row opens the correct detail.
- [ ] **DEBT-014** Debt detail shows amount, paid, remaining/overpaid, direction, participants, member, dates, group, tags, notes, trust, and sync state correctly.
- [ ] **DEBT-015** Detail tabs/sections switch between Details, Confirmation, and Activity without losing state.
- [ ] **DEBT-016** Edit title/notes/tags without financial changes; no unnecessary confirmation is created.
- [ ] **DEBT-017** Edit principal; remaining balance is recalculated against existing immutable payments and can become partially paid, paid, or overpaid.
- [ ] **DEBT-018** Edit direction or due date on a linked shared debt; confirmation warning appears before save.
- [ ] **DEBT-019** Unauthorized party cannot move a shared debt to another member; the creator restriction is explained.
- [ ] **DEBT-020** Currency is read-only while editing an existing debt and remains unchanged.
- [ ] **DEBT-021** Inline due-date, tags, and notes editors support Save and Cancel; failed saves do not show false success.
- [ ] **DEBT-022** Add payment and Settle up prefill the debt and current remaining amount; settled/archived debts disable inappropriate actions.
- [ ] **DEBT-023** Export debt PDF creates a readable document with correct native amount, status, parties, and allowed notes only.
- [ ] **DEBT-024** Archive requires confirmation; Cancel changes nothing, Confirm removes it from active lists while preserving history.
- [ ] **DEBT-025** Activity initially limits long history, Show more/fewer changes only presentation, and events remain chronological.
- [ ] **DEBT-026** Missing/archived member or group references render safely as Unknown/archived context without crashing.

## 7. Link-gated debt confirmation and disputes

- [ ] **CONF-001** With no accepted member link, a shared debt insert/request is rejected by the app and backend; no partial remote debt or verification remains.
- [ ] **CONF-002** Pending, rejected, cancelled, and expired link requests do not satisfy the accepted-link requirement.
- [ ] **CONF-003** After link acceptance, a locally retained pre-link debt can publish and request confirmation exactly once.
- [ ] **CONF-004** User A cannot use an accepted A-B link to create a confirmation involving User C.
- [ ] **CONF-005** A non-party User D cannot call the accepted-link check or create/update another pair's shared debt.
- [ ] **CONF-006** Creator makes a linked debt; User B receives a creation confirmation with correct amount, direction, due date, notes visibility, and parties.
- [ ] **CONF-007** Confirming updates both users to verified, records verifier/time, updates activity, and removes the request from Pending.
- [ ] **CONF-008** Contest requires/records a reason where specified, marks the debt rejected/disputed, preserves the original financial history, and surfaces Needs review.
- [ ] **CONF-009** Cancel from a contest alert changes nothing.
- [ ] **CONF-010** Amendment of amount, direction, or due date creates an amendment request with an accurate before/after summary.
- [ ] **CONF-011** Confirm amendment applies the proposed state once; reject preserves/returns to the correct accepted state and records the rejection.
- [ ] **CONF-012** Resolve a disputed debt with a resolution note; status and activity are correct on both devices.
- [ ] **CONF-013** Cancel a pending verification; it leaves no actionable inbox item and does not mark the debt verified.
- [ ] **CONF-014** Reminder sends only for an actionable pending confirmation; success/failure feedback is honest and duplicate taps do not spam.
- [ ] **CONF-015** Retry a locally pending undelivered confirmation after reconnect; one remote request is created and local/remote IDs are linked.
- [ ] **CONF-016** Simultaneous confirm/reject from two devices produces one final status and an auditable outcome.
- [ ] **CONF-017** Unlink after a pending request; subsequent update/confirmation fails safely under backend row-level security.
- [ ] **CONF-018** Direct API attempts with spoofed creator, involved user, requester, or responder IDs are denied.

## 8. Payments, settlement records, and overpayments

- [ ] **PAY-001** Record payment shows No open obligations when none exist and offers a safe route back/create path.
- [ ] **PAY-002** Payer and receiver must be different; amount must be above zero; date and currency are valid before Save enables.
- [ ] **PAY-003** Opening from a debt/member/group/suggestion prefills parties, currency, and relevant open records correctly.
- [ ] **PAY-004** Auto-apply uses oldest eligible open obligations and never applies more than each remaining balance.
- [ ] **PAY-005** Disable Auto-apply and manually select obligations; applied total and preview update accurately.
- [ ] **PAY-006** Partial payment reduces remaining amount and leaves the obligation open/partially paid.
- [ ] **PAY-007** Exact payment marks the obligation paid/settled and moves a simple debt out of active lists.
- [ ] **PAY-008** One payment across multiple obligations creates accurate settlement lines whose sum equals the applied amount.
- [ ] **PAY-009** Overpayment is labeled before save and creates only the intended open overpayment credit; it does not create a phantom debt.
- [ ] **PAY-010** Payment with no applicable record creates the correct unapplied/overpayment behavior and remains auditable.
- [ ] **PAY-011** Mixed-currency obligations are not silently combined or converted as exact payments.
- [ ] **PAY-012** Settlement preview parties, applied lines, unapplied amount, and notes match the saved payment/settlement.
- [ ] **PAY-013** Rapid/double Save creates one payment, one settlement, and one set of lines.
- [ ] **PAY-014** Save failure rolls back all related payment/settlement/line mutations; retry does not duplicate them.
- [ ] **PAY-015** Payment detail shows parties, date, visibility, status, confirmation, sync, proof, lines, and linked settlement accurately.
- [ ] **PAY-016** Settlement detail shows actual movement, payments, applied obligations, explanation, proof, and estimated-conversion warning when applicable.
- [ ] **PAY-017** Open Payment from settlement navigates to the correct record; missing payment/settlement shows a safe not-found state.
- [ ] **PAY-018** Export payment/settlement PDF contains correct totals and allowed evidence references.
- [ ] **PAY-019** Confirm/reject a shared payment; rejected/cancelled payments do not reduce ledger balances.
- [ ] **PAY-020** Send/retry payment confirmation reminder only when permitted and pending.
- [ ] **PAY-021** Editing debt principal after payment recalculates remaining/overpaid without altering payment amounts or dates.
- [ ] **PAY-022** Multiple payments, refunds/cancelled states if supported, and out-of-order payment dates produce consistent balances/history.

## 9. Groups, invites, roles, claims, and lifecycle

- [ ] **GRP-001** Create group requires a name and saves notes, default currency, selected members, tags, and default visibility.
- [ ] **GRP-002** Private group works signed out and never queues private records for shared sync.
- [ ] **GRP-003** Shared group creation requires authentication and creates owner/participant records once.
- [ ] **GRP-004** Group list search matches name/notes; All, Planning, Active, and Settled filters and empty states are correct.
- [ ] **GRP-005** Shared, Active, and Settled counts reflect all unarchived groups independent of current search.
- [ ] **GRP-006** Group card members, native/estimated balance, status, visibility, and settlement-idea count match detail.
- [ ] **GRP-007** Group detail Overview, Expenses, Balances, Analytics, Settlements, Payments, Members, and Activity tabs render correct/empty states.
- [ ] **GRP-008** Edit allowed group fields as owner/admin; member/viewer cannot edit fields beyond their permission.
- [ ] **GRP-009** Owner and admin can invite; member/viewer/non-participant cannot.
- [ ] **GRP-010** Invite Admin, Member, and Viewer by valid identity; invalid/duplicate/self invite is rejected safely.
- [ ] **GRP-011** Invitee sees correct group, inviter, offered role, and message without unrelated group data before acceptance.
- [ ] **GRP-012** Accept invite creates one active participant/member and reveals only group-scoped shared records.
- [ ] **GRP-013** Reject/cancel/expire invite updates both sides and does not grant group access.
- [ ] **GRP-014** Viewer can read permitted group data but cannot add/edit/archive financial records or manage people.
- [ ] **GRP-015** Member can add records and edit their own unlocked record, but cannot edit another creator's record or manage members.
- [ ] **GRP-016** Admin can edit records, invite, merge, finalise, reopen, and archive as defined; owner-only role controls remain protected.
- [ ] **GRP-017** Removed/left participant loses shared access and mutation permission while historical attribution remains intact.
- [ ] **GRP-018** Add an unlinked placeholder with optional email/phone; it appears group-wide but does not create a global linked identity.
- [ ] **GRP-019** Claim a placeholder; owner/admin can approve or reject, and approval links the correct user once.
- [ ] **GRP-020** Duplicate-member warnings appear for matching/similar name, email, or phone and never auto-merge.
- [ ] **GRP-021** Ignore warning suppresses only that warning; Merge remaps relationships and preserves all financial totals/history.
- [ ] **GRP-022** Private group manual member toggles add/remove intended members without modifying global contacts.
- [ ] **GRP-023** Planning to Active transition unlocks appropriate work and logs activity.
- [ ] **GRP-024** Finalise locks new/edit financial actions and requires confirmation where shown.
- [ ] **GRP-025** Reopen restores permitted actions without losing records or verification history.
- [ ] **GRP-026** Mark Settled makes the group read-only and appears in Settled filtering.
- [ ] **GRP-027** Archive confirmation Cancel is safe; Confirm hides the group from active lists and retains history.
- [ ] **GRP-028** Settled/archived group cannot be modified by direct navigation or stale client actions; backend rejects forbidden writes.
- [ ] **GRP-029** Share summary and Export PDF contain included/excluded record explanations and no unauthorized private content.
- [ ] **GRP-030** Gentle reminder is available only to permitted actors and produces correct activity/notification behavior.

## 10. Group expenses, splits, and direct debts

- [ ] **EXP-001** With no group, Add expense shows the create-group empty state and Add group route works.
- [ ] **EXP-002** Group, title, positive amount, currency, date, payer, and participants are required as defined.
- [ ] **EXP-003** Equal split over amounts not divisible by participant count preserves the exact total and assigns cent remainder once.
- [ ] **EXP-004** Custom amounts must total the expense within currency tolerance; under/over totals block save with a precise error.
- [ ] **EXP-005** Custom percentages must total 100%; negative, zero-total, decimal, and rounding-boundary inputs are handled safely.
- [ ] **EXP-006** Shares require total weight above zero and calculate proportional amounts whose rounded sum equals the expense.
- [ ] **EXP-007** Add/remove/re-add participants; allocations reset or persist predictably and no removed participant retains an obligation.
- [ ] **EXP-008** Single payer contribution must equal total; payer's own share is netted correctly.
- [ ] **EXP-009** Multiple payer contributions must total expense; obligations are generated from net positions, not gross shares.
- [ ] **EXP-010** Participant who pays more than their share becomes creditor; a nonpayer becomes debtor for the correct amount.
- [ ] **EXP-011** Payer not included in split and multiple payers are handled according to product rules without losing money.
- [ ] **EXP-012** Split explanation matches entered amount, contributions, shares, rounding adjustment, and generated obligations.
- [ ] **EXP-013** Save private-group expense locally; save shared-group expense with shared visibility and creator identity.
- [ ] **EXP-014** Edit nonfinancial metadata without unnecessary verification reset.
- [ ] **EXP-015** Edit a verified expense's amount, payer, participants, method, or allocations; verification resets to pending and activity explains the change.
- [ ] **EXP-016** Expense detail shows status, split, payer contributions, obligations, verification, attachments, comments, and sync state.
- [ ] **EXP-017** Verify and reject group expenses only as an involved permitted participant; rejection reason is required where shown.
- [ ] **EXP-018** Rejected/disputed expense is excluded from settlements by default but remains visible/auditable.
- [ ] **EXP-019** Mark resolved returns it to the intended inclusion/trust state and records the resolver.
- [ ] **EXP-020** Archive expense confirmation preserves ledger history and removes its open obligations from default calculations.
- [ ] **EXP-021** Keep privately does not leak the record to group participants and updates visibility/sync behavior accurately.
- [ ] **EXP-022** Export expense PDF contains the correct split and excludes private data according to settings.
- [ ] **EXP-023** Create direct group debt with different debtor/creditor, positive amount, currency, title, notes, due date, and tags.
- [ ] **EXP-024** Same debtor/creditor, missing participant, invalid amount, and locked/read-only group block direct debt creation.
- [ ] **EXP-025** Direct debt appears in group ledger, balances, verification, settlement suggestions, and activity exactly once.

## 11. Requests inbox

- [ ] **REQ-001** Signed-out Requests shows a signed-out state and working Sign in action without cached shared details.
- [ ] **REQ-002** Search matches intended request names/descriptions case-insensitively and clearing restores results.
- [ ] **REQ-003** All, Pending, and Completed filters show correct items and counts.
- [ ] **REQ-004** Link requests, debt/payment confirmations, and group invites appear in their correct sections.
- [ ] **REQ-005** Accept/Reject each request type updates the card immediately, moves it to Completed, and syncs to the sender.
- [ ] **REQ-006** Contest debt confirmation captures the intended reason and Cancel performs no mutation.
- [ ] **REQ-007** Completed item title/body/status accurately states accepted, rejected, confirmed, contested, cancelled, or expired.
- [ ] **REQ-008** Needs review count matches unresolved conflicts/disputes; Open review opens Conflict center.
- [ ] **REQ-009** Same request received twice via refresh/realtime is deduplicated by identity.
- [ ] **REQ-010** Action on an already-handled/expired request returns an honest stale-state result and does not reverse it.
- [ ] **REQ-011** Offline action either queues safely or fails without changing the displayed authoritative status; reconnect reconciles once.
- [ ] **REQ-012** Requests for another user/account are never displayed or actionable.

## 12. Recurring records and reminders

- [ ] **REC-001** Empty recurring screen shows No recurring records and Add recurring opens the form.
- [ ] **REC-002** Create simple debt, shared expense, and group debt templates with valid related member/group.
- [ ] **REC-003** Required title, positive amount, currency, repeat cadence, next occurrence, direction/member/group validate correctly.
- [ ] **REC-004** Invalid date, past date policy, leap day, month end, daylight-saving boundary, and locale formatting are handled consistently.
- [ ] **REC-005** Edit template fields; generated historical records remain unchanged.
- [ ] **REC-006** Pause stops generation; resume/edit reactivates only as intended; End requires confirmation and is irreversible/read-only as designed.
- [ ] **REC-007** Generate due records creates exactly one record per due occurrence and advances next occurrence correctly.
- [ ] **REC-008** Re-run generation, restart during generation, and two-device generation do not duplicate occurrences.
- [ ] **REC-009** Auto and Prompt generation preferences behave correctly on app open.
- [ ] **REC-010** Generated records inherit intended visibility, parties, group, amount, currency, title, notes/tags, and verification behavior.
- [ ] **REC-011** Due/active counts exclude paused, ended, archived, and future templates.
- [ ] **REC-012** Create due-date and soft reminders; sent/dismissed/cancelled states and target navigation are accurate.

## 13. Attachments and comments

- [ ] **ATT-001** Pick document requests permission/context only when required; canceling the picker creates nothing.
- [ ] **ATT-002** Pick image handles granted, denied, limited, and later-revoked photo permission with clear recovery guidance.
- [ ] **ATT-003** Accepted image/PDF/CSV/note types and MIME/extension combinations pass validation; executable/unsupported types are rejected.
- [ ] **ATT-004** File below 10 MB and exactly at the supported boundary is accepted; oversized file is rejected before persistence/upload.
- [ ] **ATT-005** Missing URI, unreadable file, zero-byte file, misleading extension, and picker exception fail safely.
- [ ] **ATT-006** Edit display name, attachment type (receipt/proof/screenshot/invoice/other), and visibility before adding.
- [ ] **ATT-007** Shared attachment while signed out is blocked; private attachment remains available locally.
- [ ] **ATT-008** Attachment upload preference Ask/Shared only/Never and shared-upload privacy toggle are honored.
- [ ] **ATT-009** Attachment badges/counts update on parent and detail; receipt/proof labels appear only for matching active files.
- [ ] **ATT-010** Attachment detail displays metadata, local/remote location state, target, timestamps, and archived state without exposing unsafe paths in exports.
- [ ] **ATT-011** Remove attachment requires confirmation, soft-archives the reference, and never deletes/changes the parent financial record.
- [ ] **ATT-012** Offline shared attachment queues/retries safely and does not create duplicate storage objects.
- [ ] **COM-001** Add a private comment with non-empty body; it appears once and does not affect balances.
- [ ] **COM-002** Shared comment requires sign-in and permitted shared-record access.
- [ ] **COM-003** Edit own comment Save/Cancel works; unauthorized user cannot edit another user's shared comment.
- [ ] **COM-004** Delete requires confirmation, soft-deletes synced history, and preserves the financial record.
- [ ] **COM-005** Empty, whitespace-only, extremely long, multiline, Unicode, and emoji comments behave safely.
- [ ] **COM-006** Comment notification/category preference and privacy-safe body rules are honored.

## 14. Activity and notifications

- [ ] **ACT-001** Activity includes debt, payment, group, account, verification, and other intended events exactly once.
- [ ] **ACT-002** Search and All/Debts/Payments/Groups/Account filters match event content correctly.
- [ ] **ACT-003** Newest/Oldest sort is stable for equal timestamps and survives refresh as designed.
- [ ] **ACT-004** Event sentence uses correct actor, action, target, amount/currency, and relative/absolute date.
- [ ] **ACT-005** Selecting an event opens its valid target or handles an archived/missing target safely.
- [ ] **ACT-006** Private events are never visible to unauthorized shared users.
- [ ] **NOTIF-001** Empty center and unread count are correct; notification filters show intended categories.
- [ ] **NOTIF-002** Mark one read and Mark all read update read state/count immediately and persist after restart.
- [ ] **NOTIF-003** Open conflict notification routes to the exact conflict; Review shared request routes to Requests.
- [ ] **NOTIF-004** Missing/archived targets fail safely and notification can still be marked read.
- [ ] **NOTIF-005** Verification, group, payment/settlement, reminder, and comment category toggles independently gate creation/display.
- [ ] **NOTIF-006** Sensitive-details off produces neutral text with no names, amounts, notes, or group titles where privacy requires redaction.
- [ ] **NOTIF-007** Quiet hours work for same-day and overnight windows, including boundary minutes and timezone changes.
- [ ] **NOTIF-008** Push and email controls remain preferences only in beta; no token registration or external delivery occurs.

## 15. Analytics and smart suggestions

- [ ] **ANA-001** Empty analytics sections show clear no-data states and never display NaN/Infinity.
- [ ] **ANA-002** Start/end dates validate order and include records on boundary dates consistently.
- [ ] **ANA-003** Open, paid, partial, fully paid, overpaid, pending, verified, rejected, disputed, resolved, archived, and private filters include only intended records.
- [ ] **ANA-004** Monthly owed/owing trend matches ledger direction and payment-reduced balances.
- [ ] **ANA-005** Debt by member totals match member detail; category/tag totals split multi-tag amounts evenly.
- [ ] **ANA-006** Paid vs unpaid and trust-status totals reconcile to the same filtered source set.
- [ ] **ANA-007** Rejected/disputed records are excluded by default and included only when the privacy/analytics option is enabled.
- [ ] **ANA-008** Estimated base-currency mode is clearly labeled and uses configured rates without changing native values.
- [ ] **ANA-009** Missing/stale currency rate leaves the affected estimate out or clearly unavailable; it never assumes parity silently.
- [ ] **ANA-010** Export data from Analytics opens Export with matching privacy expectations.
- [ ] **SUG-001** Suggestions disabled produces no new suggestions; enabled state generates only intended tag/group/duplicate/recurring candidates.
- [ ] **SUG-002** Active suggestion explains its reason and target; no suggestion auto-applies or auto-merges.
- [ ] **SUG-003** Review navigates to the correct context; Accept applies one reversible/intended change and logs it.
- [ ] **SUG-004** Dismiss removes the item from Active without mutating the suggested target.
- [ ] **SUG-005** Expired/applied/dismissed suggestions do not reappear after refresh unless source data materially changes.
- [ ] **SUG-006** Private-only suggestion setting prevents shared data from being processed outside the permitted local path.

## 16. Search, filters, sorting, and presentation consistency

- [ ] **LIST-001** Every search handles case, leading/trailing spaces, diacritics, Unicode, punctuation, and no results.
- [ ] **LIST-002** Combining search with each filter uses intersection semantics and clearing either control restores the expected set.
- [ ] **LIST-003** Closing a filter sheet without selection preserves the previous filter; selecting updates active indication.
- [ ] **LIST-004** Empty dataset and filtered-empty dataset use distinct, actionable messages where appropriate.
- [ ] **LIST-005** Archived records are excluded from normal lists and present only on explicit archive/history/export paths.
- [ ] **LIST-006** Dates sort chronologically rather than lexicographically for every supported ISO input.
- [ ] **LIST-007** Money sorts numerically and does not combine different currencies as exact values.
- [ ] **LIST-008** Counts/totals remain consistent between dashboard, lists, detail, analytics, export, and restored data.
- [ ] **LIST-009** Refresh/realtime update does not jump scroll unexpectedly, duplicate rows, or retain a deleted filter result.

## 17. Offline operation, synchronization, and conflicts

- [ ] **SYNC-001** Create/edit private local members, debts, groups, expenses, payments, comments, and attachments offline; restart preserves them.
- [ ] **SYNC-002** Private local-only records are not uploaded merely because the user signs in unless explicit backup/sync preference allows it.
- [ ] **SYNC-003** Shared operations created offline enter a visible pending queue with dependencies in valid order.
- [ ] **SYNC-004** Reconnect drains the queue once, maps local IDs to remote IDs, and updates records to synced without duplication.
- [ ] **SYNC-005** App closes/restarts mid-sync; queue resumes safely and completed work is not repeated.
- [ ] **SYNC-006** Parent/member/group creation syncs before dependent debt/expense/payment/attachment/comment operations.
- [ ] **SYNC-007** Transient network/server errors allow Retry with backoff; permission/auth errors do not loop endlessly.
- [ ] **SYNC-008** Retry is offered only for retryable failed entries; Cancel requires confirmation and preserves an auditable local state.
- [ ] **SYNC-009** Sync summary counts pending, running, failed, conflict, and healthy states correctly.
- [ ] **SYNC-010** No pending work state appears only when no actionable queue entry remains.
- [ ] **SYNC-011** Realtime changes from User B appear once on A and do not overwrite A's unsaved form.
- [ ] **SYNC-012** Same account on devices A1/A2 converges after sequential non-conflicting changes.
- [ ] **SYNC-013** Concurrent nonfinancial edits merge only when defined; otherwise create a reviewable conflict.
- [ ] **SYNC-014** Concurrent financial edits never silently overwrite; Conflict center shows entity/type/time and both snapshots.
- [ ] **SYNC-015** Keep mine is available only when permission and snapshot shape make it honest; it pushes the selected local state once.
- [ ] **SYNC-016** Keep theirs replaces local state only when the remote snapshot maps safely to the same record.
- [ ] **SYNC-017** Cancel local change requires confirmation, removes/cancels the queued mutation, and retains remote authoritative state.
- [ ] **SYNC-018** Resolved conflict leaves Conflict center, updates sync health, and records the resolution.
- [ ] **SYNC-019** Resolved/ignored conflict cannot be acted on again through stale navigation.
- [ ] **SYNC-020** Missing local-to-remote relationship fails loudly and never writes a local UUID into a remote foreign-key field.
- [ ] **SYNC-021** Sync under slow/intermittent network shows progress without frozen UI or duplicate alerts.
- [ ] **SYNC-022** Sign out during sync stops account-scoped work safely; signing in to another user cannot resume it under the wrong account.

## 18. Import, export, backup, and restore

- [ ] **IMP-001** CSV picker accepts `.csv` extension or valid CSV MIME, and rejects non-CSV files with a clear message.
- [ ] **IMP-002** Cancel picker creates no batch; unreadable/oversized file returns a safe error.
- [ ] **IMP-003** Paste CSV and edit Source name; Preview updates without importing.
- [ ] **IMP-004** Parser handles headers, CRLF/LF, quoted commas, embedded newlines, escaped quotes, blank rows, BOM, Unicode, and empty cells.
- [ ] **IMP-005** Missing/unknown headers, malformed quotes, invalid amount/date/currency/status, and duplicate rows show row-level errors.
- [ ] **IMP-006** Valid/invalid counts and row previews match the source; No rows parsed appears correctly.
- [ ] **IMP-007** Confirm imports valid rows once and skips invalid rows according to displayed behavior; cancel/retry does not duplicate records.
- [ ] **IMP-008** Imported records default to safe local/private visibility and do not claim remote IDs or verification.
- [ ] **EXPOR-001** Generate each CSV scope: Debts, Members, Groups, Payments, Settlements, Recurring, and Tags.
- [ ] **EXPOR-002** CSV escapes commas, quotes, and newlines and preserves native currency, statuses, verification, payments, and timestamps.
- [ ] **EXPOR-003** Private notes, comments, attachment references, rejected/disputed, and archived toggles independently control inclusion.
- [ ] **EXPOR-004** Default export excludes private/sensitive optional data and attachment binary content.
- [ ] **EXPOR-005** Group PDF and text summary reconcile balances, suggestions, included/excluded rows, and calculation settings.
- [ ] **EXPOR-006** No-group export actions show clear feedback and create no empty misleading file.
- [ ] **EXPOR-007** Full JSON export includes all permitted account entities and honors note/attachment metadata toggles.
- [ ] **EXPOR-008** File write/share cancel, denied destination, disk-full, and share-sheet failure return safe errors without false export logs.
- [ ] **BACK-001** Create backup with notes/comments and attachment metadata toggles off/on; content matches selection.
- [ ] **BACK-002** Backup sanitizes unsafe local file paths and rejects attachments that cannot be exported safely.
- [ ] **BACK-003** Backup JSON contains supported schema version and enough relationships to restore the ledger.
- [ ] **BACK-004** Restore preview rejects non-Debtulator JSON, malformed fields, and payloads over 5 MB without changing data.
- [ ] **BACK-005** Older supported schema previews with warnings and restores through compatibility mapping.
- [ ] **BACK-006** Newer unsupported schema is blocked or clearly warned according to compatibility rules.
- [ ] **BACK-007** Merge skips existing IDs without overwriting current records and imports noncolliding records with valid relationships.
- [ ] **BACK-008** Replace local requires explicit confirmation and replaces only intended local data.
- [ ] **BACK-009** Duplicate/private remaps every relationship, strips shared/sync state, and never writes into existing shared records.
- [ ] **BACK-010** Restore failure is atomic: existing data remains intact and retry produces one restored copy.
- [ ] **BACK-011** After restore, dashboard/list/detail/analytics totals reconcile and restart remains consistent.

## 19. Settings, privacy, language, and accessibility

- [ ] **SET-001** Settings account card correctly shows Local/Cloud, base currency, identity, and sync health.
- [ ] **SET-002** Every Settings row opens its intended screen; no row traps the user on Settings itself.
- [ ] **SET-003** Default debt Private/Shared member and group Private/Shared settings affect only newly created records as documented.
- [ ] **SET-004** Sensitive notification, private backup sync, shared attachment upload, rejected analytics, private suggestions, telemetry, and crash toggles persist independently.
- [ ] **SET-005** Push/email preferences and quiet-hours/category controls persist but do not claim beta external delivery.
- [ ] **SET-006** Base-currency change updates estimated summaries only and never rewrites native stored amounts.
- [ ] **SET-007** Language System/English/Swedish selection persists and translates supported labels without changing stored enum values.
- [ ] **SET-008** Switch language on every major screen; dates, amounts, truncation, and navigation remain usable, with fallback text for missing translations.
- [ ] **SET-009** Theme System/Light/Dark, where exposed/supported, follows selection and maintains contrast through restart/system change.
- [ ] **A11Y-001** VoiceOver/TalkBack can navigate every screen in logical order with meaningful names, roles, values, hints, and selected/disabled states.
- [ ] **A11Y-002** Icon-only buttons, close controls, tab items, amount/direction rows, charts, badges, and destructive actions have unique labels.
- [ ] **A11Y-003** Dynamic Type/font scaling through the largest supported size leaves all primary actions and financial values readable/reachable.
- [ ] **A11Y-004** Text and meaningful controls meet contrast requirements in light/dark states and statuses are not conveyed by color alone.
- [ ] **A11Y-005** Touch targets are at least the platform minimum and do not overlap at narrow widths.
- [ ] **A11Y-006** Keyboard/switch control can operate web/tablet UI with visible focus order and no keyboard trap.
- [ ] **A11Y-007** Reduce Motion setting avoids essential information depending on animation and leaves transitions comfortable.
- [ ] **A11Y-008** Screen-reader announcements occur for save success/failure, validation errors, loading completion, filter changes, and destructive confirmations.
- [ ] **A11Y-009** Charts and visual balance indicators have textual equivalents containing the same conclusion.

## 20. Account deletion and development resets

- [ ] **DEL-001** Delete account explains export, remote deletion/anonymization, retained ledger integrity, and local-data choices before action.
- [ ] **DEL-002** Action remains disabled until exact case-insensitive trimmed `DELETE` confirmation rule is satisfied.
- [ ] **DEL-003** Signed-out user cannot submit a backend deletion request and receives a clear sign-in requirement.
- [ ] **DEL-004** Cancel the native confirmation; no local or remote state changes.
- [ ] **DEL-005** Submit while keeping local archive; backend request is recorded once and allowed local-only data remains readable after session removal.
- [ ] **DEL-006** Submit with Delete local data too; local records, preferences/session as documented are erased and first-run returns.
- [ ] **DEL-007** Pending, completed, and failed backend statuses display accurately; Refresh status updates without duplicate requests.
- [ ] **DEL-008** Worker failure records a safe failure reason and permits the defined retry/support path.
- [ ] **DEL-009** Completed deletion removes Auth/storage/private account data and anonymizes/retains shared ledger history exactly as disclosed.
- [ ] **DEL-010** Deleted account cannot sign in; former group participants see only permitted anonymized historical attribution.
- [ ] **RESET-001** Development Clear local data and reset sync is absent from production builds.
- [ ] **RESET-002** Cancel development reset is non-destructive; Confirm clears hosted test tables and local domain data while retaining login/onboarding/preferences.
- [ ] **RESET-003** Full local erase requires both confirmations, erases session/onboarding/preferences/records, and returns to first run.
- [ ] **RESET-004** Offline auth sign-out failure does not prevent local erase; warning accurately describes the remaining session risk.
- [ ] **RESET-005** Reset failure leaves app recoverable and never targets a production backend.

## 21. Financial correctness and edge cases

- [ ] **MONEY-001** All stored/displayed calculations round at currency precision and avoid binary floating-point artifacts.
- [ ] **MONEY-002** For every expense, participant shares sum to original amount and generated debtor obligations equal creditor obligations.
- [ ] **MONEY-003** For every payment, settlement-line amounts plus unapplied amount equal payment amount.
- [ ] **MONEY-004** Remaining equals original minus accepted applied payments, bounded/statused according to overpayment rules.
- [ ] **MONEY-005** Rejected, disputed, archived, settled, cancelled, and pending records are included/excluded consistently with current settings.
- [ ] **MONEY-006** Settlement suggestions conserve value per currency and do not create or destroy balance.
- [ ] **MONEY-007** Fewest-payment suggestions settle every included participant net to zero within one cent.
- [ ] **MONEY-008** Direct-debt-only and verified-only modes include only eligible records and explain exclusions.
- [ ] **MONEY-009** Converted settlement suggestions are explicitly approximate and use the chosen settlement currency/rates.
- [ ] **MONEY-010** Zero/negative rates, missing rates, and extreme exchange rates cannot silently create a settlement.
- [ ] **MONEY-011** Dates around year/month boundaries, leap years, timezone changes, and device clock changes retain intended calendar day.
- [ ] **MONEY-012** Very large datasets/amounts do not overflow, show exponential garbage, or lose cents in exports.
- [ ] **MONEY-013** Record IDs remain unique during rapid offline creation and after restore/sync.
- [ ] **MONEY-014** Editing/deleting metadata never alters principal, payments, splits, or settlement history.

## 22. Security, authorization, and privacy

- [ ] **SEC-001** Supabase row-level security denies unauthenticated access to shared records and all cross-user data not explicitly shared.
- [ ] **SEC-002** User D cannot read/update/delete A-B debt, verification, link request, payment, group, attachment, comment, notification, or export log by guessed ID.
- [ ] **SEC-003** Group role and lifecycle restrictions are enforced by backend policy/RPC, not only hidden UI controls.
- [ ] **SEC-004** Accepted-link function succeeds only for two distinct non-null users when caller is one party and an accepted request exists.
- [ ] **SEC-005** Shared debt insert requires creator equal to authenticated user and accepted link to involved user.
- [ ] **SEC-006** Shared debt update requires caller to be creator/involved and accepted link to remain valid.
- [ ] **SEC-007** Debt verification RPC requires authentication, accepted responder link, and caller access to the debt.
- [ ] **SEC-008** Service-role keys, tokens, passwords, `.env` contents, raw SQL errors, and private payloads never appear in UI/logs/telemetry/export by default.
- [ ] **SEC-009** Telemetry keeps allowlisted primitive metadata only; private notes, names, attachment contents, and auth data are removed.
- [ ] **SEC-010** Crash breadcrumbs follow the same privacy rule and respect the crash-reporting opt-in.
- [ ] **SEC-011** Shared attachment URLs/storage paths cannot be accessed after permission/removal and private attachments never upload accidentally.
- [ ] **SEC-012** Export/backup share sheets require deliberate user action and default to the least-sensitive content.
- [ ] **SEC-013** Clipboard, screenshots/app switcher, and notification previews do not expose sensitive content beyond documented platform behavior.
- [ ] **SEC-014** Input containing SQL/script/HTML control characters is stored/displayed as text and cannot alter queries or execute code.
- [ ] **SEC-015** Repeated auth/link/invite/reminder requests are rate-limited or fail safely without duplicate side effects.

## 23. Resilience, performance, and device conditions

- [ ] **PERF-001** Home and each main list reach interactive state within the agreed release budget on the oldest supported device.
- [ ] **PERF-002** Lists with at least 1,000 records scroll, search, and filter without freezes or incorrect row reuse.
- [ ] **PERF-003** Group detail with many members/expenses/payments/activity remains responsive and calculations complete predictably.
- [ ] **PERF-004** Large import/export/backup shows progress or responsive UI and does not exceed memory limits.
- [ ] **PERF-005** Low storage during database write/export/attachment/backup produces a recoverable error and no partial financial mutation.
- [ ] **PERF-006** Loss of network at each mutation phase produces either committed local queued state or a complete rollback, never an ambiguous duplicate.
- [ ] **PERF-007** Repeated background/foreground and OS process termination do not corrupt SQLite or leave permanent running queue entries.
- [ ] **PERF-008** Incoming call, permission dialog, share sheet, and file picker interruption return to the correct app state.
- [ ] **PERF-009** Device locale, 12/24-hour clock, timezone, and calendar changes do not rewrite stored values.
- [ ] **PERF-010** Memory usage remains stable after repeatedly opening/closing large detail screens, menus, filters, and image pickers.
- [ ] **PERF-011** App handles backend maintenance, 401, 403, 404, 409, 429, and 5xx responses with actionable safe messages.
- [ ] **PERF-012** No raw exception, blank screen, endless spinner, or unhandled promise occurs in any tested failure path.

## 24. Platform and visual quality

- [ ] **UI-001** Test smallest supported phone, large phone, tablet/windowed layout, and web width if applicable.
- [ ] **UI-002** Safe areas, notches, dynamic island/cutouts, home indicator, and Android navigation bar do not cover controls.
- [ ] **UI-003** Portrait/landscape and split-screen layouts avoid clipped modals, sheets, charts, and fixed footers.
- [ ] **UI-004** Light/dark/system appearance has no invisible text, incorrect status bar, flashing theme, or unreadable disabled state.
- [ ] **UI-005** Long translated names, group titles, currencies, error messages, and accessibility text wrap/truncate without hiding meaning.
- [ ] **UI-006** Loading, pressed, selected, disabled, success, warning, negative, and empty states are visually distinguishable.
- [ ] **UI-007** Native date, document, image, share, and permission surfaces open and return correctly on each platform.
- [ ] **UI-008** Haptics occur only on intended interactions and app remains functional where haptics are unavailable/disabled.
- [ ] **UI-009** Web hover/focus/pointer behavior, browser refresh, and direct URL entry work for included web routes.
- [ ] **UI-010** No placeholder React/Expo asset, test copy, developer control, or staging identifier appears in production.

## 25. Automated checks and release closure

- [ ] **AUTO-001** `npm run typecheck` passes.
- [ ] **AUTO-002** `npm run lint` passes.
- [ ] **AUTO-003** `npm test` passes, including database initialization/reset, financial correctness, backup/restore, file validation, sync, notifications, telemetry, and release preflight tests.
- [ ] **AUTO-004** `npm run quality` passes from a clean dependency install with the supported Node version.
- [ ] **AUTO-005** Supabase migrations apply from a clean database in order and schema reload exposes all RPCs.
- [ ] **AUTO-006** Migration rollback/recovery plan is tested in staging for destructive or policy-changing migrations.
- [ ] **AUTO-007** Staging release preflight passes with staging environment separation.
- [ ] **AUTO-008** Production strict preflight passes only with real approved production values.
- [ ] **AUTO-009** App/package versions and iOS build number/Android version code are valid and incremented.
- [ ] **AUTO-010** Run the short scripts in `docs/manual-qa-scripts.md` after this regression as the final release smoke.
- [ ] **AUTO-011** All release-blocking failures are fixed and retested; accepted known issues have owner, severity, workaround, and release approval.
- [ ] **AUTO-012** Final evidence records devices, accounts, backend environment, test IDs, results, and defect links without sensitive data.

## Release sign-off

| Role | Name | Decision | Date | Notes |
|---|---|---|---|---|
| QA owner | | Approve / Reject | | |
| Engineering owner | | Approve / Reject | | |
| Product/release owner | | Approve / Reject | | |

Release approval requires no open critical/high defect affecting authorization, financial correctness, data loss, backup/restore, account deletion, or app startup. Any skipped applicable test must have an owner-approved reason and risk assessment.
