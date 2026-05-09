import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
    GlassCard,
    SearchBar,
    StatCard,
    StatusPill,
} from "@/src/components/ui/Finance";
import {
    Button,
    EmptyState,
    IconButton,
    LoadingState,
    PageHeader,
    Screen,
    SectionTitle,
} from "@/src/components/ui/Primitives";
import { palette, spacing, typefaces } from "@/src/constants/design";
import { useAppData } from "@/src/state/AppDataProvider";
import type { Member } from "@/src/types/models";
import { formatMoney } from "@/src/utils/money";

type MemberFilter = "all" | "linked" | "shared" | "owed-to-you" | "you-owe";

export function MembersScreen() {
  const data = useAppData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MemberFilter>("all");

  const members = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return data.members.filter((member) => {
      if (member.archived) {
        return false;
      }

      const balance = data.memberBalances[member.id] ?? {};
      const values = Object.values(balance);
      const hasPositive = values.some((value) => (value ?? 0) > 0.005);
      const hasNegative = values.some((value) => (value ?? 0) < -0.005);
      const hasSharedActivity =
        data.debts.some(
          (debt) => debt.memberId === member.id && debt.eventId,
        ) ||
        data.events.some(
          (event) =>
            !event.archived &&
            event.name.toLowerCase().includes(member.displayName.toLowerCase()),
        );
      const matchesQuery =
        !normalized ||
        member.displayName.toLowerCase().includes(normalized) ||
        (member.email ?? "").toLowerCase().includes(normalized) ||
        (member.phone ?? "").toLowerCase().includes(normalized);

      if (!matchesQuery) {
        return false;
      }

      switch (filter) {
        case "linked":
          return member.linkStatus === "linked";
        case "shared":
          return hasSharedActivity;
        case "owed-to-you":
          return hasPositive;
        case "you-owe":
          return hasNegative;
        default:
          return true;
      }
    });
  }, [
    data.debts,
    data.events,
    data.memberBalances,
    data.members,
    filter,
    query,
  ]);

  const linkedCount = data.members.filter(
    (member) => member.linkStatus === "linked" && !member.archived,
  ).length;
  const owingYouCount = members.filter((member) =>
    Object.values(data.memberBalances[member.id] ?? {}).some(
      (value) => (value ?? 0) > 0.005,
    ),
  ).length;
  const youOweCount = members.filter((member) =>
    Object.values(data.memberBalances[member.id] ?? {}).some(
      (value) => (value ?? 0) < -0.005,
    ),
  ).length;

  if (data.loading) {
    return <LoadingState />;
  }

  return (
    <Screen>
      <PageHeader
        title="Members"
        subtitle="People, balances, and who’s already linked."
        showBackButton={false}
        action={
          <IconButton
            icon="add"
            label="Add member"
            onPress={() => router.push("/member/form")}
          />
        }
      />

      <GlassCard tone="lavender">
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search members"
        />
        <View style={styles.chipRow}>
          {FILTERS.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => setFilter(item.value)}
              style={[styles.chip, filter === item.value && styles.chipActive]}
            >
              <Text
                style={[
                  styles.chipText,
                  filter === item.value && styles.chipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.statsRow}>
          <StatCard
            label="Linked"
            value={String(linkedCount)}
            subtitle="Ready for shared sync"
            tone="indigo"
          />
          <StatCard
            label="Owes you"
            value={String(owingYouCount)}
            subtitle="People who should pay you"
            tone="teal"
          />
          <StatCard
            label="You owe"
            value={String(youOweCount)}
            subtitle="People you still owe"
            tone="coral"
          />
        </View>
      </GlassCard>

      <SectionTitle
        title="People and balances"
        subtitle="Calm summaries instead of noisy contact records."
      />
      <GlassCard tone="lavender">
        {members.length ? (
          <View style={styles.listColumn}>
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                balance={data.memberBalances[member.id] ?? {}}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            title="No members found"
            body="Try a different filter or invite someone new."
          />
        )}
      </GlassCard>

      <SectionTitle
        title="Invite friends"
        subtitle="Shared expenses work best when everyone is easy to find."
      />
      <GlassCard tone="peach">
        <Text style={styles.inviteTitle}>Bring someone into your circle</Text>
        <Text style={styles.inviteBody}>
          Add a person once, then use them across debts, events, and payments
          without repeating details.
        </Text>
        <Button
          title="Invite member"
          onPress={() => router.push("/member/form")}
        />
      </GlassCard>
    </Screen>
  );
}

function MemberRow({
  member,
  balance,
}: {
  member: Member;
  balance: Record<string, number>;
}) {
  const entries = Object.entries(balance).filter(
    ([, value]) => Math.abs(value ?? 0) > 0.005,
  );
  const primary = entries[0];
  const status = !primary
    ? { label: "Settled", tone: "lavender" as const }
    : primary[1] > 0
      ? { label: "Owes you", tone: "teal" as const }
      : { label: "You owe", tone: "coral" as const };

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: "/member/[id]", params: { id: member.id } })
      }
      style={({ pressed }) => [styles.memberRow, pressed && styles.pressed]}
    >
      <View style={styles.memberIdentity}>
        <View style={styles.memberAvatar}>
          <Text style={styles.memberAvatarText}>
            {member.displayName.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={styles.memberCopy}>
          <Text style={styles.memberName}>{member.displayName}</Text>
          <Text style={styles.memberMeta}>
            {member.email || member.phone || "No contact details yet"}
          </Text>
          <View style={styles.memberBadges}>
            {member.linkStatus === "linked" ? (
              <StatusPill label="Linked" tone="indigo" />
            ) : null}
            {member.linkStatus !== "linked" ? (
              <StatusPill label="Private" tone="lavender" />
            ) : null}
          </View>
        </View>
      </View>
      <View style={styles.memberBalance}>
        <StatusPill label={status.label} tone={status.tone} />
        <Text style={styles.memberAmount}>
          {primary
            ? formatMoney(Math.abs(primary[1] ?? 0), primary[0] as never)
            : "$0"}
        </Text>
      </View>
    </Pressable>
  );
}

const FILTERS: { label: string; value: MemberFilter }[] = [
  { label: "All", value: "all" },
  { label: "Linked", value: "linked" },
  { label: "Shared", value: "shared" },
  { label: "Owes you", value: "owed-to-you" },
  { label: "You owe", value: "you-owe" },
];

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: palette.surfaceGlassStrong,
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  chipText: {
    color: palette.muted,
    fontSize: 13,
    fontFamily: typefaces.bodyStrong,
  },
  chipTextActive: {
    color: palette.surface,
  },
  statsRow: {
    gap: spacing.sm,
  },
  listColumn: {
    gap: spacing.sm,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    minHeight: 72,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: palette.surfaceGlassElevated,
  },
  memberIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  memberAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(253,186,155,0.22)",
  },
  memberAvatarText: {
    color: palette.primaryDeep,
    fontSize: 15,
    fontFamily: typefaces.bodyHeavy,
  },
  memberCopy: {
    flex: 1,
    gap: 3,
  },
  memberName: {
    color: palette.textPrimary,
    fontSize: 15,
    fontFamily: typefaces.bodyStrong,
  },
  memberMeta: {
    color: palette.muted,
    fontSize: 12,
    fontFamily: typefaces.body,
  },
  memberBadges: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  memberBalance: {
    alignItems: "flex-end",
    gap: 8,
  },
  memberAmount: {
    color: palette.textPrimary,
    fontSize: 15,
    fontFamily: typefaces.bodyHeavy,
  },
  inviteTitle: {
    color: palette.textPrimary,
    fontSize: 20,
    fontFamily: typefaces.displayMedium,
  },
  inviteBody: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typefaces.body,
  },
  pressed: {
    opacity: 0.78,
  },
});
