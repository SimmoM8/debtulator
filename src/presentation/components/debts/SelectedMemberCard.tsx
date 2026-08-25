import ChevronRightIcon from "@expo/material-symbols/chevron_right.xml";

import { Button, Column, Host, Icon, Row, Spacer, Text } from "@expo/ui";
import { buttonStyle } from "@expo/ui/swift-ui/modifiers";
import { Platform, StyleSheet } from "react-native";

import { colors } from "@/src/theme";

type SelectedMemberCardProps = {
  memberName: string;
  onPress: () => void;
};

const CHEVRON_ICON = Icon.select({
  ios: "chevron.right",
  android: ChevronRightIcon,
});

const supportsLiquidGlass =
  Platform.OS === "ios" && Number(Platform.Version) >= 26;

export function SelectedMemberCard({
  memberName,
  onPress,
}: SelectedMemberCardProps) {
  return (
    <Host
      seedColor={colors.nativeControlTint}
      matchContents={{
        vertical: true,
        horizontal: false,
      }}
      style={styles.host}
    >
      <Button
        variant={
          Platform.OS === "android"
            ? "filled"
            : supportsLiquidGlass
              ? "text"
              : "outlined"
        }
        onPress={onPress}
        accessibilityLabel={`Change member, currently ${memberName}`}
        style={styles.button}
        modifiers={supportsLiquidGlass ? [buttonStyle("glass")] : undefined}
      >
        <Row alignment="center" style={styles.content}>
          <Column spacing={2}>
            <Text
              textStyle={{
                fontSize: 17,
                fontWeight: "600",
              }}
            >
              {memberName}
            </Text>

            <Text
              style={{
                opacity: 0.58,
              }}
              textStyle={{
                fontSize: 13,
              }}
            >
              Tap to change
            </Text>
          </Column>

          <Spacer flexible />

          <Icon name={CHEVRON_ICON} size={17} />
        </Row>
      </Button>
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    width: "100%",
  },

  button: {
    width: "100%",
    height: 68,
    paddingHorizontal: 16,
    borderRadius: 20,
  },

  content: {
    width: "100%",
  },
});
