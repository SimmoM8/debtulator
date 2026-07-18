import { Section, Text } from "@expo/ui/swift-ui";
import { font, foregroundStyle } from "@expo/ui/swift-ui/modifiers";
import { Stack, router } from "expo-router";

import { NativeEmptyState } from "@/src/components/ios/NativeEmptyState";
import { NativeListScreen } from "@/src/components/ios/NativeListScreen";
import {
  NativeInfoRow,
  NativeNavigationRow,
} from "@/src/components/ios/NativeRows";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";

function moneyMapLabel(values: Record<string, number | undefined>) {
  const parts = Object.entries(values)
    .filter(([, amount]) => Math.abs(amount ?? 0) > 0.005)
    .map(([currency, amount]) =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(amount ?? 0),
    );
  return parts.join(" · ") || "—";
}

export function NativeDashboardScreen() {
  const data = useAppData();
  const auth = useAuth();
  const activeEntries = data.ledgerEntries.filter(
    (entry) => entry.status === "active" && entry.remainingAmount > 0.005,
  );
  const recentEntries = [...activeEntries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  const pendingCount =
    data.linkRequests.filter((item) => item.status === "pending").length +
    data.debtVerifications.filter((item) => item.status === "pending").length +
    data.groupInvites.filter((item) => item.status === "pending").length;

  return (
    <>
      <Stack.Title large>Home</Stack.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="plus" accessibilityLabel="Add">
          <Stack.Toolbar.MenuAction
            icon="doc.text"
            onPress={() => router.push("/(tabs)/debts/debt/form" as never)}
          >
            Add Debt
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="person.badge.plus"
            onPress={() => router.push("/(tabs)/members/member/form" as never)}
          >
            Add Member
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="person.3"
            onPress={() => router.push("/(tabs)/groups/group/form" as never)}
          >
            Add Group
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
      <NativeListScreen onRefresh={auth.refreshSync}>
        <Section
          header={
            <Text modifiers={[font({ textStyle: "headline" })]}>
              {auth.identity.displayName
                ? `Hello, ${auth.identity.displayName.split(" ")[0]}`
                : "Your snapshot"}
            </Text>
          }
        >
          <NativeInfoRow
            label="Net position"
            value={moneyMapLabel(data.personalTotals.net)}
            systemImage="equal.circle"
          />
          <NativeInfoRow
            label="Owed to you"
            value={moneyMapLabel(data.personalTotals.owedToMe)}
            systemImage="arrow.down.left.circle"
          />
          <NativeInfoRow
            label="You owe"
            value={moneyMapLabel(data.personalTotals.iOwe)}
            systemImage="arrow.up.right.circle"
          />
        </Section>

        <Section title="Needs attention">
          <NativeNavigationRow
            title="Requests"
            subtitle="Invites, confirmations and shared approvals"
            value={pendingCount ? String(pendingCount) : undefined}
            systemImage="tray.full"
            onPress={() => router.push("/(tabs)/home/requests" as never)}
          />
          <NativeNavigationRow
            title="Activity"
            subtitle="Recent changes across your ledger"
            systemImage="clock.arrow.circlepath"
            onPress={() => router.push("/(tabs)/home/activity" as never)}
          />
        </Section>

        <Section title="Recent debts">
          {recentEntries.length ? (
            recentEntries.map((entry) => (
              <NativeNavigationRow
                key={entry.id}
                title={entry.title}
                subtitle={entry.dueDate ? `Due ${entry.dueDate}` : entry.date}
                value={new Intl.NumberFormat(undefined, {
                  style: "currency",
                  currency: entry.currency,
                }).format(entry.remainingAmount)}
                systemImage="creditcard"
                onPress={() => {
                  if (entry.kind === "simple_debt") {
                    router.push(
                      `/(tabs)/debts/debt/${entry.sourceId}` as never,
                    );
                  } else if (entry.groupId) {
                    router.push(
                      `/(tabs)/groups/group/${entry.groupId}` as never,
                    );
                  }
                }}
              />
            ))
          ) : (
            <NativeEmptyState
              title="No active debts"
              description="Add a debt or group expense to begin tracking balances."
              systemImage="checkmark.circle"
            />
          )}
        </Section>

        <Section title="Tools">
          <NativeNavigationRow
            title="Insights"
            subtitle="Review balance and activity trends"
            systemImage="chart.bar.xaxis"
            onPress={() => router.push("/(tabs)/home/analytics" as never)}
          />
          <NativeNavigationRow
            title="Suggestions"
            subtitle="Review useful cleanup and recurring ideas"
            systemImage="sparkles"
            onPress={() => router.push("/(tabs)/home/suggestions" as never)}
          />
        </Section>

        <Section>
          <Text
            modifiers={[
              font({ textStyle: "footnote" }),
              foregroundStyle({ type: "hierarchical", style: "secondary" }),
            ]}
          >
            Values use each record’s currency. Debtulator does not apply Liquid
            Glass to ledger content.
          </Text>
        </Section>
      </NativeListScreen>
    </>
  );
}
