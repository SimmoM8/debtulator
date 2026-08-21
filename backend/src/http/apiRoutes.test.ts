import { describe, expect, it } from "@jest/globals";
import { createApiRoutes } from "./apiRoutes";

describe("backend API routes", () => {
  it("authenticates and dispatches the member profile route", async () => {
    const routes = createApiRoutes(
      {
        authenticate: async () => ({ id: "user-1" }),
      },
      {
        memberDirectory: async ({ body, request }) => ({
          body,
          path: new URL(request.url).pathname,
        }),
      },
    );
    const handler = routes.get("/api/v1/member-profiles");
    expect(handler).toBeDefined();
    const response = await handler!(
      new Request("https://api.test/api/v1/member-profiles?query=Ada", {
        headers: { Authorization: "Bearer token" },
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: { path: "/api/v1/member-profiles" },
    });
  });

  it("rejects missing bearer authentication before invoking a handler", async () => {
    const handler = createApiRoutes(
      {
        authenticate: async () => {
          throw new Error("missing token");
        },
      },
      { memberDirectory: async () => ({ reached: true }) },
    ).get("/api/v1/member-profiles");
    const response = await handler!(
      new Request("https://api.test/api/v1/member-profiles"),
    );
    expect(response.status).toBe(401);
  });
});
