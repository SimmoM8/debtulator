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
      jsx: ts.JsxEmit.React,
    },
  }).outputText;
  module._compile(output, filename);
};

const {
  getLocalIdForRemoteId,
  getRemoteIdForLocalId,
  mapLocalExpenseToRemote,
  mapRemoteEventMemberToLocal,
  mapRemoteExpenseToLocal,
  mapRemoteEventVerificationToLocal,
  mapLocalPaymentToRemote,
  SyncMappingError,
} = require('../src/services/sync/mappers.ts');
const { buildLedgerEntries } = require('../src/services/ledger.ts');
const { canRetrySyncEntry } = require('../src/services/stage6Sync.ts');
const {
  BETA_PUSH_NOTIFICATIONS_ENABLED,
  canDeliverPushNotification,
  isInsideQuietHours,
  notificationEnabled,
  privacySafeNotificationBody,
} = require('../src/services/notifications.ts');

function snapshot(overrides = {}) {
  return {
    profiles: [],
    members: [],
    debts: [],
    events: [
      {
        id: 'event_local',
        remoteId: 'event_remote',
        ownerUserId: 'user_a',
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
        lockedAt: null,
        ignoredDuplicateKeys: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    eventMembers: [],
    eventParticipants: [],
    eventInvites: [],
    sharedEventMembers: [
      eventMember('member_a', 'remote_member_a', 'Alice'),
      eventMember('member_b', 'remote_member_b', 'Bob'),
    ],
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

function eventMember(id, remoteId, displayName) {
  return {
    id,
    remoteId,
    eventId: 'event_local',
    remoteEventId: 'event_remote',
    type: 'linked_user',
    linkedUserId: id === 'member_a' ? 'user_a' : 'user_b',
    displayName,
    alias: null,
    email: null,
    phone: null,
    notes: null,
    createdByUserId: 'user_a',
    status: 'active',
    mergedIntoEventMemberId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    syncStatus: 'synced',
  };
}

function sharedExpense(overrides = {}) {
  return {
    id: 'expense_local',
    remoteId: 'expense_remote',
    eventId: 'event_local',
    creatorUserId: 'user_a',
    payerId: 'member_a',
    expensePayers: [
      {
        id: 'payer_local',
        expenseId: 'expense_local',
        eventMemberId: 'member_a',
        amountPaid: 100,
        currency: 'SEK',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    amount: 100,
    currency: 'SEK',
    title: 'Dinner',
    notes: null,
    expenseDate: '2026-01-01',
    participantIds: ['member_a', 'member_b'],
    splitMethod: 'equal',
    splitAllocations: {},
    generatedObligations: [
      {
        id: 'expense_local_obligation_member_b_member_a',
        expenseId: 'expense_local',
        eventId: 'event_local',
        fromParticipantId: 'member_b',
        toParticipantId: 'member_a',
        amount: 50,
        currency: 'SEK',
      },
    ],
    dueDate: null,
    recurringTemplateId: null,
    tags: [],
    status: 'active',
    verificationStatus: 'pending',
    visibility: 'shared_event',
    syncStatus: 'synced',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

test('remote event member maps to a stable local event member without using the remote UUID as the local relationship id', () => {
  const local = mapRemoteEventMemberToLocal(
    {
      id: 'remote_member_b',
      event_id: 'event_remote',
      type: 'linked_user',
      linked_user_id: 'user_b',
      display_name: 'Bob Remote',
      alias: null,
      email: null,
      phone: null,
      notes: null,
      created_by_user_id: 'user_a',
      status: 'active',
      merged_into_event_member_id: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
    },
    snapshot(),
  );

  assert.equal(local.id, 'member_b');
  assert.equal(local.remoteId, 'remote_member_b');
  assert.equal(local.eventId, 'event_local');
});

test('shared expense push DTO uses remote ids while local relationships remain local ids', () => {
  const local = sharedExpense();
  const remote = mapLocalExpenseToRemote(local, snapshot({ sharedExpenses: [local] }));

  assert.equal(remote.expense.event_id, 'event_remote');
  assert.equal(remote.expense.payer_event_member_id, 'remote_member_a');
  assert.deepEqual(remote.splits.map((split) => split.event_member_id), ['remote_member_a', 'remote_member_b']);
  assert.deepEqual(local.participantIds, ['member_a', 'member_b']);
});

test('remote expense pull hydrates local participant ids and generated ledger balances', () => {
  const local = mapRemoteExpenseToLocal(
    {
      id: 'expense_remote',
      event_id: 'event_remote',
      creator_user_id: 'user_a',
      payer_event_member_id: 'remote_member_a',
      amount: '100',
      currency: 'SEK',
      title: 'Dinner',
      notes: null,
      date: '2026-01-01',
      tags: [],
      split_method: 'equal',
      verification_status: 'pending',
      status: 'active',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    [
      { id: 'split_a', expense_id: 'expense_remote', event_member_id: 'remote_member_a', included: true, calculated_share_amount: '50' },
      { id: 'split_b', expense_id: 'expense_remote', event_member_id: 'remote_member_b', included: true, calculated_share_amount: '50' },
    ],
    [],
    snapshot(),
  );

  assert.deepEqual(local.participantIds, ['member_a', 'member_b']);
  assert.equal(local.payerId, 'member_a');

  const ledger = buildLedgerEntries([], [local], [], [], [], []);
  assert.equal(ledger.length, 1);
  assert.equal(ledger[0].fromId, 'member_b');
  assert.equal(ledger[0].toId, 'member_a');
  assert.equal(ledger[0].remainingAmount, 50);
});

test('remote verification response maps remote target and member ids to local ids', () => {
  const expense = sharedExpense();
  const local = mapRemoteEventVerificationToLocal(
    {
      id: 'verify_remote',
      event_id: 'event_remote',
      target_type: 'expense',
      target_id: 'expense_remote',
      event_member_id: 'remote_member_b',
      linked_user_id: 'user_b',
      response_status: 'verified',
      rejection_reason: null,
      responded_at: '2026-01-02T00:00:00.000Z',
      created_at: '2026-01-02T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
    },
    snapshot({ sharedExpenses: [expense] }),
  );

  assert.equal(local.targetId, 'expense_local');
  assert.equal(local.eventMemberId, 'member_b');
  assert.equal(local.remoteTargetId, 'expense_remote');
});

test('payment push maps event participants to remote ids', () => {
  const payment = {
    id: 'payment_local',
    remoteId: null,
    localId: null,
    createdByUserId: 'user_a',
    payerUserId: null,
    payeeUserId: null,
    payerMemberId: null,
    payeeMemberId: null,
    payerEventMemberId: 'member_b',
    payeeEventMemberId: 'member_a',
    eventId: 'event_local',
    relatedMemberId: null,
    amount: 50,
    currency: 'SEK',
    paymentDate: '2026-01-02',
    notes: null,
    status: 'recorded',
    confirmationStatus: 'pending_confirmation',
    visibility: 'shared_event',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    archivedAt: null,
    syncStatus: 'pending_upload',
  };

  const remote = mapLocalPaymentToRemote(payment, snapshot());
  assert.equal(remote.event_id, 'event_remote');
  assert.equal(remote.payer_event_member_id, 'remote_member_b');
  assert.equal(remote.payee_event_member_id, 'remote_member_a');
});

test('sync queue retry rules wait on transient errors and stop permission errors', () => {
  const base = {
    id: 'queue_1',
    entityType: 'shared_expense',
    entityId: 'expense_local',
    operation: 'create',
    payload: {},
    dependencyIds: [],
    retryCount: 1,
    status: 'failed',
    errorCode: 'permission_denied',
    errorMessage: 'RLS rejected the write',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastAttemptAt: '2026-01-01T00:00:00.000Z',
  };

  assert.equal(canRetrySyncEntry(base, '2026-01-01T01:00:00.000Z'), false);
  assert.equal(canRetrySyncEntry({ ...base, errorCode: 'transient_error' }, '2026-01-01T01:00:00.000Z'), true);
});

test('missing local to remote relationship fails loudly instead of producing mixed ids', () => {
  assert.throws(
    () => mapLocalExpenseToRemote(sharedExpense({ participantIds: ['member_a', 'unknown_member'] }), snapshot()),
    SyncMappingError,
  );
});

function notificationSettings(overrides = {}) {
  return {
    showSensitiveDetailsInNotifications: false,
    pushNotificationsEnabled: true,
    emailNotificationsEnabled: false,
    notificationVerificationEnabled: true,
    notificationEventEnabled: true,
    notificationPaymentSettlementEnabled: true,
    notificationReminderEnabled: true,
    notificationCommentEnabled: false,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    ...overrides,
  };
}

test('notification category toggles gate delivery categories', () => {
  const settings = notificationSettings({
    notificationVerificationEnabled: false,
    notificationEventEnabled: false,
    notificationPaymentSettlementEnabled: false,
    notificationReminderEnabled: false,
    notificationCommentEnabled: true,
  });

  assert.equal(notificationEnabled('verification_request', settings), false);
  assert.equal(notificationEnabled('event_update', settings), false);
  assert.equal(notificationEnabled('payment', settings), false);
  assert.equal(notificationEnabled('reminder', settings), false);
  assert.equal(notificationEnabled('comment', settings), true);
  assert.equal(notificationEnabled('sync_problem', settings), true);
});

test('quiet hours correctly apply for overnight windows', () => {
  const settings = notificationSettings({ quietHoursEnabled: true, quietHoursStart: '22:00', quietHoursEnd: '07:00' });

  assert.equal(isInsideQuietHours(settings, new Date(2026, 0, 1, 23, 30)), true);
  assert.equal(isInsideQuietHours(settings, new Date(2026, 0, 1, 6, 59)), true);
  assert.equal(isInsideQuietHours(settings, new Date(2026, 0, 1, 12, 0)), false);
});

test('privacy-safe notification bodies redact sensitive financial details', () => {
  const redacted = privacySafeNotificationBody(
    { type: 'payment', body: 'Alice paid Bob 250 SEK' },
    notificationSettings({ showSensitiveDetailsInNotifications: false }),
  );
  const unchanged = privacySafeNotificationBody(
    { type: 'comment', body: 'Bob left a comment' },
    notificationSettings({ showSensitiveDetailsInNotifications: false }),
  );

  assert.equal(redacted, 'Open Debtulator to review the financial update.');
  assert.equal(unchanged, 'Bob left a comment');
});

test('push delivery stays disabled in beta and enforces sign-in/permission when enabled', () => {
  const notification = { type: 'payment', userId: 'user_a' };
  const settings = notificationSettings();
  assert.equal(BETA_PUSH_NOTIFICATIONS_ENABLED, false);
  assert.equal(
    canDeliverPushNotification(notification, settings, {
      currentUserId: 'user_a',
      permission: 'granted',
      date: new Date('2026-01-01T12:00:00.000Z'),
    }),
    false,
  );
  assert.equal(
    canDeliverPushNotification(notification, settings, {
      currentUserId: null,
      permission: 'granted',
      betaPushEnabled: true,
      date: new Date('2026-01-01T12:00:00.000Z'),
    }),
    false,
  );
  assert.equal(
    canDeliverPushNotification(notification, settings, {
      currentUserId: 'user_a',
      permission: 'denied',
      betaPushEnabled: true,
      date: new Date('2026-01-01T12:00:00.000Z'),
    }),
    false,
  );
  assert.equal(
    canDeliverPushNotification(notification, settings, {
      currentUserId: 'user_a',
      permission: 'granted',
      betaPushEnabled: true,
      date: new Date('2026-01-01T12:00:00.000Z'),
    }),
    true,
  );
});
