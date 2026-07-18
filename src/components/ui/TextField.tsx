import React from "react";
import {
    StyleSheet,
    Text,
    TextInput,
    View,
    type StyleProp,
    type ViewStyle,
} from "react-native";

import { palette, radii, spacing } from "@/src/constants/design";

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
  return (
    <View style={[styles.field, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.shell, multiline && styles.shellMultiline]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.textTertiary}
          keyboardType={keyboardType}
          multiline={multiline}
          secureTextEntry={secureTextEntry}
          editable={editable}
          style={[styles.input, multiline && styles.inputMultiline]}
        />
      </View>
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
  shell: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: 1,
    borderColor: "rgba(55,48,163,0.16)",
  },
  shellMultiline: {
    minHeight: 104,
  },
  input: {
    color: palette.ink,
    minHeight: 24,
  },
  inputMultiline: {
    minHeight: 84,
    textAlignVertical: "top",
  },
});
