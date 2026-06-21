-- Debtulator consolidated Supabase schema
-- PRELAUNCH RESET FILE
-- Destructive: this drops and recreates Debtulator cloud tables, policies, triggers, and helper functions.
-- Safe for early development only. Do not run against production data.

begin;

create extension if not exists pgcrypto;

-- Storage policies live outside the public schema, so remove them explicitly before reset.
drop policy if exists attachment_files_group_participants_read on storage.objects;
drop policy if exists attachment_files_owner_write on storage.objects;

-- Public functions.
drop trigger if exists create_profile_after_auth_signup on auth.users;
drop function if exists public.create_profile_for_new_user();
drop function if exists public.apply_account_deletion_anonymization(uuid, text);
drop function if exists public.request_account_deletion(boolean, boolean, text, jsonb);
drop function if exists public.send_payment_confirmation_reminder(uuid);
drop function if exists public.respond_to_payment_confirmation(uuid, text);
drop function if exists public.send_debt_confirmation_reminder(uuid);
drop function if exists public.respond_to_debt_verification(uuid, text, text, jsonb);
drop function if exists public.request_debt_verification(uuid, uuid, text, jsonb);
drop function if exists public.can_write_group_ledger(uuid);
drop function if exists public.can_manage_group(uuid);
drop function if exists public.group_role(uuid);
drop function if exists public.is_group_participant(uuid);
drop function if exists public.set_updated_at();

-- Public tables, reverse dependency order.
drop table if exists public.account_deletion_requests cascade;
drop table if exists public.audit_logs cascade;
drop table if exists public.device_push_tokens cascade;
drop table if exists public.notification_preferences cascade;
drop table if exists public.notifications cascade;
drop table if exists public.sync_conflicts cascade;
drop table if exists public.csv_import_batches cascade;
drop table if exists public.export_logs cascade;
drop table if exists public.smart_suggestions cascade;
drop table if exists public.comments cascade;
drop table if exists public.attachments cascade;
drop table if exists public.overpayment_credits cascade;
drop table if exists public.soft_reminders cascade;
drop table if exists public.reminders cascade;
drop table if exists public.recurring_templates cascade;
drop table if exists public.expense_payers cascade;
drop table if exists public.settlement_lines cascade;
drop table if exists public.settlements cascade;
drop table if exists public.payments cascade;
drop table if exists public.group_activity_logs cascade;
drop table if exists public.group_verification_responses cascade;
drop table if exists public.group_debts cascade;
drop table if exists public.group_expense_splits cascade;
drop table if exists public.group_expenses cascade;
drop table if exists public.group_duplicate_warnings cascade;
drop table if exists public.group_member_claims cascade;
drop table if exists public.group_members cascade;
drop table if exists public.group_invites cascade;
drop table if exists public.group_participants cascade;
drop table if exists public.groups cascade;
drop table if exists public.debt_verifications cascade;
drop table if exists public.shared_debt_records cascade;
drop table if exists public.link_requests cascade;
drop table if exists public.activity_logs cascade;
drop table if exists public.profiles cascade;

-- Optional development storage reset.
delete from storage.objects where bucket_id = 'debtulator-attachments';
delete from storage.buckets where id = 'debtulator-attachments';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  display_name text not null,
  email text,
  phone text,
  country text,
  avatar_url text,
  base_currency text not null default 'SEK' check (base_currency in ('SEK', 'AUD', 'EUR', 'USD', 'GBP')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  requested_currency text := metadata ->> 'base_currency';
begin
  insert into public.profiles (id, first_name, last_name, display_name, email, phone, country, base_currency)
  values (
    new.id,
    nullif(trim(metadata ->> 'first_name'), ''),
    nullif(trim(metadata ->> 'last_name'), ''),
    coalesce(
      nullif(trim(metadata ->> 'display_name'), ''),
      nullif(trim(concat_ws(' ', metadata ->> 'first_name', metadata ->> 'last_name')), ''),
      new.email,
      'Debtulator user'
    ),
    new.email,
    nullif(trim(metadata ->> 'phone'), ''),
    nullif(trim(metadata ->> 'country'), ''),
    case when requested_currency in ('SEK', 'AUD', 'EUR', 'USD', 'GBP') then requested_currency else 'SEK' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger create_profile_after_auth_signup
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

-- Authenticated users can discover another account before creating a linked
-- local member. Keep the profiles table owner-only and expose only bounded,
-- query-matching results through this function.
create or replace function public.search_member_profiles(
  search_query text,
  result_limit integer default 8
)
returns table (
  id uuid,
  first_name text,
  last_name text,
  display_name text,
  email text,
  avatar_url text,
  base_currency text
)
language sql
security definer
set search_path = public
stable
as $$
  with query as (
    select trim(translate(search_query, '%_', '')) as value
  )
  select
    profile.id,
    profile.first_name,
    profile.last_name,
    profile.display_name,
    profile.email,
    profile.avatar_url,
    profile.base_currency
  from public.profiles profile
  cross join query
  where auth.uid() is not null
    and profile.id <> auth.uid()
    and length(query.value) >= 2
    and (
      profile.display_name ilike '%' || query.value || '%'
      or coalesce(profile.first_name, '') ilike '%' || query.value || '%'
      or coalesce(profile.last_name, '') ilike '%' || query.value || '%'
      or coalesce(profile.email, '') ilike '%' || query.value || '%'
      or coalesce(profile.phone, '') ilike '%' || query.value || '%'
    )
  order by
    case when lower(profile.display_name) = lower(query.value) then 0 else 1 end,
    profile.display_name
  limit least(greatest(coalesce(result_limit, 8), 1), 20);
$$;

revoke all on function public.search_member_profiles(text, integer) from public;
grant execute on function public.search_member_profiles(text, integer) to authenticated;

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  entity_kind text not null,
  entity_id text not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.link_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete set null,
  target_email text,
  target_phone text,
  requester_member_local_or_remote_id text not null,
  requester_label text not null,
  message text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_link_request_requester_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  authenticated_user_id uuid := auth.uid();
  authoritative_name text;
begin
  if authenticated_user_id is not null then
    new.requester_user_id := authenticated_user_id;
  end if;
  select profile.display_name into authoritative_name
  from public.profiles profile
  where profile.id = new.requester_user_id;
  new.requester_label := coalesce(
    nullif(trim(authoritative_name), ''),
    nullif(trim(new.requester_label), ''),
    'Debtulator user'
  );
  return new;
end;
$$;

revoke all on function public.set_link_request_requester_identity() from public, anon, authenticated;

create trigger set_link_request_requester_identity
  before insert on public.link_requests
  for each row execute function public.set_link_request_requester_identity();

create or replace function public.respond_to_member_link_request(
  p_request_id uuid,
  p_status text
)
returns public.link_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_email text := auth.jwt() ->> 'email';
  caller_phone text := auth.jwt() ->> 'phone';
  request_row public.link_requests;
begin
  if caller_id is null then raise exception 'Authentication required.'; end if;
  if p_status not in ('accepted', 'rejected') then raise exception 'Invalid link request response.'; end if;
  select * into request_row from public.link_requests request where request.id = p_request_id for update;
  if request_row.id is null then raise exception 'Link request not found.'; end if;
  if request_row.status <> 'pending' then raise exception 'Link request has already been handled.'; end if;
  if not (
    request_row.target_user_id = caller_id
    or (request_row.target_user_id is null and request_row.target_email is not null and lower(request_row.target_email) = lower(coalesce(caller_email, '')))
    or (request_row.target_user_id is null and request_row.target_phone is not null and request_row.target_phone = coalesce(caller_phone, ''))
  ) then
    raise exception 'Only the target user can respond to this link request.';
  end if;
  update public.link_requests
  set status = p_status, target_user_id = caller_id, updated_at = now()
  where id = p_request_id
  returning * into request_row;
  return request_row;
end;
$$;

revoke all on function public.respond_to_member_link_request(uuid, text) from public, anon;
grant execute on function public.respond_to_member_link_request(uuid, text) to authenticated;

create index if not exists link_requests_accepted_requester_target_idx
  on public.link_requests (requester_user_id, target_user_id)
  where status = 'accepted';

create index if not exists link_requests_accepted_target_requester_idx
  on public.link_requests (target_user_id, requester_user_id)
  where status = 'accepted';

create or replace function public.has_accepted_member_link(p_other_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  with caller as (select auth.uid() as id)
  select
    caller.id is not null
    and p_other_user_id is not null
    and p_other_user_id <> caller.id
    and exists (
      select 1
      from public.link_requests request
      where request.status = 'accepted'
        and (
          (request.requester_user_id = caller.id and request.target_user_id = p_other_user_id)
          or
          (request.target_user_id = caller.id and request.requester_user_id = p_other_user_id)
        )
    )
  from caller;
$$;

revoke all on function public.has_accepted_member_link(uuid) from public, anon;
grant execute on function public.has_accepted_member_link(uuid) to authenticated;

create or replace function public.get_accepted_linked_member_profile(
  p_linked_user_id uuid
)
returns table (display_name text, email text, avatar_url text)
language sql
security definer
set search_path = ''
stable
as $$
  with caller as (select auth.uid() as id)
  select profile.display_name, profile.email, profile.avatar_url
  from caller
  join public.profiles profile on profile.id = p_linked_user_id
  where caller.id is not null
    and p_linked_user_id <> caller.id
    and exists (
      select 1
      from public.link_requests request
      where request.status = 'accepted'
        and (
          (request.requester_user_id = caller.id and request.target_user_id = p_linked_user_id)
          or
          (request.target_user_id = caller.id and request.requester_user_id = p_linked_user_id)
        )
    )
  limit 1;
$$;

revoke all on function public.get_accepted_linked_member_profile(uuid) from public, anon;
grant execute on function public.get_accepted_linked_member_profile(uuid) to authenticated;

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'link_requests'
  ) then
    alter publication supabase_realtime add table public.link_requests;
  end if;
end;
$$;

create table public.shared_debt_records (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid references auth.users(id) on delete set null,
  involved_user_id uuid references auth.users(id) on delete set null,
  local_member_reference text,
  amount numeric not null check (amount >= 0),
  currency text not null check (currency in ('SEK', 'AUD', 'EUR', 'USD', 'GBP')),
  title text not null,
  notes_visible_to_other_user text,
  debt_date date not null,
  due_date date,
  direction text not null check (direction in ('they_owe_me', 'i_owe_them')),
  visibility text not null default 'shared_with_involved_member',
  verification_status text not null default 'pending',
  settlement_status text not null default 'active' check (settlement_status in ('active', 'settled', 'archived')),
  suggested_change jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.debt_verifications (
  id uuid primary key default gen_random_uuid(),
  debt_id uuid not null references public.shared_debt_records(id) on delete cascade,
  requester_user_id uuid references auth.users(id) on delete set null,
  responder_user_id uuid references auth.users(id) on delete set null,
  request_type text not null default 'creation' check (request_type in ('creation', 'amendment')),
  change_summary jsonb,
  status text not null default 'pending',
  rejection_reason text,
  suggested_change jsonb,
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  description text,
  default_currency text not null default 'SEK' check (default_currency in ('SEK', 'AUD', 'EUR', 'USD', 'GBP')),
  allowed_currencies text[] not null default array['SEK'],
  tags text[] not null default '{}',
  visibility text not null default 'shared' check (visibility in ('private', 'shared')),
  status text not null default 'active' check (status in ('planning', 'active', 'finalising', 'settled', 'archived')),
  archived_at timestamptz,
  finalised_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_participants (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  status text not null default 'active' check (status in ('active', 'removed', 'left', 'invited')),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(group_id, user_id)
);

create table public.group_invites (
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
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  type text not null default 'unlinked_placeholder' check (type in ('linked_user', 'unlinked_placeholder')),
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

create unique index group_members_linked_unique
  on public.group_members(group_id, linked_user_id)
  where linked_user_id is not null and status <> 'merged';

create table public.group_member_claims (
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

create table public.group_duplicate_warnings (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  group_member_id_a uuid not null references public.group_members(id) on delete cascade,
  group_member_id_b uuid not null references public.group_members(id) on delete cascade,
  reason text not null,
  confidence text not null default 'medium' check (confidence in ('low', 'medium', 'high')),
  status text not null default 'active' check (status in ('active', 'ignored', 'resolved')),
  ignored_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(group_id, group_member_id_a, group_member_id_b, reason)
);

create table public.group_expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  creator_user_id uuid references auth.users(id) on delete set null,
  payer_group_member_id uuid not null references public.group_members(id),
  amount numeric not null check (amount >= 0),
  currency text not null check (currency in ('SEK', 'AUD', 'EUR', 'USD', 'GBP')),
  title text not null,
  notes text,
  date date not null,
  tags text[] not null default '{}',
  split_method text not null default 'equal' check (split_method in ('equal', 'custom_amount', 'custom_percentage', 'shares')),
  verification_status text not null default 'local_only',
  settlement_status text not null default 'active' check (settlement_status in ('active', 'settled', 'archived')),
  status text not null default 'active' check (status in ('active', 'settled', 'archived')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.group_expenses(id) on delete cascade,
  group_member_id uuid not null references public.group_members(id) on delete cascade,
  included boolean not null default true,
  share_amount numeric,
  share_percentage numeric,
  share_weight numeric,
  calculated_share_amount numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(expense_id, group_member_id)
);

create table public.expense_payers (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.group_expenses(id) on delete cascade,
  group_member_id uuid not null references public.group_members(id) on delete cascade,
  amount_paid numeric not null check (amount_paid >= 0),
  currency text not null check (currency in ('SEK', 'AUD', 'EUR', 'USD', 'GBP')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_debts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  creator_user_id uuid references auth.users(id) on delete set null,
  debtor_group_member_id uuid not null references public.group_members(id),
  creditor_group_member_id uuid not null references public.group_members(id),
  amount numeric not null check (amount >= 0),
  currency text not null check (currency in ('SEK', 'AUD', 'EUR', 'USD', 'GBP')),
  title text not null,
  notes text,
  date date not null,
  tags text[] not null default '{}',
  verification_status text not null default 'pending',
  settlement_status text not null default 'active' check (settlement_status in ('active', 'settled', 'archived')),
  status text not null default 'active' check (status in ('active', 'settled', 'archived')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_verification_responses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  target_type text not null check (target_type in ('expense', 'debt', 'split')),
  target_id uuid not null,
  group_member_id uuid not null references public.group_members(id) on delete cascade,
  linked_user_id uuid references auth.users(id) on delete set null,
  response_status text not null,
  rejection_reason text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(group_id, target_type, target_id, group_member_id)
);

create table public.group_activity_logs (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  created_by_user_id uuid references auth.users(id) on delete set null,
  payer_user_id uuid references auth.users(id) on delete set null,
  payee_user_id uuid references auth.users(id) on delete set null,
  payer_member_id text,
  payee_member_id text,
  payer_group_member_id uuid references public.group_members(id) on delete set null,
  payee_group_member_id uuid references public.group_members(id) on delete set null,
  group_id uuid references public.groups(id) on delete cascade,
  amount numeric not null check (amount >= 0),
  currency text not null check (currency in ('SEK', 'AUD', 'EUR', 'USD', 'GBP')),
  payment_date date not null,
  notes text,
  status text not null default 'recorded',
  confirmation_status text not null default 'pending_confirmation',
  visibility text not null default 'private',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  created_by_user_id uuid references auth.users(id) on delete set null,
  group_id uuid references public.groups(id) on delete cascade,
  member_id text,
  type text not null check (type in ('manual', 'from_suggestion')),
  currency text not null check (currency in ('SEK', 'AUD', 'EUR', 'USD', 'GBP')),
  total_amount numeric not null check (total_amount >= 0),
  status text not null default 'recorded',
  confirmation_status text not null default 'pending_confirmation',
  notes text,
  original_currency text,
  original_amount numeric,
  settlement_currency text,
  settlement_amount numeric,
  exchange_rate_used numeric,
  exchange_rate_date date,
  conversion_note text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.settlement_lines (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references public.settlements(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  source_record_type text not null,
  source_record_id text not null,
  applied_amount numeric not null check (applied_amount >= 0),
  currency text not null check (currency in ('SEK', 'AUD', 'EUR', 'USD', 'GBP')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recurring_templates (
  id uuid primary key default gen_random_uuid(),
  created_by_user_id uuid references auth.users(id) on delete set null,
  group_id uuid references public.groups(id) on delete cascade,
  member_id text,
  type text not null check (type in ('simple_debt', 'shared_expense', 'group_debt')),
  title text not null,
  amount numeric not null check (amount >= 0),
  currency text not null check (currency in ('SEK', 'AUD', 'EUR', 'USD', 'GBP')),
  recurrence_rule text not null,
  start_date date not null,
  end_date date,
  next_occurrence_date date not null,
  last_generated_date date,
  status text not null default 'active',
  auto_generate boolean not null default false,
  reminder_settings jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  target_type text not null,
  target_id text not null,
  remind_at timestamptz not null,
  repeat_rule text,
  status text not null default 'scheduled',
  message text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.soft_reminders (
  id uuid primary key default gen_random_uuid(),
  sender_user_id uuid references auth.users(id) on delete set null,
  recipient_user_id uuid references auth.users(id) on delete set null,
  related_member_id text,
  related_group_id uuid references public.groups(id) on delete cascade,
  related_record_id text,
  message text not null,
  status text not null default 'sent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.overpayment_credits (
  id uuid primary key default gen_random_uuid(),
  created_by_user_id uuid references auth.users(id) on delete set null,
  payer_member_id text,
  payee_member_id text,
  payer_group_member_id uuid references public.group_members(id) on delete set null,
  payee_group_member_id uuid references public.group_members(id) on delete set null,
  group_id uuid references public.groups(id) on delete cascade,
  amount numeric not null check (amount >= 0),
  currency text not null check (currency in ('SEK', 'AUD', 'EUR', 'USD', 'GBP')),
  source_payment_id uuid references public.payments(id) on delete set null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('debt', 'shared_expense', 'group_debt', 'payment', 'settlement', 'group', 'comment')),
  target_id text not null,
  group_id uuid references public.groups(id) on delete cascade,
  created_by_user_id uuid references auth.users(id) on delete set null,
  storage_path text,
  file_name text not null,
  file_type text not null,
  mime_type text not null,
  file_size numeric not null default 0,
  attachment_kind text not null check (attachment_kind in ('receipt', 'proof', 'screenshot', 'invoice', 'other')),
  visibility text not null default 'private' check (visibility in ('private', 'shared')),
  sync_status text not null default 'pending_upload',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('debt', 'shared_expense', 'group_debt', 'payment', 'settlement', 'group')),
  target_id text not null,
  group_id uuid references public.groups(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  body text not null,
  visibility text not null default 'private' check (visibility in ('private', 'shared')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.smart_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  suggestion_type text not null check (suggestion_type in ('tag', 'group', 'duplicate', 'recurring')),
  target_type text,
  target_id text,
  title text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'accepted', 'dismissed', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.export_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  export_type text not null check (export_type in ('pdf', 'csv', 'text_summary')),
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.csv_import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  status text not null check (status in ('preview', 'imported', 'cancelled')),
  source_name text,
  row_count integer not null default 0,
  imported_member_count integer not null default 0,
  imported_debt_count integer not null default 0,
  error_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sync_conflicts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  local_entity_id text not null,
  remote_entity_id uuid,
  conflict_type text not null,
  local_snapshot jsonb not null default '{}'::jsonb,
  remote_snapshot jsonb not null default '{}'::jsonb,
  base_snapshot jsonb,
  status text not null default 'unresolved',
  resolution text,
  resolved_at timestamptz,
  resolved_by_user_id uuid references auth.users(id) on delete set null,
  detected_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  target_type text,
  target_id text,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push_enabled boolean not null default false,
  email_enabled boolean not null default false,
  sensitive_details_enabled boolean not null default false,
  verification_enabled boolean not null default true,
  group_enabled boolean not null default true,
  payment_settlement_enabled boolean not null default true,
  reminder_enabled boolean not null default true,
  comment_enabled boolean not null default false,
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start text not null default '22:00',
  quiet_hours_end text not null default '07:00',
  updated_at timestamptz not null default now()
);

create table public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  expo_push_token text not null,
  platform text not null,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique(user_id, device_id)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  group_id uuid references public.groups(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  device_id text,
  created_at timestamptz not null default now()
);

create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  subject_user_id uuid not null,
  status text not null default 'requested' check (status in ('requested', 'queued', 'processing', 'anonymized', 'completed', 'failed', 'cancelled')),
  anonymization_status text not null default 'not_started' check (anonymization_status in ('not_started', 'revoking_access', 'deleting_private_data', 'anonymizing_shared_refs', 'awaiting_auth_delete', 'completed', 'failed')),
  request_channel text not null default 'mobile' check (request_channel in ('mobile', 'support', 'admin')),
  delete_local_data boolean not null default false,
  keep_local_archive boolean not null default true,
  requester_note text,
  admin_notes text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  requested_at timestamptz not null default now(),
  processing_started_at timestamptz,
  anonymized_at timestamptz,
  auth_user_deleted_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  failed_at timestamptz,
  updated_at timestamptz not null default now()
);

create unique index account_deletion_requests_active_subject_idx
  on public.account_deletion_requests(subject_user_id)
  where status in ('requested', 'queued', 'processing', 'anonymized');

-- Updated-at triggers.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles', 'link_requests', 'shared_debt_records', 'debt_verifications',
    'groups', 'group_participants', 'group_invites', 'group_members', 'group_member_claims',
    'group_duplicate_warnings', 'group_expenses', 'group_expense_splits', 'expense_payers',
    'group_debts', 'group_verification_responses', 'payments', 'settlements', 'settlement_lines',
    'recurring_templates', 'reminders', 'soft_reminders', 'overpayment_credits', 'attachments',
    'comments', 'smart_suggestions', 'csv_import_batches', 'notification_preferences',
    'account_deletion_requests'
  ]
  loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

create or replace function public.is_group_participant(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_participants participant
    where participant.group_id = target_group_id
      and participant.user_id = auth.uid()
      and participant.status = 'active'
  ) or exists (
    select 1 from public.groups target_group
    where target_group.id = target_group_id
      and target_group.owner_user_id = auth.uid()
  );
$$;

create or replace function public.group_role(target_group_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case
      when target_group.owner_user_id = auth.uid() then 'owner'
      else participant.role
    end
    from public.groups target_group
    left join public.group_participants participant
      on participant.group_id = target_group.id
      and participant.user_id = auth.uid()
      and participant.status = 'active'
    where target_group.id = target_group_id
    limit 1
  ), 'none');
$$;

create or replace function public.can_manage_group(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.group_role(target_group_id) in ('owner', 'admin');
$$;

create or replace function public.can_write_group_ledger(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.group_role(target_group_id) in ('owner', 'admin', 'member')
    and exists (
      select 1 from public.groups target_group
      where target_group.id = target_group_id
        and target_group.status not in ('finalising', 'settled', 'archived')
        and target_group.locked_at is null
    );
$$;

-- RPC helpers used by the mobile app.
create or replace function public.request_debt_verification(
  p_debt_id uuid,
  p_responder_user_id uuid,
  p_request_type text default 'creation',
  p_change_summary jsonb default null
)
returns public.debt_verifications
language plpgsql
security invoker
set search_path = public
as $$
declare new_verification public.debt_verifications;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required';
  end if;

  insert into public.debt_verifications (
    debt_id, requester_user_id, responder_user_id, request_type, change_summary, status
  ) values (
    p_debt_id, auth.uid(), p_responder_user_id, coalesce(p_request_type, 'creation'), p_change_summary, 'pending'
  ) returning * into new_verification;

  update public.shared_debt_records
  set verification_status = 'pending', updated_at = now()
  where id = p_debt_id
    and (creator_user_id = auth.uid() or involved_user_id = auth.uid());

  return new_verification;
end;
$$;

create or replace function public.respond_to_debt_verification(
  p_verification_id uuid,
  p_status text,
  p_rejection_reason text default null,
  p_suggested_change jsonb default null
)
returns public.debt_verifications
language plpgsql
security invoker
set search_path = public
as $$
declare updated_verification public.debt_verifications;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required';
  end if;

  update public.debt_verifications
  set status = p_status,
      rejection_reason = case when p_status = 'rejected' then p_rejection_reason else null end,
      suggested_change = case when p_status = 'rejected' then p_suggested_change else null end,
      responded_at = now(),
      updated_at = now()
  where id = p_verification_id
    and (responder_user_id = auth.uid() or requester_user_id = auth.uid())
  returning * into updated_verification;

  if updated_verification.id is null then
    raise exception 'Debt verification not found or permission denied';
  end if;

  update public.shared_debt_records
  set verification_status = p_status,
      suggested_change = case when p_status = 'rejected' then p_suggested_change else suggested_change end,
      updated_at = now()
  where id = updated_verification.debt_id;

  return updated_verification;
end;
$$;

create or replace function public.send_debt_confirmation_reminder(p_verification_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare target_verification public.debt_verifications;
begin
  select * into target_verification from public.debt_verifications where id = p_verification_id;
  if not found then
    return false;
  end if;
  if target_verification.requester_user_id <> auth.uid() then
    raise exception 'Only requester can send reminder';
  end if;
  insert into public.notifications(user_id, type, title, body, target_type, target_id, metadata)
  values (target_verification.responder_user_id, 'verification_request', 'Debt confirmation reminder', 'A shared debt is waiting for your confirmation.', 'debt', target_verification.debt_id::text, jsonb_build_object('verificationRemoteId', target_verification.id));
  return true;
end;
$$;

create or replace function public.respond_to_payment_confirmation(p_payment_id uuid, p_status text)
returns public.payments
language plpgsql
security invoker
set search_path = public
as $$
declare updated_payment public.payments;
begin
  update public.payments
  set confirmation_status = p_status,
      status = case when p_status = 'confirmed' then 'confirmed' when p_status = 'rejected' then 'rejected' else status end,
      updated_at = now()
  where id = p_payment_id
    and (created_by_user_id = auth.uid() or payer_user_id = auth.uid() or payee_user_id = auth.uid() or public.is_group_participant(group_id))
  returning * into updated_payment;

  if updated_payment.id is null then
    raise exception 'Payment not found or permission denied';
  end if;
  return updated_payment;
end;
$$;

create or replace function public.send_payment_confirmation_reminder(p_payment_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare target_payment public.payments;
declare recipient uuid;
begin
  select * into target_payment from public.payments where id = p_payment_id;
  if not found then
    return false;
  end if;
  if target_payment.created_by_user_id <> auth.uid() and not public.is_group_participant(target_payment.group_id) then
    raise exception 'Permission denied';
  end if;
  recipient := coalesce(target_payment.payee_user_id, target_payment.payer_user_id);
  if recipient is not null then
    insert into public.notifications(user_id, type, title, body, target_type, target_id, metadata)
    values (recipient, 'payment', 'Payment confirmation reminder', 'A payment is waiting for confirmation.', 'payment', target_payment.id::text, '{}'::jsonb);
  end if;
  return true;
end;
$$;

create or replace function public.request_account_deletion(
  p_delete_local_data boolean default false,
  p_keep_local_archive boolean default true,
  p_requester_note text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.account_deletion_requests
language plpgsql
security invoker
set search_path = public
as $$
declare existing_request public.account_deletion_requests;
declare new_request public.account_deletion_requests;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required';
  end if;

  select * into existing_request
  from public.account_deletion_requests
  where subject_user_id = auth.uid()
    and status in ('requested', 'queued', 'processing', 'anonymized')
  order by requested_at desc
  limit 1;

  if found then
    return existing_request;
  end if;

  insert into public.account_deletion_requests (
    user_id, subject_user_id, delete_local_data, keep_local_archive, requester_note, metadata
  ) values (
    auth.uid(), auth.uid(), coalesce(p_delete_local_data, false), coalesce(p_keep_local_archive, true), nullif(trim(p_requester_note), ''), coalesce(p_metadata, '{}'::jsonb)
  ) returning * into new_request;

  return new_request;
end;
$$;

create or replace function public.apply_account_deletion_anonymization(p_request_id uuid, p_admin_note text default null)
returns public.account_deletion_requests
language plpgsql
security definer
set search_path = public
as $$
declare target_request public.account_deletion_requests;
declare subject_id uuid;
begin
  select * into target_request from public.account_deletion_requests where id = p_request_id for update;
  if not found then
    raise exception 'Account deletion request not found';
  end if;
  subject_id := target_request.subject_user_id;

  update public.device_push_tokens set revoked_at = coalesce(revoked_at, now()), last_seen_at = now() where user_id = subject_id;
  delete from public.notifications where user_id = subject_id;
  delete from public.smart_suggestions where user_id = subject_id;
  delete from public.export_logs where user_id = subject_id;
  delete from public.csv_import_batches where user_id = subject_id;
  delete from public.sync_conflicts where owner_user_id = subject_id;
  delete from public.reminders where user_id = subject_id;

  update public.profiles set display_name = 'Deleted Debtulator user', email = null, phone = null, avatar_url = null where id = subject_id;
  update public.groups set owner_user_id = null where owner_user_id = subject_id;
  update public.group_participants set status = 'left' where user_id = subject_id and status = 'active';
  update public.group_members set linked_user_id = null, display_name = 'Deleted Debtulator user', alias = null, email = null, phone = null, notes = null where linked_user_id = subject_id;
  update public.shared_debt_records set creator_user_id = null where creator_user_id = subject_id;
  update public.shared_debt_records set involved_user_id = null where involved_user_id = subject_id;
  update public.debt_verifications set requester_user_id = null where requester_user_id = subject_id;
  update public.debt_verifications set responder_user_id = null where responder_user_id = subject_id;
  update public.payments set created_by_user_id = null where created_by_user_id = subject_id;
  update public.payments set payer_user_id = null where payer_user_id = subject_id;
  update public.payments set payee_user_id = null where payee_user_id = subject_id;

  update public.account_deletion_requests
  set status = 'anonymized',
      anonymization_status = 'awaiting_auth_delete',
      admin_notes = coalesce(nullif(trim(p_admin_note), ''), admin_notes),
      anonymized_at = coalesce(anonymized_at, now()),
      updated_at = now()
  where id = p_request_id
  returning * into target_request;

  return target_request;
end;
$$;

revoke all on function public.apply_account_deletion_anonymization(uuid, text) from public;
revoke all on function public.apply_account_deletion_anonymization(uuid, text) from anon;
revoke all on function public.apply_account_deletion_anonymization(uuid, text) from authenticated;
grant execute on function public.apply_account_deletion_anonymization(uuid, text) to service_role;
grant execute on function public.request_debt_verification(uuid, uuid, text, jsonb) to authenticated;
grant execute on function public.respond_to_debt_verification(uuid, text, text, jsonb) to authenticated;
grant execute on function public.send_debt_confirmation_reminder(uuid) to authenticated;
grant execute on function public.respond_to_payment_confirmation(uuid, text) to authenticated;
grant execute on function public.send_payment_confirmation_reminder(uuid) to authenticated;
grant execute on function public.request_account_deletion(boolean, boolean, text, jsonb) to authenticated;

-- Row level security.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles', 'activity_logs', 'link_requests', 'shared_debt_records', 'debt_verifications',
    'groups', 'group_participants', 'group_invites', 'group_members', 'group_member_claims',
    'group_duplicate_warnings', 'group_expenses', 'group_expense_splits', 'expense_payers',
    'group_debts', 'group_verification_responses', 'group_activity_logs', 'payments', 'settlements',
    'settlement_lines', 'recurring_templates', 'reminders', 'soft_reminders', 'overpayment_credits',
    'attachments', 'comments', 'smart_suggestions', 'export_logs', 'csv_import_batches',
    'sync_conflicts', 'notifications', 'notification_preferences', 'device_push_tokens', 'audit_logs',
    'account_deletion_requests'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

create policy profiles_owner on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy activity_actor on public.activity_logs for all using (actor_user_id = auth.uid() or actor_user_id is null) with check (actor_user_id = auth.uid() or actor_user_id is null);

create policy link_requests_relevant_select on public.link_requests for select using (requester_user_id = auth.uid() or target_user_id = auth.uid() or lower(target_email) = lower(coalesce(auth.jwt() ->> 'email', '')));
create policy link_requests_requester_insert on public.link_requests for insert with check (requester_user_id = auth.uid());

create policy shared_debt_involved_select on public.shared_debt_records for select using (creator_user_id = auth.uid() or involved_user_id = auth.uid());
create policy shared_debt_creator_insert on public.shared_debt_records for insert with check (creator_user_id = auth.uid());
create policy shared_debt_involved_update on public.shared_debt_records for update using (creator_user_id = auth.uid() or involved_user_id = auth.uid()) with check (creator_user_id = auth.uid() or involved_user_id = auth.uid());

create policy debt_verifications_involved_select on public.debt_verifications for select using (requester_user_id = auth.uid() or responder_user_id = auth.uid());
create policy debt_verifications_requester_insert on public.debt_verifications for insert with check (requester_user_id = auth.uid());
create policy debt_verifications_involved_update on public.debt_verifications for update using (requester_user_id = auth.uid() or responder_user_id = auth.uid()) with check (requester_user_id = auth.uid() or responder_user_id = auth.uid());

create policy groups_relevant_select on public.groups for select using (owner_user_id = auth.uid() or public.is_group_participant(id) or exists (select 1 from public.group_invites invite where invite.group_id = groups.id and invite.status = 'pending' and (invite.invited_user_id = auth.uid() or lower(invite.invited_email) = lower(coalesce(auth.jwt() ->> 'email', '')))));
create policy groups_owner_insert on public.groups for insert with check (owner_user_id = auth.uid() and visibility = 'shared');
create policy groups_manage_update on public.groups for update using (public.can_manage_group(id)) with check (public.can_manage_group(id));

create policy group_participants_relevant_select on public.group_participants for select using (public.is_group_participant(group_id) or user_id = auth.uid());
create policy group_participants_manage_all on public.group_participants for all using (public.can_manage_group(group_id)) with check (public.can_manage_group(group_id));

create policy group_invites_relevant_select on public.group_invites for select using (public.is_group_participant(group_id) or inviter_user_id = auth.uid() or invited_user_id = auth.uid() or lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', '')));
create policy group_invites_manage_insert on public.group_invites for insert with check (inviter_user_id = auth.uid() and public.can_manage_group(group_id));
create policy group_invites_relevant_update on public.group_invites for update using (public.can_manage_group(group_id) or invited_user_id = auth.uid() or lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))) with check (public.can_manage_group(group_id) or invited_user_id = auth.uid() or lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', '')));

create policy group_members_participants_select on public.group_members for select using (public.is_group_participant(group_id));
create policy group_members_manage_all on public.group_members for all using (public.can_manage_group(group_id)) with check (public.can_manage_group(group_id));

create policy group_member_claims_relevant_select on public.group_member_claims for select using (public.is_group_participant(group_id) or claimant_user_id = auth.uid());
create policy group_member_claims_claimant_insert on public.group_member_claims for insert with check (claimant_user_id = auth.uid() and public.is_group_participant(group_id));
create policy group_member_claims_relevant_update on public.group_member_claims for update using (public.can_manage_group(group_id) or claimant_user_id = auth.uid()) with check (public.can_manage_group(group_id) or claimant_user_id = auth.uid());

create policy group_duplicate_warnings_participants on public.group_duplicate_warnings for all using (public.is_group_participant(group_id)) with check (public.can_manage_group(group_id));

create policy group_expenses_participants_select on public.group_expenses for select using (public.is_group_participant(group_id));
create policy group_expenses_writer_insert on public.group_expenses for insert with check (creator_user_id = auth.uid() and public.can_write_group_ledger(group_id));
create policy group_expenses_creator_or_admin_update on public.group_expenses for update using (public.can_manage_group(group_id) or creator_user_id = auth.uid()) with check (public.can_manage_group(group_id) or creator_user_id = auth.uid());

create policy group_expense_splits_participants_select on public.group_expense_splits for select using (exists (select 1 from public.group_expenses expense where expense.id = group_expense_splits.expense_id and public.is_group_participant(expense.group_id)));
create policy group_expense_splits_writer_all on public.group_expense_splits for all using (exists (select 1 from public.group_expenses expense where expense.id = group_expense_splits.expense_id and public.can_write_group_ledger(expense.group_id))) with check (exists (select 1 from public.group_expenses expense where expense.id = group_expense_splits.expense_id and public.can_write_group_ledger(expense.group_id)));

create policy expense_payers_participants_select on public.expense_payers for select using (exists (select 1 from public.group_expenses expense where expense.id = expense_payers.expense_id and public.is_group_participant(expense.group_id)));
create policy expense_payers_writer_all on public.expense_payers for all using (exists (select 1 from public.group_expenses expense where expense.id = expense_payers.expense_id and public.can_write_group_ledger(expense.group_id))) with check (exists (select 1 from public.group_expenses expense where expense.id = expense_payers.expense_id and public.can_write_group_ledger(expense.group_id)));

create policy group_debts_participants_select on public.group_debts for select using (public.is_group_participant(group_id));
create policy group_debts_writer_insert on public.group_debts for insert with check (creator_user_id = auth.uid() and public.can_write_group_ledger(group_id));
create policy group_debts_creator_or_admin_update on public.group_debts for update using (public.can_manage_group(group_id) or creator_user_id = auth.uid()) with check (public.can_manage_group(group_id) or creator_user_id = auth.uid());

create policy group_verifications_participants_select on public.group_verification_responses for select using (public.is_group_participant(group_id));
create policy group_verifications_linked_insert on public.group_verification_responses for insert with check ((linked_user_id = auth.uid() and public.is_group_participant(group_id)) or public.can_manage_group(group_id));
create policy group_verifications_linked_update on public.group_verification_responses for update using (linked_user_id = auth.uid() or public.can_manage_group(group_id)) with check (linked_user_id = auth.uid() or public.can_manage_group(group_id));

create policy group_activity_participants_select on public.group_activity_logs for select using (public.is_group_participant(group_id));
create policy group_activity_participants_insert on public.group_activity_logs for insert with check (public.is_group_participant(group_id) and (actor_user_id is null or actor_user_id = auth.uid()));

create policy payments_relevant_select on public.payments for select using (created_by_user_id = auth.uid() or payer_user_id = auth.uid() or payee_user_id = auth.uid() or public.is_group_participant(group_id));
create policy payments_relevant_insert on public.payments for insert with check (created_by_user_id = auth.uid() or payer_user_id = auth.uid() or payee_user_id = auth.uid() or public.is_group_participant(group_id));
create policy payments_relevant_update on public.payments for update using (created_by_user_id = auth.uid() or payer_user_id = auth.uid() or payee_user_id = auth.uid() or public.is_group_participant(group_id)) with check (created_by_user_id = auth.uid() or payer_user_id = auth.uid() or payee_user_id = auth.uid() or public.is_group_participant(group_id));

create policy settlements_relevant_select on public.settlements for select using (created_by_user_id = auth.uid() or public.is_group_participant(group_id));
create policy settlements_relevant_all on public.settlements for all using (created_by_user_id = auth.uid() or public.is_group_participant(group_id)) with check (created_by_user_id = auth.uid() or public.is_group_participant(group_id));
create policy settlement_lines_via_settlement on public.settlement_lines for all using (exists (select 1 from public.settlements settlement where settlement.id = settlement_lines.settlement_id and (settlement.created_by_user_id = auth.uid() or public.is_group_participant(settlement.group_id)))) with check (exists (select 1 from public.settlements settlement where settlement.id = settlement_lines.settlement_id and (settlement.created_by_user_id = auth.uid() or public.is_group_participant(settlement.group_id))));

create policy recurring_templates_owner on public.recurring_templates for all using (created_by_user_id = auth.uid() or public.is_group_participant(group_id)) with check (created_by_user_id = auth.uid() or public.is_group_participant(group_id));
create policy reminders_owner on public.reminders for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy soft_reminders_involved on public.soft_reminders for all using (sender_user_id = auth.uid() or recipient_user_id = auth.uid()) with check (sender_user_id = auth.uid());
create policy overpayment_relevant on public.overpayment_credits for all using (created_by_user_id = auth.uid() or public.is_group_participant(group_id)) with check (created_by_user_id = auth.uid() or public.is_group_participant(group_id));

create policy attachments_relevant_select on public.attachments for select using (created_by_user_id = auth.uid() or (visibility = 'shared' and public.is_group_participant(group_id)));
create policy attachments_relevant_all on public.attachments for all using (created_by_user_id = auth.uid() or (visibility = 'shared' and public.is_group_participant(group_id))) with check (created_by_user_id = auth.uid() or (visibility = 'shared' and public.is_group_participant(group_id)));
create policy comments_relevant_all on public.comments for all using (author_user_id = auth.uid() or (visibility = 'shared' and public.is_group_participant(group_id))) with check (author_user_id = auth.uid() or (visibility = 'shared' and public.is_group_participant(group_id)));

create policy smart_suggestions_owner on public.smart_suggestions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy export_logs_owner on public.export_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy csv_import_batches_owner on public.csv_import_batches for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy sync_conflicts_owner on public.sync_conflicts for all using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy notifications_owner on public.notifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notification_preferences_owner on public.notification_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy device_push_tokens_owner on public.device_push_tokens for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy audit_logs_actor on public.audit_logs for all using (actor_user_id = auth.uid() or actor_user_id is null) with check (actor_user_id = auth.uid() or actor_user_id is null);
create policy account_deletion_requests_user_select on public.account_deletion_requests for select using (subject_user_id = auth.uid());
create policy account_deletion_requests_user_insert on public.account_deletion_requests for insert with check (user_id = auth.uid() and subject_user_id = auth.uid() and status = 'requested' and anonymization_status = 'not_started' and request_channel = 'mobile');

-- Indexes used by sync, pull hydration, and common filters.
create index groups_owner_idx on public.groups(owner_user_id, updated_at);
create index group_participants_user_idx on public.group_participants(user_id, group_id, status);
create index group_invites_invited_idx on public.group_invites(invited_user_id, invited_email, status);
create index group_members_group_idx on public.group_members(group_id, status);
create index group_expenses_group_idx on public.group_expenses(group_id, date, updated_at);
create index group_debts_group_idx on public.group_debts(group_id, date, updated_at);
create index payments_group_idx on public.payments(group_id, payment_date, updated_at);
create index settlements_group_idx on public.settlements(group_id, created_at);
create index comments_group_idx on public.comments(group_id, updated_at);
create index attachments_group_idx on public.attachments(group_id, updated_at);
create index sync_conflicts_owner_status_idx on public.sync_conflicts(owner_user_id, status, detected_at);
create index notifications_user_read_idx on public.notifications(user_id, read_at, created_at);
create index audit_logs_target_idx on public.audit_logs(target_type, target_id, created_at);

insert into storage.buckets (id, name, public)
values ('debtulator-attachments', 'debtulator-attachments', false)
on conflict (id) do nothing;

create policy attachment_files_group_participants_read on storage.objects
for select using (
  bucket_id = 'debtulator-attachments'
  and (
    owner = auth.uid()
    or exists (
      select 1
      from public.attachments attachment
      where attachment.storage_path = storage.objects.name
        and attachment.visibility = 'shared'
        and public.is_group_participant(attachment.group_id)
    )
  )
);

create policy attachment_files_owner_write on storage.objects
for all using (bucket_id = 'debtulator-attachments' and owner = auth.uid())
with check (bucket_id = 'debtulator-attachments' and owner = auth.uid());

commit;
