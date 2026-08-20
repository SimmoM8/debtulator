import { describe, expect, it } from '@jest/globals';

import {
  buildEqualSplitObligations,
  calculateParticipantShares,
  validateSplit,
} from '@debtulator/domain/ledger/splits';

describe('expense split rules', () => {
  it('keeps the rounded participant shares equal to the original amount', () => {
    const shares = calculateParticipantShares({
      amount: 10,
      participantIds: ['a', 'b', 'c'],
      splitMethod: 'equal',
      splitAllocations: {},
    });

    expect(shares).toEqual({ a: 3.33, b: 3.33, c: 3.34 });
    expect(Object.values(shares).reduce((sum, amount) => sum + amount, 0)).toBe(10);
  });

  it('nets one payer against the other participants', () => {
    const obligations = buildEqualSplitObligations({
      expenseId: 'expense-1',
      groupId: 'group-1',
      payerId: 'a',
      amount: 30,
      currency: 'SEK',
      participantIds: ['a', 'b', 'c'],
    });

    expect(obligations).toEqual([
      expect.objectContaining({ fromParticipantId: 'b', toParticipantId: 'a', amount: 10 }),
      expect.objectContaining({ fromParticipantId: 'c', toParticipantId: 'a', amount: 10 }),
    ]);
  });

  it('rejects percentages and payer contributions that do not balance', () => {
    const errors = validateSplit({
      amount: 100,
      participantIds: ['a', 'b'],
      splitMethod: 'custom_percentage',
      splitAllocations: { a: 60, b: 30 },
      expensePayers: [],
      currency: 'EUR',
    });

    expect(errors).toContain('Custom percentages must total 100%.');
    expect(errors).toContain('Payer contributions must total 100 EUR.');
  });
});
