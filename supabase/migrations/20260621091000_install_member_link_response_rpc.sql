-- Forward-only repair for projects where the identity migration was applied
-- before the response RPC was added to that historical migration file.
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

-- Responses must use the identity-validating function rather than direct table
-- updates that accept a client-supplied target user id.
drop policy if exists link_requests_relevant_update on public.link_requests;

notify pgrst, 'reload schema';
