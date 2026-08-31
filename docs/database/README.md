# Debtulator Database Architecture

## Source of truth

Database schema changes are made only through SQL migrations in:

`supabase/migrations/`

The Supabase dashboard must not be used to manually make production schema
changes that are not represented by a migration.

## Core identity model

### User

A User is an authenticated Debtulator account.

The authoritative account identity is:

`auth.users.id`

Application profile information is stored in:

`public.profiles`

### Personal Member

A Personal Member is a person in one user's personal ledger.

A Personal Member exists independently of whether that person has a Debtulator
account.

Examples:

- Alice, entered manually by Benjamin
- Bob, imported from a contact
- Charlie, who later creates a Debtulator account

A Personal Member may later become linked to a real authenticated User.

Linking must NOT replace the Personal Member.

Instead:

`personal_members.linked_user_id`

changes from `NULL` to the linked user's `auth.users.id`.

The Personal Member's primary key remains unchanged.

All existing debts continue referencing the same Personal Member.

### Important invariant

Member identity and User identity are different concepts.

A debt references a Personal Member.

It does not directly use another authenticated User as its personal-ledger
identity.

## Sync model

For authenticated users, personal application data should eventually sync to
the remote database regardless of whether other people involved are linked
Debtulator users.

Therefore:

Sync != Sharing != Verification

An unlinked Personal Member can have remotely synced debts.

A linked Personal Member can have remotely synced debts.

Verification only applies when a debt is intentionally shared with a linked
user.

## Linking existing members

If an existing Personal Member later becomes linked:

1. The Personal Member remains the same row.
2. `linked_user_id` is populated.
3. Existing debt `member_id` references do not change.
4. Historical debts are not automatically exposed to the newly linked user.
5. Sharing/verification is handled separately.

## Naming

`personal_members`
: Personal ledger people belonging to one user.

`group_members`
: Participant identities that exist specifically inside a group.

These are separate concepts and must not be conflated.
