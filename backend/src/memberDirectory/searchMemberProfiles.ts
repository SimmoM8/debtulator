import type { ProfileSearchResponse } from "../../../packages/contracts/src/index";
import type { RequestContext } from "../http/requestContext";
import type { MemberDirectoryRepository } from "./memberDirectoryRepository";

export type SearchMemberProfilesInput = {
  query: string;
  excludeUserId?: string | null;
  limit?: number;
  cursor?: string | null;
};

export async function searchMemberProfiles(
  context: RequestContext,
  input: SearchMemberProfilesInput,
  repository: MemberDirectoryRepository,
): Promise<ProfileSearchResponse> {
  const query = input.query.trim();
  if (query.length === 0 || query.length > 120) {
    throw new Error("Member profile search query is invalid.");
  }

  const result = await repository.search({
    actorUserId: context.user.id,
    query,
    excludeUserId: input.excludeUserId,
    limit: Math.min(Math.max(input.limit ?? 20, 1), 50),
    cursor: input.cursor,
  });
  return {
    data: result,
    requestId: context.requestId,
  };
}
