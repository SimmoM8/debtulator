-- ============================================================================
-- Member linking
--
-- Adds the online, consent-based workflow that connects private ledger members
-- to real Debtulator accounts.
--
-- Existing debts are intentionally untouched by linking and unlinking.
-- Linking identifies the represented person; it does not silently turn
-- historical personal records into collaborative records.
-- ============================================================================


-- ============================================================================
-- Member-linking preference
-- ============================================================================

alter table public.profiles
    add column incoming_member_link_requests_enabled boolean not null default true;


-- ============================================================================
-- Link requests and relationship lifecycle
--
-- requester_member_id is nullable while pending so a user can request a direct
-- linked member without first creating an unlinked member.
--
-- target_member_id is chosen or created only when the target accepts.
--
-- Accepted requests retain both member IDs and later transition to "unlinked"
-- rather than being deleted, preserving relationship history without exposing
-- debt data between users.
-- ============================================================================

create table public.member_link_requests (
    id uuid primary key,

    requester_user_id uuid not null
        references auth.users(id)
        on delete cascade,

    target_user_id uuid not null
        references auth.users(id)
        on delete cascade,

    requester_display_name text not null,

    target_display_name text not null,

    requester_member_id uuid,

    target_member_id uuid,

    status text not null,

    created_at timestamptz not null,

    resolved_at timestamptz,

    unlinked_at timestamptz,

    constraint member_link_requests_users_different
        check (
            requester_user_id <> target_user_id
        ),

    constraint member_link_requests_requester_display_name_valid
        check (
            char_length(trim(requester_display_name)) between 1 and 120
        ),

    constraint member_link_requests_target_display_name_valid
        check (
            char_length(trim(target_display_name)) between 1 and 120
        ),

    constraint member_link_requests_status_valid
        check (
            status in (
                'pending',
                'accepted',
                'rejected',
                'cancelled',
                'unlinked'
            )
        ),

    constraint member_link_requests_requester_member_owned
        foreign key (
            requester_user_id,
            requester_member_id
        )
        references public.members (
            owner_user_id,
            id
        )
        on delete restrict,

    constraint member_link_requests_target_member_owned
        foreign key (
            target_user_id,
            target_member_id
        )
        references public.members (
            owner_user_id,
            id
        )
        on delete restrict,

    constraint member_link_requests_state_shape
        check (
            (
                status = 'pending'
                and target_member_id is null
                and resolved_at is null
                and unlinked_at is null
            )
            or
            (
                status = 'accepted'
                and requester_member_id is not null
                and target_member_id is not null
                and resolved_at is not null
                and unlinked_at is null
            )
            or
            (
                status in ('rejected', 'cancelled')
                and target_member_id is null
                and resolved_at is not null
                and unlinked_at is null
            )
            or
            (
                status = 'unlinked'
                and requester_member_id is not null
                and target_member_id is not null
                and resolved_at is not null
                and unlinked_at is not null
            )
        )
);


-- Only one pending request may exist between the same two users, regardless of
-- which side initiated it.
create unique index member_link_requests_pending_pair_unique_idx
    on public.member_link_requests (
        least(requester_user_id::text, target_user_id::text),
        greatest(requester_user_id::text, target_user_id::text)
    )
    where status = 'pending';


-- Only one active accepted relationship may exist between the same two users.
create unique index member_link_requests_active_pair_unique_idx
    on public.member_link_requests (
        least(requester_user_id::text, target_user_id::text),
        greatest(requester_user_id::text, target_user_id::text)
    )
    where status = 'accepted';


create index member_link_requests_incoming_pending_idx
    on public.member_link_requests (
        target_user_id,
        created_at desc
    )
    where status = 'pending';


create index member_link_requests_outgoing_pending_idx
    on public.member_link_requests (
        requester_user_id,
        created_at desc
    )
    where status = 'pending';


create index member_link_requests_requester_member_active_idx
    on public.member_link_requests (
        requester_user_id,
        requester_member_id
    )
    where status = 'accepted';


create index member_link_requests_target_member_active_idx
    on public.member_link_requests (
        target_user_id,
        target_member_id
    )
    where status = 'accepted';


-- ============================================================================
-- Remote access boundary
-- ============================================================================

revoke all privileges
    on table public.member_link_requests
    from anon, authenticated;
