import { Section } from "@expo/ui/swift-ui";
import { router } from "expo-router";

import { DebtulatorEmptyState } from "@/src/components/ios/DebtulatorEmptyState";
import { NativeCollectionNavigation } from "@/src/components/ios/NativeCollectionNavigation";
import { NativeListScreen } from "@/src/components/ios/NativeListScreen";
import { NativeMemberRow } from "@/src/components/ios/NativeMemberRow";
import { useNativeMembersScreenModel } from "@/src/features/members/useNativeMembersScreenModel";
import { estimateMoneyMap } from "@/src/services/currency";
import { formatMoney } from "@/src/utils/money";

export function NativeMembersScreen() {
  const { data, members, query, setQuery, sort, setSort } =
    useNativeMembersScreenModel();

  return (
    <>
      <NativeCollectionNavigation
        searchPlaceholder="Search members"
        onSearchChange={setQuery}
        leadingAccessibilityLabel="Sort members"
        leadingActions={[
          {
            label: "Name",
            selected: sort === "name",
            onPress: () => setSort("name"),
          },
          {
            label: "Recently Updated",
            selected: sort === "recent",
            onPress: () => setSort("recent"),
          },
          {
            label: "Largest Balance",
            selected: sort === "balance",
            onPress: () => setSort("balance"),
          },
        ]}
        addAccessibilityLabel="Add member"
        onAdd={() => router.push("/(tabs)/members/member/form" as never)}
      />
      <NativeListScreen onRefresh={data.refresh} grouped={false}>
        <Section>
          {members.length ? (
            members.map((member) => {
              const balanceValue = estimateMoneyMap(
                data.memberBalances[member.id] ?? {},
                data.settings,
                data.currencyRates,
              );
              return (
                <NativeMemberRow
                  key={member.id}
                  member={member}
                  balance={formatMoney(
                    Math.abs(balanceValue),
                    data.settings.baseCurrency,
                  )}
                  balanceValue={balanceValue}
                  onPress={() =>
                    router.push(`/(tabs)/members/member/${member.id}` as never)
                  }
                />
              );
            })
          ) : (
            <DebtulatorEmptyState
              title={query ? "No matching members" : "No members yet"}
              description={
                query
                  ? "Try a different name, email address or phone number."
                  : "Add a member to start tracking who owes whom."
              }
              systemImage="person.2"
              actionLabel={query ? undefined : "Add Member"}
              onAction={
                query
                  ? undefined
                  : () => router.push("/(tabs)/members/member/form" as never)
              }
            />
          )}
        </Section>
      </NativeListScreen>
    </>
  );
}
