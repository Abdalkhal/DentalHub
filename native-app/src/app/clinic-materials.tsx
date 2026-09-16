import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { AlertTriangle, Boxes, Minus, Plus, Trash2, Truck, X } from 'lucide-react-native';

import { Screen, Select, Text } from '@/components/ui';
import {
  addMaterial,
  addOrder,
  removeMaterial,
  setClinicStoreUser,
  updateMaterialQty,
  useClinic,
  type Material,
} from '@/lib/clinicStore';
import { useUserRole } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const CATS = [
  { id: 'consumables', ar: 'مستهلكات', en: 'Consumables' },
  { id: 'composite', ar: 'كمبوزيت', en: 'Composite' },
  { id: 'anesthesia', ar: 'مخدر موضعي', en: 'Anesthesia' },
  { id: 'impression', ar: 'مواد طبعة', en: 'Impression' },
  { id: 'other', ar: 'أخرى', en: 'Other' },
];

const UNITS = ['قطعة', 'علبة', 'باكيت', 'سرنجة', 'تيوب', 'أمبول'];

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'warn' }) {
  return (
    <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-3">
      <Text className="text-[11px] text-slate-500">{label}</Text>
      <Text className={cn('mt-0.5 text-lg font-extrabold', tone === 'warn' ? 'text-amber-600' : 'text-slate-800')}>
        {value}
      </Text>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text className="mb-1.5 text-[11px] font-bold text-slate-500">{label}</Text>
      {children}
    </View>
  );
}

const rtlStyle = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const ltrStyle = { writingDirection: 'ltr' as const, textAlign: 'left' as const };

export default function ClinicMaterialsScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useUserRole();

  useEffect(() => {
    if (user?.uid) setClinicStoreUser(user.uid);
  }, [user?.uid]);

  const { materials } = useClinic();
  const [cat, setCat] = useState('all');
  const [open, setOpen] = useState(false);

  const list = materials.filter((m) => cat === 'all' || m.category === cat);
  const lowItems = materials.filter((m) => m.qty <= m.minQty);
  const low = lowItems.length;

  const reorderQty = (m: Material) => Math.max(1, m.minQty * 2 - m.qty);

  const reorder = (m: Material) => {
    const q = reorderQty(m);
    addOrder({
      kind: 'supply',
      vendor: ar ? 'مكتب مستلزمات' : 'Supply office',
      title: ar ? `إعادة تزويد: ${m.name} (${q} ${m.unit})` : `Restock: ${m.name} (${q} ${m.unit})`,
      amount: Math.round(q * m.price),
      status: 'pending',
    });
    router.push('/clinic-orders');
  };

  const reorderAll = () => {
    lowItems.forEach((m) => {
      const q = reorderQty(m);
      addOrder({
        kind: 'supply',
        vendor: ar ? 'مكتب مستلزمات' : 'Supply office',
        title: ar ? `إعادة تزويد: ${m.name} (${q} ${m.unit})` : `Restock: ${m.name} (${q} ${m.unit})`,
        amount: Math.round(q * m.price),
        status: 'pending',
      });
    });
    router.push('/clinic-orders');
  };

  const catOptions = [{ id: 'all', ar: 'الكل', en: 'All' }, ...CATS];

  return (
    <Screen>
      <View className="flex-row gap-2.5">
        <Stat label={ar ? 'أصناف المخزون' : 'Items'} value={String(materials.length)} />
        <Stat label={ar ? 'قاربت على النفاد' : 'Low stock'} value={String(low)} tone="warn" />
      </View>

      {low > 0 && (
        <View className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
          <View className="flex-row items-start gap-2.5">
            <View className="h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100">
              <AlertTriangle size={16} color="#B45309" strokeWidth={2.4} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-extrabold text-amber-800">
                {ar ? `تنبيه نقص مخزون (${low})` : `Low stock alert (${low})`}
              </Text>
              <Text className="mt-0.5 text-[11px] text-amber-700/80">
                {ar ? 'هذه المواد وصلت للحد الأدنى — اطلب إعادة التزويد الآن' : 'These items hit their minimum — request a restock now'}
              </Text>
            </View>
          </View>

          <View className="mt-2.5 gap-1.5">
            {lowItems.map((m) => (
              <View
                key={m.id}
                className="flex-row items-center gap-2 rounded-xl border border-amber-200/70 bg-white px-2.5 py-2"
              >
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={1} className="text-xs font-bold text-slate-800">
                    {m.name}
                  </Text>
                  <Text className="text-[10px] text-slate-400">
                    {m.qty}/{m.minQty} {m.unit} · {ar ? 'المقترح' : 'Suggested'}: {reorderQty(m)} {m.unit}
                  </Text>
                </View>
                <Pressable
                  onPress={() => reorder(m)}
                  className="h-8 shrink-0 flex-row items-center gap-1 rounded-full bg-primary px-3"
                >
                  <Truck size={12} color="#FFFFFF" strokeWidth={2.6} />
                  <Text className="text-[10px] font-bold text-primary-foreground">{ar ? 'طلب تزويد' : 'Reorder'}</Text>
                </Pressable>
              </View>
            ))}
          </View>

          <Pressable
            onPress={reorderAll}
            className="mt-2.5 h-10 items-center justify-center rounded-xl border border-amber-300 bg-white"
          >
            <Text className="text-[11px] font-extrabold text-amber-800">
              {ar ? 'طلب إعادة تزويد للكل ← طلبيات العيادة' : 'Reorder all → Clinic orders'}
            </Text>
          </Pressable>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerClassName="mt-3 gap-1.5"
      >
        {catOptions.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => setCat(c.id)}
            className={cn('h-8 items-center justify-center rounded-full border px-3', cat === c.id ? 'border-primary bg-primary' : 'border-slate-200 bg-white')}
          >
            <Text className={cn('text-[11px] font-bold', cat === c.id ? 'text-primary-foreground' : 'text-slate-500')}>
              {ar ? c.ar : c.en}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable
        onPress={() => setOpen(true)}
        className="mt-3 h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-primary"
      >
        <Plus size={16} color="#FFFFFF" strokeWidth={3} />
        <Text className="text-sm font-extrabold text-primary-foreground">{ar ? 'إضافة مادة' : 'Add material'}</Text>
      </Pressable>

      <View className="mt-3 gap-2.5">
        {list.length === 0 ? (
          <View className="items-center rounded-2xl border border-dashed border-slate-200 bg-white py-14">
            <Boxes size={40} color="#CBD5E1" />
            <Text className="mt-3 text-sm font-bold text-slate-500">{ar ? 'لا توجد مواد بعد' : 'No materials yet'}</Text>
            <Text className="mt-1 text-xs text-slate-400">
              {ar ? 'أضف أول مادة لبدء تتبع المخزون' : 'Add your first material'}
            </Text>
          </View>
        ) : (
          list.map((m) => {
            const isLow = m.qty <= m.minQty;
            const catLabel = ar ? CATS.find((c) => c.id === m.category)?.ar : CATS.find((c) => c.id === m.category)?.en;
            return (
              <View key={m.id} className="rounded-2xl border border-slate-200 bg-white p-3.5">
                <View className="flex-row items-start gap-3">
                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text numberOfLines={1} className="flex-shrink text-sm font-extrabold text-slate-900">
                        {m.name}
                      </Text>
                      {isLow && (
                        <View className="shrink-0 flex-row items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5">
                          <AlertTriangle size={10} color="#B45309" />
                          <Text className="text-[10px] font-bold text-amber-700">{ar ? 'منخفض' : 'Low'}</Text>
                        </View>
                      )}
                    </View>
                    <Text className="mt-0.5 text-[11px] text-slate-500">
                      {catLabel} · {m.price} $
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => removeMaterial(m.id)}
                    className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"
                  >
                    <Trash2 size={14} color="#64748B" />
                  </Pressable>
                </View>
                <View className="mt-2.5 flex-row items-center justify-between">
                  <Text className="text-[11px] text-slate-500">
                    {ar ? 'الحد الأدنى' : 'Min'}: {m.minQty} {m.unit}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <Pressable
                      onPress={() => updateMaterialQty(m.id, m.qty - 1)}
                      className="h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white"
                    >
                      <Minus size={14} color="#334155" />
                    </Pressable>
                    <Text className="min-w-14 text-center text-sm font-extrabold text-slate-900">
                      {m.qty} <Text className="text-[10px] font-semibold text-slate-500">{m.unit}</Text>
                    </Text>
                    <Pressable
                      onPress={() => updateMaterialQty(m.id, m.qty + 1)}
                      className="h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white"
                    >
                      <Plus size={14} color="#334155" />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>

      {open && <AddMaterialSheet ar={ar} onClose={() => setOpen(false)} />}
    </Screen>
  );
}

function AddMaterialSheet({ ar, onClose }: { ar: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('consumables');
  const [unit, setUnit] = useState(ar ? 'قطعة' : 'قطعة');
  const [qty, setQty] = useState('0');
  const [minQty, setMinQty] = useState('5');
  const [priceDisplay, setPriceDisplay] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [storageLocation, setStorageLocation] = useState('');

  const formatNum = (raw: string) => {
    const d = raw.replace(/\D/g, '');
    return d ? Number(d).toLocaleString('en-US') : '';
  };

  const categoryOptions = CATS.map((c) => ({ value: c.id, label: ar ? c.ar : c.en }));
  const unitOptions = UNITS.map((u) => ({ value: u, label: u }));

  const submit = () => {
    if (!name.trim()) return;
    addMaterial({
      name: name.trim(),
      category,
      unit,
      qty: Number(qty) || 0,
      minQty: Number(minQty) || 0,
      price: Number(priceDisplay.replace(/,/g, '')) || 0,
      expiryDate,
      batchNumber: batchNumber.trim(),
      supplierName: supplierName.trim(),
      storageLocation: storageLocation.trim(),
    });
    onClose();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[92%] rounded-t-3xl bg-white">
          <View className="flex-row items-center justify-between border-b border-slate-100 px-4 pb-2.5 pt-4">
            <Text className="text-base font-extrabold text-slate-900">{ar ? 'إضافة مادة' : 'Add material'}</Text>
            <Pressable onPress={onClose} className="h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
              <X size={16} color="#334155" />
            </Pressable>
          </View>

          <ScrollView className="px-4" contentContainerClassName="gap-3.5 py-4">
            <Field label={ar ? 'اسم المادة' : 'Material name'}>
              <TextInput
                autoFocus
                value={name}
                onChangeText={setName}
                className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800"
                style={rtlStyle}
              />
            </Field>

            <View className="flex-row gap-2.5">
              <View className="flex-1">
                <Field label={ar ? 'التصنيف' : 'Category'}>
                  <Select value={category} onChange={setCategory} options={categoryOptions} />
                </Field>
              </View>
              <View className="flex-1">
                <Field label={ar ? 'الوحدة' : 'Unit'}>
                  <Select value={unit} onChange={setUnit} options={unitOptions} />
                </Field>
              </View>
            </View>

            <View className="flex-row gap-2.5">
              <View className="flex-1">
                <Field label={ar ? 'الكمية الحالية' : 'Current qty'}>
                  <TextInput
                    value={qty}
                    onChangeText={(v) => setQty(v.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800"
                    style={ltrStyle}
                  />
                </Field>
              </View>
              <View className="flex-1">
                <Field label={ar ? 'الحد الأدنى' : 'Min qty'}>
                  <TextInput
                    value={minQty}
                    onChangeText={(v) => setMinQty(v.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800"
                    style={ltrStyle}
                  />
                </Field>
              </View>
            </View>

            <View className="flex-row gap-2.5">
              <View className="flex-1">
                <Field label={ar ? 'سعر الشراء (د.ع)' : 'Purchase price (IQD)'}>
                  <TextInput
                    value={priceDisplay}
                    onChangeText={(v) => setPriceDisplay(formatNum(v))}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800"
                    style={ltrStyle}
                  />
                </Field>
              </View>
              <View className="flex-1">
                <Field label={ar ? 'تاريخ الانتهاء' : 'Expiry date'}>
                  <TextInput
                    value={expiryDate}
                    onChangeText={setExpiryDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94A3B8"
                    className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800"
                    style={ltrStyle}
                  />
                </Field>
              </View>
            </View>

            <View className="flex-row gap-2.5">
              <View className="flex-1">
                <Field label={ar ? 'رقم التشغيلة (LOT)' : 'Batch number'}>
                  <TextInput
                    value={batchNumber}
                    onChangeText={setBatchNumber}
                    className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800"
                    style={ltrStyle}
                  />
                </Field>
              </View>
              <View className="flex-1">
                <Field label={ar ? 'اسم المورد' : 'Supplier'}>
                  <TextInput
                    value={supplierName}
                    onChangeText={setSupplierName}
                    className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800"
                    style={rtlStyle}
                  />
                </Field>
              </View>
            </View>

            <Field label={ar ? 'مكان التخزين' : 'Storage location'}>
              <TextInput
                value={storageLocation}
                onChangeText={setStorageLocation}
                placeholder={ar ? 'مثال: رف A، ثلاجة' : 'e.g. Shelf A, Fridge'}
                placeholderTextColor="#94A3B8"
                className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800"
                style={rtlStyle}
              />
            </Field>

            <Pressable onPress={submit} className="h-12 items-center justify-center rounded-2xl bg-primary">
              <Text className="text-sm font-extrabold text-primary-foreground">{ar ? 'حفظ' : 'Save'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
