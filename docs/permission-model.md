# Permission Model

UI hiding is not sufficient. The app uses central permission helpers and Supabase RLS policies.

Client helpers live in `src/services/permissions.ts` and cover viewing, editing, archiving, voiding financial records, export access, attachments, comments, group management, participant management, conflict resolution, and restoring backups into shared records.

Shared group permissions respect group roles, archived/settled/finalised state, locked groups, claim approval, duplicate merge, attachment/comment access, and export access.

Backend permissions are defined in `supabase/schema.sql`. The consolidated schema enables RLS for cloud tables and includes policies for profiles, linked member requests, shared debts, groups, group participants, group ledger records, comments, attachments, notifications, sync conflicts, audit logs, and account deletion request records.
