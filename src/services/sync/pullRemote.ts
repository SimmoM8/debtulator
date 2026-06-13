import type { DatabaseSnapshot } from '@/src/data/database';
import { supabase } from '@/src/services/supabase';
import {
  mapRemoteActivityToLocal,
  mapRemoteAttachmentToLocal,
  mapRemoteCommentToLocal,
  mapRemoteDuplicateWarningToLocal,
  mapRemoteGroupClaimToLocal,
  mapRemoteGroupDebtToLocal,
  mapRemoteGroupInviteToLocal,
  mapRemoteGroupMemberToLocal,
  mapRemoteGroupParticipantToLocal,
  mapRemoteGroupToLocal,
  mapRemoteGroupVerificationToLocal,
  mapRemoteExpenseToLocal,
  mapRemotePaymentToLocal,
  mapRemoteSettlementLineToLocal,
  mapRemoteSettlementToLocal,
  SyncMappingError,
} from '@/src/services/sync/mappers';
import type {
  Attachment,
  Comment,
  Group,
  GroupActivityLog,
  GroupDebt,
  GroupDuplicateWarning,
  GroupInvite,
  GroupMemberClaim,
  GroupParticipant,
  GroupVerificationResponse,
  Payment,
  Settlement,
  SettlementLine,
  SharedGroupMember,
  SharedExpense,
} from '@/src/types/models';

export type RemotePullStore = DatabaseSnapshot & {
  upsertGroup: (group: Group) => Promise<Group>;
  upsertGroupParticipant: (participant: GroupParticipant) => Promise<GroupParticipant>;
  upsertGroupInvite: (invite: GroupInvite) => Promise<GroupInvite>;
  upsertSharedGroupMember: (member: SharedGroupMember) => Promise<SharedGroupMember>;
  upsertGroupMemberClaim: (claim: GroupMemberClaim) => Promise<GroupMemberClaim>;
  upsertGroupDuplicateWarning: (warning: GroupDuplicateWarning) => Promise<GroupDuplicateWarning>;
  upsertSharedExpense: (expense: SharedExpense) => Promise<SharedExpense>;
  upsertGroupDebt: (debt: GroupDebt) => Promise<GroupDebt>;
  upsertGroupVerificationResponse: (response: GroupVerificationResponse) => Promise<GroupVerificationResponse>;
  upsertGroupActivityLog: (activity: GroupActivityLog) => Promise<GroupActivityLog>;
  upsertPayment: (payment: Payment) => Promise<Payment>;
  upsertSettlement: (settlement: Settlement) => Promise<Settlement>;
  upsertSettlementLine: (line: SettlementLine) => Promise<SettlementLine>;
  upsertAttachment: (attachment: Attachment) => Promise<Attachment>;
};

export type RemotePullResult = {
  pulledCount: number;
  groupIds: string[];
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
    return { pulledCount: 0, groupIds: [], mappingErrors: [] };
  }

  let snapshot = cloneSnapshot(input.store);
  let pulledCount = 0;
  const mappingErrors: SyncMappingError[] = [];

  const inviteClause = input.email ? `,invited_email.eq.${input.email}` : '';
  const { data: invites, error: inviteError } = await supabase
    .from('group_invites')
    .select('*')
    .or(`invited_user_id.eq.${input.userId},inviter_user_id.eq.${input.userId}${inviteClause}`);
  if (inviteError) {
    throw inviteError;
  }

  const { data: participants, error: participantError } = await supabase
    .from('group_participants')
    .select('*')
    .eq('user_id', input.userId);
  if (participantError) {
    throw participantError;
  }

  const remoteGroupIds = Array.from(
    new Set([
      ...(participants ?? []).map((row) => row.group_id as string),
      ...(invites ?? []).map((row) => row.group_id as string),
    ]),
  );

  if (remoteGroupIds.length === 0) {
    return { pulledCount: 0, groupIds: [], mappingErrors: [] };
  }

  const [
    groupsResult,
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
    supabase.from('groups').select('*').in('id', remoteGroupIds),
    supabase.from('group_participants').select('*').in('group_id', remoteGroupIds),
    supabase.from('group_members').select('*').in('group_id', remoteGroupIds),
    supabase.from('group_expenses').select('*').in('group_id', remoteGroupIds),
    supabase.from('group_expense_splits').select('*, group_expenses!inner(group_id)').in('group_expenses.group_id', remoteGroupIds),
    supabase.from('expense_payers').select('*, group_expenses!inner(group_id)').in('group_expenses.group_id', remoteGroupIds),
    supabase.from('group_debts').select('*').in('group_id', remoteGroupIds),
    supabase.from('group_member_claims').select('*').in('group_id', remoteGroupIds),
    supabase.from('group_verification_responses').select('*').in('group_id', remoteGroupIds),
    supabase.from('group_duplicate_warnings').select('*').in('group_id', remoteGroupIds),
    supabase.from('payments').select('*').in('group_id', remoteGroupIds),
    supabase.from('settlements').select('*').in('group_id', remoteGroupIds),
    supabase.from('comments').select('*').in('group_id', remoteGroupIds),
    supabase.from('attachments').select('*').in('group_id', remoteGroupIds),
    supabase.from('group_activity_logs').select('*').in('group_id', remoteGroupIds).order('created_at', { ascending: false }),
  ]);

  for (const result of [
    groupsResult,
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

  for (const row of groupsResult.data ?? []) {
    const group = mapRemoteGroupToLocal(row, snapshot);
    await input.store.upsertGroup(group);
    snapshot = replace(snapshot, 'groups', group);
    pulledCount += 1;
  }

  for (const row of allParticipantsResult.data ?? []) {
    try {
      const participant = mapRemoteGroupParticipantToLocal(row, snapshot);
      await input.store.upsertGroupParticipant(participant);
      snapshot = replace(snapshot, 'groupParticipants', participant);
      pulledCount += 1;
    } catch (error) {
      collectMappingError(error, mappingErrors);
    }
  }

  for (const row of invites ?? []) {
    try {
      const invite = mapRemoteGroupInviteToLocal(row, snapshot);
      await input.store.upsertGroupInvite(invite);
      snapshot = replace(snapshot, 'groupInvites', invite);
      pulledCount += 1;
    } catch (error) {
      collectMappingError(error, mappingErrors);
    }
  }

  for (const row of membersResult.data ?? []) {
    try {
      const member = mapRemoteGroupMemberToLocal(row, snapshot);
      await input.store.upsertSharedGroupMember(member);
      snapshot = replace(snapshot, 'sharedGroupMembers', member);
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
      const debt = mapRemoteGroupDebtToLocal(row, snapshot);
      await input.store.upsertGroupDebt(debt);
      snapshot = replace(snapshot, 'groupDebts', debt);
      pulledCount += 1;
    } catch (error) {
      collectMappingError(error, mappingErrors);
    }
  }

  for (const row of claimsResult.data ?? []) {
    try {
      const claim = mapRemoteGroupClaimToLocal(row, snapshot);
      await input.store.upsertGroupMemberClaim(claim);
      snapshot = replace(snapshot, 'groupMemberClaims', claim);
      pulledCount += 1;
    } catch (error) {
      collectMappingError(error, mappingErrors);
    }
  }

  for (const row of warningsResult.data ?? []) {
    try {
      const warning = mapRemoteDuplicateWarningToLocal(row, snapshot);
      await input.store.upsertGroupDuplicateWarning(warning);
      snapshot = replace(snapshot, 'groupDuplicateWarnings', warning);
      pulledCount += 1;
    } catch (error) {
      collectMappingError(error, mappingErrors);
    }
  }

  for (const row of verificationsResult.data ?? []) {
    try {
      const response = mapRemoteGroupVerificationToLocal(row, snapshot);
      await input.store.upsertGroupVerificationResponse(response);
      snapshot = replace(snapshot, 'groupVerificationResponses', response);
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
      await input.store.upsertGroupActivityLog(activity);
      snapshot = replace(snapshot, 'groupActivityLogs', activity);
      pulledCount += 1;
    } catch (error) {
      collectMappingError(error, mappingErrors);
    }
  }

  return { pulledCount, groupIds: remoteGroupIds, mappingErrors };
}

function cloneSnapshot(snapshot: DatabaseSnapshot): DatabaseSnapshot {
  return {
    ...snapshot,
    profiles: [...snapshot.profiles],
    members: [...snapshot.members],
    debts: [...snapshot.debts],
    groups: [...snapshot.groups],
    groupMembers: [...snapshot.groupMembers],
    groupParticipants: [...snapshot.groupParticipants],
    groupInvites: [...snapshot.groupInvites],
    sharedGroupMembers: [...snapshot.sharedGroupMembers],
    groupMemberClaims: [...snapshot.groupMemberClaims],
    groupDuplicateWarnings: [...snapshot.groupDuplicateWarnings],
    sharedExpenses: [...snapshot.sharedExpenses],
    groupDebts: [...snapshot.groupDebts],
    payments: [...snapshot.payments],
    settlements: [...snapshot.settlements],
    settlementLines: [...snapshot.settlementLines],
    expensePayers: [...snapshot.expensePayers],
    groupVerificationResponses: [...snapshot.groupVerificationResponses],
    groupActivityLogs: [...snapshot.groupActivityLogs],
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
