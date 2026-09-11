import {
  isSupabaseConfigured,
  supabase,
} from "@/src/data/supabase/supabaseClient";
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
import { AppState, Platform } from "react-native";

type SignInInput = {
  email: string;
  password: string;
};

type SignUpInput = {
  email: string;
  password: string;
};

type SignUpResult = {
  emailVerificationRequired: boolean;
};

type PasswordRecoveryInput = {
  email: string;
};

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<SignUpResult>;
  requestPasswordReset: (input: PasswordRecoveryInput) => Promise<void>;
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

    const client = supabase;

    let active = true;

    void client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) {
          return;
        }

        if (error) {
          console.error("Failed to restore auth session", error);
        }

        setSession(data.session ?? null);
        setLoading(false);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        console.error("Failed to restore auth session", error);
        setSession(null);
        setLoading(false);
      });

    const {
      data: { subscription: authSubscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) {
        return;
      }

      setSession(nextSession);
      setLoading(false);
    });

    const appStateSubscription =
      Platform.OS !== "web"
        ? AppState.addEventListener("change", (state) => {
            if (state === "active") {
              client.auth.startAutoRefresh();
            } else {
              client.auth.stopAutoRefresh();
            }
          })
        : null;

    if (Platform.OS !== "web") {
      if (AppState.currentState === "active") {
        client.auth.startAutoRefresh();
      } else {
        client.auth.stopAutoRefresh();
      }
    }

    return () => {
      active = false;

      authSubscription.unsubscribe();
      appStateSubscription?.remove();

      if (Platform.OS !== "web") {
        client.auth.stopAutoRefresh();
      }
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

  const signUp = useCallback(
    async ({ email, password }: SignUpInput): Promise<SignUpResult> => {
      if (!supabase) {
        throw new Error("Supabase is not configured.");
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      return {
        emailVerificationRequired: data.session === null,
      };
    },
    [],
  );

  const requestPasswordReset = useCallback(
    async ({ email }: PasswordRecoveryInput) => {
      if (!supabase) {
        throw new Error("Supabase is not configured.");
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());

      if (error) {
        throw error;
      }
    },
    [],
  );

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
      signUp,
      requestPasswordReset,
      signOut,
    }),
    [
      loading,
      session,
      signIn,
      signUp,
      requestPasswordReset,
      signOut,
    ],
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
