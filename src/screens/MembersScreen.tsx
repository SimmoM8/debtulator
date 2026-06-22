import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
    GlassCard,
    ListRow,
    SingleSelectFilterList,
    StatCard,
} from "@/src/components/ui/Finance";
import { CollectionPageControls } from "@/src/components/ui/CollectionPageControls";
import { MobileMenuModal } from "@/src/components/ui/MenuList";
import {
    EmptyState,
    FilterSheet,
    LoadingState,
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
          (debt) => debt.memberId === member.id && debt.groupId,
        ) ||
        data.groups.some(
          (group) =>
            !group.archived &&
            group.name.toLowerCase().includes(member.displayName.toLowerCase()),
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
  }, [activeMatchedMembers, data.debts, data.groups, data.memberBalances, filter]);

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
      <CollectionPageControls
        title="Members"
        addLabel="Add member"
        onAdd={() => router.push("/member/form")}
        optionsLabel="Member options"
        onOpenOptions={() => setOptionsOpen(true)}
        query={query}
        onChangeQuery={setQuery}
        searchPlaceholder="Search members"
        onOpenFilters={() => setFilterOpen(true)}
        filterActive={filter !== "all"}
        filterLabel="Open member filters"
        summary={
          <View style={styles.statsRow}>
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
                setFilter((current) =>
                  current === "you-owe" ? "all" : "you-owe"
                )
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
                  current === "owed-to-you" ? "all" : "owed-to-you"
                )
              }
              accessibilityHint="Shows members who currently owe you"
            />
          </View>
        }
      />

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
