import { Chart, Section, Text, Toggle } from "@expo/ui/swift-ui";
import { font, frame } from "@expo/ui/swift-ui/modifiers";
import { Stack, router } from "expo-router";
import { useMemo, useState } from "react";

import { NativeEmptyState } from "@/src/components/ios/NativeEmptyState";
import { NativeListScreen } from "@/src/components/ios/NativeListScreen";
import { NativeInfoRow } from "@/src/components/ios/NativeRows";
import {
  debtByMember,
  debtByTag,
  monthlyOwedOwingTrend,
  paidVsUnpaidSummary,
} from "@/src/services/analytics";
import { estimateMoneyMap } from "@/src/services/currency";
import { useAppData } from "@/src/state/AppDataProvider";

export function NativeAnalyticsScreen() {
  const data = useAppData();
  const [includeArchived, setIncludeArchived] = useState(false);
  const [includeRejected, setIncludeRejected] = useState(false);
  const filters = useMemo(
    () => ({ includeArchived, includeRejectedDisputed: includeRejected }),
    [includeArchived, includeRejected],
  );
  const trend = useMemo(
    () => monthlyOwedOwingTrend(data.ledgerEntries, filters),
    [data.ledgerEntries, filters],
  );
  const chartData = trend.map((row) => ({
    x: row.label,
    y: estimateMoneyMap(row.owedToMe, data.settings, data.currencyRates),
  }));
  const tags = debtByTag(data.ledgerEntries, filters).slice(0, 8);
  const members = debtByMember(
    data.ledgerEntries,
    data.members,
    data.sharedGroupMembers,
    filters,
  ).slice(0, 8);
  const payment = paidVsUnpaidSummary(data.ledgerEntries, filters);

  return (
    <>
      <Stack.Title>Insights</Stack.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="square.and.arrow.up"
          accessibilityLabel="Export data"
          onPress={() => router.push("/(tabs)/settings/export" as never)}
        />
      </Stack.Toolbar>
      <NativeListScreen onRefresh={data.refresh}>
        <Section title="Filters">
          <Toggle label="Include archived records" isOn={includeArchived} onIsOnChange={setIncludeArchived} />
          <Toggle label="Include rejected and disputed records" isOn={includeRejected} onIsOnChange={setIncludeRejected} />
        </Section>
        <Section title="Monthly Owed to You">
          {chartData.length ? (
            <Chart
              type="bar"
              data={chartData}
              showGrid
              animate
              modifiers={[frame({ minHeight: 220 })]}
            />
          ) : (
            <NativeEmptyState
              title="No trend data"
              description="Add debts or broaden the filters to populate this chart."
              systemImage="chart.bar"
            />
          )}
        </Section>
        <Section title="Payment Progress">
          <NativeInfoRow label="Unpaid records" value={String(payment.counts.unpaid)} />
          <NativeInfoRow label="Partially paid" value={String(payment.counts.partiallyPaid)} />
          <NativeInfoRow label="Paid" value={String(payment.counts.paid)} />
          <NativeInfoRow label="Overpaid" value={String(payment.counts.overpaid)} />
        </Section>
        <Section title="Top Categories">
          {tags.map((row) => (
            <NativeInfoRow
              key={row.tag}
              label={row.tag}
              value={Object.entries(row.totalsByCurrency)
                .map(([currency, amount]) =>
                  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount ?? 0),
                )
                .join(" · ")}
            />
          ))}
        </Section>
        <Section title="Members">
          {members.map((row) => (
            <NativeInfoRow
              key={row.participantId}
              label={row.name}
              value={Object.entries(row.net)
                .map(([currency, amount]) =>
                  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount ?? 0),
                )
                .join(" · ") || "Settled"}
            />
          ))}
        </Section>
        <Section>
          <Text modifiers={[font({ textStyle: "footnote" })]}>
            Charts use native Swift Charts through Expo UI; no React Native chart host is required.
          </Text>
        </Section>
      </NativeListScreen>
    </>
  );
}
