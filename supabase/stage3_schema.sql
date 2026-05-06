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

create or replace function public.is_event_participant(target_event_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.event_participants
    where event_id = target_event_id
      and user_id = auth.uid()
      and status = 'active'
  )
  or exists (
    select 1
    from public.events
    where id = target_event_id
      and owner_user_id = auth.uid()
  );
$$;

create or replace function public.event_role(target_event_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select 'owner' from public.events where id = target_event_id and owner_user_id = auth.uid()),
    (
      select role
      from public.event_participants
      where event_id = target_event_id
        and user_id = auth.uid()
        and status = 'active'
      limit 1
    ),
    'viewer'
  );
$$;

create or replace function public.can_manage_event(target_event_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.event_role(target_event_id) in ('owner', 'admin');
$$;

create or replace function public.can_write_event_ledger(target_event_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.event_role(target_event_id) in ('owner', 'admin', 'member')
    and not exists (
      select 1
      from public.events
      where id = target_event_id
        and (
          status in ('settled', 'archived')
          or locked_at is not null
          or archived_at is not null
        )
    );
$$;

create table if not exists public.events (
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

create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member', 'viewer')),
  status text not null default 'active' check (status in ('active', 'removed', 'left', 'invited')),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table if not exists public.event_invites (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
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

create table if not exists public.event_members (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  type text not null check (type in ('linked_user', 'unlinked_placeholder')),
  linked_user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  alias text,
  email text,
  phone text,
  notes text,
  created_by_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'archived', 'merged', 'claim_pending')),
  merged_into_event_member_id uuid references public.event_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists event_members_linked_unique
on public.event_members(event_id, linked_user_id)
where linked_user_id is not null and status <> 'merged';

create table if not exists public.event_member_claims (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  event_member_id uuid not null references public.event_members(id) on delete cascade,
  claimant_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  message text,
  responded_by_user_id uuid references auth.users(id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_duplicate_warnings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  event_member_id_a uuid not null references public.event_members(id) on delete cascade,
  event_member_id_b uuid not null references public.event_members(id) on delete cascade,
  reason text not null,
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  status text not null default 'active' check (status in ('active', 'ignored', 'resolved')),
  ignored_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_expenses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  creator_user_id uuid references auth.users(id) on delete set null,
  payer_event_member_id uuid not null references public.event_members(id),
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

create table if not exists public.event_expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.event_expenses(id) on delete cascade,
  event_member_id uuid not null references public.event_members(id),
  included boolean not null default true,
  share_amount numeric(14, 2),
  share_percentage numeric(7, 4),
  share_weight numeric(14, 4),
  calculated_share_amount numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (expense_id, event_member_id)
);

create table if not exists public.event_debts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  creator_user_id uuid references auth.users(id) on delete set null,
  debtor_event_member_id uuid not null references public.event_members(id),
  creditor_event_member_id uuid not null references public.event_members(id),
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

create table if not exists public.event_verification_responses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  target_type text not null check (target_type in ('expense', 'debt', 'split')),
  target_id uuid not null,
  event_member_id uuid not null references public.event_members(id) on delete cascade,
  linked_user_id uuid references auth.users(id) on delete set null,
  response_status text not null default 'pending'
    check (response_status in ('local_only', 'pending', 'partially_verified', 'verified', 'rejected', 'disputed', 'resolved', 'cancelled')),
  rejection_reason text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, target_type, target_id, event_member_id)
);

create table if not exists public.event_activity_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
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
    'events',
    'event_participants',
    'event_invites',
    'event_members',
    'event_member_claims',
    'event_duplicate_warnings',
    'event_expenses',
    'event_expense_splits',
    'event_debts',
    'event_verification_responses'
  ]
  loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', table_name, table_name);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.event_invites enable row level security;
alter table public.event_members enable row level security;
alter table public.event_member_claims enable row level security;
alter table public.event_duplicate_warnings enable row level security;
alter table public.event_expenses enable row level security;
alter table public.event_expense_splits enable row level security;
alter table public.event_debts enable row level security;
alter table public.event_verification_responses enable row level security;
alter table public.event_activity_logs enable row level security;

drop policy if exists "Event participants can read events" on public.events;
create policy "Event participants can read events"
on public.events for select
using (
  owner_user_id = auth.uid()
  or public.is_event_participant(id)
  or exists (
    select 1 from public.event_invites
    where event_id = events.id
      and status = 'pending'
      and (invited_user_id = auth.uid() or lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  )
);

drop policy if exists "Authenticated users can create shared events" on public.events;
create policy "Authenticated users can create shared events"
on public.events for insert
with check (owner_user_id = auth.uid() and visibility = 'shared');

drop policy if exists "Owner admins can update events" on public.events;
create policy "Owner admins can update events"
on public.events for update
using (public.can_manage_event(id))
with check (public.can_manage_event(id));

drop policy if exists "Participants can read participants" on public.event_participants;
create policy "Participants can read participants"
on public.event_participants for select
using (public.is_event_participant(event_id) or user_id = auth.uid());

drop policy if exists "Owners admins can manage participants" on public.event_participants;
create policy "Owners admins can manage participants"
on public.event_participants for all
using (public.can_manage_event(event_id))
with check (
  public.can_manage_event(event_id)
  and not (role = 'owner' and public.event_role(event_id) <> 'owner')
);

drop policy if exists "Users can read relevant invites" on public.event_invites;
create policy "Users can read relevant invites"
on public.event_invites for select
using (
  public.is_event_participant(event_id)
  or inviter_user_id = auth.uid()
  or invited_user_id = auth.uid()
  or lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "Owners admins can invite" on public.event_invites;
create policy "Owners admins can invite"
on public.event_invites for insert
with check (inviter_user_id = auth.uid() and public.can_manage_event(event_id));

drop policy if exists "Invite participants can update invites" on public.event_invites;
create policy "Invite participants can update invites"
on public.event_invites for update
using (
  public.can_manage_event(event_id)
  or invited_user_id = auth.uid()
  or lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
)
with check (
  public.can_manage_event(event_id)
  or invited_user_id = auth.uid()
  or lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "Participants can read event members" on public.event_members;
create policy "Participants can read event members"
on public.event_members for select
using (public.is_event_participant(event_id));

drop policy if exists "Owners admins can manage event members" on public.event_members;
create policy "Owners admins can manage event members"
on public.event_members for all
using (public.can_manage_event(event_id))
with check (
  public.can_manage_event(event_id)
  and (
    linked_user_id is null
    or not exists (
      select 1 from public.event_members existing
      where existing.event_id = event_members.event_id
        and existing.linked_user_id = event_members.linked_user_id
        and existing.id <> event_members.id
        and existing.status <> 'merged'
    )
  )
);

drop policy if exists "Participants can read claims" on public.event_member_claims;
create policy "Participants can read claims"
on public.event_member_claims for select
using (public.is_event_participant(event_id) or claimant_user_id = auth.uid());

drop policy if exists "Users can create own claims" on public.event_member_claims;
create policy "Users can create own claims"
on public.event_member_claims for insert
with check (claimant_user_id = auth.uid() and public.is_event_participant(event_id));

drop policy if exists "Owners admins can answer claims" on public.event_member_claims;
create policy "Owners admins can answer claims"
on public.event_member_claims for update
using (public.can_manage_event(event_id) or claimant_user_id = auth.uid())
with check (public.can_manage_event(event_id) or claimant_user_id = auth.uid());

drop policy if exists "Participants can read duplicate warnings" on public.event_duplicate_warnings;
create policy "Participants can read duplicate warnings"
on public.event_duplicate_warnings for select
using (public.is_event_participant(event_id));

drop policy if exists "Owners admins can manage duplicate warnings" on public.event_duplicate_warnings;
create policy "Owners admins can manage duplicate warnings"
on public.event_duplicate_warnings for all
using (public.can_manage_event(event_id))
with check (public.can_manage_event(event_id));

drop policy if exists "Participants can read event expenses" on public.event_expenses;
create policy "Participants can read event expenses"
on public.event_expenses for select
using (public.is_event_participant(event_id));

drop policy if exists "Members can write event expenses" on public.event_expenses;
create policy "Members can write event expenses"
on public.event_expenses for insert
with check (creator_user_id = auth.uid() and public.can_write_event_ledger(event_id));

drop policy if exists "Creators admins can update event expenses" on public.event_expenses;
create policy "Creators admins can update event expenses"
on public.event_expenses for update
using (public.can_manage_event(event_id) or creator_user_id = auth.uid())
with check (public.can_manage_event(event_id) or creator_user_id = auth.uid());

drop policy if exists "Participants can read expense splits" on public.event_expense_splits;
create policy "Participants can read expense splits"
on public.event_expense_splits for select
using (
  exists (
    select 1 from public.event_expenses expense
    where expense.id = event_expense_splits.expense_id
      and public.is_event_participant(expense.event_id)
  )
);

drop policy if exists "Ledger writers can manage expense splits" on public.event_expense_splits;
create policy "Ledger writers can manage expense splits"
on public.event_expense_splits for all
using (
  exists (
    select 1 from public.event_expenses expense
    where expense.id = event_expense_splits.expense_id
      and public.can_write_event_ledger(expense.event_id)
  )
)
with check (
  exists (
    select 1 from public.event_expenses expense
    where expense.id = event_expense_splits.expense_id
      and public.can_write_event_ledger(expense.event_id)
  )
);

drop policy if exists "Participants can read event debts" on public.event_debts;
create policy "Participants can read event debts"
on public.event_debts for select
using (public.is_event_participant(event_id));

drop policy if exists "Members can create event debts" on public.event_debts;
create policy "Members can create event debts"
on public.event_debts for insert
with check (creator_user_id = auth.uid() and public.can_write_event_ledger(event_id));

drop policy if exists "Creators admins can update event debts" on public.event_debts;
create policy "Creators admins can update event debts"
on public.event_debts for update
using (public.can_manage_event(event_id) or creator_user_id = auth.uid())
with check (public.can_manage_event(event_id) or creator_user_id = auth.uid());

drop policy if exists "Participants can read event verification responses" on public.event_verification_responses;
create policy "Participants can read event verification responses"
on public.event_verification_responses for select
using (public.is_event_participant(event_id));

drop policy if exists "Linked involved users can verify event records" on public.event_verification_responses;
create policy "Linked involved users can verify event records"
on public.event_verification_responses for insert
with check (
  linked_user_id = auth.uid()
  and public.is_event_participant(event_id)
  and exists (
    select 1 from public.event_members member
    where member.id = event_verification_responses.event_member_id
      and member.event_id = event_verification_responses.event_id
      and member.linked_user_id = auth.uid()
      and member.status <> 'merged'
  )
);

drop policy if exists "Linked users can update own verification responses" on public.event_verification_responses;
create policy "Linked users can update own verification responses"
on public.event_verification_responses for update
using (linked_user_id = auth.uid() or public.can_manage_event(event_id))
with check (linked_user_id = auth.uid() or public.can_manage_event(event_id));

drop policy if exists "Participants can read activity" on public.event_activity_logs;
create policy "Participants can read activity"
on public.event_activity_logs for select
using (public.is_event_participant(event_id));

drop policy if exists "Participants can create activity" on public.event_activity_logs;
create policy "Participants can create activity"
on public.event_activity_logs for insert
with check (public.is_event_participant(event_id) and (actor_user_id is null or actor_user_id = auth.uid()));
