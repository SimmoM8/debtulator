# Naming Conventions

## 1. Commit messages

Debtulator uses a Conventional-Commits-inspired subject:

```text
type(scope): imperative summary
```

Examples:

```text
feat(mobile/auth): add account recovery screen
fix(local/sync): preserve outbox base version
feat(remote/members): add member-link acceptance endpoint
refactor(remote/auth): centralize provider error mapping
test(remote/sync): cover expired cursor bootstrap
docs(repo): document release support policy
ci(repo): add Remote test job
```

### Allowed types

- `feat` — user-visible or externally useful capability.
- `fix` — defect correction.
- `refactor` — behavior-preserving structural change.
- `perf` — performance improvement.
- `test` — tests only.
- `docs` — documentation only.
- `build` — build system or dependency mechanics.
- `ci` — CI/CD configuration.
- `chore` — maintenance that fits no stronger type.
- `revert` — explicit revert.

### Scopes

Environment-first scopes SHOULD be used:

- `mobile/<feature>`
- `local/<feature-or-subsystem>`
- `remote/<feature-or-subsystem>`
- `repo/<concern>`
- `docs/<concern>`
- `cross/<feature>` for a truly cross-environment commit after trunk cutover.

The subject MUST be imperative, concise, and describe the completed change. Avoid vague subjects such as `updates`, `changes`, `fix stuff`, or `work`.

### Retired legacy prefixes

Historical commits may contain the former integration-branch prefixes `[debtulator-mobile]` and `[debtulator-remote]`. Those prefixes were retired at trunk consolidation and MUST NOT be added to new commits. Environment-first scopes provide the ownership signal on `main` and short-lived branches.

## 2. Branch names

Use:

```text
<kind>/<environment>/<short-kebab-description>
```

Kinds:

- `feat`
- `fix`
- `refactor`
- `test`
- `docs`
- `ci`
- `build`
- `chore`
- `hotfix`

Environments:

- `mobile`
- `local`
- `remote`
- `cross`
- `repo`

Examples:

```text
feat/mobile/debt-request-screen
feat/local/sqlite-profile-migration
feat/remote/member-linking
fix/local/sync-base-version
hotfix/remote/token-validation
docs/repo/engineering-governance
```

Mobile release branches use:

```text
release/mobile/<major>.<minor>
```

Do not create permanent `develop`, `staging`, `mobile`, `backend`, or feature-family branches.

## 3. Tags

Release tags:

```text
mobile-v1.4.0
mobile-v1.4.1
mobile-v1.5.0-rc.1

remote-v1.8.0
remote-v1.8.1
```

Historical non-release markers:

```text
milestone/<kebab-name>
```

The Local backend has no independent release tag because it ships inside Mobile.

Tags MUST be immutable after publication. Correct an erroneous release with a new version/tag rather than moving a published release tag.

## 4. TypeScript / React Native

### Files

- React components: `PascalCase.tsx`
- screens: `PascalCaseScreen.tsx`
- providers: `PascalCaseProvider.tsx`
- hooks: `usePascalCase.ts`
- model/type files: `PascalCase.ts`
- repositories/interfaces: `PascalCaseRepository.ts`
- SQLite repositories: `SqlitePascalCaseRepository.ts`
- SQL row types: `PascalCaseSqlRow.ts`
- operations and utilities: `camelCase.ts`
- tests: `<source-name>.test.ts` or `<source-name>.test.tsx`
- platform variants: `.ios.tsx`, `.android.tsx`, `.native.ts`, `.web.ts` only when platform-specific implementation is required.

Examples:

```text
DebtRequestScreen.tsx
NewDebtProvider.tsx
useDebtRequest.ts
DebtRepository.ts
SqliteDebtRepository.ts
DebtSqlRow.ts
respondToDebtRequest.ts
debtMapper.ts
```

### Symbols

- components/classes/types/interfaces/enums: `PascalCase`
- functions/methods/variables: `camelCase`
- React hooks: `useX`
- boolean names SHOULD read as predicates: `isLinked`, `hasSession`, `canEdit`
- module constants: `UPPER_SNAKE_CASE` when genuinely constant and shared; local immutable values MAY remain `camelCase`
- providers: `XProvider`
- contexts: `XContext`
- repositories: `XRepository`
- DTO-like local transport types SHOULD describe purpose, not transport trivia.

### Expo Router routes

Use Expo Router conventions. User-visible route segments SHOULD use lowercase kebab-case:

```text
email-confirm.tsx
forgot-password.tsx
reset-password.tsx
```

Route groups remain parenthesized, for example `(auth)` and `(main)`.

## 5. Java / Spring

### Packages

Java package names MUST be lowercase and organized primarily by feature:

```text
com.debtulator.backend.auth
com.debtulator.backend.debts
com.debtulator.backend.memberlinking
com.debtulator.backend.userdiscovery
```

Do not introduce uppercase, underscores, or hyphens in Java package names.

### Classes

Use standard suffixes consistently:

- `XController`
- `XService`
- `XRepository`
- `XMapper`
- `XException`
- `XConfig`
- `XProperties`
- `XRequest`
- `XResponse`

Java filenames MUST match their public top-level class/record name.

Methods and variables use `lowerCamelCase`. Constants use `UPPER_SNAKE_CASE`.

## 6. Database naming

PostgreSQL and SQLite database objects use lowercase `snake_case`.

- tables: plural nouns where practical (`members`, `debts`, `profiles`);
- columns: `snake_case`;
- indexes: `idx_<table>_<purpose>`;
- unique constraints: `uq_<table>_<purpose>`;
- check constraints: `<table>_<purpose>_check` or an established equivalent;
- foreign keys SHOULD be explicitly named when the migration benefits from stable references.

Do not rename a production database object only for cosmetic consistency without a migration reason.

## 7. Flyway migrations

Remote migrations use:

```text
V<number>__<lower_snake_description>.sql
```

Examples:

```text
V13__add_debt_revision_index.sql
V14__create_notification_preferences.sql
```

Migration version numbers MUST be unique and monotonically increasing. Applied migrations MUST NOT be edited or reordered; fix forward with a new migration.

## 8. Local SQLite migrations

Local migrations MUST have a monotonically increasing schema/user version and a descriptive implementation name. Existing released migrations MUST NOT be rewritten once users may have executed them.

## 9. HTTP APIs and JSON

- API base paths are versioned, e.g. `/api/v1`.
- Resource paths SHOULD be lowercase and kebab-case only where multiple words are required.
- Prefer nouns/resources over RPC-style verbs.
- Action endpoints MAY use verbs when the action is not naturally represented as a resource.
- JSON field names use `camelCase` unless an external contract explicitly requires another form.
- Request DTOs end in `Request`; response DTOs end in `Response`.
- Stable application error codes exposed by Remote use uppercase `UPPER_SNAKE_CASE` (for example `AUTH_INVALID_CREDENTIALS` or `MEMBER_LINK_REQUEST_NOT_FOUND`). Provider/internal codes MAY use their upstream format but MUST NOT redefine the public application-code convention.

## 10. Configuration and environment variables

Environment variable names use `UPPER_SNAKE_CASE`.

Public/mobile-safe variables MUST be explicitly public by platform convention. Secrets MUST NOT use public prefixes and MUST NOT be committed.

Examples:

```text
APP_ENV
EXPO_PUBLIC_API_URL
SUPABASE_URL
```

Secret values, `.env` files, credential exports, service-role keys, signing material, and production tokens MUST remain outside Git.
