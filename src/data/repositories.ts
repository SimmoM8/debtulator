import type * as SQLite from 'expo-sqlite';

import {
  deleteEventMember,
  insertDebt,
  insertEvent,
  insertEventMember,
  insertMember,
  insertSharedExpense,
  loadSnapshot,
  resetDatabase,
  updateCurrencyRate,
  updateSetting,
} from '@/src/data/database';
import { withGeneratedObligations } from '@/src/services/splits';
import type {
  AppSettings,
  CurrencyCode,
  Debt,
  DebtStatus,
  Event,
  EventMember,
  EventStatus,
  Member,
  ParticipantId,
  SharedExpense,
  VerificationStatus,
} from '@/src/types/models';
import { createId, nowIso, todayIsoDate } from '@/src/utils/id';

type MemberInput = {
  displayName: string;
  notes?: string | null;
  email?: string | null;
  phone?: string | null;
  tags?: string[];
};

type DebtInput = {
  memberId: string;
  direction: Debt['direction'];
  amount: number;
  currency: CurrencyCode;
  title: string;
  notes?: string | null;
  debtDate?: string;
  dueDate?: string | null;
  tags?: string[];
  eventId?: string | null;
  status?: DebtStatus;
  verificationStatus?: VerificationStatus;
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
      direction: input.direction,
      amount: toAmount(input.amount),
      currency: input.currency,
      title: input.title.trim(),
      notes: cleanOptional(input.notes),
      debtDate: input.debtDate || todayIsoDate(),
      dueDate: cleanOptional(input.dueDate),
      tags: cleanTags(input.tags),
      eventId: input.eventId ?? null,
      status: input.status ?? 'active',
      verificationStatus: input.verificationStatus ?? 'local_only',
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
    ].some(Boolean);

    const nextVerificationStatus =
      debt.verificationStatus === 'verified' && financialFieldsChanged
        ? 'pending'
        : input.verificationStatus ?? debt.verificationStatus;

    const updated: Debt = {
      ...debt,
      memberId: input.memberId ?? debt.memberId,
      direction: input.direction ?? debt.direction,
      amount: input.amount === undefined ? debt.amount : toAmount(input.amount),
      currency: input.currency ?? debt.currency,
      title: input.title?.trim() ?? debt.title,
      notes: input.notes === undefined ? debt.notes : cleanOptional(input.notes),
      debtDate: input.debtDate ?? debt.debtDate,
      dueDate: input.dueDate === undefined ? debt.dueDate : cleanOptional(input.dueDate),
      tags: input.tags === undefined ? debt.tags : cleanTags(input.tags),
      eventId: input.eventId === undefined ? debt.eventId : input.eventId,
      status: input.status ?? debt.status,
      verificationStatus: nextVerificationStatus,
      updatedAt: nowIso(),
    };
    await insertDebt(this.db, updated);
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
