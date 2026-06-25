-- An earlier manually applied version created partial composite indexes while
-- the client attempted ON CONFLICT (client_generated_id). PostgreSQL cannot
-- infer a partial index for that conflict target, leaving uploads retrying
-- forever. Install non-partial composite keys that match the client exactly.

drop index if exists public.payments_client_generated_id_idx;
drop index if exists public.settlements_client_generated_id_idx;
drop index if exists public.settlement_lines_client_generated_id_idx;
drop index if exists public.payments_creator_client_id_idx;
drop index if exists public.settlements_creator_client_id_idx;
drop index if exists public.settlement_lines_settlement_client_id_idx;

create unique index payments_creator_client_id_idx
on public.payments (created_by_user_id, client_generated_id);

create unique index settlements_creator_client_id_idx
on public.settlements (created_by_user_id, client_generated_id);

create unique index settlement_lines_settlement_client_id_idx
on public.settlement_lines (settlement_id, client_generated_id);

notify pgrst, 'reload schema';
