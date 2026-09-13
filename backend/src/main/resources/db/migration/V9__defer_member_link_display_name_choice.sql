alter table public.member_link_requests
    add column requester_use_target_name boolean not null default false;
