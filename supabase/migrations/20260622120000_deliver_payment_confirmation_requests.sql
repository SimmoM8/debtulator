-- Deliver one-to-one payment confirmations to the linked counterparty and let
-- that counterparty hydrate the settlement record attached to the payment.

create index if not exists payments_payer_user_idx
on public.payments (payer_user_id, updated_at)
where group_id is null and payer_user_id is not null;

create index if not exists payments_payee_user_idx
on public.payments (payee_user_id, updated_at)
where group_id is null and payee_user_id is not null;

create index if not exists settlement_lines_payment_idx
on public.settlement_lines (payment_id)
where payment_id is not null;

create index if not exists settlement_lines_settlement_idx
on public.settlement_lines (settlement_id);

-- The baseline recreates these tables after Supabase's default grants have
-- been installed, so authenticated otherwise retains only maintenance-level
-- privileges. RLS policies below and in the baseline still scope every row.
grant select, insert, update on public.payments to authenticated;
grant select, insert, update on public.settlements to authenticated;
grant select, insert, update on public.settlement_lines to authenticated;
grant select on public.notifications to authenticated;

do $$
declare
  table_name text;
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    foreach table_name in array array[
      'payments', 'settlements', 'settlement_lines', 'notifications'
    ]
    loop
      if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = table_name
      ) then
        execute format(
          'alter publication supabase_realtime add table public.%I',
          table_name
        );
      end if;
    end loop;
  end if;
end;
$$;

create or replace function public.is_involved_in_settlement(
  p_settlement_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.settlement_lines line
      join public.payments payment on payment.id = line.payment_id
      where line.settlement_id = p_settlement_id
        and (
          payment.payer_user_id = (select auth.uid())
          or payment.payee_user_id = (select auth.uid())
        )
    );
$$;

revoke all on function public.is_involved_in_settlement(uuid) from public, anon;
grant execute on function public.is_involved_in_settlement(uuid) to authenticated;

drop policy if exists settlements_involved_payment_select on public.settlements;
create policy settlements_involved_payment_select
on public.settlements
for select
to authenticated
using ((select public.is_involved_in_settlement(id)));

drop policy if exists settlement_lines_involved_payment_select on public.settlement_lines;
create policy settlement_lines_involved_payment_select
on public.settlement_lines
for select
to authenticated
using ((select public.is_involved_in_settlement(settlement_id)));

create or replace function public.notify_pending_payment_confirmation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
begin
  if new.confirmation_status <> 'pending_confirmation'
    or new.visibility <> 'shared_with_involved_member'
  then
    return new;
  end if;

  recipient := case
    when new.payer_user_id = new.created_by_user_id then new.payee_user_id
    when new.payee_user_id = new.created_by_user_id then new.payer_user_id
    when new.payer_user_id is distinct from new.created_by_user_id then new.payer_user_id
    else new.payee_user_id
  end;

  if recipient is null or recipient = new.created_by_user_id then
    return new;
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    target_type,
    target_id,
    metadata
  ) values (
    recipient,
    'payment',
    'Payment needs confirmation',
    'A payment was recorded and is waiting for your confirmation.',
    'payment',
    new.id::text,
    jsonb_build_object(
      'paymentRemoteId', new.id,
      'notificationKind', 'confirmation_request'
    )
  );

  return new;
end;
$$;

revoke all on function public.notify_pending_payment_confirmation() from public, anon, authenticated;

drop trigger if exists payments_notify_pending_confirmation on public.payments;
create trigger payments_notify_pending_confirmation
after insert on public.payments
for each row
execute function public.notify_pending_payment_confirmation();

create or replace function public.send_payment_confirmation_reminder(
  p_payment_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_payment public.payments;
  recipient uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authenticated user required';
  end if;

  select *
  into target_payment
  from public.payments
  where id = p_payment_id;

  if not found then
    return false;
  end if;
  if target_payment.created_by_user_id <> (select auth.uid()) then
    raise exception 'Only the payment creator can send a reminder';
  end if;
  if target_payment.confirmation_status <> 'pending_confirmation' then
    raise exception 'Only a pending payment can be reminded';
  end if;

  recipient := case
    when target_payment.payer_user_id = target_payment.created_by_user_id
      then target_payment.payee_user_id
    when target_payment.payee_user_id = target_payment.created_by_user_id
      then target_payment.payer_user_id
    when target_payment.payer_user_id is distinct from target_payment.created_by_user_id
      then target_payment.payer_user_id
    else target_payment.payee_user_id
  end;

  if recipient is null or recipient = target_payment.created_by_user_id then
    raise exception 'Payment counterparty is unavailable';
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    target_type,
    target_id,
    metadata
  ) values (
    recipient,
    'payment',
    'Payment confirmation reminder',
    'A payment is waiting for your confirmation.',
    'payment',
    target_payment.id::text,
    jsonb_build_object(
      'paymentRemoteId', target_payment.id,
      'notificationKind', 'confirmation_reminder'
    )
  );

  return true;
end;
$$;

revoke all on function public.send_payment_confirmation_reminder(uuid) from public, anon;
grant execute on function public.send_payment_confirmation_reminder(uuid) to authenticated;

notify pgrst, 'reload schema';
