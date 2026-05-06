import { supabase } from '@/src/services/supabase';
import type { Debt, DebtVerification, LinkRequest, Member, SuggestedDebtChange } from '@/src/types/models';

export async function createRemoteLinkRequest(input: {
  requesterUserId: string;
  targetUserId?: string | null;
  targetEmail?: string | null;
  targetPhone?: string | null;
  requesterMemberId: string;
  requesterLabel: string;
  message?: string | null;
}) {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('link_requests')
    .insert({
      requester_user_id: input.requesterUserId,
      target_user_id: input.targetUserId ?? null,
      target_email: input.targetEmail ?? null,
      target_phone: input.targetPhone ?? null,
      requester_member_local_or_remote_id: input.requesterMemberId,
      requester_label: input.requesterLabel,
      message: input.message ?? null,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

export async function updateRemoteLinkRequest(
  linkRequest: LinkRequest,
  status: LinkRequest['status'],
  actorUserId?: string | null,
) {
  if (!supabase || !linkRequest.remoteId) {
    return;
  }

  const { error } = await supabase
    .from('link_requests')
    .update({
      status,
      target_user_id: status === 'accepted' ? actorUserId ?? linkRequest.targetUserId : linkRequest.targetUserId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', linkRequest.remoteId);

  if (error) {
    throw error;
  }
}

export async function createRemoteDebtVerification(input: {
  debt: Debt;
  member: Member;
  requesterUserId: string;
  responderUserId: string;
  sharedNotes?: string | null;
}) {
  if (!supabase) {
    return null;
  }

  const { data: remoteDebt, error: debtError } = await supabase
    .from('shared_debt_records')
    .insert({
      creator_user_id: input.requesterUserId,
      involved_user_id: input.responderUserId,
      local_member_reference: input.member.id,
      amount: input.debt.amount,
      currency: input.debt.currency,
      title: input.debt.title,
      notes_visible_to_other_user: input.sharedNotes ?? input.debt.sharedNotes ?? input.debt.notes,
      debt_date: input.debt.debtDate,
      due_date: input.debt.dueDate,
      direction: input.debt.direction,
      visibility: 'shared_with_involved_member',
      verification_status: 'pending',
      settlement_status: input.debt.status,
    })
    .select('id')
    .single();

  if (debtError) {
    throw debtError;
  }

  const { data: verification, error: verificationError } = await supabase
    .from('debt_verifications')
    .insert({
      debt_id: remoteDebt.id,
      requester_user_id: input.requesterUserId,
      responder_user_id: input.responderUserId,
      status: 'pending',
      requested_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (verificationError) {
    throw verificationError;
  }

  return {
    remoteDebtId: remoteDebt.id as string,
    remoteVerificationId: verification.id as string,
  };
}

export async function respondRemoteDebtVerification(input: {
  verification: DebtVerification;
  status: Extract<DebtVerification['status'], 'verified' | 'rejected'>;
  rejectionReason?: string | null;
  suggestedChange?: SuggestedDebtChange | null;
}) {
  if (!supabase || !input.verification.remoteId) {
    return;
  }

  const respondedAt = new Date().toISOString();
  const { error: verificationError } = await supabase
    .from('debt_verifications')
    .update({
      status: input.status,
      rejection_reason: input.status === 'rejected' ? input.rejectionReason ?? null : null,
      suggested_change: input.status === 'rejected' ? input.suggestedChange ?? null : null,
      responded_at: respondedAt,
      updated_at: respondedAt,
    })
    .eq('id', input.verification.remoteId);

  if (verificationError) {
    throw verificationError;
  }

  if (input.verification.remoteDebtId) {
    const { error: debtError } = await supabase
      .from('shared_debt_records')
      .update({ verification_status: input.status, updated_at: respondedAt })
      .eq('id', input.verification.remoteDebtId);

    if (debtError) {
      throw debtError;
    }
  }
}

export async function fetchRemoteStage2Records(input: { userId: string; email?: string | null }) {
  if (!supabase) {
    return null;
  }

  const emailClause = input.email ? `,target_email.eq.${input.email}` : '';
  const { data: linkRequests, error: linkError } = await supabase
    .from('link_requests')
    .select('*')
    .or(`requester_user_id.eq.${input.userId},target_user_id.eq.${input.userId}${emailClause}`)
    .order('updated_at', { ascending: false });
  if (linkError) {
    throw linkError;
  }

  const { data: sharedDebts, error: debtError } = await supabase
    .from('shared_debt_records')
    .select('*')
    .or(`creator_user_id.eq.${input.userId},involved_user_id.eq.${input.userId}`)
    .order('updated_at', { ascending: false });
  if (debtError) {
    throw debtError;
  }

  const { data: verifications, error: verificationError } = await supabase
    .from('debt_verifications')
    .select('*')
    .or(`requester_user_id.eq.${input.userId},responder_user_id.eq.${input.userId}`)
    .order('updated_at', { ascending: false });
  if (verificationError) {
    throw verificationError;
  }

  return { linkRequests, sharedDebts, verifications };
}
