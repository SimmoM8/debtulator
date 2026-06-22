import { supabase } from '@/src/services/supabase';
import type {
  Debt,
  DebtChangeSummary,
  DebtVerification,
  DebtVerificationRequestType,
  LinkRequest,
  Member,
  SuggestedDebtChange,
} from '@/src/types/models';

export async function createRemoteLinkRequest(input: {
  requesterUserId: string;
  targetUserId?: string | null;
  targetEmail?: string | null;
  targetPhone?: string | null;
  requesterMemberId: string;
  requesterDisplayName: string;
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
      // A database trigger replaces this with the authoritative requester
      // profile name. The value remains a fallback for incomplete profiles.
      requester_label: input.requesterDisplayName,
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

export async function hasAcceptedMemberLink(targetUserId: string) {
  if (!supabase) {
    return false;
  }

  const { data, error: rpcError } = await supabase.rpc('has_accepted_member_link', {
    p_other_user_id: targetUserId,
  });
  if (!rpcError && data === true) {
    return true;
  }

  // Keep re-linking functional while a newly added RPC is still propagating,
  // and independently verify the relationship using rows already visible to
  // this user under link_requests RLS.
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    throw authError ?? new Error('Sign in before restoring a member link.');
  }
  const callerId = authData.user.id;
  const { data: acceptedRequests, error: requestError } = await supabase
    .from('link_requests')
    .select('requester_user_id, target_user_id')
    .eq('status', 'accepted')
    .or(`requester_user_id.eq.${callerId},target_user_id.eq.${callerId}`);
  if (requestError) {
    throw rpcError ?? requestError;
  }
  return (acceptedRequests ?? []).some(
    (request) =>
      (request.requester_user_id === callerId && request.target_user_id === targetUserId) ||
      (request.target_user_id === callerId && request.requester_user_id === targetUserId),
  );
}

export async function respondToRemoteLinkRequest(
  linkRequest: LinkRequest,
  status: Extract<LinkRequest['status'], 'accepted' | 'rejected'>,
) {
  if (!supabase || !linkRequest.remoteId) {
    return;
  }

  const { error } = await supabase.rpc('respond_to_member_link_request', {
    p_request_id: linkRequest.remoteId,
    p_status: status,
  });

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
  requestType?: DebtVerificationRequestType;
  changeSummary?: DebtChangeSummary | null;
}) {
  if (!supabase) {
    return null;
  }

  const requestType = input.requestType ?? 'creation';
  const replacesParticipant =
    requestType === 'creation' &&
    Boolean(input.debt.remoteId) &&
    Boolean(input.changeSummary?.changedFields.includes('member'));
  const debtPayload = {
      creator_user_id: input.requesterUserId,
      involved_user_id: input.responderUserId,
      local_member_reference: input.member.remoteId ?? input.member.id,
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
    };
  const shouldUpdateExistingDebt =
    Boolean(input.debt.remoteId) && requestType === 'creation' && !replacesParticipant;
  if (replacesParticipant && input.debt.remoteId) {
    const { error: archiveError } = await supabase
      .from('shared_debt_records')
      .update({
        settlement_status: 'archived',
        verification_status: 'cancelled',
      })
      .eq('id', input.debt.remoteId);
    if (archiveError) {
      throw archiveError;
    }
  }
  const debtQuery = shouldUpdateExistingDebt
    ? supabase
        .from('shared_debt_records')
        .update(debtPayload)
        .eq('id', input.debt.remoteId)
    : requestType === 'creation'
      ? supabase.from('shared_debt_records').insert(debtPayload)
      : null;
  const remoteDebt = debtQuery
    ? await debtQuery.select('id').single()
    : { data: { id: input.debt.remoteId }, error: null };
  const { data: remoteDebtData, error: debtError } = remoteDebt;

  if (debtError) {
    throw debtError;
  }
  if (!remoteDebtData?.id) {
    throw new Error('Shared debt could not be prepared for confirmation.');
  }

  const { data: verification, error: verificationError } = await supabase.rpc(
    'request_debt_verification',
    {
      p_debt_id: remoteDebtData.id,
      p_responder_user_id: input.responderUserId,
      p_request_type: requestType,
      p_change_summary: input.changeSummary ?? null,
    },
  );

  if (verificationError) {
    if (requestType === 'creation' && !shouldUpdateExistingDebt) {
      await supabase
        .from('shared_debt_records')
        .update({
          settlement_status: 'archived',
          verification_status: 'cancelled',
        })
        .eq('id', remoteDebtData.id);
    }
    throw verificationError;
  }

  return {
    remoteDebtId: remoteDebtData.id as string,
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

  const { error: verificationError } = await supabase.rpc(
    'respond_to_debt_verification',
    {
      p_verification_id: input.verification.remoteId,
      p_status: input.status,
      p_rejection_reason:
        input.status === 'rejected' ? input.rejectionReason ?? null : null,
      p_suggested_change:
        input.status === 'rejected' ? input.suggestedChange ?? null : null,
    },
  );

  if (verificationError) {
    throw verificationError;
  }

}

export async function sendRemoteDebtConfirmationReminder(input: {
  verificationRemoteId: string;
}) {
  if (!supabase) {
    return false;
  }

  const { error } = await supabase.rpc('send_debt_confirmation_reminder', {
    p_verification_id: input.verificationRemoteId,
  });

  if (error) {
    throw error;
  }

  return true;
}

export async function respondRemotePaymentConfirmation(input: {
  paymentRemoteId: string;
  status: 'confirmed' | 'rejected';
}) {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.rpc('respond_to_payment_confirmation', {
    p_payment_id: input.paymentRemoteId,
    p_status: input.status,
  });

  if (error) {
    throw error;
  }
}

export async function sendRemotePaymentConfirmationReminder(input: {
  paymentRemoteId: string;
}) {
  if (!supabase) {
    return false;
  }

  const { error } = await supabase.rpc('send_payment_confirmation_reminder', {
    p_payment_id: input.paymentRemoteId,
  });
  if (error) {
    throw error;
  }
  return true;
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

  const { data: payments, error: paymentError } = await supabase
    .from('payments')
    .select('*')
    .is('group_id', null)
    .or(`payer_user_id.eq.${input.userId},payee_user_id.eq.${input.userId}`)
    .order('updated_at', { ascending: false });
  if (paymentError) {
    throw paymentError;
  }

  const paymentIds = (payments ?? []).map((payment) => payment.id as string);
  const settlementLinesResult = paymentIds.length
    ? await supabase
        .from('settlement_lines')
        .select('*')
        .in('payment_id', paymentIds)
        .order('updated_at', { ascending: false })
    : { data: [], error: null };
  if (settlementLinesResult.error) {
    throw settlementLinesResult.error;
  }

  const settlementIds = Array.from(
    new Set(
      (settlementLinesResult.data ?? []).map(
        (line) => line.settlement_id as string,
      ),
    ),
  );
  const settlementsResult = settlementIds.length
    ? await supabase
        .from('settlements')
        .select('*')
        .in('id', settlementIds)
        .order('updated_at', { ascending: false })
    : { data: [], error: null };
  if (settlementsResult.error) {
    throw settlementsResult.error;
  }

  const { data: notifications, error: notificationError } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', input.userId)
    .order('created_at', { ascending: false });
  if (notificationError) {
    throw notificationError;
  }

  return {
    linkRequests,
    sharedDebts,
    verifications,
    payments,
    settlements: settlementsResult.data ?? [],
    settlementLines: settlementLinesResult.data ?? [],
    notifications,
  };
}
