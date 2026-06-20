-- requester_label must identify the person sending the request, not the local
-- name they assigned to the target member. Derive it from requester_user_id so
-- clients cannot accidentally or deliberately misidentify the requester.
create or replace function public.set_link_request_requester_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  authenticated_user_id uuid := auth.uid();
  authoritative_name text;
begin
  if authenticated_user_id is not null then
    new.requester_user_id := authenticated_user_id;
  end if;

  select profile.display_name
  into authoritative_name
  from public.profiles profile
  where profile.id = new.requester_user_id;

  new.requester_label := coalesce(
    nullif(trim(authoritative_name), ''),
    nullif(trim(new.requester_label), ''),
    'Debtulator user'
  );
  return new;
end;
$$;

revoke all on function public.set_link_request_requester_identity() from public, anon, authenticated;

drop trigger if exists set_link_request_requester_identity on public.link_requests;
create trigger set_link_request_requester_identity
  before insert on public.link_requests
  for each row execute function public.set_link_request_requester_identity();

-- Repair requests created before requester identity was derived server-side.
update public.link_requests request
set requester_label = profile.display_name,
    updated_at = now()
from public.profiles profile
where profile.id = request.requester_user_id
  and request.requester_label is distinct from profile.display_name;

-- Only the actual target account can respond. Identity comes from the JWT;
-- target_user_id is never accepted from the client.
create or replace function public.respond_to_member_link_request(
  p_request_id uuid,
  p_status text
)
returns public.link_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_email text := auth.jwt() ->> 'email';
  caller_phone text := auth.jwt() ->> 'phone';
  request_row public.link_requests;
begin
  if caller_id is null then
    raise exception 'Authentication required.';
  end if;
  if p_status not in ('accepted', 'rejected') then
    raise exception 'Invalid link request response.';
  end if;

  select * into request_row
  from public.link_requests request
  where request.id = p_request_id
  for update;

  if request_row.id is null then
    raise exception 'Link request not found.';
  end if;
  if request_row.status <> 'pending' then
    raise exception 'Link request has already been handled.';
  end if;
  if not (
    request_row.target_user_id = caller_id
    or (
      request_row.target_user_id is null
      and request_row.target_email is not null
      and lower(request_row.target_email) = lower(coalesce(caller_email, ''))
    )
    or (
      request_row.target_user_id is null
      and request_row.target_phone is not null
      and request_row.target_phone = coalesce(caller_phone, '')
    )
  ) then
    raise exception 'Only the target user can respond to this link request.';
  end if;

  update public.link_requests
  set status = p_status,
      target_user_id = caller_id,
      updated_at = now()
  where id = p_request_id
  returning * into request_row;

  return request_row;
end;
$$;

revoke all on function public.respond_to_member_link_request(uuid, text) from public, anon;
grant execute on function public.respond_to_member_link_request(uuid, text) to authenticated;

-- All responses must pass through the identity-validating function above.
drop policy if exists link_requests_relevant_update on public.link_requests;
