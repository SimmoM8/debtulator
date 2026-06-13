# Shared Group Sync

Shared group sync is local-first and queue-backed. The UI writes to SQLite first, then the Stage 7 sync engine pushes shared records to Supabase and pulls remote changes back into the local cache.

## Supported Flow

1. User A signs in.
2. User A creates a shared group.
3. SQLite creates the group, owner participant, and owner group member.
4. `sync_queue` receives a create group operation unless the screen already created it remotely.
5. The sync engine creates the remote group, owner participant, and owner group member, then stores returned `remote_id` values locally.
6. User A adds unlinked group members and shared expenses.
7. Expense splits and payer rows are pushed with remote group member UUIDs.
8. User B signs in and accepts/pulls an group invite.
9. Remote pull hydrates group, participants, group members, expenses, splits, debts, verification responses, payments, settlements, comments, attachments, and activity.
10. Pulled relationships are converted back to local IDs before ledger calculations run.

## Verification

Group verification responses sync through `group_verification_responses`.

- Local target IDs are converted to remote expense/debt IDs.
- Remote responses are pulled back to local expense/debt IDs.
- RLS requires the verifier to be linked to the group member and involved in the target record.

## Payments and Settlements

Group payments and settlements are persisted records. Settlement suggestions remain derived from ledger entries.

- `payments` sync for shared groups.
- `settlements` sync for shared groups.
- `settlement_lines` sync after settlement create and reference the remote payment/settlement IDs.
- Payment and settlement participant references use local group member IDs locally and remote group member UUIDs remotely.

## Comments and Attachments

- Private comments and attachments remain local.
- Shared comment and attachment metadata syncs.
- File upload still depends on the existing attachment upload service; Stage 7 does not add a new storage pipeline.

## Current Limitations

- Sync is one-shot when auth state or queue state changes; there is no background daemon.
- Backup restore, account deletion, push, and email workflows remain outside Stage 7.
- Settlement line source IDs for generated expense obligations remain explanatory text IDs because obligations are derived, not remote rows.

