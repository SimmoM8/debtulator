# Local and Remote ID Mapping

Debtulator is local-first. SQLite IDs are the canonical relationship keys inside the app. Supabase UUIDs are stored as `remote_id` and are used only when building remote DTOs.

## Rules

- Local SQLite relationships reference local IDs.
- Supabase relationships reference remote UUIDs.
- Pulling a remote record creates or updates one local row and stores `remote_id`.
- Pushing a local record stores the returned remote UUID back in `remote_id`.
- Mapper functions in `src/services/sync/mappers.ts` are the only sync boundary for relationship conversion.
- Missing mappings throw `SyncMappingError`; financial records are not pushed with mixed local/remote relationship IDs.

## Shared Event Member Mapping

`event_members.id` in Supabase maps to `shared_event_members.remote_id` locally.

Local expense fields:

- `shared_expenses.payer_id`
- `shared_expenses.participant_ids_json`
- `expense_payers.event_member_id`
- `event_debts.debtor_event_member_id`
- `event_debts.creditor_event_member_id`
- `event_verification_responses.event_member_id`

all store local event member IDs. Remote DTOs convert those values to Supabase `event_members.id`.

This fixes the previous risk where pulled rows used local IDs like `event_member_remote_${uuid}` inconsistently and ledger calculations could see unknown participant IDs.

## Helpers

Implemented helpers:

- `getLocalIdForRemoteId`
- `getRemoteIdForLocalId`
- `ensureLocalRecordForRemote`
- `mapLocalEventToRemote`
- `mapRemoteEventToLocal`
- `mapLocalEventMemberToRemote`
- `mapRemoteEventMemberToLocal`
- `mapLocalExpenseToRemote`
- `mapRemoteExpenseToLocal`
- `mapLocalPaymentToRemote`
- `mapRemotePaymentToLocal`

The mapper layer also covers event participants, invites, claims, duplicate warnings, event debts, verification responses, settlements, settlement lines, comments, attachments, and activity logs.

