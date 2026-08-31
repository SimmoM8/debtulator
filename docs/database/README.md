# Debtulator Database

## Current architecture

The database was deliberately rebuilt from a simpler baseline beginning in
August 2026.

The first version of the rebuilt remote model contains only the core account
ledger concepts:

- authenticated users
- profiles
- members
- debts

Features such as member linking, debt verification, groups, payments,
settlements, reminders, and collaboration are intentionally excluded from the
initial schema.

They will be introduced incrementally when their domain behaviour is actually
implemented.

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
