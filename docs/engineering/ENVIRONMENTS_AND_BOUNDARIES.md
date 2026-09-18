# Environments and Boundaries

## 1. Mobile

Mobile is the user-facing application behavior that runs in React Native/Expo.

Typical ownership includes:

- `mobile/src/app/**`
- `mobile/src/features/**/screens/**`
- `mobile/src/features/**/components/**`
- feature hooks and UI-facing operations;
- navigation and route configuration;
- shared presentation components under `mobile/src/components/**`;
- theme and design-system code.

Mobile code MAY call Local-backend abstractions and Remote client abstractions. It MUST NOT bypass those boundaries by reaching directly into Remote persistence.

## 2. Local backend

The Local backend is backend behavior that executes on-device and ships with the Mobile binary.

Typical ownership includes:

- `mobile/src/data/sqlite/**`;
- local repositories and row mappings inside feature slices;
- local schema creation and migrations;
- sync outbox, cursor, conflict, and local replication state;
- persistence-oriented feature data modules;
- local data-change signaling;
- adapters between feature operations and SQLite.

The Local backend is **not** a separately deployed service and does not receive an independent product version. Its compatibility contract is with the Mobile version that contains it.

Local database migrations MUST be deterministic and safe for supported upgrade paths. A release MUST NOT require users to uninstall or clear local data as the normal migration mechanism.

## 3. Remote

Remote is the independently deployed server-side system.

Typical ownership includes:

- `backend/**`;
- Spring Boot HTTP APIs;
- authentication and authorization enforcement;
- PostgreSQL persistence (currently hosted by Supabase) and Supabase Auth integration;
- Flyway migrations;
- server-side sync and collaboration logic;
- realtime delivery;
- cross-user workflows;
- remote validation and integrity rules.

The Remote backend MUST be the authority for cross-user and server-owned invariants. Mobile clients MUST NOT be trusted to enforce authorization or remote integrity.

## 4. Repository ownership map

The consolidated repository uses these top-level ownership rules:

- `mobile/**` — Mobile + Local backend;
- `backend/**` — Remote;
- `config/**` — shared deployment/configuration assets that support one or more environments (currently Supabase auth email templates);
- `.github/**` — repository-level CI/automation;
- `docs/**` — product, architecture, operations, and engineering documentation;
- `supabase/**` — local/development Supabase support only unless a document explicitly states otherwise.

Remote database schema authority is the Flyway chain under `backend/src/main/resources/db/migration/**`. `backend/src/main/resources/db/schema_remote.sql` is a reference snapshot derived from the migrations and MUST NOT replace or bypass them.

Local database schema authority lives with the Mobile/Local migration implementation under `mobile/src/data/sqlite/**`.

## 5. Compatibility responsibility

The Remote backend SHOULD normally have one active production implementation. Multiple installed Mobile versions are expected.

Therefore:

- Remote changes SHOULD be backward compatible with every supported Mobile release.
- Additive API changes are preferred.
- Removing or changing a field/endpoint used by a supported Mobile version is a breaking change.
- Breaking Remote API changes MUST use a new API version or an explicit compatibility bridge.
- A newer Mobile version MAY depend on a newer Remote capability only after that capability is deployed.
- Remote rollout SHOULD precede Mobile rollout when a Mobile release depends on new additive server behavior.

## 6. Feature-first organization

The current Mobile + Local-backend architecture is feature-first.

Feature-specific code SHOULD live with the owning feature instead of being moved into global technical layers merely because it uses a particular technology.

Examples:

- `features/debts/model/Debt.ts`
- `features/debts/data/SqliteDebtRepository.ts`
- `features/debts/hooks/useDebts.ts`
- `features/debts/operations/respondToDebtRequest.ts`
- `features/debts/screens/DebtRequestScreen.tsx`

Cross-feature infrastructure MAY live under `mobile/src/data/**` when it is genuinely shared, such as SQLite lifecycle, Remote API transport, realtime transport, or sync orchestration.

## 7. Boundary rules

- UI code MUST NOT contain SQL.
- Remote controllers MUST NOT contain persistence/business logic that belongs in services/repositories.
- Local persistence code MUST NOT own Remote authorization decisions.
- Remote database migrations MUST live under `backend/src/main/resources/db/migration/**`; Flyway is authoritative.
- Local database migrations MUST live with the Mobile/Local backend under its SQLite migration system.
- Shared concepts MAY exist in multiple environments, but each environment owns its own representation and boundary mapping.
- A change that spans environments MUST state all affected environments in its PR description and test plan.
