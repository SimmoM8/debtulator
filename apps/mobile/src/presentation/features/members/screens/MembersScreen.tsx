import { Ionicons } from '@expo/vector-icons';
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import {
    CollectionPageControls,
    CollectionPageHeader,
} from "@/src/presentation/design-system/CollectionPageControls";
import {
    GlassCard,
    ListRow,
    SingleSelectFilterList,
    StatCard,
} from "@/src/presentation/design-system/Finance";
import { MobileMenuModal } from "@/src/presentation/design-system/MenuList";
import {
    Button,
    EmptyState,
    FilterSheet,
    LoadingState,
    Screen,
} from "@/src/presentation/design-system/Primitives";
import {
    palette,
    shadows,
    typefaces,
    typography,
} from "@/src/presentation/theme/design";
import {
    type MemberFilter,
    type MemberSort,
    useMembersScreenModel,
} from "@/src/presentation/features/members/useMembersScreenModel";
import { estimateMoneyMap } from "@debtulator/domain/finance/currencyConversion";
import type { AppSettings, CurrencyRate, Member } from "@debtulator/domain/models";
import { formatMoney } from "@debtulator/domain/finance/money";
import { routes } from '@/src/presentation/navigation/routes';

const MINIMUM_BALANCE_THRESHOLD = 0.005;

export function MembersScreen() {
  const {
    data,
    filter,
    filterOpen,
    members,
    optionsOpen,
    owingYouCount,
    query,
    setFilter,
    setFilterOpen,
    setOptionsOpen,
    setQuery,
    setSort,
    setSortDirection,
    sort,
    sortDirection,
    youOweCount,
  } = useMembersScreenModel();

  if (data.loading) {
    return <LoadingState />;
  }

  return (
    <Screen
      headerBackground="primary"
      header={
        <CollectionPageHeader
          title="Members"
          addLabel="Add member"
          onAdd={() => router.push(routes.memberForm())}
          optionsLabel="Member options"
          onOpenOptions={() => setOptionsOpen(true)}
          query={query}
          onChangeQuery={setQuery}
          searchPlaceholder="Filter members"
        />
      }
    >
      <CollectionPageControls
        filterValue={filter}
        filterOptions={FILTERS}
        onChangeFilter={(value) => setFilter(value as MemberFilter)}
        sortValue={sort}
        sortOptions={SORT_OPTIONS}
        onChangeSort={(value) => setSort(value as MemberSort)}
        sortDirection={sortDirection}
        onToggleSortDirection={() =>
          setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
        }
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
                  current === "you-owe" ? "all" : "you-owe",
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
                  current === "owed-to-you" ? "all" : "owed-to-you",
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
          <Button
            title="Invite"
            icon="link"
            variant="secondary"
            size="compact"
            onPress={() => router.push(routes.memberForm())}
            accessibilityHint="Opens the member invite form"
          />
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
        router.push(routes.memberDetail(member.id))
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

const SORT_OPTIONS: { label: string; value: MemberSort }[] = [
  { label: "Name", value: "name" },
  { label: "Balance", value: "balance" },
  { label: "Updated", value: "updated" },
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
});
