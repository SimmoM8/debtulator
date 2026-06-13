-- Debtulator Stage 4: payments, settlements, recurring records, reminders, and split payer support.
-- Apply after stage2_schema.sql and stage3_schema.sql.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  created_by_user_id uuid references auth.users(id),
  payer_user_id uuid references auth.users(id),
  payee_user_id uuid references auth.users(id),
  payer_member_id text,
  payee_member_id text,
  payer_group_member_id uuid,
  payee_group_member_id uuid,
  group_id uuid,
  amount numeric not null check (amount >= 0),
  currency text not null,
  payment_date date not null,
  notes text,
  status text not null default 'recorded',
  confirmation_status text not null default 'pending_confirmation',
  visibility text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  created_by_user_id uuid references auth.users(id),
  group_id uuid,
  member_id text,
  type text not null check (type in ('manual', 'from_suggestion')),
  currency text not null,
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.settlement_lines (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references public.settlements(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  source_record_type text not null,
  source_record_id text not null,
  applied_amount numeric not null check (applied_amount >= 0),
  currency text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expense_payers (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null,
  group_member_id uuid not null,
  amount_paid numeric not null check (amount_paid >= 0),
  currency text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recurring_templates (
  id uuid primary key default gen_random_uuid(),
  created_by_user_id uuid references auth.users(id),
  group_id uuid,
  member_id text,
  type text not null,
  title text not null,
  amount numeric not null check (amount >= 0),
  currency text not null,
  recurrence_rule text not null,
  start_date date not null,
  end_date date,
  next_occurrence_date date not null,
  last_generated_date date,
  status text not null default 'active',
  auto_generate boolean not null default false,
  reminder_settings jsonb,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  target_type text not null,
  target_id text not null,
  remind_at timestamptz not null,
  repeat_rule text,
  status text not null default 'scheduled',
  message text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.soft_reminders (
  id uuid primary key default gen_random_uuid(),
  sender_user_id uuid references auth.users(id),
  recipient_user_id uuid references auth.users(id),
  related_member_id text,
  related_group_id uuid,
  related_record_id text,
  message text not null,
  status text not null default 'sent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.overpayment_credits (
  id uuid primary key default gen_random_uuid(),
  created_by_user_id uuid references auth.users(id),
  payer_member_id text,
  payee_member_id text,
  payer_group_member_id uuid,
  payee_group_member_id uuid,
  group_id uuid,
  amount numeric not null check (amount >= 0),
  currency text not null,
  source_payment_id uuid references public.payments(id),
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payments enable row level security;
alter table public.settlements enable row level security;
alter table public.settlement_lines enable row level security;
alter table public.expense_payers enable row level security;
alter table public.recurring_templates enable row level security;
alter table public.reminders enable row level security;
alter table public.soft_reminders enable row level security;
alter table public.overpayment_credits enable row level security;

drop policy if exists payments_involved_read on public.payments;
create policy payments_involved_read on public.payments
  for select using (
    auth.uid() = created_by_user_id or auth.uid() = payer_user_id or auth.uid() = payee_user_id
  );

drop policy if exists payments_involved_write on public.payments;
create policy payments_involved_write on public.payments
  for insert with check (
    auth.uid() = created_by_user_id or auth.uid() = payer_user_id or auth.uid() = payee_user_id
  );

drop policy if exists payments_involved_update on public.payments;
create policy payments_involved_update on public.payments
  for update using (
    auth.uid() = created_by_user_id or auth.uid() = payer_user_id or auth.uid() = payee_user_id
  );

drop policy if exists settlements_creator_read on public.settlements;
create policy settlements_creator_read on public.settlements
  for select using (auth.uid() = created_by_user_id);

drop policy if exists settlements_creator_write on public.settlements;
create policy settlements_creator_write on public.settlements
  for all using (auth.uid() = created_by_user_id) with check (auth.uid() = created_by_user_id);

drop policy if exists settlement_lines_via_settlement on public.settlement_lines;
create policy settlement_lines_via_settlement on public.settlement_lines
  for all using (
    exists (
      select 1 from public.settlements s
      where s.id = settlement_id and s.created_by_user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.settlements s
      where s.id = settlement_id and s.created_by_user_id = auth.uid()
    )
  );

drop policy if exists recurring_templates_creator on public.recurring_templates;
create policy recurring_templates_creator on public.recurring_templates
  for all using (auth.uid() = created_by_user_id) with check (auth.uid() = created_by_user_id);

drop policy if exists reminders_owner on public.reminders;
create policy reminders_owner on public.reminders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists soft_reminders_involved on public.soft_reminders;
create policy soft_reminders_involved on public.soft_reminders
  for all using (auth.uid() = sender_user_id or auth.uid() = recipient_user_id)
  with check (auth.uid() = sender_user_id);

drop policy if exists overpayment_creator on public.overpayment_credits;
create policy overpayment_creator on public.overpayment_credits
  for all using (auth.uid() = created_by_user_id) with check (auth.uid() = created_by_user_id);
