# Backend Schema

Supabase migrations are additive and ordered:

1. `supabase/stage2_schema.sql`
2. `supabase/stage3_schema.sql`
3. `supabase/stage4_schema.sql`
4. `supabase/stage5_schema.sql`
5. `supabase/stage6_schema.sql`
6. `supabase/stage7_integration_schema.sql`

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

## Running Migrations

Apply migrations in order through your Supabase migration workflow. For a manual SQL application, run Stage 7 after all earlier stages:

```sql
\i supabase/stage7_integration_schema.sql
```

