import { StyleSheet, Text, View } from "react-native";

import { spacing, textStyles, useAppTheme } from "@/src/theme";

export function CreateAccountScreen() {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.appBackground,
        },
      ]}
    >
      <Text
        style={[
          styles.title,
          {
            color: theme.colors.text,
          },
        ]}
      >
        Create your account
      </Text>

      <Text
        style={[
          styles.message,
          {
            color: theme.colors.secondaryText,
          },
        ]}
      >
        Account registration will be built in the next authentication slice.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },

  title: {
    ...textStyles.title,
  },

  message: {
    ...textStyles.body,
    marginTop: spacing.sm,
    lineHeight: 24,
  },
});
