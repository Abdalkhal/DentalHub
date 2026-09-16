import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs } from 'firebase/firestore';
import { MapPin, Search, Star } from 'lucide-react-native';

import { Screen, Text, Spinner, Input } from '@/components/ui';
import { db } from '@/integrations/firebase/client';
import { useProducts } from '@/lib/products';
import { CITIES } from '@/data/offices';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// Faithful port of the web dentist-facing browse screen
// (src/routes/supplies.index.tsx's BrowseSupplies): a directory of supply
// COMPANIES to open (tap → that company's profile), not a flat cross-supplier
// product grid with branch filter chips — that was this screen's previous,
// non-matching shape. Web also merges in a hardcoded demo `OFFICES` list
// routed to a dedicated `/supplies/$officeId` storefront page; that screen
// has no native counterpart, so only real registered supply accounts
// (Firestore `user_roles`) are listed here. Web's own bone-graft /
// specialized-implants shortcut banners live elsewhere, not on this browse
// screen, so they aren't ported here either.

type CompanyItem = {
  id: string;
  name: string;
  cityId: string;
  rating: number;
  itemsCount: number;
};

function resolveCityId(cityValue: string | undefined | null): string {
  if (!cityValue) return 'baghdad';
  const t = cityValue.trim().toLowerCase();
  const m = CITIES.find((c) => c.id === t || c.en.toLowerCase() === t || c.ar === cityValue.trim());
  return m ? m.id : 'baghdad';
}

function getCityName(cityId: string, ar: boolean): string {
  const m = CITIES.find((c) => c.id === cityId);
  return m ? (ar ? m.ar : m.en) : ar ? 'بغداد' : 'Baghdad';
}

const queryCompanies = async (): Promise<Pick<CompanyItem, 'id' | 'name' | 'cityId'>[]> => {
  const snap = await getDocs(collection(db, 'user_roles'));
  return snap.docs
    .map((d) => d.data() as Record<string, unknown>)
    .filter((u) => u.accountType === 'supply' || u.accountType === 'medical_supplies')
    .map((u) => ({
      id: String(u.userId ?? ''),
      name: String(u.name || ''),
      cityId: resolveCityId(typeof u.city === 'string' ? u.city : null),
    }))
    .filter((c) => c.id && c.name);
};

type SortKey = 'default' | 'rating' | 'items';

const SORT_CHIPS: { key: SortKey; ar: string; en: string }[] = [
  { key: 'default', ar: 'الكل', en: 'All' },
  { key: 'rating', ar: 'الأعلى تقييماً', en: 'Top rated' },
  { key: 'items', ar: 'الأكثر تنوعاً', en: 'Most items' },
];

export default function SuppliesScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const [q, setQ] = useState('');
  const [city, setCity] = useState('all');
  const [sort, setSort] = useState<SortKey>('default');

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['supplies-directory'],
    queryFn: queryCompanies,
    staleTime: 30_000,
  });
  const { data: products = [] } = useProducts();

  const itemsCountById = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      if (!p.companyId) return;
      map.set(p.companyId, (map.get(p.companyId) ?? 0) + 1);
    });
    return map;
  }, [products]);

  const withCounts: CompanyItem[] = useMemo(
    () => companies.map((c) => ({ ...c, rating: 0, itemsCount: itemsCountById.get(c.id) ?? 0 })),
    [companies, itemsCountById],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = withCounts.filter((c) => {
      if (city !== 'all' && c.cityId !== city) return false;
      if (!term) return true;
      return (
        c.name.toLowerCase().includes(term) ||
        getCityName(c.cityId, true).includes(term) ||
        getCityName(c.cityId, false).toLowerCase().includes(term)
      );
    });
    if (sort === 'rating') list = [...list].sort((a, b) => b.rating - a.rating);
    if (sort === 'items') list = [...list].sort((a, b) => b.itemsCount - a.itemsCount);
    return list;
  }, [withCounts, q, city, sort]);

  return (
    <Screen>
      <Text className="text-xl font-extrabold text-slate-800">
        {ar ? 'المستلزمات الطبية' : 'Medical Supplies'}
      </Text>
      <Text className="mt-0.5 text-xs text-slate-500">
        {ar ? 'شركات المستلزمات الطبية المتاحة' : 'Available medical supply companies'}
      </Text>

      <Input
        value={q}
        onChangeText={setQ}
        placeholder={ar ? 'ابحث عن شركة أو مدينة…' : 'Search company or city…'}
        leftIcon={<Search size={16} color="#94A3B8" />}
        className="mt-3"
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
        <View className="flex-row gap-1.5 pb-1">
          {[{ id: 'all', ar: 'كل المدن', en: 'All cities' }, ...CITIES].map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setCity(c.id)}
              className={cn(
                'h-8 items-center justify-center rounded-full border px-3',
                city === c.id ? 'border-primary bg-primary' : 'border-slate-200 bg-white',
              )}
            >
              <Text className={cn('text-[11px] font-bold', city === c.id ? 'text-primary-foreground' : 'text-slate-600')}>
                {ar ? c.ar : c.en}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
        <View className="flex-row gap-1.5 pb-1">
          {SORT_CHIPS.map((c) => (
            <Pressable
              key={c.key}
              onPress={() => setSort(c.key)}
              className={cn(
                'h-8 items-center justify-center rounded-full border px-3',
                sort === c.key ? 'border-primary bg-primary' : 'border-slate-200 bg-white',
              )}
            >
              <Text className={cn('text-[11px] font-bold', sort === c.key ? 'text-primary-foreground' : 'text-slate-600')}>
                {ar ? c.ar : c.en}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {isLoading ? (
        <Spinner size="small" />
      ) : filtered.length === 0 ? (
        <Text className="mt-16 text-center text-slate-400">{ar ? 'لا توجد نتائج' : 'No results'}</Text>
      ) : (
        <View className="mt-3 gap-3 pb-6">
          {filtered.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => router.push({ pathname: '/profile/[accountId]', params: { accountId: item.id } })}
              className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-card p-3.5 shadow-sm"
            >
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
                <Text className="text-lg font-extrabold text-emerald-700">{item.name.charAt(0)}</Text>
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-bold text-slate-800" numberOfLines={1}>
                  {item.name}
                </Text>
                <View className="mt-0.5 flex-row items-center gap-3">
                  <View className="flex-row items-center gap-1">
                    <MapPin size={12} color="#64748B" />
                    <Text className="text-xs text-slate-500">{getCityName(item.cityId, ar)}</Text>
                  </View>
                  {item.rating > 0 && (
                    <View className="flex-row items-center gap-1">
                      <Star size={12} color="#F59E0B" fill="#F59E0B" />
                      <Text className="text-xs font-semibold text-amber-600">{item.rating}</Text>
                    </View>
                  )}
                  {item.itemsCount > 0 && (
                    <Text className="text-xs text-slate-400">
                      {item.itemsCount}+ {ar ? 'صنف' : 'items'}
                    </Text>
                  )}
                </View>
              </View>
              <Text className="text-lg text-slate-300">›</Text>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}
