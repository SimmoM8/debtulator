import type {
  Attachment,
  CurrencyCode,
  Debt,
  DebtChangeSummary,
  DebtVerification,
  DebtVerificationRequestType,
  GroupInvite,
  LinkRequest,
  Member,
  SharedGroupMember,
  SuggestedDebtChange,
} from '@/src/domain/models';

export type SignedUpMemberProfile = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  baseCurrency: CurrencyCode;
};

export type CreateMemberLinkRequestInput = {
  requesterUserId: string;
  targetUserId?: string | null;
  targetEmail?: string | null;
  targetPhone?: string | null;
  requesterMemberId: string;
  requesterDisplayName: string;
  message?: string | null;
};

export type CreateDebtVerificationInput = {
  debt: Debt;
  member: Member;
  requesterUserId: string;
  responderUserId: string;
  sharedNotes?: string | null;
  requestType?: DebtVerificationRequestType;
  changeSummary?: DebtChangeSummary | null;
};

export type RemoteDebtVerification = {
  remoteDebtId: string;
  remoteVerificationId: string;
};

export type DebtCounterproposal = {
  id: string;
  debtId: string;
};

export interface MemberDirectoryGateway {
  searchProfiles(input: {
    query: string;
    excludeUserId?: string | null;
    limit?: number;
  }): Promise<SignedUpMemberProfile[]>;
}

export interface MemberLinkGateway {
  createRequest(input: CreateMemberLinkRequestInput): Promise<string | null>;
  hasAcceptedLink(targetUserId: string): Promise<boolean>;
  respondToRequest(
    linkRequest: LinkRequest,
    status: Extract<LinkRequest['status'], 'accepted' | 'rejected'>,
  ): Promise<void>;
}

export interface DebtVerificationGateway {
  create(input: CreateDebtVerificationInput): Promise<RemoteDebtVerification | null>;
  respond(input: {
    verification: DebtVerification;
    status: Extract<DebtVerification['status'], 'verified' | 'rejected'>;
    rejectionReason?: string | null;
    suggestedChange?: SuggestedDebtChange | null;
  }): Promise<void>;
  counter(input: {
    verification: DebtVerification;
    changeSummary: DebtChangeSummary;
    reason?: string | null;
  }): Promise<DebtCounterproposal | null>;
  sendReminder(input: { verificationRemoteId: string }): Promise<boolean>;
}

export interface PaymentConfirmationGateway {
  respond(input: {
    paymentRemoteId: string;
    status: 'confirmed' | 'rejected';
  }): Promise<void>;
  sendReminder(input: { paymentRemoteId: string }): Promise<boolean>;
}

export interface GroupCollaborationGateway {
  createInvite(invite: GroupInvite): Promise<string | null>;
  respondToInvite(
    invite: GroupInvite,
    status: GroupInvite['status'],
    actorUserId?: string | null,
  ): Promise<void>;
  createMember(member: SharedGroupMember): Promise<string | null>;
}

export interface AttachmentUploadGateway {
  upload(attachment: Attachment): Promise<{
    storagePath: string;
    remoteUrl: string | null;
  } | null>;
}

export interface DevelopmentDataGateway {
  resetHostedData(): Promise<void>;
}

export type AccountDeletionStatus =
  | 'requested'
  | 'queued'
  | 'processing'
  | 'anonymized'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type AccountDeletionAnonymizationStatus =
  | 'not_started'
  | 'revoking_access'
  | 'deleting_private_data'
  | 'anonymizing_shared_refs'
  | 'awaiting_auth_delete'
  | 'completed'
  | 'failed';

export type AccountDeletionRequest = {
  id: string;
  userId: string | null;
  subjectUserId: string;
  status: AccountDeletionStatus;
  anonymizationStatus: AccountDeletionAnonymizationStatus;
  deleteLocalData: boolean;
  keepLocalArchive: boolean;
  requestedAt: string;
  processingStartedAt: string | null;
  anonymizedAt: string | null;
  authUserDeletedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  failedAt: string | null;
  updatedAt: string;
};

export interface AccountDeletionGateway {
  fetchLatest(userId: string): Promise<AccountDeletionRequest | null>;
  request(input: {
    deleteLocalData: boolean;
    keepLocalArchive: boolean;
    metadata?: Record<string, unknown>;
  }): Promise<AccountDeletionRequest | null>;
}

export type CollaborationGateway = {
  memberDirectory: MemberDirectoryGateway;
  memberLinks: MemberLinkGateway;
  debtVerifications: DebtVerificationGateway;
  paymentConfirmations: PaymentConfirmationGateway;
  groups: GroupCollaborationGateway;
  attachments: AttachmentUploadGateway;
  developmentData: DevelopmentDataGateway;
  accountDeletion: AccountDeletionGateway;
};
