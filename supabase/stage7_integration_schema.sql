-- Debtulator Stage 7: local/remote integration fixes for shared group sync.
-- Apply after stage2 through stage6 migrations. This migration is additive.

create extension if not exists pgcrypto;

alter table public.expense_payers
  add column if not exists archived_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'expense_payers_expense_fk') then
    alter table public.expense_payers
      add constraint expense_payers_expense_fk
      foreign key (expense_id) references public.group_expenses(id) on delete cascade
      not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'expense_payers_group_member_fk') then
    alter table public.expense_payers
      add constraint expense_payers_group_member_fk
      foreign key (group_member_id) references public.group_members(id) on delete cascade
      not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'payments_group_fk') then
    alter table public.payments
      add constraint payments_group_fk
      foreign key (group_id) references public.groups(id) on delete cascade
      not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'payments_payer_group_member_fk') then
    alter table public.payments
      add constraint payments_payer_group_member_fk
      foreign key (payer_group_member_id) references public.group_members(id) on delete set null
      not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'payments_payee_group_member_fk') then
    alter table public.payments
      add constraint payments_payee_group_member_fk
      foreign key (payee_group_member_id) references public.group_members(id) on delete set null
      not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'settlements_group_fk') then
    alter table public.settlements
      add constraint settlements_group_fk
      foreign key (group_id) references public.groups(id) on delete cascade
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

create index if not exists group_expenses_group_updated_idx on public.group_expenses(group_id, updated_at);
create index if not exists group_expense_splits_expense_idx on public.group_expense_splits(expense_id, group_member_id);
create index if not exists expense_payers_expense_idx on public.expense_payers(expense_id, group_member_id);
create index if not exists group_debts_group_updated_idx on public.group_debts(group_id, updated_at);
create index if not exists group_verification_group_updated_idx on public.group_verification_responses(group_id, updated_at);
create index if not exists payments_group_updated_idx on public.payments(group_id, updated_at);
create index if not exists settlements_group_updated_idx on public.settlements(group_id, updated_at);
create index if not exists settlement_lines_settlement_idx on public.settlement_lines(settlement_id, updated_at);
create index if not exists comments_group_updated_idx on public.comments(group_id, updated_at);
create index if not exists attachments_group_updated_idx on public.attachments(group_id, updated_at);

drop policy if exists "Creators admins can update group expenses" on public.group_expenses;
create policy group_expenses_writers_update on public.group_expenses
  for update using (
    public.can_write_group_ledger(group_id)
    and (creator_user_id = auth.uid() or public.can_manage_group(group_id))
  ) with check (
    public.can_write_group_ledger(group_id)
    and (creator_user_id = auth.uid() or public.can_manage_group(group_id))
  );

drop policy if exists "Creators admins can update group debts" on public.group_debts;
create policy group_debts_writers_update on public.group_debts
  for update using (
    public.can_write_group_ledger(group_id)
    and (creator_user_id = auth.uid() or public.can_manage_group(group_id))
  ) with check (
    public.can_write_group_ledger(group_id)
    and (creator_user_id = auth.uid() or public.can_manage_group(group_id))
  );

drop policy if exists expense_payers_group_participants_read on public.expense_payers;
create policy expense_payers_group_participants_read on public.expense_payers
  for select using (
    exists (
      select 1
      from public.group_expenses expense
      where expense.id = expense_payers.expense_id
        and public.is_group_participant(expense.group_id)
    )
  );

drop policy if exists expense_payers_group_writers on public.expense_payers;
create policy expense_payers_group_writers on public.expense_payers
  for all using (
    exists (
      select 1
      from public.group_expenses expense
      where expense.id = expense_payers.expense_id
        and public.can_write_group_ledger(expense.group_id)
    )
  ) with check (
    exists (
      select 1
      from public.group_expenses expense
      where expense.id = expense_payers.expense_id
        and public.can_write_group_ledger(expense.group_id)
    )
  );

drop policy if exists payments_shared_group_read on public.payments;
create policy payments_shared_group_read on public.payments
  for select using (
    auth.uid() = created_by_user_id
    or auth.uid() = payer_user_id
    or auth.uid() = payee_user_id
    or (group_id is not null and public.is_group_participant(group_id))
  );

drop policy if exists payments_shared_group_insert on public.payments;
create policy payments_shared_group_insert on public.payments
  for insert with check (
    auth.uid() = created_by_user_id
    and (
      group_id is null
      or public.can_write_group_ledger(group_id)
    )
  );

drop policy if exists payments_shared_group_update on public.payments;
create policy payments_shared_group_update on public.payments
  for update using (
    auth.uid() = created_by_user_id
    or (group_id is not null and public.can_manage_group(group_id))
  ) with check (
    auth.uid() = created_by_user_id
    or (group_id is not null and public.can_manage_group(group_id))
  );

drop policy if exists settlements_shared_group_read on public.settlements;
create policy settlements_shared_group_read on public.settlements
  for select using (
    auth.uid() = created_by_user_id
    or (group_id is not null and public.is_group_participant(group_id))
  );

drop policy if exists settlements_shared_group_insert on public.settlements;
create policy settlements_shared_group_insert on public.settlements
  for insert with check (
    auth.uid() = created_by_user_id
    and (
      group_id is null
      or public.can_write_group_ledger(group_id)
    )
  );

drop policy if exists settlements_shared_group_update on public.settlements;
create policy settlements_shared_group_update on public.settlements
  for update using (
    auth.uid() = created_by_user_id
    or (group_id is not null and public.can_manage_group(group_id))
  ) with check (
    auth.uid() = created_by_user_id
    or (group_id is not null and public.can_manage_group(group_id))
  );

drop policy if exists settlement_lines_shared_group_read on public.settlement_lines;
create policy settlement_lines_shared_group_read on public.settlement_lines
  for select using (
    exists (
      select 1
      from public.settlements settlement
      where settlement.id = settlement_lines.settlement_id
        and (
          settlement.created_by_user_id = auth.uid()
          or (settlement.group_id is not null and public.is_group_participant(settlement.group_id))
        )
    )
  );

drop policy if exists settlement_lines_shared_group_write on public.settlement_lines;
create policy settlement_lines_shared_group_write on public.settlement_lines
  for all using (
    exists (
      select 1
      from public.settlements settlement
      where settlement.id = settlement_lines.settlement_id
        and (
          settlement.created_by_user_id = auth.uid()
          or (settlement.group_id is not null and public.can_write_group_ledger(settlement.group_id))
        )
    )
  ) with check (
    exists (
      select 1
      from public.settlements settlement
      where settlement.id = settlement_lines.settlement_id
        and (
          settlement.created_by_user_id = auth.uid()
          or (settlement.group_id is not null and public.can_write_group_ledger(settlement.group_id))
        )
    )
  );

drop policy if exists "Linked involved users can verify group records" on public.group_verification_responses;
drop policy if exists group_verification_involved_insert on public.group_verification_responses;
create policy group_verification_involved_insert on public.group_verification_responses
  for insert with check (
    linked_user_id = auth.uid()
    and public.is_group_participant(group_id)
    and exists (
      select 1
      from public.group_members member
      where member.id = group_verification_responses.group_member_id
        and member.group_id = group_verification_responses.group_id
        and member.linked_user_id = auth.uid()
        and member.status <> 'merged'
    )
    and (
      target_type = 'split'
      or exists (
        select 1 from public.group_expenses expense
        where target_type = 'expense'
          and expense.id = group_verification_responses.target_id
          and expense.group_id = group_verification_responses.group_id
          and (
            expense.payer_group_member_id = group_verification_responses.group_member_id
            or exists (
              select 1 from public.group_expense_splits split
              where split.expense_id = expense.id
                and split.group_member_id = group_verification_responses.group_member_id
                and split.included
            )
          )
      )
      or exists (
        select 1 from public.group_debts debt
        where target_type = 'debt'
          and debt.id = group_verification_responses.target_id
          and debt.group_id = group_verification_responses.group_id
          and group_verification_responses.group_member_id in (debt.debtor_group_member_id, debt.creditor_group_member_id)
      )
    )
  );

drop policy if exists comments_creator_or_group_participant on public.comments;
drop policy if exists comments_shared_group_read on public.comments;
create policy comments_shared_group_read on public.comments
  for select using (
    auth.uid() = author_user_id
    or (
      visibility = 'shared'
      and group_id is not null
      and public.is_group_participant(group_id)
    )
  );

drop policy if exists comments_shared_group_write on public.comments;
create policy comments_shared_group_write on public.comments
  for all using (
    auth.uid() = author_user_id
    or (
      visibility = 'shared'
      and group_id is not null
      and public.can_write_group_ledger(group_id)
    )
  ) with check (
    auth.uid() = author_user_id
    or (
      visibility = 'shared'
      and group_id is not null
      and public.can_write_group_ledger(group_id)
    )
  );

drop policy if exists attachments_creator_or_group_participant_read on public.attachments;
drop policy if exists attachments_creator_or_group_participant_write on public.attachments;
drop policy if exists attachments_shared_group_read on public.attachments;
create policy attachments_shared_group_read on public.attachments
  for select using (
    auth.uid() = created_by_user_id
    or (
      visibility = 'shared'
      and group_id is not null
      and public.is_group_participant(group_id)
    )
  );

drop policy if exists attachments_shared_group_write on public.attachments;
create policy attachments_shared_group_write on public.attachments
  for all using (
    auth.uid() = created_by_user_id
    or (
      visibility = 'shared'
      and group_id is not null
      and public.can_write_group_ledger(group_id)
    )
  ) with check (
    auth.uid() = created_by_user_id
    or (
      visibility = 'shared'
      and group_id is not null
      and public.can_write_group_ledger(group_id)
    )
  );
