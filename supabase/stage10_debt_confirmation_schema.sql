-- Debt confirmation hardening and amendment review metadata.

alter table public.debt_verifications
  add column if not exists request_type text not null default 'creation'
    check (request_type in ('creation', 'amendment'));

alter table public.debt_verifications
  add column if not exists change_summary jsonb;

drop policy if exists "Involved users can update shared debt verification state"
  on public.shared_debt_records;
drop policy if exists "Creators can update shared debts"
  on public.shared_debt_records;
create policy "Creators can update shared debts"
on public.shared_debt_records for update
using (creator_user_id = auth.uid())
with check (creator_user_id = auth.uid());

drop policy if exists "Requesters can create verification requests"
  on public.debt_verifications;

drop policy if exists "Participants can update verification status"
  on public.debt_verifications;

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

  update public.debt_verifications
  set
    status = 'cancelled',
    responded_at = request_time,
    updated_at = request_time
  where debt_id = p_debt_id
    and requester_user_id = auth.uid()
    and status = 'pending';

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

create or replace function public.respond_to_debt_verification(
  p_verification_id uuid,
  p_status text,
  p_rejection_reason text default null,
  p_suggested_change jsonb default null
)
returns public.debt_verifications
language plpgsql
security definer
set search_path = public
as $$
declare
  verification public.debt_verifications;
  response_time timestamptz := now();
  debt public.shared_debt_records;
  proposed jsonb;
begin
  if p_status not in ('verified', 'rejected') then
    raise exception 'Unsupported debt verification response';
  end if;

  select *
  into verification
  from public.debt_verifications
  where id = p_verification_id
  for update;

  if verification.id is null then
    raise exception 'Debt verification request not found';
  end if;

  if verification.responder_user_id <> auth.uid() then
    raise exception 'Only the designated responder can answer this request';
  end if;

  if verification.status <> 'pending' then
    raise exception 'Debt verification request has already been answered';
  end if;

  select *
  into debt
  from public.shared_debt_records
  where id = verification.debt_id
  for update;

  if debt.id is null or (
    debt.creator_user_id <> auth.uid()
    and debt.involved_user_id <> auth.uid()
  ) then
    raise exception 'Shared debt is not available to this responder';
  end if;

  update public.debt_verifications
  set
    status = p_status,
    rejection_reason = case
      when p_status = 'rejected' then nullif(trim(p_rejection_reason), '')
      else null
    end,
    suggested_change = case
      when p_status = 'rejected' then p_suggested_change
      else null
    end,
    responded_at = response_time,
    updated_at = response_time
  where id = p_verification_id
  returning * into verification;

  proposed := verification.change_summary -> 'proposed';

  update public.shared_debt_records
  set
    amount = case
      when p_status = 'verified'
        and verification.request_type = 'amendment'
        and proposed ? 'amount'
      then (proposed ->> 'amount')::numeric
      else amount
    end,
    title = case
      when p_status = 'verified'
        and verification.request_type = 'amendment'
        and proposed ? 'title'
      then proposed ->> 'title'
      else title
    end,
    due_date = case
      when p_status = 'verified'
        and verification.request_type = 'amendment'
        and proposed ? 'dueDate'
      then nullif(proposed ->> 'dueDate', '')::date
      else due_date
    end,
    direction = case
      when p_status = 'verified'
        and verification.request_type = 'amendment'
        and proposed ? 'direction'
        and verification.requester_user_id = debt.creator_user_id
      then proposed ->> 'direction'
      when p_status = 'verified'
        and verification.request_type = 'amendment'
        and proposed ? 'direction'
        and proposed ->> 'direction' = 'they_owe_me'
      then 'i_owe_them'
      when p_status = 'verified'
        and verification.request_type = 'amendment'
        and proposed ? 'direction'
      then 'they_owe_me'
      else direction
    end,
    verification_status = p_status,
    updated_at = response_time
  where id = verification.debt_id;

  return verification;
end;
$$;

revoke all on function public.respond_to_debt_verification(uuid, text, text, jsonb)
  from public;
grant execute on function public.respond_to_debt_verification(uuid, text, text, jsonb)
  to authenticated;

revoke all on function public.request_debt_verification(uuid, uuid, text, jsonb)
  from public;
grant execute on function public.request_debt_verification(uuid, uuid, text, jsonb)
  to authenticated;
