const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const migrationPath = path.resolve(__dirname, '../supabase/stage8_account_deletion_schema.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

test('account deletion migration defines request status schema and RLS', () => {
  assert.match(sql, /create table if not exists public\.account_deletion_requests/i);
  assert.match(sql, /status text not null default 'requested'/i);
  assert.match(sql, /anonymization_status text not null default 'not_started'/i);
  assert.match(sql, /alter table public\.account_deletion_requests enable row level security/i);
  assert.match(sql, /create policy account_deletion_requests_user_read/i);
  assert.match(sql, /create policy account_deletion_requests_user_insert/i);
  assert.match(sql, /subject_user_id = auth\.uid\(\)/i);
  assert.match(sql, /status = 'requested'/i);
  assert.match(sql, /anonymization_status = 'not_started'/i);
});

test('mobile deletion RPC is authenticated and service role owns fulfillment', () => {
  assert.match(sql, /create or replace function public\.request_account_deletion/i);
  assert.match(sql, /security invoker/i);
  assert.match(sql, /grant execute on function public\.request_account_deletion\(boolean, boolean, text, jsonb\) to authenticated/i);
  assert.match(sql, /create or replace function public\.apply_account_deletion_anonymization/i);
  assert.match(sql, /security definer/i);
  assert.match(sql, /revoke all on function public\.apply_account_deletion_anonymization\(uuid, text\) from authenticated/i);
  assert.match(sql, /grant execute on function public\.apply_account_deletion_anonymization\(uuid, text\) to service_role/i);
});

test('shared ledger auth foreign keys are deletion-safe', () => {
  assert.match(sql, /alter table public\.shared_debt_records[\s\S]*alter column creator_user_id drop not null/i);
  assert.match(sql, /alter table public\.groups[\s\S]*alter column owner_user_id drop not null/i);
  assert.match(sql, /foreign key \(creator_user_id\) references auth\.users\(id\) on delete set null/i);
  assert.match(sql, /foreign key \(involved_user_id\) references auth\.users\(id\) on delete set null/i);
  assert.match(sql, /foreign key \(owner_user_id\) references auth\.users\(id\) on delete set null/i);
});

test('admin anonymization covers personal and shared reference tables', () => {
  const requiredStatements = [
    'update public.device_push_tokens',
    'update public.notification_preferences',
    'delete from public.notifications',
    'delete from public.smart_suggestions',
    'delete from public.sync_conflicts',
    'update public.profiles',
    'update public.shared_debt_records',
    'update public.group_members',
    'update public.payments',
    'update public.attachments',
    'update public.comments',
    "status = 'anonymized'",
    "anonymization_status = 'awaiting_auth_delete'",
  ];

  for (const statement of requiredStatements) {
    assert.ok(sql.includes(statement), `missing ${statement}`);
  }
});
