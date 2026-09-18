# Testing and Quality

## Quality principle

Tests are part of the change, not post-change cleanup.

The required test depth depends on the environment and risk, but every change MUST have enough evidence to justify integration.

## Mobile + Local backend baseline

From `mobile/`:

```bash
npm ci
npm run quality
```

The quality command currently covers:

- architecture checks;
- TypeScript typecheck;
- ESLint;
- Jest.

Changes to native configuration/dependencies additionally require the applicable clean native build validation.

## Remote baseline

From `backend/`:

```bash
./mvnw test
```

Remote integration tests SHOULD use real PostgreSQL behavior through Testcontainers where persistence semantics matter.

Flyway migrations MUST be validated against a clean database in automated tests.

## Repository-layout rule

All documented commands are relative to the owning project directory. There is no root-level Node project in the consolidated repository.

- Mobile/Local Node/Expo commands run from `mobile/`.
- Remote Maven commands run from `backend/`.

CI and local validation MUST use the same ownership boundaries; a workflow that runs the right command from the wrong directory is not a valid quality gate.

## Test categories

### Unit tests

Use for isolated business rules, mapping, formatting, policy, validation, and deterministic helpers.

### Integration tests

Use when correctness depends on:

- SQLite;
- PostgreSQL/JPA;
- Spring Security;
- HTTP/controller wiring;
- migrations;
- sync boundaries;
- repository behavior.

### Contract/API tests

Remote endpoint behavior used by Mobile SHOULD have tests for:

- authentication/authorization;
- success payloads;
- validation failures;
- stable error codes;
- compatibility-sensitive fields.

### Manual QA

Manual QA is required when correctness depends materially on:

- native UI behavior;
- platform navigation;
- permissions;
- device lifecycle;
- store configuration;
- realtime UX;
- accessibility;
- release environment configuration.

Manual QA complements automated tests; it does not replace them.

## Migration testing

### Local SQLite

A Local schema change MUST test:

- fresh database creation;
- upgrade from each supported prior schema state where practical;
- data preservation;
- idempotent startup behavior after migration.

### Remote Flyway

A Remote migration MUST test:

- clean application of the complete migration chain;
- expected constraints/indexes/data transformations;
- compatibility with the application version being released.

Applied production migrations MUST never be rewritten to make tests pass.

## Change-specific expectations

- Bug fix: add a regression test unless the defect cannot reasonably be automated.
- New feature: cover core happy path and important validation/error paths.
- Authorization change: include explicit allowed/denied cases.
- Sync change: cover replay/idempotency/conflict/version semantics as applicable.
- Database change: include migration/integration evidence.
- Refactor: existing tests must stay green; add tests when the refactor exposes an unprotected invariant.

## Flaky tests

A flaky test is a defect.

Do not normalize repeated reruns as a passing strategy. Either fix the flake, isolate it with an owned remediation issue and explicit temporary policy, or revert the destabilizing change.

## Merge gate

A PR MUST NOT merge while an applicable required check is failing.

Warnings MAY be accepted only when they are understood, non-blocking, and not evidence of a hidden correctness/security failure.

## Release gate

Release validation is stricter than merge validation. A production release requires:

- all merge-level checks;
- release preflight;
- applicable native/build checks;
- migration validation;
- release-specific manual QA;
- environment/version/build-number verification;
- compatibility confirmation with the production Remote backend.
