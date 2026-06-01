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
  buildSplitObligations,
  calculateParticipantShares,
  validateSplit,
} = require('../src/services/splits.ts');
const {
  buildLedgerEntries,
  calculateEventNetsWithSettings,
  DEFAULT_EVENT_SETTLEMENT_SETTINGS,
} = require('../src/services/ledger.ts');
const { debtsToCsv, parseCsv, toCsv } = require('../src/services/csv.ts');

test('equal split rounding preserves the total and assigns the cent remainder once', () => {
  const shares = calculateParticipantShares({
    amount: 100,
    participantIds: ['alice', 'bob', 'cara'],
    splitMethod: 'equal',
    splitAllocations: {},
  });

  assert.deepEqual(shares, { alice: 33.33, bob: 33.33, cara: 33.34 });
  assert.equal(sum(Object.values(shares)), 100);

  const obligations = buildSplitObligations({
    expenseId: 'expense_rounding',
    eventId: 'event_1',
    payerId: 'alice',
    amount: 100,
    currency: 'SEK',
    participantIds: ['alice', 'bob', 'cara'],
  });

  assert.deepEqual(
    obligations.map((obligation) => ({
      from: obligation.fromParticipantId,
      to: obligation.toParticipantId,
      amount: obligation.amount,
    })),
    [
      { from: 'cara', to: 'alice', amount: 33.34 },
      { from: 'bob', to: 'alice', amount: 33.33 },
    ],
  );
  assert.equal(sum(obligations.map((obligation) => obligation.amount)), 66.67);
});

test('custom amount and percentage validation rejects mismatched totals', () => {
  assert.deepEqual(
    validateSplit({
      amount: 100,
      participantIds: ['alice', 'bob'],
      splitMethod: 'custom_amount',
      splitAllocations: { alice: 60, bob: 35 },
      expensePayers: [expensePayer({ eventMemberId: 'alice', amountPaid: 100 })],
      currency: 'SEK',
    }),
    ['Custom split amounts must total 100 SEK.'],
  );

  assert.deepEqual(
    validateSplit({
      amount: 100,
      participantIds: ['alice', 'bob', 'cara'],
      splitMethod: 'custom_percentage',
      splitAllocations: { alice: 50, bob: 25, cara: 20 },
      expensePayers: [expensePayer({ eventMemberId: 'alice', amountPaid: 90 })],
      currency: 'SEK',
    }),
    ['Payer contributions must total 100 SEK.', 'Custom percentages must total 100%.'],
  );
});

test('multi-payer expense nets payer contributions before creating obligations', () => {
  const obligations = buildSplitObligations({
    expenseId: 'expense_multi_payer',
    eventId: 'event_1',
    payerId: 'alice',
    expensePayers: [
      expensePayer({ id: 'payer_alice', eventMemberId: 'alice', amountPaid: 80 }),
      expensePayer({ id: 'payer_bob', eventMemberId: 'bob', amountPaid: 40 }),
    ],
    amount: 120,
    currency: 'SEK',
    participantIds: ['alice', 'bob', 'cara'],
    splitMethod: 'equal',
    splitAllocations: {},
  });

  assert.deepEqual(
    obligations.map((obligation) => ({
      from: obligation.fromParticipantId,
      to: obligation.toParticipantId,
      amount: obligation.amount,
    })),
    [{ from: 'cara', to: 'alice', amount: 40 }],
  );
});

test('settlement lines reduce ledger entries and rejected payments are ignored', () => {
  const entries = buildLedgerEntries(
    [debt({ id: 'debt_1', amount: 100 })],
    [],
    [],
    [
      settlementLine({ id: 'line_1', paymentId: 'payment_recorded', sourceRecordId: 'debt_1', appliedAmount: 40 }),
      settlementLine({ id: 'line_2', paymentId: 'payment_rejected', sourceRecordId: 'debt_1', appliedAmount: 60 }),
    ],
    [
      payment({ id: 'payment_recorded', status: 'recorded' }),
      payment({ id: 'payment_rejected', status: 'rejected' }),
    ],
  );

  assert.equal(entries.length, 1);
  assert.equal(entries[0].originalAmount, 100);
  assert.equal(entries[0].amountPaid, 40);
  assert.equal(entries[0].remainingAmount, 60);
  assert.equal(entries[0].amount, 60);
  assert.equal(entries[0].overpaidAmount, 0);
  assert.equal(entries[0].paymentStatus, 'partially_paid');
});

test('overpayments surface as overpaid ledger entries and open credits only', () => {
  const entries = buildLedgerEntries(
    [debt({ id: 'debt_1', amount: 100 })],
    [],
    [],
    [settlementLine({ id: 'line_1', sourceRecordId: 'debt_1', appliedAmount: 125 })],
    [],
    [
      overpaymentCredit({ id: 'credit_open', amount: 25, payerMemberId: 'alice', payeeMemberId: 'me', status: 'open' }),
      overpaymentCredit({ id: 'credit_archived', amount: 50, payerMemberId: 'bob', payeeMemberId: 'me', status: 'archived' }),
    ],
  );
  const debtEntry = entries.find((entry) => entry.sourceId === 'debt_1');
  const creditEntry = entries.find((entry) => entry.sourceId === 'credit_open');

  assert.equal(debtEntry.remainingAmount, 0);
  assert.equal(debtEntry.amountPaid, 125);
  assert.equal(debtEntry.overpaidAmount, 25);
  assert.equal(debtEntry.paymentStatus, 'overpaid');
  assert.equal(creditEntry.kind, 'overpayment_credit');
  assert.equal(creditEntry.fromId, 'me');
  assert.equal(creditEntry.toId, 'alice');
  assert.equal(creditEntry.amount, 25);
  assert.equal(entries.some((entry) => entry.sourceId === 'credit_archived'), false);
});

test('settlement calculations filter rejected disputed archived and settled entries by default', () => {
  const entries = [
    ledgerEntry({ id: 'verified', sourceId: 'verified', fromId: 'alice', toId: 'bob', amount: 100, verificationStatus: 'verified' }),
    ledgerEntry({ id: 'rejected', sourceId: 'rejected', fromId: 'alice', toId: 'bob', amount: 10, verificationStatus: 'rejected' }),
    ledgerEntry({ id: 'disputed', sourceId: 'disputed', fromId: 'alice', toId: 'bob', amount: 20, verificationStatus: 'disputed' }),
    ledgerEntry({ id: 'archived', sourceId: 'archived', fromId: 'alice', toId: 'bob', amount: 30, status: 'archived', verificationStatus: 'verified' }),
    ledgerEntry({ id: 'paid', sourceId: 'paid', fromId: 'alice', toId: 'bob', amount: 0, remainingAmount: 0, verificationStatus: 'verified' }),
  ];

  const defaultExplanation = calculateEventNetsWithSettings(entries);

  assert.deepEqual(defaultExplanation.includedEntries.map((entry) => entry.id), ['verified']);
  assert.deepEqual(
    defaultExplanation.excludedEntries.map((excluded) => [excluded.entry.id, excluded.reason]),
    [
      ['rejected', 'rejected'],
      ['disputed', 'disputed'],
      ['archived', 'archived'],
      ['paid', 'settled'],
    ],
  );
  assert.deepEqual(defaultExplanation.nets, { alice: { SEK: -100 }, bob: { SEK: 100 } });

  const expandedExplanation = calculateEventNetsWithSettings(entries, {
    ...DEFAULT_EVENT_SETTLEMENT_SETTINGS,
    includeRejectedDisputed: true,
    includeArchived: true,
    includeSettled: true,
  });

  assert.deepEqual(
    expandedExplanation.includedEntries.map((entry) => entry.id),
    ['verified', 'rejected', 'disputed', 'archived', 'paid'],
  );
  assert.deepEqual(expandedExplanation.nets, { alice: { SEK: -160 }, bob: { SEK: 160 } });
});

test('CSV parser handles quoted commas newlines and escaped quotes', () => {
  const rows = parseCsv('Display Name,Notes,Tags\r\n"Ada, Jr.","Line 1\nLine ""2""","alpha|beta"\r\n');

  assert.deepEqual(rows, [
    {
      display_name: 'Ada, Jr.',
      notes: 'Line 1\nLine "2"',
      tags: 'alpha|beta',
    },
  ]);
});

test('CSV export escapes quotes commas and newlines and filters excluded ledger rows', () => {
  assert.equal(toCsv(['name', 'notes'], [['Ada, Jr.', 'Line 1\nLine "2"']]), 'name,notes\n"Ada, Jr.","Line 1\nLine ""2"""');

  const csv = debtsToCsv(
    [
      ledgerEntry({
        id: 'included',
        sourceId: 'included',
        title: 'Dinner, "late"',
        notes: 'Bring\nreceipt',
        verificationStatus: 'verified',
      }),
      ledgerEntry({ id: 'rejected', sourceId: 'rejected', title: 'Rejected', verificationStatus: 'rejected' }),
      ledgerEntry({ id: 'archived', sourceId: 'archived', title: 'Archived', status: 'archived', verificationStatus: 'verified' }),
    ],
    { includeNotes: true, includeArchived: false, includeRejectedDisputed: false },
  );

  assert.equal(csv.includes('"Dinner, ""late"""'), true);
  assert.equal(csv.includes('"Bring\nreceipt"'), true);
  assert.equal(csv.includes('Rejected'), false);
  assert.equal(csv.includes('Archived'), false);
});

function expensePayer(overrides = {}) {
  return {
    id: 'payer_1',
    expenseId: 'expense_1',
    eventMemberId: 'alice',
    amountPaid: 100,
    currency: 'SEK',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function debt(overrides = {}) {
  return {
    id: 'debt_1',
    type: 'simple',
    memberId: 'alice',
    remoteId: null,
    verificationRequestId: null,
    visibility: 'private',
    syncStatus: 'local_only',
    direction: 'they_owe_me',
    amount: 100,
    currency: 'SEK',
    title: 'Dinner',
    notes: null,
    sharedNotes: null,
    debtDate: '2026-01-01',
    dueDate: null,
    recurringTemplateId: null,
    tags: [],
    eventId: 'event_1',
    status: 'active',
    verificationStatus: 'verified',
    verifiedByUserId: null,
    verifiedAt: null,
    rejectedByUserId: null,
    rejectedAt: null,
    rejectionReason: null,
    disputeReason: null,
    resolutionNote: null,
    suggestedChange: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function payment(overrides = {}) {
  return {
    id: 'payment_1',
    localId: null,
    remoteId: null,
    createdByUserId: null,
    payerUserId: null,
    payeeUserId: null,
    payerMemberId: 'alice',
    payeeMemberId: 'me',
    payerEventMemberId: null,
    payeeEventMemberId: null,
    eventId: 'event_1',
    relatedMemberId: 'alice',
    amount: 100,
    currency: 'SEK',
    paymentDate: '2026-01-02',
    notes: null,
    status: 'recorded',
    confirmationStatus: 'confirmed',
    visibility: 'private',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    archivedAt: null,
    syncStatus: 'local_only',
    ...overrides,
  };
}

function settlementLine(overrides = {}) {
  return {
    id: 'line_1',
    remoteId: null,
    settlementId: 'settlement_1',
    paymentId: null,
    sourceRecordType: 'simple_debt',
    sourceRecordId: 'debt_1',
    appliedAmount: 100,
    currency: 'SEK',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    syncStatus: 'local_only',
    ...overrides,
  };
}

function overpaymentCredit(overrides = {}) {
  return {
    id: 'credit_1',
    createdByUserId: null,
    payerMemberId: 'alice',
    payeeMemberId: 'me',
    payerEventMemberId: null,
    payeeEventMemberId: null,
    eventId: 'event_1',
    amount: 25,
    currency: 'SEK',
    sourcePaymentId: 'payment_1',
    status: 'open',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

function ledgerEntry(overrides = {}) {
  const originalAmount = overrides.originalAmount ?? overrides.amount ?? 100;
  const remainingAmount = overrides.remainingAmount ?? overrides.amount ?? originalAmount;
  return {
    id: 'ledger_1',
    kind: 'simple_debt',
    sourceId: 'debt_1',
    eventId: 'event_1',
    fromId: 'alice',
    toId: 'bob',
    amount: remainingAmount,
    originalAmount,
    amountPaid: 0,
    remainingAmount,
    overpaidAmount: 0,
    paymentStatus: remainingAmount <= 0 ? 'paid' : 'unpaid',
    currency: 'SEK',
    title: 'Dinner',
    notes: null,
    date: '2026-01-01',
    dueDate: null,
    tags: [],
    status: 'active',
    verificationStatus: 'verified',
    visibility: 'shared_event',
    syncStatus: 'local_only',
    ...overrides,
  };
}

function sum(values) {
  return Math.round(values.reduce((total, value) => total + value, 0) * 100) / 100;
}
