const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const migrationPath = path.resolve(
  __dirname,
  '../supabase/stage10_debt_confirmation_schema.sql',
);
const reminderMigrationPath = path.resolve(
  __dirname,
  '../supabase/stage11_confirmation_review_schema.sql',
);
const sql = fs.readFileSync(migrationPath, 'utf8');
const reminderSql = fs.readFileSync(reminderMigrationPath, 'utf8');
const debtFormSource = fs.readFileSync(
  path.resolve(__dirname, '../src/screens/DebtFormScreen.tsx'),
  'utf8',
);
const debtDetailSource = fs.readFileSync(
  path.resolve(__dirname, '../src/screens/DebtDetailScreen.tsx'),
  'utf8',
);
const paymentFormSource = fs.readFileSync(
  path.resolve(__dirname, '../src/screens/PaymentFormScreen.tsx'),
  'utf8',
);

test('debt confirmations distinguish creation and amendment requests', () => {
  assert.match(sql, /add column if not exists request_type/i);
  assert.match(sql, /check \(request_type in \('creation', 'amendment'\)\)/i);
  assert.match(sql, /add column if not exists change_summary jsonb/i);
});

test('only the designated responder can answer a pending confirmation', () => {
  assert.match(sql, /create or replace function public\.respond_to_debt_verification/i);
  assert.match(sql, /security definer/i);
  assert.match(sql, /verification\.responder_user_id <> auth\.uid\(\)/i);
  assert.match(sql, /verification\.status <> 'pending'/i);
  assert.match(sql, /grant execute on function public\.respond_to_debt_verification[\s\S]*to authenticated/i);
  assert.doesNotMatch(sql, /create policy "Participants can update verification status"/i);
});

test('request creation validates participants and replaces older pending requests', () => {
  assert.match(sql, /create or replace function public\.request_debt_verification/i);
  assert.match(sql, /Requester and responder must be participants in the debt/i);
  assert.match(sql, /set\s+status = 'cancelled'/i);
  assert.match(sql, /requester_user_id = auth\.uid\(\)/i);
  assert.match(sql, /grant execute on function public\.request_debt_verification[\s\S]*to authenticated/i);
  assert.doesNotMatch(sql, /create policy "Requesters can create verification requests"/i);
});

test('confirmed amendments apply proposed values atomically', () => {
  assert.match(sql, /verification\.request_type = 'amendment'/i);
  assert.match(sql, /proposed ->> 'amount'/i);
  assert.match(sql, /proposed ->> 'title'/i);
  assert.match(sql, /proposed ->> 'dueDate'/i);
  assert.match(sql, /proposed ->> 'direction'/i);
  assert.match(sql, /verification_status = p_status/i);
});

test('confirmation reminders are requester-only and create recipient notifications', () => {
  assert.match(reminderSql, /create or replace function public\.send_debt_confirmation_reminder/i);
  assert.match(reminderSql, /verification\.requester_user_id <> auth\.uid\(\)/i);
  assert.match(reminderSql, /verification\.status <> 'pending'/i);
  assert.match(reminderSql, /insert into public\.soft_reminders/i);
  assert.match(reminderSql, /insert into public\.notifications/i);
  assert.match(reminderSql, /grant execute on function public\.send_debt_confirmation_reminder\(uuid\)[\s\S]*to authenticated/i);
});

test('payment confirmation is restricted to the other payment participant', () => {
  assert.match(reminderSql, /create or replace function public\.respond_to_payment_confirmation/i);
  assert.match(reminderSql, /payment\.created_by_user_id = auth\.uid\(\)/i);
  assert.match(reminderSql, /payment\.confirmation_status <> 'pending_confirmation'/i);
  assert.match(reminderSql, /confirmation_status = p_status/i);
});

test('payment reminders are creator-only and notify the other participant', () => {
  assert.match(reminderSql, /create or replace function public\.send_payment_confirmation_reminder/i);
  assert.match(reminderSql, /payment\.created_by_user_id <> auth\.uid\(\)/i);
  assert.match(reminderSql, /Payment confirmation reminder/i);
});

test('amount direction and due date edits request confirmation', () => {
  assert.match(debtFormSource, /Number\(amount\) !== debt\.amount/);
  assert.match(debtFormSource, /direction !== debt\.direction/);
  assert.match(debtFormSource, /\(dueDate \|\| null\) !== debt\.dueDate/);
  assert.match(
    debtFormSource,
    /Changing the amount, direction, or due date requires confirmation/,
  );
  assert.match(
    debtDetailSource,
    /Changing the due date requires confirmation/,
  );
});

test('payments and settlements warn before creating a confirmation request', () => {
  assert.match(
    paymentFormSource,
    /This payment will require confirmation from the other member/,
  );
  assert.match(
    debtDetailSource,
    /Settling this debt records a payment that requires confirmation/,
  );
});

test('shared debt status aggregates verification items and payments', () => {
  assert.match(
    reminderSql,
    /create or replace function public\.refresh_shared_debt_confirmation_status/i,
  );
  assert.match(reminderSql, /field\.value in \('amount', 'direction', 'dueDate'\)/i);
  assert.match(reminderSql, /line\.source_record_type = 'simple_debt'/i);
  assert.match(reminderSql, /status in \('rejected', 'disputed'\)/i);
  assert.match(reminderSql, /status in \('pending', 'pending_confirmation'\)/i);
  assert.match(reminderSql, /deferrable initially deferred/i);
});

test('debt confirmations are persisted locally before cloud delivery', () => {
  const formLocalRequest = debtFormSource.indexOf(
    'const local = await data.requestDebtVerification',
  );
  const formRemoteRequest = debtFormSource.indexOf(
    'const remote = await createRemoteDebtVerification',
  );
  const dueDateLocalRequest = debtDetailSource.indexOf(
    'const local = await data.requestDebtVerification',
  );
  const dueDateRemoteRequest = debtDetailSource.indexOf(
    'const remote = await createRemoteDebtVerification',
    dueDateLocalRequest,
  );

  assert.ok(formLocalRequest >= 0);
  assert.ok(formRemoteRequest > formLocalRequest);
  assert.ok(dueDateLocalRequest >= 0);
  assert.ok(dueDateRemoteRequest > dueDateLocalRequest);
  assert.doesNotMatch(
    debtFormSource,
    /verificationStatus: debt\.verificationStatus/,
  );
  assert.match(
    debtFormSource,
    /originalVerification\?\.requesterUserId[\s\S]*demo_user_local/,
  );
  assert.match(
    debtDetailSource,
    /creationConfirmation\?\.requesterUserId[\s\S]*demo_user_local/,
  );
  assert.match(
    debtFormSource,
    /if \(!auth\.identity\.authenticatedUserId\) \{\s*return;/,
  );
});

test('unrelated pending amendment requests do not cancel each other', () => {
  assert.match(
    reminderSql,
    /existing\.request_type = 'amendment'[\s\S]*jsonb_array_elements_text[\s\S]*proposed_field\.value = existing_field\.value/i,
  );
});
