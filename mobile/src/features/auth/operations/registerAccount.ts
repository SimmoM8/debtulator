import type { BackendClient } from "@/src/data/backend/BackendClient";
import {
  parseAuthSession,
  type AuthSession,
} from "@/src/features/auth/model/AuthSession";

export type RegisterAccountInput = {
  email: string;
  password: string;
  name: string;
  username: string;
  phoneNumber: string | null;
  baseCurrency: string;
};

export type RegisterAccountResult = {
  emailVerificationRequired: boolean;
  session: AuthSession | null;
};

export async function registerAccount(
  backend: BackendClient,
  input: RegisterAccountInput,
): Promise<RegisterAccountResult> {
  const value = requireObject(
    await backend.postPublic<unknown>("/api/v1/auth/register", {
      email: input.email,
      password: input.password,
      name: input.name,
      username: input.username,
      phoneNumber: input.phoneNumber,
      baseCurrency: input.baseCurrency,
    }),
  );

  const emailVerificationRequired = requireBoolean(
    value.emailVerificationRequired,
    "emailVerificationRequired",
  );

  const session =
    value.session === null ? null : parseAuthSession(value.session);

  if (!emailVerificationRequired && session === null) {
    throw new Error("Backend returned an invalid registration response.");
  }

  return {
    emailVerificationRequired,
    session,
  };
}

function requireObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Backend returned an invalid registration response.");
  }

  return value as Record<string, unknown>;
}

function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Backend returned an invalid registration ${field}.`);
  }

  return value;
}
