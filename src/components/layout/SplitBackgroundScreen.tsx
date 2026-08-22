import { colors } from "@/src/theme";
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
  const { height: screenHeight } = useWindowDimensions();
  const [heroHeight, setHeroHeight] = useState(0);
  const [scrollY] = useState(() => new Animated.Value(0));

  if (!isIos) {
    return (
      <View style={styles.root}>
        <Animated.ScrollView
          style={styles.scrollLayer}
          contentInsetAdjustmentBehavior="never"
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
          <Animated.View
            style={[
              styles.androidHero,
              {
                transform: [{ translateY: scrollY }],
              },
            ]}
            onLayout={(event) => {
              setHeroHeight(event.nativeEvent.layout.height);
            }}
          >
            {hero}
          </Animated.View>

          <View
            style={[
              styles.androidContent,
              {
                minHeight: Math.max(screenHeight - heroHeight, 0),
              },
            ]}
          >
            {children}
          </View>
        </Animated.ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.hero,
          {
            paddingTop: topInset,
          },
        ]}
        onLayout={(event) => {
          setHeroHeight(event.nativeEvent.layout.height);
        }}
      >
        {hero}
      </View>

      {heroHeight > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.contentBackground,
            {
              top: heroHeight,
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

      <Animated.ScrollView
        style={styles.scrollLayer}
        pointerEvents="box-none"
        contentInsetAdjustmentBehavior="automatic"
        contentInset={{
          top: heroHeight - topInset,
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

  hero: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 1,
  },

  androidHero: {
    width: "100%",
  },

  androidContent: {
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
