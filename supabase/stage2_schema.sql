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

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text,
  phone text,
  avatar_url text,
  base_currency text not null default 'SEK',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.link_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete set null,
  target_email text,
  target_phone text,
  requester_member_local_or_remote_id text not null,
  requester_label text not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'cancelled', 'expired')),
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shared_debt_records (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references auth.users(id) on delete cascade,
  involved_user_id uuid not null references auth.users(id) on delete cascade,
  local_member_reference text,
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null,
  title text not null,
  notes_visible_to_other_user text,
  debt_date date not null,
  due_date date,
  direction text not null check (direction in ('they_owe_me', 'i_owe_them')),
  visibility text not null default 'shared_with_involved_member'
    check (visibility in ('private', 'shared_with_involved_member', 'future_event_shared')),
  verification_status text not null default 'pending'
    check (verification_status in ('local_only', 'pending', 'verified', 'rejected', 'disputed', 'resolved', 'cancelled')),
  settlement_status text not null default 'active'
    check (settlement_status in ('active', 'settled', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.debt_verifications (
  id uuid primary key default gen_random_uuid(),
  debt_id uuid not null references public.shared_debt_records(id) on delete cascade,
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  responder_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('local_only', 'pending', 'verified', 'rejected', 'disputed', 'resolved', 'cancelled')),
  rejection_reason text,
  suggested_change jsonb,
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  target_type text not null,
  target_id uuid,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists link_requests_set_updated_at on public.link_requests;
create trigger link_requests_set_updated_at
before update on public.link_requests
for each row execute function public.set_updated_at();

drop trigger if exists shared_debt_records_set_updated_at on public.shared_debt_records;
create trigger shared_debt_records_set_updated_at
before update on public.shared_debt_records
for each row execute function public.set_updated_at();

drop trigger if exists debt_verifications_set_updated_at on public.debt_verifications;
create trigger debt_verifications_set_updated_at
before update on public.debt_verifications
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.link_requests enable row level security;
alter table public.shared_debt_records enable row level security;
alter table public.debt_verifications enable row level security;
alter table public.activity_logs enable row level security;

drop policy if exists "Profiles are readable by owner" on public.profiles;
create policy "Profiles are readable by owner"
on public.profiles for select
using (id = auth.uid());

drop policy if exists "Profiles are writable by owner" on public.profiles;
create policy "Profiles are writable by owner"
on public.profiles for all
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Link requests are readable by participants" on public.link_requests;
create policy "Link requests are readable by participants"
on public.link_requests for select
using (
  requester_user_id = auth.uid()
  or target_user_id = auth.uid()
  or lower(target_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "Users can create own link requests" on public.link_requests;
create policy "Users can create own link requests"
on public.link_requests for insert
with check (requester_user_id = auth.uid());

drop policy if exists "Participants can update link request status" on public.link_requests;
create policy "Participants can update link request status"
on public.link_requests for update
using (
  requester_user_id = auth.uid()
  or target_user_id = auth.uid()
  or lower(target_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
)
with check (
  requester_user_id = auth.uid()
  or target_user_id = auth.uid()
  or lower(target_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "Shared debts are readable by involved users" on public.shared_debt_records;
create policy "Shared debts are readable by involved users"
on public.shared_debt_records for select
using (creator_user_id = auth.uid() or involved_user_id = auth.uid());

drop policy if exists "Creators can insert shared debts" on public.shared_debt_records;
create policy "Creators can insert shared debts"
on public.shared_debt_records for insert
with check (creator_user_id = auth.uid() and visibility = 'shared_with_involved_member');

drop policy if exists "Involved users can update shared debt verification state" on public.shared_debt_records;
create policy "Involved users can update shared debt verification state"
on public.shared_debt_records for update
using (creator_user_id = auth.uid() or involved_user_id = auth.uid())
with check (creator_user_id = auth.uid() or involved_user_id = auth.uid());

drop policy if exists "Verifications are readable by participants" on public.debt_verifications;
create policy "Verifications are readable by participants"
on public.debt_verifications for select
using (requester_user_id = auth.uid() or responder_user_id = auth.uid());

drop policy if exists "Requesters can create verification requests" on public.debt_verifications;
create policy "Requesters can create verification requests"
on public.debt_verifications for insert
with check (requester_user_id = auth.uid());

drop policy if exists "Participants can update verification status" on public.debt_verifications;
create policy "Participants can update verification status"
on public.debt_verifications for update
using (requester_user_id = auth.uid() or responder_user_id = auth.uid())
with check (requester_user_id = auth.uid() or responder_user_id = auth.uid());

drop policy if exists "Activity is readable by actor" on public.activity_logs;
create policy "Activity is readable by actor"
on public.activity_logs for select
using (actor_user_id = auth.uid());

drop policy if exists "Users can create own activity" on public.activity_logs;
create policy "Users can create own activity"
on public.activity_logs for insert
with check (actor_user_id = auth.uid());
