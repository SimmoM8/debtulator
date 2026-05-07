-- Debtulator Stage 5: attachments, comments, exports/imports, analytics state, and smart suggestions.
-- Apply after stage2_schema.sql, stage3_schema.sql, and stage4_schema.sql.

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('debt', 'shared_expense', 'event_debt', 'payment', 'settlement', 'event', 'comment')),
  target_id text not null,
  event_id uuid,
  created_by_user_id uuid references auth.users(id),
  storage_path text,
  file_name text not null,
  file_type text not null,
  mime_type text not null,
  file_size numeric not null default 0,
  attachment_kind text not null check (attachment_kind in ('receipt', 'proof', 'screenshot', 'invoice', 'other')),
  visibility text not null default 'private' check (visibility in ('private', 'shared')),
  sync_status text not null default 'pending_upload',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('debt', 'shared_expense', 'event_debt', 'payment', 'settlement', 'event')),
  target_id text not null,
  event_id uuid,
  author_user_id uuid references auth.users(id),
  body text not null,
  visibility text not null default 'private' check (visibility in ('private', 'shared')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.smart_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  suggestion_type text not null check (suggestion_type in ('tag', 'event', 'duplicate', 'recurring')),
  target_type text,
  target_id text,
  title text not null,
  message text not null,
  metadata jsonb not null default '{}',
  status text not null default 'active' check (status in ('active', 'accepted', 'dismissed', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.export_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  export_type text not null check (export_type in ('pdf', 'csv', 'text_summary')),
  target_type text,
  target_id text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create table if not exists public.csv_import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  status text not null check (status in ('preview', 'imported', 'cancelled')),
  source_name text,
  row_count integer not null default 0,
  imported_member_count integer not null default 0,
  imported_debt_count integer not null default 0,
  error_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

alter table public.attachments enable row level security;
alter table public.comments enable row level security;
alter table public.smart_suggestions enable row level security;
alter table public.export_logs enable row level security;
alter table public.csv_import_batches enable row level security;

drop policy if exists attachments_creator_or_event_participant_read on public.attachments;
create policy attachments_creator_or_event_participant_read on public.attachments
  for select using (
    auth.uid() = created_by_user_id
    or (
      visibility = 'shared'
      and event_id is not null
      and exists (
        select 1 from public.event_participants ep
        where ep.event_id = attachments.event_id
          and ep.user_id = auth.uid()
          and ep.status = 'active'
      )
    )
  );

drop policy if exists attachments_creator_or_event_participant_write on public.attachments;
create policy attachments_creator_or_event_participant_write on public.attachments
  for all using (
    auth.uid() = created_by_user_id
    or (
      visibility = 'shared'
      and event_id is not null
      and exists (
        select 1 from public.event_participants ep
        where ep.event_id = attachments.event_id
          and ep.user_id = auth.uid()
          and ep.status = 'active'
          and ep.role in ('owner', 'admin', 'member')
      )
    )
  ) with check (
    auth.uid() = created_by_user_id
    or (
      visibility = 'shared'
      and event_id is not null
      and exists (
        select 1 from public.event_participants ep
        where ep.event_id = attachments.event_id
          and ep.user_id = auth.uid()
          and ep.status = 'active'
          and ep.role in ('owner', 'admin', 'member')
      )
    )
  );

drop policy if exists comments_creator_or_event_participant on public.comments;
create policy comments_creator_or_event_participant on public.comments
  for all using (
    auth.uid() = author_user_id
    or (
      visibility = 'shared'
      and event_id is not null
      and exists (
        select 1 from public.event_participants ep
        where ep.event_id = comments.event_id
          and ep.user_id = auth.uid()
          and ep.status = 'active'
      )
    )
  ) with check (
    auth.uid() = author_user_id
    or (
      visibility = 'shared'
      and event_id is not null
      and exists (
        select 1 from public.event_participants ep
        where ep.event_id = comments.event_id
          and ep.user_id = auth.uid()
          and ep.status = 'active'
      )
    )
  );

drop policy if exists smart_suggestions_owner on public.smart_suggestions;
create policy smart_suggestions_owner on public.smart_suggestions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists export_logs_owner on public.export_logs;
create policy export_logs_owner on public.export_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists csv_import_batches_owner on public.csv_import_batches;
create policy csv_import_batches_owner on public.csv_import_batches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('debtulator-attachments', 'debtulator-attachments', false)
on conflict (id) do nothing;

drop policy if exists attachment_files_event_participants_read on storage.objects;
create policy attachment_files_event_participants_read on storage.objects
  for select using (
    bucket_id = 'debtulator-attachments'
    and (
      owner = auth.uid()
      or exists (
        select 1
        from public.attachments a
        left join public.event_participants ep on ep.event_id = a.event_id
        where a.storage_path = storage.objects.name
          and a.visibility = 'shared'
          and ep.user_id = auth.uid()
          and ep.status = 'active'
      )
    )
  );

drop policy if exists attachment_files_owner_write on storage.objects;
create policy attachment_files_owner_write on storage.objects
  for all using (
    bucket_id = 'debtulator-attachments' and owner = auth.uid()
  ) with check (
    bucket_id = 'debtulator-attachments' and owner = auth.uid()
  );
