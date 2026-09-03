import { SymbolView } from "expo-symbols";
import type { ComponentProps, PropsWithChildren, ReactNode } from "react";
import { Children } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
    getContentSeparatorStyle,
    getContentSurfaceAppearance,
    getContentSurfaceStyle,
    spacing,
    textStyles,
    useAppTheme,
    type ContentSurfaceVariant,
} from "@/src/theme";

type NativeIconName = ComponentProps<typeof SymbolView>["name"];

type GroupedListProps = PropsWithChildren;

export function GroupedList({ children }: GroupedListProps) {
  return <View style={styles.list}>{children}</View>;
}

type GroupedListSectionProps = PropsWithChildren<{
  title?: string;
  variant?: ContentSurfaceVariant;
}>;

export function GroupedListSection({
  title,
  variant = "onBrand",
  children,
}: GroupedListSectionProps) {
  const theme = useAppTheme();
  const rows = Children.toArray(children);
  const appearance = getContentSurfaceAppearance(theme.colors, variant);

  return (
    <View style={styles.section}>
      {title ? (
        <Text
          style={[
            styles.sectionTitle,
            {
              color: appearance.mutedContentColor,
            },
          ]}
        >
          {title}
        </Text>
      ) : null}

      <View style={getContentSurfaceStyle(theme.colors, variant)}>
        {rows.map((row, index) => (
          <View key={index}>
            {index > 0 ? (
              <View style={getContentSeparatorStyle(theme.colors, variant)} />
            ) : null}
            {row}
          </View>
        ))}
      </View>
    </View>
  );
}

type GroupedListRowProps = {
  icon?: NativeIconName;
  label: string;
  value?: string;
  trailing?: ReactNode;
  trailingIcon?: NativeIconName;
  onPress?: () => void;
  variant?: ContentSurfaceVariant;
};

export function GroupedListRow({
  icon,
  label,
  value,
  trailing,
  trailingIcon,
  onPress,
  variant = "onBrand",
}: GroupedListRowProps) {
  const theme = useAppTheme();
  const appearance = getContentSurfaceAppearance(theme.colors, variant);

  const content = (
    <>
      {icon ? (
        <SymbolView
          name={icon}
          size={textStyles.body.fontSize}
          tintColor={appearance.contentColor}
        />
      ) : null}

      <Text
        numberOfLines={1}
        style={[
          styles.label,
          {
            color: appearance.contentColor,
          },
        ]}
      >
        {label}
      </Text>

      <View style={styles.spacer} />

      {value ? (
        <Text
          numberOfLines={1}
          style={[
            styles.value,
            {
              color: appearance.mutedContentColor,
            },
          ]}
        >
          {value}
        </Text>
      ) : null}

      {trailing}

      {trailingIcon ? (
        <SymbolView
          name={trailingIcon}
          size={textStyles.body.fontSize}
          tintColor={appearance.mutedContentColor}
        />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.row}>{content}</View>;
}

const styles = StyleSheet.create({
  list: {
    width: "100%",
    gap: spacing.lg,
  },
  section: {
    width: "100%",
    gap: spacing.sm,
  },
  sectionTitle: {
    ...textStyles.caption,
    paddingHorizontal: spacing.xs,
  },
  row: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  label: {
    ...textStyles.body,
  },
  value: {
    ...textStyles.caption,
    flexShrink: 1,
  },
  spacer: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});
