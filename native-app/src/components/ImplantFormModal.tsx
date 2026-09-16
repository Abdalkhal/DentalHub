import { useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { doc, updateDoc } from 'firebase/firestore';
import { Check, Package, Paperclip, Plus, Ruler, Settings, Trash2, Wrench, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { Select, Text } from '@/components/ui';
import { CountrySelect } from '@/components/CountrySelect';
import { countryCodeToFlag } from '@/data/countries';
import { db } from '@/integrations/firebase/client';
import {
  uploadProductImage,
  removeProductImage,
  useProducts,
  useSignedImageUrls,
  useUpsertProduct,
  productsQueryKey,
  MAX_PRODUCT_IMAGES,
  type Currency,
  type Product,
  type ProductAccessory,
} from '@/lib/products';
import { useUserRole } from '@/lib/useAuth';
import { randomUUID } from '@/lib/randomId';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

const ACCENT = '#0284C7';
const inputCls = 'h-12 rounded-2xl border border-sky-100 bg-sky-50/40 px-4 text-sm text-slate-800';

const SURGICAL_GUIDE_TOOLS = [
  { ar: 'طقم الدليل الجراحي', en: 'Surgical guide kit' },
  { ar: 'طقم الحفر الموجّه', en: 'Guided drill kit' },
  { ar: 'جلبات التوجيه', en: 'Guided sleeves' },
  { ar: 'أدوات الجراحة الموجّهة', en: 'Guided Surgical Tools' },
];

export const ACCESSORY_CATEGORIES: { id: string; ar: string; en: string; subTypes: { ar: string; en: string }[] }[] = [
  {
    id: 'abutment',
    ar: 'الأبوتمنت',
    en: 'Abutment',
    subTypes: [
      { ar: 'أبوتمنت مستقيم', en: 'Straight Abutment' },
      { ar: 'أبوتمنت زاوي 15°', en: 'Angled Abutment 15°' },
      { ar: 'أبوتمنت زاوي 17°', en: 'Angled Abutment 17°' },
      { ar: 'أبوتمنت زاوي 25°', en: 'Angled Abutment 25°' },
      { ar: 'أبوتمنت زاوي 30°', en: 'Angled Abutment 30°' },
      { ar: 'مالتي يونيت مستقيم', en: 'Multi-Unit Straight' },
      { ar: 'مالتي يونيت زاوي 17°', en: 'Multi-Unit Angled 17°' },
      { ar: 'مالتي يونيت زاوي 30°', en: 'Multi-Unit Angled 30°' },
      { ar: 'بول أبوتمنت / لوكايتر', en: 'Ball Abutment & Locator Attachment' },
      { ar: 'قاعدة تيتانيوم للرقمي (Ti-Base)', en: 'Ti-Base Abutment for CAD/CAM' },
      { ar: 'أبوتمنت مؤقت (PEEK / تيتانيوم)', en: 'PEEK & Titanium Temporary Abutments' },
      { ar: 'دعامة قابلة للصب (UCLA)', en: 'UCLA Castable Abutment' },
      { ar: 'أبوتمنت زركونيا', en: 'Zirconia Abutment' },
      { ar: 'أبوتمنت التئام تشريحي', en: 'Anatomic Healing Abutment' },
    ],
  },
  {
    id: 'healing-cover',
    ar: 'براغي الالتئام والتغطية',
    en: 'Healing & Cover Screws',
    subTypes: [
      { ar: 'برغي التئام GH 1mm - GH 7mm', en: 'Healing Abutment GH 1mm to GH 7mm' },
      { ar: 'برغي التئام عريض Ø 4.5mm', en: 'Wide Healing Abutment Ø 4.5mm' },
      { ar: 'برغي التئام عريض Ø 6.0mm', en: 'Wide Healing Abutment Ø 6.0mm' },
      { ar: 'برغي تغطية جراحي قياسي', en: 'Surgical Cover Screw Standard' },
      { ar: 'برغي تغطية جراحي ممتد +0.5mm', en: 'Surgical Cover Screw Extended +0.5mm' },
    ],
  },
  {
    id: 'digital',
    ar: 'أدوات المسح الرقمي والطبعات',
    en: 'Digital & Impression Tools',
    subTypes: [
      { ar: 'سكان بدي فموي', en: 'Intraoral Scan Body' },
      { ar: 'سكان بدي مخباري', en: 'Desktop Lab Scan Body' },
      { ar: 'سكان بدي مالتي يونيت', en: 'Multi-Unit Scan Body' },
      { ar: 'أنالوج رقمي للطباعة ثلاثية الأبعاد', en: 'Digital Model Analog for 3D Print' },
      { ar: 'كوبنغ طبعة مفتوحة', en: 'Open Tray Impression Coping' },
      { ar: 'كوبنغ طبعة مغلقة', en: 'Closed Tray Impression Coping' },
      { ar: 'أنالوج مخبري تقليدي', en: 'Traditional Plaster Lab Analog' },
      { ar: 'أنالوج مخبري مالتي يونيت', en: 'Multi-Unit Lab Analog' },
      { ar: 'مسمار مسح رقمي', en: 'Scan Post' },
    ],
  },
  {
    id: 'screws',
    ar: 'البراغي والأجزاء الميكانيكية',
    en: 'Screws & Mechanical Components',
    subTypes: [
      { ar: 'برغي الأبوتمنت السريري النهائي', en: 'Final Clinical Abutment Screw' },
      { ar: 'برغي تجربة مخبري', en: 'Laboratory Try-in Screw' },
      { ar: 'برغي تعويضي مالتي يونيت', en: 'Multi-Unit Prosthetic Screw' },
      { ar: 'كوبنغ حرق بلاستيكي', en: 'Burn-out Plastic Coping' },
      { ar: 'ناقل زراعة', en: 'Implant Carrier / Transfer Coping' },
    ],
  },
  {
    id: 'surgical-tools',
    ar: 'الأدوات الجراحية والمخبرية',
    en: 'Surgical & Lab Tools',
    subTypes: [
      { ar: 'مفك براغي قصير', en: 'Torque Wrench Driver Short' },
      { ar: 'مفك براغي طويل', en: 'Torque Wrench Driver Long' },
      { ar: 'موسّع مثقب', en: 'Drill Extender' },
      { ar: 'أداة استخراج المونتر', en: 'Mounter Extractor Tool' },
      { ar: 'أداة استرجاع البراغي', en: 'Screw Retrieval Tool' },
    ],
  },
];

const KIT_TYPES = ['Guided Surgical Kit', 'Standard Surgical Kit', 'Prosthetic Kit'];
const PLACEMENT_TYPES_AR = ['فورية (Immediate Placement)', 'غير فورية / تقليدية (Conventional)', 'كلاهما (Both)'];

type VariantRow = { key: string; diameter: string; length: string; stock: string };
const emptyVariant = (): VariantRow => ({ key: randomUUID(), diameter: '', length: '', stock: '0' });

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <View>
      <Text className="mb-1.5 text-[11px] font-bold text-slate-500">
        {label}
        {required && <Text className="text-rose-500"> *</Text>}
      </Text>
      {children}
    </View>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3 rounded-3xl border border-sky-100 bg-white p-4" style={{ shadowColor: ACCENT, shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 }}>
      <View className="flex-row items-center gap-2">
        <View className="h-2 w-2 rounded-full" style={{ backgroundColor: ACCENT }} />
        <Text className="text-sm font-extrabold text-slate-800">{title}</Text>
      </View>
      {children}
    </View>
  );
}

type ProductType = 'main_implant' | 'accessory' | 'surgical_kit';

export function ImplantFormModal({ open, onClose, ar, product }: { open: boolean; onClose: () => void; ar: boolean; product?: Product | null }) {
  const upsert = useUpsertProduct();
  const { user } = useUserRole();
  const { data: allProducts = [] } = useProducts();
  const queryClient = useQueryClient();
  const isEdit = !!product;
  const [draftId] = useState(() => product?.id ?? randomUUID());

  const [productType, setProductType] = useState<ProductType>(
    product?.productType === 'accessory' ? 'accessory' : product?.branch === 'surgical_kit' ? 'surgical_kit' : 'main_implant',
  );

  // Main implant fields
  const [name, setName] = useState(product?.ar ?? '');
  const [brand, setBrand] = useState(product?.brand ?? '');
  const [country, setCountry] = useState(product?.country || product?.implantSpec?.country || 'KR');
  const [implantCategory, setImplantCategory] = useState<'comprehensive' | 'basal' | 'non_immediate'>(
    product?.implantSpec?.implantType === 'non-immediate' ? 'non_immediate' : product?.implantSpec?.subType === 'basal' ? 'basal' : 'comprehensive',
  );
  const [line, setLine] = useState(product?.implantSpec?.connectionType ?? product?.surgicalKit?.productLine ?? '');
  const [variants, setVariants] = useState<VariantRow[]>(() => {
    const src = (product?.implantSpec?.variants ?? product?.implantSpec?.dimensionStocks ?? []).map((v) => ({
      diameter: Number(v.diameter) || 0,
      length: Number(v.length) || 0,
      stock: Number((v as { stock?: number }).stock ?? (v as { quantity?: number }).quantity ?? 0),
    }));
    return src.length > 0
      ? src.map((v) => ({ key: randomUUID(), diameter: v.diameter ? String(v.diameter) : '', length: v.length ? String(v.length) : '', stock: String(v.stock) }))
      : [emptyVariant()];
  });
  const [surgicalGuide, setSurgicalGuide] = useState<'Guided' | 'Unguided'>(product?.surgicalGuide === 'Guided' ? 'Guided' : 'Unguided');
  const [surgicalGuideTools, setSurgicalGuideTools] = useState<string[]>(product?.surgicalGuideTools ?? []);
  const [price, setPrice] = useState(product?.price ? String(product.price) : '');
  const [currency, setCurrency] = useState<Currency>(product?.currency || 'USD');
  const [description, setDescription] = useState(product?.description ?? '');
  const [images, setImages] = useState<string[]>(product?.images ?? []);

  // Accessory fields
  const [accessoryCategory, setAccessoryCategory] = useState('');
  const [accessorySubType, setAccessorySubType] = useState('');
  const [parentId, setParentId] = useState(product?.parentId || '');

  // Surgical kit fields
  const [kitType, setKitType] = useState(product?.surgicalKit?.kitType ?? KIT_TYPES[0]);
  const [placementType, setPlacementType] = useState(product?.surgicalKit?.placementType ?? PLACEMENT_TYPES_AR[0]);
  const [compatibility, setCompatibility] = useState<string[]>(product?.surgicalKit?.compatibility ?? []);
  const [compatDraft, setCompatDraft] = useState('');
  const [toolsCount, setToolsCount] = useState(product?.surgicalKit?.toolsCount ? String(product.surgicalKit.toolsCount) : '');
  const [kitSku, setKitSku] = useState(product?.sku ?? '');
  const [kitInStock, setKitInStock] = useState(product?.inStock ?? true);

  const [accessoriesList, setAccessoriesList] = useState<ProductAccessory[]>(product?.accessories ?? []);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Android, in an RTL app, resets a plain LTR TextInput's cursor to the
  // start after each keystroke — backspace then removes the first digit
  // instead of the last. Pinning the selection to the end ourselves after
  // every change bypasses that.
  const [priceSelection, setPriceSelection] = useState<{ start: number; end: number } | undefined>(undefined);
  const onChangePrice = (v: string) => {
    const clean = v.replace(/[^0-9.]/g, '');
    setPrice(clean);
    setPriceSelection({ start: clean.length, end: clean.length });
  };

  const { data: urlMap = {} } = useSignedImageUrls(images);
  const accessoryImagePaths = useMemo(
    () => accessoriesList.filter((a) => a.imageUrl).map((a) => a.imageUrl),
    [accessoriesList],
  );
  const { data: accessoryUrlMap = {} } = useSignedImageUrls(accessoryImagePaths);

  const removeAccessory = async (index: number) => {
    if (!product) return;
    const next = accessoriesList.filter((_, i) => i !== index);
    setAccessoriesList(next);
    await updateDoc(doc(db, 'products', product.id), { accessories: next });
    queryClient.invalidateQueries({ queryKey: productsQueryKey });
  };

  const mainImplantOptions = useMemo(
    () => allProducts.filter((p) => (!p.productType || p.productType === 'main_implant') && p.category === 'implant' && p.id !== product?.id),
    [allProducts, product?.id],
  );

  const updateVariant = (key: string, field: 'diameter' | 'length' | 'stock', value: string) =>
    setVariants((prev) => prev.map((v) => (v.key === key ? { ...v, [field]: value } : v)));

  const toggleSurgicalTool = (tool: string) =>
    setSurgicalGuideTools((prev) => (prev.includes(tool) ? prev.filter((x) => x !== tool) : [...prev, tool]));

  const addCompat = () => {
    const v = compatDraft.trim();
    if (!v) return;
    setCompatibility((prev) => [...prev, v]);
    setCompatDraft('');
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    const path = await uploadProductImage(draftId, { uri: asset.uri, name: asset.fileName ?? undefined, type: asset.mimeType ?? undefined });
    setImages((prev) => [...prev, path]);
  };

  const submit = async () => {
    setError('');
    if (!name.trim()) {
      setError(ar ? 'الرجاء إدخال اسم المنتج' : 'Please enter the product name');
      return;
    }
    if (productType !== 'accessory' && !brand.trim()) {
      setError(ar ? 'الرجاء إدخال اسم الشركة' : 'Please enter the manufacturer name');
      return;
    }

    setBusy(true);
    try {
      if (productType === 'accessory') {
        const parent = mainImplantOptions.find((p) => p.id === parentId);
        if (!parentId || !parent) {
          setError(ar ? 'الرجاء اختيار الزرعة الأساسية' : 'Please select the main implant');
          setBusy(false);
          return;
        }
        let imageUrl = '';
        if (images.length > 0) imageUrl = images[0];
        const newAccessory: ProductAccessory = {
          type: ACCESSORY_CATEGORIES.find((c) => c.id === accessoryCategory)?.en ?? accessoryCategory,
          name: name.trim(),
          specs: '',
          price: 0,
          imageUrl,
          currency: 'USD',
        };
        await updateDoc(doc(db, 'products', parentId), { accessories: [...(parent.accessories ?? []), newAccessory] });
        queryClient.invalidateQueries({ queryKey: productsQueryKey });
      } else if (productType === 'surgical_kit') {
        await upsert.mutateAsync({
          id: draftId,
          branch: 'surgical_kit',
          ar: name.trim(),
          en: name.trim(),
          brand: brand.trim(),
          price: Math.max(0, parseFloat(price) || 0),
          purchasePrice: undefined,
          currency,
          stock: kitInStock ? 1 : 0,
          inStock: kitInStock,
          images,
          category: 'surgical_kit',
          country,
          companyId: product?.companyId || user?.uid || '',
          sku: kitSku.trim() || undefined,
          surgicalKit: {
            productLine: line.trim() || undefined,
            kitType,
            placementType,
            compatibility: compatibility.length > 0 ? compatibility : undefined,
            toolsCount: toolsCount ? Number(toolsCount) : undefined,
          },
        });
      } else {
        const variantsArr = variants
          .map((v) => ({ diameter: Number(v.diameter), length: Number(v.length), stock: Math.max(0, parseInt(v.stock || '0', 10) || 0) }))
          .filter((v) => !isNaN(v.diameter) && v.diameter > 0 && !isNaN(v.length) && v.length > 0);
        const totalStock = variantsArr.reduce((sum, v) => sum + v.stock, 0);
        const uniqueDiameters = [...new Set(variantsArr.map((v) => v.diameter))];
        const uniqueLengths = [...new Set(variantsArr.map((v) => v.length))];

        await upsert.mutateAsync({
          id: draftId,
          branch: 'implant',
          ar: name.trim(),
          en: name.trim(),
          brand: brand.trim(),
          price: Math.max(0, parseFloat(price) || 0),
          currency,
          stock: totalStock,
          inStock: totalStock > 0,
          images,
          category: 'implant',
          country,
          countryFlag: countryCodeToFlag(country),
          companyId: product?.companyId || user?.uid || '',
          implantSpec: {
            country,
            implantType: implantCategory === 'non_immediate' ? 'non-immediate' : 'immediate',
            subType: implantCategory === 'basal' ? 'basal' : undefined,
            connectionType: line.trim() || undefined,
            diameters: uniqueDiameters.length > 0 ? uniqueDiameters : undefined,
            lengths: uniqueLengths.length > 0 ? uniqueLengths : undefined,
            variants: variantsArr.length > 0 ? variantsArr : undefined,
          },
          productType: 'main_implant',
          parentId: null,
          description: description.trim() || undefined,
          surgicalGuide,
          surgicalGuideTools: surgicalGuide === 'Guided' && surgicalGuideTools.length > 0 ? surgicalGuideTools : undefined,
        });
      }
      toast.success(isEdit ? (ar ? 'تم التحديث بنجاح' : 'Updated successfully') : ar ? 'تمت الإضافة بنجاح' : 'Added successfully');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const categoryOptions = [
    { value: 'comprehensive', label: ar ? 'فورية (Compressive)' : 'Immediate (Compressive)' },
    { value: 'basal', label: ar ? 'فورية (Basal)' : 'Immediate (Basal)' },
    { value: 'non_immediate', label: ar ? 'غير فورية' : 'Non-Immediate' },
  ];
  const kitTypeOptions = KIT_TYPES.map((k) => ({ value: k, label: k }));
  const placementOptions = PLACEMENT_TYPES_AR.map((p) => ({ value: p, label: p }));
  const accessoryCategoryOptions = [
    { value: '', label: ar ? '-- اختر الفئة --' : '-- Select category --' },
    ...ACCESSORY_CATEGORIES.map((c) => ({ value: c.id, label: ar ? c.ar : c.en })),
  ];
  const accessorySubTypeOptions = [
    { value: '', label: ar ? '-- اختر النوع --' : '-- Select sub-type --' },
    ...(ACCESSORY_CATEGORIES.find((c) => c.id === accessoryCategory)?.subTypes ?? []).map((st) => ({
      value: ar ? st.ar : st.en,
      label: ar ? st.ar : st.en,
    })),
  ];
  const parentOptions = [
    { value: '', label: ar ? '-- اختر الزرعة الأساسية --' : '-- Select main implant --' },
    ...mainImplantOptions.map((p) => ({ value: p.id, label: `${p.ar || p.en} (${p.brand})` })),
  ];

  const TYPE_TABS: { key: ProductType; ar: string; en: string; icon: typeof Settings }[] = [
    { key: 'main_implant', ar: 'زرعة', en: 'Implant', icon: Settings },
    { key: 'accessory', ar: 'إكسسوار', en: 'Accessory', icon: Paperclip },
    { key: 'surgical_kit', ar: 'كت جراحي', en: 'Surgical Kit', icon: Wrench },
  ];

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[93%] overflow-hidden rounded-t-[32px] bg-[#F2F9FE]">
          <View className="flex-row items-center justify-between px-4 pb-3 pt-4" style={{ backgroundColor: ACCENT }}>
            <View className="flex-row items-center gap-2.5">
              <View className="h-9 w-9 items-center justify-center rounded-2xl bg-white/20">
                <Settings size={18} color="#FFFFFF" />
              </View>
              <View>
                <Text className="text-base font-extrabold text-white">{isEdit ? (ar ? 'تعديل زرعة' : 'Edit Implant') : ar ? 'إضافة زرعة جديدة' : 'Add New Implant'}</Text>
                <Text className="text-[11px] text-white/75">{ar ? 'أضف زرعة وإكسسواراتها بسهولة' : 'Add implant and its accessories easily'}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <X size={16} color="#FFFFFF" />
            </Pressable>
          </View>

          {!isEdit && (
            <View className="px-4 pt-3">
              <View className="flex-row gap-1 rounded-2xl bg-sky-50 p-1">
                {TYPE_TABS.map((t) => {
                  const active = productType === t.key;
                  return (
                    <Pressable
                      key={t.key}
                      onPress={() => setProductType(t.key)}
                      className={cn('h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl', active ? '' : 'bg-transparent')}
                      style={active ? { backgroundColor: ACCENT } : undefined}
                    >
                      <t.icon size={14} color={active ? '#FFFFFF' : '#64748B'} />
                      <Text className={cn('text-xs font-bold', active ? 'text-white' : 'text-slate-500')}>{ar ? t.ar : t.en}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          <ScrollView className="px-4" contentContainerClassName="gap-3.5 py-4">
            {productType === 'accessory' ? (
              <>
                <SectionCard title={ar ? 'معلومات الإكسسوار' : 'Accessory Info'}>
                  <Field label={ar ? 'اسم الإكسسوار الرئيسي' : 'Main accessory category'} required>
                    <Select
                      value={accessoryCategory}
                      onChange={(v) => {
                        setAccessoryCategory(v);
                        setAccessorySubType('');
                        setName('');
                      }}
                      options={accessoryCategoryOptions}
                    />
                  </Field>
                  <Field label={ar ? 'نوع وشكل الإكسسوار التفصيلي' : 'Detailed sub-type'} required>
                    <Select
                      value={accessorySubType}
                      onChange={(v) => {
                        setAccessorySubType(v);
                        setName(v);
                      }}
                      options={accessorySubTypeOptions}
                    />
                  </Field>
                  <Field label={ar ? 'ربط مع زرعة أساسية' : 'Link to main implant'}>
                    <Select value={parentId} onChange={setParentId} options={parentOptions} />
                  </Field>
                </SectionCard>

                <SectionCard title={ar ? 'صورة المنتج' : 'Product Image'}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerClassName="gap-2.5">
                    {images.map((path) => (
                      <View key={path} className="h-20 w-20 overflow-hidden rounded-2xl border border-sky-100 bg-sky-50/40">
                        {urlMap[path] ? (
                          <Image source={{ uri: urlMap[path] }} className="h-full w-full" resizeMode="cover" />
                        ) : (
                          <View className="h-full w-full items-center justify-center">
                            <Package size={20} color="#BAE6FD" />
                          </View>
                        )}
                        <Pressable onPress={() => setImages((prev) => prev.filter((p) => p !== path))} className="absolute right-1 top-1 h-5 w-5 items-center justify-center rounded-full bg-black/60">
                          <X size={11} color="#FFFFFF" />
                        </Pressable>
                      </View>
                    ))}
                    {images.length < MAX_PRODUCT_IMAGES && (
                      <Pressable onPress={pickImage} className="h-20 w-20 items-center justify-center gap-0.5 rounded-2xl border-2 border-dashed border-sky-200">
                        <Plus size={18} color={ACCENT} />
                        <Text className="text-[9px] font-bold" style={{ color: ACCENT }}>{ar ? 'إضافة' : 'Add'}</Text>
                      </Pressable>
                    )}
                  </ScrollView>
                </SectionCard>
              </>
            ) : productType === 'surgical_kit' ? (
              <>
                <SectionCard title={ar ? 'معلومات المنتج' : 'Product Info'}>
                  <Field label={ar ? 'اسم المنتج' : 'Product name'} required>
                    <TextInput value={name} onChangeText={setName} placeholder={ar ? 'مثال: Surgical Kit – Guided' : 'e.g. Surgical Kit – Guided'} placeholderTextColor="#94A3B8" className={inputCls} style={{ writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left' }} />
                  </Field>
                  <Field label={ar ? 'الشركة المصنعة' : 'Manufacturer'} required>
                    <TextInput value={brand} onChangeText={setBrand} placeholder={ar ? 'اكتب اسم الشركة' : 'Type manufacturer'} placeholderTextColor="#94A3B8" className={inputCls} style={{ writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left' }} />
                  </Field>
                  <View className="flex-row gap-2.5">
                    <View className="flex-1">
                      <Field label={ar ? 'بلد المنشأ' : 'Country of origin'}>
                        <CountrySelect value={country} onChange={setCountry} ar={ar} />
                      </Field>
                    </View>
                    <View className="flex-1">
                      <Field label={ar ? 'خط المنتج' : 'Product line'}>
                        <TextInput value={line} onChangeText={setLine} placeholder={ar ? 'مثال: GuideSystem' : 'e.g. GuideSystem'} placeholderTextColor="#94A3B8" className={inputCls} style={{ writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left' }} />
                      </Field>
                    </View>
                  </View>
                </SectionCard>

                <SectionCard title={ar ? 'إعدادات الكت الجراحي' : 'Surgical Kit Configuration'}>
                  <Field label={ar ? 'نوع الكت' : 'Kit type'}>
                    <Select value={kitType} onChange={setKitType} options={kitTypeOptions} />
                  </Field>
                  <Field label={ar ? 'بروتوكول الزرع' : 'Implant placement protocol'}>
                    <Select value={placementType} onChange={setPlacementType} options={placementOptions} />
                  </Field>
                  <Field label={ar ? 'التوافق' : 'Compatibility'}>
                    <View className="flex-row gap-2">
                      <TextInput
                        value={compatDraft}
                        onChangeText={setCompatDraft}
                        onSubmitEditing={addCompat}
                        placeholder={ar ? 'اكتب قيمة واضغط +' : 'Type a value, tap +'}
                        placeholderTextColor="#94A3B8"
                        className={cn(inputCls, 'flex-1')}
                        style={{ writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left' }}
                      />
                      <Pressable onPress={addCompat} className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: ACCENT }}>
                        <Plus size={18} color="#FFFFFF" />
                      </Pressable>
                    </View>
                    {compatibility.length > 0 && (
                      <View className="mt-2 flex-row flex-wrap gap-1.5">
                        {compatibility.map((c, i) => (
                          <Pressable key={`${c}-${i}`} onPress={() => setCompatibility((prev) => prev.filter((_, idx) => idx !== i))} className="flex-row items-center gap-1 rounded-full bg-sky-100 px-3 py-1.5">
                            <Text className="text-[11px] font-bold text-sky-700">{c}</Text>
                            <X size={10} color="#0369A1" />
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </Field>
                  <Field label={ar ? 'عدد الأدوات' : 'Tools count'}>
                    <TextInput value={toolsCount} onChangeText={(v) => setToolsCount(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="0" placeholderTextColor="#94A3B8" className={inputCls} style={{ writingDirection: 'ltr', textAlign: 'left' }} />
                  </Field>
                </SectionCard>

                <SectionCard title={ar ? 'السعر والمخزون' : 'Price & Stock'}>
                  {/* No shadow at all — see the tab-bar note in supplies-office.tsx. */}
                  <View className="flex-row gap-2 self-end rounded-xl bg-sky-50 p-1">
                    <Pressable onPress={() => setCurrency('USD')} className="h-8 items-center justify-center rounded-lg px-3" style={currency === 'USD' ? { backgroundColor: ACCENT } : undefined}>
                      <Text className={cn('text-xs font-bold', currency === 'USD' ? 'text-white' : 'text-slate-500')}>$</Text>
                    </Pressable>
                    <Pressable onPress={() => setCurrency('IQD')} className="h-8 items-center justify-center rounded-lg px-3" style={currency === 'IQD' ? { backgroundColor: ACCENT } : undefined}>
                      <Text className={cn('text-xs font-bold', currency === 'IQD' ? 'text-white' : 'text-slate-500')}>{ar ? 'د.ع' : 'IQD'}</Text>
                    </Pressable>
                  </View>
                  <Field label={ar ? 'سعر البيع' : 'Selling price'} required>
                    <TextInput
                      value={price}
                      onChangeText={onChangePrice}
                      selection={priceSelection}
                      onSelectionChange={(e) => setPriceSelection(e.nativeEvent.selection)}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="#94A3B8"
                      className={inputCls}
                      style={{ writingDirection: 'ltr', textAlign: 'left' }}
                    />
                  </Field>
                  <Field label={ar ? 'رمز SKU' : 'SKU / Code'}>
                    <TextInput value={kitSku} onChangeText={setKitSku} placeholder="KIT-001" placeholderTextColor="#94A3B8" className={inputCls} style={{ writingDirection: 'ltr', textAlign: 'left' }} />
                  </Field>
                  <Pressable onPress={() => setKitInStock((v) => !v)} className="flex-row items-center justify-between rounded-2xl border border-sky-100 bg-sky-50/40 px-4 py-3">
                    <View>
                      <Text className="text-sm font-semibold text-slate-800">{ar ? 'الحالة' : 'Availability'}</Text>
                      <Text className="text-[11px] text-slate-500">{kitInStock ? (ar ? 'متوفر' : 'In Stock') : ar ? 'غير متوفر' : 'Out of Stock'}</Text>
                    </View>
                    <View className={cn('h-8 w-14 justify-center rounded-full p-1', kitInStock ? 'bg-emerald-500' : 'bg-slate-300')}>
                      <View className={cn('h-6 w-6 rounded-full bg-white', kitInStock ? 'self-end' : 'self-start')} />
                    </View>
                  </Pressable>
                </SectionCard>

                <SectionCard title={ar ? 'صورة المنتج' : 'Product Image'}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerClassName="gap-2.5">
                    {images.map((path) => (
                      <View key={path} className="h-20 w-20 overflow-hidden rounded-2xl border border-sky-100 bg-sky-50/40">
                        {urlMap[path] ? (
                          <Image source={{ uri: urlMap[path] }} className="h-full w-full" resizeMode="cover" />
                        ) : (
                          <View className="h-full w-full items-center justify-center">
                            <Package size={20} color="#BAE6FD" />
                          </View>
                        )}
                        <Pressable onPress={() => setImages((prev) => prev.filter((p) => p !== path))} className="absolute right-1 top-1 h-5 w-5 items-center justify-center rounded-full bg-black/60">
                          <X size={11} color="#FFFFFF" />
                        </Pressable>
                      </View>
                    ))}
                    {images.length < MAX_PRODUCT_IMAGES && (
                      <Pressable onPress={pickImage} className="h-20 w-20 items-center justify-center gap-0.5 rounded-2xl border-2 border-dashed border-sky-200">
                        <Plus size={18} color={ACCENT} />
                        <Text className="text-[9px] font-bold" style={{ color: ACCENT }}>{ar ? 'إضافة' : 'Add'}</Text>
                      </Pressable>
                    )}
                  </ScrollView>
                </SectionCard>
              </>
            ) : (
              <>
                <SectionCard title={ar ? 'معلومات الزرعة' : 'Implant Info'}>
                  <Field label={ar ? 'اسم الزرعة' : 'Implant name'} required>
                    <TextInput value={name} onChangeText={setName} placeholder={ar ? 'مثال: Straumann BLX' : 'e.g. Straumann BLX'} placeholderTextColor="#94A3B8" className={inputCls} style={{ writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left' }} />
                  </Field>
                  <Field label={ar ? 'الشركة المصنعة' : 'Manufacturer'} required>
                    <TextInput value={brand} onChangeText={setBrand} placeholder={ar ? 'مثال: Straumann' : 'e.g. Straumann'} placeholderTextColor="#94A3B8" className={inputCls} style={{ writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left' }} />
                  </Field>
                  <View className="flex-row gap-2.5">
                    <View className="flex-1">
                      <Field label={ar ? 'بلد الصنع' : 'Country of manufacture'}>
                        <CountrySelect value={country} onChange={setCountry} ar={ar} allowEmpty={false} />
                      </Field>
                    </View>
                    <View className="flex-1">
                      <Field label={ar ? 'نوع الزرعة' : 'Implant type'}>
                        <Select value={implantCategory} onChange={(v) => setImplantCategory(v as typeof implantCategory)} options={categoryOptions} />
                      </Field>
                    </View>
                  </View>
                  <Field label={ar ? 'خط المنتج (اختياري)' : 'Product line (optional)'}>
                    <TextInput value={line} onChangeText={setLine} placeholder={ar ? 'مثال: BLX' : 'e.g. BLX'} placeholderTextColor="#94A3B8" className={inputCls} style={{ writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left' }} />
                  </Field>
                </SectionCard>

                <SectionCard title={ar ? 'صورة المنتج' : 'Product Image'}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerClassName="gap-2.5">
                    {images.map((path) => (
                      <View key={path} className="h-20 w-20 overflow-hidden rounded-2xl border border-sky-100 bg-sky-50/40">
                        {urlMap[path] ? (
                          <Image source={{ uri: urlMap[path] }} className="h-full w-full" resizeMode="cover" />
                        ) : (
                          <View className="h-full w-full items-center justify-center">
                            <Package size={20} color="#BAE6FD" />
                          </View>
                        )}
                        <Pressable
                          onPress={async () => {
                            setImages((prev) => prev.filter((p) => p !== path));
                            try { await removeProductImage(path); } catch { /* already removed */ }
                          }}
                          className="absolute right-1 top-1 h-5 w-5 items-center justify-center rounded-full bg-black/60"
                        >
                          <X size={11} color="#FFFFFF" />
                        </Pressable>
                      </View>
                    ))}
                    {images.length < MAX_PRODUCT_IMAGES && (
                      <Pressable onPress={pickImage} className="h-20 w-20 items-center justify-center gap-0.5 rounded-2xl border-2 border-dashed border-sky-200">
                        <Plus size={18} color={ACCENT} />
                        <Text className="text-[9px] font-bold" style={{ color: ACCENT }}>{ar ? 'إضافة' : 'Add'}</Text>
                      </Pressable>
                    )}
                  </ScrollView>
                </SectionCard>

                <SectionCard title={ar ? 'أطوال وأقطار الزرعة' : 'Implant Dimensions'}>
                  <View className="flex-row gap-2 px-0.5">
                    <Text className="flex-1 text-[10px] font-bold text-slate-400">{ar ? 'القطر (mm)' : 'Diameter (mm)'}</Text>
                    <Text className="flex-1 text-[10px] font-bold text-slate-400">{ar ? 'الطول (mm)' : 'Length (mm)'}</Text>
                    <Text className="flex-1 text-[10px] font-bold text-slate-400">{ar ? 'الكمية' : 'Qty'}</Text>
                    <View style={{ width: 36 }} />
                  </View>
                  {variants.map((v) => (
                    <View key={v.key} className="flex-row items-center gap-2">
                      <TextInput value={v.diameter} onChangeText={(t) => updateVariant(v.key, 'diameter', t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="3.3" placeholderTextColor="#94A3B8" className="h-11 flex-1 rounded-xl border border-sky-100 bg-white px-2.5 text-sm text-slate-800" style={{ writingDirection: 'ltr', textAlign: 'center' }} />
                      <TextInput value={v.length} onChangeText={(t) => updateVariant(v.key, 'length', t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="10" placeholderTextColor="#94A3B8" className="h-11 flex-1 rounded-xl border border-sky-100 bg-white px-2.5 text-sm text-slate-800" style={{ writingDirection: 'ltr', textAlign: 'center' }} />
                      <TextInput value={v.stock === '0' ? '' : v.stock} onChangeText={(t) => updateVariant(v.key, 'stock', t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="0" placeholderTextColor="#94A3B8" className="h-11 flex-1 rounded-xl border border-sky-100 bg-white px-2.5 text-sm text-slate-800" style={{ writingDirection: 'ltr', textAlign: 'center' }} />
                      <Pressable
                        onPress={() => setVariants((prev) => (prev.length > 1 ? prev.filter((x) => x.key !== v.key) : prev))}
                        disabled={variants.length <= 1}
                        style={{ width: 36 }}
                        className={cn('h-11 items-center justify-center rounded-xl', variants.length <= 1 ? 'bg-slate-50' : 'bg-rose-50')}
                      >
                        <Trash2 size={14} color={variants.length <= 1 ? '#CBD5E1' : '#F43F5E'} />
                      </Pressable>
                    </View>
                  ))}
                  <Pressable onPress={() => setVariants((prev) => [...prev, emptyVariant()])} className="h-11 flex-row items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-sky-200">
                    <Ruler size={14} color={ACCENT} />
                    <Text className="text-sm font-bold" style={{ color: ACCENT }}>{ar ? 'إضافة قياس جديد' : 'Add new size'}</Text>
                  </Pressable>
                </SectionCard>

                {isEdit && accessoriesList.length > 0 && (
                  <SectionCard title={ar ? 'الإكسسوارات المرتبطة' : 'Attached Accessories'}>
                    {accessoriesList.map((acc, i) => (
                      <View key={`${acc.name}-${i}`} className="flex-row items-center gap-2.5 rounded-2xl border border-sky-100 bg-white p-2.5">
                        <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-sky-50">
                          {acc.imageUrl && accessoryUrlMap[acc.imageUrl] ? (
                            <Image source={{ uri: accessoryUrlMap[acc.imageUrl] }} className="h-full w-full" resizeMode="cover" />
                          ) : (
                            <Package size={16} color="#BAE6FD" />
                          )}
                        </View>
                        <View className="min-w-0 flex-1">
                          <Text className="text-sm font-bold text-slate-800" numberOfLines={1}>{acc.name}</Text>
                          <Text className="text-[11px] text-slate-400" numberOfLines={1}>{acc.type}</Text>
                        </View>
                        <Pressable onPress={() => removeAccessory(i)} className="h-8 w-8 items-center justify-center rounded-lg bg-rose-50">
                          <Trash2 size={14} color="#F43F5E" />
                        </Pressable>
                      </View>
                    ))}
                    <Text className="text-[11px] text-slate-400">
                      {ar ? "لإضافة إكسسوار جديد: أغلق هذه الشاشة، اضغط + ثم اختر «إكسسوار» واربطه بهذه الزرعة." : 'To add a new accessory: close this screen, tap +, choose "Accessory" and link it to this implant.'}
                    </Text>
                  </SectionCard>
                )}

                <SectionCard title={ar ? 'نظام الدليل الجراحي' : 'Surgical Guide System'}>
                  <View className="flex-row gap-2">
                    {(['Guided', 'Unguided'] as const).map((mode) => {
                      const active = surgicalGuide === mode;
                      return (
                        <Pressable key={mode} onPress={() => setSurgicalGuide(mode)} className={cn('h-11 flex-1 items-center justify-center rounded-2xl', active ? '' : 'border border-sky-100 bg-white')} style={active ? { backgroundColor: ACCENT } : undefined}>
                          <Text className={cn('text-sm font-bold', active ? 'text-white' : 'text-slate-500')}>{mode === 'Guided' ? (ar ? 'موجّه' : 'Guided') : ar ? 'غير موجّه' : 'Unguided'}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {surgicalGuide === 'Guided' && (
                    <View className="flex-row flex-wrap gap-2">
                      {SURGICAL_GUIDE_TOOLS.map((tool) => {
                        const active = surgicalGuideTools.includes(tool.en);
                        return (
                          <Pressable key={tool.en} onPress={() => toggleSurgicalTool(tool.en)} className={cn('flex-row items-center gap-1.5 rounded-xl border px-3 py-2.5', active ? 'border-sky-300 bg-sky-50' : 'border-sky-100 bg-white')}>
                            <View className={cn('h-4 w-4 items-center justify-center rounded', active ? 'bg-sky-600' : 'border border-sky-200')}>
                              {active && <Check size={11} color="#FFFFFF" />}
                            </View>
                            <Text className={cn('text-xs font-semibold', active ? 'text-sky-700' : 'text-slate-600')}>{ar ? tool.ar : tool.en}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </SectionCard>

                <SectionCard title={ar ? 'السعر والوصف' : 'Price & Description'}>
                  {/* No shadow at all — see the tab-bar note in supplies-office.tsx. */}
                  <View className="flex-row gap-2 self-end rounded-xl bg-sky-50 p-1">
                    <Pressable onPress={() => setCurrency('USD')} className="h-8 items-center justify-center rounded-lg px-3" style={currency === 'USD' ? { backgroundColor: ACCENT } : undefined}>
                      <Text className={cn('text-xs font-bold', currency === 'USD' ? 'text-white' : 'text-slate-500')}>$</Text>
                    </Pressable>
                    <Pressable onPress={() => setCurrency('IQD')} className="h-8 items-center justify-center rounded-lg px-3" style={currency === 'IQD' ? { backgroundColor: ACCENT } : undefined}>
                      <Text className={cn('text-xs font-bold', currency === 'IQD' ? 'text-white' : 'text-slate-500')}>{ar ? 'د.ع' : 'IQD'}</Text>
                    </Pressable>
                  </View>
                  <Field label={ar ? 'السعر الأساسي' : 'Base price'} required>
                    <TextInput
                      value={price}
                      onChangeText={onChangePrice}
                      selection={priceSelection}
                      onSelectionChange={(e) => setPriceSelection(e.nativeEvent.selection)}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="#94A3B8"
                      className={inputCls}
                      style={{ writingDirection: 'ltr', textAlign: 'left' }}
                    />
                  </Field>
                  <Field label={ar ? 'الوصف (اختياري)' : 'Description (optional)'}>
                    <TextInput
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      numberOfLines={3}
                      placeholder={ar ? 'المميزات، الاستخدامات...' : 'Features, uses...'}
                      placeholderTextColor="#94A3B8"
                      className="min-h-[80px] rounded-2xl border border-sky-100 bg-sky-50/40 px-4 py-3 text-sm text-slate-800"
                      style={{ textAlignVertical: 'top', writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left' }}
                    />
                  </Field>
                </SectionCard>
              </>
            )}

            {!!error && <Text className="rounded-2xl bg-rose-50 px-3 py-2.5 text-center text-xs font-semibold text-rose-600">{error}</Text>}

            <Pressable onPress={submit} disabled={busy} className="h-14 items-center justify-center rounded-2xl" style={{ backgroundColor: ACCENT, opacity: busy ? 0.6 : 1 }}>
              <Text className="text-sm font-extrabold text-white">{busy ? (ar ? 'جارٍ الحفظ...' : 'Saving...') : isEdit ? (ar ? 'حفظ التعديلات' : 'Save changes') : ar ? 'حفظ المنتج' : 'Save Product'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
