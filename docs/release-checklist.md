# Release Checklist

- `npm run lint` passes.
- Supabase URL/anon key are provided through environment variables.
- No service role keys or production secrets are committed.
- Supabase migrations through Stage 6 are applied.
- RLS and storage policies are enabled and tested.
- iOS bundle identifier and Android package name are set.
- App icon, adaptive icon, splash screen, scheme, version, and build numbers are configured.
- Push notification permission text is present.
- Backup, full export, and delete account flows are manually tested.
- Signed-out offline usage and signed-in cross-device sync are tested.
- Conflict review is tested with a financial record.
- Accessibility pass is checked on iOS and Android screen readers.
