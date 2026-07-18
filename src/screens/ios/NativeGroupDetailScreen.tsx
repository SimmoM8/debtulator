import { Section } from "@expo/ui/swift-ui";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { NativeConfirmationDialog } from "@/src/components/ios/NativeConfirmationDialog";
import { DebtulatorIdentitySummary } from "@/src/components/ios/DebtulatorIdentitySummary";
import { NativeEmptyState } from "@/src/components/ios/NativeEmptyState";
import { NativeListScreen } from "@/src/components/ios/NativeListScreen";
import { NativeInfoRow, NativeNavigationRow } from "@/src/components/ios/NativeRows";
import { estimateMoneyMap } from "@/src/services/currency";
import { explainGroupSettlement } from "@/src/services/ledger";
import { useAppData } from "@/src/state/AppDataProvider";
import { formatMoney } from "@/src/utils/money";

export function NativeGroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useAppData();
  const [archivePresented, setArchivePresented] = useState(false);
  const group = data.groups.find((item) => item.id === id);

  if (!group) {
    return <><Stack.Title>Group</Stack.Title><NativeListScreen><Section><NativeEmptyState title="Group not found" description="This group may have been removed." systemImage="person.3" /></Section></NativeListScreen></>;
  }

  const members = data.groupMembers
    .filter((item) => item.groupId === group.id)
    .map((item) => data.members.find((member) => member.id === item.memberId))
    .filter(Boolean);
  const sharedMembers = data.sharedGroupMembers.filter((item) => item.groupId === group.id && item.status === "active");
  const expenses = data.sharedExpenses.filter((item) => item.groupId === group.id && item.status !== "archived");
  const groupDebts = data.groupDebts.filter((item) => item.groupId === group.id && item.status !== "archived");
  const settlements = data.settlements.filter((item) => item.groupId === group.id && item.status !== "archived");
  const groupBalance = estimateMoneyMap(
    explainGroupSettlement(group.id, data.ledgerEntries).participantNets.me ?? {},
    data.settings,
    data.currencyRates,
  );
  const participantCount = members.length + sharedMembers.length;
  const settled = Math.abs(groupBalance) <= 0.005;

  return (
    <>
      <Stack.Title>{group.name}</Stack.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="plus" accessibilityLabel="Add expense" onPress={() => router.push(`/(tabs)/groups/expense/form?groupId=${group.id}` as never)} />
        <Stack.Toolbar.Menu icon="ellipsis.circle" accessibilityLabel="Group actions">
          <Stack.Toolbar.MenuAction icon="square.and.pencil" onPress={() => router.push(`/(tabs)/groups/group/form?id=${group.id}` as never)}>Edit Group</Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="trash" destructive onPress={() => setArchivePresented(true)}>Archive Group</Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
      <NativeListScreen onRefresh={data.refresh}>
        <Section>
          <DebtulatorIdentitySummary
            title={group.name}
            subtitle={`${group.visibility === "shared" ? "Shared" : "Private"} group · ${participantCount} ${participantCount === 1 ? "member" : "members"}`}
            avatarName={group.name}
            amount={formatMoney(Math.abs(groupBalance), data.settings.baseCurrency)}
            amountLabel={settled ? "Group balance" : groupBalance > 0 ? "Owed to you" : "You owe"}
            amountTone={settled ? "neutral" : groupBalance > 0 ? "positive" : "negative"}
            badge={settled ? "Balanced" : group.status}
            badgeTone={settled ? "positive" : "brand"}
          />
        </Section>
        <Section title="Overview">
          <NativeInfoRow label="Status" value={group.status} systemImage="circlebadge" />
          <NativeInfoRow label="Visibility" value={group.visibility} systemImage="eye" />
          <NativeInfoRow label="Currency" value={group.defaultCurrency} systemImage="coloncurrencysign.circle" />
          <NativeInfoRow label="Sync" value={group.syncStatus.replaceAll("_", " ")} systemImage="arrow.triangle.2.circlepath" />
          {group.notes ? <NativeInfoRow label="Notes" value={group.notes} /> : null}
          {group.tags.length ? <NativeInfoRow label="Tags" value={group.tags.join(", ")} /> : null}
        </Section>
        <Section title="Members">
          {members.map((member) => member ? <NativeNavigationRow key={member.id} title={member.displayName} subtitle="Ledger member" systemImage="person.crop.circle" onPress={() => router.push(`/(tabs)/members/member/${member.id}` as never)} /> : null)}
          {sharedMembers.map((member) => <NativeInfoRow key={member.id} label={member.alias || member.displayName} value={member.type.replaceAll("_", " ")} systemImage="person.crop.circle.badge.checkmark" />)}
          {!members.length && !sharedMembers.length ? <NativeEmptyState title="No group members" description="Edit the group to add members." systemImage="person.2" /> : null}
        </Section>
        <Section title="Expenses">
          {expenses.length ? expenses.map((expense) => (
            <NativeNavigationRow key={expense.id} title={expense.title} subtitle={expense.expenseDate} value={new Intl.NumberFormat(undefined, { style: "currency", currency: expense.currency }).format(expense.amount)} systemImage="cart" onPress={() => router.push(`/(tabs)/groups/expense/${expense.id}` as never)} />
          )) : <NativeEmptyState title="No expenses" description="Add a shared expense from the toolbar." systemImage="cart" />}
        </Section>
        {groupDebts.length ? <Section title="Group Debts">{groupDebts.map((debt) => <NativeInfoRow key={debt.id} label={debt.title} value={new Intl.NumberFormat(undefined, { style: "currency", currency: debt.currency }).format(debt.amount)} />)}</Section> : null}
        {settlements.length ? <Section title="Settlements">{settlements.map((settlement) => <NativeNavigationRow key={settlement.id} title={settlement.type === "manual" ? "Manual settlement" : "Suggested settlement"} subtitle={settlement.status} value={new Intl.NumberFormat(undefined, { style: "currency", currency: settlement.currency }).format(settlement.totalAmount)} systemImage="checkmark.circle" onPress={() => router.push(`/(tabs)/groups/settlement/${settlement.id}` as never)} />)}</Section> : null}
        <NativeConfirmationDialog title={`Archive ${group.name}?`} message="The group remains available in history but is removed from active lists." actionLabel="Archive" destructive isPresented={archivePresented} onPresentedChange={setArchivePresented} onConfirm={() => void data.updateGroup(group.id, { archived: true }).then(() => router.back())} />
      </NativeListScreen>
    </>
  );
}
