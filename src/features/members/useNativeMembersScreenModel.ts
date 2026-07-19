import { useMemo, useState } from "react";

import { matchesMemberQuery } from "@/src/features/members/memberSearch";
import { estimateMoneyMap } from "@/src/services/currency";
import { useAppData } from "@/src/state/AppDataProvider";

export type NativeMembersSort = "name" | "recent" | "balance";

export function useNativeMembersScreenModel() {
  const data = useAppData();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<NativeMembersSort>("name");

  const members = useMemo(() => {
    const filtered = data.members
      .filter((member) => !member.archived)
      .filter((member) => matchesMemberQuery(member, query));

    if (sort === "recent") {
      return filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }

    if (sort === "balance") {
      return filtered.sort((a, b) => {
        const aBalance = Math.abs(
          estimateMoneyMap(
            data.memberBalances[a.id] ?? {},
            data.settings,
            data.currencyRates,
          ),
        );
        const bBalance = Math.abs(
          estimateMoneyMap(
            data.memberBalances[b.id] ?? {},
            data.settings,
            data.currencyRates,
          ),
        );
        return bBalance - aBalance;
      });
    }

    return filtered.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [
    data.currencyRates,
    data.memberBalances,
    data.members,
    data.settings,
    query,
    sort,
  ]);

  return {
    data,
    members,
    query,
    setQuery,
    sort,
    setSort,
  };
}
