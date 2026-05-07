# Sync Model

Debtulator remains usable offline. Local-only records never leave the device unless the user explicitly enables account backup or chooses a shared visibility.

Every syncable record carries a `syncStatus`. Stage 6 recognizes `local_only`, `pending_create`, `pending_upload`, `pending_update`, `pending_delete`, `synced`, `conflict`, `sync_error`, `remote_deleted`, and `permission_error`.

The durable `sync_queue` table stores operation type, payload, dependencies, retry count, status, and last error. Dependent operations wait for parent remote IDs. Permission errors stop retrying; transient failures can retry with backoff.

Conflicts are recorded in `sync_conflicts` with local, remote, and optional base snapshots. Financial conflicts are never auto-resolved. The conflict review UI supports keep mine, keep theirs, merge, duplicate, cancel local change, archive local copy, and manual edit.

The Stage 6 service layer centralizes summary, retry, and conflict helpers in [`src/services/stage6Sync.ts`](/Users/benjaminsimmons/Documents/CODING/debtulator/src/services/stage6Sync.ts).
