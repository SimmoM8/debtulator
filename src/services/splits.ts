import type {
  CurrencyCode,
  ExpensePayer,
  GeneratedObligation,
  ParticipantId,
  SharedExpense,
  SplitMethod,
} from '@/src/types/models';
import { roundMoney } from '@/src/utils/money';

type SplitInput = {
  expenseId: string;
  eventId: string;
  payerId: ParticipantId;
  expensePayers?: ExpensePayer[];
  amount: number;
  currency: CurrencyCode;
  participantIds: ParticipantId[];
  splitMethod?: SplitMethod;
  splitAllocations?: Record<ParticipantId, number>;
};

export function buildEqualSplitObligations(input: SplitInput): GeneratedObligation[] {
  return buildSplitObligations({ ...input, splitMethod: 'equal' });
}

export function buildSplitObligations(input: SplitInput): GeneratedObligation[] {
  const uniqueParticipants = Array.from(new Set(input.participantIds));
  if (uniqueParticipants.length === 0) {
    return [];
  }

  const shares = calculateParticipantShares({
    amount: input.amount,
    participantIds: uniqueParticipants,
    splitMethod: input.splitMethod ?? 'equal',
    splitAllocations: input.splitAllocations ?? {},
  });
  const payerContributions = normaliseExpensePayers(input);
  const participantBalances = new Map<ParticipantId, number>();

  for (const participantId of uniqueParticipants) {
    participantBalances.set(participantId, -roundMoney(shares[participantId] ?? 0));
  }

  for (const payer of payerContributions) {
    participantBalances.set(
      payer.eventMemberId,
      roundMoney((participantBalances.get(payer.eventMemberId) ?? 0) + payer.amountPaid),
    );
  }

  const debtors = Array.from(participantBalances.entries())
    .filter(([, amount]) => amount < -0.005)
    .map(([participantId, amount]) => ({ participantId, amount: roundMoney(Math.abs(amount)) }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = Array.from(participantBalances.entries())
    .filter(([, amount]) => amount > 0.005)
    .map(([participantId, amount]) => ({ participantId, amount: roundMoney(amount) }))
    .sort((a, b) => b.amount - a.amount);

  const obligations: GeneratedObligation[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = roundMoney(Math.min(debtor.amount, creditor.amount));

    if (amount > 0.005) {
      obligations.push({
        id: `${input.expenseId}_${debtor.participantId}_to_${creditor.participantId}_${obligations.length}`,
      expenseId: input.expenseId,
      eventId: input.eventId,
        fromParticipantId: debtor.participantId,
        toParticipantId: creditor.participantId,
        amount,
      currency: input.currency,
        splitShare: shares[debtor.participantId] ?? 0,
        explanation: `${debtor.participantId} owes ${amount} ${input.currency} after payer contributions are netted.`,
      });
    }

    debtor.amount = roundMoney(debtor.amount - amount);
    creditor.amount = roundMoney(creditor.amount - amount);
    if (debtor.amount <= 0.005) {
      debtorIndex += 1;
    }
    if (creditor.amount <= 0.005) {
      creditorIndex += 1;
    }
  }

  return obligations;
}

export function withGeneratedObligations(expense: Omit<SharedExpense, 'generatedObligations'>) {
  return {
    ...expense,
    generatedObligations: buildSplitObligations({
      expenseId: expense.id,
      eventId: expense.eventId,
      payerId: expense.payerId,
      expensePayers: expense.expensePayers,
      amount: expense.amount,
      currency: expense.currency,
      participantIds: expense.participantIds,
      splitMethod: expense.splitMethod,
      splitAllocations: expense.splitAllocations,
    }),
  };
}

export function calculateParticipantShares(input: {
  amount: number;
  participantIds: ParticipantId[];
  splitMethod: SplitMethod;
  splitAllocations: Record<ParticipantId, number>;
}) {
  const participantIds = Array.from(new Set(input.participantIds));
  const shares: Record<ParticipantId, number> = {};
  if (participantIds.length === 0) {
    return shares;
  }

  if (input.splitMethod === 'equal') {
    return distributeWithRounding(input.amount, participantIds, () => 1 / participantIds.length);
  }

  if (input.splitMethod === 'custom_amount') {
    for (const participantId of participantIds) {
      shares[participantId] = roundMoney(input.splitAllocations[participantId] ?? 0);
    }
    return shares;
  }

  if (input.splitMethod === 'custom_percentage') {
    return distributeWithRounding(input.amount, participantIds, (participantId) => {
      return Math.max(0, input.splitAllocations[participantId] ?? 0) / 100;
    });
  }

  const totalWeight = participantIds.reduce((total, participantId) => {
    return total + Math.max(0, input.splitAllocations[participantId] ?? 0);
  }, 0);
  if (totalWeight <= 0) {
    return distributeWithRounding(input.amount, participantIds, () => 1 / participantIds.length);
  }

  return distributeWithRounding(input.amount, participantIds, (participantId) => {
    return Math.max(0, input.splitAllocations[participantId] ?? 0) / totalWeight;
  });
}

export function validateSplit(input: {
  amount: number;
  participantIds: ParticipantId[];
  splitMethod: SplitMethod;
  splitAllocations: Record<ParticipantId, number>;
  expensePayers: ExpensePayer[];
  currency: CurrencyCode;
}) {
  const errors: string[] = [];
  const totalPaid = roundMoney(input.expensePayers.reduce((total, payer) => total + payer.amountPaid, 0));
  if (Math.abs(totalPaid - roundMoney(input.amount)) > 0.01) {
    errors.push(`Payer contributions must total ${roundMoney(input.amount)} ${input.currency}.`);
  }

  if (input.splitMethod === 'custom_amount') {
    const total = roundMoney(
      input.participantIds.reduce((sum, participantId) => sum + (input.splitAllocations[participantId] ?? 0), 0),
    );
    if (Math.abs(total - roundMoney(input.amount)) > 0.01) {
      errors.push(`Custom split amounts must total ${roundMoney(input.amount)} ${input.currency}.`);
    }
  }

  if (input.splitMethod === 'custom_percentage') {
    const total = roundMoney(
      input.participantIds.reduce((sum, participantId) => sum + (input.splitAllocations[participantId] ?? 0), 0),
    );
    if (Math.abs(total - 100) > 0.01) {
      errors.push('Custom percentages must total 100%.');
    }
  }

  if (input.splitMethod === 'shares') {
    const total = input.participantIds.reduce((sum, participantId) => sum + (input.splitAllocations[participantId] ?? 0), 0);
    if (total <= 0) {
      errors.push('Share weights must have a total above zero.');
    }
  }

  return errors;
}

export function explainSplit(input: {
  amount: number;
  currency: CurrencyCode;
  participantIds: ParticipantId[];
  splitMethod: SplitMethod;
  splitAllocations: Record<ParticipantId, number>;
  expensePayers: ExpensePayer[];
}) {
  const shares = calculateParticipantShares(input);
  const totalPaid = roundMoney(input.expensePayers.reduce((total, payer) => total + payer.amountPaid, 0));
  return {
    totalAmount: input.amount,
    currency: input.currency,
    splitMethod: input.splitMethod,
    participants: input.participantIds,
    participantShares: shares,
    payerContributions: input.expensePayers,
    roundingAdjustment: roundMoney(input.amount - Object.values(shares).reduce((total, amount) => total + amount, 0)),
    payerContributionTotal: totalPaid,
  };
}

function normaliseExpensePayers(input: SplitInput): ExpensePayer[] {
  const payers = input.expensePayers?.length
    ? input.expensePayers
    : [
        {
          id: `${input.expenseId}_payer_${input.payerId}`,
          expenseId: input.expenseId,
          eventMemberId: input.payerId,
          amountPaid: input.amount,
          currency: input.currency,
          createdAt: '',
          updatedAt: '',
        },
      ];
  return payers.map((payer) => ({ ...payer, amountPaid: roundMoney(payer.amountPaid) }));
}

function distributeWithRounding(
  amount: number,
  participantIds: ParticipantId[],
  ratioForParticipant: (participantId: ParticipantId) => number,
) {
  const shares: Record<ParticipantId, number> = {};
  let allocated = 0;
  participantIds.forEach((participantId, index) => {
    if (index === participantIds.length - 1) {
      shares[participantId] = roundMoney(amount - allocated);
      return;
    }
    const share = roundMoney(amount * ratioForParticipant(participantId));
    shares[participantId] = share;
    allocated = roundMoney(allocated + share);
  });
  return shares;
}
