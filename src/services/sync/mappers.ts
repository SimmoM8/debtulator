import type { DatabaseSnapshot } from '@/src/data/database';
import { withGeneratedObligations } from '@/src/services/splits';
import type {
  Attachment,
  Comment,
  CurrencyCode,
  EntityKind,
  Event,
  EventActivityLog,
  EventDebt,
  EventDuplicateWarning,
  EventInvite,
  EventMemberClaim,
  EventParticipant,
  EventVerificationResponse,
  ExpensePayer,
  ParticipantId,
  Payment,
  Settlement,
  SettlementLine,
  SharedEventMember,
  SharedExpense,
} from '@/src/types/models';
import { createId } from '@/src/utils/id';

export class SyncMappingError extends Error {
  readonly code = 'mapping_error';

  constructor(
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'SyncMappingError';
  }
}

type RemoteRow = Record<string, any>;

type RemoteExpenseSplit = RemoteRow & {
  id: string;
  expense_id: string;
  event_member_id: string;
  included?: boolean | null;
  share_amount?: number | string | null;
  share_percentage?: number | string | null;
  share_weight?: number | string | null;
  calculated_share_amount?: number | string | null;
};

type RemoteExpensePayer = RemoteRow & {
  id: string;
  expense_id: string;
  event_member_id: string;
  amount_paid: number | string;
  currency: CurrencyCode;
};

export function getLocalIdForRemoteId(
  snapshot: DatabaseSnapshot,
  entityType: EntityKind | 'expense_payer' | 'settlement_line',
  remoteId: string | null | undefined,
) {
  if (!remoteId) {
    return null;
  }
  return collectionForEntity(snapshot, entityType).find((item) => item.remoteId === remoteId)?.id ?? null;
}

export function getRemoteIdForLocalId(
  snapshot: DatabaseSnapshot,
  entityType: EntityKind | 'expense_payer' | 'settlement_line',
  localId: string | null | undefined,
) {
  if (!localId) {
    return null;
  }
  return collectionForEntity(snapshot, entityType).find((item) => item.id === localId)?.remoteId ?? null;
}

export function ensureLocalRecordForRemote(
  snapshot: DatabaseSnapshot,
  entityType: EntityKind | 'expense_payer' | 'settlement_line',
  remoteId: string,
  prefix = entityType,
) {
  return getLocalIdForRemoteId(snapshot, entityType, remoteId) ?? createId(String(prefix));
}

export function mapLocalEventToRemote(event: Event) {
  return {
    owner_user_id: event.ownerUserId,
    name: event.name,
    description: event.notes,
    default_currency: event.defaultCurrency,
    allowed_currencies: event.allowedCurrencies,
    tags: event.tags,
    visibility: event.visibility,
    status: event.status,
    archived_at: event.archivedAt,
    finalised_at: event.finalisedAt,
    locked_at: event.lockedAt,
  };
}

export function mapRemoteEventToLocal(row: RemoteRow, snapshot: DatabaseSnapshot): Event {
  const existing = snapshot.events.find((event) => event.remoteId === row.id);
  return {
    id: existing?.id ?? createId('event'),
    localId: existing?.localId ?? null,
    remoteId: row.id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    notes: row.description ?? null,
    defaultCurrency: row.default_currency,
    allowedCurrencies: Array.isArray(row.allowed_currencies) && row.allowed_currencies.length ? row.allowed_currencies : [row.default_currency],
    tags: Array.isArray(row.tags) ? row.tags : [],
    status: row.status,
    visibility: row.visibility,
    syncStatus: shouldKeepLocalPending(existing) ? existing!.syncStatus : 'synced',
    archived: Boolean(row.archived_at) || row.status === 'archived',
    archivedAt: row.archived_at ?? null,
    finalisedAt: row.finalised_at ?? null,
    lockedAt: row.locked_at ?? null,
    ignoredDuplicateKeys: existing?.ignoredDuplicateKeys ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRemoteEventParticipantToLocal(row: RemoteRow, snapshot: DatabaseSnapshot): EventParticipant {
  const eventId = requiredLocalId(snapshot, 'event', row.event_id, 'event_participants.event_id');
  const existing = snapshot.eventParticipants.find((participant) => participant.remoteId === row.id);
  return {
    id: existing?.id ?? createId('event_participant'),
    remoteId: row.id,
    eventId,
    remoteEventId: row.event_id,
    userId: row.user_id,
    role: row.role,
    status: row.status,
    joinedAt: row.joined_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: shouldKeepLocalPending(existing) ? existing!.syncStatus : 'synced',
  };
}

export function mapLocalEventMemberToRemote(member: SharedEventMember, snapshot: DatabaseSnapshot) {
  return {
    event_id: requiredRemoteId(snapshot, 'event', member.eventId, 'event_members.event_id'),
    type: member.type,
    linked_user_id: member.linkedUserId,
    display_name: member.displayName,
    alias: member.alias,
    email: member.email,
    phone: member.phone,
    notes: member.notes,
    created_by_user_id: member.createdByUserId,
    status: member.status,
    merged_into_event_member_id: member.mergedIntoEventMemberId
      ? requiredRemoteId(snapshot, 'event_member', member.mergedIntoEventMemberId, 'event_members.merged_into_event_member_id')
      : null,
  };
}

export function mapRemoteEventMemberToLocal(row: RemoteRow, snapshot: DatabaseSnapshot): SharedEventMember {
  const eventId = requiredLocalId(snapshot, 'event', row.event_id, 'event_members.event_id');
  const existing = snapshot.sharedEventMembers.find((member) => member.remoteId === row.id);
  const mergedIntoEventMemberId = row.merged_into_event_member_id
    ? getLocalIdForRemoteId(snapshot, 'event_member', row.merged_into_event_member_id)
    : null;
  return {
    id: existing?.id ?? createId('event_member'),
    remoteId: row.id,
    eventId,
    remoteEventId: row.event_id,
    type: row.type,
    linkedUserId: row.linked_user_id ?? null,
    displayName: row.display_name,
    alias: row.alias ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    notes: row.notes ?? null,
    createdByUserId: row.created_by_user_id ?? null,
    status: row.status,
    mergedIntoEventMemberId,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: shouldKeepLocalPending(existing) ? existing!.syncStatus : 'synced',
  };
}

export function mapLocalExpenseToRemote(expense: SharedExpense, snapshot: DatabaseSnapshot) {
  const remoteEventId = requiredRemoteId(snapshot, 'event', expense.eventId, 'event_expenses.event_id');
  const remotePayerId = requiredRemoteId(snapshot, 'event_member', String(expense.payerId), 'event_expenses.payer_event_member_id');
  return {
    expense: {
      event_id: remoteEventId,
      creator_user_id: expense.creatorUserId,
      payer_event_member_id: remotePayerId,
      amount: expense.amount,
      currency: expense.currency,
      title: expense.title,
      notes: expense.notes,
      date: expense.expenseDate,
      tags: expense.tags,
      split_method: expense.splitMethod,
      verification_status: expense.verificationStatus,
      settlement_status: expense.status,
      status: expense.status,
      archived_at: expense.status === 'archived' ? expense.updatedAt : null,
    },
    splits: expense.participantIds.map((participantId) => ({
      event_member_id: requiredRemoteId(snapshot, 'event_member', String(participantId), 'event_expense_splits.event_member_id'),
      included: true,
      share_amount: expense.splitMethod === 'custom_amount' ? expense.splitAllocations[participantId] ?? null : null,
      share_percentage: expense.splitMethod === 'custom_percentage' ? expense.splitAllocations[participantId] ?? null : null,
      share_weight: expense.splitMethod === 'shares' ? expense.splitAllocations[participantId] ?? null : null,
      calculated_share_amount:
        expense.generatedObligations
          .filter((obligation) => obligation.fromParticipantId === participantId)
          .reduce((total, obligation) => total + obligation.amount, 0) || 0,
    })),
    payers: normalisedExpensePayers(expense).map((payer) => ({
      event_member_id: requiredRemoteId(snapshot, 'event_member', String(payer.eventMemberId), 'expense_payers.event_member_id'),
      amount_paid: payer.amountPaid,
      currency: payer.currency,
    })),
  };
}

export function mapRemoteExpenseToLocal(
  row: RemoteRow,
  splits: RemoteExpenseSplit[],
  payers: RemoteExpensePayer[],
  snapshot: DatabaseSnapshot,
): SharedExpense {
  const eventId = requiredLocalId(snapshot, 'event', row.event_id, 'event_expenses.event_id');
  const existing = snapshot.sharedExpenses.find((expense) => expense.remoteId === row.id);
  const localExpenseId = existing?.id ?? createId('expense');
  const participantIds = splits
    .filter((split) => split.included !== false)
    .map((split) => requiredLocalId(snapshot, 'event_member', split.event_member_id, 'event_expense_splits.event_member_id'));
  const payerId = requiredLocalId(snapshot, 'event_member', row.payer_event_member_id, 'event_expenses.payer_event_member_id');
  const splitAllocations = Object.fromEntries(
    splits.map((split) => {
      const localMemberId = requiredLocalId(snapshot, 'event_member', split.event_member_id, 'event_expense_splits.event_member_id');
      return [localMemberId, Number(split.share_amount ?? split.share_percentage ?? split.share_weight ?? 0)];
    }),
  ) as Record<ParticipantId, number>;

  return withGeneratedObligations({
    id: localExpenseId,
    remoteId: row.id,
    eventId,
    creatorUserId: row.creator_user_id ?? null,
    payerId,
    expensePayers: payers.map((payer) => ({
      id: getLocalIdForRemoteId(snapshot, 'expense_payer', payer.id) ?? createId('expense_payer'),
      expenseId: localExpenseId,
      eventMemberId: requiredLocalId(snapshot, 'event_member', payer.event_member_id, 'expense_payers.event_member_id'),
      amountPaid: Number(payer.amount_paid),
      currency: payer.currency,
      createdAt: payer.created_at,
      updatedAt: payer.updated_at,
    })),
    amount: Number(row.amount),
    currency: row.currency,
    title: row.title,
    notes: row.notes ?? null,
    expenseDate: row.date,
    participantIds: participantIds.length ? Array.from(new Set(participantIds)) : [payerId],
    splitMethod: row.split_method ?? 'equal',
    splitAllocations,
    dueDate: null,
    recurringTemplateId: null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    status: row.status,
    verificationStatus: row.verification_status,
    visibility: 'shared_event',
    syncStatus: shouldKeepLocalPending(existing) ? existing!.syncStatus : 'synced',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function mapRemoteExpensePayerToLocal(row: RemoteExpensePayer, snapshot: DatabaseSnapshot): ExpensePayer {
  return {
    id: getLocalIdForRemoteId(snapshot, 'expense_payer', row.id) ?? createId('expense_payer'),
    expenseId: requiredLocalId(snapshot, 'shared_expense', row.expense_id, 'expense_payers.expense_id'),
    eventMemberId: requiredLocalId(snapshot, 'event_member', row.event_member_id, 'expense_payers.event_member_id'),
    amountPaid: Number(row.amount_paid),
    currency: row.currency,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapLocalEventDebtToRemote(debt: EventDebt, snapshot: DatabaseSnapshot) {
  return {
    event_id: requiredRemoteId(snapshot, 'event', debt.eventId, 'event_debts.event_id'),
    creator_user_id: debt.creatorUserId,
    debtor_event_member_id: requiredRemoteId(snapshot, 'event_member', debt.debtorEventMemberId, 'event_debts.debtor_event_member_id'),
    creditor_event_member_id: requiredRemoteId(snapshot, 'event_member', debt.creditorEventMemberId, 'event_debts.creditor_event_member_id'),
    amount: debt.amount,
    currency: debt.currency,
    title: debt.title,
    notes: debt.notes,
    date: debt.debtDate,
    tags: debt.tags,
    verification_status: debt.verificationStatus,
    settlement_status: debt.settlementStatus,
    status: debt.status,
    archived_at: debt.archivedAt,
  };
}

export function mapRemoteEventDebtToLocal(row: RemoteRow, snapshot: DatabaseSnapshot): EventDebt {
  const existing = snapshot.eventDebts.find((debt) => debt.remoteId === row.id);
  return {
    id: existing?.id ?? createId('event_debt'),
    remoteId: row.id,
    eventId: requiredLocalId(snapshot, 'event', row.event_id, 'event_debts.event_id'),
    remoteEventId: row.event_id,
    creatorUserId: row.creator_user_id ?? null,
    debtorEventMemberId: requiredLocalId(snapshot, 'event_member', row.debtor_event_member_id, 'event_debts.debtor_event_member_id'),
    creditorEventMemberId: requiredLocalId(snapshot, 'event_member', row.creditor_event_member_id, 'event_debts.creditor_event_member_id'),
    amount: Number(row.amount),
    currency: row.currency,
    title: row.title,
    notes: row.notes ?? null,
    debtDate: row.date,
    dueDate: null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    verificationStatus: row.verification_status,
    settlementStatus: row.settlement_status,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at ?? null,
    syncStatus: shouldKeepLocalPending(existing) ? existing!.syncStatus : 'synced',
  };
}

export function mapLocalEventVerificationToRemote(response: EventVerificationResponse, snapshot: DatabaseSnapshot) {
  return {
    event_id: requiredRemoteId(snapshot, 'event', response.eventId, 'event_verification_responses.event_id'),
    target_type: response.targetType,
    target_id: requiredRemoteTargetId(snapshot, response.targetType, response.targetId),
    event_member_id: requiredRemoteId(snapshot, 'event_member', response.eventMemberId, 'event_verification_responses.event_member_id'),
    linked_user_id: response.linkedUserId,
    response_status: response.responseStatus,
    rejection_reason: response.rejectionReason,
    responded_at: response.respondedAt,
  };
}

export function mapRemoteEventVerificationToLocal(row: RemoteRow, snapshot: DatabaseSnapshot): EventVerificationResponse {
  const existing = snapshot.eventVerificationResponses.find((response) => response.remoteId === row.id);
  return {
    id: existing?.id ?? createId('event_verify'),
    remoteId: row.id,
    eventId: requiredLocalId(snapshot, 'event', row.event_id, 'event_verification_responses.event_id'),
    remoteEventId: row.event_id,
    targetType: row.target_type,
    targetId: requiredLocalTargetId(snapshot, row.target_type, row.target_id),
    remoteTargetId: row.target_id,
    eventMemberId: requiredLocalId(snapshot, 'event_member', row.event_member_id, 'event_verification_responses.event_member_id'),
    linkedUserId: row.linked_user_id ?? null,
    responseStatus: row.response_status,
    rejectionReason: row.rejection_reason ?? null,
    respondedAt: row.responded_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: shouldKeepLocalPending(existing) ? existing!.syncStatus : 'synced',
  };
}

export function mapLocalPaymentToRemote(payment: Payment, snapshot: DatabaseSnapshot) {
  return {
    created_by_user_id: payment.createdByUserId,
    payer_user_id: payment.payerUserId,
    payee_user_id: payment.payeeUserId,
    payer_member_id: payment.payerMemberId,
    payee_member_id: payment.payeeMemberId,
    payer_event_member_id: payment.payerEventMemberId
      ? requiredRemoteId(snapshot, 'event_member', payment.payerEventMemberId, 'payments.payer_event_member_id')
      : null,
    payee_event_member_id: payment.payeeEventMemberId
      ? requiredRemoteId(snapshot, 'event_member', payment.payeeEventMemberId, 'payments.payee_event_member_id')
      : null,
    event_id: payment.eventId ? requiredRemoteId(snapshot, 'event', payment.eventId, 'payments.event_id') : null,
    amount: payment.amount,
    currency: payment.currency,
    payment_date: payment.paymentDate,
    notes: payment.notes,
    status: payment.status,
    confirmation_status: payment.confirmationStatus,
    visibility: payment.visibility,
    archived_at: payment.archivedAt,
  };
}

export function mapRemotePaymentToLocal(row: RemoteRow, snapshot: DatabaseSnapshot): Payment {
  const existing = snapshot.payments.find((payment) => payment.remoteId === row.id);
  return {
    id: existing?.id ?? createId('payment'),
    localId: existing?.localId ?? null,
    remoteId: row.id,
    createdByUserId: row.created_by_user_id ?? null,
    payerUserId: row.payer_user_id ?? null,
    payeeUserId: row.payee_user_id ?? null,
    payerMemberId: row.payer_member_id ?? null,
    payeeMemberId: row.payee_member_id ?? null,
    payerEventMemberId: row.payer_event_member_id
      ? requiredLocalId(snapshot, 'event_member', row.payer_event_member_id, 'payments.payer_event_member_id')
      : null,
    payeeEventMemberId: row.payee_event_member_id
      ? requiredLocalId(snapshot, 'event_member', row.payee_event_member_id, 'payments.payee_event_member_id')
      : null,
    eventId: row.event_id ? requiredLocalId(snapshot, 'event', row.event_id, 'payments.event_id') : null,
    relatedMemberId: existing?.relatedMemberId ?? null,
    amount: Number(row.amount),
    currency: row.currency,
    paymentDate: row.payment_date,
    notes: row.notes ?? null,
    status: row.status,
    confirmationStatus: row.confirmation_status,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at ?? null,
    syncStatus: shouldKeepLocalPending(existing) ? existing!.syncStatus : 'synced',
  };
}

export function mapLocalSettlementToRemote(settlement: Settlement, snapshot: DatabaseSnapshot) {
  return {
    created_by_user_id: settlement.createdByUserId,
    event_id: settlement.eventId ? requiredRemoteId(snapshot, 'event', settlement.eventId, 'settlements.event_id') : null,
    member_id: settlement.memberId,
    type: settlement.type,
    currency: settlement.currency,
    total_amount: settlement.totalAmount,
    status: settlement.status,
    confirmation_status: settlement.confirmationStatus,
    notes: settlement.notes,
    original_currency: settlement.originalCurrency,
    original_amount: settlement.originalAmount,
    settlement_currency: settlement.settlementCurrency,
    settlement_amount: settlement.settlementAmount,
    exchange_rate_used: settlement.exchangeRateUsed,
    exchange_rate_date: settlement.exchangeRateDate,
    conversion_note: settlement.conversionNote,
    archived_at: settlement.archivedAt,
  };
}

export function mapRemoteSettlementToLocal(row: RemoteRow, snapshot: DatabaseSnapshot): Settlement {
  const existing = snapshot.settlements.find((settlement) => settlement.remoteId === row.id);
  return {
    id: existing?.id ?? createId('settlement'),
    localId: existing?.localId ?? null,
    remoteId: row.id,
    createdByUserId: row.created_by_user_id ?? null,
    eventId: row.event_id ? requiredLocalId(snapshot, 'event', row.event_id, 'settlements.event_id') : null,
    memberId: row.member_id ?? null,
    type: row.type,
    currency: row.currency,
    totalAmount: Number(row.total_amount),
    status: row.status,
    confirmationStatus: row.confirmation_status,
    notes: row.notes ?? null,
    originalCurrency: row.original_currency ?? null,
    originalAmount: row.original_amount === null || row.original_amount === undefined ? null : Number(row.original_amount),
    settlementCurrency: row.settlement_currency ?? null,
    settlementAmount: row.settlement_amount === null || row.settlement_amount === undefined ? null : Number(row.settlement_amount),
    exchangeRateUsed: row.exchange_rate_used === null || row.exchange_rate_used === undefined ? null : Number(row.exchange_rate_used),
    exchangeRateDate: row.exchange_rate_date ?? null,
    conversionNote: row.conversion_note ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at ?? null,
    syncStatus: shouldKeepLocalPending(existing) ? existing!.syncStatus : 'synced',
  };
}

export function mapLocalSettlementLineToRemote(line: SettlementLine, snapshot: DatabaseSnapshot) {
  return {
    settlement_id: requiredRemoteId(snapshot, 'settlement', line.settlementId, 'settlement_lines.settlement_id'),
    payment_id: line.paymentId ? requiredRemoteId(snapshot, 'payment', line.paymentId, 'settlement_lines.payment_id') : null,
    source_record_type: line.sourceRecordType,
    source_record_id: mapSourceRecordIdToRemote(snapshot, line.sourceRecordType, line.sourceRecordId),
    applied_amount: line.appliedAmount,
    currency: line.currency,
  };
}

export function mapRemoteSettlementLineToLocal(row: RemoteRow, snapshot: DatabaseSnapshot): SettlementLine {
  const existing = snapshot.settlementLines.find((line) => line.remoteId === row.id);
  return {
    id: existing?.id ?? createId('settlement_line'),
    remoteId: row.id,
    settlementId: requiredLocalId(snapshot, 'settlement', row.settlement_id, 'settlement_lines.settlement_id'),
    paymentId: row.payment_id ? requiredLocalId(snapshot, 'payment', row.payment_id, 'settlement_lines.payment_id') : null,
    sourceRecordType: row.source_record_type,
    sourceRecordId: mapSourceRecordIdToLocal(snapshot, row.source_record_type, row.source_record_id),
    appliedAmount: Number(row.applied_amount),
    currency: row.currency,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: shouldKeepLocalPending(existing) ? existing!.syncStatus : 'synced',
  };
}

export function mapLocalCommentToRemote(comment: Comment, snapshot: DatabaseSnapshot) {
  return {
    target_type: comment.targetType,
    target_id: mapCommentAttachmentTargetToRemote(snapshot, comment.targetType, comment.targetId),
    event_id: comment.eventId ? requiredRemoteId(snapshot, 'event', comment.eventId, 'comments.event_id') : null,
    author_user_id: comment.authorUserId,
    body: comment.body,
    visibility: comment.visibility,
    deleted_at: comment.deletedAt,
  };
}

export function mapRemoteCommentToLocal(row: RemoteRow, snapshot: DatabaseSnapshot): Comment {
  const existing = snapshot.comments.find((comment) => comment.remoteId === row.id);
  return {
    id: existing?.id ?? createId('comment'),
    remoteId: row.id,
    targetType: row.target_type,
    targetId: mapCommentAttachmentTargetToLocal(snapshot, row.target_type, row.target_id),
    eventId: row.event_id ? requiredLocalId(snapshot, 'event', row.event_id, 'comments.event_id') : null,
    authorUserId: row.author_user_id ?? null,
    localAuthorLabel: existing?.localAuthorLabel ?? null,
    body: row.body,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? null,
    syncStatus: shouldKeepLocalPending(existing) ? existing!.syncStatus : 'synced',
  };
}

export function mapLocalAttachmentToRemote(attachment: Attachment, snapshot: DatabaseSnapshot) {
  return {
    target_type: attachment.targetType,
    target_id: mapCommentAttachmentTargetToRemote(snapshot, attachment.targetType, attachment.targetId),
    event_id: attachment.eventId ? requiredRemoteId(snapshot, 'event', attachment.eventId, 'attachments.event_id') : null,
    created_by_user_id: attachment.createdByUserId,
    storage_path: attachment.storagePath,
    file_name: attachment.fileName,
    file_type: attachment.fileType,
    mime_type: attachment.mimeType,
    file_size: attachment.fileSize,
    attachment_kind: attachment.attachmentKind,
    visibility: attachment.visibility,
    sync_status: attachment.syncStatus,
    archived_at: attachment.archivedAt,
  };
}

export function mapRemoteAttachmentToLocal(row: RemoteRow, snapshot: DatabaseSnapshot): Attachment {
  const existing = snapshot.attachments.find((attachment) => attachment.remoteId === row.id);
  return {
    id: existing?.id ?? createId('attachment'),
    remoteId: row.id,
    targetType: row.target_type,
    targetId: mapCommentAttachmentTargetToLocal(snapshot, row.target_type, row.target_id),
    eventId: row.event_id ? requiredLocalId(snapshot, 'event', row.event_id, 'attachments.event_id') : null,
    createdByUserId: row.created_by_user_id ?? null,
    localUri: existing?.localUri ?? null,
    remoteUrl: existing?.remoteUrl ?? null,
    storagePath: row.storage_path ?? null,
    fileName: row.file_name,
    fileType: row.file_type,
    mimeType: row.mime_type,
    fileSize: Number(row.file_size ?? 0),
    attachmentKind: row.attachment_kind,
    visibility: row.visibility,
    thumbnailUri: existing?.thumbnailUri ?? null,
    syncStatus: shouldKeepLocalPending(existing) ? existing!.syncStatus : 'synced',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at ?? null,
  };
}

export function mapRemoteEventInviteToLocal(row: RemoteRow, snapshot: DatabaseSnapshot): EventInvite {
  const existing = snapshot.eventInvites.find((invite) => invite.remoteId === row.id);
  return {
    id: existing?.id ?? createId('event_invite'),
    remoteId: row.id,
    eventId: requiredLocalId(snapshot, 'event', row.event_id, 'event_invites.event_id'),
    remoteEventId: row.event_id,
    inviterUserId: row.inviter_user_id,
    invitedUserId: row.invited_user_id ?? null,
    invitedEmail: row.invited_email ?? null,
    invitedPhone: row.invited_phone ?? null,
    invitedDisplayName: row.invited_display_name,
    offeredRole: row.offered_role,
    status: row.status,
    message: row.message ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    respondedAt: row.responded_at ?? null,
    syncStatus: shouldKeepLocalPending(existing) ? existing!.syncStatus : 'synced',
  };
}

export function mapRemoteEventClaimToLocal(row: RemoteRow, snapshot: DatabaseSnapshot): EventMemberClaim {
  const existing = snapshot.eventMemberClaims.find((claim) => claim.remoteId === row.id);
  const eventMemberId = requiredLocalId(snapshot, 'event_member', row.event_member_id, 'event_member_claims.event_member_id');
  return {
    id: existing?.id ?? createId('event_claim'),
    remoteId: row.id,
    eventId: requiredLocalId(snapshot, 'event', row.event_id, 'event_member_claims.event_id'),
    remoteEventId: row.event_id,
    eventMemberId,
    remoteEventMemberId: row.event_member_id,
    claimantUserId: row.claimant_user_id,
    status: row.status,
    message: row.message ?? null,
    respondedByUserId: row.responded_by_user_id ?? null,
    respondedAt: row.responded_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: shouldKeepLocalPending(existing) ? existing!.syncStatus : 'synced',
  };
}

export function mapRemoteDuplicateWarningToLocal(row: RemoteRow, snapshot: DatabaseSnapshot): EventDuplicateWarning {
  const existing = snapshot.eventDuplicateWarnings.find((warning) => warning.remoteId === row.id);
  return {
    id: existing?.id ?? createId('event_duplicate'),
    remoteId: row.id,
    eventId: requiredLocalId(snapshot, 'event', row.event_id, 'event_duplicate_warnings.event_id'),
    eventMemberIdA: requiredLocalId(snapshot, 'event_member', row.event_member_id_a, 'event_duplicate_warnings.event_member_id_a'),
    eventMemberIdB: requiredLocalId(snapshot, 'event_member', row.event_member_id_b, 'event_duplicate_warnings.event_member_id_b'),
    reason: row.reason,
    confidence: row.confidence,
    status: row.status,
    ignoredByUserId: row.ignored_by_user_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: shouldKeepLocalPending(existing) ? existing!.syncStatus : 'synced',
  };
}

export function mapRemoteActivityToLocal(row: RemoteRow, snapshot: DatabaseSnapshot): EventActivityLog {
  const existing = snapshot.eventActivityLogs.find((activity) => activity.remoteId === row.id);
  return {
    id: existing?.id ?? createId('event_activity'),
    remoteId: row.id,
    eventId: requiredLocalId(snapshot, 'event', row.event_id, 'event_activity_logs.event_id'),
    remoteEventId: row.event_id,
    actorUserId: row.actor_user_id ?? null,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id ? mapActivityTargetToLocal(snapshot, row.target_type, row.target_id) : null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    syncStatus: 'synced',
  };
}

function requiredRemoteId(
  snapshot: DatabaseSnapshot,
  entityType: EntityKind | 'settlement_line',
  localId: string,
  field: string,
) {
  const remoteId = getRemoteIdForLocalId(snapshot, entityType, localId);
  if (!remoteId) {
    throw new SyncMappingError(`Missing remote id for ${field}.`, { entityType, localId, field });
  }
  return remoteId;
}

function requiredLocalId(
  snapshot: DatabaseSnapshot,
  entityType: EntityKind | 'expense_payer' | 'settlement_line',
  remoteId: string,
  field: string,
) {
  const localId = getLocalIdForRemoteId(snapshot, entityType, remoteId);
  if (!localId) {
    throw new SyncMappingError(`Missing local id for ${field}.`, { entityType, remoteId, field });
  }
  return localId;
}

function requiredRemoteTargetId(snapshot: DatabaseSnapshot, targetType: string, localId: string) {
  if (targetType === 'expense') {
    return requiredRemoteId(snapshot, 'shared_expense', localId, 'event_verification_responses.target_id');
  }
  if (targetType === 'debt') {
    return requiredRemoteId(snapshot, 'event_debt', localId, 'event_verification_responses.target_id');
  }
  return localId;
}

function requiredLocalTargetId(snapshot: DatabaseSnapshot, targetType: string, remoteId: string) {
  if (targetType === 'expense') {
    return requiredLocalId(snapshot, 'shared_expense', remoteId, 'event_verification_responses.target_id');
  }
  if (targetType === 'debt') {
    return requiredLocalId(snapshot, 'event_debt', remoteId, 'event_verification_responses.target_id');
  }
  return remoteId;
}

function mapSourceRecordIdToRemote(snapshot: DatabaseSnapshot, sourceRecordType: string, localId: string) {
  if (sourceRecordType === 'event_debt') {
    return getRemoteIdForLocalId(snapshot, 'event_debt', localId) ?? localId;
  }
  if (sourceRecordType === 'simple_debt') {
    return getRemoteIdForLocalId(snapshot, 'debt', localId) ?? localId;
  }
  return localId;
}

function mapSourceRecordIdToLocal(snapshot: DatabaseSnapshot, sourceRecordType: string, remoteOrLocalId: string) {
  if (sourceRecordType === 'event_debt') {
    return getLocalIdForRemoteId(snapshot, 'event_debt', remoteOrLocalId) ?? remoteOrLocalId;
  }
  if (sourceRecordType === 'simple_debt') {
    return getLocalIdForRemoteId(snapshot, 'debt', remoteOrLocalId) ?? remoteOrLocalId;
  }
  return remoteOrLocalId;
}

function mapCommentAttachmentTargetToRemote(snapshot: DatabaseSnapshot, targetType: string, localId: string) {
  switch (targetType) {
    case 'event':
      return getRemoteIdForLocalId(snapshot, 'event', localId) ?? localId;
    case 'shared_expense':
      return getRemoteIdForLocalId(snapshot, 'shared_expense', localId) ?? localId;
    case 'event_debt':
      return getRemoteIdForLocalId(snapshot, 'event_debt', localId) ?? localId;
    case 'payment':
      return getRemoteIdForLocalId(snapshot, 'payment', localId) ?? localId;
    case 'settlement':
      return getRemoteIdForLocalId(snapshot, 'settlement', localId) ?? localId;
    case 'event_member':
      return getRemoteIdForLocalId(snapshot, 'event_member', localId) ?? localId;
    default:
      return localId;
  }
}

function mapCommentAttachmentTargetToLocal(snapshot: DatabaseSnapshot, targetType: string, remoteOrLocalId: string) {
  switch (targetType) {
    case 'event':
      return getLocalIdForRemoteId(snapshot, 'event', remoteOrLocalId) ?? remoteOrLocalId;
    case 'shared_expense':
      return getLocalIdForRemoteId(snapshot, 'shared_expense', remoteOrLocalId) ?? remoteOrLocalId;
    case 'event_debt':
      return getLocalIdForRemoteId(snapshot, 'event_debt', remoteOrLocalId) ?? remoteOrLocalId;
    case 'payment':
      return getLocalIdForRemoteId(snapshot, 'payment', remoteOrLocalId) ?? remoteOrLocalId;
    case 'settlement':
      return getLocalIdForRemoteId(snapshot, 'settlement', remoteOrLocalId) ?? remoteOrLocalId;
    case 'event_member':
      return getLocalIdForRemoteId(snapshot, 'event_member', remoteOrLocalId) ?? remoteOrLocalId;
    default:
      return remoteOrLocalId;
  }
}

function mapActivityTargetToLocal(snapshot: DatabaseSnapshot, targetType: string, remoteOrLocalId: string) {
  return mapCommentAttachmentTargetToLocal(snapshot, targetType === 'event_member' ? 'event_member' : targetType, remoteOrLocalId);
}

function normalisedExpensePayers(expense: SharedExpense) {
  return expense.expensePayers.length
    ? expense.expensePayers
    : [
        {
          id: `${expense.id}_payer_${expense.payerId}`,
          expenseId: expense.id,
          eventMemberId: expense.payerId,
          amountPaid: expense.amount,
          currency: expense.currency,
          createdAt: expense.createdAt,
          updatedAt: expense.updatedAt,
        },
      ];
}

function shouldKeepLocalPending(record: { syncStatus?: string | null } | null | undefined) {
  return (
    record?.syncStatus === 'pending_upload' ||
    record?.syncStatus === 'pending_create' ||
    record?.syncStatus === 'pending_update' ||
    record?.syncStatus === 'pending_delete' ||
    record?.syncStatus === 'conflict'
  );
}

function collectionForEntity(snapshot: DatabaseSnapshot, entityType: EntityKind | 'expense_payer' | 'settlement_line') {
  switch (entityType) {
    case 'event':
      return snapshot.events;
    case 'event_invite':
      return snapshot.eventInvites;
    case 'event_member':
      return snapshot.sharedEventMembers;
    case 'event_member_claim':
      return snapshot.eventMemberClaims;
    case 'event_duplicate_warning':
      return snapshot.eventDuplicateWarnings;
    case 'shared_expense':
      return snapshot.sharedExpenses;
    case 'event_debt':
      return snapshot.eventDebts;
    case 'event_verification':
      return snapshot.eventVerificationResponses;
    case 'payment':
      return snapshot.payments;
    case 'settlement':
      return snapshot.settlements;
    case 'settlement_line':
      return snapshot.settlementLines;
    case 'attachment':
      return snapshot.attachments;
    case 'comment':
      return snapshot.comments;
    case 'debt':
      return snapshot.debts;
    case 'member':
      return snapshot.members;
    case 'expense_payer':
      return snapshot.expensePayers as (ExpensePayer & { remoteId?: string | null })[];
    default:
      return [];
  }
}
