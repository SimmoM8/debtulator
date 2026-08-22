import { colors } from "@/src/theme";
import { useHeaderHeight } from "expo-router/react-navigation";
import type { PropsWithChildren, ReactNode } from "react";
import { useState } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";

type ScreenProps = PropsWithChildren<{
  hero: ReactNode;
}>;

export function SplitBackgroundScreen({ hero, children }: ScreenProps) {
  const isIos = Platform.OS === "ios";
  const navHeaderHeight = useHeaderHeight();
  const topInset = navHeaderHeight;

  const [heroHeight, setHeroHeight] = useState(0);
  const [scrollY] = useState(() => new Animated.Value(0));

  return (
    <View style={styles.root}>
      {/* Layer 0: scrolling gradient background */}

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

      {/* Layer 1.5: scrolling white background */}
      {heroHeight > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.contentBackground,
            {
              top: heroHeight + (isIos ? 0 : heroHeight),
              transform: [
                {
                  translateY: scrollY.interpolate({
                    inputRange: [-heroHeight, 0],
                    outputRange: [0, -heroHeight],
                    extrapolateLeft: "extend",
                    extrapolateRight: "extend",
                  }),
                },
              ],
            },
          ]}
        />
      )}
      {/* Layer 2: scrolling foreground content */}
      <Animated.ScrollView
        style={styles.scrollLayer}
        contentInsetAdjustmentBehavior={isIos ? "automatic" : "never"}
        contentInset={{
          top: isIos ? heroHeight - topInset : 0,
        }}
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
        <View
          style={{
            height: isIos ? 0 : heroHeight,
          }}
        />
        {children}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.mainBackground,
  },

  gradientLayer: {
    ...StyleSheet.absoluteFill,
  },

  gradientBackground: {
    height: "200%",
    top: "-50%",
    marginTop: "auto",
    marginBottom: "auto",
  },

  hero: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 1,
  },

  contentBackground: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -1000,

    backgroundColor: colors.appBackground,

    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,

    zIndex: 2,
  },

  scrollLayer: {
    flex: 1,
    zIndex: 3,
  },
});
