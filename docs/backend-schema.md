# Backend Schema

Debtulator currently uses a simplified prelaunch Supabase setup.

The active cloud schema source of truth is:

```txt
supabase/schema.sql
```

The optional demo seed file is:

```txt
supabase/seed.sql
```

## Current approach

`schema.sql` is intentionally destructive. It drops and recreates the development Supabase schema, helper functions, Row Level Security policies, and attachment storage bucket.

This is acceptable while the app is prelaunch and cloud data does not need to be preserved.

After launch, this should change to additive, data-preserving migrations.

## Cloud schema responsibilities

The consolidated schema covers:

- user profiles
- linked member requests
- shared debt records
- debt verification records
- shared groups
- group participants
- group invites
- group members
- group member claims
- duplicate warnings
- shared expenses
- expense splits
- expense payers
- group debts
- group verification responses
- payments
- settlements
- comments
- attachments
- notifications
- notification preferences
- push-token records
- sync conflicts
- audit logs
- account deletion request records
- Row Level Security policies
- attachment storage bucket policies

## RLS expectations

- Users can read records for shared groups they participate in.
- Owners/admins can manage group-level configuration.
- Owners/admins/members can write ledger records while the group is writable.
- Viewers can read but should not mutate group ledger records.
- Verification responses should only be written by the linked user for the relevant group member or by permitted group managers.
- Private records remain inaccessible unless they are owned by the authenticated user.
- The app uses only the Supabase anon key client-side; service-role keys must never be used in the mobile app.

## Account deletion readiness

The consolidated schema includes `account_deletion_requests` and two account-deletion RPC surfaces:

- `request_account_deletion(...)` for authenticated mobile users.
- `apply_account_deletion_anonymization(...)` for trusted service-role execution only.

Trusted deletion fulfillment should run in this order:

1. Receive an authenticated user request from the app or support channel.
2. Ensure an `account_deletion_requests` row exists and move it to queued/processing with the service role.
3. Run `apply_account_deletion_anonymization(request_id, admin_note)` from an Edge Function or admin worker.
4. Delete or quarantine private Storage objects referenced by private attachments. SQL can clear database references, but Storage object deletion must use the Storage admin API.
5. Call `supabase.auth.admin.deleteUser(subject_user_id)` only after anonymization succeeds.
6. Mark the request `completed`, set `auth_user_deleted_at` and `completed_at`, or mark it `failed` with `error_message`.

The mobile anon client must not hold a service-role key and cannot revoke sessions, delete Auth users, or delete Storage objects outside RLS.

## Running the backend locally/manually

For a fresh prelaunch backend:

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` to the app environment.
4. Create/sign up a test user.
5. Optionally run `supabase/seed.sql`.

## Future production migration strategy

Do not use destructive resets after launch.

When production data needs to be preserved, replace the reset workflow with additive migrations such as:

```txt
supabase/migrations/001_initial.sql
supabase/migrations/002_add_feature.sql
supabase/migrations/003_fix_policy.sql
```
