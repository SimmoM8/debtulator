import type { DebtRepository } from "@/src/domain/debts/DebtRepository";
import type { MemberRepository } from "@/src/domain/members/MemberRepository";

export type CoreDataDependencies = {
  debts: DebtRepository;
  members: MemberRepository;
};
