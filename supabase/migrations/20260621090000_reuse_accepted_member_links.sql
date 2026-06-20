-- Allow a user who cleared local data to restore a previously accepted link
-- without asking the other participant to approve the same relationship again.
create index if not exists link_requests_accepted_requester_target_idx
  on public.link_requests (requester_user_id, target_user_id)
  where status = 'accepted';

create index if not exists link_requests_accepted_target_requester_idx
  on public.link_requests (target_user_id, requester_user_id)
  where status = 'accepted';

create or replace function public.has_accepted_member_link(p_other_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  with caller as (select auth.uid() as id)
  select
    caller.id is not null
    and p_other_user_id is not null
    and p_other_user_id <> caller.id
    and exists (
      select 1
      from public.link_requests request
      where request.status = 'accepted'
        and (
          (request.requester_user_id = caller.id and request.target_user_id = p_other_user_id)
          or
          (request.target_user_id = caller.id and request.requester_user_id = p_other_user_id)
        )
    )
  from caller;
$$;

revoke all on function public.has_accepted_member_link(uuid) from public, anon;
grant execute on function public.has_accepted_member_link(uuid) to authenticated;
