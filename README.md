# Debtulator

Debtulator is a local-first debt, shared expense, group ledger, payment, settlement, and export app for iOS and Android. It is built with React Native, Expo Router, TypeScript, SQLite on-device persistence, and optional Supabase auth/sync/storage.

## Tech Stack

- Expo SDK 56, React Native 0.85, React 19
- Expo Router file-based navigation
- TypeScript
- SQLite via `expo-sqlite`
- Optional Supabase auth/database/storage for linked members, shared groups, verification, sync, notifications, attachments, and account deletion request records
- Expo Secure Store for sensitive session storage support

## Setup

Use Node 20.19.4 or newer.

```bash
nvm use
npm install
npm run start
```

Optional Supabase environment variables:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
APP_ENV=development
```

Do not commit service-role keys or production secrets. The mobile client must only use the Supabase anon key with RLS enabled.

## Local Database

The app opens `debtulator-stage1.db` and runs additive SQLite migrations in `src/data/database.ts`. The local database is the main source of truth and works offline. Reset controls exist only in settings for development.

Key local sync/support tables include:

- `sync_queue`
- `sync_conflicts`
- `notifications`
- `audit_logs`

## Resetting Development Data

### Normal reset: keep your login and onboarding

Use this workflow for routine testing. It deletes the hosted application data
and rebuildable local data, but keeps the test user, login session, completed
onboarding, theme, and other device preferences.

1. Link this repository to the development Supabase project once (skip this if
   it is already linked):

   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```

2. From the project directory, run:

   ```bash
   npm run reset:test-data -- --yes
   ```

   This dynamically truncates every table in the `public` schema with
   `RESTART IDENTITY CASCADE`. It preserves the schema, migrations, functions,
   triggers, RLS policies, and `auth.users`.

3. In the installed development app, open:

   **Settings → Developer tools → Clear local data and reset sync**

4. The app stays signed in, performs a clean sync, and opens the authenticated
   app with the now-empty remote dataset. It does not recreate demo, debt,
   group, invitation, payment, or transaction records.

The developer-tool actions only appear in development builds. The command uses
the Supabase CLI and the linked project; it does not need `psql` or a database
password. Verify the linked project before running a destructive reset:

```bash
npx supabase projects list
```

To target the local Supabase stack instead, run:

```bash
npm run reset:test-data -- --local --yes
```

### Full local reset: sign out and erase this device

Use this only when you intentionally want to remove the local identity and redo
first-run setup:

**Settings → Developer tools → Sign out and erase all local data**

This signs out and deletes the local Supabase session, onboarding state,
preferences, local database records, and sync state. It does not delete the
hosted Auth user.

### Delete hosted Auth users too

Deleting Auth users is opt-in and is not part of the normal reset workflow:

```bash
npm run reset:test-data -- --delete-users --yes
```

This removes public test data and hosted Supabase Auth users. Existing login
sessions will no longer be usable.

For the exact persistence and table classification, see
[`docs/development-resets.md`](docs/development-resets.md).

## Supabase

Supabase is optional during development. The clean prelaunch setup is documented in `supabase/README.md`.

For a fresh development backend:

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` locally.
4. Create/sign up a test user.

`supabase/schema.sql` is intentionally destructive and is meant for prelaunch development only. After launch, cloud schema changes should move to additive, data-preserving migrations.

RLS must remain enabled. Storage policies must restrict receipt/proof attachments to owners or shared group participants.

## Run

```bash
npm run ios
npm run android
npm run web
npm run lint
```

## Release Builds

The app is configured with bundle/package identifiers, icons, splash screen, deep link scheme, notification permission metadata, and EAS profiles.

Run automated quality and release configuration checks before creating a release build:

```bash
npm run quality
npm run release:preflight:config -- --env=staging
npm run release:preflight -- --env=staging
```

Production submission must use strict checks with real store and backend environment values:

```bash
APP_ENV=production \
EXPO_PUBLIC_SUPABASE_URL=... \
EXPO_PUBLIC_SUPABASE_ANON_KEY=... \
APP_PRIVACY_POLICY_URL=https://... \
APP_SUPPORT_URL=https://... \
npm run release:preflight -- --env=production --strict-env
```

```bash
npx eas build --profile staging --platform ios
```
