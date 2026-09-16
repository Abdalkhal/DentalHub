import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Building2, Calendar, Check, Gem, Pencil, PenTool, Palette, Plus, Stethoscope, Trash2, User, X } from 'lucide-react-native';

import { Screen, Text, Input, Button } from '@/components/ui';
import { db } from '@/integrations/firebase/client';
import { CalendarPickerModal, toDateStr } from '@/components/CalendarPickerModal';
import {
  MATERIALS,
  FRAMEWORK_CREATION,
  RULES,
  IMPLANT_WORK_TYPES,
  VITA_SHADES,
  VITA_3D_SHADES,
  VITA_BLEACH_SHADES,
  type MaterialId,
  type WorkTypeId,
  type MaterialRules,
  type ShadeTab,
} from '@/lib/dentalConfig';
import { useLabCatalog, saveLabCatalog, type LabCatalog } from '@/lib/catalogStore';
import { addOrder, buildInternalOrder } from '@/lib/ordersStore';
import type { CombinedLabOrder, PricingItem } from '@/components/CombinedLabOrderModal';
import { useLabMembers } from '@/lib/labMembersStore';
import { useUserRole } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import { toast } from '@/lib/toast';
import { cn, normalizeName } from '@/lib/utils';

// Ported from the web app's CombinedLabOrderModal (src/components/CombinedLabOrderModal.tsx),
// including "تعديل القائمة" — per-lab customization of the materials/work
// types/manufacturing methods list, stored at labs/{labId}/custom_catalog
// (lib/catalogStore.ts, already shared with the doctor-facing "send case to
// this lab" flow — a lab's edits here are what that flow shows too). Editing
// is add/remove only, matching web (no rename of existing entries).
// `implantScanBody` / `implantLevel` (secondary, optional implant fields on
// web) are left out to keep the implant section to what's actually needed to
// place the order.

const USD_RATE = 1480;

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function stripNonDigits(text: string): string {
  return text.replace(/[^\d]/g, '');
}

function formatThousands(digits: string): string {
  if (!digits) return '';
  return Number(digits).toLocaleString('en-US');
}

const CONNECTION_OPTIONS = [
  { id: 'internal_hex', ar: 'سداسي داخلي', en: 'Internal Hex' },
  { id: 'external_hex', ar: 'سداسي خارجي', en: 'External Hex' },
  { id: 'conical', ar: 'مخروطي', en: 'Conical' },
  { id: 'morse_taper', ar: 'Morse Taper', en: 'Morse Taper' },
  { id: 'internal_octagon', ar: 'ثماني داخلي', en: 'Internal Octagon' },
];
const RETENTION_OPTIONS = [
  { id: 'screw', ar: 'تثبيت بالبرغي', en: 'Screw-Retained' },
  { id: 'cement', ar: 'تثبيت بالإسمنت', en: 'Cement-Retained' },
];
const ALIGNER_TREATMENT_OPTIONS = [
  { id: 'comprehensive', ar: 'شامل', en: 'Comprehensive' },
  { id: 'express', ar: 'سريع', en: 'Express' },
  { id: 'retention', ar: 'مثبّت', en: 'Retention' },
];
const ALIGNER_ARCH_OPTIONS = [
  { id: 'upper', ar: 'علوي', en: 'Upper' },
  { id: 'lower', ar: 'سفلي', en: 'Lower' },
  { id: 'both', ar: 'كلاهما', en: 'Both' },
];
const ALIGNER_WEAR_OPTIONS = [
  { id: '7days', ar: 'كل 7 أيام', en: 'Every 7 days' },
  { id: '10days', ar: 'كل 10 أيام', en: 'Every 10 days' },
  { id: '14days', ar: 'كل 14 يوماً', en: 'Every 14 days' },
];
const TITANIUM_FRAMEWORK_OPTIONS = [
  { id: 'removable_overdenture', ar: 'طقم قابل للإزالة', en: 'Removable Overdenture' },
  { id: 'fixed_framework', ar: 'هيكل ثابت', en: 'Fixed Framework' },
];
const SHADE_TABS: { id: ShadeTab; ar: string; en: string }[] = [
  { id: 'classical', ar: 'VITA كلاسيكي', en: 'VITA Classical' },
  { id: '3d', ar: 'VITA 3D-Master', en: 'VITA 3D-Master' },
  { id: 'bleach', ar: 'Bleach', en: 'Bleach' },
  { id: 'others', ar: 'أخرى', en: 'Other' },
];

function Section({ title, headerRight, children }: { title: string; headerRight?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View className="gap-3 rounded-2xl border border-slate-200 bg-card p-4 shadow-sm">
      <View className="flex-row items-center justify-between border-b border-slate-100 pb-2">
        <Text className="text-sm font-extrabold text-slate-800">{title}</Text>
        {headerRight}
      </View>
      {children}
    </View>
  );
}

function Field({ label, icon, required, children }: { label: string; icon?: React.ReactNode; required?: boolean; children: React.ReactNode }) {
  return (
    <View className="gap-1.5">
      <View className="flex-row items-center gap-1.5">
        {icon}
        <Text className="text-xs font-bold text-slate-600">
          {label}
          {required ? <Text className="text-rose-500"> *</Text> : null}
        </Text>
      </View>
      {children}
    </View>
  );
}

function CatalogChips<T extends { id: string; ar: string; en: string }>({
  options,
  value,
  onChange,
  ar,
  editable,
  onDelete,
}: {
  options: T[];
  value: string;
  onChange: (v: T) => void;
  ar: boolean;
  editable?: boolean;
  onDelete?: (id: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o.id;
        return (
          <View
            key={o.id}
            className={cn(
              'flex-row items-stretch overflow-hidden rounded-xl border',
              active ? 'border-primary bg-primary/10' : 'border-slate-200 bg-white',
            )}
          >
            <Pressable onPress={() => !editable && onChange(o)} className="px-3 py-2.5">
              <Text className={cn('text-xs font-bold', active ? 'text-primary' : 'text-slate-700')}>{ar ? o.ar : o.en}</Text>
            </Pressable>
            {editable && (
              <Pressable onPress={() => onDelete?.(o.id)} className="items-center justify-center border-s border-slate-200 px-2 bg-rose-50">
                <Trash2 size={13} color="#F43F5E" />
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
}

function AddCatalogRow({
  ar,
  newAr,
  newEn,
  setNewAr,
  setNewEn,
  onConfirm,
  onCancel,
  placeholder,
}: {
  ar: boolean;
  newAr: string;
  newEn: string;
  setNewAr: (v: string) => void;
  setNewEn: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  placeholder: string;
}) {
  return (
    <View className="gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-2.5">
      <Input value={newAr} onChangeText={setNewAr} placeholder={placeholder} />
      <Input value={newEn} onChangeText={setNewEn} placeholder="English name" style={{ writingDirection: 'ltr' }} />
      <View className="flex-row gap-2">
        <Pressable onPress={onConfirm} className="flex-1 flex-row items-center justify-center gap-1 rounded-lg bg-primary py-2">
          <Check size={13} color="#FFFFFF" />
          <Text className="text-xs font-bold text-white">{ar ? 'إضافة' : 'Add'}</Text>
        </Pressable>
        <Pressable onPress={onCancel} className="items-center justify-center rounded-lg bg-slate-100 px-3">
          <X size={14} color="#64748B" />
        </Pressable>
      </View>
    </View>
  );
}

function Chips<T extends string>({
  options,
  value,
  onChange,
  ar,
}: {
  options: { id: T; ar: string; en: string }[];
  value: T | '';
  onChange: (v: T) => void;
  ar: boolean;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o.id;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            className={cn('rounded-xl border px-3 py-2.5', active ? 'border-primary bg-primary/10' : 'border-slate-200 bg-white')}
          >
            <Text className={cn('text-xs font-bold', active ? 'text-primary' : 'text-slate-700')}>{ar ? o.ar : o.en}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function workTypesForMaterial(materialId: string, displayCatalog: LabCatalog) {
  const rule = (RULES as Record<string, MaterialRules | undefined>)[materialId];
  const allowed = rule ? rule.allowedWorkTypes : (displayCatalog.workTypes.map((w) => w.id) as WorkTypeId[]);
  return displayCatalog.workTypes.filter((wt) => allowed.includes(wt.id as WorkTypeId));
}

function methodsForMaterialWorkType(materialId: string, workType: string, displayCatalog: LabCatalog) {
  const rule = (RULES as Record<string, MaterialRules | undefined>)[materialId];
  const allowed = rule ? rule.manufacturingRules[workType as WorkTypeId] ?? [] : displayCatalog.manufacturingMethods.map((m) => m.id);
  return displayCatalog.manufacturingMethods.filter((m) => allowed.includes(m.id));
}

function MiniChips({
  options,
  value,
  onChange,
  ar,
}: {
  options: { id: string; ar: string; en: string }[];
  value?: string;
  onChange: (id: string) => void;
  ar: boolean;
}) {
  return (
    <View className="flex-row flex-wrap gap-1.5">
      {options.map((o) => {
        const active = value === o.id;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            className={cn('rounded-lg border px-2.5 py-1.5', active ? 'border-primary bg-primary/10' : 'border-slate-200 bg-white')}
          >
            <Text className={cn('text-[11px] font-bold', active ? 'text-primary' : 'text-slate-600')}>{ar ? o.ar : o.en}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function NewLabOrderScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useUserRole();
  const labId = user?.uid ?? '';
  const { members = [] } = useLabMembers(labId);
  const designers = members.filter((m) => m.department === 'cad_designer');
  const ceramists = members.filter((m) => m.department === 'ceramist');

  const { catalog } = useLabCatalog(labId);
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<LabCatalog | null>(null);
  const [savingCatalog, setSavingCatalog] = useState(false);
  const [addingSection, setAddingSection] = useState<keyof Omit<LabCatalog, 'updatedAt'> | null>(null);
  const [newAr, setNewAr] = useState('');
  const [newEn, setNewEn] = useState('');
  const displayCatalog: LabCatalog = editMode && draft ? draft : catalog;

  const enterEditMode = () => {
    setDraft({
      materials: catalog.materials.map((m) => ({ ...m })),
      workTypes: catalog.workTypes.map((w) => ({ ...w })),
      manufacturingMethods: catalog.manufacturingMethods.map((m) => ({ ...m })),
    });
    setAddingSection(null);
    setEditMode(true);
  };

  const cancelEditMode = () => {
    setEditMode(false);
    setDraft(null);
    setAddingSection(null);
    setNewAr('');
    setNewEn('');
  };

  const saveEditMode = async () => {
    if (!labId || !draft) return;
    setSavingCatalog(true);
    try {
      await saveLabCatalog(labId, draft);
      setEditMode(false);
      setDraft(null);
    } catch {
      toast.error(ar ? 'فشل حفظ القائمة' : 'Failed to save the list');
    } finally {
      setSavingCatalog(false);
    }
  };

  const removeCatalogItem = (section: keyof Omit<LabCatalog, 'updatedAt'>, id: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const list = prev[section] as { id: string }[];
      return { ...prev, [section]: list.filter((x) => x.id !== id) } as LabCatalog;
    });
  };

  const confirmAddCatalogItem = () => {
    if (!addingSection || !newAr.trim()) return;
    const id = `custom_${Date.now().toString(36)}`;
    setDraft((prev) => {
      if (!prev) return prev;
      const item =
        addingSection === 'workTypes'
          ? { id, ar: newAr.trim(), en: newEn.trim() || newAr.trim(), category: 'advanced' as const }
          : { id, ar: newAr.trim(), en: newEn.trim() || newAr.trim() };
      return { ...prev, [addingSection]: [...(prev[addingSection] as { id: string }[]), item] } as LabCatalog;
    });
    setNewAr('');
    setNewEn('');
    setAddingSection(null);
  };

  const [patientName, setPatientName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Registered dentist accounts, loaded once so the lab can link a manually
  // typed doctor name to a real account. Without this link the case has no
  // `dentistId`, so it can never appear in that doctor's "تتبع الحالات"
  // screen (which filters strictly by that id) — it would only ever be
  // visible inside this lab's own case list.
  const [dentistAccounts, setDentistAccounts] = useState<{ id: string; name: string; clinicName: string }[]>([]);
  const [selectedDentistId, setSelectedDentistId] = useState<string | null>(null);
  const [showDoctorSuggestions, setShowDoctorSuggestions] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'user_roles'), where('accountType', '==', 'dentist')));
        setDentistAccounts(
          snap.docs
            .map((d) => {
              const u = d.data() as Record<string, unknown>;
              const name = [u.name, u.surname].filter(Boolean).join(' ').trim();
              return { id: String(u.userId ?? d.id), name, clinicName: String(u.clinicName ?? '') };
            })
            .filter((d) => d.name),
        );
      } catch {
        setDentistAccounts([]);
      }
    })();
  }, []);

  const doctorSuggestions = useMemo(() => {
    const q = doctorName.trim().toLowerCase();
    if (!q) return [];
    return dentistAccounts.filter((d) => d.name.toLowerCase().includes(q)).slice(0, 6);
  }, [doctorName, dentistAccounts]);

  const pickDentist = (d: { id: string; name: string; clinicName: string }) => {
    setDoctorName(d.name);
    if (d.clinicName) setClinicName(d.clinicName);
    setSelectedDentistId(d.id);
    setShowDoctorSuggestions(false);
  };

  const onDoctorNameChange = (v: string) => {
    setDoctorName(v);
    setShowDoctorSuggestions(true);
    // Any manual edit invalidates a previous selection — a stale id must
    // never survive attached to a now-different name.
    if (selectedDentistId) setSelectedDentistId(null);
  };

  // The actual link used on submit: an explicit dropdown pick always wins,
  // but even without one, a typed name + clinic that exactly match a
  // registered doctor account link automatically — the lab doesn't have to
  // remember to tap the suggestion for the case to reach that doctor's
  // "تتبع الحالات".
  const matchedDentist = useMemo(() => {
    if (selectedDentistId) return dentistAccounts.find((d) => d.id === selectedDentistId) ?? null;
    if (!doctorName.trim()) return null;
    return (
      dentistAccounts.find(
        (d) =>
          normalizeName(d.name) === normalizeName(doctorName) &&
          normalizeName(d.clinicName) === normalizeName(clinicName),
      ) ?? null
    );
  }, [selectedDentistId, dentistAccounts, doctorName, clinicName]);

  const [materialId, setMaterialId] = useState<MaterialId>('material.zirconia');
  const [workType, setWorkType] = useState<WorkTypeId | ''>('crown');
  const [manufacturingMethod, setManufacturingMethod] = useState('monolithic');
  const [frameworkCreation, setFrameworkCreation] = useState('conventional_casting');

  const [pricingMode, setPricingMode] = useState<'single' | 'mixed'>('single');
  const [singleQuantity, setSingleQuantity] = useState('1');
  const [singleUnitPrice, setSingleUnitPrice] = useState('');
  const [singleCurrency, setSingleCurrency] = useState<'USD' | 'IQD'>('IQD');
  const [pricingItems, setPricingItems] = useState<PricingItem[]>([
    { id: uid(), name: '', quantity: 1, unitPrice: 0, currency: 'IQD' },
  ]);

  const [shadeTab, setShadeTab] = useState<ShadeTab>('classical');
  const [shade, setShade] = useState('');
  const [customShade, setCustomShade] = useState('');

  const [implantCompany, setImplantCompany] = useState('');
  const [implantSystem, setImplantSystem] = useState('');
  const [implantConnection, setImplantConnection] = useState('');
  const [implantPlatform, setImplantPlatform] = useState('');
  const [implantRetention, setImplantRetention] = useState('screw');

  const [alignerTreatmentType, setAlignerTreatmentType] = useState('comprehensive');
  const [alignerArch, setAlignerArch] = useState('both');
  const [alignerScans, setAlignerScans] = useState('');
  const [alignerCount, setAlignerCount] = useState('10');
  const [alignerWearProtocol, setAlignerWearProtocol] = useState('14days');

  const [titaniumFrameworkType, setTitaniumFrameworkType] = useState('fixed_framework');

  const [notes, setNotes] = useState('');
  const [designerId, setDesignerId] = useState('');
  const [ceramistId, setCeramistId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isClearAligner = materialId === 'material.clear_aligner';
  const isTitaniumBar = materialId === 'material.titanium_bar';
  const isPFM = materialId === 'material.pfm';
  const isZirconia = materialId === 'material.zirconia';

  // A material outside the fixed `RULES` map (a lab-custom addition) has no
  // compatibility rule, so — matching web — every catalog work type / method
  // is allowed for it instead of none.
  const rulesEntry = (RULES as Record<string, MaterialRules | undefined>)[materialId];
  const allowedWorkTypes = rulesEntry ? rulesEntry.allowedWorkTypes : (displayCatalog.workTypes.map((w) => w.id) as WorkTypeId[]);
  const workTypes = displayCatalog.workTypes.filter((wt) => allowedWorkTypes.includes(wt.id as WorkTypeId));
  const allowedMethods = rulesEntry ? (rulesEntry.manufacturingRules[workType as WorkTypeId] ?? []) : displayCatalog.manufacturingMethods.map((m) => m.id);
  const methods = displayCatalog.manufacturingMethods.filter((m) => allowedMethods.includes(m.id));
  const isImplantCase = isTitaniumBar || IMPLANT_WORK_TYPES.includes(workType as WorkTypeId);
  const materialIcon = (id: string) => MATERIALS.find((m) => m.id === id)?.icon ?? Gem;

  const selectMaterial = (id: MaterialId) => {
    if (editMode) return;
    setMaterialId(id);
    const rule = (RULES as Record<string, MaterialRules | undefined>)[id];
    const first = rule?.allowedWorkTypes[0] ?? (displayCatalog.workTypes[0]?.id as WorkTypeId | undefined);
    if (first) {
      setWorkType(first);
      setManufacturingMethod(rule?.manufacturingRules[first]?.[0] ?? '');
    } else {
      setWorkType('');
      setManufacturingMethod('');
    }
  };

  const selectWorkType = (wt: WorkTypeId) => {
    if (editMode) return;
    setWorkType(wt);
    const rule = (RULES as Record<string, MaterialRules | undefined>)[materialId];
    setManufacturingMethod(rule?.manufacturingRules[wt]?.[0] ?? '');
  };

  const itemTotalIQD = (it: PricingItem) =>
    (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0) * (it.currency === 'IQD' ? 1 : USD_RATE);
  const singleUnits = Number(singleQuantity) || 0;
  const singlePriceIQD = (Number(singleUnitPrice) || 0) * (singleCurrency === 'IQD' ? 1 : USD_RATE);
  const units =
    pricingMode === 'single' ? singleUnits : pricingItems.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
  const subtotalIQD =
    pricingMode === 'single' ? singleUnits * singlePriceIQD : pricingItems.reduce((s, it) => s + itemTotalIQD(it), 0);
  const finalTotalUSD = subtotalIQD / USD_RATE;
  const grandTotalLabel =
    pricingMode === 'single' && singleCurrency === 'USD'
      ? `$${finalTotalUSD.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
      : `${subtotalIQD.toLocaleString('en-US')} ${ar ? 'د.ع' : 'IQD'}`;

  const updatePricingItem = (id: string, patch: Partial<PricingItem>) =>
    setPricingItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const addPricingItem = () =>
    setPricingItems((prev) => [
      ...prev,
      {
        id: uid(),
        name: '',
        quantity: 1,
        unitPrice: 0,
        currency: 'IQD',
        material: materialId,
        workType: workType || undefined,
        manufacturingMethod: manufacturingMethod || undefined,
      },
    ]);
  // Unit 1 (index 0) always mirrors the "2. اختيار المادة والتصنيع" picker
  // above and can never be removed — only extra units (which carry their own
  // material selection) can. Without this, removing unit 1 would shift a
  // later unit into its slot and silently discard that unit's own material
  // in favor of whatever unit 1's picker happened to show.
  const removePricingItem = (id: string) =>
    setPricingItems((prev) => (prev.length > 1 && prev[0]?.id !== id ? prev.filter((it) => it.id !== id) : prev));

  const handleSubmit = () => {
    if (!patientName.trim()) {
      toast.error(ar ? 'يرجى إدخال اسم المريض' : 'Enter the patient name');
      return;
    }
    if (!doctorName.trim()) {
      toast.error(ar ? 'يرجى إدخال اسم الطبيب' : 'Enter the doctor name');
      return;
    }
    if (!deliveryDate) {
      toast.error(ar ? 'يرجى تحديد تاريخ الإخراج' : 'Select a delivery date');
      return;
    }

    setSubmitting(true);
    const payload: CombinedLabOrder = {
      patientName: patientName.trim(),
      doctorName: doctorName.trim(),
      clinicName,
      deliveryDate,
      material: materialId,
      workType: workType || undefined,
      manufacturingMethod: manufacturingMethod || undefined,
      frameworkCreation: isPFM ? frameworkCreation : undefined,
      pricingMode,
      currency: pricingMode === 'single' ? singleCurrency : 'IQD',
      pricingItems:
        pricingMode === 'mixed'
          ? pricingItems.map((it, i) => ({
              ...it,
              quantity: Number(it.quantity) || 0,
              unitPrice: Number(it.unitPrice) || 0,
              // Unit 1 always mirrors the "2. اختيار المادة والتصنيع" picker
              // above — that's the only UI controlling its material — while
              // every extra unit keeps its own chips' selection.
              material: i === 0 ? materialId : it.material ?? materialId,
              workType: i === 0 ? workType || undefined : it.workType ?? (workType || undefined),
              manufacturingMethod: i === 0 ? manufacturingMethod || undefined : it.manufacturingMethod ?? (manufacturingMethod || undefined),
              frameworkCreation:
                i === 0
                  ? isPFM
                    ? frameworkCreation
                    : undefined
                  : (it.material ?? materialId) === 'material.pfm'
                    ? it.frameworkCreation
                    : undefined,
            }))
          : undefined,
      unitsCount: units,
      unitPriceIQD: units > 0 ? subtotalIQD / units : 0,
      subtotalIQD,
      discountAmountIQD: 0,
      finalTotalIQD: subtotalIQD,
      finalTotalUSD,
      shade: shadeTab === 'others' ? customShade.trim() : shade || '',
      notes,
      implantCompany: isImplantCase ? implantCompany : undefined,
      implantSystem: isImplantCase ? implantSystem : undefined,
      implantConnection: isImplantCase ? implantConnection : undefined,
      implantPlatform: isImplantCase ? implantPlatform : undefined,
      implantRetention: isImplantCase ? implantRetention : undefined,
      alignerTreatmentType: isClearAligner ? alignerTreatmentType : undefined,
      alignerArch: isClearAligner ? alignerArch : undefined,
      alignerScans: isClearAligner ? alignerScans : undefined,
      alignerCount: isClearAligner ? alignerCount : undefined,
      alignerWearProtocol: isClearAligner ? alignerWearProtocol : undefined,
      titaniumFrameworkType: isTitaniumBar ? titaniumFrameworkType : undefined,
      designerId: designerId || undefined,
      designerName: designers.find((m) => m.id === designerId)?.name,
      ceramistId: ceramistId || undefined,
      ceramistName: ceramists.find((m) => m.id === ceramistId)?.name,
      dentistId: matchedDentist?.id,
    };

    try {
      // "new" — the sensible initial status for a lab-created case. Web's own
      // dashboard hardcodes "delayed" here (a pre-existing quirk in its
      // separate, non-shared object-building code); this instead reuses the
      // canonical `buildInternalOrder` the confirm-incoming-order flow uses,
      // with the status that actually matches "جديد".
      addOrder(buildInternalOrder(payload, 'new'));
      toast.success(ar ? 'تمت إضافة الطلب' : 'Order added');
      router.back();
    } catch {
      toast.error(ar ? 'فشلت إضافة الطلب' : 'Failed to add the order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <View className="gap-4 pb-4">
        <Section title={ar ? '1. بيانات الطلب الأساسية' : '1. Basic order data'}>
          <Field label={ar ? 'اسم المريض' : 'Patient name'} icon={<User size={14} color="#2563EB" />} required>
            <Input value={patientName} onChangeText={setPatientName} placeholder={ar ? 'أدخل اسم المريض' : 'Enter patient name'} />
          </Field>
          <Field label={ar ? 'اسم الطبيب' : 'Doctor name'} icon={<Stethoscope size={14} color="#2563EB" />} required>
            <Input
              value={doctorName}
              onChangeText={onDoctorNameChange}
              onFocus={() => setShowDoctorSuggestions(true)}
              placeholder={ar ? 'أدخل اسم الطبيب' : 'Enter doctor name'}
            />
            {showDoctorSuggestions && doctorSuggestions.length > 0 && (
              <View className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {doctorSuggestions.map((d) => (
                  <Pressable
                    key={d.id}
                    onPress={() => pickDentist(d)}
                    className="border-b border-slate-100 px-3 py-2.5 last:border-b-0"
                  >
                    <Text className="text-xs font-bold text-slate-800">{d.name}</Text>
                    {!!d.clinicName && <Text className="text-[11px] text-slate-400">{d.clinicName}</Text>}
                  </Pressable>
                ))}
              </View>
            )}
            {doctorName.trim() ? (
              matchedDentist ? (
                <Text className="text-[11px] font-semibold text-emerald-600">
                  {ar ? '✓ مرتبط بحساب طبيب مسجل — ستظهر الحالة في تتبع حالاته' : "✓ Linked to a registered doctor account — will appear in their case tracking"}
                </Text>
              ) : (
                <Text className="text-[11px] font-semibold text-amber-600">
                  {ar
                    ? '⚠ غير مرتبط بحساب مسجل — تأكد من تطابق اسم الطبيب واسم العيادة تمامًا مع حسابه، أو اخترْه من القائمة'
                    : "⚠ Not linked — make the doctor name and clinic name match their account exactly, or pick it from the list"}
                </Text>
              )
            ) : null}
          </Field>
          <Field label={ar ? 'اسم العيادة' : 'Clinic name'} icon={<Building2 size={14} color="#2563EB" />}>
            <Input value={clinicName} onChangeText={setClinicName} placeholder={ar ? 'أدخل اسم العيادة' : 'Enter clinic name'} />
          </Field>
          <Field label={ar ? 'تاريخ الإخراج المتوقع' : 'Expected delivery date'} icon={<Calendar size={14} color="#2563EB" />} required>
            <Pressable onPress={() => setShowDatePicker(true)} className="h-12 justify-center rounded-xl border border-slate-200 bg-slate-50 px-4">
              <Text className={cn('text-sm font-medium', deliveryDate ? 'text-slate-800' : 'text-slate-400')}>
                {deliveryDate || (ar ? 'اختر تاريخ التسليم' : 'Select delivery date')}
              </Text>
            </Pressable>
          </Field>
        </Section>

        <Section
          title={ar ? '2. اختيار المادة والتصنيع' : '2. Material & manufacturing'}
          headerRight={
            editMode ? (
              <View className="flex-row gap-1.5">
                <Pressable onPress={saveEditMode} disabled={savingCatalog} className="flex-row items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5">
                  <Check size={12} color="#FFFFFF" />
                  <Text className="text-[11px] font-bold text-white">{savingCatalog ? (ar ? 'جارٍ الحفظ...' : 'Saving...') : ar ? 'حفظ القائمة' : 'Save list'}</Text>
                </Pressable>
                <Pressable onPress={cancelEditMode} className="rounded-lg border border-slate-200 px-2.5 py-1.5">
                  <Text className="text-[11px] font-bold text-slate-500">{ar ? 'إلغاء' : 'Cancel'}</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={enterEditMode} className="flex-row items-center gap-1 rounded-lg border border-primary/30 px-2.5 py-1.5">
                <Pencil size={12} color="#2563EB" />
                <Text className="text-[11px] font-bold text-primary">{ar ? 'تعديل القائمة' : 'Edit list'}</Text>
              </Pressable>
            )
          }
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold text-slate-600">{ar ? 'المادة الأساسية' : 'Base material'}</Text>
            {editMode && (
              <Pressable onPress={() => { setAddingSection('materials'); setNewAr(''); setNewEn(''); }} className="flex-row items-center gap-1">
                <Plus size={12} color="#2563EB" />
                <Text className="text-[11px] font-bold text-primary">{ar ? 'إضافة مادة' : 'Add material'}</Text>
              </Pressable>
            )}
          </View>
          <View className="flex-row flex-wrap gap-2">
            {displayCatalog.materials.map((m) => {
              const active = materialId === m.id;
              const Icon = materialIcon(m.id);
              return (
                <View
                  key={m.id}
                  className={cn('w-[48%] flex-row items-stretch overflow-hidden rounded-xl border', active ? 'border-primary bg-primary/10' : 'border-slate-200 bg-white')}
                >
                  <Pressable onPress={() => selectMaterial(m.id as MaterialId)} className="min-w-0 flex-1 flex-row items-center gap-2 p-3">
                    <Icon size={16} color={active ? '#2563EB' : '#94A3B8'} />
                    <Text numberOfLines={1} className={cn('flex-1 text-xs font-bold', active ? 'text-primary' : 'text-slate-700')}>
                      {ar ? m.ar : m.en}
                    </Text>
                  </Pressable>
                  {editMode && (
                    <Pressable onPress={() => removeCatalogItem('materials', m.id)} className="items-center justify-center border-s border-slate-200 bg-rose-50 px-2">
                      <Trash2 size={13} color="#F43F5E" />
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
          {editMode && addingSection === 'materials' && (
            <AddCatalogRow ar={ar} newAr={newAr} newEn={newEn} setNewAr={setNewAr} setNewEn={setNewEn} onConfirm={confirmAddCatalogItem} onCancel={() => setAddingSection(null)} placeholder={ar ? 'اسم المادة الجديدة' : 'New material name'} />
          )}

          {isClearAligner ? (
            <View className="gap-3 rounded-xl border border-sky-100 bg-sky-50/40 p-3">
              <Text className="text-xs font-bold text-slate-800">{ar ? 'إعدادات التقويم الشفاف' : 'Clear aligner settings'}</Text>
              <Field label={ar ? 'نوع العلاج' : 'Treatment type'}>
                <Chips options={ALIGNER_TREATMENT_OPTIONS} value={alignerTreatmentType} onChange={setAlignerTreatmentType} ar={ar} />
              </Field>
              <Field label={ar ? 'القوس' : 'Arch'}>
                <Chips options={ALIGNER_ARCH_OPTIONS} value={alignerArch} onChange={setAlignerArch} ar={ar} />
              </Field>
              <Field label={ar ? 'المسحات' : 'Scans'}>
                <Input value={alignerScans} onChangeText={setAlignerScans} placeholder="STL / Intraoral Scan" />
              </Field>
              <Field label={ar ? 'عدد التقويمات' : 'Aligner count'}>
                <Input value={alignerCount} onChangeText={setAlignerCount} keyboardType="number-pad" />
              </Field>
              <Field label={ar ? 'بروتوكول الارتداء' : 'Wear protocol'}>
                <Chips options={ALIGNER_WEAR_OPTIONS} value={alignerWearProtocol} onChange={setAlignerWearProtocol} ar={ar} />
              </Field>
            </View>
          ) : isTitaniumBar ? (
            <View className="gap-3 rounded-xl border border-sky-100 bg-sky-50/40 p-3">
              <Text className="text-xs font-bold text-slate-800">{ar ? 'إعدادات تيتانيوم بار' : 'Titanium bar settings'}</Text>
              <Chips options={TITANIUM_FRAMEWORK_OPTIONS} value={titaniumFrameworkType} onChange={setTitaniumFrameworkType} ar={ar} />
            </View>
          ) : (
            <>
              <View className="mt-1 flex-row items-center justify-between">
                <Text className="text-xs font-bold text-slate-600">{ar ? 'نوع العمل' : 'Work type'}</Text>
                {editMode && (
                  <Pressable onPress={() => { setAddingSection('workTypes'); setNewAr(''); setNewEn(''); }} className="flex-row items-center gap-1">
                    <Plus size={12} color="#2563EB" />
                    <Text className="text-[11px] font-bold text-primary">{ar ? 'إضافة نوع عمل' : 'Add work type'}</Text>
                  </Pressable>
                )}
              </View>
              {isZirconia ? (
                <View className="gap-3">
                  <View>
                    <Text className="mb-1.5 text-[10px] font-semibold text-slate-400">{ar ? 'أنواع العمل الأساسية' : 'Core work types'}</Text>
                    <CatalogChips
                      options={workTypes.filter((w) => w.category === 'core')}
                      value={workType}
                      onChange={(o) => selectWorkType(o.id as WorkTypeId)}
                      ar={ar}
                      editable={editMode}
                      onDelete={(id) => removeCatalogItem('workTypes', id)}
                    />
                  </View>
                  <View>
                    <Text className="mb-1.5 text-[10px] font-semibold text-slate-400">{ar ? 'أنواع العمل المتقدمة' : 'Advanced work types'}</Text>
                    <CatalogChips
                      options={workTypes.filter((w) => w.category === 'advanced')}
                      value={workType}
                      onChange={(o) => selectWorkType(o.id as WorkTypeId)}
                      ar={ar}
                      editable={editMode}
                      onDelete={(id) => removeCatalogItem('workTypes', id)}
                    />
                  </View>
                </View>
              ) : (
                <CatalogChips
                  options={workTypes}
                  value={workType}
                  onChange={(o) => selectWorkType(o.id as WorkTypeId)}
                  ar={ar}
                  editable={editMode}
                  onDelete={(id) => removeCatalogItem('workTypes', id)}
                />
              )}
              {editMode && addingSection === 'workTypes' && (
                <AddCatalogRow ar={ar} newAr={newAr} newEn={newEn} setNewAr={setNewAr} setNewEn={setNewEn} onConfirm={confirmAddCatalogItem} onCancel={() => setAddingSection(null)} placeholder={ar ? 'اسم نوع العمل الجديد' : 'New work type name'} />
              )}

              <View className="mt-1 flex-row items-center justify-between">
                <Text className="text-xs font-bold text-slate-600">{ar ? 'طريقة التصنيع' : 'Manufacturing method'}</Text>
                {editMode && (
                  <Pressable onPress={() => { setAddingSection('manufacturingMethods'); setNewAr(''); setNewEn(''); }} className="flex-row items-center gap-1">
                    <Plus size={12} color="#2563EB" />
                    <Text className="text-[11px] font-bold text-primary">{ar ? 'إضافة طريقة تصنيع' : 'Add method'}</Text>
                  </Pressable>
                )}
              </View>
              <CatalogChips
                options={methods}
                value={manufacturingMethod}
                onChange={(o) => setManufacturingMethod(o.id)}
                ar={ar}
                editable={editMode}
                onDelete={(id) => removeCatalogItem('manufacturingMethods', id)}
              />
              {editMode && addingSection === 'manufacturingMethods' && (
                <AddCatalogRow ar={ar} newAr={newAr} newEn={newEn} setNewAr={setNewAr} setNewEn={setNewEn} onConfirm={confirmAddCatalogItem} onCancel={() => setAddingSection(null)} placeholder={ar ? 'اسم طريقة التصنيع الجديدة' : 'New method name'} />
              )}

              {isPFM && (
                <>
                  <Text className="mt-1 text-xs font-bold text-slate-600">{ar ? 'طريقة إنشاء الهيكل المعدني' : 'Metal framework creation'}</Text>
                  <Chips options={FRAMEWORK_CREATION} value={frameworkCreation} onChange={setFrameworkCreation} ar={ar} />
                </>
              )}
            </>
          )}

          {isImplantCase && (
            <View className="gap-3 rounded-xl border border-sky-100 bg-sky-50/40 p-3">
              <Text className="text-xs font-bold text-slate-800">{ar ? 'تفاصيل الزرعة' : 'Implant details'}</Text>
              <Field label={ar ? 'شركة الزرعة' : 'Implant company'}>
                <Input value={implantCompany} onChangeText={setImplantCompany} placeholder="Straumann, Nobel, ..." />
              </Field>
              <Field label={ar ? 'نظام الزرعة' : 'Implant system'}>
                <Input value={implantSystem} onChangeText={setImplantSystem} placeholder={ar ? 'نظام الزرعة' : 'Implant system'} />
              </Field>
              <Field label={ar ? 'الربط (Connection)' : 'Connection'}>
                <Chips options={CONNECTION_OPTIONS} value={implantConnection} onChange={setImplantConnection} ar={ar} />
              </Field>
              <Field label={ar ? 'المنصة (Platform)' : 'Platform'}>
                <Input value={implantPlatform} onChangeText={setImplantPlatform} placeholder="3.5 / 4.3" />
              </Field>
              <Field label={ar ? 'طريقة التثبيت' : 'Retention'}>
                <Chips options={RETENTION_OPTIONS} value={implantRetention} onChange={setImplantRetention} ar={ar} />
              </Field>
            </View>
          )}
        </Section>

        <View pointerEvents={editMode ? 'none' : 'auto'} style={editMode ? { opacity: 0.4 } : undefined}>
        <Section title={ar ? 'درجة اللون (Shade)' : 'Shade'}>
          <View className="flex-row flex-wrap gap-1.5">
            {SHADE_TABS.map((t) => {
              const active = shadeTab === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setShadeTab(t.id)}
                  className={cn('h-9 items-center justify-center rounded-full border px-3.5', active ? 'border-primary bg-primary' : 'border-slate-200 bg-white')}
                >
                  <Text className={cn('text-xs font-bold', active ? 'text-white' : 'text-slate-600')}>{ar ? t.ar : t.en}</Text>
                </Pressable>
              );
            })}
          </View>
          {shadeTab === 'others' ? (
            <Input value={customShade} onChangeText={setCustomShade} placeholder={ar ? 'أدخل درجة لون مخصصة…' : 'Enter a custom shade…'} />
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {(shadeTab === 'classical' ? VITA_SHADES : shadeTab === '3d' ? VITA_3D_SHADES : VITA_BLEACH_SHADES).map((s) => {
                const active = shade === s.code;
                return (
                  <Pressable
                    key={s.code}
                    onPress={() => setShade(active ? '' : s.code)}
                    className="items-center gap-1"
                  >
                    <View
                      className={cn('h-9 w-9 items-center justify-center rounded-full border-2', active ? 'border-primary' : 'border-slate-200')}
                      style={{ backgroundColor: s.hex }}
                    />
                    <Text className={cn('text-[9px] font-bold', active ? 'text-primary' : 'text-slate-500')}>{s.code}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </Section>
        </View>

        <View pointerEvents={editMode ? 'none' : 'auto'} style={editMode ? { opacity: 0.4 } : undefined}>
        <Section title={ar ? '3. التسعير والإجمالي' : '3. Pricing & total'}>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => setPricingMode('single')}
              className={cn('flex-1 rounded-xl border p-3', pricingMode === 'single' ? 'border-primary bg-primary/10' : 'border-slate-200 bg-white')}
            >
              <Text className={cn('text-xs font-bold', pricingMode === 'single' ? 'text-primary' : 'text-slate-700')}>
                {ar ? 'وحدة واحدة' : 'Single unit'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setPricingMode('mixed')}
              className={cn('flex-1 rounded-xl border p-3', pricingMode === 'mixed' ? 'border-primary bg-primary/10' : 'border-slate-200 bg-white')}
            >
              <Text className={cn('text-xs font-bold', pricingMode === 'mixed' ? 'text-primary' : 'text-slate-700')}>
                {ar ? 'وحدات متعددة' : 'Mixed units'}
              </Text>
            </Pressable>
          </View>

          {pricingMode === 'single' ? (
            <View className="gap-3">
              <Field label={ar ? 'عدد الوحدات' : 'Units'}>
                <Input value={singleQuantity} onChangeText={setSingleQuantity} keyboardType="number-pad" />
              </Field>
              <Field label={ar ? 'سعر الوحدة' : 'Unit price'}>
                <Input
                  value={formatThousands(singleUnitPrice)}
                  onChangeText={(v) => setSingleUnitPrice(stripNonDigits(v))}
                  keyboardType="number-pad"
                  style={{ writingDirection: 'ltr' }}
                />
              </Field>
              <Field label={ar ? 'العملة' : 'Currency'}>
                <View className="flex-row overflow-hidden rounded-xl border border-slate-200">
                  <Pressable onPress={() => setSingleCurrency('USD')} className={cn('flex-1 items-center py-2.5', singleCurrency === 'USD' ? 'bg-primary' : 'bg-white')}>
                    <Text className={cn('text-xs font-bold', singleCurrency === 'USD' ? 'text-white' : 'text-slate-500')}>$</Text>
                  </Pressable>
                  <Pressable onPress={() => setSingleCurrency('IQD')} className={cn('flex-1 items-center py-2.5', singleCurrency === 'IQD' ? 'bg-primary' : 'bg-white')}>
                    <Text className={cn('text-xs font-bold', singleCurrency === 'IQD' ? 'text-white' : 'text-slate-500')}>IQD</Text>
                  </Pressable>
                </View>
              </Field>
            </View>
          ) : (
            <View className="gap-2.5">
              {pricingItems.map((it, i) => (
                <View key={it.id} className="gap-2 rounded-xl border border-slate-200 p-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[11px] font-bold text-slate-500">
                      {ar ? `وحدة ${i + 1}` : `Unit ${i + 1}`}
                    </Text>
                    <Pressable onPress={() => removePricingItem(it.id)} disabled={i === 0} className="h-7 w-7 items-center justify-center rounded-lg bg-rose-50">
                      <Trash2 size={13} color="#F43F5E" />
                    </Pressable>
                  </View>
                  {i > 0 && (
                    <View className="gap-2 rounded-lg bg-slate-50 p-2.5">
                      <Text className="text-[10px] font-bold text-slate-500">{ar ? 'المادة' : 'Material'}</Text>
                      <MiniChips
                        options={displayCatalog.materials}
                        value={it.material ?? materialId}
                        onChange={(id) => {
                          const nextWt = workTypesForMaterial(id, displayCatalog)[0]?.id;
                          updatePricingItem(it.id, {
                            material: id,
                            workType: nextWt,
                            manufacturingMethod: nextWt ? methodsForMaterialWorkType(id, nextWt, displayCatalog)[0]?.id : undefined,
                          });
                        }}
                        ar={ar}
                      />
                      <Text className="text-[10px] font-bold text-slate-500">{ar ? 'نوع العمل' : 'Work type'}</Text>
                      <MiniChips
                        options={workTypesForMaterial(it.material ?? materialId, displayCatalog)}
                        value={it.workType}
                        onChange={(id) =>
                          updatePricingItem(it.id, {
                            workType: id,
                            manufacturingMethod: methodsForMaterialWorkType(it.material ?? materialId, id, displayCatalog)[0]?.id,
                          })
                        }
                        ar={ar}
                      />
                      <Text className="text-[10px] font-bold text-slate-500">{ar ? 'طريقة التصنيع' : 'Manufacturing'}</Text>
                      <MiniChips
                        options={methodsForMaterialWorkType(it.material ?? materialId, it.workType ?? '', displayCatalog)}
                        value={it.manufacturingMethod}
                        onChange={(id) => updatePricingItem(it.id, { manufacturingMethod: id })}
                        ar={ar}
                      />
                      {(it.material ?? materialId) === 'material.pfm' && (
                        <>
                          <Text className="text-[10px] font-bold text-slate-500">{ar ? 'إنشاء الهيكل المعدني' : 'Metal framework'}</Text>
                          <MiniChips
                            options={FRAMEWORK_CREATION}
                            value={it.frameworkCreation}
                            onChange={(id) => updatePricingItem(it.id, { frameworkCreation: id })}
                            ar={ar}
                          />
                        </>
                      )}
                    </View>
                  )}
                  <Input value={it.name} onChangeText={(v) => updatePricingItem(it.id, { name: v })} placeholder={ar ? 'مثال: تاج فوق زرعة' : 'e.g. Implant crown'} />
                  <View className="flex-row gap-2">
                    <Input
                      className="flex-1"
                      value={String(it.quantity)}
                      onChangeText={(v) => updatePricingItem(it.id, { quantity: Number(v) || 0 })}
                      keyboardType="number-pad"
                      placeholder={ar ? 'العدد' : 'Qty'}
                    />
                    <Input
                      className="flex-1"
                      value={it.unitPrice ? formatThousands(String(it.unitPrice)) : ''}
                      onChangeText={(v) => updatePricingItem(it.id, { unitPrice: Number(stripNonDigits(v)) || 0 })}
                      keyboardType="number-pad"
                      placeholder={ar ? 'السعر' : 'Price'}
                      style={{ writingDirection: 'ltr' }}
                    />
                    <Pressable
                      onPress={() => updatePricingItem(it.id, { currency: it.currency === 'IQD' ? 'USD' : 'IQD' })}
                      className="h-12 w-16 items-center justify-center rounded-xl border border-slate-200 bg-slate-50"
                    >
                      <Text className="text-xs font-bold text-slate-700">{it.currency === 'IQD' ? 'IQD' : '$'}</Text>
                    </Pressable>
                  </View>
                  <Text className="text-end text-xs font-bold text-primary" style={{ writingDirection: 'ltr' }}>
                    {itemTotalIQD(it).toLocaleString('en-US')} {ar ? 'د.ع' : 'IQD'}
                  </Text>
                </View>
              ))}
              <Pressable onPress={addPricingItem} className="h-11 items-center justify-center rounded-xl border-2 border-dashed border-primary/30">
                <Text className="text-xs font-bold text-primary">{ar ? '+ إضافة وحدة' : '+ Add unit'}</Text>
              </Pressable>
              <View className="flex-row items-center justify-between rounded-xl bg-slate-50 p-3">
                <Text className="text-xs font-bold text-slate-600">
                  {ar ? 'إجمالي الوحدات' : 'Total units'}: <Text className="text-primary">{units}</Text>
                </Text>
              </View>
            </View>
          )}

          <Field label={ar ? 'ملاحظات إضافية للمختبر (اختياري)' : 'Additional notes for the lab (optional)'}>
            <Input
              value={notes}
              onChangeText={setNotes}
              placeholder={ar ? 'أدخل أي ملاحظات خاصة بتصميم لون السن أو ملاحظات طبية…' : 'Any notes about shade design or clinical details…'}
              multiline
            />
          </Field>

          <View className="flex-row items-center justify-between rounded-xl border border-sky-100 bg-sky-50/50 p-3.5">
            <Text className="text-xs text-slate-500">{ar ? 'الإجمالي النهائي' : 'Grand total'}</Text>
            <Text className="text-base font-extrabold text-primary" style={{ writingDirection: 'ltr' }}>{grandTotalLabel}</Text>
          </View>
        </Section>
        </View>

        <Section title={ar ? '4. تخصيص الكادر الفني' : '4. Technical staff assignment'}>
          <Field label={ar ? 'الدايزنر (المصمم)' : 'Designer'} icon={<PenTool size={14} color="#2563EB" />}>
            <Chips
              options={designers.map((m) => ({ id: m.id, ar: m.name, en: m.name }))}
              value={designerId}
              onChange={setDesignerId}
              ar={ar}
            />
          </Field>
          <Field label={ar ? 'السراميست' : 'Ceramist'} icon={<Palette size={14} color="#DB2777" />}>
            <Chips
              options={ceramists.map((m) => ({ id: m.id, ar: m.name, en: m.name }))}
              value={ceramistId}
              onChange={setCeramistId}
              ar={ar}
            />
          </Field>
          {(designers.length === 0 || ceramists.length === 0) && (
            <Text className="text-[11px] text-slate-400">
              {ar ? 'يمكن إضافة أعضاء الكادر من صفحة كادر المختبر لتظهر في هذه القوائم.' : 'Add staff from the lab team page for them to appear here.'}
            </Text>
          )}
        </Section>

        <Button title={ar ? 'حفظ وإضافة الطلب' : 'Save & add order'} loading={submitting} disabled={editMode} onPress={handleSubmit} />
      </View>

      <CalendarPickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedDate={deliveryDate || toDateStr(new Date())}
        onSelect={(ds) => {
          setDeliveryDate(ds);
          setShowDatePicker(false);
        }}
      />
    </Screen>
  );
}
