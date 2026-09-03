import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";

import { useAppTheme } from "@/src/theme";

const BADGE_SIZE = 26;
const ICON_SIZE = 14;

const LINK_ICON = {
  ios: "link",
  android: "link",
} as const;

export function MemberLinkBadge() {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: theme.colors.controlContainer,
          borderColor: theme.colors.heroBackground,
        },
      ]}
    >
      <SymbolView
        name={LINK_ICON}
        size={ICON_SIZE}
        tintColor={theme.colors.onControlContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderRadius: BADGE_SIZE / 2,
  },
});
