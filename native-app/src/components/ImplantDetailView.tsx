import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, View } from 'react-native';
import { Check, ChevronLeft, ChevronRight, Package, Ruler, X } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { ProductImage } from '@/components/ProductImage';
import { ACCESSORY_CATEGORIES } from '@/components/ImplantFormModal';
import { SPECIALIZED_FIELDS } from '@/data/specializedImplants';
import { ALL_COUNTRIES, countryFlagUrl } from '@/data/countries';
import { useSignedImageUrls, type Product, type ProductAccessory } from '@/lib/products';
import { cn } from '@/lib/utils';

const countryByCode = Object.fromEntries(ALL_COUNTRIES.map((c) => [c.code, c]));

function categoryIdOf(type: string): string {
  return ACCESSORY_CATEGORIES.find((c) => c.en === type)?.id ?? type;
}

function categoryLabelOf(id: string, ar: boolean): string {
  const c = ACCESSORY_CATEGORIES.find((cc) => cc.id === id);
  return c ? (ar ? c.ar : c.en) : id;
}

export function ImplantDetailView({
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
  const [selectedDiameter, setSelectedDiameter] = useState<number | null>(null);
  const [selectedLength, setSelectedLength] = useState<number | null>(null);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const { data: urlMap = {} } = useSignedImageUrls(product.images);
  const images = useMemo(
    () => product.images.map((p) => urlMap[p]).filter((u): u is string => !!u),
    [product.images, urlMap],
  );

  const accessoryPaths = useMemo(
    () => (product.accessories ?? []).filter((a) => a.imageUrl).map((a) => a.imageUrl),
    [product.accessories],
  );
  const { data: accImageUrlMap = {} } = useSignedImageUrls(accessoryPaths);

  const specializedSpec = product.specializedImplant;
  const specializedRows = useMemo(() => {
    if (!specializedSpec) return [];
    const specializedFieldDefs = SPECIALIZED_FIELDS[specializedSpec.category] ?? [];
    const rows: { label: string; value: string }[] = [];
    for (const f of specializedFieldDefs) {
      const raw = specializedSpec.fields[f.id];
      if (raw == null) continue;
      let display: string;
      if (Array.isArray(raw)) {
        if (raw.length === 0) continue;
        display = raw.map((v) => (ar ? (f.options?.find((o) => o.value === v)?.ar ?? v) : v)).join('، ');
      } else {
        display = ar ? (f.options?.find((o) => o.value === raw)?.ar ?? raw) : raw;
      }
      rows.push({ label: ar ? f.ar : f.en, value: display });
    }
    return rows;
  }, [specializedSpec, ar]);

  const { data: specClinicalUrlMap = {} } = useSignedImageUrls(specializedSpec?.clinicalImages ?? []);

  const spec = product.implantSpec;
  const countryCode = product.country || spec?.country;
  const country = countryCode ? countryByCode[countryCode] : null;

  const isIQD = product.currency === 'IQD';
  const money = (n: number) => (isIQD ? `${Number(n).toLocaleString()} د.ع` : `$${n.toFixed(2)}`);

  const stockMatrix = useMemo(() => {
    const v = spec?.variants ?? [];
    if (v.length > 0) return v.map((x) => ({ diameter: Number(x.diameter), length: Number(x.length), quantity: Number(x.stock) }));
    const ds = spec?.dimensionStocks ?? [];
    if (ds.length > 0) return ds.map((x) => ({ diameter: Number(x.diameter), length: Number(x.length), quantity: Number(x.quantity) }));
    return [];
  }, [spec?.variants, spec?.dimensionStocks]);

  const diameters = useMemo(
    () => (stockMatrix.length > 0 ? [...new Set(stockMatrix.map((s) => s.diameter))] : (spec?.diameters ?? [])),
    [stockMatrix, spec?.diameters],
  );
  const lengths = useMemo(
    () => (stockMatrix.length > 0 ? [...new Set(stockMatrix.map((s) => s.length))] : (spec?.lengths ?? [])),
    [stockMatrix, spec?.lengths],
  );

  // Only one size to pick from — select it automatically instead of making
  // the vendor tap a chip that has no real choice behind it.
  useEffect(() => {
    if (diameters.length === 1) setSelectedDiameter(diameters[0]);
    if (lengths.length === 1) setSelectedLength(lengths[0]);
  }, [diameters, lengths]);

  const selectedStock = useMemo(() => {
    if (selectedDiameter == null || selectedLength == null) return null;
    const match = stockMatrix.find((s) => s.diameter === selectedDiameter && s.length === selectedLength);
    return match ? match.quantity : 0;
  }, [selectedDiameter, selectedLength, stockMatrix]);

  const accessories = useMemo(() => product.accessories ?? [], [product.accessories]);
  const showAccessories = product.branch !== 'bone_graft' && product.branch !== 'specialized_implant';
  const groupedAccessories = useMemo(() => {
    const map: Record<string, ProductAccessory[]> = {};
    for (const acc of accessories) {
      const id = categoryIdOf(acc.type);
      if (!map[id]) map[id] = [];
      map[id].push(acc);
    }
    return map;
  }, [accessories]);
  const orderedCategoryIds = useMemo(() => {
    const ids = ACCESSORY_CATEGORIES.map((c) => c.id).filter((id) => groupedAccessories[id]?.length);
    for (const id of Object.keys(groupedAccessories)) {
      if (!ids.includes(id)) ids.push(id);
    }
    return ids;
  }, [groupedAccessories]);

  const toggleCategory = (id: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fmtAccessoryPrice = (acc: ProductAccessory) =>
    acc.currency === 'IQD' ? `${Number(acc.price).toLocaleString()} د.ع` : `$${Number(acc.price).toFixed(2)}`;

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
              {ar ? 'تفاصيل الزرعة' : 'Implant Details'}
            </Text>
            <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
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
                            className={cn('h-1.5 rounded-full', i === activeImg ? 'w-4 bg-primary' : 'w-1.5 bg-slate-300')}
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
                <Text className="mt-2 text-xl font-extrabold text-primary">{money(product.price)}</Text>
                {!!product.description && (
                  <Text className="mt-2 text-sm leading-relaxed text-slate-600">{product.description}</Text>
                )}
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3">
                  <Text className="text-[11px] font-semibold text-sky-700/70">
                    {ar ? 'الشركة المصنعة' : 'Manufacturer'}
                  </Text>
                  <Text className="mt-1 truncate text-sm font-bold text-sky-900">
                    {product.brand || (ar ? 'غير محدد' : 'N/A')}
                  </Text>
                </View>
                <View className="flex-1 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3">
                  <Text className="text-[11px] font-semibold text-sky-700/70">
                    {ar ? 'بلد المنشأ' : 'Country of Origin'}
                  </Text>
                  {country ? (
                    <View className="mt-1 flex-row items-center gap-1.5">
                      <Image
                        source={{ uri: countryFlagUrl(country.code) }}
                        style={{ width: 16, height: 16, borderRadius: 2 }}
                      />
                      <Text className="truncate text-sm font-bold text-sky-900">
                        {ar ? country.ar : country.en}
                      </Text>
                    </View>
                  ) : (
                    <Text className="mt-1 text-sm font-bold text-sky-900">{ar ? 'غير محدد' : 'N/A'}</Text>
                  )}
                </View>
              </View>

              {specializedRows.length > 0 && (
                <View>
                  <Text className="mb-2 text-sm font-bold text-slate-800">
                    {ar ? 'المواصفات الخاصة' : 'Category Specifications'}
                  </Text>
                  <View className="overflow-hidden rounded-2xl border border-slate-200">
                    {specializedRows.map((s, i) => (
                      <View
                        key={s.label}
                        className={cn('flex-row items-start justify-between px-3 py-2.5', i % 2 === 0 ? 'bg-white' : 'bg-slate-50')}
                      >
                        <Text className="w-1/2 text-xs font-semibold text-slate-500">{s.label}</Text>
                        <Text className="flex-1 text-end text-xs text-slate-800">{s.value}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {(diameters.length > 0 || lengths.length > 0) && (
                <View className="gap-3 rounded-2xl border border-slate-200 p-4">
                  <View className="flex-row items-center gap-2">
                    <Ruler size={15} color="#0284C7" />
                    <Text className="text-sm font-bold text-slate-800">
                      {ar ? 'الأقطار والأطوال' : 'Diameters & Lengths'}
                    </Text>
                  </View>

                  {diameters.length > 0 && (
                    <View>
                      <Text className="mb-2 text-xs font-semibold text-slate-600">
                        {ar ? 'القطر (mm):' : 'Diameter (mm):'}
                      </Text>
                      <View className="flex-row flex-wrap gap-2">
                        {diameters.map((d) => {
                          const active = selectedDiameter === d;
                          return (
                            <Pressable
                              key={d}
                              onPress={() => setSelectedDiameter(active ? null : d)}
                              className={cn(
                                'h-10 flex-row items-center gap-1.5 rounded-xl border px-3.5',
                                active ? 'border-sky-500 bg-sky-500' : 'border-sky-100 bg-sky-50/60',
                              )}
                            >
                              {active && <Check size={13} color="#FFFFFF" />}
                              <Text
                                className={cn('text-sm font-bold', active ? 'text-white' : 'text-slate-700')}
                                style={{ writingDirection: 'ltr' }}
                              >
                                {d}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {lengths.length > 0 && (
                    <View>
                      <Text className="mb-2 text-xs font-semibold text-slate-600">
                        {ar ? 'الطول (mm):' : 'Length (mm):'}
                      </Text>
                      <View className="flex-row flex-wrap gap-2">
                        {lengths.map((l) => {
                          const active = selectedLength === l;
                          return (
                            <Pressable
                              key={l}
                              onPress={() => setSelectedLength(active ? null : l)}
                              className={cn(
                                'h-10 flex-row items-center gap-1.5 rounded-xl border px-3.5',
                                active ? 'border-sky-500 bg-sky-500' : 'border-sky-100 bg-sky-50/60',
                              )}
                            >
                              {active && <Check size={13} color="#FFFFFF" />}
                              <Text
                                className={cn('text-sm font-bold', active ? 'text-white' : 'text-slate-700')}
                                style={{ writingDirection: 'ltr' }}
                              >
                                {l}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  <View
                    className={cn(
                      'flex-row items-center gap-3 rounded-2xl px-4 py-3.5',
                      selectedStock == null
                        ? 'border border-sky-100 bg-sky-50/60'
                        : selectedStock > 0
                          ? 'border border-emerald-200 bg-emerald-50'
                          : 'border border-rose-200 bg-rose-50',
                    )}
                  >
                    <Package
                      size={18}
                      color={selectedStock == null ? '#7A94A8' : selectedStock > 0 ? '#059669' : '#F43F5E'}
                    />
                    {selectedStock == null ? (
                      <Text className="flex-1 text-sm text-slate-500">
                        {ar ? 'اختر القطر والطول لعرض الكمية المتوفرة' : 'Select a diameter and length to view available quantity'}
                      </Text>
                    ) : (
                      <Text className="flex-1 text-sm font-semibold text-slate-700">
                        {ar ? 'الكمية المتوفرة: ' : 'Available quantity: '}
                        <Text
                          className={cn('text-base font-extrabold', selectedStock > 0 ? 'text-emerald-700' : 'text-rose-600')}
                          style={{ writingDirection: 'ltr' }}
                        >
                          {selectedStock}
                        </Text>
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {showAccessories && (
                <View className="gap-3">
                  <Text className="text-sm font-bold text-slate-800">
                    {ar ? 'الإكسسوارات الملحقة' : 'Attached Accessories'}
                  </Text>
                  {accessories.length === 0 ? (
                    <View className="items-center rounded-2xl border border-slate-200 py-8">
                      <Text className="text-sm text-slate-500">
                        {ar ? 'لا توجد إكسسوارات ملحقة' : 'No attached accessories'}
                      </Text>
                    </View>
                  ) : (
                    orderedCategoryIds.map((catId) => {
                      const items = groupedAccessories[catId];
                      const expanded = expandedCats.has(catId);
                      const shown = expanded ? items : items.slice(0, 4);
                      return (
                        <View key={catId} className="gap-2.5">
                          <View className="flex-row items-center justify-between gap-2">
                            <View className="flex-row items-center gap-2">
                              <View className="h-4 w-1 rounded-full bg-sky-500" />
                              <Text className="text-sm font-bold text-slate-800">{categoryLabelOf(catId, ar)}</Text>
                              <View className="rounded-md bg-blue-100 px-2 py-0.5">
                                <Text className="text-[11px] font-bold text-blue-700">{items.length}</Text>
                              </View>
                            </View>
                            {items.length > 4 && (
                              <Pressable onPress={() => toggleCategory(catId)}>
                                <Text className="text-[11px] font-bold text-sky-600">
                                  {expanded ? (ar ? 'عرض أقل' : 'Show less') : ar ? 'عرض الكل' : 'View all'}
                                </Text>
                              </Pressable>
                            )}
                          </View>
                          <View className="flex-row flex-wrap gap-2.5">
                            {shown.map((acc, i) => (
                              <View key={`${acc.name}-${i}`} className="w-[47%] rounded-2xl border border-slate-200 bg-card p-3">
                                <View className="mb-2 aspect-square items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                                  {acc.imageUrl && accImageUrlMap[acc.imageUrl] ? (
                                    <Image source={{ uri: accImageUrlMap[acc.imageUrl] }} style={{ width: '100%', height: '100%' }} />
                                  ) : (
                                    <Package size={26} color="#CBD5E1" />
                                  )}
                                </View>
                                <Text className="text-sm font-bold" numberOfLines={1}>
                                  {acc.name}
                                </Text>
                                {!!acc.specs && (
                                  <Text className="mt-1.5 truncate text-[10px] font-semibold text-slate-500" numberOfLines={1}>
                                    {acc.specs}
                                  </Text>
                                )}
                                {acc.price > 0 && (
                                  <Text className="mt-1.5 text-sm font-bold text-primary">{fmtAccessoryPrice(acc)}</Text>
                                )}
                              </View>
                            ))}
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              )}

              {!!specializedSpec?.clinicalImages?.length && (
                <View>
                  <Text className="mb-2 text-sm font-bold text-slate-800">
                    {ar ? 'صور حالات العمل' : 'Clinical Cases'}
                  </Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    {specializedSpec.clinicalImages.map((path) => (
                      <ProductImage
                        key={path}
                        uri={specClinicalUrlMap[path]}
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
