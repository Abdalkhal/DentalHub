import { useMemo } from 'react';
import { Image, Linking, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { MapPin, MessageCircle, Phone, Package } from 'lucide-react-native';

import { Screen, Text, Spinner } from '@/components/ui';
import { ProductImage } from '@/components/ProductImage';
import { db } from '@/integrations/firebase/client';
import { useProducts, useSignedImageUrls } from '@/lib/products';
import { useOffers } from '@/lib/offers';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<string, { ar: string; en: string }> = {
  dentist: { ar: 'طبيب أسنان', en: 'Dentist' },
  supply: { ar: 'مكتب مستلزمات', en: 'Supplies Office' },
  implant: { ar: 'شركة زرعات', en: 'Implant Company' },
  lab: { ar: 'مختبر', en: 'Laboratory' },
};

const ROLE_TONE: Record<string, string> = {
  supply: 'bg-emerald-100 text-emerald-700',
  implant: 'bg-amber-100 text-amber-700',
  lab: 'bg-sky-100 text-sky-700',
  dentist: 'bg-violet-100 text-violet-700',
};

function mapsUrl(a: Record<string, unknown>): string {
  if (typeof a.mapUrl === 'string' && a.mapUrl) return a.mapUrl;
  if (typeof a.latitude === 'number' && typeof a.longitude === 'number') {
    return `https://www.google.com/maps/search/?api=1&query=${a.latitude},${a.longitude}`;
  }
  const addr = typeof a.address === 'string' && a.address ? a.address : 'Mosul, Iraq';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
}

function money(price: number, cur: string): string {
  return cur === 'IQD' ? `${price.toLocaleString()} د.ع` : `$${price.toFixed(2)}`;
}

export default function ProfileScreen() {
  const { accountId } = useLocalSearchParams<{ accountId: string }>();
  const { lang } = useI18n();
  const ar = lang === 'ar';

  const { data: account, isLoading } = useQuery({
    queryKey: ['profile-account', accountId],
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'user_roles', accountId ?? ''));
      if (!snap.exists()) return null;
      return snap.data() as Record<string, unknown>;
    },
    retry: false,
    staleTime: 60_000,
  });

  const { data: allProducts = [] } = useProducts();
  const products = useMemo(
    () => allProducts.filter((p) => p.companyId === accountId),
    [allProducts, accountId],
  );
  const { data: urlMap = {} } = useSignedImageUrls(
    useMemo(() => products.map((p) => p.images?.[0]).filter(Boolean) as string[], [products]),
  );
  const { data: offers = [] } = useOffers(accountId ?? '');

  if (isLoading) return <Spinner />;

  if (!account) {
    return (
      <Screen>
        <Text className="mt-16 text-center text-slate-400">
          {ar ? 'الحساب غير موجود' : 'Account not found'}
        </Text>
      </Screen>
    );
  }

  const type = String(account.accountType ?? '');
  const name = String(account.name || account.surname || '');
  const city = String(account.city || account.address || '');
  const phone = typeof account.phone === 'string' ? account.phone : '';
  const photo = typeof account.photoURL === 'string' ? account.photoURL : '';
  const tone = ROLE_TONE[type] ?? 'bg-slate-100 text-slate-600';
  const roleLabel = (ROLE_LABELS[type]?.[ar ? 'ar' : 'en'] ?? type);

  const openProduct = (id: string) =>
    router.push({ pathname: '/product-detail/[productId]', params: { productId: id } } as never);

  return (
    <Screen>
      {/* Header */}
      <View className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-card p-4 shadow-sm">
        {photo ? (
          <Image source={{ uri: photo }} className="h-16 w-16 rounded-2xl bg-slate-100" />
        ) : (
          <View className={cn('h-16 w-16 items-center justify-center rounded-2xl', tone)}>
            <Text className="text-2xl font-extrabold">{name.charAt(0) || '؟'}</Text>
          </View>
        )}
        <View className="min-w-0 flex-1">
          <Text className="text-lg font-extrabold text-slate-900" numberOfLines={1}>
            {name}
          </Text>
          <Text className="mt-0.5 text-xs font-semibold text-primary">{roleLabel}</Text>
          {!!city && (
            <View className="mt-1 flex-row items-center gap-1.5">
              <MapPin size={13} color="#64748B" />
              <Text className="text-xs text-slate-500" numberOfLines={1}>
                {city}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Contact actions */}
      {(phone || city) && (
        <View className="mt-3 flex-row gap-2">
          {!!phone && (
            <Pressable
              onPress={() => Linking.openURL(`tel:${phone}`)}
              className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-emerald-500"
            >
              <Phone size={16} color="#FFFFFF" />
              <Text className="text-xs font-bold text-white">{ar ? 'اتصال' : 'Call'}</Text>
            </Pressable>
          )}
          {!!phone && (
            <Pressable
              onPress={() => Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`)}
              className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-[#25D366]"
            >
              <MessageCircle size={16} color="#FFFFFF" />
              <Text className="text-xs font-bold text-white">WhatsApp</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => Linking.openURL(mapsUrl(account))}
            className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-sky-100"
          >
            <MapPin size={16} color="#0369A1" />
            <Text className="text-xs font-bold text-sky-700">{ar ? 'الخريطة' : 'Map'}</Text>
          </Pressable>
        </View>
      )}

      {/* Offers */}
      {offers.length > 0 && (
        <View className="mt-5">
          <Text className="mb-2 text-sm font-extrabold text-slate-800">
            {ar ? 'العروض' : 'Offers'}
          </Text>
          <View className="gap-2">
            {offers.map((o) => (
              <View key={o.id} className="rounded-2xl border border-slate-200 bg-card p-3 shadow-sm">
                <Text className="text-sm font-bold text-slate-800">{o.title}</Text>
                {o.price != null && (
                  <Text className="mt-0.5 text-xs font-extrabold text-primary">
                    {money(o.price, o.currency || 'USD')}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Products */}
      {products.length > 0 && (
        <View className="mt-5 pb-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-sm font-extrabold text-slate-800">
              {ar ? 'المنتجات' : 'Products'}
            </Text>
            <Text className="text-xs text-slate-400">
              {products.length} {ar ? 'منتج' : 'items'}
            </Text>
          </View>
          <View className="flex-row flex-wrap justify-between gap-y-3">
            {products.map((p) => (
              <Pressable key={p.id} onPress={() => openProduct(p.id)} className="w-[48.5%]">
                <View className="overflow-hidden rounded-2xl border border-slate-200 bg-card shadow-sm">
                  <ProductImage
                    uri={p.images?.[0] ? urlMap[p.images[0]] : undefined}
                    className="h-24 w-full bg-slate-100"
                    iconSize={22}
                  />
                  <View className="p-2.5">
                    <Text className="text-xs font-bold text-slate-800" numberOfLines={2}>
                      {ar ? p.ar || p.en : p.en || p.ar}
                    </Text>
                    <Text className="mt-1 text-xs font-extrabold text-primary">
                      {money(p.price, p.currency)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {products.length === 0 && offers.length === 0 && (
        <View className="mt-12 items-center">
          <Package size={40} color="#CBD5E1" />
          <Text className="mt-3 text-center text-sm text-slate-400">
            {ar ? 'لا توجد منتجات بعد' : 'No products yet'}
          </Text>
        </View>
      )}
    </Screen>
  );
}
