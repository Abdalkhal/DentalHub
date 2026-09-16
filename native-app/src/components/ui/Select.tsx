import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Check, ChevronDown, X } from 'lucide-react-native';

import { Text } from './Text';
import { cn } from '@/lib/utils';

export function Select({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className={cn('h-11 flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3', className)}
      >
        <Text numberOfLines={1} className="flex-1 text-sm text-slate-700">
          {selected?.label ?? value}
        </Text>
        <ChevronDown size={16} color="#94A3B8" />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 items-center justify-center bg-black/40 p-6">
          <View className="max-h-80 w-full max-w-xs overflow-hidden rounded-2xl bg-white shadow-xl">
            <View className="flex-row items-center justify-end border-b border-slate-100 px-3 py-2">
              <Pressable onPress={() => setOpen(false)} className="h-7 w-7 items-center justify-center rounded-full bg-slate-100">
                <X size={14} color="#64748B" />
              </Pressable>
            </View>
            <ScrollView>
              {options.map((o) => {
                const isSelected = o.value === value;
                return (
                  <Pressable
                    key={o.value}
                    onPress={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={cn('flex-row items-center justify-between gap-2 px-4 py-3', isSelected && 'bg-sky-50')}
                  >
                    <Text className={cn('flex-1 text-sm', isSelected ? 'font-bold text-sky-700' : 'text-slate-700')}>
                      {o.label}
                    </Text>
                    {isSelected && <Check size={14} color="#0369A1" />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
