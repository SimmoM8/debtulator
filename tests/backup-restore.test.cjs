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

Module._load = function loadStubbed(request, parent, isMain) {
  if (request === 'expo-file-system/legacy') {
    return { documentDirectory: null, cacheDirectory: '/tmp/' };
  }
  if (request === 'react-native') {
    return { Share: { share: async () => ({ action: 'sharedAction' }) } };
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

const { buildRestorePlan, previewRestore } = require('../src/services/backupRestore.ts');

test('duplicate private restore remaps relationships and strips shared sync state', () => {
  const plan = buildRestorePlan(JSON.stringify(backup()), emptySnapshot(), 'duplicate_private');
  const event = plan.records.events[0];
  const eventMember = plan.records.sharedEventMembers[0];
  const expense = plan.records.sharedExpenses[0];
  const payment = plan.records.payments[0];
  const settlement = plan.records.settlements[0];
  const line = plan.records.settlementLines[0];

  assert.notEqual(event.id, 'event_remote_local');
  assert.equal(event.visibility, 'private');
  assert.equal(event.syncStatus, 'local_only');
  assert.equal(event.remoteId, null);
  assert.equal(eventMember.eventId, event.id);
  assert.equal(eventMember.remoteId, null);
  assert.equal(eventMember.linkedUserId, null);
  assert.equal(eventMember.syncStatus, 'local_only');
  assert.equal(expense.eventId, event.id);
  assert.equal(expense.payerId, eventMember.id);
  assert.deepEqual(expense.participantIds, [eventMember.id]);
  assert.equal(expense.visibility, 'private');
  assert.equal(expense.syncStatus, 'local_only');
  assert.equal(expense.remoteId, null);
  assert.equal(payment.eventId, event.id);
  assert.equal(payment.payerEventMemberId, eventMember.id);
  assert.equal(payment.visibility, 'private');
  assert.equal(payment.confirmationStatus, 'local_only');
  assert.equal(payment.syncStatus, 'local_only');
  assert.equal(settlement.eventId, event.id);
  assert.equal(settlement.confirmationStatus, 'local_only');
  assert.equal(line.settlementId, settlement.id);
  assert.equal(line.paymentId, payment.id);
  assert.equal(line.sourceRecordId, expense.generatedObligations[0].id);
  assert.equal(plan.result.restored.sharedExpenses, 1);
  assert.equal(plan.result.skipped, 0);
});

test('merge restore skips existing ids without overwriting local records', () => {
  const current = emptySnapshot({
    members: [member({ displayName: 'Existing name' })],
  });
  const plan = buildRestorePlan(JSON.stringify(backup({ data: { members: [member()] } })), current, 'merge');

  assert.equal(plan.records.members.length, 0);
  assert.equal(plan.result.skipped, 1);
});

test('restore preview rejects non Debtulator JSON', () => {
  const preview = previewRestore(JSON.stringify({ app: 'Other', schemaVersion: 6, data: {} }));

  assert.equal(preview.valid, false);
  assert.deepEqual(preview.warnings, ['This does not look like a Debtulator backup.']);
});

function backup(overrides = {}) {
  const data = {
    profiles: [],
    members: [member()],
    debts: [],
    events: [event()],
    eventMembers: [],
    sharedEventMembers: [sharedEventMember()],
    sharedExpenses: [sharedExpense()],
    eventDebts: [],
    payments: [payment()],
    settlements: [settlement()],
    settlementLines: [settlementLine()],
    attachments: [],
    comments: [],
    recurringTemplates: [],
    reminders: [],
    softReminders: [],
    overpaymentCredits: [],
    smartSuggestions: [],
    auditLogs: [],
    currencyRates: [],
    settings: { defaultDebtVisibility: 'shared_event', syncPrivateLocalDataToAccountBackup: true },
    ...(overrides.data ?? {}),
  };
  return {
    app: 'Debtulator',
    schemaVersion: 6,
    exportedAt: '2026-05-01T00:00:00.000Z',
    privacy: {
      includesAttachments: false,
      includesPrivateNotes: false,
      restoredRecordsDefaultPrivate: true,
    },
    data,
    ...overrides,
  };
}

function emptySnapshot(overrides = {}) {
  return {
    profiles: [],
    members: [],
    debts: [],
    events: [],
    eventMembers: [],
    eventParticipants: [],
    eventInvites: [],
    sharedEventMembers: [],
    eventMemberClaims: [],
    eventDuplicateWarnings: [],
    sharedExpenses: [],
    eventDebts: [],
    payments: [],
    settlements: [],
    settlementLines: [],
    expensePayers: [],
    recurringTemplates: [],
    reminders: [],
    softReminders: [],
    overpaymentCredits: [],
    eventVerificationResponses: [],
    eventActivityLogs: [],
    linkRequests: [],
    debtVerifications: [],
    activityLogs: [],
    attachments: [],
    comments: [],
    smartSuggestions: [],
    exportLogs: [],
    csvImportBatches: [],
    syncQueue: [],
    syncConflicts: [],
    notifications: [],
    auditLogs: [],
    tags: [],
    currencyRates: [],
    settings: {},
    ...overrides,
  };
}

function member(overrides = {}) {
  return {
    id: 'member_local',
    displayName: 'Avery',
    notes: null,
    email: null,
    phone: null,
    remoteId: 'member_remote',
    linkedUserId: 'user_remote',
    linkStatus: 'linked',
    linkRequestId: 'link_remote',
    linkedProfileDisplayName: 'Avery Remote',
    linkedProfileEmail: 'avery@example.com',
    linkedProfilePhone: null,
    syncStatus: 'synced',
    tags: [],
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function event() {
  return {
    id: 'event_remote_local',
    localId: null,
    remoteId: 'event_remote',
    ownerUserId: 'user_remote',
    name: 'Trip',
    notes: null,
    defaultCurrency: 'SEK',
    allowedCurrencies: ['SEK'],
    tags: [],
    status: 'active',
    visibility: 'shared',
    syncStatus: 'synced',
    archived: false,
    archivedAt: null,
    finalisedAt: null,
    lockedAt: '2026-01-02T00:00:00.000Z',
    ignoredDuplicateKeys: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function sharedEventMember() {
  return {
    id: 'event_member_local',
    remoteId: 'event_member_remote',
    eventId: 'event_remote_local',
    remoteEventId: 'event_remote',
    type: 'linked_user',
    linkedUserId: 'user_remote',
    displayName: 'Avery',
    alias: null,
    email: null,
    phone: null,
    notes: null,
    createdByUserId: 'user_remote',
    status: 'active',
    mergedIntoEventMemberId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    syncStatus: 'synced',
  };
}

function sharedExpense() {
  return {
    id: 'expense_local',
    remoteId: 'expense_remote',
    eventId: 'event_remote_local',
    creatorUserId: 'user_remote',
    payerId: 'event_member_local',
    expensePayers: [
      {
        id: 'expense_payer_local',
        expenseId: 'expense_local',
        eventMemberId: 'event_member_local',
        amountPaid: 120,
        currency: 'SEK',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    amount: 120,
    currency: 'SEK',
    title: 'Dinner',
    notes: null,
    expenseDate: '2026-01-01',
    participantIds: ['event_member_local'],
    splitMethod: 'equal',
    splitAllocations: {},
    generatedObligations: [
      {
        id: 'obligation_local',
        expenseId: 'expense_local',
        eventId: 'event_remote_local',
        fromParticipantId: 'event_member_local',
        toParticipantId: 'me',
        amount: 120,
        currency: 'SEK',
      },
    ],
    dueDate: null,
    recurringTemplateId: null,
    tags: [],
    status: 'active',
    verificationStatus: 'verified',
    visibility: 'shared_event',
    syncStatus: 'synced',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function payment() {
  return {
    id: 'payment_local',
    localId: null,
    remoteId: 'payment_remote',
    createdByUserId: 'user_remote',
    payerUserId: 'user_remote',
    payeeUserId: null,
    payerMemberId: null,
    payeeMemberId: null,
    payerEventMemberId: 'event_member_local',
    payeeEventMemberId: null,
    eventId: 'event_remote_local',
    relatedMemberId: null,
    amount: 120,
    currency: 'SEK',
    paymentDate: '2026-01-02',
    notes: null,
    status: 'recorded',
    confirmationStatus: 'confirmed',
    visibility: 'shared_event',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    archivedAt: null,
    syncStatus: 'synced',
  };
}

function settlement() {
  return {
    id: 'settlement_local',
    localId: null,
    remoteId: 'settlement_remote',
    createdByUserId: 'user_remote',
    eventId: 'event_remote_local',
    memberId: null,
    type: 'manual',
    currency: 'SEK',
    totalAmount: 120,
    status: 'recorded',
    confirmationStatus: 'confirmed',
    notes: null,
    originalCurrency: null,
    originalAmount: null,
    settlementCurrency: null,
    settlementAmount: null,
    exchangeRateUsed: null,
    exchangeRateDate: null,
    conversionNote: null,
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    archivedAt: null,
    syncStatus: 'synced',
  };
}

function settlementLine() {
  return {
    id: 'settlement_line_local',
    remoteId: 'settlement_line_remote',
    settlementId: 'settlement_local',
    paymentId: 'payment_local',
    sourceRecordType: 'shared_expense_obligation',
    sourceRecordId: 'obligation_local',
    appliedAmount: 120,
    currency: 'SEK',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    syncStatus: 'synced',
  };
}
