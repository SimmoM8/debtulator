import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { componentTokens, spacing, textStyles, useAppTheme } from "@/src/theme";

export type ToastVariant = "info" | "success" | "warning" | "error";

export type ToastMessage = {
  id: string;
  dedupeKey: string | null;
  variant: ToastVariant;
  title: string;
  message: string | null;
  actionLabel: string | null;
  onAction: (() => void) | null;
  durationMs: number;
};

type ToastProps = {
  toast: ToastMessage;
  onDismiss: () => void;
};

const ICONS = {
  info: { ios: "info.circle.fill", android: "info" },
  success: { ios: "checkmark.circle.fill", android: "check_circle" },
  warning: { ios: "exclamationmark.triangle.fill", android: "warning" },
  error: { ios: "xmark.octagon.fill", android: "error" },
} as const;

const CLOSE_ICON = {
  ios: "xmark",
  android: "close",
} as const;

export function Toast({ toast, onDismiss }: ToastProps) {
  const theme = useAppTheme();
  const [progress] = useState(() => new Animated.Value(0));
  const dismissing = useRef(false);

  const dismiss = useCallback(() => {
    if (dismissing.current) {
      return;
    }

    dismissing.current = true;

    Animated.timing(progress, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onDismiss();
      }
    });
  }, [onDismiss, progress]);

  useEffect(() => {
    Animated.spring(progress, {
      toValue: 1,
      damping: 18,
      stiffness: 220,
      mass: 0.8,
      useNativeDriver: true,
    }).start();

    const announcement = toast.message
      ? `${toast.title}. ${toast.message}`
      : toast.title;

    void AccessibilityInfo.announceForAccessibility(announcement);

    const timer = setTimeout(dismiss, toast.durationMs);

    return () => {
      clearTimeout(timer);
    };
  }, [
    dismiss,
    progress,
    toast.durationMs,
    toast.message,
    toast.title,
  ]);

  function performAction() {
    toast.onAction?.();
    dismiss();
  }

  const iconColor = semanticColor(toast.variant, theme.colors);

  return (
    <Animated.View
      style={[
        styles.animated,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [-12, 0],
              }),
            },
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.98, 1],
              }),
            },
          ],
        },
      ]}
    >
      <View
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[
          styles.toast,
          {
            backgroundColor: theme.colors.surfaceContainer,
            borderColor: theme.colors.outline,
          },
        ]}
      >
        <SymbolView
          name={ICONS[toast.variant]}
          size={componentTokens.toast.iconSize}
          tintColor={iconColor}
        />

        <View style={styles.content}>
          <Text
            numberOfLines={1}
            style={[styles.title, { color: theme.colors.text }]}
          >
            {toast.title}
          </Text>

          {toast.message ? (
            <Text
              numberOfLines={2}
              style={[
                styles.message,
                { color: theme.colors.secondaryText },
              ]}
            >
              {toast.message}
            </Text>
          ) : null}
        </View>

        {toast.actionLabel ? (
          <Pressable
            accessibilityRole="button"
            onPress={performAction}
            hitSlop={spacing.sm}
            style={({ pressed }) => [
              styles.action,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.actionText,
                { color: theme.colors.controlTint },
              ]}
            >
              {toast.actionLabel}
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
          onPress={dismiss}
          hitSlop={spacing.sm}
          style={({ pressed }) => [
            styles.close,
            pressed && styles.pressed,
          ]}
        >
          <SymbolView
            name={CLOSE_ICON}
            size={componentTokens.toast.closeIconSize}
            tintColor={theme.colors.secondaryText}
          />
        </Pressable>
      </View>
    </Animated.View>
  );
}

function semanticColor(
  variant: ToastVariant,
  colors: ReturnType<typeof useAppTheme>["colors"],
): string {
  switch (variant) {
    case "success":
      return colors.success;
    case "warning":
      return colors.warning;
    case "error":
      return colors.danger;
    case "info":
      return colors.controlTint;
  }
}

const styles = StyleSheet.create({
  animated: {
    width: "100%",
    maxWidth: componentTokens.toast.maxWidth,
    alignSelf: "center",
  },
  toast: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: componentTokens.toast.radius,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  content: {
    minWidth: 0,
    flex: 1,
  },
  title: {
    ...textStyles.headline,
  },
  message: {
    ...textStyles.caption,
    marginTop: spacing.xs,
  },
  action: {
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.xs,
  },
  actionText: {
    ...textStyles.headline,
  },
  close: {
    width: 32,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.65,
  },
});
