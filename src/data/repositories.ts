import type * as SQLite from 'expo-sqlite';

import {
  deleteEventMember,
  insertActivityLog,
  insertDebt,
  insertDebtVerification,
  insertEvent,
  insertEventActivityLog,
  insertEventDebt,
  insertEventDuplicateWarning,
  insertEventMember,
  insertEventMemberClaim,
  insertEventParticipant,
  insertEventInvite,
  insertEventVerificationResponse,
  insertLinkRequest,
  insertMember,
  insertProfile,
  insertSharedEventMember,
  insertSharedExpense,
  loadSnapshot,
  resetDatabase,
  updateCurrencyRate,
  updateSetting,
} from '@/src/data/database';
import { withGeneratedObligations } from '@/src/services/splits';
import {
  buildDuplicateWarning,
  duplicatePairKey,
  findSharedEventDuplicateWarningDrafts,
} from '@/src/services/eventDuplicates';
import type {
  AppSettings,
  ActivityTargetKind,
  CurrencyCode,
  Debt,
  DebtVerification,
  DebtStatus,
  Event,
  EventActivityLog,
  EventDebt,
  EventDuplicateWarning,
  EventInvite,
  EventMember,
  EventMemberClaim,
  EventParticipant,
  EventRole,
  EventStatus,
  EventVerificationResponse,
  LinkRequest,
  Member,
  MemberLinkStatus,
  ParticipantId,
  SharedEventMember,
  SharedExpense,
  SuggestedDebtChange,
  SyncStatus,
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
  allowedCurrencies?: CurrencyCode[];
  tags?: string[];
  status?: EventStatus;
  visibility?: Event['visibility'];
  ownerUserId?: string | null;
  ownerDisplayName?: string | null;
  ownerEmail?: string | null;
  remoteId?: string | null;
  syncStatus?: SyncStatus;
  memberIds?: string[];
};

type SharedExpenseInput = {
  eventId: string;
  creatorUserId?: string | null;
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
  visibility?: SharedExpense['visibility'];
  remoteId?: string | null;
  syncStatus?: SyncStatus;
};

type EventInviteInput = {
  eventId: string;
  remoteEventId?: string | null;
  inviterUserId: string;
  invitedUserId?: string | null;
  invitedEmail?: string | null;
  invitedPhone?: string | null;
  invitedDisplayName: string;
  offeredRole: Exclude<EventRole, 'owner'>;
  message?: string | null;
  remoteId?: string | null;
  syncStatus?: SyncStatus;
};

type SharedEventMemberInput = {
  eventId: string;
  remoteEventId?: string | null;
  type?: SharedEventMember['type'];
  linkedUserId?: string | null;
  displayName: string;
  alias?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  createdByUserId?: string | null;
  status?: SharedEventMember['status'];
  remoteId?: string | null;
  syncStatus?: SyncStatus;
};

type EventDebtInput = {
  eventId: string;
  remoteEventId?: string | null;
  creatorUserId?: string | null;
  debtorEventMemberId: string;
  creditorEventMemberId: string;
  amount: number;
  currency: CurrencyCode;
  title: string;
  notes?: string | null;
  debtDate?: string;
  tags?: string[];
  verificationStatus?: VerificationStatus;
  settlementStatus?: DebtStatus;
  status?: DebtStatus;
  remoteId?: string | null;
  syncStatus?: SyncStatus;
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
    const visibility = input.visibility ?? 'private';
    const event: Event = {
      id: createId('event'),
      localId: null,
      remoteId: input.remoteId ?? null,
      ownerUserId: cleanOptional(input.ownerUserId),
      name: input.name.trim(),
      notes: cleanOptional(input.notes),
      defaultCurrency: input.defaultCurrency,
      allowedCurrencies: input.allowedCurrencies?.length ? input.allowedCurrencies : [input.defaultCurrency],
      tags: cleanTags(input.tags),
      status: input.status ?? 'active',
      visibility,
      syncStatus: input.syncStatus ?? (visibility === 'shared' ? (input.remoteId ? 'synced' : 'pending_upload') : 'local_only'),
      archived: false,
      archivedAt: null,
      finalisedAt: null,
      lockedAt: null,
      ignoredDuplicateKeys: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await insertEvent(this.db, event);
    if (visibility === 'shared' && event.ownerUserId) {
      const participant: EventParticipant = {
        id: createId('event_participant'),
        remoteId: null,
        eventId: event.id,
        remoteEventId: event.remoteId,
        userId: event.ownerUserId,
        role: 'owner',
        status: 'active',
        joinedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
        syncStatus: event.syncStatus,
      };
      await insertEventParticipant(this.db, participant);
      await insertSharedEventMember(this.db, {
        id: createId('event_member'),
        remoteId: null,
        eventId: event.id,
        remoteEventId: event.remoteId,
        type: 'linked_user',
        linkedUserId: event.ownerUserId,
        displayName: cleanOptional(input.ownerDisplayName) ?? 'You',
        alias: 'You',
        email: cleanOptional(input.ownerEmail),
        phone: null,
        notes: null,
        createdByUserId: event.ownerUserId,
        status: 'active',
        mergedIntoEventMemberId: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        syncStatus: event.syncStatus,
      });
      await this.logEventActivity(event.id, 'event_created', event.ownerUserId, 'event', event.id, {
        name: event.name,
        visibility: event.visibility,
      });
    } else {
      await this.setEventMembers(event.id, input.memberIds ?? []);
    }
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
      allowedCurrencies: input.allowedCurrencies ?? event.allowedCurrencies,
      tags: input.tags === undefined ? event.tags : cleanTags(input.tags),
      status: input.status ?? event.status,
      visibility: input.visibility ?? event.visibility,
      remoteId: input.remoteId === undefined ? event.remoteId : cleanOptional(input.remoteId),
      ownerUserId: input.ownerUserId === undefined ? event.ownerUserId : cleanOptional(input.ownerUserId),
      syncStatus:
        input.syncStatus ??
        (event.syncStatus === 'synced' && hasEventUpdate(input) ? 'pending_update' : event.syncStatus),
      archived: input.archived ?? event.archived,
      archivedAt:
        input.archived === true && !event.archivedAt
          ? nowIso()
          : input.archived === false
            ? null
            : event.archivedAt,
      finalisedAt:
        input.status === 'finalising' && !event.finalisedAt
          ? nowIso()
          : input.status === 'active'
            ? null
            : event.finalisedAt,
      lockedAt:
        input.status === 'finalising' && !event.lockedAt
          ? nowIso()
          : input.status === 'active'
            ? null
            : event.lockedAt,
      ignoredDuplicateKeys: input.ignoredDuplicateKeys ?? event.ignoredDuplicateKeys,
      updatedAt: nowIso(),
    };
    await insertEvent(this.db, updated);
    if (event.visibility === 'private' && input.memberIds) {
      await this.setEventMembers(event.id, input.memberIds);
    }
    if (event.visibility === 'shared') {
      await this.logEventActivity(event.id, 'event_edited', input.ownerUserId ?? null, 'event', event.id, {
        status: updated.status,
        archived: updated.archived,
      });
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
      remoteId: input.remoteId ?? null,
      eventId: input.eventId,
      creatorUserId: cleanOptional(input.creatorUserId),
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
      visibility: input.visibility ?? 'private',
      syncStatus: input.syncStatus ?? (input.visibility === 'shared_event' ? (input.remoteId ? 'synced' : 'pending_upload') : 'local_only'),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await insertSharedExpense(this.db, expense);
    if (expense.visibility === 'shared_event') {
      await this.logEventActivity(expense.eventId, 'expense_added', expense.creatorUserId, 'shared_expense', expense.id, {
        amount: expense.amount,
        currency: expense.currency,
        title: expense.title,
      });
    }
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
      remoteId: input.remoteId === undefined ? expense.remoteId : cleanOptional(input.remoteId),
      eventId: input.eventId ?? expense.eventId,
      creatorUserId: input.creatorUserId === undefined ? expense.creatorUserId : cleanOptional(input.creatorUserId),
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
      visibility: input.visibility ?? expense.visibility,
      syncStatus:
        input.syncStatus ??
        (financialFieldsChanged && expense.syncStatus === 'synced' ? 'pending_update' : expense.syncStatus),
      updatedAt: nowIso(),
    });
    await insertSharedExpense(this.db, updated);
    if (updated.visibility === 'shared_event') {
      await this.logEventActivity(updated.eventId, 'expense_edited', updated.creatorUserId, 'shared_expense', updated.id, {
        financialFieldsChanged,
      });
    }
    return updated;
  }

  async createEventInvite(input: EventInviteInput) {
    const timestamp = nowIso();
    const invite: EventInvite = {
      id: createId('event_invite'),
      remoteId: input.remoteId ?? null,
      eventId: input.eventId,
      remoteEventId: input.remoteEventId ?? null,
      inviterUserId: input.inviterUserId,
      invitedUserId: cleanOptional(input.invitedUserId),
      invitedEmail: cleanOptional(input.invitedEmail),
      invitedPhone: cleanOptional(input.invitedPhone),
      invitedDisplayName: input.invitedDisplayName.trim(),
      offeredRole: input.offeredRole,
      status: 'pending',
      message: cleanOptional(input.message),
      createdAt: timestamp,
      updatedAt: timestamp,
      respondedAt: null,
      syncStatus: input.syncStatus ?? (input.remoteId ? 'synced' : 'pending_upload'),
    };
    await insertEventInvite(this.db, invite);
    await this.logEventActivity(invite.eventId, 'invite_sent', invite.inviterUserId, 'event_invite', invite.id, {
      invitedDisplayName: invite.invitedDisplayName,
      invitedEmail: invite.invitedEmail,
      offeredRole: invite.offeredRole,
    });
    return invite;
  }

  async respondToEventInvite(
    invite: EventInvite,
    status: Extract<EventInvite['status'], 'accepted' | 'rejected' | 'cancelled'>,
    actorUserId: string,
    actorDisplayName?: string | null,
    actorEmail?: string | null,
  ) {
    const timestamp = nowIso();
    const updatedInvite: EventInvite = {
      ...invite,
      status,
      invitedUserId: status === 'accepted' ? actorUserId : invite.invitedUserId,
      respondedAt: timestamp,
      updatedAt: timestamp,
      syncStatus: invite.remoteId ? 'pending_update' : invite.syncStatus,
    };
    await insertEventInvite(this.db, updatedInvite);

    if (status === 'accepted') {
      const snapshot = await loadSnapshot(this.db);
      const event = snapshot.events.find((item) => item.id === invite.eventId);
      const existingParticipant = snapshot.eventParticipants.find(
        (participant) => participant.eventId === invite.eventId && participant.userId === actorUserId,
      );
      await insertEventParticipant(this.db, {
        id: existingParticipant?.id ?? createId('event_participant'),
        remoteId: existingParticipant?.remoteId ?? null,
        eventId: invite.eventId,
        remoteEventId: invite.remoteEventId,
        userId: actorUserId,
        role: invite.offeredRole,
        status: 'active',
        joinedAt: existingParticipant?.joinedAt ?? timestamp,
        createdAt: existingParticipant?.createdAt ?? timestamp,
        updatedAt: timestamp,
        syncStatus: invite.remoteId ? 'pending_update' : 'pending_upload',
      });

      const existingMember = snapshot.sharedEventMembers.find(
        (member) => member.eventId === invite.eventId && member.linkedUserId === actorUserId && member.status !== 'merged',
      );
      if (!existingMember) {
        await insertSharedEventMember(this.db, {
          id: createId('event_member'),
          remoteId: null,
          eventId: invite.eventId,
          remoteEventId: event?.remoteId ?? invite.remoteEventId,
          type: 'linked_user',
          linkedUserId: actorUserId,
          displayName: cleanOptional(actorDisplayName) ?? invite.invitedDisplayName,
          alias: null,
          email: cleanOptional(actorEmail) ?? invite.invitedEmail,
          phone: invite.invitedPhone,
          notes: null,
          createdByUserId: invite.inviterUserId,
          status: 'active',
          mergedIntoEventMemberId: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          syncStatus: 'pending_upload',
        });
      }
    }

    await this.logEventActivity(
      invite.eventId,
      status === 'accepted' ? 'invite_accepted' : status === 'rejected' ? 'invite_rejected' : 'invite_cancelled',
      actorUserId,
      'event_invite',
      invite.id,
      { invitedDisplayName: invite.invitedDisplayName },
    );
    return updatedInvite;
  }

  async createSharedEventMember(input: SharedEventMemberInput) {
    const snapshot = await loadSnapshot(this.db);
    if (input.linkedUserId) {
      const duplicateLinked = snapshot.sharedEventMembers.find(
        (member) =>
          member.eventId === input.eventId &&
          member.linkedUserId === input.linkedUserId &&
          member.status !== 'merged' &&
          member.status !== 'archived',
      );
      if (duplicateLinked) {
        throw new Error('This linked user is already an event member.');
      }
    }

    const timestamp = nowIso();
    const member: SharedEventMember = {
      id: createId('event_member'),
      remoteId: input.remoteId ?? null,
      eventId: input.eventId,
      remoteEventId: input.remoteEventId ?? null,
      type: input.type ?? (input.linkedUserId ? 'linked_user' : 'unlinked_placeholder'),
      linkedUserId: cleanOptional(input.linkedUserId),
      displayName: input.displayName.trim(),
      alias: cleanOptional(input.alias),
      email: cleanOptional(input.email),
      phone: cleanOptional(input.phone),
      notes: cleanOptional(input.notes),
      createdByUserId: cleanOptional(input.createdByUserId),
      status: input.status ?? 'active',
      mergedIntoEventMemberId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: input.syncStatus ?? (input.remoteId ? 'synced' : 'pending_upload'),
    };
    await insertSharedEventMember(this.db, member);
    await this.reconcileEventDuplicateWarnings(member.eventId);
    await this.logEventActivity(member.eventId, 'event_member_added', member.createdByUserId, 'event_member', member.id, {
      displayName: member.displayName,
      type: member.type,
    });
    return member;
  }

  async updateSharedEventMember(member: SharedEventMember, input: Partial<SharedEventMemberInput> & { archived?: boolean }) {
    const timestamp = nowIso();
    const updated: SharedEventMember = {
      ...member,
      type: input.type ?? member.type,
      linkedUserId: input.linkedUserId === undefined ? member.linkedUserId : cleanOptional(input.linkedUserId),
      displayName: input.displayName?.trim() ?? member.displayName,
      alias: input.alias === undefined ? member.alias : cleanOptional(input.alias),
      email: input.email === undefined ? member.email : cleanOptional(input.email),
      phone: input.phone === undefined ? member.phone : cleanOptional(input.phone),
      notes: input.notes === undefined ? member.notes : cleanOptional(input.notes),
      status: input.archived ? 'archived' : input.status ?? member.status,
      syncStatus: input.syncStatus ?? (member.syncStatus === 'synced' ? 'pending_update' : member.syncStatus),
      updatedAt: timestamp,
    };
    await insertSharedEventMember(this.db, updated);
    await this.reconcileEventDuplicateWarnings(updated.eventId);
    await this.logEventActivity(updated.eventId, 'event_member_edited', input.createdByUserId ?? null, 'event_member', updated.id, {
      displayName: updated.displayName,
      status: updated.status,
    });
    return updated;
  }

  async createEventMemberClaim(member: SharedEventMember, claimantUserId: string, message?: string | null, remoteId?: string | null) {
    const timestamp = nowIso();
    const claim: EventMemberClaim = {
      id: createId('event_claim'),
      remoteId: remoteId ?? null,
      eventId: member.eventId,
      remoteEventId: member.remoteEventId,
      eventMemberId: member.id,
      remoteEventMemberId: member.remoteId,
      claimantUserId,
      status: 'pending',
      message: cleanOptional(message),
      respondedByUserId: null,
      respondedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: remoteId ? 'synced' : 'pending_upload',
    };
    await insertEventMemberClaim(this.db, claim);
    await insertSharedEventMember(this.db, {
      ...member,
      status: 'claim_pending',
      updatedAt: timestamp,
      syncStatus: member.syncStatus === 'synced' ? 'pending_update' : member.syncStatus,
    });
    await this.logEventActivity(member.eventId, 'unlinked_member_claim_requested', claimantUserId, 'event_member_claim', claim.id, {
      eventMemberId: member.id,
      displayName: member.displayName,
    });
    return claim;
  }

  async respondToEventMemberClaim(
    claim: EventMemberClaim,
    member: SharedEventMember,
    status: Extract<EventMemberClaim['status'], 'approved' | 'rejected' | 'cancelled'>,
    actorUserId: string,
  ) {
    const timestamp = nowIso();
    const snapshot = await loadSnapshot(this.db);
    if (status === 'approved') {
      const alreadyLinked = snapshot.sharedEventMembers.find(
        (item) =>
          item.eventId === claim.eventId &&
          item.linkedUserId === claim.claimantUserId &&
          item.id !== member.id &&
          item.status !== 'merged',
      );
      if (alreadyLinked) {
        throw new Error('This user is already linked to another member in this event.');
      }
    }

    const updatedClaim: EventMemberClaim = {
      ...claim,
      status,
      respondedByUserId: actorUserId,
      respondedAt: timestamp,
      updatedAt: timestamp,
      syncStatus: claim.remoteId ? 'pending_update' : claim.syncStatus,
    };
    await insertEventMemberClaim(this.db, updatedClaim);

    if (status === 'approved') {
      await insertSharedEventMember(this.db, {
        ...member,
        type: 'linked_user',
        linkedUserId: claim.claimantUserId,
        status: 'active',
        updatedAt: timestamp,
        syncStatus: member.remoteId ? 'pending_update' : member.syncStatus,
      });
    } else if (member.status === 'claim_pending') {
      await insertSharedEventMember(this.db, {
        ...member,
        status: 'active',
        updatedAt: timestamp,
        syncStatus: member.remoteId ? 'pending_update' : member.syncStatus,
      });
    }

    await this.logEventActivity(
      claim.eventId,
      status === 'approved' ? 'claim_approved' : status === 'rejected' ? 'claim_rejected' : 'claim_cancelled',
      actorUserId,
      'event_member_claim',
      claim.id,
      { eventMemberId: claim.eventMemberId, claimantUserId: claim.claimantUserId },
    );
    return updatedClaim;
  }

  async ignoreEventDuplicateWarning(warning: EventDuplicateWarning, actorUserId: string) {
    const timestamp = nowIso();
    const updated: EventDuplicateWarning = {
      ...warning,
      status: 'ignored',
      ignoredByUserId: actorUserId,
      updatedAt: timestamp,
      syncStatus: warning.remoteId ? 'pending_update' : warning.syncStatus,
    };
    await insertEventDuplicateWarning(this.db, updated);
    await this.logEventActivity(warning.eventId, 'duplicate_warning_ignored', actorUserId, 'event_duplicate_warning', warning.id, {
      eventMemberIdA: warning.eventMemberIdA,
      eventMemberIdB: warning.eventMemberIdB,
    });
    return updated;
  }

  async mergeSharedEventMembers(source: SharedEventMember, target: SharedEventMember, actorUserId: string) {
    if (source.type !== 'unlinked_placeholder' || target.type !== 'unlinked_placeholder') {
      throw new Error('Only unlinked event members can be merged.');
    }
    if (source.eventId !== target.eventId) {
      throw new Error('Members must belong to the same event.');
    }

    const timestamp = nowIso();
    const snapshot = await loadSnapshot(this.db);
    for (const expense of snapshot.sharedExpenses.filter((item) => item.eventId === source.eventId)) {
      const replacedParticipants = expense.participantIds.map((id) => (id === source.id ? target.id : id));
      const nextParticipantIds = Array.from(new Set(replacedParticipants));
      const updatedExpense = withGeneratedObligations({
        ...expense,
        payerId: expense.payerId === source.id ? target.id : expense.payerId,
        participantIds: nextParticipantIds,
        syncStatus: expense.syncStatus === 'synced' ? 'pending_update' : expense.syncStatus,
        updatedAt: timestamp,
      });
      await insertSharedExpense(this.db, updatedExpense);
    }

    for (const debt of snapshot.eventDebts.filter((item) => item.eventId === source.eventId)) {
      await insertEventDebt(this.db, {
        ...debt,
        debtorEventMemberId: debt.debtorEventMemberId === source.id ? target.id : debt.debtorEventMemberId,
        creditorEventMemberId: debt.creditorEventMemberId === source.id ? target.id : debt.creditorEventMemberId,
        syncStatus: debt.syncStatus === 'synced' ? 'pending_update' : debt.syncStatus,
        updatedAt: timestamp,
      });
    }

    await insertSharedEventMember(this.db, {
      ...source,
      status: 'merged',
      mergedIntoEventMemberId: target.id,
      updatedAt: timestamp,
      syncStatus: source.remoteId ? 'pending_update' : source.syncStatus,
    });

    for (const warning of snapshot.eventDuplicateWarnings.filter(
      (item) =>
        item.eventId === source.eventId &&
        [item.eventMemberIdA, item.eventMemberIdB].includes(source.id) &&
        [item.eventMemberIdA, item.eventMemberIdB].includes(target.id),
    )) {
      await insertEventDuplicateWarning(this.db, {
        ...warning,
        status: 'resolved',
        updatedAt: timestamp,
        syncStatus: warning.remoteId ? 'pending_update' : warning.syncStatus,
      });
    }

    await this.reconcileEventDuplicateWarnings(source.eventId);
    await this.logEventActivity(source.eventId, 'members_merged', actorUserId, 'event_member', target.id, {
      sourceEventMemberId: source.id,
      targetEventMemberId: target.id,
      sourceDisplayName: source.displayName,
      targetDisplayName: target.displayName,
    });
    return { sourceId: source.id, targetId: target.id };
  }

  async createEventDebt(input: EventDebtInput) {
    const timestamp = nowIso();
    const debt: EventDebt = {
      id: createId('event_debt'),
      remoteId: input.remoteId ?? null,
      eventId: input.eventId,
      remoteEventId: input.remoteEventId ?? null,
      creatorUserId: cleanOptional(input.creatorUserId),
      debtorEventMemberId: input.debtorEventMemberId,
      creditorEventMemberId: input.creditorEventMemberId,
      amount: toAmount(input.amount),
      currency: input.currency,
      title: input.title.trim(),
      notes: cleanOptional(input.notes),
      debtDate: input.debtDate || todayIsoDate(),
      tags: cleanTags(input.tags),
      verificationStatus: input.verificationStatus ?? 'pending',
      settlementStatus: input.settlementStatus ?? 'active',
      status: input.status ?? 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null,
      syncStatus: input.syncStatus ?? (input.remoteId ? 'synced' : 'pending_upload'),
    };
    await insertEventDebt(this.db, debt);
    await this.logEventActivity(debt.eventId, 'simple_debt_added', debt.creatorUserId, 'event_debt', debt.id, {
      amount: debt.amount,
      currency: debt.currency,
      title: debt.title,
    });
    return debt;
  }

  async updateEventDebt(debt: EventDebt, input: Partial<EventDebtInput>) {
    const timestamp = nowIso();
    const updated: EventDebt = {
      ...debt,
      remoteId: input.remoteId === undefined ? debt.remoteId : cleanOptional(input.remoteId),
      creatorUserId: input.creatorUserId === undefined ? debt.creatorUserId : cleanOptional(input.creatorUserId),
      debtorEventMemberId: input.debtorEventMemberId ?? debt.debtorEventMemberId,
      creditorEventMemberId: input.creditorEventMemberId ?? debt.creditorEventMemberId,
      amount: input.amount === undefined ? debt.amount : toAmount(input.amount),
      currency: input.currency ?? debt.currency,
      title: input.title?.trim() ?? debt.title,
      notes: input.notes === undefined ? debt.notes : cleanOptional(input.notes),
      debtDate: input.debtDate ?? debt.debtDate,
      tags: input.tags === undefined ? debt.tags : cleanTags(input.tags),
      verificationStatus: input.verificationStatus ?? debt.verificationStatus,
      settlementStatus: input.settlementStatus ?? debt.settlementStatus,
      status: input.status ?? debt.status,
      archivedAt: input.status === 'archived' && !debt.archivedAt ? timestamp : debt.archivedAt,
      updatedAt: timestamp,
      syncStatus: input.syncStatus ?? (debt.syncStatus === 'synced' ? 'pending_update' : debt.syncStatus),
    };
    await insertEventDebt(this.db, updated);
    await this.logEventActivity(updated.eventId, 'simple_debt_edited', updated.creatorUserId, 'event_debt', updated.id, {
      status: updated.status,
      verificationStatus: updated.verificationStatus,
    });
    return updated;
  }

  async respondToEventVerification(input: {
    eventId: string;
    targetType: EventVerificationResponse['targetType'];
    targetId: string;
    eventMemberId: string;
    linkedUserId: string;
    status: Extract<VerificationStatus, 'verified' | 'rejected'>;
    rejectionReason?: string | null;
  }) {
    const timestamp = nowIso();
    const snapshot = await loadSnapshot(this.db);
    const existing = snapshot.eventVerificationResponses.find(
      (response) =>
        response.eventId === input.eventId &&
        response.targetType === input.targetType &&
        response.targetId === input.targetId &&
        response.eventMemberId === input.eventMemberId,
    );
    const response: EventVerificationResponse = {
      id: existing?.id ?? createId('event_verify'),
      remoteId: existing?.remoteId ?? null,
      eventId: input.eventId,
      remoteEventId: existing?.remoteEventId ?? null,
      targetType: input.targetType,
      targetId: input.targetId,
      remoteTargetId: existing?.remoteTargetId ?? null,
      eventMemberId: input.eventMemberId,
      linkedUserId: input.linkedUserId,
      responseStatus: input.status,
      rejectionReason: input.status === 'rejected' ? cleanOptional(input.rejectionReason) : null,
      respondedAt: timestamp,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
      syncStatus: existing?.remoteId ? 'pending_update' : existing?.syncStatus ?? 'pending_upload',
    };
    await insertEventVerificationResponse(this.db, response);
    await this.deriveEventTargetVerification(input.eventId, input.targetType, input.targetId);
    await this.logEventActivity(
      input.eventId,
      input.status === 'verified' ? 'expense_verified' : 'expense_rejected',
      input.linkedUserId,
      input.targetType === 'debt' ? 'event_debt' : 'shared_expense',
      input.targetId,
      { eventMemberId: input.eventMemberId, rejectionReason: response.rejectionReason },
    );
    return response;
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

  async upsertSharedExpense(expense: SharedExpense) {
    await insertSharedExpense(this.db, expense);
    return expense;
  }

  async upsertEvent(event: Event) {
    await insertEvent(this.db, event);
    return event;
  }

  async upsertEventParticipant(participant: EventParticipant) {
    await insertEventParticipant(this.db, participant);
    return participant;
  }

  async upsertEventInvite(invite: EventInvite) {
    await insertEventInvite(this.db, invite);
    return invite;
  }

  async upsertSharedEventMember(member: SharedEventMember) {
    await insertSharedEventMember(this.db, member);
    return member;
  }

  async upsertEventMemberClaim(claim: EventMemberClaim) {
    await insertEventMemberClaim(this.db, claim);
    return claim;
  }

  async upsertEventDuplicateWarning(warning: EventDuplicateWarning) {
    await insertEventDuplicateWarning(this.db, warning);
    return warning;
  }

  async upsertEventDebt(debt: EventDebt) {
    await insertEventDebt(this.db, debt);
    return debt;
  }

  async upsertEventVerificationResponse(response: EventVerificationResponse) {
    await insertEventVerificationResponse(this.db, response);
    return response;
  }

  async upsertEventActivityLog(activity: EventActivityLog) {
    await insertEventActivityLog(this.db, activity);
    return activity;
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

  async logEventActivity(
    eventId: string,
    action: string,
    actorUserId: string | null,
    targetType: string,
    targetId: string | null,
    metadata: Record<string, unknown>,
  ) {
    const snapshot = await loadSnapshot(this.db);
    const event = snapshot.events.find((item) => item.id === eventId);
    await insertEventActivityLog(this.db, {
      id: createId('event_activity'),
      remoteId: null,
      eventId,
      remoteEventId: event?.remoteId ?? null,
      actorUserId,
      action,
      targetType,
      targetId,
      metadata,
      createdAt: nowIso(),
      syncStatus: event?.syncStatus === 'synced' ? 'pending_upload' : event?.syncStatus ?? 'local_only',
    });
  }

  private async reconcileEventDuplicateWarnings(eventId: string) {
    const snapshot = await loadSnapshot(this.db);
    const drafts = findSharedEventDuplicateWarningDrafts(eventId, snapshot.sharedEventMembers);
    const existingByPair = new Map(
      snapshot.eventDuplicateWarnings.map((warning) => [
        duplicatePairKey({
          eventId: warning.eventId,
          eventMemberIdA: warning.eventMemberIdA,
          eventMemberIdB: warning.eventMemberIdB,
          reason: warning.reason,
        }),
        warning,
      ]),
    );

    for (const draft of drafts) {
      const key = duplicatePairKey(draft);
      const existing = existingByPair.get(key);
      if (existing?.status === 'ignored' || existing?.status === 'resolved') {
        continue;
      }
      await insertEventDuplicateWarning(this.db, buildDuplicateWarning(draft, existing));
    }
  }

  private async deriveEventTargetVerification(
    eventId: string,
    targetType: EventVerificationResponse['targetType'],
    targetId: string,
  ) {
    const snapshot = await loadSnapshot(this.db);
    const responses = snapshot.eventVerificationResponses.filter(
      (response) => response.eventId === eventId && response.targetType === targetType && response.targetId === targetId,
    );
    const responseStatuses = responses.map((response) => response.responseStatus);
    const nextStatus: VerificationStatus =
      responseStatuses.includes('rejected')
        ? 'rejected'
        : responseStatuses.includes('disputed')
          ? 'disputed'
          : responseStatuses.includes('verified')
            ? 'partially_verified'
            : 'pending';

    if (targetType === 'expense') {
      const expense = snapshot.sharedExpenses.find((item) => item.id === targetId);
      if (expense) {
        await insertSharedExpense(this.db, {
          ...expense,
          verificationStatus: nextStatus,
          updatedAt: nowIso(),
          syncStatus: expense.syncStatus === 'synced' ? 'pending_update' : expense.syncStatus,
        });
      }
    } else if (targetType === 'debt') {
      const debt = snapshot.eventDebts.find((item) => item.id === targetId);
      if (debt) {
        await insertEventDebt(this.db, {
          ...debt,
          verificationStatus: nextStatus,
          updatedAt: nowIso(),
          syncStatus: debt.syncStatus === 'synced' ? 'pending_update' : debt.syncStatus,
        });
      }
    }
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

function hasEventUpdate(input: Partial<EventInput> & { archived?: boolean; ignoredDuplicateKeys?: string[] }) {
  return [
    input.name,
    input.notes,
    input.defaultCurrency,
    input.allowedCurrencies,
    input.tags,
    input.status,
    input.visibility,
    input.archived,
    input.ignoredDuplicateKeys,
  ].some((value) => value !== undefined);
}
