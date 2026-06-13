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

const { resetDatabase, seedIfEmpty } = require('../src/data/database.ts');

class FakeDatabase {
  constructor() {
    this.settings = new Map();
    this.domainRows = {
      members: 0,
      debts: 0,
      groups: 0,
      shared_expenses: 0,
    };
  }

  async execAsync(sql) {
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
}

test('no-demo reset persists demo seeding opt-out across later empty database opens', async () => {
  const db = new FakeDatabase();

  await resetDatabase(db, false);
  await seedIfEmpty(db);

  assert.equal(db.settings.get('__demoSeeding'), 'disabled');
  assert.equal(db.settings.get('baseCurrency'), 'SEK');
  assert.deepEqual(db.domainRows, {
    members: 0,
    debts: 0,
    groups: 0,
    shared_expenses: 0,
  });
});

test('empty first-run database still seeds demo data when demo seeding was not disabled', async () => {
  const db = new FakeDatabase();

  await seedIfEmpty(db);

  assert.notEqual(db.settings.get('__demoSeeding'), 'disabled');
  assert.ok(db.domainRows.members > 0);
  assert.ok(db.domainRows.groups > 0);
  assert.ok(db.domainRows.debts > 0 || db.domainRows.shared_expenses > 0);
});
