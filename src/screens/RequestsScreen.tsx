import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { AppMenuButton } from "@/src/components/navigation/AppMenuButton";
import {
    GlassCard,
    RequestCard,
    SearchFilterBar,
    SingleSelectFilterList,
    StatCard,
} from "@/src/components/ui/Finance";
import {
    Button,
    EmptyState,
    FilterSheet,
    LoadingState,
    PageHeader,
    Screen,
    SectionTitle,
} from "@/src/components/ui/Primitives";
import {
    palette,
    spacing,
    typefaces,
    typography,
} from "@/src/constants/design";
import {
    respondRemotePaymentConfirmation,
    respondRemoteDebtVerification,
    respondToRemoteLinkRequest,
} from "@/src/services/stage2Sync";
import { updateRemoteGroupInvite } from "@/src/services/stage3Sync";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";
import type { Debt, DebtVerification } from "@/src/types/models";
import { formatMoney } from "@/src/utils/money";

type InboxFilter = "all" | "pending" | "completed";

export function RequestsScreen() {
  const data = useAppData();
  const auth = useAuth();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<InboxFilter>("pending");
  const [filterOpen, setFilterOpen] = useState(false);

  const userId = auth.identity.authenticatedUserId;
  const email = auth.identity.email?.toLowerCase() ?? null;
  const normalizedQuery = query.trim().toLowerCase();

  async function respondToLinkRequest(
    request: (typeof data.linkRequests)[number],
    status: "accepted" | "rejected",
  ) {
    if (!userId) return;
    try {
      await respondToRemoteLinkRequest(request, status);
      await data.respondToLinkRequest(request.id, status, userId);
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "The request could not be updated. Please try again.";
      Alert.alert(
        "Could not update link request",
        message,
      );
    }
  }

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
  const incomingVerifications = useMemo(
    () =>
      data.debtVerifications.filter(
        (verification) =>
          verification.status === "pending" &&
          verification.responderUserId === userId,
      ),
    [data.debtVerifications, userId],
  );
  const incomingGroupInvites = useMemo(
    () =>
      data.groupInvites.filter(
        (invite) =>
          invite.status === "pending" &&
          ((userId && invite.invitedUserId === userId) ||
            (email && invite.invitedEmail?.toLowerCase() === email)),
      ),
    [data.groupInvites, email, userId],
  );
  const incomingPaymentConfirmations = useMemo(
    () =>
      data.payments.filter(
        (payment) =>
          payment.groupId === null &&
          payment.confirmationStatus === "pending_confirmation" &&
          payment.createdByUserId !== userId &&
          (payment.payerUserId === userId || payment.payeeUserId === userId),
      ),
    [data.payments, userId],
  );
  const completedItems = useMemo(
    () => [
      ...data.linkRequests.filter(
        (request) =>
          request.status !== "pending" &&
          (request.requesterUserId === userId ||
            request.targetUserId === userId),
      ),
      ...data.debtVerifications.filter(
        (verification) =>
          verification.status !== "pending" &&
          (verification.requesterUserId === userId ||
            verification.responderUserId === userId),
      ),
      ...data.groupInvites.filter(
        (invite) =>
          invite.status !== "pending" &&
          (invite.inviterUserId === userId || invite.invitedUserId === userId),
      ),
    ],
    [data.debtVerifications, data.groupInvites, data.linkRequests, userId],
  );
  const disputeCount =
    data.debts.filter(
      (debt) =>
        debt.verificationStatus === "rejected" ||
        debt.verificationStatus === "disputed",
    ).length +
    data.ledgerEntries.filter(
      (entry) =>
        entry.verificationStatus === "rejected" ||
        entry.verificationStatus === "disputed",
    ).length;

  const visibleLinks = useMemo(
    () =>
      incomingLinks.filter((request) =>
        matchesQuery(normalizedQuery, [
          request.requesterLabel,
          request.message,
          request.targetEmail,
        ]),
      ),
    [incomingLinks, normalizedQuery],
  );
  const visibleVerifications = useMemo(
    () =>
      incomingVerifications.filter((verification) => {
        const debt = data.debts.find((item) => item.id === verification.debtId);
        const member = debt
          ? data.members.find((item) => item.id === debt.memberId)
          : undefined;

        return matchesQuery(normalizedQuery, [
          debt?.title,
          debt?.debtDate,
          member?.displayName,
          verification.status,
        ]);
      }),
    [data.debts, data.members, incomingVerifications, normalizedQuery],
  );
  const visibleGroupInvites = useMemo(
    () =>
      incomingGroupInvites.filter((invite) => {
        const group = data.groups.find((item) => item.id === invite.groupId);

        return matchesQuery(normalizedQuery, [
          group?.name,
          invite.invitedDisplayName,
          invite.message,
          invite.offeredRole,
        ]);
      }),
    [data.groups, incomingGroupInvites, normalizedQuery],
  );
  const visiblePaymentConfirmations = useMemo(
    () =>
      incomingPaymentConfirmations.filter((payment) => {
        const member = data.members.find(
          (item) => item.id === payment.relatedMemberId,
        );
        return matchesQuery(normalizedQuery, [
          member?.displayName,
          payment.paymentDate,
          payment.currency,
          payment.notes,
          payment.confirmationStatus,
        ]);
      }),
    [
      data.members,
      incomingPaymentConfirmations,
      normalizedQuery,
    ],
  );
  const visibleCompletedItems = useMemo(
    () =>
      completedItems.filter((item) =>
        matchesQuery(normalizedQuery, [
          completedTitle(item),
          completedBody(item),
          item.status,
        ]),
      ),
    [completedItems, normalizedQuery],
  );

  if (data.loading || auth.loading) {
    return <LoadingState />;
  }

  if (!auth.user) {
    return (
      <Screen>
        <PageHeader
          title="Requests"
          showBackButton={false}
          action={<AppMenuButton />}
        />
        <GlassCard tone="amber">
          <EmptyState
            title="Signed out"
            body="Local debts still work, but shared approvals and invites need an account."
            action={
              <Button title="Sign in" onPress={() => router.push("/auth")} />
            }
          />
        </GlassCard>
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader
        title="Requests"
        showBackButton={false}
        action={<AppMenuButton />}
      />

      <SearchFilterBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search requests"
        onPressFilter={() => setFilterOpen(true)}
        filterActive={filter !== "pending"}
        filterLabel="Open request filters"
      />

      <GlassCard tone="lavender" allowOverflow>
        <View style={styles.statsRow}>
          <StatCard
            label="Pending"
            value={String(
              incomingLinks.length +
                incomingVerifications.length +
                incomingPaymentConfirmations.length +
                incomingGroupInvites.length,
            )}
            subtitle="Needs your answer"
            tone="amber"
            compact
            compactDensity="tight"
            withDivider
          />
          <StatCard
            label="Completed"
            value={String(completedItems.length)}
            subtitle="Already handled"
            tone="teal"
            compact
            compactDensity="tight"
            withDivider
          />
          <StatCard
            label="Needs review"
            value={String(disputeCount)}
            subtitle="Disputes and mismatches"
            tone="coral"
            compact
            compactDensity="tight"
          />
        </View>
      </GlassCard>

      <FilterSheet
        visible={filterOpen}
        title="Request filters"
        subtitle="Choose which inbox items you want to review."
        onClose={() => setFilterOpen(false)}
      >
        <SingleSelectFilterList
          value={filter}
          options={FILTERS}
          onChange={(value) => {
            setFilter(value as InboxFilter);
            setFilterOpen(false);
          }}
        />
      </FilterSheet>

      {(filter === "all" || filter === "pending") && (
        <>
          <RequestSection
            title="Link requests"
            subtitle="Who wants to connect their identity to a member."
            emptyTitle="No link requests"
            emptyBody="New connection requests will show up here."
          >
            {visibleLinks.map((request) => (
              <RequestCard
                key={request.id}
                title={request.requesterLabel}
                body={
                  request.message ||
                  "Wants to link their profile with this member."
                }
                status="Pending"
                tone="amber"
                actions={[
                  {
                    label: "Accept",
                    onPress: () => {
                      void respondToLinkRequest(request, "accepted");
                    },
                  },
                  {
                    label: "Reject",
                    variant: "secondary" as const,
                    onPress: () => {
                      void respondToLinkRequest(request, "rejected");
                    },
                  },
                ]}
              />
            ))}
          </RequestSection>

          <RequestSection
            title="Pending confirmations"
            subtitle="Verify what a shared debt says before it becomes final."
            emptyTitle="No pending confirmations"
            emptyBody="Debt verification requests will show up here."
          >
            {visibleVerifications.map((verification) => {
              const debt = data.debts.find(
                (item) => item.id === verification.debtId,
              );
              const member = debt
                ? data.members.find((item) => item.id === debt.memberId)
                : undefined;
              return (
                <RequestCard
                  key={verification.id}
                  title={
                    debt
                      ? proposedString(verification, "title") ?? debt.title
                      : "Shared debt"
                  }
                  body={
                    debt
                      ? describeVerificationRequest(verification, debt)
                      : member
                        ? `Shared debt with ${member.displayName}`
                        : "Debt confirmation request"
                  }
                  amount={
                    debt
                      ? formatMoney(
                          proposedAmount(verification, debt),
                          debt.currency,
                        )
                      : undefined
                  }
                  status="Pending"
                  tone="amber"
                  actions={[
                    {
                      label: "Confirm",
                      onPress: async () => {
                        if (!userId) {
                          return;
                        }
                        await respondRemoteDebtVerification({
                          verification,
                          status: "verified",
                        });
                        await data.respondToDebtVerification(
                          verification.id,
                          "verified",
                          userId,
                        );
                      },
                    },
                    {
                      label: "Contest",
                      variant: "secondary" as const,
                      onPress: () => {
                        if (!userId) {
                          return;
                        }
                        Alert.alert(
                          "Contest this debt?",
                          "This marks the debt as contested and sends it back for review. No payment or balance is changed.",
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Contest",
                              style: "destructive",
                              onPress: async () => {
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
                              },
                            },
                          ],
                        );
                      },
                    },
                  ]}
                />
              );
            })}
          </RequestSection>

          <RequestSection
            title="Payment confirmations"
            subtitle="Payments recorded against a shared debt that need your response."
            emptyTitle="No payment confirmations"
            emptyBody="New shared payments will show up here."
          >
            {visiblePaymentConfirmations.map((payment) => {
              const member = data.members.find(
                (item) => item.id === payment.relatedMemberId,
              );
              return (
                <RequestCard
                  key={payment.id}
                  title={member ? `Payment with ${member.displayName}` : "Shared payment"}
                  body={`Recorded on ${payment.paymentDate}${payment.notes ? ` · ${payment.notes}` : ""}`}
                  amount={formatMoney(payment.amount, payment.currency)}
                  status="Pending"
                  tone="amber"
                  actions={[
                    {
                      label: "Confirm",
                      onPress: async () => {
                        if (!userId || !payment.remoteId) {
                          return;
                        }
                        try {
                          await respondRemotePaymentConfirmation({
                            paymentRemoteId: payment.remoteId,
                            status: "confirmed",
                          });
                          await data.respondToPaymentConfirmation(
                            payment.id,
                            "confirmed",
                            userId,
                          );
                        } catch {
                          Alert.alert(
                            "Could not confirm payment",
                            "The response could not be saved. Please try again.",
                          );
                        }
                      },
                    },
                    {
                      label: "Reject",
                      variant: "secondary" as const,
                      onPress: async () => {
                        if (!userId || !payment.remoteId) {
                          return;
                        }
                        try {
                          await respondRemotePaymentConfirmation({
                            paymentRemoteId: payment.remoteId,
                            status: "rejected",
                          });
                          await data.respondToPaymentConfirmation(
                            payment.id,
                            "rejected",
                            userId,
                          );
                        } catch {
                          Alert.alert(
                            "Could not reject payment",
                            "The response could not be saved. Please try again.",
                          );
                        }
                      },
                    },
                  ]}
                />
              );
            })}
          </RequestSection>

          <RequestSection
            title="Group invites"
            subtitle="Group spaces waiting for your yes or no."
            emptyTitle="No group invites"
            emptyBody="New group invites will show up here."
          >
            {visibleGroupInvites.map((invite) => {
              const group = data.groups.find(
                (item) => item.id === invite.groupId,
              );
              return (
                <RequestCard
                  key={invite.id}
                  title={group?.name ?? invite.invitedDisplayName}
                  body={`Role offered: ${invite.offeredRole}${invite.message ? ` · ${invite.message}` : ""}`}
                  status="Pending"
                  tone="amber"
                  actions={[
                    {
                      label: "Accept",
                      onPress: async () => {
                        if (!userId) {
                          return;
                        }
                        await updateRemoteGroupInvite(
                          invite,
                          "accepted",
                          userId,
                        );
                        await data.respondToGroupInvite(
                          invite.id,
                          "accepted",
                          userId,
                          auth.identity.displayName,
                          auth.identity.email,
                        );
                      },
                    },
                    {
                      label: "Reject",
                      variant: "secondary" as const,
                      onPress: async () => {
                        if (!userId) {
                          return;
                        }
                        await updateRemoteGroupInvite(
                          invite,
                          "rejected",
                          userId,
                        );
                        await data.respondToGroupInvite(
                          invite.id,
                          "rejected",
                          userId,
                        );
                      },
                    },
                  ]}
                />
              );
            })}
          </RequestSection>
        </>
      )}

      {(filter === "all" || filter === "completed") && (
        <>
          <RequestSection
            title="Completed"
            subtitle="Requests you’ve already handled."
            emptyTitle="Nothing completed yet"
            emptyBody="Handled requests will appear here."
          >
            {visibleCompletedItems.map((item) => (
              <RequestCard
                key={item.id}
                title={completedTitle(item)}
                body={completedBody(item)}
                status={completedStatus(item)}
                tone="teal"
              />
            ))}
          </RequestSection>

          <SectionTitle
            title="Disputes & resolution"
            subtitle="Places where something doesn’t match and needs a decision."
            action={
              <Button
                title="Open review"
                variant="ghost"
                onPress={() => router.push("/conflicts")}
              />
            }
          />
          <GlassCard tone="coral">
            <Text style={styles.disputeTitle}>
              {disputeCount
                ? `${disputeCount} items need review`
                : "Nothing needs review"}
            </Text>
            <Text style={styles.disputeBody}>
              Use plain decisions like Keep mine, Use shared version, and
              Compare changes instead of digging through sync jargon.
            </Text>
          </GlassCard>
        </>
      )}
    </Screen>
  );
}

function RequestSection({
  title,
  subtitle,
  emptyTitle,
  emptyBody,
  children,
}: {
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptyBody: string;
  children: React.ReactNode[];
}) {
  const items = children.filter(Boolean);
  return (
    <>
      <SectionTitle title={title} subtitle={subtitle} />
      <GlassCard tone="lavender">
        {items.length ? (
          <View style={styles.sectionColumn}>{items}</View>
        ) : (
          <EmptyState title={emptyTitle} body={emptyBody} />
        )}
      </GlassCard>
    </>
  );
}

const FILTERS: { label: string; value: InboxFilter; description: string }[] = [
  {
    label: "All",
    value: "all",
    description: "Every request and completed item in your inbox.",
  },
  {
    label: "Pending",
    value: "pending",
    description: "Only things still waiting for your answer.",
  },
  {
    label: "Completed",
    value: "completed",
    description: "Only requests you have already handled.",
  },
];

function matchesQuery(query: string, values: (string | null | undefined)[]) {
  if (!query) {
    return true;
  }

  return values.some((value) => value?.toLowerCase().includes(query));
}

function completedTitle(item: {
  status: string;
  invitedDisplayName?: string | null;
  requesterLabel?: string | null;
  debtId?: string;
}) {
  return (
    item.requesterLabel ||
    item.invitedDisplayName ||
    item.debtId ||
    "Handled request"
  );
}

function completedBody(item: { status: string }) {
  return `Marked ${item.status}.`;
}

function completedStatus(item: { status: string }) {
  return item.status.charAt(0).toUpperCase() + item.status.slice(1);
}

function describeVerificationRequest(
  verification: DebtVerification,
  debt: Debt,
) {
  const requestLabel =
    verification.requestType === "amendment"
      ? "Review changes"
      : "Confirm this debt";
  const fields = verification.changeSummary?.changedFields ?? [];
  const fieldLabels = fields.map((field) => {
    switch (field) {
      case "dueDate":
        return "due date";
      case "direction":
        return "who owes whom";
      case "member":
        return "member";
      default:
        return field;
    }
  });
  const changeCopy =
    verification.requestType === "amendment" && fieldLabels.length
      ? ` · Changed ${fieldLabels.join(", ")}`
      : "";
  const proposedDueDate = proposedString(verification, "dueDate");
  const dueDate =
    proposedDueDate === undefined ? debt.dueDate : proposedDueDate;
  const dueCopy = dueDate ? ` · Due ${dueDate}` : "";
  const proposedDirection =
    proposedString(verification, "direction") ?? debt.direction;

  return `${requestLabel} · ${proposedDirection === "they_owe_me" ? "They owe you" : "You owe them"}${dueCopy}${changeCopy}`;
}

function proposedAmount(verification: DebtVerification, debt: Debt) {
  const proposed = verification.changeSummary?.proposed.amount;
  return typeof proposed === "number" ? proposed : debt.amount;
}

function proposedString(
  verification: DebtVerification,
  field: "title" | "direction" | "dueDate",
) {
  const proposed = verification.changeSummary?.proposed[field];
  return typeof proposed === "string" || proposed === null
    ? proposed
    : undefined;
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 0,
  },
  sectionColumn: {
    gap: spacing.sm,
  },
  disputeTitle: {
    color: palette.textPrimary,
    fontSize: typography.size.xxl,
    fontFamily: typefaces.displayMedium,
  },
  disputeBody: {
    color: palette.muted,
    fontSize: typography.size.base,
    lineHeight: typography.line.xl,
    fontFamily: typefaces.body,
  },
});
