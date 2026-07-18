import { Section } from "@expo/ui/swift-ui";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { NativeConfirmationDialog } from "@/src/components/ios/NativeConfirmationDialog";
import { DebtulatorIdentitySummary } from "@/src/components/ios/DebtulatorIdentitySummary";
import { NativeEmptyState } from "@/src/components/ios/NativeEmptyState";
import { NativeListScreen } from "@/src/components/ios/NativeListScreen";
import { NativeInfoRow, NativeNavigationRow } from "@/src/components/ios/NativeRows";
import { useAppData } from "@/src/state/AppDataProvider";
import { formatMoney } from "@/src/utils/money";

export function NativeDebtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useAppData();
  const [archivePresented, setArchivePresented] = useState(false);
  const debt = data.debts.find((item) => item.id === id);

  if (!debt) {
    return (
      <>
        <Stack.Title>Debt</Stack.Title>
        <NativeListScreen><Section><NativeEmptyState title="Debt not found" description="This debt may have been removed." systemImage="creditcard.trianglebadge.exclamationmark" /></Section></NativeListScreen>
      </>
    );
  }

  const member = data.members.find((item) => item.id === debt.memberId);
  const entries = data.ledgerEntries.filter((entry) => entry.kind === "simple_debt" && entry.sourceId === debt.id);
  const payments = data.payments.filter((payment) => payment.relatedMemberId === debt.memberId && payment.currency === debt.currency);
  const remaining = entries.reduce((total, entry) => total + entry.remainingAmount, 0);
  const attachments = data.attachments.filter((item) => item.targetType === "debt" && item.targetId === debt.id && !item.archivedAt);
  const comments = data.comments.filter((item) => item.targetType === "debt" && item.targetId === debt.id && !item.deletedAt);

  return (
    <>
      <Stack.Title>{debt.title}</Stack.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="plus"
          accessibilityLabel="Record payment"
          onPress={() => router.push(`/(tabs)/debts/payment/form?debtId=${debt.id}&memberId=${debt.memberId}` as never)}
        />
        <Stack.Toolbar.Menu icon="ellipsis.circle" accessibilityLabel="Debt actions">
          <Stack.Toolbar.MenuAction icon="square.and.pencil" onPress={() => router.push(`/(tabs)/debts/debt/form?id=${debt.id}` as never)}>
            Edit Debt
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="trash" destructive onPress={() => setArchivePresented(true)}>
            Archive Debt
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
      <NativeListScreen onRefresh={data.refresh}>
        <Section>
          <DebtulatorIdentitySummary
            title={debt.title}
            subtitle={member?.displayName || "Unknown member"}
            systemImage={debt.direction === "i_owe_them" ? "arrow.up.right.circle.fill" : "arrow.down.left.circle.fill"}
            amount={formatMoney(remaining || debt.amount, debt.currency)}
            amountLabel={debt.direction === "i_owe_them" ? "You owe" : "Owed to you"}
            amountTone={debt.direction === "i_owe_them" ? "negative" : "positive"}
            badge={debt.status}
            badgeTone={debt.status === "active" ? "brand" : debt.status === "settled" ? "positive" : "neutral"}
          />
        </Section>
        <Section title="Balance">
          <NativeInfoRow label="Original amount" value={new Intl.NumberFormat(undefined, { style: "currency", currency: debt.currency }).format(debt.amount)} />
          <NativeInfoRow label="Member" value={member?.displayName || "Unknown member"} systemImage="person" />
          <NativeInfoRow label="Status" value={debt.status} />
          <NativeInfoRow label="Confirmation" value={debt.verificationStatus.replaceAll("_", " ")} />
        </Section>
        <Section title="Dates">
          <NativeInfoRow label="Debt date" value={debt.debtDate} systemImage="calendar" />
          {debt.dueDate ? <NativeInfoRow label="Due date" value={debt.dueDate} systemImage="calendar.badge.clock" /> : null}
        </Section>
        {debt.notes || debt.sharedNotes || debt.tags.length ? (
          <Section title="Details">
            {debt.notes ? <NativeInfoRow label="Private notes" value={debt.notes} /> : null}
            {debt.sharedNotes ? <NativeInfoRow label="Shared notes" value={debt.sharedNotes} /> : null}
            {debt.tags.length ? <NativeInfoRow label="Tags" value={debt.tags.join(", ")} /> : null}
          </Section>
        ) : null}
        <Section title="Payments">
          {payments.length ? payments.map((payment) => (
            <NativeNavigationRow
              key={payment.id}
              title={new Intl.NumberFormat(undefined, { style: "currency", currency: payment.currency }).format(payment.amount)}
              subtitle={payment.paymentDate}
              value={payment.confirmationStatus.replaceAll("_", " ")}
              systemImage="banknote"
              onPress={() => router.push(`/(tabs)/debts/payment/${payment.id}` as never)}
            />
          )) : <NativeEmptyState title="No payments" description="Record a payment from the toolbar when money moves." systemImage="banknote" />}
        </Section>
        {attachments.length ? (
          <Section title="Attachments">
            {attachments.map((attachment) => (
              <NativeNavigationRow key={attachment.id} title={attachment.fileName} subtitle={attachment.attachmentKind} systemImage="paperclip" onPress={() => router.push(`/(tabs)/groups/attachment/${attachment.id}` as never)} />
            ))}
          </Section>
        ) : null}
        {comments.length ? (
          <Section title="Comments">
            {comments.map((comment) => <NativeInfoRow key={comment.id} label={comment.localAuthorLabel || "Comment"} value={comment.body} />)}
          </Section>
        ) : null}
        <NativeConfirmationDialog
          title="Archive this debt?"
          message="The debt remains in history but is removed from active balances."
          actionLabel="Archive"
          destructive
          isPresented={archivePresented}
          onPresentedChange={setArchivePresented}
          onConfirm={() => void data.updateDebt(debt.id, { status: "archived" }).then(() => router.back())}
        />
      </NativeListScreen>
    </>
  );
}
