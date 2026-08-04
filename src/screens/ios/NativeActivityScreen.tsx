import { Section } from "@expo/ui/swift-ui";
import { Stack, router } from "expo-router";

import { NativeEmptyState } from "@/src/components/ios/NativeEmptyState";
import { NativeListScreen } from "@/src/components/ios/NativeListScreen";
import { NativeNavigationRow } from "@/src/components/ios/NativeRows";
import { useAppData } from "@/src/state/AppDataProvider";

export function NativeActivityScreen() {
  const data = useAppData();
  const events = [
    ...data.activityLogs.map((item) => ({
      id: item.id,
      action: item.action,
      targetType: item.entityKind,
      targetId: item.entityId,
      date: item.createdAt,
    })),
    ...data.groupActivityLogs.map((item) => ({
      id: item.id,
      action: item.action,
      targetType: item.targetType,
      targetId: item.targetId,
      date: item.createdAt,
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 100);

  function openTarget(targetType: string, targetId: string | null) {
    if (!targetId) return;
    if (targetType.includes("debt")) {
      router.push(`/(tabs)/debts/debt/${targetId}` as never);
    } else if (targetType.includes("group") || targetType.includes("expense")) {
      router.push(`/(tabs)/groups/group/${targetId}` as never);
    } else if (targetType.includes("member")) {
      router.push(`/(tabs)/members/member/${targetId}` as never);
    }
  }

  return (
    <>
      <Stack.Title>Activity</Stack.Title>
      <NativeListScreen onRefresh={data.refresh} grouped={false}>
        <Section>
          {events.length ? (
            events.map((event) => (
              <NativeNavigationRow
                key={event.id}
                title={event.action.replaceAll("_", " ")}
                subtitle={new Date(event.date).toLocaleString()}
                value={event.targetType.replaceAll("_", " ")}
                systemImage="clock.arrow.circlepath"
                onPress={() => openTarget(event.targetType, event.targetId)}
              />
            ))
          ) : (
            <NativeEmptyState
              title="No activity yet"
              description="Record changes will appear here in chronological order."
              systemImage="clock"
            />
          )}
        </Section>
      </NativeListScreen>
    </>
  );
}
