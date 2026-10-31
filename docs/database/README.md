# Debtulator Database

## Current architecture

The database was deliberately rebuilt from a simpler baseline beginning in
August 2026.

Flyway migrations under `backend/src/main/resources/db/migration` are the
schema authority. The current model covers accounts, profiles, members, debts,
sync, discovery, member linking, agreements, and debt collaboration. Payments,
settlements, groups, and reminders are not in the schema yet.

## Access

The mobile app calls the Spring Boot API. It does not query these tables
through the Supabase Data API. The API connects with JDBC as the table owner.

`V13__enable_rls_and_close_data_api.sql` enables row-level security on every
`public` table and defines no policies, which denies `anon` and
`authenticated`. The table owner bypasses row-level security, so the API is
unchanged. Grants to `anon`, `authenticated`, and `service_role` are revoked,
including the legacy Supabase default that automatically granted new public
tables to those roles. That default is what exposed `flyway_schema_history`.
The migration revokes those grants. The API then enables row-level security
on that history table after Flyway releases its lock
(`FlywaySchemaHistoryGuard`), because taking the lock inside the migration
deadlocks startup.

## Historical schema

The complete database implementation that existed immediately before this
rebuild is preserved in Git at:

`pre-database-rebuild`

The old migrations should not be treated as part of the active database
architecture.

## Design principles

- Supabase Auth owns authentication identity.
- `public.profiles` stores Debtulator account/profile data.
- Members belong to one account.
- Debts belong to one account and reference one of that account's members.
- Local entities use stable UUIDs that can also be used remotely.
- Local-only members may later become linked to another Debtulator account
  without changing their identity.
- Account ownership and collaboration are separate concepts.
- All account data can eventually sync remotely.
- Linking does not determine whether an entity is syncable.
- Verification will later apply only to collaborative records involving linked
  users.
