import type { Authenticator } from "../auth/authenticator";
import { requireAuthorized } from "../auth/authorization";
import { authenticateRequest } from "./authenticateRequest";
import { HttpProblem, problemResponse } from "./problemDetails";

export type CommandRouteHandler = (input: {
  context: Awaited<ReturnType<typeof authenticateRequest>>;
  body: unknown;
  request: Request;
}) => Promise<unknown>;

export function createCommandRoute(
  authenticator: Authenticator,
  action: Parameters<typeof requireAuthorized>[1],
  methods: string[],
  handler: CommandRouteHandler,
): (request: Request) => Promise<Response> {
  return async (request) => {
    try {
      if (!methods.includes(request.method)) {
        throw new HttpProblem({
          type: "about:blank",
          title: "Method Not Allowed",
          status: 405,
        });
      }
      const context = await authenticateRequest(request, authenticator);
      requireAuthorized(context, action);
      const body =
        request.method === "GET"
          ? null
          : await request.json().catch(() => null);
      const data = await handler({ context, body, request });
      return new Response(
        JSON.stringify({ data, requestId: context.requestId }),
        {
          status: request.method === "POST" ? 201 : 200,
          headers: {
            "Content-Type": "application/json",
            "x-request-id": context.requestId,
          },
        },
      );
    } catch (error) {
      if (error instanceof HttpProblem) {
        return problemResponse(error.problem);
      }

      console.error("Backend route failed", {
        method: request.method,
        url: request.url,
        error,
      });

      return problemResponse({
        type: "https://api.debtulator.example/problems/internal-error",
        title: "Internal Server Error",
        status: 500,
      });
    }
  };
}
