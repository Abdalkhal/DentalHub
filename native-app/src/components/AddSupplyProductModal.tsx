import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Check, Minus, Package, Plus, ScanBarcode, X } from 'lucide-react-native';

import { Select, Text } from '@/components/ui';
import { CountrySelect } from '@/components/CountrySelect';
import { BRANCH_CODE, BRANCH_OPTIONS, TECH_BRANCHES } from '@/data/branches';
import { subcategoriesOf } from '@/data/subcategories';
import { ALL_COUNTRIES } from '@/data/countries';
import { BRANDS } from '@/data/brands';
import {
  SPEC_FIELDS,
  activeSpecGroups,
  strictSpecFieldsFor,
  SHADE_SYSTEMS,
  shadeListFor,
  type ProductSpecs,
  type SpecFieldDef,
  type SpecFieldId,
} from '@/data/specs';
import { uploadProductImage, useSignedImageUrls, type Currency } from '@/lib/products';
import { randomUUID } from '@/lib/randomId';
import { hasNativeModule } from '@/lib/nativeModules';
import { cn } from '@/lib/utils';

type CameraApi = typeof import('expo-camera');
function loadCamera(): CameraApi | null {
  if (!hasNativeModule('ExpoCamera')) return null;
  try {
    return require('expo-camera') as CameraApi;
  } catch {
    return null;
  }
}

// Ported verbatim from web's price input (src/routes/supplies.index.tsx's
// formatPriceInput/parsePriceInput): the field's own value is the
// comma-formatted string — commas are stripped only when parsing the final
// number, not on every keystroke.
function formatPriceInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, '');
  if (!cleaned) return '';
  const [intPart, ...rest] = cleaned.split('.');
  let int = intPart.replace(/^0+(?=\d)/, '');
  if (!int) int = '0';
  const withCommas = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const dec = rest.join('').slice(0, 2);
  return dec.length ? `${withCommas}.${dec}` : withCommas;
}
function parsePriceInput(raw: string): number {
  return Number(raw.replace(/,/g, '')) || 0;
}
function formatQtyInput(raw: string): string {
  const cleaned = raw.replace(/[^\d]/g, '');
  if (!cleaned) return '';
  const int = cleaned.replace(/^0+(?=\d)/, '');
  return (int || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

const BRAND_SUGGESTIONS = [...new Set(BRANDS.flatMap((b) => [b.name, b.ar].filter((x) => x && x.trim())))].sort((a, b) =>
  a.localeCompare(b),
);

function BrandAutocomplete({
  value,
  onChangeText,
  ar,
}: {
  value: string;
  onChangeText: (v: string) => void;
  ar: boolean;
}) {
  const [open, setOpen] = useState(false);
  const q = value.trim().toLowerCase();
  const filtered = useMemo(() => {
    const base = !q ? BRAND_SUGGESTIONS : BRAND_SUGGESTIONS.filter((s) => s.toLowerCase().includes(q));
    return base
      .slice()
      .sort((a, b) => {
        const aStart = a.toLowerCase().startsWith(q) ? 0 : 1;
        const bStart = b.toLowerCase().startsWith(q) ? 0 : 1;
        return aStart - bStart || a.localeCompare(b);
      })
      .slice(0, 20);
  }, [q]);

  return (
    <View>
      <TextInput
        value={value}
        onChangeText={(v) => {
          onChangeText(v);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={ar ? 'اسم الشركة المصنعة' : 'Manufacturer name'}
        placeholderTextColor="#94A3B8"
        className={inputCls}
        style={{ writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left' }}
      />
      {open && filtered.length > 0 && (
        <View className="mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {filtered.map((s) => (
            <Pressable
              key={s}
              onPress={() => {
                onChangeText(s);
                setOpen(false);
              }}
              className="flex-row items-center justify-between border-b border-slate-100 px-3.5 py-2.5 last:border-b-0"
            >
              <Text className="text-sm text-slate-700">{s}</Text>
              {s === value && <Check size={14} color="#059669" />}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// Fills the barcode NUMBER only, matching web's own BarcodeScannerModal
// exactly — there is no barcode→product-details database anywhere in this
// app (web included) to auto-fill name/brand/etc. from a scanned code.
function BarcodeScannerModal({ onScan, onClose, ar }: { onScan: (code: string) => void; onClose: () => void; ar: boolean }) {
  const [cam, setCam] = useState<CameraApi | null | undefined>(undefined);

  useEffect(() => {
    setCam(loadCamera());
  }, []);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-slate-950">
        {cam === undefined ? (
          <View className="flex-1 items-center justify-center">
            <ScanBarcode size={40} color="#94A3B8" />
          </View>
        ) : cam === null ? (
          <View className="flex-1 items-center justify-center gap-3 px-8">
            <ScanBarcode size={44} color="#CBD5E1" />
            <Text className="text-center text-sm font-bold text-white">
              {ar ? 'الماسح متوفر في أحدث نسخة من التطبيق' : 'Scanning needs the latest app build'}
            </Text>
            <Pressable onPress={onClose} className="mt-2 rounded-xl bg-white/10 px-4 py-2.5">
              <Text className="text-xs font-bold text-white">{ar ? 'إغلاق' : 'Close'}</Text>
            </Pressable>
          </View>
        ) : (
          <CameraBody cam={cam} onScan={onScan} onClose={onClose} ar={ar} />
        )}
      </View>
    </Modal>
  );
}

function CameraBody({ cam, onScan, onClose, ar }: { cam: CameraApi; onScan: (code: string) => void; onClose: () => void; ar: boolean }) {
  const CameraView = cam.CameraView;
  const useCameraPermissions = cam.useCameraPermissions;
  const [permission, requestPermission] = useCameraPermissions();
  const done = useRef(false);

  if (!permission) return <View className="flex-1 bg-slate-950" />;

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center gap-3 px-8">
        <ScanBarcode size={44} color="#94A3B8" />
        <Text className="text-center text-sm font-bold text-white">
          {ar ? 'نحتاج إذن الكاميرا لمسح الباركود' : 'Camera permission is needed to scan barcodes'}
        </Text>
        <Pressable onPress={requestPermission} className="mt-1 rounded-xl bg-primary px-4 py-2.5">
          <Text className="text-xs font-bold text-primary-foreground">{ar ? 'منح الإذن' : 'Grant permission'}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <CameraView
      style={{ flex: 1 }}
      facing="back"
      barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'upc_a', 'upc_e'] }}
      onBarcodeScanned={({ data }) => {
        if (done.current || !data) return;
        done.current = true;
        onScan(data);
      }}
    >
      <View className="flex-1 items-center justify-center">
        <View className="h-56 w-56 rounded-2xl border-2 border-white/80" />
        <Text className="mt-6 text-xs font-semibold text-white/80">{ar ? 'وجّه الكاميرا نحو الباركود' : 'Point the camera at the barcode'}</Text>
      </View>
      <View className="bg-slate-950/60 px-4 pb-6 pt-2">
        <Pressable onPress={onClose} className="h-11 items-center justify-center rounded-xl border border-white/30">
          <Text className="text-sm font-bold text-white">{ar ? 'إلغاء' : 'Close'}</Text>
        </Pressable>
      </View>
    </CameraView>
  );
}

export type SupplyProductDraft = {
  id: string;
  name: string;
  brand: string;
  price: number;
  purchasePrice?: number;
  currency: Currency;
  stock: number;
  description: string;
  images: string[];
  branch: string;
  subCategory?: string;
  country?: string;
  countryOrigin?: string;
  barcode?: string;
  expiryDate?: string;
  specs?: ProductSpecs;
  technicalSpecifications?: ProductSpecs;
  sku?: string;
};

const inputCls = 'h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text className="mb-1.5 text-[11px] font-bold text-slate-500">{label}</Text>
      {children}
    </View>
  );
}

// `tint` alternates each card's background so a long form of many cards
// reads as distinct sections instead of one continuous white block.
function SectionCard({ title, tint, children }: { title: string; tint?: boolean; children: React.ReactNode }) {
  return (
    <View className={cn('gap-3 rounded-2xl border border-slate-200 p-4', tint ? 'bg-sky-50/60' : 'bg-white')}>
      <View className="flex-row items-center gap-1.5">
        <View className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <Text className="text-sm font-bold text-slate-800">{title}</Text>
      </View>
      {children}
    </View>
  );
}

function visibleSpecIds(ids: SpecFieldId[], bag: ProductSpecs): SpecFieldId[] {
  return ids.filter((fid) => {
    const cond = SPEC_FIELDS[fid]?.showWhen;
    return !cond || bag[cond.field] === cond.value;
  });
}

export function AddSupplyProductModal({
  open,
  onClose,
  ar,
  initial,
  defaultBranch,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  ar: boolean;
  initial?: SupplyProductDraft | null;
  defaultBranch?: string;
  onSave: (draft: SupplyProductDraft) => Promise<void>;
}) {
  const [draftId] = useState(() => initial?.id ?? randomUUID());
  const [name, setName] = useState(initial?.name ?? '');
  const [brand, setBrand] = useState(initial?.brand ?? '');
  const [price, setPrice] = useState(initial ? formatPriceInput(String(initial.price)) : '');
  const [purchasePrice, setPurchasePrice] = useState(initial?.purchasePrice ? formatPriceInput(String(initial.purchasePrice)) : '');
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? 'USD');
  const [stock, setStock] = useState(initial?.stock ?? 0);
  const [showScanner, setShowScanner] = useState(false);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [branch, setBranch] = useState(initial?.branch ?? defaultBranch ?? 'general');
  const [subCategory, setSubCategory] = useState(initial?.subCategory ?? '');
  const [country, setCountry] = useState(initial?.country ?? '');
  const [barcode, setBarcode] = useState(initial?.barcode ?? '');
  const [expiryDate, setExpiryDate] = useState(initial?.expiryDate ?? '');
  const [specs, setSpecs] = useState<ProductSpecs>(initial?.specs ?? {});
  const [techSpecs, setTechSpecs] = useState<ProductSpecs>(initial?.technicalSpecifications ?? {});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const { data: urlMap = {} } = useSignedImageUrls(images);

  const subCategoryOptions = subcategoriesOf(branch);
  const subCategoryAr = subCategoryOptions.find((s) => s.en === subCategory)?.ar ?? '';
  const isTechBranch = TECH_BRANCHES.has(branch);
  const isStrictBranch = branch === 'general' || branch === 'operative' || isTechBranch;
  const strictFieldIds = isStrictBranch ? strictSpecFieldsFor(subCategory, subCategoryAr) : null;
  const activeGroups = useMemo(() => activeSpecGroups(branch, subCategory, subCategoryAr), [branch, subCategory, subCategoryAr]);
  const activeFields = useMemo(() => [...new Set(activeGroups.flatMap((g) => g.fields))], [activeGroups]);

  const strictBag = isTechBranch ? techSpecs : specs;
  const visibleStrictIds = useMemo(() => visibleSpecIds(strictFieldIds ?? [], strictBag), [strictFieldIds, strictBag]);

  const sku = useMemo(() => {
    const bag = isTechBranch ? techSpecs : specs;
    const prefix = BRANCH_CODE[branch] ?? branch.slice(0, 3).toUpperCase();
    const subCode = subCategory
      .split(/[\s/&-]+/)
      .map((w) => w.slice(0, 3))
      .join('')
      .toUpperCase();
    const specParts = Object.values(bag)
      .flatMap((v) => (Array.isArray(v) ? v : [v]))
      .map((s) =>
        s
          .replace(/[^a-zA-Z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .toUpperCase(),
      )
      .filter(Boolean);
    const all = [prefix, subCode, ...specParts].filter(Boolean);
    return all.length > 0 ? all.join('-') : '';
  }, [branch, subCategory, specs, techSpecs, isTechBranch]);

  const setField = (bag: 'specs' | 'tech', id: SpecFieldId, value: string | string[] | undefined) => {
    const setter = bag === 'tech' ? setTechSpecs : setSpecs;
    setter((prev) => {
      const next = { ...prev };
      if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        delete next[id];
      } else {
        next[id] = value;
      }
      return next;
    });
  };

  const changeValue = (bag: 'specs' | 'tech', id: SpecFieldId, value: string | string[] | undefined) => {
    setField(bag, id, value);
    Object.values(SPEC_FIELDS).forEach((f) => {
      if (f.showWhen?.field !== id) return;
      if (typeof value !== 'string' || value === '' || f.showWhen.value !== value) {
        setField(bag, f.id, undefined);
      }
    });
  };

  const MAX_DESC_WORDS = 200;
  const onDescriptionChange = (v: string) => {
    const words = v.trim() ? v.trim().split(/\s+/) : [];
    setDescription(words.length > MAX_DESC_WORDS ? words.slice(0, MAX_DESC_WORDS).join(' ') : v);
  };
  const descWords = description.trim() ? description.trim().split(/\s+/).length : 0;

  const pickImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      const path = await uploadProductImage(draftId, {
        uri: asset.uri,
        name: asset.fileName ?? undefined,
        type: asset.mimeType ?? undefined,
      });
      setImages((prev) => [...prev, path]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const renderSpecField = (field: SpecFieldDef, bag: ProductSpecs, target: 'specs' | 'tech') => {
    const current = bag[field.id];

    if (field.id === 'shades') {
      const system = (bag.shadeSystem as string) || SHADE_SYSTEMS[0];
      const selected = (current as string[]) || [];
      return (
        <View key={field.id} className="gap-2">
          <Text className="text-[11px] font-bold text-slate-500">{ar ? field.ar : field.en}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerClassName="gap-1.5">
            {SHADE_SYSTEMS.map((s) => (
              <Pressable
                key={s}
                onPress={() => {
                  setField(target, 'shadeSystem' as SpecFieldId, s);
                  setField(target, 'shades' as SpecFieldId, undefined);
                }}
                className={cn('h-9 items-center justify-center rounded-full border px-3.5', system === s ? 'border-emerald-600 bg-emerald-600' : 'border-slate-200 bg-white')}
              >
                <Text className={cn('text-xs font-bold', system === s ? 'text-white' : 'text-slate-600')}>{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View className="flex-row flex-wrap gap-1.5">
            {shadeListFor(system).map((sh) => {
              const active = selected.includes(sh.code);
              return (
                <Pressable
                  key={sh.code}
                  onPress={() => {
                    const next = active ? selected.filter((x) => x !== sh.code) : [...selected, sh.code];
                    setField(target, 'shades' as SpecFieldId, next.length > 0 ? next : undefined);
                  }}
                  className={cn('h-9 flex-row items-center gap-1.5 rounded-full border px-3', active ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white')}
                >
                  <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: sh.hex, borderWidth: 1, borderColor: '#CBD5E1' }} />
                  <Text className={cn('text-[11px] font-bold', active ? 'text-emerald-700' : 'text-slate-600')}>{sh.code}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }

    if (field.type === 'text') {
      return (
        <Field key={field.id} label={ar ? field.ar : field.en}>
          <TextInput
            value={(current as string) || ''}
            onChangeText={(v) => changeValue(target, field.id, v || undefined)}
            placeholder={field.placeholder}
            placeholderTextColor="#94A3B8"
            className={inputCls}
            style={{ writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left' }}
          />
        </Field>
      );
    }

    if (field.type === 'multi') {
      const selected = (current as string[]) || [];
      return (
        <View key={field.id} className="gap-1.5">
          <Text className="text-[11px] font-bold text-slate-500">{ar ? field.ar : field.en}</Text>
          <View className="flex-row flex-wrap gap-1.5">
            {(field.options ?? []).map((o) => {
              const active = selected.includes(o.value);
              return (
                <Pressable
                  key={o.value}
                  onPress={() => {
                    const next = active ? selected.filter((x) => x !== o.value) : [...selected, o.value];
                    changeValue(target, field.id, next.length > 0 ? next : undefined);
                  }}
                  className={cn('h-9 items-center justify-center rounded-full border px-3', active ? 'border-primary bg-primary' : 'border-slate-200 bg-white')}
                >
                  <Text className={cn('text-[11px] font-bold', active ? 'text-primary-foreground' : 'text-slate-600')}>
                    {ar ? o.ar ?? o.value : o.value}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }

    return (
      <Field key={field.id} label={ar ? field.ar : field.en}>
        <Select
          value={(current as string) || ''}
          onChange={(v) => changeValue(target, field.id, v || undefined)}
          options={[
            { value: '', label: ar ? '-- اختر --' : '-- Select --' },
            ...(field.options ?? []).map((o) => ({ value: o.value, label: ar ? o.ar ?? o.value : o.value })),
          ]}
        />
      </Field>
    );
  };

  const save = async () => {
    if (!name.trim()) {
      setError(ar ? 'الرجاء إدخال اسم المنتج' : 'Please enter a product name');
      return;
    }
    if (!price.trim() || parsePriceInput(price) <= 0) {
      setError(ar ? 'الرجاء إدخال سعر صحيح' : 'Please enter a valid price');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const originCountry = ALL_COUNTRIES.find((c) => c.code === country);
      await onSave({
        id: draftId,
        name: name.trim(),
        brand: brand.trim(),
        price: parsePriceInput(price),
        purchasePrice: parsePriceInput(purchasePrice) || undefined,
        currency,
        stock,
        description: description.trim(),
        images,
        branch,
        subCategory: subCategory || undefined,
        country: country || undefined,
        countryOrigin: originCountry?.ar,
        barcode: barcode.trim() || undefined,
        expiryDate: expiryDate || undefined,
        specs: Object.keys(specs).length > 0 ? specs : undefined,
        technicalSpecifications: Object.keys(techSpecs).length > 0 ? techSpecs : undefined,
        sku: sku || undefined,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const branchOptionsSelect = BRANCH_OPTIONS.map((b) => ({ value: b.value, label: ar ? b.ar : b.en }));
  const subCategorySelect = [
    { value: '', label: ar ? '-- اختر التصنيف الفرعي --' : '-- Select sub-category --' },
    ...subCategoryOptions.map((s) => ({ value: s.en, label: ar ? s.ar : s.en })),
  ];

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[92%] rounded-t-3xl bg-white">
          <View className="flex-row items-center justify-between border-b border-slate-100 px-4 pb-2.5 pt-4">
            <View>
              <Text className="text-base font-extrabold text-slate-900">
                {initial ? (ar ? 'تعديل منتج' : 'Edit Product') : ar ? 'منتج جديد' : 'New Product'}
              </Text>
              <Text className="mt-0.5 text-[11px] text-slate-400">
                {ar ? 'أدخل تفاصيل المنتج للحفظ' : 'Enter product details to save'}
              </Text>
            </View>
            <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
              <X size={16} color="#334155" />
            </Pressable>
          </View>

          <ScrollView className="px-4" contentContainerClassName="gap-3.5 py-4">
            <SectionCard title={ar ? 'معلومات أساسية' : 'Basic Info'}>
              <Field label={ar ? 'اسم المنتج' : 'Product name'}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={ar ? 'مثال: كومبوزيت ضوئي' : 'e.g. Light-cured composite'}
                  placeholderTextColor="#94A3B8"
                  className={inputCls}
                  style={{ writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left' }}
                />
              </Field>
              <Field label={ar ? 'الماركة' : 'Brand'}>
                <BrandAutocomplete value={brand} onChangeText={setBrand} ar={ar} />
              </Field>
            </SectionCard>

            <SectionCard tint title={ar ? 'صور المنتج' : 'Product Images'}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerClassName="gap-2.5">
                {images.map((path) => (
                  <View key={path} className="h-20 w-20 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                    {urlMap[path] ? (
                      <Image source={{ uri: urlMap[path] }} className="h-full w-full" resizeMode="cover" />
                    ) : (
                      <View className="h-full w-full items-center justify-center">
                        <Package size={20} color="#CBD5E1" />
                      </View>
                    )}
                    <Pressable
                      onPress={() => setImages((prev) => prev.filter((p) => p !== path))}
                      className="absolute right-1 top-1 h-5 w-5 items-center justify-center rounded-full bg-black/60"
                    >
                      <X size={11} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ))}
                <Pressable onPress={pickImage} className="h-20 w-20 items-center justify-center gap-0.5 rounded-2xl border-2 border-dashed border-slate-300">
                  <Plus size={18} color="#94A3B8" />
                  <Text className="text-[9px] font-bold text-slate-400">{ar ? 'إضافة' : 'Add'}</Text>
                </Pressable>
              </ScrollView>
              <Text className="text-[10px] text-slate-400">{images.length}/5 · JPG, PNG</Text>
            </SectionCard>

            <SectionCard title={ar ? 'وصف المنتج' : 'Product Description'}>
              <TextInput
                value={description}
                onChangeText={onDescriptionChange}
                multiline
                numberOfLines={4}
                placeholder={ar ? 'اكتب وصفاً للمنتج (200 كلمة كحد أقصى)...' : 'Describe the product (200 words max)...'}
                placeholderTextColor="#94A3B8"
                className="min-h-[88px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800"
                style={{ textAlignVertical: 'top', writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left' }}
              />
              <Text className="text-end text-[10px] font-semibold text-slate-400">
                {ar ? `${descWords}/200 كلمة` : `${descWords}/200 words`}
              </Text>
            </SectionCard>

            <SectionCard tint title={ar ? 'التصنيف' : 'Category'}>
              <Field label={ar ? 'الفئة الرئيسية' : 'Main category'}>
                <Select
                  value={branch}
                  onChange={(v) => {
                    setBranch(v);
                    setSubCategory('');
                    setSpecs({});
                    setTechSpecs({});
                  }}
                  options={branchOptionsSelect}
                />
              </Field>
              {subCategoryOptions.length > 0 && (
                <Field label={ar ? 'التصنيف الفرعي' : 'Sub-category'}>
                  <Select
                    value={subCategory}
                    onChange={(v) => {
                      setSubCategory(v);
                      setSpecs({});
                      setTechSpecs({});
                    }}
                    options={subCategorySelect}
                  />
                </Field>
              )}
            </SectionCard>

            <SectionCard title={ar ? 'بلد المنشأ والباركود' : 'Origin & Barcode'}>
              <Field label={ar ? 'بلد المنشأ' : 'Country of Origin'}>
                <CountrySelect value={country} onChange={setCountry} ar={ar} />
              </Field>
              <Field label={ar ? 'الباركود' : 'Barcode'}>
                <View className="flex-row gap-2">
                  <TextInput
                    value={barcode}
                    onChangeText={setBarcode}
                    placeholder={ar ? 'رمز الباركود أو امسحه' : 'Barcode or scan it'}
                    placeholderTextColor="#94A3B8"
                    className={cn(inputCls, 'flex-1')}
                    style={{ writingDirection: 'ltr', textAlign: 'left' }}
                  />
                  <Pressable onPress={() => setShowScanner(true)} className="h-11 flex-row items-center gap-1.5 rounded-xl bg-slate-900 px-3.5">
                    <ScanBarcode size={15} color="#FFFFFF" />
                    <Text className="text-xs font-bold text-white">{ar ? 'مسح' : 'Scan'}</Text>
                  </Pressable>
                </View>
              </Field>
            </SectionCard>

            {isStrictBranch
              ? visibleStrictIds.length > 0 && (
                  <SectionCard tint title={ar ? 'المواصفات الفنية' : 'Technical Specifications'}>
                    {visibleStrictIds.map((fid) => renderSpecField(SPEC_FIELDS[fid], strictBag, isTechBranch ? 'tech' : 'specs'))}
                  </SectionCard>
                )
              : activeGroups.length > 0 && (
                  <SectionCard tint title={ar ? 'المواصفات الفنية' : 'Technical Specifications'}>
                    {activeGroups.map((g) => (
                      <View key={g.id} className="gap-3 pt-1">
                        <View className="flex-row items-center gap-1.5">
                          <View className="h-1 w-1 rounded-full bg-emerald-600" />
                          <Text className="text-[11px] font-extrabold text-emerald-700">{ar ? g.ar : g.en}</Text>
                        </View>
                        {g.fields.filter((fid) => activeFields.includes(fid)).map((fid) => renderSpecField(SPEC_FIELDS[fid], specs, 'specs'))}
                      </View>
                    ))}
                  </SectionCard>
                )}

            <SectionCard title={ar ? 'السعر والمخزون' : 'Pricing & Inventory'}>
              <View className="flex-row gap-2 self-end rounded-xl bg-slate-100 p-1">
                {/* No shadow at all — a transparent Pressable with elevation
                    still paints a faint halo on Android even when "inactive",
                    which read as an unwanted highlight. A solid fill on the
                    active side is enough. */}
                <Pressable onPress={() => setCurrency('USD')} className={cn('h-7 items-center justify-center rounded-lg px-3', currency === 'USD' ? 'bg-primary' : 'bg-transparent')}>
                  <Text className={cn('text-xs font-bold', currency === 'USD' ? 'text-primary-foreground' : 'text-slate-500')}>$</Text>
                </Pressable>
                <Pressable onPress={() => setCurrency('IQD')} className={cn('h-7 items-center justify-center rounded-lg px-3', currency === 'IQD' ? 'bg-primary' : 'bg-transparent')}>
                  <Text className={cn('text-xs font-bold', currency === 'IQD' ? 'text-primary-foreground' : 'text-slate-500')}>{ar ? 'د.ع' : 'IQD'}</Text>
                </Pressable>
              </View>
              <View className="flex-row gap-2.5">
                <View className="flex-1">
                  <Field label={ar ? 'سعر الشراء' : 'Purchase price'}>
                    <TextInput
                      value={purchasePrice}
                      onChangeText={(v) => setPurchasePrice(formatPriceInput(v))}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="#94A3B8"
                      className={inputCls}
                      style={{ writingDirection: 'ltr', textAlign: 'left' }}
                    />
                  </Field>
                </View>
                <View className="flex-1">
                  <Field label={`${ar ? 'سعر البيع' : 'Selling price'} *`}>
                    <TextInput
                      value={price}
                      onChangeText={(v) => setPrice(formatPriceInput(v))}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="#94A3B8"
                      className={inputCls}
                      style={{ writingDirection: 'ltr', textAlign: 'left' }}
                    />
                  </Field>
                </View>
              </View>
              <Field label={ar ? 'تاريخ انتهاء الصلاحية' : 'Expiry Date'}>
                <TextInput
                  value={expiryDate}
                  onChangeText={setExpiryDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                  className={inputCls}
                  style={{ writingDirection: 'ltr', textAlign: 'left' }}
                />
              </Field>
              <Field label={ar ? 'المخزون الحالي' : 'Current stock'}>
                <View className="flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-2">
                  <Pressable onPress={() => setStock((v) => Math.max(0, v - 1))} className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                    <Minus size={16} color="#334155" />
                  </Pressable>
                  <TextInput
                    value={stock === 0 ? '' : formatQtyInput(String(stock))}
                    onChangeText={(v) => setStock(Number(v.replace(/[^\d]/g, '')) || 0)}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    className="flex-1 text-center text-xl font-extrabold text-slate-900"
                    style={{ writingDirection: 'ltr' }}
                  />
                  <Pressable onPress={() => setStock((v) => v + 1)} className="h-10 w-10 items-center justify-center rounded-xl bg-emerald-600">
                    <Plus size={16} color="#FFFFFF" />
                  </Pressable>
                </View>
              </Field>
              <Field label={ar ? 'رمز SKU (تلقائي)' : 'SKU (auto)'}>
                <View className="h-11 justify-center rounded-xl border border-slate-200 bg-slate-50 px-3">
                  <Text className="font-mono text-xs text-slate-500" numberOfLines={1}>
                    {sku || (ar ? 'يُولّد تلقائياً من المواصفات' : 'Auto-generated from specs')}
                  </Text>
                </View>
              </Field>
            </SectionCard>

            {!!error && (
              <Text className="rounded-xl bg-rose-50 px-3 py-2.5 text-center text-xs font-semibold text-rose-600">
                {error}
              </Text>
            )}

            <Pressable
              onPress={save}
              disabled={busy}
              className="h-13 items-center justify-center rounded-2xl bg-primary py-3.5"
              style={{ opacity: busy ? 0.6 : 1 }}
            >
              <Text className="text-sm font-extrabold text-primary-foreground">
                {busy ? (ar ? 'جارٍ الحفظ...' : 'Saving...') : initial ? (ar ? 'حفظ التعديلات' : 'Save changes') : ar ? '+ حفظ المنتج' : '+ Save product'}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
      </KeyboardAvoidingView>

      {showScanner && (
        <BarcodeScannerModal
          ar={ar}
          onScan={(code) => {
            setBarcode(code);
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </Modal>
  );
}
