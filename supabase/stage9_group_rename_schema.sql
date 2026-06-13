-- Debtulator Stage 9: rename the Events domain to Groups without losing data.
-- Apply after stage2 through stage8 on existing deployments.

do $$
declare
  rename_pair text[];
begin
  foreach rename_pair slice 1 in array array[
    array['events', 'groups'],
    array['event_participants', 'group_participants'],
    array['event_invites', 'group_invites'],
    array['event_members', 'group_members'],
    array['event_member_claims', 'group_member_claims'],
    array['event_duplicate_warnings', 'group_duplicate_warnings'],
    array['event_expenses', 'group_expenses'],
    array['event_expense_splits', 'group_expense_splits'],
    array['event_debts', 'group_debts'],
    array['event_verification_responses', 'group_verification_responses'],
    array['event_activity_logs', 'group_activity_logs']
  ]
  loop
    if to_regclass('public.' || rename_pair[1]) is not null
      and to_regclass('public.' || rename_pair[2]) is null then
      execute format('alter table public.%I rename to %I', rename_pair[1], rename_pair[2]);
    end if;
  end loop;
end $$;

do $$
declare
  rename_spec text[];
begin
  foreach rename_spec slice 1 in array array[
    array['shared_debt_records', 'event_id', 'group_id'],
    array['group_participants', 'event_id', 'group_id'],
    array['group_invites', 'event_id', 'group_id'],
    array['group_members', 'event_id', 'group_id'],
    array['group_members', 'merged_into_event_member_id', 'merged_into_group_member_id'],
    array['group_member_claims', 'event_id', 'group_id'],
    array['group_member_claims', 'event_member_id', 'group_member_id'],
    array['group_duplicate_warnings', 'event_id', 'group_id'],
    array['group_duplicate_warnings', 'event_member_id_a', 'group_member_id_a'],
    array['group_duplicate_warnings', 'event_member_id_b', 'group_member_id_b'],
    array['group_expenses', 'event_id', 'group_id'],
    array['group_expenses', 'payer_event_member_id', 'payer_group_member_id'],
    array['group_expense_splits', 'event_member_id', 'group_member_id'],
    array['group_debts', 'event_id', 'group_id'],
    array['group_debts', 'debtor_event_member_id', 'debtor_group_member_id'],
    array['group_debts', 'creditor_event_member_id', 'creditor_group_member_id'],
    array['group_verification_responses', 'event_id', 'group_id'],
    array['group_verification_responses', 'event_member_id', 'group_member_id'],
    array['group_activity_logs', 'event_id', 'group_id'],
    array['payments', 'event_id', 'group_id'],
    array['payments', 'payer_event_member_id', 'payer_group_member_id'],
    array['payments', 'payee_event_member_id', 'payee_group_member_id'],
    array['settlements', 'event_id', 'group_id'],
    array['expense_payers', 'event_member_id', 'group_member_id'],
    array['recurring_templates', 'event_id', 'group_id'],
    array['soft_reminders', 'related_event_id', 'related_group_id'],
    array['overpayment_credits', 'event_id', 'group_id'],
    array['overpayment_credits', 'payer_event_member_id', 'payer_group_member_id'],
    array['overpayment_credits', 'payee_event_member_id', 'payee_group_member_id'],
    array['attachments', 'event_id', 'group_id'],
    array['comments', 'event_id', 'group_id'],
    array['audit_logs', 'event_id', 'group_id']
  ]
  loop
    if to_regclass('public.' || rename_spec[1]) is not null
      and exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = rename_spec[1]
          and column_name = rename_spec[2]
      )
      and not exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = rename_spec[1]
          and column_name = rename_spec[3]
      ) then
      execute format(
        'alter table public.%I rename column %I to %I',
        rename_spec[1],
        rename_spec[2],
        rename_spec[3]
      );
    end if;
  end loop;
end $$;

do $$
begin
  if to_regprocedure('public.is_event_participant(uuid)') is not null
    and to_regprocedure('public.is_group_participant(uuid)') is null then
    alter function public.is_event_participant(uuid) rename to is_group_participant;
  end if;
  if to_regprocedure('public.event_role(uuid)') is not null
    and to_regprocedure('public.group_role(uuid)') is null then
    alter function public.event_role(uuid) rename to group_role;
  end if;
  if to_regprocedure('public.can_manage_event(uuid)') is not null
    and to_regprocedure('public.can_manage_group(uuid)') is null then
    alter function public.can_manage_event(uuid) rename to can_manage_group;
  end if;
  if to_regprocedure('public.can_write_event_ledger(uuid)') is not null
    and to_regprocedure('public.can_write_group_ledger(uuid)') is null then
    alter function public.can_write_event_ledger(uuid) rename to can_write_group_ledger;
  end if;
end $$;

create or replace function public.is_group_participant(target_event_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_participants
    where group_id = target_event_id
      and user_id = auth.uid()
      and status = 'active'
  )
  or exists (
    select 1
    from public.groups
    where id = target_event_id
      and owner_user_id = auth.uid()
  );
$$;

create or replace function public.group_role(target_event_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select 'owner' from public.groups where id = target_event_id and owner_user_id = auth.uid()),
    (
      select role
      from public.group_participants
      where group_id = target_event_id
        and user_id = auth.uid()
        and status = 'active'
      limit 1
    ),
    'viewer'
  );
$$;

create or replace function public.can_manage_group(target_event_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.group_role(target_event_id) in ('owner', 'admin');
$$;

create or replace function public.can_write_group_ledger(target_event_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.group_role(target_event_id) in ('owner', 'admin', 'member')
    and not exists (
      select 1
      from public.groups
      where id = target_event_id
        and (
          status in ('settled', 'archived')
          or locked_at is not null
          or archived_at is not null
        )
    );
$$;

alter table public.shared_debt_records
  drop constraint if exists shared_debt_records_visibility_check;

alter table public.attachments
  drop constraint if exists attachments_target_type_check;

alter table public.comments
  drop constraint if exists comments_target_type_check;

alter table public.smart_suggestions
  drop constraint if exists smart_suggestions_suggestion_type_check;

update public.shared_debt_records
set visibility = case visibility
  when 'future_event_shared' then 'future_group_shared'
  when 'shared_event' then 'shared_group'
  else visibility
end
where visibility in ('future_event_shared', 'shared_event');

update public.recurring_templates set type = 'group_debt' where type = 'event_debt';
update public.settlement_lines set source_record_type = 'group_debt' where source_record_type = 'event_debt';
update public.attachments set target_type = 'group' where target_type = 'event';
update public.comments set target_type = 'group' where target_type = 'event';
update public.smart_suggestions set suggestion_type = 'group' where suggestion_type = 'event';
update public.sync_conflicts
set entity_type = replace(entity_type, 'event', 'group'),
    conflict_type = case conflict_type when 'event_locked' then 'group_locked' else conflict_type end
where entity_type like '%event%' or conflict_type = 'event_locked';
update public.notifications
set type = replace(type, 'event', 'group'),
    target_type = case target_type when 'event' then 'group' else target_type end
where type like '%event%' or target_type = 'event';
update public.audit_logs set target_type = 'group' where target_type = 'event';

alter table public.shared_debt_records
  add constraint shared_debt_records_visibility_check
    check (visibility in ('private', 'shared_with_involved_member', 'future_group_shared'));
alter table public.attachments
  add constraint attachments_target_type_check
    check (target_type in ('debt', 'shared_expense', 'group_debt', 'payment', 'settlement', 'group', 'comment'));
alter table public.comments
  add constraint comments_target_type_check
    check (target_type in ('debt', 'shared_expense', 'group_debt', 'payment', 'settlement', 'group'));
alter table public.smart_suggestions
  add constraint smart_suggestions_suggestion_type_check
    check (suggestion_type in ('tag', 'group', 'duplicate', 'recurring'));
