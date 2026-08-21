import type { ApiRouteHandlers } from "./http/apiRoutes";
import { createApiRoutes } from "./http/apiRoutes";
import {
    SupabaseAuthenticator,
    SupabaseBackendRepository,
    loadBackendConfig,
} from "./infrastructure/supabaseBackend";

export function createBackendRuntime(env = process.env) {
  const config = loadBackendConfig(env);
  const authenticator = new SupabaseAuthenticator(config);
  const tokenFromRequest = (request: Request) => {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer "))
      throw new Error("Bearer authentication is required.");
    return authorization.slice("Bearer ".length);
  };
  const handlers: ApiRouteHandlers = {};
  for (const action of [
    "memberDirectory",
    "memberLinks",
    "debtVerifications",
    "paymentConfirmations",
    "groups",
    "attachments",
    "account",
    "telemetry",
    "sync",
    "development",
  ]) {
    handlers[action] = async ({ context, body, request }) => {
      const user = context as { user: { id: string; email?: string } };
      const repository = new SupabaseBackendRepository(
        config,
        tokenFromRequest(request),
      );
      return repository.execute(
        new URL(request.url).pathname,
        body,
        request,
        user.user,
      );
    };
  }
  const routes = createApiRoutes(authenticator, handlers) as Map<
    string,
    (request: Request) => Promise<Response>
  >;
  return async (request: Request): Promise<Response> => {
    const pathname = new URL(request.url).pathname;
    const exact = routes.get(pathname);
    if (exact) return exact(request);
    for (const [pattern, handler] of routes) {
      const regex = new RegExp(`^${pattern.replace(/:[^/]+/g, "[^/]+")}$`);
      if (regex.test(pathname)) return handler(request);
    }
    return new Response(
      JSON.stringify({ type: "about:blank", title: "Not Found", status: 404 }),
      {
        status: 404,
        headers: { "Content-Type": "application/problem+json" },
      },
    );
  };
}
