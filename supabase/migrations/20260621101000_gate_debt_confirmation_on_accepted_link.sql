-- Simple debts may only be shared once both users have an accepted member
-- link. Local clients retain pre-link debts and publish them after acceptance.
create or replace function public.has_accepted_link_between(
  p_first_user_id uuid,
  p_second_user_id uuid
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select p_first_user_id is not null
    and p_second_user_id is not null
    and p_first_user_id <> p_second_user_id
    and auth.uid() in (p_first_user_id, p_second_user_id)
    and exists (
      select 1
      from public.link_requests request
      where request.status = 'accepted'
        and (
          (request.requester_user_id = p_first_user_id and request.target_user_id = p_second_user_id)
          or
          (request.requester_user_id = p_second_user_id and request.target_user_id = p_first_user_id)
        )
    );
$$;

create index if not exists link_requests_accepted_users_idx
on public.link_requests (requester_user_id, target_user_id)
where status = 'accepted';

revoke all on function public.has_accepted_link_between(uuid, uuid) from public, anon;
grant execute on function public.has_accepted_link_between(uuid, uuid) to authenticated;

drop policy if exists shared_debt_creator_insert on public.shared_debt_records;
create policy shared_debt_creator_insert
on public.shared_debt_records
for insert
to authenticated
with check (
  creator_user_id = auth.uid()
  and public.has_accepted_link_between(auth.uid(), involved_user_id)
);

drop policy if exists shared_debt_involved_update on public.shared_debt_records;
create policy shared_debt_involved_update
on public.shared_debt_records
for update
to authenticated
using (creator_user_id = auth.uid() or involved_user_id = auth.uid())
with check (
  (creator_user_id = auth.uid() or involved_user_id = auth.uid())
  and public.has_accepted_link_between(creator_user_id, involved_user_id)
);

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
declare new_verification public.debt_verifications;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required';
  end if;
  if not public.has_accepted_link_between(auth.uid(), p_responder_user_id) then
    raise exception 'An accepted member link is required for debt confirmation.';
  end if;

  insert into public.debt_verifications (
    debt_id, requester_user_id, responder_user_id, request_type, change_summary, status
  ) values (
    p_debt_id, auth.uid(), p_responder_user_id,
    coalesce(p_request_type, 'creation'), p_change_summary, 'pending'
  ) returning * into new_verification;

  update public.shared_debt_records
  set verification_status = 'pending', updated_at = now()
  where id = p_debt_id
    and (creator_user_id = auth.uid() or involved_user_id = auth.uid());

  return new_verification;
end;
$$;

notify pgrst, 'reload schema';
