import type {
  Debt,
  DebtChangeSummary,
  DebtVerification,
  DebtVerificationRequestType,
  SuggestedDebtChange,
  VerificationStatus,
} from '@debtulator/domain/models';
import type { RemoteDebtCounterproposal } from '../LocalLedgerPort';
import type { CreateDebtInput } from '../LocalLedgerTypes';
import { requireEntity, type LocalLedgerCoordinator } from './shared';

export function createDebtCommands(coordinator: LocalLedgerCoordinator) {
  return {
    upsertDebtVerification: (verification: DebtVerification) =>
      coordinator.execute((unitOfWork) =>
        unitOfWork.upsertDebtVerification(verification),
      ),
    upsertDebt: (debt: Debt) =>
      coordinator.execute((unitOfWork) => unitOfWork.upsertDebt(debt)),
    createDebt: (input: CreateDebtInput) =>
      coordinator.execute((unitOfWork) => unitOfWork.createDebt(input)),
    updateDebt: (
      debtId: string,
      input: Partial<CreateDebtInput>,
      actorUserId: string | null = null,
    ) =>
      coordinator.execute((unitOfWork, current) =>
        unitOfWork.updateDebt(
          requireEntity(current.debts, debtId, 'Debt'),
          input,
          actorUserId,
        ),
      ),
    requestDebtVerification: (
      debtId: string,
      input: {
        requesterUserId: string;
        responderUserId: string;
        remoteDebtId?: string | null;
        remoteVerificationId?: string | null;
        sharedNotes?: string | null;
        requestType?: DebtVerificationRequestType;
        changeSummary?: DebtChangeSummary | null;
      },
    ) =>
      coordinator.execute((unitOfWork, current) => {
        const debt = requireEntity(current.debts, debtId, 'Debt');
        const member = requireEntity(current.members, debt.memberId, 'Member');
        return unitOfWork.requestDebtVerification({ debt, member, ...input });
      }),
    respondToDebtVerification: (
      verificationId: string,
      status: Extract<VerificationStatus, 'verified' | 'rejected'>,
      actorUserId: string,
      rejectionReason?: string | null,
      suggestedChange?: SuggestedDebtChange | null,
    ) =>
      coordinator.execute((unitOfWork, current) => {
        const verification = requireEntity(
          current.debtVerifications,
          verificationId,
          'Verification request',
        );
        const debt = requireEntity(current.debts, verification.debtId, 'Debt');
        return unitOfWork.respondToDebtVerification(
          verification,
          debt,
          status,
          actorUserId,
          rejectionReason,
          suggestedChange,
        );
      }),
    counterDebtVerification: (
      verificationId: string,
      actorUserId: string,
      changeSummary: DebtChangeSummary,
      remoteCounterproposal: RemoteDebtCounterproposal | null = null,
    ) =>
      coordinator.execute((unitOfWork, current) => {
        const verification = requireEntity(
          current.debtVerifications,
          verificationId,
          'Verification request',
        );
        const debt = requireEntity(current.debts, verification.debtId, 'Debt');
        return unitOfWork.counterDebtVerification(
          verification,
          debt,
          actorUserId,
          changeSummary,
          remoteCounterproposal,
        );
      }),
    markDebtDisputed: (
      debtId: string,
      actorUserId: string | null = null,
      disputeReason: string | null = null,
    ) =>
      coordinator.execute((unitOfWork, current) =>
        unitOfWork.markDebtDisputed(
          requireEntity(current.debts, debtId, 'Debt'),
          actorUserId,
          disputeReason,
        ),
      ),
    markDebtResolved: (
      debtId: string,
      actorUserId: string | null = null,
      resolutionNote: string | null = null,
    ) =>
      coordinator.execute((unitOfWork, current) =>
        unitOfWork.markDebtResolved(
          requireEntity(current.debts, debtId, 'Debt'),
          actorUserId,
          resolutionNote,
        ),
      ),
    cancelDebtVerification: (
      debtId: string,
      actorUserId: string | null = null,
    ) =>
      coordinator.execute((unitOfWork, current) => {
        const debt = requireEntity(current.debts, debtId, 'Debt');
        const verification = debt.verificationRequestId
          ? current.debtVerifications.find(
              (item) => item.id === debt.verificationRequestId,
            )
          : undefined;
        return unitOfWork.cancelDebtVerification(
          debt,
          verification,
          actorUserId,
        );
      }),
  };
}

export type DebtCommands = ReturnType<typeof createDebtCommands>;
