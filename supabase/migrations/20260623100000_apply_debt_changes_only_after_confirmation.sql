-- Pending amendments remain review-only for the responder. Apply their
-- proposed financial fields to the canonical debt only after that responder
-- explicitly verifies the request.

-- The baseline recreates these tables after Supabase's default grants. RLS
-- remains the row-level authorization boundary for all three operations.
grant select, insert, update on public.shared_debt_records to authenticated;
grant select, insert, update on public.debt_verifications to authenticated;

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

  select *
  into target_debt
  from public.shared_debt_records
  where id = updated_verification.debt_id;

  if target_debt.id is null then
    raise exception 'Shared debt not found';
  end if;

  proposed := coalesce(
    updated_verification.change_summary -> 'proposed',
    '{}'::jsonb
  );
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

create or replace function public.respond_to_payment_confirmation(
  p_payment_id uuid,
  p_status text
)
returns public.payments
language plpgsql
security invoker
set search_path = ''
as $$
declare
  updated_payment public.payments;
begin
  if (select auth.uid()) is null then
    raise exception 'Authenticated user required';
  end if;
  if p_status not in ('confirmed', 'rejected') then
    raise exception 'Invalid payment confirmation response';
  end if;

  update public.payments
  set confirmation_status = p_status,
      status = p_status,
      updated_at = now()
  where id = p_payment_id
    and confirmation_status = 'pending_confirmation'
    and created_by_user_id is distinct from (select auth.uid())
    and (
      payer_user_id = (select auth.uid())
      or payee_user_id = (select auth.uid())
    )
  returning * into updated_payment;

  if updated_payment.id is null then
    raise exception 'Pending payment confirmation not found or permission denied';
  end if;

  return updated_payment;
end;
$$;

revoke all on function public.respond_to_payment_confirmation(uuid, text)
from public, anon;
grant execute on function public.respond_to_payment_confirmation(uuid, text)
to authenticated;

notify pgrst, 'reload schema';
