import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import {
    BarChartCard,
    MoneyMapListCard,
} from "@/src/components/AnalyticsCards";
import { AttachmentsSection } from "@/src/components/AttachmentsSection";
import { CommentsSection } from "@/src/components/CommentsSection";
import { DebtRow } from "@/src/components/EntityRows";
import { GlassSurface } from "@/src/components/ui/GlassSurface";
import { MainActionsBar } from "@/src/components/ui/MainActionsBar";
import { MobileMenuModal } from "@/src/components/ui/MenuList";
import {
    Badge,
    TagChips,
    VerificationBadge,
} from "@/src/components/ui/Badges";
import {
    Button,
    Card,
    EmptyState,
    IconButton,
    LoadingState,
    PageHeader,
    Screen,
    SectionTitle,
    SegmentedControl,
    SelectChips,
    TextField,
} from "@/src/components/ui/Primitives";
import {
    palette,
    radii,
    spacing,
    typefaces,
    typography,
} from "@/src/constants/design";
import { groupSpendingBreakdown } from "@/src/services/analytics";
import { convertCurrency, estimateMoneyMap } from "@/src/services/currency";
import { findDuplicateWarnings } from "@/src/services/duplicates";
import {
    canAddExpense,
    canArchiveGroup,
    canFinaliseGroup,
    canInviteMembers,
    canMergeGroupMembers,
    canReopenGroup,
    participantForUser,
} from "@/src/services/groupPermissions";
import {
    groupPdfLines,
    groupTextSummary,
    shareExport,
    writePdfExport,
    writeTextExport,
} from "@/src/services/export";
import {
    DEFAULT_GROUP_SETTLEMENT_SETTINGS,
    entriesForGroup,
    explainGroupSettlement,
    participantName,
} from "@/src/services/ledger";
import {
    createRemoteGroupInvite,
    createRemoteSharedGroupMember,
} from "@/src/services/stage3Sync";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";
import type {
    CurrencyCode,
    GroupRole,
    GroupSettlementSettings,
    GroupStatus,
    GroupVerificationResponse,
    LedgerEntry,
    SharedGroupMember,
} from "@/src/types/models";
import { formatMoney } from "@/src/utils/money";

type GroupTab =
  | "overview"
  | "expenses"
  | "balances"
  | "analytics"
  | "settlements"
  | "payments"
  | "members"
  | "activity";
const MINIMUM_BALANCE_THRESHOLD = 0.005;

export function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useAppData();
  const auth = useAuth();
  const group = data.groups.find((item) => item.id === id);
  const [tab, setTab] = useState<GroupTab>("overview");
  const [settlementSettings, setSettlementSettings] =
    useState<GroupSettlementSettings>(DEFAULT_GROUP_SETTLEMENT_SETTINGS);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [inviteDisplayName, setInviteDisplayName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] =
    useState<Exclude<GroupRole, "owner">>("member");
  const [claimMessage, setClaimMessage] = useState("");
  const [rejectionReasons, setRejectionReasons] = useState<
    Record<string, string>
  >({});
  const [optionsOpen, setOptionsOpen] = useState(false);

  const currentUserId = auth.identity.authenticatedUserId;
  const participant = useMemo(
    () =>
      group
        ? participantForUser(group, data.groupParticipants, currentUserId)
        : null,
    [currentUserId, data.groupParticipants, group],
  );
  const permissionContext = group
    ? { group, participant, userId: currentUserId }
    : null;
  const sharedGroupMembers = useMemo(
    () => data.sharedGroupMembers.filter((member) => member.groupId === id),
    [data.sharedGroupMembers, id],
  );
  const activeSharedMembers = sharedGroupMembers.filter(
    (member) => member.status !== "archived" && member.status !== "merged",
  );
  const currentGroupMember = sharedGroupMembers.find(
    (member) =>
      currentUserId &&
      member.linkedUserId === currentUserId &&
      member.status !== "merged",
  );
  const groupMemberIds = useMemo(
    () =>
      data.groupMembers
        .filter((groupMember) => groupMember.groupId === id)
        .map((groupMember) => groupMember.memberId),
    [data.groupMembers, id],
  );
  const groupEntries = useMemo(
    () => (group ? entriesForGroup(group.id, data.ledgerEntries) : []),
    [data.ledgerEntries, group],
  );
  const explanation = useMemo(
    () =>
      group
        ? explainGroupSettlement(
            group.id,
            data.ledgerEntries,
            settlementSettings,
          )
        : null,
    [data.ledgerEntries, group, settlementSettings],
  );
  const convertedSuggestions = useMemo(
    () =>
      explanation && settlementSettings.convertedCurrency
        ? buildConvertedEstimate(
            explanation.participantNets,
            data.settings.baseCurrency,
            data.currencyRates,
          )
        : [],
    [
      data.currencyRates,
      data.settings.baseCurrency,
      explanation,
      settlementSettings.convertedCurrency,
    ],
  );
  const duplicateWarnings = useMemo(
    () =>
      group
        ? findDuplicateWarnings(group, data.groupMembers, data.members)
        : [],
    [data.groupMembers, data.members, group],
  );
  const sharedDuplicateWarnings = data.groupDuplicateWarnings.filter(
    (warning) => warning.groupId === id && warning.status === "active",
  );
  const groupActivity = data.groupActivityLogs.filter(
    (activity) => activity.groupId === id,
  );
  const pendingInvites = data.groupInvites.filter(
    (invite) => invite.groupId === id && invite.status === "pending",
  );
  const pendingClaims = data.groupMemberClaims.filter(
    (claim) => claim.groupId === id && claim.status === "pending",
  );
  const analytics = useMemo(
    () =>
      group
        ? groupSpendingBreakdown({
            group,
            entries: data.ledgerEntries,
            sharedExpenses: data.sharedExpenses,
            members: data.members,
            sharedGroupMembers: data.sharedGroupMembers,
          })
        : null,
    [
      data.ledgerEntries,
      data.members,
      data.sharedGroupMembers,
      data.sharedExpenses,
      group,
    ],
  );

  if (data.loading || auth.loading) {
    return <LoadingState />;
  }

  if (!group || !explanation || !permissionContext) {
    return (
      <Screen>
        <EmptyState
          title="Group not found"
          body="This group may have been archived or removed."
        />
      </Screen>
    );
  }

  const currentGroup = group;
  const currentExplanation = explanation;
  const isShared = currentGroup.visibility === "shared";
  const canAddRecords = canAddExpense(permissionContext);
  const canManagePeople = canMergeGroupMembers(permissionContext);
  const canInvite = canInviteMembers(permissionContext);
  const myBalanceId = isShared ? currentGroupMember?.id : "me";
  const myBalance = estimateMoneyMap(
    (myBalanceId ? currentExplanation.participantNets[myBalanceId] : undefined) ??
      {},
    data.settings,
    data.currencyRates,
  );
  const myBalanceIsOwing = myBalance < -MINIMUM_BALANCE_THRESHOLD;
  const myBalanceSubtext = myBalanceIsOwing
    ? "You owe to members in this group a total of"
    : "Members in this group owe you a total of";
  const groupMemberCount = isShared
    ? activeSharedMembers.length
    : groupMemberIds.length + 1;

  async function togglePrivateMember(memberId: string) {
    const nextIds = groupMemberIds.includes(memberId)
      ? groupMemberIds.filter((id) => id !== memberId)
      : [...groupMemberIds, memberId];
    await data.setGroupMembers(currentGroup.id, nextIds);
  }

  async function updateStatus(status: GroupStatus) {
    if (status === "finalising") {
      Alert.alert(
        "Finalise group",
        "Finalised groups are locked for normal editing.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Finalise group",
            onPress: () => data.updateGroup(currentGroup.id, { status }),
          },
        ],
      );
      return;
    }
    await data.updateGroup(currentGroup.id, {
      status,
      archived:
        status === "archived"
          ? true
          : status === "active"
            ? false
            : currentGroup.archived,
    });
  }

  function confirmArchiveGroup() {
    Alert.alert(
      "Archive group?",
      "This hides the group from active group lists and keeps existing ledger history available where needed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive group",
          style: "destructive",
          onPress: () => {
            void updateStatus("archived");
          },
        },
      ],
    );
  }

  async function addUnlinkedGroupMember() {
    if (!newMemberName.trim() || !currentUserId) {
      return;
    }
    const member = await data.createSharedGroupMember({
      groupId: currentGroup.id,
      remoteGroupId: currentGroup.remoteId,
      displayName: newMemberName,
      email: newMemberEmail,
      phone: newMemberPhone,
      createdByUserId: currentUserId,
    });
    try {
      const remoteId = await createRemoteSharedGroupMember(member);
      if (remoteId) {
        await data.upsertSharedGroupMember({
          ...member,
          remoteId,
          syncStatus: "synced",
        });
      }
    } catch {
      await data.upsertSharedGroupMember({
        ...member,
        syncStatus: "sync_error",
      });
    }
    setNewMemberName("");
    setNewMemberEmail("");
    setNewMemberPhone("");
  }

  async function sendInvite() {
    if (!currentUserId || !inviteDisplayName.trim()) {
      return;
    }
    const invite = await data.createGroupInvite({
      groupId: currentGroup.id,
      remoteGroupId: currentGroup.remoteId,
      inviterUserId: currentUserId,
      invitedEmail: inviteEmail,
      invitedDisplayName: inviteDisplayName,
      offeredRole: inviteRole,
    });
    try {
      const remoteId = await createRemoteGroupInvite(invite);
      if (remoteId) {
        await data.upsertGroupInvite({
          ...invite,
          remoteId,
          syncStatus: "synced",
        });
      }
    } catch {
      await data.upsertGroupInvite({ ...invite, syncStatus: "sync_error" });
    }
    setInviteDisplayName("");
    setInviteEmail("");
    setInviteRole("member");
  }

  async function claimMember(member: SharedGroupMember) {
    if (!currentUserId) {
      router.push("/auth");
      return;
    }
    await data.createGroupMemberClaim(member.id, currentUserId, claimMessage);
    setClaimMessage("");
  }

  async function exportGroupPdf() {
    const uri = await writePdfExport(
      `debtulator-${currentGroup.name}-summary.pdf`,
      groupPdfLines({
        group: currentGroup,
        explanation: currentExplanation,
        snapshot: data,
        options: {
          includePrivateNotes: data.settings.includePrivateNotesInExports,
          includeComments: data.settings.includeCommentsInExports,
          includeAttachments: data.settings.includeAttachmentsInExports,
          includeRejectedDisputed:
            data.settings.includeRejectedDisputedInExports,
          includeArchived: data.settings.includeArchivedInExports,
        },
      }),
    );
    await data.createExportLog({
      userId: auth.identity.authenticatedUserId,
      exportType: "pdf",
      targetType: "group",
      targetId: currentGroup.id,
      metadata: { uri },
    });
    await shareExport(uri, `${currentGroup.name} PDF summary`);
  }

  async function shareGroupSummary() {
    const summary = groupTextSummary({
      group: currentGroup,
      explanation: currentExplanation,
      snapshot: data,
      options: {
        includePrivateNotes: false,
        includeComments: false,
        includeAttachments: false,
        includeRejectedDisputed: false,
        includeArchived: false,
      },
    });
    const uri = await writeTextExport(
      `debtulator-${currentGroup.name}-summary.txt`,
      summary,
    );
    await data.createExportLog({
      userId: auth.identity.authenticatedUserId,
      exportType: "text_summary",
      targetType: "group",
      targetId: currentGroup.id,
      metadata: { uri, privateNotesIncluded: false },
    });
    await shareExport(uri, `${currentGroup.name} summary`, summary);
  }

  return (
    <Screen
      footer={
        <MainActionsBar
          actions={[
            {
              title: "Add expense",
              icon: "cart",
              disabled: !canAddRecords,
              onPress: () =>
                router.push({
                  pathname: "/expense/form",
                  params: { groupId: group.id },
                }),
            },
            {
              title: "Make repayment",
              icon: "card",
              variant: "secondary",
              disabled: !canAddRecords,
              onPress: () =>
                router.push({
                  pathname: "/payment/form",
                  params: { groupId: group.id },
                }),
            },
          ]}
        />
      }
    >
      <PageHeader
        title="Group details"
        action={
          <IconButton
            icon="ellipsis-horizontal"
            label="Group actions"
            tone="inverse"
            onPress={() => setOptionsOpen(true)}
          />
        }
      />

      <Card tone={isShared ? "peach" : "lavender"} style={styles.heroCard}>
        <View style={styles.coverPhotoPlaceholder}>
          <Text style={styles.coverPhotoText}>Cover photo</Text>
        </View>
        <Text style={styles.balanceSubtext}>{myBalanceSubtext}</Text>
        <Text
          style={[
            styles.balanceFigure,
            myBalanceIsOwing
              ? styles.balanceFigureNegative
              : styles.balanceFigurePositive,
          ]}
        >
          {formatMoney(Math.abs(myBalance), data.settings.baseCurrency)}
        </Text>
        <View style={styles.memberCountRow}>
          <Text style={styles.memberCountNumber}>{groupMemberCount}</Text>
          <Text style={styles.memberCountLabel}>members</Text>
        </View>
        <TagChips tags={group.tags} />
      </Card>

      <MobileMenuModal
        visible={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        sections={[
          {
            items: [
              {
                label: "Add direct debt",
                subtitle: "Create a debt inside this group",
                icon: "receipt-outline",
                disabled: !canAddRecords,
                onPress: () => {
                  setOptionsOpen(false);
                  router.push({
                    pathname: "/debt/form",
                    params: { groupId: group.id },
                  });
                },
              },
              {
                label: "Record settlement",
                subtitle: "Record a repayment for this group",
                icon: "card-outline",
                disabled: !canAddRecords,
                onPress: () => {
                  setOptionsOpen(false);
                  router.push({
                    pathname: "/payment/form",
                    params: { groupId: group.id },
                  });
                },
              },
              {
                label: "Send gentle reminder",
                subtitle: "Create a soft reminder for open balances",
                icon: "notifications-outline",
                disabled: !canAddRecords,
                onPress: () => {
                  setOptionsOpen(false);
                  void data.createSoftReminder({
                    senderUserId: currentUserId,
                    recipientUserId: null,
                    relatedMemberId: null,
                    relatedGroupId: group.id,
                    relatedRecordId: null,
                    message: `${group.name} has unsettled balances.`,
                  });
                },
              },
              {
                label: "Share summary",
                subtitle: "Share a plain-text group summary",
                icon: "share-outline",
                onPress: () => {
                  setOptionsOpen(false);
                  void shareGroupSummary();
                },
              },
              {
                label: "Export PDF",
                subtitle: "Generate and share a PDF summary",
                icon: "document-text-outline",
                onPress: () => {
                  setOptionsOpen(false);
                  void exportGroupPdf();
                },
              },
            ],
          },
        ]}
      />

      <SegmentedControl
        value={tab}
        options={[
          { label: "Overview", value: "overview" },
          { label: "Expenses", value: "expenses" },
          { label: "Balances", value: "balances" },
          { label: "Analytics", value: "analytics" },
          { label: "Settlements", value: "settlements" },
          { label: "Payments", value: "payments" },
          { label: "Members", value: "members" },
          { label: "Activity", value: "activity" },
        ]}
        onChange={setTab}
      />

      {tab === "overview" ? (
        <>
          <Card>
            <SectionTitle
              title="Group status"
              subtitle="Lifecycle controls respect role and lock state."
            />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Visibility</Text>
              <Text style={styles.infoValue}>
                {isShared ? "Shared/synced" : "Private/local"}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Default currency</Text>
              <Text style={styles.infoValue}>{group.defaultCurrency}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Included records</Text>
              <Text style={styles.infoValue}>
                {explanation.includedEntries.length}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Excluded by settings</Text>
              <Text style={styles.infoValue}>
                {explanation.excludedEntries.length}
              </Text>
            </View>
            <View style={styles.actionRow}>
              {canFinaliseGroup(permissionContext) ? (
                <Button
                  title="Finalise group"
                  icon="lock-closed"
                  variant="secondary"
                  onPress={() => updateStatus("finalising")}
                />
              ) : null}
              {canReopenGroup(permissionContext) ? (
                <Button
                  title="Reopen group"
                  icon="lock-open"
                  variant="secondary"
                  onPress={() => updateStatus("active")}
                />
              ) : null}
              {canFinaliseGroup(permissionContext) ? (
                <Button
                  title="Mark settled"
                  icon="checkmark-circle"
                  variant="secondary"
                  onPress={() => updateStatus("settled")}
                />
              ) : null}
              {canArchiveGroup(permissionContext) ? (
                <Button
                  title="Archive group"
                  icon="archive"
                  variant="danger"
                  onPress={confirmArchiveGroup}
                />
              ) : null}
            </View>
          </Card>

          {isShared &&
          (pendingInvites.length > 0 ||
            pendingClaims.length > 0 ||
            sharedDuplicateWarnings.length > 0) ? (
            <Card tone="amber">
              <SectionTitle
                title="Needs attention"
                subtitle="Invites, claims, duplicate warnings, and disputed records."
              />
              <View style={styles.countLine}>
                <Badge
                  label={`${pendingInvites.length} pending invites`}
                  tone="amber"
                />
                <Badge
                  label={`${pendingClaims.length} claim requests`}
                  tone="blue"
                />
                <Badge
                  label={`${sharedDuplicateWarnings.length} duplicate warnings`}
                  tone="negative"
                />
              </View>
            </Card>
          ) : null}
        </>
      ) : null}

      {tab === "expenses" ? (
        <Card>
          <SectionTitle
            title="Group ledger"
            subtitle="Expenses and direct group debts are verified at group level."
          />
          {groupEntries.length > 0 ? (
            groupEntries.map((entry) => (
              <GroupLedgerRow
                key={entry.id}
                entry={entry}
                sharedMembers={sharedGroupMembers}
                currentGroupMember={currentGroupMember}
                canVerify={isShared && Boolean(currentUserId)}
                rejectionReason={rejectionReasons[targetKey(entry)] ?? ""}
                onReasonChange={(value) =>
                  setRejectionReasons((current) => ({
                    ...current,
                    [targetKey(entry)]: value,
                  }))
                }
                onVerify={() => {
                  const target = targetForEntry(entry);
                  if (!currentUserId || !currentGroupMember || !target) {
                    return;
                  }
                  data.respondToGroupVerification({
                    groupId: group.id,
                    targetType: target.type,
                    targetId: target.id,
                    groupMemberId: currentGroupMember.id,
                    linkedUserId: currentUserId,
                    status: "verified",
                  });
                }}
                onReject={() => {
                  const target = targetForEntry(entry);
                  if (!currentUserId || !currentGroupMember || !target) {
                    return;
                  }
                  data.respondToGroupVerification({
                    groupId: group.id,
                    targetType: target.type,
                    targetId: target.id,
                    groupMemberId: currentGroupMember.id,
                    linkedUserId: currentUserId,
                    status: "rejected",
                    rejectionReason: rejectionReasons[targetKey(entry)] ?? "",
                  });
                }}
              />
            ))
          ) : (
            <EmptyState
              title="No group records"
              body="Add a shared expense or direct group debt."
            />
          )}
        </Card>
      ) : null}

      {tab === "balances" ? (
        <Card>
          <SectionTitle
            title={`Balances in ${data.settings.baseCurrency}`}
            subtitle="Positive balances receive money; negative balances pay money."
          />
          {Object.entries(explanation.participantNets).map(
            ([participantId, moneyMap]) => (
              <View key={participantId} style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {participantName(
                    participantId,
                    data.members,
                    sharedGroupMembers,
                  )}
                </Text>
                <Text style={styles.infoValue}>
                  {formatMoney(
                    estimateMoneyMap(
                      moneyMap,
                      data.settings,
                      data.currencyRates,
                    ),
                    data.settings.baseCurrency,
                    { signed: true },
                  )}
                </Text>
              </View>
            ),
          )}
        </Card>
      ) : null}

      {tab === "analytics" && analytics ? (
        <>
          <MoneyMapListCard
            title="Group spending totals"
            subtitle={`Converted totals in ${data.settings.baseCurrency}.`}
            rows={[
              {
                label: "Total spending",
                totals: analytics.totalByCurrency,
                tone: "blue",
              },
            ]}
            settings={data.settings}
            currencyRates={data.currencyRates}
          />
          <MoneyMapListCard
            title="Spending by category"
            subtitle="Multiple tags split the amount evenly for analytics."
            rows={analytics.byTag.slice(0, 8).map((row) => ({
              label: row.tag,
              totals: row.totalsByCurrency,
              tone: "blue",
            }))}
            settings={data.settings}
            currencyRates={data.currencyRates}
          />
          <MoneyMapListCard
            title="Spending by payer"
            subtitle="Who paid most before settlement."
            rows={analytics.byPayer.map((row) => ({
              label: row.name,
              totals: row.totalsByCurrency,
              tone: "neutral",
            }))}
            settings={data.settings}
            currencyRates={data.currencyRates}
          />
          <MoneyMapListCard
            title="Paid vs unpaid"
            subtitle="Open, paid, partial, and overpaid totals for this group."
            rows={[
              {
                label: "Original",
                totals: analytics.paidVsUnpaid.totals.original,
                tone: "blue",
              },
              {
                label: "Paid",
                totals: analytics.paidVsUnpaid.totals.paid,
                tone: "positive",
              },
              {
                label: "Open",
                totals: analytics.paidVsUnpaid.totals.remaining,
                tone: "amber",
              },
              {
                label: "Overpaid",
                totals: analytics.paidVsUnpaid.totals.overpaid,
                tone: "negative",
              },
            ]}
            settings={data.settings}
            currencyRates={data.currencyRates}
          />
          <BarChartCard
            title="Top group balances"
            subtitle={`Ranked by converted balance magnitude in ${data.settings.baseCurrency}.`}
            currency={data.settings.baseCurrency}
            data={analytics.byMember
              .map((row) => ({
                label: row.name,
                value: Math.abs(
                  estimateMoneyMap(row.net, data.settings, data.currencyRates),
                ),
                currency: data.settings.baseCurrency,
              }))
              .filter((row) => row.value > MINIMUM_BALANCE_THRESHOLD)
              .slice(0, 6)}
          />
        </>
      ) : null}

      {tab === "settlements" ? (
        <>
          <Card>
            <SectionTitle
              title="Settlement suggestions"
              subtitle={`Generated from group balances and shown in ${data.settings.baseCurrency}.`}
            />
            <SettingToggle
              settings={settlementSettings}
              onChange={setSettlementSettings}
            />
            {explanation.suggestions.length > 0 ? (
              explanation.suggestions.map((suggestion) => (
                <View key={suggestion.id} style={styles.settlementRow}>
                  <Text style={styles.settlementText}>
                    {participantName(
                      suggestion.fromId,
                      data.members,
                      sharedGroupMembers,
                    )}{" "}
                    pays{" "}
                    {participantName(
                      suggestion.toId,
                      data.members,
                      sharedGroupMembers,
                    )}
                  </Text>
                  <Text style={styles.money}>
                    {formatMoney(
                      convertCurrency(
                        suggestion.amount,
                        suggestion.currency,
                        data.settings.baseCurrency,
                        data.currencyRates,
                      ),
                      data.settings.baseCurrency,
                    )}
                  </Text>
                  <Button
                    title="Record"
                    icon="card"
                    variant="secondary"
                    onPress={() =>
                      router.push({
                        pathname: "/payment/form",
                        params: {
                          groupId: group.id,
                          payerId: suggestion.fromId,
                          payeeId: suggestion.toId,
                        },
                      })
                    }
                  />
                </View>
              ))
            ) : (
              <Text style={styles.body}>
                No settlement suggestions with the selected settings.
              </Text>
            )}
            {convertedSuggestions.length > 0 ? (
              <View style={styles.estimateBox}>
                <Badge label="Estimated converted settlement" tone="amber" />
                <Text style={styles.body}>
                  Using local exchange rates from the settings table. This
                  converts balances to {data.settings.baseCurrency} for
                  settlement purposes and is approximate.
                </Text>
                {convertedSuggestions.map((suggestion, index) => (
                  <View
                    key={`${suggestion.fromId}-${suggestion.toId}-${index}`}
                    style={styles.settlementRow}
                  >
                    <Text style={styles.settlementText}>
                      {participantName(
                        suggestion.fromId,
                        data.members,
                        sharedGroupMembers,
                      )}{" "}
                      pays{" "}
                      {participantName(
                        suggestion.toId,
                        data.members,
                        sharedGroupMembers,
                      )}
                    </Text>
                    <Text style={styles.money}>
                      approx.{" "}
                      {formatMoney(
                        suggestion.amount,
                        data.settings.baseCurrency,
                      )}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </Card>

          <Card>
            <SectionTitle
              title="How this was calculated"
              subtitle="Included and excluded rows are shown with reasons."
            />
            <View style={styles.countLine}>
              <Badge
                label={`${explanation.includedEntries.length} included`}
                tone="positive"
              />
              <Badge
                label={`${explanation.excludedEntries.length} excluded`}
                tone="neutral"
              />
            </View>
            <Text style={styles.label}>Included records</Text>
            {explanation.includedEntries.map((entry) => (
              <Text key={entry.id} style={styles.body}>
                {entry.title}: {formatMoney(entry.amount, entry.currency)}
              </Text>
            ))}
            <Text style={styles.label}>Excluded records</Text>
            {explanation.excludedEntries.map(({ entry, reason }) => (
              <Text key={entry.id} style={styles.body}>
                {entry.title}: {reason.replaceAll("_", " ")}
              </Text>
            ))}
            <Text style={styles.label}>Matching steps</Text>
            {explanation.settlementSteps.map((step, index) => (
              <Text key={`${step.currency}-${index}`} style={styles.body}>
                {participantName(step.fromId, data.members, sharedGroupMembers)}
                {" -> "}
                {participantName(step.toId, data.members, sharedGroupMembers)}
                {" - "}
                {formatMoney(
                  convertCurrency(
                    step.amount,
                    step.currency,
                    data.settings.baseCurrency,
                    data.currencyRates,
                  ),
                  data.settings.baseCurrency,
                )}
              </Text>
            ))}
          </Card>
        </>
      ) : null}

      {tab === "payments" ? (
        <Card>
          <SectionTitle
            title="Payment history"
            subtitle="Payments and settlement records for this group."
          />
          {data.payments.filter((payment) => payment.groupId === group.id)
            .length > 0 ? (
            data.payments
              .filter((payment) => payment.groupId === group.id)
              .map((payment) => (
                <View key={payment.id} style={styles.settlementRow}>
                  <Text style={styles.settlementText}>
                    {participantName(
                      payment.payerGroupMemberId ?? "me",
                      data.members,
                      sharedGroupMembers,
                    )}{" "}
                    paid{" "}
                    {participantName(
                      payment.payeeGroupMemberId ?? "me",
                      data.members,
                      sharedGroupMembers,
                    )}
                  </Text>
                  <Text style={styles.money}>
                    {formatMoney(
                      convertCurrency(
                        payment.amount,
                        payment.currency,
                        data.settings.baseCurrency,
                        data.currencyRates,
                      ),
                      data.settings.baseCurrency,
                    )}
                  </Text>
                </View>
              ))
          ) : (
            <EmptyState
              title="No payments yet"
              body="Record a settlement from a suggestion or manually."
            />
          )}
        </Card>
      ) : null}

      {tab === "members" ? (
        isShared ? (
          <SharedMembersPanel
            groupMembers={sharedGroupMembers}
            warnings={sharedDuplicateWarnings}
            claims={pendingClaims}
            canManage={canManagePeople}
            canInvite={canInvite}
            currentUserId={currentUserId}
            newMemberName={newMemberName}
            newMemberEmail={newMemberEmail}
            newMemberPhone={newMemberPhone}
            inviteDisplayName={inviteDisplayName}
            inviteEmail={inviteEmail}
            inviteRole={inviteRole}
            claimMessage={claimMessage}
            setNewMemberName={setNewMemberName}
            setNewMemberEmail={setNewMemberEmail}
            setNewMemberPhone={setNewMemberPhone}
            setInviteDisplayName={setInviteDisplayName}
            setInviteEmail={setInviteEmail}
            setInviteRole={setInviteRole}
            setClaimMessage={setClaimMessage}
            addUnlinkedGroupMember={addUnlinkedGroupMember}
            sendInvite={sendInvite}
            claimMember={claimMember}
            ignoreWarning={(warningId) =>
              currentUserId
                ? data.ignoreGroupDuplicateWarning(warningId, currentUserId)
                : undefined
            }
            mergeMembers={(sourceId, targetId) =>
              currentUserId
                ? data.mergeSharedGroupMembers(
                    sourceId,
                    targetId,
                    currentUserId,
                  )
                : undefined
            }
            approveClaim={(claimId) =>
              currentUserId
                ? data.respondToGroupMemberClaim(
                    claimId,
                    "approved",
                    currentUserId,
                  )
                : undefined
            }
            rejectClaim={(claimId) =>
              currentUserId
                ? data.respondToGroupMemberClaim(
                    claimId,
                    "rejected",
                    currentUserId,
                  )
                : undefined
            }
          />
        ) : (
          <PrivateMembersPanel
            groupId={group.id}
            groupMemberIds={groupMemberIds}
            members={data.members}
            duplicateWarnings={duplicateWarnings}
            ignoredDuplicateKeys={group.ignoredDuplicateKeys}
            toggleMember={togglePrivateMember}
            ignoreWarning={(key) =>
              data.updateGroup(group.id, {
                ignoredDuplicateKeys: [...group.ignoredDuplicateKeys, key],
              })
            }
          />
        )
      ) : null}

      {tab === "activity" ? (
        <Card>
          <SectionTitle
            title="Activity"
            subtitle="Shared group changes are recorded for participants."
          />
          {groupActivity.length > 0 ? (
            groupActivity.map((activity) => (
              <View key={activity.id} style={styles.activityRow}>
                <Text style={styles.rowTitle}>
                  {activity.action.replaceAll("_", " ")}
                </Text>
                <Text style={styles.body}>
                  {new Date(activity.createdAt).toLocaleString()}
                </Text>
              </View>
            ))
          ) : (
            <EmptyState
              title="No group activity"
              body="Shared group actions will appear here."
            />
          )}
        </Card>
      ) : null}

      {tab === "overview" ? (
        <>
          <AttachmentsSection
            targetType="group"
            targetId={group.id}
            groupId={group.id}
            parentVisibility={group.visibility}
            preferredKind="other"
          />
          <CommentsSection
            targetType="group"
            targetId={group.id}
            groupId={group.id}
            sharedAvailable={group.visibility === "shared"}
          />
        </>
      ) : null}
    </Screen>
  );
}

function GroupLedgerRow({
  entry,
  sharedMembers,
  currentGroupMember,
  canVerify,
  rejectionReason,
  onReasonChange,
  onVerify,
  onReject,
}: {
  entry: LedgerEntry;
  sharedMembers: SharedGroupMember[];
  currentGroupMember?: SharedGroupMember;
  canVerify: boolean;
  rejectionReason: string;
  onReasonChange: (value: string) => void;
  onVerify: () => void;
  onReject: () => void;
}) {
  const currentMemberInvolved =
    currentGroupMember &&
    (entry.fromId === currentGroupMember.id ||
      entry.toId === currentGroupMember.id);
  return (
    <View style={styles.verificationBlock}>
      <DebtRow entry={entry} members={[]} sharedGroupMembers={sharedMembers} />
      <View style={styles.badgeLine}>
        <VerificationBadge status={entry.verificationStatus} />
        <Text style={styles.body}>
          {participantName(entry.fromId, [], sharedMembers)} owes{" "}
          {participantName(entry.toId, [], sharedMembers)}
        </Text>
      </View>
      {canVerify && currentMemberInvolved ? (
        <>
          <TextField
            label="Rejection reason"
            value={rejectionReason}
            onChangeText={onReasonChange}
            placeholder="Required when rejecting"
            multiline
          />
          <View style={styles.actionRow}>
            <Button title="Verify" icon="shield-checkmark" onPress={onVerify} />
            <Button
              title="Reject"
              icon="close-circle"
              variant="danger"
              disabled={!rejectionReason.trim()}
              onPress={onReject}
            />
          </View>
        </>
      ) : null}
    </View>
  );
}

function SettingToggle({
  settings,
  onChange,
}: {
  settings: GroupSettlementSettings;
  onChange: (settings: GroupSettlementSettings) => void;
}) {
  return (
    <View style={styles.toggleGrid}>
      {[
        ["includePending", "Include pending"],
        ["includePartiallyVerified", "Include partially verified"],
        ["includeRejectedDisputed", "Include rejected/disputed"],
        ["includeSettled", "Include settled"],
        ["directDebtOnly", "Direct debts only"],
        ["verifiedOnly", "Verified records only"],
        ["convertedCurrency", "Estimated converted settlement"],
      ].map(([key, label]) => {
        const typedKey = key as keyof GroupSettlementSettings;
        return (
          <Button
            key={key}
            title={label}
            icon={settings[typedKey] ? "checkbox" : "square-outline"}
            variant={settings[typedKey] ? "secondary" : "ghost"}
            onPress={() =>
              onChange({ ...settings, [typedKey]: !settings[typedKey] })
            }
          />
        );
      })}
    </View>
  );
}

function SharedMembersPanel({
  groupMembers,
  warnings,
  claims,
  canManage,
  canInvite,
  currentUserId,
  newMemberName,
  newMemberEmail,
  newMemberPhone,
  inviteDisplayName,
  inviteEmail,
  inviteRole,
  claimMessage,
  setNewMemberName,
  setNewMemberEmail,
  setNewMemberPhone,
  setInviteDisplayName,
  setInviteEmail,
  setInviteRole,
  setClaimMessage,
  addUnlinkedGroupMember,
  sendInvite,
  claimMember,
  ignoreWarning,
  mergeMembers,
  approveClaim,
  rejectClaim,
}: {
  groupMembers: SharedGroupMember[];
  warnings: {
    id: string;
    groupMemberIdA: string;
    groupMemberIdB: string;
    reason: string;
    confidence: string;
  }[];
  claims: {
    id: string;
    groupMemberId: string;
    claimantUserId: string;
    message: string | null;
  }[];
  canManage: boolean;
  canInvite: boolean;
  currentUserId: string | null;
  newMemberName: string;
  newMemberEmail: string;
  newMemberPhone: string;
  inviteDisplayName: string;
  inviteEmail: string;
  inviteRole: Exclude<GroupRole, "owner">;
  claimMessage: string;
  setNewMemberName: (value: string) => void;
  setNewMemberEmail: (value: string) => void;
  setNewMemberPhone: (value: string) => void;
  setInviteDisplayName: (value: string) => void;
  setInviteEmail: (value: string) => void;
  setInviteRole: (value: Exclude<GroupRole, "owner">) => void;
  setClaimMessage: (value: string) => void;
  addUnlinkedGroupMember: () => void;
  sendInvite: () => void;
  claimMember: (member: SharedGroupMember) => void;
  ignoreWarning: (warningId: string) => void | Promise<unknown>;
  mergeMembers: (sourceId: string, targetId: string) => void | Promise<unknown>;
  approveClaim: (claimId: string) => void | Promise<unknown>;
  rejectClaim: (claimId: string) => void | Promise<unknown>;
}) {
  const activeMembers = groupMembers.filter(
    (member) => member.status !== "merged",
  );
  return (
    <>
      <Card>
        <SectionTitle
          title="Group members"
          subtitle="Linked users and shared placeholders are group-specific."
        />
        {activeMembers.map((member) => (
          <View key={member.id} style={styles.memberRow}>
            <View style={styles.flexOne}>
              <View style={styles.badgeLine}>
                <Text style={styles.rowTitle}>{member.displayName}</Text>
                <Badge
                  label={member.type === "linked_user" ? "linked" : "unlinked"}
                  tone={member.type === "linked_user" ? "positive" : "amber"}
                />
                <Badge
                  label={member.status}
                  tone={member.status === "active" ? "neutral" : "blue"}
                />
              </View>
              {member.email || member.phone ? (
                <Text style={styles.body}>{member.email ?? member.phone}</Text>
              ) : null}
            </View>
            {member.type === "unlinked_placeholder" && currentUserId ? (
              <Button
                title="Claim this member"
                icon="person-add"
                variant="secondary"
                onPress={() => claimMember(member)}
              />
            ) : null}
          </View>
        ))}
        {currentUserId ? (
          <TextField
            label="Claim message"
            value={claimMessage}
            onChangeText={setClaimMessage}
            placeholder="Optional"
          />
        ) : null}
      </Card>

      {canManage ? (
        <Card>
          <SectionTitle
            title="Add unlinked member"
            subtitle="Shared placeholders are visible to all group participants."
          />
          <TextField
            label="Display name"
            value={newMemberName}
            onChangeText={setNewMemberName}
            placeholder="Dad"
          />
          <TextField
            label="Email"
            value={newMemberEmail}
            onChangeText={setNewMemberEmail}
            keyboardType="email-address"
          />
          <TextField
            label="Phone"
            value={newMemberPhone}
            onChangeText={setNewMemberPhone}
            keyboardType="phone-pad"
          />
          <Button
            title="Add unlinked member"
            icon="person-add"
            disabled={!newMemberName.trim()}
            onPress={addUnlinkedGroupMember}
          />
        </Card>
      ) : null}

      {canInvite ? (
        <Card>
          <SectionTitle
            title="Invite members"
            subtitle="Accepting an invite shares only group-specific records."
          />
          <TextField
            label="Display name"
            value={inviteDisplayName}
            onChangeText={setInviteDisplayName}
            placeholder="Sarah"
          />
          <TextField
            label="Email"
            value={inviteEmail}
            onChangeText={setInviteEmail}
            keyboardType="email-address"
          />
          <SelectChips
            label="Role offered"
            value={inviteRole}
            options={[
              { label: "Admin", value: "admin" },
              { label: "Member", value: "member" },
              { label: "Viewer", value: "viewer" },
            ]}
            onChange={setInviteRole}
          />
          <Button
            title="Invite members"
            icon="mail"
            disabled={!inviteDisplayName.trim()}
            onPress={sendInvite}
          />
        </Card>
      ) : null}

      {claims.length > 0 ? (
        <Card tone="blue">
          <SectionTitle
            title="Claim requests"
            subtitle="Owner/admin approval links a placeholder to a real user."
          />
          {claims.map((claim) => {
            const member = groupMembers.find(
              (item) => item.id === claim.groupMemberId,
            );
            return (
              <View key={claim.id} style={styles.warningRow}>
                <Text style={styles.body}>
                  {claim.claimantUserId} wants to claim{" "}
                  {member?.displayName ?? "an group member"}.
                </Text>
                {claim.message ? (
                  <Text style={styles.body}>{claim.message}</Text>
                ) : null}
                {canManage ? (
                  <View style={styles.actionRow}>
                    <Button
                      title="Approve claim"
                      icon="checkmark-circle"
                      onPress={() => approveClaim(claim.id)}
                    />
                    <Button
                      title="Reject claim"
                      icon="close-circle"
                      variant="secondary"
                      onPress={() => rejectClaim(claim.id)}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
        </Card>
      ) : null}

      {warnings.length > 0 ? (
        <Card tone="amber">
          <SectionTitle
            title="Possible duplicate member"
            subtitle="Warnings never auto-merge members."
          />
          {warnings.map((warning) => {
            const first = groupMembers.find(
              (member) => member.id === warning.groupMemberIdA,
            );
            const second = groupMembers.find(
              (member) => member.id === warning.groupMemberIdB,
            );
            return (
              <View key={warning.id} style={styles.warningRow}>
                <Text style={styles.body}>
                  {first?.displayName ?? "Member"} and{" "}
                  {second?.displayName ?? "Member"} may refer to the same
                  person. {warning.reason}
                </Text>
                <View style={styles.actionRow}>
                  <Button
                    title="Ignore"
                    icon="close"
                    variant="secondary"
                    onPress={() => ignoreWarning(warning.id)}
                  />
                  {canManage && first && second ? (
                    <Button
                      title="Merge"
                      icon="git-merge"
                      onPress={() => mergeMembers(first.id, second.id)}
                    />
                  ) : null}
                </View>
              </View>
            );
          })}
        </Card>
      ) : null}
    </>
  );
}

function PrivateMembersPanel({
  groupMemberIds,
  members,
  duplicateWarnings,
  toggleMember,
  ignoreWarning,
}: {
  groupId: string;
  groupMemberIds: string[];
  members: { id: string; displayName: string; archived: boolean }[];
  duplicateWarnings: { key: string; message: string }[];
  ignoredDuplicateKeys: string[];
  toggleMember: (memberId: string) => void;
  ignoreWarning: (key: string) => void;
}) {
  return (
    <>
      <Card>
        <SectionTitle
          title="Private group members"
          subtitle="Private groups use local/manual members only."
        />
        <View style={styles.memberWrap}>
          <View style={[styles.memberChip, styles.memberChipSelected]}>
            <Text style={styles.memberChipSelectedText}>You</Text>
          </View>
          {members
            .filter((member) => !member.archived)
            .map((member) => {
              const selected = groupMemberIds.includes(member.id);
              return (
                <Pressable
                  key={member.id}
                  accessibilityRole="button"
                  accessibilityLabel={member.displayName}
                  accessibilityState={{ selected }}
                  onPress={() => toggleMember(member.id)}
                >
                  {({ pressed }) => (
                    <GlassSurface
                      role={selected ? "surface" : "control"}
                      interactive
                      style={[
                        styles.memberChip,
                        selected && styles.memberChipSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.memberChipText,
                          selected && styles.memberChipSelectedText,
                        ]}
                      >
                        {member.displayName}
                      </Text>
                    </GlassSurface>
                  )}
                </Pressable>
              );
            })}
        </View>
      </Card>
      {duplicateWarnings.length > 0 ? (
        <Card tone="amber">
          <SectionTitle
            title="Possible duplicate members"
            subtitle="Warnings do not auto-merge local contacts."
          />
          {duplicateWarnings.map((warning) => (
            <View key={warning.key} style={styles.warningRow}>
              <Text style={styles.body}>{warning.message}</Text>
              <Button
                title="Ignore warning"
                icon="close"
                variant="secondary"
                onPress={() => ignoreWarning(warning.key)}
              />
            </View>
          ))}
        </Card>
      ) : null}
    </>
  );
}

function buildConvertedEstimate(
  nets: Record<string, Record<string, number | undefined>>,
  baseCurrency: CurrencyCode,
  rates: { currency: CurrencyCode; rateToSek: number }[],
) {
  const rateMap = new Map(rates.map((rate) => [rate.currency, rate.rateToSek]));
  const baseRate = rateMap.get(baseCurrency) ?? 1;
  const convertedNets = Object.entries(nets).map(
    ([participantId, moneyMap]) => {
      const amount = Object.entries(moneyMap).reduce(
        (total, [currency, value]) => {
          const rate = rateMap.get(currency as CurrencyCode) ?? 1;
          return total + ((value ?? 0) * rate) / baseRate;
        },
        0,
      );
      return { participantId, amount };
    },
  );
  const creditors = convertedNets
    .filter((item) => item.amount > MINIMUM_BALANCE_THRESHOLD)
    .sort((a, b) => b.amount - a.amount);
  const debtors = convertedNets
    .filter((item) => item.amount < -MINIMUM_BALANCE_THRESHOLD)
    .map((item) => ({ ...item, amount: Math.abs(item.amount) }))
    .sort((a, b) => b.amount - a.amount);
  const suggestions: { fromId: string; toId: string; amount: number }[] = [];
  let creditorIndex = 0;
  let debtorIndex = 0;
  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const amount =
      Math.round(Math.min(creditor.amount, debtor.amount) * 100) / 100;
    if (amount > MINIMUM_BALANCE_THRESHOLD) {
      suggestions.push({
        fromId: debtor.participantId,
        toId: creditor.participantId,
        amount,
      });
    }
    creditor.amount -= amount;
    debtor.amount -= amount;
    if (creditor.amount <= MINIMUM_BALANCE_THRESHOLD) {
      creditorIndex += 1;
    }
    if (debtor.amount <= MINIMUM_BALANCE_THRESHOLD) {
      debtorIndex += 1;
    }
  }
  return suggestions;
}

function targetForEntry(
  entry: LedgerEntry,
): { type: GroupVerificationResponse["targetType"]; id: string } | null {
  if (entry.kind === "group_direct_debt") {
    return { type: "debt", id: entry.sourceId };
  }
  if (entry.kind === "expense_obligation" && entry.expenseId) {
    return { type: "expense", id: entry.expenseId };
  }
  return null;
}

function targetKey(entry: LedgerEntry) {
  const target = targetForEntry(entry);
  return target ? `${target.type}:${target.id}` : entry.id;
}

const styles = StyleSheet.create({
  heroCard: {
    gap: spacing.md,
  },
  flexOne: {
    flex: 1,
    gap: spacing.sm,
  },
  label: {
    color: palette.brandDark,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyHeavy,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  coverPhotoPlaceholder: {
    minHeight: 150,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderGlass,
    backgroundColor: "rgba(255,255,255,0.48)",
    alignItems: "center",
    justifyContent: "center",
  },
  coverPhotoText: {
    color: palette.muted,
    fontSize: typography.size.base,
    fontFamily: typefaces.bodyStrong,
  },
  balanceSubtext: {
    color: palette.muted,
    fontSize: typography.size.base,
    lineHeight: typography.line.basePlus,
    fontFamily: typefaces.bodyStrong,
  },
  balanceFigure: {
    fontSize: typography.size.displayXl,
    lineHeight: typography.line.displayXl,
    fontFamily: typefaces.display,
  },
  balanceFigurePositive: {
    color: palette.success,
  },
  balanceFigureNegative: {
    color: palette.danger,
  },
  memberCountRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  memberCountNumber: {
    color: palette.brandDark,
    fontSize: typography.size.h1,
    fontFamily: typefaces.bodyHeavy,
  },
  memberCountLabel: {
    color: palette.muted,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
    paddingBottom: 3,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  badgeLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.xs,
  },
  memberWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  memberChip: {
    minHeight: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "rgba(255,255,255,0.82)",
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },
  memberChipSelected: {
    backgroundColor: palette.brand,
    borderColor: palette.brand,
  },
  memberChipText: {
    color: palette.muted,
    fontSize: typography.size.md,
    fontFamily: typefaces.bodyStrong,
  },
  memberChipSelectedText: {
    color: "#FFFFFF",
    fontSize: typography.size.md,
    fontFamily: typefaces.bodyHeavy,
  },
  pressed: {
    opacity: 0.72,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  warningRow: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  body: {
    color: palette.muted,
    fontSize: typography.size.base,
    lineHeight: typography.line.xl,
    fontFamily: typefaces.body,
  },
  rowTitle: {
    color: palette.ink,
    fontSize: typography.size.xl,
    fontFamily: typefaces.bodyHeavy,
  },
  settlementRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  settlementText: {
    flex: 1,
    color: palette.ink,
    fontSize: typography.size.lg,
    fontFamily: typefaces.bodyHeavy,
  },
  money: {
    color: palette.brandDark,
    fontSize: typography.size.lg,
    fontFamily: typefaces.bodyHeavy,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  infoLabel: {
    color: palette.muted,
    fontSize: typography.size.md,
    fontFamily: typefaces.bodyStrong,
  },
  infoValue: {
    color: palette.ink,
    fontSize: typography.size.md,
    fontFamily: typefaces.bodyHeavy,
    flex: 1,
    textAlign: "right",
  },
  countLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  verificationBlock: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  toggleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  estimateBox: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  activityRow: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
});
