import { Section } from "@expo/ui/swift-ui";
import { Stack, router } from "expo-router";
import { useMemo, useState } from "react";

import { DebtulatorEmptyState } from "@/src/components/ios/DebtulatorEmptyState";
import { NativeListScreen } from "@/src/components/ios/NativeListScreen";
import { NativeMemberRow } from "@/src/components/ios/NativeMemberRow";
import { estimateMoneyMap } from "@/src/services/currency";
import { useAppData } from "@/src/state/AppDataProvider";
import { formatMoney } from "@/src/utils/money";

export function NativeMembersScreen() {
  const data = useAppData();
  const [query, setQuery] = useState("");
  const members = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return data.members
      .filter((member) => !member.archived)
      .filter(
        (member) =>
          !normalized ||
          [member.displayName, member.email, member.phone, member.notes]
            .filter(Boolean)
            .some((value) => value!.toLocaleLowerCase().includes(normalized)),
      )
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [data.members, query]);

  return (
    <>
      <Stack.Title large>Members</Stack.Title>
      <Stack.SearchBar
        placeholder="Search members"
        hideWhenScrolling
        onChangeText={(event) => setQuery(event.nativeEvent.text)}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="plus"
          accessibilityLabel="Add member"
          onPress={() => router.push("/(tabs)/members/member/form" as never)}
        />
      </Stack.Toolbar>
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
                  balance={formatMoney(Math.abs(balanceValue), data.settings.baseCurrency)}
                  balanceValue={balanceValue}
                  onPress={() =>
                    router.push(
                      `/(tabs)/members/member/${member.id}` as never,
                    )
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
              onAction={query ? undefined : () => router.push("/(tabs)/members/member/form" as never)}
            />
          )}
        </Section>
      </NativeListScreen>
    </>
  );
}
