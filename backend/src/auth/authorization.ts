import { HttpProblem } from "../http/problemDetails";
import type { RequestContext } from "../http/requestContext";

export type AuthorizationAction = "member_profile.search";

export function requireAuthorized(
  context: RequestContext,
  action: AuthorizationAction,
): void {
  if (!context.user.id) {
    throw new HttpProblem({
      type: "https://api.debtulator.example/problems/unauthorized",
      title: "Authentication required",
      status: 401,
      code: "AUTHENTICATION_REQUIRED",
    });
  }

  const allowedActions: AuthorizationAction[] = ["member_profile.search"];
  if (!allowedActions.includes(action)) {
    throw new HttpProblem({
      type: "https://api.debtulator.example/problems/forbidden",
      title: "Forbidden",
      status: 403,
      code: "ACTION_NOT_ALLOWED",
    });
  }
}
