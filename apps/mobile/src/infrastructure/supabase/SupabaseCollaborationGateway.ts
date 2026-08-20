import type { CollaborationGateway } from '@debtulator/application/ports/collaborationGateway';
import type { FileGateway } from '@debtulator/application/ports/fileGateway';
import { uploadSharedAttachment } from '@/src/infrastructure/supabase/collaborationContent';
import { resetHostedDevelopmentData } from '@/src/infrastructure/supabase/developmentReset';
import {
  createRemoteGroupInvite,
  createRemoteSharedGroupMember,
  updateRemoteGroupInvite,
} from '@/src/infrastructure/supabase/groups';
import {
  counterRemoteDebtVerification,
  createRemoteDebtVerification,
  createRemoteLinkRequest,
  hasAcceptedMemberLink,
  respondRemoteDebtVerification,
  respondRemotePaymentConfirmation,
  respondToRemoteLinkRequest,
  sendRemoteDebtConfirmationReminder,
  sendRemotePaymentConfirmationReminder,
} from '@/src/infrastructure/supabase/memberLinksAndVerification';
import { searchSignedUpMemberProfiles } from '@/src/infrastructure/supabase/profileSearch';
import {
  fetchLatestAccountDeletionRequest,
  requestRemoteAccountDeletion,
} from '@/src/infrastructure/supabase/accountDeletion';

export function createSupabaseCollaborationGateway(
  files: FileGateway,
): CollaborationGateway {
  return {
    memberDirectory: {
      searchProfiles: searchSignedUpMemberProfiles,
    },
    memberLinks: {
      createRequest: createRemoteLinkRequest,
      hasAcceptedLink: hasAcceptedMemberLink,
      respondToRequest: respondToRemoteLinkRequest,
    },
    debtVerifications: {
      create: createRemoteDebtVerification,
      respond: respondRemoteDebtVerification,
      async counter(input) {
        const result = await counterRemoteDebtVerification(input);
        return result ? { id: result.id, debtId: result.debt_id } : null;
      },
      sendReminder: sendRemoteDebtConfirmationReminder,
    },
    paymentConfirmations: {
      respond: respondRemotePaymentConfirmation,
      sendReminder: sendRemotePaymentConfirmationReminder,
    },
    groups: {
      createInvite: createRemoteGroupInvite,
      respondToInvite: updateRemoteGroupInvite,
      createMember: createRemoteSharedGroupMember,
    },
    attachments: {
      upload: (attachment) => uploadSharedAttachment(files, attachment),
    },
    developmentData: {
      resetHostedData: resetHostedDevelopmentData,
    },
    accountDeletion: {
      fetchLatest: fetchLatestAccountDeletionRequest,
      request: requestRemoteAccountDeletion,
    },
  };
}
