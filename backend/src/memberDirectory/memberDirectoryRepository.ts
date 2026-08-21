import type { MemberProfile } from "../../../packages/contracts/src/index";

export interface MemberDirectoryRepository {
  search(input: {
    actorUserId: string;
    query: string;
    excludeUserId?: string | null;
    limit: number;
    cursor?: string | null;
  }): Promise<{
    items: MemberProfile[];
    nextCursor: string | null;
  }>;
}
