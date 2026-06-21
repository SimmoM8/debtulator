-- An accepted link may hydrate the other user's display name and email. Phone
-- remains private and is deliberately excluded from this function.
create or replace function public.get_accepted_linked_member_profile(
  p_linked_user_id uuid
)
returns table (
  display_name text,
  email text,
  avatar_url text
)
language sql
security definer
set search_path = ''
stable
as $$
  with caller as (select auth.uid() as id)
  select profile.display_name, profile.email, profile.avatar_url
  from caller
  join public.profiles profile on profile.id = p_linked_user_id
  where caller.id is not null
    and p_linked_user_id <> caller.id
    and exists (
      select 1
      from public.link_requests request
      where request.status = 'accepted'
        and (
          (request.requester_user_id = caller.id and request.target_user_id = p_linked_user_id)
          or
          (request.target_user_id = caller.id and request.requester_user_id = p_linked_user_id)
        )
    )
  limit 1;
$$;

revoke all on function public.get_accepted_linked_member_profile(uuid) from public, anon;
grant execute on function public.get_accepted_linked_member_profile(uuid) to authenticated;

notify pgrst, 'reload schema';
