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

import { GlassCard, StatusPill } from "@/src/components/ui/Finance";
import { IconButton } from "@/src/components/ui/Primitives";
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
  title,
  statusLabel,
  sections,
  onClose,
}: {
  visible: boolean;
  title: string;
  statusLabel?: string;
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
      <View style={styles.overlay}>
        <Pressable accessible={false} style={styles.backdrop} onPress={onClose} />
        <GlassCard tone="lavender" style={styles.menuCard}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.headerMeta}>
              {statusLabel ? <StatusPill label={statusLabel} tone="indigo" /> : null}
              <IconButton icon="close" label={`Close ${title}`} onPress={onClose} />
            </View>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <MenuListContent sections={sections} />
          </ScrollView>
        </GlassCard>
      </View>
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
      <View
        style={[
          styles.itemIcon,
          active && styles.itemIconActive,
          item.destructive && !active && styles.itemIconDanger,
        ]}
      >
        <Ionicons
          name={item.icon}
          size={18}
          color={active ? palette.surface : toneColor}
        />
      </View>
      <View style={styles.itemCopy}>
        <Text
          style={[
            styles.itemLabel,
            active && styles.itemLabelActive,
            item.destructive && !active && styles.itemLabelDanger,
          ]}
        >
          {item.label}
        </Text>
        {item.subtitle ? (
          <Text
            style={[
              styles.itemSubtitle,
              active && styles.itemSubtitleActive,
            ]}
          >
            {item.subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={active ? palette.surface : palette.textTertiary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-start",
    backgroundColor: "rgba(17,24,39,0.18)",
    paddingHorizontal: spacing.screen,
    paddingTop: 70,
    paddingBottom: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  menuCard: {
    maxHeight: "88%",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  headerMeta: {
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    color: palette.textPrimary,
    fontSize: typography.size.h1,
    fontFamily: typefaces.displayMedium,
  },
  scrollContent: {
    paddingTop: spacing.md,
  },
  sectionList: {
    gap: spacing.lg,
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
    gap: spacing.sm,
  },
  item: {
    minHeight: 68,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: palette.surfaceGlassElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  itemActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  itemDisabled: {
    opacity: 0.5,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(55,48,163,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  itemIconActive: {
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  itemIconDanger: {
    backgroundColor: palette.dangerSoft,
  },
  itemCopy: {
    flex: 1,
    gap: 2,
  },
  itemLabel: {
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
  itemSubtitle: {
    color: palette.textTertiary,
    fontSize: typography.size.sm,
    lineHeight: typography.line.basePlus,
    fontFamily: typefaces.body,
  },
  itemSubtitleActive: {
    color: "rgba(255,255,255,0.78)",
  },
  pressed: {
    opacity: 0.8,
  },
});
