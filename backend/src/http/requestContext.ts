export type AuthenticatedUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

export type RequestContext = {
  requestId: string;
  user: AuthenticatedUser;
};
