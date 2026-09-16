import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';

import { cn } from '@/lib/utils';

// Warm gold + soft lavender/blue palette shared by the appointment add/detail
// modals only — a deliberate departure from the app's usual flat slate-50
// form fields, per the "glassy" reference design. Kept out of the shared
// `Select`/`Input` look used everywhere else.
export const GOLD = '#C9A227';
export const NAVY = '#22335A';
export const SHEET_GRADIENT: [string, string] = ['#EFE9FB', '#DCEAFB'];
export const FIELD_GRADIENT: [string, string] = ['#FBF3DE', '#DCEAFB'];
export const LIGHT_GRADIENT: [string, string] = ['#FFFFFF', '#F3F7FF'];
export const SAVE_GRADIENT: [string, string] = ['#0EA5A0', '#2563EB'];

let gradientSeq = 0;

/** Absolute-fill diagonal gradient. Needs an `overflow-hidden` + rounded parent to clip to. */
export function GradientFill({ colors }: { colors: [string, string] }) {
  const id = useMemo(() => `appt-grad-${gradientSeq++}`, []);
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <SvgLinearGradient id={id} x1="1" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors[0]} />
          <Stop offset="1" stopColor={colors[1]} />
        </SvgLinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

export function GradientField({
  children,
  colors = FIELD_GRADIENT,
  className,
}: {
  children: React.ReactNode;
  colors?: [string, string];
  className?: string;
}) {
  return (
    <View className={cn('overflow-hidden', className)}>
      <GradientFill colors={colors} />
      {children}
    </View>
  );
}
