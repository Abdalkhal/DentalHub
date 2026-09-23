import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { Calendar, Check, ChevronLeft, ChevronRight, Heart, MapPin, Minus, Package, Phone, Plus, ShoppingCart } from 'lucide-react-native';

import { Screen, Text, Spinner } from '@/components/ui';
import { ProductImage } from '@/components/ProductImage';
import { db } from '@/integrations/firebase/client';
import { useProducts, useSignedImageUrls, type Product } from '@/lib/products';
import { addToCart } from '@/lib/cartStore';
import { addToPurchaseHistory } from '@/lib/quickOrders';
import { useIsFavorited, toggleFavorite } from '@/lib/favoritesStore';
import { ALL_COUNTRIES, countryFlagUrl } from '@/data/countries';
import { SPEC_FIELDS, type SpecFieldId } from '@/data/specs';
import { SPECIALIZED_CATEGORIES, SPECIALIZED_FIELDS } from '@/data/specializedImplants';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { UserRoleDoc } from '@/integrations/firebase/types';

// Faithful port of the web PRODUCT MODAL a dentist actually sees when
// tapping a product on a supply office's profile (src/components/
// ProductDetailsModal.tsx, opened with isDoctorView from
// src/routes/profile.$accountId.tsx) — not the separate, effectively-unused
// src/routes/products.$productId.tsx route this screen was ported from
// earlier, which is a different, simpler page. Rendered as a full screen
// here (matching this app's established convention of porting web bottom
// sheets as dedicated screens) rather than an overlay modal, but every
// section/field below matches the modal's content and order.

const SURGICAL_GUIDE_TOOLS = [
  { ar: 'طقم الدليل الجراحي', en: 'Surgical guide kit' },
  { ar: 'طقم الحفر الموجّه', en: 'Guided drill kit' },
  { ar: 'جلبات التوجيه', en: 'Guided sleeves' },
  { ar: 'أدوات الجراحة الموجّهة', en: 'Guided Surgical Tools' },
];

function MetaRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <View className="flex-row items-center gap-2">
      {icon}
      <Text className="w-36 shrink-0 text-[11px] font-bold text-slate-400">{label}</Text>
      <View className="min-w-0 flex-1">{children}</View>
    </View>
  );
}

export default function ProductDetailScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const { data: products = [], isLoading } = useProducts();
  const product = products.find((p) => p.id === productId);
  const favorited = useIsFavorited(productId ?? '');

  const { data: urlMap = {} } = useSignedImageUrls(product?.images ?? []);
  const images = useMemo(
    () => (product?.images ?? []).map((p) => urlMap[p]).filter((u): u is string => !!u),
    [product, urlMap],
  );

  const { data: clinicalUrlMap = {} } = useSignedImageUrls(product?.specializedImplant?.clinicalImages ?? []);

  const { data: office } = useQuery({
    queryKey: ['product-office', product?.companyId],
    enabled: !!product?.companyId,
    queryFn: async (): Promise<UserRoleDoc | null> => {
      const snap = await getDoc(doc(db, 'public_profiles', product!.companyId!));
      return snap.exists() ? (snap.data() as UserRoleDoc) : null;
    },
    staleTime: 60_000,
  });

  const spec = product?.specializedImplant;
  const categoryMeta = spec ? SPECIALIZED_CATEGORIES.find((c) => c.id === spec.category) : null;
  const specializedEntries = useMemo(() => {
    if (!spec) return [];
    const out: { label: string; value: string }[] = [];
    const fieldDefs = SPECIALIZED_FIELDS[spec.category] ?? [];
    Object.entries(spec.fields ?? {}).forEach(([id, v]) => {
      const field = fieldDefs.find((f) => f.id === id);
      const label = field ? (ar ? field.ar : field.en) : id;
      if (Array.isArray(v)) {
        if (v.length > 0) {
          const parts = v.map((x) => {
            const opt = field?.options?.find((o) => o.value === x);
            return opt ? (ar ? (opt.ar ?? opt.value) : opt.value) : x;
          });
          out.push({ label, value: parts.join(' · ') });
        }
      } else if (typeof v === 'string' && v) {
        const opt = field?.options?.find((o) => o.value === v);
        out.push({ label, value: opt ? (ar ? (opt.ar ?? opt.value) : opt.value) : v });
      }
    });
    return out;
  }, [spec, ar]);

  const country = product?.country ? ALL_COUNTRIES.find((c) => c.code === product.country) : null;

  const isIQD = product?.currency === 'IQD';
  const sym = isIQD ? 'د.ع' : '$';
  const money = (n: number) => (isIQD ? `${Number(n).toLocaleString()} ${sym}` : `${sym}${n.toFixed(2)}`);

  const specEntries = useMemo(() => {
    if (!product) return [];
    const bags = [product.technicalSpecifications ?? {}, product.specs ?? {}];
    const out: { label: string; value: string }[] = [];
    bags.forEach((bag) => {
      (Object.entries(bag) as [SpecFieldId, string | string[]][]).forEach(([id, v]) => {
        const field = SPEC_FIELDS[id];
        if (!field) return;
        if (Array.isArray(v)) {
          if (v.length > 0) out.push({ label: ar ? field.ar : field.en, value: v.join(' · ') });
        } else if (typeof v === 'string' && v) {
          const opt = field.options?.find((o) => o.value === v);
          out.push({ label: ar ? field.ar : field.en, value: opt?.ar ?? v });
        }
      });
    });
    return out;
  }, [product, ar]);

  const cartSpecs = useMemo(() => {
    if (!product) return {};
    const out: Record<string, string> = {};
    const bags = [product.technicalSpecifications ?? {}, product.specs ?? {}];
    bags.forEach((bag) => {
      (Object.entries(bag) as [SpecFieldId, string | string[]][]).forEach(([id, v]) => {
        const field = SPEC_FIELDS[id];
        const label = field ? (ar ? field.ar : field.en) : id;
        if (Array.isArray(v)) {
          if (v.length > 0) out[label] = v.join('، ');
        } else if (typeof v === 'string' && v) {
          const opt = field?.options?.find((o) => o.value === v);
          out[label] = opt?.ar ?? v;
        }
      });
    });
    return out;
  }, [product, ar]);

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

  const name = ar ? product.ar || product.en : product.en || product.ar;
  const officeName = String(office?.name || '') || (ar ? 'المكتب' : 'Office');
  const officeCity = String(office?.city || '');
  const inStock = product.inStock ?? true;

  const prev = () => setActiveImg((i) => (images.length === 0 ? 0 : (i - 1 + images.length) % images.length));
  const next = () => setActiveImg((i) => (images.length === 0 ? 0 : (i + 1) % images.length));

  const toggleFav = () =>
    toggleFavorite(
      {
        id: product.id,
        title: name,
        vendor: officeName,
        price: product.price,
        currency: product.currency,
        imageUrl: images[0],
        addedAt: new Date().toISOString(),
        kind: product.category === 'implant' ? 'implant' : 'product',
      },
      lang,
    );

  const handleAdd = () => {
    addToCart({
      productId: product.id,
      productName: name,
      productImage: images[0],
      officeId: product.companyId || '',
      officeName,
      brand: product.brand,
      category: product.branch,
      specs: cartSpecs,
      unitPrice: product.price,
      currency: product.currency,
      quantity: qty,
    });
    addToPurchaseHistory({
      productId: product.id,
      productName: name,
      vendor: officeName,
      brand: product.brand,
      unitPrice: product.price,
      image: images[0],
      qty,
    });
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      setQty(1);
    }, 1500);
  };

  return (
    <Screen scroll={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
        {/* Supplier contact card (specialized implants only) */}
        {!!spec && !!office && (
          <View className="mb-4 flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-card p-3 shadow-sm">
            <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-indigo-50">
              {office.photoURL ? (
                <Image source={{ uri: office.photoURL }} className="h-full w-full" resizeMode="cover" />
              ) : (
                <Text className="font-bold text-indigo-600">{(office.name || '؟').charAt(0)}</Text>
              )}
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-bold text-slate-800" numberOfLines={1}>
                {office.name}
              </Text>
              {!!office.phone && (
                <View className="mt-0.5 flex-row items-center gap-1">
                  <Phone size={11} color="#94A3B8" />
                  <Text className="text-[11px] text-slate-500" style={{ writingDirection: 'ltr' }}>
                    {office.phone}
                  </Text>
                </View>
              )}
            </View>
            <Pressable
              onPress={() =>
                product.companyId &&
                router.push({ pathname: '/profile/[accountId]', params: { accountId: product.companyId } })
              }
              className="shrink-0 rounded-xl bg-indigo-600 px-3 py-2"
            >
              <Text className="text-xs font-bold text-white">{ar ? 'زيارة الملف الشخصي' : 'Visit Profile'}</Text>
            </Pressable>
          </View>
        )}

        {/* Image gallery */}
        <View className="relative overflow-hidden rounded-2xl bg-slate-100">
          <Pressable
            onPress={toggleFav}
            className="absolute end-3 top-3 z-10 h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm"
          >
            <Heart size={17} color="#EF4444" fill={favorited ? '#EF4444' : 'none'} />
          </Pressable>
          {images.length > 0 ? (
            <>
              <ProductImage uri={images[activeImg]} className="h-64 w-full" resizeMode="contain" iconSize={48} />
              {images.length > 1 && (
                <>
                  <Pressable
                    onPress={prev}
                    className="absolute start-2 top-1/2 h-8 w-8 -translate-y-4 items-center justify-center rounded-full bg-white/90 shadow-sm"
                  >
                    <ChevronRight size={16} color="#334155" />
                  </Pressable>
                  <Pressable
                    onPress={next}
                    className="absolute end-2 top-1/2 h-8 w-8 -translate-y-4 items-center justify-center rounded-full bg-white/90 shadow-sm"
                  >
                    <ChevronLeft size={16} color="#334155" />
                  </Pressable>
                  <View className="absolute inset-x-0 bottom-2 flex-row items-center justify-center gap-1.5">
                    {images.map((_, i) => (
                      <View key={i} className={cn('h-2 rounded-full', i === activeImg ? 'w-4 bg-emerald-600' : 'w-2 bg-slate-300')} />
                    ))}
                  </View>
                </>
              )}
            </>
          ) : (
            <View className="h-64 w-full items-center justify-center">
              <Package size={48} color="#CBD5E1" />
            </View>
          )}
        </View>

        <View className="mt-4 gap-4">
          {/* Name + brand */}
          <View>
            <Text className="text-lg font-bold leading-snug text-slate-900">{name}</Text>
            {!!product.brand && <Text className="mt-0.5 text-xs text-slate-500">{product.brand}</Text>}
          </View>

          {/* Description */}
          {!!product.description && (
            <View className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <Text className="mb-1 text-[11px] font-bold text-slate-400">{ar ? 'الوصف' : 'Description'}</Text>
              <Text className="text-[13px] leading-relaxed text-slate-700">{product.description}</Text>
            </View>
          )}

          {/* Price & stock */}
          <View className="flex-row items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
            <View>
              <Text className="text-[11px] font-bold text-emerald-700/70">{ar ? 'السعر' : 'Price'}</Text>
              <Text className="text-lg font-extrabold text-emerald-700">{money(product.price)}</Text>
            </View>
            <View className="items-end">
              <Text className="text-[11px] font-bold text-emerald-700/70">{ar ? 'المخزون' : 'Stock'}</Text>
              <Text className={cn('text-lg font-extrabold', product.stock > 0 ? 'text-emerald-700' : 'text-rose-600')}>
                {product.stock}
              </Text>
            </View>
          </View>

          {/* Meta: origin + expiry */}
          {(!!country || !!product.countryOrigin || !!product.expiryDate) && (
            <View className="gap-2">
              {(!!country || !!product.countryOrigin) && (
                <MetaRow icon={<MapPin size={14} color="#94A3B8" />} label={ar ? 'بلد المنشأ' : 'Country of Origin'}>
                  <View className="flex-row items-center gap-1.5">
                    {!!country && (
                      <Image source={{ uri: countryFlagUrl(country.code) }} className="h-3.5 w-4 rounded-sm" />
                    )}
                    <Text className="text-[13px] text-slate-600">{product.countryOrigin || country?.ar}</Text>
                  </View>
                </MetaRow>
              )}
              {!!product.expiryDate && (
                <MetaRow icon={<Calendar size={14} color="#94A3B8" />} label={ar ? 'تاريخ انتهاء الصلاحية' : 'Expiration Date'}>
                  <Text className="text-[13px] text-slate-600" style={{ writingDirection: 'ltr' }}>
                    {product.expiryDate}
                  </Text>
                </MetaRow>
              )}
            </View>
          )}

          {/* Surgical guide system */}
          {!!product.surgicalGuide && (
            <View className="overflow-hidden rounded-2xl border border-slate-200">
              <View className="flex-row items-center justify-between bg-slate-50 px-3 py-2">
                <Text className="text-xs font-bold text-slate-500">{ar ? 'نظام الدليل الجراحي' : 'Surgical Guide System'}</Text>
                <View className={cn('rounded-full px-2 py-0.5', product.surgicalGuide === 'Guided' ? 'bg-emerald-100' : 'bg-slate-100')}>
                  <Text className={cn('text-[10px] font-bold', product.surgicalGuide === 'Guided' ? 'text-emerald-700' : 'text-slate-500')}>
                    {product.surgicalGuide === 'Guided' ? (ar ? 'موجّه' : 'Guided') : ar ? 'غير موجّه' : 'Unguided'}
                  </Text>
                </View>
              </View>
              {product.surgicalGuide === 'Guided' && !!product.surgicalGuideTools?.length && (
                <View className="gap-2 px-3 py-2.5">
                  {product.surgicalGuideTools.map((tool) => {
                    const def = SURGICAL_GUIDE_TOOLS.find((t) => t.en === tool);
                    return (
                      <View key={tool} className="flex-row items-center gap-2">
                        <View className="h-5 w-5 items-center justify-center rounded-md bg-emerald-50">
                          <Check size={12} color="#059669" />
                        </View>
                        <Text className="text-[13px] text-slate-700">{ar && def ? def.ar : tool}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Surgical kit details */}
          {!!product.surgicalKit && (
            <View className="overflow-hidden rounded-2xl border border-slate-200">
              <View className="bg-slate-50 px-3 py-2">
                <Text className="text-xs font-bold text-slate-500">{ar ? 'الكت الجراحي' : 'Surgical Kit'}</Text>
              </View>
              <View className="gap-1.5 p-3">
                {!!product.surgicalKit.kitType && (
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="text-[13px] text-slate-500">{ar ? 'نوع الكت' : 'Kit Type'}</Text>
                    <Text className="text-end text-[13px] font-semibold text-slate-700">{product.surgicalKit.kitType}</Text>
                  </View>
                )}
                {!!product.surgicalKit.placementType && (
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="text-[13px] text-slate-500">{ar ? 'بروتوكول الزرع' : 'Placement'}</Text>
                    <Text className="text-end text-[13px] font-semibold text-slate-700">{product.surgicalKit.placementType}</Text>
                  </View>
                )}
                {!!product.surgicalKit.toolsCount && (
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="text-[13px] text-slate-500">{ar ? 'عدد الأدوات' : 'Tools Count'}</Text>
                    <Text className="text-[13px] font-semibold text-slate-700">{product.surgicalKit.toolsCount}</Text>
                  </View>
                )}
                {!!product.sku && (
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="text-[13px] text-slate-500">SKU</Text>
                    <Text className="text-[13px] font-semibold text-slate-700" style={{ writingDirection: 'ltr' }}>
                      {product.sku}
                    </Text>
                  </View>
                )}
                {!!product.surgicalKit.compatibility?.length && (
                  <View className="flex-row flex-wrap gap-1.5 pt-1">
                    {product.surgicalKit.compatibility.map((c) => (
                      <View key={c} className="rounded-full bg-emerald-50 px-2 py-0.5">
                        <Text className="text-[10px] font-bold text-emerald-700">{c}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Specialized implant */}
          {!!spec && (
            <View className="overflow-hidden rounded-2xl border border-indigo-200 bg-indigo-50/40">
              <View className="flex-row items-center justify-between bg-indigo-50 px-3 py-2">
                <Text className="text-xs font-bold text-indigo-600">{ar ? 'زرعة متخصصة' : 'Specialized Implant'}</Text>
                {!!categoryMeta && (
                  <View className="rounded-full bg-indigo-600 px-2 py-0.5">
                    <Text className="text-[10px] font-bold text-white">{ar ? categoryMeta.ar : categoryMeta.en}</Text>
                  </View>
                )}
              </View>
              {specializedEntries.length > 0 && (
                <View className="gap-1.5 px-3 py-2.5">
                  {specializedEntries.map((s, i) => (
                    <View key={i} className="flex-row items-center justify-between gap-3">
                      <Text className="text-[13px] text-slate-500">{s.label}</Text>
                      <Text className="max-w-[60%] text-end text-[13px] font-semibold text-slate-800">{s.value}</Text>
                    </View>
                  ))}
                </View>
              )}
              {!!spec.clinicalImages?.length && (
                <View className="px-3 pb-3">
                  <Text className="mb-1.5 text-[11px] font-bold text-indigo-500">{ar ? 'صور حالات العمل' : 'Clinical Cases'}</Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    {spec.clinicalImages.map((path) => (
                      <ProductImage key={path} uri={clinicalUrlMap[path]} className="aspect-square w-[31%] rounded-lg" />
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Volume discounts table */}
          {!!product.discountTiers?.length && (
            <View>
              <Text className="mb-2 text-sm font-bold text-slate-800">{ar ? 'جدول الخصومات على الكمية' : 'Volume Discounts'}</Text>
              <View className="overflow-hidden rounded-2xl border border-slate-200">
                <View className="flex-row bg-slate-50 px-3 py-2">
                  <Text className="flex-1 text-[11px] font-bold text-slate-500">{ar ? 'من كمية' : 'From'}</Text>
                  <Text className="flex-1 text-[11px] font-bold text-slate-500">{ar ? 'إلى كمية' : 'To'}</Text>
                  <Text className="flex-1 text-center text-[11px] font-bold text-slate-500">{ar ? 'الخصم %' : 'Disc. %'}</Text>
                  <Text className="flex-1 text-end text-[11px] font-bold text-slate-500">{ar ? 'السعر' : 'Price'}</Text>
                </View>
                {product.discountTiers.map((t, i) => (
                  <View key={i} className="flex-row border-t border-slate-100 px-3 py-2">
                    <Text className="flex-1 text-xs text-slate-700">{t.fromQty}</Text>
                    <Text className="flex-1 text-xs text-slate-700">{t.toQty > 0 ? t.toQty : '∞'}</Text>
                    <Text className="flex-1 text-center text-xs text-slate-700">{t.discountPct > 0 ? `${t.discountPct}%` : '—'}</Text>
                    <Text className="flex-1 text-end text-xs font-semibold text-slate-700">{t.price > 0 ? money(t.price) : '—'}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Technical specifications */}
          {specEntries.length > 0 && (
            <View>
              <Text className="mb-2 text-sm font-bold text-slate-800">{ar ? 'المواصفات الفنية' : 'Technical Specifications'}</Text>
              <View className="overflow-hidden rounded-2xl border border-slate-200">
                {specEntries.map((s, i) => (
                  <View key={i} className={cn('flex-row px-3 py-2', i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60')}>
                    <Text className="w-1/2 text-xs font-semibold text-slate-500">{s.label}</Text>
                    <Text className="flex-1 text-xs text-slate-800">{s.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Cart footer */}
      <View className="gap-3 border-t border-slate-200 bg-white px-4 pb-4 pt-3">
        {/* Store profile — the specialized-implant card above already shows
            this same office with its own "Visit Profile" button, so this
            duplicate row only renders when that card doesn't (i.e. `!spec`). */}
        {!spec && (
          <Pressable
            onPress={() =>
              product.companyId &&
              router.push({ pathname: '/profile/[accountId]', params: { accountId: product.companyId } })
            }
            className="flex-row items-center gap-3 rounded-2xl border border-slate-200 p-3"
          >
            <View className="h-11 w-11 items-center justify-center rounded-full bg-emerald-50">
              <Text className="font-bold text-emerald-700">{officeName.charAt(0) || '؟'}</Text>
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-bold text-slate-800" numberOfLines={1}>
                {officeName}
              </Text>
              {!!officeCity && (
                <View className="mt-0.5 flex-row items-center gap-1">
                  <MapPin size={11} color="#94A3B8" />
                  <Text className="text-[11px] text-slate-500">{officeCity}</Text>
                </View>
              )}
            </View>
          </Pressable>
        )}

        {/* Quantity + Add to cart */}
        <View className="flex-row items-center gap-3">
          <View className="h-12 w-32 shrink-0 flex-row items-center justify-between rounded-2xl border border-slate-200 bg-slate-100 px-1">
            <Pressable onPress={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} className={cn('h-9 w-9 items-center justify-center', qty <= 1 && 'opacity-30')}>
              <Minus size={16} color="#475569" />
            </Pressable>
            <Text className="min-w-6 text-center text-sm font-bold text-slate-800">{qty}</Text>
            <Pressable onPress={() => setQty((q) => q + 1)} className="h-9 w-9 items-center justify-center">
              <Plus size={16} color="#475569" />
            </Pressable>
          </View>
          <Pressable
            onPress={handleAdd}
            disabled={!inStock}
            className={cn(
              'h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-emerald-600 shadow-lg',
              !inStock && 'opacity-40',
            )}
          >
            {added ? <Check size={16} color="#FFFFFF" /> : <ShoppingCart size={16} color="#FFFFFF" />}
            <Text className="text-sm font-extrabold text-white">
              {added
                ? ar ? 'تمت الإضافة ✓' : 'Added ✓'
                : ar
                  ? `أضف للسلة${qty > 1 ? ` (${qty})` : ''}`
                  : `Add to cart${qty > 1 ? ` (${qty})` : ''}`}
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
