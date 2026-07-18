import { Button, HStack, Section, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  buttonStyle,
  font,
  foregroundStyle,
} from "@expo/ui/swift-ui/modifiers";
import { Stack, router } from "expo-router";
import { useMemo, useState } from "react";

import { NativeEmptyState } from "@/src/components/ios/NativeEmptyState";
import { NativeListScreen } from "@/src/components/ios/NativeListScreen";
import { NativeNavigationRow } from "@/src/components/ios/NativeRows";
import {
  respondRemoteDebtVerification,
  respondRemotePaymentConfirmation,
  respondToRemoteLinkRequest,
} from "@/src/services/stage2Sync";
import { updateRemoteGroupInvite } from "@/src/services/stage3Sync";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";

function RequestActions({
  title,
  detail,
  value,
  onAccept,
  onReject,
  onOpen,
}: {
  title: string;
  detail: string;
  value?: string;
  onAccept: () => void;
  onReject: () => void;
  onOpen?: () => void;
}) {
  return (
    <VStack alignment="leading" spacing={8}>
      <HStack>
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[font({ textStyle: "body", weight: "semibold" })]}>
            {title}
          </Text>
          <Text
            modifiers={[
              font({ textStyle: "subheadline" }),
              foregroundStyle({ type: "hierarchical", style: "secondary" }),
            ]}
          >
            {detail}
          </Text>
        </VStack>
        <Spacer />
        {value ? <Text>{value}</Text> : null}
      </HStack>
      <HStack spacing={12}>
        <Button label="Accept" onPress={onAccept} modifiers={[buttonStyle("borderedProminent")]} />
        <Button label="Reject" role="destructive" onPress={onReject} modifiers={[buttonStyle("bordered")]} />
        {onOpen ? <Button label="Review" onPress={onOpen} modifiers={[buttonStyle("plain")]} /> : null}
      </HStack>
    </VStack>
  );
}

export function NativeRequestsScreen() {
  const data = useAppData();
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);
  const userId = auth.identity.authenticatedUserId;
  const email = auth.identity.email?.toLowerCase() ?? null;
  const incomingLinks = useMemo(
    () =>
      data.linkRequests.filter(
        (request) =>
          request.status === "pending" &&
          ((userId && request.targetUserId === userId) ||
            (email && request.targetEmail?.toLowerCase() === email)),
      ),
    [data.linkRequests, email, userId],
  );
  const incomingVerifications = data.debtVerifications.filter(
    (item) => item.status === "pending" && item.responderUserId === userId,
  );
  const incomingInvites = data.groupInvites.filter(
    (invite) =>
      invite.status === "pending" &&
      ((userId && invite.invitedUserId === userId) ||
        (email && invite.invitedEmail?.toLowerCase() === email)),
  );
  const incomingPayments = data.payments.filter(
    (payment) =>
      payment.confirmationStatus === "pending_confirmation" &&
      payment.createdByUserId !== userId &&
      (payment.payerUserId === userId || payment.payeeUserId === userId),
  );
  const pendingCount =
    incomingLinks.length +
    incomingVerifications.length +
    incomingInvites.length +
    incomingPayments.length;

  async function perform(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The request could not be updated.");
    }
  }

  return (
    <>
      <Stack.Title>Requests</Stack.Title>
      <NativeListScreen onRefresh={auth.refreshSync}>
        {!auth.user ? (
          <Section>
            <NativeEmptyState
              title="Sign in for shared requests"
              description="Local debts continue to work without an account."
              systemImage="person.badge.key"
            />
            <Button label="Sign In" onPress={() => router.push("/auth" as never)} />
          </Section>
        ) : null}

        {error ? (
          <Section title="Could Not Update Request">
            <Text modifiers={[foregroundStyle("red")]}>{error}</Text>
          </Section>
        ) : null}

        {auth.user && !pendingCount ? (
          <Section>
            <NativeEmptyState
              title="No pending requests"
              description="New confirmations, link requests and group invites appear here."
              systemImage="checkmark.circle"
            />
          </Section>
        ) : null}

        {incomingLinks.length ? (
          <Section title="Member Links">
            {incomingLinks.map((request) => (
              <RequestActions
                key={request.id}
                title={request.requesterLabel}
                detail={request.message || "Wants to connect to a member in your ledger."}
                onAccept={() =>
                  void perform(async () => {
                    if (!userId) return;
                    await respondToRemoteLinkRequest(request, "accepted");
                    await data.respondToLinkRequest(request.id, "accepted", userId);
                  })
                }
                onReject={() =>
                  void perform(async () => {
                    if (!userId) return;
                    await respondToRemoteLinkRequest(request, "rejected");
                    await data.respondToLinkRequest(request.id, "rejected", userId);
                  })
                }
              />
            ))}
          </Section>
        ) : null}

        {incomingVerifications.length ? (
          <Section title="Debt Confirmations">
            {incomingVerifications.map((verification) => {
              const debt = data.debts.find((item) => item.id === verification.debtId);
              return (
                <RequestActions
                  key={verification.id}
                  title={debt?.title || "Shared debt"}
                  detail="Confirm that this shared debt matches your understanding."
                  value={
                    debt
                      ? new Intl.NumberFormat(undefined, {
                          style: "currency",
                          currency: debt.currency,
                        }).format(debt.amount)
                      : undefined
                  }
                  onAccept={() =>
                    void perform(async () => {
                      if (!userId) return;
                      await respondRemoteDebtVerification({ verification, status: "verified" });
                      await data.respondToDebtVerification(verification.id, "verified", userId);
                    })
                  }
                  onReject={() =>
                    void perform(async () => {
                      if (!userId) return;
                      await respondRemoteDebtVerification({
                        verification,
                        status: "rejected",
                        rejectionReason: "Needs review",
                      });
                      await data.respondToDebtVerification(
                        verification.id,
                        "rejected",
                        userId,
                        "Needs review",
                      );
                    })
                  }
                  onOpen={
                    debt
                      ? () =>
                          router.push(
                            `/(tabs)/debts/debt/${debt.id}?section=confirmation` as never,
                          )
                      : undefined
                  }
                />
              );
            })}
          </Section>
        ) : null}

        {incomingPayments.length ? (
          <Section title="Payment Confirmations">
            {incomingPayments.map((payment) => (
              <RequestActions
                key={payment.id}
                title="Shared payment"
                detail={`Recorded ${payment.paymentDate}`}
                value={new Intl.NumberFormat(undefined, {
                  style: "currency",
                  currency: payment.currency,
                }).format(payment.amount)}
                onAccept={() =>
                  void perform(async () => {
                    if (!userId || !payment.remoteId) return;
                    await respondRemotePaymentConfirmation({ paymentRemoteId: payment.remoteId, status: "confirmed" });
                    await data.respondToPaymentConfirmation(payment.id, "confirmed", userId);
                  })
                }
                onReject={() =>
                  void perform(async () => {
                    if (!userId || !payment.remoteId) return;
                    await respondRemotePaymentConfirmation({ paymentRemoteId: payment.remoteId, status: "rejected" });
                    await data.respondToPaymentConfirmation(payment.id, "rejected", userId);
                  })
                }
                onOpen={() => router.push(`/(tabs)/debts/payment/${payment.id}` as never)}
              />
            ))}
          </Section>
        ) : null}

        {incomingInvites.length ? (
          <Section title="Group Invites">
            {incomingInvites.map((invite) => {
              const group = data.groups.find((item) => item.id === invite.groupId);
              return (
                <RequestActions
                  key={invite.id}
                  title={group?.name || invite.invitedDisplayName}
                  detail={`Invited as ${invite.offeredRole}`}
                  onAccept={() =>
                    void perform(async () => {
                      if (!userId) return;
                      await updateRemoteGroupInvite(invite, "accepted", userId);
                      await data.respondToGroupInvite(
                        invite.id,
                        "accepted",
                        userId,
                        auth.identity.displayName,
                        auth.identity.email,
                      );
                    })
                  }
                  onReject={() =>
                    void perform(async () => {
                      if (!userId) return;
                      await updateRemoteGroupInvite(invite, "rejected", userId);
                      await data.respondToGroupInvite(invite.id, "rejected", userId);
                    })
                  }
                  onOpen={
                    group
                      ? () => router.push(`/(tabs)/groups/group/${group.id}` as never)
                      : undefined
                  }
                />
              );
            })}
          </Section>
        ) : null}

        <Section title="Review">
          <NativeNavigationRow
            title="Sync Conflicts"
            subtitle="Review records that could not be reconciled automatically"
            value={String(data.syncConflicts.filter((item) => item.status === "unresolved").length)}
            systemImage="exclamationmark.arrow.triangle.2.circlepath"
            onPress={() => router.push("/(tabs)/settings/conflicts" as never)}
          />
        </Section>
      </NativeListScreen>
    </>
  );
}
