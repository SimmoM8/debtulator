import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { palette, spacing } from '@/src/constants/design';

export function AuthBackgroundPattern() {
  return (
    <View pointerEvents="none" style={styles.visualField}>
      <View style={[styles.colorPlane, styles.colorPlaneTop]} />
      <View style={[styles.colorPlane, styles.colorPlaneBottom]} />
      <View style={[styles.patternLine, styles.patternLineOne]} />
      <View style={[styles.patternLine, styles.patternLineTwo]} />
      <View style={[styles.patternLine, styles.patternLineThree]} />
    </View>
  );
}

export function AnimatedBrandBar() {
  const [motion] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(motion, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
        Animated.timing(motion, {
          toValue: 0,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [motion]);

  const primaryWidth = motion.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['58%', '40%', '24%'],
  });
  const mintWidth = motion.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['28%', '38%', '34%'],
  });
  const peachWidth = motion.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['14%', '22%', '42%'],
  });

  return (
    <View pointerEvents="none" style={styles.barGlow}>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barSegment, styles.barStart, { width: primaryWidth }]}>
          <LinearGradient
            colors={[palette.primary, '#5756C4', '#43B9A0']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View style={[styles.barSegment, styles.barOverlap, { width: mintWidth }]}>
          <LinearGradient
            colors={['#43B9A0', palette.mint, '#9ACFAD']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View style={[styles.barSegment, styles.barOverlap, styles.barEnd, { width: peachWidth }]}>
          <LinearGradient
            colors={['#9ACFAD', palette.peach]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  visualField: {
    bottom: -96,
    left: -spacing.screen,
    position: 'absolute',
    right: -spacing.screen,
    top: -96,
  },
  colorPlane: {
    borderRadius: 44,
    position: 'absolute',
  },
  colorPlaneTop: {
    backgroundColor: 'rgba(221,214,254,0.22)',
    height: 260,
    right: -150,
    top: -28,
    transform: [{ rotate: '-10deg' }],
    width: 390,
  },
  colorPlaneBottom: {
    backgroundColor: 'rgba(253,186,155,0.12)',
    bottom: -52,
    height: 280,
    left: -176,
    transform: [{ rotate: '-8deg' }],
    width: 430,
  },
  patternLine: {
    backgroundColor: 'rgba(55,48,163,0.07)',
    borderRadius: 999,
    height: 2,
    position: 'absolute',
    transform: [{ rotate: '-16deg' }],
  },
  patternLineOne: {
    right: -82,
    top: '22%',
    width: 280,
  },
  patternLineTwo: {
    backgroundColor: 'rgba(47,191,143,0.1)',
    bottom: '24%',
    left: -108,
    width: 300,
  },
  patternLineThree: {
    backgroundColor: 'rgba(253,186,155,0.14)',
    bottom: '13%',
    right: -118,
    width: 220,
  },
  barGlow: {
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 7,
    width: '100%',
  },
  barTrack: {
    borderRadius: 999,
    elevation: 2,
    flexDirection: 'row',
    height: 8,
    overflow: 'hidden',
    width: '100%',
  },
  barSegment: {
    height: 8,
    overflow: 'hidden',
  },
  barStart: {
    borderBottomLeftRadius: 999,
    borderTopLeftRadius: 999,
  },
  barOverlap: {
    marginLeft: -2,
  },
  barEnd: {
    borderBottomRightRadius: 999,
    borderTopRightRadius: 999,
  },
});
