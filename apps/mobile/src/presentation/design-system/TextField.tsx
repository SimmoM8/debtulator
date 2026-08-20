import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { GlassSurface } from "./GlassSurface";
import { palette, radii, spacing, typefaces, typography } from "@/src/presentation/theme";

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

/** Canonical text-field implementation used by every platform. */
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
      <GlassSurface
        role="input"
        style={[styles.inputShell, multiline && styles.inputShellMultiline]}
      >
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
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 10 },
  label: {
    color: palette.muted,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
    letterSpacing: 0.2,
  },
  inputShell: {
    minHeight: 54,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: palette.surfaceGlass,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },
  inputShellMultiline: { paddingVertical: spacing.md },
  input: {
    color: palette.textPrimary,
    fontSize: typography.size.base,
    lineHeight: typography.line.base,
    fontFamily: typefaces.body,
  },
  inputMultiline: { minHeight: 90, textAlignVertical: "top" },
});
