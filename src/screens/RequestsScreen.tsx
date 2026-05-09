import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppMenuButton } from "@/src/components/navigation/AppMenuButton";
import {
    FilterChip,
    GlassCard,
    StatCard,
    StatusPill,
} from "@/src/components/ui/Finance";
import {
    Button,
    EmptyState,
    LoadingState,
    PageHeader,
    Screen,
    SectionTitle,
} from "@/src/components/ui/Primitives";
import { palette, spacing, typefaces } from "@/src/constants/design";
import {
    respondRemoteDebtVerification,
    updateRemoteLinkRequest,
} from "@/src/services/stage2Sync";
import { updateRemoteEventInvite } from "@/src/services/stage3Sync";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";
import { formatMoney } from "@/src/utils/money";

type InboxFilter = "all" | "pending" | "completed";

export function RequestsScreen() {
  const data = useAppData();
  const auth = useAuth();
  const [filter, setFilter] = useState<InboxFilter>("pending");

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
  const incomingVerifications = useMemo(
    () =>
      data.debtVerifications.filter(
        (verification) =>
          verification.status === "pending" &&
          verification.responderUserId === userId,
      ),
    [data.debtVerifications, userId],
  );
  const incomingEventInvites = useMemo(
    () =>
      data.eventInvites.filter(
        (invite) =>
          invite.status === "pending" &&
          ((userId && invite.invitedUserId === userId) ||
            (email && invite.invitedEmail?.toLowerCase() === email)),
      ),
    [data.eventInvites, email, userId],
  );
  const completedItems = [
    ...data.linkRequests.filter(
      (request) =>
        request.status !== "pending" &&
        (request.requesterUserId === userId || request.targetUserId === userId),
    ),
    ...data.debtVerifications.filter(
      (verification) =>
        verification.status !== "pending" &&
        (verification.requesterUserId === userId ||
          verification.responderUserId === userId),
    ),
    ...data.eventInvites.filter(
      (invite) =>
        invite.status !== "pending" &&
        (invite.inviterUserId === userId || invite.invitedUserId === userId),
    ),
  ];
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

  if (data.loading || auth.loading) {
    return <LoadingState />;
  }

  if (!auth.user) {
    return (
      <Screen>
        <PageHeader
          title="Requests"
          subtitle="Sign in to receive verification requests, invites, and shared confirmations."
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
        subtitle="A simple inbox for approvals, invites, and anything that needs your answer."
        showBackButton={false}
        action={<AppMenuButton />}
      />

      <GlassCard tone="lavender">
        <View style={styles.chipRow}>
          {FILTERS.map((item) => (
            <FilterChip
              key={item.value}
              label={item.label}
              active={filter === item.value}
              onPress={() => setFilter(item.value)}
            />
          ))}
        </View>
        <View style={styles.statsRow}>
          <StatCard
            label="Pending"
            value={String(
              incomingLinks.length +
                incomingVerifications.length +
                incomingEventInvites.length,
            )}
            subtitle="Needs your answer"
            tone="amber"
          />
          <StatCard
            label="Completed"
            value={String(completedItems.length)}
            subtitle="Already handled"
            tone="teal"
          />
          <StatCard
            label="Needs review"
            value={String(disputeCount)}
            subtitle="Disputes and mismatches"
            tone="coral"
          />
        </View>
      </GlassCard>

      {(filter === "all" || filter === "pending") && (
        <>
          <RequestSection
            title="Link requests"
            subtitle="Who wants to connect their identity to a member."
            emptyTitle="No link requests"
            emptyBody="New connection requests will show up here."
          >
            {incomingLinks.map((request) => (
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
                    onPress: async () => {
                      await updateRemoteLinkRequest(
                        request,
                        "accepted",
                        userId,
                      );
                      await data.respondToLinkRequest(
                        request.id,
                        "accepted",
                        userId ?? "me",
                      );
                    },
                  },
                  {
                    label: "Reject",
                    variant: "secondary" as const,
                    onPress: async () => {
                      await updateRemoteLinkRequest(
                        request,
                        "rejected",
                        userId,
                      );
                      await data.respondToLinkRequest(
                        request.id,
                        "rejected",
                        userId ?? "me",
                      );
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
            {incomingVerifications.map((verification) => {
              const debt = data.debts.find(
                (item) => item.id === verification.debtId,
              );
              const member = debt
                ? data.members.find((item) => item.id === debt.memberId)
                : undefined;
              return (
                <RequestCard
                  key={verification.id}
                  title={debt?.title ?? "Shared debt"}
                  body={
                    member
                      ? `${member.displayName} · ${debt?.debtDate ?? ""}`
                      : "Verification request"
                  }
                  amount={
                    debt ? formatMoney(debt.amount, debt.currency) : undefined
                  }
                  status="Pending"
                  tone="amber"
                  actions={[
                    {
                      label: "Approve",
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
                      label: "Reject",
                      variant: "secondary" as const,
                      onPress: async () => {
                        if (!userId) {
                          return;
                        }
                        await respondRemoteDebtVerification({
                          verification,
                          status: "rejected",
                        });
                        await data.respondToDebtVerification(
                          verification.id,
                          "rejected",
                          userId,
                          "Needs review",
                        );
                      },
                    },
                  ]}
                />
              );
            })}
          </RequestSection>

          <RequestSection
            title="Event invites"
            subtitle="Group spaces waiting for your yes or no."
            emptyTitle="No event invites"
            emptyBody="New event invites will show up here."
          >
            {incomingEventInvites.map((invite) => {
              const event = data.events.find(
                (item) => item.id === invite.eventId,
              );
              return (
                <RequestCard
                  key={invite.id}
                  title={event?.name ?? invite.invitedDisplayName}
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
                        await updateRemoteEventInvite(
                          invite,
                          "accepted",
                          userId,
                        );
                        await data.respondToEventInvite(
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
                        await updateRemoteEventInvite(
                          invite,
                          "rejected",
                          userId,
                        );
                        await data.respondToEventInvite(
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
            {completedItems.map((item) => (
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

function RequestCard({
  title,
  body,
  amount,
  status,
  tone,
  actions,
}: {
  title: string;
  body: string;
  amount?: string;
  status: string;
  tone: "amber" | "teal" | "coral";
  actions?: {
    label: string;
    onPress: () => void;
    variant?: "primary" | "secondary";
  }[];
}) {
  return (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.requestCopy}>
          <Text style={styles.requestTitle}>{title}</Text>
          <Text style={styles.requestBody}>{body}</Text>
        </View>
        <View style={styles.requestMeta}>
          <StatusPill label={status} tone={tone} />
          {amount ? <Text style={styles.requestAmount}>{amount}</Text> : null}
        </View>
      </View>
      {actions?.length ? (
        <View style={styles.buttonRow}>
          {actions.map((action) => (
            <Button
              key={action.label}
              title={action.label}
              variant={action.variant ?? "primary"}
              onPress={action.onPress}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const FILTERS: { label: string; value: InboxFilter }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" },
];

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

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statsRow: {
    gap: spacing.sm,
  },
  sectionColumn: {
    gap: spacing.sm,
  },
  requestCard: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: palette.surfaceGlassElevated,
    padding: spacing.md,
    gap: spacing.md,
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  requestCopy: {
    flex: 1,
    gap: 4,
  },
  requestTitle: {
    color: palette.textPrimary,
    fontSize: 15,
    fontFamily: typefaces.bodyStrong,
  },
  requestBody: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typefaces.body,
  },
  requestMeta: {
    alignItems: "flex-end",
    gap: 8,
  },
  requestAmount: {
    color: palette.primaryDeep,
    fontSize: 14,
    fontFamily: typefaces.bodyHeavy,
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  disputeTitle: {
    color: palette.textPrimary,
    fontSize: 18,
    fontFamily: typefaces.displayMedium,
  },
  disputeBody: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typefaces.body,
  },
});
