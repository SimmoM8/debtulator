import { describe, expect, it, jest } from "@jest/globals";

import { SqliteLinkedAccountSummaryRepository } from "./SqliteLinkedAccountSummaryRepository";

describe("owner-scoped linked account cache", () => {
  it("reads by owner and linked account, never by linked account alone", async () => {
    const getFirstAsync = jest.fn(async (_sql: string, _args: string[]) => ({
      username: "bob",
    }));
    const repo = new SqliteLinkedAccountSummaryRepository({
      getFirstAsync,
    } as never);

    await expect(repo.getUsername("alice", "bob-id")).resolves.toBe("bob");
    expect(getFirstAsync.mock.calls[0][1]).toEqual(["alice", "bob-id"]);
    expect(getFirstAsync.mock.calls[0][0]).toContain("owner_user_id = ?");
  });

  it("replaces only that owner's snapshot, removing unlinked accounts", async () => {
    const runAsync = jest.fn(async (_sql: string, _args: string[]) => ({
      changes: 1,
    }));
    const repo = new SqliteLinkedAccountSummaryRepository({
      runAsync,
    } as never);

    await repo.replaceForOwner("alice", [
      { linkedUserId: "bob-id", username: "bob_new" },
    ]);
    expect(runAsync).toHaveBeenCalledTimes(2);
    expect(runAsync.mock.calls[0][0]).toContain(
      "DELETE FROM linked_account_summaries WHERE owner_user_id = ?",
    );
    expect(runAsync.mock.calls[0][1]).toEqual(["alice"]);
    expect(runAsync.mock.calls[1][1]).toEqual(["alice", "bob-id", "bob_new"]);

    await repo.replaceForOwner("alice", []);
    expect(runAsync.mock.calls[2][1]).toEqual(["alice"]);
    expect(runAsync).toHaveBeenCalledTimes(3);
  });
});
