import type {
  LinkRequest,
  UserProfile,
} from '@debtulator/domain/models';
import type { CreateMemberInput } from '../LocalLedgerTypes';
import { requireEntity, type LocalLedgerCoordinator } from './shared';

export function createMemberCommands(coordinator: LocalLedgerCoordinator) {
  return {
    upsertProfile: (profile: UserProfile) =>
      coordinator.execute((unitOfWork) => unitOfWork.upsertProfile(profile)),
    upsertLinkRequest: (request: LinkRequest) =>
      coordinator.execute((unitOfWork) => unitOfWork.upsertLinkRequest(request)),
    createMember: (input: CreateMemberInput) =>
      coordinator.execute((unitOfWork) => unitOfWork.createMember(input)),
    updateMember: (
      memberId: string,
      input: Partial<CreateMemberInput> & { archived?: boolean },
    ) =>
      coordinator.execute((unitOfWork, current) =>
        unitOfWork.updateMember(
          requireEntity(current.members, memberId, 'Member'),
          input,
        ),
      ),
    sendMemberLinkRequest: (
      memberId: string,
      input: {
        requesterUserId: string;
        requesterDisplayName?: string | null;
        targetUserId?: string | null;
        targetEmail?: string | null;
        targetPhone?: string | null;
        message?: string | null;
        remoteId?: string | null;
      },
    ) =>
      coordinator.execute((unitOfWork, current) =>
        unitOfWork.sendMemberLinkRequest({
          member: requireEntity(current.members, memberId, 'Member'),
          ...input,
        }),
      ),
    respondToLinkRequest: (
      requestId: string,
      status: Extract<
        LinkRequest['status'],
        'accepted' | 'rejected' | 'cancelled'
      >,
      actorUserId: string,
    ) =>
      coordinator.execute((unitOfWork, current) =>
        unitOfWork.respondToLinkRequest(
          requireEntity(current.linkRequests, requestId, 'Link request'),
          status,
          actorUserId,
        ),
      ),
    unlinkMember: (memberId: string, actorUserId: string | null = null) =>
      coordinator.execute((unitOfWork, current) =>
        unitOfWork.unlinkMember(
          requireEntity(current.members, memberId, 'Member'),
          actorUserId,
        ),
      ),
  };
}

export type MemberCommands = ReturnType<typeof createMemberCommands>;
