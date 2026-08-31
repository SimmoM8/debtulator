-- supabase/migrations/20260833_fix_debt_owner_member_relationships.sql

-- ============================================================================
-- Debt ownership relationships
--
-- A debt is owned by an authenticated Debtulator user.
-- A debt separately references one member from that user's ledger.
-- ============================================================================


-- Remove the composite members relationship.
alter table public.debts
drop constraint if exists debts_member_owned_by_same_user;


-- member_id should directly identify the member.
alter table public.debts
add constraint debts_member_id_fkey
foreign key (member_id)
references public.members(id)
on delete restrict;


-- ============================================================================
-- Enforce that the selected member belongs to the debt owner.
-- ============================================================================

create or replace function public.validate_debt_member_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.members
    where id = new.member_id
      and owner_user_id = new.owner_user_id
  ) then
    raise exception
      'Debt member must belong to the debt owner.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;


create trigger debts_validate_member_owner
before insert or update of owner_user_id, member_id
on public.debts
for each row
execute function public.validate_debt_member_owner();