# Permission Model

UI hiding is not sufficient. The app uses central permission helpers and Supabase RLS policies.

Client helpers live in [`src/services/permissions.ts`](/Users/benjaminsimmons/Documents/CODING/debtulator/src/services/permissions.ts) and cover viewing, editing, archiving, voiding financial records, export access, attachments, comments, event management, participant management, conflict resolution, and restoring backups into shared records.

Shared event permissions respect event roles, archived/settled/finalised state, locked events, claim approval, duplicate merge, attachment/comment access, and export access.

Backend migrations in [`supabase/stage6_schema.sql`](/Users/benjaminsimmons/Documents/CODING/debtulator/supabase/stage6_schema.sql) add RLS-protected conflicts, notifications, push tokens, notification preferences, and audit logs.
