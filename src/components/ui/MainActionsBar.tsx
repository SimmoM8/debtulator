import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";

import { Button } from "@/src/components/ui/Primitives";
import { spacing } from "@/src/constants/design";

type ButtonIcon = ComponentProps<typeof Button>["icon"];
type ButtonVariant = ComponentProps<typeof Button>["variant"];

export type MainAction = {
  title: string;
  icon?: ButtonIcon;
  variant?: ButtonVariant;
  disabled?: boolean;
  onPress: () => void;
};

export function MainActionsBar({ actions }: { actions: MainAction[] }) {
  return (
    <View style={styles.actions}>
      {actions.map((action) => (
        <Button
          key={action.title}
          title={action.title}
          icon={action.icon}
          variant={action.variant}
          disabled={action.disabled}
          onPress={action.onPress}
          style={styles.actionButton}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
