import type { Session, User } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { DEFAULT_BASE_CURRENCY } from '@/src/constants/currencies';
import { isSupabaseConfigured, supabase } from '@/src/services/supabase';
import { fetchRemoteStage2Records } from '@/src/services/stage2Sync';
import { fetchRemoteStage3Records } from '@/src/services/stage3Sync';
import { withGeneratedObligations } from '@/src/services/splits';
import { useAppData } from '@/src/state/AppDataProvider';
import type {
  CurrencyCode,
  Debt,
  DebtVerification,
  Event,
  EventActivityLog,
  EventDebt,
  EventDuplicateWarning,
  EventInvite,
  EventMemberClaim,
  EventParticipant,
  EventVerificationResponse,
  LinkRequest,
  SharedEventMember,
  SharedExpense,
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
  signUp: (input: { email: string; password: string; displayName: string }) => Promise<void>;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (input: Partial<Pick<UserProfile, 'displayName' | 'phone' | 'baseCurrency'>>) => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const data = useAppData();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const user = session?.user ?? null;
  const localProfile = user ? data.profiles.find((profile) => profile.id === user.id) ?? null : null;

  const upsertLocalAndRemoteProfile = useCallback(
    async (input: {
      userId: string;
      displayName: string;
      email?: string | null;
      phone?: string | null;
      baseCurrency?: CurrencyCode;
    }) => {
      const timestamp = nowIso();
      const existing = data.profiles.find((profile) => profile.id === input.userId);
      const profile: UserProfile = {
        id: input.userId,
        displayName: input.displayName.trim() || input.email || 'Debtulator user',
        email: input.email ?? existing?.email ?? null,
        phone: input.phone === undefined ? existing?.phone ?? null : input.phone,
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
          display_name: profile.displayName,
          email: profile.email,
          phone: profile.phone,
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
      .select('id, display_name, email, phone, avatar_url, base_currency, created_at, updated_at')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (remoteProfile) {
      await data.upsertProfile({
        id: remoteProfile.id,
        displayName: remoteProfile.display_name,
        email: remoteProfile.email,
        phone: remoteProfile.phone,
        avatarUrl: remoteProfile.avatar_url,
        baseCurrency: remoteProfile.base_currency,
        createdAt: remoteProfile.created_at,
        updatedAt: remoteProfile.updated_at,
      });
    } else {
      await upsertLocalAndRemoteProfile({
        userId: user.id,
        displayName: user.user_metadata?.display_name ?? user.email ?? 'Debtulator user',
        email: user.email ?? null,
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

    for (const row of remote.linkRequests ?? []) {
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
            linkedProfileEmail: row.status === 'accepted' ? row.target_email : member.linkedProfileEmail,
            linkedProfilePhone: row.status === 'accepted' ? row.target_phone : member.linkedProfilePhone,
          });
        }
      }
    }

    for (const row of remote.sharedDebts ?? []) {
      const existingDebt = data.debts.find((debt) => debt.remoteId === row.id);
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
      const direction =
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
        direction,
        amount: Number(row.amount),
        currency: row.currency,
        title: row.title,
        notes: existingDebt?.notes ?? null,
        sharedNotes: row.notes_visible_to_other_user,
        debtDate: row.debt_date,
        dueDate: row.due_date,
        recurringTemplateId: null,
        tags: existingDebt?.tags ?? [],
        eventId: null,
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
    }

    for (const row of remote.verifications ?? []) {
      const existing = data.debtVerifications.find((verification) => verification.remoteId === row.id);
      const debt = data.debts.find((item) => item.remoteId === row.debt_id);
      const verification: DebtVerification = {
        id: existing?.id ?? `verify_remote_${row.id}`,
        remoteId: row.id,
        debtId: debt?.id ?? `debt_remote_${row.debt_id}`,
        remoteDebtId: row.debt_id,
        requesterUserId: row.requester_user_id,
        responderUserId: row.responder_user_id,
        status: row.status,
        rejectionReason: row.rejection_reason,
        suggestedChange: row.suggested_change,
        requestedAt: row.requested_at,
        respondedAt: row.responded_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        syncStatus: 'synced',
      };
      await data.upsertDebtVerification(verification);
    }
  }, [data, user]);

  const syncStage3Records = useCallback(async () => {
    if (!user) {
      return;
    }

    const remote = await fetchRemoteStage3Records({ userId: user.id, email: user.email ?? null });
    if (!remote) {
      return;
    }

    for (const row of remote.events ?? []) {
      const existing = data.events.find((event) => event.remoteId === row.id);
      const event: Event = {
        id: existing?.id ?? `event_remote_${row.id}`,
        localId: null,
        remoteId: row.id,
        ownerUserId: row.owner_user_id,
        name: row.name,
        notes: row.description,
        defaultCurrency: row.default_currency,
        allowedCurrencies: row.allowed_currencies?.length ? row.allowed_currencies : [row.default_currency],
        tags: row.tags ?? [],
        status: row.status,
        visibility: row.visibility,
        syncStatus: 'synced',
        archived: Boolean(row.archived_at) || row.status === 'archived',
        archivedAt: row.archived_at,
        finalisedAt: row.finalised_at,
        lockedAt: row.locked_at,
        ignoredDuplicateKeys: existing?.ignoredDuplicateKeys ?? [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
      await data.upsertEvent(event);
    }

    for (const row of remote.participants ?? []) {
      const event = data.events.find((item) => item.remoteId === row.event_id) ?? data.events.find((item) => item.id === `event_remote_${row.event_id}`);
      const existing = data.eventParticipants.find((participant) => participant.remoteId === row.id);
      const participant: EventParticipant = {
        id: existing?.id ?? `event_participant_remote_${row.id}`,
        remoteId: row.id,
        eventId: event?.id ?? `event_remote_${row.event_id}`,
        remoteEventId: row.event_id,
        userId: row.user_id,
        role: row.role,
        status: row.status,
        joinedAt: row.joined_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        syncStatus: 'synced',
      };
      await data.upsertEventParticipant(participant);
    }

    for (const row of remote.invites ?? []) {
      const event = data.events.find((item) => item.remoteId === row.event_id) ?? data.events.find((item) => item.id === `event_remote_${row.event_id}`);
      const existing = data.eventInvites.find((invite) => invite.remoteId === row.id);
      const invite: EventInvite = {
        id: existing?.id ?? `event_invite_remote_${row.id}`,
        remoteId: row.id,
        eventId: event?.id ?? `event_remote_${row.event_id}`,
        remoteEventId: row.event_id,
        inviterUserId: row.inviter_user_id,
        invitedUserId: row.invited_user_id,
        invitedEmail: row.invited_email,
        invitedPhone: row.invited_phone,
        invitedDisplayName: row.invited_display_name,
        offeredRole: row.offered_role,
        status: row.status,
        message: row.message,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        respondedAt: row.responded_at,
        syncStatus: 'synced',
      };
      await data.upsertEventInvite(invite);
    }

    for (const row of remote.members ?? []) {
      const event = data.events.find((item) => item.remoteId === row.event_id) ?? data.events.find((item) => item.id === `event_remote_${row.event_id}`);
      const existing = data.sharedEventMembers.find((member) => member.remoteId === row.id);
      const member: SharedEventMember = {
        id: existing?.id ?? `event_member_remote_${row.id}`,
        remoteId: row.id,
        eventId: event?.id ?? `event_remote_${row.event_id}`,
        remoteEventId: row.event_id,
        type: row.type,
        linkedUserId: row.linked_user_id,
        displayName: row.display_name,
        alias: row.alias,
        email: row.email,
        phone: row.phone,
        notes: row.notes,
        createdByUserId: row.created_by_user_id,
        status: row.status,
        mergedIntoEventMemberId: row.merged_into_event_member_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        syncStatus: 'synced',
      };
      await data.upsertSharedEventMember(member);
    }

    for (const row of remote.expenses ?? []) {
      const event = data.events.find((item) => item.remoteId === row.event_id) ?? data.events.find((item) => item.id === `event_remote_${row.event_id}`);
      const existing = data.sharedExpenses.find((expense) => expense.remoteId === row.id);
      const participantIds = (remote.splits ?? [])
        .filter((split) => split.expense_id === row.id && split.included !== false)
        .map((split) => split.event_member_id);
      const expense: SharedExpense = withGeneratedObligations({
        id: existing?.id ?? `event_expense_remote_${row.id}`,
        remoteId: row.id,
        eventId: event?.id ?? `event_remote_${row.event_id}`,
        creatorUserId: row.creator_user_id,
        payerId: row.payer_event_member_id,
        expensePayers: [],
        amount: Number(row.amount),
        currency: row.currency,
        title: row.title,
        notes: row.notes,
        expenseDate: row.date,
        participantIds: participantIds.length > 0 ? participantIds : [row.payer_event_member_id].filter(Boolean),
        splitMethod: row.split_method ?? 'equal',
        splitAllocations: {},
        dueDate: null,
        recurringTemplateId: null,
        tags: row.tags ?? [],
        status: row.status,
        verificationStatus: row.verification_status,
        visibility: 'shared_event',
        syncStatus: 'synced',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
      await data.upsertSharedExpense(expense);
    }

    for (const row of remote.debts ?? []) {
      const event = data.events.find((item) => item.remoteId === row.event_id) ?? data.events.find((item) => item.id === `event_remote_${row.event_id}`);
      const existing = data.eventDebts.find((debt) => debt.remoteId === row.id);
      const debt: EventDebt = {
        id: existing?.id ?? `event_debt_remote_${row.id}`,
        remoteId: row.id,
        eventId: event?.id ?? `event_remote_${row.event_id}`,
        remoteEventId: row.event_id,
        creatorUserId: row.creator_user_id,
        debtorEventMemberId: row.debtor_event_member_id,
        creditorEventMemberId: row.creditor_event_member_id,
        amount: Number(row.amount),
        currency: row.currency,
        title: row.title,
        notes: row.notes,
        debtDate: row.date,
        dueDate: null,
        tags: row.tags ?? [],
        verificationStatus: row.verification_status,
        settlementStatus: row.settlement_status,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        archivedAt: row.archived_at,
        syncStatus: 'synced',
      };
      await data.upsertEventDebt(debt);
    }

    for (const row of remote.claims ?? []) {
      const event = data.events.find((item) => item.remoteId === row.event_id) ?? data.events.find((item) => item.id === `event_remote_${row.event_id}`);
      const existing = data.eventMemberClaims.find((claim) => claim.remoteId === row.id);
      const claim: EventMemberClaim = {
        id: existing?.id ?? `event_claim_remote_${row.id}`,
        remoteId: row.id,
        eventId: event?.id ?? `event_remote_${row.event_id}`,
        remoteEventId: row.event_id,
        eventMemberId: row.event_member_id,
        remoteEventMemberId: row.event_member_id,
        claimantUserId: row.claimant_user_id,
        status: row.status,
        message: row.message,
        respondedByUserId: row.responded_by_user_id,
        respondedAt: row.responded_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        syncStatus: 'synced',
      };
      await data.upsertEventMemberClaim(claim);
    }

    for (const row of remote.warnings ?? []) {
      const event = data.events.find((item) => item.remoteId === row.event_id) ?? data.events.find((item) => item.id === `event_remote_${row.event_id}`);
      const existing = data.eventDuplicateWarnings.find((warning) => warning.remoteId === row.id);
      const warning: EventDuplicateWarning = {
        id: existing?.id ?? `event_duplicate_remote_${row.id}`,
        remoteId: row.id,
        eventId: event?.id ?? `event_remote_${row.event_id}`,
        eventMemberIdA: row.event_member_id_a,
        eventMemberIdB: row.event_member_id_b,
        reason: row.reason,
        confidence: row.confidence,
        status: row.status,
        ignoredByUserId: row.ignored_by_user_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        syncStatus: 'synced',
      };
      await data.upsertEventDuplicateWarning(warning);
    }

    for (const row of remote.verifications ?? []) {
      const event = data.events.find((item) => item.remoteId === row.event_id) ?? data.events.find((item) => item.id === `event_remote_${row.event_id}`);
      const existing = data.eventVerificationResponses.find((response) => response.remoteId === row.id);
      const response: EventVerificationResponse = {
        id: existing?.id ?? `event_verify_remote_${row.id}`,
        remoteId: row.id,
        eventId: event?.id ?? `event_remote_${row.event_id}`,
        remoteEventId: row.event_id,
        targetType: row.target_type,
        targetId: row.target_id,
        remoteTargetId: row.target_id,
        eventMemberId: row.event_member_id,
        linkedUserId: row.linked_user_id,
        responseStatus: row.response_status,
        rejectionReason: row.rejection_reason,
        respondedAt: row.responded_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        syncStatus: 'synced',
      };
      await data.upsertEventVerificationResponse(response);
    }

    for (const row of remote.activity ?? []) {
      const event = data.events.find((item) => item.remoteId === row.event_id) ?? data.events.find((item) => item.id === `event_remote_${row.event_id}`);
      const existing = data.eventActivityLogs.find((activity) => activity.remoteId === row.id);
      const activity: EventActivityLog = {
        id: existing?.id ?? `event_activity_remote_${row.id}`,
        remoteId: row.id,
        eventId: event?.id ?? `event_remote_${row.event_id}`,
        remoteEventId: row.event_id,
        actorUserId: row.actor_user_id,
        action: row.action,
        targetType: row.target_type,
        targetId: row.target_id,
        metadata: row.metadata ?? {},
        createdAt: row.created_at,
        syncStatus: 'synced',
      };
      await data.upsertEventActivityLog(activity);
    }
  }, [data, user]);

  const refreshProfileRef = useRef(refreshProfile);
  const syncStage2RecordsRef = useRef(syncStage2Records);
  const syncStage3RecordsRef = useRef(syncStage3Records);

  useEffect(() => {
    refreshProfileRef.current = refreshProfile;
    syncStage2RecordsRef.current = syncStage2Records;
    syncStage3RecordsRef.current = syncStage3Records;
  }, [refreshProfile, syncStage2Records, syncStage3Records]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
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
    if (user?.id) {
      refreshProfileRef.current().catch(() => undefined);
      syncStage2RecordsRef.current().catch(() => undefined);
      syncStage3RecordsRef.current().catch(() => undefined);
    }
  }, [user?.id]);

  const signUp = useCallback(
    async ({ email, password, displayName }: { email: string; password: string; displayName: string }) => {
      if (!supabase) {
        throw new Error('Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
      }

      const { data: authData, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: displayName.trim() } },
      });
      if (error) {
        throw error;
      }

      const signedUpUser = authData.user;
      if (signedUpUser) {
        if (authData.session) {
          await upsertLocalAndRemoteProfile({
            userId: signedUpUser.id,
            displayName,
            email: signedUpUser.email ?? email,
            baseCurrency: data.settings.baseCurrency,
          });
        } else {
          const timestamp = nowIso();
          await data.upsertProfile({
            id: signedUpUser.id,
            displayName: displayName.trim(),
            email: signedUpUser.email ?? email,
            phone: null,
            avatarUrl: null,
            baseCurrency: data.settings.baseCurrency,
            createdAt: timestamp,
            updatedAt: timestamp,
          });
        }
      }
    },
    [data, upsertLocalAndRemoteProfile],
  );

  const signIn = useCallback(async ({ email, password }: { email: string; password: string }) => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
    }

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) {
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    setSession(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) {
      throw error;
    }
  }, []);

  const updateProfile = useCallback(
    async (input: Partial<Pick<UserProfile, 'displayName' | 'phone' | 'baseCurrency'>>) => {
      if (!user) {
        throw new Error('Sign in before editing account profile.');
      }

      await upsertLocalAndRemoteProfile({
        userId: user.id,
        displayName: input.displayName ?? localProfile?.displayName ?? user.email ?? 'Debtulator user',
        email: user.email ?? localProfile?.email ?? null,
        phone: input.phone === undefined ? localProfile?.phone ?? null : input.phone,
        baseCurrency: input.baseCurrency ?? localProfile?.baseCurrency ?? data.settings.baseCurrency,
      });
    },
    [data.settings.baseCurrency, localProfile, upsertLocalAndRemoteProfile, user],
  );

  const identity = useMemo<Identity>(
    () => ({
      localUserId: 'me',
      authenticatedUserId: user?.id ?? null,
      displayName:
        localProfile?.displayName ?? user?.user_metadata?.display_name ?? user?.email ?? 'Local-only user',
      email: localProfile?.email ?? user?.email ?? null,
      baseCurrency: localProfile?.baseCurrency ?? data.settings.baseCurrency ?? DEFAULT_BASE_CURRENCY,
      profile: localProfile,
    }),
    [data.settings.baseCurrency, localProfile, user],
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
      resetPassword,
      updateProfile,
      refreshProfile,
    }),
    [identity, loading, refreshProfile, resetPassword, session, signIn, signOut, signUp, updateProfile, user],
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
