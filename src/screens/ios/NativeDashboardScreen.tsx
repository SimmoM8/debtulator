import { Section } from "@expo/ui/swift-ui";
import { Stack, router } from "expo-router";

import { DebtulatorBalanceHero } from "@/src/components/ios/DebtulatorBalanceHero";
import { DebtulatorEmptyState } from "@/src/components/ios/DebtulatorEmptyState";
import { DebtulatorFinancialRow } from "@/src/components/ios/DebtulatorRows";
import { NativeListScreen } from "@/src/components/ios/NativeListScreen";
import { NativeNavigationRow } from "@/src/components/ios/NativeRows";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";
import { estimateMoneyMap } from "@/src/services/currency";
import { formatMoney } from "@/src/utils/money";

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
  const baseCurrency = data.settings.baseCurrency;
  const net = estimateMoneyMap(data.personalTotals.net, data.settings, data.currencyRates);
  const owedToUser = estimateMoneyMap(data.personalTotals.owedToMe, data.settings, data.currencyRates);
  const owedByUser = estimateMoneyMap(data.personalTotals.iOwe, data.settings, data.currencyRates);
  const hour = new Date().getHours();
  const salutation = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = auth.identity.displayName?.split(" ")[0];

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
        <Section>
          <DebtulatorBalanceHero
            greeting={`${salutation}${firstName ? `, ${firstName}` : ""}`}
            netAmount={formatMoney(net, baseCurrency, { signed: true })}
            owedToUser={formatMoney(owedToUser, baseCurrency)}
            owedByUser={formatMoney(owedByUser, baseCurrency)}
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
            recentEntries.map((entry) => {
              const owedToMe = entry.toId === "me";
              return (
                <DebtulatorFinancialRow
                  key={entry.id}
                  title={entry.title}
                  subtitle={entry.dueDate ? `Due ${entry.dueDate}` : entry.date}
                  amount={formatMoney(entry.remainingAmount, entry.currency)}
                  tone={owedToMe ? "positive" : "negative"}
                  systemImage={owedToMe ? "arrow.down.left.circle.fill" : "arrow.up.right.circle.fill"}
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
              );
            })
          ) : (
            <DebtulatorEmptyState
              title="No active debts"
              description="Add a debt or group expense to begin tracking balances."
              systemImage="checkmark.circle"
              actionLabel="Add Debt"
              onAction={() => router.push("/(tabs)/debts/debt/form" as never)}
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

      </NativeListScreen>
    </>
  );
}
