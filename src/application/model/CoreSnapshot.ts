import type { Debt } from "@/src/domain/debts/Debt";
import type { Member } from "@/src/domain/members/Member";

export type CoreSnapshot = {
  members: Member[];
  debts: Debt[];
};
