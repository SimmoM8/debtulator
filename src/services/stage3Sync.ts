import { supabase } from '@/src/services/supabase';
import type {
  EventDebt,
  EventInvite,
  EventMemberClaim,
  EventVerificationResponse,
  SharedEventMember,
  SharedExpense,
} from '@/src/types/models';

export async function createRemoteSharedEvent(input: {
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

  const { data: event, error: eventError } = await supabase
    .from('events')
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
  if (eventError) {
    throw eventError;
  }

  const { error: participantError } = await supabase.from('event_participants').insert({
    event_id: event.id,
    user_id: input.ownerUserId,
    role: 'owner',
    status: 'active',
    joined_at: new Date().toISOString(),
  });
  if (participantError) {
    throw participantError;
  }

  const { data: member, error: memberError } = await supabase
    .from('event_members')
    .insert({
      event_id: event.id,
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

  await createRemoteEventActivity({
    eventId: event.id,
    actorUserId: input.ownerUserId,
    action: 'event_created',
    targetType: 'event',
    targetId: event.id,
    metadata: { name: input.name },
  });

  return { remoteEventId: event.id as string, remoteOwnerEventMemberId: member.id as string };
}

export async function createRemoteEventInvite(input: EventInvite) {
  if (!supabase || !input.remoteEventId) {
    return null;
  }
  const { data, error } = await supabase
    .from('event_invites')
    .insert({
      event_id: input.remoteEventId,
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

export async function updateRemoteEventInvite(invite: EventInvite, status: EventInvite['status'], actorUserId?: string | null) {
  if (!supabase || !invite.remoteId) {
    return;
  }
  const respondedAt = new Date().toISOString();
  const { error } = await supabase
    .from('event_invites')
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

export async function createRemoteSharedEventMember(member: SharedEventMember) {
  if (!supabase || !member.remoteEventId) {
    return null;
  }
  const { data, error } = await supabase
    .from('event_members')
    .insert({
      event_id: member.remoteEventId,
      type: member.type,
      linked_user_id: member.linkedUserId,
      display_name: member.displayName,
      alias: member.alias,
      email: member.email,
      phone: member.phone,
      notes: member.notes,
      created_by_user_id: member.createdByUserId,
      status: member.status,
      merged_into_event_member_id: member.mergedIntoEventMemberId,
    })
    .select('id')
    .single();
  if (error) {
    throw error;
  }
  return data.id as string;
}

export async function createRemoteEventExpense(expense: SharedExpense) {
  if (!supabase) {
    return null;
  }
  const { data, error } = await supabase
    .from('event_expenses')
    .insert({
      event_id: expense.eventId,
      creator_user_id: expense.creatorUserId,
      payer_event_member_id: expense.payerId,
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

export async function createRemoteEventDebt(debt: EventDebt) {
  if (!supabase || !debt.remoteEventId) {
    return null;
  }
  const { data, error } = await supabase
    .from('event_debts')
    .insert({
      event_id: debt.remoteEventId,
      creator_user_id: debt.creatorUserId,
      debtor_event_member_id: debt.debtorEventMemberId,
      creditor_event_member_id: debt.creditorEventMemberId,
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

export async function createRemoteEventClaim(claim: EventMemberClaim) {
  if (!supabase || !claim.remoteEventId) {
    return null;
  }
  const { data, error } = await supabase
    .from('event_member_claims')
    .insert({
      event_id: claim.remoteEventId,
      event_member_id: claim.remoteEventMemberId ?? claim.eventMemberId,
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

export async function createRemoteEventVerificationResponse(response: EventVerificationResponse) {
  if (!supabase || !response.remoteEventId) {
    return null;
  }
  const { data, error } = await supabase
    .from('event_verification_responses')
    .upsert({
      event_id: response.remoteEventId,
      target_type: response.targetType,
      target_id: response.remoteTargetId ?? response.targetId,
      event_member_id: response.eventMemberId,
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

export async function createRemoteEventActivity(input: {
  eventId: string;
  actorUserId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
}) {
  if (!supabase) {
    return null;
  }
  const { error } = await supabase.from('event_activity_logs').insert({
    event_id: input.eventId,
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
    .from('event_invites')
    .select('*')
    .or(`invited_user_id.eq.${input.userId},inviter_user_id.eq.${input.userId}${emailClause}`)
    .order('updated_at', { ascending: false });
  if (inviteError) {
    throw inviteError;
  }

  const { data: participants, error: participantError } = await supabase
    .from('event_participants')
    .select('*')
    .eq('user_id', input.userId)
    .order('updated_at', { ascending: false });
  if (participantError) {
    throw participantError;
  }

  const eventIds = Array.from(
    new Set([
      ...(participants ?? []).map((row) => row.event_id),
      ...(invites ?? []).map((row) => row.event_id),
    ]),
  );

  if (eventIds.length === 0) {
    return { events: [], participants: participants ?? [], invites: invites ?? [], members: [], expenses: [], splits: [], debts: [], claims: [], verifications: [], warnings: [], activity: [] };
  }

  const [events, members, expenses, splits, debts, claims, verifications, warnings, activity] = await Promise.all([
    supabase.from('events').select('*').in('id', eventIds),
    supabase.from('event_members').select('*').in('event_id', eventIds),
    supabase.from('event_expenses').select('*').in('event_id', eventIds),
    supabase.from('event_expense_splits').select('*, event_expenses!inner(event_id)').in('event_expenses.event_id', eventIds),
    supabase.from('event_debts').select('*').in('event_id', eventIds),
    supabase.from('event_member_claims').select('*').in('event_id', eventIds),
    supabase.from('event_verification_responses').select('*').in('event_id', eventIds),
    supabase.from('event_duplicate_warnings').select('*').in('event_id', eventIds),
    supabase.from('event_activity_logs').select('*').in('event_id', eventIds).order('created_at', { ascending: false }),
  ]);

  for (const result of [events, members, expenses, splits, debts, claims, verifications, warnings, activity]) {
    if (result.error) {
      throw result.error;
    }
  }

  return {
    events: events.data ?? [],
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
