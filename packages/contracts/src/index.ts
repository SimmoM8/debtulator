export type ApiVersion = "v1";

export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code?: string;
  errors?: Array<{
    pointer: string;
    message: string;
  }>;
};

export type ApiResponse<T> = {
  data: T;
  requestId: string;
};

export type MemberProfile = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  baseCurrency: string;
};

export type ProfileSearchResponse = ApiResponse<{
  items: MemberProfile[];
  nextCursor: string | null;
}>;
