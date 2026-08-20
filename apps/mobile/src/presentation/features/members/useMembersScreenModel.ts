import { useMemo, useState } from "react";

import { matchesMemberQuery } from "@/src/presentation/features/members/memberSearch";
import { estimateMoneyMap } from "@debtulator/domain/finance/currencyConversion";
import { useAppData } from "@/src/presentation/providers/AppDataProvider";

export type MemberFilter = "all" | "linked" | "shared" | "owed-to-you" | "you-owe";
export type MemberSort = "name" | "balance" | "updated";
export type SortDirection = "asc" | "desc";

const MINIMUM_BALANCE_THRESHOLD = 0.005;

export function useMembersScreenModel() {
  const data = useAppData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MemberFilter>("all");
  const [sort, setSort] = useState<MemberSort>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [filterOpen, setFilterOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);

  const activeMatchedMembers = useMemo(() => {
    return data.members.filter((member) => {
      if (member.archived) {
        return false;
      }
      return matchesMemberQuery(member, query);
    });
  }, [data.members, query]);

  const members = useMemo(() => {
    const filtered = activeMatchedMembers.filter((member) => {
      const balance = data.memberBalances[member.id] ?? {};
      const values = Object.values(balance);
      const hasPositive = values.some(
        (value) => (value ?? 0) > MINIMUM_BALANCE_THRESHOLD,
      );
      const hasNegative = values.some(
        (value) => (value ?? 0) < -MINIMUM_BALANCE_THRESHOLD,
      );
      const hasSharedActivity =
        data.debts.some((debt) => debt.memberId === member.id && debt.groupId) ||
        data.groups.some(
          (group) =>
            !group.archived &&
            group.name.toLowerCase().includes(member.displayName.toLowerCase()),
        );

      switch (filter) {
        case "linked":
          return member.linkStatus === "linked";
        case "shared":
          return hasSharedActivity;
        case "owed-to-you":
          return hasPositive;
        case "you-owe":
          return hasNegative;
        default:
          return true;
      }
    });

    return [...filtered].sort((first, second) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sort === "balance") {
        const firstBalance = Math.abs(
          estimateMoneyMap(
            data.memberBalances[first.id] ?? {},
            data.settings,
            data.currencyRates,
          ),
        );
        const secondBalance = Math.abs(
          estimateMoneyMap(
            data.memberBalances[second.id] ?? {},
            data.settings,
            data.currencyRates,
          ),
        );
        return direction * (firstBalance - secondBalance);
      }
      if (sort === "updated") {
        return direction * first.updatedAt.localeCompare(second.updatedAt);
      }
      return direction * first.displayName.localeCompare(second.displayName);
    });
  }, [
    activeMatchedMembers,
    data.currencyRates,
    data.debts,
    data.groups,
    data.memberBalances,
    data.settings,
    filter,
    sort,
    sortDirection,
  ]);

  const youOweCount = activeMatchedMembers.filter((member) =>
    Object.values(data.memberBalances[member.id] ?? {}).some(
      (value) => (value ?? 0) < -MINIMUM_BALANCE_THRESHOLD,
    ),
  ).length;

  const owingYouCount = activeMatchedMembers.filter((member) =>
    Object.values(data.memberBalances[member.id] ?? {}).some(
      (value) => (value ?? 0) > MINIMUM_BALANCE_THRESHOLD,
    ),
  ).length;

  return {
    data,
    filter,
    filterOpen,
    members,
    optionsOpen,
    owingYouCount,
    query,
    setFilter,
    setFilterOpen,
    setOptionsOpen,
    setQuery,
    setSort,
    setSortDirection,
    sort,
    sortDirection,
    youOweCount,
  };
}
