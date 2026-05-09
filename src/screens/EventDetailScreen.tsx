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
import { DebtulatorOrbitIllustration } from "@/src/components/illustrations/DebtulatorOrbitIllustration";
import {
    Badge,
    StatusBadge,
    SyncBadge,
    TagChips,
    VerificationBadge,
} from "@/src/components/ui/Badges";
import { BalanceStack } from "@/src/components/ui/Money";
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
import { palette, radii, spacing, typefaces,
typography,
} from "@/src/constants/design";
import { eventSpendingBreakdown } from "@/src/services/analytics";
import { convertCurrency, estimateMoneyMap } from "@/src/services/currency";
import { findDuplicateWarnings } from "@/src/services/duplicates";
import {
    canAddExpense,
    canArchiveEvent,
    canFinaliseEvent,
    canInviteMembers,
    canMergeEventMembers,
    canReopenEvent,
    participantForUser,
    roleForEvent,
} from "@/src/services/eventPermissions";
import {
    eventPdfLines,
    eventTextSummary,
    shareExport,
    writePdfExport,
    writeTextExport,
} from "@/src/services/export";
import {
    DEFAULT_EVENT_SETTLEMENT_SETTINGS,
    entriesForEvent,
    explainEventSettlement,
    participantName,
} from "@/src/services/ledger";
import {
    createRemoteEventInvite,
    createRemoteSharedEventMember,
} from "@/src/services/stage3Sync";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";
import type {
    CurrencyCode,
    EventRole,
    EventSettlementSettings,
    EventStatus,
    EventVerificationResponse,
    LedgerEntry,
    SharedEventMember,
} from "@/src/types/models";
import { formatMoney } from "@/src/utils/money";

type EventTab =
  | "overview"
  | "expenses"
  | "balances"
  | "analytics"
  | "settlements"
  | "payments"
  | "members"
  | "activity";
const MINIMUM_BALANCE_THRESHOLD = 0.005;

export function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useAppData();
  const auth = useAuth();
  const event = data.events.find((item) => item.id === id);
  const [tab, setTab] = useState<EventTab>("overview");
  const [settlementSettings, setSettlementSettings] =
    useState<EventSettlementSettings>(DEFAULT_EVENT_SETTLEMENT_SETTINGS);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [inviteDisplayName, setInviteDisplayName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] =
    useState<Exclude<EventRole, "owner">>("member");
  const [claimMessage, setClaimMessage] = useState("");
  const [rejectionReasons, setRejectionReasons] = useState<
    Record<string, string>
  >({});

  const currentUserId = auth.identity.authenticatedUserId;
  const participant = useMemo(
    () =>
      event
        ? participantForUser(event, data.eventParticipants, currentUserId)
        : null,
    [currentUserId, data.eventParticipants, event],
  );
  const permissionContext = event
    ? { event, participant, userId: currentUserId }
    : null;
  const role = permissionContext ? roleForEvent(permissionContext) : "viewer";
  const sharedEventMembers = useMemo(
    () => data.sharedEventMembers.filter((member) => member.eventId === id),
    [data.sharedEventMembers, id],
  );
  const activeSharedMembers = sharedEventMembers.filter(
    (member) => member.status !== "archived" && member.status !== "merged",
  );
  const currentEventMember = sharedEventMembers.find(
    (member) =>
      currentUserId &&
      member.linkedUserId === currentUserId &&
      member.status !== "merged",
  );
  const eventMemberIds = useMemo(
    () =>
      data.eventMembers
        .filter((eventMember) => eventMember.eventId === id)
        .map((eventMember) => eventMember.memberId),
    [data.eventMembers, id],
  );
  const eventEntries = useMemo(
    () => (event ? entriesForEvent(event.id, data.ledgerEntries) : []),
    [data.ledgerEntries, event],
  );
  const explanation = useMemo(
    () =>
      event
        ? explainEventSettlement(
            event.id,
            data.ledgerEntries,
            settlementSettings,
          )
        : null,
    [data.ledgerEntries, event, settlementSettings],
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
      event
        ? findDuplicateWarnings(event, data.eventMembers, data.members)
        : [],
    [data.eventMembers, data.members, event],
  );
  const sharedDuplicateWarnings = data.eventDuplicateWarnings.filter(
    (warning) => warning.eventId === id && warning.status === "active",
  );
  const eventActivity = data.eventActivityLogs.filter(
    (activity) => activity.eventId === id,
  );
  const pendingInvites = data.eventInvites.filter(
    (invite) => invite.eventId === id && invite.status === "pending",
  );
  const pendingClaims = data.eventMemberClaims.filter(
    (claim) => claim.eventId === id && claim.status === "pending",
  );
  const analytics = useMemo(
    () =>
      event
        ? eventSpendingBreakdown({
            event,
            entries: data.ledgerEntries,
            sharedExpenses: data.sharedExpenses,
            members: data.members,
            sharedEventMembers: data.sharedEventMembers,
          })
        : null,
    [
      data.ledgerEntries,
      data.members,
      data.sharedEventMembers,
      data.sharedExpenses,
      event,
    ],
  );

  if (data.loading || auth.loading) {
    return <LoadingState />;
  }

  if (!event || !explanation || !permissionContext) {
    return (
      <Screen>
        <EmptyState
          title="Event not found"
          body="This event may have been archived or removed."
        />
      </Screen>
    );
  }

  const currentEvent = event;
  const currentExplanation = explanation;
  const isShared = currentEvent.visibility === "shared";
  const canAddRecords = canAddExpense(permissionContext);
  const canManagePeople = canMergeEventMembers(permissionContext);
  const canInvite = canInviteMembers(permissionContext);
  const myBalanceId = isShared ? currentEventMember?.id : "me";

  async function togglePrivateMember(memberId: string) {
    const nextIds = eventMemberIds.includes(memberId)
      ? eventMemberIds.filter((id) => id !== memberId)
      : [...eventMemberIds, memberId];
    await data.setEventMembers(currentEvent.id, nextIds);
  }

  async function updateStatus(status: EventStatus) {
    if (status === "finalising") {
      Alert.alert(
        "Finalise event",
        "Finalised events are locked for normal editing.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Finalise event",
            onPress: () => data.updateEvent(currentEvent.id, { status }),
          },
        ],
      );
      return;
    }
    await data.updateEvent(currentEvent.id, {
      status,
      archived:
        status === "archived"
          ? true
          : status === "active"
            ? false
            : currentEvent.archived,
    });
  }

  async function addUnlinkedEventMember() {
    if (!newMemberName.trim() || !currentUserId) {
      return;
    }
    const member = await data.createSharedEventMember({
      eventId: currentEvent.id,
      remoteEventId: currentEvent.remoteId,
      displayName: newMemberName,
      email: newMemberEmail,
      phone: newMemberPhone,
      createdByUserId: currentUserId,
    });
    try {
      const remoteId = await createRemoteSharedEventMember(member);
      if (remoteId) {
        await data.upsertSharedEventMember({
          ...member,
          remoteId,
          syncStatus: "synced",
        });
      }
    } catch {
      await data.upsertSharedEventMember({
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
    const invite = await data.createEventInvite({
      eventId: currentEvent.id,
      remoteEventId: currentEvent.remoteId,
      inviterUserId: currentUserId,
      invitedEmail: inviteEmail,
      invitedDisplayName: inviteDisplayName,
      offeredRole: inviteRole,
    });
    try {
      const remoteId = await createRemoteEventInvite(invite);
      if (remoteId) {
        await data.upsertEventInvite({
          ...invite,
          remoteId,
          syncStatus: "synced",
        });
      }
    } catch {
      await data.upsertEventInvite({ ...invite, syncStatus: "sync_error" });
    }
    setInviteDisplayName("");
    setInviteEmail("");
    setInviteRole("member");
  }

  async function claimMember(member: SharedEventMember) {
    if (!currentUserId) {
      router.push("/auth");
      return;
    }
    await data.createEventMemberClaim(member.id, currentUserId, claimMessage);
    setClaimMessage("");
  }

  async function exportEventPdf() {
    const uri = await writePdfExport(
      `debtulator-${currentEvent.name}-summary.pdf`,
      eventPdfLines({
        event: currentEvent,
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
      targetType: "event",
      targetId: currentEvent.id,
      metadata: { uri },
    });
    await shareExport(uri, `${currentEvent.name} PDF summary`);
  }

  async function shareEventSummary() {
    const summary = eventTextSummary({
      event: currentEvent,
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
      `debtulator-${currentEvent.name}-summary.txt`,
      summary,
    );
    await data.createExportLog({
      userId: auth.identity.authenticatedUserId,
      exportType: "text_summary",
      targetType: "event",
      targetId: currentEvent.id,
      metadata: { uri, privateNotesIncluded: false },
    });
    await shareExport(uri, `${currentEvent.name} summary`, summary);
  }

  return (
    <Screen>
      <PageHeader
        detailLabel="Event details"
        title={event.name}
        subtitle={
          event.notes ??
          "Collaborative expenses, balances, settlements, and activity."
        }
        action={
          canManagePeople || !isShared ? (
            <IconButton
              icon="create-outline"
              label="Edit event"
              onPress={() =>
                router.push({
                  pathname: "/event/form",
                  params: { id: event.id },
                })
              }
            />
          ) : undefined
        }
      />

      <Card tone={isShared ? "peach" : "lavender"} style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.eventTop}>
          <View style={styles.flexOne}>
            <Text style={styles.heroLabel}>Event ledger</Text>
            <View style={styles.badgeLine}>
              <StatusBadge status={event.status} />
              <Badge
                label={isShared ? "shared event" : "private event"}
                tone={isShared ? "blue" : "neutral"}
              />
              <Badge
                label={role}
                tone={role === "viewer" ? "neutral" : "positive"}
              />
              <SyncBadge status={event.syncStatus} />
              {event.lockedAt || event.finalisedAt ? (
                <Badge label="locked" tone="amber" />
              ) : null}
            </View>
            <Text style={styles.label}>Your event balance</Text>
            <BalanceStack
              balances={
                (myBalanceId
                  ? explanation.participantNets[myBalanceId]
                  : undefined) ?? {}
              }
              settings={data.settings}
              currencyRates={data.currencyRates}
              empty="No personal balance"
            />
          </View>
          <View style={styles.heroAside}>
            <View style={styles.heroArtWrap}>
              <DebtulatorOrbitIllustration width={132} height={104} compact />
            </View>
            <View style={styles.badgeBox}>
              <Text style={styles.badgeNumber}>
                {isShared
                  ? activeSharedMembers.length
                  : eventMemberIds.length + 1}
              </Text>
              <Text style={styles.badgeLabel}>members</Text>
            </View>
          </View>
        </View>
        <TagChips tags={event.tags} />
        <View style={styles.actionRow}>
          <Button
            title="Add expense"
            icon="cart"
            disabled={!canAddRecords}
            onPress={() =>
              router.push({
                pathname: "/expense/form",
                params: { eventId: event.id },
              })
            }
          />
          <Button
            title="Add direct debt"
            icon="receipt"
            variant="secondary"
            disabled={!canAddRecords}
            onPress={() =>
              router.push({
                pathname: "/debt/form",
                params: { eventId: event.id },
              })
            }
          />
          <Button
            title="Record settlement"
            icon="card"
            variant="secondary"
            disabled={!canAddRecords}
            onPress={() =>
              router.push({
                pathname: "/payment/form",
                params: { eventId: event.id },
              })
            }
          />
          <Button
            title="Remind gently"
            icon="notifications"
            variant="secondary"
            disabled={!canAddRecords}
            onPress={() =>
              data.createSoftReminder({
                senderUserId: currentUserId,
                recipientUserId: null,
                relatedMemberId: null,
                relatedEventId: event.id,
                relatedRecordId: null,
                message: `${event.name} has unsettled balances.`,
              })
            }
          />
          <Button
            title="Share summary"
            icon="share"
            variant="secondary"
            onPress={shareEventSummary}
          />
          <Button
            title="Export PDF"
            icon="document-text"
            variant="secondary"
            onPress={exportEventPdf}
          />
        </View>
      </Card>

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
              title="Event status"
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
              <Text style={styles.infoValue}>{event.defaultCurrency}</Text>
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
              {canFinaliseEvent(permissionContext) ? (
                <Button
                  title="Finalise event"
                  icon="lock-closed"
                  variant="secondary"
                  onPress={() => updateStatus("finalising")}
                />
              ) : null}
              {canReopenEvent(permissionContext) ? (
                <Button
                  title="Reopen event"
                  icon="lock-open"
                  variant="secondary"
                  onPress={() => updateStatus("active")}
                />
              ) : null}
              {canFinaliseEvent(permissionContext) ? (
                <Button
                  title="Mark settled"
                  icon="checkmark-circle"
                  variant="secondary"
                  onPress={() => updateStatus("settled")}
                />
              ) : null}
              {canArchiveEvent(permissionContext) ? (
                <Button
                  title="Archive event"
                  icon="archive"
                  variant="danger"
                  onPress={() => updateStatus("archived")}
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
            title="Event ledger"
            subtitle="Expenses and direct event debts are verified at event level."
          />
          {eventEntries.length > 0 ? (
            eventEntries.map((entry) => (
              <EventLedgerRow
                key={entry.id}
                entry={entry}
                sharedMembers={sharedEventMembers}
                currentEventMember={currentEventMember}
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
                  if (!currentUserId || !currentEventMember || !target) {
                    return;
                  }
                  data.respondToEventVerification({
                    eventId: event.id,
                    targetType: target.type,
                    targetId: target.id,
                    eventMemberId: currentEventMember.id,
                    linkedUserId: currentUserId,
                    status: "verified",
                  });
                }}
                onReject={() => {
                  const target = targetForEntry(entry);
                  if (!currentUserId || !currentEventMember || !target) {
                    return;
                  }
                  data.respondToEventVerification({
                    eventId: event.id,
                    targetType: target.type,
                    targetId: target.id,
                    eventMemberId: currentEventMember.id,
                    linkedUserId: currentUserId,
                    status: "rejected",
                    rejectionReason: rejectionReasons[targetKey(entry)] ?? "",
                  });
                }}
              />
            ))
          ) : (
            <EmptyState
              title="No event records"
              body="Add a shared expense or direct event debt."
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
                    sharedEventMembers,
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
            title="Event spending totals"
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
            subtitle="Open, paid, partial, and overpaid totals for this event."
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
            title="Top event balances"
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
              subtitle={`Generated from event balances and shown in ${data.settings.baseCurrency}.`}
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
                      sharedEventMembers,
                    )}{" "}
                    pays{" "}
                    {participantName(
                      suggestion.toId,
                      data.members,
                      sharedEventMembers,
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
                          eventId: event.id,
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
                        sharedEventMembers,
                      )}{" "}
                      pays{" "}
                      {participantName(
                        suggestion.toId,
                        data.members,
                        sharedEventMembers,
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
                {participantName(step.fromId, data.members, sharedEventMembers)}
                {" -> "}
                {participantName(step.toId, data.members, sharedEventMembers)}
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
            subtitle="Payments and settlement records for this event."
          />
          {data.payments.filter((payment) => payment.eventId === event.id)
            .length > 0 ? (
            data.payments
              .filter((payment) => payment.eventId === event.id)
              .map((payment) => (
                <View key={payment.id} style={styles.settlementRow}>
                  <Text style={styles.settlementText}>
                    {participantName(
                      payment.payerEventMemberId ?? "me",
                      data.members,
                      sharedEventMembers,
                    )}{" "}
                    paid{" "}
                    {participantName(
                      payment.payeeEventMemberId ?? "me",
                      data.members,
                      sharedEventMembers,
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
            eventMembers={sharedEventMembers}
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
            addUnlinkedEventMember={addUnlinkedEventMember}
            sendInvite={sendInvite}
            claimMember={claimMember}
            ignoreWarning={(warningId) =>
              currentUserId
                ? data.ignoreEventDuplicateWarning(warningId, currentUserId)
                : undefined
            }
            mergeMembers={(sourceId, targetId) =>
              currentUserId
                ? data.mergeSharedEventMembers(
                    sourceId,
                    targetId,
                    currentUserId,
                  )
                : undefined
            }
            approveClaim={(claimId) =>
              currentUserId
                ? data.respondToEventMemberClaim(
                    claimId,
                    "approved",
                    currentUserId,
                  )
                : undefined
            }
            rejectClaim={(claimId) =>
              currentUserId
                ? data.respondToEventMemberClaim(
                    claimId,
                    "rejected",
                    currentUserId,
                  )
                : undefined
            }
          />
        ) : (
          <PrivateMembersPanel
            eventId={event.id}
            eventMemberIds={eventMemberIds}
            members={data.members}
            duplicateWarnings={duplicateWarnings}
            ignoredDuplicateKeys={event.ignoredDuplicateKeys}
            toggleMember={togglePrivateMember}
            ignoreWarning={(key) =>
              data.updateEvent(event.id, {
                ignoredDuplicateKeys: [...event.ignoredDuplicateKeys, key],
              })
            }
          />
        )
      ) : null}

      {tab === "activity" ? (
        <Card>
          <SectionTitle
            title="Activity"
            subtitle="Shared event changes are recorded for participants."
          />
          {eventActivity.length > 0 ? (
            eventActivity.map((activity) => (
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
              title="No event activity"
              body="Shared event actions will appear here."
            />
          )}
        </Card>
      ) : null}

      {tab === "overview" ? (
        <>
          <AttachmentsSection
            targetType="event"
            targetId={event.id}
            eventId={event.id}
            parentVisibility={event.visibility}
            preferredKind="other"
          />
          <CommentsSection
            targetType="event"
            targetId={event.id}
            eventId={event.id}
            sharedAvailable={event.visibility === "shared"}
          />
        </>
      ) : null}
    </Screen>
  );
}

function EventLedgerRow({
  entry,
  sharedMembers,
  currentEventMember,
  canVerify,
  rejectionReason,
  onReasonChange,
  onVerify,
  onReject,
}: {
  entry: LedgerEntry;
  sharedMembers: SharedEventMember[];
  currentEventMember?: SharedEventMember;
  canVerify: boolean;
  rejectionReason: string;
  onReasonChange: (value: string) => void;
  onVerify: () => void;
  onReject: () => void;
}) {
  const currentMemberInvolved =
    currentEventMember &&
    (entry.fromId === currentEventMember.id ||
      entry.toId === currentEventMember.id);
  return (
    <View style={styles.verificationBlock}>
      <DebtRow entry={entry} members={[]} sharedEventMembers={sharedMembers} />
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
  settings: EventSettlementSettings;
  onChange: (settings: EventSettlementSettings) => void;
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
        const typedKey = key as keyof EventSettlementSettings;
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
  eventMembers,
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
  addUnlinkedEventMember,
  sendInvite,
  claimMember,
  ignoreWarning,
  mergeMembers,
  approveClaim,
  rejectClaim,
}: {
  eventMembers: SharedEventMember[];
  warnings: {
    id: string;
    eventMemberIdA: string;
    eventMemberIdB: string;
    reason: string;
    confidence: string;
  }[];
  claims: {
    id: string;
    eventMemberId: string;
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
  inviteRole: Exclude<EventRole, "owner">;
  claimMessage: string;
  setNewMemberName: (value: string) => void;
  setNewMemberEmail: (value: string) => void;
  setNewMemberPhone: (value: string) => void;
  setInviteDisplayName: (value: string) => void;
  setInviteEmail: (value: string) => void;
  setInviteRole: (value: Exclude<EventRole, "owner">) => void;
  setClaimMessage: (value: string) => void;
  addUnlinkedEventMember: () => void;
  sendInvite: () => void;
  claimMember: (member: SharedEventMember) => void;
  ignoreWarning: (warningId: string) => void | Promise<unknown>;
  mergeMembers: (sourceId: string, targetId: string) => void | Promise<unknown>;
  approveClaim: (claimId: string) => void | Promise<unknown>;
  rejectClaim: (claimId: string) => void | Promise<unknown>;
}) {
  const activeMembers = eventMembers.filter(
    (member) => member.status !== "merged",
  );
  return (
    <>
      <Card>
        <SectionTitle
          title="Event members"
          subtitle="Linked users and shared placeholders are event-specific."
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
            subtitle="Shared placeholders are visible to all event participants."
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
            onPress={addUnlinkedEventMember}
          />
        </Card>
      ) : null}

      {canInvite ? (
        <Card>
          <SectionTitle
            title="Invite members"
            subtitle="Accepting an invite shares only event-specific records."
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
            const member = eventMembers.find(
              (item) => item.id === claim.eventMemberId,
            );
            return (
              <View key={claim.id} style={styles.warningRow}>
                <Text style={styles.body}>
                  {claim.claimantUserId} wants to claim{" "}
                  {member?.displayName ?? "an event member"}.
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
            const first = eventMembers.find(
              (member) => member.id === warning.eventMemberIdA,
            );
            const second = eventMembers.find(
              (member) => member.id === warning.eventMemberIdB,
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
  eventMemberIds,
  members,
  duplicateWarnings,
  toggleMember,
  ignoreWarning,
}: {
  eventId: string;
  eventMemberIds: string[];
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
          title="Private event members"
          subtitle="Private events use local/manual members only."
        />
        <View style={styles.memberWrap}>
          <View style={[styles.memberChip, styles.memberChipSelected]}>
            <Text style={styles.memberChipSelectedText}>You</Text>
          </View>
          {members
            .filter((member) => !member.archived)
            .map((member) => {
              const selected = eventMemberIds.includes(member.id);
              return (
                <Pressable
                  key={member.id}
                  onPress={() => toggleMember(member.id)}
                  style={[
                    styles.memberChip,
                    selected && styles.memberChipSelected,
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
): { type: EventVerificationResponse["targetType"]; id: string } | null {
  if (entry.kind === "event_direct_debt") {
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
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: -28,
    right: -14,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(221,214,254,0.24)",
  },
  eventTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.lg,
    flexWrap: "wrap",
  },
  heroLabel: {
    color: palette.muted,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  flexOne: {
    flex: 1,
    gap: spacing.sm,
  },
  heroAside: {
    alignItems: "center",
    gap: spacing.md,
  },
  label: {
    color: palette.brandDark,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyHeavy,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  heroArtWrap: {
    width: 142,
    height: 112,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.38)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderGlass,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeBox: {
    minWidth: 86,
    borderRadius: radii.lg,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderGlass,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },
  badgeNumber: {
    color: palette.brandDark,
    fontSize: typography.size.h1,
    fontFamily: typefaces.bodyHeavy,
  },
  badgeLabel: {
    color: palette.brandDark,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
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
