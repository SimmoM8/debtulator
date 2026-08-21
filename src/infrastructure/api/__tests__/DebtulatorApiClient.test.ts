import { describe, expect, it, jest } from "@jest/globals";

import { createDebtulatorApiClient } from "@/src/infrastructure/api/DebtulatorApiClient";

describe("DebtulatorApiClient", () => {
  it("sends the caller token and serializes profile search parameters", async () => {
    const fetchImplementation = jest.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: { items: [], nextCursor: null },
            requestId: "request-1",
          }),
          { status: 200 },
        ),
    );
    const client = createDebtulatorApiClient(
      "https://api.example.test/",
      async () => "token-1",
      fetchImplementation,
    );

    await client.memberProfiles.search({
      query: "Ada Lovelace",
      excludeUserId: "user-2",
      limit: 10,
      cursor: "next-1",
    });

    expect(fetchImplementation).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/member-profiles?query=Ada+Lovelace&excludeUserId=user-2&limit=10&cursor=next-1",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token-1",
          Accept: "application/json, application/problem+json",
        }),
      }),
    );
  });

  it("turns problem details into a typed request error", async () => {
    const fetchImplementation = jest.fn(
      async () =>
        new Response(
          JSON.stringify({
            type: "https://api.debtulator.example/problems/forbidden",
            title: "Forbidden",
            status: 403,
            code: "FORBIDDEN",
          }),
          { status: 403 },
        ),
    );
    const client = createDebtulatorApiClient(
      "https://api.example.test",
      async () => null,
      fetchImplementation,
    );

    await expect(
      client.memberProfiles.search({ query: "Ada" }),
    ).rejects.toMatchObject({
      name: "ApiRequestError",
      problem: expect.objectContaining({ code: "FORBIDDEN" }),
    });
  });
});
