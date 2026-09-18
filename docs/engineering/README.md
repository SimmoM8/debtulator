# Debtulator Engineering Governance

**Status:** Authoritative
**Version:** 1.0
**Effective:** 2026-09-18

This directory defines the engineering conventions and delivery rules for Debtulator. It is normative for source control, naming, versioning, testing, CI/CD, releases, and compatibility.

## Scope

Debtulator has three engineering environments that must remain conceptually distinct:

1. **Mobile** — the user-facing React Native/Expo application: UI, screens, routes, hooks, operations, providers, navigation, and presentation behavior.
2. **Local backend** — the backend that ships inside the mobile application: SQLite, local repositories/data access, local migrations, local sync/outbox state, and local persistence APIs.
3. **Remote** — the independently deployed backend: Spring Boot API, PostgreSQL persistence (currently hosted by Supabase), Supabase Auth integration, authentication/server APIs, cross-user behavior, realtime delivery, remote sync, and remote persistence.

The Mobile and Local backend ship together as one mobile binary. The Remote environment is deployed independently and should normally have one current production line that remains compatible with supported mobile versions.

## Authoritative documents

- [ENVIRONMENTS_AND_BOUNDARIES.md](ENVIRONMENTS_AND_BOUNDARIES.md) — environment ownership, architectural boundaries, and compatibility responsibilities.
- [NAMING_CONVENTIONS.md](NAMING_CONVENTIONS.md) — Git, source-code, database, API, configuration, and migration naming.
- [GIT_WORKFLOW.md](GIT_WORKFLOW.md) — trunk-based workflow, branch lifecycle, commits, pull requests, rebasing, backports, and worktrees.
- [VERSIONING.md](VERSIONING.md) — Mobile, Local backend, Remote, API, build-number, schema, migration, and tag versioning.
- [RELEASE_WORKFLOW.md](RELEASE_WORKFLOW.md) — release preparation, mobile store releases, Remote deployments, hotfixes, rollback, and support lines.
- [CI_CD.md](CI_CD.md) — required CI/CD pipelines, status checks, path ownership, secrets, artifacts, and deployment gates.
- [TESTING_AND_QUALITY.md](TESTING_AND_QUALITY.md) — automated tests, migration validation, manual QA, and merge/release quality gates.

## Normative language

The terms **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are normative.

- **MUST / MUST NOT** — required for policy compliance.
- **SHOULD / SHOULD NOT** — expected default; deviation requires a concrete reason.
- **MAY** — optional.

## Precedence

When documents conflict:

1. Security, data-integrity, and platform constraints take precedence.
2. This engineering-governance suite controls engineering process and naming.
3. `docs/USER_STORIES.md` controls product behavior and implementation-status markers.
4. Architecture-specific documents control implementation details within their stated scope.
5. Historical checklists and legacy documents are informative where they do not conflict with the above.

A conflict MUST be resolved by updating the stale document rather than relying on tribal knowledge.

## Change control

Changes to engineering governance MUST:

- be made through a reviewed Git change;
- state the policy being changed and why;
- update every affected governance document in the same change;
- avoid silently changing release, compatibility, security, or migration guarantees;
- include a transition plan when a new rule cannot be adopted immediately.

Governance changes do not by themselves change `docs/USER_STORIES.md` implementation statuses unless product acceptance criteria are affected.

## Adoption baseline

The trunk consolidation was completed on 2026-09-18. At adoption:

- `main` is the single permanent development trunk and `origin/main` is the only permanent remote development branch;
- the former `debtulator-mobile` and `debtulator-remote` integration branches have been retired;
- Mobile + Local backend source is rooted under `mobile/`;
- Remote source is rooted under `backend/`; and
- ordinary work now uses short-lived branches from current `main`.

The governance suite describes the required operating model even where repository automation has not yet caught up. Known enforcement/automation gaps are called out explicitly in [GIT_WORKFLOW.md](GIT_WORKFLOW.md) and [CI_CD.md](CI_CD.md); those gaps MUST be fixed rather than treated as exceptions to policy.
