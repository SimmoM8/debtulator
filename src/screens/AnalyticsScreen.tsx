import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
    BarChartCard,
    MoneyMapListCard,
} from "@/src/components/AnalyticsCards";
import { DebtulatorOrbitIllustration } from "@/src/components/illustrations/DebtulatorOrbitIllustration";
import { Badge } from "@/src/components/ui/Badges";
import {
    Button,
    Card,
    LoadingState,
    PageHeader,
    Screen,
    SectionTitle,
    SelectChips,
    TextField,
} from "@/src/components/ui/Primitives";
import { CURRENCIES } from "@/src/constants/currencies";
import { palette, spacing, typefaces } from "@/src/constants/design";
import {
    chartTrendForCurrency,
    debtByMember,
    debtByTag,
    monthlyOwedOwingTrend,
    paidVsUnpaidSummary,
    verifiedVsPendingSummary,
} from "@/src/services/analytics";
import { useAppData } from "@/src/state/AppDataProvider";
import type { CurrencyCode } from "@/src/types/models";
import { formatMoneyMap } from "@/src/utils/money";

export function AnalyticsScreen() {
  const data = useAppData();
  const [currency, setCurrency] = useState<CurrencyCode>(
    data.settings.baseCurrency,
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [includeRejected, setIncludeRejected] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);

  const filters = useMemo(
    () => ({
      startDate: startDate || null,
      endDate: endDate || null,
      includeRejectedDisputed: includeRejected,
      includeArchived,
    }),
    [endDate, includeArchived, includeRejected, startDate],
  );
  const trend = useMemo(
    () => monthlyOwedOwingTrend(data.ledgerEntries, filters),
    [data.ledgerEntries, filters],
  );
  const tagRows = useMemo(
    () => debtByTag(data.ledgerEntries, filters).slice(0, 8),
    [data.ledgerEntries, filters],
  );
  const memberRows = useMemo(
    () =>
      debtByMember(
        data.ledgerEntries,
        data.members,
        data.sharedEventMembers,
        filters,
      ).slice(0, 8),
    [data.ledgerEntries, data.members, data.sharedEventMembers, filters],
  );
  const paidSummary = useMemo(
    () => paidVsUnpaidSummary(data.ledgerEntries, filters),
    [data.ledgerEntries, filters],
  );
  const trustSummary = useMemo(
    () => verifiedVsPendingSummary(data.ledgerEntries, filters),
    [data.ledgerEntries, filters],
  );
  const topCategory = tagRows[0];

  if (data.loading) {
    return <LoadingState />;
  }

  return (
    <Screen>
      <PageHeader
        eyebrow="Insights"
        title="Insights"
        subtitle="Useful summaries that keep currencies separate unless estimated mode is explicitly labelled."
        action={
          <Button
            title="Export data"
            icon="download"
            variant="secondary"
            onPress={() => router.push("/export")}
          />
        }
      />

      <Card tone="lavender" style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroLabel}>Readable trends</Text>
            <Text style={styles.heroTitle}>
              Follow progress, categories, and trust state without flattening
              currencies into misleading totals.
            </Text>
            <Text style={styles.heroBody}>
              {topCategory
                ? `Top category right now is ${topCategory.tag}, with trends and trust state kept separate and explainable.`
                : "Insights appear as soon as the ledger has enough activity to analyse."}
            </Text>
          </View>
          <View style={styles.heroArtWrap}>
            <DebtulatorOrbitIllustration width={132} height={104} compact />
          </View>
        </View>
        <View style={styles.heroStats}>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>Categories</Text>
            <Text style={styles.heroStatValue}>{tagRows.length}</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>Members</Text>
            <Text style={styles.heroStatValue}>{memberRows.length}</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>Pending</Text>
            <Text style={styles.heroStatValue}>
              {Object.keys(trustSummary.pending).length}
            </Text>
          </View>
        </View>
      </Card>

      <Card tone="lavender">
        <SectionTitle
          title="Filters"
          subtitle="Charts use existing ledger calculations and never silently merge currencies."
        />
        <View style={styles.twoColumn}>
          <TextField
            label="Start date"
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
            style={styles.flexField}
          />
          <TextField
            label="End date"
            value={endDate}
            onChangeText={setEndDate}
            placeholder="YYYY-MM-DD"
            style={styles.flexField}
          />
        </View>
        <SelectChips
          label="Chart currency"
          value={currency}
          options={CURRENCIES.map((code) => ({ label: code, value: code }))}
          onChange={setCurrency}
        />
        <View style={styles.badgeLine}>
          <Button
            title="Rejected/disputed"
            icon={includeRejected ? "checkbox" : "square-outline"}
            variant={includeRejected ? "secondary" : "ghost"}
            onPress={() => setIncludeRejected((current) => !current)}
          />
          <Button
            title="Archived"
            icon={includeArchived ? "checkbox" : "square-outline"}
            variant={includeArchived ? "secondary" : "ghost"}
            onPress={() => setIncludeArchived((current) => !current)}
          />
        </View>
      </Card>

      <BarChartCard
        title="Monthly owed/owing trend"
        subtitle="Primary bar is owed to you; amber bar is what you owe for the same month."
        data={chartTrendForCurrency(trend, currency)}
        currency={currency}
        secondaryLabel="you owe"
      />

      <MoneyMapListCard
        title="Debt by category/tag"
        subtitle="Records with multiple tags split their amount evenly across tags for analysis."
        rows={tagRows.map((row) => ({
          label: row.tag,
          totals: row.totalsByCurrency,
          tone: row.tag === "Untagged" ? "neutral" : "blue",
        }))}
      />

      <MoneyMapListCard
        title="Debt by member"
        subtitle="Ranked by native-currency absolute net size. Tap a member from the Members tab for details."
        rows={memberRows.map((row) => ({
          label: row.name,
          totals: row.net,
          tone: "neutral",
        }))}
      />

      <Card>
        <SectionTitle
          title="Paid vs unpaid"
          subtitle="Shows original, paid, remaining, partial, full, and overpaid amounts."
        />
        <SummaryRow
          label="Original"
          value={formatMoneyMap(paidSummary.totals.original, "None")}
        />
        <SummaryRow
          label="Paid"
          value={formatMoneyMap(paidSummary.totals.paid, "None")}
        />
        <SummaryRow
          label="Open"
          value={formatMoneyMap(paidSummary.totals.remaining, "None")}
        />
        <SummaryRow
          label="Partially paid"
          value={`${paidSummary.counts.partiallyPaid} records · ${formatMoneyMap(paidSummary.totals.partiallyPaid, "None")}`}
        />
        <SummaryRow
          label="Fully paid"
          value={`${paidSummary.counts.paid} records · ${formatMoneyMap(paidSummary.totals.fullyPaid, "None")}`}
        />
        <SummaryRow
          label="Overpaid"
          value={`${paidSummary.counts.overpaid} records · ${formatMoneyMap(paidSummary.totals.overpaid, "None")}`}
        />
      </Card>

      <Card>
        <SectionTitle
          title="Verified vs pending"
          subtitle="Trust/status analytics keep rejected and disputed visually distinct."
        />
        <View style={styles.badgeLine}>
          <Badge label="verified" tone="positive" />
          <Badge label="pending" tone="amber" />
          <Badge label="rejected/disputed" tone="negative" />
        </View>
        <SummaryRow
          label="Verified"
          value={formatMoneyMap(trustSummary.verified, "None")}
        />
        <SummaryRow
          label="Pending"
          value={formatMoneyMap(trustSummary.pending, "None")}
        />
        <SummaryRow
          label="Partially verified"
          value={formatMoneyMap(trustSummary.partiallyVerified, "None")}
        />
        <SummaryRow
          label="Local/private"
          value={formatMoneyMap(trustSummary.localPrivate, "None")}
        />
        <SummaryRow
          label="Rejected"
          value={formatMoneyMap(trustSummary.rejected, "None")}
        />
        <SummaryRow
          label="Disputed"
          value={formatMoneyMap(trustSummary.disputed, "None")}
        />
        <SummaryRow
          label="Resolved"
          value={formatMoneyMap(trustSummary.resolved, "None")}
        />
      </Card>
    </Screen>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
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
    fontSize: 12,
    fontFamily: typefaces.bodyStrong,
    textTransform: "uppercase",
    letterSpacing: 0.4,
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
    maxWidth: 360,
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
  heroStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  heroStatCard: {
    flex: 1,
    minWidth: 110,
    borderRadius: 18,
    padding: spacing.md,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    gap: 2,
  },
  heroStatLabel: {
    color: palette.muted,
    fontSize: 12,
    fontFamily: typefaces.bodyStrong,
  },
  heroStatValue: {
    color: palette.ink,
    fontSize: 22,
    fontFamily: typefaces.bodyHeavy,
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
  badgeLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  summaryLabel: {
    color: palette.muted,
    fontSize: 13,
    fontFamily: typefaces.bodyStrong,
  },
  summaryValue: {
    flex: 1,
    color: palette.ink,
    fontSize: 13,
    fontFamily: typefaces.bodyHeavy,
    textAlign: "right",
  },
});
