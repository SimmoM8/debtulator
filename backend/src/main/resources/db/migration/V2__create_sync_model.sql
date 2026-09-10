-- ============================================================================
-- Debtulator sync model
--
-- Adds:
--   - optimistic entity versioning
--   - soft-delete tombstones
--   - durable mutation idempotency
--   - sync change-stream retention metadata
--   - backend-only application-table access
-- ============================================================================


-- ============================================================================
-- Entity versioning
--
-- Existing V1 rows are initialized at version 0. The temporary defaults are
-- removed immediately afterward so application persistence remains
-- responsible for entity version values going forward.
-- ============================================================================

alter table public.members
    add column version bigint not null default 0;

alter table public.debts
    add column version bigint not null default 0;

alter table public.members
    alter column version drop default;

alter table public.debts
    alter column version drop default;


-- ============================================================================
-- Tombstones
--
-- Synchronized deletes are represented as soft deletes on the server so that
-- deletion can be propagated reliably to other devices without immediately
-- destroying remote referential or historical state.
-- ============================================================================

alter table public.members
    add column deleted_at timestamptz;

alter table public.debts
    add column deleted_at timestamptz;


create index members_owner_active_idx
    on public.members (
        owner_user_id,
        id
    )
    where deleted_at is null;


create index debts_owner_active_idx
    on public.debts (
        owner_user_id,
        id
    )
    where deleted_at is null;


-- ============================================================================
-- Debt direction
--
-- Keep direction integrity in PostgreSQL through a declarative CHECK
-- constraint while allowing JPA to map the value as a normal string enum.
-- ============================================================================

alter table public.debts
    alter column direction type text
    using direction::text;

drop type public.debt_direction;

alter table public.debts
    add constraint debts_direction_valid
        check (
            direction in ('you_owe', 'they_owe')
        );


-- ============================================================================
-- Processed sync mutations
--
-- Each client-generated mutation ID identifies one logical client operation.
--
-- Successfully processed mutations and deterministic business-level failures
-- are retained so retries can return the original outcome without applying the
-- operation again.
--
-- A mutation is intentionally NOT linked to a single sync_changes row because
-- one logical operation may produce zero, one, or multiple replicated changes.
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
-- Sync change-stream metadata
--
-- retained_from_sequence represents the oldest cursor from which incremental
-- synchronization remains valid.
--
-- It begins at zero because no pruning/compaction policy exists yet.
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
-- Remote database access boundary
--
-- Debtulator application data is accessed through the backend API.
-- Authenticated mobile clients must not directly read or mutate these tables
-- through the Supabase Data API.
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