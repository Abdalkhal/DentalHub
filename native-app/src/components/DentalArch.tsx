import { useState } from 'react';
import { Image, Pressable, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';

import { ARCH_HITS, ARCH_LAYOUT, CANVAS_H, CANVAS_W, HIT_R, LABEL_FONT, PHOTO, PILL_H, pillLeft, pillWidth } from '@/lib/archLayout';
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

const ARCH_UPPER = require('../../assets/home/arch-upper.png');
const ARCH_LOWER = require('../../assets/home/arch-lower.png');

/**
 * The patient's tooth chart: tap a tooth on the photo and it gets a dot in the
 * chosen colour, with a line out to a label showing the tooth number and the
 * status in English (whatever the app language), like a dental chart printout.
 */
export function DentalArch({
  jaw,
  teeth,
  onTooth,
}: {
  jaw: 'upper' | 'lower';
  teeth: Record<number, ToothStatus>;
  onTooth?: (n: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const layout = ARCH_LAYOUT[jaw];
  const marked = layout.filter((t) => teeth[t.n] && TOOTH_META[teeth[t.n]]);
  // Canvas px → screen px, for the tap targets.
  const k = width / CANVAS_W;
  const hit = HIT_R * k;

  return (
    // `direction: 'ltr'` keeps the absolute-positioned tap targets from being
    // mirrored under forced Arabic RTL, which would swap patient left/right.
    <View onLayout={onLayout} style={{ width: '100%', aspectRatio: CANVAS_W / CANVAS_H, direction: 'ltr' }}>
      <Image
        source={jaw === 'upper' ? ARCH_UPPER : ARCH_LOWER}
        resizeMode="contain"
        style={{
          position: 'absolute',
          left: `${(PHOTO.x / CANVAS_W) * 100}%`,
          top: `${(PHOTO.y / CANVAS_H) * 100}%`,
          width: `${(PHOTO.size / CANVAS_W) * 100}%`,
          height: `${(PHOTO.size / CANVAS_H) * 100}%`,
        }}
      />
      <Svg pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }} width="100%" height="100%" viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}>
        {/* Leader lines under everything else. */}
        {marked.map((t) => (
          <Line key={`l${t.n}`} x1={t.x} y1={t.y} x2={t.labelX} y2={t.labelY} stroke="#64748B" strokeWidth={3} strokeLinecap="round" />
        ))}

        {/* Tooth numbers, always shown; a white outline keeps them readable over a line. */}
        {layout.map((t) => (
          <G key={`n${t.n}`}>
            <SvgText x={t.numX} y={t.numY + 13} textAnchor="middle" fontSize={38} fontWeight="800" stroke="#FFFFFF" strokeWidth={10} strokeLinejoin="round" fill="#FFFFFF">
              {String(t.n)}
            </SvgText>
            <SvgText x={t.numX} y={t.numY + 13} textAnchor="middle" fontSize={38} fontWeight="800" fill={teeth[t.n] ? '#334155' : '#94A3B8'}>
              {String(t.n)}
            </SvgText>
          </G>
        ))}

        {/* Labels: tooth status in English. */}
        {marked.map((t) => {
          const word = TOOTH_META[teeth[t.n]].en;
          const w = pillWidth(word);
          const left = pillLeft(t, w);
          return (
            <G key={`p${t.n}`}>
              <Rect x={left} y={t.labelY - PILL_H / 2 + 4} width={w} height={PILL_H} rx={PILL_H / 2} fill="#0F172A" opacity={0.08} />
              <Rect x={left} y={t.labelY - PILL_H / 2} width={w} height={PILL_H} rx={PILL_H / 2} fill="#FFFFFF" stroke="#E2E8F0" strokeWidth={2} />
              <SvgText x={left + w / 2} y={t.labelY + 14} textAnchor="middle" fontSize={LABEL_FONT} fontWeight="700" fill="#0F172A">
                {word}
              </SvgText>
            </G>
          );
        })}

        {/* Status dots on the teeth themselves. */}
        {marked.map((t) => (
          <G key={`d${t.n}`}>
            <Circle cx={t.x} cy={t.y + 3} r={36} fill="#0F172A" opacity={0.15} />
            <Circle cx={t.x} cy={t.y} r={30} fill={TOOTH_META[teeth[t.n]].dot} stroke="#FFFFFF" strokeWidth={7} />
          </G>
        ))}
      </Svg>

      {/* Tap targets over each tooth. */}
      {onTooth &&
        width > 0 &&
        ARCH_HITS[jaw].map((h, i) => (
          <Pressable
            key={`h${i}`}
            onPress={() => onTooth(h.n)}
            hitSlop={2}
            accessibilityRole="button"
            accessibilityLabel={String(h.n)}
            style={{ position: 'absolute', left: h.x * k - hit, top: h.y * k - hit, width: hit * 2, height: hit * 2, borderRadius: hit }}
          />
        ))}
    </View>
  );
}
