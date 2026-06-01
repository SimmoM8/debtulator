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

Module._load = function mockSupabase(request, parent, isMain) {
  if (request === '@/src/services/supabase' || request.endsWith('/src/services/supabase.ts')) {
    return { supabase: null };
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
  __getTelemetryBreadcrumbsForTests,
  __resetTelemetryForTests,
  addTelemetryBreadcrumb,
  sanitizeTelemetryMetadata,
} = require('../src/services/telemetry.ts');

test('sanitizeTelemetryMetadata only keeps allowlisted primitive keys', () => {
  const sanitized = sanitizeTelemetryMetadata({
    includeAttachments: true,
    processed: 5,
    flow: 'sync',
    notes: 'secret',
    email: 'user@example.com',
    nested: { value: true },
  });

  assert.deepEqual(sanitized, {
    includeAttachments: true,
    processed: 5,
    flow: 'sync',
  });
});

test('addTelemetryBreadcrumb stores sanitized breadcrumb metadata', () => {
  __resetTelemetryForTests();
  addTelemetryBreadcrumb('auth', 'sign_in_started', {
    method: 'password',
    email: 'hidden@example.com',
  });

  const breadcrumbs = __getTelemetryBreadcrumbsForTests();
  assert.equal(breadcrumbs.length, 1);
  assert.equal(breadcrumbs[0].category, 'auth');
  assert.equal(breadcrumbs[0].step, 'sign_in_started');
  assert.deepEqual(breadcrumbs[0].metadata, { method: 'password' });
});
