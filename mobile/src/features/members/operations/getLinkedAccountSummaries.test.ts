import { describe, expect, it, jest } from "@jest/globals";

import { getLinkedAccountSummaries } from "./getLinkedAccountSummaries";

describe("linked account reference-data contract", () => {
  it("returns validated authorized summaries", async () => {
    const get = jest.fn(async (_path: string) => [
      { linkedUserId: "bob-id", username: "bob_linked" },
    ]);

    await expect(getLinkedAccountSummaries({ get } as never)).resolves.toEqual([
      { linkedUserId: "bob-id", username: "bob_linked" },
    ]);
    expect(get).toHaveBeenCalledWith("/api/v1/member-linking/linked-accounts");
  });

  it("rejects malformed and duplicate identities without overwriting a cache", async () => {
    for (const response of [
      null,
      {},
      [{ linkedUserId: "bob-id", username: "  " }],
      [
        { linkedUserId: "bob-id", username: "bob" },
        { linkedUserId: "bob-id", username: "wrong" },
      ],
    ]) {
      await expect(
        getLinkedAccountSummaries({ get: async () => response } as never),
      ).rejects.toThrow(/invalid linked account/);
    }
  });
});
