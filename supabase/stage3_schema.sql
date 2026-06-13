create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_group_participant(target_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_participants
    where group_id = target_group_id
      and user_id = auth.uid()
      and status = 'active'
  )
  or exists (
    select 1
    from public.groups
    where id = target_group_id
      and owner_user_id = auth.uid()
  );
$$;

create or replace function public.group_role(target_group_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select 'owner' from public.groups where id = target_group_id and owner_user_id = auth.uid()),
    (
      select role
      from public.group_participants
      where group_id = target_group_id
        and user_id = auth.uid()
        and status = 'active'
      limit 1
    ),
    'viewer'
  );
$$;

create or replace function public.can_manage_group(target_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.group_role(target_group_id) in ('owner', 'admin');
$$;

create or replace function public.can_write_group_ledger(target_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.group_role(target_group_id) in ('owner', 'admin', 'member')
    and not exists (
      select 1
      from public.groups
      where id = target_group_id
        and (
          status in ('settled', 'archived')
          or locked_at is not null
          or archived_at is not null
        )
    );
$$;

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  default_currency text not null,
  allowed_currencies text[] not null default '{}',
  tags text[] not null default '{}',
  visibility text not null default 'shared' check (visibility in ('private', 'shared')),
  status text not null default 'active' check (status in ('planning', 'active', 'finalising', 'settled', 'archived')),
  archived_at timestamptz,
  finalised_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_participants (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member', 'viewer')),
  status text not null default 'active' check (status in ('active', 'removed', 'left', 'invited')),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table if not exists public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  inviter_user_id uuid not null references auth.users(id) on delete cascade,
  invited_user_id uuid references auth.users(id) on delete set null,
  invited_email text,
  invited_phone text,
  invited_display_name text not null,
  offered_role text not null check (offered_role in ('admin', 'member', 'viewer')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled', 'expired')),
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  type text not null check (type in ('linked_user', 'unlinked_placeholder')),
  linked_user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  alias text,
  email text,
  phone text,
  notes text,
  created_by_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'archived', 'merged', 'claim_pending')),
  merged_into_group_member_id uuid references public.group_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists group_members_linked_unique
on public.group_members(group_id, linked_user_id)
where linked_user_id is not null and status <> 'merged';

create table if not exists public.group_member_claims (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  group_member_id uuid not null references public.group_members(id) on delete cascade,
  claimant_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  message text,
  responded_by_user_id uuid references auth.users(id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_duplicate_warnings (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  group_member_id_a uuid not null references public.group_members(id) on delete cascade,
  group_member_id_b uuid not null references public.group_members(id) on delete cascade,
  reason text not null,
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  status text not null default 'active' check (status in ('active', 'ignored', 'resolved')),
  ignored_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  creator_user_id uuid references auth.users(id) on delete set null,
  payer_group_member_id uuid not null references public.group_members(id),
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null,
  title text not null,
  notes text,
  date date not null,
  tags text[] not null default '{}',
  split_method text not null default 'equal',
  verification_status text not null default 'pending'
    check (verification_status in ('local_only', 'pending', 'partially_verified', 'verified', 'rejected', 'disputed', 'resolved', 'cancelled')),
  settlement_status text not null default 'active' check (settlement_status in ('active', 'settled', 'archived')),
  status text not null default 'active' check (status in ('active', 'settled', 'archived')),
  archived_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.group_expenses(id) on delete cascade,
  group_member_id uuid not null references public.group_members(id),
  included boolean not null default true,
  share_amount numeric(14, 2),
  share_percentage numeric(7, 4),
  share_weight numeric(14, 4),
  calculated_share_amount numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (expense_id, group_member_id)
);

create table if not exists public.group_debts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  creator_user_id uuid references auth.users(id) on delete set null,
  debtor_group_member_id uuid not null references public.group_members(id),
  creditor_group_member_id uuid not null references public.group_members(id),
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null,
  title text not null,
  notes text,
  date date not null,
  tags text[] not null default '{}',
  verification_status text not null default 'pending'
    check (verification_status in ('local_only', 'pending', 'partially_verified', 'verified', 'rejected', 'disputed', 'resolved', 'cancelled')),
  settlement_status text not null default 'active' check (settlement_status in ('active', 'settled', 'archived')),
  status text not null default 'active' check (status in ('active', 'settled', 'archived')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_verification_responses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  target_type text not null check (target_type in ('expense', 'debt', 'split')),
  target_id uuid not null,
  group_member_id uuid not null references public.group_members(id) on delete cascade,
  linked_user_id uuid references auth.users(id) on delete set null,
  response_status text not null default 'pending'
    check (response_status in ('local_only', 'pending', 'partially_verified', 'verified', 'rejected', 'disputed', 'resolved', 'cancelled')),
  rejection_reason text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, target_type, target_id, group_member_id)
);

create table if not exists public.group_activity_logs (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'groups',
    'group_participants',
    'group_invites',
    'group_members',
    'group_member_claims',
    'group_duplicate_warnings',
    'group_expenses',
    'group_expense_splits',
    'group_debts',
    'group_verification_responses'
  ]
  loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', table_name, table_name);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

alter table public.groups enable row level security;
alter table public.group_participants enable row level security;
alter table public.group_invites enable row level security;
alter table public.group_members enable row level security;
alter table public.group_member_claims enable row level security;
alter table public.group_duplicate_warnings enable row level security;
alter table public.group_expenses enable row level security;
alter table public.group_expense_splits enable row level security;
alter table public.group_debts enable row level security;
alter table public.group_verification_responses enable row level security;
alter table public.group_activity_logs enable row level security;

drop policy if exists "Group participants can read groups" on public.groups;
create policy "Group participants can read groups"
on public.groups for select
using (
  owner_user_id = auth.uid()
  or public.is_group_participant(id)
  or exists (
    select 1 from public.group_invites
    where group_id = groups.id
      and status = 'pending'
      and (invited_user_id = auth.uid() or lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  )
);

drop policy if exists "Authenticated users can create shared groups" on public.groups;
create policy "Authenticated users can create shared groups"
on public.groups for insert
with check (owner_user_id = auth.uid() and visibility = 'shared');

drop policy if exists "Owner admins can update groups" on public.groups;
create policy "Owner admins can update groups"
on public.groups for update
using (public.can_manage_group(id))
with check (public.can_manage_group(id));

drop policy if exists "Participants can read participants" on public.group_participants;
create policy "Participants can read participants"
on public.group_participants for select
using (public.is_group_participant(group_id) or user_id = auth.uid());

drop policy if exists "Owners admins can manage participants" on public.group_participants;
create policy "Owners admins can manage participants"
on public.group_participants for all
using (public.can_manage_group(group_id))
with check (
  public.can_manage_group(group_id)
  and not (role = 'owner' and public.group_role(group_id) <> 'owner')
);

drop policy if exists "Users can read relevant invites" on public.group_invites;
create policy "Users can read relevant invites"
on public.group_invites for select
using (
  public.is_group_participant(group_id)
  or inviter_user_id = auth.uid()
  or invited_user_id = auth.uid()
  or lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "Owners admins can invite" on public.group_invites;
create policy "Owners admins can invite"
on public.group_invites for insert
with check (inviter_user_id = auth.uid() and public.can_manage_group(group_id));

drop policy if exists "Invite participants can update invites" on public.group_invites;
create policy "Invite participants can update invites"
on public.group_invites for update
using (
  public.can_manage_group(group_id)
  or invited_user_id = auth.uid()
  or lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
)
with check (
  public.can_manage_group(group_id)
  or invited_user_id = auth.uid()
  or lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "Participants can read group members" on public.group_members;
create policy "Participants can read group members"
on public.group_members for select
using (public.is_group_participant(group_id));

drop policy if exists "Owners admins can manage group members" on public.group_members;
create policy "Owners admins can manage group members"
on public.group_members for all
using (public.can_manage_group(group_id))
with check (
  public.can_manage_group(group_id)
  and (
    linked_user_id is null
    or not exists (
      select 1 from public.group_members existing
      where existing.group_id = group_members.group_id
        and existing.linked_user_id = group_members.linked_user_id
        and existing.id <> group_members.id
        and existing.status <> 'merged'
    )
  )
);

drop policy if exists "Participants can read claims" on public.group_member_claims;
create policy "Participants can read claims"
on public.group_member_claims for select
using (public.is_group_participant(group_id) or claimant_user_id = auth.uid());

drop policy if exists "Users can create own claims" on public.group_member_claims;
create policy "Users can create own claims"
on public.group_member_claims for insert
with check (claimant_user_id = auth.uid() and public.is_group_participant(group_id));

drop policy if exists "Owners admins can answer claims" on public.group_member_claims;
create policy "Owners admins can answer claims"
on public.group_member_claims for update
using (public.can_manage_group(group_id) or claimant_user_id = auth.uid())
with check (public.can_manage_group(group_id) or claimant_user_id = auth.uid());

drop policy if exists "Participants can read duplicate warnings" on public.group_duplicate_warnings;
create policy "Participants can read duplicate warnings"
on public.group_duplicate_warnings for select
using (public.is_group_participant(group_id));

drop policy if exists "Owners admins can manage duplicate warnings" on public.group_duplicate_warnings;
create policy "Owners admins can manage duplicate warnings"
on public.group_duplicate_warnings for all
using (public.can_manage_group(group_id))
with check (public.can_manage_group(group_id));

drop policy if exists "Participants can read group expenses" on public.group_expenses;
create policy "Participants can read group expenses"
on public.group_expenses for select
using (public.is_group_participant(group_id));

drop policy if exists "Members can write group expenses" on public.group_expenses;
create policy "Members can write group expenses"
on public.group_expenses for insert
with check (creator_user_id = auth.uid() and public.can_write_group_ledger(group_id));

drop policy if exists "Creators admins can update group expenses" on public.group_expenses;
create policy "Creators admins can update group expenses"
on public.group_expenses for update
using (public.can_manage_group(group_id) or creator_user_id = auth.uid())
with check (public.can_manage_group(group_id) or creator_user_id = auth.uid());

drop policy if exists "Participants can read expense splits" on public.group_expense_splits;
create policy "Participants can read expense splits"
on public.group_expense_splits for select
using (
  exists (
    select 1 from public.group_expenses expense
    where expense.id = group_expense_splits.expense_id
      and public.is_group_participant(expense.group_id)
  )
);

drop policy if exists "Ledger writers can manage expense splits" on public.group_expense_splits;
create policy "Ledger writers can manage expense splits"
on public.group_expense_splits for all
using (
  exists (
    select 1 from public.group_expenses expense
    where expense.id = group_expense_splits.expense_id
      and public.can_write_group_ledger(expense.group_id)
  )
)
with check (
  exists (
    select 1 from public.group_expenses expense
    where expense.id = group_expense_splits.expense_id
      and public.can_write_group_ledger(expense.group_id)
  )
);

drop policy if exists "Participants can read group debts" on public.group_debts;
create policy "Participants can read group debts"
on public.group_debts for select
using (public.is_group_participant(group_id));

drop policy if exists "Members can create group debts" on public.group_debts;
create policy "Members can create group debts"
on public.group_debts for insert
with check (creator_user_id = auth.uid() and public.can_write_group_ledger(group_id));

drop policy if exists "Creators admins can update group debts" on public.group_debts;
create policy "Creators admins can update group debts"
on public.group_debts for update
using (public.can_manage_group(group_id) or creator_user_id = auth.uid())
with check (public.can_manage_group(group_id) or creator_user_id = auth.uid());

drop policy if exists "Participants can read group verification responses" on public.group_verification_responses;
create policy "Participants can read group verification responses"
on public.group_verification_responses for select
using (public.is_group_participant(group_id));

drop policy if exists "Linked involved users can verify group records" on public.group_verification_responses;
create policy "Linked involved users can verify group records"
on public.group_verification_responses for insert
with check (
  linked_user_id = auth.uid()
  and public.is_group_participant(group_id)
  and exists (
    select 1 from public.group_members member
    where member.id = group_verification_responses.group_member_id
      and member.group_id = group_verification_responses.group_id
      and member.linked_user_id = auth.uid()
      and member.status <> 'merged'
  )
);

drop policy if exists "Linked users can update own verification responses" on public.group_verification_responses;
create policy "Linked users can update own verification responses"
on public.group_verification_responses for update
using (linked_user_id = auth.uid() or public.can_manage_group(group_id))
with check (linked_user_id = auth.uid() or public.can_manage_group(group_id));

drop policy if exists "Participants can read activity" on public.group_activity_logs;
create policy "Participants can read activity"
on public.group_activity_logs for select
using (public.is_group_participant(group_id));

drop policy if exists "Participants can create activity" on public.group_activity_logs;
create policy "Participants can create activity"
on public.group_activity_logs for insert
with check (public.is_group_participant(group_id) and (actor_user_id is null or actor_user_id = auth.uid()));
