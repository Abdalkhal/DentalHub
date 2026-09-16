import { useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { ChevronLeft, ChevronRight, Package, X } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { ProductImage } from '@/components/ProductImage';
import { useSignedImageUrls, type Product } from '@/lib/products';
import { cn } from '@/lib/utils';

export function BoneGraftDetailsModal({
  product,
  ar,
  onClose,
}: {
  product: Product;
  ar: boolean;
  onClose: () => void;
}) {
  const [activeImg, setActiveImg] = useState(0);
  const [galleryW, setGalleryW] = useState(0);
  const galleryRef = useRef<ScrollView>(null);

  const { data: urlMap = {} } = useSignedImageUrls(product.images);
  const images = useMemo(
    () => product.images.map((p) => urlMap[p]).filter((u): u is string => !!u),
    [product.images, urlMap],
  );

  const { data: clinicalUrlMap = {} } = useSignedImageUrls(product.boneGraft?.clinicalImages ?? []);

  const spec = product.boneGraft;

  const specRows = useMemo(() => {
    if (!spec) return [];
    const defs: { label: string; value: string }[] = [
      { label: ar ? 'نوع المصدر' : 'Graft Type', value: spec.graftType },
      { label: ar ? 'الشكل الفيزيائي' : 'Form', value: spec.form },
      { label: ar ? 'مصدر المادة' : 'Material Source', value: spec.materialSource },
      { label: ar ? 'التركيب المادي' : 'Composition', value: spec.composition },
      { label: ar ? 'حجم الحبيبات' : 'Particle Size', value: spec.particleSize },
      { label: ar ? 'طريقة التعقيم' : 'Sterilization Method', value: spec.sterilizationMethod },
      { label: ar ? 'مدة الصلاحية' : 'Shelf Life', value: spec.shelfLife },
    ];
    return defs.filter((d) => d.value?.trim());
  }, [spec, ar]);

  const isIQD = product.currency === 'IQD';
  const money = (n: number) =>
    isIQD ? `${Number(n).toLocaleString()} د.ع` : `$${n.toFixed(2)}`;
  const inStock = (product.stock ?? 0) > 0;
  const packSizes = spec?.packSizes ?? [];

  const goTo = (idx: number) => {
    setActiveImg(idx);
    galleryRef.current?.scrollTo({ x: idx * galleryW, animated: true });
  };
  const prev = () => goTo(images.length === 0 ? 0 : (activeImg - 1 + images.length) % images.length);
  const next = () => goTo(images.length === 0 ? 0 : (activeImg + 1) % images.length);

  return (
    <Modal visible transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[92%] rounded-t-3xl bg-white">
          <View className="flex-row items-center justify-between border-b border-slate-100 px-4 pb-3 pt-4">
            <Text className="text-base font-extrabold text-slate-900">
              {ar ? 'تفاصيل البون كرافت' : 'Bone Graft Details'}
            </Text>
            <Pressable
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-xl bg-slate-100"
            >
              <X size={16} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView contentContainerClassName="gap-4 pb-8">
            <View
              className="relative bg-slate-100"
              onLayout={(e) => {
                const w = Math.round(e.nativeEvent.layout.width);
                if (w > 0 && w !== galleryW) setGalleryW(w);
              }}
            >
              {images.length > 0 ? (
                <>
                  <ScrollView
                    ref={galleryRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={(e) => {
                      if (galleryW > 0) {
                        const idx = Math.round(e.nativeEvent.contentOffset.x / galleryW);
                        setActiveImg(Math.min(Math.max(idx, 0), images.length - 1));
                      }
                    }}
                  >
                    {images.map((uri, i) => (
                      <View key={uri + i} style={{ width: galleryW > 0 ? galleryW : undefined }}>
                        <ProductImage uri={uri} className="h-64 w-full" resizeMode="contain" iconSize={44} />
                      </View>
                    ))}
                  </ScrollView>
                  {images.length > 1 && (
                    <>
                      <Pressable
                        onPress={prev}
                        className="absolute left-2 top-1/2 h-8 w-8 -translate-y-4 items-center justify-center rounded-full bg-white/90"
                      >
                        <ChevronLeft size={16} color="#334155" />
                      </Pressable>
                      <Pressable
                        onPress={next}
                        className="absolute right-2 top-1/2 h-8 w-8 -translate-y-4 items-center justify-center rounded-full bg-white/90"
                      >
                        <ChevronRight size={16} color="#334155" />
                      </Pressable>
                      <View className="absolute inset-x-0 bottom-2 flex-row justify-center gap-1.5">
                        {images.map((_, i) => (
                          <View
                            key={i}
                            className={cn('h-1.5 rounded-full', i === activeImg ? 'w-4 bg-emerald-600' : 'w-1.5 bg-slate-300')}
                          />
                        ))}
                      </View>
                    </>
                  )}
                </>
              ) : (
                <View className="h-64 items-center justify-center">
                  <Package size={44} color="#CBD5E1" />
                </View>
              )}
            </View>

            <View className="gap-4 px-4">
              <View>
                <Text className="text-lg font-bold leading-snug text-slate-900">
                  {ar ? product.ar || product.en : product.en || product.ar}
                </Text>
                {!!product.brand && <Text className="mt-0.5 text-xs text-slate-500">{product.brand}</Text>}
              </View>

              {!!product.description && (
                <View className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <Text className="mb-1 text-[11px] font-bold text-slate-400">
                    {ar ? 'الوصف' : 'Description'}
                  </Text>
                  <Text className="text-[13px] leading-relaxed text-slate-700">{product.description}</Text>
                </View>
              )}

              <View className="flex-row items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
                <View>
                  <Text className="text-[11px] font-bold text-emerald-700/70">
                    {ar ? 'سعر الوحدة الواحدة' : 'Unit Price'}
                  </Text>
                  <Text className="text-lg font-extrabold text-emerald-700">{money(product.price)}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-[11px] font-bold text-emerald-700/70">{ar ? 'الحالة' : 'Status'}</Text>
                  <Text className={cn('text-lg font-extrabold', inStock ? 'text-emerald-700' : 'text-rose-600')}>
                    {inStock ? (ar ? 'متوفر' : 'In Stock') : ar ? 'نفد' : 'Out of stock'}
                  </Text>
                </View>
              </View>

              {!!spec && (
                <View>
                  <Text className="mb-2 text-sm font-bold text-slate-800">
                    {ar ? 'المواصفات والمميزات' : 'Specifications & Features'}
                  </Text>
                  {specRows.length > 0 && (
                    <View className="overflow-hidden rounded-2xl border border-slate-200">
                      {specRows.map((s, i) => (
                        <View
                          key={s.label}
                          className={cn('flex-row items-start justify-between px-3 py-2.5', i % 2 === 0 ? 'bg-white' : 'bg-slate-50')}
                        >
                          <Text className="w-1/2 text-xs font-semibold text-slate-500">{s.label}</Text>
                          <Text className="flex-1 text-end text-xs text-slate-800">{s.value}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {!!spec.features?.length && (
                    <View className="mt-2.5 flex-row flex-wrap gap-1.5">
                      {spec.features.map((f) => (
                        <View key={f} className="rounded-full bg-emerald-50 px-2.5 py-1">
                          <Text className="text-[10px] font-bold text-emerald-700">{f}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {packSizes.length > 0 && (
                <View>
                  <Text className="mb-2 text-sm font-bold text-slate-800">
                    {ar ? 'الأحجام والأسعار' : 'Pack Sizes & Pricing'}
                  </Text>
                  <View className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
                    {packSizes.map((p, i) => (
                      <View key={i} className="flex-row items-center justify-between gap-3 px-3 py-2.5">
                        <View className="min-w-0 flex-1 flex-row items-center gap-2">
                          <View className="h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                            <Package size={16} color="#64748B" />
                          </View>
                          <View className="min-w-0">
                            <Text className="text-sm font-bold text-slate-800" style={{ writingDirection: 'ltr', textAlign: 'left' }}>
                              {p.volume}
                            </Text>
                            <Text className="text-[11px] text-slate-500">
                              {p.priceUsd > 0 ? `$${p.priceUsd.toFixed(2)}` : '—'}
                              {p.priceIqd > 0 ? ` · ${p.priceIqd.toLocaleString()} د.ع` : ''}
                            </Text>
                          </View>
                        </View>
                        <View className={cn('rounded-full px-2 py-1', p.available ? 'bg-emerald-50' : 'bg-rose-50')}>
                          <Text className={cn('text-[10px] font-bold', p.available ? 'text-emerald-700' : 'text-rose-600')}>
                            {p.available ? (ar ? 'متوفر' : 'Available') : ar ? 'نفد' : 'Out'}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {!!spec?.clinicalImages?.length && (
                <View>
                  <Text className="mb-2 text-sm font-bold text-slate-800">
                    {ar ? 'صور حالات العمل' : 'Clinical Cases'}
                  </Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    {spec.clinicalImages.map((path) => (
                      <ProductImage
                        key={path}
                        uri={clinicalUrlMap[path]}
                        className="aspect-square w-[32%] rounded-lg bg-slate-100"
                        iconSize={18}
                      />
                    ))}
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
