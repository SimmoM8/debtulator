import { Button, Section, Text, VStack } from "@expo/ui/swift-ui";
import { buttonStyle, font, foregroundStyle } from "@expo/ui/swift-ui/modifiers";
import { Stack, router } from "expo-router";

import { NativeEmptyState } from "@/src/components/ios/NativeEmptyState";
import { NativeListScreen } from "@/src/components/ios/NativeListScreen";
import { useAppData } from "@/src/state/AppDataProvider";

export function NativeNotificationCenterScreen() {
  const data = useAppData();
  const notifications = [...data.notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  function openTarget(targetType: string | null, targetId: string | null) {
    if (!targetType || !targetId) return;
    if (targetType.includes("debt")) router.push(`/(tabs)/debts/debt/${targetId}` as never);
    else if (targetType.includes("group") || targetType.includes("expense")) router.push(`/(tabs)/groups/group/${targetId}` as never);
    else if (targetType.includes("member")) router.push(`/(tabs)/members/member/${targetId}` as never);
  }

  return (
    <>
      <Stack.Title>Notifications</Stack.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="Mark all notifications as read"
          icon="checkmark.circle"
          disabled={!notifications.some((item) => !item.readAt)}
          onPress={() => void data.markAllNotificationsRead()}
        />
      </Stack.Toolbar>
      <NativeListScreen onRefresh={data.refresh} grouped={false}>
        <Section>
          {notifications.length ? (
            notifications.map((notification) => (
              <Button
                key={notification.id}
                onPress={() => {
                  if (!notification.readAt) void data.markNotificationRead(notification.id);
                  openTarget(notification.targetType, notification.targetId);
                }}
                modifiers={[buttonStyle("plain")]}
              >
                <VStack alignment="leading" spacing={3}>
                  <Text modifiers={[font({ textStyle: "body", weight: notification.readAt ? "regular" : "semibold" })]}>
                    {notification.title}
                  </Text>
                  <Text
                    modifiers={[
                      font({ textStyle: "subheadline" }),
                      foregroundStyle({ type: "hierarchical", style: "secondary" }),
                    ]}
                  >
                    {notification.body}
                  </Text>
                  <Text
                    modifiers={[
                      font({ textStyle: "caption" }),
                      foregroundStyle({ type: "hierarchical", style: "tertiary" }),
                    ]}
                  >
                    {new Date(notification.createdAt).toLocaleString()}
                  </Text>
                </VStack>
              </Button>
            ))
          ) : (
            <NativeEmptyState
              title="No notifications"
              description="Shared activity and reminders appear here."
              systemImage="bell"
            />
          )}
        </Section>
      </NativeListScreen>
    </>
  );
}
