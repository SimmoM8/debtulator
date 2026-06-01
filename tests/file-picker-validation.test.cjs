const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');
const originalResolve = Module._resolveFilename;

Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    return originalResolve.call(this, path.join(projectRoot, request.slice(2)), parent, isMain, options);
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

require.extensions['.ts'] = function compileTypeScript(module, filename) {
  const source = require('node:fs').readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  module._compile(output, filename);
};

const {
  isSupportedAttachmentFile,
  isSupportedCsvFile,
  MAX_ATTACHMENT_FILE_SIZE_BYTES,
} = require('../src/services/attachments.ts');

test('CSV support accepts csv extension and csv mime type', () => {
  assert.equal(isSupportedCsvFile({ fileName: 'members.csv', mimeType: null }), true);
  assert.equal(isSupportedCsvFile({ fileName: 'members.txt', mimeType: 'text/csv' }), true);
});

test('CSV support rejects non-csv files', () => {
  assert.equal(isSupportedCsvFile({ fileName: 'members.txt', mimeType: 'text/plain' }), false);
  assert.equal(isSupportedCsvFile({ fileName: null, mimeType: null }), false);
});

test('Attachment support accepts images and pdf files', () => {
  assert.equal(isSupportedAttachmentFile({ fileName: 'receipt.jpg', mimeType: null }), true);
  assert.equal(isSupportedAttachmentFile({ fileName: 'invoice', mimeType: 'application/pdf' }), true);
  assert.equal(isSupportedAttachmentFile({ fileName: null, mimeType: 'image/heic' }), true);
});

test('Attachment support rejects unsupported files and size cap is 10MB', () => {
  assert.equal(isSupportedAttachmentFile({ fileName: 'notes.txt', mimeType: 'text/plain' }), false);
  assert.equal(MAX_ATTACHMENT_FILE_SIZE_BYTES, 10 * 1024 * 1024);
});
