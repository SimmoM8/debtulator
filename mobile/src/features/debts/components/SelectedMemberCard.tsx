import ChevronRightIcon from "@expo/material-symbols/chevron_right.xml";
import { Button, Column, Icon, Row, Spacer, Text } from "@expo/ui";
import { buttonStyle } from "@expo/ui/swift-ui/modifiers";
import { Platform, StyleSheet } from "react-native";

import { NativeThemeHost } from "@/src/theme";

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
    <NativeThemeHost
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
        style={styles.button}
        modifiers={supportsLiquidGlass ? [buttonStyle("glass")] : undefined}
      >
        <Row alignment="center">
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
    </NativeThemeHost>
  );
}

const styles = StyleSheet.create({
  host: {
    width: "100%",
  },
  button: {
    height: 68,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
});
