import { describe, expect, it, jest } from "@jest/globals";

import { SqliteSyncStore } from "./SqliteSyncStore";

jest.mock("expo-crypto", () => ({ randomUUID: () => "new-id" }));

describe("reviewed debt conflict recovery", () => {
  it("only queues a new OCC attempt for the exact reviewed blocked mutation", async () => {
    const runAsync = jest.fn(async (_sql: string, _args: unknown[]) => ({
      changes: 1,
    }));
    const store = new SqliteSyncStore({ runAsync } as never);

    await expect(store.requeueReviewedDebtConflict("alice", "original-id", 4))
      .resolves.toBe(true);

    expect(runAsync).toHaveBeenCalledTimes(1);
    const [sql, args] = runAsync.mock.calls[0];
    expect(sql).toContain("status = 'conflict'");
    expect(sql).toContain("last_error_code = 'VERSION_CONFLICT'");
    expect(sql).toContain("NOT EXISTS");
    expect(sql).not.toContain("DELETE FROM");
    expect(sql).not.toContain("payload_json =");
    expect(args).toEqual(["new-id", 4, "alice", "original-id"]);
  });

  it("does not accept invalid server versions or pretend an absent mutation was recovered", async () => {
    const runAsync = jest.fn(async (_sql: string, _args: unknown[]) => ({
      changes: 0,
    }));
    const store = new SqliteSyncStore({ runAsync } as never);

    await expect(store.requeueReviewedDebtConflict("alice", "id", -1))
      .resolves.toBe(false);
    expect(runAsync).not.toHaveBeenCalled();
    await expect(store.requeueReviewedDebtConflict("alice", "id", 2))
      .resolves.toBe(false);
  });
});
