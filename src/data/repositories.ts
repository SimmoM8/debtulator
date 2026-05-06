import type * as SQLite from 'expo-sqlite';

import {
  deleteEventMember,
  insertActivityLog,
  insertDebt,
  insertDebtVerification,
  insertEvent,
  insertEventMember,
  insertLinkRequest,
  insertMember,
  insertProfile,
  insertSharedExpense,
  loadSnapshot,
  resetDatabase,
  updateCurrencyRate,
  updateSetting,
} from '@/src/data/database';
import { withGeneratedObligations } from '@/src/services/splits';
import type {
  AppSettings,
  ActivityTargetKind,
  CurrencyCode,
  Debt,
  DebtVerification,
  DebtStatus,
  Event,
  EventMember,
  EventStatus,
  LinkRequest,
  Member,
  MemberLinkStatus,
  ParticipantId,
  SharedExpense,
  SuggestedDebtChange,
  VerificationStatus,
  UserProfile,
} from '@/src/types/models';
import { createId, nowIso, todayIsoDate } from '@/src/utils/id';

type MemberInput = {
  displayName: string;
  notes?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedUserId?: string | null;
  linkStatus?: MemberLinkStatus;
  linkedProfileDisplayName?: string | null;
  linkedProfileEmail?: string | null;
  linkedProfilePhone?: string | null;
  tags?: string[];
};

type DebtInput = {
  memberId: string;
  direction: Debt['direction'];
  amount: number;
  currency: CurrencyCode;
  title: string;
  notes?: string | null;
  sharedNotes?: string | null;
  debtDate?: string;
  dueDate?: string | null;
  tags?: string[];
  eventId?: string | null;
  status?: DebtStatus;
  verificationStatus?: VerificationStatus;
  visibility?: Debt['visibility'];
};

type EventInput = {
  name: string;
  notes?: string | null;
  defaultCurrency: CurrencyCode;
  tags?: string[];
  status?: EventStatus;
  memberIds?: string[];
};

type SharedExpenseInput = {
  eventId: string;
  payerId: ParticipantId;
  amount: number;
  currency: CurrencyCode;
  title: string;
  notes?: string | null;
  expenseDate?: string;
  participantIds: ParticipantId[];
  tags?: string[];
  status?: DebtStatus;
  verificationStatus?: VerificationStatus;
};

type LinkMemberInput = {
  member: Member;
  requesterUserId: string;
  targetUserId?: string | null;
  targetEmail?: string | null;
  targetPhone?: string | null;
  message?: string | null;
  remoteId?: string | null;
};

type DebtVerificationInput = {
  debt: Debt;
  member: Member;
  requesterUserId: string;
  responderUserId: string;
  remoteDebtId?: string | null;
  remoteVerificationId?: string | null;
  sharedNotes?: string | null;
};

export class DebtulatorRepository {
  constructor(private readonly db: SQLite.SQLiteDatabase) {}

  async load() {
    return loadSnapshot(this.db);
  }

  async reset(seed = true) {
    await resetDatabase(this.db, seed);
  }

  async createMember(input: MemberInput) {
    const timestamp = nowIso();
    const member: Member = {
      id: createId('member'),
      displayName: input.displayName.trim(),
      notes: cleanOptional(input.notes),
      email: cleanOptional(input.email),
      phone: cleanOptional(input.phone),
      remoteId: null,
      linkedUserId: cleanOptional(input.linkedUserId),
      linkStatus: input.linkStatus ?? 'unlinked',
      linkRequestId: null,
      linkedProfileDisplayName: cleanOptional(input.linkedProfileDisplayName),
      linkedProfileEmail: cleanOptional(input.linkedProfileEmail),
      linkedProfilePhone: cleanOptional(input.linkedProfilePhone),
      syncStatus: 'local_only',
      tags: cleanTags(input.tags),
      archived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await insertMember(this.db, member);
    return member;
  }

  async updateMember(member: Member, input: Partial<MemberInput> & { archived?: boolean }) {
    const updated: Member = {
      ...member,
      displayName: input.displayName?.trim() ?? member.displayName,
      notes: input.notes === undefined ? member.notes : cleanOptional(input.notes),
      email: input.email === undefined ? member.email : cleanOptional(input.email),
      phone: input.phone === undefined ? member.phone : cleanOptional(input.phone),
      linkedUserId: input.linkedUserId === undefined ? member.linkedUserId : cleanOptional(input.linkedUserId),
      linkStatus: input.linkStatus ?? member.linkStatus,
      linkedProfileDisplayName:
        input.linkedProfileDisplayName === undefined
          ? member.linkedProfileDisplayName
          : cleanOptional(input.linkedProfileDisplayName),
      linkedProfileEmail:
        input.linkedProfileEmail === undefined ? member.linkedProfileEmail : cleanOptional(input.linkedProfileEmail),
      linkedProfilePhone:
        input.linkedProfilePhone === undefined ? member.linkedProfilePhone : cleanOptional(input.linkedProfilePhone),
      tags: input.tags === undefined ? member.tags : cleanTags(input.tags),
      archived: input.archived ?? member.archived,
      updatedAt: nowIso(),
    };
    await insertMember(this.db, updated);
    return updated;
  }

  async createDebt(input: DebtInput) {
    const timestamp = nowIso();
    const debt: Debt = {
      id: createId('debt'),
      type: 'simple',
      memberId: input.memberId,
      remoteId: null,
      verificationRequestId: null,
      visibility: input.visibility ?? 'private',
      syncStatus: input.visibility === 'shared_with_involved_member' ? 'pending_upload' : 'local_only',
      direction: input.direction,
      amount: toAmount(input.amount),
      currency: input.currency,
      title: input.title.trim(),
      notes: cleanOptional(input.notes),
      sharedNotes: cleanOptional(input.sharedNotes),
      debtDate: input.debtDate || todayIsoDate(),
      dueDate: cleanOptional(input.dueDate),
      tags: cleanTags(input.tags),
      eventId: input.eventId ?? null,
      status: input.status ?? 'active',
      verificationStatus: input.verificationStatus ?? 'local_only',
      verifiedByUserId: null,
      verifiedAt: null,
      rejectedByUserId: null,
      rejectedAt: null,
      rejectionReason: null,
      disputeReason: null,
      resolutionNote: null,
      suggestedChange: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await insertDebt(this.db, debt);
    return debt;
  }

  async updateDebt(debt: Debt, input: Partial<DebtInput>) {
    const financialFieldsChanged = [
      input.memberId !== undefined && input.memberId !== debt.memberId,
      input.direction !== undefined && input.direction !== debt.direction,
      input.amount !== undefined && toAmount(input.amount) !== debt.amount,
      input.currency !== undefined && input.currency !== debt.currency,
      input.eventId !== undefined && input.eventId !== debt.eventId,
      input.debtDate !== undefined && input.debtDate !== debt.debtDate,
    ].some(Boolean);

    const nextVerificationStatus =
      ['pending', 'verified', 'rejected', 'disputed', 'resolved'].includes(debt.verificationStatus) && financialFieldsChanged
        ? debt.visibility === 'shared_with_involved_member'
          ? 'pending'
          : 'local_only'
        : input.verificationStatus ?? debt.verificationStatus;

    const updated: Debt = {
      ...debt,
      memberId: input.memberId ?? debt.memberId,
      visibility: input.visibility ?? debt.visibility,
      syncStatus:
        financialFieldsChanged && debt.syncStatus === 'synced'
          ? 'pending_update'
          : input.visibility === 'shared_with_involved_member' && debt.syncStatus === 'local_only'
            ? 'pending_upload'
            : debt.syncStatus,
      direction: input.direction ?? debt.direction,
      amount: input.amount === undefined ? debt.amount : toAmount(input.amount),
      currency: input.currency ?? debt.currency,
      title: input.title?.trim() ?? debt.title,
      notes: input.notes === undefined ? debt.notes : cleanOptional(input.notes),
      sharedNotes: input.sharedNotes === undefined ? debt.sharedNotes : cleanOptional(input.sharedNotes),
      debtDate: input.debtDate ?? debt.debtDate,
      dueDate: input.dueDate === undefined ? debt.dueDate : cleanOptional(input.dueDate),
      tags: input.tags === undefined ? debt.tags : cleanTags(input.tags),
      eventId: input.eventId === undefined ? debt.eventId : input.eventId,
      status: input.status ?? debt.status,
      verificationStatus: nextVerificationStatus,
      verifiedByUserId: financialFieldsChanged ? null : debt.verifiedByUserId,
      verifiedAt: financialFieldsChanged ? null : debt.verifiedAt,
      rejectedByUserId: input.verificationStatus === 'rejected' ? debt.rejectedByUserId : debt.rejectedByUserId,
      rejectedAt: debt.rejectedAt,
      rejectionReason: debt.rejectionReason,
      disputeReason: debt.disputeReason,
      resolutionNote: debt.resolutionNote,
      suggestedChange: debt.suggestedChange,
      updatedAt: nowIso(),
    };
    await insertDebt(this.db, updated);
    if (financialFieldsChanged && debt.verificationStatus === 'verified') {
      await this.logActivity('debt', debt.id, 'verification_reset_financial_edit', null, {
        previousStatus: debt.verificationStatus,
        nextStatus: updated.verificationStatus,
      });
    } else if (input.status === 'archived' && debt.status !== 'archived') {
      await this.logActivity('debt', debt.id, 'debt_archived', null, {});
    } else if (input.status === 'settled' && debt.status !== 'settled') {
      await this.logActivity('debt', debt.id, 'debt_settled', null, {});
    } else {
      await this.logActivity('debt', debt.id, 'debt_edited', null, {
        financialFieldsChanged,
      });
    }
    return updated;
  }

  async createEvent(input: EventInput) {
    const timestamp = nowIso();
    const event: Event = {
      id: createId('event'),
      name: input.name.trim(),
      notes: cleanOptional(input.notes),
      defaultCurrency: input.defaultCurrency,
      tags: cleanTags(input.tags),
      status: input.status ?? 'active',
      archived: false,
      ignoredDuplicateKeys: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await insertEvent(this.db, event);
    await this.setEventMembers(event.id, input.memberIds ?? []);
    return event;
  }

  async updateEvent(
    event: Event,
    input: Partial<EventInput> & {
      archived?: boolean;
      ignoredDuplicateKeys?: string[];
    },
  ) {
    const updated: Event = {
      ...event,
      name: input.name?.trim() ?? event.name,
      notes: input.notes === undefined ? event.notes : cleanOptional(input.notes),
      defaultCurrency: input.defaultCurrency ?? event.defaultCurrency,
      tags: input.tags === undefined ? event.tags : cleanTags(input.tags),
      status: input.status ?? event.status,
      archived: input.archived ?? event.archived,
      ignoredDuplicateKeys: input.ignoredDuplicateKeys ?? event.ignoredDuplicateKeys,
      updatedAt: nowIso(),
    };
    await insertEvent(this.db, updated);
    if (input.memberIds) {
      await this.setEventMembers(event.id, input.memberIds);
    }
    return updated;
  }

  async setEventMembers(eventId: string, memberIds: string[]) {
    const current = await this.db.getAllAsync<{ member_id: string }>(
      `SELECT member_id FROM event_members WHERE event_id = ?`,
      [eventId],
    );
    const currentIds = new Set(current.map((row) => row.member_id));
    const nextIds = new Set(memberIds);
    const timestamp = nowIso();

    for (const memberId of currentIds) {
      if (!nextIds.has(memberId)) {
        await deleteEventMember(this.db, eventId, memberId);
      }
    }

    for (const memberId of nextIds) {
      const eventMember: EventMember = { eventId, memberId, createdAt: timestamp };
      await insertEventMember(this.db, eventMember);
    }
  }

  async createSharedExpense(input: SharedExpenseInput) {
    const timestamp = nowIso();
    const expense = withGeneratedObligations({
      id: createId('expense'),
      remoteId: null,
      eventId: input.eventId,
      payerId: input.payerId,
      amount: toAmount(input.amount),
      currency: input.currency,
      title: input.title.trim(),
      notes: cleanOptional(input.notes),
      expenseDate: input.expenseDate || todayIsoDate(),
      participantIds: cleanParticipants(input.participantIds),
      splitMethod: 'equal',
      tags: cleanTags(input.tags),
      status: input.status ?? 'active',
      verificationStatus: input.verificationStatus ?? 'local_only',
      visibility: 'private',
      syncStatus: 'local_only',
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await insertSharedExpense(this.db, expense);
    return expense;
  }

  async updateSharedExpense(expense: SharedExpense, input: Partial<SharedExpenseInput>) {
    const nextParticipantIds =
      input.participantIds === undefined ? expense.participantIds : cleanParticipants(input.participantIds);

    const financialFieldsChanged = [
      input.eventId !== undefined && input.eventId !== expense.eventId,
      input.payerId !== undefined && input.payerId !== expense.payerId,
      input.amount !== undefined && toAmount(input.amount) !== expense.amount,
      input.currency !== undefined && input.currency !== expense.currency,
      input.participantIds !== undefined && nextParticipantIds.join('|') !== expense.participantIds.join('|'),
    ].some(Boolean);

    const nextVerificationStatus =
      expense.verificationStatus === 'verified' && financialFieldsChanged
        ? 'pending'
        : input.verificationStatus ?? expense.verificationStatus;

    const updated = withGeneratedObligations({
      ...expense,
      eventId: input.eventId ?? expense.eventId,
      payerId: input.payerId ?? expense.payerId,
      amount: input.amount === undefined ? expense.amount : toAmount(input.amount),
      currency: input.currency ?? expense.currency,
      title: input.title?.trim() ?? expense.title,
      notes: input.notes === undefined ? expense.notes : cleanOptional(input.notes),
      expenseDate: input.expenseDate ?? expense.expenseDate,
      participantIds: nextParticipantIds,
      tags: input.tags === undefined ? expense.tags : cleanTags(input.tags),
      status: input.status ?? expense.status,
      verificationStatus: nextVerificationStatus,
      visibility: expense.visibility,
      syncStatus:
        financialFieldsChanged && expense.syncStatus === 'synced' ? 'pending_update' : expense.syncStatus,
      updatedAt: nowIso(),
    });
    await insertSharedExpense(this.db, updated);
    return updated;
  }

  async updateSettings(settings: Partial<AppSettings>) {
    for (const [key, value] of Object.entries(settings)) {
      await updateSetting(this.db, key as keyof AppSettings, String(value));
    }
  }

  async updateRate(currency: CurrencyCode, rateToSek: number) {
    await updateCurrencyRate(this.db, currency, rateToSek);
  }

  async upsertProfile(profile: UserProfile) {
    await insertProfile(this.db, profile);
    await this.logActivity('profile', profile.id, 'profile_updated', profile.id, {
      displayName: profile.displayName,
      baseCurrency: profile.baseCurrency,
    });
    return profile;
  }

  async sendMemberLinkRequest(input: LinkMemberInput) {
    const timestamp = nowIso();
    const linkRequest: LinkRequest = {
      id: createId('link'),
      remoteId: input.remoteId ?? null,
      requesterUserId: input.requesterUserId,
      targetUserId: cleanOptional(input.targetUserId),
      targetEmail: cleanOptional(input.targetEmail),
      targetPhone: cleanOptional(input.targetPhone),
      requesterMemberId: input.member.id,
      requesterLabel: input.member.displayName,
      status: 'pending',
      message: cleanOptional(input.message),
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: input.remoteId ? 'synced' : 'pending_upload',
    };
    await insertLinkRequest(this.db, linkRequest);
    await insertMember(this.db, {
      ...input.member,
      linkStatus: 'invite_pending',
      linkRequestId: linkRequest.id,
      syncStatus: linkRequest.syncStatus,
      updatedAt: timestamp,
    });
    await this.logActivity('link_request', linkRequest.id, 'member_link_request_sent', input.requesterUserId, {
      memberId: input.member.id,
      targetEmail: linkRequest.targetEmail,
      targetPhone: linkRequest.targetPhone,
    });
    return linkRequest;
  }

  async upsertLinkRequest(linkRequest: LinkRequest) {
    await insertLinkRequest(this.db, linkRequest);
    return linkRequest;
  }

  async respondToLinkRequest(
    linkRequest: LinkRequest,
    status: Extract<LinkRequest['status'], 'accepted' | 'rejected' | 'cancelled'>,
    actorUserId: string,
  ) {
    const timestamp = nowIso();
    const updatedRequest: LinkRequest = {
      ...linkRequest,
      status,
      targetUserId: status === 'accepted' ? actorUserId : linkRequest.targetUserId,
      updatedAt: timestamp,
      syncStatus: linkRequest.remoteId ? 'pending_update' : linkRequest.syncStatus,
    };
    await insertLinkRequest(this.db, updatedRequest);

    const localMember = await this.db.getFirstAsync<{ id: string }>(
      `SELECT id FROM members WHERE id = ?`,
      [linkRequest.requesterMemberId],
    );

    if (localMember) {
      const members = await loadSnapshot(this.db).then((snapshot) => snapshot.members);
      const member = members.find((item) => item.id === linkRequest.requesterMemberId);
      if (member) {
        await insertMember(this.db, {
          ...member,
          linkStatus: status === 'accepted' ? 'linked' : status === 'rejected' ? 'link_rejected' : 'unlinked',
          linkedUserId: status === 'accepted' ? actorUserId : member.linkedUserId,
          syncStatus: 'pending_update',
          updatedAt: timestamp,
        });
      }
    }

    await this.logActivity('link_request', linkRequest.id, `member_link_${status}`, actorUserId, {
      memberId: linkRequest.requesterMemberId,
    });
    return updatedRequest;
  }

  async unlinkMember(member: Member, actorUserId: string | null) {
    const timestamp = nowIso();
    const updated: Member = {
      ...member,
      linkedUserId: null,
      linkStatus: 'link_removed',
      linkedProfileDisplayName: null,
      linkedProfileEmail: null,
      linkedProfilePhone: null,
      syncStatus: member.syncStatus === 'synced' ? 'pending_update' : member.syncStatus,
      updatedAt: timestamp,
    };
    await insertMember(this.db, updated);
    await this.logActivity('member', member.id, 'member_unlinked', actorUserId, {});
    return updated;
  }

  async requestDebtVerification(input: DebtVerificationInput) {
    const timestamp = nowIso();
    const verification: DebtVerification = {
      id: createId('verify'),
      remoteId: input.remoteVerificationId ?? null,
      debtId: input.debt.id,
      remoteDebtId: input.remoteDebtId ?? input.debt.remoteId,
      requesterUserId: input.requesterUserId,
      responderUserId: input.responderUserId,
      status: 'pending',
      rejectionReason: null,
      suggestedChange: null,
      requestedAt: timestamp,
      respondedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: input.remoteVerificationId ? 'synced' : 'pending_upload',
    };
    const updatedDebt: Debt = {
      ...input.debt,
      remoteId: input.remoteDebtId ?? input.debt.remoteId,
      verificationRequestId: verification.id,
      visibility: 'shared_with_involved_member',
      syncStatus: input.remoteDebtId ? 'synced' : 'pending_upload',
      verificationStatus: 'pending',
      sharedNotes: cleanOptional(input.sharedNotes) ?? input.debt.sharedNotes ?? input.debt.notes,
      rejectedByUserId: null,
      rejectedAt: null,
      rejectionReason: null,
      disputeReason: null,
      resolutionNote: null,
      suggestedChange: null,
      updatedAt: timestamp,
    };

    await insertDebt(this.db, updatedDebt);
    await insertDebtVerification(this.db, verification);
    await this.logActivity('debt', input.debt.id, 'debt_verification_requested', input.requesterUserId, {
      responderUserId: input.responderUserId,
      verificationId: verification.id,
    });
    return { debt: updatedDebt, verification };
  }

  async upsertDebtVerification(verification: DebtVerification) {
    await insertDebtVerification(this.db, verification);
    return verification;
  }

  async upsertDebt(debt: Debt) {
    await insertDebt(this.db, debt);
    return debt;
  }

  async respondToDebtVerification(
    verification: DebtVerification,
    debt: Debt,
    status: Extract<VerificationStatus, 'verified' | 'rejected'>,
    actorUserId: string,
    rejectionReason?: string | null,
    suggestedChange?: SuggestedDebtChange | null,
  ) {
    const timestamp = nowIso();
    const updatedVerification: DebtVerification = {
      ...verification,
      status,
      rejectionReason: status === 'rejected' ? cleanOptional(rejectionReason) : null,
      suggestedChange: status === 'rejected' ? suggestedChange ?? null : null,
      respondedAt: timestamp,
      updatedAt: timestamp,
      syncStatus: verification.remoteId ? 'pending_update' : verification.syncStatus,
    };
    const updatedDebt: Debt = {
      ...debt,
      verificationStatus: status,
      syncStatus: debt.remoteId ? 'pending_update' : debt.syncStatus,
      verifiedByUserId: status === 'verified' ? actorUserId : null,
      verifiedAt: status === 'verified' ? timestamp : null,
      rejectedByUserId: status === 'rejected' ? actorUserId : null,
      rejectedAt: status === 'rejected' ? timestamp : null,
      rejectionReason: status === 'rejected' ? cleanOptional(rejectionReason) : null,
      suggestedChange: status === 'rejected' ? suggestedChange ?? null : null,
      updatedAt: timestamp,
    };

    await insertDebtVerification(this.db, updatedVerification);
    await insertDebt(this.db, updatedDebt);
    await this.logActivity('debt', debt.id, status === 'verified' ? 'debt_verified' : 'debt_rejected', actorUserId, {
      verificationId: verification.id,
      rejectionReason: updatedVerification.rejectionReason,
      suggestedChange: updatedVerification.suggestedChange,
    });
    return { debt: updatedDebt, verification: updatedVerification };
  }

  async markDebtDisputed(debt: Debt, actorUserId: string | null, disputeReason?: string | null) {
    const timestamp = nowIso();
    const updated: Debt = {
      ...debt,
      verificationStatus: 'disputed',
      disputeReason: cleanOptional(disputeReason),
      syncStatus: debt.remoteId ? 'pending_update' : debt.syncStatus,
      updatedAt: timestamp,
    };
    await insertDebt(this.db, updated);
    await this.logActivity('debt', debt.id, 'debt_marked_disputed', actorUserId, {
      disputeReason: updated.disputeReason,
    });
    return updated;
  }

  async markDebtResolved(debt: Debt, actorUserId: string | null, resolutionNote?: string | null) {
    const timestamp = nowIso();
    const updated: Debt = {
      ...debt,
      verificationStatus: 'resolved',
      resolutionNote: cleanOptional(resolutionNote),
      syncStatus: debt.remoteId ? 'pending_update' : debt.syncStatus,
      updatedAt: timestamp,
    };
    await insertDebt(this.db, updated);
    await this.logActivity('debt', debt.id, 'debt_resolved', actorUserId, {
      resolutionNote: updated.resolutionNote,
    });
    return updated;
  }

  async cancelDebtVerification(debt: Debt, verification: DebtVerification | undefined, actorUserId: string | null) {
    const timestamp = nowIso();
    const updatedDebt: Debt = {
      ...debt,
      verificationStatus: 'cancelled',
      syncStatus: debt.remoteId ? 'pending_update' : debt.syncStatus,
      updatedAt: timestamp,
    };
    await insertDebt(this.db, updatedDebt);
    if (verification) {
      await insertDebtVerification(this.db, {
        ...verification,
        status: 'cancelled',
        respondedAt: timestamp,
        updatedAt: timestamp,
        syncStatus: verification.remoteId ? 'pending_update' : verification.syncStatus,
      });
    }
    await this.logActivity('debt', debt.id, 'debt_verification_cancelled', actorUserId, {});
    return updatedDebt;
  }

  async logActivity(
    entityKind: ActivityTargetKind,
    entityId: string,
    action: string,
    actorUserId: string | null,
    metadata: Record<string, unknown>,
  ) {
    await insertActivityLog(this.db, {
      id: createId('activity'),
      entityKind,
      entityId,
      actorUserId,
      action,
      metadata,
      createdAt: nowIso(),
    });
  }
}

function cleanOptional(value: string | null | undefined) {
  const clean = value?.trim();
  return clean ? clean : null;
}

function cleanTags(tags: string[] | undefined) {
  return Array.from(new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean)));
}

function cleanParticipants(participantIds: ParticipantId[]) {
  return Array.from(new Set(participantIds));
}

function toAmount(value: number) {
  return Math.max(0, Math.round((Number(value) || 0) * 100) / 100);
}
