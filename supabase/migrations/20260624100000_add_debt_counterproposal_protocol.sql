-- A debt has one canonical accepted state plus review-only proposals. A
-- counterproposal closes the incoming proposal and reverses requester and
-- responder without mutating the canonical debt.

alter table public.debt_verifications
add column if not exists supersedes_verification_id uuid
references public.debt_verifications(id) on delete set null;

create index if not exists debt_verifications_pending_debt_users_idx
on public.debt_verifications (debt_id, requester_user_id, responder_user_id, requested_at desc)
where status = 'pending';

create index if not exists debt_verifications_supersedes_idx
on public.debt_verifications (supersedes_verification_id)
where supersedes_verification_id is not null;

alter table public.shared_debt_records
add column if not exists client_generated_id text;

create unique index if not exists shared_debt_records_creator_client_generated_idx
on public.shared_debt_records (creator_user_id, client_generated_id)
where client_generated_id is not null;

grant select on public.link_requests to authenticated;
grant select on public.shared_debt_records to authenticated;
grant select on public.debt_verifications to authenticated;
grant select on public.payments to authenticated;
grant select on public.settlements to authenticated;
grant select on public.settlement_lines to authenticated;
grant select on public.notifications to authenticated;

do $$
declare
  table_name text;
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    foreach table_name in array array[
      'link_requests',
      'shared_debt_records',
      'debt_verifications',
      'payments',
      'settlements',
      'settlement_lines',
      'notifications'
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

create or replace function public.debt_review_fields(
  p_request_type text,
  p_change_summary jsonb
)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case
    when p_request_type = 'creation' then array['creation']::text[]
    else coalesce(
      array(
        select jsonb_array_elements_text(
          coalesce(p_change_summary -> 'changedFields', '[]'::jsonb)
        )
      ),
      array[]::text[]
    )
  end;
$$;

create or replace function public.debt_review_fields_overlap(
  p_first_type text,
  p_first_summary jsonb,
  p_second_type text,
  p_second_summary jsonb
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    p_first_type = 'creation'
    or p_second_type = 'creation'
    or public.debt_review_fields(p_first_type, p_first_summary)
       && public.debt_review_fields(p_second_type, p_second_summary);
$$;

revoke all on function public.debt_review_fields(text, jsonb) from public, anon;
revoke all on function public.debt_review_fields_overlap(text, jsonb, text, jsonb)
from public, anon;
grant execute on function public.debt_review_fields(text, jsonb) to authenticated;
grant execute on function public.debt_review_fields_overlap(text, jsonb, text, jsonb)
to authenticated;

create or replace function public.request_debt_verification(
  p_debt_id uuid,
  p_responder_user_id uuid,
  p_request_type text default 'creation',
  p_change_summary jsonb default null
)
returns public.debt_verifications
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_debt public.shared_debt_records;
  pending_verification public.debt_verifications;
  superseded_id uuid;
  new_verification public.debt_verifications;
begin
  if (select auth.uid()) is null then
    raise exception 'Authenticated user required';
  end if;
  if p_request_type not in ('creation', 'amendment') then
    raise exception 'Invalid debt proposal type';
  end if;
  if not public.has_accepted_link_between((select auth.uid()), p_responder_user_id) then
    raise exception 'An accepted member link is required for debt confirmation.';
  end if;

  select * into target_debt
  from public.shared_debt_records
  where id = p_debt_id
    and (creator_user_id = (select auth.uid()) or involved_user_id = (select auth.uid()))
  for update;
  if target_debt.id is null then
    raise exception 'Shared debt not found or permission denied';
  end if;

  for pending_verification in
    select *
    from public.debt_verifications verification
    where verification.debt_id = p_debt_id
      and verification.status = 'pending'
      and public.debt_review_fields_overlap(
        verification.request_type,
        verification.change_summary,
        p_request_type,
        p_change_summary
      )
    order by verification.requested_at desc
    for update
  loop
    if pending_verification.responder_user_id = (select auth.uid()) then
      raise exception using
        message = 'An incoming proposal already covers this change.',
        detail = pending_verification.id::text,
        hint = 'accept_or_counterproposal';
    end if;
    if pending_verification.requester_user_id = (select auth.uid()) then
      if pending_verification.responder_user_id = p_responder_user_id
        and pending_verification.request_type = p_request_type
        and coalesce(pending_verification.change_summary, 'null'::jsonb)
            = coalesce(p_change_summary, 'null'::jsonb)
      then
        return pending_verification;
      end if;
      update public.debt_verifications
      set status = 'cancelled',
          responded_at = now(),
          updated_at = now()
      where id = pending_verification.id;
      superseded_id := pending_verification.id;
    end if;
  end loop;

  insert into public.debt_verifications (
    debt_id,
    requester_user_id,
    responder_user_id,
    request_type,
    change_summary,
    status,
    supersedes_verification_id
  ) values (
    p_debt_id,
    (select auth.uid()),
    p_responder_user_id,
    p_request_type,
    p_change_summary,
    'pending',
    superseded_id
  ) returning * into new_verification;

  update public.shared_debt_records
  set verification_status = 'pending', updated_at = now()
  where id = p_debt_id;

  return new_verification;
end;
$$;

create or replace function public.counter_debt_verification(
  p_verification_id uuid,
  p_change_summary jsonb,
  p_reason text default null
)
returns public.debt_verifications
language plpgsql
security invoker
set search_path = ''
as $$
declare
  incoming public.debt_verifications;
  counterproposal public.debt_verifications;
begin
  if (select auth.uid()) is null then
    raise exception 'Authenticated user required';
  end if;
  if coalesce(jsonb_array_length(p_change_summary -> 'changedFields'), 0) = 0 then
    raise exception 'A counterproposal must change at least one field';
  end if;

  select * into incoming
  from public.debt_verifications
  where id = p_verification_id
    and responder_user_id = (select auth.uid())
    and status = 'pending'
  for update;
  if incoming.id is null then
    raise exception 'Pending debt proposal not found or permission denied';
  end if;

  update public.debt_verifications
  set status = 'countered',
      rejection_reason = nullif(btrim(p_reason), ''),
      suggested_change = p_change_summary -> 'proposed',
      responded_at = now(),
      updated_at = now()
  where id = incoming.id;

  insert into public.debt_verifications (
    debt_id,
    requester_user_id,
    responder_user_id,
    request_type,
    change_summary,
    status,
    supersedes_verification_id
  ) values (
    incoming.debt_id,
    (select auth.uid()),
    incoming.requester_user_id,
    'amendment',
    p_change_summary,
    'pending',
    incoming.id
  ) returning * into counterproposal;

  update public.shared_debt_records
  set verification_status = 'pending', updated_at = now()
  where id = incoming.debt_id;

  return counterproposal;
end;
$$;

revoke all on function public.request_debt_verification(uuid, uuid, text, jsonb)
from public, anon;
grant execute on function public.request_debt_verification(uuid, uuid, text, jsonb)
to authenticated;
revoke all on function public.counter_debt_verification(uuid, jsonb, text)
from public, anon;
grant execute on function public.counter_debt_verification(uuid, jsonb, text)
to authenticated;

-- Reinstall the responder RPC here as well so databases that received the
-- earlier amendment migration manually also gain status-field application.
create or replace function public.respond_to_debt_verification(
  p_verification_id uuid,
  p_status text,
  p_rejection_reason text default null,
  p_suggested_change jsonb default null
)
returns public.debt_verifications
language plpgsql
security invoker
set search_path = ''
as $$
declare
  updated_verification public.debt_verifications;
  target_debt public.shared_debt_records;
  proposed jsonb;
  proposed_direction text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authenticated user required';
  end if;
  if p_status not in ('verified', 'rejected') then
    raise exception 'Invalid verification response';
  end if;

  update public.debt_verifications
  set status = p_status,
      rejection_reason = case
        when p_status = 'rejected' then nullif(btrim(p_rejection_reason), '')
        else null
      end,
      suggested_change = case
        when p_status = 'rejected' then p_suggested_change
        else null
      end,
      responded_at = now(),
      updated_at = now()
  where id = p_verification_id
    and responder_user_id = (select auth.uid())
    and status = 'pending'
  returning * into updated_verification;
  if updated_verification.id is null then
    raise exception 'Pending debt verification not found or permission denied';
  end if;

  select * into target_debt
  from public.shared_debt_records
  where id = updated_verification.debt_id;
  if target_debt.id is null then
    raise exception 'Shared debt not found';
  end if;

  proposed := coalesce(updated_verification.change_summary -> 'proposed', '{}'::jsonb);
  proposed_direction := nullif(proposed ->> 'direction', '');
  if proposed_direction in ('they_owe_me', 'i_owe_them')
    and updated_verification.requester_user_id <> target_debt.creator_user_id
  then
    proposed_direction := case proposed_direction
      when 'they_owe_me' then 'i_owe_them'
      else 'they_owe_me'
    end;
  end if;

  update public.shared_debt_records
  set amount = case
        when p_status = 'verified'
          and updated_verification.request_type = 'amendment'
          and jsonb_typeof(proposed -> 'amount') = 'number'
          then (proposed ->> 'amount')::numeric
        else amount
      end,
      title = case
        when p_status = 'verified'
          and updated_verification.request_type = 'amendment'
          and nullif(btrim(proposed ->> 'title'), '') is not null
          then btrim(proposed ->> 'title')
        else title
      end,
      due_date = case
        when p_status = 'verified'
          and updated_verification.request_type = 'amendment'
          and proposed ? 'dueDate'
          then nullif(proposed ->> 'dueDate', '')::date
        else due_date
      end,
      direction = case
        when p_status = 'verified'
          and updated_verification.request_type = 'amendment'
          and proposed_direction in ('they_owe_me', 'i_owe_them')
          then proposed_direction
        else direction
      end,
      settlement_status = case
        when p_status = 'verified'
          and updated_verification.request_type = 'amendment'
          and proposed ->> 'status' in ('active', 'archived')
          then proposed ->> 'status'
        else settlement_status
      end,
      verification_status = p_status,
      suggested_change = case
        when p_status = 'rejected' then p_suggested_change
        else null
      end,
      updated_at = now()
  where id = updated_verification.debt_id;

  return updated_verification;
end;
$$;

revoke all on function public.respond_to_debt_verification(uuid, text, text, jsonb)
from public, anon;
grant execute on function public.respond_to_debt_verification(uuid, text, text, jsonb)
to authenticated;

create or replace function public.notify_pending_debt_verification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_debt public.shared_debt_records;
  actor_name text;
begin
  select * into target_debt
  from public.shared_debt_records
  where id = new.debt_id;

  select display_name into actor_name
  from public.profiles
  where id = new.requester_user_id;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    target_type,
    target_id,
    metadata
  ) values (
    new.responder_user_id,
    'verification_request',
    case
      when new.supersedes_verification_id is not null then 'Debt counterproposal'
      when new.request_type = 'amendment' then 'Debt changes need review'
      else 'New debt needs confirmation'
    end,
    'A linked member sent a debt proposal for your review.',
    'debt',
    new.debt_id::text,
    jsonb_build_object(
      'verificationRemoteId', new.id,
      'actorUserId', new.requester_user_id,
      'actorDisplayName', coalesce(actor_name, 'A linked member'),
      'counterpartyUserId', new.responder_user_id,
      'requestType', new.request_type,
      'amount', case
        when jsonb_typeof(new.change_summary -> 'proposed' -> 'amount') = 'number'
          then (new.change_summary -> 'proposed' ->> 'amount')::numeric
        else target_debt.amount
      end,
      'currency', target_debt.currency,
      'direction', coalesce(
        nullif(new.change_summary -> 'proposed' ->> 'direction', ''),
        target_debt.direction
      ),
      'notificationKind', case
        when new.supersedes_verification_id is not null then 'counterproposal'
        else 'confirmation_request'
      end
    )
  );
  return new;
end;
$$;

revoke all on function public.notify_pending_debt_verification()
from public, anon, authenticated;
drop trigger if exists debt_verifications_notify_pending
on public.debt_verifications;
create trigger debt_verifications_notify_pending
after insert on public.debt_verifications
for each row
when (new.status = 'pending')
execute function public.notify_pending_debt_verification();

create or replace function public.notify_debt_verification_response()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_debt public.shared_debt_records;
  actor_name text;
begin
  if new.requester_user_id is null or new.status not in ('verified', 'rejected') then
    return new;
  end if;

  select * into target_debt
  from public.shared_debt_records
  where id = new.debt_id;

  select display_name into actor_name
  from public.profiles
  where id = new.responder_user_id;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    target_type,
    target_id,
    metadata
  ) values (
    new.requester_user_id,
    'verification_result',
    case
      when new.status = 'verified' then 'Debt confirmed'
      else 'Debt rejected'
    end,
    case
      when new.status = 'verified' then 'A linked member confirmed your debt proposal.'
      else 'A linked member rejected your debt proposal.'
    end,
    'debt',
    new.debt_id::text,
    jsonb_build_object(
      'verificationRemoteId', new.id,
      'notificationKind', 'confirmation_response',
      'status', new.status,
      'actorUserId', new.responder_user_id,
      'actorDisplayName', coalesce(actor_name, 'A linked member'),
      'counterpartyUserId', new.requester_user_id,
      'requestType', new.request_type,
      'amount', case
        when jsonb_typeof(new.change_summary -> 'proposed' -> 'amount') = 'number'
          then (new.change_summary -> 'proposed' ->> 'amount')::numeric
        else target_debt.amount
      end,
      'currency', target_debt.currency,
      'direction', coalesce(
        nullif(new.change_summary -> 'proposed' ->> 'direction', ''),
        target_debt.direction
      )
    )
  );

  return new;
end;
$$;

revoke all on function public.notify_debt_verification_response()
from public, anon, authenticated;
drop trigger if exists debt_verifications_notify_response
on public.debt_verifications;
create trigger debt_verifications_notify_response
after update of status on public.debt_verifications
for each row
when (old.status = 'pending' and new.status in ('verified', 'rejected'))
execute function public.notify_debt_verification_response();

create or replace function public.notify_pending_payment_confirmation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
  actor_name text;
begin
  if new.confirmation_status <> 'pending_confirmation' then
    return new;
  end if;

  recipient := case
    when new.created_by_user_id is not null and new.created_by_user_id = new.payer_user_id
      then new.payee_user_id
    when new.created_by_user_id is not null and new.created_by_user_id = new.payee_user_id
      then new.payer_user_id
    else coalesce(new.payee_user_id, new.payer_user_id)
  end;

  if recipient is null or recipient = new.created_by_user_id then
    return new;
  end if;

  select display_name into actor_name
  from public.profiles
  where id = new.created_by_user_id;

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
    'A linked member sent a payment confirmation request.',
    'payment',
    new.id::text,
    jsonb_build_object(
      'paymentRemoteId', new.id,
      'notificationKind', 'payment_confirmation_request',
      'actorUserId', new.created_by_user_id,
      'actorDisplayName', coalesce(actor_name, 'A linked member'),
      'counterpartyUserId', recipient,
      'amount', new.amount,
      'currency', new.currency
    )
  );

  return new;
end;
$$;

revoke all on function public.notify_pending_payment_confirmation()
from public, anon, authenticated;
drop trigger if exists payments_notify_pending_confirmation
on public.payments;
create trigger payments_notify_pending_confirmation
after insert on public.payments
for each row
when (new.confirmation_status = 'pending_confirmation')
execute function public.notify_pending_payment_confirmation();

create or replace function public.notify_payment_confirmation_response()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid;
  actor_name text;
begin
  if new.created_by_user_id is null
    or new.confirmation_status not in ('confirmed', 'rejected')
  then
    return new;
  end if;

  actor_user_id := case
    when new.created_by_user_id = new.payer_user_id then new.payee_user_id
    when new.created_by_user_id = new.payee_user_id then new.payer_user_id
    else coalesce(new.payer_user_id, new.payee_user_id)
  end;

  select display_name into actor_name
  from public.profiles
  where id = actor_user_id;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    target_type,
    target_id,
    metadata
  ) values (
    new.created_by_user_id,
    'payment',
    case
      when new.confirmation_status = 'confirmed' then 'Payment confirmed'
      else 'Payment rejected'
    end,
    case
      when new.confirmation_status = 'confirmed' then 'A linked member confirmed your payment.'
      else 'A linked member rejected your payment.'
    end,
    'payment',
    new.id::text,
    jsonb_build_object(
      'paymentRemoteId', new.id,
      'notificationKind', 'payment_confirmation_response',
      'status', new.confirmation_status,
      'actorUserId', actor_user_id,
      'actorDisplayName', coalesce(actor_name, 'A linked member'),
      'counterpartyUserId', new.created_by_user_id,
      'amount', new.amount,
      'currency', new.currency
    )
  );

  return new;
end;
$$;

revoke all on function public.notify_payment_confirmation_response()
from public, anon, authenticated;
drop trigger if exists payments_notify_confirmation_response
on public.payments;
create trigger payments_notify_confirmation_response
after update of confirmation_status on public.payments
for each row
when (
  old.confirmation_status = 'pending_confirmation'
  and new.confirmation_status in ('confirmed', 'rejected')
)
execute function public.notify_payment_confirmation_response();

notify pgrst, 'reload schema';
