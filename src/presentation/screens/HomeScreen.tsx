import { Screen } from "@/src/components/layout";
import { colors, textStyles } from "@/src/theme";
import { Text } from "react-native";

export function HomeScreen() {
  return (
    <Screen>
      <Text
        style={[
          textStyles.title,
          {
            color: colors.text,
          },
        ]}
        maxFontSizeMultiplier={1.4}
      >
        Home
      </Text>
    </Screen>
  );
}
