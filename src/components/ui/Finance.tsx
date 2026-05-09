import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import {
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
    type StyleProp,
    type TextInputProps,
    type ViewStyle,
} from "react-native";
import Svg, { Circle } from "react-native-svg";

import {
    gradients,
    palette,
    radii,
    shadows,
    spacing,
    typefaces,
} from "@/src/constants/design";
import { initials } from "@/src/utils/text";

type IconName = keyof typeof Ionicons.glyphMap;
type Tone =
  | "indigo"
  | "teal"
  | "coral"
  | "amber"
  | "peach"
  | "lavender"
  | "muted";

const toneStyles: Record<
  Tone,
  { chip: string; text: string; border: string; accent: string }
> = {
  indigo: {
    chip: "rgba(55,48,163,0.12)",
    text: palette.primary,
    border: "rgba(55,48,163,0.18)",
    accent: palette.primary,
  },
  teal: {
    chip: palette.successSoft,
    text: palette.success,
    border: "rgba(47,191,143,0.2)",
    accent: palette.success,
  },
  coral: {
    chip: palette.dangerSoft,
    text: palette.danger,
    border: "rgba(255,107,107,0.2)",
    accent: palette.danger,
  },
  amber: {
    chip: palette.warningSoft,
    text: palette.warning,
    border: "rgba(245,158,11,0.2)",
    accent: palette.warning,
  },
  peach: {
    chip: palette.peachSoft,
    text: palette.primaryDeep,
    border: "rgba(253,186,155,0.24)",
    accent: palette.peach,
  },
  lavender: {
    chip: "rgba(221,214,254,0.34)",
    text: palette.primaryDeep,
    border: "rgba(221,214,254,0.38)",
    accent: palette.lavender,
  },
  muted: {
    chip: "rgba(107,114,128,0.1)",
    text: palette.muted,
    border: "rgba(107,114,128,0.14)",
    accent: palette.muted,
  },
};

export function GlassCard({
  children,
  style,
  tone = "lavender",
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: Tone;
}) {
  const toneStyle = toneStyles[tone];

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: toneStyle.border,
          backgroundColor: palette.surfaceGlass,
        },
        style,
      ]}
    >
      <BlurView
        tint="light"
        intensity={12}
        experimentalBlurMethod="dimezisBlurView"
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

export function StatusPill({
  label,
  tone = "muted",
}: {
  label: string;
  tone?: Tone;
}) {
  const toneStyle = toneStyles[tone];
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: toneStyle.chip, borderColor: toneStyle.border },
      ]}
    >
      <Text style={[styles.pillText, { color: toneStyle.text }]}>{label}</Text>
    </View>
  );
}

export function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        active && styles.filterChipActive,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[styles.filterChipText, active && styles.filterChipTextActive]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function SearchBar({
  value,
  onChangeText,
  placeholder,
  accessory,
  style,
  ...props
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  accessory?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
} & Omit<TextInputProps, "value" | "onChangeText" | "style">) {
  return (
    <View style={[styles.searchBar, style]}>
      <Ionicons name="search" size={18} color={palette.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textTertiary}
        style={styles.searchInput}
        {...props}
      />
      {accessory}
    </View>
  );
}

export function StatCard({
  label,
  value,
  subtitle,
  tone = "lavender",
}: {
  label: string;
  value: string;
  subtitle?: string;
  tone?: Tone;
}) {
  const toneStyle = toneStyles[tone];
  return (
    <View style={[styles.statCard, { borderColor: toneStyle.border }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: toneStyle.text }]}>{value}</Text>
      {subtitle ? <Text style={styles.statSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function ActionTile({
  icon,
  title,
  subtitle,
  tone = "indigo",
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  tone?: Tone;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View
        style={[
          styles.actionIcon,
          {
            backgroundColor: toneStyles[tone].chip,
            borderColor: toneStyles[tone].border,
          },
        ]}
      >
        <Ionicons name={icon} size={20} color={toneStyles[tone].text} />
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.actionSubtitle}>{subtitle}</Text> : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.actionTile}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionTile, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

export function AvatarStack({
  labels,
  limit = 4,
}: {
  labels: string[];
  limit?: number;
}) {
  const visible = labels.slice(0, limit);
  const overflow = labels.length - visible.length;

  return (
    <View style={styles.avatarStack}>
      {visible.map((label, index) => (
        <View
          key={`${label}-${index}`}
          style={[styles.avatar, { marginLeft: index === 0 ? 0 : -10 }]}
        >
          <Text style={styles.avatarText}>{initials(label)}</Text>
        </View>
      ))}
      {overflow > 0 ? (
        <View style={[styles.avatar, styles.avatarOverflow]}>
          <Text style={styles.avatarOverflowText}>+{overflow}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function ListRow({
  title,
  subtitle,
  amount,
  status,
  statusTone = "muted",
  meta,
  icon,
  iconTone = "lavender",
  avatars,
  onPress,
}: {
  title: string;
  subtitle?: string;
  amount?: string;
  status?: string;
  statusTone?: Tone;
  meta?: string;
  icon?: IconName;
  iconTone?: Tone;
  avatars?: string[];
  onPress?: () => void;
}) {
  const body = (
    <View style={styles.listRow}>
      <View
        style={[
          styles.listIcon,
          {
            backgroundColor: toneStyles[iconTone].chip,
            borderColor: toneStyles[iconTone].border,
          },
        ]}
      >
        <Ionicons
          name={icon ?? "wallet-outline"}
          size={18}
          color={toneStyles[iconTone].text}
        />
      </View>
      <View style={styles.listCopy}>
        <View style={styles.listTopLine}>
          <Text style={styles.listTitle} numberOfLines={1}>
            {title}
          </Text>
          {amount ? <Text style={styles.listAmount}>{amount}</Text> : null}
        </View>
        {subtitle ? (
          <Text style={styles.listSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        <View style={styles.listMetaRow}>
          {status ? <StatusPill label={status} tone={statusTone} /> : null}
          {meta ? <Text style={styles.listMeta}>{meta}</Text> : null}
          {avatars?.length ? <AvatarStack labels={avatars} /> : null}
        </View>
      </View>
    </View>
  );

  if (!onPress) {
    return <View style={styles.rowShell}>{body}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.rowShell, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

export function ProgressCard({
  title,
  subtitle,
  progress,
  value,
  helper,
}: {
  title: string;
  subtitle?: string;
  progress: number;
  value: string;
  helper?: string;
}) {
  const normalized = Math.max(0, Math.min(progress, 1));
  const size = 76;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - normalized);

  return (
    <GlassCard tone="lavender" style={styles.progressCard}>
      <View style={styles.progressRingWrap}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(55,48,163,0.12)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={palette.primary}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View style={styles.progressCenter}>
          <Text style={styles.progressPercent}>
            {Math.round(normalized * 100)}%
          </Text>
        </View>
      </View>
      <View style={styles.progressCopy}>
        <Text style={styles.progressTitle}>{title}</Text>
        {subtitle ? (
          <Text style={styles.progressSubtitle}>{subtitle}</Text>
        ) : null}
        <Text style={styles.progressValue}>{value}</Text>
        {helper ? <Text style={styles.progressHelper}>{helper}</Text> : null}
      </View>
    </GlassCard>
  );
}

export function SettingsRow({
  icon,
  title,
  subtitle,
  value,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}
    >
      <View style={styles.settingsLead}>
        <View style={styles.settingsIcon}>
          <Ionicons name={icon} size={18} color={palette.primary} />
        </View>
        <View style={styles.settingsCopy}>
          <Text style={styles.settingsTitle}>{title}</Text>
          {subtitle ? (
            <Text style={styles.settingsSubtitle}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.settingsTail}>
        {value ? <Text style={styles.settingsValue}>{value}</Text> : null}
        <Ionicons
          name="chevron-forward"
          size={16}
          color={palette.textTertiary}
        />
      </View>
    </Pressable>
  );
}

export function FloatingAddButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
    >
      <View style={styles.addButtonGradient} />
      <Ionicons name="add" size={28} color={palette.surface} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    overflow: "hidden",
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  },
  pill: {
    minHeight: 30,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  pillText: {
    fontSize: 12,
    fontFamily: typefaces.bodyStrong,
    letterSpacing: 0.1,
  },
  filterChip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: palette.surfaceGlassElevated,
    justifyContent: "center",
  },
  filterChipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  filterChipText: {
    color: palette.muted,
    fontSize: 13,
    fontFamily: typefaces.bodyStrong,
  },
  filterChipTextActive: {
    color: palette.surface,
  },
  searchBar: {
    minHeight: 52,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: palette.surfaceGlassStrong,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    ...shadows.soft,
  },
  searchInput: {
    flex: 1,
    color: palette.textPrimary,
    fontSize: 15,
    fontFamily: typefaces.body,
  },
  statCard: {
    flex: 1,
    minWidth: 100,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.72)",
    padding: spacing.md,
    gap: 6,
  },
  statLabel: {
    color: palette.muted,
    fontSize: 12,
    fontFamily: typefaces.bodyStrong,
  },
  statValue: {
    color: palette.textPrimary,
    fontSize: 22,
    lineHeight: 26,
    fontFamily: typefaces.displayMedium,
  },
  statSubtitle: {
    color: palette.textTertiary,
    fontSize: 12,
    fontFamily: typefaces.body,
  },
  actionTile: {
    minWidth: 100,
    flex: 1,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: palette.surfaceGlassElevated,
    padding: spacing.md,
    gap: 10,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: {
    color: palette.textPrimary,
    fontSize: 14,
    fontFamily: typefaces.bodyStrong,
  },
  actionSubtitle: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: typefaces.body,
  },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.92)",
  },
  avatarText: {
    color: palette.primaryDeep,
    fontSize: 11,
    fontFamily: typefaces.bodyStrong,
  },
  avatarOverflow: {
    marginLeft: -10,
    backgroundColor: "rgba(55,48,163,0.12)",
    borderColor: "rgba(255,255,255,0.92)",
  },
  avatarOverflowText: {
    color: palette.primary,
    fontSize: 10,
    fontFamily: typefaces.bodyStrong,
  },
  rowShell: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: palette.surfaceGlassElevated,
    overflow: "hidden",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 72,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  listIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  listCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  listTopLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  listTitle: {
    flex: 1,
    color: palette.textPrimary,
    fontSize: 15,
    fontFamily: typefaces.bodyStrong,
  },
  listAmount: {
    color: palette.textPrimary,
    fontSize: 15,
    fontFamily: typefaces.bodyHeavy,
    fontVariant: ["tabular-nums"],
  },
  listSubtitle: {
    color: palette.muted,
    fontSize: 13,
    fontFamily: typefaces.body,
  },
  listMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  listMeta: {
    color: palette.textTertiary,
    fontSize: 12,
    fontFamily: typefaces.body,
  },
  progressCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  progressRingWrap: {
    width: 76,
    height: 76,
    alignItems: "center",
    justifyContent: "center",
  },
  progressCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  progressPercent: {
    color: palette.primary,
    fontSize: 16,
    fontFamily: typefaces.bodyHeavy,
  },
  progressCopy: {
    flex: 1,
    gap: 4,
  },
  progressTitle: {
    color: palette.textPrimary,
    fontSize: 16,
    fontFamily: typefaces.bodyStrong,
  },
  progressSubtitle: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typefaces.body,
  },
  progressValue: {
    color: palette.primaryDeep,
    fontSize: 14,
    fontFamily: typefaces.bodyStrong,
  },
  progressHelper: {
    color: palette.textTertiary,
    fontSize: 12,
    fontFamily: typefaces.body,
  },
  settingsRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: palette.surfaceGlassElevated,
  },
  settingsLead: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  settingsIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(55,48,163,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsCopy: {
    flex: 1,
    gap: 2,
  },
  settingsTitle: {
    color: palette.textPrimary,
    fontSize: 15,
    fontFamily: typefaces.bodyStrong,
  },
  settingsSubtitle: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: typefaces.body,
  },
  settingsTail: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  settingsValue: {
    color: palette.textTertiary,
    fontSize: 12,
    fontFamily: typefaces.bodyStrong,
  },
  addButton: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.96)",
    backgroundColor: palette.primary,
    ...shadows.card,
  },
  addButtonGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: gradients.indigoStart,
  },
  pressed: {
    opacity: 0.78,
  },
});
