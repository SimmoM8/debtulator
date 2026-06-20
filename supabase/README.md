# Debtulator Supabase setup

Debtulator is local-first. The app can run with only the local SQLite database. Supabase is optional cloud infrastructure for auth, shared groups, sync, attachments, notifications, and account deletion request records.

This folder has a simplified prelaunch setup:

| File | Purpose |
| --- | --- |
| `schema.sql` | Destructive reset file that creates the latest cloud schema from scratch. |
| `README.md` | Setup notes for the development backend. |

## Important

`schema.sql` is destructive.

It drops and recreates Debtulator cloud tables, helper functions, policies, and the attachment storage bucket. This is intentional during early development because preserving cloud data is not currently required.

Do not use this reset file against production data after launch.

## 1. Create a Supabase project

1. Go to Supabase.
2. Create a new project.
3. Open the project dashboard.
4. Go to **Authentication > Providers**.
5. Enable email/password auth.

## 2. Run the schema

In Supabase:

1. Go to **SQL Editor**.
2. Open `supabase/schema.sql` from this repo.
3. Paste the whole file into the SQL editor.
4. Run it.

This creates:

- profiles
- linked member requests
- shared debt records
- debt verification records
- shared groups
- group participants
- group invites
- group members
- shared expenses
- group debts
- payments
- settlements
- comments
- attachments
- notifications
- audit logs
- account deletion request records
- Row Level Security policies
- Supabase Storage bucket for attachments

## 3. Add app environment variables

Add these values to your local environment. The mobile app only needs the public URL and anon key.

```bash
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
APP_ENV=development
```

Do not commit service-role keys. The mobile app must never use the service-role key.

## 4. Create a test auth user

The app can create a user through its sign-up flow. You can also create one in Supabase manually:

1. Go to **Authentication > Users**.
2. Create a test user.
3. Use that user when signing into the app.

## Reset workflow during development

When the cloud schema gets messy:

1. Run `schema.sql` again.
2. Create or keep a test auth user.
3. Restart the app and sign in again.

This only resets Supabase cloud data. It does not reset the app's local SQLite database on your device/simulator.

## Local SQLite versus Supabase

Debtulator has two persistence layers:

| Layer | Role |
| --- | --- |
| Local SQLite | Main app database. Works offline. Used even when signed out. |
| Supabase Postgres | Optional cloud database for shared/synced records. |
| Supabase Storage | Optional cloud file storage for shared attachment files. |

Private local records should stay local. Shared records can sync through the local sync queue once Supabase is configured.

## Later production migration strategy

After launch, stop using `schema.sql` as the normal upgrade path. Production needs additive, data-preserving migrations.

A future production setup should use files like:

```txt
supabase/migrations/001_initial.sql
supabase/migrations/002_add_feature.sql
supabase/migrations/003_fix_policy.sql
```

For now, the single reset file is simpler and better for early development.
