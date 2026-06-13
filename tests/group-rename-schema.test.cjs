const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = process.cwd();
const localDatabase = fs.readFileSync(path.join(projectRoot, 'src/data/database.ts'), 'utf8');
const remoteMigration = fs.readFileSync(
  path.join(projectRoot, 'supabase/stage9_group_rename_schema.sql'),
  'utf8',
);

test('local migration preserves legacy event data under group tables and columns', () => {
  assert.match(localDatabase, /\['events', 'groups'\]/);
  assert.match(localDatabase, /\['event_members', 'group_members'\]/);
  assert.match(localDatabase, /\['event_id', 'group_id'\]/);
  assert.match(localDatabase, /WHEN 'shared_event' THEN 'shared_group'/);
  assert.match(localDatabase, /WHEN 'event_locked' THEN 'group_locked'/);
  assert.match(
    localDatabase,
    /UPDATE activity_log SET entity_kind = 'group' WHERE entity_kind = 'event'/,
  );
  assert.doesNotMatch(localDatabase, /UPDATE activity_log SET target_type/);
});

test('Supabase migration renames group domain tables, columns, functions, and stored values', () => {
  assert.match(remoteMigration, /array\['events', 'groups'\]/);
  assert.match(remoteMigration, /array\['event_expenses', 'group_expenses'\]/);
  assert.match(remoteMigration, /array\['payments', 'event_id', 'group_id'\]/);
  assert.match(remoteMigration, /rename to is_group_participant/i);
  assert.match(remoteMigration, /when 'shared_event' then 'shared_group'/i);
  assert.match(remoteMigration, /set suggestion_type = 'group' where suggestion_type = 'event'/i);
});
