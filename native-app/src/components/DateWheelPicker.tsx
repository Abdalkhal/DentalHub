import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, View } from 'react-native';
import { X } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { cn } from '@/lib/utils';

const ITEM_H = 44;
const VISIBLE = 5;
const PAD = ((VISIBLE - 1) / 2) * ITEM_H;

const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function WheelColumn({
  values,
  labels,
  selectedIndex,
  onChange,
}: {
  values: number[];
  labels?: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}) {
  const ref = useRef<ScrollView>(null);
  const settledIndex = useRef(selectedIndex);

  useEffect(() => {
    // Only snap programmatically when the index changed from outside a drag
    // (e.g. day list got clamped because the month shrank) — otherwise this
    // fights the user's own scroll momentum.
    if (settledIndex.current !== selectedIndex) {
      settledIndex.current = selectedIndex;
      ref.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
    }
  }, [selectedIndex]);

  const handleSettle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.max(0, Math.min(values.length - 1, Math.round(e.nativeEvent.contentOffset.y / ITEM_H)));
    settledIndex.current = idx;
    onChange(idx);
  };

  return (
    <ScrollView
      ref={ref}
      style={{ height: ITEM_H * VISIBLE }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_H}
      decelerationRate="fast"
      contentContainerStyle={{ paddingVertical: PAD }}
      onMomentumScrollEnd={handleSettle}
      onScrollEndDrag={handleSettle}
    >
      {values.map((v, i) => (
        <View key={v} style={{ height: ITEM_H }} className="items-center justify-center">
          <Text className={cn('text-base', i === selectedIndex ? 'font-extrabold text-slate-900' : 'text-slate-300')}>
            {labels ? labels[i] : v}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

export function DateWheelPicker({
  visible,
  onClose,
  value,
  onSelect,
  ar,
  yearsBack = 1,
  yearsForward = 15,
}: {
  visible: boolean;
  onClose: () => void;
  value: string;
  onSelect: (dateStr: string) => void;
  ar: boolean;
  yearsBack?: number;
  yearsForward?: number;
}) {
  const now = new Date();
  const parsed = value ? new Date(value + 'T00:00:00') : null;
  const validParsed = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;

  const years = useMemo(() => {
    const start = now.getFullYear() - yearsBack;
    const end = now.getFullYear() + yearsForward;
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, []);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);

  const [year, setYear] = useState(validParsed?.getFullYear() ?? now.getFullYear());
  const [month, setMonth] = useState(validParsed ? validParsed.getMonth() + 1 : now.getMonth() + 1);
  const [day, setDay] = useState(validParsed?.getDate() ?? now.getDate());

  useEffect(() => {
    if (!visible) return;
    const p = value ? new Date(value + 'T00:00:00') : null;
    const v = p && !Number.isNaN(p.getTime()) ? p : null;
    setYear(v?.getFullYear() ?? now.getFullYear());
    setMonth(v ? v.getMonth() + 1 : now.getMonth() + 1);
    setDay(v?.getDate() ?? now.getDate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const dayCount = daysInMonth(year, month);
  const days = useMemo(() => Array.from({ length: dayCount }, (_, i) => i + 1), [dayCount]);
  const clampedDay = Math.min(day, dayCount);

  const monthLabels = (ar ? MONTHS_AR : MONTHS_EN).slice(0, 12);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/40 p-6">
        <View className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
          <View className="flex-row items-center justify-between border-b border-slate-100 px-4 py-3">
            <Text className="text-sm font-bold text-slate-800">
              {ar ? 'تاريخ انتهاء الصلاحية' : 'Expiry date'}
            </Text>
            <Pressable onPress={onClose} className="h-7 w-7 items-center justify-center rounded-full bg-slate-100">
              <X size={14} color="#64748B" />
            </Pressable>
          </View>

          <View className="relative flex-row px-2">
            <View
              pointerEvents="none"
              className="absolute inset-x-2 rounded-xl bg-slate-50"
              style={{ top: PAD, height: ITEM_H }}
            />
            <View className="flex-1">
              <WheelColumn
                values={days}
                selectedIndex={clampedDay - 1}
                onChange={(i) => setDay(days[i])}
              />
            </View>
            <View className="flex-[1.6]">
              <WheelColumn
                values={months}
                labels={monthLabels}
                selectedIndex={month - 1}
                onChange={(i) => setMonth(months[i])}
              />
            </View>
            <View className="flex-1">
              <WheelColumn
                values={years}
                selectedIndex={years.indexOf(year)}
                onChange={(i) => setYear(years[i])}
              />
            </View>
          </View>

          <View className="flex-row gap-2 border-t border-slate-100 p-3">
            <Pressable onPress={onClose} className="flex-1 items-center justify-center rounded-xl bg-slate-100 py-3">
              <Text className="text-sm font-bold text-slate-600">{ar ? 'إلغاء' : 'Cancel'}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                onSelect(toDateStr(year, month, clampedDay));
                onClose();
              }}
              className="flex-1 items-center justify-center rounded-xl bg-primary py-3"
            >
              <Text className="text-sm font-bold text-primary-foreground">{ar ? 'تأكيد' : 'Confirm'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
