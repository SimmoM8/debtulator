import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { DebtulatorOrbitIllustration } from "@/src/components/illustrations/DebtulatorOrbitIllustration";
import {
    Button,
    Card,
    EmptyState,
    LoadingState,
    MultiSelectChips,
    PageHeader,
    Screen,
    SelectChips,
    TextField,
} from "@/src/components/ui/Primitives";
import { CURRENCIES } from "@/src/constants/currencies";
import { palette, spacing, typefaces,
typography,
} from "@/src/constants/design";
import { createRemoteSharedEvent } from "@/src/services/stage3Sync";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";
import type {
    CurrencyCode,
    EventStatus,
    EventVisibility,
    SyncStatus,
} from "@/src/types/models";

export function EventFormScreen() {
  const { id, visibility: visibilityParam } = useLocalSearchParams<{
    id?: string;
    visibility?: EventVisibility;
  }>();
  const data = useAppData();
  const auth = useAuth();
  const event = data.events.find((item) => item.id === id);
  const currentMemberIds = data.eventMembers
    .filter((eventMember) => eventMember.eventId === event?.id)
    .map((eventMember) => eventMember.memberId);

  const [name, setName] = useState(event?.name ?? "");
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [defaultCurrency, setDefaultCurrency] = useState<CurrencyCode>(
    event?.defaultCurrency ?? data.settings.baseCurrency,
  );
  const [tags, setTags] = useState(event?.tags.join(", ") ?? "");
  const [status, setStatus] = useState<EventStatus>(event?.status ?? "active");
  const [visibility, setVisibility] = useState<EventVisibility>(
    event?.visibility ?? visibilityParam ?? "private",
  );
  const [memberIds, setMemberIds] = useState<string[]>(currentMemberIds);
  const [error, setError] = useState<string | null>(null);

  const memberOptions = useMemo(
    () =>
      data.members
        .filter((member) => !member.archived)
        .map((member) => ({ label: member.displayName, value: member.id })),
    [data.members],
  );

  if (data.loading || auth.loading) {
    return <LoadingState />;
  }

  async function save() {
    setError(null);
    if (visibility === "shared" && !auth.identity.authenticatedUserId) {
      setError("Sign in before creating a shared event.");
      return;
    }

    let remote: Awaited<ReturnType<typeof createRemoteSharedEvent>> = null;
    if (
      !event &&
      visibility === "shared" &&
      auth.identity.authenticatedUserId
    ) {
      try {
        remote = await createRemoteSharedEvent({
          ownerUserId: auth.identity.authenticatedUserId,
          name,
          notes,
          defaultCurrency,
          allowedCurrencies: [defaultCurrency],
          tags: splitTags(tags),
          ownerDisplayName: auth.identity.displayName,
          ownerEmail: auth.identity.email,
        });
      } catch (remoteError) {
        remote = null;
        setError(
          remoteError instanceof Error
            ? remoteError.message
            : "Shared event will be queued for sync.",
        );
      }
    }

    const syncStatus: SyncStatus =
      visibility === "shared"
        ? remote
          ? "synced"
          : "pending_upload"
        : "local_only";
    const input = {
      name,
      notes,
      defaultCurrency,
      allowedCurrencies: [defaultCurrency],
      tags: splitTags(tags),
      status,
      visibility,
      ownerUserId:
        visibility === "shared" ? auth.identity.authenticatedUserId : null,
      ownerDisplayName: auth.identity.displayName,
      ownerEmail: auth.identity.email,
      remoteId: remote?.remoteEventId ?? event?.remoteId ?? null,
      ownerRemoteEventMemberId: remote?.remoteOwnerEventMemberId ?? null,
      syncStatus,
      memberIds: visibility === "private" ? memberIds : [],
    };

    if (event) {
      await data.updateEvent(event.id, input);
    } else {
      await data.createEvent(input);
    }

    router.back();
  }

  return (
    <Screen
      footer={
        <Button
          title={event ? "Save event" : "Create event"}
          icon="checkmark"
          onPress={save}
          disabled={
            !name.trim() ||
            (visibility === "shared" && !auth.identity.authenticatedUserId)
          }
        />
      }
    >
      <PageHeader
        eyebrow="Event"
        title={event ? "Edit event" : "Add event"}
        subtitle="Create a calm place for shared expenses, people, notes, and settlement history."
      />

      {error ? (
        <Card tone="amber">
          <EmptyState title="Shared sync notice" body={error} />
        </Card>
      ) : null}

      <Card tone="lavender" style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroLabel}>Event setup</Text>
            <Text style={styles.heroTitle}>
              Create the container first, then layer expenses, members, roles,
              and settlement history onto it.
            </Text>
            <Text style={styles.body}>
              Private events can start locally, while shared events only expand
              after sync and invitations are explicitly configured.
            </Text>
          </View>
          <View style={styles.heroArtWrap}>
            <DebtulatorOrbitIllustration width={132} height={104} compact />
          </View>
        </View>
      </Card>

      <Card tone="peach">
        <TextField
          label="Event name"
          value={name}
          onChangeText={setName}
          placeholder="Ski Trip Sweden"
        />
        <TextField
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          multiline
        />
        <SelectChips
          label="Visibility"
          value={visibility}
          options={[
            { label: "Private event", value: "private" },
            { label: "Shared event", value: "shared" },
          ]}
          onChange={setVisibility}
        />
        <SelectChips
          label="Default currency"
          value={defaultCurrency}
          options={CURRENCIES.map((currency) => ({
            label: currency,
            value: currency,
          }))}
          onChange={setDefaultCurrency}
        />
        <TextField
          label="Tags"
          value={tags}
          onChangeText={setTags}
          placeholder="Travel, Food"
        />
        <SelectChips
          label="Status"
          value={status}
          options={[
            { label: "Planning", value: "planning" },
            { label: "Active", value: "active" },
            { label: "Finalising", value: "finalising" },
            { label: "Settled", value: "settled" },
            { label: "Archived", value: "archived" },
          ]}
          onChange={setStatus}
        />
        {visibility === "private" ? (
          <MultiSelectChips
            label="Members"
            values={memberIds}
            options={memberOptions}
            onChange={setMemberIds}
          />
        ) : (
          <EmptyState
            title={auth.user ? "Owner will be added" : "Sign in required"}
            body={
              auth.user
                ? "Shared event members, invites, placeholders, and roles are managed after creation."
                : "Shared events require an account so participants can sync the same event ledger."
            }
          />
        )}
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
  heroLabel: {
    color: palette.muted,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  heroTitle: {
    color: palette.ink,
    fontSize: typography.size.h1,
    lineHeight: typography.line.displayMd,
    fontFamily: typefaces.displayMedium,
  },
  body: {
    color: palette.muted,
    fontSize: typography.size.base,
    lineHeight: typography.line.xl,
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
});
