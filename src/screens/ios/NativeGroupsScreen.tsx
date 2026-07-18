import { Section } from "@expo/ui/swift-ui";
import { Stack, router } from "expo-router";
import { useMemo, useState } from "react";

import { DebtulatorEmptyState } from "@/src/components/ios/DebtulatorEmptyState";
import { DebtulatorGroupRow } from "@/src/components/ios/DebtulatorRows";
import { NativeListScreen } from "@/src/components/ios/NativeListScreen";
import { estimateMoneyMap } from "@/src/services/currency";
import { explainGroupSettlement } from "@/src/services/ledger";
import { useAppData } from "@/src/state/AppDataProvider";
import { formatMoney } from "@/src/utils/money";

export function NativeGroupsScreen() {
  const data = useAppData();
  const [query, setQuery] = useState("");
  const groups = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return data.groups
      .filter((group) => !group.archived)
      .filter(
        (group) =>
          !normalized ||
          [group.name, group.notes, ...group.tags]
            .filter(Boolean)
            .some((value) => value!.toLocaleLowerCase().includes(normalized)),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data.groups, query]);

  return (
    <>
      <Stack.Title large>Groups</Stack.Title>
      <Stack.SearchBar
        placeholder="Search groups"
        hideWhenScrolling
        onChangeText={(event) => setQuery(event.nativeEvent.text)}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="plus"
          accessibilityLabel="Add group"
          onPress={() => router.push("/(tabs)/groups/group/form" as never)}
        />
      </Stack.Toolbar>
      <NativeListScreen onRefresh={data.refresh} grouped={false}>
        <Section>
          {groups.length ? (
            groups.map((group) => {
              const localCount = data.groupMembers.filter(
                (member) => member.groupId === group.id,
              ).length;
              const sharedCount = data.sharedGroupMembers.filter(
                (member) => member.groupId === group.id && !["archived", "merged"].includes(member.status),
              ).length;
              const participantCount = group.visibility === "shared" ? sharedCount : localCount;
              const net = estimateMoneyMap(
                explainGroupSettlement(group.id, data.ledgerEntries).participantNets.me ?? {},
                data.settings,
                data.currencyRates,
              );
              const settled = Math.abs(net) <= 0.005;
              return (
                <DebtulatorGroupRow
                  key={group.id}
                  name={group.name}
                  subtitle={`${group.visibility === "shared" ? "Shared" : "Private"} · ${group.status}`}
                  memberCount={participantCount}
                  amount={formatMoney(Math.abs(net), data.settings.baseCurrency)}
                  balanceLabel={settled ? "Balanced" : net > 0 ? "Owed to you" : "You owe"}
                  tone={settled ? "neutral" : net > 0 ? "positive" : "negative"}
                  onPress={() =>
                    router.push(`/(tabs)/groups/group/${group.id}` as never)
                  }
                />
              );
            })
          ) : (
            <DebtulatorEmptyState
              title={query ? "No matching groups" : "No groups yet"}
              description="Create a group for shared expenses and settlements."
              systemImage="person.3"
              actionLabel={query ? undefined : "Create Group"}
              onAction={query ? undefined : () => router.push("/(tabs)/groups/group/form" as never)}
            />
          )}
        </Section>
      </NativeListScreen>
    </>
  );
}
