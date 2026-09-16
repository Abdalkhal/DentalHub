import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { BadgeCheck, Check, Heart, MapPin, Package, ShoppingCart } from 'lucide-react-native';

import { Screen, Text } from '@/components/ui';
import { db } from '@/integrations/firebase/client';
import { getBrand } from '@/data/brands';
import { BRANCHES, CITIES } from '@/data/offices';
import { useProducts, type Product } from '@/lib/products';
import { useIsFavorited, toggleFavorite } from '@/lib/favoritesStore';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// Faithful port of the web brand-detail page (src/routes/brands.$brandId.tsx):
// live products (not the static `brand.products` seed data) filtered by
// brand name, grouped by product name across vendors, with a governorate
// filter and price/vendor-count sort. Deliberately kept verbatim including
// web's own quirk — "Add to cart" here only toggles a local checkmark, it
// never calls the real cart store on web either — so this mirrors that
// exactly instead of "fixing" it into a real add-to-cart action.
// One adaptation: web also has a redundant <select> dropdown duplicating
// the same vendor choice the tappable vendor rows already provide; skipped
// here since RN has no inline native <select> and it would add nothing a
// mobile user can't already do by tapping a row.

type RealVendor = { vendorAr: string; vendorEn: string; price: number; inStock: boolean; gov: string | null };
type RealProduct = { id: string; ar: string; en: string; branch: string; vendors: RealVendor[] };

function cityToGov(city?: string | null): string | null {
  if (!city) return null;
  const trimmed = city.trim();
  const lower = trimmed.toLowerCase();
  const match = CITIES.find((c) => c.id === lower || c.en.toLowerCase() === lower || c.ar === trimmed);
  return match ? match.id : null;
}

function matchesBrandName(p: Product, brandName: string, brandAr: string): boolean {
  const b = (p.brand || '').trim().toLowerCase();
  if (!b) return false;
  return b === brandName.toLowerCase() || b === brandAr.toLowerCase();
}

function minRealPrice(p: RealProduct): number {
  return Math.min(...p.vendors.map((v) => v.price));
}

type Sort = 'price' | 'vendor';

export default function BrandDetailScreen() {
  const { brandId } = useLocalSearchParams<{ brandId: string }>();
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const brand = getBrand(brandId ?? '');
  const [gov, setGov] = useState('all');
  const [sort, setSort] = useState<Sort>('price');
  const favorited = useIsFavorited(brand?.id ?? '');

  const { data: allProducts = [], isLoading } = useProducts();

  const brandProducts = useMemo(
    () => (brand ? allProducts.filter((p) => matchesBrandName(p, brand.name, brand.ar)) : []),
    [allProducts, brand],
  );

  const companyIds = useMemo(
    () => [...new Set(brandProducts.map((p) => p.companyId).filter((x): x is string => !!x))],
    [brandProducts],
  );

  const { data: supplierMap = {} } = useQuery({
    queryKey: ['brand-suppliers', companyIds],
    enabled: companyIds.length > 0,
    queryFn: async (): Promise<Record<string, { name: string; city: string }>> => {
      const map: Record<string, { name: string; city: string }> = {};
      await Promise.all(
        companyIds.map(async (id) => {
          try {
            const snap = await getDoc(doc(db, 'user_roles', id));
            if (snap.exists()) {
              const u = snap.data() as Record<string, unknown>;
              map[id] = { name: String(u.name || ''), city: String(u.city || '') };
            }
          } catch {}
        }),
      );
      return map;
    },
  });

  const grouped = useMemo(() => {
    const groups = new Map<string, Product[]>();
    for (const p of brandProducts) {
      const key = (p.en || p.ar).trim().toLowerCase();
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    const result: RealProduct[] = [];
    for (const prods of groups.values()) {
      const first = prods[0];
      result.push({
        id: first.id,
        ar: first.ar,
        en: first.en,
        branch: first.branch,
        vendors: prods.map((p) => {
          const supplier = supplierMap[p.companyId || ''];
          return {
            vendorAr: supplier?.name || (ar ? 'مكتب' : 'Office'),
            vendorEn: supplier?.name || 'Office',
            price: p.price,
            inStock: p.inStock,
            gov: cityToGov(supplier?.city),
          };
        }),
      });
    }
    return result;
  }, [brandProducts, supplierMap, ar]);

  const products = useMemo(
    () =>
      [...grouped].sort((a, b) =>
        sort === 'price' ? minRealPrice(a) - minRealPrice(b) : b.vendors.length - a.vendors.length,
      ),
    [grouped, sort],
  );

  const tabs = [{ id: 'all', ar: 'الكل', en: 'All' }, ...CITIES.map((c) => ({ id: c.id, ar: c.ar, en: c.en }))];
  const activeGovLabel = tabs.find((t) => t.id === gov)?.ar ?? '';

  if (!brand) {
    return (
      <Screen>
        <Text className="mt-16 text-center text-slate-400">
          {ar ? 'هذا البراند غير موجود' : 'This brand does not exist'}
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* Banner */}
      <View className="relative overflow-hidden rounded-3xl p-4" style={{ backgroundColor: '#2563EB' }}>
        <Pressable
          onPress={() =>
            toggleFavorite(
              {
                id: brand.id,
                title: ar ? brand.ar : brand.name,
                vendor: ar ? brand.countryAr : brand.countryEn,
                price: 0,
                currency: 'USD',
                addedAt: new Date().toISOString(),
                kind: 'brand',
              },
              lang,
            )
          }
          className="absolute end-3 top-3 z-10 h-9 w-9 items-center justify-center rounded-full bg-white/20"
        >
          <Heart size={16} color="#FFFFFF" fill={favorited ? '#FFFFFF' : 'none'} />
        </Pressable>
        <View className="flex-row items-center gap-3">
          <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-sm">
            {brand.image ? (
              <Image source={{ uri: brand.image }} className="h-full w-full" resizeMode="contain" />
            ) : (
              <Text className="text-lg font-extrabold" style={{ color: brand.color }}>
                {(ar ? brand.ar : brand.name).slice(0, 2).toUpperCase()}
              </Text>
            )}
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-lg font-extrabold text-white">{ar ? brand.ar : brand.name}</Text>
            <View className="mt-1 flex-row items-center gap-1">
              <MapPin size={13} color="rgba(255,255,255,0.9)" />
              <Text className="text-xs text-white/90">{ar ? brand.countryAr : brand.countryEn}</Text>
            </View>
            <View className="mt-2 flex-row items-center gap-1 self-start rounded-full bg-white px-2.5 py-1">
              <BadgeCheck size={13} color="#2563EB" />
              <Text className="text-[11px] font-bold text-slate-800">
                {ar ? `${brand.distributors} وكيل معتمد` : `${brand.distributors} certified distributors`}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Governorate tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
        <View className="flex-row gap-2 pb-1">
          {tabs.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setGov(t.id)}
              className={cn(
                'h-9 items-center justify-center rounded-full border px-3.5',
                gov === t.id ? 'border-primary bg-primary' : 'border-slate-200 bg-white',
              )}
            >
              <Text className={cn('text-xs font-bold', gov === t.id ? 'text-primary-foreground' : 'text-slate-700')}>
                {ar ? t.ar : t.en}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Sort */}
      <View className="mt-3 flex-row items-center gap-2">
        <Text className="text-[11px] text-slate-500">{ar ? 'ترتيب:' : 'Sort:'}</Text>
        {(['price', 'vendor'] as Sort[]).map((s) => (
          <Pressable
            key={s}
            onPress={() => setSort(s)}
            className={cn(
              'h-8 items-center justify-center rounded-full border px-3',
              sort === s ? 'border-primary bg-primary/10' : 'border-slate-200 bg-white',
            )}
          >
            <Text className={cn('text-[11px] font-bold', sort === s ? 'text-primary' : 'text-slate-500')}>
              {s === 'price' ? (ar ? 'حسب السعر' : 'By price') : ar ? 'حسب المكاتب' : 'By vendors'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Products */}
      {isLoading ? (
        <Text className="py-10 text-center text-sm text-slate-400">{ar ? 'جارٍ التحميل…' : 'Loading…'}</Text>
      ) : products.length === 0 ? (
        <View className="items-center py-16">
          <Package size={48} color="#CBD5E1" />
          <Text className="mt-3 text-center text-sm font-semibold text-slate-400">
            {ar ? 'لا توجد منتجات مضافة لهذا البراند حالياً.' : 'No products added for this brand yet.'}
          </Text>
        </View>
      ) : (
        <View className="mt-4 gap-3">
          {products.map((p) => (
            <ProductCard key={`${p.id}-${gov}`} product={p} color={brand.color} gov={gov} activeGovLabel={activeGovLabel} ar={ar} />
          ))}
        </View>
      )}

      <Pressable onPress={() => router.push('/brands')} className="mt-6">
        <Text className="text-center text-xs font-bold text-primary">{ar ? 'كل البراندات ›' : 'All brands ›'}</Text>
      </Pressable>
    </Screen>
  );
}

function ProductCard({
  product,
  color,
  gov,
  activeGovLabel,
  ar,
}: {
  product: RealProduct;
  color: string;
  gov: string;
  activeGovLabel: string;
  ar: boolean;
}) {
  const [vendorIdx, setVendorIdx] = useState(0);
  const [added, setAdded] = useState(false);
  const branch = BRANCHES.find((b) => b.slug === product.branch);

  const filteredVendors = gov === 'all' ? product.vendors : product.vendors.filter((v) => v.gov === gov);
  const safeIdx = Math.min(vendorIdx, Math.max(filteredVendors.length - 1, 0));
  const vendor = filteredVendors[safeIdx];

  return (
    <View className="rounded-2xl border border-slate-200 bg-card p-3 shadow-sm">
      <View className="flex-row items-start gap-3">
        <View className="h-16 w-16 items-center justify-center rounded-xl bg-slate-50 px-1">
          <Text numberOfLines={2} className="text-center text-[10px] font-extrabold" style={{ color }}>
            {product.en.split(' ').slice(0, 2).join(' ')}
          </Text>
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[13px] font-extrabold text-slate-800" numberOfLines={2}>
            {ar ? product.ar : product.en}
          </Text>
          <Text className="text-[11px] text-slate-400" numberOfLines={1}>
            {product.en}
          </Text>
          {!!branch && (
            <View className="mt-1 self-start rounded-full bg-primary/10 px-2 py-0.5">
              <Text className="text-[10px] font-bold text-primary">{ar ? branch.ar : branch.en}</Text>
            </View>
          )}
        </View>
      </View>

      {filteredVendors.length === 0 ? (
        <View className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <Text className="text-center text-[12px] font-semibold text-amber-700">
            {ar
              ? `غير متوفر في ${activeGovLabel} حالياً - اختر (الكل) لرؤية المكاتب في باقي المحافظات`
              : `Not available in ${activeGovLabel} right now — select (All) to see offices in other governorates`}
          </Text>
        </View>
      ) : (
        <>
          <Text className="mt-3 text-[11px] font-bold text-slate-800">
            {ar ? 'المكاتب الموفرة للمادة' : 'Available vendors'}{' '}
            <Text className="font-normal text-slate-400">({filteredVendors.length})</Text>
          </Text>
          <View className="mt-1.5 gap-1.5">
            {filteredVendors.map((v, i) => (
              <Pressable
                key={`${v.vendorEn}-${i}`}
                onPress={() => {
                  setVendorIdx(i);
                  setAdded(false);
                }}
                className={cn(
                  'flex-row items-center justify-between gap-2 rounded-xl border px-2.5 py-2',
                  i === safeIdx ? 'border-primary/40 bg-primary/5' : 'border-slate-200 bg-white',
                )}
              >
                <View className="min-w-0 flex-1">
                  <Text className="text-[12px] font-semibold text-slate-800" numberOfLines={1}>
                    {ar ? v.vendorAr : v.vendorEn}
                  </Text>
                  <Text className={cn('text-[10px] font-bold', v.inStock ? 'text-emerald-600' : 'text-amber-600')}>
                    {v.inStock ? (ar ? 'متوفر' : 'In stock') : ar ? 'ينفذ قريباً' : 'Low stock'}
                  </Text>
                </View>
                <Text className="shrink-0 text-sm font-extrabold text-primary">${v.price}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={() => setAdded(true)}
            disabled={!vendor || !vendor.inStock}
            className={cn(
              'mt-3 h-10 flex-row items-center justify-center gap-1.5 rounded-xl',
              added ? 'bg-emerald-600' : 'bg-primary',
              (!vendor || !vendor.inStock) && 'opacity-50',
            )}
          >
            {added ? <Check size={16} color="#FFFFFF" /> : <ShoppingCart size={16} color="#FFFFFF" />}
            <Text className="text-xs font-bold text-white">
              {added ? (ar ? 'تمت الإضافة' : 'Added') : ar ? 'إضافة للسلة' : 'Add to cart'}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
