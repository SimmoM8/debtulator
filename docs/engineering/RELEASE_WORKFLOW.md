# Release Workflow

## Principles

- Releases come from reviewed, tested source.
- Tags identify immutable source, not an approximate state.
- Mobile and Remote versions are independent.
- Local backend ships with Mobile.
- Remote SHOULD be backward compatible with supported Mobile versions.
- Database migrations are forward-only once deployed.
- Production promotion requires evidence, not memory.

## Mobile release flow

### 1. Prepare on trunk

Before cutting a Mobile release:

- all intended source changes are on `main`;
- `mobile/package.json` and Expo version are aligned;
- release notes are drafted;
- CI is green;
- Remote dependencies needed by the Mobile build are already available in staging.

### 2. Cut stabilization branch

Create:

```text
release/mobile/X.Y
```

from the approved trunk commit.

After the branch is cut:

- `main` may continue toward the next release;
- release-line changes are limited to release preparation, fixes, and approved risk reductions;
- feature development MUST NOT continue on the release branch.

### 3. Candidate validation

Run:

- Mobile automated quality from `mobile/` (`npm ci` followed by `npm run quality`);
- applicable native iOS/Android builds;
- release configuration preflight from `mobile/`;
- staging/internal build;
- manual QA from the release checklist;
- compatibility checks against the intended Remote environment.

Candidate source MAY be tagged:

```text
mobile-vX.Y.Z-rc.N
```

### 4. Production build and submission

The exact commit used for the approved store binary MUST be identifiable.

Before or at production submission:

- set the final semantic version;
- ensure iOS/Android build identifiers are monotonic;
- run production preflight with real environment configuration;
- produce signed store builds;
- record build identifiers and source commit.

The final release tag is:

```text
mobile-vX.Y.Z
```

It MUST point to the exact release source.

### 5. Patch releases

For `X.Y.Z+1`:

1. fix on `main`;
2. validate on `main`;
3. cherry-pick the fix to `release/mobile/X.Y`;
4. validate the release branch;
5. increment patch version/build identifiers;
6. tag and ship the patch.

Delete the release branch after the support window closes.

## Remote release flow

Remote normally releases from `main`.

### 1. Validate

Required evidence includes:

- Remote test suite;
- migration validation through Testcontainers;
- API/security tests;
- staging deployment or equivalent environment validation;
- health/smoke verification.

### 2. Migration ordering

When a Mobile release depends on a new backward-compatible Remote capability:

1. deploy Remote first;
2. verify production health;
3. release Mobile second.

Remote migrations MUST be designed so the currently supported Mobile versions remain functional throughout deployment.

### 3. Production deployment

A production Remote deployment MUST record:

- exact commit SHA;
- Remote semantic version;
- migrations included;
- deployment time/environment;
- health-check result;
- rollback/roll-forward notes when risk is non-trivial.

After successful production promotion, tag:

```text
remote-vX.Y.Z
```

## Rollback and roll-forward

Application code MAY be rolled back only when the deployed database state remains compatible with the older binary.

Once a destructive/incompatible database migration has run, assume **roll-forward** unless rollback was explicitly designed and tested.

Never reverse or edit an applied Flyway migration in place.

## Cross-environment releases

A feature spanning Mobile/Local/Remote SHOULD use this order:

1. additive Remote API/database support;
2. Remote production deployment;
3. Mobile/Local release using the new capability;
4. compatibility cleanup only after older Mobile versions leave support.

Breaking server changes MUST use versioned compatibility rather than coordinating an instantaneous forced Mobile upgrade.

## Emergency releases

Emergency changes still require:

- exact source identification;
- applicable automated tests;
- explicit deployment/release record;
- a new patch version/tag.

Urgency does not justify moving an existing release tag or editing an applied migration.

## Current release-readiness gaps

At governance adoption, the repository is not yet production-release-ready solely by following its legacy operational files:

- `docs/release-checklist.md` still assumes root-level npm commands and older direct-Supabase architecture;
- the root `README.md` contains legacy architecture/setup instructions;
- current GitHub Actions do not yet implement the required consolidated Mobile/Remote CI layout;
- `main` does not yet have the required branch protection/status checks; and
- Remote semantic-version/deployment automation is not yet established.

These are follow-up implementation/documentation tasks, not exceptions to the release gates above. A production release MUST use the governance rules here and MUST NOT rely on stale legacy instructions.

## Existing operational checklists

`docs/release-checklist.md` and manual QA documents remain useful source material only after they are reconciled with the consolidated architecture. Where they conflict with this governance suite, this document controls release policy and the stale checklist MUST be updated before it is treated as authoritative.
