import { Pressable, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { cn } from '@/lib/utils';

/**
 * "إظهار المخزون / إخفاء المخزون" switch shown above a product form's stock
 * input. Some offices don't want to publish their stock count: with "hide"
 * selected the form omits the quantity input and the product is saved with
 * `stockHidden` (orderable, no number shown to buyers).
 */
export function StockVisibilityToggle({
  ar,
  hidden,
  onChange,
}: {
  ar: boolean;
  hidden: boolean;
  onChange: (hidden: boolean) => void;
}) {
  const options = [
    { hide: false, label: ar ? 'إظهار المخزون' : 'Show stock', Icon: Eye },
    { hide: true, label: ar ? 'إخفاء المخزون' : 'Hide stock', Icon: EyeOff },
  ];
  return (
    <View className="flex-row gap-2 rounded-2xl bg-slate-100 p-1">
      {options.map(({ hide, label, Icon }) => {
        const active = hidden === hide;
        return (
          <Pressable
            key={label}
            onPress={() => onChange(hide)}
            className={cn('h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl', active ? 'bg-white' : 'bg-transparent')}
          >
            <Icon size={15} color={active ? '#2563EB' : '#64748B'} />
            <Text className={cn('text-xs font-bold', active ? 'text-primary' : 'text-slate-500')}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
