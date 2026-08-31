import type { Authenticator } from "../auth/authenticator";
import { requireAuthorized } from "../auth/authorization";
import { authenticateRequest } from "../http/authenticateRequest";
import { HttpProblem, problemResponse } from "../http/problemDetails";
import type { MemberDirectoryRepository } from "./memberDirectoryRepository";
import { searchMemberProfiles } from "./searchMemberProfiles";

export function createMemberDirectoryRoute(
  authenticator: Authenticator,
  repository: MemberDirectoryRepository,
): (request: Request) => Promise<Response> {
  return async (request) => {
    try {
      if (request.method !== "GET") {
        throw new HttpProblem({
          type: "about:blank",
          title: "Method Not Allowed",
          status: 405,
        });
      }
      const context = await authenticateRequest(request, authenticator);
      requireAuthorized(context, "member_profile.search");
      const url = new URL(request.url);
      const result = await searchMemberProfiles(
        context,
        {
          query: url.searchParams.get("query") ?? "",
          excludeUserId: url.searchParams.get("excludeUserId"),
          limit: url.searchParams.has("limit")
            ? Number(url.searchParams.get("limit"))
            : undefined,
          cursor: url.searchParams.get("cursor"),
        },
        repository,
      );
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "x-request-id": context.requestId,
        },
      });
    } catch (error) {
      if (error instanceof HttpProblem) {
        return problemResponse(error.problem);
      }
      return problemResponse({
        type: "https://api.debtulator.example/problems/internal-error",
        title: "Internal Server Error",
        status: 500,
      });
    }
  };
}
