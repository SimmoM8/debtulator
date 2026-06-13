-- Debtulator optional Supabase seed data
-- Run after schema.sql.
-- Requires at least one Supabase Auth user. The first auth.users row becomes the demo owner.

begin;

do $$
declare
  demo_user uuid;
  demo_email text;
  demo_group uuid;
  owner_member uuid;
  sarah_member uuid;
  daniel_member uuid;
  cabin_expense uuid;
  fuel_debt uuid;
begin
  select id, email
  into demo_user, demo_email
  from auth.users
  order by created_at
  limit 1;

  if demo_user is null then
    raise notice 'No auth user found. Create/sign up a user first, then rerun supabase/seed.sql.';
    return;
  end if;

  -- Make reruns predictable during early development.
  delete from public.groups
  where owner_user_id = demo_user
    and name = 'Debtulator Demo Group';

  insert into public.profiles (id, display_name, email, base_currency)
  values (demo_user, 'Demo User', demo_email, 'SEK')
  on conflict (id) do update set
    display_name = excluded.display_name,
    email = excluded.email,
    base_currency = excluded.base_currency,
    updated_at = now();

  insert into public.notification_preferences (user_id)
  values (demo_user)
  on conflict (user_id) do nothing;

  insert into public.groups (
    owner_user_id,
    name,
    description,
    default_currency,
    allowed_currencies,
    tags,
    visibility,
    status
  ) values (
    demo_user,
    'Debtulator Demo Group',
    'Seeded shared group for testing Supabase sync, expenses, debts, comments, and attachments.',
    'SEK',
    array['SEK', 'AUD', 'EUR'],
    array['demo', 'trip'],
    'shared',
    'active'
  ) returning id into demo_group;

  insert into public.group_participants (group_id, user_id, role, status, joined_at)
  values (demo_group, demo_user, 'owner', 'active', now());

  insert into public.group_members (
    group_id,
    type,
    linked_user_id,
    display_name,
    alias,
    email,
    created_by_user_id,
    status
  ) values (
    demo_group,
    'linked_user',
    demo_user,
    'You',
    'You',
    demo_email,
    demo_user,
    'active'
  ) returning id into owner_member;

  insert into public.group_members (
    group_id,
    type,
    display_name,
    email,
    notes,
    created_by_user_id,
    status
  ) values (
    demo_group,
    'unlinked_placeholder',
    'Sarah',
    'sarah@example.com',
    'Placeholder group member for invite and claim testing.',
    demo_user,
    'active'
  ) returning id into sarah_member;

  insert into public.group_members (
    group_id,
    type,
    display_name,
    email,
    notes,
    created_by_user_id,
    status
  ) values (
    demo_group,
    'unlinked_placeholder',
    'Daniel',
    'daniel@example.com',
    'Placeholder group member for split testing.',
    demo_user,
    'active'
  ) returning id into daniel_member;

  insert into public.group_invites (
    group_id,
    inviter_user_id,
    invited_email,
    invited_display_name,
    offered_role,
    status,
    message
  ) values (
    demo_group,
    demo_user,
    'sarah@example.com',
    'Sarah',
    'member',
    'pending',
    'Join this demo Debtulator group.'
  );

  insert into public.group_expenses (
    group_id,
    creator_user_id,
    payer_group_member_id,
    amount,
    currency,
    title,
    notes,
    date,
    tags,
    split_method,
    verification_status,
    settlement_status,
    status
  ) values (
    demo_group,
    demo_user,
    owner_member,
    900,
    'SEK',
    'Cabin groceries',
    'Seeded group expense split equally between three members.',
    current_date,
    array['food', 'demo'],
    'equal',
    'pending',
    'active',
    'active'
  ) returning id into cabin_expense;

  insert into public.group_expense_splits (expense_id, group_member_id, included, calculated_share_amount)
  values
    (cabin_expense, owner_member, true, 300),
    (cabin_expense, sarah_member, true, 300),
    (cabin_expense, daniel_member, true, 300);

  insert into public.expense_payers (expense_id, group_member_id, amount_paid, currency)
  values (cabin_expense, owner_member, 900, 'SEK');

  insert into public.group_debts (
    group_id,
    creator_user_id,
    debtor_group_member_id,
    creditor_group_member_id,
    amount,
    currency,
    title,
    notes,
    date,
    tags,
    verification_status,
    settlement_status,
    status
  ) values (
    demo_group,
    demo_user,
    sarah_member,
    owner_member,
    120,
    'SEK',
    'Fuel contribution',
    'Seeded direct group debt.',
    current_date,
    array['fuel', 'demo'],
    'pending',
    'active',
    'active'
  ) returning id into fuel_debt;

  insert into public.comments (target_type, target_id, group_id, author_user_id, body, visibility)
  values ('group', demo_group::text, demo_group, demo_user, 'Seeded cloud demo group is ready.', 'shared');

  insert into public.group_activity_logs (group_id, actor_user_id, action, target_type, target_id, metadata)
  values
    (demo_group, demo_user, 'group_created', 'group', demo_group::text, jsonb_build_object('source', 'seed.sql')),
    (demo_group, demo_user, 'expense_added', 'shared_expense', cabin_expense::text, jsonb_build_object('amount', 900, 'currency', 'SEK')),
    (demo_group, demo_user, 'simple_debt_added', 'group_debt', fuel_debt::text, jsonb_build_object('amount', 120, 'currency', 'SEK'));

  insert into public.notifications (user_id, type, title, body, target_type, target_id, metadata)
  values (
    demo_user,
    'group_update',
    'Demo group seeded',
    'Supabase now contains one shared demo group for Debtulator sync testing.',
    'group',
    demo_group::text,
    jsonb_build_object('source', 'seed.sql')
  );

  raise notice 'Seeded Debtulator demo group % for user %', demo_group, demo_user;
end $$;

commit;
