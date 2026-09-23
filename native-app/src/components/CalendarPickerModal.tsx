import { useMemo, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS_AR = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function CalendarPickerModal({
  visible,
  onClose,
  selectedDate,
  onSelect,
  markedDates,
  minDate,
}: {
  visible: boolean;
  onClose: () => void;
  selectedDate: string;
  onSelect: (ds: string) => void;
  markedDates?: Set<string>;
  // Dates before this (YYYY-MM-DD) render disabled and can't be picked.
  // Omitted everywhere except appointment scheduling, where past dates
  // aren't valid — calendars used to browse/filter history stay unrestricted.
  minDate?: string;
}) {
  const { lang } = useI18n();
  const ar = lang === 'ar';

  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const calDays = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const first = new Date(year, month, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return { year, month, cells };
  }, [calMonth]);

  const changeCalMonth = (dir: -1 | 1) => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + dir, 1));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/40 p-4">
        <View className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-2xl">
          <View className="mb-3 flex-row items-center justify-between">
            <Pressable
              onPress={() => changeCalMonth(-1)}
              className="h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50"
            >
              {ar ? <ChevronRight size={16} color="#334155" /> : <ChevronLeft size={16} color="#334155" />}
            </Pressable>
            <Text className="text-sm font-bold text-slate-800">
              {ar ? `${MONTHS_AR[calDays.month]} ${calDays.year}` : `${MONTHS_EN[calDays.month]} ${calDays.year}`}
            </Text>
            <Pressable
              onPress={() => changeCalMonth(1)}
              className="h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50"
            >
              {ar ? <ChevronLeft size={16} color="#334155" /> : <ChevronRight size={16} color="#334155" />}
            </Pressable>
          </View>
          <View className="mb-1 flex-row">
            {(ar ? WEEKDAYS_AR : WEEKDAYS_EN).map((d) => (
              <Text key={d} className="flex-1 text-center text-[10px] font-bold text-slate-400">
                {d}
              </Text>
            ))}
          </View>
          <View className="flex-row flex-wrap">
            {calDays.cells.map((d, i) => {
              if (d === null) return <View key={`e-${i}`} style={{ width: '14.28%', height: 40 }} />;
              const ds = toDateStr(new Date(calDays.year, calDays.month, d));
              const isSelected = ds === selectedDate;
              const hasMark = markedDates?.has(ds);
              const isDisabled = !!minDate && ds < minDate;
              return (
                <View key={ds} style={{ width: '14.28%', height: 40 }} className="items-center justify-center">
                  <Pressable
                    onPress={() => !isDisabled && onSelect(ds)}
                    disabled={isDisabled}
                    className={cn('h-9 w-9 items-center justify-center rounded-xl', isSelected ? 'bg-primary' : 'bg-transparent')}
                  >
                    <Text
                      className={cn(
                        'text-sm font-semibold',
                        isDisabled ? 'text-slate-300' : isSelected ? 'text-primary-foreground' : 'text-slate-700',
                      )}
                    >
                      {d}
                    </Text>
                    {hasMark && (
                      <View
                        className={cn(
                          'absolute bottom-0.5 h-1 w-1 rounded-full',
                          isSelected ? 'bg-white' : 'bg-primary',
                        )}
                      />
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}
