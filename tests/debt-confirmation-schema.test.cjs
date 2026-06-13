const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const migrationPath = path.resolve(
  __dirname,
  '../supabase/stage10_debt_confirmation_schema.sql',
);
const sql = fs.readFileSync(migrationPath, 'utf8');

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
