import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { DebtulatorShieldIllustration } from "@/src/components/illustrations/DebtulatorShieldIllustration";
import { Badge } from "@/src/components/ui/Badges";
import {
    Card,
    PageHeader,
    Screen,
    SectionTitle,
} from "@/src/components/ui/Primitives";
import { palette, spacing, typefaces } from "@/src/constants/design";

const checks = [
  "Buttons expose accessibility roles through shared primitives.",
  "Financial statuses use text badges in addition to color.",
  "Amounts should be spoken with direction and currency in detail rows.",
  "Charts include text summaries through analytics cards.",
  "Forms keep visible labels and validation messages.",
  "Destructive flows use explicit confirmation text.",
  "Sync and conflict states are inspectable without relying on color.",
];

export function AccessibilityAboutScreen() {
  return (
    <Screen>
      <PageHeader
        eyebrow="Release readiness"
        title="Accessibility and help"
        subtitle="Stage 6 accessibility checklist and production support notes."
      />
      <Card tone="lavender" style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroLabel}>Accessible by design</Text>
            <Text style={styles.heroTitle}>
              Roles, labels, contrast, and explicit confirmation should never be
              optional polish.
            </Text>
          </View>
          <View style={styles.heroArtWrap}>
            <DebtulatorShieldIllustration width={124} height={96} />
          </View>
        </View>
      </Card>
      <Card>
        <SectionTitle
          title="Accessibility pass"
          subtitle="Shared primitives enforce labels, roles, and stable touch targets."
        />
        {checks.map((check) => (
          <View key={check} style={styles.row}>
            <Badge label="checked" tone="positive" />
            <Text style={styles.body}>{check}</Text>
          </View>
        ))}
      </Card>
      <Card>
        <SectionTitle
          title="Support info"
          subtitle="User-facing errors avoid raw technical details by default."
        />
        <Text style={styles.body}>
          For support, include the current screen, action attempted, sync
          status, and whether the device was offline. Audit logs record
          important financial and security actions without storing unnecessary
          sensitive content.
        </Text>
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
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(221,214,254,0.22)",
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
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
    fontSize: 22,
    lineHeight: 30,
    fontFamily: typefaces.displayMedium,
  },
  heroArtWrap: {
    width: 134,
    height: 106,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.38)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderGlass,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  body: {
    color: palette.muted,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: typefaces.body,
  },
});
