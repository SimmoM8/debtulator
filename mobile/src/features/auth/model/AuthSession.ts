export type AuthUser = {
  id: string;
  email: string;
  emailConfirmed: boolean;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
  tokenType: string;
  user: AuthUser;
};

export function parseAuthSession(value: unknown): AuthSession {
  const object = requireObject(value, "auth session");
  const expiresIn = requirePositiveInteger(object.expiresIn, "expiresIn");
  const expiresAt =
    object.expiresAt === null || object.expiresAt === undefined
      ? Math.floor(Date.now() / 1000) + expiresIn
      : requirePositiveInteger(object.expiresAt, "expiresAt");

  return {
    accessToken: requireNonBlankString(object.accessToken, "accessToken"),
    refreshToken: requireNonBlankString(object.refreshToken, "refreshToken"),
    expiresIn,
    expiresAt,
    tokenType: requireNonBlankString(object.tokenType, "tokenType"),
    user: parseAuthUser(object.user),
  };
}

function parseAuthUser(value: unknown): AuthUser {
  const object = requireObject(value, "auth user");

  return {
    id: requireNonBlankString(object.id, "user.id"),
    email: requireNonBlankString(object.email, "user.email"),
    emailConfirmed: requireBoolean(object.emailConfirmed, "user.emailConfirmed"),
  };
}

function requireObject(
  value: unknown,
  field: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Invalid ${field}.`);
  }

  return value as Record<string, unknown>;
}

function requireNonBlankString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid ${field}.`);
  }

  return value;
}

function requirePositiveInteger(value: unknown, field: string): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value <= 0
  ) {
    throw new Error(`Invalid ${field}.`);
  }

  return value;
}

function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Invalid ${field}.`);
  }

  return value;
}
