import { useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Check, Package, Plus, Sparkles, Upload, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { Select, Text } from '@/components/ui';
import { CountrySelect } from '@/components/CountrySelect';
import { SPECIALIZED_CATEGORIES, SPECIALIZED_FIELDS, type SpecializedField } from '@/data/specializedImplants';
import {
  uploadProductImage,
  removeProductImage,
  useSignedImageUrls,
  useUpsertProduct,
  MAX_PRODUCT_IMAGES,
  type Currency,
  type Product,
} from '@/lib/products';
import { useUserRole } from '@/lib/useAuth';
import { randomUUID } from '@/lib/randomId';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

const MAX_CLINICAL_IMAGES = 10;
const ACCENT = '#6366F1';
const inputCls = 'h-12 rounded-2xl border border-indigo-100 bg-indigo-50/40 px-4 text-sm text-slate-800';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text className="mb-1.5 text-[11px] font-bold text-slate-500">{label}</Text>
      {children}
    </View>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3 rounded-3xl border border-indigo-100 bg-white p-4" style={{ shadowColor: ACCENT, shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 }}>
      <View className="flex-row items-center gap-2">
        <View className="h-2 w-2 rounded-full" style={{ backgroundColor: ACCENT }} />
        <Text className="text-sm font-extrabold text-slate-800">{title}</Text>
      </View>
      {children}
    </View>
  );
}

function ImageStrip({
  ar,
  images,
  urlMap,
  onAdd,
  onRemove,
  max,
}: {
  ar: boolean;
  images: string[];
  urlMap: Record<string, string>;
  onAdd: () => void;
  onRemove: (path: string) => void;
  max: number;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerClassName="gap-2.5">
      {images.map((path) => (
        <View key={path} className="h-20 w-20 overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50/40">
          {urlMap[path] ? (
            <Image source={{ uri: urlMap[path] }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Package size={20} color="#C7D2FE" />
            </View>
          )}
          <Pressable onPress={() => onRemove(path)} className="absolute right-1 top-1 h-5 w-5 items-center justify-center rounded-full bg-black/60">
            <X size={11} color="#FFFFFF" />
          </Pressable>
        </View>
      ))}
      {images.length < max && (
        <Pressable onPress={onAdd} className="h-20 w-20 items-center justify-center gap-0.5 rounded-2xl border-2 border-dashed border-indigo-200">
          <Upload size={16} color={ACCENT} />
          <Text className="text-[9px] font-bold" style={{ color: ACCENT }}>{ar ? 'إضافة' : 'Add'}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function DynamicField({ field, value, onChange, ar }: { field: SpecializedField; value: string | string[] | undefined; onChange: (v: string | string[] | undefined) => void; ar: boolean }) {
  if (field.type === 'text') {
    return (
      <Field label={ar ? field.ar : field.en}>
        <TextInput
          value={(value as string) || ''}
          onChangeText={(v) => onChange(v || undefined)}
          placeholder={field.placeholder}
          placeholderTextColor="#94A3B8"
          className={inputCls}
          style={{ writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left' }}
        />
      </Field>
    );
  }

  if (field.type === 'multi') {
    const selected = (value as string[]) || [];
    return (
      <View>
        <Text className="mb-1.5 text-[11px] font-bold text-slate-500">{ar ? field.ar : field.en}</Text>
        <View className="flex-row flex-wrap gap-1.5">
          {(field.options ?? []).map((o) => {
            const active = selected.includes(o.value);
            return (
              <Pressable
                key={o.value}
                onPress={() => {
                  const next = active ? selected.filter((x) => x !== o.value) : [...selected, o.value];
                  onChange(next.length > 0 ? next : undefined);
                }}
                className={cn('h-9 flex-row items-center gap-1.5 rounded-full border px-3', active ? 'border-transparent' : 'border-indigo-100 bg-white')}
                style={active ? { backgroundColor: ACCENT } : undefined}
              >
                {active && <Check size={12} color="#FFFFFF" />}
                <Text className={cn('text-[11px] font-bold', active ? 'text-white' : 'text-slate-600')}>{ar ? o.ar ?? o.value : o.value}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <Field label={ar ? field.ar : field.en}>
      <Select
        value={(value as string) || ''}
        onChange={(v) => onChange(v || undefined)}
        options={[
          { value: '', label: ar ? '-- اختر --' : '-- Select --' },
          ...(field.options ?? []).map((o) => ({ value: o.value, label: ar ? o.ar ?? o.value : o.value })),
        ]}
      />
    </Field>
  );
}

export function SpecializedImplantForm({ open, onClose, ar, product }: { open: boolean; onClose: () => void; ar: boolean; product?: Product | null }) {
  const upsert = useUpsertProduct();
  const { user } = useUserRole();
  const isEdit = !!product;
  const [draftId] = useState(() => product?.id ?? randomUUID());

  const [category, setCategory] = useState(product?.specializedImplant?.category ?? 'subperiosteal');
  const [name, setName] = useState(product?.ar ?? '');
  const [manufacturer, setManufacturer] = useState(product?.brand ?? '');
  const [country, setCountry] = useState(product?.country ?? '');
  const [price, setPrice] = useState(product?.price ? String(product.price) : '');
  const [currency, setCurrency] = useState<Currency>(product?.currency || 'USD');
  const [stock, setStock] = useState(product?.stock ? String(product.stock) : '0');
  const [description, setDescription] = useState(product?.description ?? '');
  const [fields, setFields] = useState<Record<string, string | string[]>>(product?.specializedImplant?.fields ?? {});
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [clinicalImages, setClinicalImages] = useState<string[]>(product?.specializedImplant?.clinicalImages ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const activeFields = SPECIALIZED_FIELDS[category] ?? [];
  const hideStock = category === 'subperiosteal';

  const { data: urlMap = {} } = useSignedImageUrls(images);
  const { data: clinicalUrlMap = {} } = useSignedImageUrls(clinicalImages);

  const selectCategory = (id: string) => {
    setCategory(id);
    setFields({});
  };

  const setField = (id: string, value: string | string[] | undefined) => {
    setFields((prev) => {
      const next = { ...prev };
      if (value === undefined || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && value.length === 0)) delete next[id];
      else next[id] = value;
      return next;
    });
  };

  const pickAndUpload = async (onPath: (path: string) => void) => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    const path = await uploadProductImage(draftId, { uri: asset.uri, name: asset.fileName ?? undefined, type: asset.mimeType ?? undefined });
    onPath(path);
  };

  const submit = async () => {
    setError('');
    if (!name.trim()) {
      setError(ar ? 'الرجاء إدخال اسم الزرعة المتخصصة' : 'Please enter the specialized implant name');
      return;
    }
    if (!manufacturer.trim()) {
      setError(ar ? 'الرجاء إدخال اسم الشركة المصنعة' : 'Please enter the manufacturer name');
      return;
    }
    if (!price.trim() || isNaN(Number(price))) {
      setError(ar ? 'الرجاء إدخال سعر صحيح' : 'Please enter a valid price');
      return;
    }
    setBusy(true);
    try {
      const cleanFields: Record<string, string | string[]> = {};
      Object.entries(fields).forEach(([k, v]) => {
        if (Array.isArray(v)) { if (v.length > 0) cleanFields[k] = v; }
        else if (typeof v === 'string' && v.trim()) cleanFields[k] = v.trim();
      });

      await upsert.mutateAsync({
        id: draftId,
        branch: 'specialized_implant',
        ar: name.trim(),
        en: name.trim(),
        brand: manufacturer.trim(),
        price: Math.max(0, Number(price) || 0),
        currency,
        stock: hideStock ? 1 : Math.max(0, Number(stock) || 0),
        inStock: true,
        images,
        category: 'specialized_implant',
        companyId: product?.companyId || user?.uid || '',
        country: country || undefined,
        description: description.trim() || undefined,
        specializedImplant: {
          category,
          fields: cleanFields,
          clinicalImages: clinicalImages.length > 0 ? clinicalImages : undefined,
        },
      });
      toast.success(ar ? 'تم حفظ الزرعة المتخصصة بنجاح' : 'Specialized implant saved');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[93%] overflow-hidden rounded-t-[32px] bg-[#F6F5FF]">
          <View className="flex-row items-center justify-between px-4 pb-3 pt-4" style={{ backgroundColor: ACCENT }}>
            <View className="flex-row items-center gap-2.5">
              <View className="h-9 w-9 items-center justify-center rounded-2xl bg-white/20">
                <Sparkles size={18} color="#FFFFFF" />
              </View>
              <View>
                <Text className="text-base font-extrabold text-white">{isEdit ? (ar ? 'تعديل زرعة متخصصة' : 'Edit Specialized Implant') : ar ? 'إضافة زرعة متخصصة' : 'Add Specialized Implant'}</Text>
                <Text className="text-[11px] text-white/75">{ar ? 'حلول متقدمة للحالات المعقدة' : 'Advanced solutions for complex cases'}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <X size={16} color="#FFFFFF" />
            </Pressable>
          </View>

          <ScrollView className="px-4" contentContainerClassName="gap-3.5 py-4">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerClassName="gap-1.5">
              {SPECIALIZED_CATEGORIES.map((c) => {
                const active = category === c.id;
                return (
                  <Pressable key={c.id} onPress={() => selectCategory(c.id)} className={cn('h-10 items-center justify-center rounded-full border px-3.5', active ? 'border-transparent' : 'border-indigo-100 bg-white')} style={active ? { backgroundColor: ACCENT } : undefined}>
                    <Text className={cn('text-xs font-bold', active ? 'text-white' : 'text-slate-600')}>{ar ? c.ar : c.en}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <SectionCard title={ar ? 'معلومات أساسية' : 'Basic Information'}>
              <Field label={ar ? 'اسم الزرعة المتخصصة' : 'Implant name'}>
                <TextInput value={name} onChangeText={setName} placeholder={ar ? 'مثال: Subperiosteal Mesh' : 'e.g. Subperiosteal Mesh'} placeholderTextColor="#94A3B8" className={inputCls} style={{ writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left' }} />
              </Field>
              <Field label={ar ? 'الشركة المصنعة' : 'Manufacturer'}>
                <TextInput value={manufacturer} onChangeText={setManufacturer} placeholder={ar ? 'مثال: Zygoma' : 'e.g. Zygoma'} placeholderTextColor="#94A3B8" className={inputCls} style={{ writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left' }} />
              </Field>
              <Field label={ar ? 'بلد المنشأ' : 'Country of Origin'}>
                <CountrySelect value={country} onChange={setCountry} ar={ar} />
              </Field>
              <Field label={ar ? 'الوصف' : 'Description'}>
                <TextInput
                  value={description}
                  onChangeText={(v) => setDescription(v.slice(0, 1000))}
                  multiline
                  numberOfLines={3}
                  placeholder={ar ? 'اكتب وصفاً للمنتج...' : 'Describe the implant...'}
                  placeholderTextColor="#94A3B8"
                  className="min-h-[80px] rounded-2xl border border-indigo-100 bg-indigo-50/40 px-4 py-3 text-sm text-slate-800"
                  style={{ textAlignVertical: 'top', writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left' }}
                />
              </Field>
            </SectionCard>

            <SectionCard title={ar ? 'صور المنتج' : 'Product Images'}>
              <ImageStrip
                ar={ar}
                images={images}
                urlMap={urlMap}
                max={MAX_PRODUCT_IMAGES}
                onAdd={() => pickAndUpload((p) => setImages((prev) => [...prev, p]))}
                onRemove={async (path) => {
                  setImages((prev) => prev.filter((p) => p !== path));
                  try { await removeProductImage(path); } catch { /* already removed */ }
                }}
              />
            </SectionCard>

            {activeFields.length > 0 && (
              <SectionCard title={ar ? 'المواصفات الخاصة' : 'Category Specifications'}>
                {activeFields.map((f) => (
                  <DynamicField key={f.id} field={f} value={fields[f.id]} onChange={(v) => setField(f.id, v)} ar={ar} />
                ))}
              </SectionCard>
            )}

            <SectionCard title={ar ? 'السعر والمخزون' : 'Price & Stock'}>
              <View className="flex-row gap-2 self-end rounded-xl bg-indigo-50 p-1">
                {/* No shadow at all — see the tab-bar note in supplies-office.tsx. */}
                <Pressable onPress={() => setCurrency('USD')} className="h-8 items-center justify-center rounded-lg px-3" style={currency === 'USD' ? { backgroundColor: ACCENT } : undefined}>
                  <Text className={cn('text-xs font-bold', currency === 'USD' ? 'text-white' : 'text-slate-500')}>$</Text>
                </Pressable>
                <Pressable onPress={() => setCurrency('IQD')} className="h-8 items-center justify-center rounded-lg px-3" style={currency === 'IQD' ? { backgroundColor: ACCENT } : undefined}>
                  <Text className={cn('text-xs font-bold', currency === 'IQD' ? 'text-white' : 'text-slate-500')}>{ar ? 'د.ع' : 'IQD'}</Text>
                </Pressable>
              </View>
              <View className="flex-row gap-2.5">
                <View className="flex-1">
                  <Field label={ar ? 'سعر الوحدة' : 'Unit price'}>
                    <TextInput value={price} onChangeText={(v) => setPrice(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#94A3B8" className={inputCls} style={{ writingDirection: 'ltr', textAlign: 'left' }} />
                  </Field>
                </View>
                {!hideStock && (
                  <View className="flex-1">
                    <Field label={ar ? 'المخزون' : 'Stock'}>
                      <TextInput value={stock} onChangeText={(v) => setStock(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="0" placeholderTextColor="#94A3B8" className={inputCls} style={{ writingDirection: 'ltr', textAlign: 'left' }} />
                    </Field>
                  </View>
                )}
              </View>
            </SectionCard>

            <SectionCard title={ar ? 'صور حالات العمل' : 'Clinical Cases'}>
              <ImageStrip
                ar={ar}
                images={clinicalImages}
                urlMap={clinicalUrlMap}
                max={MAX_CLINICAL_IMAGES}
                onAdd={() => pickAndUpload((p) => setClinicalImages((prev) => [...prev, p]))}
                onRemove={async (path) => {
                  setClinicalImages((prev) => prev.filter((p) => p !== path));
                  try { await removeProductImage(path); } catch { /* already removed */ }
                }}
              />
            </SectionCard>

            {!!error && <Text className="rounded-2xl bg-rose-50 px-3 py-2.5 text-center text-xs font-semibold text-rose-600">{error}</Text>}

            <Pressable onPress={submit} disabled={busy} className="h-14 items-center justify-center rounded-2xl" style={{ backgroundColor: ACCENT, opacity: busy ? 0.6 : 1 }}>
              <Text className="text-sm font-extrabold text-white">{busy ? (ar ? 'جارٍ الحفظ...' : 'Saving...') : ar ? 'حفظ الزرعة المتخصصة' : 'Save Specialized Implant'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
