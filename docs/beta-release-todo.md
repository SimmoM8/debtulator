# Beta Release Master Todo

This document is the full beta-launch backlog for Debtulator, not just the store-submission checklist. It includes engineering, feature work, compliance, design, assets, marketing, QA, and rollout tasks.

## Repo-Grounded Snapshot

Already present in the repo:

- Expo app config includes bundle/package IDs, version/build fields, icons, splash, deep-link scheme, and notification permission strings.
- EAS build profiles exist for `development`, `staging`, and `production`.
- The app already has substantial product surface area: auth, sync, conflicts, backup/restore, import/export, analytics, privacy controls, accessibility, and delete-account screens.
- There is a local notification center UI and privacy/notification settings UI.
- There is at least one automated sync test (`tests/stage7-sync.test.cjs`).

Concrete gaps or probable unfinished areas found in the repo:

- Push notifications appear to be settings/UI only. No `expo-notifications` integration or push-token registration flow was found.
- Account deletion currently records an audit event from the app UI, but no complete backend deletion/anonymization pipeline was found.
- CSV import and attachments still depend on manual file URI entry instead of a native picker flow.
- Crash reporting and product analytics integrations were not found.
- Only a small amount of branded artwork exists in-repo: app icons plus two illustration components.
- No store screenshots, privacy-policy URL, support URL, or store-listing copy were found.
- Settings still contain product-hardening language indicating some release surfaces were treated as placeholders during development.

## 0. Beta Scope Decision

- [ ] Decide what the beta promises and what it explicitly does not promise.
- [ ] Freeze a beta feature set so launch work does not keep expanding during store review.
- [ ] Decide whether beta users are testing:
  - [ ] local-only debt tracking
  - [ ] account/auth flows
  - [ ] shared-event sync
  - [ ] backup/export/delete-account compliance flows
  - [ ] notifications
- [ ] Define what should stay disabled or explicitly labeled beta-only.
- [ ] Decide whether the beta uses staging backend data or production-like infrastructure.

## 1. Detailed Engineering And Coding Tasks

### 1.1 Release validation and build pipeline

- [ ] Run `npm run lint` and `npm test`, record failures, and clear them before any store upload.
- [ ] Add a repeatable local release command sequence for beta validation:
  - [ ] lint
  - [ ] tests
  - [ ] iOS beta build
  - [ ] Android beta build
- [ ] Create a release README or script that documents:
  - [ ] required env vars
  - [ ] backend project selection
  - [ ] EAS profile usage
  - [ ] credential ownership
  - [ ] upload commands
- [ ] Verify app versioning strategy across `package.json`, `app.json`, iOS build number, and Android version code.
- [ ] Decide whether `1.0.0` is really the first beta version or whether a `0.x` beta series is more appropriate.
- [ ] Add a preflight checklist script or CI job to fail fast if:
  - [ ] required env vars are missing
  - [ ] bundle/package IDs drift
  - [ ] version fields are inconsistent
  - [ ] tests or lint fail

### 1.2 Account deletion implementation hardening

Current repo state: the delete-account screen records `account_deletion_requested`, but that is not enough for App Store compliance if deletion is not actually fulfilled.

- [ ] Design the real account-deletion flow end to end.
- [ ] Decide whether deletion is immediate, queued, or review-based.
- [ ] Implement backend support for deletion requests:
  - [ ] add a dedicated deletion-request table or edge function
  - [ ] record request time and authenticated user ID
  - [ ] record device-local preferences like local wipe vs keep local archive
  - [ ] record fulfillment status and error state
- [ ] Implement actual remote cleanup behavior:
  - [ ] revoke push tokens
  - [ ] clear notification preferences that should not persist
  - [ ] anonymize or remove profile fields
  - [ ] preserve shared financial history where needed for other participants
  - [ ] sever account-linked references safely without corrupting shared ledgers
- [ ] Decide what happens to:
  - [ ] event ownership
  - [ ] linked-member relationships
  - [ ] comments
  - [ ] attachments
  - [ ] export logs
  - [ ] audit logs
- [ ] Surface deletion status back in the app:
  - [ ] pending
  - [ ] completed
  - [ ] failed
- [ ] Add automated tests for deletion policy edge cases:
  - [ ] sole owner of a shared event
  - [ ] user with uploaded attachments
  - [ ] user with unresolved conflicts
  - [ ] user with private local backup enabled
- [ ] Update deletion copy so it describes what is guaranteed, what is anonymized, and what is retained for ledger integrity.

### 1.3 Push notifications implementation

Current repo state: settings and notification-center UI exist, but no push implementation was found.

- [ ] Add the actual push-notification stack if beta requires it.
- [ ] Install and configure the notification library stack.
- [ ] Implement platform permission request flow:
  - [ ] request permission intentionally, not on first app launch
  - [ ] explain value before the OS prompt
  - [ ] handle denied, provisional, and granted states
- [ ] Register device tokens and associate them with the authenticated account.
- [ ] Add token refresh and logout cleanup logic.
- [ ] Ensure signed-out users never get account-scoped notifications.
- [ ] Respect privacy settings when generating notification content.
- [ ] Respect quiet hours and per-category notification toggles.
- [ ] Decide whether beta supports:
  - [ ] local reminder notifications only
  - [ ] server-triggered push for shared events
  - [ ] both
- [ ] Add local testing utilities for notifications so QA can trigger representative payloads.
- [ ] Add failure handling for:
  - [ ] token registration failure
  - [ ] permission denied
  - [ ] stale token removal
  - [ ] backend delivery failure
- [ ] Add tests for notification preference gating and privacy-safe body generation.

### 1.4 Crash reporting and product telemetry

Current repo state: no crash-reporting or product-analytics integration was found.

- [ ] Add crash reporting before external beta if possible.
- [ ] Choose a tool and integrate it at app bootstrap.
- [ ] Capture:
  - [ ] uncaught JS exceptions
  - [ ] React render crashes
  - [ ] sync-engine failures
  - [ ] export/import failures
  - [ ] auth failures that strand users
- [ ] Add structured breadcrumbs for important flows:
  - [ ] auth state changes
  - [ ] sync queue processing
  - [ ] conflict creation/resolution
  - [ ] export generation
  - [ ] backup restore
- [ ] Add minimal product analytics for beta learning:
  - [ ] onboarding started/completed
  - [ ] first debt created
  - [ ] first shared event created
  - [ ] first sync success/failure
  - [ ] export used
  - [ ] delete-account request used
- [ ] Keep telemetry privacy-conscious:
  - [ ] no raw financial note bodies
  - [ ] no attachment contents
  - [ ] no unnecessary PII
- [ ] Document telemetry behavior for App Privacy / Data safety disclosures.

### 1.5 Sync and conflict hardening

Current repo state: sync architecture is substantial, but automated coverage appears thin relative to the number of sync paths.

- [ ] Expand automated tests around the Stage 6/7 sync engine.
- [ ] Add tests for queue replay and retry behavior.
- [ ] Add tests for remote/local ID mapping regressions.
- [ ] Add tests for attachment upload sync behavior.
- [ ] Add tests for settlement and payment sync edge cases.
- [ ] Add tests for conflict classification so financial conflicts remain high-safety.
- [ ] Add tests for duplicate-warning and claim flows in shared events.
- [ ] Add tests for offline mutation queues across sign-in/sign-out boundaries.
- [ ] Add regression tests for mixed visibility data so private records never leak into shared sync.
- [ ] Add QA seed scenarios that intentionally generate:
  - [ ] concurrent edits
  - [ ] stale remote versions
  - [ ] deleted remote rows
  - [ ] failed attachment uploads
  - [ ] retry backoff states
- [ ] Add better user-facing sync diagnostics if current messages are too developer-oriented.

### 1.6 Import, export, backup, and attachment UX hardening

Current repo state: import CSV and attachments still expose manual file URI input, which is not a beta-friendly mobile UX.

- [ ] Replace manual URI-driven import with native document selection.
- [ ] Replace manual attachment URI entry with native file or image picking.
- [ ] Add clear validation and error states for unsupported file types and oversized files.
- [ ] Add attachment size/type limits that match storage policy and store expectations.
- [ ] Improve export UX so users can:
  - [ ] generate files
  - [ ] preview what is included
  - [ ] share files intentionally
  - [ ] understand where files are saved
- [ ] Decide whether CSV package and PDF summary formats are truly beta-ready.
- [ ] If not beta-ready, either finish them fully or hide them behind a deliberate beta label.
- [ ] Test backup restore with:
  - [ ] older schema versions
  - [ ] malformed JSON
  - [ ] missing related records
  - [ ] large datasets
  - [ ] duplicate/private restore modes
- [ ] Make sure every export and restore path emits audit data consistently.

### 1.7 Auth and profile hardening

- [ ] Validate sign-up, sign-in, sign-out, and password reset on real devices.
- [ ] Confirm session persistence behaves correctly after app restart and token refresh.
- [ ] Add better user feedback for backend misconfiguration so beta users do not see developer-style env-var failures.
- [ ] Decide whether social login is out of scope for beta and make that explicit.
- [ ] Ensure profile creation and profile updates are idempotent and recover from transient Supabase errors.
- [ ] Add tests for switching between local-only and authenticated usage without data confusion.

### 1.8 UI polish and production-surface cleanup

- [ ] Remove or update any copy that still frames release surfaces as placeholders.
- [ ] Audit screens for beta-quality empty states, loading states, and error messages.
- [ ] Review screen titles and wording for consistency across debts, events, exports, sync, privacy, and settings.
- [ ] Check whether the app should expose a `dark` theme option yet, since settings currently suggest it is deferred.
- [ ] Review all destructive actions for confirmation, undo, and post-action state refresh.
- [ ] Improve tablet and large-screen layouts if `supportsTablet` remains enabled.

### 1.9 Accessibility and localization completion

- [ ] Complete a screen-by-screen accessibility audit.
- [ ] Verify semantic labels, role hints, focus order, and actionable-control sizing.
- [ ] Verify charts and analytics remain understandable without visual color dependence.
- [ ] Review contrast and typography scaling under large dynamic type.
- [ ] Review keyboard navigation and screen-reader behavior on web if web remains a supported build target.
- [ ] Complete English and Swedish copy review for:
  - [ ] store-facing terms
  - [ ] destructive actions
  - [ ] privacy messaging
  - [ ] sync/conflict messaging

### 1.10 Automated test expansion

- [ ] Add unit tests for privacy rules and permission helpers.
- [ ] Add tests for analytics calculations and currency-estimation labeling.
- [ ] Add tests for export payload shaping and exclusion of sensitive data when toggles are off.
- [ ] Add tests for notification-body privacy filtering and quiet hours.
- [ ] Add tests for restore preview validation.
- [ ] Add at least one integration-style happy path covering:
  - [ ] sign in
  - [ ] create shared event
  - [ ] add expense
  - [ ] sync to second user
  - [ ] resolve a conflict
  - [ ] export data
- [ ] Decide whether beta needs end-to-end device tests and, if yes, add a lightweight smoke suite.

## 2. Product And Feature Implementation Tasks

### 2.1 Features to finish or intentionally defer

- [ ] Decide whether push notifications are beta-critical or should ship disabled.
- [ ] Decide whether email notifications are real in beta or just backend-ready preferences.
- [ ] Decide whether CSV package export and PDF summary are fully supported.
- [ ] Decide whether attachment uploads are beta-safe enough for external testers.
- [ ] Decide whether advanced sync/conflict flows are exposed broadly or tested with a smaller internal cohort first.
- [ ] Decide whether local-only users need a more explicit first-run mode selection.

### 2.2 Onboarding and first-run experience

- [ ] Add a clearer first-run explanation of local-first behavior.
- [ ] Explain the difference between private records, shared records, and account backup.
- [ ] Add guidance for when users should sign in versus stay local-only.
- [ ] Add sample empty-state prompts for first debt, first member, first event, and first shared event.
- [ ] Add a tester-facing beta banner or changelog entry if behavior is still shifting.

### 2.3 Trust and safety product work

- [ ] Review wording around verification, disputes, and shared financial edits so the app feels trustworthy.
- [ ] Add clearer explanations for why certain unsafe shared actions are blocked.
- [ ] Make conflict severity obvious at a glance.
- [ ] Add success/failure summaries after restore, export, and sync-repair actions.

## 3. Brand Design Tasks

### 3.1 Brand direction

- [ ] Define a concise brand system for beta:
  - [ ] brand promise
  - [ ] tone of voice
  - [ ] core visual metaphors
  - [ ] trust/safety cues
- [ ] Decide whether the current visual identity should lean more toward:
  - [ ] personal finance utility
  - [ ] calm household organizer
  - [ ] collaborative shared-expense tool
- [ ] Make sure app copy, store copy, website copy, and onboarding all sound like the same product.

### 3.2 Design system hardening

- [ ] Turn current colors, type, spacing, and card patterns into an explicit brand style guide.
- [ ] Define icon usage rules for financial, sync, privacy, and destructive actions.
- [ ] Create reusable guidance for hero cards and illustration placement so store assets match the app UI.
- [ ] Review typography hierarchy across screens for stronger scannability and a more mature beta feel.

## 4. Graphics And Asset Tasks

### 4.1 App-store assets

- [ ] Create App Store and Google Play screenshot sets.
- [ ] Create a feature graphic for Google Play.
- [ ] Create optional App Store promotional artwork if you plan to use it.
- [ ] Review whether the current icon reads clearly at small sizes and in store search results.
- [ ] Test icon visibility against light and dark backgrounds.

### 4.2 In-app branded assets

- [ ] Expand the illustration set beyond the current orbit/shield motifs if more variety is needed.
- [ ] Create consistent empty-state illustrations for:
  - [ ] no debts
  - [ ] no events
  - [ ] no notifications
  - [ ] no conflicts
  - [ ] no analytics data
- [ ] Create a screenshot-safe visual dataset so marketing images do not expose fake or messy data.
- [ ] Decide whether receipts/attachments need stock demo images for screenshots.

### 4.3 Website and support assets

- [ ] Create logo lockups for website, support page, and social avatars.
- [ ] Create OG/social preview images.
- [ ] Create press/demo assets if you plan any outreach during beta.

## 5. Legal, Compliance, And Trust Tasks

- [ ] Publish a privacy policy on a stable public URL.
- [ ] Publish a support/contact page on a stable public URL.
- [ ] Draft terms of service if the beta accepts account creation from external testers.
- [ ] Map actual data handling for Apple App Privacy answers.
- [ ] Map actual data handling for Google Play Data safety answers.
- [ ] Confirm store disclosures align with actual implementation for:
  - [ ] auth sessions
  - [ ] financial records
  - [ ] shared-event sync
  - [ ] attachments
  - [ ] exports/backups
  - [ ] notifications and push tokens
  - [ ] crash analytics / product telemetry
- [ ] Prepare reviewer notes explaining how to access protected or authenticated features.

## 6. Marketing And Go-To-Market Tasks

### 6.1 Messaging

- [ ] Write a one-sentence product positioning statement.
- [ ] Write a short store subtitle / short description.
- [ ] Write the full store description.
- [ ] Write a concise list of key differentiators, such as:
  - [ ] local-first privacy model
  - [ ] explicit sharing model
  - [ ] shared event workflow
  - [ ] backup/export/delete-account controls
- [ ] Write release notes for the first beta.

### 6.2 Web presence

- [ ] Create a simple landing page or product page.
- [ ] Include:
  - [ ] overview
  - [ ] privacy policy
  - [ ] support contact
  - [ ] screenshots
  - [ ] beta signup or tester instructions if needed
- [ ] Make sure the site uses the same branding as the app.

### 6.3 Beta acquisition and communication

- [ ] Decide who the first testers are.
- [ ] Create a tester brief that explains what kinds of feedback are wanted.
- [ ] Create a feedback channel:
  - [ ] email
  - [ ] form
  - [ ] issue tracker
  - [ ] Discord/Slack group
- [ ] Prepare a known-issues list so testers know what is already understood.
- [ ] Prepare a changelog cadence for each beta update.

## 7. Store Submission And Account Tasks

- [ ] Confirm Apple Developer and Google Play Console accounts are active.
- [ ] Create or verify the app records in both stores.
- [ ] Confirm identifiers match exactly:
  - [ ] `com.debtulator.app` on iOS
  - [ ] `com.debtulator.app` on Android
- [ ] Set up and verify signing credentials in EAS.
- [ ] Fill in categories, content rating, age rating, support info, and review contact info.
- [ ] Upload build artifacts and confirm they process successfully.
- [ ] Start with internal testing before opening to a broader external cohort.

## 8. QA And Beta Operations

### 8.1 Device QA

- [ ] Test on at least one physical iPhone and one physical Android device.
- [ ] Test cold start, warm start, background/foreground transitions, and app restart after kill.
- [ ] Test clean install and upgrade install.
- [ ] Test small-screen and tablet behavior if tablet remains supported.

### 8.2 Core scenario QA

- [ ] Signed-out local-only flow.
- [ ] Authenticated personal flow.
- [ ] Shared-event creation and collaboration flow across two accounts.
- [ ] Payment and settlement flow.
- [ ] Conflict generation and resolution flow.
- [ ] Backup, restore, full export, and CSV import flow.
- [ ] Delete-account flow.
- [ ] Notification preference and delivery flow.

### 8.3 Beta triage operations

- [ ] Define severity levels for beta bugs.
- [ ] Define a blocker threshold for shipping the beta externally.
- [ ] Assign ownership for:
  - [ ] crash triage
  - [ ] sync incidents
  - [ ] tester support
  - [ ] release management
- [ ] Decide how frequently beta builds will be cut.
- [ ] Decide when beta data should be reset or migrated.

## 9. Suggested Execution Order

1. Freeze beta scope.
2. Finish true release blockers in code: deletion pipeline, notification decision, crash reporting, picker/share UX, and sync hardening.
3. Expand automated coverage for the highest-risk financial and sync flows.
4. Complete legal/compliance surfaces: privacy policy, support page, data-safety mapping.
5. Build branded store assets, screenshots, and marketing copy.
6. Run internal real-device QA and upload internal beta builds.
7. Fix blockers from internal testing.
8. Open the beta to a broader tester group.

## 10. Go / No-Go Gate For External Beta

Do not invite external testers until all of the following are true:

- [ ] Lint and tests pass.
- [ ] The beta backend environment is configured and secured.
- [ ] Push notifications are either fully implemented and tested or deliberately disabled for beta.
- [ ] Account deletion is a real fulfilled flow, not just a request log.
- [ ] Import/export/attachment flows are usable on real mobile devices without developer-only file-URI workarounds.
- [ ] Crash reporting is live.
- [ ] Core flows work on real iOS and Android hardware.
- [ ] Privacy policy, support page, and store disclosures are complete.
- [ ] Store assets and listing copy are ready.
- [ ] Signed builds upload successfully.
- [ ] A tester feedback and triage process is in place.
