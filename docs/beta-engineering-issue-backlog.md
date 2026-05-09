# Beta Engineering Issue Backlog

These issue drafts are intended to be pasted into GitHub issues with minimal editing. They focus on the biggest engineering blockers for a trustworthy beta.

## Issue 1: Implement fulfilled account deletion pipeline

### Suggested labels

- `beta`
- `P0`
- `privacy`
- `backend`
- `mobile`

### Problem

The app currently exposes a delete-account flow that records `account_deletion_requested`, but there is no clear evidence of a backend fulfillment pipeline that actually completes deletion or anonymization. That is risky for both user trust and App Store review.

### Goals

- Turn account deletion into a real end-to-end capability.
- Preserve shared ledger integrity while removing or anonymizing personal data correctly.
- Expose deletion status clearly to the user.

### Scope

- Define deletion states and fulfillment model.
- Add backend support for deletion requests and status tracking.
- Revoke push tokens and future notification eligibility.
- Remove or anonymize eligible profile and account-linked data.
- Preserve shared financial history where required.
- Update the app UI to reflect pending, completed, and failed states.
- Add automated coverage for critical deletion edge cases.

### Acceptance criteria

- Users can submit a deletion request from the app.
- The backend records and fulfills the request with auditable status.
- Shared financial history remains intact for other participants.
- Personal profile data and notification eligibility are cleaned up according to policy.
- The app shows the resulting state instead of silently logging a request.
- Tests cover event ownership, attachments, and unresolved conflict edge cases.

### Validation

- Automated tests for deletion policy rules.
- Manual end-to-end test with an authenticated staging account.
- Privacy-policy text updated to match actual behavior.

### Candidate surfaces

- `src/screens/DeleteAccountScreen.tsx`
- `src/state/AuthProvider.tsx`
- `src/state/AppDataProvider.tsx`
- `src/data/repositories.ts`
- Supabase schema or edge-function layer

### Out of scope

- Full account self-service data export redesign
- Marketing or store copy

## Issue 2: Implement push notifications or deliberately disable them for beta

### Suggested labels

- `beta`
- `P0`
- `notifications`
- `mobile`

### Problem

The app already exposes notification preferences and a notification center, but no actual push-notification implementation or token lifecycle was found. The product needs either a real implementation or an intentional beta disablement so the UI and disclosures stay truthful.

### Goals

- Make notification behavior match user-facing settings.
- Prevent privacy regressions in notification content.
- Keep beta scope explicit.

### Scope

- Decide whether beta supports local notifications only, remote push, both, or neither.
- If shipping notifications, implement permission flow, token registration, token refresh, logout cleanup, and privacy-safe payload handling.
- If not shipping notifications, update the UI and settings copy to reflect the limitation.
- Add tests for quiet hours and category gating.

### Acceptance criteria

- Notification settings do not over-promise unsupported behavior.
- Signed-out users never receive account-scoped notifications.
- Granted and denied permission states are handled cleanly.
- Quiet hours and privacy-safe body behavior are enforced.
- QA can trigger representative notification scenarios on both platforms.

### Validation

- iOS and Android permission-flow testing.
- Token registration and cleanup testing.
- Unit tests for notification preference logic and safe message bodies.

### Candidate surfaces

- `src/screens/NotificationCenterScreen.tsx`
- `src/screens/PrivacyControlsScreen.tsx`
- `src/services/notifications.ts`
- App bootstrap and platform config

### Out of scope

- Complex marketing notification campaigns
- Nonessential analytics around notification engagement

## Issue 3: Replace manual URI-based import and attachment flows with native mobile picker UX

### Suggested labels

- `beta`
- `P0`
- `ux`
- `mobile`

### Problem

CSV import and attachment creation currently rely on manual file URI entry. That is developer-oriented and not suitable for a beta with normal mobile testers.

### Goals

- Make CSV import and attachment flows feel native on iOS and Android.
- Reduce input errors and support burden.

### Scope

- Add native document-picker flow for CSV import.
- Add native document or image-picker flow for attachments.
- Preserve existing validation and preview behavior.
- Add user-facing errors for unsupported file types, missing files, and oversized attachments.
- Confirm export/share flows feel consistent with platform expectations.

### Acceptance criteria

- Users can select CSV files without typing URIs.
- Users can add attachments from a picker without typing URIs.
- Invalid files fail with clear guidance.
- Existing import preview and attachment metadata behavior still work.
- QA can complete these flows on real devices without developer workarounds.

### Validation

- Real-device tests for CSV import, image attach, PDF attach, and export/share.
- Regression test on import preview parsing.

### Candidate surfaces

- `src/screens/ImportCsvScreen.tsx`
- `src/components/AttachmentsSection.tsx`
- `src/screens/FullDataExportScreen.tsx`
- export/import service utilities

### Out of scope

- Large redesign of import data model
- Attachment annotation or image editing

## Issue 4: Integrate crash reporting and minimal beta telemetry

### Suggested labels

- `beta`
- `P0`
- `observability`
- `mobile`

### Problem

No crash-reporting or telemetry integration was found. External beta without observability will make it slow to diagnose sync, export, auth, and rendering failures.

### Goals

- Capture actionable crashes and failure breadcrumbs.
- Add minimal privacy-conscious telemetry for beta learning.

### Scope

- Integrate crash reporting at app bootstrap.
- Add breadcrumbs around auth, sync, conflict resolution, export, and restore.
- Add a small set of analytics events for onboarding and first-success milestones.
- Ensure no sensitive financial text or attachment content is sent.

### Acceptance criteria

- Uncaught JS and major render failures are reported.
- Crash events include enough context to identify the failing flow.
- Basic beta milestone events are available.
- Telemetry behavior can be described accurately in store disclosures.

### Validation

- Forced test exception path.
- Manual verification that breadcrumbs appear for at least auth and sync flows.
- Review of captured payloads for privacy safety.

### Candidate surfaces

- app root layout and provider bootstrapping
- sync engine and export/restore service code
- auth provider and critical screens

### Out of scope

- Complex analytics dashboards
- Growth-marketing attribution tooling

## Issue 5: Expand sync regression coverage for high-risk financial flows

### Suggested labels

- `beta`
- `P0`
- `sync`
- `testing`

### Problem

The sync engine covers many record types and relationship mappings, but the current automated coverage appears small compared with the amount of sync logic in the repo.

### Goals

- Protect shared financial flows against regression.
- Catch mapping, retry, visibility, and attachment-sync bugs before external beta.

### Scope

- Add tests for queue replay and retry behavior.
- Add tests for mixed private/shared visibility.
- Add tests for attachment sync behavior.
- Add tests for settlement and payment sync edge cases.
- Add tests for concurrent edit and stale remote version scenarios.

### Acceptance criteria

- High-risk sync paths have meaningful automated coverage.
- A failed mapping or queue regression is likely to fail CI.
- QA has seeded scenarios for manual multi-account sync testing.

### Validation

- Expanded targeted test suite.
- Manual two-account device pass for shared-event editing.

### Candidate surfaces

- `tests/stage7-sync.test.cjs`
- `src/services/sync/*`
- `src/services/stage6Sync.ts`

### Out of scope

- Full end-to-end automation across every entity type
- Re-architecture of the sync model unless defects force it

## Issue 6: Add release preflight and build validation workflow

### Suggested labels

- `beta`
- `P1`
- `release`
- `tooling`

### Problem

The repo has lint, tests, and EAS profiles, but it does not yet have a single enforced preflight that protects version consistency, environment readiness, and release discipline.

### Goals

- Make beta build preparation repeatable.
- Catch configuration drift before store uploads.

### Scope

- Add a documented or scripted preflight flow.
- Verify required env vars and version consistency.
- Confirm release profile choice and build-number discipline.
- Document the commands required for iOS and Android beta builds.

### Acceptance criteria

- A contributor can run one documented preflight sequence before a beta build.
- Version/build mismatches are easy to detect.
- Missing env vars fail early instead of during or after builds.

### Validation

- Dry run on a clean machine or shell session.
- Confirm preflight catches a forced mismatch or missing variable.

### Candidate surfaces

- `package.json`
- `app.json`
- `eas.json`
- release docs and scripts

### Out of scope

- Full CI/CD deployment pipeline

## Issue 7: Harden export, restore, and attachment constraints for beta data safety

### Suggested labels

- `beta`
- `P1`
- `data-safety`
- `mobile`

### Problem

The app already supports export and restore, but beta quality depends on better file constraints, clearer failure modes, and confidence that sensitive data is included or excluded correctly.

### Goals

- Make export/restore safer and easier to understand.
- Reduce the chance of malformed, oversized, or over-shared data paths.

### Scope

- Add stricter attachment/file constraints.
- Validate restore behavior with malformed and older payloads.
- Confirm audit log behavior across export and restore flows.
- Decide whether CSV package and PDF summary are truly supported or should be deferred.

### Acceptance criteria

- Unsupported or unsafe files fail clearly.
- Restore preview handles malformed payloads safely.
- Export inclusion/exclusion toggles behave as documented.
- Beta scope for export formats is explicit.

### Validation

- Manual tests with malformed and version-skewed backup files.
- Tests for export payload shaping and restore preview validation.

### Candidate surfaces

- `src/screens/FullDataExportScreen.tsx`
- `src/screens/BackupRestoreScreen.tsx`
- `src/services/export.ts`
- `src/services/backupRestore.ts`

### Out of scope

- Full redesign of reporting/export formats

## Issue 8: Remove production-placeholder copy and harden release-facing UX text

### Suggested labels

- `beta`
- `P1`
- `ux`
- `copy`

### Problem

Some screens still contain wording that implies placeholder or future-hardening status. That undercuts beta confidence and may leak internal-development framing to testers.

### Goals

- Make release-facing copy consistent, concrete, and trustworthy.
- Remove wording that suggests core flows are unfinished unless they truly are.

### Scope

- Audit settings, account, privacy, export, and sync-adjacent text.
- Remove placeholder language.
- Clarify any intentionally limited beta behavior.
- Align destructive-action copy with actual backend behavior.

### Acceptance criteria

- No release-facing surface describes critical features as placeholders unless intentionally disabled.
- Copy is consistent with actual app behavior.
- Settings screens no longer imply capabilities that do not exist.

### Validation

- Manual copy review across release-facing screens.
- PM/design review if available.

### Candidate surfaces

- `src/screens/SettingsScreen.tsx`
- privacy, export, notification, and delete-account screens

### Out of scope

- Full brand rewrite
- Store marketing copy
