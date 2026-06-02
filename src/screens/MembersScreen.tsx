import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import {
    GlassCard,
    ListRow,
    SearchFilterBar,
    SingleSelectFilterList,
    StatCard,
} from "@/src/components/ui/Finance";
import { MobileMenuModal } from "@/src/components/ui/MenuList";
import {
    Button,
    EmptyState,
    FilterSheet,
    IconButton,
    LoadingState,
    PageHeader,
    Screen,
} from "@/src/components/ui/Primitives";
import {
    palette,
    shadows,
    typefaces,
    typography,
} from "@/src/constants/design";
import { estimateMoneyMap } from "@/src/services/currency";
import { useAppData } from "@/src/state/AppDataProvider";
import type { AppSettings, CurrencyRate, Member } from "@/src/types/models";
import { formatMoney } from "@/src/utils/money";

type MemberFilter = "all" | "linked" | "shared" | "owed-to-you" | "you-owe";
const MINIMUM_BALANCE_THRESHOLD = 0.005;

export function MembersScreen() {
  const data = useAppData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MemberFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [statsWidth, setStatsWidth] = useState(0);
  const quickFilterTranslate = useRef(new Animated.Value(0)).current;
  const quickFilterOpacity = useRef(new Animated.Value(0)).current;
  const quickFilterIndex =
    filter === "you-owe" ? 0 : filter === "owed-to-you" ? 1 : null;
  const quickFilterGlassTone =
    filter === "you-owe"
      ? {
          borderColor: "rgba(255,107,107,0.52)",
        }
      : {
          borderColor: "rgba(30,150,130,0.38)",
        };

  useEffect(() => {
    const segmentWidth = statsWidth / 2;
    Animated.parallel([
      Animated.timing(quickFilterTranslate, {
        toValue: quickFilterIndex === null ? 0 : quickFilterIndex * segmentWidth,
        duration: 210,
        useNativeDriver: true,
      }),
      Animated.timing(quickFilterOpacity, {
        toValue: quickFilterIndex === null || !statsWidth ? 0 : 1,
        duration: quickFilterIndex === null ? 130 : 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [quickFilterIndex, quickFilterOpacity, quickFilterTranslate, statsWidth]);

  const activeMatchedMembers = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return data.members.filter((member) => {
      if (member.archived) {
        return false;
      }

      const matchesQuery =
        !normalized ||
        member.displayName.toLowerCase().includes(normalized) ||
        (member.email ?? "").toLowerCase().includes(normalized) ||
        (member.phone ?? "").toLowerCase().includes(normalized);

      return matchesQuery;
    });
  }, [data.members, query]);

  const members = useMemo(() => {
    return activeMatchedMembers.filter((member) => {
      const balance = data.memberBalances[member.id] ?? {};
      const values = Object.values(balance);
      const hasPositive = values.some(
        (value) => (value ?? 0) > MINIMUM_BALANCE_THRESHOLD,
      );
      const hasNegative = values.some(
        (value) => (value ?? 0) < -MINIMUM_BALANCE_THRESHOLD,
      );
      const hasSharedActivity =
        data.debts.some(
          (debt) => debt.memberId === member.id && debt.eventId,
        ) ||
        data.events.some(
          (event) =>
            !event.archived &&
            event.name.toLowerCase().includes(member.displayName.toLowerCase()),
        );

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
  }, [activeMatchedMembers, data.debts, data.events, data.memberBalances, filter]);

  const youOweCount = activeMatchedMembers.filter((member) =>
    Object.values(data.memberBalances[member.id] ?? {}).some(
      (value) => (value ?? 0) < -MINIMUM_BALANCE_THRESHOLD,
    ),
  ).length;
  const owingYouCount = activeMatchedMembers.filter((member) =>
    Object.values(data.memberBalances[member.id] ?? {}).some(
      (value) => (value ?? 0) > MINIMUM_BALANCE_THRESHOLD,
    ),
  ).length;

  if (data.loading) {
    return <LoadingState />;
  }

  return (
    <Screen>
      <PageHeader
        title="Members"
        showBackButton={false}
        action={
          <IconButton
            icon="ellipsis-horizontal"
            label="Member options"
            onPress={() => setOptionsOpen(true)}
          />
        }
      />

      <Button
        title="Add member"
        icon="add"
        onPress={() => router.push("/member/form")}
      />

      <SearchFilterBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search members"
        onPressFilter={() => setFilterOpen(true)}
        filterActive={filter !== "all"}
        filterLabel="Open member filters"
      />

      <GlassCard tone="lavender" allowOverflow>
        <View
          style={styles.statsRow}
          onLayout={(event) => setStatsWidth(event.nativeEvent.layout.width)}
        >
          {statsWidth ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.quickFilterGlass,
                quickFilterGlassTone,
                {
                  width: statsWidth / 2 - 8,
                  opacity: quickFilterOpacity,
                  transform: [{ translateX: quickFilterTranslate }],
                },
              ]}
            />
          ) : null}
          <StatCard
            label="You owe"
            value={String(youOweCount)}
            subtitle="People you still owe"
            tone="coral"
            compact
            compactDensity="tight"
            withDivider
            selected={filter === "you-owe"}
            onPress={() =>
              setFilter((current) => (current === "you-owe" ? "all" : "you-owe"))
            }
            accessibilityHint="Shows members you currently owe"
          />
          <StatCard
            label="Owes you"
            value={String(owingYouCount)}
            subtitle="People who should pay you"
            tone="teal"
            compact
            compactDensity="tight"
            selected={filter === "owed-to-you"}
            onPress={() =>
              setFilter((current) =>
                current === "owed-to-you" ? "all" : "owed-to-you",
              )
            }
            accessibilityHint="Shows members who currently owe you"
          />
        </View>
      </GlassCard>

      <FilterSheet
        visible={filterOpen}
        title="Member filters"
        subtitle="Choose which people and balance states you want to focus on."
        onClose={() => setFilterOpen(false)}
      >
        <SingleSelectFilterList
          value={filter}
          options={FILTERS}
          onChange={(value) => {
            setFilter(value as MemberFilter);
            setFilterOpen(false);
          }}
        />
      </FilterSheet>

      <MobileMenuModal
        visible={optionsOpen}
        title="Member options"
        onClose={() => setOptionsOpen(false)}
        sections={[
          {
            items: [
              {
                label: "Open filters",
                subtitle: "Change which members are shown",
                icon: "options-outline",
                onPress: () => {
                  setOptionsOpen(false);
                  setFilterOpen(true);
                },
              },
            ],
          },
        ]}
      />

      <GlassCard tone="lavender">
        {members.length ? (
          <View style={styles.listColumn}>
            {members.map((member, index) => (
              <MemberRow
                key={member.id}
                member={member}
                balance={data.memberBalances[member.id] ?? {}}
                settings={data.settings}
                currencyRates={data.currencyRates}
                showDivider={index < members.length - 1}
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

      <View style={styles.inviteCard}>
        <View style={styles.inviteRow}>
          <Ionicons name="person-add" size={18} color={palette.primary} />
          <View style={styles.inviteCopy}>
            <Text style={styles.inviteTitle}>Invite friends</Text>
            <Text style={styles.inviteBody}>
              Share your invite link or send an invite.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Invite"
            accessibilityHint="Opens the member invite form"
            onPress={() => router.push("/member/form")}
            style={({ pressed }) => [
              styles.inviteButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.inviteButtonText}>Invite</Text>
            <Ionicons name="link" size={14} color={palette.primary} />
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

function MemberRow({
  member,
  balance,
  settings,
  currencyRates,
  showDivider,
}: {
  member: Member;
  balance: Record<string, number>;
  settings: AppSettings;
  currencyRates: CurrencyRate[];
  showDivider?: boolean;
}) {
  const estimated = estimateMoneyMap(balance, settings, currencyRates);
  const status =
    Math.abs(estimated) <= MINIMUM_BALANCE_THRESHOLD
      ? { label: "Settled", tone: "muted" as const }
      : estimated > 0
        ? { label: "Owes you", tone: "teal" as const }
        : { label: "You owe", tone: "coral" as const };

  const subtitle =
    member.linkStatus === "linked" ? "Linked" : dataLabelForMember(member);

  return (
    <ListRow
      title={member.displayName}
      subtitle={subtitle}
      amount={formatMoney(Math.abs(estimated), settings.baseCurrency)}
      trailingLabel={status.label}
      trailingTone={status.tone}
      icon="person-outline"
      iconTone={member.linkStatus === "linked" ? "peach" : "indigo"}
      showDivider={showDivider}
      onPress={() =>
        router.push({ pathname: "/member/[id]", params: { id: member.id } })
      }
    />
  );
}

function dataLabelForMember(member: Member) {
  if (member.phone) {
    return member.phone;
  }
  if (member.email) {
    return member.email;
  }
  return "Private";
}

const FILTERS: { label: string; value: MemberFilter; description: string }[] = [
  {
    label: "All",
    value: "all",
    description: "Everyone in your member list, no matter their status.",
  },
  {
    label: "Linked",
    value: "linked",
    description: "People already connected to a shared identity.",
  },
  {
    label: "Shared",
    value: "shared",
    description: "People involved in shared activity or group history.",
  },
  {
    label: "Owes you",
    value: "owed-to-you",
    description: "People who currently owe you money.",
  },
  {
    label: "You owe",
    value: "you-owe",
    description: "People you currently owe money to.",
  },
];

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 0,
    position: "relative",
  },
  quickFilterGlass: {
    position: "absolute",
    top: -5,
    bottom: -5,
    left: 4,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.18)",
    ...shadows.soft,
  },
  listColumn: {
    gap: 0,
  },
  inviteCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderGlass,
    backgroundColor: palette.surfaceGlassElevated,
    paddingHorizontal: 18,
    paddingVertical: 18,
    ...shadows.card,
  },
  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  inviteCopy: {
    flex: 1,
    gap: 2,
  },
  inviteTitle: {
    color: palette.textPrimary,
    fontSize: typography.size.base,
    fontFamily: typefaces.bodyStrong,
  },
  inviteBody: {
    color: palette.muted,
    fontSize: typography.size.xs,
    lineHeight: typography.line.sm,
    fontFamily: typefaces.body,
  },
  inviteButton: {
    minHeight: 36,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    backgroundColor: "rgba(255,255,255,0.98)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inviteButtonText: {
    color: palette.primary,
    fontSize: typography.size.xs,
    lineHeight: typography.line.sm,
    fontFamily: typefaces.bodyStrong,
  },
  pressed: {
    opacity: 0.78,
  },
});
