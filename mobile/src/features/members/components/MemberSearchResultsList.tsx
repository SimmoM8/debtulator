import type { ReactNode } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import {
  ListState,
  type ListStateMessage,
} from "@/src/components/states/ListState";
import { MemberAvatar } from "@/src/features/members/components/MemberAvatar";
import type { DiscoveredUser } from "@/src/features/members/model/DiscoveredUser";
import { spacing, textStyles, useAppTheme } from "@/src/theme";

type MemberSearchResultsListProps = {
  items: readonly DiscoveredUser[];
  emptyState: ListStateMessage;
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
  header?: ReactNode;
  onRetry?: () => void | Promise<void>;
  onPressItem?: (id: string) => void;
};

export function MemberSearchResultsList({
  items,
  emptyState,
  loading,
  error,
  disabled,
  header,
  onRetry,
  onPressItem,
}: MemberSearchResultsListProps) {
  const theme = useAppTheme();

  return (
    <FlatList
      style={styles.list}
      data={items}
      keyExtractor={(item) => item.id}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.content,
        items.length === 0 && styles.emptyContent,
      ]}
      ItemSeparatorComponent={() => (
        <View
          style={[
            styles.separator,
            { backgroundColor: theme.colors.separator },
          ]}
        />
      )}
      ListHeaderComponent={header ? <>{header}</> : null}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <ListState
            loading={loading ?? false}
            error={error ?? null}
            totalCount={items.length}
            visibleCount={items.length}
            loadingState={{
              title: "Searching…",
              message: "Searching for Debtulator users.",
            }}
            emptyState={emptyState}
            errorState={{
              title: "Couldn’t search",
              message: error ?? "The search couldn’t be completed.",
            }}
            onRetry={onRetry}
          />
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole={onPressItem && !disabled ? "button" : undefined}
          disabled={!onPressItem || disabled}
          onPress={() => onPressItem?.(item.id)}
          style={({ pressed }) => [
            styles.row,
            pressed && onPressItem && !disabled && styles.pressed,
          ]}
        >
          <MemberAvatar displayName={item.displayName} />

          <View style={styles.details}>
            <Text
              numberOfLines={1}
              style={[styles.name, { color: theme.colors.text }]}
            >
              {item.displayName}
            </Text>

            {item.detail ? (
              <Text
                numberOfLines={1}
                style={[styles.detail, { color: theme.colors.secondaryText }]}
              >
                {item.detail}
              </Text>
            ) : null}
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { paddingVertical: spacing.sm },
  emptyContent: { flexGrow: 1 },
  emptyState: { flex: 1, justifyContent: "center" },
  row: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  details: { flex: 1, marginLeft: 14 },
  name: { ...textStyles.body },
  detail: { ...textStyles.caption, marginTop: 3 },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg + 44 + 14,
  },
  pressed: { opacity: 0.65 },
});
