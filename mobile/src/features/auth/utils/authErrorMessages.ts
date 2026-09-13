export function getAuthErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code.toUpperCase() : null;
}

export function isEmailConfirmationRequired(error: unknown): boolean {
  return getAuthErrorCode(error) === "AUTH_EMAIL_NOT_CONFIRMED";
}

export function getSignInErrorMessage(error: unknown): string {
  const code = getAuthErrorCode(error);

  if (code === "AUTH_INVALID_CREDENTIALS") {
    return "Incorrect email or password.";
  }

  if (code === "AUTH_EMAIL_NOT_CONFIRMED") {
    return "Confirm your email address before signing in.";
  }

  if (code === "AUTH_RATE_LIMITED") {
    return "Too many sign-in attempts. Try again in a little while.";
  }

  if (code === "AUTH_SESSION_STORAGE_FAILED") {
    return "Debtulator couldn’t securely save your session. Please try again.";
  }

  if (isConnectivityErrorCode(code)) {
    return "Couldn’t reach Debtulator. Check your connection and try again.";
  }

  return "Unable to sign in right now. Please try again.";
}

export function getCreateAccountErrorMessage(error: unknown): string {
  const code = getAuthErrorCode(error);

  if (code === "AUTH_ACCOUNT_ALREADY_EXISTS") {
    return "An account already uses those credentials.";
  }

  if (code === "AUTH_WEAK_PASSWORD") {
    return "Choose a stronger password and try again.";
  }

  if (code === "AUTH_RATE_LIMITED") {
    return "Too many attempts. Try again in a little while.";
  }

  if (code === "AUTH_SESSION_STORAGE_FAILED") {
    return "Debtulator couldn’t securely save your session. Please try again.";
  }

  if (isConnectivityErrorCode(code)) {
    return "Couldn’t reach Debtulator. Check your connection and try again.";
  }

  return "Unable to create your account right now. Please try again.";
}

export function getRecoveryRequestErrorMessage(error: unknown): string {
  const code = getAuthErrorCode(error);

  if (code === "AUTH_RATE_LIMITED") {
    return "Too many requests. Try again in a little while.";
  }

  if (isConnectivityErrorCode(code)) {
    return "Couldn’t reach Debtulator. Check your connection and try again.";
  }

  return "Unable to send a reset link right now. Please try again.";
}

export function getResendConfirmationErrorMessage(error: unknown): string {
  const code = getAuthErrorCode(error);

  if (code === "AUTH_RATE_LIMITED") {
    return "Too many requests. Try again in a little while.";
  }

  if (isConnectivityErrorCode(code)) {
    return "Couldn’t reach Debtulator. Check your connection and try again.";
  }

  return "Unable to resend the confirmation email right now. Please try again.";
}

export function getEmailConfirmationErrorMessage(error: unknown): string {
  const code = getAuthErrorCode(error);

  if (code === "AUTH_TOKEN_INVALID") {
    return "This confirmation link is invalid or has expired.";
  }

  if (code === "AUTH_RATE_LIMITED") {
    return "Too many confirmation attempts. Try again in a little while.";
  }

  if (code === "AUTH_SESSION_STORAGE_FAILED") {
    return "Your email was confirmed, but Debtulator couldn’t securely save your session. Sign in to continue.";
  }

  if (isConnectivityErrorCode(code)) {
    return "Couldn’t reach Debtulator. Check your connection and try again.";
  }

  return "Unable to confirm your email right now. Please try again.";
}

export function getPasswordResetErrorMessage(error: unknown): string {
  const code = getAuthErrorCode(error);

  if (code === "AUTH_TOKEN_INVALID") {
    return "This password reset link is invalid or has expired.";
  }

  if (code === "AUTH_WEAK_PASSWORD") {
    return "Choose a stronger password and try again.";
  }

  if (code === "AUTH_RATE_LIMITED") {
    return "Too many attempts. Try again in a little while.";
  }

  if (isConnectivityErrorCode(code)) {
    return "Couldn’t reach Debtulator. Check your connection and try again.";
  }

  return "Unable to reset your password right now. Please try again.";
}

export function isRetryableAuthError(error: unknown): boolean {
  const code = getAuthErrorCode(error);

  return code === "AUTH_RATE_LIMITED" || isConnectivityErrorCode(code);
}

function isConnectivityErrorCode(code: string | null): boolean {
  return (
    code === "AUTH_NETWORK_UNAVAILABLE" ||
    code === "AUTH_REQUEST_TIMEOUT" ||
    code === "AUTH_PROVIDER_UNAVAILABLE" ||
    code === "AUTH_HTTP_502" ||
    code === "AUTH_HTTP_503" ||
    code === "AUTH_HTTP_504"
  );
}
