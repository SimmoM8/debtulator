import type {
  Payment,
  Settlement,
  SettlementLine,
} from '@debtulator/domain/models';
import type { CreatePaymentSettlementInput } from '../LocalLedgerTypes';
import { requireEntity, type LocalLedgerCoordinator } from './shared';

export function createPaymentCommands(coordinator: LocalLedgerCoordinator) {
  return {
    upsertPayment: (payment: Payment) =>
      coordinator.execute((unitOfWork) => unitOfWork.upsertPayment(payment)),
    upsertSettlement: (settlement: Settlement) =>
      coordinator.execute((unitOfWork) =>
        unitOfWork.upsertSettlement(settlement),
      ),
    upsertSettlementLine: (line: SettlementLine) =>
      coordinator.execute((unitOfWork) => unitOfWork.upsertSettlementLine(line)),
    createPaymentSettlement: (input: CreatePaymentSettlementInput) =>
      coordinator.execute((unitOfWork) =>
        unitOfWork.createPaymentSettlement(input),
      ),
    respondToPaymentConfirmation: (
      paymentId: string,
      status: Extract<
        Payment['confirmationStatus'],
        'confirmed' | 'rejected'
      >,
      actorUserId: string,
    ) =>
      coordinator.execute((unitOfWork, current) =>
        unitOfWork.respondToPaymentConfirmation(
          requireEntity(current.payments, paymentId, 'Payment'),
          status,
          actorUserId,
        ),
      ),
  };
}

export type PaymentCommands = ReturnType<typeof createPaymentCommands>;
