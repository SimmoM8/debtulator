const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const projectRoot = process.cwd();
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
  const group = plan.records.groups[0];
  const groupMember = plan.records.sharedGroupMembers[0];
  const expense = plan.records.sharedExpenses[0];
  const payment = plan.records.payments[0];
  const settlement = plan.records.settlements[0];
  const line = plan.records.settlementLines[0];

  assert.notEqual(group.id, 'group_remote_local');
  assert.equal(group.visibility, 'private');
  assert.equal(group.syncStatus, 'local_only');
  assert.equal(group.remoteId, null);
  assert.equal(groupMember.groupId, group.id);
  assert.equal(groupMember.remoteId, null);
  assert.equal(groupMember.linkedUserId, null);
  assert.equal(groupMember.syncStatus, 'local_only');
  assert.equal(expense.groupId, group.id);
  assert.equal(expense.payerId, groupMember.id);
  assert.deepEqual(expense.participantIds, [groupMember.id]);
  assert.equal(expense.visibility, 'private');
  assert.equal(expense.syncStatus, 'local_only');
  assert.equal(expense.remoteId, null);
  assert.equal(payment.groupId, group.id);
  assert.equal(payment.payerGroupMemberId, groupMember.id);
  assert.equal(payment.visibility, 'private');
  assert.equal(payment.confirmationStatus, 'local_only');
  assert.equal(payment.syncStatus, 'local_only');
  assert.equal(settlement.groupId, group.id);
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
  const preview = previewRestore(JSON.stringify({ app: 'Other', schemaVersion: 7, data: {} }));

  assert.equal(preview.valid, false);
  assert.deepEqual(preview.warnings, ['This does not look like a Debtulator backup.']);
});

test('schema 6 event backups restore through the group compatibility adapter', () => {
  const legacyBackup = legacyEventBackup(backup());
  const preview = previewRestore(JSON.stringify(legacyBackup));
  const plan = buildRestorePlan(JSON.stringify(legacyBackup), emptySnapshot(), 'duplicate_private');

  assert.equal(preview.valid, true);
  assert.equal(preview.groupCount, 1);
  assert.equal(plan.records.groups.length, 1);
  assert.equal(plan.records.sharedGroupMembers[0].groupId, plan.records.groups[0].id);
  assert.equal(plan.records.sharedExpenses[0].groupId, plan.records.groups[0].id);
});

function backup(overrides = {}) {
  const data = {
    profiles: [],
    members: [member()],
    debts: [],
    groups: [group()],
    groupMembers: [],
    sharedGroupMembers: [sharedGroupMember()],
    sharedExpenses: [sharedExpense()],
    groupDebts: [],
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
    settings: { defaultDebtVisibility: 'shared_group', syncPrivateLocalDataToAccountBackup: true },
    ...(overrides.data ?? {}),
  };
  return {
    app: 'Debtulator',
    schemaVersion: 7,
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

function legacyEventBackup(value) {
  if (Array.isArray(value)) {
    return value.map(legacyEventBackup);
  }
  if (value && typeof value === 'object') {
    const migrated = Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key.replaceAll('Groups', 'Events').replaceAll('groups', 'events').replaceAll('Group', 'Event').replaceAll('group', 'event'),
        legacyEventBackup(nestedValue),
      ]),
    );
    if ('schemaVersion' in migrated) {
      migrated.schemaVersion = 6;
    }
    return migrated;
  }
  const valueMap = {
    group: 'event',
    group_debt: 'event_debt',
    group_direct_debt: 'event_direct_debt',
    group_invite: 'event_invite',
    group_locked: 'event_locked',
    group_update: 'event_update',
    future_group_shared: 'future_event_shared',
    shared_group: 'shared_event',
  };
  return typeof value === 'string' ? (valueMap[value] ?? value) : value;
}

function emptySnapshot(overrides = {}) {
  return {
    profiles: [],
    members: [],
    debts: [],
    groups: [],
    groupMembers: [],
    groupParticipants: [],
    groupInvites: [],
    sharedGroupMembers: [],
    groupMemberClaims: [],
    groupDuplicateWarnings: [],
    sharedExpenses: [],
    groupDebts: [],
    payments: [],
    settlements: [],
    settlementLines: [],
    expensePayers: [],
    recurringTemplates: [],
    reminders: [],
    softReminders: [],
    overpaymentCredits: [],
    groupVerificationResponses: [],
    groupActivityLogs: [],
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

function group() {
  return {
    id: 'group_remote_local',
    localId: null,
    remoteId: 'group_remote',
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

function sharedGroupMember() {
  return {
    id: 'group_member_local',
    remoteId: 'group_member_remote',
    groupId: 'group_remote_local',
    remoteGroupId: 'group_remote',
    type: 'linked_user',
    linkedUserId: 'user_remote',
    displayName: 'Avery',
    alias: null,
    email: null,
    phone: null,
    notes: null,
    createdByUserId: 'user_remote',
    status: 'active',
    mergedIntoGroupMemberId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    syncStatus: 'synced',
  };
}

function sharedExpense() {
  return {
    id: 'expense_local',
    remoteId: 'expense_remote',
    groupId: 'group_remote_local',
    creatorUserId: 'user_remote',
    payerId: 'group_member_local',
    expensePayers: [
      {
        id: 'expense_payer_local',
        expenseId: 'expense_local',
        groupMemberId: 'group_member_local',
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
    participantIds: ['group_member_local'],
    splitMethod: 'equal',
    splitAllocations: {},
    generatedObligations: [
      {
        id: 'obligation_local',
        expenseId: 'expense_local',
        groupId: 'group_remote_local',
        fromParticipantId: 'group_member_local',
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
    visibility: 'shared_group',
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
    payerGroupMemberId: 'group_member_local',
    payeeGroupMemberId: null,
    groupId: 'group_remote_local',
    relatedMemberId: null,
    amount: 120,
    currency: 'SEK',
    paymentDate: '2026-01-02',
    notes: null,
    status: 'recorded',
    confirmationStatus: 'confirmed',
    visibility: 'shared_group',
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
    groupId: 'group_remote_local',
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
