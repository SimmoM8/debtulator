-- Profile terminology: account/profile "name" is intentionally not "full name".
drop index if exists public.profiles_discovery_display_name_trgm_idx;

alter table public.profiles
    rename column display_name to name;

alter table public.profiles
    rename column discoverable_by_display_name to discoverable_by_name;

create index profiles_discovery_name_trgm_idx
    on public.profiles
    using gin (lower(name) gin_trgm_ops)
    where member_discovery_enabled = true
      and discoverable_by_name = true
      and name is not null;

alter table public.member_link_requests
    rename column requester_display_name to requester_name;

alter table public.member_link_requests
    rename column target_display_name to target_name;

alter table public.member_link_requests
    rename constraint member_link_requests_requester_display_name_valid
    to member_link_requests_requester_name_valid;

alter table public.member_link_requests
    rename constraint member_link_requests_target_display_name_valid
    to member_link_requests_target_name_valid;

-- V3's trigger body referenced the old profile column name, so replace it
-- atomically as part of the same terminology migration.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (
        user_id,
        name,
        base_currency,
        created_at,
        updated_at
    )
    values (
        new.id,
        null,
        'SEK',
        now(),
        now()
    )
    on conflict (user_id) do nothing;

    return new;
end;
$$;

revoke all privileges
    on function public.handle_new_auth_user()
    from public, anon, authenticated;

-- Requests created by the corrected direct-add flow always have a requester
-- member before the request exists. Cancel any legacy pending rows from the
-- earlier nullable design, then enforce that invariant for all future pending
-- requests without destroying terminal history.
update public.member_link_requests
set status = 'cancelled',
    resolved_at = coalesce(resolved_at, now())
where status = 'pending'
  and requester_member_id is null;

alter table public.member_link_requests
    add constraint member_link_requests_pending_requester_member_required
    check (
        status <> 'pending'
        or requester_member_id is not null
    );

-- A private member may only back one unresolved outgoing link request.
create unique index member_link_requests_pending_member_unique_idx
    on public.member_link_requests (requester_user_id, requester_member_id)
    where status = 'pending'
      and requester_member_id is not null;

-- Agreement state is deliberately separate from the private debt row.
-- Counterparty approval/rejection must never increment the private debt's
-- optimistic-lock version or create an artificial conflict with an offline
-- private edit.

create table public.agreement_requests (
    id uuid primary key,
    requester_user_id uuid not null references auth.users(id) on delete cascade,
    target_user_id uuid not null references auth.users(id) on delete cascade,
    entity_type text not null,
    entity_id uuid not null,
    entity_version bigint not null,
    action text not null,
    payload jsonb,
    status text not null,
    created_at timestamptz not null,
    resolved_at timestamptz,

    constraint agreement_requests_users_different
        check (requester_user_id <> target_user_id),

    constraint agreement_requests_entity_type_valid
        check (char_length(trim(entity_type)) between 1 and 50),

    constraint agreement_requests_action_valid
        check (action in ('create', 'update', 'delete')),

    constraint agreement_requests_status_valid
        check (status in ('pending', 'accepted', 'rejected', 'cancelled', 'superseded'))
);

create unique index agreement_requests_pending_entity_unique_idx
    on public.agreement_requests (requester_user_id, entity_type, entity_id)
    where status = 'pending';

create index agreement_requests_incoming_idx
    on public.agreement_requests (target_user_id, created_at desc);

create index agreement_requests_outgoing_idx
    on public.agreement_requests (requester_user_id, created_at desc);

revoke all privileges on table public.agreement_requests from anon, authenticated;

create table public.agreement_entity_states (
    owner_user_id uuid not null
        references auth.users(id)
        on delete cascade,

    entity_type text not null,

    entity_id uuid not null,

    entity_version bigint not null,

    status text not null,

    latest_request_id uuid
        references public.agreement_requests(id)
        on delete set null,

    updated_at timestamptz not null,

    primary key (owner_user_id, entity_type, entity_id),

    constraint agreement_entity_states_entity_type_valid
        check (char_length(trim(entity_type)) between 1 and 50),

    constraint agreement_entity_states_status_valid
        check (status in ('private', 'pending', 'agreed', 'rejected'))
);

create index agreement_entity_states_owner_status_idx
    on public.agreement_entity_states (
        owner_user_id,
        status,
        updated_at desc
    );

-- Existing debt history predates the agreement model and must remain private,
-- including debts whose members are already linked.
insert into public.agreement_entity_states (
    owner_user_id,
    entity_type,
    entity_id,
    entity_version,
    status,
    latest_request_id,
    updated_at
)
select
    debt.owner_user_id,
    'debt',
    debt.id,
    debt.version,
    'private',
    null,
    now()
from public.debts debt
where debt.deleted_at is null
on conflict (owner_user_id, entity_type, entity_id) do nothing;

revoke all privileges
    on table public.agreement_entity_states
    from anon, authenticated;

