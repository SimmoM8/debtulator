# Debtulator

Debtulator is a local-first debt, shared expense, event ledger, payment, settlement, and export app for iOS and Android. It is built with React Native, Expo Router, TypeScript, SQLite on-device persistence, and optional Supabase auth/sync/storage.

## Tech Stack

- Expo SDK 54, React Native 0.81, React 19
- Expo Router file-based navigation
- TypeScript
- SQLite via `expo-sqlite`
- Supabase auth/database/storage for linked members, shared events, verification, and backend-ready Stage 6 sync/notification records
- Expo Secure Store for sensitive session storage support

## Setup

```bash
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

The app opens `debtulator-stage1.db` and runs additive SQLite migrations in [`src/data/database.ts`](/Users/benjaminsimmons/Documents/CODING/debtulator/src/data/database.ts). Migrations add Stage 1-6 tables without wiping user data. Reset controls exist only in settings for development.

Stage 6 local tables include:

- `sync_queue`
- `sync_conflicts`
- `notifications`
- `audit_logs`

## Supabase

Apply migrations in order from the [`supabase`](/Users/benjaminsimmons/Documents/CODING/debtulator/supabase) directory:

1. `stage2_schema.sql`
2. `stage3_schema.sql`
3. `stage4_schema.sql`
4. `stage5_schema.sql`
5. `stage6_schema.sql`

RLS must remain enabled. Storage policies must restrict receipt/proof attachments to owners or shared event participants.

## Run

```bash
npm run ios
npm run android
npm run web
npm run lint
```

## Release Builds

The app is configured with bundle/package identifiers, icons, splash screen, deep link scheme, notification permission metadata, and EAS profiles.

```bash
npx eas build --profile staging --platform ios
npx eas build --profile staging --platform android
npx eas build --profile production --platform all
```

Use separate Supabase projects or environment variables for dev/staging/prod. Never commit production secrets.

## Stage 6 Model

Stage 6 hardens Debtulator for production:

- Offline-first queue and cached synced data
- Cross-device sync primitives for authenticated users
- Transparent conflict detection and conflict review screens
- Financial history protection through warnings, soft-delete/archive/void patterns, and audit logs
- In-app notification center plus push/email preferences
- Backup/restore with private-by-default restore semantics
- Full data export and deliberate account deletion flow
- Advanced permission helpers and backend/RLS migration
- SQLite indexes for large ledgers/events
- English/Swedish localization support
- Accessibility checklist and production error types

Detailed docs:

- [`docs/sync-model.md`](/Users/benjaminsimmons/Documents/CODING/debtulator/docs/sync-model.md)
- [`docs/privacy-model.md`](/Users/benjaminsimmons/Documents/CODING/debtulator/docs/privacy-model.md)
- [`docs/permission-model.md`](/Users/benjaminsimmons/Documents/CODING/debtulator/docs/permission-model.md)
- [`docs/backup-restore.md`](/Users/benjaminsimmons/Documents/CODING/debtulator/docs/backup-restore.md)
- [`docs/release-checklist.md`](/Users/benjaminsimmons/Documents/CODING/debtulator/docs/release-checklist.md)

## QA Checklist

- Signed-out local member/debt/event/payment usage works offline.
- Signing in does not upload private local-only records.
- Shared event cached data remains viewable offline.
- Safe shared edits create queue entries; unsafe shared financial actions are blocked or reviewed.
- Conflicts can be reviewed and resolved without silently overwriting financial history.
- Backup export works and restore preview defaults records to private/local copies.
- Full data export labels shared/private and estimated values.
- Delete account flow records a deliberate audit event.
- Notification center works even when push/email are disabled.
- `npm run lint` passes before release.
