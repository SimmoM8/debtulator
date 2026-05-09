import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
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
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
    FilterChip,
    FloatingAddButton,
    GlassCard,
    SearchBar,
} from "@/src/components/ui/Finance";
import {
    palette,
    radii,
    shadows,
    spacing,
    typefaces,
    typography
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
  const insets = useSafeAreaInsets();
  const bottomReserve = footer ? 144 : 112;
  const content = (
    <View style={[styles.content, { maxWidth: width >= 960 ? 1100 : 760 }]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <LinearGradient
        colors={["#F6F3FF", "#FBF8FF", "#FFF9F7"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backdropCanvas}
      />
      <LinearGradient
        colors={[
          "rgba(221,214,254,0.32)",
          "rgba(221,214,254,0.06)",
          "rgba(255,255,255,0)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backdropSheenTop}
      />
      <LinearGradient
        colors={["rgba(253,186,155,0.12)", "rgba(255,255,255,0)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backdropSheenBottom}
      />
      {scroll ? (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottomReserve + insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        <View
          style={[
            styles.scrollContent,
            { paddingBottom: bottomReserve + insets.bottom },
          ]}
        >
          {content}
        </View>
      )}
      {floatingAction ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.floatingAction,
            { bottom: (footer ? 112 : 28) + insets.bottom },
          ]}
        >
          {floatingAction}
        </View>
      ) : null}
      {footer ? (
        <View
          style={[styles.footerWrap, { paddingBottom: insets.bottom + 10 }]}
        >
          <GlassCard style={styles.footer}>{footer}</GlassCard>
        </View>
      ) : null}
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
        <GlassCard style={styles.loadingCard}>
          <ActivityIndicator color={palette.primary} />
          <Text style={styles.loadingTitle}>Opening your ledger</Text>
          <Text style={styles.muted}>{label}</Text>
        </GlassCard>
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
      <View style={styles.pageHeaderMain}>
        {showBackButton && canGoBack ? (
          <IconButton
            icon="chevron-back"
            label="Go back"
            onPress={() => navigation.goBack()}
          />
        ) : null}
        <View style={styles.pageHeaderCopy}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.pageTitle}>{title}</Text>
          {subtitle ? (
            <Text style={styles.pageSubtitle}>{subtitle}</Text>
          ) : null}
        </View>
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
  const mappedTone =
    tone === "mint"
      ? "teal"
      : tone === "blue"
        ? "indigo"
        : tone === "default"
          ? "lavender"
          : tone;

  return (
    <GlassCard tone={mappedTone} style={style}>
      {children}
    </GlassCard>
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
      {variant === "primary" ? <View style={styles.buttonPrimaryGlow} /> : null}
      {icon ? (
        <Ionicons
          name={icon}
          size={18}
          color={
            variant === "primary" || variant === "danger"
              ? palette.surface
              : palette.primary
          }
        />
      ) : null}
      <Text
        style={[
          styles.buttonText,
          (variant === "primary" || variant === "danger") &&
            styles.buttonTextLight,
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
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.fabWrap}
    >
      <FloatingAddButton onPress={onPress} />
      <Text style={styles.srOnly}>{icon}</Text>
    </View>
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
        color={tone === "danger" ? palette.danger : palette.primary}
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
      <View
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
          style={[styles.input, multiline && styles.inputMultiline]}
        />
      </View>
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
    <SearchBar
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
    />
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
            style={({ pressed }) => [
              styles.segment,
              active && styles.segmentActive,
              pressed && styles.pressed,
            ]}
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
        {options.map((option) => (
          <FilterChip
            key={option.value}
            label={option.label}
            active={option.value === value}
            onPress={() => onChange(option.value)}
          />
        ))}
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
            <FilterChip
              key={option.value}
              label={option.label}
              active={selected}
              onPress={() => {
                const next = selected
                  ? values.filter((valueItem) => valueItem !== option.value)
                  : [...values, option.value];
                onChange(next);
              }}
            />
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
      <View style={styles.emptyIcon}>
        <Ionicons name="sparkles-outline" size={20} color={palette.primary} />
      </View>
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
      animationType="fade"
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
        <GlassCard style={styles.sheet}>
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
        </GlassCard>
      </View>
    </Modal>
  );
}

export function ResponsiveGrid({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  return <View style={[styles.grid, wide && styles.gridWide]}>{children}</View>;
}

const textVariants = StyleSheet.create({
  body: {
    color: palette.textPrimary,
    fontSize: typography.body,
    lineHeight: 24,
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
    letterSpacing: 0.1,
  },
  title: {
    color: palette.textPrimary,
    fontSize: typography.subtitle,
    fontFamily: typefaces.display,
    lineHeight: 30,
  },
  subtitle: {
    color: palette.textPrimary,
    fontSize: 17,
    fontFamily: typefaces.displayMedium,
    lineHeight: 24,
  },
});

const buttonVariants = StyleSheet.create({
  primary: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  secondary: {
    backgroundColor: palette.surfaceGlassStrong,
    borderColor: palette.borderIndigoSoft,
  },
  ghost: {
    backgroundColor: "rgba(255,255,255,0.48)",
    borderColor: "transparent",
  },
  danger: {
    backgroundColor: palette.danger,
    borderColor: palette.danger,
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  backdropCanvas: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropSheenTop: {
    position: "absolute",
    top: -48,
    right: -24,
    width: 280,
    height: 200,
    borderRadius: 40,
    transform: [{ rotate: "-8deg" }],
  },
  backdropSheenBottom: {
    position: "absolute",
    bottom: 84,
    left: -12,
    width: 260,
    height: 180,
    borderRadius: 40,
    transform: [{ rotate: "6deg" }],
  },
  scrollContent: {
    alignItems: "center",
  },
  content: {
    width: "100%",
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
  footerWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 0,
  },
  footer: {
    padding: 10,
    borderRadius: 26,
  },
  floatingAction: {
    position: "absolute",
    right: 24,
  },
  loading: {
    flex: 1,
    minHeight: 380,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingCard: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 220,
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  loadingTitle: {
    color: palette.textPrimary,
    fontSize: 18,
    fontFamily: typefaces.displayMedium,
  },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  pageHeaderMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  pageHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  pageHeaderAction: {
    alignSelf: "flex-start",
  },
  eyebrow: {
    color: palette.primary,
    fontSize: 12,
    fontFamily: typefaces.bodyStrong,
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  pageTitle: {
    color: palette.textPrimary,
    fontSize: 30,
    lineHeight: 34,
    fontFamily: typefaces.display,
  },
  pageSubtitle: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    fontFamily: typefaces.body,
    maxWidth: 560,
  },
  flexOne: {
    flex: 1,
  },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  sectionHeading: {
    color: palette.textPrimary,
    fontSize: 20,
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
    minHeight: 52,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    overflow: "hidden",
    ...shadows.soft,
  },
  buttonPrimaryGlow: {
    position: "absolute",
    top: -20,
    right: -10,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  buttonText: {
    color: palette.primary,
    fontSize: 14,
    fontFamily: typefaces.bodyStrong,
  },
  buttonTextLight: {
    color: palette.surface,
  },
  fabWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  srOnly: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.76,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: palette.surfaceGlassStrong,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft,
  },
  iconButtonDanger: {
    backgroundColor: palette.dangerSoft,
    borderColor: "rgba(255,107,107,0.24)",
  },
  field: {
    gap: 10,
  },
  label: {
    color: palette.muted,
    fontSize: 12,
    fontFamily: typefaces.bodyStrong,
    letterSpacing: 0.2,
  },
  inputShell: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: "rgba(255,255,255,0.68)",
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },
  inputShellMultiline: {
    paddingVertical: 12,
  },
  input: {
    color: palette.textPrimary,
    fontSize: 16,
    fontFamily: typefaces.body,
  },
  inputMultiline: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  segmented: {
    flexDirection: "row",
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: "rgba(255,255,255,0.54)",
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
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
    color: palette.primary,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(55,48,163,0.1)",
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(17,24,39,0.16)",
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    maxHeight: "82%",
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 52,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: "rgba(107,114,128,0.22)",
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  sheetTitle: {
    color: palette.textPrimary,
    fontSize: 20,
    fontFamily: typefaces.displayMedium,
  },
  sheetSubtitle: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    fontFamily: typefaces.body,
  },
  sheetContent: {
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 20,
  },
  grid: {
    gap: spacing.md,
  },
  gridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
  },
});
