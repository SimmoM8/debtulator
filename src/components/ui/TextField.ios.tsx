import React, { useEffect } from "react";
import {
    StyleSheet,
    Text,
    TextInput,
    View,
    type StyleProp,
    type ViewStyle,
} from "react-native";

import {
    Host,
    TextField as SwiftTextField,
    useNativeState,
} from "@expo/ui/swift-ui";
import { textFieldStyle } from "@expo/ui/swift-ui/modifiers";

import { palette, spacing } from "@/src/constants/design";

export type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: React.ComponentProps<typeof TextInput>["keyboardType"];
  multiline?: boolean;
  secureTextEntry?: boolean;
  editable?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  secureTextEntry,
  editable = true,
  style,
}: TextFieldProps) {
  const textState = useNativeState(value);

  useEffect(() => {
    textState.set(value);
  }, [textState, value]);

  return (
    <View style={[styles.field, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Host>
        <SwiftTextField
          text={textState}
          onTextChange={(nextValue) => onChangeText(nextValue)}
          placeholder={placeholder}
          axis={multiline ? "vertical" : "horizontal"}
          modifiers={[textFieldStyle("roundedBorder")]}
        />
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  label: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "600",
  },
});
