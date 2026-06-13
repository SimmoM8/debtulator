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

## Supabase

Supabase is optional during development. The clean prelaunch setup is documented in `supabase/README.md`.

For a fresh development backend:

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` locally.
4. Create/sign up a test user.
5. Optionally run `supabase/seed.sql`.

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
