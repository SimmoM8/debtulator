import { colors, gradients } from "@/src/theme";
import { LinearGradient } from "expo-linear-gradient";
import { useHeaderHeight } from "expo-router/react-navigation";
import type { PropsWithChildren, ReactNode } from "react";
import { useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

type ScreenProps = PropsWithChildren<{
  hero: ReactNode;
}>;

export function SplitBackgroundScreen({ hero, children }: ScreenProps) {
  const isIos = Platform.OS === "ios";
  const navHeaderHeight = useHeaderHeight();
  const topInset = navHeaderHeight;
  const [heroHeight, setHeroHeight] = useState(0);
  const [scrollY] = useState(() => new Animated.Value(0));
  const { height: screenHeight } = useWindowDimensions();
  const gradientHeight = screenHeight;
  const maxGradientTravel = screenHeight * 0.3;

  return (
    <View style={styles.root}>
      {/* Layer 0: scrolling gradient background */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.gradientLayer,
          {
            height: gradientHeight,
            transform: [
              {
                translateY: scrollY.interpolate({
                  inputRange: [-maxGradientTravel, 0, maxGradientTravel],
                  outputRange: [maxGradientTravel, 0, -maxGradientTravel],
                  extrapolate: "clamp",
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={gradients.background}
          locations={[0.5, 0.5]}
          style={styles.gradientBackground}
        />
      </Animated.View>

      {/* Layer 1: fixed hero */}
      <View
        pointerEvents="none"
        style={[
          styles.hero,
          {
            paddingTop: isIos ? topInset : 0,
          },
        ]}
        onLayout={(event) => {
          setHeroHeight(event.nativeEvent.layout.height);
        }}
      >
        {hero}
      </View>

      {/* Layer 2: scrolling foreground content */}
      <Animated.ScrollView
        style={[styles.scrollLayer]}
        contentInsetAdjustmentBehavior={isIos ? "automatic" : "never"}
        contentInset={{ top: isIos ? heroHeight - topInset : 0 }}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [
            {
              nativeEvent: {
                contentOffset: {
                  y: scrollY,
                },
              },
            },
          ],
          {
            useNativeDriver: true,
          },
        )}
      >
        <View style={{ height: isIos ? 0 : heroHeight }} />
        {children}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.appBackground,
  },

  gradientLayer: {
    ...StyleSheet.absoluteFill,
  },

  hero: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 1,
  },

  scrollLayer: {
    flex: 1,
    zIndex: 2,
  },
  gradientBackground: {
    height: "200%",
    top: "-50%",
    marginTop: "auto",
    marginBottom: "auto",
  },
});
