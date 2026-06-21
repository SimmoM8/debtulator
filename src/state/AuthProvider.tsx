import type { Session, User } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { DEFAULT_BASE_CURRENCY } from '@/src/constants/currencies';
import { isSupabaseConfigured, supabase } from '@/src/services/supabase';
import { getAcceptedLinkedMemberProfile } from '@/src/services/profileSearch';
import { fetchRemoteStage2Records } from '@/src/services/stage2Sync';
import { canRetrySyncEntry } from '@/src/services/stage6Sync';
import { runSyncEngine } from '@/src/services/sync/syncEngine';
import { addTelemetryBreadcrumb, captureTelemetryException, trackFirstSuccess, trackTelemetryEvent } from '@/src/services/telemetry';
import { useAppData } from '@/src/state/AppDataProvider';
import type {
  CurrencyCode,
  Debt,
  DebtVerification,
  LinkRequest,
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

    const linkedUserIds = new Set(
      data.members.flatMap((member) => (member.linkedUserId ? [member.linkedUserId] : [])),
    );
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
      const existing = data.debtVerifications.find((verification) => verification.remoteId === row.id);
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
      const alreadyNotified = data.notifications.some(
        (notification) =>
          notification.type === 'verification_request' &&
          notification.metadata.verificationRemoteId === row.id,
      );
      if (
        !existing &&
        !alreadyNotified &&
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
      // Debounce bursts and allow the initiating device to persist its local
      // request record before processing the matching realtime event.
      syncTimer = setTimeout(() => {
        syncStage2RecordsRef.current().catch(() => undefined);
      }, 250);
    };

    const channel = realtimeClient
      .channel(`link-requests:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'link_requests' },
        scheduleLinkRequestSync,
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
