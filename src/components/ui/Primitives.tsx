import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import React from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleProp,
    StyleSheet,
    Text,
    TextInput,
    TextStyle,
    View,
    ViewStyle,
    useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    palette,
    radii,
    shadows,
    spacing,
    typefaces,
    typography,
} from "@/src/constants/design";

type IconName = keyof typeof Ionicons.glyphMap;

export function Screen({
  children,
  scroll = true,
  footer,
  floatingAction,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  footer?: React.ReactNode;
  floatingAction?: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const content = (
    <View style={[styles.content, { maxWidth: width >= 900 ? 1100 : 760 }]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.backdropLavender} />
      <View style={styles.backdropIndigo} />
      <View style={styles.backdropPeach} />
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        <View style={styles.scrollContent}>{content}</View>
      )}
      {floatingAction ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.floatingAction,
            footer ? styles.floatingActionWithFooter : undefined,
          ]}
        >
          {floatingAction}
        </View>
      ) : null}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

export function LoadingState({
  label = "Loading Debtulator",
}: {
  label?: string;
}) {
  return (
    <Screen scroll={false}>
      <View style={styles.loading}>
        <ActivityIndicator color={palette.brand} />
        <Text style={styles.muted}>{label}</Text>
      </View>
    </Screen>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
  showBackButton = true,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  showBackButton?: boolean;
}) {
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();

  return (
    <View style={styles.pageHeader}>
      <SurfaceBlur intensity={28} />
      {showBackButton && canGoBack ? (
        <IconButton
          icon="chevron-back"
          label="Go back"
          onPress={() => navigation.goBack()}
        />
      ) : null}
      <View style={styles.flexOne}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.pageTitle}>{title}</Text>
        {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
      </View>
      {action ? <View style={styles.pageHeaderAction}>{action}</View> : null}
    </View>
  );
}

export function Card({
  children,
  style,
  tone = "default",
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: "default" | "mint" | "coral" | "amber" | "blue" | "peach" | "lavender";
}) {
  return (
    <View style={[styles.card, toneStyles[tone], style]}>
      <SurfaceBlur intensity={24} />
      {children}
    </View>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionTitle}>
      <View style={styles.flexOne}>
        <Text style={styles.sectionHeading}>{title}</Text>
        {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function AppText({
  children,
  variant = "body",
  style,
}: {
  children: React.ReactNode;
  variant?: "body" | "muted" | "small" | "label" | "title" | "subtitle";
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[textVariants[variant], style]}>{children}</Text>;
}

export function Button({
  title,
  onPress,
  icon,
  variant = "primary",
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        buttonVariants[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={18}
          color={variant === "primary" ? "#FFFFFF" : palette.brand}
        />
      ) : null}
      <Text
        style={[
          styles.buttonText,
          variant === "primary" || variant === "danger"
            ? styles.buttonTextLight
            : null,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function FloatingActionButton({
  icon,
  onPress,
  label,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
    >
      <SurfaceBlur intensity={34} />
      <Ionicons name={icon} size={24} color={palette.surface} />
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  tone = "default",
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  tone?: "default" | "danger";
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        tone === "danger" && styles.iconButtonDanger,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={tone === "danger" ? palette.negative : palette.brand}
      />
    </Pressable>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  secureTextEntry,
  style,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
  multiline?: boolean;
  secureTextEntry?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.faint}
        keyboardType={keyboardType}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        style={[styles.input, multiline && styles.inputMultiline]}
      />
    </View>
  );
}

export function SearchField({
  value,
  onChangeText,
  placeholder = "Search",
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.searchField}>
      <Ionicons name="search" size={18} color={palette.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.faint}
        style={styles.searchInput}
      />
    </View>
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text
              style={[styles.segmentText, active && styles.segmentTextActive]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SelectChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.chipWrap}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[styles.selectChip, selected && styles.selectChipActive]}
            >
              <Text
                style={[
                  styles.selectChipText,
                  selected && styles.selectChipTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function MultiSelectChips<T extends string>({
  label,
  options,
  values,
  onChange,
}: {
  label?: string;
  options: { label: string; value: T }[];
  values: T[];
  onChange: (values: T[]) => void;
}) {
  const selectedValues = new Set(values);

  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.chipWrap}>
        {options.map((option) => {
          const selected = selectedValues.has(option.value);
          return (
            <Pressable
              key={option.value}
              onPress={() => {
                const next = selected
                  ? values.filter((value) => value !== option.value)
                  : [...values, option.value];
                onChange(next);
              }}
              style={[styles.selectChip, selected && styles.selectChipActive]}
            >
              <Text
                style={[
                  styles.selectChipText,
                  selected && styles.selectChipTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="file-tray-outline" size={30} color={palette.brand} />
      <Text style={styles.sectionHeading}>{title}</Text>
      <Text style={styles.mutedCenter}>{body}</Text>
      {action}
    </View>
  );
}

export function FilterSheet({
  visible,
  title = "Filters",
  subtitle,
  children,
  onClose,
}: {
  visible: boolean;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.sheetOverlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close filters"
          style={styles.sheetBackdrop}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <SurfaceBlur intensity={34} />
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={styles.flexOne}>
              <Text style={styles.sheetTitle}>{title}</Text>
              {subtitle ? (
                <Text style={styles.sheetSubtitle}>{subtitle}</Text>
              ) : null}
            </View>
            <IconButton icon="close" label="Close filters" onPress={onClose} />
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetContent}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function ResponsiveGrid({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  return (
    <View style={[styles.grid, width >= 820 && styles.gridWide]}>
      {children}
    </View>
  );
}

function SurfaceBlur({ intensity }: { intensity: number }) {
  return (
    <BlurView
      tint="light"
      intensity={intensity}
      experimentalBlurMethod="dimezisBlurView"
      pointerEvents="none"
      style={styles.surfaceBlur}
    />
  );
}

const toneStyles = StyleSheet.create({
  default: {},
  mint: {
    backgroundColor: "rgba(47,191,143,0.12)",
    borderColor: "rgba(47,191,143,0.22)",
  },
  coral: {
    backgroundColor: "rgba(255,107,107,0.12)",
    borderColor: "rgba(255,107,107,0.22)",
  },
  amber: {
    backgroundColor: "rgba(245,158,11,0.12)",
    borderColor: "rgba(245,158,11,0.24)",
  },
  blue: {
    backgroundColor: "rgba(55,48,163,0.08)",
    borderColor: "rgba(55,48,163,0.18)",
  },
  peach: {
    backgroundColor: "rgba(253,186,155,0.16)",
    borderColor: "rgba(253,186,155,0.24)",
  },
  lavender: {
    backgroundColor: palette.surfaceGlassElevated,
    borderColor: "rgba(221,214,254,0.82)",
  },
});

const textVariants = StyleSheet.create({
  body: {
    color: palette.ink,
    fontSize: typography.body,
    lineHeight: 22,
    fontFamily: typefaces.body,
  },
  muted: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typefaces.body,
  },
  small: {
    color: palette.muted,
    fontSize: typography.micro,
    lineHeight: 17,
    fontFamily: typefaces.body,
  },
  label: {
    color: palette.muted,
    fontSize: typography.micro,
    fontFamily: typefaces.bodyStrong,
    letterSpacing: 0,
  },
  title: {
    color: palette.ink,
    fontSize: typography.subtitle,
    fontFamily: typefaces.display,
    lineHeight: 30,
  },
  subtitle: {
    color: palette.ink,
    fontSize: 17,
    fontFamily: typefaces.displayMedium,
    lineHeight: 23,
  },
});

const buttonVariants = StyleSheet.create({
  primary: {
    backgroundColor: palette.brand,
    borderColor: palette.brand,
    ...shadows.soft,
  },
  secondary: {
    backgroundColor: palette.surfaceGlassElevated,
    borderColor: palette.borderIndigo,
  },
  ghost: {
    backgroundColor: palette.surfaceAlt,
    borderColor: palette.borderIndigoSoft,
  },
  danger: { backgroundColor: palette.negative, borderColor: palette.negative },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  backdropLavender: {
    position: "absolute",
    pointerEvents: "none",
    top: -110,
    right: -150,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: palette.backdropLavender,
  },
  backdropIndigo: {
    position: "absolute",
    pointerEvents: "none",
    top: 70,
    right: 18,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: palette.backdropIndigo,
  },
  backdropPeach: {
    position: "absolute",
    pointerEvents: "none",
    top: 240,
    left: -160,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: palette.backdropPeach,
  },
  scrollContent: {
    alignItems: "center",
    paddingBottom: 128,
  },
  content: {
    width: "100%",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    backgroundColor: palette.surfaceGlassStrong,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.borderIndigoSoft,
    overflow: "hidden",
    ...shadows.soft,
  },
  floatingAction: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.xl,
  },
  floatingActionWithFooter: {
    bottom: 96,
  },
  loading: {
    flex: 1,
    minHeight: 360,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: palette.surfaceGlassElevated,
    overflow: "hidden",
    ...shadows.soft,
  },
  flexOne: {
    flex: 1,
  },
  pageHeaderAction: {
    alignSelf: "center",
  },
  eyebrow: {
    color: palette.brandDark,
    fontSize: 11,
    fontFamily: typefaces.bodyStrong,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  pageTitle: {
    color: palette.ink,
    fontSize: typography.title,
    lineHeight: 38,
    fontFamily: typefaces.display,
    letterSpacing: 0,
  },
  pageSubtitle: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
    fontFamily: typefaces.body,
  },
  card: {
    backgroundColor: palette.surfaceGlass,
    borderColor: palette.borderGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.xl,
    padding: spacing.lg,
    overflow: "hidden",
    ...shadows.card,
    gap: spacing.md,
  },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  sectionHeading: {
    color: palette.ink,
    fontSize: 18,
    lineHeight: 24,
    fontFamily: typefaces.displayMedium,
  },
  muted: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typefaces.body,
  },
  mutedCenter: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    fontFamily: typefaces.body,
  },
  button: {
    minHeight: 48,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  buttonText: {
    color: palette.brandDark,
    fontSize: 14,
    fontFamily: typefaces.bodyStrong,
  },
  buttonTextLight: {
    color: palette.surface,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: radii.pill,
    backgroundColor: palette.brand,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderGlass,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...shadows.card,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.72,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: palette.surfaceGlassElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonDanger: {
    backgroundColor: palette.negativeSoft,
    borderColor: "rgba(255,107,107,0.24)",
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    color: palette.muted,
    fontSize: typography.micro,
    fontFamily: typefaces.bodyStrong,
    letterSpacing: 0.2,
  },
  input: {
    minHeight: 52,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: palette.surfaceGlassElevated,
    paddingHorizontal: spacing.md,
    color: palette.ink,
    fontSize: 16,
    fontFamily: typefaces.body,
  },
  inputMultiline: {
    minHeight: 96,
    paddingTop: spacing.md,
    textAlignVertical: "top",
  },
  searchField: {
    minHeight: 52,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: palette.surfaceGlassElevated,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: palette.ink,
    fontSize: 15,
    fontFamily: typefaces.body,
  },
  segmented: {
    flexDirection: "row",
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: palette.surfaceAlt,
    padding: 4,
  },
  segment: {
    flex: 1,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
  },
  segmentActive: {
    backgroundColor: palette.surfaceGlassStrong,
    ...shadows.soft,
  },
  segmentText: {
    color: palette.muted,
    fontSize: 13,
    fontFamily: typefaces.bodyStrong,
  },
  segmentTextActive: {
    color: palette.brand,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  selectChip: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: palette.surfaceGlass,
    justifyContent: "center",
  },
  selectChipActive: {
    backgroundColor: palette.brand,
    borderColor: palette.brand,
  },
  selectChipText: {
    color: palette.muted,
    fontFamily: typefaces.bodyStrong,
    fontSize: 13,
  },
  selectChipTextActive: {
    color: palette.surface,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.overlayStrong,
  },
  sheet: {
    maxHeight: "86%",
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    backgroundColor: palette.surfaceGlassStrong,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderGlass,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    overflow: "hidden",
    ...shadows.card,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(107,114,128,0.22)",
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.borderIndigoSoft,
  },
  sheetTitle: {
    color: palette.ink,
    fontSize: 20,
    fontFamily: typefaces.displayMedium,
  },
  sheetSubtitle: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
    fontFamily: typefaces.body,
  },
  sheetContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  grid: {
    gap: spacing.md,
  },
  gridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  surfaceBlur: {
    ...StyleSheet.absoluteFillObject,
  },
});
