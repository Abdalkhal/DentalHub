import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { ZoomIn, ZoomOut } from 'lucide-react-native';

import { Text } from '@/components/ui';

export const ARCH_ZOOM_MIN = 0.5;
export const ARCH_ZOOM_MAX = 2;

export function ArchViewer({
  children,
  zoom,
  onZoomChange,
  height,
}: {
  children: ReactNode;
  zoom: number;
  onZoomChange: (z: number) => void;
  height?: number;
}) {
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
      <View style={{ height: height, overflow: 'hidden' }}>
        <View style={{ transform: [{ scale: zoom }] }}>{children}</View>
      </View>
    </View>
  );
}
