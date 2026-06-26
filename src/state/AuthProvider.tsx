import type { Session, User } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { DEFAULT_BASE_CURRENCY } from '@/src/constants/currencies';
import { isSupabaseConfigured, supabase } from '@/src/services/supabase';
import { getAcceptedLinkedMemberProfile } from '@/src/services/profileSearch';
import {
  counterRemoteDebtVerification,
  createRemoteDebtVerification,
  fetchRemoteStage2Records,
} from '@/src/services/stage2Sync';
import { canRetrySyncEntry } from '@/src/services/stage6Sync';
import { runSyncEngine } from '@/src/services/sync/syncEngine';
import { addTelemetryBreadcrumb, captureTelemetryException, trackFirstSuccess, trackTelemetryEvent } from '@/src/services/telemetry';
import { useAppData } from '@/src/state/AppDataProvider';
import type {
  CurrencyCode,
  Debt,
  DebtVerification,
  LinkRequest,
  NotificationType,
  Payment,
  Settlement,
  SettlementLine,
  UserProfile,
} from '@/src/types/models';
import { nowIso } from '@/src/utils/id';

type Identity = {
  localUserId: 'me';
  authenticatedUserId: string | null;
  displayName: string;
  email: string | null;
  baseCurrency: CurrencyCode;
  profile: UserProfile | null;
};

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  identity: Identity;
  signUp: (input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string | null;
    country?: string | null;
    baseCurrency?: CurrencyCode;
  }) => Promise<void>;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  eraseLocalSession: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (input: Partial<Pick<UserProfile, 'firstName' | 'lastName' | 'displayName' | 'phone' | 'country' | 'baseCurrency'>>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSync: () => Promise<void>;
};

type RemoteNotificationRow = {
  id: string;
  user_id: string | null;
  type: NotificationType;
  title: string;
  body: string;
  target_type: string | null;
  target_id: string | null;
  read_at: string | null;
  metadata: unknown;
  created_at: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const data = useAppData();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const publishingPendingDebtIdsRef = useRef(new Set<string>());
  const dataRef = useRef(data);
  const realtimeNotificationIdsRef = useRef(new Set<string>());

  const user = session?.user ?? null;
  const localProfile = user ? data.profiles.find((profile) => profile.id === user.id) ?? null : null;
  const setLedgerUserId = data.setLedgerUserId;

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    setLedgerUserId(user?.id ?? null);
  }, [setLedgerUserId, user?.id]);

  const upsertLocalAndRemoteProfile = useCallback(
    async (input: {
      userId: string;
      firstName?: string | null;
      lastName?: string | null;
      displayName: string;
      email?: string | null;
      phone?: string | null;
      country?: string | null;
      baseCurrency?: CurrencyCode;
    }) => {
      const timestamp = nowIso();
      const existing = data.profiles.find((profile) => profile.id === input.userId);
      const profile: UserProfile = {
        id: input.userId,
        firstName: input.firstName === undefined ? existing?.firstName ?? null : input.firstName,
        lastName: input.lastName === undefined ? existing?.lastName ?? null : input.lastName,
        displayName: input.displayName.trim() || input.email || 'Debtulator user',
        email: input.email ?? existing?.email ?? null,
        phone: input.phone === undefined ? existing?.phone ?? null : input.phone,
        country: input.country === undefined ? existing?.country ?? null : input.country,
        avatarUrl: existing?.avatarUrl ?? null,
        baseCurrency: input.baseCurrency ?? existing?.baseCurrency ?? data.settings.baseCurrency,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
      };

      await data.upsertProfile(profile);
      await data.updateSettings({ baseCurrency: profile.baseCurrency });

      if (supabase) {
        const { error } = await supabase.from('profiles').upsert({
          id: profile.id,
          first_name: profile.firstName,
          last_name: profile.lastName,
          display_name: profile.displayName,
          email: profile.email,
          phone: profile.phone,
          country: profile.country,
          base_currency: profile.baseCurrency,
          updated_at: profile.updatedAt,
        });
        if (error) {
          throw error;
        }
      }
    },
    [data],
  );

  const refreshProfile = useCallback(async () => {
    if (!supabase || !user) {
      return;
    }

    const { data: remoteProfile, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, display_name, email, phone, country, avatar_url, base_currency, created_at, updated_at')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (remoteProfile) {
      await data.upsertProfile({
        id: remoteProfile.id,
        firstName: remoteProfile.first_name,
        lastName: remoteProfile.last_name,
        displayName: remoteProfile.display_name,
        email: remoteProfile.email,
        phone: remoteProfile.phone,
        country: remoteProfile.country,
        avatarUrl: remoteProfile.avatar_url,
        baseCurrency: remoteProfile.base_currency,
        createdAt: remoteProfile.created_at,
        updatedAt: remoteProfile.updated_at,
      });
    } else {
      await upsertLocalAndRemoteProfile({
        userId: user.id,
        firstName: user.user_metadata?.first_name ?? null,
        lastName: user.user_metadata?.last_name ?? null,
        displayName: user.user_metadata?.display_name ?? user.email ?? 'Debtulator user',
        email: user.email ?? null,
        phone: user.user_metadata?.phone ?? null,
        country: user.user_metadata?.country ?? null,
        baseCurrency: data.settings.baseCurrency,
      });
    }
  }, [data, upsertLocalAndRemoteProfile, user]);

  const syncStage2Records = useCallback(async () => {
    if (!user) {
      return;
    }

    const remote = await fetchRemoteStage2Records({ userId: user.id, email: user.email ?? null });
    if (!remote) {
      return;
    }

    let deliveredPendingProposal = false;
    for (const pendingCounter of data.debtVerifications.filter(
      (verification) =>
        verification.requesterUserId === user.id &&
        verification.status === 'pending' &&
        !verification.remoteId &&
        Boolean(verification.supersedesVerificationId),
    )) {
      const superseded = data.debtVerifications.find(
        (verification) => verification.id === pendingCounter.supersedesVerificationId,
      );
      if (!superseded?.remoteId || !pendingCounter.changeSummary) continue;
      try {
        const remoteCounter = await counterRemoteDebtVerification({
          verification: superseded,
          changeSummary: pendingCounter.changeSummary,
        });
        if (remoteCounter) {
          await data.upsertDebtVerification({
            ...pendingCounter,
            remoteId: remoteCounter.id,
            remoteDebtId: remoteCounter.debt_id,
            syncStatus: 'synced',
          });
          deliveredPendingProposal = true;
        }
      } catch {
        // A successful earlier RPC can be reconciled from the remote rows below.
      }
    }

    for (const pendingProposal of data.debtVerifications.filter(
      (verification) =>
        verification.requesterUserId === user.id &&
        verification.status === 'pending' &&
        !verification.remoteId &&
        !verification.supersedesVerificationId,
    )) {
      const debt = data.debts.find((item) => item.id === pendingProposal.debtId);
      const member = debt
        ? data.members.find((item) => item.id === debt.memberId)
        : undefined;
      if (!debt || !member?.linkedUserId) continue;
      const matchingRemoteDebt = debt.remoteId
        ? (remote.sharedDebts ?? []).find((row) => row.id === debt.remoteId)
        : (remote.sharedDebts ?? []).find(
            (row) =>
              row.creator_user_id === user.id &&
              row.involved_user_id === pendingProposal.responderUserId &&
              row.local_member_reference === (member.remoteId ?? member.id) &&
              Number(row.amount) === debt.amount &&
              row.currency === debt.currency &&
              row.debt_date === debt.debtDate &&
              row.title === debt.title,
          );
      const matchingRemoteVerification = (remote.verifications ?? []).find(
        (row) =>
          row.requester_user_id === user.id &&
          row.responder_user_id === pendingProposal.responderUserId &&
          row.request_type === pendingProposal.requestType &&
          row.status === 'pending' &&
          row.debt_id === matchingRemoteDebt?.id &&
          JSON.stringify(row.change_summary ?? null) ===
            JSON.stringify(pendingProposal.changeSummary ?? null),
      );
      if (matchingRemoteVerification) {
        await data.upsertDebt({
          ...debt,
          remoteId: matchingRemoteVerification.debt_id,
          syncStatus: 'synced',
        });
        await data.upsertDebtVerification({
          ...pendingProposal,
          remoteId: matchingRemoteVerification.id,
          remoteDebtId: matchingRemoteVerification.debt_id,
          syncStatus: 'synced',
        });
        deliveredPendingProposal = true;
        continue;
      }
      try {
        const result = await createRemoteDebtVerification({
          debt,
          member,
          requesterUserId: user.id,
          responderUserId: pendingProposal.responderUserId,
          sharedNotes: debt.sharedNotes ?? debt.notes,
          requestType: pendingProposal.requestType,
          changeSummary: pendingProposal.changeSummary,
        });
        if (result) {
          await data.upsertDebt({
            ...debt,
            remoteId: result.remoteDebtId,
            syncStatus: 'synced',
          });
          await data.upsertDebtVerification({
            ...pendingProposal,
            remoteId: result.remoteVerificationId,
            remoteDebtId: result.remoteDebtId,
            syncStatus: 'synced',
          });
          deliveredPendingProposal = true;
        }
      } catch {
        // Keep the optimistic local proposal pending for the next sync pass.
      }
    }
    if (deliveredPendingProposal) {
      await data.refresh();
      return;
    }

    const linkedUserIds = new Set(
      data.members.flatMap((member) => (member.linkedUserId ? [member.linkedUserId] : [])),
    );
    const publishPendingDebtConfirmations = async (
      member: (typeof data.members)[number],
      responderUserId: string,
      pendingSince: string,
    ) => {
      const pendingDebts = data.debts.filter(
        (debt) =>
          debt.memberId === member.id &&
          !debt.remoteId &&
          (debt.verificationStatus === 'pending' ||
            (debt.verificationStatus === 'local_only' &&
              debt.createdAt >= pendingSince)),
      );
      for (const debt of pendingDebts) {
        if (publishingPendingDebtIdsRef.current.has(debt.id)) {
          continue;
        }
        publishingPendingDebtIdsRef.current.add(debt.id);
        try {
          const existingVerification = data.debtVerifications.find(
            (verification) =>
              verification.debtId === debt.id &&
              verification.status === 'pending' &&
              !verification.remoteId,
          );
          const local = existingVerification
            ? { debt, verification: existingVerification }
            : await data.requestDebtVerification(debt.id, {
                requesterUserId: user.id,
                responderUserId,
                sharedNotes: debt.sharedNotes ?? debt.notes,
                requestType: 'creation',
                changeSummary: {
                  changedFields: ['amount', 'direction', 'dueDate'],
                  previous: { amount: null, direction: null, dueDate: null },
                  proposed: {
                    amount: debt.amount,
                    direction: debt.direction,
                    dueDate: debt.dueDate,
                  },
                },
              });
          const linkedMember = {
            ...member,
            linkedUserId: responderUserId,
            linkStatus: 'linked' as const,
          };
          const remoteVerification = await createRemoteDebtVerification({
            debt: local.debt,
            member: linkedMember,
            requesterUserId: user.id,
            responderUserId,
            sharedNotes: local.debt.sharedNotes ?? local.debt.notes,
            requestType: 'creation',
            changeSummary: local.verification.changeSummary,
          });
          if (!remoteVerification) {
            throw new Error('Cloud confirmation is unavailable.');
          }
          await data.upsertDebt({
            ...local.debt,
            remoteId: remoteVerification.remoteDebtId,
            syncStatus: 'synced',
          });
          await data.upsertDebtVerification({
            ...local.verification,
            remoteId: remoteVerification.remoteVerificationId,
            remoteDebtId: remoteVerification.remoteDebtId,
            syncStatus: 'synced',
          });
        } finally {
          publishingPendingDebtIdsRef.current.delete(debt.id);
        }
      }
    };
    for (const row of remote.linkRequests ?? []) {
      const acceptedLinkedUserId =
        row.status === 'accepted'
          ? row.requester_user_id === user.id
            ? row.target_user_id
            : row.requester_user_id
          : null;
      const acceptedProfile = acceptedLinkedUserId
        ? await getAcceptedLinkedMemberProfile(acceptedLinkedUserId)
        : null;
      const existing = data.linkRequests.find((request) => request.remoteId === row.id);
      const linkRequest: LinkRequest = {
        id: existing?.id ?? `link_remote_${row.id}`,
        remoteId: row.id,
        requesterUserId: row.requester_user_id,
        targetUserId: row.target_user_id,
        targetEmail: row.target_email,
        targetPhone: row.target_phone,
        requesterMemberId: row.requester_member_local_or_remote_id,
        requesterLabel: row.requester_label,
        status: row.status,
        message: row.message,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        syncStatus: 'synced',
      };
      await data.upsertLinkRequest(linkRequest);
      if (row.requester_user_id === user.id) {
        const member = data.members.find((item) => item.id === row.requester_member_local_or_remote_id);
        if (member && row.status !== 'pending') {
          await data.updateMember(member.id, {
            linkStatus:
              row.status === 'accepted'
                ? 'linked'
                : row.status === 'rejected'
                  ? 'link_rejected'
                  : row.status === 'cancelled'
                    ? 'unlinked'
                    : member.linkStatus,
            linkedUserId: row.status === 'accepted' ? row.target_user_id : member.linkedUserId,
            linkedProfileDisplayName:
              row.status === 'accepted'
                ? acceptedProfile?.displayName ?? member.linkedProfileDisplayName
                : member.linkedProfileDisplayName,
            linkedProfileEmail:
              row.status === 'accepted'
                ? acceptedProfile?.email ?? row.target_email
                : member.linkedProfileEmail,
            linkedProfilePhone: row.status === 'accepted' ? row.target_phone : member.linkedProfilePhone,
          });
          if (row.status === 'accepted' && row.target_user_id) {
            const pendingSince = (remote.linkRequests ?? [])
              .filter(
                (request) =>
                  request.requester_user_id === user.id &&
                  request.requester_member_local_or_remote_id === member.id,
              )
              .reduce(
                (earliest, request) =>
                  request.created_at < earliest ? request.created_at : earliest,
                row.created_at,
              );
            await publishPendingDebtConfirmations(
              member,
              row.target_user_id,
              pendingSince,
            );
          }
        }
      } else if (
        row.status === 'accepted' &&
        row.target_user_id === user.id &&
        !linkedUserIds.has(row.requester_user_id)
      ) {
        await data.createMember({
          displayName: acceptedProfile?.displayName ?? row.requester_label,
          email: acceptedProfile?.email,
          linkedUserId: row.requester_user_id,
          linkStatus: 'linked',
          linkedProfileDisplayName: acceptedProfile?.displayName ?? row.requester_label,
          linkedProfileEmail: acceptedProfile?.email,
        });
        linkedUserIds.add(row.requester_user_id);
      } else if (row.status === 'accepted' && row.target_user_id === user.id) {
        const reciprocalMember = data.members.find(
          (member) => member.linkedUserId === row.requester_user_id,
        );
        if (reciprocalMember) {
          const autoNamed =
            !reciprocalMember.linkedProfileDisplayName ||
            reciprocalMember.displayName === reciprocalMember.linkedProfileDisplayName;
          await data.updateMember(reciprocalMember.id, {
            displayName:
              autoNamed
                ? acceptedProfile?.displayName ?? row.requester_label
                : reciprocalMember.displayName,
            email: reciprocalMember.email ?? acceptedProfile?.email,
            linkedProfileDisplayName: acceptedProfile?.displayName ?? row.requester_label,
            linkedProfileEmail: acceptedProfile?.email ?? reciprocalMember.linkedProfileEmail,
          });
        }
      }
    }

    const syncedDebtsByRemoteId = new Map(
      data.debts
        .filter((debt) => debt.remoteId)
        .map((debt) => [debt.remoteId as string, debt]),
    );
    for (const row of remote.sharedDebts ?? []) {
      const existingDebt = data.debts.find((debt) => debt.remoteId === row.id);
      const preserveRequesterProposal = Boolean(
        existingDebt &&
          (remote.verifications ?? []).some(
            (verification) =>
              verification.debt_id === row.id &&
              verification.request_type === 'amendment' &&
              verification.status === 'pending' &&
              verification.requester_user_id === user.id,
          ),
      );
      const otherUserId = row.creator_user_id === user.id ? row.involved_user_id : row.creator_user_id;
      const existingMember = data.members.find((member) => member.linkedUserId === otherUserId);
      const member =
        existingMember ??
        (await data.createMember({
          displayName: 'Linked Debtulator user',
          linkedUserId: otherUserId,
          linkStatus: 'linked',
          linkedProfileDisplayName: 'Linked Debtulator user',
        }));
      const remoteDirection =
        row.creator_user_id === user.id
          ? row.direction
          : row.direction === 'they_owe_me'
            ? 'i_owe_them'
            : 'they_owe_me';
      const debt: Debt = {
        id: existingDebt?.id ?? `debt_remote_${row.id}`,
        type: 'simple',
        memberId: member.id,
        remoteId: row.id,
        verificationRequestId: existingDebt?.verificationRequestId ?? null,
        visibility: row.visibility,
        syncStatus: 'synced',
        direction:
          preserveRequesterProposal && existingDebt
            ? existingDebt.direction
            : remoteDirection,
        amount:
          preserveRequesterProposal && existingDebt
            ? existingDebt.amount
            : Number(row.amount),
        currency: row.currency,
        title: row.title,
        notes: existingDebt?.notes ?? null,
        sharedNotes: row.notes_visible_to_other_user,
        debtDate: row.debt_date,
        dueDate:
          preserveRequesterProposal && existingDebt
            ? existingDebt.dueDate
            : row.due_date,
        recurringTemplateId: null,
        tags: existingDebt?.tags ?? [],
        groupId: null,
        status: row.settlement_status,
        verificationStatus: row.verification_status,
        verifiedByUserId: existingDebt?.verifiedByUserId ?? null,
        verifiedAt: existingDebt?.verifiedAt ?? null,
        rejectedByUserId: existingDebt?.rejectedByUserId ?? null,
        rejectedAt: existingDebt?.rejectedAt ?? null,
        rejectionReason: existingDebt?.rejectionReason ?? null,
        disputeReason: existingDebt?.disputeReason ?? null,
        resolutionNote: existingDebt?.resolutionNote ?? null,
        suggestedChange: existingDebt?.suggestedChange ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
      await data.upsertDebt(debt);
      syncedDebtsByRemoteId.set(row.id, debt);
    }

    for (const row of remote.verifications ?? []) {
      const supersededLocal = data.debtVerifications.find(
        (verification) => verification.remoteId === row.supersedes_verification_id,
      );
      const existing = data.debtVerifications.find(
        (verification) =>
          verification.remoteId === row.id ||
          (!verification.remoteId &&
            verification.supersedesVerificationId === supersededLocal?.id),
      );
      const hasUndeliveredLocalCounter = Boolean(
        existing &&
          data.debtVerifications.some(
            (verification) =>
              verification.supersedesVerificationId === existing.id &&
              verification.status === 'pending' &&
              !verification.remoteId,
          ),
      );
      const debt = syncedDebtsByRemoteId.get(row.debt_id);
      const verification: DebtVerification = {
        id: existing?.id ?? `verify_remote_${row.id}`,
        remoteId: row.id,
        debtId: debt?.id ?? `debt_remote_${row.debt_id}`,
        remoteDebtId: row.debt_id,
        requesterUserId: row.requester_user_id,
        responderUserId: row.responder_user_id,
        requestType: row.request_type ?? 'creation',
        changeSummary: row.change_summary ?? null,
        status: hasUndeliveredLocalCounter ? existing?.status ?? row.status : row.status,
        rejectionReason: row.rejection_reason,
        suggestedChange: row.suggested_change,
        supersedesVerificationId: supersededLocal?.id ?? null,
        requestedAt: row.requested_at,
        respondedAt: row.responded_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        syncStatus: 'synced',
      };
      await data.upsertDebtVerification(verification);
      const alreadyNotified = data.notifications.some(
        (notification) =>
          notification.type === 'verification_request' &&
          notification.metadata.verificationRemoteId === row.id,
      );
      const hasRemoteNotification = (remote.notifications ?? []).some(
        (notification) =>
          notification.metadata?.verificationRemoteId === row.id,
      );
      if (
        !existing &&
        !alreadyNotified &&
        !hasRemoteNotification &&
        row.status === 'pending' &&
        row.responder_user_id === user.id
      ) {
        await data.createNotification({
          userId: user.id,
          type: 'verification_request',
          title: row.request_type === 'amendment' ? 'Debt changes need review' : 'New debt needs confirmation',
          body: debt?.title ?? 'Open Requests to review the shared debt.',
          targetType: 'debt',
          targetId: debt?.id ?? null,
          metadata: {
            verificationId: verification.id,
            verificationRemoteId: row.id,
            requestType: verification.requestType,
          },
        });
      }
    }

    const remoteLinesByPaymentId = new Map<string, (typeof remote.settlementLines)[number]>();
    for (const row of remote.settlementLines ?? []) {
      if (row.payment_id) {
        remoteLinesByPaymentId.set(row.payment_id, row);
      }
    }

    const syncedPaymentsByRemoteId = new Map(
      data.payments
        .filter((payment) => payment.remoteId)
        .map((payment) => [payment.remoteId as string, payment]),
    );
    for (const row of remote.payments ?? []) {
      const existing =
        syncedPaymentsByRemoteId.get(row.id) ??
        data.payments.find(
          (payment) =>
            row.client_generated_id &&
            (payment.localId === row.client_generated_id ||
              payment.id === row.client_generated_id),
        );
      const sourceDebt = syncedDebtsByRemoteId.get(
        remoteLinesByPaymentId.get(row.id)?.source_record_id ?? '',
      );
      const payment: Payment = {
        id: existing?.id ?? `payment_remote_${row.id}`,
        localId: existing?.localId ?? row.client_generated_id ?? null,
        remoteId: row.id,
        createdByUserId: row.created_by_user_id ?? null,
        payerUserId: row.payer_user_id ?? null,
        payeeUserId: row.payee_user_id ?? null,
        payerMemberId: null,
        payeeMemberId: null,
        payerGroupMemberId: null,
        payeeGroupMemberId: null,
        groupId: null,
        relatedMemberId: sourceDebt?.memberId ?? existing?.relatedMemberId ?? null,
        amount: Number(row.amount),
        currency: row.currency,
        paymentDate: row.payment_date,
        notes: row.notes ?? null,
        status: row.status,
        confirmationStatus: row.confirmation_status,
        visibility: row.visibility,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        archivedAt: row.archived_at ?? null,
        syncStatus: 'synced',
      };
      await data.upsertPayment(payment);
      syncedPaymentsByRemoteId.set(row.id, payment);
    }

    const syncedSettlementsByRemoteId = new Map(
      data.settlements
        .filter((settlement) => settlement.remoteId)
        .map((settlement) => [settlement.remoteId as string, settlement]),
    );
    for (const row of remote.settlements ?? []) {
      const existing =
        syncedSettlementsByRemoteId.get(row.id) ??
        data.settlements.find(
          (settlement) =>
            row.client_generated_id &&
            (settlement.localId === row.client_generated_id ||
              settlement.id === row.client_generated_id),
        );
      const remoteLine = (remote.settlementLines ?? []).find(
        (line) => line.settlement_id === row.id,
      );
      const sourceDebt = syncedDebtsByRemoteId.get(
        remoteLine?.source_record_id ?? '',
      );
      const settlement: Settlement = {
        id: existing?.id ?? `settlement_remote_${row.id}`,
        localId: existing?.localId ?? row.client_generated_id ?? null,
        remoteId: row.id,
        createdByUserId: row.created_by_user_id ?? null,
        groupId: null,
        memberId: sourceDebt?.memberId ?? existing?.memberId ?? null,
        type: row.type,
        currency: row.currency,
        totalAmount: Number(row.total_amount),
        status: row.status,
        confirmationStatus: row.confirmation_status,
        notes: row.notes ?? null,
        originalCurrency: row.original_currency ?? null,
        originalAmount:
          row.original_amount === null || row.original_amount === undefined
            ? null
            : Number(row.original_amount),
        settlementCurrency: row.settlement_currency ?? null,
        settlementAmount:
          row.settlement_amount === null || row.settlement_amount === undefined
            ? null
            : Number(row.settlement_amount),
        exchangeRateUsed:
          row.exchange_rate_used === null || row.exchange_rate_used === undefined
            ? null
            : Number(row.exchange_rate_used),
        exchangeRateDate: row.exchange_rate_date ?? null,
        conversionNote: row.conversion_note ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        archivedAt: row.archived_at ?? null,
        syncStatus: 'synced',
      };
      await data.upsertSettlement(settlement);
      syncedSettlementsByRemoteId.set(row.id, settlement);
    }

    for (const row of remote.settlementLines ?? []) {
      const settlement = syncedSettlementsByRemoteId.get(row.settlement_id);
      const payment = row.payment_id
        ? syncedPaymentsByRemoteId.get(row.payment_id)
        : null;
      if (!settlement || (row.payment_id && !payment)) {
        continue;
      }
      const existing = data.settlementLines.find(
        (line) =>
          line.remoteId === row.id ||
          (row.client_generated_id && line.id === row.client_generated_id),
      );
      const sourceDebt =
        row.source_record_type === 'simple_debt'
          ? syncedDebtsByRemoteId.get(row.source_record_id)
          : null;
      const line: SettlementLine = {
        id: existing?.id ?? `settlement_line_remote_${row.id}`,
        remoteId: row.id,
        settlementId: settlement.id,
        paymentId: payment?.id ?? null,
        sourceRecordType: row.source_record_type,
        sourceRecordId: sourceDebt?.id ?? row.source_record_id,
        appliedAmount: Number(row.applied_amount),
        currency: row.currency,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        syncStatus: 'synced',
      };
      await data.upsertSettlementLine(line);
    }

    for (const row of remote.notifications ?? []) {
      const alreadyStored = data.notifications.some(
        (notification) => notification.metadata.remoteNotificationId === row.id,
      );
      if (alreadyStored || realtimeNotificationIdsRef.current.has(row.id)) {
        continue;
      }
      const payment =
        row.target_type === 'payment'
          ? syncedPaymentsByRemoteId.get(row.target_id)
          : null;
      const debt =
        row.target_type === 'debt'
          ? syncedDebtsByRemoteId.get(row.target_id)
          : null;
      const targetType = payment ? 'payment' : debt ? 'debt' : null;
      await data.createNotification({
        userId: user.id,
        type: row.type,
        title: row.title,
        body: row.body,
        targetType,
        targetId: payment?.id ?? debt?.id ?? null,
        readAt: row.read_at ?? null,
        metadata: {
          ...(row.metadata && typeof row.metadata === 'object'
            ? row.metadata
            : {}),
          remoteNotificationId: row.id,
        },
      });
      realtimeNotificationIdsRef.current.add(row.id);
    }
  }, [data, user]);

  const runRemoteDataSync = useCallback(async () => {
    if (!user) {
      return;
    }
    addTelemetryBreadcrumb('sync', 'auth_bootstrap_sync_started', { hasUser: true });
    trackTelemetryEvent('auth_bootstrap_sync_started', { hasUser: true });
    try {
      const result = await runSyncEngine({ store: data, userId: user.id, email: user.email ?? null });
      await data.refresh();
      addTelemetryBreadcrumb('sync', 'auth_bootstrap_sync_completed', {
        processed: result.processed,
        succeeded: result.succeeded,
        failed: result.failed,
        conflicts: result.conflicts,
        pulled: result.pulled,
      });
      trackFirstSuccess('sync', { source: 'auth_bootstrap', result: 'success' });
    } catch (error) {
      addTelemetryBreadcrumb('sync', 'auth_bootstrap_sync_failed', { result: 'failure' });
      captureTelemetryException(error, 'auth_bootstrap_sync', { source: 'auth_bootstrap' });
      throw error;
    }
  }, [data, user]);

  const refreshProfileRef = useRef(refreshProfile);
  const syncStage2RecordsRef = useRef(syncStage2Records);
  const runRemoteDataSyncRef = useRef(runRemoteDataSync);
  const bootSyncedUserIdRef = useRef<string | null>(null);
  const handledResetVersionRef = useRef(0);

  useEffect(() => {
    refreshProfileRef.current = refreshProfile;
    syncStage2RecordsRef.current = syncStage2Records;
    runRemoteDataSyncRef.current = runRemoteDataSync;
  }, [refreshProfile, syncStage2Records, runRemoteDataSync]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;
    const timeout = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 6000);

    supabase.auth
      .getSession()
      .then(({ data: result }) => {
        if (mounted) {
          setSession(result.session);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setLoading(false);
        }
      })
      .finally(() => {
        clearTimeout(timeout);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user?.id) {
      bootSyncedUserIdRef.current = null;
      return;
    }
    if (user?.id && data.ready && bootSyncedUserIdRef.current !== user.id) {
      bootSyncedUserIdRef.current = user.id;
      refreshProfileRef.current().catch(() => undefined);
      syncStage2RecordsRef.current().catch(() => undefined);
      runRemoteDataSyncRef.current().catch(() => undefined);
    }
  }, [data.ready, user?.id]);

  useEffect(() => {
    if (!user?.id || !data.ready || data.syncedDataResetVersion === 0 ||
        handledResetVersionRef.current === data.syncedDataResetVersion) {
      return;
    }
    handledResetVersionRef.current = data.syncedDataResetVersion;
    refreshProfileRef.current()
      .then(() => syncStage2RecordsRef.current())
      .then(() => runRemoteDataSyncRef.current())
      .catch(() => undefined);
  }, [data.ready, data.syncedDataResetVersion, user?.id]);

  useEffect(() => {
    if (!supabase || !user?.id || !data.ready) {
      return;
    }

    const realtimeClient = supabase;
    let syncTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleLinkRequestSync = () => {
      if (syncTimer) {
        clearTimeout(syncTimer);
      }
      // Coalesce multi-row trigger bursts without making the recipient wait for
      // a manual refresh.
      syncTimer = setTimeout(() => {
        syncStage2RecordsRef.current().catch(() => undefined);
      }, 50);
    };
    const createRealtimeNotification = async (row: RemoteNotificationRow) => {
      if (row.user_id !== user.id || realtimeNotificationIdsRef.current.has(row.id)) {
        return;
      }
      const latestData = dataRef.current;
      if (
        latestData.notifications.some(
          (notification) => notification.metadata.remoteNotificationId === row.id,
        )
      ) {
        realtimeNotificationIdsRef.current.add(row.id);
        return;
      }
      const payment =
        row.target_type === 'payment'
          ? latestData.payments.find((payment) => payment.remoteId === row.target_id)
          : null;
      const debt =
        row.target_type === 'debt'
          ? latestData.debts.find((debt) => debt.remoteId === row.target_id)
          : null;
      await latestData.createNotification({
        userId: user.id,
        type: row.type,
        title: row.title,
        body: row.body,
        targetType: payment ? 'payment' : debt ? 'debt' : null,
        targetId: payment?.id ?? debt?.id ?? null,
        readAt: row.read_at ?? null,
        metadata: {
          ...(isRecord(row.metadata) ? row.metadata : {}),
          remoteNotificationId: row.id,
        },
      });
      realtimeNotificationIdsRef.current.add(row.id);
    };

    const channel = realtimeClient
      .channel(`stage2-realtime:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'link_requests' },
        scheduleLinkRequestSync,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shared_debt_records' },
        scheduleLinkRequestSync,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'debt_verifications' },
        scheduleLinkRequestSync,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        scheduleLinkRequestSync,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settlements' },
        scheduleLinkRequestSync,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settlement_lines' },
        scheduleLinkRequestSync,
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          void createRealtimeNotification(payload.new as RemoteNotificationRow)
            .then(scheduleLinkRequestSync)
            .catch(() => {
              scheduleLinkRequestSync();
            });
        },
      )
      .subscribe();

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        scheduleLinkRequestSync();
      }
    });

    return () => {
      if (syncTimer) {
        clearTimeout(syncTimer);
      }
      appStateSubscription.remove();
      void realtimeClient.removeChannel(channel);
    };
  }, [data.ready, user?.id]);

  useEffect(() => {
    if (!user?.id || !data.ready) {
      return;
    }
    const hasPendingQueue = data.syncQueue.some((entry) => canRetrySyncEntry(entry));
    if (!hasPendingQueue) {
      return;
    }
    const timeout = setTimeout(() => {
      runRemoteDataSyncRef.current().catch(() => undefined);
    }, 500);
    return () => clearTimeout(timeout);
  }, [data.ready, data.syncQueue, user?.id]);

  const signUp = useCallback(
    async ({
      firstName,
      lastName,
      email,
      password,
      phone,
      country,
      baseCurrency,
    }: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      phone?: string | null;
      country?: string | null;
      baseCurrency?: CurrencyCode;
    }) => {
      if (!supabase) {
        throw new Error('Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
      }

      addTelemetryBreadcrumb('auth', 'sign_up_started', { method: 'password' });
      trackTelemetryEvent('onboarding_sign_up_started', { method: 'password' });
      try {
        const trimmedFirstName = firstName.trim();
        const trimmedLastName = lastName.trim();
        const displayName = [trimmedFirstName, trimmedLastName].filter(Boolean).join(' ');
        const selectedCurrency = baseCurrency ?? data.settings.baseCurrency;
        const { data: authData, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              first_name: trimmedFirstName,
              last_name: trimmedLastName,
              display_name: displayName,
              phone: phone?.trim() || null,
              country: country ?? null,
              base_currency: selectedCurrency,
            },
          },
        });
        if (error) {
          throw error;
        }

        const signedUpUser = authData.user;
        if (signedUpUser) {
          if (authData.session) {
            await upsertLocalAndRemoteProfile({
              userId: signedUpUser.id,
              firstName: trimmedFirstName,
              lastName: trimmedLastName,
              displayName,
              email: signedUpUser.email ?? email,
              phone: phone?.trim() || null,
              country: country ?? null,
              baseCurrency: selectedCurrency,
            });
          } else {
            const timestamp = nowIso();
            await data.upsertProfile({
              id: signedUpUser.id,
              firstName: trimmedFirstName,
              lastName: trimmedLastName,
              displayName,
              email: signedUpUser.email ?? email,
              phone: phone?.trim() || null,
              country: country ?? null,
              avatarUrl: null,
              baseCurrency: selectedCurrency,
              createdAt: timestamp,
              updatedAt: timestamp,
            });
          }
          addTelemetryBreadcrumb('auth', 'sign_up_succeeded', { method: 'password', hasSession: Boolean(authData.session) });
          trackTelemetryEvent('onboarding_sign_up_completed', { method: 'password', hasSession: Boolean(authData.session) });
          trackFirstSuccess('auth', { method: 'sign_up' });
        } else {
          addTelemetryBreadcrumb('auth', 'sign_up_succeeded', { method: 'password', hasSession: false });
          trackTelemetryEvent('onboarding_sign_up_completed', { method: 'password', hasSession: false });
        }
      } catch (error) {
        addTelemetryBreadcrumb('auth', 'sign_up_failed', { method: 'password', result: 'failure' });
        captureTelemetryException(error, 'auth_sign_up', { method: 'password' });
        throw error;
      }
    },
    [data, upsertLocalAndRemoteProfile],
  );

  const signIn = useCallback(async ({ email, password }: { email: string; password: string }) => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
    }

    addTelemetryBreadcrumb('auth', 'sign_in_started', { method: 'password' });
    trackTelemetryEvent('auth_sign_in_started', { method: 'password' });
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        throw error;
      }
      addTelemetryBreadcrumb('auth', 'sign_in_succeeded', { method: 'password' });
      trackTelemetryEvent('auth_sign_in_succeeded', { method: 'password' });
      trackFirstSuccess('auth', { method: 'sign_in' });
    } catch (error) {
      addTelemetryBreadcrumb('auth', 'sign_in_failed', { method: 'password', result: 'failure' });
      captureTelemetryException(error, 'auth_sign_in', { method: 'password' });
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) {
      return;
    }

    addTelemetryBreadcrumb('auth', 'sign_out_started', {});
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      addTelemetryBreadcrumb('auth', 'sign_out_succeeded', {});
      trackTelemetryEvent('auth_sign_out_succeeded', {});
    } catch (error) {
      addTelemetryBreadcrumb('auth', 'sign_out_failed', { result: 'failure' });
      captureTelemetryException(error, 'auth_sign_out', {});
      throw error;
    }
    setSession(null);
  }, []);

  const eraseLocalSession = useCallback(async () => {
    if (!supabase) {
      setSession(null);
      return;
    }
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    setSession(null);
    if (error) {
      throw error;
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
    }

    addTelemetryBreadcrumb('auth', 'reset_password_started', { method: 'email' });
    trackTelemetryEvent('auth_reset_password_started', { method: 'email' });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) {
        throw error;
      }
      addTelemetryBreadcrumb('auth', 'reset_password_succeeded', { method: 'email' });
      trackTelemetryEvent('auth_reset_password_succeeded', { method: 'email' });
    } catch (error) {
      addTelemetryBreadcrumb('auth', 'reset_password_failed', { method: 'email', result: 'failure' });
      captureTelemetryException(error, 'auth_reset_password', { method: 'email' });
      throw error;
    }
  }, []);

  const updateProfile = useCallback(
    async (input: Partial<Pick<UserProfile, 'firstName' | 'lastName' | 'displayName' | 'phone' | 'country' | 'baseCurrency'>>) => {
      if (!user) {
        throw new Error('Sign in before editing account profile.');
      }

      await upsertLocalAndRemoteProfile({
        userId: user.id,
        firstName: input.firstName === undefined ? localProfile?.firstName ?? null : input.firstName,
        lastName: input.lastName === undefined ? localProfile?.lastName ?? null : input.lastName,
        displayName: input.displayName ?? localProfile?.displayName ?? user.email ?? 'Debtulator user',
        email: user.email ?? localProfile?.email ?? null,
        phone: input.phone === undefined ? localProfile?.phone ?? null : input.phone,
        country: input.country === undefined ? localProfile?.country ?? null : input.country,
        baseCurrency: input.baseCurrency ?? localProfile?.baseCurrency ?? data.settings.baseCurrency,
      });
    },
    [data.settings.baseCurrency, localProfile, upsertLocalAndRemoteProfile, user],
  );

  const refreshSync = useCallback(async () => {
    addTelemetryBreadcrumb('sync', 'manual_refresh_started', { hasUser: Boolean(user) });
    try {
      if (!user) {
        await data.refresh();
        addTelemetryBreadcrumb('sync', 'manual_refresh_completed', { hasUser: false });
        return;
      }

      await refreshProfile();
      await syncStage2Records();
      await runRemoteDataSync();
      await data.refresh();
      addTelemetryBreadcrumb('sync', 'manual_refresh_completed', { hasUser: true });
    } catch (error) {
      addTelemetryBreadcrumb('sync', 'manual_refresh_failed', { hasUser: Boolean(user) });
      captureTelemetryException(error, 'manual_sync_refresh', { source: 'pull_to_refresh' });
    }
  }, [data, refreshProfile, runRemoteDataSync, syncStage2Records, user]);

  const identity = useMemo<Identity>(
    () => ({
      localUserId: 'me',
      authenticatedUserId: user?.id ?? null,
      displayName:
        localProfile?.displayName ?? user?.user_metadata?.display_name ?? user?.email ?? data.settings.localDisplayName ?? 'Local-only user',
      email: localProfile?.email ?? user?.email ?? null,
      baseCurrency: localProfile?.baseCurrency ?? data.settings.baseCurrency ?? DEFAULT_BASE_CURRENCY,
      profile: localProfile,
    }),
    [data.settings.baseCurrency, data.settings.localDisplayName, localProfile, user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      session,
      user,
      identity,
      signUp,
      signIn,
      signOut,
      eraseLocalSession,
      resetPassword,
      updateProfile,
      refreshProfile,
      refreshSync,
    }),
    [eraseLocalSession, identity, loading, refreshProfile, refreshSync, resetPassword, session, signIn, signOut, signUp, updateProfile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
