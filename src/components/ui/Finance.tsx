import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import {
    Animated,
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
  allowOverflow = false,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: Tone;
  allowOverflow?: boolean;
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
        allowOverflow && styles.cardOverflowVisible,
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

export function SearchFilterBar({
  value,
  onChangeText,
  placeholder,
  onPressFilter,
  filterActive = false,
  filterLabel = "Open filters",
  style,
  ...props
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  onPressFilter: () => void;
  filterActive?: boolean;
  filterLabel?: string;
  style?: StyleProp<ViewStyle>;
} & Omit<TextInputProps, "value" | "onChangeText" | "style">) {
  return (
    <View style={[styles.searchToolbar, style]}>
      <SearchBar
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={styles.searchToolbarField}
        {...props}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={filterLabel}
        onPress={onPressFilter}
        style={({ pressed }) => [
          styles.searchToolbarButton,
          filterActive && styles.searchToolbarButtonActive,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons
          name="options-outline"
          size={20}
          color={filterActive ? palette.primary : palette.muted}
        />
      </Pressable>
    </View>
  );
}

export function SingleSelectFilterList({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { label: string; value: string; description?: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.filterOptionList}>
      {options.map((option, index) => {
        const active = option.value === value;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.filterOption,
              index < options.length - 1 && styles.filterOptionDivider,
              active && styles.filterOptionActive,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.filterOptionCopy}>
              <Text style={styles.filterOptionLabel}>{option.label}</Text>
              {option.description ? (
                <Text style={styles.filterOptionDescription}>
                  {option.description}
                </Text>
              ) : null}
            </View>
            {active ? (
              <View style={styles.filterOptionCheck}>
                <Ionicons name="checkmark" size={15} color={palette.primary} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function StatCard({
  label,
  value,
  subtitle,
  tone = "lavender",
  compact = false,
  withDivider = false,
}: {
  label: string;
  value: string;
  subtitle?: string;
  tone?: Tone;
  compact?: boolean;
  withDivider?: boolean;
}) {
  const toneStyle = toneStyles[tone];
  const [showInfo, setShowInfo] = React.useState(false);
  const showsCompactInfo = compact && Boolean(subtitle);
  const infoOpacity = React.useRef(new Animated.Value(0)).current;
  const hideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissInfo = React.useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    Animated.timing(infoOpacity, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setShowInfo(false);
      }
    });
  }, [infoOpacity]);

  const revealInfo = React.useCallback(() => {
    if (!showsCompactInfo) {
      return;
    }

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    setShowInfo(true);
    infoOpacity.stopAnimation();
    infoOpacity.setValue(0);
    Animated.timing(infoOpacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();

    hideTimerRef.current = setTimeout(() => {
      dismissInfo();
    }, 1500);
  }, [dismissInfo, infoOpacity, showsCompactInfo]);

  React.useEffect(
    () => () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
      infoOpacity.stopAnimation();
    },
    [infoOpacity],
  );

  const content = (
    <>
      <Text style={[styles.statLabel, compact && styles.statLabelCompact]}>
        {label}
      </Text>
      <Text
        style={[
          styles.statValue,
          { color: toneStyle.text },
          compact && styles.statValueCompact,
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
      {!compact && subtitle ? (
        <Text style={styles.statSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
      {showsCompactInfo && showInfo ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.statInfoBubble, { opacity: infoOpacity }]}
        >
          <Text style={styles.statInfoText}>{subtitle}</Text>
        </Animated.View>
      ) : null}
    </>
  );

  if (showsCompactInfo) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} info`}
        accessibilityHint="Shows a short explanation for this summary metric"
        onPress={revealInfo}
        style={({ pressed }) => [
          styles.statCard,
          { borderColor: toneStyle.border },
          styles.statCardCompact,
          withDivider && styles.statCardCompactDivider,
          pressed && styles.pressed,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.statCard,
        { borderColor: toneStyle.border },
        compact && styles.statCardCompact,
        compact && withDivider && styles.statCardCompactDivider,
      ]}
    >
      {content}
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
  trailingLabel,
  trailingTone,
  icon,
  iconTone = "lavender",
  avatars,
  onPress,
  showDivider,
}: {
  title: string;
  subtitle?: string;
  amount?: string;
  status?: string;
  statusTone?: Tone;
  meta?: string;
  trailingLabel?: string;
  trailingTone?: Tone;
  icon?: IconName;
  iconTone?: Tone;
  avatars?: string[];
  onPress?: () => void;
  showDivider?: boolean;
}) {
  const supportingLabel = trailingLabel ?? meta ?? status;
  const supportingTone = trailingTone ?? (status ? statusTone : "muted");

  const body = (
    <View style={[styles.listRow, showDivider && styles.listRowDivider]}>
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
        <Text style={styles.listTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.listSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {avatars?.length ? <AvatarStack labels={avatars} /> : null}
      </View>
      <View style={styles.listRightColumn}>
        {amount ? <Text style={styles.listAmount}>{amount}</Text> : null}
        {supportingLabel ? (
          <Text
            style={[
              styles.listSupporting,
              { color: toneStyles[supportingTone].text },
            ]}
            numberOfLines={1}
          >
            {supportingLabel}
          </Text>
        ) : null}
      </View>
      {onPress ? (
        <Ionicons
          name="chevron-forward"
          size={15}
          color={palette.textTertiary}
          style={styles.listChevron}
        />
      ) : null}
      <View style={styles.listCopyMobileMeta}>
        {supportingLabel ? (
          <Text
            style={[
              styles.listSupporting,
              { color: toneStyles[supportingTone].text },
            ]}
            numberOfLines={1}
          >
            {supportingLabel}
          </Text>
        ) : null}
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
  cardOverflowVisible: {
    overflow: "visible",
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
  searchToolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  searchToolbarField: {
    flex: 1,
  },
  searchToolbarButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: palette.surfaceGlassStrong,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft,
  },
  searchToolbarButtonActive: {
    borderColor: "rgba(55,48,163,0.2)",
    backgroundColor: "rgba(55,48,163,0.08)",
  },
  filterOptionList: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: "rgba(255,255,255,0.66)",
    overflow: "hidden",
  },
  filterOption: {
    minHeight: 72,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  filterOptionDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  filterOptionActive: {
    backgroundColor: "rgba(55,48,163,0.05)",
  },
  filterOptionCopy: {
    flex: 1,
    gap: 3,
  },
  filterOptionLabel: {
    color: palette.textPrimary,
    fontSize: 15,
    fontFamily: typefaces.bodyStrong,
  },
  filterOptionDescription: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: typefaces.body,
  },
  filterOptionCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(55,48,163,0.12)",
    alignItems: "center",
    justifyContent: "center",
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
  statCardCompact: {
    minWidth: 0,
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    position: "relative",
    overflow: "visible",
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    gap: 2,
  },
  statCardCompactDivider: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: palette.line,
  },
  statLabel: {
    color: palette.muted,
    fontSize: 12,
    fontFamily: typefaces.bodyStrong,
  },
  statLabelCompact: {
    fontSize: 11,
    lineHeight: 14,
  },
  statValue: {
    color: palette.textPrimary,
    fontSize: 22,
    lineHeight: 26,
    fontFamily: typefaces.displayMedium,
  },
  statValueCompact: {
    fontSize: 18,
    lineHeight: 22,
  },
  statSubtitle: {
    color: palette.textTertiary,
    fontSize: 12,
    fontFamily: typefaces.body,
  },
  statSubtitleCompact: {
    fontSize: 11,
    lineHeight: 14,
  },
  statInfoBubble: {
    position: "absolute",
    left: spacing.sm,
    maxWidth: 168,
    bottom: "100%",
    marginBottom: 10,
    zIndex: 2,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: "rgba(255,255,255,0.94)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    ...shadows.soft,
  },
  statInfoText: {
    color: palette.textPrimary,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: typefaces.bodyStrong,
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
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 78,
    paddingHorizontal: spacing.md,
    paddingVertical: 15,
  },
  listRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  listIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  listCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  listTitle: {
    color: palette.textPrimary,
    fontSize: 15,
    fontFamily: typefaces.bodyStrong,
  },
  listAmount: {
    color: palette.textPrimary,
    fontSize: 15,
    fontFamily: typefaces.bodyHeavy,
    fontVariant: ["tabular-nums"],
    textAlign: "right",
  },
  listSubtitle: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: typefaces.body,
  },
  listRightColumn: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4,
    minWidth: 92,
  },
  listSupporting: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: typefaces.bodyStrong,
    textAlign: "right",
  },
  listChevron: {
    marginLeft: -2,
  },
  listCopyMobileMeta: {
    display: "none",
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
