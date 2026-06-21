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
  useWindowDimensions,
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
  const [anchor, setAnchor] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const anchorRef = React.useRef<View>(null);
  const window = useWindowDimensions();
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

  function openDropdown() {
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setQuery("");
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  }

  const dropdownPosition = useMemo(() => {
    const gutter = 12;
    const gap = 4;
    const width = window.width - gutter * 2;
    const left = gutter;
    const below = window.height - anchor.y - anchor.height - gutter - gap;
    const above = anchor.y - gutter - gap;
    const opensBelow = below >= Math.min(320, above);

    return {
      left,
      width,
      maxHeight: Math.max(160, opensBelow ? below : above),
      ...(opensBelow
        ? { top: anchor.y + anchor.height + gap }
        : { bottom: window.height - anchor.y + gap }),
    };
  }, [anchor, window.height, window.width]);

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
        ref={anchorRef}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Opens a member selector"
        onPress={openDropdown}
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
        <Pressable
          accessible={false}
          style={styles.overlay}
          onPress={() => setOpen(false)}
        >
          <Pressable
            accessible={false}
            style={[styles.menuPosition, dropdownPosition]}
            onPress={(event) => event.stopPropagation()}
          >
            <GlassCard wrapperStyle={styles.menuWrapper} style={styles.menu}>
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
          </Pressable>
        </Pressable>
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
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.42)",
  },
  menuPosition: {
    position: "absolute",
  },
  menuWrapper: {
    width: "100%",
    maxHeight: "100%",
  },
  menu: {
    maxHeight: "100%",
    gap: 12,
    padding: 12,
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
