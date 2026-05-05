import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette, radii, spacing } from '@/src/constants/design';

type IconName = keyof typeof Ionicons.glyphMap;

export function Screen({
  children,
  scroll = true,
  footer,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  footer?: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const content = <View style={[styles.content, { maxWidth: width >= 900 ? 1100 : 760 }]}>{children}</View>;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        <View style={styles.scrollContent}>{content}</View>
      )}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

export function LoadingState({ label = 'Loading Debtulator' }: { label?: string }) {
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
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.pageHeader}>
      <View style={styles.flexOne}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.pageTitle}>{title}</Text>
        {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
      </View>
      {action ? <View>{action}</View> : null}
    </View>
  );
}

export function Card({
  children,
  style,
  tone = 'default',
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'mint' | 'coral' | 'amber' | 'blue';
}) {
  return <View style={[styles.card, toneStyles[tone], style]}>{children}</View>;
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
  variant = 'body',
  style,
}: {
  children: React.ReactNode;
  variant?: 'body' | 'muted' | 'small' | 'label' | 'title' | 'subtitle';
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[textVariants[variant], style]}>{children}</Text>;
}

export function Button({
  title,
  onPress,
  icon,
  variant = 'primary',
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
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
      ]}>
      {icon ? <Ionicons name={icon} size={18} color={variant === 'primary' ? '#FFFFFF' : palette.brand} /> : null}
      <Text style={[styles.buttonText, variant === 'primary' || variant === 'danger' ? styles.buttonTextLight : null]}>
        {title}
      </Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  tone = 'default',
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  tone?: 'default' | 'danger';
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, tone === 'danger' && styles.iconButtonDanger, pressed && styles.pressed]}>
      <Ionicons name={icon} size={20} color={tone === 'danger' ? palette.negative : palette.brand} />
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
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.faint}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.input, multiline && styles.inputMultiline]}
      />
    </View>
  );
}

export function SearchField({
  value,
  onChangeText,
  placeholder = 'Search',
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
            style={[styles.segment, active && styles.segmentActive]}>
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text>
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
              style={[styles.selectChip, selected && styles.selectChipActive]}>
              <Text style={[styles.selectChipText, selected && styles.selectChipTextActive]}>{option.label}</Text>
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
              style={[styles.selectChip, selected && styles.selectChipActive]}>
              <Text style={[styles.selectChipText, selected && styles.selectChipTextActive]}>{option.label}</Text>
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

export function ResponsiveGrid({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  return <View style={[styles.grid, width >= 820 && styles.gridWide]}>{children}</View>;
}

const toneStyles = StyleSheet.create({
  default: {},
  mint: { backgroundColor: palette.surfaceAlt, borderColor: '#C8DDD5' },
  coral: { backgroundColor: palette.coralSoft, borderColor: '#F3C5BA' },
  amber: { backgroundColor: palette.amberSoft, borderColor: '#EBD49B' },
  blue: { backgroundColor: palette.blueSoft, borderColor: '#C8D6F1' },
});

const textVariants = StyleSheet.create({
  body: { color: palette.ink, fontSize: 15, lineHeight: 22 },
  muted: { color: palette.muted, fontSize: 14, lineHeight: 20 },
  small: { color: palette.muted, fontSize: 12, lineHeight: 17 },
  label: { color: palette.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0, textTransform: 'uppercase' },
  title: { color: palette.ink, fontSize: 24, fontWeight: '800', lineHeight: 30 },
  subtitle: { color: palette.ink, fontSize: 18, fontWeight: '800', lineHeight: 24 },
});

const buttonVariants = StyleSheet.create({
  primary: { backgroundColor: palette.brand, borderColor: palette.brand },
  secondary: { backgroundColor: palette.brandSoft, borderColor: '#BFDCD4' },
  ghost: { backgroundColor: 'transparent', borderColor: palette.line },
  danger: { backgroundColor: palette.negative, borderColor: palette.negative },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 112,
  },
  content: {
    width: '100%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    backgroundColor: 'rgba(246,244,238,0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  loading: {
    flex: 1,
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  flexOne: {
    flex: 1,
  },
  eyebrow: {
    color: palette.brand,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  pageTitle: {
    color: palette.ink,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: 0,
  },
  pageSubtitle: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 2,
    gap: spacing.md,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  sectionHeading: {
    color: palette.ink,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
  },
  muted: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  mutedCenter: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  button: {
    minHeight: 44,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  buttonText: {
    color: palette.brand,
    fontSize: 14,
    fontWeight: '800',
  },
  buttonTextLight: {
    color: '#FFFFFF',
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.72,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDanger: {
    backgroundColor: palette.negativeSoft,
    borderColor: '#EDC3BC',
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.lineStrong,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    color: palette.ink,
    fontSize: 16,
  },
  inputMultiline: {
    minHeight: 96,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  searchField: {
    minHeight: 48,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: palette.ink,
    fontSize: 15,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: '#ECE7DC',
    padding: 3,
  },
  segment: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
  },
  segmentActive: {
    backgroundColor: palette.surface,
    shadowColor: palette.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  segmentText: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: palette.ink,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  selectChip: {
    minHeight: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  selectChipActive: {
    backgroundColor: palette.brand,
    borderColor: palette.brand,
  },
  selectChipText: {
    color: palette.muted,
    fontWeight: '700',
    fontSize: 13,
  },
  selectChipTextActive: {
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  grid: {
    gap: spacing.md,
  },
  gridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
