-- Confirmation review reminders and recipient notifications.

create or replace function public.request_debt_verification(
  p_debt_id uuid,
  p_responder_user_id uuid,
  p_request_type text default 'creation',
  p_change_summary jsonb default null
)
returns public.debt_verifications
language plpgsql
security definer
set search_path = public
as $$
declare
  debt public.shared_debt_records;
  verification public.debt_verifications;
  request_time timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required';
  end if;
  if p_request_type not in ('creation', 'amendment') then
    raise exception 'Unsupported debt verification request type';
  end if;

  select *
  into debt
  from public.shared_debt_records
  where id = p_debt_id;

  if debt.id is null or not (
    (
      debt.creator_user_id = auth.uid()
      and debt.involved_user_id = p_responder_user_id
    )
    or (
      debt.involved_user_id = auth.uid()
      and debt.creator_user_id = p_responder_user_id
    )
  ) then
    raise exception 'Requester and responder must be participants in the debt';
  end if;

  update public.debt_verifications existing
  set
    status = 'cancelled',
    responded_at = request_time,
    updated_at = request_time
  where existing.debt_id = p_debt_id
    and existing.requester_user_id = auth.uid()
    and existing.status = 'pending'
    and (
      (
        p_request_type = 'creation'
        and existing.request_type = 'creation'
      )
      or (
        p_request_type = 'amendment'
        and existing.request_type = 'amendment'
        and exists (
          select 1
          from jsonb_array_elements_text(
            coalesce(existing.change_summary -> 'changedFields', '[]'::jsonb)
          ) existing_field(value)
          join jsonb_array_elements_text(
            coalesce(p_change_summary -> 'changedFields', '[]'::jsonb)
          ) proposed_field(value)
            on proposed_field.value = existing_field.value
        )
      )
    );

  insert into public.debt_verifications (
    debt_id,
    requester_user_id,
    responder_user_id,
    request_type,
    change_summary,
    status,
    requested_at
  )
  values (
    p_debt_id,
    auth.uid(),
    p_responder_user_id,
    p_request_type,
    p_change_summary,
    'pending',
    request_time
  )
  returning * into verification;

  return verification;
end;
$$;

create or replace function public.send_debt_confirmation_reminder(
  p_verification_id uuid
)
returns public.soft_reminders
language plpgsql
security definer
set search_path = public
as $$
declare
  verification public.debt_verifications;
  debt public.shared_debt_records;
  reminder public.soft_reminders;
begin
  select *
  into verification
  from public.debt_verifications
  where id = p_verification_id;

  if verification.id is null
    or verification.requester_user_id <> auth.uid()
    or verification.status <> 'pending'
  then
    raise exception 'Only the requester can remind a pending confirmation';
  end if;

  select *
  into debt
  from public.shared_debt_records
  where id = verification.debt_id;

  if debt.id is null then
    raise exception 'Shared debt not found';
  end if;

  insert into public.soft_reminders (
    sender_user_id,
    recipient_user_id,
    related_member_id,
    related_record_id,
    message,
    status
  )
  values (
    auth.uid(),
    verification.responder_user_id,
    debt.local_member_reference,
    debt.id::text,
    'A shared debt is waiting for your confirmation.',
    'sent'
  )
  returning * into reminder;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    target_type,
    target_id,
    metadata
  )
  values (
    verification.responder_user_id,
    'verification_request',
    'Debt confirmation reminder',
    debt.title,
    'debt',
    debt.id::text,
    jsonb_build_object(
      'verificationRemoteId', verification.id,
      'requestType', verification.request_type
    )
  );

  return reminder;
end;
$$;

revoke all on function public.send_debt_confirmation_reminder(uuid)
  from public;
grant execute on function public.send_debt_confirmation_reminder(uuid)
  to authenticated;

create or replace function public.respond_to_payment_confirmation(
  p_payment_id uuid,
  p_status text
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  payment public.payments;
begin
  if p_status not in ('confirmed', 'rejected') then
    raise exception 'Unsupported payment confirmation response';
  end if;

  select *
  into payment
  from public.payments
  where id = p_payment_id
  for update;

  if payment.id is null
    or payment.created_by_user_id = auth.uid()
    or auth.uid() not in (payment.payer_user_id, payment.payee_user_id)
    or payment.confirmation_status <> 'pending_confirmation'
  then
    raise exception 'Only the other payment participant can answer this confirmation';
  end if;

  update public.payments
  set
    status = p_status,
    confirmation_status = p_status,
    updated_at = now()
  where id = p_payment_id
  returning * into payment;

  return payment;
end;
$$;

revoke all on function public.respond_to_payment_confirmation(uuid, text)
  from public;
grant execute on function public.respond_to_payment_confirmation(uuid, text)
  to authenticated;

create or replace function public.send_payment_confirmation_reminder(
  p_payment_id uuid
)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  payment public.payments;
  recipient_id uuid;
  notification public.notifications;
begin
  select *
  into payment
  from public.payments
  where id = p_payment_id;

  if payment.id is null
    or payment.created_by_user_id <> auth.uid()
    or payment.confirmation_status <> 'pending_confirmation'
  then
    raise exception 'Only the payment creator can send this reminder';
  end if;

  recipient_id := case
    when payment.payer_user_id = auth.uid() then payment.payee_user_id
    else payment.payer_user_id
  end;

  if recipient_id is null then
    raise exception 'Payment recipient is unavailable';
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    target_type,
    target_id,
    metadata
  )
  values (
    recipient_id,
    'payment',
    'Payment confirmation reminder',
    'A payment is waiting for your confirmation.',
    'payment',
    payment.id::text,
    jsonb_build_object('paymentRemoteId', payment.id)
  )
  returning * into notification;

  return notification;
end;
$$;

revoke all on function public.send_payment_confirmation_reminder(uuid)
  from public;
grant execute on function public.send_payment_confirmation_reminder(uuid)
  to authenticated;

create or replace function public.refresh_shared_debt_confirmation_status(
  p_debt_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  next_status text;
begin
  with verification_items as (
    select
      verification.status,
      verification.requested_at,
      'creation'::text as item_key
    from public.debt_verifications verification
    where verification.debt_id = p_debt_id
      and verification.request_type = 'creation'
      and verification.status <> 'cancelled'

    union all

    select
      verification.status,
      verification.requested_at,
      field.value as item_key
    from public.debt_verifications verification
    cross join lateral jsonb_array_elements_text(
      coalesce(verification.change_summary -> 'changedFields', '[]'::jsonb)
    ) field(value)
    where verification.debt_id = p_debt_id
      and verification.request_type = 'amendment'
      and verification.status <> 'cancelled'
      and field.value in ('amount', 'direction', 'dueDate')
  ),
  latest_verifications as (
    select distinct on (item_key)
      item_key,
      status
    from verification_items
    order by item_key, requested_at desc
  ),
  payment_states as (
    select payment.confirmation_status as status
    from public.settlement_lines line
    join public.payments payment on payment.id = line.payment_id
    where line.source_record_type = 'simple_debt'
      and line.source_record_id = p_debt_id::text
  ),
  confirmation_states as (
    select status from latest_verifications
    union all
    select status from payment_states
  )
  select case
    when bool_or(status in ('rejected', 'disputed')) then 'rejected'
    when bool_or(status in ('pending', 'pending_confirmation')) then 'pending'
    else 'verified'
  end
  into next_status
  from confirmation_states;

  if next_status is not null then
    update public.shared_debt_records
    set
      verification_status = next_status,
      updated_at = now()
    where id = p_debt_id;
  end if;
end;
$$;

create or replace function public.refresh_confirmation_status_from_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  debt_id uuid;
  source_id text;
begin
  if tg_table_name = 'debt_verifications' then
    debt_id := coalesce(new.debt_id, old.debt_id);
  elsif tg_table_name = 'settlement_lines' then
    source_id := coalesce(new.source_record_id, old.source_record_id);
    if coalesce(new.source_record_type, old.source_record_type) = 'simple_debt'
      and source_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then
      debt_id := source_id::uuid;
    end if;
  elsif tg_table_name = 'payments' then
    for debt_id in
    select distinct line.source_record_id::uuid
    from public.settlement_lines line
    where line.payment_id = coalesce(new.id, old.id)
      and line.source_record_type = 'simple_debt'
      and line.source_record_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    loop
      perform public.refresh_shared_debt_confirmation_status(debt_id);
    end loop;
    return null;
  end if;

  if debt_id is not null then
    perform public.refresh_shared_debt_confirmation_status(debt_id);
  end if;
  return null;
end;
$$;

drop trigger if exists debt_verifications_refresh_debt_confirmation
  on public.debt_verifications;
create constraint trigger debt_verifications_refresh_debt_confirmation
after insert or update or delete on public.debt_verifications
deferrable initially deferred
for each row execute function public.refresh_confirmation_status_from_item();

drop trigger if exists settlement_lines_refresh_debt_confirmation
  on public.settlement_lines;
create constraint trigger settlement_lines_refresh_debt_confirmation
after insert or update or delete on public.settlement_lines
deferrable initially deferred
for each row execute function public.refresh_confirmation_status_from_item();

drop trigger if exists payments_refresh_debt_confirmation
  on public.payments;
create constraint trigger payments_refresh_debt_confirmation
after insert or update or delete on public.payments
deferrable initially deferred
for each row execute function public.refresh_confirmation_status_from_item();
