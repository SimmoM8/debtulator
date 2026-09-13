-- Debtulator remote PostgreSQL / Supabase schema
-- Effective schema after Flyway migrations V1 through V7.
--
-- Consolidated from:
--   V1__create_initial_schema.sql
--   V2__create_sync_model.sql
--   V3__create_auth_profile_provisioning.sql
--   V4__enhance_currency_catalog.sql
--   V5__create_user_discovery.sql
--   V6__create_member_linking.sql
--   V7__harden_linking_and_create_agreements.sql
--
-- This is a current-schema snapshot for a fresh deployment. Historical ALTER,
-- RENAME, DROP TYPE, and table-rebuild steps have been folded into the final
-- object definitions.
--
-- External Supabase dependencies:
--   - auth.users
--   - roles: anon, authenticated


-- ============================================================================
-- Extensions
-- ============================================================================

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;


-- ============================================================================
-- Currencies
-- ============================================================================

create table public.currencies (
    code text primary key,
    name text not null,
    symbol text not null,
    decimal_places smallint not null default 2,
    enabled boolean not null default false,
    display_order integer not null,

    constraint currencies_code_format
        check (code ~ '^[A-Z]{3}$'),

    constraint currencies_name_not_empty
        check (char_length(trim(name)) > 0),

    constraint currencies_symbol_not_empty
        check (char_length(trim(symbol)) > 0),

    constraint currencies_decimal_places_range
        check (decimal_places between 0 and 8),

    constraint currencies_display_order_non_negative
        check (display_order >= 0)
);

insert into public.currencies (
    code,
    name,
    symbol,
    decimal_places,
    enabled,
    display_order
)
values
    ('AUD', 'Australian Dollar', 'A$', 2, true, 10),
    ('EUR', 'Euro', '€', 2, true, 20),
    ('GBP', 'British Pound', '£', 2, true, 30),
    ('SEK', 'Swedish Krona', 'kr', 2, true, 40),
    ('USD', 'US Dollar', '$', 2, true, 50);

create index currencies_enabled_display_order_idx
    on public.currencies (
        display_order,
        code
    )
    where enabled = true;


-- ============================================================================
-- Profiles
-- ============================================================================

create table public.profiles (
    user_id uuid primary key
        references auth.users(id)
        on delete cascade,

    name text,

    base_currency text not null default 'SEK'
        references public.currencies(code)
        on update cascade
        on delete restrict,

    created_at timestamptz not null,
    updated_at timestamptz not null,

    member_discovery_enabled boolean not null default false,
    discoverable_by_name boolean not null default true,
    discoverable_by_email boolean not null default false,
    incoming_member_link_requests_enabled boolean not null default true,

    -- Constraint name is preserved from V1. PostgreSQL retained the name when
    -- V7 renamed display_name to name.
    constraint profiles_display_name_length
        check (
            name is null
            or char_length(trim(name)) between 1 and 120
        )
);

create index profiles_discovery_name_trgm_idx
    on public.profiles
    using gin (
        lower(name) gin_trgm_ops
    )
    where member_discovery_enabled = true
      and discoverable_by_name = true
      and name is not null;


-- ============================================================================
-- Members
-- ============================================================================

create table public.members (
    id uuid primary key,

    owner_user_id uuid not null
        references auth.users(id)
        on delete cascade,

    display_name text not null,

    linked_user_id uuid
        references auth.users(id)
        on delete set null,

    created_at timestamptz not null,
    updated_at timestamptz not null,

    version bigint not null,
    deleted_at timestamptz,

    constraint members_display_name_not_empty
        check (char_length(trim(display_name)) > 0),

    constraint members_display_name_length
        check (char_length(display_name) <= 120),

    constraint members_not_linked_to_owner
        check (
            linked_user_id is null
            or linked_user_id <> owner_user_id
        ),

    constraint members_owner_id_unique
        unique (
            owner_user_id,
            id
        )
);

create index members_owner_user_id_idx
    on public.members (
        owner_user_id
    );

create index members_owner_display_name_idx
    on public.members (
        owner_user_id,
        display_name
    );

create unique index members_owner_linked_user_unique_idx
    on public.members (
        owner_user_id,
        linked_user_id
    )
    where linked_user_id is not null;

create index members_owner_active_idx
    on public.members (
        owner_user_id,
        id
    )
    where deleted_at is null;


-- ============================================================================
-- Debts
-- ============================================================================

create table public.debts (
    id uuid primary key,

    owner_user_id uuid not null
        references auth.users(id)
        on delete cascade,

    member_id uuid not null,

    direction text not null,

    amount numeric(38, 8) not null,

    currency text not null
        references public.currencies(code)
        on update cascade
        on delete restrict,

    title text not null,

    due_date date,

    created_at timestamptz not null,
    updated_at timestamptz not null,

    version bigint not null,
    deleted_at timestamptz,

    constraint debts_direction_valid
        check (
            direction in ('you_owe', 'they_owe')
        ),

    constraint debts_amount_positive
        check (amount > 0),

    constraint debts_title_length
        check (char_length(title) <= 120),

    constraint debts_member_owned_by_same_user
        foreign key (
            owner_user_id,
            member_id
        )
        references public.members (
            owner_user_id,
            id
        )
        on delete restrict
);

create index debts_owner_user_id_idx
    on public.debts (
        owner_user_id
    );

create index debts_member_id_idx
    on public.debts (
        member_id
    );

create index debts_owner_created_at_idx
    on public.debts (
        owner_user_id,
        created_at desc
    );

create index debts_owner_due_date_idx
    on public.debts (
        owner_user_id,
        due_date
    )
    where due_date is not null;

create index debts_owner_active_idx
    on public.debts (
        owner_user_id,
        id
    )
    where deleted_at is null;


-- ============================================================================
-- Sync changes
-- ============================================================================

create table public.sync_changes (
    sequence bigint generated always as identity primary key,

    owner_user_id uuid not null
        references auth.users(id)
        on delete cascade,

    entity_type text not null,

    entity_id uuid not null,

    operation text not null,

    payload jsonb,

    changed_at timestamptz not null,

    constraint sync_changes_entity_type_valid
        check (
            entity_type in ('member', 'debt')
        ),

    constraint sync_changes_operation_valid
        check (
            operation in ('upsert', 'delete')
        ),

    constraint sync_changes_payload_valid
        check (
            (
                operation = 'upsert'
                and payload is not null
            )
            or
            (
                operation = 'delete'
                and payload is null
            )
        )
);

create index sync_changes_owner_sequence_idx
    on public.sync_changes (
        owner_user_id,
        sequence
    );


-- ============================================================================
-- Processed sync mutations
-- ============================================================================

create table public.sync_mutations (
    id uuid primary key,

    owner_user_id uuid not null
        references auth.users(id)
        on delete cascade,

    entity_type text not null,

    entity_id uuid not null,

    operation text not null,

    request_hash text not null,

    payload jsonb,

    base_version bigint,

    status text not null,

    result_version bigint,

    error_code text,

    error_message text,

    processed_at timestamptz not null,

    constraint sync_mutations_entity_type_valid
        check (
            entity_type in ('member', 'debt')
        ),

    constraint sync_mutations_operation_valid
        check (
            operation in ('upsert', 'delete')
        ),

    constraint sync_mutations_request_hash_length
        check (
            char_length(request_hash) = 64
        ),

    constraint sync_mutations_status_valid
        check (
            status in ('applied', 'conflict', 'rejected')
        ),

    constraint sync_mutations_base_version_valid
        check (
            status = 'rejected'
            or base_version is null
            or base_version >= 0
        ),

    constraint sync_mutations_result_version_valid
        check (
            result_version is null
            or result_version >= 0
        ),

    constraint sync_mutations_error_shape_valid
        check (
            (
                status = 'applied'
                and error_code is null
                and error_message is null
            )
            or
            (
                status in ('conflict', 'rejected')
                and error_code is not null
            )
        ),

    constraint sync_mutations_payload_valid
        check (
            status = 'rejected'
            or (
                operation = 'upsert'
                and payload is not null
            )
            or (
                operation = 'delete'
                and payload is null
            )
        )
);

create index sync_mutations_owner_processed_at_idx
    on public.sync_mutations (
        owner_user_id,
        processed_at
    );


-- ============================================================================
-- Sync metadata
-- ============================================================================

create table public.sync_metadata (
    id smallint primary key,

    retained_from_sequence bigint not null,

    constraint sync_metadata_singleton
        check (
            id = 1
        ),

    constraint sync_metadata_retained_from_sequence_valid
        check (
            retained_from_sequence >= 0
        )
);

insert into public.sync_metadata (
    id,
    retained_from_sequence
)
values (
    1,
    0
);


-- ============================================================================
-- Auth profile provisioning
-- ============================================================================

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

-- Backfill profiles for Supabase Auth users that may already exist before this
-- application schema snapshot is installed.
insert into public.profiles (
    user_id,
    name,
    base_currency,
    created_at,
    updated_at
)
select
    users.id,
    null,
    'SEK',
    now(),
    now()
from auth.users users
where not exists (
    select 1
    from public.profiles profile
    where profile.user_id = users.id
);

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();


-- ============================================================================
-- User discovery
-- ============================================================================

create view public.user_discovery_auth_accounts
with (security_barrier = true)
as
select
    users.id as user_id,
    users.email
from auth.users users;

create table public.user_discovery_rate_limits (
    user_id uuid primary key
        references auth.users(id)
        on delete cascade,

    window_started_at timestamptz not null,

    request_count integer not null,

    constraint user_discovery_rate_limits_request_count_positive
        check (
            request_count > 0
        )
);


-- ============================================================================
-- Member linking
-- ============================================================================

create table public.member_link_requests (
    id uuid primary key,

    requester_user_id uuid not null
        references auth.users(id)
        on delete cascade,

    target_user_id uuid not null
        references auth.users(id)
        on delete cascade,

    requester_name text not null,

    target_name text not null,

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

    constraint member_link_requests_requester_name_valid
        check (
            char_length(trim(requester_name)) between 1 and 120
        ),

    constraint member_link_requests_target_name_valid
        check (
            char_length(trim(target_name)) between 1 and 120
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
        ),

    constraint member_link_requests_pending_requester_member_required
        check (
            status <> 'pending'
            or requester_member_id is not null
        )
);

create unique index member_link_requests_pending_pair_unique_idx
    on public.member_link_requests (
        least(requester_user_id::text, target_user_id::text),
        greatest(requester_user_id::text, target_user_id::text)
    )
    where status = 'pending';

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

create unique index member_link_requests_pending_member_unique_idx
    on public.member_link_requests (
        requester_user_id,
        requester_member_id
    )
    where status = 'pending'
      and requester_member_id is not null;


-- ============================================================================
-- Agreement requests
-- ============================================================================

create table public.agreement_requests (
    id uuid primary key,

    requester_user_id uuid not null
        references auth.users(id)
        on delete cascade,

    target_user_id uuid not null
        references auth.users(id)
        on delete cascade,

    entity_type text not null,

    entity_id uuid not null,

    entity_version bigint not null,

    action text not null,

    payload jsonb,

    status text not null,

    created_at timestamptz not null,

    resolved_at timestamptz,

    constraint agreement_requests_users_different
        check (
            requester_user_id <> target_user_id
        ),

    constraint agreement_requests_entity_type_valid
        check (
            char_length(trim(entity_type)) between 1 and 50
        ),

    constraint agreement_requests_action_valid
        check (
            action in ('create', 'update', 'delete')
        ),

    constraint agreement_requests_status_valid
        check (
            status in (
                'pending',
                'accepted',
                'rejected',
                'cancelled',
                'superseded'
            )
        )
);

create unique index agreement_requests_pending_entity_unique_idx
    on public.agreement_requests (
        requester_user_id,
        entity_type,
        entity_id
    )
    where status = 'pending';

create index agreement_requests_incoming_idx
    on public.agreement_requests (
        target_user_id,
        created_at desc
    );

create index agreement_requests_outgoing_idx
    on public.agreement_requests (
        requester_user_id,
        created_at desc
    );


-- ============================================================================
-- Agreement entity states
-- ============================================================================

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

    primary key (
        owner_user_id,
        entity_type,
        entity_id
    ),

    constraint agreement_entity_states_entity_type_valid
        check (
            char_length(trim(entity_type)) between 1 and 50
        ),

    constraint agreement_entity_states_status_valid
        check (
            status in ('private', 'pending', 'agreed', 'rejected')
        )
);

create index agreement_entity_states_owner_status_idx
    on public.agreement_entity_states (
        owner_user_id,
        status,
        updated_at desc
    );


-- ============================================================================
-- Existing-debt agreement-state backfill
--
-- Harmless on a fresh deployment; retained because V7 establishes this as the
-- required state for debt rows that predate the agreement model.
-- ============================================================================

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
on conflict (
    owner_user_id,
    entity_type,
    entity_id
) do nothing;


-- ============================================================================
-- Remote database access boundary
--
-- Application data is accessed through the backend API. Supabase mobile roles
-- must not directly read or mutate application tables/views.
-- ============================================================================

revoke all privileges
    on table public.currencies
    from anon, authenticated;

revoke all privileges
    on table public.profiles
    from anon, authenticated;

revoke all privileges
    on table public.members
    from anon, authenticated;

revoke all privileges
    on table public.debts
    from anon, authenticated;

revoke all privileges
    on table public.sync_changes
    from anon, authenticated;

revoke all privileges
    on table public.sync_mutations
    from anon, authenticated;

revoke all privileges
    on table public.sync_metadata
    from anon, authenticated;

revoke all privileges
    on sequence public.sync_changes_sequence_seq
    from anon, authenticated;

revoke all privileges
    on table public.user_discovery_auth_accounts
    from public, anon, authenticated;

revoke all privileges
    on table public.user_discovery_rate_limits
    from anon, authenticated;

revoke all privileges
    on table public.member_link_requests
    from anon, authenticated;

revoke all privileges
    on table public.agreement_requests
    from anon, authenticated;

revoke all privileges
    on table public.agreement_entity_states
    from anon, authenticated;
