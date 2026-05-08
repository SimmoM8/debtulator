import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { DebtulatorOrbitIllustration } from "@/src/components/illustrations/DebtulatorOrbitIllustration";
import {
    Button,
    Card,
    LoadingState,
    PageHeader,
    Screen,
    SelectChips,
    TextField,
} from "@/src/components/ui/Primitives";
import { CURRENCIES } from "@/src/constants/currencies";
import { palette, spacing, typefaces } from "@/src/constants/design";
import { suggestTags } from "@/src/services/smartSuggestions";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";
import type {
    CurrencyCode,
    DebtDirection,
    DebtStatus,
    VerificationStatus,
} from "@/src/types/models";
import { todayIsoDate } from "@/src/utils/id";

export function DebtFormScreen() {
  const { id, memberId, eventId } = useLocalSearchParams<{
    id?: string;
    memberId?: string;
    eventId?: string;
  }>();
  const data = useAppData();
  const auth = useAuth();
  const debt = data.debts.find((item) => item.id === id);
  const selectedEvent = data.events.find(
    (event) => event.id === (debt?.eventId ?? eventId),
  );
  const isSharedEventDebt = !debt && selectedEvent?.visibility === "shared";
  const sharedEventMembers = data.sharedEventMembers.filter(
    (eventMember) =>
      eventMember.eventId === selectedEvent?.id &&
      eventMember.status !== "archived" &&
      eventMember.status !== "merged",
  );
  const currentEventMember = sharedEventMembers.find(
    (member) => member.linkedUserId === auth.identity.authenticatedUserId,
  );

  const [selectedMemberId, setSelectedMemberId] = useState(
    debt?.memberId ?? memberId ?? data.members[0]?.id ?? "",
  );
  const [debtorEventMemberId, setDebtorEventMemberId] = useState(
    currentEventMember?.id ?? sharedEventMembers[0]?.id ?? "",
  );
  const [creditorEventMemberId, setCreditorEventMemberId] = useState(
    sharedEventMembers.find((member) => member.id !== debtorEventMemberId)
      ?.id ?? "",
  );
  const [direction, setDirection] = useState<DebtDirection>(
    debt?.direction ?? "they_owe_me",
  );
  const [amount, setAmount] = useState(debt ? String(debt.amount) : "");
  const [currency, setCurrency] = useState<CurrencyCode>(
    debt?.currency ?? "SEK",
  );
  const [title, setTitle] = useState(debt?.title ?? "");
  const [notes, setNotes] = useState(debt?.notes ?? "");
  const [sharedNotes, setSharedNotes] = useState(debt?.sharedNotes ?? "");
  const [debtDate, setDebtDate] = useState(debt?.debtDate ?? todayIsoDate());
  const [dueDate, setDueDate] = useState(debt?.dueDate ?? "");
  const [tags, setTags] = useState(debt?.tags.join(", ") ?? "");
  const [selectedEventId, setSelectedEventId] = useState(
    debt?.eventId ?? eventId ?? "none",
  );
  const [status, setStatus] = useState<DebtStatus>(debt?.status ?? "active");
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>(debt?.verificationStatus ?? "local_only");
  const [visibility, setVisibility] = useState(debt?.visibility ?? "private");

  const memberOptions = useMemo(
    () =>
      data.members
        .filter((member) => !member.archived)
        .map((member) => ({ label: member.displayName, value: member.id })),
    [data.members],
  );
  const eventOptions = useMemo(
    () => [
      { label: "No event", value: "none" },
      ...data.events
        .filter((event) => !event.archived)
        .map((event) => ({ label: event.name, value: event.id })),
    ],
    [data.events],
  );
  const eventMemberOptions = useMemo(
    () =>
      sharedEventMembers.map((member) => ({
        label: member.displayName,
        value: member.id,
      })),
    [sharedEventMembers],
  );
  const tagSuggestions = useMemo(
    () =>
      suggestTags({
        title,
        notes,
        member: data.members.find((member) => member.id === selectedMemberId),
        event: selectedEvent,
        previousEntries: data.ledgerEntries,
        existingTags: splitTags(tags),
      }),
    [
      data.ledgerEntries,
      data.members,
      notes,
      selectedEvent,
      selectedMemberId,
      tags,
      title,
    ],
  );

  if (data.loading || auth.loading) {
    return <LoadingState />;
  }

  async function save() {
    if (isSharedEventDebt && selectedEvent) {
      await data.createEventDebt({
        eventId: selectedEvent.id,
        remoteEventId: selectedEvent.remoteId,
        creatorUserId: auth.identity.authenticatedUserId,
        debtorEventMemberId,
        creditorEventMemberId,
        amount: Number(amount),
        currency,
        title,
        notes,
        debtDate,
        tags: splitTags(tags),
        verificationStatus,
        status,
      });
      router.back();
      return;
    }

    const input = {
      memberId: selectedMemberId,
      direction,
      amount: Number(amount),
      currency,
      title,
      notes,
      sharedNotes,
      debtDate,
      dueDate,
      tags: splitTags(tags),
      eventId: selectedEventId === "none" ? null : selectedEventId,
      status,
      verificationStatus,
      visibility,
    };

    const financialFieldsChanged =
      debt &&
      debt.verificationStatus === "verified" &&
      (selectedMemberId !== debt.memberId ||
        direction !== debt.direction ||
        Number(amount) !== debt.amount ||
        currency !== debt.currency ||
        debtDate !== debt.debtDate ||
        (selectedEventId === "none" ? null : selectedEventId) !== debt.eventId);

    if (financialFieldsChanged) {
      Alert.alert(
        "Verification required again",
        "Changing financial details will require verification again.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Save", style: "destructive", onPress: () => persist(input) },
        ],
      );
      return;
    }

    await persist(input);
  }

  async function persist(input: Parameters<typeof data.createDebt>[0]) {
    if (debt) {
      await data.updateDebt(debt.id, input);
    } else {
      await data.createDebt(input);
    }

    router.back();
  }

  return (
    <Screen
      footer={
        <Button
          title={debt ? "Save debt" : "Create debt"}
          icon="checkmark"
          onPress={save}
          disabled={
            isSharedEventDebt
              ? !debtorEventMemberId ||
                !creditorEventMemberId ||
                debtorEventMemberId === creditorEventMemberId ||
                !title.trim() ||
                Number(amount) <= 0
              : !selectedMemberId || !title.trim() || Number(amount) <= 0
          }
        />
      }
    >
      <PageHeader
        eyebrow={isSharedEventDebt ? "Shared event debt" : "Simple debt"}
        title={debt ? "Edit debt" : "Add debt"}
        subtitle={
          isSharedEventDebt
            ? "Choose who owes whom, then review before saving."
            : "Choose who it is with, whether you owe or they owe you, then review before saving."
        }
      />

      <Card tone="lavender" style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.reviewEyebrow}>Draft</Text>
            <Text style={styles.heroTitle}>
              {debt
                ? "Refine the details, keep the context."
                : "Add a debt with enough context to settle it later."}
            </Text>
            <Text style={styles.heroBody}>
              Capture the amount, direction, visibility, and review state now so
              later verification and follow-up stay straightforward.
            </Text>
          </View>
          <View style={styles.heroArtWrap}>
            <DebtulatorOrbitIllustration width={132} height={104} compact />
          </View>
        </View>
      </Card>

      <Card tone="lavender">
        {isSharedEventDebt ? (
          <>
            <SelectChips
              label="Debtor"
              value={debtorEventMemberId}
              options={eventMemberOptions}
              onChange={setDebtorEventMemberId}
            />
            <SelectChips
              label="Creditor"
              value={creditorEventMemberId}
              options={eventMemberOptions}
              onChange={setCreditorEventMemberId}
            />
          </>
        ) : (
          <>
            <SelectChips
              label="Member"
              value={selectedMemberId}
              options={memberOptions}
              onChange={setSelectedMemberId}
            />
            <SelectChips
              label="Direction"
              value={direction}
              options={[
                { label: "They owe me", value: "they_owe_me" },
                { label: "I owe them", value: "i_owe_them" },
              ]}
              onChange={setDirection}
            />
          </>
        )}
        <TextField
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="Dinner deposit"
        />
        <TextField
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />
        <SelectChips
          label="Currency"
          value={currency}
          options={CURRENCIES.map((currencyCode) => ({
            label: currencyCode,
            value: currencyCode,
          }))}
          onChange={setCurrency}
        />
        <TextField
          label="Debt date"
          value={debtDate}
          onChangeText={setDebtDate}
          placeholder="YYYY-MM-DD"
        />
        <TextField
          label="Due date"
          value={dueDate}
          onChangeText={setDueDate}
          placeholder="Optional YYYY-MM-DD"
        />
        <TextField
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          multiline
        />
        <TextField
          label="Shared notes"
          value={sharedNotes}
          onChangeText={setSharedNotes}
          placeholder="Visible only after requesting verification"
          multiline
        />
        <TextField
          label="Tags"
          value={tags}
          onChangeText={setTags}
          placeholder="Food, Travel"
        />
        {tagSuggestions.length ? (
          <SelectChips
            label="Suggested tags"
            value="none"
            options={[
              { label: "Ignore", value: "none" },
              ...tagSuggestions.map((tag) => ({ label: tag, value: tag })),
            ]}
            onChange={(value) => {
              if (value !== "none") {
                setTags((current) => mergeTagText(current, value));
              }
            }}
          />
        ) : null}
        {!isSharedEventDebt ? (
          <SelectChips
            label="Event"
            value={selectedEventId}
            options={eventOptions}
            onChange={setSelectedEventId}
          />
        ) : null}
        <SelectChips
          label="Status"
          value={status}
          options={[
            { label: "Active", value: "active" },
            { label: "Settled", value: "settled" },
            { label: "Archived", value: "archived" },
          ]}
          onChange={setStatus}
        />
        <SelectChips
          label="Review state"
          value={verificationStatus}
          options={[
            { label: "Local only", value: "local_only" },
            { label: "Pending", value: "pending" },
            { label: "Verified", value: "verified" },
            { label: "Rejected", value: "rejected" },
            { label: "Disputed", value: "disputed" },
            { label: "Resolved", value: "resolved" },
            { label: "Cancelled", value: "cancelled" },
          ]}
          onChange={setVerificationStatus}
        />
        {!isSharedEventDebt ? (
          <SelectChips
            label="Visibility"
            value={visibility}
            options={[
              { label: "Private", value: "private" },
              {
                label: "Shared with member",
                value: "shared_with_involved_member",
              },
              { label: "Event shared later", value: "future_event_shared" },
            ]}
            onChange={setVisibility}
          />
        ) : null}
      </Card>

      <Card tone="peach">
        <Text style={styles.reviewEyebrow}>Review</Text>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>What</Text>
          <Text style={styles.reviewValue}>
            {title.trim() || "Untitled debt"}
          </Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Amount</Text>
          <Text style={styles.reviewValue}>
            {Number(amount) > 0 ? `${amount} ${currency}` : "Enter an amount"}
          </Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Direction</Text>
          <Text style={styles.reviewValue}>
            {isSharedEventDebt
              ? `${eventMemberOptions.find((option) => option.value === debtorEventMemberId)?.label ?? "Someone"} owes ${eventMemberOptions.find((option) => option.value === creditorEventMemberId)?.label ?? "someone"}`
              : direction === "they_owe_me"
                ? `${memberOptions.find((option) => option.value === selectedMemberId)?.label ?? "They"} owe you`
                : `You owe ${memberOptions.find((option) => option.value === selectedMemberId)?.label ?? "them"}`}
          </Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Due</Text>
          <Text style={styles.reviewValue}>{dueDate || "No due date"}</Text>
        </View>
      </Card>
    </Screen>
  );
}

function splitTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function mergeTagText(current: string, tag: string) {
  return Array.from(new Set([...splitTags(current), tag])).join(", ");
}

const styles = StyleSheet.create({
  heroCard: {
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: -24,
    right: -10,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(221,214,254,0.24)",
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.lg,
    flexWrap: "wrap",
  },
  heroCopy: {
    flex: 1,
    minWidth: 220,
    gap: spacing.sm,
  },
  heroTitle: {
    color: palette.ink,
    fontSize: 24,
    lineHeight: 32,
    fontFamily: typefaces.displayMedium,
  },
  heroBody: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: typefaces.body,
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
  reviewEyebrow: {
    color: palette.brand,
    fontSize: 12,
    fontFamily: typefaces.bodyStrong,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(55,48,163,0.14)",
  },
  reviewLabel: {
    color: palette.muted,
    fontSize: 13,
    fontFamily: typefaces.bodyStrong,
  },
  reviewValue: {
    color: palette.ink,
    flex: 1,
    fontSize: 14,
    fontFamily: typefaces.bodyHeavy,
    textAlign: "right",
  },
});
