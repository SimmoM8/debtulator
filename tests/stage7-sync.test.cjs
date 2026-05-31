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
  mapLocalDebtToRemote,
  mapLocalExpenseToRemote,
  mapRemoteEventMemberToLocal,
  mapRemoteAttachmentToLocal,
  mapRemoteExpenseToLocal,
  mapRemoteEventVerificationToLocal,
  mapLocalPaymentToRemote,
  mapRemotePaymentToLocal,
  mapRemoteSettlementToLocal,
  mapLocalSettlementLineToRemote,
  SyncMappingError,
} = require('../src/services/sync/mappers.ts');
const { buildLedgerEntries } = require('../src/services/ledger.ts');
const { canRetrySyncEntry } = require('../src/services/stage6Sync.ts');
const {
  canApplyRemoteSnapshot,
  getConflictResolutionAvailability,
  getRelatedSyncQueueEntries,
} = require('../src/data/conflictResolution.ts');

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

function syncConflict(overrides = {}) {
  return {
    id: 'conflict_1',
    entityType: 'payment',
    localEntityId: 'payment_local',
    remoteEntityId: 'payment_remote',
    conflictType: 'payment_conflict',
    localSnapshot: { id: 'payment_local', remoteId: 'payment_remote', amount: 50 },
    remoteSnapshot: { id: 'payment_remote', amount: '75', updated_at: '2026-01-03T00:00:00.000Z' },
    baseSnapshot: null,
    detectedAt: '2026-01-03T00:00:00.000Z',
    status: 'unresolved',
    resolution: null,
    resolvedAt: null,
    resolvedByUserId: null,
    ...overrides,
  };
}

function syncQueueEntry(overrides = {}) {
  return {
    id: 'queue_1',
    entityType: 'payment',
    entityId: 'payment_local',
    operation: 'update',
    payload: { amount: 50 },
    dependencyIds: [],
    retryCount: 1,
    status: 'conflict',
    errorCode: 'conflict',
    errorMessage: 'Remote record changed.',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-03T00:00:00.000Z',
    lastAttemptAt: '2026-01-03T00:00:00.000Z',
    ...overrides,
  };
}

function simpleMember(overrides = {}) {
  return {
    id: 'member_simple',
    displayName: 'Taylor',
    notes: null,
    email: null,
    phone: null,
    remoteId: null,
    linkedUserId: 'user_b',
    linkStatus: 'linked',
    linkRequestId: null,
    linkedProfileDisplayName: null,
    linkedProfileEmail: null,
    linkedProfilePhone: null,
    syncStatus: 'synced',
    tags: [],
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function simpleDebt(overrides = {}) {
  return {
    id: 'debt_simple',
    type: 'simple',
    memberId: 'member_simple',
    remoteId: null,
    verificationRequestId: null,
    visibility: 'shared_with_involved_member',
    syncStatus: 'pending_upload',
    direction: 'they_owe_me',
    amount: 125,
    currency: 'SEK',
    title: 'Shared loan',
    notes: 'private note',
    sharedNotes: 'shared note',
    debtDate: '2026-01-03',
    dueDate: '2026-02-03',
    recurringTemplateId: null,
    tags: [],
    eventId: null,
    status: 'active',
    verificationStatus: 'pending',
    verifiedByUserId: null,
    verifiedAt: null,
    rejectedByUserId: null,
    rejectedAt: null,
    rejectionReason: null,
    disputeReason: null,
    resolutionNote: null,
    suggestedChange: null,
    createdAt: '2026-01-03T00:00:00.000Z',
    updatedAt: '2026-01-03T00:00:00.000Z',
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

test('shared simple debt push DTO uses the linked involved user and a safe member reference', () => {
  const debt = simpleDebt({ verificationStatus: 'partially_verified' });
  const remote = mapLocalDebtToRemote(debt, snapshot({ members: [simpleMember({ remoteId: 'remote_member_reference' })], debts: [debt] }), 'user_a');

  assert.equal(remote.creator_user_id, 'user_a');
  assert.equal(remote.involved_user_id, 'user_b');
  assert.equal(remote.local_member_reference, 'remote_member_reference');
  assert.equal(remote.notes_visible_to_other_user, 'shared note');
  assert.equal(remote.visibility, 'shared_with_involved_member');
  assert.equal(remote.verification_status, 'pending');
  assert.equal(remote.settlement_status, 'active');
});

test('shared simple debt mapper fails before mixing local and remote ids for an unlinked member', () => {
  assert.throws(
    () => mapLocalDebtToRemote(simpleDebt(), snapshot({ members: [simpleMember({ linkedUserId: null })] }), 'user_a'),
    SyncMappingError,
  );
});

test('sync engine creates queued shared simple debts in shared_debt_records and stores the remote id', async () => {
  const debt = simpleDebt();
  const queuedEntry = {
    id: 'queue_debt_create',
    entityType: 'debt',
    entityId: debt.id,
    operation: 'create',
    payload: debt,
    dependencyIds: [],
    retryCount: 0,
    status: 'pending',
    errorCode: null,
    errorMessage: null,
    createdAt: '2026-01-03T00:01:00.000Z',
    updatedAt: '2026-01-03T00:01:00.000Z',
    lastAttemptAt: null,
  };
  const supabaseCalls = [];
  const fakeSupabase = {
    from(table) {
      return {
        insert(row) {
          supabaseCalls.push({ table, operation: 'insert', row });
          return {
            select() {
              return {
                single: async () => ({
                  data: { id: 'remote_debt_simple', updated_at: '2026-01-03T00:02:00.000Z' },
                  error: null,
                }),
              };
            },
          };
        },
      };
    },
  };

  const originalLoad = Module._load;
  Module._load = function loadWithSyncMocks(request, parent, isMain) {
    if (request === '@/src/services/supabase') {
      return { supabase: fakeSupabase };
    }
    if (request === '@/src/services/sync/pullRemote') {
      return { pullRemoteData: async () => ({ pulledCount: 0, eventIds: [], mappingErrors: [] }) };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  const syncEnginePath = path.join(projectRoot, 'src/services/sync/syncEngine.ts');
  delete require.cache[syncEnginePath];
  const { runSyncEngine } = require(syncEnginePath);
  Module._load = originalLoad;

  const queueUpdates = [];
  let upsertedDebt = null;
  const store = {
    ...snapshot({ members: [simpleMember()], debts: [debt], syncQueue: [queuedEntry] }),
    updateSyncQueueEntry: async (entryId, patch) => {
      queueUpdates.push({ entryId, patch });
      return { ...queuedEntry, ...patch };
    },
    upsertSyncConflict: async (conflict) => conflict,
    createNotification: async (notification) => notification,
    upsertDebt: async (nextDebt) => {
      upsertedDebt = nextDebt;
      return nextDebt;
    },
  };

  const result = await runSyncEngine({ store, userId: 'user_a', maxItems: 1 });

  assert.equal(result.succeeded, 1);
  assert.equal(result.failed, 0);
  assert.equal(supabaseCalls.length, 1);
  assert.equal(supabaseCalls[0].table, 'shared_debt_records');
  assert.equal(supabaseCalls[0].row.involved_user_id, 'user_b');
  assert.equal(upsertedDebt.remoteId, 'remote_debt_simple');
  assert.equal(upsertedDebt.syncStatus, 'synced');
  assert.deepEqual(queueUpdates.map((update) => update.patch.status), ['running', 'succeeded']);
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

test('conflict resolution availability exposes only honest automatic actions', () => {
  const conflict = syncConflict();
  const queueEntry = syncQueueEntry();
  const availability = getConflictResolutionAvailability(conflict, {
    syncQueue: [queueEntry],
    payments: [{ id: 'payment_local' }],
  });

  assert.equal(availability.keep_mine, true);
  assert.equal(availability.cancel_local_change, true);
  assert.equal(availability.keep_theirs, false);
  assert.equal(availability.merge, false);
  assert.equal(availability.duplicate, false);
  assert.equal(availability.manual_edit, false);
  assert.deepEqual(getRelatedSyncQueueEntries([queueEntry], conflict), [queueEntry]);
});

test('keep theirs is only available for local-shaped remote snapshots on the same local record', () => {
  const rawRemoteConflict = syncConflict();
  assert.equal(canApplyRemoteSnapshot(rawRemoteConflict, { payments: [{ id: 'payment_local' }] }), false);

  const localShapedConflict = syncConflict({
    remoteSnapshot: {
      id: 'payment_local',
      remoteId: 'payment_remote',
      amount: 75,
      syncStatus: 'synced',
      updatedAt: '2026-01-03T00:00:00.000Z',
    },
  });

  assert.equal(canApplyRemoteSnapshot(localShapedConflict, { payments: [{ id: 'payment_local' }] }), true);
  assert.equal(canApplyRemoteSnapshot(localShapedConflict, { payments: [] }), false);
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
