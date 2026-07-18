import { Section } from "@expo/ui/swift-ui";
import { Stack, router } from "expo-router";
import { useMemo, useState } from "react";

import { NativeEmptyState } from "@/src/components/ios/NativeEmptyState";
import { NativeListScreen } from "@/src/components/ios/NativeListScreen";
import { NativeMemberRow } from "@/src/components/ios/NativeMemberRow";
import { useAppData } from "@/src/state/AppDataProvider";

function balanceLabel(values: Record<string, number | undefined>) {
  return (
    Object.entries(values)
      .filter(([, amount]) => Math.abs(amount ?? 0) > 0.005)
      .map(([currency, amount]) =>
        new Intl.NumberFormat(undefined, {
          style: "currency",
          currency,
        }).format(amount ?? 0),
      )
      .join(" · ") || "Settled"
  );
}

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
            members.map((member) => (
              <NativeMemberRow
                key={member.id}
                member={member}
                balance={balanceLabel(data.memberBalances[member.id] ?? {})}
                onPress={() =>
                  router.push(
                    `/(tabs)/members/member/${member.id}` as never,
                  )
                }
              />
            ))
          ) : (
            <NativeEmptyState
              title={query ? "No matching members" : "No members yet"}
              description={
                query
                  ? "Try a different name, email address or phone number."
                  : "Add a member to start tracking who owes whom."
              }
              systemImage="person.2"
            />
          )}
        </Section>
      </NativeListScreen>
    </>
  );
}
