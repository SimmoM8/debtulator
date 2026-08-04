import { Section } from "@expo/ui/swift-ui";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { NativeConfirmationDialog } from "@/src/components/ios/NativeConfirmationDialog";
import { DebtulatorIdentitySummary } from "@/src/components/ios/DebtulatorIdentitySummary";
import { NativeDebtRow } from "@/src/components/ios/NativeDebtRow";
import { NativeEmptyState } from "@/src/components/ios/NativeEmptyState";
import { NativeListScreen } from "@/src/components/ios/NativeListScreen";
import { NativeInfoRow } from "@/src/components/ios/NativeRows";
import { estimateMoneyMap } from "@/src/services/currency";
import { useAppData } from "@/src/state/AppDataProvider";
import { formatMoney } from "@/src/utils/money";

export function NativeMemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useAppData();
  const [archivePresented, setArchivePresented] = useState(false);
  const member = data.members.find((item) => item.id === id);
  const debts = data.debts.filter((item) => item.memberId === id && item.status !== "archived");

  if (!member) {
    return (
      <>
        <Stack.Title>Member</Stack.Title>
        <NativeListScreen>
          <Section>
            <NativeEmptyState title="Member not found" description="This member may have been removed." systemImage="person.crop.circle.badge.questionmark" />
          </Section>
        </NativeListScreen>
      </>
    );
  }

  const balance = estimateMoneyMap(data.memberBalances[member.id] ?? {}, data.settings, data.currencyRates);
  const settled = Math.abs(balance) <= 0.005;

  return (
    <>
      <Stack.Title>{member.displayName}</Stack.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="square.and.pencil"
          accessibilityLabel="Edit member"
          onPress={() => router.push(`/(tabs)/members/member/form?id=${member.id}` as never)}
        />
        <Stack.Toolbar.Menu icon="ellipsis.circle" accessibilityLabel="Member actions">
          <Stack.Toolbar.MenuAction
            icon="trash"
            destructive
            onPress={() => setArchivePresented(true)}
          >
            Archive Member
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
      <NativeListScreen onRefresh={data.refresh}>
        <Section>
          <DebtulatorIdentitySummary
            title={member.displayName}
            subtitle={member.linkStatus === "linked" ? "Linked Debtulator member" : "Ledger member"}
            avatarName={member.displayName}
            amount={formatMoney(Math.abs(balance), data.settings.baseCurrency)}
            amountLabel={settled ? "Balance settled" : balance > 0 ? "Owes you" : "You owe"}
            amountTone={settled ? "neutral" : balance > 0 ? "positive" : "negative"}
            badge={member.linkStatus === "linked" ? "Linked" : member.linkStatus.replaceAll("_", " ")}
            badgeTone={member.linkStatus === "linked" ? "positive" : "brand"}
          />
        </Section>
        <Section title="Contact">
          {member.email ? <NativeInfoRow label="Email" value={member.email} systemImage="envelope" /> : null}
          {member.phone ? <NativeInfoRow label="Phone" value={member.phone} systemImage="phone" /> : null}
          <NativeInfoRow label="Connection" value={member.linkStatus.replaceAll("_", " ")} systemImage="link" />
          <NativeInfoRow label="Sync" value={member.syncStatus.replaceAll("_", " ")} systemImage="arrow.triangle.2.circlepath" />
        </Section>
        {member.notes || member.tags.length ? (
          <Section title="Notes and Tags">
            {member.notes ? <NativeInfoRow label="Notes" value={member.notes} /> : null}
            {member.tags.length ? <NativeInfoRow label="Tags" value={member.tags.join(", ")} /> : null}
          </Section>
        ) : null}
        <Section title="Debts">
          {debts.length ? (
            debts.map((debt) => (
              <NativeDebtRow
                key={debt.id}
                debt={debt}
                member={member}
                onPress={() => router.push(`/(tabs)/debts/debt/${debt.id}` as never)}
              />
            ))
          ) : (
            <NativeEmptyState title="No debts" description="This member has no active or settled debts." systemImage="creditcard" />
          )}
        </Section>
        <NativeConfirmationDialog
          title={`Archive ${member.displayName}?`}
          message="The member remains in existing records but is hidden from active lists."
          actionLabel="Archive"
          destructive
          isPresented={archivePresented}
          onPresentedChange={setArchivePresented}
          onConfirm={() => {
            void data.updateMember(member.id, { archived: true }).then(() => router.back());
          }}
        />
      </NativeListScreen>
    </>
  );
}
