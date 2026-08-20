-- Close direct-mutation and null-actor privacy bypasses without changing any
-- identifiers or stored financial data. Financial response functions remain
-- the only path that can alter review/confirmation state. Direct sync updates
-- are limited to creator-owned metadata; involved-user no-op echoes are kept so
-- a client can acknowledge state that an RPC or realtime pull already applied.

begin;

-- Anonymous clients never need direct table access to private app data.
revoke all on table public.shared_debt_records from anon;
revoke all on table public.debt_verifications from anon;
revoke all on table public.payments from anon;
revoke all on table public.activity_logs from anon;
revoke all on table public.group_activity_logs from anon;
revoke all on table public.audit_logs from anon;

-- Keep the smallest grants used by the mobile sync adapter. Proposal and
-- confirmation rows are changed only by the audited functions below.
grant select, insert, update on table public.shared_debt_records to authenticated;
grant select on table public.debt_verifications to authenticated;
revoke insert, update, delete on table public.debt_verifications from authenticated;
grant select, insert, update on table public.payments to authenticated;
grant select, insert on table public.activity_logs to authenticated;
revoke update, delete on table public.activity_logs from authenticated;
grant select, insert on table public.group_activity_logs to authenticated;
revoke update, delete on table public.group_activity_logs from authenticated;
grant select, insert on table public.audit_logs to authenticated;
revoke update, delete on table public.audit_logs from authenticated;

-- A SECURITY DEFINER financial function is safe here because every function
-- validates auth.uid(), row involvement, state, and allowed transitions before
-- writing. The empty search_path installed by the canonical migrations is
-- retained. Running as the migration owner also lets the functions bypass the
-- direct-update guards and RLS only for their validated mutation.
alter function public.request_debt_verification(uuid, uuid, text, jsonb)
  security definer;
alter function public.counter_debt_verification(uuid, jsonb, text)
  security definer;
alter function public.respond_to_debt_verification(uuid, text, text, jsonb)
  security definer;
alter function public.respond_to_payment_confirmation(uuid, text)
  security definer;

revoke all on function public.request_debt_verification(uuid, uuid, text, jsonb)
  from public, anon;
revoke all on function public.counter_debt_verification(uuid, jsonb, text)
  from public, anon;
revoke all on function public.respond_to_debt_verification(uuid, text, text, jsonb)
  from public, anon;
revoke all on function public.respond_to_payment_confirmation(uuid, text)
  from public, anon;
grant execute on function public.request_debt_verification(uuid, uuid, text, jsonb)
  to authenticated;
grant execute on function public.counter_debt_verification(uuid, jsonb, text)
  to authenticated;
grant execute on function public.respond_to_debt_verification(uuid, text, text, jsonb)
  to authenticated;
grant execute on function public.respond_to_payment_confirmation(uuid, text)
  to authenticated;

create or replace function public.guard_shared_debt_direct_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Migration-owned SECURITY DEFINER workflows and service maintenance have
  -- already performed their own authorization checks.
  if current_user in ('postgres', 'service_role', 'supabase_admin') then
    return new;
  end if;

  if (select auth.uid()) is null then
    raise exception using
      errcode = '42501',
      message = 'Authenticated user required.';
  end if;

  if old.creator_user_id is distinct from new.creator_user_id
    or old.involved_user_id is distinct from new.involved_user_id
    or old.client_generated_id is distinct from new.client_generated_id
  then
    raise exception using
      errcode = '42501',
      message = 'Shared debt identities are immutable after creation.';
  end if;

  if (select auth.uid()) is distinct from old.creator_user_id then
    if old.local_member_reference is distinct from new.local_member_reference
      or old.amount is distinct from new.amount
      or old.currency is distinct from new.currency
      or old.title is distinct from new.title
      or old.notes_visible_to_other_user is distinct from new.notes_visible_to_other_user
      or old.debt_date is distinct from new.debt_date
      or old.due_date is distinct from new.due_date
      or old.direction is distinct from new.direction
      or old.visibility is distinct from new.visibility
      or old.verification_status is distinct from new.verification_status
      or old.settlement_status is distinct from new.settlement_status
      or old.suggested_change is distinct from new.suggested_change
      or old.archived_at is distinct from new.archived_at
    then
      raise exception using
        errcode = '42501',
        message = 'Only the creator may directly update shared debt metadata.';
    end if;
    return new;
  end if;

  if old.amount is distinct from new.amount
    or old.title is distinct from new.title
    or old.due_date is distinct from new.due_date
    or old.direction is distinct from new.direction
    or old.verification_status is distinct from new.verification_status
    or old.settlement_status is distinct from new.settlement_status
    or old.suggested_change is distinct from new.suggested_change
  then
    raise exception using
      errcode = '42501',
      message = 'Shared debt review fields must be changed through a verification RPC.';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_shared_debt_direct_update() from public, anon, authenticated;

drop trigger if exists guard_shared_debt_direct_update on public.shared_debt_records;
create trigger guard_shared_debt_direct_update
before update on public.shared_debt_records
for each row execute function public.guard_shared_debt_direct_update();

create or replace function public.guard_payment_direct_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin') then
    return new;
  end if;

  if (select auth.uid()) is null then
    raise exception using
      errcode = '42501',
      message = 'Authenticated user required.';
  end if;

  if old.created_by_user_id is distinct from new.created_by_user_id
    or old.payer_user_id is distinct from new.payer_user_id
    or old.payee_user_id is distinct from new.payee_user_id
    or old.payer_member_id is distinct from new.payer_member_id
    or old.payee_member_id is distinct from new.payee_member_id
    or old.payer_group_member_id is distinct from new.payer_group_member_id
    or old.payee_group_member_id is distinct from new.payee_group_member_id
    or old.group_id is distinct from new.group_id
    or old.client_generated_id is distinct from new.client_generated_id
    or old.amount is distinct from new.amount
    or old.currency is distinct from new.currency
    or old.payment_date is distinct from new.payment_date
  then
    raise exception using
      errcode = '42501',
      message = 'Payment financial and participant fields are immutable after creation.';
  end if;

  if (select auth.uid()) is distinct from old.created_by_user_id then
    if old.notes is distinct from new.notes
      or old.status is distinct from new.status
      or old.confirmation_status is distinct from new.confirmation_status
      or old.visibility is distinct from new.visibility
      or old.archived_at is distinct from new.archived_at
    then
      raise exception using
        errcode = '42501',
        message = 'Only the payment creator may directly update payment metadata.';
    end if;
    return new;
  end if;

  if old.confirmation_status is distinct from new.confirmation_status
    or (
      old.status is distinct from new.status
      and new.status in ('confirmed', 'rejected')
    )
  then
    raise exception using
      errcode = '42501',
      message = 'Payment confirmation state must be changed through the response RPC.';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_payment_direct_update() from public, anon, authenticated;

drop trigger if exists guard_payment_direct_update on public.payments;
create trigger guard_payment_direct_update
before update on public.payments
for each row execute function public.guard_payment_direct_update();

-- Direct row policies still allow an involved client to send an idempotent
-- post-RPC echo. The triggers above reject every material involved-user change.
drop policy if exists shared_debt_involved_update on public.shared_debt_records;
create policy shared_debt_involved_update
on public.shared_debt_records
for update
to authenticated
using (
  creator_user_id = (select auth.uid())
  or involved_user_id = (select auth.uid())
)
with check (
  (
    creator_user_id = (select auth.uid())
    or involved_user_id = (select auth.uid())
  )
  and public.has_accepted_link_between(creator_user_id, involved_user_id)
);

drop policy if exists payments_relevant_insert on public.payments;
create policy payments_relevant_insert
on public.payments
for insert
to authenticated
with check (
  created_by_user_id = (select auth.uid())
  and (
    (
      group_id is null
      and (
        payer_user_id = (select auth.uid())
        or payee_user_id = (select auth.uid())
      )
    )
    or (
      group_id is not null
      and public.can_write_group_ledger(group_id)
    )
  )
);

drop policy if exists payments_relevant_update on public.payments;
create policy payments_relevant_update
on public.payments
for update
to authenticated
using (
  created_by_user_id = (select auth.uid())
  or payer_user_id = (select auth.uid())
  or payee_user_id = (select auth.uid())
  or public.is_group_participant(group_id)
)
with check (
  created_by_user_id = (select auth.uid())
  or payer_user_id = (select auth.uid())
  or payee_user_id = (select auth.uid())
  or public.is_group_participant(group_id)
);

drop policy if exists activity_actor on public.activity_logs;
create policy activity_actor_select
on public.activity_logs
for select
to authenticated
using (actor_user_id = (select auth.uid()));

create policy activity_actor_insert
on public.activity_logs
for insert
to authenticated
with check (actor_user_id = (select auth.uid()));

drop policy if exists audit_logs_actor on public.audit_logs;
create policy audit_logs_actor_select
on public.audit_logs
for select
to authenticated
using (actor_user_id = (select auth.uid()));

create policy audit_logs_actor_insert
on public.audit_logs
for insert
to authenticated
with check (actor_user_id = (select auth.uid()));

drop policy if exists group_activity_participants_insert on public.group_activity_logs;
create policy group_activity_participants_insert
on public.group_activity_logs
for insert
to authenticated
with check (
  public.is_group_participant(group_id)
  and actor_user_id = (select auth.uid())
);

notify pgrst, 'reload schema';

commit;
