-- Debtulator Stage 7: local/remote integration fixes for shared event sync.
-- Apply after stage2 through stage6 migrations. This migration is additive.

create extension if not exists pgcrypto;

alter table public.expense_payers
  add column if not exists archived_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'expense_payers_expense_fk') then
    alter table public.expense_payers
      add constraint expense_payers_expense_fk
      foreign key (expense_id) references public.event_expenses(id) on delete cascade
      not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'expense_payers_event_member_fk') then
    alter table public.expense_payers
      add constraint expense_payers_event_member_fk
      foreign key (event_member_id) references public.event_members(id) on delete cascade
      not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'payments_event_fk') then
    alter table public.payments
      add constraint payments_event_fk
      foreign key (event_id) references public.events(id) on delete cascade
      not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'payments_payer_event_member_fk') then
    alter table public.payments
      add constraint payments_payer_event_member_fk
      foreign key (payer_event_member_id) references public.event_members(id) on delete set null
      not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'payments_payee_event_member_fk') then
    alter table public.payments
      add constraint payments_payee_event_member_fk
      foreign key (payee_event_member_id) references public.event_members(id) on delete set null
      not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'settlements_event_fk') then
    alter table public.settlements
      add constraint settlements_event_fk
      foreign key (event_id) references public.events(id) on delete cascade
      not valid;
  end if;
end $$;

alter table public.settlement_lines
  add column if not exists archived_at timestamptz;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'payments',
    'settlements',
    'settlement_lines',
    'expense_payers',
    'attachments',
    'comments'
  ]
  loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', table_name, table_name);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

create index if not exists event_expenses_event_updated_idx on public.event_expenses(event_id, updated_at);
create index if not exists event_expense_splits_expense_idx on public.event_expense_splits(expense_id, event_member_id);
create index if not exists expense_payers_expense_idx on public.expense_payers(expense_id, event_member_id);
create index if not exists event_debts_event_updated_idx on public.event_debts(event_id, updated_at);
create index if not exists event_verification_event_updated_idx on public.event_verification_responses(event_id, updated_at);
create index if not exists payments_event_updated_idx on public.payments(event_id, updated_at);
create index if not exists settlements_event_updated_idx on public.settlements(event_id, updated_at);
create index if not exists settlement_lines_settlement_idx on public.settlement_lines(settlement_id, updated_at);
create index if not exists comments_event_updated_idx on public.comments(event_id, updated_at);
create index if not exists attachments_event_updated_idx on public.attachments(event_id, updated_at);

drop policy if exists "Creators admins can update event expenses" on public.event_expenses;
create policy event_expenses_writers_update on public.event_expenses
  for update using (
    public.can_write_event_ledger(event_id)
    and (creator_user_id = auth.uid() or public.can_manage_event(event_id))
  ) with check (
    public.can_write_event_ledger(event_id)
    and (creator_user_id = auth.uid() or public.can_manage_event(event_id))
  );

drop policy if exists "Creators admins can update event debts" on public.event_debts;
create policy event_debts_writers_update on public.event_debts
  for update using (
    public.can_write_event_ledger(event_id)
    and (creator_user_id = auth.uid() or public.can_manage_event(event_id))
  ) with check (
    public.can_write_event_ledger(event_id)
    and (creator_user_id = auth.uid() or public.can_manage_event(event_id))
  );

drop policy if exists expense_payers_event_participants_read on public.expense_payers;
create policy expense_payers_event_participants_read on public.expense_payers
  for select using (
    exists (
      select 1
      from public.event_expenses expense
      where expense.id = expense_payers.expense_id
        and public.is_event_participant(expense.event_id)
    )
  );

drop policy if exists expense_payers_event_writers on public.expense_payers;
create policy expense_payers_event_writers on public.expense_payers
  for all using (
    exists (
      select 1
      from public.event_expenses expense
      where expense.id = expense_payers.expense_id
        and public.can_write_event_ledger(expense.event_id)
    )
  ) with check (
    exists (
      select 1
      from public.event_expenses expense
      where expense.id = expense_payers.expense_id
        and public.can_write_event_ledger(expense.event_id)
    )
  );

drop policy if exists payments_shared_event_read on public.payments;
create policy payments_shared_event_read on public.payments
  for select using (
    auth.uid() = created_by_user_id
    or auth.uid() = payer_user_id
    or auth.uid() = payee_user_id
    or (event_id is not null and public.is_event_participant(event_id))
  );

drop policy if exists payments_shared_event_insert on public.payments;
create policy payments_shared_event_insert on public.payments
  for insert with check (
    auth.uid() = created_by_user_id
    and (
      event_id is null
      or public.can_write_event_ledger(event_id)
    )
  );

drop policy if exists payments_shared_event_update on public.payments;
create policy payments_shared_event_update on public.payments
  for update using (
    auth.uid() = created_by_user_id
    or (event_id is not null and public.can_manage_event(event_id))
  ) with check (
    auth.uid() = created_by_user_id
    or (event_id is not null and public.can_manage_event(event_id))
  );

drop policy if exists settlements_shared_event_read on public.settlements;
create policy settlements_shared_event_read on public.settlements
  for select using (
    auth.uid() = created_by_user_id
    or (event_id is not null and public.is_event_participant(event_id))
  );

drop policy if exists settlements_shared_event_insert on public.settlements;
create policy settlements_shared_event_insert on public.settlements
  for insert with check (
    auth.uid() = created_by_user_id
    and (
      event_id is null
      or public.can_write_event_ledger(event_id)
    )
  );

drop policy if exists settlements_shared_event_update on public.settlements;
create policy settlements_shared_event_update on public.settlements
  for update using (
    auth.uid() = created_by_user_id
    or (event_id is not null and public.can_manage_event(event_id))
  ) with check (
    auth.uid() = created_by_user_id
    or (event_id is not null and public.can_manage_event(event_id))
  );

drop policy if exists settlement_lines_shared_event_read on public.settlement_lines;
create policy settlement_lines_shared_event_read on public.settlement_lines
  for select using (
    exists (
      select 1
      from public.settlements settlement
      where settlement.id = settlement_lines.settlement_id
        and (
          settlement.created_by_user_id = auth.uid()
          or (settlement.event_id is not null and public.is_event_participant(settlement.event_id))
        )
    )
  );

drop policy if exists settlement_lines_shared_event_write on public.settlement_lines;
create policy settlement_lines_shared_event_write on public.settlement_lines
  for all using (
    exists (
      select 1
      from public.settlements settlement
      where settlement.id = settlement_lines.settlement_id
        and (
          settlement.created_by_user_id = auth.uid()
          or (settlement.event_id is not null and public.can_write_event_ledger(settlement.event_id))
        )
    )
  ) with check (
    exists (
      select 1
      from public.settlements settlement
      where settlement.id = settlement_lines.settlement_id
        and (
          settlement.created_by_user_id = auth.uid()
          or (settlement.event_id is not null and public.can_write_event_ledger(settlement.event_id))
        )
    )
  );

drop policy if exists "Linked involved users can verify event records" on public.event_verification_responses;
drop policy if exists event_verification_involved_insert on public.event_verification_responses;
create policy event_verification_involved_insert on public.event_verification_responses
  for insert with check (
    linked_user_id = auth.uid()
    and public.is_event_participant(event_id)
    and exists (
      select 1
      from public.event_members member
      where member.id = event_verification_responses.event_member_id
        and member.event_id = event_verification_responses.event_id
        and member.linked_user_id = auth.uid()
        and member.status <> 'merged'
    )
    and (
      target_type = 'split'
      or exists (
        select 1 from public.event_expenses expense
        where target_type = 'expense'
          and expense.id = event_verification_responses.target_id
          and expense.event_id = event_verification_responses.event_id
          and (
            expense.payer_event_member_id = event_verification_responses.event_member_id
            or exists (
              select 1 from public.event_expense_splits split
              where split.expense_id = expense.id
                and split.event_member_id = event_verification_responses.event_member_id
                and split.included
            )
          )
      )
      or exists (
        select 1 from public.event_debts debt
        where target_type = 'debt'
          and debt.id = event_verification_responses.target_id
          and debt.event_id = event_verification_responses.event_id
          and event_verification_responses.event_member_id in (debt.debtor_event_member_id, debt.creditor_event_member_id)
      )
    )
  );

drop policy if exists comments_creator_or_event_participant on public.comments;
drop policy if exists comments_shared_event_read on public.comments;
create policy comments_shared_event_read on public.comments
  for select using (
    auth.uid() = author_user_id
    or (
      visibility = 'shared'
      and event_id is not null
      and public.is_event_participant(event_id)
    )
  );

drop policy if exists comments_shared_event_write on public.comments;
create policy comments_shared_event_write on public.comments
  for all using (
    auth.uid() = author_user_id
    or (
      visibility = 'shared'
      and event_id is not null
      and public.can_write_event_ledger(event_id)
    )
  ) with check (
    auth.uid() = author_user_id
    or (
      visibility = 'shared'
      and event_id is not null
      and public.can_write_event_ledger(event_id)
    )
  );

drop policy if exists attachments_creator_or_event_participant_read on public.attachments;
drop policy if exists attachments_creator_or_event_participant_write on public.attachments;
drop policy if exists attachments_shared_event_read on public.attachments;
create policy attachments_shared_event_read on public.attachments
  for select using (
    auth.uid() = created_by_user_id
    or (
      visibility = 'shared'
      and event_id is not null
      and public.is_event_participant(event_id)
    )
  );

drop policy if exists attachments_shared_event_write on public.attachments;
create policy attachments_shared_event_write on public.attachments
  for all using (
    auth.uid() = created_by_user_id
    or (
      visibility = 'shared'
      and event_id is not null
      and public.can_write_event_ledger(event_id)
    )
  ) with check (
    auth.uid() = created_by_user_id
    or (
      visibility = 'shared'
      and event_id is not null
      and public.can_write_event_ledger(event_id)
    )
  );
