-- ============================================================================
-- Debtulator
-- Initial remote database schema
--
-- Core model only:
--   auth.users
--   public.profiles
--   public.members
--   public.debts
--
-- Collaboration, member linking, verification, groups, payments, settlements,
-- reminders, etc. are deliberately excluded from this baseline.
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
-- Profiles
--
-- auth.users owns authentication identity.
-- public.profiles contains Debtulator-specific account data.
-- ============================================================================

create table public.profiles (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,

  display_name text,

  base_currency text not null default 'SEK'
    check (
      base_currency in (
        'SEK',
        'AUD',
        'EUR',
        'USD',
        'GBP'
      )
    ),

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
-- A member is NOT the same thing as a Debtulator account.
--
-- In the future a member may gain a nullable linked_user_id/reference without
-- changing the member's id. This is important because local members may later
-- become linked to real Debtulator users.
-- ============================================================================

create table public.members (
  id uuid primary key default gen_random_uuid(),

  owner_user_id uuid not null
    references auth.users(id)
    on delete cascade,

  display_name text not null,

  email text,
  phone text,
  notes text,

  archived boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint members_display_name_not_empty
    check (char_length(trim(display_name)) > 0),

  constraint members_display_name_length
    check (char_length(display_name) <= 120),

  constraint members_email_length
    check (email is null or char_length(email) <= 320),

  constraint members_phone_length
    check (phone is null or char_length(phone) <= 64),

  constraint members_notes_length
    check (notes is null or char_length(notes) <= 10000),

  /*
   * This is intentionally redundant with the primary key.
   *
   * It allows debts to use a composite foreign key
   * (owner_user_id, member_id), which makes PostgreSQL itself guarantee
   * that a debt can never reference another user's member.
   */
  constraint members_owner_id_unique
    unique (owner_user_id, id)
);


create index members_owner_user_id_idx
  on public.members (owner_user_id);

create index members_owner_active_idx
  on public.members (owner_user_id, archived);

create index members_owner_display_name_idx
  on public.members (owner_user_id, display_name);


create trigger members_set_updated_at
before update on public.members
for each row
execute function public.set_updated_at();


-- ============================================================================
-- Debts
--
-- Debts are private ledger records owned by an account.
--
-- Whether their member is linked in the future will NOT determine whether the
-- debt is persisted or synced.
--
-- Linking/verification is a separate collaboration concern to be added later.
-- ============================================================================

create table public.debts (
  id uuid primary key default gen_random_uuid(),

  owner_user_id uuid not null
    references auth.users(id)
    on delete cascade,

  member_id uuid not null,

  direction text not null
    check (
      direction in (
        'you_owe',
        'they_owe'
      )
    ),

  amount numeric(19, 2) not null
    check (amount > 0),

  currency text not null
    check (
      currency in (
        'SEK',
        'AUD',
        'EUR',
        'USD',
        'GBP'
      )
    ),

  title text not null,
  notes text,

  debt_date date not null default current_date,
  due_date date,

  status text not null default 'active'
    check (
      status in (
        'active',
        'settled',
        'archived'
      )
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint debts_title_not_empty
    check (char_length(trim(title)) > 0),

  constraint debts_title_length
    check (char_length(title) <= 120),

  constraint debts_notes_length
    check (notes is null or char_length(notes) <= 10000),

  /*
   * This is a significant integrity rule.
   *
   * member_id alone would technically allow a debt owned by user A to point
   * at a member owned by user B if application code contained a bug.
   *
   * The composite FK makes that impossible at the database level.
   */
  constraint debts_member_owned_by_same_user
    foreign key (owner_user_id, member_id)
    references public.members (owner_user_id, id)
    on delete restrict
);


create index debts_owner_user_id_idx
  on public.debts (owner_user_id);

create index debts_member_id_idx
  on public.debts (member_id);

create index debts_owner_status_idx
  on public.debts (owner_user_id, status);

create index debts_owner_debt_date_idx
  on public.debts (owner_user_id, debt_date desc);

create index debts_owner_due_date_idx
  on public.debts (owner_user_id, due_date)
  where due_date is not null;


create trigger debts_set_updated_at
before update on public.debts
for each row
execute function public.set_updated_at();


-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.debts enable row level security;


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