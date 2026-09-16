import { useState } from 'react';
import { Image, Pressable, View, type LayoutChangeEvent } from 'react-native';

import { Text } from '@/components/ui';
import type { ToothStatus } from '@/lib/patientsStore';

export const FDI_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const FDI_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export const LEGEND_ORDER: ToothStatus[] = [
  'healthy',
  'caries',
  'filled',
  'crown',
  'missing',
  'implant',
  'rct',
  'bridge',
  'unerupted',
];

export const TOOTH_META: Record<ToothStatus, { ar: string; en: string; dot: string }> = {
  healthy: { ar: 'سليم', en: 'Healthy', dot: '#10B981' },
  caries: { ar: 'تسوس', en: 'Caries', dot: '#EF4444' },
  filled: { ar: 'حشو', en: 'Filled', dot: '#F59E0B' },
  crown: { ar: 'تاج', en: 'Crown', dot: '#EAB308' },
  missing: { ar: 'مفقود', en: 'Missing', dot: '#94A3B8' },
  implant: { ar: 'زرعة', en: 'Implant', dot: '#3B82F6' },
  rct: { ar: 'عصب', en: 'RCT', dot: '#F97316' },
  bridge: { ar: 'جسر', en: 'Bridge', dot: '#A855F7' },
  unerupted: { ar: 'غير بازغ', en: 'Unerupted', dot: '#D1D5DB' },
};

const STATUS_COLORS: Record<ToothStatus, { bg: string; border: string; text: string }> = {
  healthy: { bg: '#D1FAE5', border: '#6EE7B7', text: '#047857' },
  caries: { bg: '#FEE2E2', border: '#FCA5A5', text: '#B91C1C' },
  filled: { bg: '#FEF3C7', border: '#FCD34D', text: '#B45309' },
  crown: { bg: '#FEF9C3', border: '#FDE047', text: '#A16207' },
  missing: { bg: '#E2E8F0', border: '#CBD5E1', text: '#64748B' },
  implant: { bg: '#DBEAFE', border: '#93C5FD', text: '#1D4ED8' },
  rct: { bg: '#FFEDD5', border: '#FDBA74', text: '#C2410C' },
  bridge: { bg: '#F3E8FF', border: '#D8B4FE', text: '#7E22CE' },
  unerupted: { bg: '#F9FAFB', border: '#E5E7EB', text: '#9CA3AF' },
};

export const UPPER_POS: Record<number, [number, number]> = {
  18: [12.5, 82], 17: [13.5, 67], 16: [15.5, 54], 15: [18.5, 42.5], 14: [21, 34],
  13: [25, 25], 12: [32.5, 15.5], 11: [42.5, 11],
  21: [55.5, 11], 22: [65.5, 15.5], 23: [73, 25], 24: [77.5, 34],
  25: [80.5, 42.5], 26: [83.5, 54], 27: [85.5, 67], 28: [86.5, 82],
};

export const LOWER_POS: Record<number, [number, number]> = {
  48: [14, 14], 47: [15.5, 27], 46: [17, 41], 45: [20, 54], 44: [24, 63.5],
  43: [28.5, 72], 42: [36, 79], 41: [44, 83],
  31: [54, 83], 32: [62, 79], 33: [69.5, 72], 34: [74, 63.5],
  35: [78, 54], 36: [81, 41], 37: [82.5, 27], 38: [84, 14],
};

const TOOTH_SIZE = 26;

export function DentalArch({
  jaw,
  teeth,
  onTooth,
}: {
  jaw: 'upper' | 'lower';
  teeth: Record<number, ToothStatus>;
  onTooth?: (n: number) => void;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  const fdiList = jaw === 'upper' ? FDI_UPPER : FDI_LOWER;
  const posMap = jaw === 'upper' ? UPPER_POS : LOWER_POS;
  const archSrc = jaw === 'upper' ? require('../../assets/home/arch-upper.png') : require('../../assets/home/arch-lower.png');

  return (
    // `direction: 'ltr'` keeps this diagram's absolute-positioned tooth
    // markers from being mirrored under forced Arabic RTL layout — Android
    // flips `left`/`top` offsets for the whole subtree otherwise, which
    // swaps every tooth onto the wrong (patient-left vs patient-right) side.
    <View onLayout={onLayout} style={{ width: '100%', aspectRatio: 4 / 3, direction: 'ltr' }}>
      <Image source={archSrc} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="contain" />
      {size.width > 0 &&
        fdiList.map((n) => {
          const pos = posMap[n];
          if (!pos) return null;
          const lx = 50 + (pos[0] - 50) * 1.22;
          const ly = 50 + (pos[1] - 50) * 1.18;
          const cx = (lx / 100) * size.width;
          const cy = (ly / 100) * size.height;
          const status = teeth[n] || 'healthy';
          const c = STATUS_COLORS[status];
          return (
            <Pressable
              key={n}
              onPress={() => onTooth?.(n)}
              style={{
                position: 'absolute',
                left: cx - TOOTH_SIZE / 2,
                top: cy - TOOTH_SIZE / 2,
                width: TOOTH_SIZE,
                height: TOOTH_SIZE,
                borderRadius: TOOTH_SIZE / 2,
                borderWidth: 2,
                borderColor: c.border,
                backgroundColor: c.bg,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#0F172A',
                shadowOpacity: 0.12,
                shadowRadius: 2,
                shadowOffset: { width: 0, height: 1 },
                elevation: 2,
              }}
            >
              <Text style={{ fontSize: 8, fontWeight: '700', color: c.text }}>{n}</Text>
            </Pressable>
          );
        })}
    </View>
  );
}
