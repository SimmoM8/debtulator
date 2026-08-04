import { Section } from "@expo/ui/swift-ui";
import { router } from "expo-router";
import { useMemo, useState } from "react";

import { DebtulatorEmptyState } from "@/src/components/ios/DebtulatorEmptyState";
import { NativeCollectionNavigation } from "@/src/components/ios/NativeCollectionNavigation";
import { NativeListScreen } from "@/src/components/ios/NativeListScreen";
import {
  NativeInfoRow,
  NativeNavigationRow,
} from "@/src/components/ios/NativeRows";
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
        if (filter === "you-owe") {
          return debt.direction === "i_owe_them" && debt.status === "active";
        }
        if (filter === "owed-to-you") {
          return debt.direction === "they_owe_me" && debt.status === "active";
        }
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
  const activeOwed = active.filter(
    (debt) => debt.direction === "they_owe_me",
  ).length;
  const activeOwing = active.filter(
    (debt) => debt.direction === "i_owe_them",
  ).length;
  const net = estimateMoneyMap(
    data.personalTotals.net,
    data.settings,
    data.currencyRates,
  );
  const netLabel =
    Math.abs(net) <= 0.005
      ? "Settled"
      : net > 0
        ? "Owed to you"
        : "You owe";

  return (
    <>
      <NativeCollectionNavigation
        title="Debts"
        searchPlaceholder="Search debts"
        onSearchChange={setQuery}
        leadingAccessibilityLabel="Filter debts"
        leadingIcon="line.3.horizontal.decrease.circle"
        leadingActions={[
          {
            label: "Active",
            selected: filter === "active",
            onPress: () => setFilter("active"),
          },
          {
            label: "You Owe",
            selected: filter === "you-owe",
            onPress: () => setFilter("you-owe"),
          },
          {
            label: "Owed to You",
            selected: filter === "owed-to-you",
            onPress: () => setFilter("owed-to-you"),
          },
          {
            label: "All",
            selected: filter === "all",
            onPress: () => setFilter("all"),
          },
        ]}
        addAccessibilityLabel="Add debt"
        onAdd={() => router.push("/(tabs)/debts/debt/form" as never)}
      />
      <NativeListScreen onRefresh={data.refresh}>
        <Section title="Overview">
          <NativeInfoRow
            label={netLabel}
            value={formatMoney(Math.abs(net), data.settings.baseCurrency)}
            systemImage="creditcard"
          />
          <NativeInfoRow label="Incoming" value={String(activeOwed)} />
          <NativeInfoRow label="Outgoing" value={String(activeOwing)} />
        </Section>

        <Section title={filter === "all" ? "Debts" : "Active debts"}>
          {debts.length ? (
            debts.map((debt) => {
              const member = data.members.find(
                (item) => item.id === debt.memberId,
              );
              const direction =
                debt.direction === "they_owe_me" ? "Owed to you" : "You owe";

              return (
                <NativeNavigationRow
                  key={debt.id}
                  title={debt.title}
                  subtitle={[member?.displayName, direction]
                    .filter(Boolean)
                    .join(" · ")}
                  value={formatMoney(debt.amount, debt.currency)}
                  systemImage={
                    debt.direction === "they_owe_me"
                      ? "arrow.down.left.circle"
                      : "arrow.up.right.circle"
                  }
                  onPress={() =>
                    router.push(`/(tabs)/debts/debt/${debt.id}` as never)
                  }
                />
              );
            })
          ) : (
            <DebtulatorEmptyState
              title={query ? "No matching debts" : "No debts here"}
              description="Change the filter or add a debt."
              systemImage="creditcard"
              actionLabel={query ? undefined : "Add Debt"}
              onAction={
                query
                  ? undefined
                  : () =>
                      router.push("/(tabs)/debts/debt/form" as never)
              }
            />
          )}
        </Section>
      </NativeListScreen>
    </>
  );
}
