# Manual QA Scripts

Record device model, OS version, app version, build number, backend environment, tester, date, and result for every script. Use staging builds and staging backend data unless the release owner explicitly approves a production smoke pass.

## Local-Only Offline Ledger

1. Install a fresh staging build and keep the device offline.
2. Open the app without signing in.
3. Create two members.
4. Create one debt, one expense, one payment, and one settlement.
5. Close and relaunch the app.
6. Confirm all records still appear and amounts are unchanged.
7. Edit a note and delete or archive one non-critical record.
8. Confirm the app does not require auth or network access for local records.

Pass criteria: local data persists across restart, totals remain coherent, and no private local-only record is queued for sync.

## Authenticated Sync And Conflict Review

1. Install the same staging build on two devices or simulators.
2. Sign in as the same staging account on both devices.
3. Create a shared group on device A with at least two members.
4. Add an expense and payment on device A, then sync.
5. Confirm device B can view the group and cached records.
6. Put device B offline and edit a financial record.
7. Edit the same record differently on device A while online.
8. Bring device B online and sync.
9. Confirm the conflict appears in the conflict center.
10. Resolve the conflict and verify financial history is not silently overwritten.

Pass criteria: sync is repeatable, offline cache remains readable, and conflicting financial edits require review.

## Backup, Export, Restore, And Deletion

1. Create local and shared records with comments or attachments if available.
2. Generate a backup export.
3. Open restore preview and confirm restored records default to private/local copies.
4. Generate a full data export.
5. Confirm private/shared labels and estimated values are present.
6. Trigger the delete-account flow on a staging account.
7. Confirm the UI explains what is deleted, anonymized, or retained for ledger integrity.
8. Confirm a deletion audit event or backend request is visible in staging evidence.

Pass criteria: export files are generated intentionally, restore preview is private by default, and deletion behavior matches store disclosures.

## Store Submission Smoke

1. Verify app icon, splash screen, and app name on a clean install.
2. Verify deep links using the `debtulator://` scheme if a test link is available.
3. Trigger notification permission copy only from the intended in-app flow.
4. Confirm photo or file permission copy appears only when choosing an attachment/import file.
5. Check the app after force close and relaunch.
6. Check the app with airplane mode enabled.
7. Check the app after signing out.

Pass criteria: permissions are contextual, launch surfaces are branded, and signed-out behavior does not expose account data.

## Accessibility And Localization

1. Run the main tabs with iOS VoiceOver or Android TalkBack.
2. Confirm tab names, buttons, destructive actions, and amounts are announced clearly.
3. Increase dynamic type or system font size and scan high-density screens.
4. Confirm charts, badges, and status messages are understandable without relying only on color.
5. Switch between English and Swedish if localization is included in the release scope.

Pass criteria: core flows are navigable by screen reader, large text does not block primary actions, and destructive actions remain explicit.
