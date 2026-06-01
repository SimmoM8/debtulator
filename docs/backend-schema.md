# Backend Schema

Supabase migrations are additive and ordered:

1. `supabase/stage2_schema.sql`
2. `supabase/stage3_schema.sql`
3. `supabase/stage4_schema.sql`
4. `supabase/stage5_schema.sql`
5. `supabase/stage6_schema.sql`
6. `supabase/stage7_integration_schema.sql`
7. `supabase/stage8_account_deletion_schema.sql`

## Stage 7 Additions

`stage7_integration_schema.sql` adds integration hardening for shared event sync:

- Foreign keys for event-scoped payments, settlements, and expense payers.
- Missing `expense_payers` RLS policies.
- Event participant read policies for payments, settlements, settlement lines, comments, and attachments.
- Event writer policies that enforce owner/admin/member mutation and block viewers through `can_write_event_ledger`.
- More specific verification-response insert policy requiring the verifying user to be linked to the event member and involved in the expense/debt.
- Updated timestamp triggers for Stage 4/5 tables.
- Indexes for event-scoped incremental pulls.

## RLS Expectations

- Users can read records for shared events they participate in.
- Owners/admins can manage event-level configuration.
- Owners/admins/members can write ledger records while the event is writable.
- Viewers can read but cannot mutate event ledger records.
- Verification responses can only be written by the linked user for the involved event member.
- Private records remain inaccessible unless they are owned by the authenticated user.
- The app uses only the Supabase anon key; service role keys are not used client-side.

## Stage 8 Account Deletion Readiness

`stage8_account_deletion_schema.sql` moves account deletion beyond a local audit intent:

- Adds `account_deletion_requests` with request status, anonymization status, timestamps, local-data preferences, and RLS.
- Allows authenticated mobile clients to call `request_account_deletion(...)` to create or return the active deletion request.
- Lets users read only their own deletion request rows. Users cannot update fulfillment status from the anon client.
- Adds a service-role-only `apply_account_deletion_anonymization(...)` helper for trusted Edge Functions/admin workers.
- Changes shared-ledger-critical Auth foreign keys from `on delete cascade` to `on delete set null` for shared debts, debt verifications, and event owners so Auth deletion does not destroy other participants' ledgers.

Trusted deletion fulfillment should run in this order:

1. Receive an authenticated user request from the app or support channel.
2. Ensure an `account_deletion_requests` row exists and move it to queued/processing with the service role.
3. Run `apply_account_deletion_anonymization(request_id, admin_note)` from an Edge Function or admin worker.
4. Delete or quarantine private Storage objects referenced by private attachments. SQL deletes private attachment rows, but Storage object deletion must use the Storage admin API.
5. Call `supabase.auth.admin.deleteUser(subject_user_id)` only after anonymization succeeds.
6. Mark the request `completed`, set `auth_user_deleted_at` and `completed_at`, or mark it `failed` with `error_message`.

The mobile anon client must not hold a service role key and cannot revoke sessions, delete Auth users, or delete Storage objects outside RLS.

## Running Migrations

Apply migrations in order through your Supabase migration workflow. For a manual SQL application, run Stage 7 and Stage 8 after all earlier stages:

```sql
\i supabase/stage7_integration_schema.sql
\i supabase/stage8_account_deletion_schema.sql
```
