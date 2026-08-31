import type { ProfileSearchResponse } from "@/packages/contracts/src";

export type ProfileSearchRequest = {
  query: string;
  excludeUserId?: string | null;
  limit?: number;
  cursor?: string | null;
};

export interface ApiClient {
  request<T>(path: string, init?: RequestInit): Promise<T>;
  memberProfiles: {
    search(input: ProfileSearchRequest): Promise<ProfileSearchResponse>;
  };
}
