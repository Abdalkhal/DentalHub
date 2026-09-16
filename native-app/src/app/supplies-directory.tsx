import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, updateDoc } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, MapPin, SearchX, Star } from 'lucide-react-native';

import { Screen, Text } from '@/components/ui';
import { db } from '@/integrations/firebase/client';
import { CITIES } from '@/data/offices';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const DEFAULT_CITY_ID = 'baghdad';

type SupplyOffice = {
  id: string;
  name: string;
  cityId: string;
  area: string;
  rating: number;
  itemsCount: number;
};

function resolveCityId(cityValue: string | undefined | null): string {
  if (!cityValue) return DEFAULT_CITY_ID;
  const t = cityValue.trim().toLowerCase();
  const m = CITIES.find((c) => c.id === t || c.en.toLowerCase() === t || c.ar === cityValue.trim());
  return m ? m.id : DEFAULT_CITY_ID;
}

function getCityName(cityId: string, ar: boolean): string {
  const m = CITIES.find((c) => c.id === cityId);
  return m ? (ar ? m.ar : m.en) : ar ? 'بغداد' : 'Baghdad';
}

export default function SuppliesDirectoryScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'default' | 'rating' | 'items'>('default');
  const [city, setCity] = useState('all');

  const { data: offices = [] } = useQuery({
    queryKey: ['supplies-directory'],
    queryFn: async (): Promise<SupplyOffice[]> => {
      const snap = await getDocs(collection(db, 'user_roles'));
      const results: SupplyOffice[] = [];
      snap.docs.forEach((d) => {
        const u = d.data() as Record<string, unknown>;
        const isSupply = u.accountType === 'supply' || u.accountType === 'medical_supplies';
        if (!isSupply) return;
        if (!u.city) updateDoc(d.ref, { city: 'بغداد' }).catch(() => {});
        results.push({
          id: String(u.userId ?? d.id),
          name: String(u.name || ''),
          cityId: resolveCityId(typeof u.city === 'string' ? u.city : null),
          area: '',
          rating: 0,
          itemsCount: 0,
        });
      });
      return results.filter((o) => o.id && o.name);
    },
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = offices.filter((o) => {
      if (city !== 'all' && o.cityId !== city) return false;
      if (!needle) return true;
      return (
        o.name.toLowerCase().includes(needle) ||
        getCityName(o.cityId, true).includes(needle) ||
        getCityName(o.cityId, false).toLowerCase().includes(needle)
      );
    });
    if (sort === 'rating') list = [...list].sort((a, b) => b.rating - a.rating);
    if (sort === 'items') list = [...list].sort((a, b) => b.itemsCount - a.itemsCount);
    return list;
  }, [q, sort, city, offices]);

  const sortChips: { key: typeof sort; ar: string; en: string }[] = [
    { key: 'default', ar: 'الكل', en: 'All' },
    { key: 'rating', ar: 'الأعلى تقييماً', en: 'Top rated' },
    { key: 'items', ar: 'الأكثر تنوعاً', en: 'Most items' },
  ];

  const Chevron = ar ? ChevronLeft : ChevronRight;

  return (
    <Screen>
      <Text className="text-xl font-extrabold text-slate-800">{ar ? 'المستلزمات الطبية' : 'Medical Supplies'}</Text>
      <Text className="mt-0.5 text-xs text-slate-500">
        {ar ? 'مكاتب المستلزمات الطبية المتاحة' : 'Available medical supply offices'}
      </Text>

      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder={ar ? 'ابحث عن شركة أو مدينة...' : 'Search company or city...'}
        placeholderTextColor="#94A3B8"
        className="mt-3 h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800"
        style={{ writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left' }}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerClassName="mt-3 gap-1.5">
        <Pressable
          onPress={() => setCity('all')}
          className={cn('h-8 items-center justify-center rounded-full border px-3', city === 'all' ? 'border-slate-900 bg-slate-900' : 'border-slate-200 bg-white')}
        >
          <Text className={cn('text-xs font-semibold', city === 'all' ? 'text-white' : 'text-slate-700')}>
            {ar ? 'كل المدن' : 'All cities'}
          </Text>
        </Pressable>
        {CITIES.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => setCity(c.id)}
            className={cn('h-8 items-center justify-center rounded-full border px-3', city === c.id ? 'border-slate-900 bg-slate-900' : 'border-slate-200 bg-white')}
          >
            <Text className={cn('text-xs font-semibold', city === c.id ? 'text-white' : 'text-slate-700')}>
              {ar ? c.ar : c.en}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerClassName="mt-2 gap-1.5">
        {sortChips.map((c) => (
          <Pressable
            key={c.key}
            onPress={() => setSort(c.key)}
            className={cn('h-8 items-center justify-center rounded-full border px-3', sort === c.key ? 'border-primary bg-primary' : 'border-slate-200 bg-white')}
          >
            <Text className={cn('text-xs font-semibold', sort === c.key ? 'text-primary-foreground' : 'text-slate-700')}>
              {ar ? c.ar : c.en}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text className="mb-3 mt-4 text-base font-bold text-slate-800">{ar ? 'مكاتب المستلزمات' : 'Supply offices'}</Text>

      {filtered.length === 0 ? (
        <View className="items-center py-12">
          <SearchX size={28} color="#CBD5E1" />
          <Text className="mt-2 text-sm text-slate-400">{ar ? 'لا توجد نتائج' : 'No results'}</Text>
        </View>
      ) : (
        <View className="gap-3">
          {filtered.map((o) => (
            <Pressable
              key={o.id}
              onPress={() => router.push({ pathname: '/profile/[accountId]', params: { accountId: o.id } })}
              className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-card p-3.5 shadow-sm"
            >
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <Text className="text-lg font-extrabold text-primary">{o.name.slice(0, 1)}</Text>
              </View>
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className="text-sm font-bold text-slate-800">
                  {o.name}
                </Text>
                <View className="mt-0.5 flex-row items-center gap-3">
                  <View className="flex-row items-center gap-1">
                    <MapPin size={12} color="#64748B" />
                    <Text className="text-xs text-slate-500">{getCityName(o.cityId, ar)}</Text>
                  </View>
                  {o.rating > 0 && (
                    <View className="flex-row items-center gap-1">
                      <Star size={12} color="#F59E0B" fill="#F59E0B" />
                      <Text className="text-xs font-semibold text-amber-600">{o.rating}</Text>
                    </View>
                  )}
                  {o.itemsCount > 0 && (
                    <Text className="text-xs text-slate-400">
                      {o.itemsCount}+ {ar ? 'صنف' : 'items'}
                    </Text>
                  )}
                </View>
              </View>
              <Chevron size={16} color="#94A3B8" />
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}
