import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs } from 'firebase/firestore';
import { FlaskConical, MapPin, Package, Search, Stethoscope } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Screen, Text, Spinner } from '@/components/ui';
import { db } from '@/integrations/firebase/client';
import { useSession } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Category = 'all' | 'supplies' | 'implants' | 'labs';

const CATEGORIES: { id: Category; ar: string; en: string }[] = [
  { id: 'all', ar: 'الكل', en: 'All' },
  { id: 'supplies', ar: 'المستلزمات الطبية', en: 'Medical Supplies' },
  { id: 'implants', ar: 'شركات الزرعات', en: 'Implant Companies' },
  { id: 'labs', ar: 'المختبرات', en: 'Labs' },
];

const CATEGORY_META: Record<Exclude<Category, 'all'>, { icon: LucideIcon; bg: string; color: string }> = {
  supplies: { icon: Package, bg: 'bg-emerald-100', color: '#059669' },
  implants: { icon: FlaskConical, bg: 'bg-violet-100', color: '#7C3AED' },
  labs: { icon: Stethoscope, bg: 'bg-sky-100', color: '#0284C7' },
};

type ResultItem = {
  id: string;
  name: string;
  category: Exclude<Category, 'all'>;
  location: string;
};

export default function ExploreScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<Category>('all');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['explore-accounts'],
    queryFn: async (): Promise<ResultItem[]> => {
      const snap = await getDocs(collection(db, 'user_roles'));
      const results: ResultItem[] = [];
      for (const d of snap.docs) {
        const u = d.data() as Record<string, unknown>;
        const name = String(u.name || u.surname || '').trim();
        if (!name) continue;
        let cat: ResultItem['category'] | null = null;
        if (u.accountType === 'supply' || u.accountType === 'medical_supplies') cat = 'supplies';
        else if (u.accountType === 'implant' || u.accountType === 'dental_implants') cat = 'implants';
        else if (u.accountType === 'lab') cat = 'labs';
        if (!cat) continue;
        results.push({
          id: String(u.userId ?? ''),
          name,
          category: cat,
          location: String(u.city || u.address || ''),
        });
      }
      return results.filter((r) => r.id);
    },
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (user && item.id === user.uid) return false;
      if (category !== 'all' && item.category !== category) return false;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || item.location.toLowerCase().includes(q);
    });
  }, [items, category, searchQuery, user]);

  if (!user) return <Redirect href="/login" />;

  const openProfile = (id: string) =>
    router.push({ pathname: '/profile/[accountId]', params: { accountId: id } } as never);

  return (
    <Screen>
      <Text className="text-xl font-extrabold text-slate-800">{ar ? 'استكشاف' : 'Explore'}</Text>

      {/* Search */}
      <View className="relative mt-3">
        <TextInputStyled
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={ar ? 'ابحث عن مكتب أو مختبر…' : 'Search for office or lab…'}
        />
      </View>

      {/* Category chips */}
      <View className="mt-3 flex-row flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => setCategory(c.id)}
            className={cn(
              'h-8 items-center justify-center rounded-full border px-3.5',
              category === c.id ? 'border-primary bg-primary' : 'border-slate-200 bg-white',
            )}
          >
            <Text className={cn('text-xs font-semibold', category === c.id ? 'text-primary-foreground' : 'text-slate-600')}>
              {ar ? c.ar : c.en}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <Spinner size="small" />
      ) : filtered.length === 0 ? (
        <View className="items-center py-16">
          <Search size={36} color="#CBD5E1" />
          <Text className="mt-3 text-sm text-slate-400">
            {ar ? 'لا توجد نتائج' : 'No results found'}
          </Text>
        </View>
      ) : (
        <View className="mt-4 gap-3 pb-6">
          {filtered.map((item) => {
            const meta = CATEGORY_META[item.category];
            const Icon = meta.icon;
            return (
              <Pressable
                key={item.id}
                onPress={() => openProfile(item.id)}
                className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-card p-3.5 shadow-sm"
              >
                <View className={cn('h-12 w-12 items-center justify-center rounded-2xl', meta.bg)}>
                  <Icon size={22} color={meta.color} strokeWidth={2.2} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-bold text-slate-800" numberOfLines={1}>
                    {item.name}
                  </Text>
                  {!!item.location && (
                    <View className="mt-0.5 flex-row items-center gap-1.5">
                      <MapPin size={12} color="#64748B" />
                      <Text className="text-xs text-slate-500" numberOfLines={1}>
                        {item.location}
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-lg text-slate-300">›</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function TextInputStyled(props: React.ComponentProps<typeof TextInput>) {
  return (
    <View className="relative">
      <View className="absolute left-3.5 top-0 bottom-0 z-10 justify-center">
        <Search size={17} color="#94A3B8" />
      </View>
      <TextInput
        placeholderTextColor="#94A3B8"
        className="h-11 w-full rounded-2xl border border-slate-200 bg-card pl-10 pr-4 text-sm text-slate-800"
        {...props}
      />
    </View>
  );
}
