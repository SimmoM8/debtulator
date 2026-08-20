import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { formatMoney } from '@/src/domain/finance/money';
import type { ActivityLog, Debt, DebtVerification } from '@/src/domain/models';
import {
  buildChangeSummaryFromActivities,
  confirmationDescription,
  confirmationStateForActivity,
  describeDebtActivity,
  formatDate,
  formatDueRelative,
  getCurrentConfirmations,
} from '@/src/presentation/features/debts/debtDetailModel';

function activity(
  id: string,
  action: string,
  createdAt: string,
  metadata: Record<string, unknown>,
): ActivityLog {
  return {
    id,
    entityKind: 'debt',
    entityId: 'debt-1',
    actorUserId: 'user-1',
    action,
    metadata,
    createdAt,
  };
}

function verification(
  id: string,
  overrides: Partial<DebtVerification> = {},
): DebtVerification {
  return {
    id,
    remoteId: `remote-${id}`,
    debtId: 'debt-1',
    remoteDebtId: 'remote-debt-1',
    requesterUserId: 'user-1',
    responderUserId: 'user-2',
    requestType: 'amendment',
    changeSummary: null,
    status: 'pending',
    rejectionReason: null,
    suggestedChange: null,
    supersedesVerificationId: null,
    requestedAt: '2026-08-20T10:00:00.000Z',
    respondedAt: null,
    createdAt: '2026-08-20T10:00:00.000Z',
    updatedAt: '2026-08-20T10:00:00.000Z',
    syncStatus: 'synced',
    ...overrides,
  };
}

describe('debt detail date model', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 7, 20, 12, 0, 0));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps the exact due-date boundary labels and invalid fallback', () => {
    expect(formatDueRelative('2026-08-20')).toBe('Due today');
    expect(formatDueRelative('2026-08-21')).toBe('1 day remaining');
    expect(formatDueRelative('2026-08-23')).toBe('3 days remaining');
    expect(formatDueRelative('2026-08-19')).toBe('1 day overdue');
    expect(formatDueRelative('2026-08-18')).toBe('2 days overdue');
    expect(formatDueRelative('not-a-date')).toBe('Due date set');
  });

  it('returns invalid display dates unchanged', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });
});

describe('debt detail activity model', () => {
  it('preserves the unsigned money formatting and ASCII amount arrow', () => {
    expect(
      describeDebtActivity(
        'debt_amount_changed',
        { previousValue: -125, nextValue: 75, currency: 'USD' },
        'SEK',
      ),
    ).toEqual({
      phrase: 'changed the amount',
      detail: `${formatMoney(-125, 'USD')} -> ${formatMoney(75, 'USD')}`,
    });
  });

  it('filters non-string tags and keeps added/removed ordering', () => {
    expect(
      describeDebtActivity(
        'debt_tag_added',
        { addedTags: ['travel', 42], removedTags: ['draft', null] },
        'SEK',
      ),
    ).toEqual({
      phrase: 'updated tags',
      detail: 'Added travel · Removed draft',
    });
  });

  it('uses the original first value and latest proposal in chronological order', () => {
    const summary = buildChangeSummaryFromActivities([
      activity('amount-latest', 'debt_amount_changed', '2026-08-20T10:02:00.000Z', {
        previousValue: 150,
        nextValue: 200,
      }),
      activity('created', 'debt_created', '2026-08-20T09:59:00.000Z', {}),
      activity('amount-first', 'debt_amount_changed', '2026-08-20T10:00:00.000Z', {
        previousValue: 100,
        nextValue: 150,
      }),
      activity('due', 'debt_due_date_added', '2026-08-20T10:03:00.000Z', {
        previousValue: null,
        nextValue: '2026-09-01',
      }),
    ]);

    expect(summary).toEqual({
      changedFields: ['amount', 'dueDate'],
      previous: { amount: 100, dueDate: null },
      proposed: { amount: 200, dueDate: '2026-09-01' },
    });
  });
});

describe('debt detail confirmation model', () => {
  it('keeps only current field owners while retaining partially overlapping requests', () => {
    const latestAmount = verification('latest-amount', {
      requestedAt: '2026-08-20T10:03:00.000Z',
      changeSummary: {
        changedFields: ['amount'],
        previous: { amount: 100 },
        proposed: { amount: 125 },
      },
    });
    const olderAmountAndDueDate = verification('older-amount-due', {
      requestedAt: '2026-08-20T10:02:00.000Z',
      status: 'rejected',
      changeSummary: {
        changedFields: ['amount', 'dueDate'],
        previous: { amount: 90, dueDate: null },
        proposed: { amount: 100, dueDate: '2026-09-01' },
      },
    });
    const supersededAmount = verification('superseded-amount', {
      requestedAt: '2026-08-20T10:01:00.000Z',
      changeSummary: {
        changedFields: ['amount'],
        previous: { amount: 80 },
        proposed: { amount: 90 },
      },
    });

    expect(
      getCurrentConfirmations([
        supersededAmount,
        olderAmountAndDueDate,
        latestAmount,
      ]).map((item) => item.id),
    ).toEqual(['latest-amount', 'older-amount-due']);
  });

  it('matches amendment activity only inside the original five-minute window', () => {
    const insideWindow = verification('inside', {
      requestedAt: '2026-08-20T10:04:59.999Z',
      status: 'rejected',
      changeSummary: {
        changedFields: ['amount'],
        previous: { amount: 100 },
        proposed: { amount: 125 },
      },
    });
    const boundary = verification('boundary', {
      requestedAt: '2026-08-20T10:05:00.000Z',
      changeSummary: insideWindow.changeSummary,
    });

    expect(
      confirmationStateForActivity(
        'debt_amount_changed',
        '2026-08-20T10:00:00.000Z',
        [insideWindow],
      ),
    ).toBe('rejected');
    expect(
      confirmationStateForActivity(
        'debt_amount_changed',
        '2026-08-20T10:00:00.000Z',
        [boundary],
      ),
    ).toBeUndefined();
  });

  it('preserves confirmation value labels and amount sign behavior', () => {
    const debt = {
      amount: 125,
      currency: 'USD',
      title: 'Dinner',
    } as Debt;
    const amendment = verification('description', {
      changeSummary: {
        changedFields: ['amount', 'direction'],
        previous: { amount: -100, direction: 'i_owe_them' },
        proposed: { amount: 125, direction: 'they_owe_me' },
      },
    });

    expect(confirmationDescription(amendment, debt)).toBe(
      `Amount: ${formatMoney(-100, 'USD')} → ${formatMoney(125, 'USD')}\n` +
        'Who owes whom: You owe them → They owe you',
    );
  });
});
