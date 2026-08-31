-- ============================================================================
-- Backfill existing application data into the sync change stream.
--
-- Rows that existed before sync triggers were introduced never generated a
-- sync_changes entry. This gives devices starting from sequence 0 a complete
-- initial replication history.
-- ============================================================================

insert into public.sync_changes (
  owner_user_id,
  entity_type,
  entity_id,
  operation,
  payload
)
select
  member.owner_user_id,
  'member',
  member.id,
  'upsert',
  to_jsonb(member)
from public.members as member;


insert into public.sync_changes (
  owner_user_id,
  entity_type,
  entity_id,
  operation,
  payload
)
select
  debt.owner_user_id,
  'debt',
  debt.id,
  'upsert',
  to_jsonb(debt)
from public.debts as debt;