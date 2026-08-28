import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { spacing, textStyles, useAppTheme } from "@/src/theme";

export type ListStateMessage = {
  title: string;
  message?: string;
};

type ListStateProps = {
  loading: boolean;
  error: string | null;
  totalCount: number;
  visibleCount: number;
  loadingState?: ListStateMessage;
  emptyState: ListStateMessage;
  noResultsState?: ListStateMessage;
  errorState?: ListStateMessage;
  onRetry?: () => void | Promise<void>;
};

export function ListState({
  loading,
  error,
  totalCount,
  visibleCount,
  loadingState = {
    title: "Loading…",
  },
  emptyState,
  noResultsState,
  errorState = {
    title: "Couldn’t load data",
    message: "Something went wrong while loading this data.",
  },
  onRetry,
}: ListStateProps) {
  if (loading) {
    return (
      <ListStateMessageView
        title={loadingState.title}
        message={loadingState.message}
        loading
      />
    );
  }

  if (error) {
    return (
      <ListStateMessageView
        title={errorState.title}
        message={errorState.message}
        actionLabel={onRetry ? "Try Again" : undefined}
        onAction={onRetry}
      />
    );
  }

  if (totalCount === 0) {
    return (
      <ListStateMessageView
        title={emptyState.title}
        message={emptyState.message}
      />
    );
  }

  if (visibleCount === 0 && noResultsState) {
    return (
      <ListStateMessageView
        title={noResultsState.title}
        message={noResultsState.message}
      />
    );
  }

  return null;
}

type ListStateMessageViewProps = {
  title: string;
  message?: string;
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
};

function ListStateMessageView({
  title,
  message,
  loading = false,
  actionLabel,
  onAction,
}: ListStateMessageViewProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator
          style={styles.activityIndicator}
          color={theme.colors.controlTint}
        />
      ) : null}

      <Text
        style={[
          styles.title,
          {
            color: theme.colors.text,
          },
        ]}
      >
        {title}
      </Text>

      {message ? (
        <Text
          style={[
            styles.message,
            {
              color: theme.colors.secondaryText,
            },
          ]}
        >
          {message}
        </Text>
      ) : null}

      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void onAction();
          }}
          style={({ pressed }) => [
            styles.action,
            {
              backgroundColor: theme.colors.controlContainer,
            },
            pressed && styles.pressed,
          ]}
        >
          <Text
            style={[
              styles.actionText,
              {
                color: theme.colors.onControlContainer,
              },
            ]}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  activityIndicator: {
    marginBottom: spacing.md,
  },
  title: {
    ...textStyles.headline,
    textAlign: "center",
  },
  message: {
    ...textStyles.body,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  action: {
    minHeight: 44,
    justifyContent: "center",
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: 14,
  },
  actionText: {
    ...textStyles.headline,
  },
  pressed: {
    opacity: 0.7,
  },
});
