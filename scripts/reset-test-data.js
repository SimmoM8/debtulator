#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const readline = require('node:readline/promises');

const args = new Set(process.argv.slice(2));
const deleteUsers = args.has('--delete-users');
const confirmed = args.has('--yes');
const useLocal = args.has('--local');
const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

async function main() {
  if (!confirmed) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(`Reset hosted test data${deleteUsers ? ' and Auth users' : ' while preserving Auth users'}? Type "reset": `);
    rl.close();
    if (answer !== 'reset') process.exit(1);
  }

  const sql = [
    'BEGIN;',
    `DO $reset$
DECLARE
  table_list text;
BEGIN
  SELECT string_agg(format('%I.%I', schemaname, tablename), ', ' ORDER BY tablename)
  INTO table_list
  FROM pg_tables
  WHERE schemaname = 'public';

  IF table_list IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE ' || table_list || ' RESTART IDENTITY CASCADE';
  END IF;
END
$reset$;`,
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
