import type { DatabaseSnapshot } from '@/src/data/database';
import { supabase } from '@/src/services/supabase';
import { canRetrySyncEntry } from '@/src/services/stage6Sync';
import { addTelemetryBreadcrumb, captureTelemetryException, trackFirstSuccess, trackTelemetryEvent } from '@/src/services/telemetry';
import {
  mapLocalAttachmentToRemote,
  mapLocalCommentToRemote,
  mapLocalDebtToRemote,
  mapLocalGroupDebtToRemote,
  mapLocalGroupMemberToRemote,
  mapLocalGroupToRemote,
  mapLocalGroupVerificationToRemote,
  mapLocalExpenseToRemote,
  mapLocalPaymentToRemote,
  mapLocalSettlementLineToRemote,
  mapLocalSettlementToRemote,
  mapRemoteGroupMemberToLocal,
  mapRemoteGroupParticipantToLocal,
  SyncMappingError,
} from '@/src/services/sync/mappers';
import { pullRemoteData } from '@/src/services/sync/pullRemote';
import type {
  Attachment,
  Comment,
  Debt,
  EntityKind,
  Group,
  GroupDebt,
  GroupInvite,
  GroupMemberClaim,
  GroupParticipant,
  GroupVerificationResponse,
  Payment,
  Settlement,
  SettlementLine,
  SharedGroupMember,
  SharedExpense,
  SyncConflict,
  SyncQueueEntry,
} from '@/src/types/models';
import { createId, nowIso } from '@/src/utils/id';

export type SyncEngineStore = DatabaseSnapshot & {
  updateSyncQueueEntry: (entryId: string, patch: Partial<SyncQueueEntry>) => Promise<SyncQueueEntry>;
  upsertSyncConflict: (conflict: SyncConflict) => Promise<SyncConflict>;
  createNotification: (input: {
    userId: string | null;
    type: 'sync_problem';
    title: string;
    body: string;
    targetType: EntityKind | null;
    targetId: string | null;
    metadata: Record<string, unknown>;
    readAt?: string | null;
  }) => Promise<unknown>;
  upsertGroup: (group: Group) => Promise<Group>;
  upsertGroupParticipant: (participant: GroupParticipant) => Promise<GroupParticipant>;
  upsertGroupInvite: (invite: GroupInvite) => Promise<GroupInvite>;
  upsertSharedGroupMember: (member: SharedGroupMember) => Promise<SharedGroupMember>;
  upsertGroupMemberClaim: (claim: GroupMemberClaim) => Promise<GroupMemberClaim>;
  upsertDebt: (debt: Debt) => Promise<Debt>;
  upsertSharedExpense: (expense: SharedExpense) => Promise<SharedExpense>;
  upsertGroupDebt: (debt: GroupDebt) => Promise<GroupDebt>;
  upsertGroupVerificationResponse: (response: GroupVerificationResponse) => Promise<GroupVerificationResponse>;
  upsertPayment: (payment: Payment) => Promise<Payment>;
  upsertSettlement: (settlement: Settlement) => Promise<Settlement>;
  upsertSettlementLine: (line: SettlementLine) => Promise<SettlementLine>;
  upsertAttachment: (attachment: Attachment) => Promise<Attachment>;
  upsertComment: (comment: Comment) => Promise<Comment>;
  upsertGroupActivityLog: DatabaseSnapshot extends never ? never : any;
  upsertGroupDuplicateWarning: DatabaseSnapshot extends never ? never : any;
};

export type SyncEngineResult = {
  processed: number;
  succeeded: number;
  failed: number;
  conflicts: number;
  pulled: number;
};

export async function runSyncEngine(input: {
  store: SyncEngineStore;
  userId: string;
  email?: string | null;
  maxItems?: number;
}): Promise<SyncEngineResult> {
  if (!supabase) {
    return { processed: 0, succeeded: 0, failed: 0, conflicts: 0, pulled: 0 };
  }

  let snapshot = cloneSnapshot(input.store);
  const entries = snapshot.syncQueue
    .filter((entry) => canRetrySyncEntry(entry))
    .sort((first, second) => dependencyWeight(first) - dependencyWeight(second) || first.createdAt.localeCompare(second.createdAt))
    .slice(0, input.maxItems ?? 25);

  let succeeded = 0;
  let failed = 0;
  let conflicts = 0;

  try {
    addTelemetryBreadcrumb('sync', 'run_started', { syncQueueSize: entries.length });
    trackTelemetryEvent('sync_run_started', { syncQueueSize: entries.length });

    for (const entry of entries) {
      const dependenciesReady = entry.dependencyIds.every((id) => hasRemoteIdForLocalId(snapshot, id));
      if (!dependenciesReady) {
        continue;
      }

      await input.store.updateSyncQueueEntry(entry.id, {
        status: 'running',
        lastAttemptAt: nowIso(),
        errorCode: null,
        errorMessage: null,
      });

      try {
        const nextSnapshot = await processEntry(entry, snapshot, input.store, input.userId);
        snapshot = nextSnapshot;
        await input.store.updateSyncQueueEntry(entry.id, { status: 'succeeded' });
        succeeded += 1;
        addTelemetryBreadcrumb('sync', 'entry_succeeded', {
          entityType: entry.entityType,
          operation: entry.operation,
        });
      } catch (error) {
        if (error instanceof ConflictDetectedError) {
          await input.store.updateSyncQueueEntry(entry.id, { status: 'conflict', errorCode: 'conflict', errorMessage: error.message });
          conflicts += 1;
          addTelemetryBreadcrumb('sync', 'entry_conflict', {
            entityType: entry.entityType,
            operation: entry.operation,
            result: 'conflict',
          });
          continue;
        }
        const mapped = normaliseSyncError(error);
        if (mapped.errorCode === 'permission_denied') {
          snapshot = await markEntitySyncStatus(snapshot, input.store, entry.entityType, entry.entityId, 'permission_error');
        } else if (mapped.errorCode === 'mapping_error') {
          snapshot = await markEntitySyncStatus(snapshot, input.store, entry.entityType, entry.entityId, 'sync_error');
        }
        await input.store.updateSyncQueueEntry(entry.id, {
          status: mapped.status,
          retryCount: entry.retryCount + 1,
          errorCode: mapped.errorCode,
          errorMessage: mapped.message,
        });
        failed += 1;
        addTelemetryBreadcrumb('sync', 'entry_failed', {
          entityType: entry.entityType,
          operation: entry.operation,
          errorCode: mapped.errorCode,
          result: 'failure',
        });
      }
    }

    const pull = await pullRemoteData({ store: input.store, userId: input.userId, email: input.email });
    const result: SyncEngineResult = {
      processed: entries.length,
      succeeded,
      failed,
      conflicts,
      pulled: pull.pulledCount,
    };

    addTelemetryBreadcrumb('sync', 'run_completed', result);
    trackTelemetryEvent('sync_run_completed', result);
    if (result.succeeded > 0 || result.pulled > 0) {
      trackFirstSuccess('sync', { source: 'sync_engine', result: 'success' });
    }
    return result;
  } catch (error) {
    addTelemetryBreadcrumb('sync', 'run_failed', { processed: entries.length, result: 'failure' });
    captureTelemetryException(error, 'sync_engine_run', { processed: entries.length });
    throw error;
  }
}

async function processEntry(
  entry: SyncQueueEntry,
  snapshot: DatabaseSnapshot,
  store: SyncEngineStore,
  userId: string,
) {
  switch (`${entry.operation}:${entry.entityType}`) {
    case 'create:group':
      return createGroup(snapshot, store, entry);
    case 'update:group':
    case 'archive:group':
      return updateGroup(snapshot, store, entry, userId);
    case 'create:group_member':
      return createGroupMember(snapshot, store, entry);
    case 'update:group_member':
    case 'archive:group_member':
    case 'merge:group_member':
      return updateGroupMember(snapshot, store, entry, userId);
    case 'create:group_invite':
      return createInvite(snapshot, store, entry);
    case 'update:group_invite':
      return updateInvite(snapshot, store, entry);
    case 'create:group_member_claim':
      return createClaim(snapshot, store, entry);
    case 'update:group_member_claim':
      return updateClaim(snapshot, store, entry);
    case 'create:shared_expense':
      return createSharedExpense(snapshot, store, entry);
    case 'update:shared_expense':
    case 'archive:shared_expense':
      return updateSharedExpense(snapshot, store, entry, userId);
    case 'create:debt':
      return createDebt(snapshot, store, entry, userId);
    case 'update:debt':
    case 'archive:debt':
      return updateDebt(snapshot, store, entry, userId);
    case 'create:group_debt':
      return createGroupDebt(snapshot, store, entry);
    case 'update:group_debt':
    case 'archive:group_debt':
      return updateGroupDebt(snapshot, store, entry, userId);
    case 'create:group_verification':
    case 'update:group_verification':
      return upsertGroupVerification(snapshot, store, entry, userId);
    case 'create:payment':
      return createPayment(snapshot, store, entry);
    case 'update:payment':
    case 'void:payment':
      return updatePayment(snapshot, store, entry, userId);
    case 'create:settlement':
      return createSettlement(snapshot, store, entry);
    case 'update:settlement':
    case 'void:settlement':
      return updateSettlement(snapshot, store, entry, userId);
    case 'create:comment':
      return createComment(snapshot, store, entry);
    case 'update:comment':
    case 'delete:comment':
      return updateComment(snapshot, store, entry);
    case 'create:attachment':
      return createAttachment(snapshot, store, entry);
    case 'update:attachment':
    case 'archive:attachment':
      return updateAttachment(snapshot, store, entry);
    default:
      throw new SyncMappingError(`Unsupported sync operation ${entry.operation}:${entry.entityType}.`, {
        entryId: entry.id,
      });
  }
}

async function createGroup(snapshot: DatabaseSnapshot, store: SyncEngineStore, entry: SyncQueueEntry) {
  const group = requiredLocal(snapshot.groups, entry.entityId, 'group');
  if (group.visibility !== 'shared') {
    return markEntitySynced(snapshot, store, 'group', group.id);
  }

  const { data: remoteGroup, error } = await supabase!
    .from('groups')
    .insert(mapLocalGroupToRemote(group))
    .select('*')
    .single();
  throwIf(error);

  const updatedGroup = { ...group, remoteId: remoteGroup.id, syncStatus: 'synced' as const, updatedAt: remoteGroup.updated_at };
  await store.upsertGroup(updatedGroup);
  snapshot = replace(snapshot, 'groups', updatedGroup);

  const ownerParticipant = snapshot.groupParticipants.find((participant) => participant.groupId === group.id && participant.userId === group.ownerUserId);
  if (ownerParticipant) {
    const { data: remoteParticipant, error: participantError } = await supabase!
      .from('group_participants')
      .insert({
        group_id: remoteGroup.id,
        user_id: ownerParticipant.userId,
        role: ownerParticipant.role,
        status: ownerParticipant.status,
        joined_at: ownerParticipant.joinedAt,
      })
      .select('*')
      .single();
    throwIf(participantError);
    const localParticipant = mapRemoteGroupParticipantToLocal(remoteParticipant, snapshot);
    await store.upsertGroupParticipant(localParticipant);
    snapshot = replace(snapshot, 'groupParticipants', localParticipant);
  }

  const ownerMember = snapshot.sharedGroupMembers.find((member) => member.groupId === group.id && member.linkedUserId === group.ownerUserId);
  if (ownerMember) {
    const { data: remoteMember, error: memberError } = await supabase!
      .from('group_members')
      .insert(mapLocalGroupMemberToRemote({ ...ownerMember, remoteGroupId: remoteGroup.id }, snapshot))
      .select('*')
      .single();
    throwIf(memberError);
    const localMember = mapRemoteGroupMemberToLocal(remoteMember, snapshot);
    await store.upsertSharedGroupMember(localMember);
    snapshot = replace(snapshot, 'sharedGroupMembers', localMember);
  }
  return snapshot;
}

async function updateGroup(snapshot: DatabaseSnapshot, store: SyncEngineStore, entry: SyncQueueEntry, userId: string) {
  const group = requiredLocal(snapshot.groups, entry.entityId, 'group');
  if (!group.remoteId) {
    throw new SyncMappingError('Cannot update group before it has a remote id.', { groupId: group.id });
  }
  await detectRemoteConflict(snapshot, store, userId, entry, group, 'groups', 'group', 'update_update');
  const { data, error } = await supabase!.from('groups').update(mapLocalGroupToRemote(group)).eq('id', group.remoteId).select('*').single();
  throwIf(error);
  const updated = { ...group, syncStatus: 'synced' as const, updatedAt: data.updated_at };
  await store.upsertGroup(updated);
  return replace(snapshot, 'groups', updated);
}

async function createGroupMember(snapshot: DatabaseSnapshot, store: SyncEngineStore, entry: SyncQueueEntry) {
  const member = requiredLocal(snapshot.sharedGroupMembers, entry.entityId, 'group member');
  if (member.remoteId) {
    return markEntitySynced(snapshot, store, 'group_member', member.id);
  }
  const { data, error } = await supabase!.from('group_members').insert(mapLocalGroupMemberToRemote(member, snapshot)).select('*').single();
  throwIf(error);
  const updated = mapRemoteGroupMemberToLocal(data, snapshot);
  await store.upsertSharedGroupMember(updated);
  return replace(snapshot, 'sharedGroupMembers', updated);
}

async function updateGroupMember(snapshot: DatabaseSnapshot, store: SyncEngineStore, entry: SyncQueueEntry, userId: string) {
  const member = requiredLocal(snapshot.sharedGroupMembers, entry.entityId, 'group member');
  if (!member.remoteId) {
    return createGroupMember(snapshot, store, entry);
  }
  await detectRemoteConflict(snapshot, store, userId, entry, member, 'group_members', 'group_member', 'update_update');
  const { data, error } = await supabase!.from('group_members').update(mapLocalGroupMemberToRemote(member, snapshot)).eq('id', member.remoteId).select('*').single();
  throwIf(error);
  const updated = mapRemoteGroupMemberToLocal(data, snapshot);
  await store.upsertSharedGroupMember(updated);
  return replace(snapshot, 'sharedGroupMembers', updated);
}

async function createInvite(snapshot: DatabaseSnapshot, store: SyncEngineStore, entry: SyncQueueEntry) {
  const invite = requiredLocal(snapshot.groupInvites, entry.entityId, 'group invite');
  const group = requiredLocal(snapshot.groups, invite.groupId, 'group');
  if (!group.remoteId) {
    throw new SyncMappingError('Cannot create invite before group has remote id.', { inviteId: invite.id, groupId: group.id });
  }
  const { data, error } = await supabase!
    .from('group_invites')
    .insert({
      group_id: group.remoteId,
      inviter_user_id: invite.inviterUserId,
      invited_user_id: invite.invitedUserId,
      invited_email: invite.invitedEmail,
      invited_phone: invite.invitedPhone,
      invited_display_name: invite.invitedDisplayName,
      offered_role: invite.offeredRole,
      status: invite.status,
      message: invite.message,
    })
    .select('*')
    .single();
  throwIf(error);
  const updated = { ...invite, remoteId: data.id, remoteGroupId: data.group_id, syncStatus: 'synced' as const, updatedAt: data.updated_at };
  await store.upsertGroupInvite(updated);
  return replace(snapshot, 'groupInvites', updated);
}

async function updateInvite(snapshot: DatabaseSnapshot, store: SyncEngineStore, entry: SyncQueueEntry) {
  const invite = requiredLocal(snapshot.groupInvites, entry.entityId, 'group invite');
  if (!invite.remoteId) {
    return createInvite(snapshot, store, entry);
  }
  const { data, error } = await supabase!
    .from('group_invites')
    .update({ status: invite.status, invited_user_id: invite.invitedUserId, responded_at: invite.respondedAt })
    .eq('id', invite.remoteId)
    .select('*')
    .single();
  throwIf(error);
  const updated = { ...invite, syncStatus: 'synced' as const, updatedAt: data.updated_at };
  await store.upsertGroupInvite(updated);
  return replace(snapshot, 'groupInvites', updated);
}

async function createClaim(snapshot: DatabaseSnapshot, store: SyncEngineStore, entry: SyncQueueEntry) {
  const claim = requiredLocal(snapshot.groupMemberClaims, entry.entityId, 'group member claim');
  const member = requiredLocal(snapshot.sharedGroupMembers, claim.groupMemberId, 'group member');
  if (!member.remoteId || !member.remoteGroupId) {
    throw new SyncMappingError('Cannot create claim before group member has remote id.', { claimId: claim.id });
  }
  const { data, error } = await supabase!
    .from('group_member_claims')
    .insert({
      group_id: member.remoteGroupId,
      group_member_id: member.remoteId,
      claimant_user_id: claim.claimantUserId,
      status: claim.status,
      message: claim.message,
    })
    .select('*')
    .single();
  throwIf(error);
  const updated = { ...claim, remoteId: data.id, remoteGroupId: data.group_id, remoteGroupMemberId: data.group_member_id, syncStatus: 'synced' as const, updatedAt: data.updated_at };
  await store.upsertGroupMemberClaim(updated);
  return replace(snapshot, 'groupMemberClaims', updated);
}

async function updateClaim(snapshot: DatabaseSnapshot, store: SyncEngineStore, entry: SyncQueueEntry) {
  const claim = requiredLocal(snapshot.groupMemberClaims, entry.entityId, 'group member claim');
  if (!claim.remoteId) {
    return createClaim(snapshot, store, entry);
  }
  const { data, error } = await supabase!
    .from('group_member_claims')
    .update({ status: claim.status, responded_by_user_id: claim.respondedByUserId, responded_at: claim.respondedAt })
    .eq('id', claim.remoteId)
    .select('*')
    .single();
  throwIf(error);
  const updated = { ...claim, syncStatus: 'synced' as const, updatedAt: data.updated_at };
  await store.upsertGroupMemberClaim(updated);
  return replace(snapshot, 'groupMemberClaims', updated);
}

async function createSharedExpense(snapshot: DatabaseSnapshot, store: SyncEngineStore, entry: SyncQueueEntry) {
  const expense = requiredLocal(snapshot.sharedExpenses, entry.entityId, 'shared expense');
  const mapped = mapLocalExpenseToRemote(expense, snapshot);
  const { data, error } = await supabase!.from('group_expenses').insert(mapped.expense).select('*').single();
  throwIf(error);
  await replaceExpenseChildren(data.id, mapped);
  const updated = { ...expense, remoteId: data.id, syncStatus: 'synced' as const, updatedAt: data.updated_at };
  await store.upsertSharedExpense(updated);
  return replace(snapshot, 'sharedExpenses', updated);
}

async function updateSharedExpense(snapshot: DatabaseSnapshot, store: SyncEngineStore, entry: SyncQueueEntry, userId: string) {
  const expense = requiredLocal(snapshot.sharedExpenses, entry.entityId, 'shared expense');
  if (!expense.remoteId) {
    return createSharedExpense(snapshot, store, entry);
  }
  await detectRemoteConflict(snapshot, store, userId, entry, expense, 'group_expenses', 'shared_expense', 'update_update');
  const mapped = mapLocalExpenseToRemote(expense, snapshot);
  const { data, error } = await supabase!.from('group_expenses').update(mapped.expense).eq('id', expense.remoteId).select('*').single();
  throwIf(error);
  await replaceExpenseChildren(expense.remoteId, mapped);
  const updated = { ...expense, syncStatus: 'synced' as const, updatedAt: data.updated_at };
  await store.upsertSharedExpense(updated);
  return replace(snapshot, 'sharedExpenses', updated);
}

async function createDebt(snapshot: DatabaseSnapshot, store: SyncEngineStore, entry: SyncQueueEntry, userId: string) {
  const debt = requiredLocal(snapshot.debts, entry.entityId, 'debt');
  if (debt.visibility !== 'shared_with_involved_member') {
    return markEntitySynced(snapshot, store, 'debt', debt.id);
  }
  if (debt.remoteId) {
    return markEntitySynced(snapshot, store, 'debt', debt.id);
  }

  const { data, error } = await supabase!
    .from('shared_debt_records')
    .insert(mapLocalDebtToRemote(debt, snapshot, userId))
    .select('*')
    .single();
  throwIf(error);

  const updated = { ...debt, remoteId: data.id, syncStatus: 'synced' as const, updatedAt: data.updated_at };
  await store.upsertDebt(updated);
  return replace(snapshot, 'debts', updated);
}

async function updateDebt(snapshot: DatabaseSnapshot, store: SyncEngineStore, entry: SyncQueueEntry, userId: string) {
  const debt = requiredLocal(snapshot.debts, entry.entityId, 'debt');
  if (debt.visibility !== 'shared_with_involved_member') {
    return markEntitySynced(snapshot, store, 'debt', debt.id);
  }
  if (!debt.remoteId) {
    return createDebt(snapshot, store, entry, userId);
  }

  await detectRemoteConflict(snapshot, store, userId, entry, debt, 'shared_debt_records', 'debt', 'update_update');
  const { data, error } = await supabase!
    .from('shared_debt_records')
    .update(mapLocalDebtToRemote(debt, snapshot, userId))
    .eq('id', debt.remoteId)
    .select('*')
    .single();
  throwIf(error);

  const updated = { ...debt, syncStatus: 'synced' as const, updatedAt: data.updated_at };
  await store.upsertDebt(updated);
  return replace(snapshot, 'debts', updated);
}

async function createGroupDebt(snapshot: DatabaseSnapshot, store: SyncEngineStore, entry: SyncQueueEntry) {
  const debt = requiredLocal(snapshot.groupDebts, entry.entityId, 'group debt');
  const { data, error } = await supabase!.from('group_debts').insert(mapLocalGroupDebtToRemote(debt, snapshot)).select('*').single();
  throwIf(error);
  const updated = { ...debt, remoteId: data.id, remoteGroupId: data.group_id, syncStatus: 'synced' as const, updatedAt: data.updated_at };
  await store.upsertGroupDebt(updated);
  return replace(snapshot, 'groupDebts', updated);
}

async function updateGroupDebt(snapshot: DatabaseSnapshot, store: SyncEngineStore, entry: SyncQueueEntry, userId: string) {
  const debt = requiredLocal(snapshot.groupDebts, entry.entityId, 'group debt');
  if (!debt.remoteId) {
    return createGroupDebt(snapshot, store, entry);
  }
  await detectRemoteConflict(snapshot, store, userId, entry, debt, 'group_debts', 'group_debt', 'update_update');
  const { data, error } = await supabase!.from('group_debts').update(mapLocalGroupDebtToRemote(debt, snapshot)).eq('id', debt.remoteId).select('*').single();
  throwIf(error);
  const updated = { ...debt, syncStatus: 'synced' as const, updatedAt: data.updated_at };
  await store.upsertGroupDebt(updated);
  return replace(snapshot, 'groupDebts', updated);
}

async function upsertGroupVerification(snapshot: DatabaseSnapshot, store: SyncEngineStore, entry: SyncQueueEntry, userId: string) {
  const response = requiredLocal(snapshot.groupVerificationResponses, entry.entityId, 'group verification response');
  if (response.remoteId) {
    await detectRemoteConflict(snapshot, store, userId, entry, response, 'group_verification_responses', 'group_verification', 'verification_changed');
  }
  const remote = mapLocalGroupVerificationToRemote(response, snapshot);
  const request = response.remoteId
    ? supabase!.from('group_verification_responses').update(remote).eq('id', response.remoteId)
    : supabase!.from('group_verification_responses').upsert(remote, { onConflict: 'group_id,target_type,target_id,group_member_id' });
  const { data, error } = await request.select('*').single();
  throwIf(error);
  const updated = { ...response, remoteId: data.id, remoteGroupId: data.group_id, remoteTargetId: data.target_id, syncStatus: 'synced' as const, updatedAt: data.updated_at };
  await store.upsertGroupVerificationResponse(updated);
  return replace(snapshot, 'groupVerificationResponses', updated);
}

async function createPayment(snapshot: DatabaseSnapshot, store: SyncEngineStore, entry: SyncQueueEntry) {
  const payment = requiredLocal(snapshot.payments, entry.entityId, 'payment');
  const { data, error } = await supabase!.from('payments').insert(mapLocalPaymentToRemote(payment, snapshot)).select('*').single();
  throwIf(error);
  const updated = { ...payment, remoteId: data.id, syncStatus: 'synced' as const, updatedAt: data.updated_at };
  await store.upsertPayment(updated);
  return replace(snapshot, 'payments', updated);
}

async function updatePayment(snapshot: DatabaseSnapshot, store: SyncEngineStore, entry: SyncQueueEntry, userId: string) {
  const payment = requiredLocal(snapshot.payments, entry.entityId, 'payment');
  if (!payment.remoteId) {
    return createPayment(snapshot, store, entry);
  }
  await detectRemoteConflict(snapshot, store, userId, entry, payment, 'payments', 'payment', 'payment_conflict');
  const { data, error } = await supabase!.from('payments').update(mapLocalPaymentToRemote(payment, snapshot)).eq('id', payment.remoteId).select('*').single();
  throwIf(error);
  const updated = { ...payment, syncStatus: 'synced' as const, updatedAt: data.updated_at };
  await store.upsertPayment(updated);
  return replace(snapshot, 'payments', updated);
}

async function createSettlement(snapshot: DatabaseSnapshot, store: SyncEngineStore, entry: SyncQueueEntry) {
  const settlement = requiredLocal(snapshot.settlements, entry.entityId, 'settlement');
  const { data, error } = await supabase!.from('settlements').insert(mapLocalSettlementToRemote(settlement, snapshot)).select('*').single();
  throwIf(error);
  const updated = { ...settlement, remoteId: data.id, syncStatus: 'synced' as const, updatedAt: data.updated_at };
  await store.upsertSettlement(updated);
  snapshot = replace(snapshot, 'settlements', updated);

  for (const line of snapshot.settlementLines.filter((item) => item.settlementId === settlement.id)) {
    const { data: remoteLine, error: lineError } = await supabase!
      .from('settlement_lines')
      .insert(mapLocalSettlementLineToRemote(line, snapshot))
      .select('*')
      .single();
    throwIf(lineError);
    const updatedLine = { ...line, remoteId: remoteLine.id, syncStatus: 'synced' as const, updatedAt: remoteLine.updated_at };
    await store.upsertSettlementLine(updatedLine);
    snapshot = replace(snapshot, 'settlementLines', updatedLine);
  }
  return snapshot;
}

async function updateSettlement(snapshot: DatabaseSnapshot, store: SyncEngineStore, entry: SyncQueueEntry, userId: string) {
  const settlement = requiredLocal(snapshot.settlements, entry.entityId, 'settlement');
  if (!settlement.remoteId) {
    return createSettlement(snapshot, store, entry);
  }
  await detectRemoteConflict(snapshot, store, userId, entry, settlement, 'settlements', 'settlement', 'settlement_conflict');
  const { data, error } = await supabase!.from('settlements').update(mapLocalSettlementToRemote(settlement, snapshot)).eq('id', settlement.remoteId).select('*').single();
  throwIf(error);
  const updated = { ...settlement, syncStatus: 'synced' as const, updatedAt: data.updated_at };
  await store.upsertSettlement(updated);
  return replace(snapshot, 'settlements', updated);
}

async function createComment(snapshot: DatabaseSnapshot, store: SyncEngineStore, entry: SyncQueueEntry) {
  const comment = requiredLocal(snapshot.comments, entry.entityId, 'comment');
  if (comment.visibility !== 'shared') {
    return markEntitySynced(snapshot, store, 'comment', comment.id);
  }
  const { data, error } = await supabase!.from('comments').insert(mapLocalCommentToRemote(comment, snapshot)).select('*').single();
  throwIf(error);
  const updated = { ...comment, remoteId: data.id, syncStatus: 'synced' as const, updatedAt: data.updated_at };
  await store.upsertComment(updated);
  return replace(snapshot, 'comments', updated);
}

async function updateComment(snapshot: DatabaseSnapshot, store: SyncEngineStore, entry: SyncQueueEntry) {
  const comment = requiredLocal(snapshot.comments, entry.entityId, 'comment');
  if (!comment.remoteId) {
    return createComment(snapshot, store, entry);
  }
  const { data, error } = await supabase!.from('comments').update(mapLocalCommentToRemote(comment, snapshot)).eq('id', comment.remoteId).select('*').single();
  throwIf(error);
  const updated = { ...comment, syncStatus: 'synced' as const, updatedAt: data.updated_at };
  await store.upsertComment(updated);
  return replace(snapshot, 'comments', updated);
}

async function createAttachment(snapshot: DatabaseSnapshot, store: SyncEngineStore, entry: SyncQueueEntry) {
  const attachment = requiredLocal(snapshot.attachments, entry.entityId, 'attachment');
  if (attachment.visibility !== 'shared') {
    return markEntitySynced(snapshot, store, 'attachment', attachment.id);
  }
  const { data, error } = await supabase!.from('attachments').insert(mapLocalAttachmentToRemote(attachment, snapshot)).select('*').single();
  throwIf(error);
  const updated = { ...attachment, remoteId: data.id, syncStatus: 'synced' as const, updatedAt: data.updated_at };
  await store.upsertAttachment(updated);
  return replace(snapshot, 'attachments', updated);
}

async function updateAttachment(snapshot: DatabaseSnapshot, store: SyncEngineStore, entry: SyncQueueEntry) {
  const attachment = requiredLocal(snapshot.attachments, entry.entityId, 'attachment');
  if (!attachment.remoteId) {
    return createAttachment(snapshot, store, entry);
  }
  const { data, error } = await supabase!.from('attachments').update(mapLocalAttachmentToRemote(attachment, snapshot)).eq('id', attachment.remoteId).select('*').single();
  throwIf(error);
  const updated = { ...attachment, syncStatus: 'synced' as const, updatedAt: data.updated_at };
  await store.upsertAttachment(updated);
  return replace(snapshot, 'attachments', updated);
}

async function replaceExpenseChildren(
  remoteExpenseId: string,
  mapped: ReturnType<typeof mapLocalExpenseToRemote>,
) {
  const { error: splitDeleteError } = await supabase!.from('group_expense_splits').delete().eq('expense_id', remoteExpenseId);
  throwIf(splitDeleteError);
  if (mapped.splits.length > 0) {
    const { error } = await supabase!.from('group_expense_splits').insert(
      mapped.splits.map((split) => ({
        ...split,
        expense_id: remoteExpenseId,
      })),
    );
    throwIf(error);
  }

  const { error: payerDeleteError } = await supabase!.from('expense_payers').delete().eq('expense_id', remoteExpenseId);
  throwIf(payerDeleteError);
  if (mapped.payers.length > 0) {
    const { error } = await supabase!.from('expense_payers').insert(
      mapped.payers.map((payer) => ({
        ...payer,
        expense_id: remoteExpenseId,
      })),
    );
    throwIf(error);
  }
}

async function detectRemoteConflict(
  snapshot: DatabaseSnapshot,
  store: SyncEngineStore,
  userId: string,
  entry: SyncQueueEntry,
  local: { id: string; remoteId?: string | null; updatedAt: string; syncStatus: string; archivedAt?: string | null; status?: string; lockedAt?: string | null },
  tableName: string,
  entityType: SyncConflict['entityType'],
  conflictType: SyncConflict['conflictType'],
) {
  if (!local.remoteId) {
    return;
  }
  const { data, error } = await supabase!.from(tableName).select('*').eq('id', local.remoteId).maybeSingle();
  throwIf(error);
  if (!data) {
    await createConflict(snapshot, store, userId, entityType, local.id, local.remoteId, 'update_delete', local, { deleted: true }, entry.payload);
    throw new ConflictDetectedError('Remote record was deleted while a local update was pending.');
  }
  const remoteUpdatedAt = String(data.updated_at ?? '');
  const remoteArchived = Boolean(data.archived_at) || data.status === 'archived';
  const remoteLocked = Boolean(data.locked_at) || data.status === 'settled' || data.status === 'finalising';
  const verificationChanged =
    data.verification_status &&
    entry.payload &&
    typeof entry.payload === 'object' &&
    'verificationStatus' in entry.payload &&
    data.verification_status !== (entry.payload as Record<string, unknown>).verificationStatus;

  if (remoteArchived && local.syncStatus === 'pending_update') {
    await createConflict(snapshot, store, userId, entityType, local.id, local.remoteId, 'update_delete', local, data, entry.payload);
    throw new ConflictDetectedError('Remote record was archived while a local update was pending.');
  }
  if (remoteLocked && local.syncStatus === 'pending_update' && entityType !== 'group') {
    await createConflict(snapshot, store, userId, entityType, local.id, local.remoteId, 'group_locked', local, data, entry.payload);
    throw new ConflictDetectedError('Remote group is locked while a local update was pending.');
  }
  if (verificationChanged) {
    await createConflict(snapshot, store, userId, entityType, local.id, local.remoteId, 'verification_changed', local, data, entry.payload);
    throw new ConflictDetectedError('Remote verification changed while a local update was pending.');
  }
  if (remoteUpdatedAt && remoteUpdatedAt > entry.createdAt) {
    await createConflict(snapshot, store, userId, entityType, local.id, local.remoteId, conflictType, local, data, entry.payload);
    throw new ConflictDetectedError('Remote record changed while a local update was pending.');
  }
}

async function createConflict(
  snapshot: DatabaseSnapshot,
  store: SyncEngineStore,
  userId: string,
  entityType: SyncConflict['entityType'],
  localEntityId: string,
  remoteEntityId: string | null,
  conflictType: SyncConflict['conflictType'],
  localSnapshot: Record<string, unknown>,
  remoteSnapshot: Record<string, unknown>,
  baseSnapshot: Record<string, unknown> | null,
) {
  const existing = snapshot.syncConflicts.find(
    (conflict) =>
      conflict.status === 'unresolved' &&
      conflict.entityType === entityType &&
      conflict.localEntityId === localEntityId &&
      conflict.conflictType === conflictType,
  );
  if (existing) {
    return existing;
  }
  const conflict: SyncConflict = {
    id: createId('conflict'),
    entityType,
    localEntityId,
    remoteEntityId,
    conflictType,
    localSnapshot,
    remoteSnapshot,
    baseSnapshot,
    detectedAt: nowIso(),
    status: 'unresolved',
    resolution: null,
    resolvedAt: null,
    resolvedByUserId: null,
  };
  await store.upsertSyncConflict(conflict);
  await store.createNotification({
    userId,
    type: 'sync_problem',
    title: 'Sync conflict needs review',
    body: `${entityType.replaceAll('_', ' ')} has competing local and remote changes.`,
    targetType: 'sync_conflict',
    targetId: conflict.id,
    metadata: { conflictType },
  });
  addTelemetryBreadcrumb('sync', 'conflict_detected', {
    entityType,
    conflictType,
    result: 'conflict',
  });
  trackTelemetryEvent('sync_conflict_detected', { entityType, conflictType, result: 'conflict' });
  return conflict;
}

async function markEntitySynced(
  snapshot: DatabaseSnapshot,
  store: SyncEngineStore,
  entityType: EntityKind,
  entityId: string,
) {
  return markEntitySyncStatus(snapshot, store, entityType, entityId, 'synced');
}

async function markEntitySyncStatus(
  snapshot: DatabaseSnapshot,
  store: SyncEngineStore,
  entityType: EntityKind,
  entityId: string,
  syncStatus: 'synced' | 'sync_error' | 'permission_error',
) {
  switch (entityType) {
    case 'group': {
      const group = requiredLocal(snapshot.groups, entityId, 'group');
      const updated = { ...group, syncStatus };
      await store.upsertGroup(updated);
      return replace(snapshot, 'groups', updated);
    }
    case 'group_invite': {
      const invite = requiredLocal(snapshot.groupInvites, entityId, 'group invite');
      const updated = { ...invite, syncStatus };
      await store.upsertGroupInvite(updated);
      return replace(snapshot, 'groupInvites', updated);
    }
    case 'group_member': {
      const member = requiredLocal(snapshot.sharedGroupMembers, entityId, 'group member');
      const updated = { ...member, syncStatus };
      await store.upsertSharedGroupMember(updated);
      return replace(snapshot, 'sharedGroupMembers', updated);
    }
    case 'group_member_claim': {
      const claim = requiredLocal(snapshot.groupMemberClaims, entityId, 'group member claim');
      const updated = { ...claim, syncStatus };
      await store.upsertGroupMemberClaim(updated);
      return replace(snapshot, 'groupMemberClaims', updated);
    }
    case 'shared_expense': {
      const expense = requiredLocal(snapshot.sharedExpenses, entityId, 'shared expense');
      const updated = { ...expense, syncStatus };
      await store.upsertSharedExpense(updated);
      return replace(snapshot, 'sharedExpenses', updated);
    }
    case 'debt': {
      const debt = requiredLocal(snapshot.debts, entityId, 'debt');
      const updated = { ...debt, syncStatus };
      await store.upsertDebt(updated);
      return replace(snapshot, 'debts', updated);
    }
    case 'group_debt': {
      const debt = requiredLocal(snapshot.groupDebts, entityId, 'group debt');
      const updated = { ...debt, syncStatus };
      await store.upsertGroupDebt(updated);
      return replace(snapshot, 'groupDebts', updated);
    }
    case 'group_verification': {
      const response = requiredLocal(snapshot.groupVerificationResponses, entityId, 'group verification response');
      const updated = { ...response, syncStatus };
      await store.upsertGroupVerificationResponse(updated);
      return replace(snapshot, 'groupVerificationResponses', updated);
    }
    case 'payment': {
      const payment = requiredLocal(snapshot.payments, entityId, 'payment');
      const updated = { ...payment, syncStatus };
      await store.upsertPayment(updated);
      return replace(snapshot, 'payments', updated);
    }
    case 'settlement': {
      const settlement = requiredLocal(snapshot.settlements, entityId, 'settlement');
      const updated = { ...settlement, syncStatus };
      await store.upsertSettlement(updated);
      return replace(snapshot, 'settlements', updated);
    }
    case 'comment': {
      const comment = requiredLocal(snapshot.comments, entityId, 'comment');
      const updated = { ...comment, syncStatus };
      await store.upsertComment(updated);
      return replace(snapshot, 'comments', updated);
    }
    case 'attachment': {
      const attachment = requiredLocal(snapshot.attachments, entityId, 'attachment');
      const updated = { ...attachment, syncStatus };
      await store.upsertAttachment(updated);
      return replace(snapshot, 'attachments', updated);
    }
    default:
      return snapshot;
  }
}

function normaliseSyncError(error: unknown) {
  if (error instanceof SyncMappingError) {
    return { status: 'failed' as const, errorCode: 'mapping_error', message: error.message };
  }
  const message = error instanceof Error ? error.message : String(error);
  if (/permission|row-level|rls|policy|42501|403/i.test(message)) {
    return { status: 'failed' as const, errorCode: 'permission_denied', message };
  }
  return { status: 'failed' as const, errorCode: 'transient_error', message };
}

function throwIf(error: unknown) {
  if (error) {
    throw error;
  }
}

function hasRemoteIdForLocalId(snapshot: DatabaseSnapshot, localId: string) {
  const collections: { id: string; remoteId?: string | null }[][] = [
    snapshot.groups,
    snapshot.sharedGroupMembers,
    snapshot.debts,
    snapshot.sharedExpenses,
    snapshot.groupDebts,
    snapshot.payments,
    snapshot.settlements,
    snapshot.comments,
    snapshot.attachments,
  ];
  const record = collections.flat().find((item) => item.id === localId);
  return !record || Boolean(record.remoteId);
}

function dependencyWeight(entry: SyncQueueEntry) {
  if (entry.entityType === 'group') {
    return 0;
  }
  if (entry.entityType === 'group_member' || entry.entityType === 'group_invite') {
    return 1;
  }
  if (entry.entityType === 'shared_expense' || entry.entityType === 'group_debt') {
    return 2;
  }
  if (entry.entityType === 'debt') {
    return 2;
  }
  return 3;
}

function requiredLocal<T extends { id: string }>(items: T[], id: string, label: string) {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) {
    throw new SyncMappingError(`Missing local ${label}.`, { id });
  }
  return item;
}

function cloneSnapshot(snapshot: DatabaseSnapshot): DatabaseSnapshot {
  return {
    ...snapshot,
    members: [...snapshot.members],
    debts: [...snapshot.debts],
    groups: [...snapshot.groups],
    groupParticipants: [...snapshot.groupParticipants],
    groupInvites: [...snapshot.groupInvites],
    sharedGroupMembers: [...snapshot.sharedGroupMembers],
    groupMemberClaims: [...snapshot.groupMemberClaims],
    sharedExpenses: [...snapshot.sharedExpenses],
    groupDebts: [...snapshot.groupDebts],
    groupVerificationResponses: [...snapshot.groupVerificationResponses],
    payments: [...snapshot.payments],
    settlements: [...snapshot.settlements],
    settlementLines: [...snapshot.settlementLines],
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

class ConflictDetectedError extends Error {}
