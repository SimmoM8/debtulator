-- Debtulator Stage 8: account deletion request tracking and anonymization readiness.
-- Apply after stage2 through stage7 migrations.
--
-- The mobile app can create/read its own deletion request with the anon key.
-- Fulfillment must run from a trusted Edge Function or admin worker with the
-- service role key because it updates other tables and calls Auth admin APIs.

create extension if not exists pgcrypto;

alter table public.shared_debt_records
  alter column creator_user_id drop not null,
  alter column involved_user_id drop not null;

alter table public.debt_verifications
  alter column requester_user_id drop not null,
  alter column responder_user_id drop not null;

alter table public.groups
  alter column owner_user_id drop not null;

do $$
begin
  alter table public.shared_debt_records
    drop constraint if exists shared_debt_records_creator_user_id_fkey,
    drop constraint if exists shared_debt_records_involved_user_id_fkey;
  alter table public.shared_debt_records
    add constraint shared_debt_records_creator_user_id_fkey
      foreign key (creator_user_id) references auth.users(id) on delete set null not valid,
    add constraint shared_debt_records_involved_user_id_fkey
      foreign key (involved_user_id) references auth.users(id) on delete set null not valid;

  alter table public.debt_verifications
    drop constraint if exists debt_verifications_requester_user_id_fkey,
    drop constraint if exists debt_verifications_responder_user_id_fkey;
  alter table public.debt_verifications
    add constraint debt_verifications_requester_user_id_fkey
      foreign key (requester_user_id) references auth.users(id) on delete set null not valid,
    add constraint debt_verifications_responder_user_id_fkey
      foreign key (responder_user_id) references auth.users(id) on delete set null not valid;

  alter table public.groups
    drop constraint if exists groups_owner_user_id_fkey;
  alter table public.groups
    add constraint groups_owner_user_id_fkey
      foreign key (owner_user_id) references auth.users(id) on delete set null not valid;
end $$;

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  subject_user_id uuid not null,
  status text not null default 'requested'
    check (status in ('requested', 'queued', 'processing', 'anonymized', 'completed', 'failed', 'cancelled')),
  anonymization_status text not null default 'not_started'
    check (
      anonymization_status in (
        'not_started',
        'revoking_access',
        'deleting_private_data',
        'anonymizing_shared_refs',
        'awaiting_auth_delete',
        'completed',
        'failed'
      )
    ),
  request_channel text not null default 'mobile'
    check (request_channel in ('mobile', 'support', 'admin')),
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

drop trigger if exists account_deletion_requests_set_updated_at on public.account_deletion_requests;
create trigger account_deletion_requests_set_updated_at
before update on public.account_deletion_requests
for each row execute function public.set_updated_at();

create unique index if not exists account_deletion_requests_active_subject_idx
on public.account_deletion_requests(subject_user_id)
where status in ('requested', 'queued', 'processing', 'anonymized');

create index if not exists account_deletion_requests_status_idx
on public.account_deletion_requests(status, anonymization_status, requested_at);

alter table public.account_deletion_requests enable row level security;

drop policy if exists account_deletion_requests_user_read on public.account_deletion_requests;
create policy account_deletion_requests_user_read
on public.account_deletion_requests for select
using (subject_user_id = auth.uid());

drop policy if exists account_deletion_requests_user_insert on public.account_deletion_requests;
create policy account_deletion_requests_user_insert
on public.account_deletion_requests for insert
with check (
  user_id = auth.uid()
  and subject_user_id = auth.uid()
  and status = 'requested'
  and anonymization_status = 'not_started'
  and request_channel = 'mobile'
  and admin_notes is null
  and error_message is null
  and processing_started_at is null
  and anonymized_at is null
  and auth_user_deleted_at is null
  and completed_at is null
  and cancelled_at is null
  and failed_at is null
);

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
declare
  existing_request public.account_deletion_requests;
  new_request public.account_deletion_requests;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required to request account deletion';
  end if;

  select *
  into existing_request
  from public.account_deletion_requests
  where subject_user_id = auth.uid()
    and status in ('requested', 'queued', 'processing', 'anonymized')
  order by requested_at desc
  limit 1;

  if found then
    return existing_request;
  end if;

  insert into public.account_deletion_requests (
    user_id,
    subject_user_id,
    delete_local_data,
    keep_local_archive,
    requester_note,
    metadata
  )
  values (
    auth.uid(),
    auth.uid(),
    coalesce(p_delete_local_data, false),
    coalesce(p_keep_local_archive, true),
    nullif(trim(p_requester_note), ''),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into new_request;

  return new_request;
end;
$$;

grant execute on function public.request_account_deletion(boolean, boolean, text, jsonb) to authenticated;

create or replace function public.apply_account_deletion_anonymization(
  p_request_id uuid,
  p_admin_note text default null
)
returns public.account_deletion_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  target_request public.account_deletion_requests;
  subject_id uuid;
begin
  select *
  into target_request
  from public.account_deletion_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Account deletion request not found';
  end if;

  if target_request.status in ('completed', 'cancelled') then
    return target_request;
  end if;

  subject_id := target_request.subject_user_id;

  update public.account_deletion_requests
  set status = 'processing',
      anonymization_status = 'revoking_access',
      processing_started_at = coalesce(processing_started_at, now()),
      admin_notes = coalesce(nullif(trim(p_admin_note), ''), admin_notes)
  where id = p_request_id;

  update public.device_push_tokens
  set revoked_at = coalesce(revoked_at, now()),
      last_seen_at = now()
  where device_push_tokens.user_id = subject_id;

  update public.notification_preferences
  set push_enabled = false,
      email_enabled = false,
      verification_enabled = false,
      group_enabled = false,
      payment_settlement_enabled = false,
      reminder_enabled = false,
      comment_enabled = false,
      updated_at = now()
  where notification_preferences.user_id = subject_id;

  update public.account_deletion_requests
  set anonymization_status = 'deleting_private_data'
  where id = p_request_id;

  delete from public.notifications where notifications.user_id = subject_id;
  delete from public.smart_suggestions where smart_suggestions.user_id = subject_id;
  delete from public.export_logs where export_logs.user_id = subject_id;
  delete from public.csv_import_batches where csv_import_batches.user_id = subject_id;
  delete from public.sync_conflicts where sync_conflicts.owner_user_id = subject_id;
  delete from public.reminders where reminders.user_id = subject_id;
  delete from public.soft_reminders
  where soft_reminders.sender_user_id = subject_id
     or soft_reminders.recipient_user_id = subject_id;
  delete from public.attachments
  where attachments.created_by_user_id = subject_id
    and attachments.visibility = 'private';
  delete from public.comments
  where comments.author_user_id = subject_id
    and comments.visibility = 'private';

  update public.account_deletion_requests
  set anonymization_status = 'anonymizing_shared_refs'
  where id = p_request_id;

  update public.profiles
  set display_name = 'Deleted Debtulator user',
      email = null,
      phone = null,
      avatar_url = null
  where profiles.id = subject_id;

  update public.link_requests
  set target_user_id = null,
      target_email = null,
      target_phone = null
  where link_requests.target_user_id = subject_id;

  update public.shared_debt_records
  set creator_user_id = case when shared_debt_records.creator_user_id = subject_id then null else shared_debt_records.creator_user_id end,
      involved_user_id = case when shared_debt_records.involved_user_id = subject_id then null else shared_debt_records.involved_user_id end
  where shared_debt_records.creator_user_id = subject_id
     or shared_debt_records.involved_user_id = subject_id;

  update public.debt_verifications
  set requester_user_id = case when debt_verifications.requester_user_id = subject_id then null else debt_verifications.requester_user_id end,
      responder_user_id = case when debt_verifications.responder_user_id = subject_id then null else debt_verifications.responder_user_id end
  where debt_verifications.requester_user_id = subject_id
     or debt_verifications.responder_user_id = subject_id;

  update public.groups
  set owner_user_id = null
  where groups.owner_user_id = subject_id;

  update public.group_participants
  set status = 'left'
  where group_participants.user_id = subject_id
    and group_participants.status = 'active';

  update public.group_members
  set linked_user_id = null,
      display_name = 'Deleted Debtulator user',
      alias = null,
      email = null,
      phone = null,
      notes = null
  where group_members.linked_user_id = subject_id;

  update public.group_invites
  set invited_user_id = null,
      invited_email = null,
      invited_phone = null
  where group_invites.invited_user_id = subject_id;

  update public.group_expenses
  set creator_user_id = null
  where group_expenses.creator_user_id = subject_id;

  update public.group_debts
  set creator_user_id = null
  where group_debts.creator_user_id = subject_id;

  update public.group_verification_responses
  set linked_user_id = null
  where group_verification_responses.linked_user_id = subject_id;

  update public.group_activity_logs
  set actor_user_id = null
  where group_activity_logs.actor_user_id = subject_id;

  update public.payments
  set created_by_user_id = case when payments.created_by_user_id = subject_id then null else payments.created_by_user_id end,
      payer_user_id = case when payments.payer_user_id = subject_id then null else payments.payer_user_id end,
      payee_user_id = case when payments.payee_user_id = subject_id then null else payments.payee_user_id end
  where payments.created_by_user_id = subject_id
     or payments.payer_user_id = subject_id
     or payments.payee_user_id = subject_id;

  update public.settlements
  set created_by_user_id = null
  where settlements.created_by_user_id = subject_id;

  update public.recurring_templates
  set created_by_user_id = null
  where recurring_templates.created_by_user_id = subject_id;

  update public.overpayment_credits
  set created_by_user_id = null
  where overpayment_credits.created_by_user_id = subject_id;

  update public.attachments
  set created_by_user_id = null
  where attachments.created_by_user_id = subject_id;

  update public.comments
  set author_user_id = null
  where comments.author_user_id = subject_id;

  update public.audit_logs
  set actor_user_id = null
  where audit_logs.actor_user_id = subject_id;

  update public.activity_logs
  set actor_user_id = null
  where activity_logs.actor_user_id = subject_id;

  update public.account_deletion_requests
  set status = 'anonymized',
      anonymization_status = 'awaiting_auth_delete',
      anonymized_at = coalesce(anonymized_at, now())
  where id = p_request_id
  returning * into target_request;

  return target_request;
exception
  when others then
    update public.account_deletion_requests
    set status = 'failed',
        anonymization_status = 'failed',
        error_message = sqlerrm,
        failed_at = coalesce(failed_at, now())
    where id = p_request_id;
    raise;
end;
$$;

revoke all on function public.apply_account_deletion_anonymization(uuid, text) from public;
revoke all on function public.apply_account_deletion_anonymization(uuid, text) from anon;
revoke all on function public.apply_account_deletion_anonymization(uuid, text) from authenticated;
grant execute on function public.apply_account_deletion_anonymization(uuid, text) to service_role;
