import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Modal,
    Pressable,
    RefreshControl,
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
    typography,
} from "@/src/constants/design";
import { useAuth } from "@/src/state/AuthProvider";

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
  const auth = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const bottomReserve = footer ? 144 : 112;
  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await auth.refreshSync();
    } finally {
      setRefreshing(false);
    }
  };
  const content = (
    <View style={[styles.content, { maxWidth: width >= 960 ? 1100 : 760 }]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <LinearGradient
        colors={["#FCFDFF", "#FEFEFF", "#FFFFFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backdropCanvas}
      />
      <LinearGradient
        colors={[
          "rgba(222,228,248,0.14)",
          "rgba(222,228,248,0.03)",
          "rgba(255,255,255,0)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backdropSheenTop}
      />
      <LinearGradient
        colors={["rgba(214,224,247,0.07)", "rgba(255,255,255,0)"]}
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              colors={[palette.primary]}
              tintColor={palette.primary}
            />
          }
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
  detailLabel,
  title,
  subtitle,
  action,
  showBackButton = true,
}: {
  eyebrow?: string;
  detailLabel?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  showBackButton?: boolean;
}) {
  const canGoBack = router.canGoBack();
  const detailHeader = showBackButton && canGoBack;

  return (
    <View
      style={[
        styles.pageHeader,
        detailHeader ? styles.pageHeaderDetail : styles.pageHeaderRoot,
      ]}
    >
      {detailHeader ? (
        <>
          <View style={styles.pageHeaderEdge}>
            <IconButton
              icon="chevron-back"
              label="Go back"
              onPress={() => router.back()}
            />
          </View>
          <View style={styles.pageHeaderCenter}>
            {detailLabel ? (
              <Text style={styles.pageEyebrowDetail}>{detailLabel}</Text>
            ) : null}
            <Text numberOfLines={1} style={styles.pageTitleDetail}>
              {title}
            </Text>
            {subtitle ? (
              <Text numberOfLines={2} style={styles.pageSubtitleDetail}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <View style={[styles.pageHeaderEdge, styles.pageHeaderEdgeRight]}>
            {action ? action : <View style={styles.pageHeaderActionSpacer} />}
          </View>
        </>
      ) : (
        <>
          <View style={styles.pageHeaderMain}>
            <View style={styles.pageHeaderCopy}>
              {eyebrow ? (
                <Text style={styles.pageEyebrowRoot}>{eyebrow}</Text>
              ) : null}
              <Text style={styles.pageTitleRoot}>{title}</Text>
              {subtitle ? (
                <Text style={styles.pageSubtitleRoot}>{subtitle}</Text>
              ) : null}
            </View>
          </View>
          {action ? (
            <View style={styles.pageHeaderAction}>{action}</View>
          ) : null}
        </>
      )}
    </View>
  );
}

export function Card({
  children,
  style,
  wrapperStyle,
  tone = "default",
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  wrapperStyle?: StyleProp<ViewStyle>;
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
    <GlassCard tone={mappedTone} style={style} wrapperStyle={wrapperStyle}>
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
        {subtitle ? (
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}

export function SectionActionLink({
  label = "View all",
  onPress,
}: {
  label?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.sectionActionLink,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.sectionActionText}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color={palette.primary} />
    </Pressable>
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
  accessibilityHint,
  accessibilityState,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  accessibilityState?: React.ComponentProps<
    typeof Pressable
  >["accessibilityState"];
}) {
  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        ...accessibilityState,
        disabled: Boolean(disabled) || accessibilityState?.disabled,
      }}
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
        size={22}
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
  editable = true,
  style,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?:
    | "default"
    | "numeric"
    | "decimal-pad"
    | "email-address"
    | "phone-pad";
  multiline?: boolean;
  secureTextEntry?: boolean;
  editable?: boolean;
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
          editable={editable}
          style={[styles.input, multiline && styles.inputMultiline]}
        />
      </View>
    </View>
  );
}

export function DropdownSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = "Select",
  style,
}: {
  label?: string;
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [anchor, setAnchor] = React.useState({ x: 0, y: 0, width: 0, height: 0 });
  const anchorRef = React.useRef<View>(null);
  const window = useWindowDimensions();
  const selected = options.find((option) => option.value === value);
  const filteredOptions = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return options;
    }
    return options.filter((option) =>
      option.label.toLowerCase().includes(normalized),
    );
  }, [options, query]);

  const openDropdown = React.useCallback(() => {
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setQuery("");
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  }, []);

  const dropdownPosition = React.useMemo(() => {
    const gutter = spacing.md;
    const gap = spacing.xs;
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

  return (
    <View style={[styles.field, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        ref={anchorRef}
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        accessibilityHint="Opens a dropdown selector"
        onPress={openDropdown}
        style={({ pressed }) => [
          styles.inputShell,
          styles.dropdownShell,
          pressed && styles.pressed,
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.dropdownValue,
            !selected && styles.dropdownPlaceholder,
          ]}
        >
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={palette.primary} />
      </Pressable>

      <Modal
        visible={open}
        animationType="fade"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          accessible={false}
          style={styles.dropdownOverlay}
          onPress={() => setOpen(false)}
        >
          <Pressable
            accessible={false}
            style={[styles.dropdownMenuPosition, dropdownPosition]}
            onPress={(event) => event.stopPropagation()}
          >
            <GlassCard
              wrapperStyle={styles.dropdownMenuWrapper}
              style={styles.dropdownMenu}
            >
              <View style={styles.dropdownSearchShell}>
                <Ionicons name="search" size={16} color={palette.muted} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search"
                  placeholderTextColor={palette.textTertiary}
                  style={styles.dropdownSearchInput}
                />
              </View>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.dropdownList}
              >
                {filteredOptions.map((option) => {
                  const active = option.value === value;
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="button"
                      accessibilityLabel={option.label}
                      accessibilityState={{ selected: active }}
                      onPress={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                      style={({ pressed }) => [
                        styles.dropdownOption,
                        active && styles.dropdownOptionActive,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.dropdownOptionText,
                          active && styles.dropdownOptionTextActive,
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
                  <Text style={styles.dropdownEmpty}>No matches</Text>
                ) : null}
              </ScrollView>
            </GlassCard>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder = "Optional YYYY-MM-DD",
  minDate,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minDate?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [visibleMonth, setVisibleMonth] = React.useState(() =>
    monthFromIso(value),
  );

  const days = React.useMemo(() => calendarDays(visibleMonth), [visibleMonth]);
  const selected = parseIsoDate(value);
  const monthLabel = new Date(
    visibleMonth.year,
    visibleMonth.month,
    1,
  ).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Opens a date picker"
        onPress={() => {
          setVisibleMonth(monthFromIso(value));
          setOpen(true);
        }}
        style={({ pressed }) => [
          styles.inputShell,
          styles.dropdownShell,
          pressed && styles.pressed,
        ]}
      >
        <Text
          numberOfLines={1}
          style={[styles.dropdownValue, !value && styles.dropdownPlaceholder]}
        >
          {value || placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={palette.primary} />
      </Pressable>

      <Modal
        visible={open}
        animationType="fade"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          accessible={false}
          style={[styles.dropdownOverlay, styles.datePickerOverlay]}
          onPress={() => setOpen(false)}
        >
          <Pressable
            accessible={false}
            style={styles.datePickerPosition}
            onPress={(event) => event.stopPropagation()}
          >
            <GlassCard
              wrapperStyle={styles.datePickerMenuWrapper}
              style={styles.datePickerMenu}
            >
            <View style={styles.datePickerHeader}>
              <IconButton
                icon="chevron-back"
                label="Previous month"
                onPress={() =>
                  setVisibleMonth((current) => shiftMonth(current, -1))
                }
              />
              <Text style={styles.dropdownTitle}>{monthLabel}</Text>
              <IconButton
                icon="chevron-forward"
                label="Next month"
                onPress={() =>
                  setVisibleMonth((current) => shiftMonth(current, 1))
                }
              />
            </View>
            <View style={styles.weekdayRow}>
              {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                <Text key={`${day}-${index}`} style={styles.weekdayLabel}>
                  {day}
                </Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {days.map((day, index) => {
                const iso = day ? formatIsoDate(day) : "";
                const disabled = Boolean(day && minDate && iso < minDate);
                const active = Boolean(
                  day &&
                  selected &&
                  day.year === selected.year &&
                  day.month === selected.month &&
                  day.day === selected.day,
                );
                return day ? (
                  <Pressable
                    key={iso}
                    accessibilityRole="button"
                    accessibilityLabel={iso}
                    accessibilityState={{ selected: active, disabled }}
                    disabled={disabled}
                    onPress={() => {
                      onChange(iso);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.calendarDay,
                      active && styles.calendarDayActive,
                      disabled && styles.calendarDayDisabled,
                      pressed && !disabled && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        active && styles.calendarDayTextActive,
                        disabled && styles.calendarDayTextDisabled,
                      ]}
                    >
                      {day.day}
                    </Text>
                  </Pressable>
                ) : (
                  <View
                    key={`empty-${index}`}
                    style={styles.calendarDayPlaceholder}
                  />
                );
              })}
            </View>
            <View style={styles.datePickerActions}>
              <Button
                title="Clear"
                variant="ghost"
                onPress={() => {
                  onChange("");
                  setOpen(false);
                }}
              />
              <Button
                title="Today"
                variant="secondary"
                onPress={() => {
                  const today = todayIso();
                  onChange(minDate && today < minDate ? minDate : today);
                  setOpen(false);
                }}
              />
            </View>
            </GlassCard>
          </Pressable>
        </Pressable>
      </Modal>
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
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.segmented}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: active }}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.segment,
                active && styles.segmentActive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[styles.segmentText, active && styles.segmentTextActive]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

export function SlidingSectionSwitcher<T extends string>({
  sections,
  activeSection,
  onChange,
}: {
  sections: { key: T; label: string }[];
  activeSection: T;
  onChange: (section: T) => void;
}) {
  const [width, setWidth] = useState(0);
  const [translate] = useState(() => new Animated.Value(0));
  const activeIndex = Math.max(
    sections.findIndex((section) => section.key === activeSection),
    0,
  );
  const segmentWidth = sections.length > 0 ? width / sections.length : 0;

  useEffect(() => {
    Animated.timing(translate, {
      toValue: activeIndex * segmentWidth,
      duration: 210,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, segmentWidth, translate]);

  return (
    <View style={styles.sectionSwitcherShell}>
      <View
        style={styles.sectionSwitcher}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      >
        {width ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.sectionSwitcherThumb,
              {
                width: segmentWidth - 8,
                transform: [{ translateX: translate }],
              },
            ]}
          />
        ) : null}
        {sections.map((section) => {
          const active = section.key === activeSection;
          return (
            <Pressable
              key={section.key}
              accessibilityRole="tab"
              accessibilityLabel={section.label}
              accessibilityState={{ selected: active }}
              onPress={() => onChange(section.key)}
              style={({ pressed }) => [
                styles.sectionSwitcherItem,
                pressed && styles.pressed,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.sectionSwitcherText,
                  active && styles.sectionSwitcherTextActive,
                ]}
              >
                {section.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
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

type CalendarDate = { year: number; month: number; day: number };
type CalendarMonth = { year: number; month: number };

function todayIso() {
  return formatIsoDate({
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    day: new Date().getDate(),
  });
}

function parseIsoDate(value: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const candidate = new Date(year, month, day);
  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month ||
    candidate.getDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function monthFromIso(value: string): CalendarMonth {
  const parsed = parseIsoDate(value);
  const today = new Date();
  return {
    year: parsed?.year ?? today.getFullYear(),
    month: parsed?.month ?? today.getMonth(),
  };
}

function shiftMonth(current: CalendarMonth, delta: number): CalendarMonth {
  const next = new Date(current.year, current.month + delta, 1);
  return { year: next.getFullYear(), month: next.getMonth() };
}

function calendarDays(month: CalendarMonth): (CalendarDate | null)[] {
  const firstDay = new Date(month.year, month.month, 1).getDay();
  const daysInMonth = new Date(month.year, month.month + 1, 0).getDate();
  const days: (CalendarDate | null)[] = Array.from(
    { length: firstDay },
    () => null,
  );

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({ ...month, day });
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

function formatIsoDate(date: CalendarDate) {
  return `${date.year}-${String(date.month + 1).padStart(2, "0")}-${String(
    date.day,
  ).padStart(2, "0")}`;
}

const textVariants = StyleSheet.create({
  body: {
    color: palette.textPrimary,
    fontSize: typography.body,
    lineHeight: typography.line.h2,
    fontFamily: typefaces.body,
  },
  muted: {
    color: palette.muted,
    fontSize: typography.size.base,
    lineHeight: typography.line.xl,
    fontFamily: typefaces.body,
  },
  small: {
    color: palette.muted,
    fontSize: typography.micro,
    lineHeight: typography.line.basePlus,
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
    lineHeight: typography.line.displaySm,
  },
  subtitle: {
    color: palette.textPrimary,
    fontSize: typography.size.xlPlus,
    fontFamily: typefaces.displayMedium,
    lineHeight: typography.line.h2,
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
    ...StyleSheet.absoluteFill,
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
    paddingTop: spacing.md,
    gap: spacing.xxl,
  },
  footerWrap: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 0,
  },
  footer: {
    padding: 10,
    borderRadius: 26,
  },
  floatingAction: {
    position: "absolute",
    right: 18,
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
    fontSize: typography.size.xxl,
    fontFamily: typefaces.displayMedium,
  },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  pageHeaderRoot: {
    minHeight: 40,
  },
  pageHeaderDetail: {
    minHeight: 40,
  },
  pageHeaderMain: {
    flex: 1,
    minWidth: 0,
  },
  pageHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  pageHeaderCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  pageHeaderEdge: {
    width: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  pageHeaderEdgeRight: {
    alignItems: "flex-end",
  },
  pageHeaderActionSpacer: {
    width: 40,
    height: 40,
  },
  pageHeaderAction: {
    alignSelf: "center",
  },
  pageEyebrowDetail: {
    color: palette.primary,
    fontSize: typography.size.xs,
    lineHeight: typography.line.sm,
    fontFamily: typefaces.bodyStrong,
    letterSpacing: 0.2,
  },
  pageTitleRoot: {
    color: palette.textPrimary,
    fontSize: typography.size.h2,
    lineHeight: typography.line.h2,
    fontFamily: typefaces.displayMedium,
  },
  pageEyebrowRoot: {
    color: palette.primary,
    fontSize: typography.size.xs,
    lineHeight: typography.line.sm,
    fontFamily: typefaces.bodyStrong,
    textTransform: "uppercase",
  },
  pageSubtitleRoot: {
    color: palette.muted,
    fontSize: typography.size.base,
    lineHeight: typography.line.lg,
    fontFamily: typefaces.body,
    marginTop: 4,
    maxWidth: 620,
  },
  pageTitleDetail: {
    color: palette.textPrimary,
    fontSize: typography.size.base,
    lineHeight: typography.line.lg,
    fontFamily: typefaces.bodyStrong,
    textAlign: "center",
  },
  pageSubtitleDetail: {
    color: palette.muted,
    fontSize: typography.size.xs,
    lineHeight: typography.line.sm,
    fontFamily: typefaces.body,
    textAlign: "center",
    maxWidth: 520,
  },
  flexOne: {
    flex: 1,
  },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sectionHeading: {
    color: palette.textPrimary,
    fontSize: typography.size.xl,
    lineHeight: typography.line.xl,
    fontFamily: typefaces.displayMedium,
  },
  sectionSubtitle: {
    color: palette.muted,
    fontSize: typography.size.md,
    lineHeight: typography.line.lg,
    fontFamily: typefaces.body,
    marginTop: 2,
  },
  sectionActionLink: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 2,
  },
  sectionActionText: {
    color: palette.primary,
    fontSize: typography.size.md,
    lineHeight: typography.line.base,
    fontFamily: typefaces.bodyStrong,
  },
  muted: {
    color: palette.muted,
    fontSize: typography.size.base,
    lineHeight: typography.line.xl,
    fontFamily: typefaces.body,
  },
  mutedCenter: {
    color: palette.muted,
    fontSize: typography.size.base,
    lineHeight: typography.line.xl,
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
    fontSize: typography.size.base,
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
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 0,
    borderColor: "transparent",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonDanger: {
    backgroundColor: "transparent",
  },
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
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },
  inputShellMultiline: {
    paddingVertical: 12,
  },
  input: {
    color: palette.textPrimary,
    fontSize: typography.size.base,
    lineHeight: typography.line.base,
    fontFamily: typefaces.body,
  },
  inputMultiline: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  dropdownShell: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dropdownValue: {
    flex: 1,
    color: palette.textPrimary,
    fontSize: typography.size.base,
    lineHeight: typography.line.base,
    fontFamily: typefaces.bodyStrong,
  },
  dropdownPlaceholder: {
    color: palette.textTertiary,
    fontFamily: typefaces.body,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.42)",
  },
  dropdownMenuPosition: {
    position: "absolute",
  },
  dropdownMenuWrapper: {
    width: "100%",
    maxHeight: "100%",
  },
  dropdownMenu: {
    maxHeight: "100%",
    gap: spacing.sm,
    padding: spacing.md,
  },
  dropdownTitle: {
    color: palette.textPrimary,
    fontSize: typography.size.lg,
    fontFamily: typefaces.displayMedium,
  },
  dropdownSearchShell: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: "rgba(255,255,255,0.72)",
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  dropdownSearchInput: {
    flex: 1,
    color: palette.textPrimary,
    fontSize: typography.size.base,
    fontFamily: typefaces.body,
  },
  dropdownList: {
    gap: 6,
  },
  dropdownEmpty: {
    color: palette.muted,
    fontSize: typography.size.sm,
    fontFamily: typefaces.body,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  dropdownOption: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dropdownOptionActive: {
    backgroundColor: palette.surfaceGlassStrong,
    ...shadows.soft,
  },
  dropdownOptionText: {
    flex: 1,
    color: palette.textSecondary,
    fontSize: typography.size.base,
    fontFamily: typefaces.bodyStrong,
  },
  dropdownOptionTextActive: {
    color: palette.primary,
  },
  datePickerMenu: {
    gap: spacing.md,
    padding: spacing.md,
  },
  datePickerOverlay: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },
  datePickerPosition: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "100%",
  },
  datePickerMenuWrapper: {
    width: "100%",
    maxHeight: "100%",
  },
  datePickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  weekdayRow: {
    flexDirection: "row",
  },
  weekdayLabel: {
    width: `${100 / 7}%`,
    color: palette.muted,
    fontSize: typography.size.xs,
    fontFamily: typefaces.bodyStrong,
    textAlign: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  calendarDayActive: {
    backgroundColor: palette.surfaceGlassStrong,
    ...shadows.soft,
  },
  calendarDayDisabled: {
    opacity: 0.32,
  },
  calendarDayText: {
    color: palette.textSecondary,
    fontSize: typography.size.base,
    fontFamily: typefaces.bodyStrong,
  },
  calendarDayTextActive: {
    color: palette.primary,
  },
  calendarDayTextDisabled: {
    color: palette.faint,
  },
  calendarDayPlaceholder: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
  },
  datePickerActions: {
    flexDirection: "row",
    gap: spacing.sm,
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
    minWidth: 92,
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
    fontSize: typography.size.md,
    fontFamily: typefaces.bodyStrong,
  },
  segmentTextActive: {
    color: palette.primary,
  },
  sectionSwitcherShell: {
    marginBottom: spacing.md,
  },
  sectionSwitcher: {
    position: "relative",
    flexDirection: "row",
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    backgroundColor: palette.surfaceMuted,
    padding: 4,
    overflow: "hidden",
  },
  sectionSwitcherThumb: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: radii.pill,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
  },
  sectionSwitcherItem: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xs,
  },
  sectionSwitcherText: {
    color: palette.textSecondary,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
  },
  sectionSwitcherTextActive: {
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
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
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
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    maxHeight: "82%",
    paddingTop: 8,
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
    fontSize: typography.size.h3,
    fontFamily: typefaces.displayMedium,
  },
  sheetSubtitle: {
    color: palette.muted,
    fontSize: typography.size.md,
    lineHeight: typography.line.lg,
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
