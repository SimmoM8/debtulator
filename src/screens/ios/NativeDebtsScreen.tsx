import { Section } from "@expo/ui/swift-ui";
import { router } from "expo-router";
import { useMemo, useState } from "react";

import { NativeDebtRow } from "@/src/components/ios/NativeDebtRow";
import { DebtulatorEmptyState } from "@/src/components/ios/DebtulatorEmptyState";
import { DebtulatorIdentitySummary } from "@/src/components/ios/DebtulatorIdentitySummary";
import { NativeCollectionNavigation } from "@/src/components/ios/NativeCollectionNavigation";
import { NativeListScreen } from "@/src/components/ios/NativeListScreen";
import { estimateMoneyMap } from "@/src/services/currency";
import { useAppData } from "@/src/state/AppDataProvider";
import { formatMoney } from "@/src/utils/money";

type DebtFilter = "active" | "you-owe" | "owed-to-you" | "all";

export function NativeDebtsScreen() {
  const data = useAppData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DebtFilter>("active");
  const debts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return data.debts
      .filter((debt) => {
        if (filter === "active") return debt.status === "active";
        if (filter === "you-owe") return debt.direction === "i_owe_them" && debt.status === "active";
        if (filter === "owed-to-you") return debt.direction === "they_owe_me" && debt.status === "active";
        return debt.status !== "archived";
      })
      .filter((debt) => {
        const member = data.members.find((item) => item.id === debt.memberId);
        return (
          !normalized ||
          [debt.title, debt.notes, member?.displayName]
            .filter(Boolean)
            .some((value) => value!.toLocaleLowerCase().includes(normalized))
        );
      })
      .sort((a, b) => b.debtDate.localeCompare(a.debtDate));
  }, [data.debts, data.members, filter, query]);
  const active = data.debts.filter((debt) => debt.status === "active");
  const activeOwed = active.filter((debt) => debt.direction === "they_owe_me").length;
  const activeOwing = active.filter((debt) => debt.direction === "i_owe_them").length;
  const net = estimateMoneyMap(data.personalTotals.net, data.settings, data.currencyRates);
  const netTone = Math.abs(net) <= 0.005 ? "neutral" : net > 0 ? "positive" : "negative";

  return (
    <>
      <NativeCollectionNavigation
        title="Debts"
        searchPlaceholder="Search debts"
        onSearchChange={setQuery}
        leadingAccessibilityLabel="Filter debts"
        leadingIcon="line.3.horizontal.decrease.circle"
        leadingActions={[
          { label: "Active", selected: filter === "active", onPress: () => setFilter("active") },
          { label: "You Owe", selected: filter === "you-owe", onPress: () => setFilter("you-owe") },
          { label: "Owed to You", selected: filter === "owed-to-you", onPress: () => setFilter("owed-to-you") },
          { label: "All", selected: filter === "all", onPress: () => setFilter("all") },
        ]}
        addAccessibilityLabel="Add debt"
        onAdd={() => router.push("/(tabs)/debts/debt/form" as never)}
      />
      <NativeListScreen onRefresh={data.refresh} grouped={false}>
        <Section>
          <DebtulatorIdentitySummary
            title="Active balances"
            subtitle={`${active.length} open ${active.length === 1 ? "debt" : "debts"}`}
            amount={formatMoney(Math.abs(net), data.settings.baseCurrency)}
            amountLabel={Math.abs(net) <= 0.005 ? "Net settled" : net > 0 ? "Net owed to you" : "Net you owe"}
            amountTone={netTone}
            badge={`${activeOwed} incoming · ${activeOwing} outgoing`}
            badgeTone="brand"
            systemImage="creditcard.fill"
          />
        </Section>
        <Section>
          {debts.length ? (
            debts.map((debt) => (
              <NativeDebtRow
                key={debt.id}
                debt={debt}
                member={data.members.find((item) => item.id === debt.memberId)}
                onPress={() =>
                  router.push(`/(tabs)/debts/debt/${debt.id}` as never)
                }
              />
            ))
          ) : (
            <DebtulatorEmptyState
              title={query ? "No matching debts" : "No debts here"}
              description="Change the filter or add a debt."
              systemImage="creditcard"
              actionLabel={query ? undefined : "Add Debt"}
              onAction={query ? undefined : () => router.push("/(tabs)/debts/debt/form" as never)}
            />
          )}
        </Section>
      </NativeListScreen>
    </>
  );
}
