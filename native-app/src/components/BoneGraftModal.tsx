import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Bone, Check, Package, Plus, Trash2, Upload, X } from 'lucide-react-native';

import { Select, Text } from '@/components/ui';
import { CountrySelect } from '@/components/CountrySelect';
import {
  uploadProductImage,
  removeProductImage,
  useSignedImageUrls,
  useUpsertProduct,
  MAX_PRODUCT_IMAGES,
  type Product,
} from '@/lib/products';
import { useUserRole } from '@/lib/useAuth';
import { randomUUID } from '@/lib/randomId';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import * as ImagePicker from 'expo-image-picker';

const MAX_CLINICAL_IMAGES = 10;

const GRAFT_TYPES = [
  { ar: 'تركيبي', en: 'Synthetic' },
  { ar: 'حيواني', en: 'Xenograft' },
  { ar: 'بشري', en: 'Allograft' },
  { ar: 'ذاتي', en: 'Autograft' },
];

const GRAFT_FORMS = [
  { ar: 'حبيبات', en: 'Granules' },
  { ar: 'حقنة', en: 'Syringe' },
  { ar: 'كتل', en: 'Blocks' },
];

type PackRow = { key: string; volume: string; priceUsd: string; priceIqd: string; available: boolean };

function newRow(): PackRow {
  return { key: randomUUID(), volume: '', priceUsd: '', priceIqd: '', available: true };
}

const ACCENT = '#059669';
const inputCls = 'h-12 rounded-2xl border border-emerald-100 bg-emerald-50/40 px-4 text-sm text-slate-800';

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
    <View className="gap-3 rounded-3xl border border-emerald-100 bg-white p-4" style={{ shadowColor: '#059669', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 }}>
      <View className="flex-row items-center gap-2">
        <View className="h-2 w-2 rounded-full" style={{ backgroundColor: ACCENT }} />
        <Text className="text-sm font-extrabold text-slate-800">{title}</Text>
      </View>
      {children}
    </View>
  );
}

async function pickAndUpload(productId: string, onPath: (path: string) => void) {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
  if (res.canceled || !res.assets?.length) return;
  const asset = res.assets[0];
  const path = await uploadProductImage(productId, { uri: asset.uri, name: asset.fileName ?? undefined, type: asset.mimeType ?? undefined });
  onPath(path);
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
        <View key={path} className="h-20 w-20 overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50/40">
          {urlMap[path] ? (
            <Image source={{ uri: urlMap[path] }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Package size={20} color="#A7F3D0" />
            </View>
          )}
          <Pressable onPress={() => onRemove(path)} className="absolute right-1 top-1 h-5 w-5 items-center justify-center rounded-full bg-black/60">
            <X size={11} color="#FFFFFF" />
          </Pressable>
        </View>
      ))}
      {images.length < max && (
        <Pressable onPress={onAdd} className="h-20 w-20 items-center justify-center gap-0.5 rounded-2xl border-2 border-dashed border-emerald-200">
          <Upload size={16} color="#10B981" />
          <Text className="text-[9px] font-bold text-emerald-600">{ar ? 'إضافة' : 'Add'}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

export function BoneGraftModal({ open, onClose, ar, product }: { open: boolean; onClose: () => void; ar: boolean; product?: Product | null }) {
  const upsert = useUpsertProduct();
  const { user } = useUserRole();
  const isEdit = !!product;
  const [draftId] = useState(() => product?.id ?? randomUUID());

  const [name, setName] = useState(product?.ar ?? '');
  const [manufacturer, setManufacturer] = useState(product?.brand ?? '');
  const [country, setCountry] = useState(product?.country ?? '');
  const [graftType, setGraftType] = useState(product?.boneGraft?.graftType ?? GRAFT_TYPES[0].ar);
  const [form, setForm] = useState(product?.boneGraft?.form ?? GRAFT_FORMS[0].ar);
  const [materialSource, setMaterialSource] = useState(product?.boneGraft?.materialSource ?? '');
  const [composition, setComposition] = useState(product?.boneGraft?.composition ?? '');
  const [particleSize, setParticleSize] = useState(product?.boneGraft?.particleSize ?? '');
  const [sterilizationMethod, setSterilizationMethod] = useState(product?.boneGraft?.sterilizationMethod ?? '');
  const [shelfLife, setShelfLife] = useState(product?.boneGraft?.shelfLife ?? '');
  const [features, setFeatures] = useState<string[]>(product?.boneGraft?.features ?? []);
  const [featureDraft, setFeatureDraft] = useState('');
  const [description, setDescription] = useState(product?.description ?? '');
  const [rows, setRows] = useState<PackRow[]>(() => {
    const pack = product?.boneGraft?.packSizes;
    if (pack && pack.length > 0) {
      return pack.map((p) => ({ key: randomUUID(), volume: p.volume, priceUsd: p.priceUsd ? String(p.priceUsd) : '', priceIqd: p.priceIqd ? String(p.priceIqd) : '', available: p.available }));
    }
    return [newRow()];
  });
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [clinicalImages, setClinicalImages] = useState<string[]>(product?.boneGraft?.clinicalImages ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const { data: urlMap = {} } = useSignedImageUrls(images);
  const { data: clinicalUrlMap = {} } = useSignedImageUrls(clinicalImages);

  const addFeature = () => {
    const v = featureDraft.trim();
    if (!v) return;
    setFeatures((prev) => [...prev, v]);
    setFeatureDraft('');
  };

  const updateRow = (key: string, patch: Partial<PackRow>) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const submit = async () => {
    setError('');
    if (!name.trim()) {
      setError(ar ? 'الرجاء إدخال اسم المنتج التجاري' : 'Please enter the commercial product name');
      return;
    }
    if (!manufacturer.trim()) {
      setError(ar ? 'الرجاء إدخال اسم الشركة المصنعة' : 'Please enter the manufacturer name');
      return;
    }
    setBusy(true);
    try {
      const packSizes = rows
        .filter((r) => r.volume.trim())
        .map((r) => ({ volume: r.volume.trim(), priceUsd: parseFloat(r.priceUsd) || 0, priceIqd: parseFloat(r.priceIqd) || 0, available: r.available }));
      const firstUsd = packSizes.find((p) => p.priceUsd > 0)?.priceUsd ?? 0;

      await upsert.mutateAsync({
        id: draftId,
        branch: 'bone_graft',
        ar: name.trim(),
        en: name.trim(),
        brand: manufacturer.trim(),
        price: firstUsd,
        currency: 'USD',
        stock: product?.stock ?? 1,
        inStock: (product?.stock ?? 1) > 0,
        images,
        category: 'implant',
        country: country || undefined,
        companyId: product?.companyId || user?.uid || '',
        description: description.trim() || undefined,
        boneGraft: {
          graftType,
          form,
          materialSource: materialSource.trim(),
          composition: composition.trim(),
          particleSize: particleSize.trim(),
          sterilizationMethod: sterilizationMethod.trim(),
          shelfLife: shelfLife.trim(),
          features,
          packSizes,
          clinicalImages: clinicalImages.length > 0 ? clinicalImages : undefined,
        },
      });
      toast.success(isEdit ? (ar ? 'تم تحديث البون كرافت بنجاح' : 'Bone graft updated') : ar ? 'تمت إضافة البون كرافت بنجاح' : 'Bone graft added');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const typeOptions = GRAFT_TYPES.map((t) => ({ value: t.ar, label: ar ? t.ar : t.en }));
  const formOptions = GRAFT_FORMS.map((f) => ({ value: f.ar, label: ar ? f.ar : f.en }));

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[93%] overflow-hidden rounded-t-[32px] bg-[#F4FBF8]">
          <View className="flex-row items-center justify-between px-4 pb-3 pt-4" style={{ backgroundColor: ACCENT }}>
            <View className="flex-row items-center gap-2.5">
              <View className="h-9 w-9 items-center justify-center rounded-2xl bg-white/20">
                <Bone size={18} color="#FFFFFF" />
              </View>
              <View>
                <Text className="text-base font-extrabold text-white">{isEdit ? (ar ? 'تعديل بون كرافت' : 'Edit Bone Graft') : ar ? 'إضافة بون كرافت' : 'Add Bone Graft'}</Text>
                <Text className="text-[11px] text-white/75">{ar ? 'مواد ترقيع العظم' : 'Bone regeneration material'}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <X size={16} color="#FFFFFF" />
            </Pressable>
          </View>

          <ScrollView className="px-4" contentContainerClassName="gap-3.5 py-4">
            <SectionCard title={ar ? 'المعلومات الأساسية' : 'Basic Info'}>
              <Field label={ar ? 'اسم المنتج التجاري' : 'Commercial name'}>
                <TextInput value={name} onChangeText={setName} placeholder={ar ? 'مثال: Bio-Oss' : 'e.g. Bio-Oss'} placeholderTextColor="#94A3B8" className={inputCls} style={{ writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left' }} />
              </Field>
              <Field label={ar ? 'الشركة المصنعة' : 'Manufacturer'}>
                <TextInput value={manufacturer} onChangeText={setManufacturer} placeholder={ar ? 'مثال: Geistlich' : 'e.g. Geistlich'} placeholderTextColor="#94A3B8" className={inputCls} style={{ writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left' }} />
              </Field>
              <Field label={ar ? 'بلد المنشأ' : 'Country of Origin'}>
                <CountrySelect value={country} onChange={setCountry} ar={ar} />
              </Field>
            </SectionCard>

            <SectionCard title={ar ? 'المواصفات الفنية' : 'Technical Specs'}>
              <View className="flex-row gap-2.5">
                <View className="flex-1">
                  <Field label={ar ? 'نوع المصدر' : 'Graft Type'}>
                    <Select value={graftType} onChange={setGraftType} options={typeOptions} />
                  </Field>
                </View>
                <View className="flex-1">
                  <Field label={ar ? 'الشكل الفيزيائي' : 'Form'}>
                    <Select value={form} onChange={setForm} options={formOptions} />
                  </Field>
                </View>
              </View>
              <Field label={ar ? 'مصدر المادة' : 'Material source'}>
                <TextInput value={materialSource} onChangeText={setMaterialSource} placeholderTextColor="#94A3B8" className={inputCls} style={{ writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left' }} />
              </Field>
              <Field label={ar ? 'التركيب المادي' : 'Composition'}>
                <TextInput value={composition} onChangeText={setComposition} placeholderTextColor="#94A3B8" className={inputCls} style={{ writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left' }} />
              </Field>
              <View className="flex-row gap-2.5">
                <View className="flex-1">
                  <Field label={ar ? 'حجم الحبيبات' : 'Particle size'}>
                    <TextInput value={particleSize} onChangeText={setParticleSize} placeholder="0.25 - 1 mm" placeholderTextColor="#94A3B8" className={inputCls} style={{ writingDirection: 'ltr', textAlign: 'left' }} />
                  </Field>
                </View>
                <View className="flex-1">
                  <Field label={ar ? 'طريقة التعقيم' : 'Sterilization'}>
                    <TextInput value={sterilizationMethod} onChangeText={setSterilizationMethod} placeholder={ar ? 'أشعة غاما' : 'Gamma'} placeholderTextColor="#94A3B8" className={inputCls} style={{ writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left' }} />
                  </Field>
                </View>
              </View>
              <Field label={ar ? 'مدة الصلاحية' : 'Shelf life'}>
                <TextInput value={shelfLife} onChangeText={setShelfLife} placeholder={ar ? 'مثال: 3 سنوات' : 'e.g. 3 years'} placeholderTextColor="#94A3B8" className={inputCls} style={{ writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left' }} />
              </Field>
            </SectionCard>

            <SectionCard title={ar ? 'المميزات والوصف' : 'Features & Description'}>
              <Field label={ar ? 'المميزات' : 'Features'}>
                <View className="flex-row gap-2">
                  <TextInput
                    value={featureDraft}
                    onChangeText={setFeatureDraft}
                    onSubmitEditing={addFeature}
                    placeholder={ar ? 'اكتب ميزة واضغط +' : 'Type a feature, tap +'}
                    placeholderTextColor="#94A3B8"
                    className={cn(inputCls, 'flex-1')}
                    style={{ writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left' }}
                  />
                  <Pressable onPress={addFeature} className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: ACCENT }}>
                    <Plus size={18} color="#FFFFFF" />
                  </Pressable>
                </View>
                {features.length > 0 && (
                  <View className="mt-2 flex-row flex-wrap gap-1.5">
                    {features.map((f, i) => (
                      <Pressable key={`${f}-${i}`} onPress={() => setFeatures((prev) => prev.filter((_, idx) => idx !== i))} className="flex-row items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5">
                        <Text className="text-[11px] font-bold text-emerald-700">{f}</Text>
                        <X size={10} color="#047857" />
                      </Pressable>
                    ))}
                  </View>
                )}
              </Field>
              <Field label={ar ? 'وصف عام' : 'General description'}>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#94A3B8"
                  className="min-h-[80px] rounded-2xl border border-emerald-100 bg-emerald-50/40 px-4 py-3 text-sm text-slate-800"
                  style={{ textAlignVertical: 'top', writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left' }}
                />
              </Field>
            </SectionCard>

            <SectionCard title={ar ? 'الأحجام والأسعار' : 'Pack Sizes & Pricing'}>
              {rows.map((r) => (
                <View key={r.key} className="gap-2 rounded-2xl bg-emerald-50/50 p-3">
                  <View className="flex-row items-center gap-2">
                    <TextInput
                      value={r.volume}
                      onChangeText={(v) => updateRow(r.key, { volume: v })}
                      placeholder={ar ? 'مثال: 0.5g' : 'e.g. 0.5g'}
                      placeholderTextColor="#94A3B8"
                      className="h-11 flex-1 rounded-xl border border-emerald-100 bg-white px-3 text-sm text-slate-800"
                      // The entered value itself is a measurement ("0.5g",
                      // "1cc") — force ltr regardless of UI language, same as
                      // age/phone/file# elsewhere, or Android's Arabic-RTL
                      // TextInput garbles the mixed Arabic+Latin bidi text.
                      style={{ writingDirection: 'ltr', textAlign: 'left' }}
                    />
                    <Pressable onPress={() => setRows((prev) => prev.filter((x) => x.key !== r.key))} className="h-9 w-9 items-center justify-center rounded-lg bg-rose-50">
                      <Trash2 size={14} color="#F43F5E" />
                    </Pressable>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <TextInput
                      value={r.priceUsd}
                      onChangeText={(v) => updateRow(r.key, { priceUsd: v.replace(/[^0-9.]/g, '') })}
                      keyboardType="decimal-pad"
                      placeholder="USD"
                      placeholderTextColor="#94A3B8"
                      className="h-10 flex-1 rounded-xl border border-emerald-100 bg-white px-3 text-sm text-slate-800"
                      style={{ writingDirection: 'ltr', textAlign: 'left' }}
                    />
                    <TextInput
                      value={r.priceIqd}
                      onChangeText={(v) => updateRow(r.key, { priceIqd: v.replace(/[^0-9.]/g, '') })}
                      keyboardType="decimal-pad"
                      placeholder="IQD"
                      placeholderTextColor="#94A3B8"
                      className="h-10 flex-1 rounded-xl border border-emerald-100 bg-white px-3 text-sm text-slate-800"
                      style={{ writingDirection: 'ltr', textAlign: 'left' }}
                    />
                    <Pressable
                      onPress={() => updateRow(r.key, { available: !r.available })}
                      className={cn('h-10 flex-row items-center gap-1 rounded-xl px-2.5', r.available ? 'bg-emerald-100' : 'bg-slate-100')}
                    >
                      <Check size={13} color={r.available ? '#047857' : '#94A3B8'} />
                      <Text className={cn('text-[10px] font-bold', r.available ? 'text-emerald-700' : 'text-slate-500')}>{r.available ? (ar ? 'متوفر' : 'Avail.') : ar ? 'نفد' : 'Out'}</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
              <Pressable onPress={() => setRows((prev) => [...prev, newRow()])} className="h-11 flex-row items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-emerald-200">
                <Plus size={15} color={ACCENT} />
                <Text className="text-sm font-bold" style={{ color: ACCENT }}>{ar ? 'إضافة حجم' : 'Add size'}</Text>
              </Pressable>
            </SectionCard>

            <SectionCard title={ar ? 'صور المنتج' : 'Product Images'}>
              <ImageStrip
                ar={ar}
                images={images}
                urlMap={urlMap}
                max={MAX_PRODUCT_IMAGES}
                onAdd={() => pickAndUpload(draftId, (p) => setImages((prev) => [...prev, p]))}
                onRemove={async (path) => {
                  setImages((prev) => prev.filter((p) => p !== path));
                  try { await removeProductImage(path); } catch { /* already removed */ }
                }}
              />
            </SectionCard>

            <SectionCard title={ar ? 'صور حالات العمل' : 'Clinical Cases'}>
              <ImageStrip
                ar={ar}
                images={clinicalImages}
                urlMap={clinicalUrlMap}
                max={MAX_CLINICAL_IMAGES}
                onAdd={() => pickAndUpload(draftId, (p) => setClinicalImages((prev) => [...prev, p]))}
                onRemove={async (path) => {
                  setClinicalImages((prev) => prev.filter((p) => p !== path));
                  try { await removeProductImage(path); } catch { /* already removed */ }
                }}
              />
            </SectionCard>

            {!!error && <Text className="rounded-2xl bg-rose-50 px-3 py-2.5 text-center text-xs font-semibold text-rose-600">{error}</Text>}

            <Pressable onPress={submit} disabled={busy} className="h-14 items-center justify-center rounded-2xl" style={{ backgroundColor: ACCENT, opacity: busy ? 0.6 : 1 }}>
              <Text className="text-sm font-extrabold text-white">{busy ? (ar ? 'جارٍ الحفظ...' : 'Saving...') : isEdit ? (ar ? 'حفظ التعديلات' : 'Save changes') : ar ? 'حفظ البون كرافت' : 'Save Bone Graft'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
