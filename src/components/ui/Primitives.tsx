import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette, shadows, spacing, typography } from '@/src/constants/design';

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
      <View style={styles.backdropLavender} />
      <View style={styles.backdropPeach} />
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
      {showBackButton && canGoBack ? <IconButton icon="chevron-back" label="Go back" onPress={() => navigation.goBack()} /> : null}
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
  tone?: 'default' | 'mint' | 'coral' | 'amber' | 'blue' | 'peach' | 'lavender';
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
  secureTextEntry,
  style,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
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

export function FilterSheet({
  visible,
  title = 'Filters',
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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close filters" style={styles.sheetBackdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={styles.flexOne}>
              <Text style={styles.sheetTitle}>{title}</Text>
              {subtitle ? <Text style={styles.sheetSubtitle}>{subtitle}</Text> : null}
            </View>
            <IconButton icon="close" label="Close filters" onPress={onClose} />
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function ResponsiveGrid({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  return <View style={[styles.grid, width >= 820 && styles.gridWide]}>{children}</View>;
}

const toneStyles = StyleSheet.create({
  default: {},
  mint: { backgroundColor: 'rgba(223,248,238,0.72)', borderColor: 'rgba(20,138,104,0.14)' },
  coral: { backgroundColor: 'rgba(255,228,228,0.78)', borderColor: 'rgba(214,66,66,0.18)' },
  amber: { backgroundColor: 'rgba(255,244,214,0.76)', borderColor: 'rgba(183,110,0,0.18)' },
  blue: { backgroundColor: 'rgba(232,227,255,0.62)', borderColor: 'rgba(55,48,163,0.12)' },
  peach: { backgroundColor: 'rgba(255,241,234,0.58)', borderColor: 'rgba(253,186,155,0.24)' },
  lavender: { backgroundColor: 'rgba(255,255,255,0.78)', borderColor: 'rgba(221,214,254,0.56)' },
});

const textVariants = StyleSheet.create({
  body: { color: palette.ink, fontSize: typography.body, lineHeight: 22 },
  muted: { color: palette.muted, fontSize: 14, lineHeight: 20 },
  small: { color: palette.muted, fontSize: typography.micro, lineHeight: 17 },
  label: { color: palette.muted, fontSize: typography.micro, fontWeight: '700', letterSpacing: 0 },
  title: { color: palette.ink, fontSize: 23, fontWeight: '800', lineHeight: 29 },
  subtitle: { color: palette.ink, fontSize: 17, fontWeight: '800', lineHeight: 23 },
});

const buttonVariants = StyleSheet.create({
  primary: { backgroundColor: palette.brand, borderColor: palette.brand },
  secondary: { backgroundColor: 'rgba(255,255,255,0.72)', borderColor: 'rgba(55,48,163,0.14)' },
  ghost: { backgroundColor: 'transparent', borderColor: 'rgba(55,48,163,0.12)' },
  danger: { backgroundColor: palette.negative, borderColor: palette.negative },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  backdropLavender: {
    position: 'absolute',
    pointerEvents: 'none',
    top: -120,
    right: -160,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(221,214,254,0.34)',
  },
  backdropPeach: {
    position: 'absolute',
    pointerEvents: 'none',
    top: 210,
    left: -170,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(253,186,155,0.10)',
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
    backgroundColor: 'rgba(248,246,255,0.94)',
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
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingBottom: spacing.xs,
  },
  flexOne: {
    flex: 1,
  },
  eyebrow: {
    color: palette.brand,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  pageTitle: {
    color: palette.ink,
    fontSize: 30,
    lineHeight: 35,
    fontWeight: '900',
    letterSpacing: 0,
  },
  pageSubtitle: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderColor: 'rgba(221,214,254,0.48)',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
    padding: spacing.lg,
    ...shadows.card,
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
    fontSize: 17,
    lineHeight: 22,
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
    minHeight: 42,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
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
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(55,48,163,0.14)',
    backgroundColor: 'rgba(255,255,255,0.74)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDanger: {
    backgroundColor: palette.negativeSoft,
    borderColor: '#FFC7C7',
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
  },
  input: {
    minHeight: 46,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(55,48,163,0.16)',
    backgroundColor: 'rgba(255,255,255,0.74)',
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
    minHeight: 46,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(55,48,163,0.16)',
    backgroundColor: 'rgba(255,255,255,0.78)',
    paddingHorizontal: spacing.lg,
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
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(55,48,163,0.12)',
    backgroundColor: 'rgba(241,237,255,0.62)',
    padding: 3,
  },
  segment: {
    flex: 1,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    paddingHorizontal: spacing.sm,
  },
  segmentActive: {
    backgroundColor: palette.surface,
    ...shadows.soft,
  },
  segmentText: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: palette.brand,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  selectChip: {
    minHeight: 34,
    paddingHorizontal: spacing.md,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(55,48,163,0.14)',
    backgroundColor: 'rgba(255,255,255,0.68)',
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
    gap: spacing.sm,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,24,39,0.22)',
  },
  sheet: {
    maxHeight: '86%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: 'rgba(252,250,255,0.98)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(221,214,254,0.78)',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    ...shadows.card,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(107,114,128,0.26)',
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  sheetTitle: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: '800',
  },
  sheetSubtitle: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  sheetContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  grid: {
    gap: spacing.md,
  },
  gridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
