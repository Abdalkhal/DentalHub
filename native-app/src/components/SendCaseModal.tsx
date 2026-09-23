import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import {
  AtSign,
  Calendar,
  File as FileIcon,
  MapPin,
  Phone,
  Send,
  Upload,
  X,
} from 'lucide-react-native';

import { Text } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { useSession, useUserRole } from '@/lib/useAuth';
import { attachOrderFile, submitDentistCase } from '@/lib/ordersStore';
import { uploadOrderFile } from '@/lib/storagePipeline';
import { createNotification } from '@/lib/notifications';
import { useLabCatalog, type LabCatalog } from '@/lib/catalogStore';
import {
  RULES,
  VITA_SHADES,
  VITA_3D_SHADES,
  VITA_BLEACH_SHADES,
  WORK_TYPES as DENTAL_WORK_TYPES,
  type MaterialId,
  type MaterialRules,
  type ShadeTab,
  type WorkTypeId,
} from '@/lib/dentalConfig';
import { FDI_UPPER, FDI_LOWER, UPPER_POS, LOWER_POS } from '@/components/DentalArch';
import { CalendarPickerModal, toDateStr } from '@/components/CalendarPickerModal';
import { hasNativeModule } from '@/lib/nativeModules';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

type SendCaseModalProps = {
  labId: string;
  labName: string;
  labPhone?: string;
  labAddress?: string;
  labInstagram?: string;
  open: boolean;
  onClose: () => void;
};

type WorkTypeKey = 'crown' | 'bridge' | 'veneer' | 'inlay';

const WORK_TYPES: Record<WorkTypeKey, { ar: string; en: string; dot: string; bg: string; border: string; text: string }> = {
  crown: { ar: 'تاج', en: 'Crown', dot: '#3B82F6', bg: '#EFF6FF', border: '#3B82F6', text: '#1D4ED8' },
  bridge: { ar: 'جسر', en: 'Bridge', dot: '#22C55E', bg: '#F0FDF4', border: '#22C55E', text: '#15803D' },
  veneer: { ar: 'فينير', en: 'Veneer', dot: '#A855F7', bg: '#FAF5FF', border: '#A855F7', text: '#7E22CE' },
  inlay: { ar: 'حشوة داخلية/خارجية', en: 'Inlay/Onlay', dot: '#F97316', bg: '#FFF7ED', border: '#F97316', text: '#C2410C' },
};

const WORK_TYPE_ORDER: WorkTypeKey[] = ['crown', 'bridge', 'veneer', 'inlay'];

type CategoryDef = {
  id: string;
  ar: string;
  en: string;
  color: string;
  material: MaterialId;
  items: { ar: string; en: string; wt?: WorkTypeId }[];
};

const MATERIAL_COLORS: Record<string, string> = {
  'material.emax': '#0EA5E9',
  'material.zirconia': '#8B5CF6',
  'material.feldspathic': '#F43F5E',
  'material.pmma': '#F59E0B',
  'material.pfm': '#64748B',
  'material.full_cast_metal': '#78716C',
  'material.clear_aligner': '#10B981',
  'material.titanium_bar': '#0891B2',
};

const DENTAL_WORK_TYPE_BY_ID = Object.fromEntries(
  DENTAL_WORK_TYPES.map((w) => [w.id, w]),
) as Record<string, { ar: string; en: string }>;

function buildCategories(catalog: LabCatalog): CategoryDef[] {
  return catalog.materials.map((m) => {
    const material = m.id as MaterialId;
    const rule = (RULES as Record<string, MaterialRules | undefined>)[material];
    const allowed = rule?.allowedWorkTypes ?? [];
    const color = MATERIAL_COLORS[m.id] ?? '#94A3B8';

    const items =
      allowed.length > 0
        ? allowed
            .filter((wt) => DENTAL_WORK_TYPE_BY_ID[wt])
            .map((wt) => ({
              ar: `${DENTAL_WORK_TYPE_BY_ID[wt].ar} ${m.ar}`,
              en: `${DENTAL_WORK_TYPE_BY_ID[wt].en} ${m.en}`,
              wt,
            }))
        : [{ ar: m.ar, en: m.en }];

    return { id: m.id, ar: m.ar, en: m.en, color, material, items };
  });
}

const LOWER_OPTIONS = [
  { id: 'night_guard', ar: 'واقي ليلي', en: 'Night guard' },
  { id: 'retainer', ar: 'مثبّت', en: 'Retainer' },
  { id: 'temporary', ar: 'وحدة مؤقتة', en: 'Temporary unit' },
];

const LOWER_SUB = [
  { id: 'partial', ar: 'جزئي', en: 'Partial' },
  { id: 'complete', ar: 'كامل', en: 'Complete' },
  { id: 'acrylic', ar: 'أكريليك', en: 'Acrylic' },
];

const inputCls = 'h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text className="text-[13px] font-extrabold text-slate-900">{children}</Text>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text className="mb-1.5 text-xs font-bold text-slate-600">{label}</Text>
      {children}
    </View>
  );
}

function GenderChip({ active, onPress, children }: { active: boolean; onPress: () => void; children: string }) {
  return (
    <Pressable
      onPress={onPress}
      className={cn('h-11 flex-1 items-center justify-center rounded-xl border', active ? 'border-primary bg-primary' : 'border-slate-200 bg-white')}
    >
      <Text className={cn('text-sm font-bold', active ? 'text-primary-foreground' : 'text-slate-600')}>{children}</Text>
    </Pressable>
  );
}

type PickerApi = {
  getDocumentAsync: (o: { multiple?: boolean; copyToCacheDirectory?: boolean; type?: string }) => Promise<{
    canceled: boolean;
    assets: { uri: string; name?: string }[];
  }>;
};

function loadDocumentPicker(): PickerApi | null {
  if (!hasNativeModule('ExpoDocumentPicker')) return null;
  try {
    return require('expo-document-picker') as PickerApi;
  } catch {
    return null;
  }
}

function OdontogramArch({
  jaw,
  teeth,
  activeTooth,
  onTooth,
}: {
  jaw: 'upper' | 'lower';
  teeth: Record<number, WorkTypeKey>;
  activeTooth: number | null;
  onTooth: (n: number) => void;
}) {
  const fdiList = jaw === 'upper' ? FDI_UPPER : FDI_LOWER;
  const posMap = jaw === 'upper' ? UPPER_POS : LOWER_POS;
  const archSrc = jaw === 'upper' ? require('../../assets/home/arch-upper.png') : require('../../assets/home/arch-lower.png');

  return (
    // `direction: 'ltr'` stops the absolute-positioned tooth markers from
    // being mirrored under forced Arabic RTL layout — otherwise Android
    // flips every `left`/`top` offset in this subtree and swaps each tooth
    // onto the wrong side (e.g. #18 rendering on the patient-left side).
    <View style={{ width: '100%', aspectRatio: 4 / 3, direction: 'ltr' }}>
      <Image source={archSrc} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="contain" />
      {fdiList.map((n) => {
        const pos = posMap[n];
        if (!pos) return null;
        const lx = 50 + (pos[0] - 50) * 1.22;
        const ly = 50 + (pos[1] - 50) * 1.18;
        const wt = teeth[n];
        const isActive = activeTooth === n;
        return (
          <Pressable
            key={n}
            onPress={() => onTooth(n)}
            style={{
              position: 'absolute',
              left: `${lx}%`,
              top: `${ly}%`,
              transform: [{ translateX: -11 }, { translateY: -11 }],
              width: 22,
              height: 22,
              borderRadius: 11,
              borderWidth: isActive ? 2 : 1,
              borderColor: wt ? WORK_TYPES[wt].border : isActive ? '#0F172A' : '#FFFFFF',
              backgroundColor: wt ? WORK_TYPES[wt].dot : '#E2E8F0',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 8, fontWeight: '700', color: wt ? '#FFFFFF' : '#64748B' }}>{n}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SendCaseModal({ labId, labName, labPhone, labAddress, labInstagram, open, onClose }: SendCaseModalProps) {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useSession();
  const { role } = useUserRole();
  const { catalog } = useLabCatalog(labId);

  const enabledWorkTypes = useMemo(() => new Set(catalog.workTypes.map((w) => w.id)), [catalog.workTypes]);
  const categories = useMemo(() => buildCategories(catalog), [catalog]);

  const itemMaterial = useMemo(() => {
    const map = new Map<string, MaterialId>();
    categories.forEach((c) => c.items.forEach((it) => map.set(ar ? it.ar : it.en, c.material)));
    return map;
  }, [categories, ar]);

  const itemWorkType = useMemo(() => {
    const map = new Map<string, WorkTypeId>();
    categories.forEach((c) => c.items.forEach((it) => { if (it.wt) map.set(ar ? it.ar : it.en, it.wt); }));
    return map;
  }, [categories, ar]);

  const [patient, setPatient] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState<'male' | 'female' | ''>('');
  const [patientPhone, setPatientPhone] = useState('');
  const [receivedDate, setReceivedDate] = useState(() => toDateStr(new Date()));
  const [deliveryDate, setDeliveryDate] = useState('');
  const [showReceivedCal, setShowReceivedCal] = useState(false);
  const [showDeliveryCal, setShowDeliveryCal] = useState(false);

  const [activeWorkType, setActiveWorkType] = useState<WorkTypeKey | null>(null);
  const [teeth, setTeeth] = useState<Record<number, WorkTypeKey>>({});
  const [activeTooth, setActiveTooth] = useState<number | null>(null);
  const [toothItems, setToothItems] = useState<Record<number, string[]>>({});

  const [lowerSelected, setLowerSelected] = useState<string[]>([]);
  const [lowerSubSelected, setLowerSubSelected] = useState<string[]>([]);

  const [vitaTab, setVitaTab] = useState<ShadeTab>('classical');
  const [shade, setShade] = useState('');
  const [customShade, setCustomShade] = useState('');
  const [unitsCount, setUnitsCount] = useState('1');

  const [notes, setNotes] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [scanFile, setScanFile] = useState<{ uri: string; name: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const docName =
      role?.accountType === 'dentist' ? `${role.name || ''} ${role.surname || ''}`.trim() : user?.displayName || user?.email || '';
    setDoctorName(docName || '');
  }, [open, role, user]);

  if (!open) return null;

  const displayName = (item: { ar: string; en: string }) => (ar ? item.ar : item.en);

  const selectTooth = (n: number) => {
    setActiveTooth(n);
    if (activeWorkType) {
      setTeeth((prev) => {
        const next = { ...prev };
        if (next[n] === activeWorkType) delete next[n];
        else next[n] = activeWorkType;
        return next;
      });
    }
  };

  const toggleItem = (itemLabel: string) => {
    if (activeTooth == null) return;
    setToothItems((prev) => {
      const cur = prev[activeTooth] || [];
      const next = cur.includes(itemLabel) ? cur.filter((x) => x !== itemLabel) : [...cur, itemLabel];
      return { ...prev, [activeTooth]: next };
    });
  };

  const getItemTeeth = (itemLabel: string): number[] =>
    Object.entries(toothItems)
      .filter(([, items]) => items.includes(itemLabel))
      .map(([n]) => Number(n));

  const wordCount = notes.trim() ? notes.trim().split(/\s+/).length : 0;
  const onNotesChange = (v: string) => {
    if (v.trim().split(/\s+/).filter(Boolean).length > 200) return;
    setNotes(v);
  };

  const pickShade = (code: string) => {
    setShade(code);
    setCustomShade('');
  };

  const pickFile = async () => {
    const Picker = loadDocumentPicker();
    if (!Picker) {
      toast.error(ar ? 'اختيار الملفات يتطلب أحدث إصدار من التطبيق' : 'File picking needs the latest app build');
      return;
    }
    const picked = await Picker.getDocumentAsync({ multiple: false, copyToCacheDirectory: true, type: '*/*' });
    if (picked.canceled || picked.assets.length === 0) return;
    const asset = picked.assets[0];
    const ext = (asset.name?.split('.').pop() ?? '').toLowerCase();
    if (ext !== 'stl' && ext !== 'zip') {
      setError(ar ? 'يُسمح فقط بملفات STL أو ZIP' : 'Only .stl and .zip files are allowed');
      return;
    }
    setError(null);
    setScanFile({ uri: asset.uri, name: asset.name ?? 'scan.stl' });
    setUploadProgress(0);
  };

  const clearFile = () => {
    setScanFile(null);
    setUploadProgress(0);
  };

  const reset = () => {
    setPatient('');
    setPatientAge('');
    setPatientGender('');
    setPatientPhone('');
    setReceivedDate(toDateStr(new Date()));
    setDeliveryDate('');
    setActiveWorkType(null);
    setTeeth({});
    setActiveTooth(null);
    setToothItems({});
    setLowerSelected([]);
    setLowerSubSelected([]);
    setVitaTab('classical');
    setShade('');
    setCustomShade('');
    setUnitsCount('1');
    setNotes('');
    setScanFile(null);
    setUploadProgress(0);
    setDone(false);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setError(null);
    if (!patient.trim()) {
      setError(ar ? 'الرجاء إدخال اسم المريض' : 'Please enter patient name');
      return;
    }

    const allItems: string[] = [];
    Object.entries(toothItems).forEach(([n, items]) => {
      items.forEach((it) => allItems.push(`${it} #${n}`));
    });
    lowerSelected.forEach((id) => {
      const o = LOWER_OPTIONS.find((x) => x.id === id);
      if (o) allItems.push(o.en);
    });
    lowerSubSelected.forEach((id) => {
      const o = LOWER_SUB.find((x) => x.id === id);
      if (o) allItems.push(o.en);
    });

    const toothSummary = Object.entries(teeth)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([n, t]) => `${WORK_TYPES[t].en} ${n}`);

    // Only the labels actually used on a tooth, so the case doc doesn't carry
    // the whole catalog — CaseDetailModal's deriveWorkDetailGroups reads this
    // to show each distinct material/work-type used in the case separately.
    const usedLabels = new Set<string>();
    Object.values(toothItems).forEach((its) => its.forEach((l) => usedLabels.add(l)));
    const itemMaterialUsed: Record<string, string> = {};
    const itemWorkTypeUsed: Record<string, string> = {};
    usedLabels.forEach((label) => {
      const m = itemMaterial.get(label);
      const w = itemWorkType.get(label);
      if (m) itemMaterialUsed[label] = m;
      if (w) itemWorkTypeUsed[label] = w;
    });

    const workType = [...allItems, ...toothSummary].join(' · ') || (ar ? 'غير محدد' : 'Unspecified');

    let primaryMaterial: MaterialId | undefined;
    let primaryWorkType: WorkTypeId | undefined;
    for (const items of Object.values(toothItems)) {
      for (const label of items) {
        if (!primaryMaterial) primaryMaterial = itemMaterial.get(label);
        if (!primaryWorkType) primaryWorkType = itemWorkType.get(label);
      }
      if (primaryMaterial && primaryWorkType) break;
    }
    if (!primaryWorkType) {
      const counts: Record<string, number> = {};
      Object.values(teeth).forEach((t) => { counts[t] = (counts[t] ?? 0) + 1; });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as WorkTypeId | undefined;
      if (top) primaryWorkType = top;
    }

    setBusy(true);
    try {
      const order = await submitDentistCase(labId, {
        patient: patient.trim(),
        doctor: doctorName || (ar ? 'غير محدد' : 'Unspecified'),
        workType,
        dueDate: deliveryDate || '',
        unitsCount: parseInt(unitsCount, 10) || 1,
        notes: notes.trim(),
        clinic: role?.clinicName || (ar ? 'غير محدد' : 'Unspecified'),
        dentistId: user?.uid ?? 'unknown',
        dentistName: user?.displayName ?? user?.email ?? (ar ? 'طبيب' : 'Dentist'),
        shade: shade || customShade || undefined,
        material: primaryMaterial,
        patientAge: patientAge || undefined,
        patientGender: patientGender || undefined,
        patientPhone: patientPhone || undefined,
        rxTeeth: Object.fromEntries(Object.entries(teeth)),
        rxItems: allItems,
        rxData: {
          toothItems,
          teeth,
          lowerSelected,
          lowerSubSelected,
          receivedDate,
          vitaTab,
          customShade: customShade || undefined,
          primaryMaterial,
          primaryWorkType,
          itemMaterial: itemMaterialUsed,
          itemWorkType: itemWorkTypeUsed,
        },
      });

      if (scanFile) {
        const blob = await fetch(scanFile.uri).then((r) => r.blob());
        const { path } = await uploadOrderFile({
          orderId: order.id,
          labId,
          dentistId: user?.uid ?? '',
          file: blob,
          fileName: scanFile.name,
          onProgress: (pct) => setUploadProgress(pct),
        });
        await attachOrderFile(labId, order.id, { name: scanFile.name, path });
      }

      try {
        await createNotification({
          userId: labId,
          title: ar ? 'وصفة حالة جديدة (Rx)' : 'New Rx Case Request',
          body: ar
            ? `قام د. ${order.doctor} بإرسال وصفة حالة للمريض ${order.patient}.`
            : `Dr. ${order.doctor} sent an Rx case for patient ${order.patient}.`,
          type: 'order_new',
          orderId: order.id,
        });
      } catch {
        /* notification is non-critical */
      }

      setDone(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(msg || (ar ? 'فشل الإرسال. حاول مرة أخرى.' : 'Failed to send. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  const shadeList = vitaTab === 'classical' ? VITA_SHADES : vitaTab === '3d' ? VITA_3D_SHADES : VITA_BLEACH_SHADES;

  if (done) {
    return (
      <Modal visible transparent animationType="slide" onRequestClose={handleClose}>
        <View className="flex-1 items-center justify-center bg-black/40 p-6">
          <View className="w-full max-w-sm items-center rounded-3xl bg-[#EBF3FA] p-6">
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
              <Send size={28} color="#059669" />
            </View>
            <Text className="mt-3 text-center text-lg font-extrabold text-slate-800">
              {ar ? 'تم إرسال الوصفة بنجاح!' : 'Rx sent successfully!'}
            </Text>
            <Text className="mt-1.5 text-center text-sm text-slate-500">
              {ar ? `سيستلم ${labName} الوصفة وسيتم إعلامك بالتحديثات` : `${labName} will receive the Rx and update you`}
            </Text>
            <Pressable onPress={handleClose} className="mt-4 h-10 items-center justify-center rounded-xl bg-primary px-6">
              <Text className="text-sm font-bold text-primary-foreground">{ar ? 'حسناً' : 'OK'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[92%] rounded-t-3xl bg-[#EBF3FA]">
          <View className="flex-row items-center justify-between border-b border-slate-200 px-4 pb-2.5 pt-4">
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="text-base font-extrabold text-slate-900">
                {ar ? `مختبر ${labName} لطب الأسنان` : `${labName} Dental Lab`}
              </Text>
              <View className="mt-1 flex-row flex-wrap items-center gap-2.5">
                {!!labPhone && (
                  <View className="flex-row items-center gap-1">
                    <Phone size={11} color="#64748B" />
                    <Text className="text-[11px] text-slate-500">{labPhone.replace(/\D/g, '').replace(/^964/, '+964 ')}</Text>
                  </View>
                )}
                {!!labInstagram && (
                  <View className="flex-row items-center gap-1">
                    <AtSign size={11} color="#64748B" />
                    <Text className="text-[11px] text-slate-500">{labInstagram}</Text>
                  </View>
                )}
              </View>
            </View>
            <Pressable onPress={handleClose} className="h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white">
              <X size={18} color="#334155" />
            </Pressable>
          </View>

          <ScrollView className="px-4" contentContainerClassName="gap-4 py-4">
            {!!error && (
              <View className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                <Text className="text-sm text-rose-700">{error}</Text>
              </View>
            )}

            {/* Doctor & Patient */}
            <View className="gap-3">
              <SectionTitle>{ar ? 'بيانات الطبيب والمريض' : 'Doctor & Patient'}</SectionTitle>
              <Field label={ar ? 'اسم الطبيب' : 'Doctor name'}>
                <TextInput
                  value={doctorName}
                  onChangeText={setDoctorName}
                  placeholder={ar ? 'اسم الطبيب المحوّل' : 'Referring doctor'}
                  placeholderTextColor="#94A3B8"
                  className={inputCls}
                  style={{ writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left' }}
                />
              </Field>
              <Field label={ar ? 'اسم المريض *' : 'Patient name *'}>
                <TextInput
                  value={patient}
                  onChangeText={setPatient}
                  placeholder={ar ? 'أدخل اسم المريض' : 'Enter patient name'}
                  placeholderTextColor="#94A3B8"
                  className={inputCls}
                  style={{ writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left' }}
                />
              </Field>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Field label={ar ? 'العمر' : 'Age'}>
                    <TextInput
                      value={patientAge}
                      onChangeText={(v) => setPatientAge(v.replace(/[^0-9]/g, ''))}
                      keyboardType="number-pad"
                      placeholder={ar ? 'العمر' : 'Age'}
                      placeholderTextColor="#94A3B8"
                      className={inputCls}
                      style={{ writingDirection: 'ltr', textAlign: 'left' }}
                    />
                  </Field>
                </View>
                <View className="flex-1">
                  <Field label={ar ? 'رقم الهاتف' : 'Phone'}>
                    <TextInput
                      value={patientPhone}
                      onChangeText={setPatientPhone}
                      keyboardType="phone-pad"
                      placeholder="07XXXXXXXXX"
                      placeholderTextColor="#94A3B8"
                      className={inputCls}
                      style={{ writingDirection: 'ltr', textAlign: 'left' }}
                    />
                  </Field>
                </View>
              </View>
              <Field label={ar ? 'الجنس' : 'Gender'}>
                <View className="flex-row gap-2">
                  <GenderChip active={patientGender === 'male'} onPress={() => setPatientGender(patientGender === 'male' ? '' : 'male')}>
                    {ar ? 'ذكر' : 'Male'}
                  </GenderChip>
                  <GenderChip active={patientGender === 'female'} onPress={() => setPatientGender(patientGender === 'female' ? '' : 'female')}>
                    {ar ? 'أنثى' : 'Female'}
                  </GenderChip>
                </View>
              </Field>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Field label={ar ? 'تاريخ الاستلام' : 'Received date'}>
                    <Pressable onPress={() => setShowReceivedCal(true)} className={cn(inputCls, 'flex-row items-center gap-1.5')}>
                      <Calendar size={14} color="#2563EB" />
                      <Text className="text-sm text-slate-700">{receivedDate}</Text>
                    </Pressable>
                  </Field>
                </View>
                <View className="flex-1">
                  <Field label={ar ? 'تاريخ التسليم' : 'Delivery date'}>
                    <Pressable onPress={() => setShowDeliveryCal(true)} className={cn(inputCls, 'flex-row items-center gap-1.5')}>
                      <Calendar size={14} color="#2563EB" />
                      <Text className="text-sm text-slate-700">{deliveryDate || (ar ? 'اختر تاريخ' : 'Pick a date')}</Text>
                    </Pressable>
                  </Field>
                </View>
              </View>
            </View>

            {/* Odontogram */}
            <View className="gap-2">
              <SectionTitle>{ar ? 'مخطط الأسنان (Odontogram)' : 'Odontogram'}</SectionTitle>
              <View className="rounded-2xl border border-slate-200 bg-white p-3">
                <View className="gap-2">
                  <OdontogramArch jaw="upper" teeth={teeth} activeTooth={activeTooth} onTooth={selectTooth} />
                  <OdontogramArch jaw="lower" teeth={teeth} activeTooth={activeTooth} onTooth={selectTooth} />
                </View>
                <View className="mt-3 flex-row flex-wrap gap-1.5">
                  {WORK_TYPE_ORDER.map((k) => {
                    const wt = WORK_TYPES[k];
                    const active = activeWorkType === k;
                    return (
                      <Pressable
                        key={k}
                        onPress={() => setActiveWorkType(active ? null : k)}
                        className="flex-row items-center gap-1.5 rounded-lg border px-2.5 py-1.5"
                        style={{
                          borderWidth: active ? 2 : 1,
                          borderColor: active ? wt.border : '#E2E8F0',
                          backgroundColor: active ? wt.bg : '#FFFFFF',
                        }}
                      >
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: wt.dot }} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: active ? wt.text : '#475569' }}>
                          {ar ? wt.ar : wt.en}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text className="mt-2 text-[11px] text-slate-400">
                  {ar
                    ? 'اختر نوع العمل (اللون) ثم اضغط على السن، ثم اربط الأعمال أدناه بالسن المحدد'
                    : 'Pick a work type (color), tap a tooth, then link work items to that tooth below'}
                </Text>
              </View>
            </View>

            {/* Work type / categories */}
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <SectionTitle>{ar ? 'نوع العمل' : 'Work type'}</SectionTitle>
                {activeTooth != null ? (
                  <View className="flex-row items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1">
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: teeth[activeTooth] ? WORK_TYPES[teeth[activeTooth]].dot : '#94A3B8',
                      }}
                    />
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#475569' }}>#{activeTooth}</Text>
                  </View>
                ) : (
                  <Text className="text-[10px] font-semibold text-slate-400">
                    {ar ? 'اختر سنًا أولاً من المخطط' : 'Select a tooth first'}
                  </Text>
                )}
              </View>

              {categories.map((c) => {
                const items = c.items.filter((it) => !it.wt || enabledWorkTypes.has(it.wt)).map((it) => displayName(it));
                return (
                  <View key={c.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <View className="flex-row items-center gap-2 border-b border-slate-100 px-3 py-2.5">
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.color }} />
                      <Text className="text-sm font-extrabold text-slate-700">{ar ? c.ar : c.en}</Text>
                    </View>
                    <View className="flex-row flex-wrap gap-2 px-3 py-3">
                      {items.map((it) => {
                        const itemTeeth = getItemTeeth(it);
                        const selected = itemTeeth.length > 0;
                        const colors = itemTeeth.map((n) => teeth[n]).filter((t): t is WorkTypeKey => Boolean(t));
                        const primary = colors[0];
                        return (
                          <Pressable
                            key={it}
                            onPress={() => toggleItem(it)}
                            className="h-9 flex-row items-center gap-1.5 rounded-xl border px-3"
                            style={{
                              borderColor: selected ? (primary ? WORK_TYPES[primary].border : '#94A3B8') : '#E2E8F0',
                              backgroundColor: selected ? (primary ? WORK_TYPES[primary].bg : '#F1F5F9') : '#FFFFFF',
                            }}
                          >
                            {selected && (
                              <View
                                style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: primary ? WORK_TYPES[primary].dot : '#94A3B8' }}
                              />
                            )}
                            <Text style={{ fontSize: 11, fontWeight: '600', color: selected && primary ? WORK_TYPES[primary].text : '#475569' }}>
                              {it}
                            </Text>
                            {selected && (
                              <Text style={{ fontSize: 9, opacity: 0.7 }}>#{itemTeeth.join(',')}</Text>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Additional options */}
            <View className="gap-2">
              <SectionTitle>{ar ? 'خيارات إضافية' : 'Additional options'}</SectionTitle>
              <View className="flex-row flex-wrap gap-1.5">
                {LOWER_OPTIONS.map((o) => {
                  const active = lowerSelected.includes(o.id);
                  return (
                    <Pressable
                      key={o.id}
                      onPress={() => setLowerSelected((p) => (active ? p.filter((x) => x !== o.id) : [...p, o.id]))}
                      className={cn('h-9 items-center justify-center rounded-xl border px-3', active ? 'border-slate-800 bg-slate-800' : 'border-slate-200 bg-white')}
                    >
                      <Text className={cn('text-[11px] font-semibold', active ? 'text-white' : 'text-slate-600')}>{ar ? o.ar : o.en}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View className="flex-row flex-wrap gap-1.5">
                {LOWER_SUB.map((o) => {
                  const active = lowerSubSelected.includes(o.id);
                  return (
                    <Pressable
                      key={o.id}
                      onPress={() => setLowerSubSelected((p) => (active ? p.filter((x) => x !== o.id) : [...p, o.id]))}
                      className={cn('h-8 items-center justify-center rounded-xl border px-3', active ? 'border-amber-500 bg-amber-500' : 'border-slate-200 bg-white')}
                    >
                      <Text className={cn('text-[10px] font-semibold', active ? 'text-white' : 'text-slate-500')}>{ar ? o.ar : o.en}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Shade & units */}
            <View className="gap-3">
              <SectionTitle>{ar ? 'اللون وعدد الوحدات' : 'Shade & Units'}</SectionTitle>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Field label={ar ? 'اللون (SHADE)' : 'COLOR (SHADE)'}>
                    <TextInput
                      value={shade || customShade}
                      onChangeText={(v) => { setShade(v); setCustomShade(''); }}
                      placeholder={ar ? 'اختر من الأسفل' : 'Pick below'}
                      placeholderTextColor="#94A3B8"
                      className={inputCls}
                      style={{ writingDirection: 'ltr', textAlign: 'left' }}
                    />
                  </Field>
                </View>
                <View className="flex-1">
                  <Field label={ar ? 'عدد الوحدات' : 'Number of units'}>
                    <TextInput
                      value={unitsCount}
                      onChangeText={(v) => setUnitsCount(v.replace(/[^0-9]/g, ''))}
                      keyboardType="number-pad"
                      className={inputCls}
                      style={{ writingDirection: 'ltr', textAlign: 'left' }}
                    />
                  </Field>
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerClassName="gap-1.5">
                {(
                  [
                    ['classical', ar ? 'VITA كلاسيكي' : 'VITA Classical'],
                    ['3d', 'VITA 3D-Master'],
                    ['bleach', 'Bleach'],
                    ['others', ar ? 'أخرى' : 'Others'],
                  ] as [ShadeTab, string][]
                ).map(([k, label]) => (
                  <Pressable
                    key={k}
                    onPress={() => setVitaTab(k)}
                    className={cn('h-9 items-center justify-center rounded-full border-2 px-3.5', vitaTab === k ? 'border-primary bg-primary' : 'border-slate-200 bg-white')}
                  >
                    <Text className={cn('text-xs font-bold', vitaTab === k ? 'text-primary-foreground' : 'text-slate-600')}>{label}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {vitaTab === 'others' ? (
                <TextInput
                  value={customShade}
                  onChangeText={(v) => { setCustomShade(v); setShade(''); }}
                  placeholder={ar ? 'أدخل درجة لون مخصصة...' : 'Enter custom shade...'}
                  placeholderTextColor="#94A3B8"
                  className={inputCls}
                  style={{ writingDirection: 'ltr', textAlign: 'left' }}
                />
              ) : (
                <View className="rounded-2xl border border-slate-200 bg-white p-3">
                  <View className="flex-row flex-wrap gap-1.5">
                    {shadeList.map((s) => {
                      const active = shade === s.code;
                      return (
                        <Pressable
                          key={s.code}
                          onPress={() => pickShade(s.code)}
                          style={{ width: '11%' }}
                          className={cn('aspect-square items-center justify-center rounded-xl border-2', active ? 'border-primary' : 'border-slate-200')}
                        >
                          <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: s.hex, borderWidth: 1, borderColor: '#CBD5E1' }} />
                          <Text style={{ fontSize: 7, fontWeight: '700', color: '#475569', marginTop: 2 }}>{s.code}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>

            {/* Notes */}
            <View className="gap-2">
              <SectionTitle>{ar ? 'الشرح / الملاحظات' : 'Explanation / Notes'}</SectionTitle>
              <TextInput
                value={notes}
                onChangeText={onNotesChange}
                multiline
                numberOfLines={3}
                placeholder={ar ? 'تعليمات سريرية، ملاحظات خاصة...' : 'Clinical instructions, special notes...'}
                placeholderTextColor="#94A3B8"
                className="min-h-[76px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800"
                style={{ textAlignVertical: 'top', writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left' }}
              />
              <Text className={cn('text-end text-[10px] font-semibold', wordCount > 180 ? 'text-rose-500' : 'text-slate-400')}>
                {wordCount}/200
              </Text>
            </View>

            {/* Scan file */}
            <View className="gap-2">
              <SectionTitle>{ar ? 'إرفاق ملف الماسح (STL / ZIP)' : 'Attach scanner file (STL / ZIP)'}</SectionTitle>
              {scanFile ? (
                <View className="gap-2 rounded-xl border border-slate-200 bg-white p-3">
                  <View className="flex-row items-center gap-2">
                    <View className="h-9 w-9 items-center justify-center rounded-lg bg-sky-50">
                      <FileIcon size={16} color="#0284C7" />
                    </View>
                    <Text numberOfLines={1} className="flex-1 text-xs font-semibold text-slate-700">
                      {scanFile.name}
                    </Text>
                    {!busy && (
                      <Pressable onPress={clearFile} className="h-7 w-7 items-center justify-center rounded-lg">
                        <X size={16} color="#94A3B8" />
                      </Pressable>
                    )}
                  </View>
                  {busy && (
                    <View className="gap-1">
                      <View className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <View className="h-full rounded-full bg-sky-500" style={{ width: `${uploadProgress}%` }} />
                      </View>
                      <Text className="text-center text-[10px] text-slate-400">{uploadProgress}%</Text>
                    </View>
                  )}
                </View>
              ) : (
                <Pressable onPress={pickFile} className="items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-4">
                  <Upload size={18} color="#94A3B8" />
                  <Text className="text-[11px] font-semibold text-slate-400">
                    {ar ? 'اضغط لإرفاق ملف STL أو ZIP' : 'Tap to attach STL or ZIP'}
                  </Text>
                  <Text className="text-[9px] text-slate-300">.stl · .zip</Text>
                </Pressable>
              )}
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={busy}
              className="h-12 flex-row items-center justify-center gap-2 rounded-xl bg-primary"
              style={{ opacity: busy ? 0.5 : 1 }}
            >
              {busy ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text className="text-sm font-bold text-primary-foreground">{ar ? 'جارٍ الإرسال...' : 'Sending...'}</Text>
                </>
              ) : (
                <>
                  <Send size={16} color="#FFFFFF" />
                  <Text className="text-sm font-bold text-primary-foreground">{ar ? 'إرسال الوصفة للمختبر' : 'Send Rx to Lab'}</Text>
                </>
              )}
            </Pressable>
          </ScrollView>

          <View className="flex-row items-center justify-between border-t border-slate-200 bg-[#E2EDF8] px-5 py-3">
            <View className="flex-row items-center gap-1">
              <Phone size={11} color="#64748B" />
              <Text className="text-[11px] text-slate-500">{labPhone?.replace(/\D/g, '').replace(/^964/, '+964 ') || '—'}</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <MapPin size={11} color="#64748B" />
              <Text numberOfLines={1} className="text-[11px] text-slate-500">{labAddress || (ar ? 'الموقع' : 'Location')}</Text>
            </View>
          </View>
        </View>
      </View>
      </KeyboardAvoidingView>

      <CalendarPickerModal
        visible={showReceivedCal}
        onClose={() => setShowReceivedCal(false)}
        selectedDate={receivedDate}
        onSelect={(ds) => { setReceivedDate(ds); setShowReceivedCal(false); }}
      />
      <CalendarPickerModal
        visible={showDeliveryCal}
        onClose={() => setShowDeliveryCal(false)}
        selectedDate={deliveryDate || toDateStr(new Date())}
        onSelect={(ds) => { setDeliveryDate(ds); setShowDeliveryCal(false); }}
      />
    </Modal>
  );
}
