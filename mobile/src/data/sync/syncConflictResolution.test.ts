import { describe, expect, it, jest } from "@jest/globals";

import {
  canReviewDebtConflict,
  describeDebtValues,
  findServerDebt,
} from "./syncConflictResolution";
import type { SyncBootstrapPageResponse, SyncEntityType, SyncMutation } from "./syncTypes";

const mutation: SyncMutation = {
  id: "mutation-1",
  ownerUserId: "alice",
  entityType: "debt",
  entityId: "debt-1",
  operation: "upsert",
  baseVersion: 1,
  payloadJson: JSON.stringify({ amount: "125.00", currency: "SEK", title: "Dinner" }),
  createdAt: "2026-11-02T00:00:00Z",
  attemptCount: 1,
  status: "conflict",
  lastErrorCode: "VERSION_CONFLICT",
  lastError: "Version changed",
};

describe("explicit debt-conflict recovery", () => {
  it("never offers rebase for creates, deletes, rejections or non-version conflicts", () => {
    expect(canReviewDebtConflict(mutation)).toBe(true);
    expect(canReviewDebtConflict({ ...mutation, baseVersion: null })).toBe(false);
    expect(canReviewDebtConflict({ ...mutation, operation: "delete" })).toBe(false);
    expect(canReviewDebtConflict({ ...mutation, status: "rejected" })).toBe(false);
    expect(canReviewDebtConflict({ ...mutation, lastErrorCode: "ENTITY_DELETED" })).toBe(false);
    expect(canReviewDebtConflict({ ...mutation, payloadJson: "bad json" })).toBe(false);
  });

  it("reads the authenticated server snapshot across pages", async () => {
    const getBootstrapPage = jest.fn<
      (_entityType: SyncEntityType, _afterId: string | null) =>
        Promise<SyncBootstrapPageResponse>
    >()
      .mockResolvedValueOnce({
        entityType: "debt",
        items: [],
        nextAfterId: "page-1",
        hasMore: true,
      })
      .mockResolvedValueOnce({
        entityType: "debt",
        items: [{ entityId: "debt-1", version: 4, payload: { amount: "100.00" } }],
        nextAfterId: "debt-1",
        hasMore: false,
      });
    expect(await findServerDebt({ getBootstrapPage } as never, "debt-1"))
      .toMatchObject({ version: 4 });
    expect(getBootstrapPage).toHaveBeenCalledTimes(2);
  });

  it("does not fabricate a server record or accept broken pagination", async () => {
    expect(await findServerDebt({ getBootstrapPage: async () => ({
      entityType: "debt", items: [], nextAfterId: null, hasMore: false,
    }) } as never, "missing")).toBeNull();
    await expect(findServerDebt({ getBootstrapPage: async () => ({
      entityType: "debt", items: [], nextAfterId: null, hasMore: true,
    }) } as never, "missing")).rejects.toThrow(/cursor/);
  });

  it("shows financial values without converting decimal strings to floating point", () => {
    expect(describeDebtValues({ amount: "99999999999999.99", currency: "SEK" }))
      .toContain("99999999999999.99 SEK");
  });
});
