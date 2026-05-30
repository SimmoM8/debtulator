# Release Checklist

- `APP_ENV=staging EXPO_PUBLIC_SUPABASE_URL=... EXPO_PUBLIC_SUPABASE_ANON_KEY=... npm run preflight:beta` passes before beta builds.
- `npm run lint` passes.
- `npm run test` passes.
- Supabase URL/anon key are provided through environment variables.
- Beta uploads use the `staging` EAS profile (`npx eas build --profile staging --platform ios|android`).
- No service role keys or production secrets are committed.
- Supabase migrations through Stage 6 are applied.
- RLS and storage policies are enabled and tested.
- iOS bundle identifier and Android package name are set.
- App icon, adaptive icon, splash screen, scheme, versions, and build numbers are configured and consistent across package/app/iOS/Android fields.
- Push notification permission text is present.
- Backup, full export, and delete account flows are manually tested.
- Signed-out offline usage and signed-in cross-device sync are tested.
- Conflict review is tested with a financial record.
- Accessibility pass is checked on iOS and Android screen readers.
