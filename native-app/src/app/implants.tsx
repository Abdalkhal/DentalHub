import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Layers, Package, Search, SlidersHorizontal, Sparkles } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Screen, Text } from '@/components/ui';
import { countryCodeToFlag, ALL_COUNTRIES } from '@/data/countries';
import { useI18n } from '@/lib/i18n';

type Category = { ar: string; en: string; icon: LucideIcon; tint: string; to: string };

const CATEGORIES: Category[] = [
  { ar: 'البون كرافت', en: 'Bone Graft', icon: Package, tint: 'bg-emerald-100 text-emerald-600', to: '/bone-grafts' },
  { ar: 'الدليل الجراحي', en: 'Surgical Guides', icon: Layers, tint: 'bg-sky-100 text-sky-600', to: '/surgical-guide' },
  { ar: 'الزرعات المتخصصة', en: 'Specialized Implants', icon: Sparkles, tint: 'bg-violet-100 text-violet-600', to: '/specialized-implants/index' },
];

export default function ImplantsScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const [q, setQ] = useState('');

  const countries = ALL_COUNTRIES.slice(0, 14);

  return (
    <Screen>
      {/* 1 — Search row */}
      <View className="flex-row gap-2">
        <View className="relative flex-1">
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={ar ? 'ابحث حسب الشركة أو الطول أو القطر.' : 'Search by company, length or diameter.'}
            placeholderTextColor="#94A3B8"
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-4 pr-11 text-sm text-slate-700 shadow-sm"
          />
          <View className="absolute bottom-0 right-4 top-0 justify-center">
            <Search size={18} color="#94A3B8" />
          </View>
        </View>
        <Pressable className="h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
          <SlidersHorizontal size={19} color="#334155" />
        </Pressable>
      </View>

      {/* 2 — Hero banner */}
      <View className="relative mt-4 overflow-hidden rounded-3xl bg-[#1d4ed8] p-5">
        <View className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
        <View className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-white/10" />
        <Text className="text-2xl font-extrabold leading-tight text-white">
          {ar ? 'دقة أعلى.. نتائج أفضل' : 'Higher precision.. better results'}
        </Text>
        <Text className="mt-1 text-xs text-white/85">
          {ar ? 'أحدث أنظمة الزراعة السنية' : 'The latest dental implant systems'}
        </Text>
      </View>

      {/* 3 — Categories */}
      <View className="mt-6">
        <Text className="mb-3 text-base font-extrabold text-slate-800">{ar ? 'اختر الفئة' : 'Choose a category'}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-3 pb-1">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              return (
                <Pressable
                  key={c.to}
                  onPress={() => router.push(c.to as never)}
                  className="w-36 items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <View className={`h-14 w-14 items-center justify-center rounded-full ${c.tint}`}>
                    <Icon size={26} strokeWidth={1.8} />
                  </View>
                  <Text className="mt-2.5 text-center text-[12px] font-bold leading-tight text-slate-800">
                    {ar ? c.ar : c.en}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* 4 — Countries */}
      <View className="mt-6">
        <Text className="mb-3 text-base font-extrabold text-slate-800">
          {ar ? 'زرعات حسب الدول' : 'Implants by country'}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2.5 pb-1">
            {countries.map((c) => (
              <Pressable key={c.code} className="w-20 items-center rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-slate-50">
                  <Text className="text-2xl">{countryCodeToFlag(c.code)}</Text>
                </View>
                <Text className="mt-2 text-center text-[10px] font-bold leading-tight text-slate-700">
                  {ar ? c.ar : c.en}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}
