import type { AuthenticatedUser } from "../http/requestContext";

export interface Authenticator {
  authenticate(authorizationHeader: string | null): Promise<AuthenticatedUser>;
}
