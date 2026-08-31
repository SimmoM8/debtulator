import { Pressable, StyleSheet, Text, View } from "react-native";

import type {
    MemberLinkStatus,
    MemberListItem,
} from "@/src/features/members/model/MembersScreenModel";
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
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: theme.colors.controlContainer,
              },
            ]}
          >
            <Text
              style={[
                styles.avatarText,
                {
                  color: theme.colors.onControlContainer,
                },
              ]}
            >
              {getInitials(item.displayName)}
            </Text>
          </View>

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
              {getLinkStatusLabel(item.linkStatus)}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function getLinkStatusLabel(status: MemberLinkStatus): string {
  return status === "linked" ? "Linked" : "Not linked";
}

function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  const initials = parts
    .map((part) => part.charAt(0))
    .join("")
    .toLocaleUpperCase();

  return initials || "?";
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

  avatar: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },

  avatarText: {
    ...textStyles.headline,
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
