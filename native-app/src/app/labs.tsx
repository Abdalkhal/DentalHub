import { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs } from 'firebase/firestore';
import { MapPin, Phone } from 'lucide-react-native';

import { Screen, Text, Spinner } from '@/components/ui';
import { db } from '@/integrations/firebase/client';
import { CITIES } from '@/data/offices';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type DirectoryItem = {
  id: string;
  name: string;
  cityId: string;
  city: string;
  phone?: string;
};

function resolveCityId(cityValue: string | undefined | null): string {
  if (!cityValue) return 'baghdad';
  const t = cityValue.trim().toLowerCase();
  const m = CITIES.find((c) => c.id === t || c.en.toLowerCase() === t || c.ar === cityValue.trim());
  return m ? m.id : 'baghdad';
}

function getCityName(cityId: string, ar: boolean): string {
  const m = CITIES.find((c) => c.id === cityId);
  return m ? (ar ? m.ar : m.en) : 'Baghdad';
}

const queryDirectory = async (accountType: string): Promise<DirectoryItem[]> => {
  const snap = await getDocs(collection(db, 'user_roles'));
  return snap.docs
    .map((d) => d.data() as Record<string, unknown>)
    .filter((u) => u.accountType === accountType)
    .map((u) => ({
      id: String(u.userId ?? ''),
      name: String(u.name || ''),
      cityId: resolveCityId(typeof u.city === 'string' ? u.city : null),
      city: typeof u.city === 'string' ? u.city : '',
      phone: typeof u.phone === 'string' ? u.phone : undefined,
    }))
    .filter((i) => i.id && i.name);
};

export default function LabsScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const [city, setCity] = useState('all');

  const { data: labs = [], isLoading } = useQuery({
    queryKey: ['labs-directory'],
    queryFn: () => queryDirectory('lab'),
    staleTime: 30_000,
  });

  const filtered = useMemo(
    () => (city === 'all' ? labs : labs.filter((l) => l.cityId === city)),
    [labs, city],
  );

  return (
    <Screen>
      <Text className="text-xl font-extrabold text-slate-800">
        {ar ? 'المختبرات' : 'Laboratories'}
      </Text>
      <Text className="mt-0.5 text-xs text-slate-500">
        {ar ? 'مختبرات الأسنان المتاحة' : 'Available dental labs'}
      </Text>

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

      {isLoading ? (
        <Spinner size="small" />
      ) : filtered.length === 0 ? (
        <Text className="mt-16 text-center text-slate-400">
          {ar ? 'لا توجد مختبرات' : 'No labs found'}
        </Text>
      ) : (
        <View className="mt-2 gap-3">
          {filtered.map((item) => (
            <Pressable
              key={item.id}
              onPress={() =>
                router.push({ pathname: '/profile/[accountId]', params: { accountId: item.id } })
              }
              className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-card p-3.5 shadow-sm"
            >
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-sky-100">
                <Text className="text-lg font-extrabold text-sky-700">{item.name.charAt(0)}</Text>
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-bold text-slate-800" numberOfLines={1}>{item.name}</Text>
                <View className="mt-0.5 flex-row items-center gap-1.5">
                  <MapPin size={12} color="#64748B" />
                  <Text className="text-xs text-slate-500">{getCityName(item.cityId, ar)}</Text>
                </View>
              </View>
              {item.phone ? (
                <Pressable
                  onPress={() => Linking.openURL(`tel:${item.phone}`)}
                  className="h-10 w-10 items-center justify-center rounded-xl bg-emerald-50"
                >
                  <Phone size={18} color="#059669" />
                </Pressable>
              ) : null}
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}
