import type { Authenticator } from "../auth/authenticator";
import { createCommandRoute } from "./commandRoute";
import { apiRouteActions } from "./routeActions";

export type ApiRouteHandlers = {
  [key: string]: (input: {
    context: unknown;
    body: unknown;
    request: Request;
  }) => Promise<unknown>;
};

const routes = [
  ["/api/v1/member-profiles", "memberDirectory", ["GET"]],
  ["/api/v1/member-links", "memberLinks", ["POST"]],
  ["/api/v1/member-links/:userId", "memberLinks", ["GET"]],
  ["/api/v1/member-links/:userId/profile", "memberLinks", ["GET"]],
  ["/api/v1/member-links/respond", "memberLinks", ["POST"]],
  ["/api/v1/debt-verifications", "debtVerifications", ["POST"]],
  ["/api/v1/debt-verifications/respond", "debtVerifications", ["POST"]],
  ["/api/v1/debt-verifications/counter", "debtVerifications", ["POST"]],
  ["/api/v1/debt-verifications/remind", "debtVerifications", ["POST"]],
  ["/api/v1/payment-confirmations/respond", "paymentConfirmations", ["POST"]],
  ["/api/v1/payment-confirmations/remind", "paymentConfirmations", ["POST"]],
  ["/api/v1/group-invites", "groups", ["POST"]],
  ["/api/v1/group-invites/:id", "groups", ["PATCH"]],
  ["/api/v1/group-members", "groups", ["POST"]],
  ["/api/v1/attachments", "attachments", ["POST"]],
  ["/api/v1/account/deletion", "account", ["GET", "POST"]],
  ["/api/v1/telemetry/events", "telemetry", ["POST"]],
  ["/api/v1/sync", "sync", ["POST"]],
  ["/api/v1/sync/stage-two", "sync", ["POST"]],
  ["/api/v1/development/reset-data", "development", ["POST"]],
] as const;

export function createApiRoutes(
  authenticator: Authenticator,
  handlers: ApiRouteHandlers,
) {
  return new Map(
    routes.map(([path, action, methods]) => [
      path,
      createCommandRoute(
        authenticator,
        apiRouteActions[action],
        [...methods],
        handlers[action],
      ),
    ]),
  );
}
