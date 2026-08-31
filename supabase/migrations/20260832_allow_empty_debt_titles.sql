-- supabase/migrations/20260831_allow_empty_debt_titles.sql

alter table public.debts
drop constraint if exists debts_title_not_empty;