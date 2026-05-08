import type { DatabaseSnapshot } from '@/src/data/database';
import { supabase } from '@/src/services/supabase';
import {
  mapRemoteActivityToLocal,
  mapRemoteAttachmentToLocal,
  mapRemoteCommentToLocal,
  mapRemoteDuplicateWarningToLocal,
  mapRemoteEventClaimToLocal,
  mapRemoteEventDebtToLocal,
  mapRemoteEventInviteToLocal,
  mapRemoteEventMemberToLocal,
  mapRemoteEventParticipantToLocal,
  mapRemoteEventToLocal,
  mapRemoteEventVerificationToLocal,
  mapRemoteExpenseToLocal,
  mapRemotePaymentToLocal,
  mapRemoteSettlementLineToLocal,
  mapRemoteSettlementToLocal,
  SyncMappingError,
} from '@/src/services/sync/mappers';
import type {
  Attachment,
  Comment,
  Event,
  EventActivityLog,
  EventDebt,
  EventDuplicateWarning,
  EventInvite,
  EventMemberClaim,
  EventParticipant,
  EventVerificationResponse,
  Payment,
  Settlement,
  SettlementLine,
  SharedEventMember,
  SharedExpense,
} from '@/src/types/models';

export type RemotePullStore = DatabaseSnapshot & {
  upsertEvent: (event: Event) => Promise<Event>;
  upsertEventParticipant: (participant: EventParticipant) => Promise<EventParticipant>;
  upsertEventInvite: (invite: EventInvite) => Promise<EventInvite>;
  upsertSharedEventMember: (member: SharedEventMember) => Promise<SharedEventMember>;
  upsertEventMemberClaim: (claim: EventMemberClaim) => Promise<EventMemberClaim>;
  upsertEventDuplicateWarning: (warning: EventDuplicateWarning) => Promise<EventDuplicateWarning>;
  upsertSharedExpense: (expense: SharedExpense) => Promise<SharedExpense>;
  upsertEventDebt: (debt: EventDebt) => Promise<EventDebt>;
  upsertEventVerificationResponse: (response: EventVerificationResponse) => Promise<EventVerificationResponse>;
  upsertEventActivityLog: (activity: EventActivityLog) => Promise<EventActivityLog>;
  upsertPayment: (payment: Payment) => Promise<Payment>;
  upsertSettlement: (settlement: Settlement) => Promise<Settlement>;
  upsertSettlementLine: (line: SettlementLine) => Promise<SettlementLine>;
  upsertAttachment: (attachment: Attachment) => Promise<Attachment>;
};

export type RemotePullResult = {
  pulledCount: number;
  eventIds: string[];
  mappingErrors: SyncMappingError[];
};

export async function pullRemoteData(input: {
  store: RemotePullStore & {
    createComment?: (comment: never) => Promise<Comment>;
    upsertComment?: (comment: Comment) => Promise<Comment>;
  };
  userId: string;
  email?: string | null;
}): Promise<RemotePullResult> {
  if (!supabase) {
    return { pulledCount: 0, eventIds: [], mappingErrors: [] };
  }

  let snapshot = cloneSnapshot(input.store);
  let pulledCount = 0;
  const mappingErrors: SyncMappingError[] = [];

  const inviteClause = input.email ? `,invited_email.eq.${input.email}` : '';
  const { data: invites, error: inviteError } = await supabase
    .from('event_invites')
    .select('*')
    .or(`invited_user_id.eq.${input.userId},inviter_user_id.eq.${input.userId}${inviteClause}`);
  if (inviteError) {
    throw inviteError;
  }

  const { data: participants, error: participantError } = await supabase
    .from('event_participants')
    .select('*')
    .eq('user_id', input.userId);
  if (participantError) {
    throw participantError;
  }

  const remoteEventIds = Array.from(
    new Set([
      ...(participants ?? []).map((row) => row.event_id as string),
      ...(invites ?? []).map((row) => row.event_id as string),
    ]),
  );

  if (remoteEventIds.length === 0) {
    return { pulledCount: 0, eventIds: [], mappingErrors: [] };
  }

  const [
    eventsResult,
    allParticipantsResult,
    membersResult,
    expensesResult,
    splitsResult,
    payersResult,
    debtsResult,
    claimsResult,
    verificationsResult,
    warningsResult,
    paymentsResult,
    settlementsResult,
    commentsResult,
    attachmentsResult,
    activityResult,
  ] = await Promise.all([
    supabase.from('events').select('*').in('id', remoteEventIds),
    supabase.from('event_participants').select('*').in('event_id', remoteEventIds),
    supabase.from('event_members').select('*').in('event_id', remoteEventIds),
    supabase.from('event_expenses').select('*').in('event_id', remoteEventIds),
    supabase.from('event_expense_splits').select('*, event_expenses!inner(event_id)').in('event_expenses.event_id', remoteEventIds),
    supabase.from('expense_payers').select('*, event_expenses!inner(event_id)').in('event_expenses.event_id', remoteEventIds),
    supabase.from('event_debts').select('*').in('event_id', remoteEventIds),
    supabase.from('event_member_claims').select('*').in('event_id', remoteEventIds),
    supabase.from('event_verification_responses').select('*').in('event_id', remoteEventIds),
    supabase.from('event_duplicate_warnings').select('*').in('event_id', remoteEventIds),
    supabase.from('payments').select('*').in('event_id', remoteEventIds),
    supabase.from('settlements').select('*').in('event_id', remoteEventIds),
    supabase.from('comments').select('*').in('event_id', remoteEventIds),
    supabase.from('attachments').select('*').in('event_id', remoteEventIds),
    supabase.from('event_activity_logs').select('*').in('event_id', remoteEventIds).order('created_at', { ascending: false }),
  ]);

  for (const result of [
    eventsResult,
    allParticipantsResult,
    membersResult,
    expensesResult,
    splitsResult,
    payersResult,
    debtsResult,
    claimsResult,
    verificationsResult,
    warningsResult,
    paymentsResult,
    settlementsResult,
    commentsResult,
    attachmentsResult,
    activityResult,
  ]) {
    if (result.error) {
      throw result.error;
    }
  }

  for (const row of eventsResult.data ?? []) {
    const event = mapRemoteEventToLocal(row, snapshot);
    await input.store.upsertEvent(event);
    snapshot = replace(snapshot, 'events', event);
    pulledCount += 1;
  }

  for (const row of allParticipantsResult.data ?? []) {
    try {
      const participant = mapRemoteEventParticipantToLocal(row, snapshot);
      await input.store.upsertEventParticipant(participant);
      snapshot = replace(snapshot, 'eventParticipants', participant);
      pulledCount += 1;
    } catch (error) {
      collectMappingError(error, mappingErrors);
    }
  }

  for (const row of invites ?? []) {
    try {
      const invite = mapRemoteEventInviteToLocal(row, snapshot);
      await input.store.upsertEventInvite(invite);
      snapshot = replace(snapshot, 'eventInvites', invite);
      pulledCount += 1;
    } catch (error) {
      collectMappingError(error, mappingErrors);
    }
  }

  for (const row of membersResult.data ?? []) {
    try {
      const member = mapRemoteEventMemberToLocal(row, snapshot);
      await input.store.upsertSharedEventMember(member);
      snapshot = replace(snapshot, 'sharedEventMembers', member);
      pulledCount += 1;
    } catch (error) {
      collectMappingError(error, mappingErrors);
    }
  }

  for (const row of expensesResult.data ?? []) {
    try {
      const expenseSplits = (splitsResult.data ?? []).filter((split) => split.expense_id === row.id);
      const expensePayers = (payersResult.data ?? []).filter((payer) => payer.expense_id === row.id);
      const expense = mapRemoteExpenseToLocal(row, expenseSplits, expensePayers, snapshot);
      await input.store.upsertSharedExpense(expense);
      snapshot = replace(snapshot, 'sharedExpenses', expense);
      pulledCount += 1;
    } catch (error) {
      collectMappingError(error, mappingErrors);
    }
  }

  for (const row of debtsResult.data ?? []) {
    try {
      const debt = mapRemoteEventDebtToLocal(row, snapshot);
      await input.store.upsertEventDebt(debt);
      snapshot = replace(snapshot, 'eventDebts', debt);
      pulledCount += 1;
    } catch (error) {
      collectMappingError(error, mappingErrors);
    }
  }

  for (const row of claimsResult.data ?? []) {
    try {
      const claim = mapRemoteEventClaimToLocal(row, snapshot);
      await input.store.upsertEventMemberClaim(claim);
      snapshot = replace(snapshot, 'eventMemberClaims', claim);
      pulledCount += 1;
    } catch (error) {
      collectMappingError(error, mappingErrors);
    }
  }

  for (const row of warningsResult.data ?? []) {
    try {
      const warning = mapRemoteDuplicateWarningToLocal(row, snapshot);
      await input.store.upsertEventDuplicateWarning(warning);
      snapshot = replace(snapshot, 'eventDuplicateWarnings', warning);
      pulledCount += 1;
    } catch (error) {
      collectMappingError(error, mappingErrors);
    }
  }

  for (const row of verificationsResult.data ?? []) {
    try {
      const response = mapRemoteEventVerificationToLocal(row, snapshot);
      await input.store.upsertEventVerificationResponse(response);
      snapshot = replace(snapshot, 'eventVerificationResponses', response);
      pulledCount += 1;
    } catch (error) {
      collectMappingError(error, mappingErrors);
    }
  }

  for (const row of paymentsResult.data ?? []) {
    try {
      const payment = mapRemotePaymentToLocal(row, snapshot);
      await input.store.upsertPayment(payment);
      snapshot = replace(snapshot, 'payments', payment);
      pulledCount += 1;
    } catch (error) {
      collectMappingError(error, mappingErrors);
    }
  }

  for (const row of settlementsResult.data ?? []) {
    try {
      const settlement = mapRemoteSettlementToLocal(row, snapshot);
      await input.store.upsertSettlement(settlement);
      snapshot = replace(snapshot, 'settlements', settlement);
      pulledCount += 1;
    } catch (error) {
      collectMappingError(error, mappingErrors);
    }
  }

  const remoteSettlementIds = (settlementsResult.data ?? []).map((settlement) => settlement.id);
  if (remoteSettlementIds.length > 0) {
    const { data: lines, error } = await supabase.from('settlement_lines').select('*').in('settlement_id', remoteSettlementIds);
    if (error) {
      throw error;
    }
    for (const row of lines ?? []) {
      try {
        const line = mapRemoteSettlementLineToLocal(row, snapshot);
        await input.store.upsertSettlementLine(line);
        snapshot = replace(snapshot, 'settlementLines', line);
        pulledCount += 1;
      } catch (lineError) {
        collectMappingError(lineError, mappingErrors);
      }
    }
  }

  for (const row of commentsResult.data ?? []) {
    if (!input.store.upsertComment) {
      continue;
    }
    try {
      const comment = mapRemoteCommentToLocal(row, snapshot);
      await input.store.upsertComment(comment);
      snapshot = replace(snapshot, 'comments', comment);
      pulledCount += 1;
    } catch (error) {
      collectMappingError(error, mappingErrors);
    }
  }

  for (const row of attachmentsResult.data ?? []) {
    try {
      const attachment = mapRemoteAttachmentToLocal(row, snapshot);
      await input.store.upsertAttachment(attachment);
      snapshot = replace(snapshot, 'attachments', attachment);
      pulledCount += 1;
    } catch (error) {
      collectMappingError(error, mappingErrors);
    }
  }

  for (const row of activityResult.data ?? []) {
    try {
      const activity = mapRemoteActivityToLocal(row, snapshot);
      await input.store.upsertEventActivityLog(activity);
      snapshot = replace(snapshot, 'eventActivityLogs', activity);
      pulledCount += 1;
    } catch (error) {
      collectMappingError(error, mappingErrors);
    }
  }

  return { pulledCount, eventIds: remoteEventIds, mappingErrors };
}

function cloneSnapshot(snapshot: DatabaseSnapshot): DatabaseSnapshot {
  return {
    ...snapshot,
    profiles: [...snapshot.profiles],
    members: [...snapshot.members],
    debts: [...snapshot.debts],
    events: [...snapshot.events],
    eventMembers: [...snapshot.eventMembers],
    eventParticipants: [...snapshot.eventParticipants],
    eventInvites: [...snapshot.eventInvites],
    sharedEventMembers: [...snapshot.sharedEventMembers],
    eventMemberClaims: [...snapshot.eventMemberClaims],
    eventDuplicateWarnings: [...snapshot.eventDuplicateWarnings],
    sharedExpenses: [...snapshot.sharedExpenses],
    eventDebts: [...snapshot.eventDebts],
    payments: [...snapshot.payments],
    settlements: [...snapshot.settlements],
    settlementLines: [...snapshot.settlementLines],
    expensePayers: [...snapshot.expensePayers],
    eventVerificationResponses: [...snapshot.eventVerificationResponses],
    eventActivityLogs: [...snapshot.eventActivityLogs],
    attachments: [...snapshot.attachments],
    comments: [...snapshot.comments],
  };
}

function replace<K extends keyof DatabaseSnapshot, T extends { id: string }>(
  snapshot: DatabaseSnapshot,
  key: K,
  item: T,
) {
  const current = snapshot[key] as unknown as T[];
  const next = current.some((candidate) => candidate.id === item.id)
    ? current.map((candidate) => (candidate.id === item.id ? item : candidate))
    : [...current, item];
  return { ...snapshot, [key]: next };
}

function collectMappingError(error: unknown, mappingErrors: SyncMappingError[]) {
  if (error instanceof SyncMappingError) {
    mappingErrors.push(error);
    return;
  }
  throw error;
}
