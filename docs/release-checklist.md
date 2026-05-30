# Release Checklist

Use this checklist before every external TestFlight, Play internal testing, or production store upload. A checked item means the evidence is in the release notes, CI run, EAS build page, store draft, or QA notes.

## Release Blockers

- [ ] `npm run quality` passes locally or in CI.
- [ ] `npm run release:preflight:config -- --env=staging` passes in CI.
- [ ] Production submission only: `npm run release:preflight -- --env=production --strict-env` passes with real environment values.
- [ ] `package.json` version matches `app.json` `expo.version`.
- [ ] iOS `buildNumber` and Android `versionCode` are higher than the last uploaded builds.
- [ ] Staging and production EAS profiles point at different backend environments.
- [ ] No service-role keys, production secrets, `.env` files, or credential exports are committed.
- [ ] Supabase migrations are applied in order and RLS/storage policies are enabled.
- [ ] Account deletion request/status behavior is implemented, documented, and manually verified.
- [ ] Account deletion fulfillment worker is deployed with service-role-only access, Storage cleanup, Auth admin deletion, and failure status reporting.
- [ ] Backup export, full data export, and restore preview are manually verified.
- [ ] Signed-out local-only usage works without network access.
- [ ] Signed-in sync and conflict review are manually verified with staging data.
- [ ] App Store Connect and Play Console privacy/data disclosures match the current app behavior.
- [ ] Privacy policy URL and support URL are real HTTPS URLs before production submission.

## Environment Separation

- [ ] `development`, `staging`, and `production` EAS profiles exist in `eas.json`.
- [ ] Each profile sets the matching `APP_ENV` value.
- [ ] Staging uses `distribution: internal`.
- [ ] Production uses store distribution and `autoIncrement`.
- [ ] Staging Supabase project is separate from production Supabase project.
- [ ] Staging data can be reset without touching production users.
- [ ] Production release workers do not run destructive staging reset scripts against production credentials.
- [ ] Supabase anon keys are configured through EAS environment variables, not committed files.
- [ ] Service-role keys are only available to trusted backend/admin tooling, never the mobile app.
- [ ] Account deletion Edge Function/admin worker uses the service role; the mobile app uses only the anon-key `request_account_deletion` RPC.

## Store Readiness

- [ ] iOS bundle identifier is final: `com.debtulator.app`.
- [ ] Android package is final: `com.debtulator.app`.
- [ ] App name, slug, icon, adaptive icon, monochrome icon, splash screen, scheme, version, and build numbers are configured.
- [ ] Notification, photo library, and sensitive action permission copy is accurate.
- [ ] Store screenshots exist for all required device classes.
- [ ] Store listing copy explains local-first behavior, optional sync, backup/export, and deletion.
- [ ] Privacy policy URL placeholder is replaced: `APP_PRIVACY_POLICY_URL=https://...`.
- [ ] Support URL placeholder is replaced: `APP_SUPPORT_URL=https://...`.
- [ ] Marketing/support inbox is monitored during beta.
- [ ] TestFlight beta notes and Play testing release notes include known limitations.

## Manual QA

- [ ] Run the local-only offline script in `docs/manual-qa-scripts.md`.
- [ ] Run the authenticated sync script in `docs/manual-qa-scripts.md`.
- [ ] Run the backup/export/delete-account script in `docs/manual-qa-scripts.md`.
- [ ] Run the accessibility script in `docs/manual-qa-scripts.md`.
- [ ] Capture device, OS version, build number, backend environment, and tester initials for each pass.

## Release Commands

```bash
npm run quality
npm run release:preflight:config -- --env=staging
npm run release:preflight -- --env=staging
npm run release:preflight -- --env=production --strict-env
```

```bash
npx eas build --profile staging --platform ios
npx eas build --profile staging --platform android
npx eas build --profile production --platform all
```

Production submission requires explicit release-owner approval after the production strict preflight and manual QA evidence are complete.
