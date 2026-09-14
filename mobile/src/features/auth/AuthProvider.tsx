import type { PropsWithChildren } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";

import { BackendClient } from "@/src/data/backend/BackendClient";
import {
  backendApiUrl,
  isBackendApiConfigured,
} from "@/src/data/backend/backendConfig";
import {
  AuthApiError,
  BackendAuthGateway,
} from "@/src/features/auth/data/BackendAuthGateway";
import { authSessionStorage } from "@/src/features/auth/data/sessionStorage";
import {
  parseAuthSession,
  type AuthSession,
} from "@/src/features/auth/model/AuthSession";
import { registerAccount } from "@/src/features/auth/operations/registerAccount";

const AUTH_SESSION_STORAGE_KEY = "debtulator.auth.session.v1";
const ACCESS_TOKEN_REFRESH_LEEWAY_SECONDS = 60;

const authGateway = isBackendApiConfigured
  ? new BackendAuthGateway(backendApiUrl)
  : null;

const registrationClient = isBackendApiConfigured
  ? new BackendClient(backendApiUrl)
  : null;

type SignInInput = {
  email: string;
  password: string;
};

type SignUpInput = {
  email: string;
  password: string;
  name: string;
  username: string;
  phoneNumber: string | null;
  baseCurrency: string;
};

type SignUpResult = {
  emailVerificationRequired: boolean;
};

type PasswordRecoveryInput = {
  email: string;
};

type EmailConfirmationInput = {
  tokenHash: string;
};

type PasswordResetInput = {
  tokenHash: string;
  newPassword: string;
};

type AccessTokenOptions = {
  forceRefresh?: boolean;
};

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: AuthSession | null;
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<SignUpResult>;
  requestPasswordReset: (input: PasswordRecoveryInput) => Promise<void>;
  resendConfirmation: (input: PasswordRecoveryInput) => Promise<void>;
  confirmEmail: (input: EmailConfirmationInput) => Promise<void>;
  resetPassword: (input: PasswordResetInput) => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: (options?: AccessTokenOptions) => Promise<string>;
};

export class AuthClientError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AuthClientError";
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(() => authGateway !== null);

  const sessionRef = useRef<AuthSession | null>(null);
  const refreshPromiseRef = useRef<Promise<AuthSession> | null>(null);

  const publishSession = useCallback((nextSession: AuthSession | null) => {
    sessionRef.current = nextSession;
    setSession(nextSession);
  }, []);

  const persistSession = useCallback(
    async (nextSession: AuthSession): Promise<void> => {
      try {
        await authSessionStorage.setItem(
          AUTH_SESSION_STORAGE_KEY,
          JSON.stringify(nextSession),
        );
      } catch (error) {
        console.error("Failed to persist auth session", error);
        throw new AuthClientError(
          "AUTH_SESSION_STORAGE_FAILED",
          "Debtulator could not securely save the authentication session.",
        );
      }

      publishSession(nextSession);
    },
    [publishSession],
  );

  const clearSession = useCallback(async (): Promise<void> => {
    try {
      await authSessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    } catch (removeError) {
      /*
       * Overwriting with an invalid value prevents a stale credential from
       * being restored on the next launch if deletion itself failed.
       */
      try {
        await authSessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, "null");
      } catch (overwriteError) {
        console.error(
          "Failed to clear persisted auth session",
          removeError,
          overwriteError,
        );
        throw new AuthClientError(
          "AUTH_SESSION_STORAGE_FAILED",
          "Debtulator could not securely clear the authentication session.",
        );
      }
    }

    publishSession(null);
  }, [publishSession]);

  const invalidateSession = useCallback(async (): Promise<void> => {
    try {
      await clearSession();
    } catch (error) {
      /*
       * The remote session is already known to be invalid. Never keep the
       * in-memory app unlocked merely because local storage cleanup failed.
       */
      console.error("Failed to remove invalid auth session from storage", error);
      publishSession(null);
    }
  }, [clearSession, publishSession]);

  const refreshCurrentSession = useCallback(async (): Promise<AuthSession> => {
    if (!authGateway) {
      throw new AuthClientError(
        "AUTH_NOT_CONFIGURED",
        "Authentication is not configured.",
      );
    }

    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const currentSession = sessionRef.current;

    if (!currentSession) {
      throw new AuthClientError(
        "AUTH_SESSION_UNAVAILABLE",
        "No authenticated session is available.",
      );
    }

    const refreshPromise = authGateway
      .refresh(currentSession.refreshToken)
      .then(async (nextSession) => {
        await persistSession(nextSession);
        return nextSession;
      })
      .catch(async (error: unknown) => {
        if (shouldInvalidateSession(error)) {
          await invalidateSession();
        }

        throw error;
      })
      .finally(() => {
        refreshPromiseRef.current = null;
      });

    refreshPromiseRef.current = refreshPromise;
    return refreshPromise;
  }, [invalidateSession, persistSession]);

  const getAccessToken = useCallback(
    async (options: AccessTokenOptions = {}): Promise<string> => {
      const currentSession = sessionRef.current;

      if (!currentSession) {
        throw new AuthClientError(
          "AUTH_SESSION_UNAVAILABLE",
          "No authenticated session is available.",
        );
      }

      if (!options.forceRefresh && !isAccessTokenExpiring(currentSession)) {
        return currentSession.accessToken;
      }

      const refreshedSession = await refreshCurrentSession();
      return refreshedSession.accessToken;
    },
    [refreshCurrentSession],
  );

  useEffect(() => {
    if (!authGateway) {
      return;
    }

    let active = true;

    void (async () => {
      let storedValue: string | null = null;

      try {
        storedValue = await authSessionStorage.getItem(
          AUTH_SESSION_STORAGE_KEY,
        );
      } catch (error) {
        console.error("Failed to read persisted auth session", error);
      }

      if (!active) {
        return;
      }

      if (!storedValue) {
        setLoading(false);
        return;
      }

      let storedSession: AuthSession;

      try {
        storedSession = parseAuthSession(JSON.parse(storedValue));
      } catch (error) {
        console.warn("Discarding invalid persisted auth session", error);
        await invalidateSession();
        if (active) {
          setLoading(false);
        }
        return;
      }

      publishSession(storedSession);
      setLoading(false);

      if (isAccessTokenExpiring(storedSession)) {
        void refreshCurrentSession().catch((error) => {
          if (!shouldSilenceBackgroundAuthError(error)) {
            console.warn("Failed to refresh restored auth session", error);
          }
        });
      }
    })();

    return () => {
      active = false;
    };
  }, [invalidateSession, publishSession, refreshCurrentSession]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active" || !sessionRef.current) {
        return;
      }

      void getAccessToken().catch((error) => {
        if (!shouldSilenceBackgroundAuthError(error)) {
          console.warn("Failed to refresh auth session on foreground", error);
        }
      });
    });

    return () => {
      subscription.remove();
    };
  }, [getAccessToken]);

  const signIn = useCallback(
    async ({ email, password }: SignInInput) => {
      if (!authGateway) {
        throw new AuthClientError(
          "AUTH_NOT_CONFIGURED",
          "Authentication is not configured.",
        );
      }

      const nextSession = await authGateway.signIn({
        email: email.trim(),
        password,
      });

      try {
        await persistSession(nextSession);
      } catch (error) {
        void authGateway.signOut(nextSession.accessToken).catch(() => undefined);
        throw error;
      }
    },
    [persistSession],
  );

  const signUp = useCallback(
    async ({
      email,
      password,
      name,
      username,
      phoneNumber,
      baseCurrency,
    }: SignUpInput): Promise<SignUpResult> => {
      if (!registrationClient) {
        throw new AuthClientError(
          "AUTH_NOT_CONFIGURED",
          "Authentication is not configured.",
        );
      }

      const result = await registerAccount(registrationClient, {
        email: email.trim(),
        password,
        name: name.trim(),
        username: username.trim().toLowerCase(),
        phoneNumber: phoneNumber?.trim() || null,
        baseCurrency: baseCurrency.trim().toUpperCase(),
      });

      if (result.session) {
        try {
          await persistSession(result.session);
        } catch (error) {
          if (authGateway) {
            void authGateway
              .signOut(result.session.accessToken)
              .catch(() => undefined);
          }
          throw error;
        }
      }

      return {
        emailVerificationRequired: result.emailVerificationRequired,
      };
    },
    [persistSession],
  );

  const requestPasswordReset = useCallback(
    async ({ email }: PasswordRecoveryInput) => {
      if (!authGateway) {
        throw new AuthClientError(
          "AUTH_NOT_CONFIGURED",
          "Authentication is not configured.",
        );
      }

      await authGateway.requestPasswordRecovery(email.trim());
    },
    [],
  );

  const resendConfirmation = useCallback(
    async ({ email }: PasswordRecoveryInput) => {
      if (!authGateway) {
        throw new AuthClientError(
          "AUTH_NOT_CONFIGURED",
          "Authentication is not configured.",
        );
      }

      await authGateway.resendConfirmation(email.trim());
    },
    [],
  );

  const confirmEmail = useCallback(
    async ({ tokenHash }: EmailConfirmationInput) => {
      if (!authGateway) {
        throw new AuthClientError(
          "AUTH_NOT_CONFIGURED",
          "Authentication is not configured.",
        );
      }

      const nextSession = await authGateway.confirmEmail(tokenHash.trim());

      try {
        await persistSession(nextSession);
      } catch (error) {
        void authGateway.signOut(nextSession.accessToken).catch(() => undefined);
        throw error;
      }
    },
    [persistSession],
  );

  const resetPassword = useCallback(
    async ({ tokenHash, newPassword }: PasswordResetInput) => {
      if (!authGateway) {
        throw new AuthClientError(
          "AUTH_NOT_CONFIGURED",
          "Authentication is not configured.",
        );
      }

      await authGateway.resetPassword({
        tokenHash: tokenHash.trim(),
        newPassword,
      });
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (!authGateway) {
      await clearSession();
      return;
    }

    const currentSession = sessionRef.current;

    if (currentSession) {
      let accessToken = currentSession.accessToken;

      try {
        accessToken = await getAccessToken();
      } catch (error) {
        if (!shouldInvalidateSession(error)) {
          console.warn("Could not refresh session before sign out", error);
        }
      }

      try {
        await authGateway.signOut(accessToken);
      } catch (error) {
        /*
         * Local sign-out must still succeed if the backend is temporarily
         * unreachable. The stored credentials are removed below.
         */
        console.warn("Backend sign out did not complete", error);
      }
    }

    await clearSession();
  }, [clearSession, getAccessToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isBackendApiConfigured,
      loading,
      session,
      signIn,
      signUp,
      requestPasswordReset,
      resendConfirmation,
      confirmEmail,
      resetPassword,
      signOut,
      getAccessToken,
    }),
    [
      loading,
      session,
      signIn,
      signUp,
      requestPasswordReset,
      resendConfirmation,
      confirmEmail,
      resetPassword,
      signOut,
      getAccessToken,
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

function isAccessTokenExpiring(session: AuthSession): boolean {
  const now = Math.floor(Date.now() / 1000);

  return session.expiresAt <= now + ACCESS_TOKEN_REFRESH_LEEWAY_SECONDS;
}

function shouldInvalidateSession(error: unknown): boolean {
  if (!(error instanceof AuthApiError)) {
    return false;
  }

  return (
    error.status === 401 ||
    error.code === "AUTH_SESSION_INVALID" ||
    error.code === "AUTH_INVALID_ACCESS_TOKEN"
  );
}

function shouldSilenceBackgroundAuthError(error: unknown): boolean {
  if (!(error instanceof AuthApiError)) {
    return false;
  }

  return (
    error.code === "AUTH_NETWORK_UNAVAILABLE" ||
    error.code === "AUTH_REQUEST_TIMEOUT" ||
    error.code === "AUTH_PROVIDER_UNAVAILABLE"
  );
}
