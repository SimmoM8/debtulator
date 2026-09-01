import { Pressable, StyleSheet, Text, View } from "react-native";

import { MemberAvatar } from "@/src/features/members/components/MemberAvatar";
import type { MemberListItem } from "@/src/features/members/model/MembersScreenModel";
import { textStyles, useAppTheme } from "@/src/theme";

type MembersListProps = {
  items: MemberListItem[];
  onPressItem?: (id: string) => void;
};

export function MembersList({ items, onPressItem }: MembersListProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.container}>
      {items.map((item) => (
        <Pressable
          key={item.id}
          disabled={!onPressItem}
          onPress={() => {
            onPressItem?.(item.id);
          }}
          style={({ pressed }) => [
            styles.row,
            {
              backgroundColor: theme.colors.appBackground,
            },
            pressed && onPressItem && styles.pressed,
          ]}
        >
          <MemberAvatar displayName={item.displayName} />

          <View style={styles.content}>
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
              style={[
                styles.status,
                {
                  color:
                    item.linkStatus === "linked"
                      ? theme.colors.positive
                      : theme.colors.secondaryText,
                },
              ]}
            >
              {item.linkStatus === "linked" ? "Linked" : "Not linked"}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },

  content: {
    flex: 1,
    marginLeft: 14,
  },

  name: {
    ...textStyles.body,
  },

  status: {
    ...textStyles.caption,
    marginTop: 3,
  },

  pressed: {
    opacity: 0.65,
  },
});
