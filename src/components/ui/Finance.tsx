import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import {
    Animated,
    Platform,
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
    typography,
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

/**
 * Android needs a BlurTargetView for real-time blur in Expo SDK 56. The rounded
 * surface already provides the material tint there; adding another native view
 * creates rectangular compositing artifacts on some Android renderers.
 */
export function GlassBackdrop({ intensity = 18 }: { intensity?: number }) {
  if (Platform.OS === "android") {
    return null;
  }

  return (
    <BlurView
      tint="light"
      intensity={intensity}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    />
  );
}

export function GlassCard({
  children,
  style,
  wrapperStyle,
  tone = "lavender",
  allowOverflow = false,
  shadow = "card",
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  wrapperStyle?: StyleProp<ViewStyle>;
  tone?: Tone;
  allowOverflow?: boolean;
  shadow?: "card" | "stacked" | "none";
}) {
  const toneStyle = toneStyles[tone];

  return (
    <View
      style={[
        styles.cardLift,
        shadow !== "none" && shadows[shadow],
        wrapperStyle,
      ]}
    >
      <View
        style={[
          styles.card,
          {
            borderColor: toneStyle.border,
            backgroundColor:
              Platform.OS === "android"
                ? palette.surface
                : palette.surfaceGlassElevated,
          },
          allowOverflow && styles.cardOverflowVisible,
          style,
        ]}
      >
        <View
          pointerEvents="none"
          style={[
            styles.cardMaterial,
            Platform.OS !== "android" && styles.cardMaterialClip,
          ]}
        >
          <GlassBackdrop />
          <View style={styles.cardSheen} />
          <View
            style={[styles.cardGlow, { backgroundColor: toneStyle.chip }]}
          />
        </View>
        {children}
      </View>
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
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
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
  compact = false,
  style,
  ...props
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  onPressFilter: () => void;
  filterActive?: boolean;
  filterLabel?: string;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
} & Omit<TextInputProps, "value" | "onChangeText" | "style">) {
  return (
    <View style={[styles.searchToolbar, style]}>
      <SearchBar
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={[
          styles.searchToolbarField,
          compact && styles.searchToolbarFieldCompact,
        ]}
        {...props}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={filterLabel}
        accessibilityState={{ selected: filterActive }}
        onPress={onPressFilter}
        style={({ pressed }) => [
          styles.searchToolbarButton,
          compact && styles.searchToolbarButtonCompact,
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
            accessibilityLabel={option.label}
            accessibilityHint={option.description}
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
  compactDensity = "default",
  withDivider = false,
  dividerSide = "right",
  showCompactSubtitle = false,
  subtitleIcon,
  onPress,
  accessibilityHint,
  selected = false,
}: {
  label: string;
  value: string;
  subtitle?: string;
  tone?: Tone;
  compact?: boolean;
  compactDensity?: "default" | "tight";
  withDivider?: boolean;
  dividerSide?: "left" | "right";
  showCompactSubtitle?: boolean;
  subtitleIcon?: IconName;
  onPress?: () => void;
  accessibilityHint?: string;
  selected?: boolean;
}) {
  const toneStyle = toneStyles[tone];
  const [showInfo, setShowInfo] = React.useState(false);
  const compactSubtitleVisible =
    compact && showCompactSubtitle && Boolean(subtitle);
  const showsCompactInfo =
    compact && Boolean(subtitle) && !compactSubtitleVisible;
  const [infoOpacity] = React.useState(() => new Animated.Value(0));
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
      <Text
        style={[
          styles.statLabel,
          compact && styles.statLabelCompact,
          compact && compactDensity === "tight" && styles.statLabelCompactTight,
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.statValue,
          { color: toneStyle.text },
          compact && styles.statValueCompact,
          compact && compactDensity === "tight" && styles.statValueCompactTight,
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
      {compactSubtitleVisible ? (
        <View style={styles.statSubtitleRow}>
          <Text
            style={[
              styles.statSubtitle,
              styles.statSubtitleCompactVisible,
              { color: toneStyle.text },
            ]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
          {subtitleIcon ? (
            <Ionicons
              name={subtitleIcon}
              size={12}
              color={toneStyle.text}
              style={styles.statSubtitleIcon}
            />
          ) : null}
        </View>
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

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value}`}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ selected }}
        onPress={onPress}
        onLongPress={showsCompactInfo ? revealInfo : undefined}
        onHoverIn={showsCompactInfo ? revealInfo : undefined}
        onHoverOut={showsCompactInfo ? dismissInfo : undefined}
        style={({ pressed }) => [
          styles.statCard,
          !compact && styles.statCardShadow,
          { borderColor: toneStyle.border },
          compact && styles.statCardCompact,
          compact && compactDensity === "tight" && styles.statCardCompactTight,
          selected && styles.statCardSelected,
          selected && { backgroundColor: toneStyle.chip },
          compact &&
            withDivider &&
            (dividerSide === "left"
              ? styles.statCardCompactDividerLeft
              : styles.statCardCompactDivider),
          pressed && styles.pressed,
        ]}
      >
        {content}
      </Pressable>
    );
  }

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
          compactDensity === "tight" && styles.statCardCompactTight,
          withDivider &&
            (dividerSide === "left"
              ? styles.statCardCompactDividerLeft
              : styles.statCardCompactDivider),
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
        !compact && styles.statCardShadow,
        { borderColor: toneStyle.border },
        compact && styles.statCardCompact,
        compact && compactDensity === "tight" && styles.statCardCompactTight,
        compact &&
          withDivider &&
          (dividerSide === "left"
            ? styles.statCardCompactDividerLeft
            : styles.statCardCompactDivider),
      ]}
    >
      {content}
    </View>
  );
}

export function RequestCard({
  title,
  body,
  amount,
  status,
  tone = "amber",
  actions,
  onPress,
}: {
  title: string;
  body: string;
  amount?: string;
  status: string;
  tone?: Extract<Tone, "amber" | "teal" | "coral" | "muted">;
  onPress?: () => void;
  actions?: {
    label: string;
    onPress: () => void;
    variant?: "primary" | "secondary";
  }[];
}) {
  const header = (
    <>
      <View style={styles.requestCopy}>
        <Text style={styles.requestTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.requestBody}>{body}</Text>
      </View>
      <View style={styles.requestMeta}>
        <StatusPill label={status} tone={tone} />
        {amount ? (
          <Text style={styles.requestAmount} numberOfLines={1}>
            {amount}
          </Text>
        ) : null}
      </View>
    </>
  );

  return (
    <View style={styles.requestCard}>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={[title, body, amount, status]
            .filter(Boolean)
            .join(", ")}
          onPress={onPress}
          style={({ pressed }) => [
            styles.requestHeader,
            pressed && styles.pressed,
          ]}
        >
          {header}
        </Pressable>
      ) : (
        <View style={styles.requestHeader}>{header}</View>
      )}
      {actions?.length ? (
        <View style={styles.requestActions}>
          {actions.map((action) => {
            const primary = action.variant !== "secondary";
            return (
              <Pressable
                key={action.label}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                onPress={action.onPress}
                style={({ pressed }) => [
                  styles.requestAction,
                  primary
                    ? styles.requestActionPrimary
                    : styles.requestActionSecondary,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.requestActionText,
                    primary && styles.requestActionTextPrimary,
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
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
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, amount, supportingLabel]
        .filter(Boolean)
        .join(", ")}
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
      accessibilityRole="button"
      accessibilityLabel={[title, value, subtitle].filter(Boolean).join(", ")}
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

export function FloatingAddButton({
  onPress,
  accessibilityLabel = "Open quick actions",
  accessibilityState,
}: {
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityState?: React.ComponentProps<typeof Pressable>["accessibilityState"];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      onPress={onPress}
      style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
    >
      <View style={styles.addButtonGradient} />
      <Ionicons name="add" size={28} color={palette.surface} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardLift: {
    borderRadius: radii.xl,
    overflow: "visible",
  },
  card: {
    position: "relative",
    overflow: "hidden",
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardOverflowVisible: {
    overflow: "visible",
  },
  cardMaterial: {
    ...StyleSheet.absoluteFill,
  },
  cardMaterialClip: {
    borderRadius: radii.xl,
    overflow: "hidden",
  },
  cardSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "54%",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  cardGlow: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: radii.pill,
    right: -36,
    bottom: -56,
    opacity: 0.22,
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
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
    letterSpacing: 0.1,
  },
  filterChip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor:
      Platform.OS === "android" ? palette.surface : palette.surfaceGlassElevated,
    justifyContent: "center",
  },
  filterChipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  filterChipText: {
    color: palette.muted,
    fontSize: typography.size.md,
    fontFamily: typefaces.bodyStrong,
  },
  filterChipTextActive: {
    color: palette.surface,
  },
  searchBar: {
    minHeight: 48,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    backgroundColor: palette.surfaceMuted,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: palette.textPrimary,
    fontSize: typography.size.lg,
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
  searchToolbarFieldCompact: {
    minHeight: 44,
  },
  searchToolbarButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    backgroundColor: palette.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  searchToolbarButtonActive: {
    borderColor: palette.borderIndigo,
    backgroundColor: "rgba(221,214,254,0.38)",
  },
  searchToolbarButtonCompact: {
    width: 44,
    height: 44,
  },
  filterOptionList: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: "rgba(255,255,255,0.66)",
    overflow: "hidden",
  },
  filterOption: {
    minHeight: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
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
    fontSize: typography.size.lg,
    fontFamily: typefaces.bodyStrong,
  },
  filterOptionDescription: {
    color: palette.muted,
    fontSize: typography.size.sm,
    lineHeight: typography.line.basePlus,
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
    backgroundColor:
      Platform.OS === "android" ? palette.surface : palette.surfaceGlassElevated,
    padding: 12,
    gap: 4,
    alignItems: "center",
  },
  statCardShadow: {
    ...shadows.card,
  },
  statCardCompact: {
    minWidth: 0,
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    position: "relative",
    overflow: "visible",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 4,
    alignItems: "center",
  },
  statCardCompactTight: {
    paddingHorizontal: 10,
    paddingVertical: 0,
    gap: 1,
  },
  statCardSelected: {
    borderRadius: radii.md,
  },
  statCardCompactDivider: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: palette.lineStrong,
  },
  statCardCompactDividerLeft: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: palette.lineStrong,
  },
  statLabel: {
    color: palette.muted,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
    textAlign: "center",
  },
  statLabelCompact: {
    fontSize: typography.size.xs,
    lineHeight: typography.line.sm,
    fontFamily: typefaces.body,
  },
  statLabelCompactTight: {
    fontSize: typography.size.xxs,
    lineHeight: typography.line.xxs,
  },
  statValue: {
    color: palette.textPrimary,
    fontSize: typography.size.h2,
    lineHeight: typography.line.h1,
    fontFamily: typefaces.displayMedium,
    textAlign: "center",
  },
  statValueCompact: {
    fontSize: typography.size.xl,
    lineHeight: typography.line.lgPlus,
  },
  statValueCompactTight: {
    fontSize: typography.size.lg,
    lineHeight: typography.line.lg,
  },
  statSubtitle: {
    color: palette.textTertiary,
    fontSize: typography.size.sm,
    fontFamily: typefaces.body,
    textAlign: "center",
  },
  statSubtitleCompact: {
    fontSize: typography.size.xs,
    lineHeight: typography.line.sm,
  },
  statSubtitleCompactVisible: {
    fontSize: typography.size.xs,
    lineHeight: typography.line.sm,
    fontFamily: typefaces.bodyStrong,
  },
  statSubtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  statSubtitleIcon: {
    marginTop: 0.5,
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
    fontSize: typography.size.xxs,
    lineHeight: typography.line.xs,
    fontFamily: typefaces.bodyStrong,
  },
  requestCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderRow,
    backgroundColor: palette.surfaceRow,
    padding: spacing.md,
    gap: spacing.md,
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  requestCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  requestTitle: {
    color: palette.textPrimary,
    fontSize: typography.size.lg,
    lineHeight: typography.line.lgPlus,
    fontFamily: typefaces.bodyStrong,
  },
  requestBody: {
    color: palette.muted,
    fontSize: typography.size.md,
    lineHeight: typography.line.lg,
    fontFamily: typefaces.body,
  },
  requestMeta: {
    alignItems: "flex-end",
    gap: 8,
    maxWidth: 132,
  },
  requestAmount: {
    color: palette.primaryDeep,
    fontSize: typography.size.base,
    fontFamily: typefaces.numeric,
    fontVariant: ["tabular-nums"],
  },
  requestActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  requestAction: {
    minHeight: 42,
    minWidth: 96,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  requestActionPrimary: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  requestActionSecondary: {
    backgroundColor: palette.surfaceGlassStrong,
    borderColor: palette.borderIndigoSoft,
  },
  requestActionText: {
    color: palette.primary,
    fontSize: typography.size.base,
    fontFamily: typefaces.bodyStrong,
  },
  requestActionTextPrimary: {
    color: palette.surface,
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
    fontSize: typography.size.xs,
    fontFamily: typefaces.bodyStrong,
  },
  avatarOverflow: {
    marginLeft: -10,
    backgroundColor: "rgba(55,48,163,0.12)",
    borderColor: "rgba(255,255,255,0.92)",
  },
  avatarOverflowText: {
    color: palette.primary,
    fontSize: typography.size.xxs,
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
    minHeight: 66,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  listRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.borderRow,
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontSize: typography.size.base,
    fontFamily: typefaces.bodyStrong,
  },
  listAmount: {
    color: palette.textPrimary,
    fontSize: typography.size.base,
    fontFamily: typefaces.numeric,
    fontVariant: ["tabular-nums"],
    textAlign: "right",
  },
  listSubtitle: {
    color: palette.muted,
    fontSize: typography.size.sm,
    lineHeight: typography.line.base,
    fontFamily: typefaces.body,
  },
  listRightColumn: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4,
    minWidth: 92,
  },
  listSupporting: {
    fontSize: typography.size.xs,
    lineHeight: typography.line.sm,
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
    gap: spacing.sm,
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
    fontSize: typography.size.xl,
    fontFamily: typefaces.bodyHeavy,
  },
  progressCopy: {
    flex: 1,
    gap: 4,
  },
  progressTitle: {
    color: palette.textPrimary,
    fontSize: typography.size.lg,
    fontFamily: typefaces.bodyStrong,
  },
  progressSubtitle: {
    color: palette.muted,
    fontSize: typography.size.md,
    lineHeight: typography.line.lg,
    fontFamily: typefaces.body,
  },
  progressValue: {
    color: palette.primaryDeep,
    fontSize: typography.size.base,
    fontFamily: typefaces.bodyStrong,
  },
  progressHelper: {
    color: palette.textTertiary,
    fontSize: typography.size.sm,
    fontFamily: typefaces.body,
  },
  settingsRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor:
      Platform.OS === "android" ? palette.surface : palette.surfaceGlassElevated,
    ...shadows.card,
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
    fontSize: typography.size.base,
    fontFamily: typefaces.bodyStrong,
  },
  settingsSubtitle: {
    color: palette.muted,
    fontSize: typography.size.sm,
    lineHeight: typography.line.basePlus,
    fontFamily: typefaces.body,
  },
  settingsTail: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  settingsValue: {
    color: palette.textTertiary,
    fontSize: typography.size.sm,
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
    ...StyleSheet.absoluteFill,
    backgroundColor: gradients.indigoStart,
  },
  pressed: {
    opacity: 0.78,
  },
});
