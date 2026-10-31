# Debtulator

Debtulator is a local-first ledger for personal debts. The iOS and Android app (Expo SDK 56, React Native) keeps its working copy in on-device SQLite. A Spring Boot API on Java 21 is the authority for accounts, sync, and anything shared between people. Supabase hosts Auth and Postgres.

The phone calls the Spring API. It does not read or write Postgres through the Supabase Data API.

## Run locally

Requirements: Node 20.19.4 or newer (`.nvmrc` pins 20.20.2), Java 21, and a Mac with Xcode to install the app on an iPhone. Backend and app run against the hosted Supabase project `Debtulator` (`ftnucfwlzmqxqpuwbmri`, eu-west-1).

### Environment

Copy [`.env.auth.example`](.env.auth.example) to `.env` in the repository root and fill it from the Supabase dashboard. `.env` stays uncommitted. The names are:

Backend, sourced before starting the API:

- `DATABASE_URL` — JDBC URL for the direct database host on port 5432 with `sslmode=require`. Flyway needs that session connection. The transaction pooler on port 6543 will not apply migrations.
- `DATABASE_USERNAME` — `postgres` on this project. That role owns the tables and bypasses row-level security, which is how the API continues to read and write after V13.
- `DATABASE_PASSWORD`
- `SUPABASE_URL`
- `SUPABASE_AUTH_API_KEY` — the publishable key, or the legacy anon key. The API sends it only to Supabase Auth (`/auth/v1`).
- `SUPABASE_JWT_ISSUER` — `https://<project-ref>.supabase.co/auth/v1`
- `SUPABASE_JWKS_URI` — `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`
- `SUPABASE_JWT_AUDIENCE` — optional, default `authenticated`
- `AUTH_SIGNUP_REDIRECT_URL` — optional, default `debtulator://auth/confirm`
- `AUTH_RECOVERY_REDIRECT_URL` — optional, default `debtulator://auth/reset-password`
- `SUPABASE_AUTH_FORWARD_CLIENT_IP` — optional, default `false`
- `PORT` — optional, default `8787`

App, in `mobile/.env` (Expo reads this directory; start from [`mobile/.env.example`](mobile/.env.example)):

- `EXPO_PUBLIC_API_URL` — `http://<this Mac's LAN address>:8787`

### Backend

```bash
set -a
source .env
set +a
cd backend
./mvnw spring-boot:run
```

On startup Flyway applies `backend/src/main/resources/db/migration`, including `V13__enable_rls_and_close_data_api.sql`. The API listens on port 8787. `GET /actuator/health` reports `UP` when the process is ready.

### iPhone

```bash
cd mobile
npm ci
npm run ios
```

`npm run ios` runs `expo run:ios --device`. The first run generates `mobile/ios` from `mobile/app.json` and the config plugins, then installs a development build on a connected iPhone. Xcode, CocoaPods, and a signing team are required. `mobile/ios` and `mobile/android` are gitignored build products.

The phone has to be able to open `EXPO_PUBLIC_API_URL`. Sign-up goes through Supabase Auth. When the project requires email confirmation, open the confirmation link on the phone so `debtulator://auth/confirm` returns to the app.

### Checks

```bash
cd mobile && npm run quality
cd backend && ./mvnw -B test
```

## Known gaps

- Overview is a placeholder screen. Payments, repayments, settlements, groups, reminders, and receipt attachments are still ahead of this build.
- This checkout has no database password, Auth key, or Apple signing identity. Filling `.env` and signing the iOS build are local steps.
- Schema changes belong in Flyway. `supabase/config.toml` leaves the Supabase CLI migration path disabled, so `npm run supabase:reset` does not build this database.
- `npx expo-doctor` reports a Hermes V1 memory regression in Expo SDK 56. The repair it suggests is an upgrade to Expo SDK 57, which is outside this change.

Engineering rules: [docs/engineering/README.md](docs/engineering/README.md). Database notes: [docs/database/README.md](docs/database/README.md).
