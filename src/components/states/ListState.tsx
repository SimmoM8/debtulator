import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getContentSurfaceAppearance,
  spacing,
  textStyles,
  useAppTheme,
  type ContentSurfaceVariant,
} from "@/src/theme";

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
  variant?: ContentSurfaceVariant;
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
  variant = "default",
}: ListStateProps) {
  if (loading) {
    return (
      <ListStateMessageView
        title={loadingState.title}
        message={loadingState.message}
        loading
        variant={variant}
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
        variant={variant}
      />
    );
  }

  if (totalCount === 0) {
    return (
      <ListStateMessageView
        title={emptyState.title}
        message={emptyState.message}
        variant={variant}
      />
    );
  }

  if (visibleCount === 0 && noResultsState) {
    return (
      <ListStateMessageView
        title={noResultsState.title}
        message={noResultsState.message}
        variant={variant}
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
  variant: ContentSurfaceVariant;
};

function ListStateMessageView({
  title,
  message,
  loading = false,
  actionLabel,
  onAction,
  variant,
}: ListStateMessageViewProps) {
  const theme = useAppTheme();
  const appearance = getContentSurfaceAppearance(theme.colors, variant);

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator
          style={styles.activityIndicator}
          color={
            variant === "onBrand"
              ? appearance.contentColor
              : theme.colors.controlTint
          }
        />
      ) : null}

      <Text
        style={[
          styles.title,
          {
            color: appearance.contentColor,
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
              color: appearance.mutedContentColor,
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
