begin;

create extension if not exists pgtap with schema extensions;

select plan(38);

-- Stable identities make failures reproducible and keep the fixtures readable.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'owner@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Owner"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'member@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Member"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'outsider@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Outsider"}'::jsonb,
    now(),
    now()
  );

insert into public.link_requests (
  id,
  requester_user_id,
  target_user_id,
  target_email,
  requester_member_local_or_remote_id,
  requester_label,
  status
) values (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'member@example.test',
  'member-local-1',
  'Owner',
  'accepted'
);

insert into public.groups (
  id,
  owner_user_id,
  name,
  default_currency,
  allowed_currencies,
  visibility,
  status
) values (
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Security test group',
  'SEK',
  array['SEK'],
  'shared',
  'active'
);

insert into public.group_participants (
  id,
  group_id,
  user_id,
  role,
  status,
  joined_at
) values
  (
    '31000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'owner',
    'active',
    now()
  ),
  (
    '31000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    'member',
    'active',
    now()
  );

insert into public.shared_debt_records (
  id,
  creator_user_id,
  involved_user_id,
  client_generated_id,
  local_member_reference,
  amount,
  currency,
  title,
  notes_visible_to_other_user,
  debt_date,
  due_date,
  direction,
  visibility,
  verification_status,
  settlement_status
) values (
  '40000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'debt-local-1',
  'member-local-1',
  100,
  'SEK',
  'Canonical debt',
  'Original note',
  '2026-08-01',
  '2026-09-01',
  'they_owe_me',
  'shared_with_involved_member',
  'pending',
  'active'
);

insert into public.debt_verifications (
  id,
  debt_id,
  requester_user_id,
  responder_user_id,
  request_type,
  change_summary,
  status
) values (
  '41000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'amendment',
  '{"changedFields":["amount"],"previous":{"amount":100},"proposed":{"amount":125}}'::jsonb,
  'pending'
);

insert into public.payments (
  id,
  client_generated_id,
  created_by_user_id,
  payer_user_id,
  payee_user_id,
  amount,
  currency,
  payment_date,
  notes,
  status,
  confirmation_status,
  visibility
) values (
  '50000000-0000-0000-0000-000000000001',
  'payment-local-1',
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  75,
  'SEK',
  '2026-08-15',
  'Original payment note',
  'pending_confirmation',
  'pending_confirmation',
  'shared_with_involved_member'
);

insert into public.activity_logs (
  id,
  actor_user_id,
  entity_kind,
  entity_id,
  action
) values
  (
    '60000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'debt',
    'debt-local-1',
    'owner_activity'
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    null,
    'security',
    'system-event',
    'system_activity'
  );

insert into public.audit_logs (
  id,
  actor_user_id,
  action,
  target_type,
  target_id
) values
  (
    '61000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'owner_audit',
    'debt',
    'debt-local-1'
  ),
  (
    '61000000-0000-0000-0000-000000000002',
    null,
    'system_audit',
    'security',
    'system-event'
  );

insert into public.group_activity_logs (
  id,
  group_id,
  actor_user_id,
  action,
  target_type,
  target_id
) values (
  '62000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'group_created',
  'group',
  '30000000-0000-0000-0000-000000000001'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","email":"owner@example.test"}',
  true
);

select is((select count(*) from public.shared_debt_records), 1::bigint, 'owner can read the shared debt');
select is((select count(*) from public.payments), 1::bigint, 'owner can read the payment');
select is((select count(*) from public.activity_logs), 1::bigint, 'owner sees only their activity row');
select is((select count(*) from public.audit_logs), 1::bigint, 'owner sees only their audit row');
select throws_ok(
  $$update public.shared_debt_records set amount = 999 where id = '40000000-0000-0000-0000-000000000001'$$,
  '42501',
  'Shared debt review fields must be changed through a verification RPC.',
  'creator cannot bypass debt review by changing amount directly'
);
select throws_ok(
  $$update public.shared_debt_records set involved_user_id = '10000000-0000-0000-0000-000000000003' where id = '40000000-0000-0000-0000-000000000001'$$,
  '42501',
  'Shared debt identities are immutable after creation.',
  'creator cannot retarget a shared debt'
);
select lives_ok(
  $$update public.shared_debt_records set notes_visible_to_other_user = 'Updated note' where id = '40000000-0000-0000-0000-000000000001'$$,
  'creator may update non-review debt metadata'
);
select throws_ok(
  $$update public.payments set confirmation_status = 'confirmed', status = 'confirmed' where id = '50000000-0000-0000-0000-000000000001'$$,
  '42501',
  'Payment confirmation state must be changed through the response RPC.',
  'creator cannot self-confirm a payment directly'
);
select throws_ok(
  $$update public.payments set amount = 1 where id = '50000000-0000-0000-0000-000000000001'$$,
  '42501',
  'Payment financial and participant fields are immutable after creation.',
  'creator cannot change payment amount after requesting confirmation'
);
select lives_ok(
  $$update public.payments set notes = 'Updated payment note' where id = '50000000-0000-0000-0000-000000000001'$$,
  'creator may update payment notes'
);
select throws_ok(
  $$insert into public.activity_logs (actor_user_id, entity_kind, entity_id, action) values (null, 'security', 'spoof', 'spoof')$$,
  '42501',
  'new row violates row-level security policy for table "activity_logs"',
  'authenticated caller cannot create globally visible null-actor activity'
);
select throws_ok(
  $$insert into public.audit_logs (actor_user_id, action, target_type, target_id) values (null, 'spoof', 'security', 'spoof')$$,
  '42501',
  'new row violates row-level security policy for table "audit_logs"',
  'authenticated caller cannot create globally visible null-actor audit rows'
);
select lives_ok(
  $$insert into public.activity_logs (actor_user_id, entity_kind, entity_id, action) values ('10000000-0000-0000-0000-000000000001', 'debt', 'debt-local-1', 'owner_note')$$,
  'authenticated caller can write their own activity'
);
select lives_ok(
  $$insert into public.audit_logs (actor_user_id, action, target_type, target_id) values ('10000000-0000-0000-0000-000000000001', 'owner_note', 'debt', 'debt-local-1')$$,
  'authenticated caller can write their own audit record'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated","email":"member@example.test"}',
  true
);

select is((select count(*) from public.shared_debt_records), 1::bigint, 'involved member can read the shared debt');
select is((select count(*) from public.payments), 1::bigint, 'involved member can read the payment');
select is((select count(*) from public.activity_logs), 0::bigint, 'member cannot read owner or system activity');
select is((select count(*) from public.audit_logs), 0::bigint, 'member cannot read owner or system audit rows');
select throws_ok(
  $$update public.shared_debt_records set amount = 2 where id = '40000000-0000-0000-0000-000000000001'$$,
  '42501',
  'Only the creator may directly update shared debt metadata.',
  'involved member cannot change debt amount directly'
);
select throws_ok(
  $$update public.shared_debt_records set notes_visible_to_other_user = 'spoofed' where id = '40000000-0000-0000-0000-000000000001'$$,
  '42501',
  'Only the creator may directly update shared debt metadata.',
  'involved member cannot change debt notes directly'
);
select throws_ok(
  $$update public.payments set amount = 2 where id = '50000000-0000-0000-0000-000000000001'$$,
  '42501',
  'Payment financial and participant fields are immutable after creation.',
  'counterparty cannot change payment amount directly'
);
select throws_ok(
  $$update public.payments set confirmation_status = 'confirmed', status = 'confirmed' where id = '50000000-0000-0000-0000-000000000001'$$,
  '42501',
  'Only the payment creator may directly update payment metadata.',
  'counterparty cannot confirm by direct update'
);
select lives_ok(
  $$select public.respond_to_payment_confirmation('50000000-0000-0000-0000-000000000001', 'confirmed')$$,
  'counterparty can confirm through the guarded RPC'
);
select is(
  (select confirmation_status from public.payments where id = '50000000-0000-0000-0000-000000000001'),
  'confirmed',
  'payment RPC applies confirmation state'
);
select is(
  (select amount from public.payments where id = '50000000-0000-0000-0000-000000000001'),
  75::numeric,
  'payment RPC leaves the immutable amount unchanged'
);
select lives_ok(
  $$select public.respond_to_debt_verification('41000000-0000-0000-0000-000000000001', 'verified', null, null)$$,
  'responder can accept a debt proposal through the guarded RPC'
);
select is(
  (select amount from public.shared_debt_records where id = '40000000-0000-0000-0000-000000000001'),
  125::numeric,
  'accepted debt proposal updates canonical amount'
);
select is(
  (select status from public.debt_verifications where id = '41000000-0000-0000-0000-000000000001'),
  'verified',
  'accepted debt proposal closes the pending verification'
);
select throws_ok(
  $$select public.respond_to_payment_confirmation('50000000-0000-0000-0000-000000000001', 'rejected')$$,
  'P0001',
  'Pending payment confirmation not found or permission denied',
  'payment response is single-use under concurrent retries'
);
select is(
  (select count(*) from public.group_activity_logs),
  1::bigint,
  'active group member can read group activity'
);
select throws_ok(
  $$insert into public.group_activity_logs (group_id, actor_user_id, action, target_type) values ('30000000-0000-0000-0000-000000000001', null, 'spoof', 'group')$$,
  '42501',
  'new row violates row-level security policy for table "group_activity_logs"',
  'group member cannot spoof a system activity event'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated","email":"outsider@example.test"}',
  true
);

select is((select count(*) from public.shared_debt_records), 0::bigint, 'outsider cannot read the debt');
select is((select count(*) from public.payments), 0::bigint, 'outsider cannot read the payment');
select is((select count(*) from public.activity_logs), 0::bigint, 'outsider cannot read private activity');
select is((select count(*) from public.audit_logs), 0::bigint, 'outsider cannot read private audit rows');
select is((select count(*) from public.group_activity_logs), 0::bigint, 'outsider cannot read group activity');

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok(
  $$select count(*) from public.shared_debt_records$$,
  '42501',
  'permission denied for table shared_debt_records',
  'anonymous callers cannot read private financial rows'
);
select throws_ok(
  $$select public.respond_to_payment_confirmation('50000000-0000-0000-0000-000000000001', 'confirmed')$$,
  '42501',
  'permission denied for function respond_to_payment_confirmation',
  'anonymous callers cannot execute financial response RPCs'
);

select * from finish();
rollback;
