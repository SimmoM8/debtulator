-- ============================================================================
-- Debtulator
-- Initial remote database schema
--
-- Core model only:
--   auth.users
--   public.currencies
--   public.profiles
--   public.members
--   public.debts
--
-- Collaboration, member linking, verification, groups, payments, settlements,
-- reminders, lifecycle/status tracking, notes, etc. are deliberately excluded
-- from this baseline.
-- ============================================================================


-- ============================================================================
-- Extensions
-- ============================================================================

create extension if not exists pgcrypto;


-- ============================================================================
-- Shared functions
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();

  return new;
end;
$$;


-- ============================================================================
-- Currencies
--
-- Canonical source of truth for currencies supported by Debtulator.
--
-- Profiles and debts reference this table rather than maintaining their own
-- currency CHECK constraints.
--
-- The data can later be populated/synchronised from an external ISO-4217
-- source without changing the profile or debt schemas.
-- ============================================================================

create table public.currencies (
  code text primary key,

  name text not null,

  symbol text not null,

  decimal_places smallint not null default 2,

  constraint currencies_code_format
    check (
      code ~ '^[A-Z]{3}$'
    ),

  constraint currencies_name_not_empty
    check (
      char_length(trim(name)) > 0
    ),

  constraint currencies_symbol_not_empty
    check (
      char_length(trim(symbol)) > 0
    ),

  constraint currencies_decimal_places_range
    check (
      decimal_places between 0 and 6
    )
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
-- Domain types
-- ============================================================================

create type public.debt_direction as enum (
  'you_owe',
  'they_owe'
);


-- ============================================================================
-- Profiles
--
-- auth.users owns authentication identity.
--
-- public.profiles contains Debtulator-specific account data.
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

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint profiles_display_name_length
    check (
      display_name is null
      or char_length(trim(display_name)) between 1 and 120
    )
);


create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();


-- ============================================================================
-- Members
--
-- A member is a person in one user's personal ledger.
--
-- A member is deliberately NOT the same thing as a Debtulator account.
--
-- In the future a member may gain a nullable linked_user_id/reference without
-- changing its identity. This allows a personal member created locally today
-- to later become associated with a real Debtulator user without rebuilding
-- debts that already reference that member.
-- ============================================================================

create table public.members (
  id uuid primary key default gen_random_uuid(),

  owner_user_id uuid not null
    references auth.users(id)
    on delete cascade,

  display_name text not null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint members_display_name_not_empty
    check (
      char_length(trim(display_name)) > 0
    ),

  constraint members_display_name_length
    check (
      char_length(display_name) <= 120
    ),

  /*
   * The primary key already guarantees id is globally unique.
   *
   * This additional unique constraint exists specifically so debts can use a
   * composite foreign key on (owner_user_id, member_id).
   *
   * PostgreSQL therefore guarantees that a debt can only reference a member
   * belonging to the same owner.
   */
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


create trigger members_set_updated_at
before update on public.members
for each row
execute function public.set_updated_at();


-- ============================================================================
-- Debts
--
-- Every debt belongs to one account and one of that account's members.
--
-- All debts are persisted regardless of whether the member may eventually
-- become linked to another Debtulator user.
--
-- Linking and verification are separate collaboration concerns that can be
-- layered on top of this model later.
--
-- created_at is the canonical debt creation timestamp.
-- ============================================================================

create table public.debts (
  id uuid primary key default gen_random_uuid(),

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

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint debts_amount_positive
    check (
      amount > 0
    ),

  constraint debts_title_not_empty
    check (
      char_length(trim(title)) > 0
    ),

  constraint debts_title_length
    check (
      char_length(title) <= 120
    ),

  /*
   * A debt owned by user A must reference a member also owned by user A.
   *
   * This protects the ownership relationship at the database level rather
   * than relying solely on application code or RLS.
   */
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


create trigger debts_set_updated_at
before update on public.debts
for each row
execute function public.set_updated_at();


-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.currencies enable row level security;

alter table public.profiles enable row level security;

alter table public.members enable row level security;

alter table public.debts enable row level security;


-- ============================================================================
-- Currency policies
-- ============================================================================

create policy "currencies_select_all_authenticated"
on public.currencies
for select
to authenticated
using (
  true
);


-- ============================================================================
-- Profile policies
-- ============================================================================

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (
  user_id = (select auth.uid())
);


create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (
  user_id = (select auth.uid())
);


create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (
  user_id = (select auth.uid())
)
with check (
  user_id = (select auth.uid())
);


-- ============================================================================
-- Member policies
-- ============================================================================

create policy "members_select_own"
on public.members
for select
to authenticated
using (
  owner_user_id = (select auth.uid())
);


create policy "members_insert_own"
on public.members
for insert
to authenticated
with check (
  owner_user_id = (select auth.uid())
);


create policy "members_update_own"
on public.members
for update
to authenticated
using (
  owner_user_id = (select auth.uid())
)
with check (
  owner_user_id = (select auth.uid())
);


create policy "members_delete_own"
on public.members
for delete
to authenticated
using (
  owner_user_id = (select auth.uid())
);


-- ============================================================================
-- Debt policies
-- ============================================================================

create policy "debts_select_own"
on public.debts
for select
to authenticated
using (
  owner_user_id = (select auth.uid())
);


create policy "debts_insert_own"
on public.debts
for insert
to authenticated
with check (
  owner_user_id = (select auth.uid())
);


create policy "debts_update_own"
on public.debts
for update
to authenticated
using (
  owner_user_id = (select auth.uid())
)
with check (
  owner_user_id = (select auth.uid())
);


create policy "debts_delete_own"
on public.debts
for delete
to authenticated
using (
  owner_user_id = (select auth.uid())
);


-- ============================================================================
-- Automatic profile creation
--
-- Every Supabase auth user receives a corresponding Debtulator profile.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    user_id,
    display_name,
    base_currency
  )
  values (
    new.id,

    nullif(
      trim(
        coalesce(
          new.raw_user_meta_data ->> 'display_name',
          ''
        )
      ),
      ''
    ),

    coalesce(
      nullif(
        new.raw_user_meta_data ->> 'base_currency',
        ''
      ),
      'SEK'
    )
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;


create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();