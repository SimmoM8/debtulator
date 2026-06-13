import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { palette, typefaces, typography } from "@/src/constants/design";

export function TagInput({
  value,
  onChange,
  usedTags,
  label = "Tags",
  placeholder = "Add tag",
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  usedTags: string[];
  label?: string;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const suggestions = useMemo(() => {
    const fragment = input.trim().toLowerCase();
    const selected = normalizedSet(value);

    if (!fragment) {
      return [];
    }

    return usedTags
      .filter((tag) => {
        const normalized = tag.toLowerCase();
        return normalized.includes(fragment) && !selected.has(normalized);
      })
      .slice(0, 6);
  }, [input, usedTags, value]);

  function addTag(tag: string) {
    const clean = tag.trim();
    if (!clean) {
      return;
    }

    const existing = normalizedSet(value);
    if (!existing.has(clean.toLowerCase())) {
      onChange([...value, clean]);
    }
    setInput("");
  }

  function updateInput(next: string) {
    if (next.includes(",")) {
      next.split(",").forEach(addTag);
      setInput("");
      return;
    }

    setInput(next);
  }

  function removeTag(tag: string) {
    onChange(value.filter((item) => item !== tag));
  }

  return (
    <View style={styles.field}>
      <View style={styles.inputField}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <View style={styles.inputShell}>
          <TextInput
            value={input}
            onChangeText={updateInput}
            onSubmitEditing={() => addTag(input)}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === "Enter" || nativeEvent.key === "Tab") {
                addTag(input);
              }
            }}
            placeholder={placeholder}
            placeholderTextColor={palette.textTertiary}
            returnKeyType="done"
            blurOnSubmit={false}
            style={styles.input}
          />
        </View>
      </View>

      {suggestions.length ? (
        <View style={styles.suggestionList}>
          {suggestions.map((tag) => (
            <Pressable
              key={tag}
              accessibilityRole="button"
              accessibilityLabel={`Add ${tag} tag`}
              onPress={() => addTag(tag)}
              style={({ pressed }) => [
                styles.suggestion,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.suggestionText}>{tag}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {value.length ? (
        <View style={styles.selectedList}>
          {value.map((tag) => (
            <View key={tag} style={styles.selectedTag}>
              <Text style={styles.selectedTagText}>{tag}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${tag} tag`}
                onPress={() => removeTag(tag)}
                hitSlop={8}
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
    </View>
  );
}

function normalizedSet(tags: string[]) {
  return new Set(tags.map((tag) => tag.toLowerCase()));
}

const styles = StyleSheet.create({
  field: {
    gap: 8,
  },
  inputField: {
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
  input: {
    color: palette.textPrimary,
    fontSize: typography.size.base,
    lineHeight: typography.line.base,
    fontFamily: typefaces.body,
  },
  suggestionList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestion: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigo,
    backgroundColor: "rgba(255,255,255,0.62)",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionText: {
    color: palette.primary,
    fontSize: 13,
    fontFamily: typefaces.bodyStrong,
  },
  selectedList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectedTag: {
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
  selectedTagText: {
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
  pressed: {
    opacity: 0.76,
  },
});
