import { Column, Icon, Row, Spacer, Text } from "@expo/ui";

import {
    Children,
    type ComponentProps,
    type PropsWithChildren,
    type ReactNode,
} from "react";

import { StyleSheet } from "react-native";

import {
    getContentSeparatorStyle,
    getContentSurfaceAppearance,
    getContentSurfaceStyle,
    NativeThemeHost,
    spacing,
    textStyles,
    useAppTheme,
    type ContentSurfaceVariant,
} from "@/src/theme";

type NativeIconName = ComponentProps<typeof Icon>["name"];

type GroupedListProps = PropsWithChildren;

export function GroupedList({ children }: GroupedListProps) {
  return (
    <NativeThemeHost
      colorScheme="dark"
      matchContents={{
        vertical: true,
        horizontal: false,
      }}
      style={styles.host}
    >
      <Column spacing={spacing.lg} style={styles.list}>
        {children}
      </Column>
    </NativeThemeHost>
  );
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
    <Column spacing={spacing.sm} style={styles.section}>
      {title ? (
        <Text
          style={styles.sectionTitle}
          textStyle={{
            ...textStyles.caption,
            color: appearance.mutedContentColor,
          }}
        >
          {title}
        </Text>
      ) : null}

      <Column style={getContentSurfaceStyle(theme.colors, variant)}>
        {rows.map((row, index) => (
          <Column key={index}>
            {index > 0 ? (
              <Row style={getContentSeparatorStyle(theme.colors, variant)} />
            ) : null}

            {row}
          </Column>
        ))}
      </Column>
    </Column>
  );
}

type GroupedListRowProps = {
  icon?: NativeIconName;
  label: string;
  value?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  variant?: ContentSurfaceVariant;
};

export function GroupedListRow({
  icon,
  label,
  value,
  trailing,
  onPress,
  variant = "onBrand",
}: GroupedListRowProps) {
  const theme = useAppTheme();

  const appearance = getContentSurfaceAppearance(theme.colors, variant);

  return (
    <Row
      alignment="center"
      spacing={spacing.sm}
      onPress={onPress}
      style={styles.row}
    >
      {icon ? (
        <Icon
          name={icon}
          size={textStyles.body.fontSize}
          color={appearance.contentColor}
        />
      ) : null}

      <Text
        textStyle={{
          ...textStyles.body,
          color: appearance.contentColor,
        }}
      >
        {label}
      </Text>

      <Spacer flexible />

      {value ? (
        <Text
          textStyle={{
            ...textStyles.caption,
            color: appearance.mutedContentColor,
          }}
        >
          {value}
        </Text>
      ) : null}

      {trailing}
    </Row>
  );
}

const styles = StyleSheet.create({
  host: {
    width: "100%",
  },

  list: {
    width: "100%",
  },

  section: {
    width: "100%",
  },

  sectionTitle: {
    paddingHorizontal: spacing.xs,
  },

  row: {
    width: "100%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
