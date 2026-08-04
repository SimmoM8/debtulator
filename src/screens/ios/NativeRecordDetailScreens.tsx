import { Button, Image, Section, ShareLink, Text } from "@expo/ui/swift-ui";
import { buttonStyle, font, foregroundStyle, frame } from "@expo/ui/swift-ui/modifiers";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { NativeConfirmationDialog } from "@/src/components/ios/NativeConfirmationDialog";
import { DebtulatorIdentitySummary } from "@/src/components/ios/DebtulatorIdentitySummary";
import { NativeEmptyState } from "@/src/components/ios/NativeEmptyState";
import { NativeListScreen } from "@/src/components/ios/NativeListScreen";
import { NativeInfoRow, NativeNavigationRow } from "@/src/components/ios/NativeRows";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";
import { formatMoney } from "@/src/utils/money";

function MissingRecord({ title }: { title: string }) {
  return (
    <>
      <Stack.Title>{title}</Stack.Title>
      <NativeListScreen>
        <Section>
          <NativeEmptyState title={`${title} not found`} description="The record may have been removed or is not available on this device." systemImage="questionmark.folder" />
        </Section>
      </NativeListScreen>
    </>
  );
}

function NativeAttachmentsAndComments({ targetId, targetType }: { targetId: string; targetType: "shared_expense" | "payment" | "settlement" }) {
  const data = useAppData();
  const attachments = data.attachments.filter((item) => item.targetType === targetType && item.targetId === targetId && !item.archivedAt);
  const comments = data.comments.filter((item) => item.targetType === targetType && item.targetId === targetId && !item.deletedAt);
  return (
    <>
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
    </>
  );
}

export function NativeExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useAppData();
  const expense = data.sharedExpenses.find((item) => item.id === id);
  if (!expense) return <MissingRecord title="Expense" />;
  const group = data.groups.find((item) => item.id === expense.groupId);

  return (
    <>
      <Stack.Title>{expense.title}</Stack.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="square.and.pencil" accessibilityLabel="Edit expense" onPress={() => router.push(`/(tabs)/groups/expense/form?id=${expense.id}&groupId=${expense.groupId}` as never)} />
      </Stack.Toolbar>
      <NativeListScreen onRefresh={data.refresh}>
        <Section>
          <DebtulatorIdentitySummary
            title={expense.title}
            subtitle={group?.name || "Shared expense"}
            amount={formatMoney(expense.amount, expense.currency)}
            amountLabel="Shared expense"
            amountTone="brand"
            badge={expense.status}
            badgeTone={expense.status === "active" ? "brand" : "neutral"}
            systemImage="cart.fill"
          />
        </Section>
        <Section title="Expense">
          <NativeInfoRow label="Amount" value={new Intl.NumberFormat(undefined, { style: "currency", currency: expense.currency }).format(expense.amount)} systemImage="creditcard" />
          <NativeInfoRow label="Group" value={group?.name || "Unknown group"} systemImage="person.3" />
          <NativeInfoRow label="Date" value={expense.expenseDate} systemImage="calendar" />
          <NativeInfoRow label="Split" value={expense.splitMethod.replaceAll("_", " ")} />
          <NativeInfoRow label="Status" value={expense.status} />
          <NativeInfoRow label="Confirmation" value={expense.verificationStatus.replaceAll("_", " ")} />
          {expense.notes ? <NativeInfoRow label="Notes" value={expense.notes} /> : null}
          {expense.tags.length ? <NativeInfoRow label="Tags" value={expense.tags.join(", ")} /> : null}
        </Section>
        <Section title="Participants">
          {expense.participantIds.map((participantId) => {
            const member = participantId === "me" ? undefined : data.sharedGroupMembers.find((item) => item.id === participantId);
            return <NativeInfoRow key={participantId} label={participantId === "me" ? "You" : member?.alias || member?.displayName || "Participant"} value={participantId === expense.payerId ? "Paid" : "Included"} />;
          })}
        </Section>
        <NativeAttachmentsAndComments targetId={expense.id} targetType="shared_expense" />
      </NativeListScreen>
    </>
  );
}

export function NativePaymentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useAppData();
  const payment = data.payments.find((item) => item.id === id);
  if (!payment) return <MissingRecord title="Payment" />;
  const member = data.members.find((item) => item.id === payment.relatedMemberId);
  return (
    <>
      <Stack.Title>Payment Details</Stack.Title>
      <NativeListScreen onRefresh={data.refresh}>
        <Section>
          <DebtulatorIdentitySummary
            title="Payment"
            subtitle={member?.displayName || payment.paymentDate}
            amount={formatMoney(payment.amount, payment.currency)}
            amountLabel="Money recorded"
            amountTone="positive"
            badge={payment.status.replaceAll("_", " ")}
            badgeTone={payment.status === "confirmed" ? "positive" : "brand"}
            systemImage="banknote.fill"
          />
        </Section>
        <Section title="Payment">
          <NativeInfoRow label="Amount" value={new Intl.NumberFormat(undefined, { style: "currency", currency: payment.currency }).format(payment.amount)} systemImage="banknote" />
          <NativeInfoRow label="Date" value={payment.paymentDate} systemImage="calendar" />
          {member ? <NativeInfoRow label="Member" value={member.displayName} systemImage="person" /> : null}
          <NativeInfoRow label="Status" value={payment.status.replaceAll("_", " ")} />
          <NativeInfoRow label="Confirmation" value={payment.confirmationStatus.replaceAll("_", " ")} />
          <NativeInfoRow label="Visibility" value={payment.visibility.replaceAll("_", " ")} />
          {payment.notes ? <NativeInfoRow label="Notes" value={payment.notes} /> : null}
        </Section>
        <NativeAttachmentsAndComments targetId={payment.id} targetType="payment" />
      </NativeListScreen>
    </>
  );
}

export function NativeSettlementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useAppData();
  const settlement = data.settlements.find((item) => item.id === id);
  if (!settlement) return <MissingRecord title="Settlement" />;
  const lines = data.settlementLines.filter((item) => item.settlementId === id);
  return (
    <>
      <Stack.Title>Settlement</Stack.Title>
      <NativeListScreen onRefresh={data.refresh}>
        <Section>
          <DebtulatorIdentitySummary
            title="Settlement"
            subtitle={settlement.type === "manual" ? "Manual settlement" : "Suggested settlement"}
            amount={formatMoney(settlement.totalAmount, settlement.currency)}
            amountLabel="Settled value"
            amountTone="positive"
            badge={settlement.status.replaceAll("_", " ")}
            badgeTone={settlement.status === "confirmed" ? "positive" : "brand"}
            systemImage="checkmark.circle.fill"
          />
        </Section>
        <Section title="Settlement">
          <NativeInfoRow label="Amount" value={new Intl.NumberFormat(undefined, { style: "currency", currency: settlement.currency }).format(settlement.totalAmount)} systemImage="checkmark.circle" />
          <NativeInfoRow label="Type" value={settlement.type.replaceAll("_", " ")} />
          <NativeInfoRow label="Status" value={settlement.status.replaceAll("_", " ")} />
          <NativeInfoRow label="Confirmation" value={settlement.confirmationStatus.replaceAll("_", " ")} />
          {settlement.notes ? <NativeInfoRow label="Notes" value={settlement.notes} /> : null}
          {settlement.conversionNote ? <NativeInfoRow label="Conversion" value={settlement.conversionNote} /> : null}
        </Section>
        {lines.length ? <Section title="Applied Records">{lines.map((line) => <NativeInfoRow key={line.id} label={line.sourceRecordType.replaceAll("_", " ")} value={new Intl.NumberFormat(undefined, { style: "currency", currency: line.currency }).format(line.appliedAmount)} />)}</Section> : null}
        <NativeAttachmentsAndComments targetId={settlement.id} targetType="settlement" />
      </NativeListScreen>
    </>
  );
}

export function NativeAttachmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useAppData();
  const auth = useAuth();
  const [archivePresented, setArchivePresented] = useState(false);
  const attachment = data.attachments.find((item) => item.id === id && !item.archivedAt);
  if (!attachment) return <MissingRecord title="Attachment" />;
  const shareItem = attachment.localUri || attachment.remoteUrl || "";
  return (
    <>
      <Stack.Title>Attachment</Stack.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="ellipsis.circle" accessibilityLabel="Attachment actions">
          <Stack.Toolbar.MenuAction icon="trash" destructive onPress={() => setArchivePresented(true)}>Remove Attachment</Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
      <NativeListScreen>
        <Section>
          {attachment.localUri ? (
            <Image uiImage={attachment.localUri} modifiers={[frame({ maxWidth: 320, minHeight: 220 })]} />
          ) : (
            <NativeEmptyState title="Preview unavailable" description="The attachment metadata is still available." systemImage="doc" />
          )}
        </Section>
        <Section title="File">
          <NativeInfoRow label="Name" value={attachment.fileName} />
          <NativeInfoRow label="Type" value={attachment.attachmentKind} />
          <NativeInfoRow label="Visibility" value={attachment.visibility} />
          <NativeInfoRow label="Size" value={attachment.fileSize ? `${Math.round(attachment.fileSize / 1024)} KB` : "Unknown"} />
          {shareItem ? <ShareLink item={shareItem}><Text>Share Attachment</Text></ShareLink> : null}
        </Section>
        <NativeConfirmationDialog title="Remove attachment?" message="The file is archived and no longer appears on this record." actionLabel="Remove" destructive isPresented={archivePresented} onPresentedChange={setArchivePresented} onConfirm={() => void data.archiveAttachment(attachment.id, auth.identity.authenticatedUserId).then(() => router.back())} />
      </NativeListScreen>
    </>
  );
}

export function NativeConflictDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useAppData();
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);
  const conflict = data.syncConflicts.find((item) => item.id === id);
  if (!conflict) return <MissingRecord title="Conflict" />;
  const conflictId = conflict.id;

  async function resolve(resolution: "keep_mine" | "keep_theirs" | "merge") {
    try {
      setError(null);
      await data.resolveSyncConflict(conflictId, resolution, auth.identity.authenticatedUserId);
      router.back();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The conflict could not be resolved.");
    }
  }

  return (
    <>
      <Stack.Title>Conflict Review</Stack.Title>
      <NativeListScreen>
        <Section title="Record">
          <NativeInfoRow label="Type" value={conflict.entityType.replaceAll("_", " ")} />
          <NativeInfoRow label="Problem" value={conflict.conflictType.replaceAll("_", " ")} />
          <NativeInfoRow label="Detected" value={new Date(conflict.detectedAt).toLocaleString()} />
          <NativeInfoRow label="Status" value={conflict.status} />
        </Section>
        <Section title="Your Version">
          <Text modifiers={[font({ textStyle: "footnote", design: "monospaced" })]}>{JSON.stringify(conflict.localSnapshot, null, 2)}</Text>
        </Section>
        <Section title="Shared Version">
          <Text modifiers={[font({ textStyle: "footnote", design: "monospaced" })]}>{JSON.stringify(conflict.remoteSnapshot, null, 2)}</Text>
        </Section>
        {error ? <Section title="Could Not Resolve"><Text modifiers={[foregroundStyle("red")]}>{error}</Text></Section> : null}
        <Section title="Resolution">
          <Button label="Keep Mine" onPress={() => void resolve("keep_mine")} modifiers={[buttonStyle("borderedProminent")]} />
          <Button label="Use Shared Version" onPress={() => void resolve("keep_theirs")} modifiers={[buttonStyle("bordered")]} />
          <Button label="Merge Safe Fields" onPress={() => void resolve("merge")} modifiers={[buttonStyle("bordered")]} />
        </Section>
      </NativeListScreen>
    </>
  );
}
