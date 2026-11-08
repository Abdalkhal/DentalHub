import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, CheckSquare, ChevronLeft, Layers, Square, Tag, X } from 'lucide-react-native';

import { Input, Screen, Select, Text } from '@/components/ui';
import { BRANCHES } from '@/data/offices';
import { subcategoriesOf } from '@/data/subcategories';
import { ALL_COUNTRIES } from '@/data/countries';
import { useI18n } from '@/lib/i18n';
import { useUserRole } from '@/lib/useAuth';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { productsQueryKey, useProductsByCompany, type Currency } from '@/lib/products';
import {
  catalogBrands,
  draftError,
  fillMissingImages,
  filterCatalog,
  listingId,
  newDraft,
  publishListings,
  useCatalog,
  type CatalogFilter,
  type CatalogItem,
  type ListingDraft,
} from '@/lib/catalog';

const TEAL = '#0E6E66';
const PAGE = 30;

export default function CatalogAddScreen() {
  const { role, loading } = useUserRole();
  if (loading) {
    return (
      <Screen>
        <ActivityIndicator className="py-12" color={TEAL} />
      </Screen>
    );
  }
  if (role?.accountType !== 'supply' && role?.accountType !== 'implant') return <Redirect href="/" />;
  return <CatalogAdd />;
}

function CatalogAdd() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const queryClient = useQueryClient();
  const { user } = useUserRole();
  const uid = user?.uid;
  const { data: items = [], isLoading, isError, refetch } = useCatalog();
  const { data: mine = [] } = useProductsByCompany(uid);
  // Listings made before catalog images existed get theirs now.
  const imagesFilled = useRef(false);
  useEffect(() => {
    if (imagesFilled.current || items.length === 0 || mine.length === 0) return;
    imagesFilled.current = true;
    void fillMissingImages(mine, items).then((n) => {
      if (n > 0) void queryClient.invalidateQueries({ queryKey: productsQueryKey });
    });
  }, [items, mine, queryClient]);
  const listedIds = useMemo(() => new Set(mine.map((p) => p.id)), [mine]);

  const [mode, setMode] = useState<'brands' | 'sections'>('brands');
  const [openBranch, setOpenBranch] = useState<string | null>(null);
  const [filter, setFilter] = useState<CatalogFilter | null>(null);
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(PAGE);
  const [selected, setSelected] = useState<Map<string, CatalogItem>>(new Map());
  const [drafts, setDrafts] = useState<ListingDraft[] | null>(null);
  const [currency, setCurrency] = useState<Currency>('IQD');
  const [publishing, setPublishing] = useState(false);

  const brands = useMemo(() => catalogBrands(items), [items]);
  const noBrandCount = useMemo(() => items.filter((i) => !i.brand).length, [items]);
  const searching = q.trim().length >= 2;
  const results = useMemo(() => {
    if (searching) return filterCatalog(items, { ...(filter ?? {}), q });
    return filter ? filterCatalog(items, filter) : [];
  }, [items, filter, q, searching]);
  const showingProducts = searching || !!filter;

  const branchName = (slug: string) => {
    const b = BRANCHES.find((x) => x.slug === slug);
    return b ? (ar ? b.ar : b.en) : slug;
  };
  const subName = (slug: string, en: string) => {
    const s = subcategoriesOf(slug).find((x) => x.en === en);
    return s ? (ar ? s.ar : s.en) : en;
  };
  const open = (f: CatalogFilter) => {
    setFilter(f);
    setShown(PAGE);
  };
  const toggle = (it: CatalogItem) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(it.id)) next.delete(it.id);
      else next.set(it.id, it);
      return next;
    });
  const updateDraft = (id: string, patch: Partial<ListingDraft>) =>
    setDrafts((list) => (list ?? []).map((d) => (d.item.id === id ? { ...d, ...patch } : d)));

  const publish = async () => {
    if (!uid || !drafts) return;
    const problem = drafts.map((d) => draftError(d, ar)).find(Boolean);
    if (problem) {
      toast.error(problem);
      return;
    }
    setPublishing(true);
    try {
      await publishListings(uid, drafts);
      await queryClient.invalidateQueries({ queryKey: productsQueryKey });
      toast.success(ar ? `تم عرض ${drafts.length} منتج` : `${drafts.length} products listed`);
      router.back();
    } catch (e) {
      toast.error(ar ? `تعذر النشر: ${(e as Error)?.message ?? ''}` : `Couldn't publish: ${(e as Error)?.message ?? ''}`);
    } finally {
      setPublishing(false);
    }
  };

  if (drafts) {
    return (
      <Screen scroll={false} padded={false}>
        <Screen padded>
          <Pressable onPress={() => setDrafts(null)} className="flex-row items-center gap-1">
            <ArrowRight size={16} color={TEAL} />
            <Text className="text-sm font-bold text-[#0E6E66]">{ar ? 'العودة إلى الاختيار' : 'Back to selection'}</Text>
          </Pressable>
          <View className="mt-3 flex-row items-center gap-2">
            <Text className="text-xs text-slate-500">{ar ? 'العملة لكل المنتجات:' : 'Currency for all:'}</Text>
            {(['IQD', 'USD'] as const).map((c) => (
              <Pressable
                key={c}
                onPress={() => {
                  setCurrency(c);
                  setDrafts((list) => (list ?? []).map((d) => ({ ...d, currency: c })));
                }}
                className={cn('h-8 justify-center rounded-lg border px-3', currency === c ? 'border-[#0E6E66] bg-[#0E6E66]' : 'border-slate-200 bg-white')}
              >
                <Text className={cn('text-xs font-bold', currency === c ? 'text-white' : 'text-slate-600')}>
                  {c === 'IQD' ? (ar ? 'دينار' : 'IQD') : ar ? 'دولار' : 'USD'}
                </Text>
              </Pressable>
            ))}
          </View>
          <View className="mt-3 gap-3">
            {drafts.map((d) => (
              <DraftCard
                key={d.item.id}
                d={d}
                ar={ar}
                onChange={(p) => updateDraft(d.item.id, p)}
                onRemove={() => {
                  toggle(d.item);
                  setDrafts((list) => {
                    const next = (list ?? []).filter((x) => x.item.id !== d.item.id);
                    return next.length ? next : null;
                  });
                }}
              />
            ))}
          </View>
        </Screen>
        <View className="border-t border-slate-200 bg-white p-3">
          <Pressable
            onPress={publish}
            disabled={publishing}
            className={cn('h-12 flex-row items-center justify-center gap-2 rounded-2xl', publishing && 'opacity-60')}
            style={{ backgroundColor: TEAL }}
          >
            {publishing ? <ActivityIndicator color="#FFFFFF" /> : <Check size={16} color="#FFFFFF" />}
            <Text className="text-sm font-bold text-white">{ar ? `عرض ${drafts.length} منتج` : `List ${drafts.length} products`}</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padded={false}>
      <Screen padded>
        <Input
          value={q}
          onChangeText={(v) => {
            setQ(v);
            setShown(PAGE);
          }}
          placeholder={ar ? 'ابحث باسم المنتج أو البراند' : 'Search by product or brand'}
        />
        <View className="mt-3">
          {isLoading ? (
            <ActivityIndicator className="py-12" color={TEAL} />
          ) : isError ? (
            <Pressable onPress={() => refetch()} className="py-12">
              <Text className="text-center text-sm font-bold text-rose-500">
                {ar ? 'تعذر تحميل الدليل. اضغط لإعادة المحاولة' : "Couldn't load the catalog. Tap to retry"}
              </Text>
            </Pressable>
          ) : showingProducts ? (
            <View className="gap-3">
              {!!filter && (
                <Pressable onPress={() => setFilter(null)} className="flex-row items-center gap-1">
                  <ArrowRight size={16} color={TEAL} />
                  <Text className="text-sm font-bold text-[#0E6E66]">
                    {filter.brand !== undefined
                      ? filter.brand || (ar ? 'منتجات بدون براند' : 'No brand')
                      : `${branchName(filter.branch ?? '')}${filter.sub ? ` · ${subName(filter.branch ?? '', filter.sub)}` : ''}`}
                  </Text>
                </Pressable>
              )}
              <Text className="text-xs text-slate-400">
                {results.length} {ar ? 'منتج' : 'products'}
              </Text>
              <View className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
                {results.slice(0, shown).map((it) => {
                  const isListed = listedIds.has(listingId(uid ?? '', it.id));
                  const checked = selected.has(it.id);
                  return (
                    <Pressable
                      key={it.id}
                      disabled={isListed}
                      onPress={() => toggle(it)}
                      className={cn('flex-row items-center gap-3 border-b border-slate-50 px-3.5 py-3', isListed && 'opacity-60')}
                    >
                      {checked ? <CheckSquare size={20} color={TEAL} /> : <Square size={20} color="#94A3B8" />}
                      {it.image ? (
                        <Image source={{ uri: it.image }} className="h-11 w-11 rounded-lg bg-slate-100" resizeMode="cover" />
                      ) : (
                        <View className="h-11 w-11 rounded-lg bg-slate-100" />
                      )}
                      <View className="min-w-0 flex-1">
                        <Text numberOfLines={1} className="text-sm font-semibold text-slate-800" style={{ writingDirection: 'ltr' }}>
                          {it.en}
                        </Text>
                        <Text numberOfLines={1} className="text-[11px] text-slate-400">
                          {[it.brand || (ar ? 'بدون براند' : 'No brand'), subName(it.branch, it.sub)].join(' · ')}
                        </Text>
                      </View>
                      {isListed && (
                        <View className="rounded-full bg-emerald-50 px-2 py-1">
                          <Text className="text-[10px] font-bold text-emerald-700">{ar ? 'معروض' : 'Listed'}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
                {results.length === 0 && (
                  <View className="items-center px-4 py-10">
                    <Text className="text-sm font-bold text-slate-500">{ar ? 'لا توجد نتائج' : 'No results'}</Text>
                    <Text className="mt-1 text-center text-xs text-slate-400">
                      {ar ? 'يمكنك إضافته يدوياً من لوحة المورد.' : 'You can add it by hand from your dashboard.'}
                    </Text>
                  </View>
                )}
              </View>
              {results.length > shown && (
                <Pressable onPress={() => setShown((n) => n + PAGE)} className="h-11 items-center justify-center rounded-xl border border-slate-200 bg-white">
                  <Text className="text-sm font-bold text-slate-600">{ar ? 'عرض المزيد' : 'Show more'}</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View className="gap-3">
              <View className="flex-row gap-1 rounded-2xl bg-slate-100 p-1">
                {(
                  [
                    { key: 'brands', label: ar ? 'البراندات' : 'Brands', Icon: Tag },
                    { key: 'sections', label: ar ? 'الأقسام' : 'Sections', Icon: Layers },
                  ] as const
                ).map((t) => (
                  <Pressable
                    key={t.key}
                    onPress={() => setMode(t.key)}
                    className={cn('h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl', mode === t.key && 'bg-white')}
                  >
                    <t.Icon size={16} color={mode === t.key ? TEAL : '#64748B'} />
                    <Text className={cn('text-sm font-bold', mode === t.key ? 'text-[#0E6E66]' : 'text-slate-500')}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>
              {mode === 'brands' ? (
                <View className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
                  <Row label={ar ? 'منتجات بدون براند' : 'Products with no brand'} count={noBrandCount} onPress={() => open({ brand: '' })} />
                  {brands.map((b) => (
                    <Row key={b.name} label={b.name} count={b.count} onPress={() => open({ brand: b.name })} />
                  ))}
                </View>
              ) : (
                <View className="gap-2">
                  {BRANCHES.map((b) => {
                    const inBranch = items.filter((i) => i.branch === b.slug);
                    if (inBranch.length === 0) return null;
                    const isOpen = openBranch === b.slug;
                    return (
                      <View key={b.slug} className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
                        <Row label={ar ? b.ar : b.en} count={inBranch.length} bold onPress={() => setOpenBranch(isOpen ? null : b.slug)} />
                        {isOpen &&
                          subcategoriesOf(b.slug).map((s) => {
                            const count = inBranch.filter((i) => i.sub === s.en).length;
                            if (count === 0) return null;
                            return <Row key={s.en} label={ar ? s.ar : s.en} count={count} onPress={() => open({ branch: b.slug, sub: s.en })} />;
                          })}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>
      </Screen>
      {selected.size > 0 && (
        <View className="border-t border-slate-200 bg-white p-3">
          <Pressable
            onPress={() => setDrafts([...selected.values()].map((it) => newDraft(it, currency)))}
            className="h-12 items-center justify-center rounded-2xl"
            style={{ backgroundColor: TEAL }}
          >
            <Text className="text-sm font-bold text-white">{ar ? `متابعة (${selected.size} منتج)` : `Continue (${selected.size} products)`}</Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

function Row({ label, count, onPress, bold }: { label: string; count: number; onPress: () => void; bold?: boolean }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-2 border-b border-slate-50 px-4 py-3">
      <Text numberOfLines={1} className={cn('min-w-0 flex-1 text-sm text-slate-700', bold ? 'font-bold' : 'font-semibold')}>
        {label}
      </Text>
      <Text className="text-xs text-slate-400">{count}</Text>
      <ChevronLeft size={16} color="#CBD5E1" />
    </Pressable>
  );
}

function DraftCard({
  d,
  ar,
  onChange,
  onRemove,
}: {
  d: ListingDraft;
  ar: boolean;
  onChange: (patch: Partial<ListingDraft>) => void;
  onRemove: () => void;
}) {
  const [more, setMore] = useState(false);
  const countries = useMemo(
    () => [{ value: '', label: ar ? 'غير محدد' : 'Not set' }, ...ALL_COUNTRIES.map((c) => ({ value: c.ar, label: ar ? c.ar : c.en }))],
    [ar],
  );
  return (
    <View className="gap-3 rounded-2xl border border-slate-100 bg-white p-3.5">
      <View className="flex-row items-start gap-2">
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-bold text-slate-800" style={{ writingDirection: 'ltr' }}>
            {d.item.en}
          </Text>
          <Text className="mt-0.5 text-[11px] text-slate-400">{d.brand || (ar ? 'بدون براند' : 'No brand')}</Text>
        </View>
        <Pressable accessibilityLabel={ar ? 'إزالة' : 'Remove'} onPress={onRemove} className="h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
          <X size={16} color="#64748B" />
        </Pressable>
      </View>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Text className="mb-1 text-[11px] font-bold text-slate-600">
            {ar ? `السعر (${d.currency === 'IQD' ? 'دينار' : 'دولار'})` : `Price (${d.currency})`}
          </Text>
          <Input keyboardType="numeric" value={d.price} onChangeText={(v) => onChange({ price: v })} />
        </View>
        <View className="flex-1">
          <Text className="mb-1 text-[11px] font-bold text-slate-600">{ar ? 'الكمية (اختياري)' : 'Stock (optional)'}</Text>
          <Input keyboardType="numeric" value={d.stock} onChangeText={(v) => onChange({ stock: v })} />
        </View>
      </View>
      <Pressable onPress={() => setMore((m) => !m)}>
        <Text className="text-xs font-bold text-[#0E6E66]">
          {more ? (ar ? 'إخفاء التفاصيل' : 'Hide details') : ar ? 'بلد المنشأ والصلاحية والقسم' : 'Origin, expiry and section'}
        </Text>
      </Pressable>
      {more && (
        <View className="gap-2">
          {!d.item.brand && (
            <View>
              <Text className="mb-1 text-[11px] font-bold text-slate-600">{ar ? 'البراند أو الشركة (اختياري)' : 'Brand or maker (optional)'}</Text>
              <Input value={d.brand} onChangeText={(v) => onChange({ brand: v })} />
            </View>
          )}
          <View>
            <Text className="mb-1 text-[11px] font-bold text-slate-600">{ar ? 'بلد المنشأ' : 'Origin'}</Text>
            <Select value={d.countryAr} onChange={(v) => onChange({ countryAr: v })} options={countries} />
          </View>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Text className="mb-1 text-[11px] font-bold text-slate-600">{ar ? 'الصلاحية' : 'Expiry'}</Text>
              <Input value={d.expiryDate} placeholder="2027-08" keyboardType="numbers-and-punctuation" onChangeText={(v) => onChange({ expiryDate: v.trim() })} />
            </View>
            <View className="flex-1">
              <Text className="mb-1 text-[11px] font-bold text-slate-600">{ar ? 'سعر الشراء (خاص بك)' : 'Your cost'}</Text>
              <Input keyboardType="numeric" value={d.purchasePrice} onChangeText={(v) => onChange({ purchasePrice: v })} />
            </View>
          </View>
          <View>
            <Text className="mb-1 text-[11px] font-bold text-slate-600">{ar ? 'القسم' : 'Section'}</Text>
            <Select
              value={d.branch}
              onChange={(v) => onChange({ branch: v, sub: subcategoriesOf(v)[0]?.en ?? '' })}
              options={BRANCHES.map((b) => ({ value: b.slug, label: ar ? b.ar : b.en }))}
            />
          </View>
          <View>
            <Text className="mb-1 text-[11px] font-bold text-slate-600">{ar ? 'القسم الفرعي' : 'Sub-section'}</Text>
            <Select
              value={d.sub}
              onChange={(v) => onChange({ sub: v })}
              options={subcategoriesOf(d.branch).map((s) => ({ value: s.en, label: ar ? s.ar : s.en }))}
            />
          </View>
        </View>
      )}
    </View>
  );
}
