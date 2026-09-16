import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, View } from 'react-native';
import { Check, ChevronDown, X } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { ALL_COUNTRIES, countryFlagUrl } from '@/data/countries';
import { cn } from '@/lib/utils';

function FlagIcon({ code }: { code: string }) {
  const [failed, setFailed] = useState(false);
  if (!code || failed) return <View className="h-4 w-6 rounded-sm bg-slate-100" />;
  return <Image source={{ uri: countryFlagUrl(code) }} className="h-4 w-6 rounded-sm bg-slate-100" resizeMode="cover" onError={() => setFailed(true)} />;
}

export function CountrySelect({
  value,
  onChange,
  ar,
  placeholder,
  allowEmpty = true,
}: {
  value: string;
  onChange: (code: string) => void;
  ar: boolean;
  placeholder?: string;
  allowEmpty?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = ALL_COUNTRIES.find((c) => c.code === value);

  return (
    <>
      <Pressable onPress={() => setOpen(true)} className="h-11 flex-row items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
        {selected && <FlagIcon code={selected.code} />}
        <Text numberOfLines={1} className="flex-1 text-sm text-slate-700">
          {selected ? (ar ? selected.ar : selected.en) : placeholder ?? (ar ? 'اختر بلداً' : 'Select country')}
        </Text>
        <ChevronDown size={16} color="#94A3B8" />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 items-center justify-center bg-black/40 p-6">
          <View className="h-[70%] w-full max-w-xs overflow-hidden rounded-2xl bg-white shadow-xl">
            <View className="flex-row items-center justify-between border-b border-slate-100 px-4 py-3">
              <Text className="text-sm font-bold text-slate-800">{ar ? 'اختر بلداً' : 'Select country'}</Text>
              <Pressable onPress={() => setOpen(false)} className="h-7 w-7 items-center justify-center rounded-full bg-slate-100">
                <X size={14} color="#64748B" />
              </Pressable>
            </View>
            <ScrollView>
              {allowEmpty && (
                <Pressable
                  onPress={() => {
                    onChange('');
                    setOpen(false);
                  }}
                  className={cn('flex-row items-center gap-2.5 px-4 py-3', !value && 'bg-sky-50')}
                >
                  <View className="h-4 w-6" />
                  <Text className={cn('flex-1 text-sm', !value ? 'font-bold text-sky-700' : 'text-slate-400')}>
                    {ar ? 'بدون تحديد' : 'Not specified'}
                  </Text>
                  {!value && <Check size={14} color="#0369A1" />}
                </Pressable>
              )}
              {ALL_COUNTRIES.map((c) => {
                const isSelected = c.code === value;
                return (
                  <Pressable
                    key={c.code}
                    onPress={() => {
                      onChange(c.code);
                      setOpen(false);
                    }}
                    className={cn('flex-row items-center gap-2.5 px-4 py-3', isSelected && 'bg-sky-50')}
                  >
                    <FlagIcon code={c.code} />
                    <Text className={cn('flex-1 text-sm', isSelected ? 'font-bold text-sky-700' : 'text-slate-700')}>
                      {ar ? c.ar : c.en}
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
