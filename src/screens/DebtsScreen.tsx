import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { DebtRow } from "@/src/components/EntityRows";
import {
    Button,
    Card,
    EmptyState,
    FilterSheet,
    FloatingActionButton,
    IconButton,
    LoadingState,
    PageHeader,
    Screen,
    SearchField,
    SectionTitle,
    SelectChips,
    TextField,
} from "@/src/components/ui/Primitives";
import { CURRENCIES } from "@/src/constants/currencies";
import { palette, spacing, typefaces } from "@/src/constants/design";
import { filterDebtEntries } from "@/src/services/filters";
import { useAppData } from "@/src/state/AppDataProvider";
import type { DebtFilters } from "@/src/types/models";

const defaultFilters: DebtFilters = {
  query: "",
  memberId: null,
  eventId: null,
  minAmount: "",
  maxAmount: "",
  currency: "all",
  direction: "all",
  status: "all",
  verificationStatus: "all",
  linkMode: "all",
  visibility: "all",
  tag: null,
  kind: "all",
  paymentStatus: "all",
  dueMode: "all",
  reminderMode: "all",
  recurringMode: "all",
  settlementRecordMode: "all",
  attachmentMode: "all",
  commentMode: "all",
  suggestionMode: "all",
  sort: "date_desc",
};

export function DebtsScreen() {
  const data = useAppData();
  const [filters, setFilters] = useState<DebtFilters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const entries = useMemo(
    () =>
      filterDebtEntries(
        data.ledgerEntries,
        data.members,
        data.events,
        filters,
        data.sharedEventMembers,
        {
          attachments: data.attachments,
          comments: data.comments,
          smartSuggestions: data.smartSuggestions,
        },
      ),
    [
      data.attachments,
      data.comments,
      data.events,
      data.ledgerEntries,
      data.members,
      data.sharedEventMembers,
      data.smartSuggestions,
      filters,
    ],
  );

  const memberOptions = useMemo(
    () => [
      { label: "All members", value: "all" },
      ...data.members
        .filter((member) => !member.archived)
        .map((member) => ({ label: member.displayName, value: member.id })),
    ],
    [data.members],
  );

  const eventOptions = useMemo(
    () => [
      { label: "All events", value: "all" },
      ...data.events
        .filter((event) => !event.archived)
        .map((event) => ({ label: event.name, value: event.id })),
    ],
    [data.events],
  );

  const tagOptions = useMemo(
    () => [
      { label: "All tags", value: "all" },
      ...data.tags.map((tag) => ({ label: tag.name, value: tag.name })),
    ],
    [data.tags],
  );

  if (data.loading) {
    return <LoadingState />;
  }

  const today = new Date().toISOString().slice(0, 10);
  const openCount = data.ledgerEntries.filter(
    (entry) => entry.remainingAmount > 0.005 && entry.status !== "archived",
  ).length;
  const dueSoonCount = data.ledgerEntries.filter(
    (entry) =>
      entry.dueDate && entry.dueDate >= today && entry.remainingAmount > 0.005,
  ).length;
  const sharedCount = data.ledgerEntries.filter(
    (entry) =>
      entry.visibility === "shared_event" ||
      entry.visibility === "shared_with_involved_member",
  ).length;
  const activeFilterCount = countActiveDebtFilters(filters);

  function applyQuickFilter(mode: "all" | "owe" | "owed" | "shared" | "due") {
    const query = filters.query;
    if (mode === "all") {
      setFilters({ ...defaultFilters, query });
      return;
    }
    setFilters({
      ...defaultFilters,
      query,
      direction:
        mode === "owe" ? "i_owe_them" : mode === "owed" ? "they_owe_me" : "all",
      visibility: mode === "shared" ? "shared_event" : "all",
      dueMode: mode === "due" ? "due_soon" : "all",
    });
  }

  const quickMode =
    filters.direction === "i_owe_them"
      ? "owe"
      : filters.direction === "they_owe_me"
        ? "owed"
        : filters.visibility === "shared_event"
          ? "shared"
          : filters.dueMode === "due_soon"
            ? "due"
            : "all";

  return (
    <Screen
      floatingAction={
        <FloatingActionButton
          icon="add"
          label="Add debt"
          onPress={() => router.push("/debt/form")}
        />
      }
    >
      <PageHeader
        eyebrow="Ledger"
        title="Debts"
        subtitle="Find what is open, settled, shared, overdue, or waiting for review."
      />

      <View style={styles.searchBlock}>
        <View style={styles.searchLine}>
          <View style={styles.searchFlex}>
            <SearchField
              value={filters.query}
              onChangeText={(query) =>
                setFilters((current) => ({ ...current, query }))
              }
              placeholder="Search debts, people, notes"
            />
          </View>
          <IconButton
            icon="options-outline"
            label="Open filters"
            onPress={() => setFiltersOpen(true)}
          />
        </View>
        <View style={styles.quickFilters}>
          <QuickFilter
            label="All"
            active={quickMode === "all"}
            onPress={() => applyQuickFilter("all")}
          />
          <QuickFilter
            label="You owe"
            active={quickMode === "owe"}
            onPress={() => applyQuickFilter("owe")}
          />
          <QuickFilter
            label="Owed to you"
            active={quickMode === "owed"}
            onPress={() => applyQuickFilter("owed")}
          />
          <QuickFilter
            label="Shared"
            active={quickMode === "shared"}
            onPress={() => applyQuickFilter("shared")}
          />
          <QuickFilter
            label="Due soon"
            active={quickMode === "due"}
            onPress={() => applyQuickFilter("due")}
          />
        </View>
      </View>

      <Card style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{openCount}</Text>
          <Text style={styles.summaryLabel}>Open</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{dueSoonCount}</Text>
          <Text style={styles.summaryLabel}>Due soon</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{sharedCount}</Text>
          <Text style={styles.summaryLabel}>Shared</Text>
        </View>
      </Card>

      <SectionTitle
        title="Ledger records"
        subtitle={`${entries.length} shown${activeFilterCount ? ` · ${activeFilterCount} filters` : ""}`}
        action={
          activeFilterCount ? (
            <Button
              title="Clear"
              variant="ghost"
              onPress={() =>
                setFilters({ ...defaultFilters, query: filters.query })
              }
            />
          ) : undefined
        }
      />
      <Card>
        {entries.length > 0 ? (
          entries.map((entry) => (
            <DebtRow
              key={entry.id}
              entry={entry}
              members={data.members}
              sharedEventMembers={data.sharedEventMembers}
              event={
                entry.eventId
                  ? data.events.find((event) => event.id === entry.eventId)
                  : undefined
              }
            />
          ))
        ) : (
          <EmptyState
            title="No debts here"
            body="Try another quick filter or add a new debt."
            action={
              <Button
                title="Add debt"
                icon="add"
                onPress={() => router.push("/debt/form")}
              />
            }
          />
        )}
      </Card>

      <FilterSheet
        visible={filtersOpen}
        title="Filter debts"
        subtitle="Advanced filters stay here so the ledger stays readable."
        onClose={() => setFiltersOpen(false)}
      >
        <View style={styles.twoColumn}>
          <TextField
            label="Min amount"
            value={filters.minAmount}
            onChangeText={(minAmount) =>
              setFilters((current) => ({ ...current, minAmount }))
            }
            keyboardType="numeric"
            style={styles.flexField}
          />
          <TextField
            label="Max amount"
            value={filters.maxAmount}
            onChangeText={(maxAmount) =>
              setFilters((current) => ({ ...current, maxAmount }))
            }
            keyboardType="numeric"
            style={styles.flexField}
          />
        </View>

        <SelectChips
          label="Member"
          value={filters.memberId ?? "all"}
          options={memberOptions}
          onChange={(value) =>
            setFilters((current) => ({
              ...current,
              memberId: value === "all" ? null : value,
            }))
          }
        />
        <SelectChips
          label="Event"
          value={filters.eventId ?? "all"}
          options={eventOptions}
          onChange={(value) =>
            setFilters((current) => ({
              ...current,
              eventId: value === "all" ? null : value,
            }))
          }
        />
        <SelectChips
          label="Currency"
          value={filters.currency}
          options={[
            { label: "All", value: "all" },
            ...CURRENCIES.map((currency) => ({
              label: currency,
              value: currency,
            })),
          ]}
          onChange={(currency) =>
            setFilters((current) => ({ ...current, currency }))
          }
        />
        <SelectChips
          label="Direction"
          value={filters.direction}
          options={[
            { label: "All", value: "all" },
            { label: "They owe me", value: "they_owe_me" },
            { label: "I owe them", value: "i_owe_them" },
          ]}
          onChange={(direction) =>
            setFilters((current) => ({ ...current, direction }))
          }
        />
        <SelectChips
          label="Type"
          value={filters.kind}
          options={[
            { label: "All", value: "all" },
            { label: "Simple debt", value: "simple_debt" },
            { label: "Generated split", value: "expense_obligation" },
            { label: "Event debt", value: "event_direct_debt" },
          ]}
          onChange={(kind) => setFilters((current) => ({ ...current, kind }))}
        />
        <SelectChips
          label="Status"
          value={filters.status}
          options={[
            { label: "All", value: "all" },
            { label: "Active", value: "active" },
            { label: "Settled", value: "settled" },
            { label: "Archived", value: "archived" },
          ]}
          onChange={(status) =>
            setFilters((current) => ({ ...current, status }))
          }
        />
        <SelectChips
          label="Payment state"
          value={filters.paymentStatus}
          options={[
            { label: "All", value: "all" },
            { label: "Unpaid", value: "unpaid" },
            { label: "Partially paid", value: "partially_paid" },
            { label: "Paid", value: "paid" },
            { label: "Overpaid", value: "overpaid" },
          ]}
          onChange={(paymentStatus) =>
            setFilters((current) => ({ ...current, paymentStatus }))
          }
        />
        <SelectChips
          label="Due date"
          value={filters.dueMode}
          options={[
            { label: "All", value: "all" },
            { label: "Due soon", value: "due_soon" },
            { label: "Overdue", value: "overdue" },
            { label: "No due date", value: "no_due_date" },
          ]}
          onChange={(dueMode) =>
            setFilters((current) => ({ ...current, dueMode }))
          }
        />
        <SelectChips
          label="Verification"
          value={filters.verificationStatus}
          options={[
            { label: "All", value: "all" },
            { label: "Local", value: "local_only" },
            { label: "Pending", value: "pending" },
            { label: "Partially verified", value: "partially_verified" },
            { label: "Verified", value: "verified" },
            { label: "Rejected", value: "rejected" },
            { label: "Disputed", value: "disputed" },
            { label: "Resolved", value: "resolved" },
            { label: "Cancelled", value: "cancelled" },
          ]}
          onChange={(verificationStatus) =>
            setFilters((current) => ({ ...current, verificationStatus }))
          }
        />
        <SelectChips
          label="Member link"
          value={filters.linkMode}
          options={[
            { label: "All", value: "all" },
            { label: "Linked", value: "linked" },
            { label: "Unlinked", value: "unlinked" },
          ]}
          onChange={(linkMode) =>
            setFilters((current) => ({ ...current, linkMode }))
          }
        />
        <SelectChips
          label="Visibility"
          value={filters.visibility}
          options={[
            { label: "All", value: "all" },
            { label: "Private", value: "private" },
            { label: "Shared", value: "shared_with_involved_member" },
            { label: "Shared event", value: "shared_event" },
            { label: "Event later", value: "future_event_shared" },
          ]}
          onChange={(visibility) =>
            setFilters((current) => ({ ...current, visibility }))
          }
        />
        <SelectChips
          label="Tags"
          value={filters.tag ?? "all"}
          options={tagOptions}
          onChange={(value) =>
            setFilters((current) => ({
              ...current,
              tag: value === "all" ? null : value,
            }))
          }
        />
        <SelectChips
          label="Attachments"
          value={filters.attachmentMode}
          options={[
            { label: "All", value: "all" },
            { label: "Has attachment", value: "has_attachment" },
            { label: "Receipt", value: "has_receipt" },
            { label: "Proof", value: "has_proof" },
            { label: "None", value: "none" },
          ]}
          onChange={(attachmentMode) =>
            setFilters((current) => ({ ...current, attachmentMode }))
          }
        />
        <SelectChips
          label="Comments"
          value={filters.commentMode}
          options={[
            { label: "All", value: "all" },
            { label: "Has comments", value: "has_comments" },
            { label: "None", value: "none" },
          ]}
          onChange={(commentMode) =>
            setFilters((current) => ({ ...current, commentMode }))
          }
        />
        <SelectChips
          label="Smart suggestion"
          value={filters.suggestionMode}
          options={[
            { label: "All", value: "all" },
            { label: "Has suggestion", value: "has_suggestion" },
          ]}
          onChange={(suggestionMode) =>
            setFilters((current) => ({ ...current, suggestionMode }))
          }
        />
        <SelectChips
          label="Sort"
          value={filters.sort}
          options={[
            { label: "Newest", value: "date_desc" },
            { label: "Oldest", value: "date_asc" },
            { label: "High amount", value: "amount_desc" },
            { label: "Low amount", value: "amount_asc" },
            { label: "Title", value: "name_asc" },
          ]}
          onChange={(sort) => setFilters((current) => ({ ...current, sort }))}
        />
        <View style={styles.sheetActions}>
          <Button
            title="Reset filters"
            variant="secondary"
            onPress={() =>
              setFilters({ ...defaultFilters, query: filters.query })
            }
          />
          <Button title="Show results" onPress={() => setFiltersOpen(false)} />
        </View>
      </FilterSheet>
    </Screen>
  );
}

function QuickFilter({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickFilter,
        active && styles.quickFilterActive,
        pressed && styles.quickFilterPressed,
      ]}
    >
      <Text
        style={[styles.quickFilterText, active && styles.quickFilterTextActive]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function countActiveDebtFilters(filters: DebtFilters) {
  return Object.entries(filters).filter(([key, value]) => {
    const defaultValue = defaultFilters[key as keyof DebtFilters];
    if (key === "query") {
      return false;
    }
    return value !== defaultValue;
  }).length;
}

const styles = StyleSheet.create({
  searchBlock: {
    gap: spacing.md,
  },
  searchLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  searchFlex: {
    flex: 1,
  },
  quickFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  quickFilter: {
    minHeight: 36,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.surfaceGlassElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
  },
  quickFilterActive: {
    backgroundColor: palette.brand,
    borderColor: palette.brand,
  },
  quickFilterPressed: {
    opacity: 0.82,
  },
  quickFilterText: {
    color: palette.muted,
    fontSize: 13,
    fontFamily: typefaces.bodyStrong,
  },
  quickFilterTextActive: {
    color: palette.surface,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.lg,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  summaryValue: {
    color: palette.ink,
    fontSize: 22,
    fontFamily: typefaces.bodyHeavy,
  },
  summaryLabel: {
    color: palette.muted,
    fontSize: 12,
    fontFamily: typefaces.bodyStrong,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    height: 30,
    backgroundColor: palette.line,
  },
  twoColumn: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  flexField: {
    flex: 1,
    minWidth: 180,
  },
  sheetActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
