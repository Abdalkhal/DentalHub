import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const DURATION = 400;

// The background art (assets/images/splash-branded.png) only draws the Dent
// Hub logo/wordmark/tagline — no spinner or loading text baked in, so both
// are real, live elements added below. Positioned as a fraction of screen
// height, not a fixed pixel offset, because `resizeMode="cover"` on this
// portrait image scales to match the screen's height and only crops
// left/right — a height fraction stays aligned with the art across
// different screen widths.
const LOADER_TOP_FRACTION = 0.68;

// Exported so RootLayout can show the exact same art (not a blank screen)
// while storage/fonts are still loading, before this overlay even mounts.
export function SplashArt() {
  const { height } = useWindowDimensions();
  return (
    <>
      <Image style={StyleSheet.absoluteFill} contentFit="cover" source={require('@/assets/images/splash-branded.png')} />
      <View style={[styles.loader, { top: height * LOADER_TOP_FRACTION }]}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loaderText}>جاري التحميل...</Text>
      </View>
    </>
  );
}

export function AnimatedSplashOverlay() {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const fadeKeyframe = new Keyframe({
    0: { opacity: 1 },
    100: { opacity: 0, easing: Easing.out(Easing.quad) },
  });

  return animate ? (
    <Animated.View
      entering={fadeKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) scheduleOnRN(setVisible, false);
      })}
      style={styles.overlay}
    >
      <SplashArt />
    </Animated.View>
  ) : (
    <View
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => setAnimate(true));
      }}
      style={styles.overlay}
    >
      <SplashArt />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
  },
  loader: {
    position: 'absolute',
    width: '100%',
    alignItems: 'center',
    gap: 10,
  },
  loaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
});
