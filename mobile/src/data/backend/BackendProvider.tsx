import type { PropsWithChildren } from "react";
import { createContext, useContext, useMemo } from "react";

import { useAuth } from "@/src/features/auth/AuthProvider";

import { BackendClient } from "./BackendClient";
import { backendApiUrl, isBackendApiConfigured } from "./backendConfig";

const BackendContext = createContext<BackendClient | null>(null);

export function BackendProvider({ children }: PropsWithChildren) {
  const auth = useAuth();
  const userId = auth.session?.user.id ?? null;

  const client = useMemo(() => {
    if (!isBackendApiConfigured || !userId) {
      return null;
    }

    return new BackendClient(backendApiUrl, auth.getAccessToken);
  }, [auth.getAccessToken, userId]);

  return (
    <BackendContext.Provider value={client}>{children}</BackendContext.Provider>
  );
}

export function useBackendClient(): BackendClient | null {
  return useContext(BackendContext);
}
