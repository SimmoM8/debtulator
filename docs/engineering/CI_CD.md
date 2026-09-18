# CI/CD

This document defines Debtulator's staged CI/CD operating model. CI starts deliberately small and must remain easy to extend as Mobile, native build, security, release, and deployment requirements mature.

## CI goals

Merge-level CI answers three questions at the current project stage:

1. Does the affected code satisfy its automated quality rules?
2. Do database-sensitive tests validate the relevant migration/persistence behavior?
3. Can the affected Remote application still be packaged?

Native compilation, store builds, release validation, and production deployment are separate layers and are introduced when the project reaches the relevant maturity stage.

## Foundation workflow

The foundation workflow is `.github/workflows/ci.yml`.

It runs on:

- pull requests targeting `main`;
- pushes to `main`; and
- manual `workflow_dispatch` runs.

Debtulator does not run release-branch CI while no release branch exists. When the first Mobile release enters stabilization, the workflow/release automation MUST be extended to validate `release/mobile/X.Y` before such a branch is created.

### Stable integration gate

The workflow exposes one stable merge gate:

```text
CI / Integration Gate
```

`main` SHOULD require this check after the foundation workflow has demonstrated stable green runs.

Environment-specific jobs are conditional. The integration gate always runs and fails when any applicable job fails or is cancelled. Documentation-only changes may legitimately skip the Mobile/Local and Remote jobs while still producing the integration-gate result.

This avoids making a path-filtered workflow itself a required check, which could leave a required status absent when the workflow is skipped.

## Change scope

`CI / Change Scope` classifies changed repository paths.

The baseline ownership matrix is:

| Path | Mobile + Local | Remote |
| --- | --- | --- |
| `mobile/**` | yes | no |
| `backend/**` | no | yes |
| `schema_local.sql` | yes | no |
| `schema_remote.sql` | no | yes |
| `config/**` | yes | yes |
| `supabase/**` | yes | yes |
| `.github/**` | yes | yes |
| ordinary documentation-only changes | no | no |

The classifier SHOULD remain conservative for shared configuration. A future cross-environment contract path MUST be added to every environment it can affect.

## Mobile + Local job

For changes affecting Mobile or the Local backend, CI runs from `mobile/`:

```bash
npm ci
npm run quality
npx expo install --check
npx expo config --type public
```

The Node version is pinned to `20.20.2`, and the npm cache is keyed from `mobile/package-lock.json`.

`npm run quality` is the canonical automated merge-level suite and currently covers:

- architecture rules;
- TypeScript typecheck;
- ESLint; and
- Jest.

Local SQLite migration guarantees belong in this suite. Schema changes MUST add or maintain tests for fresh creation, supported upgrades, data preservation, and idempotent startup where applicable.

## Remote job

For changes affecting `backend/**` or shared Remote configuration, CI uses Java 21 and runs from `backend/`:

```bash
./mvnw -B -ntp test
./mvnw -B -ntp -DskipTests package
```

The Remote suite MUST continue to use Testcontainers-backed PostgreSQL/Flyway validation for persistence and migration-sensitive behavior. CI MUST NOT connect to staging or production databases to prove migrations.

The package step verifies that the tested Remote source can still produce its deployable application artifact; CI does not publish that artifact at this stage.

## Expo CNG and native validation

Debtulator uses Expo Continuous Native Generation (CNG).

The authoritative native inputs are:

- `mobile/app.json` / future Expo app configuration;
- `mobile/package.json` and lockfile;
- Expo/config-plugin source under `mobile/plugins/**`; and
- Mobile source/assets consumed by those inputs.

Generated `mobile/ios/**` and `mobile/android/**` projects MUST NOT be committed. Native customizations MUST be represented in Expo configuration or config plugins so a clean `expo prebuild` can reproduce them.

At the current pre-release stage, Android and iOS compilation are **not** ordinary merge-blocking CI jobs. This keeps the foundation fast and avoids paying for macOS/native build capacity before the project needs it.

Native-sensitive changes SHOULD be validated with clean prebuild/native checks during development when warranted. Before the first release candidate, CI/release validation MUST gain separate Android and iOS jobs:

- Android on Linux with the appropriate JDK/Android toolchain;
- iOS on macOS with Xcode/CocoaPods;
- both generated from authoritative CNG inputs rather than committed native projects.

Once introduced, those jobs SHOULD run only for native-sensitive changes and release validation unless evidence justifies broader execution.

## Required status checks and repository protection

After the foundation workflow is proven stable, repository rules SHOULD require:

- pull requests for normal integration to `main`;
- `CI / Integration Gate`;
- linear history;
- no force pushes to `main`; and
- no deletion of `main`.

Debtulator is currently primarily single-maintainer, so repository policy MAY require a PR without inventing a mandatory approval count. Review requirements can be raised when additional maintainers participate.

Rebase merge remains the preferred integration method; squash merge remains available for noisy one-change branches. Merge commits into `main` remain prohibited except for documented recovery.

## Concurrency

Pull-request CI SHOULD cancel obsolete runs for the same PR.

Runs for commits already integrated into `main` MUST NOT cancel one another merely because a newer trunk commit exists; each integrated SHA should retain its own validation result.

Future deployment workflows MUST serialize mutations of the same target environment.

## Dependency/security checks

Dependency and vulnerability reports SHOULD be introduced incrementally.

A dependency or security scanner MUST NOT become a merge-blocking gate until:

- its threshold is documented;
- the existing baseline is understood;
- remediation ownership is defined; and
- an explicit exception process exists.

New critical/high-risk findings SHOULD be investigated promptly rather than hidden by blanket ignores.

## Release and CD boundary

Merge CI MUST remain separate from release and deployment automation.

### Mobile

Later Mobile release automation will cover:

1. release-candidate validation;
2. separate Android/iOS native builds;
3. release configuration checks;
4. EAS/store build production;
5. manual/internal QA gates; and
6. immutable `mobile-vX.Y.Z` source tagging.

### Remote

Later Remote CD SHOULD provide:

1. an immutable artifact/image tied to a Git SHA;
2. staging promotion;
3. migration execution/validation;
4. health/smoke checks;
5. explicit production promotion; and
6. `remote-vX.Y.Z` release provenance.

Production credentials and signing material MUST live in approved secret stores/platform credential systems and MUST NOT be exposed to ordinary PR jobs.

## Artifacts and observability

Foundation CI SHOULD favor clear logs and concise job summaries over retaining large build artifacts that are not consumed.

Release pipelines SHOULD later retain:

- source SHA;
- version/tag;
- test results;
- build identifiers;
- migration list;
- produced artifacts; and
- deployment/build links.

Every production artifact must be traceable to one immutable source commit.

## Evolution rule

CI complexity MUST be added because a concrete risk, release requirement, or deployment boundary exists, not because a mature project might eventually need it.

Likely future additions include native Android/iOS validation, dependency/security reporting, CodeQL, EAS release automation, Remote staging/promotion, and richer test reports. These additions MUST preserve the stable integration-gate contract unless there is a deliberate governance change.
