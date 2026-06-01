import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { DebtulatorOrbitIllustration } from "@/src/components/illustrations/DebtulatorOrbitIllustration";
import {
    Card,
    PageHeader,
    Screen,
    SectionTitle,
    SelectChips,
} from "@/src/components/ui/Primitives";
import { palette, spacing, typefaces,
typography,
} from "@/src/constants/design";
import { formatLocaleCurrency, formatLocaleDate, t } from "@/src/services/i18n";
import { useAppData } from "@/src/state/AppDataProvider";

export function LanguageSettingsScreen() {
  const data = useAppData();

  return (
    <Screen>
      <PageHeader
        eyebrow="Localization"
        title="Language"
      />
      <Card tone="lavender" style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}>
          <Text style={styles.heroCopy}>
            Keep the language you read in sync with the way money and dates are
            presented, without changing the ledger model underneath.
          </Text>
          <DebtulatorOrbitIllustration width={124} height={96} compact />
        </View>
      </Card>
      <Card>
        <SectionTitle title="App language" />
        <SelectChips
          value={data.settings.language}
          onChange={(language) => data.updateSettings({ language })}
          options={[
            { label: "System", value: "system" },
            { label: "English", value: "en" },
            { label: "Svenska", value: "sv" },
          ]}
        />
      </Card>
      <Card>
        <SectionTitle
          title="Preview"
          subtitle="Internal enum values remain unchanged; only display labels are translated."
        />
        <Text style={styles.line}>
          {t(data.settings, "debt")} · {t(data.settings, "expense")} ·{" "}
          {t(data.settings, "payment")} · {t(data.settings, "settlement")}
        </Text>
        <Text style={styles.line}>
          {t(data.settings, "owedToYou")}:{" "}
          {formatLocaleCurrency(
            data.settings,
            1200,
            data.settings.baseCurrency,
          )}
        </Text>
        <Text style={styles.line}>
          {formatLocaleDate(data.settings, new Date())}
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
    color: palette.ink,
    fontSize: typography.size.xxl,
    lineHeight: typography.line.h1,
    fontFamily: typefaces.displayMedium,
  },
  line: {
    color: palette.ink,
    fontSize: typography.size.lg,
    lineHeight: typography.line.h3,
    fontFamily: typefaces.body,
  },
});
