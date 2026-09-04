import { View } from 'react-native';

import { Screen, Card, Button, Text } from '@/components/ui';
import { ProductImage } from '@/components/ProductImage';
import { useFavorites, removeFavorite } from '@/lib/favoritesStore';
import { useI18n } from '@/lib/i18n';

function money(n: number, cur: string): string {
  return cur === 'IQD' ? `${n.toLocaleString()} د.ع` : `$${n.toFixed(2)}`;
}

export default function FavoritesScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const favs = useFavorites();

  if (favs.length === 0) {
    return (
      <Screen>
        <Text className="mt-20 text-center text-slate-500">
          {ar ? 'لا توجد مفضلات' : 'No favorites yet'}
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="space-y-3">
        {favs.map((f) => (
          <Card key={f.id} className="flex-row items-center gap-3">
            <ProductImage uri={f.imageUrl} className="h-14 w-14 rounded-xl bg-slate-100" />
            <View className="flex-1">
              <Text className="text-sm font-bold" numberOfLines={1}>{f.title}</Text>
              <Text className="text-[11px] text-slate-400">{f.vendor}</Text>
              <Text className="mt-0.5 text-xs font-extrabold text-primary">
                {money(f.price, f.currency)}
              </Text>
            </View>
            <Button variant="ghost" title="✕" onPress={() => removeFavorite(f.id)} />
          </Card>
        ))}
      </View>
    </Screen>
  );
}
