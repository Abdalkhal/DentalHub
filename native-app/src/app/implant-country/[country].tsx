import { useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Cpu, Heart, X } from 'lucide-react-native';

import { Screen, Text, Spinner } from '@/components/ui';
import { ProductImage } from '@/components/ProductImage';
import { ProductAddToCart } from '@/components/ProductAddToCart';
import { COUNTRIES } from '@/data/implants';
import { ALL_COUNTRIES, countryFlagUrl } from '@/data/countries';
import { useProductsByCountry, useSignedImageUrls, COUNTRY_SLUG_TO_CODE, type ImplantSpec, type Product } from '@/lib/products';
import { useImplantCompanyNames } from '@/lib/implantOffers';
import { useIsFavorited, toggleFavorite } from '@/lib/favoritesStore';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// Faithful port of the web per-country implants page
// (src/routes/implants.$country.tsx), reached from the "زرعات حسب الدول"
// grid in implants.tsx (native-only there: that grid now also creates a
// card — and so a destination — for any country beyond the 5 web has
// hardcoded, so the country name/flag here are resolved the same
// COUNTRIES-then-ALL_COUNTRIES way implants.tsx does, not just looked up
// in the fixed 5-country list web's loader relies on).
//
// Adapted from web's single always-expanded card per product: with dozens
// of implants the diameter/length grid + material tags + accessories list
// + add-to-cart per row made the list unreadable, so the list row here only
// shows name/brand/category and a tap opens the full detail (everything web
// shows) in a sheet — one product visibly isolated from the next.

type ImplantFilter = 'all' | 'comprehensive' | 'basal' | 'non_immediate';
type ImplantCategory = Exclude<ImplantFilter, 'all'>;

function implantCategoryOf(spec: ImplantSpec | undefined): ImplantCategory | null {
  if (!spec) return null;
  if (spec.implantType === 'non-immediate') return 'non_immediate';
  if (spec.implantType === 'immediate') return spec.subType === 'basal' ? 'basal' : 'comprehensive';
  return null;
}

// "Comprehensive"/"Basal" stay in English in both languages — only
// "فورية"/"غير فورية" (Immediate/Non-Immediate) switch with the language.
const CATEGORY_LABEL: Record<ImplantCategory, { ar: string; en: string }> = {
  comprehensive: { ar: 'فورية (Comprehensive)', en: 'Immediate (Comprehensive)' },
  basal: { ar: 'فورية (Basal)', en: 'Immediate (Basal)' },
  non_immediate: { ar: 'غير فورية', en: 'Non-Immediate' },
};

const CATEGORY_TONE: Record<ImplantCategory, { box: string; text: string }> = {
  comprehensive: { box: 'bg-orange-50 border-orange-200', text: 'text-orange-700' },
  basal: { box: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
  non_immediate: { box: 'bg-sky-50 border-sky-200', text: 'text-sky-700' },
};

const FILTERS: { key: ImplantFilter; ar: string; en: string }[] = [
  { key: 'all', ar: 'الكل', en: 'All' },
  { key: 'comprehensive', ...CATEGORY_LABEL.comprehensive },
  { key: 'basal', ...CATEGORY_LABEL.basal },
  { key: 'non_immediate', ...CATEGORY_LABEL.non_immediate },
];

function resolveCountry(slug: string) {
  const known = COUNTRIES.find((c) => c.slug === slug);
  if (known) return { slug, ar: known.ar, en: known.en, code: COUNTRY_SLUG_TO_CODE[slug] ?? slug.toUpperCase() };
  // A country added dynamically by implants.tsx's country grid uses its ISO
  // code (lowercased) as the slug, so recover the code the same way.
  const code = slug.toUpperCase();
  const entry = ALL_COUNTRIES.find((c) => c.code === code);
  return { slug, ar: entry?.ar ?? slug, en: entry?.en ?? slug, code };
}

const SURGICAL_GUIDE_TOOLS = [
  { ar: 'طقم الدليل الجراحي', en: 'Surgical guide kit' },
  { ar: 'طقم الحفر الموجّه', en: 'Guided drill kit' },
  { ar: 'جلبات التوجيه', en: 'Guided sleeves' },
  { ar: 'أدوات الجراحة الموجّهة', en: 'Guided Surgical Tools' },
];

function money(n: number, currency: string): string {
  return currency === 'IQD' ? `${n.toLocaleString()} د.ع` : `$${n.toFixed(2)}`;
}

function CategoryBadge({ category, ar }: { category: ImplantCategory; ar: boolean }) {
  const tone = CATEGORY_TONE[category];
  return (
    <View className={cn('self-start rounded-full border px-2.5 py-1', tone.box)}>
      <Text className={cn('text-[11px] font-semibold', tone.text)}>{ar ? CATEGORY_LABEL[category].ar : CATEGORY_LABEL[category].en}</Text>
    </View>
  );
}

export default function ImplantCountryScreen() {
  const { country: countrySlug, lenMin, lenMax, diaMin, diaMax, q } = useLocalSearchParams<{
    country: string;
    lenMin?: string;
    lenMax?: string;
    diaMin?: string;
    diaMax?: string;
    q?: string;
  }>();
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const [filter, setFilter] = useState<ImplantFilter>('all');
  const [selected, setSelected] = useState<Product | null>(null);

  const country = resolveCountry(countrySlug ?? '');
  const { data: products = [], isLoading } = useProductsByCountry(country.slug);
  const companyNames = useImplantCompanyNames();

  // Carries over the size range + search set on the implants home screen
  // (implants.tsx) — that filter otherwise stopped meaning anything the
  // moment you opened a country.
  const sizeFiltered = useMemo(() => {
    const hasRange = lenMin != null && lenMax != null && diaMin != null && diaMax != null;
    const term = (q ?? '').trim().toLowerCase();
    if (!hasRange && !term) return products;
    const lenRange: [number, number] = [Number(lenMin), Number(lenMax)];
    const diaRange: [number, number] = [Number(diaMin), Number(diaMax)];
    return products.filter((p) => {
      const spec = p.implantSpec;
      if (term) {
        const hay = [p.brand, ...(spec?.diameters ?? []).map(String), ...(spec?.lengths ?? []).map(String)]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (hasRange) {
        const diams = spec?.diameters ?? [];
        const lens = spec?.lengths ?? [];
        if (diams.length > 0 && !diams.some((d) => d >= diaRange[0] && d <= diaRange[1])) return false;
        if (lens.length > 0 && !lens.some((l) => l >= lenRange[0] && l <= lenRange[1])) return false;
      }
      return true;
    });
  }, [products, lenMin, lenMax, diaMin, diaMax, q]);

  const filtered = useMemo(() => {
    if (filter === 'all') return sizeFiltered;
    return sizeFiltered.filter((p) => implantCategoryOf(p.implantSpec) === filter);
  }, [sizeFiltered, filter]);

  const allPaths = useMemo(() => {
    const productPaths = products.flatMap((p) => p.images);
    const accPaths = products.flatMap((p) => (p.accessories || []).filter((a) => a.imageUrl).map((a) => a.imageUrl));
    return [...productPaths, ...accPaths];
  }, [products]);
  const { data: imageUrlMap = {} } = useSignedImageUrls(allPaths);

  return (
    <Screen>
      <View className="mb-4 flex-row items-center gap-3">
        <Image source={{ uri: countryFlagUrl(country.code) }} className="h-12 w-16 rounded-lg" resizeMode="cover" />
        <View>
          <Text className="text-xs text-slate-500">{ar ? 'زرعات' : 'Implants'}</Text>
          <Text className="text-xl font-extrabold text-slate-900">{filtered.length}</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-1">
        <View className="flex-row gap-2 pb-1">
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              className={cn(
                'h-9 items-center justify-center rounded-full border px-4 shadow-sm',
                filter === f.key ? 'border-primary bg-primary' : 'border-slate-200 bg-white',
              )}
            >
              <Text className={cn('text-xs font-bold', filter === f.key ? 'text-primary-foreground' : 'text-slate-700')}>
                {ar ? f.ar : f.en}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {isLoading ? (
        <Spinner size="small" />
      ) : filtered.length === 0 ? (
        <View className="items-center py-20">
          <Cpu size={56} color="#CBD5E1" strokeWidth={1.5} />
          <Text className="mt-4 text-lg font-extrabold text-slate-400">{ar ? 'لا توجد زرعات بعد' : 'No implants yet'}</Text>
          <Text className="mt-1 max-w-xs text-center text-sm text-slate-400">
            {ar ? 'ستظهر هنا الزرعات المضافة من قبل الشركات' : 'Implants added by companies will appear here'}
          </Text>
        </View>
      ) : (
        <View className="mt-4 gap-4 pb-6">
          {filtered.map((p) => {
            const category = implantCategoryOf(p.implantSpec);
            const name = ar ? p.ar || p.en : p.en || p.ar;
            const imgUrl = p.images.length > 0 ? imageUrlMap[p.images[0]] : undefined;

            return (
              <Pressable
                key={p.id}
                onPress={() => setSelected(p)}
                className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-card p-3.5 shadow-sm"
              >
                <ProductImage uri={imgUrl} className="h-14 w-14 rounded-xl" iconSize={22} />
                <View className="min-w-0 flex-1 gap-1">
                  <Text className="text-sm font-bold text-slate-800" numberOfLines={1}>
                    {name}
                  </Text>
                  {!!p.brand && (
                    <Text className="text-[11px] text-slate-400" numberOfLines={1}>
                      {p.brand}
                    </Text>
                  )}
                  {!!category && <CategoryBadge category={category} ar={ar} />}
                </View>
                <Text className="shrink-0 text-lg text-slate-300">›</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {!!selected && (
        <ImplantDetailModal
          product={selected}
          imageUrlMap={imageUrlMap}
          officeName={companyNames[selected.companyId || ''] || selected.brand || (ar ? 'شركة زرعات' : 'Implant Company')}
          ar={ar}
          onClose={() => setSelected(null)}
        />
      )}
    </Screen>
  );
}

function ImplantDetailModal({
  product,
  imageUrlMap,
  officeName,
  ar,
  onClose,
}: {
  product: Product;
  imageUrlMap: Record<string, string>;
  officeName: string;
  ar: boolean;
  onClose: () => void;
}) {
  const spec = product.implantSpec;
  const diams = spec?.diameters ?? [];
  const lens = spec?.lengths ?? [];
  // Each size the company added in the form (diameter × length × its own
  // stock) — `diameters`/`lengths` above are just the deduped values across
  // all of these, which was all this screen showed before, hiding which
  // stock belongs to which size. `variants` and the legacy `dimensionStocks`
  // shape the count field differently (stock vs quantity), so normalize.
  const variants: { diameter: number; length: number; count: number }[] =
    spec?.variants?.map((v) => ({ diameter: v.diameter, length: v.length, count: v.stock })) ??
    spec?.dimensionStocks?.map((v) => ({ diameter: v.diameter, length: v.length, count: v.quantity })) ??
    [];
  const imgUrl = product.images.length > 0 ? imageUrlMap[product.images[0]] : undefined;
  const category = implantCategoryOf(spec);
  const name = ar ? product.ar || product.en : product.en || product.ar;
  const favorited = useIsFavorited(product.id);

  const toggleFav = () =>
    toggleFavorite(
      {
        id: product.id,
        title: name,
        vendor: officeName,
        price: product.price,
        currency: product.currency,
        imageUrl: imgUrl,
        addedAt: new Date().toISOString(),
        kind: 'implant',
      },
      ar ? 'ar' : 'en',
    );

  return (
    <Modal visible transparent animationType="fade">
      <View className="flex-1 items-center justify-center bg-black/40 p-5">
        <View className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl" style={{ maxHeight: '85%' }}>
          <View className="flex-row items-center justify-between border-b border-slate-100 p-4">
            <Text className="text-base font-extrabold text-slate-900">{ar ? 'تفاصيل الزرعة' : 'Implant Details'}</Text>
            <View className="flex-row items-center gap-2">
              <Pressable onPress={toggleFav} className="h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                <Heart size={16} color="#EF4444" fill={favorited ? '#EF4444' : 'none'} />
              </Pressable>
              <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                <X size={16} color="#64748B" />
              </Pressable>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
            <View className="flex-row items-start gap-3">
              <ProductImage uri={imgUrl} className="h-16 w-16 rounded-xl" iconSize={26} />
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-base font-extrabold text-slate-900">{name}</Text>
                {!!product.brand && <Text className="text-xs text-slate-500">{product.brand}</Text>}
                <View className="flex-row flex-wrap gap-1.5">
                  {!!spec?.connectionType && (
                    <View className="self-start rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5">
                      <Text className="text-[10px] font-semibold text-slate-600">{spec.connectionType}</Text>
                    </View>
                  )}
                  {!!category && <CategoryBadge category={category} ar={ar} />}
                </View>
              </View>
            </View>

            {/* Price */}
            <View className="mt-4 flex-row items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-3">
              <Text className="text-[11px] font-bold text-emerald-700/70">{ar ? 'السعر الأساسي' : 'Base price'}</Text>
              <Text className="text-base font-extrabold text-emerald-700">{money(product.price, product.currency)}</Text>
            </View>

            {/* Sizes — every diameter × length option the company added,
                each with its own stock, not just the deduped summary. */}
            {variants.length > 0 ? (
              <View className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                <View className="flex-row bg-slate-50 px-3 py-2">
                  <Text className="flex-1 text-[11px] font-bold text-slate-500">{ar ? 'القطر' : 'Diameter'}</Text>
                  <Text className="flex-1 text-[11px] font-bold text-slate-500">{ar ? 'الطول' : 'Length'}</Text>
                  <Text className="flex-1 text-end text-[11px] font-bold text-slate-500">{ar ? 'المخزون' : 'Stock'}</Text>
                </View>
                {variants.map((v, i) => (
                  <View key={i} className={cn('flex-row px-3 py-2', i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60')}>
                    <Text className="flex-1 text-xs text-slate-700">{v.diameter} mm</Text>
                    <Text className="flex-1 text-xs text-slate-700">{v.length} mm</Text>
                    <Text className={cn('flex-1 text-end text-xs font-bold', v.count > 0 ? 'text-emerald-600' : 'text-rose-500')}>
                      {v.count}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              (diams.length > 0 || lens.length > 0) && (
                <View className="mt-3 flex-row flex-wrap gap-3 rounded-xl bg-slate-50 p-3">
                  {diams.length > 0 && (
                    <Text className="text-xs text-slate-700">
                      <Text className="font-bold text-slate-500">{ar ? 'القطر: ' : 'Diameter: '}</Text>
                      {diams.join(', ')} mm
                    </Text>
                  )}
                  {lens.length > 0 && (
                    <Text className="text-xs text-slate-700">
                      <Text className="font-bold text-slate-500">{ar ? 'الطول: ' : 'Length: '}</Text>
                      {lens.join(', ')} mm
                    </Text>
                  )}
                </View>
              )
            )}

            {/* Surgical guide system */}
            {!!product.surgicalGuide && (
              <View className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                <View className="flex-row items-center justify-between bg-slate-50 px-3 py-2">
                  <Text className="text-xs font-bold text-slate-500">{ar ? 'نظام الدليل الجراحي' : 'Surgical Guide System'}</Text>
                  <View className={cn('rounded-full px-2 py-0.5', product.surgicalGuide === 'Guided' ? 'bg-emerald-100' : 'bg-slate-100')}>
                    <Text className={cn('text-[10px] font-bold', product.surgicalGuide === 'Guided' ? 'text-emerald-700' : 'text-slate-500')}>
                      {product.surgicalGuide === 'Guided' ? (ar ? 'موجّه' : 'Guided') : ar ? 'غير موجّه' : 'Unguided'}
                    </Text>
                  </View>
                </View>
                {product.surgicalGuide === 'Guided' && !!product.surgicalGuideTools?.length && (
                  <View className="gap-1.5 px-3 py-2.5">
                    {product.surgicalGuideTools.map((tool) => {
                      const def = SURGICAL_GUIDE_TOOLS.find((t) => t.en === tool);
                      return (
                        <Text key={tool} className="text-xs text-slate-700">
                          • {ar && def ? def.ar : tool}
                        </Text>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {!!spec?.materialGrade && (
              <View className="mt-3 flex-row flex-wrap gap-1.5">
                <View className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1">
                  <Text className="text-[10px] font-semibold text-sky-700">{spec.materialGrade}</Text>
                </View>
                {!!spec.surfaceTreatment && (
                  <View className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1">
                    <Text className="text-[10px] font-semibold text-emerald-700">{spec.surfaceTreatment}</Text>
                  </View>
                )}
              </View>
            )}

            {!!product.accessories?.length && (
              <View className="mt-4 gap-1.5">
                <Text className="mb-0.5 text-[11px] font-semibold text-slate-500">
                  {ar ? 'الإكسسوارات' : 'Accessories'} ({product.accessories.length})
                </Text>
                {product.accessories.map((acc, i) => (
                  <View key={i} className="flex-row items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5">
                    <ProductImage uri={acc.imageUrl ? imageUrlMap[acc.imageUrl] : undefined} className="h-8 w-8 rounded-md" iconSize={12} />
                    <View className="min-w-0 flex-1">
                      <Text className="text-[11px] font-semibold text-slate-800" numberOfLines={1}>
                        {acc.name}
                      </Text>
                      <Text className="text-[9px] text-slate-400">
                        <Text className="font-bold text-sky-600">{acc.type}</Text>
                        {!!acc.specs && ` · ${acc.specs}`}
                      </Text>
                    </View>
                    {acc.price > 0 && <Text className="shrink-0 text-[11px] font-bold text-primary">${acc.price.toFixed(2)}</Text>}
                  </View>
                ))}
              </View>
            )}

            <ProductAddToCart
              productId={product.id}
              productName={name}
              productImage={imgUrl}
              officeId={product.companyId || ''}
              officeName={officeName}
              brand={product.brand}
              category="implant"
              unitPrice={product.price}
              currency={product.currency || 'USD'}
              inStock={product.inStock ?? true}
              ar={ar}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
