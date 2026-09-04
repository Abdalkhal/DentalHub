import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Search } from 'lucide-react-native';

import { Screen, Text } from '@/components/ui';
import { BRANDS } from '@/data/brands';
import { useI18n } from '@/lib/i18n';

function BrandTile({ name, ar, image, color }: { name: string; ar: string; image?: string; color?: string }) {
  const [failed, setFailed] = useState(false);
  const hasImage = !!image && !failed;
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <View className="w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <View className="mb-2 h-14 w-full items-center justify-center overflow-hidden rounded-xl bg-slate-50">
        {hasImage ? (
          <Image source={{ uri: image }} className="h-full w-full" resizeMode="contain" onError={() => setFailed(true)} />
        ) : (
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-200">
            <Text className="text-sm font-extrabold tracking-tight text-slate-600">{initials}</Text>
          </View>
        )}
      </View>
      <Text numberOfLines={2} className="text-center text-[11px] font-bold leading-tight text-slate-700">
        {ar}
      </Text>
    </View>
  );
}

export default function BrandsScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return BRANDS;
    return BRANDS.filter((b) => b.name.toLowerCase().includes(term) || (b.ar && b.ar.toLowerCase().includes(term)));
  }, [q]);

  return (
    <Screen>
      <Text className="text-xl font-extrabold text-slate-800">
        {ar ? 'البراندات' : 'Brands'}
      </Text>
      <Text className="mt-0.5 text-xs text-slate-500">
        {filtered.length} {ar ? 'علامة تجارية' : 'brands'}
      </Text>

      <View className="relative mt-3">
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={ar ? 'ابحث عن علامة تجارية…' : 'Search a brand…'}
          placeholderTextColor="#94A3B8"
          className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-4 pr-10 text-sm text-slate-700 shadow-sm"
        />
        <View className="absolute bottom-0 right-3 top-0 justify-center">
          <Search size={17} color="#94A3B8" />
        </View>
      </View>

      <ScrollView className="mt-4 flex-1">
        <View className="flex-row flex-wrap justify-between gap-y-3 pb-6">
          {filtered.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => router.push({ pathname: '/supplies', params: { brand: b.name } })}
              className="w-[31%]"
            >
              <BrandTile name={b.name} ar={ar ? b.ar : b.name} image={b.image} color={b.color} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
