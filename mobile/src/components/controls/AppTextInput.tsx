import { forwardRef } from "react";
import {
  StyleSheet,
  TextInput,
  type TextInputProps,
} from "react-native";

import {
  componentTokens,
  spacing,
  textStyles,
  useAppTheme,
} from "@/src/theme";

export const AppTextInput = forwardRef<TextInput, TextInputProps>(
  function AppTextInput(
    {
      style,
      placeholderTextColor,
      selectionColor,
      ...props
    },
    ref,
  ) {
    const theme = useAppTheme();

    return (
      <TextInput
        ref={ref}
        {...props}
        placeholderTextColor={
          placeholderTextColor ?? theme.colors.placeholder
        }
        selectionColor={selectionColor ?? theme.colors.controlTint}
        style={[
          styles.input,
          {
            color: theme.colors.text,
            backgroundColor: theme.colors.surfaceContainer,
            borderColor: theme.colors.outline,
          },
          style,
        ]}
      />
    );
  },
);

const styles = StyleSheet.create({
  input: {
    minHeight: componentTokens.textInput.height,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: componentTokens.textInput.radius,
    ...textStyles.body,
  },
});
