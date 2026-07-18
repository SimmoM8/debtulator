import { Section } from "@expo/ui/swift-ui";
import { Stack, router } from "expo-router";
import { useMemo, useState } from "react";

import { NativeEmptyState } from "@/src/components/ios/NativeEmptyState";
import { NativeListScreen } from "@/src/components/ios/NativeListScreen";
import { NativeNavigationRow } from "@/src/components/ios/NativeRows";
import { useAppData } from "@/src/state/AppDataProvider";

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
              const participantCount = data.groupMembers.filter(
                (member) => member.groupId === group.id,
              ).length;
              return (
                <NativeNavigationRow
                  key={group.id}
                  title={group.name}
                  subtitle={`${group.status} · ${participantCount} ${participantCount === 1 ? "member" : "members"}`}
                  value={group.defaultCurrency}
                  systemImage="person.3"
                  onPress={() =>
                    router.push(`/(tabs)/groups/group/${group.id}` as never)
                  }
                />
              );
            })
          ) : (
            <NativeEmptyState
              title={query ? "No matching groups" : "No groups yet"}
              description="Create a group for shared expenses and settlements."
              systemImage="person.3"
            />
          )}
        </Section>
      </NativeListScreen>
    </>
  );
}
