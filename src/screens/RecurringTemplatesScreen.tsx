import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { DebtulatorOrbitIllustration } from "@/src/components/illustrations/DebtulatorOrbitIllustration";
import { Badge } from "@/src/components/ui/Badges";
import {
    Button,
    Card,
    EmptyState,
    LoadingState,
    PageHeader,
    Screen,
    SectionTitle,
} from "@/src/components/ui/Primitives";
import { palette, spacing, typefaces } from "@/src/constants/design";
import { useAppData } from "@/src/state/AppDataProvider";
import { formatMoney } from "@/src/utils/money";

export function RecurringTemplatesScreen() {
  const data = useAppData();

  if (data.loading) {
    return <LoadingState />;
  }

  return (
    <Screen>
      <PageHeader
        eyebrow="Recurring"
        title="Recurring records"
        subtitle="Generate rent, subscriptions, utilities, and repeat shared expenses without duplicates."
        action={
          <Button
            title="Add recurring"
            icon="repeat"
            onPress={() => router.push("/recurring/form")}
          />
        }
      />

      <Card tone="lavender" style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroLabel}>Template engine</Text>
            <Text style={styles.heroTitle}>
              Schedule predictable records without losing control over when they
              generate.
            </Text>
            <Text style={styles.body}>
              Recurring templates stay visible, editable, and reviewable before
              they become new debts or shared expenses.
            </Text>
          </View>
          <View style={styles.heroArtWrap}>
            <DebtulatorOrbitIllustration width={132} height={104} compact />
          </View>
        </View>
      </Card>

      <Card tone="blue">
        <SectionTitle
          title="Due to generate"
          subtitle="App-open generation can be automatic or prompted in settings."
        />
        <View style={styles.actionRow}>
          <Badge
            label={`${data.recurringTemplates.filter((item) => item.status === "active").length} active`}
            tone="blue"
          />
          <Badge
            label={`${data.recurringTemplates.filter((item) => item.nextOccurrenceDate <= new Date().toISOString().slice(0, 10)).length} due`}
            tone="amber"
          />
        </View>
        <Button
          title="Generate due recurring records"
          icon="flash"
          variant="secondary"
          onPress={() => data.generateDueRecurringRecords()}
        />
      </Card>

      <Card>
        {data.recurringTemplates.length > 0 ? (
          data.recurringTemplates.map((template) => (
            <View key={template.id} style={styles.row}>
              <View style={styles.flexOne}>
                <View style={styles.actionRow}>
                  <Text style={styles.rowTitle}>{template.title}</Text>
                  <Badge
                    label={template.status}
                    tone={template.status === "active" ? "positive" : "neutral"}
                  />
                </View>
                <Text style={styles.body}>
                  {template.type.replaceAll("_", " ")} ·{" "}
                  {formatMoney(template.amount, template.currency)} · next{" "}
                  {template.nextOccurrenceDate}
                </Text>
              </View>
              <Button
                title="Manage"
                icon="create"
                variant="secondary"
                onPress={() =>
                  router.push({
                    pathname: "/recurring/form",
                    params: { id: template.id },
                  })
                }
              />
            </View>
          ))
        ) : (
          <EmptyState
            title="No recurring records"
            body="Create a recurring debt or shared expense template."
          />
        )}
      </Card>
    </Screen>
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  flexOne: {
    flex: 1,
  },
  rowTitle: {
    color: palette.ink,
    fontSize: 16,
    fontFamily: typefaces.bodyHeavy,
  },
  body: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typefaces.body,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
