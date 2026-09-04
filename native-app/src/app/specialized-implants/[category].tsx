import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { Package } from 'lucide-react-native';

import { Screen, Text, Spinner } from '@/components/ui';
import { ProductImage } from '@/components/ProductImage';
import { db } from '@/integrations/firebase/client';
import { useProducts, useSignedImageUrls } from '@/lib/products';
import { SPECIALIZED_CATEGORIES, SPECIALIZED_FIELDS } from '@/data/specializedImplants';
import { useI18n } from '@/lib/i18n';

function fmtPrice(p: { price: number; currency: string }): string {
  return p.currency === 'IQD' ? `${p.price.toLocaleString()} د.ع` : `$${p.price.toFixed(2)}`;
}

export default function SpecializedCategoryScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const { lang } = useI18n();
  const ar = lang === 'ar';

  const categoryMeta = SPECIALIZED_CATEGORIES.find((c) => c.id === category);
  const { data: allProducts = [], isLoading } = useProducts();

  const items = useMemo(
    () =>
      allProducts.filter(
        (p) => p.category === 'specialized_implant' && p.specializedImplant?.category === category,
      ),
    [allProducts, category],
  );

  const allImagePaths = useMemo(() => items.flatMap((p) => p.images), [items]);
  const { data: imageUrlMap = {} } = useSignedImageUrls(allImagePaths);

  const supplierIds = useMemo(
    () => Array.from(new Set(items.map((p) => p.companyId).filter(Boolean))) as string[],
    [items],
  );

  const { data: supplierNames = {} } = useQuery({
    queryKey: ['specialized-suppliers', supplierIds],
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

  const chipsFor = (p: (typeof items)[number]) => {
    const chips: { label: string; value: string }[] = [];
    const fields = p.specializedImplant?.fields ?? {};
    const defs = SPECIALIZED_FIELDS[category ?? ''] ?? [];
    Object.entries(fields as Record<string, unknown>).forEach(([id, v]) => {
      const def = defs.find((f) => f.id === id);
      if (!def) return;
      const label = ar ? def.ar : def.en;
      if (Array.isArray(v)) {
        if (v.length > 0) chips.push({ label, value: (v as string[]).join(' · ') });
      } else if (typeof v === 'string' && v) {
        const opt = def.options?.find((o) => o.value === v);
        chips.push({ label, value: opt ? (ar ? opt.ar ?? opt.value : opt.value) : v });
      }
    });
    return chips.slice(0, 3);
  };

  return (
    <Screen>
      <Text className="text-xl font-extrabold text-slate-800">
        {categoryMeta ? (ar ? categoryMeta.ar : categoryMeta.en) : ar ? 'الزرعات المتخصصة' : 'Specialized Implants'}
      </Text>
      <Text className="mt-0.5 text-xs text-slate-500">
        {items.length} {ar ? 'زرعة متخصصة' : 'specialized implants'}
      </Text>

      {isLoading ? (
        <Spinner size="small" />
      ) : items.length === 0 ? (
        <View className="items-center py-16">
          <Package size={52} color="#CBD5E1" strokeWidth={1.4} />
          <Text className="mt-3 font-bold text-slate-400">
            {ar ? 'لا توجد زرعات متخصصة في هذه الفئة بعد' : 'No specialized implants in this category yet'}
          </Text>
          <Text className="mt-1 text-xs text-slate-400">
            {ar ? 'ستظهر هنا الزرعات المتخصصة المضافة من الموردين' : 'Specialized implants added by suppliers will appear here'}
          </Text>
        </View>
      ) : (
        <View className="mt-3 flex-row flex-wrap justify-between gap-y-3 pb-6">
          {items.map((p) => {
            const chips = chipsFor(p);
            return (
              <Pressable
                key={p.id}
                onPress={() =>
                  router.push({ pathname: '/product-detail/[productId]', params: { productId: p.id } } as never)
                }
                className="w-[48.5%] overflow-hidden rounded-2xl border border-slate-200 bg-card shadow-sm"
              >
                <ProductImage
                  uri={p.images[0] ? imageUrlMap[p.images[0]] : undefined}
                  className="h-28 w-full bg-slate-100"
                  iconSize={26}
                />
                <View className="p-3">
                  <Text numberOfLines={2} className="text-sm font-bold leading-snug text-slate-800">
                    {ar ? p.ar || p.en : p.en || p.ar}
                  </Text>
                  {!!p.companyId && !!supplierNames[p.companyId] && (
                    <Text numberOfLines={1} className="mt-1 text-[11px] text-slate-500">
                      {supplierNames[p.companyId]}
                    </Text>
                  )}
                  {chips.length > 0 && (
                    <View className="mt-1.5 flex-row flex-wrap gap-1">
                      {chips.map((c) => (
                        <View key={c.label} className="rounded-md bg-slate-100 px-1.5 py-0.5">
                          <Text className="text-[9px] text-slate-500">
                            {c.label}: {c.value}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <Text className="mt-1.5 text-xs font-extrabold text-primary">
                    {fmtPrice(p)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
