import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import {
  ListState,
  type ListStateMessage,
} from "@/src/components/states/ListState";

import { MemberAvatar } from "@/src/features/members/components/MemberAvatar";

import { spacing, textStyles, useAppTheme } from "@/src/theme";

export type MemberSearchResultItem = {
  id: string;
  displayName: string;
  email: string;
};

type MemberSearchResultsListProps = {
  items: readonly MemberSearchResultItem[];
  emptyState: ListStateMessage;
  onPressItem?: (id: string) => void;
};

export function MemberSearchResultsList({
  items,
  emptyState,
  onPressItem,
}: MemberSearchResultsListProps) {
  const theme = useAppTheme();

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
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
            {
              backgroundColor: theme.colors.separator,
            },
          ]}
        />
      )}
      ListEmptyComponent={
        <ListState
          loading={false}
          error={null}
          totalCount={0}
          visibleCount={0}
          emptyState={emptyState}
        />
      }
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole={onPressItem ? "button" : undefined}
          disabled={!onPressItem}
          onPress={() => {
            onPressItem?.(item.id);
          }}
          style={({ pressed }) => [
            styles.row,
            pressed && onPressItem && styles.pressed,
          ]}
        >
          <MemberAvatar displayName={item.displayName} />

          <View style={styles.details}>
            <Text
              numberOfLines={1}
              style={[
                styles.name,
                {
                  color: theme.colors.text,
                },
              ]}
            >
              {item.displayName}
            </Text>

            <Text
              numberOfLines={1}
              style={[
                styles.email,
                {
                  color: theme.colors.secondaryText,
                },
              ]}
            >
              {item.email}
            </Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: spacing.sm,
  },

  emptyContent: {
    flexGrow: 1,
    justifyContent: "center",
  },

  row: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },

  details: {
    flex: 1,
    marginLeft: 14,
  },

  name: {
    ...textStyles.body,
  },

  email: {
    ...textStyles.caption,
    marginTop: 3,
  },

  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg + 44 + 14,
  },

  pressed: {
    opacity: 0.65,
  },
});
