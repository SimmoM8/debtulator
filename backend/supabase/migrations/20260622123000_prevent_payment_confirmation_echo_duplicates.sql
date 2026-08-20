-- Realtime can echo a newly uploaded payment before the initiating client has
-- stored its remote UUID. Preserve the client identity on every row so push
-- retries and realtime pulls reconcile instead of creating local duplicates.

alter table public.payments
add column if not exists client_generated_id text;

alter table public.settlements
add column if not exists client_generated_id text;

alter table public.settlement_lines
add column if not exists client_generated_id text;

-- These names were used by an unreleased development version of the fix.
drop index if exists public.payments_creator_client_id_idx;
drop index if exists public.settlements_creator_client_id_idx;
drop index if exists public.settlement_lines_settlement_client_id_idx;

create unique index if not exists payments_client_generated_id_idx
on public.payments (client_generated_id);

create unique index if not exists settlements_client_generated_id_idx
on public.settlements (client_generated_id);

create unique index if not exists settlement_lines_client_generated_id_idx
on public.settlement_lines (client_generated_id);

notify pgrst, 'reload schema';
