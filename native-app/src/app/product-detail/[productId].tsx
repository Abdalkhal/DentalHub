import { useLayoutEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, Share, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { MapPin, MessageCircle, Phone } from 'lucide-react-native';

import { Screen, Text, Spinner, Button } from '@/components/ui';
import { ProductImage } from '@/components/ProductImage';
import { db } from '@/integrations/firebase/client';
import { useProducts, useSignedImageUrls, type Product } from '@/lib/products';
import { addToCart } from '@/lib/cartStore';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

function fmtPrice(p: Product): string {
  return p.currency === 'IQD' ? `${p.price.toLocaleString()} د.ع` : `$${p.price.toFixed(2)}`;
}

function specRows(p: Product, ar: boolean): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  if (p.boneGraft?.graftType) out.push({ label: ar ? 'النوع' : 'Type', value: p.boneGraft.graftType });
  if (p.boneGraft?.particleSize)
    out.push({ label: ar ? 'الحبيبات' : 'Particle size', value: p.boneGraft.particleSize });
  if (p.specializedImplant) {
    const fields = p.specializedImplant.fields ?? {};
    Object.entries(fields as Record<string, unknown>).forEach(([k, v]) => {
      if (Array.isArray(v) && (v as unknown[]).length)
        out.push({ label: k, value: (v as string[]).join(' · ') });
      else if (typeof v === 'string' && v) out.push({ label: k, value: v });
    });
  }
  return out;
}

export default function ProductDetailScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const [galleryW, setGalleryW] = useState(0);
  const [page, setPage] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const [added, setAdded] = useState(false);

  const { data: products = [], isLoading } = useProducts();
  const product = products.find((p) => p.id === productId);

  const { data: urlMap = {} } = useSignedImageUrls(product?.images ?? []);
  const images = useMemo(
    () => (product?.images ?? []).map((p) => urlMap[p]).filter((u): u is string => !!u),
    [product, urlMap],
  );

  const { data: office } = useQuery({
    queryKey: ['product-office', product?.companyId],
    enabled: !!product?.companyId,
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'user_roles', product!.companyId!));
      return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
    },
    staleTime: 60_000,
  });

  const related = useMemo(() => {
    if (!product) return [];
    return products.filter((p) => p.id !== product.id && p.branch === product.branch).slice(0, 8);
  }, [products, product]);

  useLayoutEffect(() => {
    setPage(0);
  }, [productId]);

  if (isLoading) return <Spinner />;

  if (!product) {
    return (
      <Screen>
        <Text className="mt-10 text-center text-slate-500">
          {ar ? 'المنتج غير موجود' : 'Product not found'}
        </Text>
      </Screen>
    );
  }

  const specs = specRows(product, ar);
  const inStock = product.stock == null || product.stock > 0;
  const officeName = String(office?.name || '');
  const officePhone = typeof office?.phone === 'string' ? office.phone : '';
  const officeCity = String(office?.city || '');

  const addToCartBtn = () => {
    addToCart({
      productId: product.id,
      productName: product.ar || product.en,
      productImage: images[0],
      officeId: product.companyId || '',
      officeName: officeName || product.brand || (ar ? 'المورد' : 'Supplier'),
      brand: product.brand,
      category: product.branch,
      unitPrice: product.price,
      currency: product.currency,
      quantity: 1,
    });
    setAdded(true);
    toast.success(ar ? 'تمت إضافة المنتج إلى السلة' : 'Added to cart');
    setTimeout(() => setAdded(false), 1500);
  };

  const share = async () => {
    await Share.share({
      message: `${product.ar || product.en} — ${fmtPrice(product)}`,
    });
  };

  return (
    <Screen scroll={false}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16 }}
      >
        {/* Gallery */}
        <View
          onLayout={(e) => {
            const w = Math.round(e.nativeEvent.layout.width);
            if (w > 0 && w !== galleryW) setGalleryW(w);
          }}
        >
          {images.length > 0 ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  if (galleryW > 0) {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / galleryW);
                    setPage(Math.min(Math.max(idx, 0), images.length - 1));
                  }
                }}
              >
                {images.map((uri, i) => (
                  <View key={uri + i} style={{ width: galleryW > 0 ? galleryW : undefined }}>
                    <ProductImage
                      uri={uri}
                      className="h-64 w-full rounded-2xl bg-slate-100"
                      resizeMode="contain"
                      iconSize={52}
                    />
                  </View>
                ))}
              </ScrollView>
              {images.length > 1 && (
                <View className="mt-2 flex-row items-center justify-center gap-1.5">
                  {images.map((_, i) => (
                    <View
                      key={i}
                      className={cn('rounded-full', i === page ? 'h-2 w-4 bg-primary' : 'h-1.5 w-1.5 bg-slate-300')}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <ProductImage uri={undefined} className="h-64 w-full rounded-2xl bg-slate-100" iconSize={52} />
          )}
        </View>

        {/* Info */}
        <View className="mt-4 flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="text-xl font-extrabold text-slate-800">
              {ar ? product.ar || product.en : product.en || product.ar}
            </Text>
            {!!product.brand && <Text className="mt-1 text-sm text-slate-500">{product.brand}</Text>}
          </View>
          <View
            className={cn(
              'shrink-0 rounded-full px-2.5 py-1',
              inStock ? 'bg-emerald-50' : 'bg-rose-50',
            )}
          >
            <Text className={cn('text-[10px] font-bold', inStock ? 'text-emerald-600' : 'text-rose-500')}>
              {inStock
                ? ar
                  ? product.stock != null
                    ? `متوفر (${product.stock})`
                    : 'متوفر'
                  : product.stock != null
                    ? `In stock (${product.stock})`
                    : 'In stock'
                : ar
                  ? 'نفد'
                  : 'Out of stock'}
            </Text>
          </View>
        </View>

        <View className="mt-3 flex-row items-center justify-between rounded-2xl border border-slate-200 bg-card px-4 py-3 shadow-sm">
          <Text className="text-xs text-slate-500">{ar ? 'السعر' : 'Price'}</Text>
          <Text className="text-xl font-extrabold text-primary">{fmtPrice(product)}</Text>
        </View>

        {/* Supplier */}
        {!!officeName && (
          <Pressable
            onPress={() =>
              product.companyId &&
              router.push({ pathname: '/profile/[accountId]', params: { accountId: product.companyId } })
            }
            className="mt-3 flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-card p-3 shadow-sm"
          >
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
              <Text className="text-lg font-extrabold text-emerald-700">{officeName.charAt(0)}</Text>
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-bold text-slate-800" numberOfLines={1}>
                {officeName}
              </Text>
              {!!officeCity && (
                <View className="mt-0.5 flex-row items-center gap-1.5">
                  <MapPin size={12} color="#64748B" />
                  <Text className="text-xs text-slate-500" numberOfLines={1}>
                    {officeCity}
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-xs font-bold text-primary">{ar ? 'الملف ›' : 'Profile ›'}</Text>
          </Pressable>
        )}

        {(!!officePhone || !!officeName) && (
          <View className="mt-3 flex-row gap-2">
            {!!officePhone && (
              <Pressable
                onPress={() => Linking.openURL(`tel:${officePhone}`)}
                className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-emerald-500"
              >
                <Phone size={15} color="#FFFFFF" />
                <Text className="text-xs font-bold text-white">{ar ? 'اتصال' : 'Call'}</Text>
              </Pressable>
            )}
            {!!officePhone && (
              <Pressable
                onPress={() => Linking.openURL(`https://wa.me/${officePhone.replace(/\D/g, '')}`)}
                className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-[#25D366]"
              >
                <MessageCircle size={15} color="#FFFFFF" />
                <Text className="text-xs font-bold text-white">WhatsApp</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Description */}
        {!!product.description && (
          <View className="mt-3 rounded-2xl border border-slate-200 bg-card p-4 shadow-sm">
            <Text className="text-xs font-bold text-slate-500">{ar ? 'الوصف' : 'Description'}</Text>
            <Text
              className="mt-1 text-sm leading-relaxed text-slate-700"
              numberOfLines={showMore ? undefined : 4}
            >
              {product.description}
            </Text>
            {product.description.length > 160 && (
              <Pressable onPress={() => setShowMore((s) => !s)} className="mt-1 self-start">
                <Text className="text-xs font-bold text-primary">
                  {showMore ? (ar ? 'أقل' : 'Less') : ar ? 'اقرأ المزيد' : 'Read more'}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Specs */}
        {specs.length > 0 && (
          <View className="mt-3 rounded-2xl border border-slate-200 bg-card p-4 shadow-sm">
            <Text className="mb-2 text-sm font-extrabold text-slate-800">
              {ar ? 'المواصفات' : 'Specifications'}
            </Text>
            <View className="gap-2">
              {specs.map((s) => (
                <View key={s.label + s.value} className="flex-row items-start justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                  <Text className="text-xs font-bold text-slate-500">{s.label}</Text>
                  <Text className="max-w-[60%] text-end text-xs font-semibold text-slate-800">{s.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Related */}
        {related.length > 0 && (
          <View className="mt-5">
            <Text className="mb-2.5 text-sm font-extrabold text-slate-800">
              {ar ? 'منتجات مشابهة' : 'Related products'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2.5">
                {related.map((rp) => (
                  <Pressable
                    key={rp.id}
                    onPress={() =>
                      router.push({ pathname: '/product-detail/[productId]', params: { productId: rp.id } })
                    }
                    className="w-36 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <ProductImage uri={urlMap[rp.images[0]]} className="h-24 w-full bg-slate-100" iconSize={22} />
                    <View className="p-2">
                      <Text className="text-xs font-bold text-slate-800" numberOfLines={2}>
                        {ar ? rp.ar || rp.en : rp.en || rp.ar}
                      </Text>
                      <Text className="mt-1 text-xs font-extrabold text-primary">{fmtPrice(rp)}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Sticky action bar */}
      <View className="flex-row gap-2 border-t border-slate-200 bg-white px-4 py-3">
        <Button variant="outline" title={ar ? 'مشاركة' : 'Share'} onPress={share} className="flex-1" />
        <Button
          title={added ? (ar ? 'تمت الإضافة ✓' : 'Added ✓') : ar ? 'أضف للسلة' : 'Add to cart'}
          onPress={addToCartBtn}
          disabled={!inStock}
          className="flex-[2]"
        />
      </View>
    </Screen>
  );
}
