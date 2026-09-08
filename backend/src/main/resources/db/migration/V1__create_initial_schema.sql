create extension if not exists pgcrypto;


-- ============================================================================
-- Currencies
-- ============================================================================

create table public.currencies (
    code text primary key,
    name text not null,
    symbol text not null,
    decimal_places smallint not null default 2,

    constraint currencies_code_format
        check (code ~ '^[A-Z]{3}$'),

    constraint currencies_name_not_empty
        check (char_length(trim(name)) > 0),

    constraint currencies_symbol_not_empty
        check (char_length(trim(symbol)) > 0),

    constraint currencies_decimal_places_range
        check (decimal_places between 0 and 6)
);

insert into public.currencies (
    code,
    name,
    symbol,
    decimal_places
)
values
    ('AUD', 'Australian Dollar', 'A$', 2),
    ('EUR', 'Euro', '€', 2),
    ('GBP', 'British Pound', '£', 2),
    ('SEK', 'Swedish Krona', 'kr', 2),
    ('USD', 'US Dollar', '$', 2);


-- ============================================================================
-- Debt direction
-- ============================================================================

create type public.debt_direction as enum (
    'you_owe',
    'they_owe'
);


-- ============================================================================
-- Profiles
-- ============================================================================

create table public.profiles (
    user_id uuid primary key
        references auth.users(id)
        on delete cascade,

    display_name text,

    base_currency text not null default 'SEK'
        references public.currencies(code)
        on update cascade
        on delete restrict,

    created_at timestamptz not null,
    updated_at timestamptz not null,

    constraint profiles_display_name_length
        check (
            display_name is null
            or char_length(trim(display_name)) between 1 and 120
        )
);


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


-- ============================================================================
-- Debts
-- ============================================================================

create table public.debts (
    id uuid primary key,

    owner_user_id uuid not null
        references auth.users(id)
        on delete cascade,

    member_id uuid not null,

    direction public.debt_direction not null,

    amount numeric(19, 2) not null,

    currency text not null
        references public.currencies(code)
        on update cascade
        on delete restrict,

    title text not null,

    due_date date,

    created_at timestamptz not null,
    updated_at timestamptz not null,

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