import type { Session, User } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { DEFAULT_BASE_CURRENCY } from '@/src/constants/currencies';
import { isSupabaseConfigured, supabase } from '@/src/services/supabase';
import { fetchRemoteStage2Records } from '@/src/services/stage2Sync';
import { canRetrySyncEntry } from '@/src/services/stage6Sync';
import { runSyncEngine } from '@/src/services/sync/syncEngine';
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

  const runRemoteDataSync = useCallback(async () => {
    if (!user) {
      return;
    }
    await runSyncEngine({ store: data, userId: user.id, email: user.email ?? null });
    await data.refresh();
  }, [data, user]);

  const refreshProfileRef = useRef(refreshProfile);
  const syncStage2RecordsRef = useRef(syncStage2Records);
  const runRemoteDataSyncRef = useRef(runRemoteDataSync);
  const bootSyncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    refreshProfileRef.current = refreshProfile;
    syncStage2RecordsRef.current = syncStage2Records;
    runRemoteDataSyncRef.current = runRemoteDataSync;
  }, [refreshProfile, syncStage2Records, runRemoteDataSync]);

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
