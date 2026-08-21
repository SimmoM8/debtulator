import type { Authenticator } from "../auth/authenticator";
import { HttpProblem } from "./problemDetails";
import type { RequestContext } from "./requestContext";

export async function authenticateRequest(
  request: Request,
  authenticator: Authenticator,
): Promise<RequestContext> {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const user = await authenticator.authenticate(
      request.headers.get("authorization"),
    );
    return { requestId, user };
  } catch {
    throw new HttpProblem({
      type: "https://api.debtulator.example/problems/unauthorized",
      title: "Authentication required",
      status: 401,
      instance: requestId,
    });
  }
}
