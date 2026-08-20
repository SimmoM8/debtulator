import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import {
    BarChartCard,
    MoneyMapListCard,
} from "@/src/presentation/components/AnalyticsCards";
import { AttachmentsSection } from "@/src/presentation/components/AttachmentsSection";
import { CommentsSection } from "@/src/presentation/components/CommentsSection";
import { MainActionsBar } from "@/src/presentation/design-system/MainActionsBar";
import { MobileMenuModal } from "@/src/presentation/design-system/MenuList";
import { Badge, TagChips } from "@/src/presentation/design-system/Badges";
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
} from "@/src/presentation/design-system/Primitives";
import {
    GroupLedgerRow,
    PrivateMembersPanel,
    SettingToggle,
    SharedMembersPanel,
} from "@/src/presentation/features/groups/components/GroupDetailSections";
import {
    palette,
    radii,
    spacing,
    typefaces,
    typography,
} from "@/src/presentation/theme/design";
import { groupSpendingBreakdown } from "@debtulator/domain/analytics/analytics";
import { convertCurrency, estimateMoneyMap } from "@debtulator/domain/finance/currencyConversion";
import { findDuplicateWarnings } from "@debtulator/domain/members/duplicates";
import {
    canAddExpense,
    canArchiveGroup,
    canFinaliseGroup,
    canInviteMembers,
    canMergeGroupMembers,
    canReopenGroup,
    participantForUser,
} from "@debtulator/domain/groups/permissions";
import {
    groupPdfLines,
    groupTextSummary,
    shareExport,
    writePdfExport,
    writeTextExport,
} from "@debtulator/application/data/export";
import {
    DEFAULT_GROUP_SETTLEMENT_SETTINGS,
    entriesForGroup,
    explainGroupSettlement,
    participantName,
} from "@debtulator/domain/ledger/ledger";
import { useAppData } from "@/src/presentation/providers/AppDataProvider";
import { useAuth } from "@/src/presentation/providers/AuthProvider";
import { useCollaboration } from "@/src/presentation/providers/CollaborationProvider";
import { usePlatformServices } from "@/src/presentation/providers/PlatformServicesProvider";
import type {
    CurrencyCode,
    GroupRole,
    GroupSettlementSettings,
    GroupStatus,
    GroupVerificationResponse,
    LedgerEntry,
    SharedGroupMember,
} from "@debtulator/domain/models";
import { formatMoney } from "@debtulator/domain/finance/money";
import { routes } from '@/src/presentation/navigation/routes';

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
  const collaboration = useCollaboration();
  const platform = usePlatformServices();
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
      const remoteId = await collaboration.groups.createMember(member);
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
      const remoteId = await collaboration.groups.createInvite(invite);
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
      router.push(routes.auth());
      return;
    }
    await data.createGroupMemberClaim(member.id, currentUserId, claimMessage);
    setClaimMessage("");
  }

  async function exportGroupPdf() {
    const uri = await writePdfExport(
      platform.files,
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
    await shareExport(platform.sharing, uri, `${currentGroup.name} PDF summary`);
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
      platform.files,
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
    await shareExport(platform.sharing, uri, `${currentGroup.name} summary`, summary);
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
                router.push(routes.expenseForm({ groupId: group.id })),
            },
            {
              title: "Make repayment",
              icon: "card",
              variant: "secondary",
              disabled: !canAddRecords,
              onPress: () =>
                router.push(routes.paymentForm({ groupId: group.id })),
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
                  router.push(routes.debtForm({ groupId: group.id }));
                },
              },
              {
                label: "Record settlement",
                subtitle: "Record a repayment for this group",
                icon: "card-outline",
                disabled: !canAddRecords,
                onPress: () => {
                  setOptionsOpen(false);
                  router.push(routes.paymentForm({ groupId: group.id }));
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
                      router.push(routes.paymentForm({
                          groupId: group.id,
                          payerId: suggestion.fromId,
                          payeeId: suggestion.toId,
                      }))
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
