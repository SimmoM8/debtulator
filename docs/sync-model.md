# Sync Model

Debtulator remains usable offline. Local-only records never leave the device unless the user explicitly enables account backup or chooses a shared visibility.

Every syncable record carries a `syncStatus`. Stage 6 recognizes `local_only`, `pending_create`, `pending_upload`, `pending_update`, `pending_delete`, `synced`, `conflict`, `sync_error`, `remote_deleted`, and `permission_error`.

The durable `sync_queue` table stores operation type, payload, dependencies, retry count, status, and last error. Dependent operations wait for parent remote IDs. Permission errors stop retrying and mark the local entity `permission_error`; mapping problems mark the local entity `sync_error`; transient failures retry with backoff.

Stage 7 adds a real executor in [`src/services/sync/syncEngine.ts`](/Users/benjaminsimmons/Documents/CODING/debtulator/src/services/sync/syncEngine.ts). It processes pending queue items, resolves local IDs to remote UUIDs, pushes creates/updates/archives, stores returned remote IDs locally, pulls remote changes, and writes conflicts when financial records diverge.

Remote hydration lives in [`src/services/sync/pullRemote.ts`](/Users/benjaminsimmons/Documents/CODING/debtulator/src/services/sync/pullRemote.ts). It pulls the authenticated user's shared event graph and hydrates SQLite through mapper functions so repeated pulls update existing local rows instead of duplicating them.

Conflicts are recorded in `sync_conflicts` with local, remote, and optional base snapshots. Financial conflicts are never auto-resolved. The conflict review UI supports keep mine, keep theirs, merge, duplicate, cancel local change, archive local copy, and manual edit.

The Stage 6 service layer centralizes summary, retry, and conflict helpers in [`src/services/stage6Sync.ts`](/Users/benjaminsimmons/Documents/CODING/debtulator/src/services/stage6Sync.ts).

See also:

- [`docs/local-remote-id-mapping.md`](/Users/benjaminsimmons/Documents/CODING/debtulator/docs/local-remote-id-mapping.md)
- [`docs/shared-event-sync.md`](/Users/benjaminsimmons/Documents/CODING/debtulator/docs/shared-event-sync.md)
- [`docs/data-sync-architecture.md`](/Users/benjaminsimmons/Documents/CODING/debtulator/docs/data-sync-architecture.md)
