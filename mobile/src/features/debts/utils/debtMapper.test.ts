import { describe, expect, it } from "@jest/globals";

import { createMoney } from "@/src/features/currencies/utils/money";
import type { Debt } from "@/src/features/debts/model/Debt";
import { buildDebtsScreenModel } from "@/src/features/debts/model/DebtsScreenModel";

import { debtToCreateSyncPayload } from "./debtMapper";

const unnamedDebt: Debt = {
  id: "debt-1",
  ownerUserId: "owner-1",
  memberId: "member-1",
  direction: "you_owe",
  money: createMoney("25", "SEK"),
  title: "",
  dueDate: null,
  createdAt: "2026-11-23T00:00:00.000Z",
  updatedAt: "2026-11-23T00:00:00.000Z",
  agreementStatus: "private",
  collaborationId: null,
  agreedRevision: null,
  version: null,
};

describe("unnamed debts", () => {
  it("keeps the empty title in the sync payload", () => {
    expect(debtToCreateSyncPayload(unnamedDebt).title).toBe("");
  });

  it("uses a presentation fallback without mutating stored data", () => {
    const screenModel = buildDebtsScreenModel([unnamedDebt], [], "SEK");
    expect(screenModel.items[0].title).toBe("Untitled debt");
    expect(unnamedDebt.title).toBe("");
  });
});
