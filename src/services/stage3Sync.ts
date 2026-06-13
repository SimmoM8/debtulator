import { supabase } from '@/src/services/supabase';
import type {
  GroupDebt,
  GroupInvite,
  GroupMemberClaim,
  GroupVerificationResponse,
  SharedGroupMember,
  SharedExpense,
} from '@/src/types/models';

export async function createRemoteSharedGroup(input: {
  ownerUserId: string;
  name: string;
  notes?: string | null;
  defaultCurrency: string;
  allowedCurrencies: string[];
  tags: string[];
  ownerDisplayName: string;
  ownerEmail?: string | null;
}) {
  if (!supabase) {
    return null;
  }

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({
      owner_user_id: input.ownerUserId,
      name: input.name,
      description: input.notes ?? null,
      default_currency: input.defaultCurrency,
      allowed_currencies: input.allowedCurrencies,
      tags: input.tags,
      visibility: 'shared',
      status: 'active',
    })
    .select('id')
    .single();
  if (groupError) {
    throw groupError;
  }

  const { error: participantError } = await supabase.from('group_participants').insert({
    group_id: group.id,
    user_id: input.ownerUserId,
    role: 'owner',
    status: 'active',
    joined_at: new Date().toISOString(),
  });
  if (participantError) {
    throw participantError;
  }

  const { data: member, error: memberError } = await supabase
    .from('group_members')
    .insert({
      group_id: group.id,
      type: 'linked_user',
      linked_user_id: input.ownerUserId,
      display_name: input.ownerDisplayName,
      alias: 'You',
      email: input.ownerEmail ?? null,
      created_by_user_id: input.ownerUserId,
      status: 'active',
    })
    .select('id')
    .single();
  if (memberError) {
    throw memberError;
  }

  await createRemoteGroupActivity({
    groupId: group.id,
    actorUserId: input.ownerUserId,
    action: 'group_created',
    targetType: 'group',
    targetId: group.id,
    metadata: { name: input.name },
  });

  return { remoteGroupId: group.id as string, remoteOwnerGroupMemberId: member.id as string };
}

export async function createRemoteGroupInvite(input: GroupInvite) {
  if (!supabase || !input.remoteGroupId) {
    return null;
  }
  const { data, error } = await supabase
    .from('group_invites')
    .insert({
      group_id: input.remoteGroupId,
      inviter_user_id: input.inviterUserId,
      invited_user_id: input.invitedUserId,
      invited_email: input.invitedEmail,
      invited_phone: input.invitedPhone,
      invited_display_name: input.invitedDisplayName,
      offered_role: input.offeredRole,
      status: input.status,
      message: input.message,
    })
    .select('id')
    .single();
  if (error) {
    throw error;
  }
  return data.id as string;
}

export async function updateRemoteGroupInvite(invite: GroupInvite, status: GroupInvite['status'], actorUserId?: string | null) {
  if (!supabase || !invite.remoteId) {
    return;
  }
  const respondedAt = new Date().toISOString();
  const { error } = await supabase
    .from('group_invites')
    .update({
      status,
      invited_user_id: status === 'accepted' ? actorUserId ?? invite.invitedUserId : invite.invitedUserId,
      responded_at: status === 'pending' ? null : respondedAt,
      updated_at: respondedAt,
    })
    .eq('id', invite.remoteId);
  if (error) {
    throw error;
  }
}

export async function createRemoteSharedGroupMember(member: SharedGroupMember) {
  if (!supabase || !member.remoteGroupId) {
    return null;
  }
  const { data, error } = await supabase
    .from('group_members')
    .insert({
      group_id: member.remoteGroupId,
      type: member.type,
      linked_user_id: member.linkedUserId,
      display_name: member.displayName,
      alias: member.alias,
      email: member.email,
      phone: member.phone,
      notes: member.notes,
      created_by_user_id: member.createdByUserId,
      status: member.status,
      merged_into_group_member_id: member.mergedIntoGroupMemberId,
    })
    .select('id')
    .single();
  if (error) {
    throw error;
  }
  return data.id as string;
}

export async function createRemoteGroupExpense(expense: SharedExpense) {
  if (!supabase) {
    return null;
  }
  const { data, error } = await supabase
    .from('group_expenses')
    .insert({
      group_id: expense.groupId,
      creator_user_id: expense.creatorUserId,
      payer_group_member_id: expense.payerId,
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
    })
    .select('id')
    .single();
  if (error) {
    throw error;
  }
  return data.id as string;
}

export async function createRemoteGroupDebt(debt: GroupDebt) {
  if (!supabase || !debt.remoteGroupId) {
    return null;
  }
  const { data, error } = await supabase
    .from('group_debts')
    .insert({
      group_id: debt.remoteGroupId,
      creator_user_id: debt.creatorUserId,
      debtor_group_member_id: debt.debtorGroupMemberId,
      creditor_group_member_id: debt.creditorGroupMemberId,
      amount: debt.amount,
      currency: debt.currency,
      title: debt.title,
      notes: debt.notes,
      date: debt.debtDate,
      tags: debt.tags,
      verification_status: debt.verificationStatus,
      settlement_status: debt.settlementStatus,
      status: debt.status,
    })
    .select('id')
    .single();
  if (error) {
    throw error;
  }
  return data.id as string;
}

export async function createRemoteGroupClaim(claim: GroupMemberClaim) {
  if (!supabase || !claim.remoteGroupId) {
    return null;
  }
  const { data, error } = await supabase
    .from('group_member_claims')
    .insert({
      group_id: claim.remoteGroupId,
      group_member_id: claim.remoteGroupMemberId ?? claim.groupMemberId,
      claimant_user_id: claim.claimantUserId,
      status: claim.status,
      message: claim.message,
    })
    .select('id')
    .single();
  if (error) {
    throw error;
  }
  return data.id as string;
}

export async function createRemoteGroupVerificationResponse(response: GroupVerificationResponse) {
  if (!supabase || !response.remoteGroupId) {
    return null;
  }
  const { data, error } = await supabase
    .from('group_verification_responses')
    .upsert({
      group_id: response.remoteGroupId,
      target_type: response.targetType,
      target_id: response.remoteTargetId ?? response.targetId,
      group_member_id: response.groupMemberId,
      linked_user_id: response.linkedUserId,
      response_status: response.responseStatus,
      rejection_reason: response.rejectionReason,
      responded_at: response.respondedAt,
    })
    .select('id')
    .single();
  if (error) {
    throw error;
  }
  return data.id as string;
}

export async function createRemoteGroupActivity(input: {
  groupId: string;
  actorUserId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
}) {
  if (!supabase) {
    return null;
  }
  const { error } = await supabase.from('group_activity_logs').insert({
    group_id: input.groupId,
    actor_user_id: input.actorUserId,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId,
    metadata: input.metadata,
  });
  if (error) {
    throw error;
  }
}

export async function fetchRemoteStage3Records(input: { userId: string; email?: string | null }) {
  if (!supabase) {
    return null;
  }

  const emailClause = input.email ? `,invited_email.eq.${input.email}` : '';
  const { data: invites, error: inviteError } = await supabase
    .from('group_invites')
    .select('*')
    .or(`invited_user_id.eq.${input.userId},inviter_user_id.eq.${input.userId}${emailClause}`)
    .order('updated_at', { ascending: false });
  if (inviteError) {
    throw inviteError;
  }

  const { data: participants, error: participantError } = await supabase
    .from('group_participants')
    .select('*')
    .eq('user_id', input.userId)
    .order('updated_at', { ascending: false });
  if (participantError) {
    throw participantError;
  }

  const groupIds = Array.from(
    new Set([
      ...(participants ?? []).map((row) => row.group_id),
      ...(invites ?? []).map((row) => row.group_id),
    ]),
  );

  if (groupIds.length === 0) {
    return { groups: [], participants: participants ?? [], invites: invites ?? [], members: [], expenses: [], splits: [], debts: [], claims: [], verifications: [], warnings: [], activity: [] };
  }

  const [groups, members, expenses, splits, debts, claims, verifications, warnings, activity] = await Promise.all([
    supabase.from('groups').select('*').in('id', groupIds),
    supabase.from('group_members').select('*').in('group_id', groupIds),
    supabase.from('group_expenses').select('*').in('group_id', groupIds),
    supabase.from('group_expense_splits').select('*, group_expenses!inner(group_id)').in('group_expenses.group_id', groupIds),
    supabase.from('group_debts').select('*').in('group_id', groupIds),
    supabase.from('group_member_claims').select('*').in('group_id', groupIds),
    supabase.from('group_verification_responses').select('*').in('group_id', groupIds),
    supabase.from('group_duplicate_warnings').select('*').in('group_id', groupIds),
    supabase.from('group_activity_logs').select('*').in('group_id', groupIds).order('created_at', { ascending: false }),
  ]);

  for (const result of [groups, members, expenses, splits, debts, claims, verifications, warnings, activity]) {
    if (result.error) {
      throw result.error;
    }
  }

  return {
    groups: groups.data ?? [],
    participants: participants ?? [],
    invites: invites ?? [],
    members: members.data ?? [],
    expenses: expenses.data ?? [],
    splits: splits.data ?? [],
    debts: debts.data ?? [],
    claims: claims.data ?? [],
    verifications: verifications.data ?? [],
    warnings: warnings.data ?? [],
    activity: activity.data ?? [],
  };
}
