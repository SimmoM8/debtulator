#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const readline = require('node:readline/promises');

const args = new Set(process.argv.slice(2));
const deleteUsers = args.has('--delete-users');
const confirmed = args.has('--yes');
const useLocal = args.has('--local');
const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

const publicTables = [
  'account_deletion_requests', 'audit_logs', 'device_push_tokens',
  'notification_preferences', 'notifications', 'sync_conflicts',
  'csv_import_batches', 'export_logs', 'smart_suggestions', 'comments',
  'attachments', 'overpayment_credits', 'soft_reminders', 'reminders',
  'recurring_templates', 'settlement_lines', 'settlements', 'payments',
  'group_activity_logs', 'group_verification_responses', 'group_debts',
  'expense_payers', 'group_expense_splits', 'group_expenses',
  'group_duplicate_warnings', 'group_member_claims', 'group_members',
  'group_invites', 'group_participants', 'groups', 'debt_verifications',
  'shared_debt_records', 'link_requests', 'activity_logs', 'profiles',
];

async function main() {
  if (!confirmed) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(`Reset hosted test data${deleteUsers ? ' and Auth users' : ' while preserving Auth users'}? Type "reset": `);
    rl.close();
    if (answer !== 'reset') process.exit(1);
  }

  const qualified = publicTables.map((table) => `public.${table}`).join(',\n  ');
  const sql = [
    'BEGIN;',
    `TRUNCATE TABLE\n  ${qualified}\nRESTART IDENTITY CASCADE;`,
    deleteUsers ? 'TRUNCATE TABLE auth.users RESTART IDENTITY CASCADE;' : '-- auth.users preserved',
    'COMMIT;',
  ].join('\n');
  const targetArgs = databaseUrl
    ? ['--db-url', databaseUrl]
    : useLocal
      ? ['--local']
      : ['--linked'];
  const result = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['supabase', 'db', 'query', ...targetArgs, sql],
    { stdio: 'inherit' },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  const target = databaseUrl ? 'configured database' : useLocal ? 'local Supabase' : 'linked Supabase project';
  console.log(deleteUsers
    ? `Test data and Auth users deleted from the ${target}.`
    : `Test data deleted from the ${target}; Auth users preserved.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
