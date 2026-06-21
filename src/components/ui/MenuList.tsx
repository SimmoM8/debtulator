import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

import { GlassCard } from "@/src/components/ui/Finance";
import {
  palette,
  spacing,
  typefaces,
  typography,
} from "@/src/constants/design";

export type MenuIconName = keyof typeof Ionicons.glyphMap;

export type MenuListItem = {
  label: string;
  subtitle?: string;
  icon: MenuIconName;
  active?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

export type MenuListSection = {
  title?: string;
  items: MenuListItem[];
};

export function MobileMenuModal({
  visible,
  sections,
  onClose,
}: {
  visible: boolean;
  sections: MenuListSection[];
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable accessible={false} style={styles.overlay} onPress={onClose}>
        <Pressable
          accessible={false}
          style={styles.menuCardWrapper}
          onPress={(event) => event.stopPropagation()}
        >
          <GlassCard
            tone="lavender"
            wrapperStyle={styles.menuCardInner}
            style={styles.menuCard}
          >
            <View style={styles.closeRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close menu"
                hitSlop={8}
                onPress={onClose}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="close" size={22} color={palette.textSecondary} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <MenuListContent sections={sections} />
            </ScrollView>
          </GlassCard>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function MenuListContent({
  sections,
  style,
}: {
  sections: MenuListSection[];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.sectionList, style]}>
      {sections.map((section, sectionIndex) => (
        <View key={section.title ?? `section-${sectionIndex}`} style={styles.section}>
          {section.title ? (
            <Text style={styles.sectionTitle}>{section.title}</Text>
          ) : null}
          <View style={styles.itemList}>
            {section.items.map((item, index) => (
              <MenuRow key={`${item.label}-${index}`} item={item} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function MenuRow({ item }: { item: MenuListItem }) {
  const toneColor = item.destructive ? palette.danger : palette.primary;
  const active = Boolean(item.active);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityHint={item.subtitle}
      accessibilityState={{ selected: active, disabled: item.disabled }}
      disabled={item.disabled}
      onPress={item.onPress}
      style={({ pressed }) => [
        styles.item,
        active && styles.itemActive,
        item.disabled && styles.itemDisabled,
        pressed && !item.disabled && styles.pressed,
      ]}
    >
      <Ionicons
        name={item.icon}
        size={20}
        color={active ? palette.surface : toneColor}
      />
      <Text
        numberOfLines={1}
        style={[
          styles.itemLabel,
          active && styles.itemLabelActive,
          item.destructive && !active && styles.itemLabelDanger,
        ]}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-start",
    backgroundColor: "rgba(17,24,39,0.42)",
    paddingHorizontal: spacing.screen,
    paddingTop: 64,
    paddingBottom: spacing.xl,
  },
  menuCardWrapper: {
    width: "100%",
    maxWidth: 320,
    maxHeight: "100%",
    alignSelf: "flex-end",
  },
  menuCardInner: {
    width: "100%",
    maxHeight: "100%",
  },
  menuCard: {
    maxHeight: "100%",
    padding: spacing.md,
  },
  closeRow: {
    minHeight: 28,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingVertical: spacing.xxs,
  },
  sectionList: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: palette.primary,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
    letterSpacing: 0.3,
  },
  itemList: {
    gap: 2,
  },
  item: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  itemActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  itemDisabled: {
    opacity: 0.5,
  },
  itemLabel: {
    flex: 1,
    color: palette.textPrimary,
    fontSize: typography.size.lg,
    fontFamily: typefaces.bodyStrong,
  },
  itemLabelActive: {
    color: palette.surface,
  },
  itemLabelDanger: {
    color: palette.danger,
  },
  pressed: {
    opacity: 0.8,
  },
});
