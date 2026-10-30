import { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { MapPin, Phone, Stethoscope } from 'lucide-react-native';

import { Screen, Text, Spinner } from '@/components/ui';
import { db } from '@/integrations/firebase/client';
import { useI18n } from '@/lib/i18n';
import { CITIES } from '@/data/offices';
import { useIsAdmin } from '@/lib/useAuth';
import { cn } from '@/lib/utils';

function cityName(id: string, ar: boolean): string {
  const c = CITIES.find((x) => x.id === id.trim().toLowerCase());
  return c ? (ar ? c.ar : c.en) : id;
}

type Doctor = { id: string; name: string; city: string; phone?: string; clinic?: string };

// Every dentist on the platform, with phone numbers — admin only. Labs
// used to reach this from their "Doctors" button; they now get /lab-doctors
// (only the dentists who sent them cases).
export default function DoctorsScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['doctors-directory', ar],
    enabled: isAdmin,
    queryFn: async (): Promise<Doctor[]> => {
      // user_roles, not public_profiles: the public copy no longer carries
      // dentists' phones, and only the admin may read user_roles.
      const snap = await getDocs(query(collection(db, 'user_roles'), where('accountType', '==', 'dentist')));
      return snap.docs
        .map((d): Record<string, unknown> => ({ ...d.data(), userId: d.id }))
        .filter((u) => u.accountType === 'dentist')
        .map((u) => ({
          id: String(u.userId),
          name: [u.name, u.surname].filter(Boolean).join(' '),
          // Stored as an id ("nineveh"); shown by its name.
          city: cityName(String(u.city || ''), ar),
          phone: typeof u.phone === 'string' ? u.phone : undefined,
          clinic: typeof u.clinicName === 'string' ? u.clinicName : undefined,
        }))
        .filter((d) => d.id && d.name);
    },
    staleTime: 60_000,
  });

  const otherLabel = ar ? 'أخرى' : 'Other';
  const byCity = useMemo(() => {
    const m: Record<string, number> = {};
    doctors.forEach((d) => {
      const k = d.city || otherLabel;
      m[k] = (m[k] ?? 0) + 1;
    });
    return m;
  }, [doctors, otherLabel]);

  if (!adminLoading && !isAdmin) {
    return (
      <Screen>
        <Text className="mt-16 text-center text-sm text-slate-400">
          {ar ? 'هذه الصفحة متاحة لإدارة التطبيق فقط' : 'This page is for administrators only'}
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text className="text-xl font-extrabold text-slate-800">{ar ? 'الأطباء' : 'Doctors'}</Text>
      <Text className="mt-0.5 text-xs text-slate-500">
        {doctors.length} {ar ? 'طبيب' : 'doctors'}
      </Text>

      {isLoading ? (
        <Spinner size="small" />
      ) : doctors.length === 0 ? (
        <View className="items-center py-16">
          <Stethoscope size={48} color="#CBD5E1" />
          <Text className="mt-3 text-sm text-slate-400">{ar ? 'لا يوجد أطباء بعد' : 'No doctors yet'}</Text>
        </View>
      ) : (
        <ScrollView className="mt-4 flex-1" showsVerticalScrollIndicator={false}>
          {Object.entries(byCity).map(([city, count]) => (
            <View key={city} className="mb-4">
              <Text className="mb-2 text-xs font-bold text-slate-500">
                {city} · {count}
              </Text>
              <View className="gap-2.5">
                {doctors
                  .filter((d) => (d.city || otherLabel) === city)
                  .map((d) => (
                    <View key={d.id} className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-card p-3.5 shadow-sm">
                      <View className="h-11 w-11 items-center justify-center rounded-2xl bg-sky-100">
                        <Text className="text-base font-extrabold text-sky-700">{d.name.charAt(0)}</Text>
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text className="text-sm font-bold text-slate-800" numberOfLines={1}>
                          {d.name}
                        </Text>
                        <View className="mt-0.5 flex-row items-center gap-3">
                          {!!d.city && (
                            <View className="flex-row items-center gap-1">
                              <MapPin size={11} color="#94A3B8" />
                              <Text className="text-[11px] text-slate-500">{d.city}</Text>
                            </View>
                          )}
                          {!!d.clinic && (
                            <Text className="text-[11px] text-slate-400" numberOfLines={1}>
                              {d.clinic}
                            </Text>
                          )}
                        </View>
                      </View>
                      {!!d.phone && (
                        <Pressable
                          onPress={() => Linking.openURL(`tel:${d.phone}`)}
                          className={cn('h-9 w-9 items-center justify-center rounded-xl bg-emerald-50')}
                        >
                          <Phone size={15} color="#059669" />
                        </Pressable>
                      )}
                    </View>
                  ))}
              </View>
            </View>
          ))}
          <View className="h-6" />
        </ScrollView>
      )}
    </Screen>
  );
}
