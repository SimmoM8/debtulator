export type RemoteStage2Records = {
  [collection: string]: any[] | undefined;
};

export type AuthenticatedUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
};

export type AuthSession = {
  access_token?: string;
  user: AuthenticatedUser;
};

export type AuthClient = {
  auth: any;
  from: (...args: any[]) => any;
  channel: (...args: any[]) => any;
  removeChannel: (...args: any[]) => any;
};

export type AuthServices = {
  configured: boolean;
  client: AuthClient | null;
  getAccessToken(): Promise<string | null>;
  getAcceptedLinkedMemberProfile: (...args: any[]) => Promise<any>;
  counterRemoteDebtVerification: (...args: any[]) => Promise<any>;
  createRemoteDebtVerification: (...args: any[]) => Promise<any>;
  fetchRemoteStage2Records: (
    ...args: any[]
  ) => Promise<RemoteStage2Records | null>;
  runSyncEngine: (...args: any[]) => Promise<any>;
};
