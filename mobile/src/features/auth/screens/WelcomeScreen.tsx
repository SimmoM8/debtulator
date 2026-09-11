import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import {
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/src/components/avatars/Avatar";
import { AppButton } from "@/src/components/controls";
import { SplitBackgroundScreen } from "@/src/components/layout";
import { spacing, textStyles, useAppTheme } from "@/src/theme";

const PERSON_ICON = {
  ios: "person.fill",
  android: "person",
} as const;

const RELATIONSHIP_ICON = {
  ios: "arrow.left.arrow.right",
  android: "swap_horiz",
} as const;

const ACTION_PANEL_HEIGHT = 184;

export function WelcomeScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const heroMinHeight = Math.max(
    height - ACTION_PANEL_HEIGHT - insets.bottom,
    420,
  );

  return (
    <SplitBackgroundScreen
      hero={
        <View
          style={[
            styles.hero,
            {
              minHeight: heroMinHeight,
              paddingTop: insets.top + spacing.lg,
            },
          ]}
        >
          <View style={styles.brand}>
            <SymbolView
              name={RELATIONSHIP_ICON}
              size={22}
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

          <View style={styles.feature}>
            <View style={styles.relationship}>
              <Avatar
                icon={PERSON_ICON}
                size={64}
                variant="onBrand"
              />

              <View
                style={[
                  styles.relationshipLink,
                  {
                    backgroundColor: theme.colors.onBrandSurface,
                    borderColor: theme.colors.onBrandSurfaceBorder,
                  },
                ]}
              >
                <SymbolView
                  name={RELATIONSHIP_ICON}
                  size={22}
                  tintColor={theme.colors.onHeroBackground}
                />
              </View>

              <Avatar
                icon={PERSON_ICON}
                size={64}
                variant="onBrand"
              />
            </View>

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
              Keep shared money simple.
            </Text>
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
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },

  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  brandName: {
    ...textStyles.headline,
  },

  feature: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: spacing.lg,
  },

  relationship: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  relationshipLink: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
  },

  title: {
    ...textStyles.largeTitle,
    marginTop: spacing.xl,
    textAlign: "center",
  },

  subtitle: {
    ...textStyles.body,
    marginTop: spacing.sm,
    textAlign: "center",
  },

  actions: {
    width: "100%",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },

  actionsContent: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    gap: spacing.md,
  },
});
