# Beta Implementation Roadmap

This roadmap turns the engineering section of the beta launch backlog into a practical execution order. It is optimized for risk reduction, store-compliance readiness, and shortest path to a trustworthy external beta.

## Objectives

1. Remove release blockers that would make the beta unsafe or likely to fail store review.
2. Raise confidence in financial-data integrity, sync behavior, and privacy-sensitive flows.
3. Improve the mobile UX for core import, export, attachment, and account-management tasks.
4. Add enough observability to triage beta failures quickly.

## Guiding Rules

- Finish high-risk trust surfaces before low-risk polish.
- Prefer implementing and validating one risky system completely over partially starting several.
- Do not expand beta scope during roadmap execution without explicitly changing priorities.
- Any feature that is not clearly ready must either be completed or deliberately disabled for beta.

## Priority Bands

### P0: Must finish before external beta

- Real account deletion fulfillment pipeline
- Push notification decision and implementation or explicit beta disablement
- Native mobile picker flows for import and attachments
- Crash reporting integration
- Release preflight checks and version/build discipline
- Expanded sync regression coverage for financial-risk paths

### P1: Strongly recommended before broad beta

- Export and restore hardening
- Better auth/backend error handling
- Placeholder copy cleanup and production-surface polish
- Accessibility audit and localization cleanup
- Minimal product analytics

### P2: Valuable but can trail the first beta cohort

- Deeper onboarding polish
- Broader illustration/asset system
- Extended telemetry dashboards
- Secondary visual refinements and non-blocking UX niceties

## Recommended Execution Order

## Phase 0: Scope Freeze And Release Setup

Goal: lock what beta means so engineering does not chase moving targets.

### Deliverables

- Decide whether notifications ship live or disabled.
- Decide whether CSV package export, PDF summary, and attachment uploads are truly in beta scope.
- Choose staging vs production-like backend for beta.
- Confirm versioning policy and EAS profile usage.

### Exit Criteria

- A written beta scope exists.
- Out-of-scope features are labeled, hidden, or deferred.
- Release commands and environment choices are documented.

## Phase 1: Trust And Compliance Blockers

Goal: close the two most obvious trust risks found in the repo.

### Workstream A: Account deletion fulfillment

Why first:

- It is a store-review risk.
- It touches privacy, backend data lifecycle, and user trust.
- It is more than UI; it requires a concrete fulfillment model.

### Implementation targets

- Define the deletion state model.
- Add backend support for request creation and fulfillment tracking.
- Implement profile cleanup/anonymization behavior.
- Revoke push tokens and future notification eligibility.
- Preserve shared financial history without leaving personal data behind.
- Surface request status in the app.

### Validation

- Automated tests for deletion edge cases.
- Manual test with an authenticated test account.
- Clear privacy-policy language aligned with actual behavior.

### Workstream B: Notifications decision and delivery model

Why now:

- The app currently exposes notification controls, so the product must either honor them or explicitly limit them.
- Notification behavior affects privacy disclosures and tester expectations.

### Implementation targets

- Decide whether beta supports local notifications only, remote push, or no external notifications.
- If shipping notifications, implement permission flow, token lifecycle, and privacy-safe payload handling.
- If not shipping notifications, disable or relabel the relevant UI so the app does not over-promise.

### Validation

- Permission state testing on iOS and Android.
- Signed-out vs signed-in notification gating.
- Quiet-hours and privacy-body behavior tests.

## Phase 2: Mobile UX Readiness For Core Data Flows

Goal: remove developer-oriented workflows from beta-critical paths.

### Workstream C: Native file and attachment flows

Why before beta:

- Manual file URI entry is not acceptable beta UX for typical testers.
- This directly affects CSV import, attachment add, export usability, and perceived product quality.

### Implementation targets

- Replace manual CSV URI input with a document-picker flow.
- Replace manual attachment URI input with document or image picking.
- Add file validation, size limits, and clearer failure states.
- Confirm export flows use standard mobile sharing behavior cleanly.

### Validation

- Import test with valid CSV, malformed CSV, and unsupported files.
- Attachment test with image and PDF inputs.
- Export/share test on real devices.

## Phase 3: Observability And Failure Triage

Goal: make beta failures diagnosable instead of anecdotal.

### Workstream D: Crash reporting

Why now:

- Once testers start using the app, invisible failures become expensive.
- Crash reporting should be in place before broad tester rollout.

### Implementation targets

- Add crash reporting to app bootstrap.
- Capture sync failures, export/import failures, and render crashes with useful breadcrumbs.
- Make sure telemetry avoids sensitive financial content and unnecessary PII.

### Validation

- Manual test event or forced exception path.
- Confirm crashes are attributed with enough context to reproduce.

### Workstream E: Minimal product telemetry

Why after crash reporting:

- Beta learning matters, but stability and failure capture matter more.

### Implementation targets

- Track onboarding completion and first successful core actions.
- Track sync success/failure and export usage.
- Keep analytics privacy-safe and disclosure-ready.

## Phase 4: Sync Integrity And Regression Coverage

Goal: increase confidence that shared financial flows remain correct under real beta use.

### Workstream F: Sync and conflict test expansion

Why this is P0/P1 boundary work:

- The app already has a substantial sync engine.
- The risk is no longer absence of architecture but absence of enough regression coverage.

### Implementation targets

- Expand tests for queue replay, retries, mapping, attachments, settlements, and mixed visibility.
- Add seed scenarios for concurrent edits and stale remote state.
- Improve sync diagnostics where failure messages are still too opaque.

### Validation

- Test suite expansion with targeted coverage across the highest-risk flows.
- Manual two-account sync passes on real devices.

## Phase 5: Product Hardening After Core Blockers

Goal: remove avoidable friction before opening beta widely.

### Workstream G: Export and restore hardening

- Confirm CSV package and PDF summary are real or defer them.
- Validate restore behavior against malformed and older payloads.
- Ensure audit log behavior is consistent.

### Workstream H: Auth and backend error handling

- Improve environment/configuration error presentation.
- Verify session restoration and token refresh behavior.
- Prevent confusing state transitions between local-only and authenticated modes.

### Workstream I: Production-surface cleanup

- Remove placeholder copy.
- Review empty/loading/error states.
- Clean up deferred feature wording such as theme options that are not actually ready.

## Phase 6: Accessibility, Localization, And Internal Beta

Goal: verify the product is usable and understandable before wider exposure.

### Workstream J: Accessibility and localization pass

- Run VoiceOver and TalkBack checks.
- Verify charts have usable non-visual summaries.
- Review English and Swedish wording for trust-critical flows.

### Internal beta exit criteria

- Core scenarios pass on at least one iPhone and one Android device.
- Internal testers can complete account, sync, import/export, and deletion flows.
- Crash reporting is live and actionable.
- No blocker data-loss or privacy-leak issues remain open.

## Suggested Sequencing By Week

This assumes one primary developer and one secondary QA/design contributor. Compress or expand based on actual team size.

### Week 1

- Scope freeze
- Release preflight setup
- Account deletion design
- Notification go/no-go decision

### Week 2

- Implement deletion backend/app pipeline
- Implement or disable notification surfaces
- Start crash reporting integration

### Week 3

- Replace URI-driven import and attachment flows
- Finish crash reporting
- Expand sync regression tests for highest-risk paths

### Week 4

- Export/restore hardening
- Auth error cleanup
- Placeholder copy cleanup
- Internal beta device pass

### Week 5

- Accessibility and localization pass
- Internal tester fixes
- Prepare external beta build candidates

## Dependency Map

- Beta scope freeze unblocks all implementation sequencing.
- Notification disclosures depend on the notification decision.
- Privacy policy accuracy depends on the real deletion and telemetry behavior.
- External beta should not open before crash reporting and mobile picker flows are complete.
- Marketing/screenshots should use builds after placeholder-copy cleanup.

## Definition Of Done For External Beta Readiness

The engineering side is ready for an external beta only when:

- Account deletion is fulfilled, not merely requested.
- Notification behavior matches the UI and store disclosures.
- Import/export/attachment flows feel native on mobile devices.
- Crash reporting is live.
- Sync regression coverage protects the highest-risk financial paths.
- Internal device testing shows no blocker failures in core scenarios.
