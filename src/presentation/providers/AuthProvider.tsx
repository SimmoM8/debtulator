import type { Session } from "@supabase/supabase-js";
import type { PropsWithChildren } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  isSupabaseConfigured,
  supabase,
} from "@/src/infrastructure/auth/supabaseAuthClient";
import { bindAuthAutoRefreshLifecycle } from "@/src/platform/lifecycle/appLifecycle";

type SignInInput = {
  email: string;
  password: string;
};

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  signIn: (input: SignInInput) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(() => supabase !== null);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let active = true;

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;

        if (error) {
          console.error("Failed to restore auth session", error);
        }

        setSession(data.session ?? null);
        setLoading(false);
      })
      .catch((error) => {
        if (!active) return;

        console.error("Failed to restore auth session", error);
        setSession(null);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;

      setSession(nextSession);
      setLoading(false);
    });

    const client = supabase;

    const unbindLifecycle = bindAuthAutoRefreshLifecycle({
      startAutoRefresh: () => client.auth.startAutoRefresh(),
      stopAutoRefresh: () => client.auth.stopAutoRefresh(),
    });

    return () => {
      active = false;
      subscription.unsubscribe();
      unbindLifecycle();
    };
  }, []);

  const signIn = useCallback(async ({ email, password }: SignInInput) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) {
      setSession(null);
      return;
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      session,
      signIn,
      signOut,
    }),
    [loading, session, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
