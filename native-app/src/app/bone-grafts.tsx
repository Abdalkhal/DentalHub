import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs } from 'firebase/firestore';
import { Package } from 'lucide-react-native';

import { Screen, Text, Spinner } from '@/components/ui';
import { ProductImage } from '@/components/ProductImage';
import { db } from '@/integrations/firebase/client';
import { useProducts, useSignedImageUrls } from '@/lib/products';
import { useI18n } from '@/lib/i18n';

export default function BoneGraftsScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';

  const { data: allProducts = [], isLoading } = useProducts();
  const items = useMemo(() => allProducts.filter((p) => p.branch === 'bone_graft'), [allProducts]);
  const { data: urlMap = {} } = useSignedImageUrls(
    useMemo(() => items.flatMap((p) => p.images), [items]),
  );

  const supplierIds = useMemo(
    () => Array.from(new Set(items.map((p) => p.companyId).filter(Boolean))) as string[],
    [items],
  );
  const { data: suppliers = {} } = useQuery({
    queryKey: ['bone-graft-suppliers', supplierIds],
    enabled: supplierIds.length > 0,
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'user_roles'));
      const map: Record<string, string> = {};
      snap.docs.forEach((d) => {
        const u = d.data() as Record<string, unknown>;
        if (u.name && supplierIds.includes(String(u.userId))) map[String(u.userId)] = String(u.name);
      });
      return map;
    },
    staleTime: 60_000,
  });

  return (
    <Screen>
      <Text className="text-xl font-extrabold text-slate-800">
        {ar ? 'البون كرافت' : 'Bone Graft'}
      </Text>
      <Text className="mt-0.5 text-xs text-slate-500">
        {items.length} {ar ? 'منتج بون كرافت' : 'bone graft products'}
      </Text>

      {isLoading ? (
        <Spinner size="small" />
      ) : items.length === 0 ? (
        <View className="items-center py-16">
          <Package size={52} color="#CBD5E1" strokeWidth={1.4} />
          <Text className="mt-3 font-bold text-slate-400">
            {ar ? 'لا توجد منتجات بون كرافت بعد' : 'No bone graft products yet'}
          </Text>
        </View>
      ) : (
        <View className="mt-3 flex-row flex-wrap justify-between gap-y-3 pb-6">
          {items.map((p) => {
            const price = p.currency === 'IQD' ? `${p.price.toLocaleString()} د.ع` : `$${p.price.toFixed(2)}`;
            return (
              <Pressable
                key={p.id}
                onPress={() =>
                  router.push({ pathname: '/product-detail/[productId]', params: { productId: p.id } } as never)
                }
                className="w-[48.5%] overflow-hidden rounded-2xl border border-slate-200 bg-card shadow-sm"
              >
                <ProductImage
                  uri={p.images[0] ? urlMap[p.images[0]] : undefined}
                  className="h-28 w-full bg-slate-100"
                  iconSize={26}
                />
                <View className="p-3">
                  <Text numberOfLines={2} className="text-sm font-bold leading-snug text-slate-800">
                    {ar ? p.ar || p.en : p.en || p.ar}
                  </Text>
                  {!!p.companyId && !!suppliers[p.companyId] && (
                    <Text numberOfLines={1} className="mt-1 text-[11px] text-slate-500">
                      {ar ? 'بواسطة' : 'By'}: {suppliers[p.companyId]}
                    </Text>
                  )}
                  {!!p.brand && (
                    <Text numberOfLines={1} className="mt-0.5 text-[11px] text-slate-400">
                      {p.brand}
                    </Text>
                  )}
                  {!!p.boneGraft?.graftType && (
                    <Text numberOfLines={2} className="mt-1 text-[10px] text-slate-500">
                      {p.boneGraft.graftType}
                      {p.boneGraft.particleSize ? ` · ${p.boneGraft.particleSize}` : ''}
                    </Text>
                  )}
                  <Text className="mt-1 text-sm font-extrabold text-primary">{price}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
