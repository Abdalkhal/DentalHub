import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { ZoomIn, ZoomOut } from 'lucide-react-native';

import { Text } from '@/components/ui';

export const ARCH_ZOOM_MIN = 0.5;
export const ARCH_ZOOM_MAX = 3;

/** The arch artwork (see DentalArch) is drawn at a 4:3 aspect ratio. */
const ARCH_ASPECT = 4 / 3;
/** Cap on the viewport height, so tablets get a bigger chart without it taking over the screen. */
const MAX_VIEWPORT_HEIGHT = 420;

/**
 * Pinch-to-zoom / drag-to-pan viewport for the dental arch.
 *
 * The chart used to be laid out at the full container width and then
 * scaled inside a fixed 200pt-tall, overflow-hidden box: fine on a phone, but
 * on a tablet the 4:3 arch is ~2× taller than the box, so half of it was cut
 * off. Now the arch is sized to fit the viewport (whose height grows with the
 * width, up to MAX_VIEWPORT_HEIGHT), and doctors can pinch and drag to reach a
 * tooth; tapping a tooth still works because the pan only activates after the
 * finger moves.
 */
export function ArchViewer({
  children,
  zoom,
  onZoomChange,
  height = 200,
}: {
  children: ReactNode;
  zoom: number;
  onZoomChange: (z: number) => void;
  /** Minimum viewport height (what a phone gets). */
  height?: number;
}) {
  const [width, setWidth] = useState(0);
  const viewportHeight = Math.min(MAX_VIEWPORT_HEIGHT, Math.max(height, width * 0.6));
  // The largest 4:3 box that fits the viewport.
  const archWidth = Math.min(width, viewportHeight * ARCH_ASPECT);
  const archHeight = archWidth / ARCH_ASPECT;

  const scale = useSharedValue(zoom);
  const startScale = useSharedValue(zoom);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  // How far the scaled arch may move before its edge leaves the viewport;
  // 0 (stay centred) while it is smaller than the viewport.
  const bound = (content: number, viewport: number, s: number) => {
    'worklet';
    return Math.max(0, (content * s - viewport) / 2);
  };
  const clamp = (v: number, limit: number) => {
    'worklet';
    return Math.min(limit, Math.max(-limit, v));
  };

  // Zoom changed from outside (the +/- and reset buttons): animate to it and
  // pull the pan back inside the new bounds.
  useEffect(() => {
    scale.value = withTiming(zoom, { duration: 150 });
    tx.value = withTiming(clamp(tx.value, bound(archWidth, width, zoom)), { duration: 150 });
    ty.value = withTiming(clamp(ty.value, bound(archHeight, viewportHeight, zoom)), { duration: 150 });
  }, [zoom, archWidth, archHeight, width, viewportHeight]);

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.min(ARCH_ZOOM_MAX, Math.max(ARCH_ZOOM_MIN, startScale.value * e.scale));
      tx.value = clamp(tx.value, bound(archWidth, width, scale.value));
      ty.value = clamp(ty.value, bound(archHeight, viewportHeight, scale.value));
    })
    .onEnd(() => {
      scheduleOnRN(onZoomChange, Math.round(scale.value * 100) / 100);
    });

  const pan = Gesture.Pan()
    .minDistance(8)
    .averageTouches(true)
    .onStart(() => {
      startX.value = tx.value;
      startY.value = ty.value;
    })
    .onUpdate((e) => {
      tx.value = clamp(startX.value + e.translationX, bound(archWidth, width, scale.value));
      ty.value = clamp(startY.value + e.translationY, bound(archHeight, viewportHeight, scale.value));
    });

  const archStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <View>
      <View className="mb-2 flex-row items-center justify-end gap-1.5">
        <View
          className="flex-row items-center gap-1 rounded-full bg-white px-1 py-1"
          style={{
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 2,
            elevation: 1,
          }}
        >
          <Pressable
            onPress={() => onZoomChange(Math.max(ARCH_ZOOM_MIN, zoom - 0.25))}
            className="h-6 w-6 items-center justify-center rounded-full"
          >
            <ZoomOut size={12} color="#334155" />
          </Pressable>
          <Text className="w-9 text-center text-[10px] font-bold text-slate-500">{Math.round(zoom * 100)}%</Text>
          <Pressable
            onPress={() => onZoomChange(Math.min(ARCH_ZOOM_MAX, zoom + 0.25))}
            className="h-6 w-6 items-center justify-center rounded-full"
          >
            <ZoomIn size={12} color="#334155" />
          </Pressable>
        </View>
      </View>
      <GestureDetector gesture={Gesture.Simultaneous(pinch, pan)}>
        <View
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          style={{ height: viewportHeight, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
        >
          {archWidth > 0 && (
            <Animated.View style={[{ width: archWidth, height: archHeight }, archStyle]}>{children}</Animated.View>
          )}
        </View>
      </GestureDetector>
    </View>
  );
}
