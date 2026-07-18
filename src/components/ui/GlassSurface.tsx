import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import React from "react";
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import { glass, type GlassRole } from "@/src/constants/glass";

type GlassSurfaceProps = ViewProps & {
  children?: React.ReactNode;
  role?: GlassRole;
  interactive?: boolean;
  tintColor?: string;
  fallbackStyle?: StyleProp<ViewStyle>;
};

/**
 * The fundamental material boundary for Debtulator.
 *
 * iOS 26+ renders Apple's native Liquid Glass through UIVisualEffectView.
 * Older iOS versions and non-Apple platforms use the design-system fallback
 * for the same semantic role. Product components should consume this primitive
 * instead of importing expo-glass-effect, BlurView, or platform checks directly.
 */
export function GlassSurface({
  children,
  role = "surface",
  interactive = false,
  tintColor,
  style,
  fallbackStyle,
  ...props
}: GlassSurfaceProps) {
  const [reduceTransparency, setReduceTransparency] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    void AccessibilityInfo.isReduceTransparencyEnabled().then((enabled) => {
      if (mounted) setReduceTransparency(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      setReduceTransparency,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const definition = glass.roles[role];
  const nativeGlassAvailable =
    Platform.OS === "ios" &&
    !reduceTransparency &&
    isGlassEffectAPIAvailable() &&
    isLiquidGlassAvailable();

  if (nativeGlassAvailable) {
    return (
      <GlassView
        {...props}
        colorScheme="auto"
        glassEffectStyle={definition.variant}
        isInteractive={interactive || definition.interactive}
        tintColor={tintColor ?? definition.tintColor}
        style={[styles.base, style]}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View
      {...props}
      style={[
        styles.base,
        {
          backgroundColor: definition.fallback.backgroundColor,
          borderColor: definition.fallback.borderColor,
          borderWidth: definition.fallback.borderWidth,
        },
        fallbackStyle,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
  },
});
