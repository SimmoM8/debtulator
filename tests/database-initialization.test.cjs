const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');
const originalResolve = Module._resolveFilename;
const originalLoad = Module._load;

Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    return originalResolve.call(this, path.join(projectRoot, request.slice(2)), parent, isMain, options);
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

Module._load = function loadWithExpoSqliteMock(request, parent, isMain) {
  if (request === 'expo-sqlite') {
    return {};
  }
  return originalLoad.call(this, request, parent, isMain);
};

require.extensions['.ts'] = function compileTypeScript(module, filename) {
  const source = require('node:fs').readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
    },
  }).outputText;
  module._compile(output, filename);
};

const {
  getSettings,
  mapProfileRow,
  migrate,
  resetDatabase,
  resetSyncedData,
  initializeDefaults,
} = require('../src/data/database.ts');

class FakeDatabase {
  constructor() {
    this.settings = new Map();
    this.columns = {
      user_profiles: new Set(['id', 'display_name', 'email', 'phone', 'avatar_url', 'base_currency', 'created_at', 'updated_at']),
    };
    this.domainRows = {
      members: 0,
      debts: 0,
      groups: 0,
      group_invites: 0,
      shared_expenses: 0,
      group_debts: 0,
      payments: 0,
      settlements: 0,
      settlement_lines: 0,
      sync_queue: 0,
    };
  }

  async execAsync(sql) {
    const alterMatch = sql.match(/ALTER TABLE (\w+) ADD COLUMN (\w+)/);
    if (alterMatch) {
      const [, tableName, columnName] = alterMatch;
      if (!this.columns[tableName]) {
        this.columns[tableName] = new Set();
      }
      this.columns[tableName].add(columnName);
    }

    if (sql.includes('DELETE FROM app_settings')) {
      this.settings.clear();
    }

    for (const tableName of Object.keys(this.domainRows)) {
      if (sql.includes(`DELETE FROM ${tableName}`)) {
        this.domainRows[tableName] = 0;
      }
    }
  }

  async runAsync(sql, params = []) {
    const normalized = sql.replace(/\s+/g, ' ').trim();

    if (normalized.startsWith('INSERT OR IGNORE INTO app_settings')) {
      const [key, value] = params;
      if (!this.settings.has(key)) {
        this.settings.set(key, value);
      }
      return;
    }

    if (normalized.startsWith('INSERT OR REPLACE INTO app_settings')) {
      const [key, value] = params;
      this.settings.set(key, value);
      return;
    }

    for (const tableName of Object.keys(this.domainRows)) {
      if (normalized.includes(`INTO ${tableName}`)) {
        this.domainRows[tableName] += 1;
      }
    }
  }

  async getFirstAsync(sql, params = []) {
    if (sql.includes('SELECT value FROM app_settings')) {
      const value = this.settings.get(params[0]);
      return value === undefined ? null : { value };
    }

    if (sql.includes('SELECT COUNT(*) FROM members')) {
      return {
        count: Object.values(this.domainRows).reduce((total, count) => total + count, 0),
      };
    }

    return null;
  }

  async getAllAsync(sql) {
    const pragmaMatch = sql.match(/PRAGMA table_info\((\w+)\)/);
    if (pragmaMatch) {
      return [...(this.columns[pragmaMatch[1]] ?? new Set())].map((name) => ({ name }));
    }

    if (sql.includes('SELECT * FROM app_settings')) {
      return [...this.settings.entries()].map(([key, value]) => ({ key, value }));
    }

    return [];
  }
}

test('database reset stays empty across later database opens', async () => {
  const db = new FakeDatabase();

  await resetDatabase(db);
  await initializeDefaults(db);

  assert.equal(db.settings.get('baseCurrency'), 'SEK');
  assert.deepEqual(db.domainRows, {
    members: 0,
    debts: 0,
    groups: 0,
    group_invites: 0,
    shared_expenses: 0,
    group_debts: 0,
    payments: 0,
    settlements: 0,
    settlement_lines: 0,
    sync_queue: 0,
  });
});

test('synced-data reset preserves onboarding and device preferences', async () => {
  const db = new FakeDatabase();
  await initializeDefaults(db);
  db.settings.set('hasCompletedFirstRun', 'true');
  db.settings.set('theme', 'dark');
  db.domainRows.debts = 2;
  db.domainRows.sync_queue = 1;

  await resetSyncedData(db);

  assert.equal(db.settings.get('hasCompletedFirstRun'), 'true');
  assert.equal(db.settings.get('theme'), 'dark');
  assert.equal(db.domainRows.debts, 0);
  assert.equal(db.domainRows.sync_queue, 0);
});

test('empty first-run database creates settings but no domain or sync records', async () => {
  const db = new FakeDatabase();

  await initializeDefaults(db);

  assert.equal(db.settings.get('baseCurrency'), 'SEK');
  assert.deepEqual(db.domainRows, {
    members: 0,
    debts: 0,
    groups: 0,
    group_invites: 0,
    shared_expenses: 0,
    group_debts: 0,
    payments: 0,
    settlements: 0,
    settlement_lines: 0,
    sync_queue: 0,
  });
});

test('default settings include first-run startup preferences', async () => {
  const db = new FakeDatabase();

  await initializeDefaults(db);
  const settings = await getSettings(db);

  assert.equal(settings.hasCompletedFirstRun, false);
  assert.equal(settings.localDisplayName, null);
  assert.equal(settings.baseCurrency, 'SEK');
});

test('existing local data auto-completes first-run default on upgrade', async () => {
  const db = new FakeDatabase();
  db.domainRows.members = 1;

  await initializeDefaults(db);
  const settings = await getSettings(db);

  assert.equal(settings.hasCompletedFirstRun, true);
});

test('profile row mapping preserves onboarding profile fields', () => {
  const profile = mapProfileRow({
    id: 'profile_1',
    first_name: 'Ada',
    last_name: 'Lovelace',
    display_name: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '+15550123',
    country: 'GB',
    avatar_url: null,
    base_currency: 'GBP',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-02T00:00:00.000Z',
  });

  assert.equal(profile.firstName, 'Ada');
  assert.equal(profile.lastName, 'Lovelace');
  assert.equal(profile.country, 'GB');
  assert.equal(profile.displayName, 'Ada Lovelace');
  assert.equal(profile.baseCurrency, 'GBP');
});

test('migration adds onboarding profile columns to existing user profile tables', async () => {
  const db = new FakeDatabase();

  await migrate(db);

  assert.equal(db.columns.user_profiles.has('first_name'), true);
  assert.equal(db.columns.user_profiles.has('last_name'), true);
  assert.equal(db.columns.user_profiles.has('country'), true);
});
