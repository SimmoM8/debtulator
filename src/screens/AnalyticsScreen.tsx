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
    TextField,
} from "@/src/components/ui/Primitives";
import { palette, spacing, typefaces,
typography,
} from "@/src/constants/design";
import {
    debtByMember,
    debtByTag,
    monthlyOwedOwingTrend,
    paidVsUnpaidSummary,
    verifiedVsPendingSummary,
} from "@/src/services/analytics";
import { estimateMoneyMap } from "@/src/services/currency";
import { useAppData } from "@/src/state/AppDataProvider";
import { formatMoney } from "@/src/utils/money";

export function AnalyticsScreen() {
  const data = useAppData();
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
  const trendData = useMemo(
    () =>
      trend.map((row) => ({
        label: row.label,
        value: estimateMoneyMap(
          row.owedToMe,
          data.settings,
          data.currencyRates,
        ),
        valueSecondary: estimateMoneyMap(
          row.iOwe,
          data.settings,
          data.currencyRates,
        ),
      })),
    [data.currencyRates, data.settings, trend],
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
          subtitle="Useful summaries shown in your selected base currency."
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
          subtitle="Date and status filters for base-currency insights."
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
        <View style={styles.badgeLine}>
          <Button
            title="Rejected/disputed"
            icon={includeRejected ? "checkbox" : "square-outline"}
            accessibilityState={{ selected: includeRejected }}
            variant={includeRejected ? "secondary" : "ghost"}
            onPress={() => setIncludeRejected((current) => !current)}
          />
          <Button
            title="Archived"
            icon={includeArchived ? "checkbox" : "square-outline"}
            accessibilityState={{ selected: includeArchived }}
            variant={includeArchived ? "secondary" : "ghost"}
            onPress={() => setIncludeArchived((current) => !current)}
          />
        </View>
      </Card>

      <BarChartCard
        title="Monthly owed/owing trend"
        subtitle={`Primary bar is owed to you; amber bar is what you owe (${data.settings.baseCurrency}).`}
        data={trendData}
        currency={data.settings.baseCurrency}
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
        settings={data.settings}
        currencyRates={data.currencyRates}
      />

      <MoneyMapListCard
        title="Debt by member"
        subtitle="Ranked by native-currency absolute net size. Tap a member from the Members tab for details."
        rows={memberRows.map((row) => ({
          label: row.name,
          totals: row.net,
          tone: "neutral",
        }))}
        settings={data.settings}
        currencyRates={data.currencyRates}
      />

      <Card>
        <SectionTitle
          title="Paid vs unpaid"
          subtitle="Shows original, paid, remaining, partial, full, and overpaid amounts."
        />
        <SummaryRow
          label="Original"
          value={moneyLabel(
            paidSummary.totals.original,
            data.settings,
            data.currencyRates,
          )}
        />
        <SummaryRow
          label="Paid"
          value={moneyLabel(
            paidSummary.totals.paid,
            data.settings,
            data.currencyRates,
          )}
        />
        <SummaryRow
          label="Open"
          value={moneyLabel(
            paidSummary.totals.remaining,
            data.settings,
            data.currencyRates,
          )}
        />
        <SummaryRow
          label="Partially paid"
          value={`${paidSummary.counts.partiallyPaid} records · ${moneyLabel(
            paidSummary.totals.partiallyPaid,
            data.settings,
            data.currencyRates,
          )}`}
        />
        <SummaryRow
          label="Fully paid"
          value={`${paidSummary.counts.paid} records · ${moneyLabel(
            paidSummary.totals.fullyPaid,
            data.settings,
            data.currencyRates,
          )}`}
        />
        <SummaryRow
          label="Overpaid"
          value={`${paidSummary.counts.overpaid} records · ${moneyLabel(
            paidSummary.totals.overpaid,
            data.settings,
            data.currencyRates,
          )}`}
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
          value={moneyLabel(
            trustSummary.verified,
            data.settings,
            data.currencyRates,
          )}
        />
        <SummaryRow
          label="Pending"
          value={moneyLabel(
            trustSummary.pending,
            data.settings,
            data.currencyRates,
          )}
        />
        <SummaryRow
          label="Partially verified"
          value={moneyLabel(
            trustSummary.partiallyVerified,
            data.settings,
            data.currencyRates,
          )}
        />
        <SummaryRow
          label="Local/private"
          value={moneyLabel(
            trustSummary.localPrivate,
            data.settings,
            data.currencyRates,
          )}
        />
        <SummaryRow
          label="Rejected"
          value={moneyLabel(
            trustSummary.rejected,
            data.settings,
            data.currencyRates,
          )}
        />
        <SummaryRow
          label="Disputed"
          value={moneyLabel(
            trustSummary.disputed,
            data.settings,
            data.currencyRates,
          )}
        />
        <SummaryRow
          label="Resolved"
          value={moneyLabel(
            trustSummary.resolved,
            data.settings,
            data.currencyRates,
          )}
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

function moneyLabel(
  map: Record<string, number>,
  settings: ReturnType<typeof useAppData>["settings"],
  currencyRates: ReturnType<typeof useAppData>["currencyRates"],
) {
  const estimated = estimateMoneyMap(map, settings, currencyRates);
  return formatMoney(estimated, settings.baseCurrency);
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
  heroBody: {
    color: palette.muted,
    fontSize: typography.size.base,
    lineHeight: typography.line.xlPlus,
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
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
  },
  heroStatValue: {
    color: palette.ink,
    fontSize: typography.size.h2,
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
    fontSize: typography.size.md,
    fontFamily: typefaces.bodyStrong,
  },
  summaryValue: {
    flex: 1,
    color: palette.ink,
    fontSize: typography.size.md,
    fontFamily: typefaces.bodyHeavy,
    textAlign: "right",
  },
});
