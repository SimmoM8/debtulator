-- Stage 6 production hardening: sync queue mirror, conflicts, notifications, privacy preferences, and audit logs.
-- This migration is intentionally backend-ready. Client code must still rely on RLS, not UI hiding.

create table if not exists public.sync_conflicts (
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
  resolved_by_user_id uuid references auth.users(id),
  detected_at timestamptz not null default now()
);

alter table public.sync_conflicts enable row level security;

create policy "Users can read own sync conflicts"
  on public.sync_conflicts for select
  using (auth.uid() = owner_user_id);

create policy "Users can create own sync conflicts"
  on public.sync_conflicts for insert
  with check (auth.uid() = owner_user_id);

create policy "Users can resolve own sync conflicts"
  on public.sync_conflicts for update
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  target_type text,
  target_id text,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "Users can read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can mark own notifications read"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push_enabled boolean not null default false,
  email_enabled boolean not null default false,
  sensitive_details_enabled boolean not null default false,
  verification_enabled boolean not null default true,
  event_enabled boolean not null default true,
  payment_settlement_enabled boolean not null default true,
  reminder_enabled boolean not null default true,
  comment_enabled boolean not null default false,
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start text not null default '22:00',
  quiet_hours_end text not null default '07:00',
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy "Users manage own notification preferences"
  on public.notification_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  expo_push_token text not null,
  platform text not null,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique(user_id, device_id)
);

alter table public.device_push_tokens enable row level security;

create policy "Users manage own push tokens"
  on public.device_push_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id),
  action text not null,
  target_type text not null,
  target_id text,
  event_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  device_id text,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

create policy "Users can read own audit events"
  on public.audit_logs for select
  using (actor_user_id = auth.uid());

create policy "Users can append own audit events"
  on public.audit_logs for insert
  with check (actor_user_id = auth.uid() or actor_user_id is null);

create index if not exists sync_conflicts_owner_status_idx on public.sync_conflicts(owner_user_id, status, detected_at);
create index if not exists notifications_user_read_idx on public.notifications(user_id, read_at, created_at);
create index if not exists audit_logs_target_idx on public.audit_logs(target_type, target_id, created_at);
