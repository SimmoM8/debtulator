-- ============================================================================
-- Personal Members
-- ============================================================================
--
-- A personal member is an owner-scoped ledger identity.
--
-- It exists independently of an authenticated Debtulator user.
--
-- A member may later become linked by setting linked_user_id without changing
-- the member's id. Existing debts can therefore continue referencing the same
-- member throughout its lifetime.
--
-- This table is intentionally separate from group_members.
-- ============================================================================


create table public.personal_members (
  id uuid primary key default gen_random_uuid(),

  owner_user_id uuid not null
    references auth.users(id)
    on delete cascade,

  linked_user_id uuid
    references auth.users(id)
    on delete set null,

  display_name text not null,

  notes text,
  email text,
  phone text,

  tags text[] not null default '{}',

  archived boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint personal_members_display_name_not_blank
    check (length(trim(display_name)) > 0),

  constraint personal_members_not_self_linked
    check (
      linked_user_id is null
      or linked_user_id <> owner_user_id
    )
);


-- ============================================================================
-- Indexes
-- ============================================================================

create index personal_members_owner_user_id_idx
  on public.personal_members(owner_user_id);


create index personal_members_linked_user_id_idx
  on public.personal_members(linked_user_id)
  where linked_user_id is not null;


-- A user's active personal ledger should contain at most one member linked
-- to a particular Debtulator account.
--
-- Archived members are excluded so historical/archive workflows remain
-- possible without preventing creation of a new active member later.

create unique index personal_members_owner_linked_user_unique
  on public.personal_members(owner_user_id, linked_user_id)
  where linked_user_id is not null
    and archived = false;


-- ============================================================================
-- updated_at
-- ============================================================================

create or replace function public.set_personal_members_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


create trigger personal_members_set_updated_at
before update on public.personal_members
for each row
execute function public.set_personal_members_updated_at();


-- ============================================================================
-- Row Level Security
-- ============================================================================
--
-- IMPORTANT:
--
-- At this stage personal members are private records belonging to their owner.
--
-- A linked user does NOT automatically receive SELECT access merely because
-- their auth.users.id appears in linked_user_id.
--
-- This prevents linking someone later from unexpectedly exposing historical
-- personal financial information.
-- ============================================================================

alter table public.personal_members enable row level security;


create policy personal_members_owner_select
on public.personal_members
for select
to authenticated
using (
  owner_user_id = auth.uid()
);


create policy personal_members_owner_insert
on public.personal_members
for insert
to authenticated
with check (
  owner_user_id = auth.uid()
);


create policy personal_members_owner_update
on public.personal_members
for update
to authenticated
using (
  owner_user_id = auth.uid()
)
with check (
  owner_user_id = auth.uid()
);


create policy personal_members_owner_delete
on public.personal_members
for delete
to authenticated
using (
  owner_user_id = auth.uid()
);


-- ============================================================================
-- Documentation inside PostgreSQL
-- ============================================================================

comment on table public.personal_members is
  'Owner-scoped personal ledger identities. A member may optionally link to an auth user without changing identity.';


comment on column public.personal_members.owner_user_id is
  'Debtulator account that owns this private personal member.';


comment on column public.personal_members.linked_user_id is
  'Optional auth.users identity associated with this personal member after an accepted link. Linking does not replace the member row.';


comment on column public.personal_members.archived is
  'Soft archive state. Archived members remain available for historical references.';