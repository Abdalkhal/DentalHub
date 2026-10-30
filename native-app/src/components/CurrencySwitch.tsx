import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import type { Currency } from '@/lib/clinicStore';
import { cn } from '@/lib/utils';

const OPTIONS: { id: Currency; symbol: string; ar: string; en: string }[] = [
  { id: 'IQD', symbol: 'د.ع', ar: 'دينار عراقي', en: 'Iraqi dinar' },
  { id: 'USD', symbol: '$', ar: 'دولار أمريكي', en: 'US dollar' },
];

/** Dinar / dollar segmented control for the finance and reports screens —
 *  the two currencies are always shown separately, never summed. */
export function CurrencySwitch({
  value,
  onChange,
  ar,
  className,
}: {
  value: Currency;
  onChange: (c: Currency) => void;
  ar: boolean;
  className?: string;
}) {
  return (
    <View className={cn('flex-row gap-1 rounded-2xl border border-slate-200 bg-white p-1', className)}>
      {OPTIONS.map((o) => {
        const active = value === o.id;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={cn('h-10 flex-1 flex-row items-center justify-center gap-2 rounded-xl', active ? 'bg-primary' : 'bg-transparent')}
          >
            <View
              className="h-6 min-w-6 items-center justify-center rounded-full px-1.5"
              style={{ backgroundColor: active ? 'rgba(255,255,255,0.22)' : '#F1F5F9' }}
            >
              <Text className={cn('text-[11px] font-extrabold', active ? 'text-white' : 'text-slate-500')}>{o.symbol}</Text>
            </View>
            <Text className={cn('text-[13px] font-bold', active ? 'text-primary-foreground' : 'text-slate-500')}>
              {ar ? o.ar : o.en}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
