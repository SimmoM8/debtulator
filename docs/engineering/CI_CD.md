# CI/CD

This document defines the required target pipeline. Existing workflow files may lag behind repository restructuring and MUST be aligned to this policy.

## CI goals

CI must answer four questions:

1. Does the changed code compile/typecheck?
2. Do architecture/lint/test rules pass?
3. Do database migrations work from a clean supported state?
4. Can the relevant deliverable be built?

## Required PR jobs

### Mobile + Local backend

For changes affecting `mobile/**`, run from `mobile/`:

```bash
npm ci
npm run architecture
npm run typecheck
npm run lint
npm test -- --runInBand
```

`npm run quality` MAY orchestrate the same checks and is the preferred local equivalent.

Also run:

```bash
npx expo install --check
```

when dependencies or Expo configuration are affected.

### Native Mobile validation

When native dependencies, Expo plugins, app configuration, native project files, or build configuration change, CI MUST validate:

- clean Android debug/native build;
- clean unsigned iOS simulator build.

Path filters SHOULD avoid running expensive native jobs for unrelated documentation-only changes.

### Remote

For changes affecting `backend/**`:

```bash
cd backend
./mvnw test
```

The Remote suite MUST include Testcontainers-backed PostgreSQL/Flyway validation for persistence and migration-sensitive behavior.

### Shared/cross-environment changes

Changes to shared build configuration, root automation, cross-environment contracts, or governance that alters required checks MUST run every affected pipeline.

## Required status checks

`main` MUST require the applicable checks before merge once repository-host branch protection/rulesets are configured.

Required checks MUST be deterministic and reproducible locally where practical.

A skipped job due to path filtering is acceptable only when the filter correctly proves that environment is unaffected.

## Current workflow migration gap

The trunk cutover is complete, but the checked-in GitHub Actions still reflect the older root-level Mobile layout and are not compliant with this policy. Specifically, as of 2026-09-18:

- `.github/workflows/quality.yml` runs `npm ci`, release preflight, Expo checks, architecture, typecheck, lint, tests, and export from repository root even though the Node project lives under `mobile/`;
- that workflow's npm cache is not keyed from `mobile/package-lock.json`;
- `.github/workflows/native-quality.yml` filters root `app.json`, `eas.json`, `package.json`, `android`, and `ios` paths instead of `mobile/**`, and runs npm/native commands from the old root locations;
- no dedicated Remote Maven workflow/job runs `./mvnw test` from `backend/`;
- `quality.yml` retains the obsolete special push trigger `codex/**`; and
- GitHub reports `main` as unprotected with no required status checks.

Those workflow files are therefore not evidence that the required CI gate is already operational.

A follow-up CI implementation MUST:

- run Mobile jobs with `working-directory: mobile`;
- configure npm caching with `cache-dependency-path: mobile/package-lock.json`;
- update native path filters to `mobile/**` and native working directories to `mobile/android` / `mobile/ios`;
- add a Remote job/workflow that uses Java 21 and runs `./mvnw test` from `backend/`;
- trigger ordinary validation on pull requests and `main`, with release-line validation for `release/mobile/**` where applicable;
- remove obsolete branch-specific trigger assumptions; and
- enable branch protection/rulesets with the resulting applicable checks required on `main`.

Until that remediation lands, engineers MUST run the documented local quality commands for every affected environment before integration.

## Dependency/security checks

Dependency and vulnerability reports SHOULD be collected in CI.

A dependency scanner MUST NOT become a merge-blocking gate until:

- its policy threshold is documented;
- the current baseline is understood;
- there is a defined exception/remediation process.

New critical/high-risk findings SHOULD be investigated promptly rather than hidden by blanket ignores.

## CD

### Mobile

Store builds use EAS/release tooling and MUST be gated by the release workflow.

Production credentials and signing material MUST be provided through approved secret stores/platform credential systems, never Git.

### Remote

Remote CD SHOULD provide:

1. immutable build artifact/image;
2. staging promotion;
3. migration execution/validation;
4. health/smoke checks;
5. explicit production promotion;
6. deployment provenance tied to Git SHA and `remote-vX.Y.Z`.

## Secrets

CI/CD MUST use least-privilege secrets.

- Mobile jobs MUST never receive Remote service-role credentials.
- Pull requests from untrusted contexts MUST not receive production secrets.
- Production deploy credentials MUST be isolated from ordinary test jobs.
- Secret values MUST not be printed in logs.

## Concurrency

Production deployments SHOULD use concurrency controls so two releases cannot mutate the same environment simultaneously.

## Artifacts and provenance

Release pipelines SHOULD retain:

- source SHA;
- version/tag;
- test results;
- build identifiers;
- migration list;
- produced artifacts;
- deployment/build links.

A production artifact must be traceable back to one immutable source commit.
