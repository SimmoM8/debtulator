import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from "react-native";

import { GlassCard } from "@/src/components/ui/Finance";
import { palette, typefaces, typography } from "@/src/constants/design";

export type MemberSelectOption = {
  label: string;
  value: string;
};

export function MemberMultiSelect({
  label = "Members",
  values,
  options,
  onChange,
  placeholder = "Select members",
  style,
}: {
  label?: string;
  values: string[];
  options: MemberSelectOption[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(values), [values]);
  const selectedOptions = options.filter((option) => selected.has(option.value));
  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return options;
    }
    return options.filter((option) =>
      option.label.toLowerCase().includes(normalized),
    );
  }, [options, query]);

  function toggle(value: string) {
    onChange(
      selected.has(value)
        ? values.filter((item) => item !== value)
        : [...values, value],
    );
  }

  function remove(value: string) {
    onChange(values.filter((item) => item !== value));
  }

  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Opens a member selector"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.inputShell,
          styles.selectorShell,
          pressed && styles.pressed,
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.selectorValue,
            !selectedOptions.length && styles.selectorPlaceholder,
          ]}
        >
          {selectedOptions.length
            ? `${selectedOptions.length} selected`
            : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={palette.primary} />
      </Pressable>

      {selectedOptions.length ? (
        <View style={styles.selectedList}>
          {selectedOptions.map((option) => (
            <View key={option.value} style={styles.selectedPill}>
              <Text style={styles.selectedPillText}>{option.label}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${option.label}`}
                hitSlop={8}
                onPress={() => remove(option.value)}
                style={({ pressed }) => [
                  styles.removeButton,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="close" size={11} color={palette.primary} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <Modal
        visible={open}
        animationType="fade"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.overlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close member selector"
            style={styles.backdrop}
            onPress={() => setOpen(false)}
          />
          <GlassCard style={styles.menu}>
            <Text style={styles.menuTitle}>{label}</Text>
            <View style={styles.searchShell}>
              <Ionicons name="search" size={16} color={palette.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search"
                placeholderTextColor={palette.textTertiary}
                style={styles.searchInput}
              />
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.optionList}
            >
              {filteredOptions.map((option) => {
                const active = selected.has(option.value);
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityLabel={option.label}
                    accessibilityState={{ selected: active }}
                    onPress={() => toggle(option.value)}
                    style={({ pressed }) => [
                      styles.option,
                      active && styles.optionActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.optionText,
                        active && styles.optionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {active ? (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={palette.primary}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
              {!filteredOptions.length ? (
                <Text style={styles.emptyText}>No matches</Text>
              ) : null}
            </ScrollView>
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 10,
  },
  label: {
    color: palette.muted,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
    letterSpacing: 0.2,
  },
  inputShell: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: "rgba(255,255,255,0.68)",
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  selectorShell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectorValue: {
    flex: 1,
    color: palette.textPrimary,
    fontSize: typography.size.base,
    lineHeight: typography.line.base,
    fontFamily: typefaces.bodyStrong,
  },
  selectorPlaceholder: {
    color: palette.textTertiary,
    fontFamily: typefaces.body,
  },
  selectedList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectedPill: {
    minHeight: 36,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigo,
    backgroundColor: palette.surfaceGlassStrong,
    paddingLeft: 12,
    paddingRight: 22,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "visible",
  },
  selectedPillText: {
    color: palette.textPrimary,
    fontSize: 13,
    fontFamily: typefaces.bodyStrong,
  },
  removeButton: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(221,214,254,0.42)",
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    padding: 12,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17,24,39,0.18)",
  },
  menu: {
    maxHeight: "72%",
    gap: 12,
    padding: 12,
  },
  menuTitle: {
    color: palette.textPrimary,
    fontSize: typography.size.lg,
    fontFamily: typefaces.displayMedium,
  },
  searchShell: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: "rgba(255,255,255,0.72)",
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  searchInput: {
    flex: 1,
    color: palette.textPrimary,
    fontSize: typography.size.base,
    fontFamily: typefaces.body,
  },
  optionList: {
    gap: 6,
  },
  option: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  optionActive: {
    backgroundColor: palette.surfaceGlassStrong,
  },
  optionText: {
    flex: 1,
    color: palette.textSecondary,
    fontSize: typography.size.base,
    fontFamily: typefaces.bodyStrong,
  },
  optionTextActive: {
    color: palette.primary,
  },
  emptyText: {
    color: palette.muted,
    fontSize: typography.size.sm,
    fontFamily: typefaces.body,
    textAlign: "center",
    paddingVertical: 12,
  },
  pressed: {
    opacity: 0.76,
  },
});
