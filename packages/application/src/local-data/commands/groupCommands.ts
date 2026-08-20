import type {
  Group,
  GroupActivityLog,
  GroupDebt,
  GroupDuplicateWarning,
  GroupInvite,
  GroupMemberClaim,
  GroupParticipant,
  GroupVerificationResponse,
  SharedExpense,
  SharedGroupMember,
  VerificationStatus,
} from '@debtulator/domain/models';
import type {
  CreateExpenseInput,
  CreateGroupDebtInput,
  CreateGroupInput,
  CreateGroupInviteInput,
  CreateSharedGroupMemberInput,
} from '../LocalLedgerTypes';
import { requireEntity, type LocalLedgerCoordinator } from './shared';

export function createGroupCommands(coordinator: LocalLedgerCoordinator) {
  return {
    upsertSharedExpense: (expense: SharedExpense) =>
      coordinator.execute((unitOfWork) =>
        unitOfWork.upsertSharedExpense(expense),
      ),
    upsertGroup: (group: Group) =>
      coordinator.execute((unitOfWork) => unitOfWork.upsertGroup(group)),
    upsertGroupParticipant: (participant: GroupParticipant) =>
      coordinator.execute((unitOfWork) =>
        unitOfWork.upsertGroupParticipant(participant),
      ),
    upsertGroupInvite: (invite: GroupInvite) =>
      coordinator.execute((unitOfWork) => unitOfWork.upsertGroupInvite(invite)),
    upsertSharedGroupMember: (member: SharedGroupMember) =>
      coordinator.execute((unitOfWork) =>
        unitOfWork.upsertSharedGroupMember(member),
      ),
    upsertGroupMemberClaim: (claim: GroupMemberClaim) =>
      coordinator.execute((unitOfWork) =>
        unitOfWork.upsertGroupMemberClaim(claim),
      ),
    upsertGroupDuplicateWarning: (warning: GroupDuplicateWarning) =>
      coordinator.execute((unitOfWork) =>
        unitOfWork.upsertGroupDuplicateWarning(warning),
      ),
    upsertGroupDebt: (debt: GroupDebt) =>
      coordinator.execute((unitOfWork) => unitOfWork.upsertGroupDebt(debt)),
    upsertGroupVerificationResponse: (response: GroupVerificationResponse) =>
      coordinator.execute((unitOfWork) =>
        unitOfWork.upsertGroupVerificationResponse(response),
      ),
    upsertGroupActivityLog: (activity: GroupActivityLog) =>
      coordinator.execute((unitOfWork) =>
        unitOfWork.upsertGroupActivityLog(activity),
      ),
    createGroup: (input: CreateGroupInput) =>
      coordinator.execute((unitOfWork) => unitOfWork.createGroup(input)),
    updateGroup: (
      groupId: string,
      input: Partial<CreateGroupInput> & {
        archived?: boolean;
        ignoredDuplicateKeys?: string[];
      },
    ) =>
      coordinator.execute((unitOfWork, current) =>
        unitOfWork.updateGroup(
          requireEntity(current.groups, groupId, 'Group'),
          input,
        ),
      ),
    setGroupMembers: (groupId: string, memberIds: string[]) =>
      coordinator.execute((unitOfWork) =>
        unitOfWork.setGroupMembers(groupId, memberIds),
      ),
    createSharedExpense: (input: CreateExpenseInput) =>
      coordinator.execute((unitOfWork) =>
        unitOfWork.createSharedExpense(input),
      ),
    updateSharedExpense: (
      expenseId: string,
      input: Partial<CreateExpenseInput>,
    ) =>
      coordinator.execute((unitOfWork, current) =>
        unitOfWork.updateSharedExpense(
          requireEntity(current.sharedExpenses, expenseId, 'Expense'),
          input,
        ),
      ),
    createGroupInvite: (input: CreateGroupInviteInput) =>
      coordinator.execute((unitOfWork) => unitOfWork.createGroupInvite(input)),
    respondToGroupInvite: (
      inviteId: string,
      status: Extract<
        GroupInvite['status'],
        'accepted' | 'rejected' | 'cancelled'
      >,
      actorUserId: string,
      actorDisplayName?: string | null,
      actorEmail?: string | null,
    ) =>
      coordinator.execute((unitOfWork, current) =>
        unitOfWork.respondToGroupInvite(
          requireEntity(current.groupInvites, inviteId, 'Group invite'),
          status,
          actorUserId,
          actorDisplayName,
          actorEmail,
        ),
      ),
    createSharedGroupMember: (input: CreateSharedGroupMemberInput) =>
      coordinator.execute((unitOfWork) =>
        unitOfWork.createSharedGroupMember(input),
      ),
    updateSharedGroupMember: (
      groupMemberId: string,
      input: Partial<CreateSharedGroupMemberInput> & { archived?: boolean },
    ) =>
      coordinator.execute((unitOfWork, current) =>
        unitOfWork.updateSharedGroupMember(
          requireEntity(
            current.sharedGroupMembers,
            groupMemberId,
            'Group member',
          ),
          input,
        ),
      ),
    createGroupMemberClaim: (
      groupMemberId: string,
      claimantUserId: string,
      message?: string | null,
      remoteId?: string | null,
    ) =>
      coordinator.execute((unitOfWork, current) =>
        unitOfWork.createGroupMemberClaim(
          requireEntity(
            current.sharedGroupMembers,
            groupMemberId,
            'Group member',
          ),
          claimantUserId,
          message,
          remoteId,
        ),
      ),
    respondToGroupMemberClaim: (
      claimId: string,
      status: Extract<
        GroupMemberClaim['status'],
        'approved' | 'rejected' | 'cancelled'
      >,
      actorUserId: string,
    ) =>
      coordinator.execute((unitOfWork, current) => {
        const claim = requireEntity(
          current.groupMemberClaims,
          claimId,
          'Claim request',
        );
        const member = requireEntity(
          current.sharedGroupMembers,
          claim.groupMemberId,
          'Group member',
        );
        return unitOfWork.respondToGroupMemberClaim(
          claim,
          member,
          status,
          actorUserId,
        );
      }),
    ignoreGroupDuplicateWarning: (warningId: string, actorUserId: string) =>
      coordinator.execute((unitOfWork, current) =>
        unitOfWork.ignoreGroupDuplicateWarning(
          requireEntity(
            current.groupDuplicateWarnings,
            warningId,
            'Duplicate warning',
          ),
          actorUserId,
        ),
      ),
    mergeSharedGroupMembers: (
      sourceGroupMemberId: string,
      targetGroupMemberId: string,
      actorUserId: string,
    ) =>
      coordinator.execute((unitOfWork, current) =>
        unitOfWork.mergeSharedGroupMembers(
          requireEntity(
            current.sharedGroupMembers,
            sourceGroupMemberId,
            'Group member',
          ),
          requireEntity(
            current.sharedGroupMembers,
            targetGroupMemberId,
            'Group member',
          ),
          actorUserId,
        ),
      ),
    createGroupDebt: (input: CreateGroupDebtInput) =>
      coordinator.execute((unitOfWork) => unitOfWork.createGroupDebt(input)),
    updateGroupDebt: (
      groupDebtId: string,
      input: Partial<CreateGroupDebtInput>,
    ) =>
      coordinator.execute((unitOfWork, current) =>
        unitOfWork.updateGroupDebt(
          requireEntity(current.groupDebts, groupDebtId, 'Group debt'),
          input,
        ),
      ),
    respondToGroupVerification: (input: {
      groupId: string;
      targetType: GroupVerificationResponse['targetType'];
      targetId: string;
      groupMemberId: string;
      linkedUserId: string;
      status: Extract<VerificationStatus, 'verified' | 'rejected'>;
      rejectionReason?: string | null;
    }) =>
      coordinator.execute((unitOfWork) =>
        unitOfWork.respondToGroupVerification(input),
      ),
  };
}

export type GroupCommands = ReturnType<typeof createGroupCommands>;
