import type {
  CurrencyCode,
  GeneratedObligation,
  ParticipantId,
  SharedExpense,
} from '@/src/types/models';
import { roundMoney } from '@/src/utils/money';

export function buildEqualSplitObligations(input: {
  expenseId: string;
  eventId: string;
  payerId: ParticipantId;
  amount: number;
  currency: CurrencyCode;
  participantIds: ParticipantId[];
}): GeneratedObligation[] {
  const uniqueParticipants = Array.from(new Set(input.participantIds));
  if (uniqueParticipants.length === 0) {
    return [];
  }

  const share = roundMoney(input.amount / uniqueParticipants.length);

  return uniqueParticipants
    .filter((participantId) => participantId !== input.payerId)
    .map((participantId) => ({
      id: `${input.expenseId}_${participantId}_to_${input.payerId}`,
      expenseId: input.expenseId,
      eventId: input.eventId,
      fromParticipantId: participantId,
      toParticipantId: input.payerId,
      amount: share,
      currency: input.currency,
    }));
}

export function withGeneratedObligations(expense: Omit<SharedExpense, 'generatedObligations'>) {
  return {
    ...expense,
    generatedObligations: buildEqualSplitObligations({
      expenseId: expense.id,
      eventId: expense.eventId,
      payerId: expense.payerId,
      amount: expense.amount,
      currency: expense.currency,
      participantIds: expense.participantIds,
    }),
  };
}
