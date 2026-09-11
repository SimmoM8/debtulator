import { Image } from "expo-image";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton } from "@/src/components/controls";
import { SplitBackgroundScreen } from "@/src/components/layout";
import { spacing, textStyles, useAppTheme } from "@/src/theme";

const BRAND_ICON = {
  ios: "circle.grid.2x2.fill",
  android: "account_balance_wallet",
} as const;

const ACTION_PANEL_HEIGHT = 176;

export function WelcomeScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const heroMinHeight = Math.max(
    height - ACTION_PANEL_HEIGHT - insets.bottom,
    440,
  );

  return (
    <SplitBackgroundScreen
      includeHeaderInset={false}
      hero={
        <View
          style={[
            styles.hero,
            {
              minHeight: heroMinHeight,
            },
          ]}
        >
          <View
            style={[
              styles.heroContent,
              {
                paddingTop: insets.top + spacing.lg,
              },
            ]}
          >
            <View style={styles.brand}>
              <SymbolView
                name={BRAND_ICON}
                size={24}
                tintColor={theme.colors.onHeroBackground}
              />

              <Text
                style={[
                  styles.brandName,
                  {
                    color: theme.colors.onHeroBackground,
                  },
                ]}
              >
                Debtulator
              </Text>
            </View>

            <View style={styles.copy}>
              <Text
                style={[
                  styles.title,
                  {
                    color: theme.colors.onHeroBackground,
                  },
                ]}
              >
                Less confusion.{"\n"}More freedom.
              </Text>

              <Text
                style={[
                  styles.subtitle,
                  {
                    color: theme.colors.onBrandMuted,
                  },
                ]}
              >
                Track debts, split costs, and focus on what really matters.
              </Text>
            </View>

            <Image
              source={require("@/assets/images/debtulator_valley_connection_HD.png")}
              contentFit="cover"
              contentPosition="bottom"
              style={styles.feature}
            />
          </View>
        </View>
      }
    >
      <View style={styles.actions}>
        <View style={styles.actionsContent}>
          <AppButton
            label="Sign in"
            onPress={() => {
              router.push("/(auth)/(modals)/sign-in");
            }}
          />

          <AppButton
            label="Create account"
            variant="secondary"
            onPress={() => {
              router.push("/(auth)/(modals)/create-account");
            }}
          />
        </View>
      </View>
    </SplitBackgroundScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: "100%",
  },

  heroContent: {
    flex: 1,
    alignItems: "center",
  },

  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },

  brandName: {
    ...textStyles.headline,
  },

  copy: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },

  title: {
    ...textStyles.largeTitle,
    textAlign: "center",
  },

  subtitle: {
    ...textStyles.body,
    maxWidth: 340,
    marginTop: spacing.md,
    textAlign: "center",
    lineHeight: 24,
  },

  feature: {
    flex: 1,
    width: "100%",
    marginTop: spacing.lg,
  },

  actions: {
    width: "100%",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },

  actionsContent: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    gap: spacing.md,
  },
});
