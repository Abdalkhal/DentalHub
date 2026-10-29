import { useState } from 'react';
import { Linking, Alert, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  Activity,
  Baby,
  Brush,
  CalendarDays,
  Camera,
  Check,
  CircleDot,
  ClipboardPlus,
  Cloud,
  Grid3x3,
  HeartPulse,
  LayoutGrid,
  Pencil,
  Phone,
  Plus,
  Grid2x2,
  RotateCcw,
  Scan,
  Share2,
  Shield,
  Sparkles,
  Syringe,
  Trash2,
  Wallet,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Screen, Card, Button, Input, Text } from '@/components/ui';
import { CalendarPickerModal } from '@/components/CalendarPickerModal';
import { XrayGallery, useXrayUpload } from '@/components/PatientXrays';
import { DentalArch, LEGEND_ORDER, TOOTH_META } from '@/components/DentalArch';
import { ArchViewer, ARCH_ZOOM_MIN, ARCH_ZOOM_MAX } from '@/components/ArchViewer';
import {
  usePatients,
  updatePatient,
  getLog,
  addVisit,
  removeVisit,
  setTooth,
  addPayment,
  removePayment,
  paidTotal,
  getPlan,
  addPlanStep,
  updatePlanStep,
  removePlanStep,
  cyclePlanStep,
  planCurrency,
  formatMoney,
  formatMoneyTotals,
  formatAmountInput,
  parseAmountInput,
  type FeeCurrency,
  planTotals,
  type Patient,
  type PlanStep,
  parseToothList,
  type PatientStatus,
  type PlanStatus,
  type ToothStatus,
} from '@/lib/patientsStore';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { sharePdf, patientRecordHtml } from '@/lib/print';
import { toast } from '@/lib/toast';

type Sub = { ar: string; en: string };

const BRANCHES: Array<{ key: string; ar: string; en: string; icon: LucideIcon; bg: string; fg: string; subs: Sub[] }> = [
  { key: 'radio', ar: 'أشعة الأسنان', en: 'Radiology', icon: Camera, bg: '#E0F2FE', fg: '#0369A1', subs: [] },
  {
    key: 'pedo', ar: 'الأسنان اللبنية', en: 'Pediatric', icon: Baby, bg: '#D1FAE5', fg: '#047857',
    subs: [
      { ar: 'أسنان لبنية (Primary Teeth)', en: 'Primary teeth' },
      { ar: 'حشوات الأطفال', en: 'Pediatric fillings' },
      { ar: 'بتر العصب (Pulpotomy)', en: 'Pulpotomy' },
      { ar: 'حافظ مسافة (Space Maintainer)', en: 'Space maintainer' },
    ],
  },
  {
    key: 'scaling', ar: 'تنظيف الأسنان', en: 'Scaling', icon: Brush, bg: '#CFFAFE', fg: '#0E7490',
    subs: [
      { ar: 'إزالة الجير (Scaling)', en: 'Scaling' },
      { ar: 'التلميع (Polishing)', en: 'Polishing' },
    ],
  },
  {
    key: 'perio', ar: 'علاج اللثة', en: 'Periodontics', icon: HeartPulse, bg: '#FFE4E6', fg: '#BE123C',
    subs: [
      { ar: 'تنظيف لثة عميق (Root Planing)', en: 'Root planing' },
      { ar: 'قص وتجميل اللثة (Gingivectomy)', en: 'Gingivectomy' },
      { ar: 'علاج الجيوب اللثوية', en: 'Periodontal pockets treatment' },
    ],
  },
  {
    key: 'preventive', ar: 'العلاجات الوقائية', en: 'Preventive', icon: Shield, bg: '#DCFCE7', fg: '#15803D',
    subs: [
      { ar: 'تطبيق الفلورايد (Fluoride Application)', en: 'Fluoride application' },
      { ar: 'سد الشقوق (Fissure Sealants)', en: 'Fissure sealants' },
    ],
  },
  {
    key: 'fillings', ar: 'حشوات الأسنان', en: 'Fillings', icon: ClipboardPlus, bg: '#EDE9FE', fg: '#6D28D9',
    subs: [
      { ar: 'حشوة كاريز تجميلية (Composite)', en: 'Composite filling' },
      { ar: 'حشوة مؤقتة', en: 'Temporary filling' },
      { ar: 'حشوة زجاجية (GIC)', en: 'GIC filling' },
    ],
  },
  {
    key: 'endo', ar: 'علاج العصب', en: 'Endodontics', icon: CircleDot, bg: '#FFEDD5', fg: '#C2410C',
    subs: [
      { ar: 'علاج عصب (Root Canal Treatment)', en: 'Root canal treatment' },
      { ar: 'إعادة علاج عصب (Re-RCT)', en: 'Re-RCT' },
      { ar: 'حشو القناة الجذرية', en: 'Root canal obturation' },
    ],
  },
  {
    key: 'prostho', ar: 'التركيبات والجسور', en: 'Prosthodontics', icon: LayoutGrid, bg: '#CCFBF1', fg: '#0F766E',
    subs: [
      { ar: 'تاج زيركون / بورسلين (Crowns)', en: 'Crown' },
      { ar: 'جسور ثابتة (Bridges)', en: 'Fixed bridge' },
      { ar: 'تركيبة متحركة', en: 'Removable denture' },
    ],
  },
  {
    key: 'surgery', ar: 'جراحة الفم والخلع', en: 'Oral surgery', icon: Activity, bg: '#DBEAFE', fg: '#1D4ED8',
    subs: [
      { ar: 'خلع بسيط', en: 'Simple extraction' },
      { ar: 'خلع جراحي (Tooth Extraction)', en: 'Surgical extraction' },
      { ar: 'جراحة فموية', en: 'Oral surgery' },
    ],
  },
  {
    key: 'ortho', ar: 'تقويم الأسنان', en: 'Orthodontics', icon: Grid3x3, bg: '#F3E8FF', fg: '#7E22CE',
    subs: [
      { ar: 'تقويم معدني', en: 'Metal braces' },
      { ar: 'تقويم شفاف (Clear Aligners)', en: 'Clear aligners' },
      { ar: 'متابعة تقويم', en: 'Ortho follow-up' },
    ],
  },
  {
    key: 'implant', ar: 'زراعة الأسنان', en: 'Implantology', icon: Syringe, bg: '#FEF3C7', fg: '#B45309',
    subs: [
      { ar: 'زراعة سن (Dental Implant)', en: 'Dental implant' },
      { ar: 'طعم عظم (Bone Graft)', en: 'Bone graft' },
    ],
  },
  {
    key: 'cosmetic', ar: 'تجميل الأسنان', en: 'Cosmetic', icon: Sparkles, bg: '#FCE7F3', fg: '#BE185D',
    subs: [
      { ar: 'تبييض الأسنان (Teeth Whitening)', en: 'Teeth whitening' },
      { ar: 'عدسات تجميلية (Veneers / Lumineers)', en: 'Veneers / Lumineers' },
    ],
  },
];

// Plain color values instead of NativeWind bg-*/text-* classes on these two
// maps: both badges below are re-rendered by their own onPress cycle
// handler, which hits the same react-native-css-interop race documented
// just below (shadowSm/shadowMd) — except here the symptom isn't a crash,
// it's the label silently clipping to its first word or two after the first
// re-render and staying that way.
const PLAN_META: Record<PlanStatus, { ar: string; en: string; bg: string; text: string }> = {
  done: { ar: 'مكتمل', en: 'Done', bg: '#D1FAE5', text: '#047857' },
  active: { ar: 'قيد التنفيذ', en: 'In progress', bg: '#DBEAFE', text: '#1D4ED8' },
  planned: { ar: 'مقترح', en: 'Planned', bg: '#F1F5F9', text: '#64748B' },
};

// Plain style objects instead of `shadow-*` / color-opacity (`bg-x/NN`) utility
// classes on Pressable: those NativeWind class patterns trigger a known
// react-native-css-interop race that crashes with a bogus "no navigation
// context" error when many such elements mount at once (dental chart legend,
// department chips). See https://github.com/nativewind/nativewind/issues/1536
const shadowSm = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 2,
  elevation: 1,
} as const;
const shadowMd = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
} as const;

const STATUS_META: Record<PatientStatus, { ar: string; en: string; bg: string; text: string }> = {
  new: { ar: 'مريض جديد', en: 'New', bg: '#DBEAFE', text: '#1D4ED8' },
  in_treatment: { ar: 'علاج قيد الإنجاز', en: 'In treatment', bg: '#FEF3C7', text: '#B45309' },
  completed: { ar: 'مكتمل', en: 'Completed', bg: '#D1FAE5', text: '#047857' },
};

const STATUS_AR: Record<PatientStatus, string> = {
  new: 'جديد',
  in_treatment: 'قيد الإنجاز',
  completed: 'مكتمل',
};

/** Every delete on this screen used to fire on a single tap. */
function confirmDelete(ar: boolean, message: string, onConfirm: () => void) {
  Alert.alert(ar ? 'تأكيد الحذف' : 'Confirm delete', message, [
    { text: ar ? 'إلغاء' : 'Cancel', style: 'cancel' },
    { text: ar ? 'حذف' : 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

export default function PatientDetailScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const patients = usePatients();
  const p = patients.find((x) => x.id === patientId);

  const [tab, setTab] = useState<'info' | 'visits' | 'teeth' | 'plan' | 'fees'>('info');
  // Starts from the saved note — it used to open empty, so saving silently
  // replaced a note the doctor could not see.
  const [note, setNote] = useState(() => p?.doctorNote ?? '');
  const noteDirty = note !== (p?.doctorNote ?? '');

  if (!p) {
    return (
      <Screen>
        <Text className="mt-10 text-center text-slate-500">{ar ? 'المريض غير موجود' : 'Patient not found'}</Text>
      </Screen>
    );
  }

  const log = getLog(p);

  const sharePatientRecord = async () => {
    const genderLabel = p.gender === 'male' ? (ar ? 'ذكر' : 'Male') : ar ? 'أنثى' : 'Female';
    const teeth = Object.entries(p.teeth)
      .map(([tooth, status]) => ({ tooth: Number(tooth), status, meta: TOOTH_META[status] }))
      .sort((a, b) => a.tooth - b.tooth)
      .map((x) => ({ tooth: x.tooth, status: ar ? x.meta.ar : x.meta.en, color: x.meta.dot }));
    const plan = getPlan(p).map((s) => ({
      title: s.title,
      tooth: s.tooth,
      dept: s.dept ? (ar ? BRANCHES.find((b) => b.key === s.dept)?.ar : BRANCHES.find((b) => b.key === s.dept)?.en) : undefined,
      cost: s.cost ? formatMoney(s.cost, planCurrency(p, s)) : undefined,
      status: ar ? PLAN_META[s.status].ar : PLAN_META[s.status].en,
      statusColor: PLAN_META[s.status].text,
      note: s.note,
    }));
    const ok = await sharePdf(
      `${p.name}.pdf`,
      patientRecordHtml({
        ar,
        meta: [
          { label: ar ? 'اسم المريض' : 'Patient name', value: p.name },
          { label: ar ? 'رقم الملف' : 'File #', value: p.fileNo },
          { label: ar ? 'العمر' : 'Age', value: p.age ? `${p.age} ${ar ? 'سنة' : 'y'}` : '—' },
          { label: ar ? 'الجنس' : 'Gender', value: genderLabel },
          { label: ar ? 'الهاتف' : 'Phone', value: p.phone || '—' },
          { label: ar ? 'الحالة' : 'Status', value: ar ? STATUS_META[p.status].ar : STATUS_META[p.status].en },
          { label: ar ? 'آخر زيارة' : 'Last visit', value: p.lastVisit || '—' },
        ],
        complaint: p.complaint,
        doctorNotes: p.doctorNote,
        visits: p.visits.map((v) => ({
          date: v.date,
          time: v.time,
          procedure: v.procedure,
          doctor: v.doctor,
          status: v.status ? v.status : v.upcoming ? (ar ? 'موعد قادم' : 'Upcoming') : ar ? 'منجزة' : 'Done',
          note: v.note,
        })),
        teeth,
        plan,
      }),
    );
    if (!ok) toast.error(ar ? 'تعذر إنشاء ملف PDF' : 'Could not create PDF');
  };

  const TABS = [
    { id: 'info', ar: 'المعلومات', en: 'Info' },
    { id: 'visits', ar: 'الزيارات', en: 'Visits' },
    { id: 'teeth', ar: 'الأسنان', en: 'Teeth' },
    { id: 'plan', ar: 'خطة العلاج', en: 'Plan' },
    { id: 'fees', ar: 'المالية', en: 'Fees' },
  ] as const;

  return (
    <Screen>
      {/* Centred column on tablets — fields used to stretch the full iPad width. */}
      <View style={{ width: '100%', maxWidth: 820, alignSelf: 'center' }}>
      {/* Quick actions */}
      <View className="flex-row items-center gap-1.5">
        <Pressable
          onPress={sharePatientRecord}
          className="h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm"
        >
          <Share2 size={15} color="#64748B" />
        </Pressable>
        <Pressable
          onPress={() => router.push({ pathname: '/rx/[patientId]', params: { patientId: p.id } })}
          className="h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm"
        >
          <Text className="text-[13px] font-black text-primary">Rx</Text>
        </Pressable>
        <View className="flex-1" />
        <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: STATUS_META[p.status].bg }}>
          <Text className="font-bold" style={{ fontSize: 11, color: STATUS_META[p.status].text }}>
            {ar ? STATUS_META[p.status].ar : STATUS_META[p.status].en}
          </Text>
        </View>
      </View>

      {/* Patient info card */}
      <View className="mt-3">
        <PatientInfoCard p={p} ar={ar} />
      </View>

      {/* Tabs */}
      <View className="mt-4 flex-row rounded-2xl bg-slate-100 p-1.5">
        {TABS.map((t) => {
          const activeTab = tab === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              className={cn('h-10 flex-1 items-center justify-center rounded-xl', activeTab && 'bg-white')}
              style={activeTab ? shadowSm : undefined}
            >
              <Text className={cn('text-xs font-bold', activeTab ? 'text-slate-900' : 'text-slate-500')}>
                {ar ? t.ar : t.en}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Plain container: Screen already scrolls and keeps the focused input
          above the keyboard. A second, nested keyboard-aware scroll view here
          fought it, which let the keyboard cover the form on tablets. */}
      <View className="mt-4 pb-6">
        {tab === 'info' && (
          <View className="gap-3">
            <Card>
              <Text className="text-xs font-bold text-slate-500">{ar ? 'الشكوى الرئيسية' : 'Chief complaint'}</Text>
              <Input
                value={p.complaint}
                onChangeText={(v) => updatePatient(p.id, { complaint: v })}
                placeholder={ar ? 'اكتب الشكوى...' : 'Write complaint...'}
                multiline
                className="mt-2"
              />
            </Card>
            <Card>
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-xs font-bold text-slate-500">{ar ? 'ملاحظات الطبيب' : 'Doctor note'}</Text>
                {!!p.doctorNoteDate && (
                  <Text className="text-[10px] text-slate-400" style={{ writingDirection: 'ltr' }}>
                    {ar ? `آخر حفظ: ${p.doctorNoteDate}` : `Last saved: ${p.doctorNoteDate}`}
                  </Text>
                )}
              </View>
              <Input value={note} onChangeText={setNote} placeholder={ar ? 'اكتب ملاحظة...' : 'Write a note...'} multiline />
              <Button
                title={noteDirty ? (ar ? 'حفظ الملاحظة' : 'Save note') : ar ? 'محفوظة ✓' : 'Saved ✓'}
                disabled={!noteDirty}
                onPress={() => updatePatient(p.id, { doctorNote: note, doctorNoteDate: new Date().toISOString().slice(0, 10) })}
                className="mt-2"
              />
            </Card>
            <Card>
              <Text className="mb-2 text-xs font-bold text-slate-500">{ar ? 'السجل المرضي' : 'History log'}</Text>
              {log.length === 0 ? (
                <Text className="text-xs text-slate-400">{ar ? 'لا توجد سجلات' : 'No records'}</Text>
              ) : (
                log.map((e) => (
                  <View key={e.id} className="mb-1.5 rounded-xl border border-border px-3 py-2">
                    <Text className="text-xs font-semibold text-slate-700">{e.text}</Text>
                    <Text className="text-[10px] text-slate-400">{e.date}</Text>
                  </View>
                ))
              )}
            </Card>
          </View>
        )}

        {tab === 'visits' && <VisitsTab p={p} ar={ar} />}

        {tab === 'teeth' && <ChartCard p={p} ar={ar} />}

        {tab === 'plan' && <PlanCard p={p} ar={ar} />}

        {tab === 'fees' && <BillingTab p={p} ar={ar} />}
      </View>
      </View>
    </Screen>
  );
}

function VisitsTab({ p, ar }: { p: Patient; ar: boolean }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [procedure, setProcedure] = useState('');
  const [upcoming, setUpcoming] = useState(false);
  const [pickingDate, setPickingDate] = useState(false);

  const submit = () => {
    if (!procedure.trim()) return;
    addVisit(p.id, { date, procedure: procedure.trim(), upcoming });
    setProcedure('');
  };

  return (
    <View className="gap-3">
      <Card>
        <Text className="mb-2 text-xs font-bold text-slate-500">
          {ar ? 'إضافة زيارة / موعد' : 'Add visit / appointment'}
        </Text>
        <View className="gap-2.5">
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Text className="mb-1 text-[10px] font-semibold text-slate-500">{ar ? 'التاريخ' : 'Date'}</Text>
              {/* Calendar instead of free-typed "YYYY-MM-DD", which accepted any text. */}
              <Pressable
                onPress={() => setPickingDate(true)}
                className="h-11 flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3"
              >
                <Text className="text-sm text-slate-800" style={{ writingDirection: 'ltr' }}>{date}</Text>
                <CalendarDays size={16} color="#94A3B8" />
              </Pressable>
              <CalendarPickerModal
                visible={pickingDate}
                onClose={() => setPickingDate(false)}
                selectedDate={date}
                onSelect={(ds) => {
                  setDate(ds);
                  setPickingDate(false);
                }}
              />
            </View>
            <View className="flex-1">
              <Text className="mb-1 text-[10px] font-semibold text-slate-500">{ar ? 'النوع' : 'Type'}</Text>
              <View className="h-11 flex-row overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <Pressable
                  onPress={() => setUpcoming(false)}
                  className={cn('flex-1 items-center justify-center', !upcoming && 'bg-primary')}
                >
                  <Text className={cn('text-[10px] font-bold', !upcoming ? 'text-primary-foreground' : 'text-slate-600')}>
                    {ar ? 'منجزة' : 'Done'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setUpcoming(true)}
                  className={cn('flex-1 items-center justify-center', upcoming && 'bg-primary')}
                >
                  <Text className={cn('text-[10px] font-bold', upcoming ? 'text-primary-foreground' : 'text-slate-600')}>
                    {ar ? 'قادم' : 'Upcoming'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
          <View>
            <Text className="mb-1 text-[10px] font-semibold text-slate-500">
              {ar ? 'الإجراء / خطة العلاج' : 'Procedure / plan'}
            </Text>
            <Input value={procedure} onChangeText={setProcedure} />
          </View>
          <Button title={ar ? '+ إضافة' : '+ Add'} onPress={submit} />
        </View>
      </Card>

      <Card>
        <Text className="mb-2 text-xs font-bold text-slate-500">{ar ? 'الجدول الزمني' : 'Timeline'}</Text>
        {p.visits.length === 0 ? (
          <Text className="text-xs text-slate-400">{ar ? 'لا توجد زيارات مسجلة' : 'No visits recorded'}</Text>
        ) : (
          <View className="gap-3">
            {p.visits.map((v) => (
              <View key={v.id} className="flex-row items-start gap-3">
                <View
                  className={cn(
                    'h-8 w-8 shrink-0 items-center justify-center rounded-full border',
                    v.upcoming ? 'border-amber-300 bg-amber-100' : 'border-primary bg-primary',
                  )}
                >
                  <CalendarDays size={14} color={v.upcoming ? '#B45309' : '#FFFFFF'} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-xs font-semibold text-slate-800">{v.procedure}</Text>
                  <Text className="text-[11px] text-slate-400">
                    {v.date} · {v.upcoming ? (ar ? 'موعد قادم' : 'Upcoming') : ar ? 'منجزة' : 'Done'}
                  </Text>
                </View>
                <Pressable onPress={() => confirmDelete(ar, ar ? `حذف الزيارة «${v.procedure}»؟` : `Delete visit "${v.procedure}"?`, () => removeVisit(p.id, v.id))} className="shrink-0">
                  <Trash2 size={15} color="#94A3B8" />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </Card>
    </View>
  );
}

function BillingTab({ p, ar }: { p: Patient; ar: boolean }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const cur = p.feeCurrency ?? 'USD';
  const paid = paidTotal(p);
  const remaining = (Number(p.totalFees) || 0) - paid;
  const overpaid = remaining < 0;
  const sym = cur === 'IQD' ? 'د.ع' : '$';
  // Typed text kept locally so a dollar amount can pass through "12." on its
  // way to "12.50" — formatting the stored number back lost the dot.
  const [feesText, setFeesText] = useState(() => (p.totalFees ? formatAmountInput(String(p.totalFees), cur) : ''));

  const fmt = (n: number) => formatMoney(Math.abs(Number(n) || 0), cur);
  const plan = planTotals(p);
  const otherCur: FeeCurrency = cur === 'USD' ? 'IQD' : 'USD';

  const setCurrency = (c: FeeCurrency) => {
    if (c === cur) return;
    const apply = () => {
      updatePatient(p.id, { feeCurrency: c });
      setFeesText(p.totalFees ? formatAmountInput(String(p.totalFees), c) : '');
      setAmount((a) => formatAmountInput(a, c));
    };
    // Switching only relabels the amounts — it never converts them.
    if ((Number(p.totalFees) || 0) > 0 || p.payments.length > 0) {
      Alert.alert(
        ar ? 'تغيير العملة' : 'Change currency',
        ar
          ? 'سيتغيّر رمز العملة فقط ولن تُحوَّل المبالغ المسجلة (مثلاً 250$ تصبح 250 د.ع). هل تريد المتابعة؟'
          : 'Only the currency label changes — recorded amounts are not converted (e.g. $250 becomes 250 IQD). Continue?',
        [
          { text: ar ? 'إلغاء' : 'Cancel', style: 'cancel' },
          { text: ar ? 'تغيير' : 'Change', onPress: apply },
        ],
      );
    } else apply();
  };

  const setFees = (text: string) => {
    const formatted = formatAmountInput(text, cur);
    setFeesText(formatted);
    updatePatient(p.id, { totalFees: parseAmountInput(formatted) ?? 0 });
  };

  const submit = () => {
    const n = parseAmountInput(amount);
    if (!n) return;
    addPayment(p.id, { amount: n, note: note.trim() || undefined, date: new Date().toISOString().slice(0, 10) });
    setAmount('');
    setNote('');
  };

  return (
    <View className="gap-3">
      {/* Currency selector */}
      <View className="flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white p-3">
        <Text className="text-[11px] font-bold text-slate-500">{ar ? 'العملة' : 'Currency'}</Text>
        <View className="flex-row gap-1.5">
          <Pressable
            onPress={() => setCurrency('USD')}
            className={cn(
              'h-8 items-center justify-center rounded-full border px-3',
              cur === 'USD' ? 'border-primary bg-primary' : 'border-slate-200 bg-white',
            )}
          >
            <Text className={cn('text-[11px] font-bold', cur === 'USD' ? 'text-primary-foreground' : 'text-slate-500')}>
              $ {ar ? 'دولار' : 'USD'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setCurrency('IQD')}
            className={cn(
              'h-8 items-center justify-center rounded-full border px-3',
              cur === 'IQD' ? 'border-primary bg-primary' : 'border-slate-200 bg-white',
            )}
          >
            <Text className={cn('text-[11px] font-bold', cur === 'IQD' ? 'text-primary-foreground' : 'text-slate-500')}>
              د.ع {ar ? 'دينار' : 'IQD'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Stats */}
      <View className="flex-row gap-2">
        <View className="flex-1 items-center rounded-2xl bg-sky-50 p-3">
          <Text numberOfLines={1} className="text-base font-extrabold text-slate-800">
            {fmt(p.totalFees ?? 0)}
          </Text>
          <Text className="mt-0.5 text-[10.5px] text-slate-500">{ar ? 'إجمالي الأتعاب' : 'Total fees'}</Text>
        </View>
        <View className="flex-1 items-center rounded-2xl bg-emerald-50 p-3">
          <Text numberOfLines={1} className="text-base font-extrabold text-emerald-700">
            {fmt(paid)}
          </Text>
          <Text className="mt-0.5 text-[10.5px] text-emerald-600">{ar ? 'المدفوع' : 'Paid'}</Text>
        </View>
        {/* An overpayment used to show as a green negative "remaining". */}
        <View className={cn('flex-1 items-center rounded-2xl p-3', overpaid ? 'bg-amber-50' : remaining > 0 ? 'bg-rose-50' : 'bg-emerald-50')}>
          <Text
            numberOfLines={1}
            className={cn('text-base font-extrabold', overpaid ? 'text-amber-700' : remaining > 0 ? 'text-rose-600' : 'text-emerald-700')}
          >
            {fmt(remaining)}
          </Text>
          <Text className={cn('mt-0.5 text-[10.5px]', overpaid ? 'text-amber-600' : remaining > 0 ? 'text-rose-500' : 'text-emerald-600')}>
            {overpaid ? (ar ? 'دفع زائد' : 'Overpaid') : ar ? 'المتبقي' : 'Remaining'}
          </Text>
        </View>
      </View>

      {/* Treatment plan total — the plan and the fees were two unrelated numbers. */}
      {(plan.USD > 0 || plan.IQD > 0) && (
        <Card>
          <View className="flex-row items-center justify-between gap-2">
            <View className="min-w-0 flex-1">
              <Text className="text-xs font-bold text-slate-500">{ar ? 'مجموع خطة العلاج' : 'Treatment plan total'}</Text>
              <Text className="mt-0.5 text-sm font-extrabold text-slate-800" style={{ writingDirection: 'ltr' }}>
                {formatMoneyTotals(getPlan(p), p)}
              </Text>
            </View>
            {plan[cur] > 0 && plan[cur] !== (Number(p.totalFees) || 0) && (
              <Pressable
                onPress={() => setFees(String(plan[cur]))}
                className="shrink-0 rounded-xl px-3 py-2"
                style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}
              >
                <Text className="text-[11px] font-bold text-primary">{ar ? 'اعتماده كإجمالي' : 'Use as total'}</Text>
              </Pressable>
            )}
          </View>
          {plan[otherCur] > 0 && (
            <Text className="mt-1.5 text-[10.5px] text-amber-700">
              {ar
                ? `جزء من الخطة بعملة ${otherCur === 'USD' ? 'الدولار' : 'الدينار'} ولا يدخل في إجمالي الأتعاب (${cur === 'USD' ? 'دولار' : 'دينار'}).`
                : `Part of the plan is in ${otherCur} and isn't included in the ${cur} total fees.`}
            </Text>
          )}
        </Card>
      )}

      {/* Editable total fees */}
      <Card>
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-xs font-bold text-slate-500">{ar ? 'إجمالي الأتعاب' : 'Total fees'}</Text>
          <Wallet size={16} color="#2563EB" />
        </View>
        <View className="h-11 flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-3">
          <Text className="me-2 shrink-0 text-xs font-bold text-slate-400">{sym}</Text>
          <TextInput
            value={feesText}
            onChangeText={setFees}
            keyboardType={cur === 'IQD' ? 'number-pad' : 'decimal-pad'}
            placeholder="0"
            placeholderTextColor="#94A3B8"
            className="flex-1 text-sm text-slate-800"
            style={{ writingDirection: 'ltr', textAlign: 'left' }}
          />
        </View>
      </Card>

      {/* Record payment */}
      <Card>
        <Text className="mb-2 text-xs font-bold text-slate-500">{ar ? 'تسجيل دفعة' : 'Record payment'}</Text>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Text className="mb-1 text-[10px] font-semibold text-slate-500">{ar ? 'المبلغ' : 'Amount'}</Text>
            <View className="h-11 flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-3">
              <Text className="me-2 shrink-0 text-xs font-bold text-slate-400">{sym}</Text>
              <TextInput
                value={amount}
                onChangeText={(v) => setAmount(formatAmountInput(v, cur))}
                keyboardType={cur === 'IQD' ? 'number-pad' : 'decimal-pad'}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                className="flex-1 text-sm text-slate-800"
                style={{ writingDirection: 'ltr', textAlign: 'left' }}
              />
            </View>
          </View>
          <View className="flex-1">
            <Text className="mb-1 text-[10px] font-semibold text-slate-500">{ar ? 'ملاحظة' : 'Note'}</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholderTextColor="#94A3B8"
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800"
            />
          </View>
        </View>
        <Pressable onPress={submit} className="mt-2 h-10 items-center justify-center rounded-xl bg-primary">
          <Text className="text-xs font-bold text-primary-foreground">{ar ? 'إضافة الدفعة' : 'Add payment'}</Text>
        </Pressable>
      </Card>

      {/* Payment history */}
      <Card>
        <Text className="mb-2 text-xs font-bold text-slate-500">{ar ? 'سجل المدفوعات' : 'Payment history'}</Text>
        {p.payments.length === 0 ? (
          <Text className="text-xs text-slate-400">{ar ? 'لا توجد مدفوعات' : 'No payments yet'}</Text>
        ) : (
          <View className="gap-1.5">
            {p.payments.map((x) => (
              <View key={x.id} className="flex-row items-center gap-2 rounded-xl border border-slate-200 p-2">
                <View className="min-w-0 flex-1">
                  <Text className="text-xs font-bold text-slate-800">{fmt(x.amount)}</Text>
                  <Text numberOfLines={1} className="text-[11px] text-slate-400">
                    {x.date}
                    {x.note ? ` · ${x.note}` : ''}
                  </Text>
                </View>
                <Pressable onPress={() => confirmDelete(ar, ar ? `حذف دفعة ${fmt(x.amount)}؟` : `Delete payment of ${fmt(x.amount)}?`, () => removePayment(p.id, x.id))}>
                  <Trash2 size={14} color="#94A3B8" />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </Card>
    </View>
  );
}

function MetaChip({
  label,
  value,
  icon: Icon,
  onPress,
}: {
  label: string;
  value: string;
  icon?: typeof Phone;
  onPress?: () => void;
}) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper onPress={onPress} style={{ width: '48%' }} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <View className="flex-row items-center gap-1">
        {Icon && <Icon size={10} color="#94A3B8" />}
        <Text className="text-[10px] text-slate-400">{label}</Text>
      </View>
      <Text numberOfLines={1} className="mt-0.5 text-xs font-extrabold text-slate-800">
        {value}
      </Text>
    </Wrapper>
  );
}

function MetaField({
  label,
  value,
  onChange,
  disabled,
  keyboardType,
  ltr,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'phone-pad';
  ltr?: boolean;
}) {
  return (
    <View style={{ width: '48%' }}>
      <Text className="text-[10px] font-semibold text-slate-500">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        editable={!disabled}
        keyboardType={keyboardType}
        className="mt-0.5 h-9 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs text-slate-800"
        style={{
          opacity: disabled ? 0.5 : 1,
          writingDirection: ltr ? 'ltr' : 'rtl',
          textAlign: ltr ? 'left' : 'right',
        }}
      />
    </View>
  );
}

function PatientInfoCard({ p, ar }: { p: Patient; ar: boolean }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: p.name,
    age: p.age ? String(p.age) : '',
    gender: p.gender,
    phone: p.phone || '',
    fileNo: p.fileNo,
  });

  const startEdit = () => {
    setForm({ name: p.name, age: p.age ? String(p.age) : '', gender: p.gender, phone: p.phone || '', fileNo: p.fileNo });
    setEditing(true);
  };

  const cancel = () => {
    setForm({ name: p.name, age: p.age ? String(p.age) : '', gender: p.gender, phone: p.phone || '', fileNo: p.fileNo });
    setEditing(false);
  };

  const save = () => {
    updatePatient(p.id, {
      name: form.name.trim() || p.name,
      age: form.age === '' ? '' : Number(form.age) || 0,
      gender: form.gender,
      phone: form.phone.trim(),
      fileNo: form.fileNo.trim() || p.fileNo,
    });
    setEditing(false);
  };

  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <View className="flex-row items-center gap-3">
        <View className={cn('h-12 w-12 shrink-0 items-center justify-center rounded-full', p.gender === 'female' ? 'bg-pink-100' : 'bg-sky-100')}>
          <Text className="text-lg font-extrabold text-slate-700">{p.name.trim().charAt(0) || '؟'}</Text>
        </View>
        <View className="min-w-0 flex-1">
          {editing ? (
            <TextInput
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[15px] font-extrabold text-slate-900"
              style={{ writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left' }}
            />
          ) : (
            <Text numberOfLines={1} className="text-[15px] font-extrabold text-slate-900">
              {p.name}
            </Text>
          )}
          <View className="mt-1 flex-row items-center gap-1.5">
            <CalendarDays size={11} color="#94A3B8" />
            <Text className="text-[11px] text-slate-400">
              {p.dob
                ? `${ar ? 'تاريخ الميلاد' : 'Born'}: ${p.dob}`
                : p.lastVisit
                  ? `${ar ? 'آخر زيارة' : 'Last visit'}: ${p.lastVisit}`
                  : '—'}
            </Text>
          </View>
        </View>
        {!editing && (
          <Pressable onPress={startEdit} className="shrink-0 p-1">
            <Pencil size={14} color="#2563EB" />
          </Pressable>
        )}
      </View>

      <View className="mt-3 flex-row flex-wrap justify-between gap-y-2">
        {editing ? (
          <>
            <MetaField label={ar ? 'العمر' : 'Age'} value={form.age} onChange={(v) => setForm((f) => ({ ...f, age: v }))} keyboardType="number-pad" ltr />
            <View style={{ width: '48%' }}>
              <Text className="text-[10px] font-semibold text-slate-500">{ar ? 'الجنس' : 'Gender'}</Text>
              <View className="mt-0.5 flex-row gap-1">
                {(['male', 'female'] as const).map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => setForm((f) => ({ ...f, gender: g }))}
                    className={cn(
                      'h-9 flex-1 items-center justify-center rounded-lg border',
                      form.gender === g ? 'border-primary bg-primary' : 'border-slate-200 bg-slate-50',
                    )}
                  >
                    <Text className={cn('text-[10px] font-bold', form.gender === g ? 'text-primary-foreground' : 'text-slate-600')}>
                      {g === 'male' ? (ar ? 'ذكر' : 'Male') : ar ? 'أنثى' : 'Female'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <MetaField label={ar ? 'رقم الملف' : 'File #'} value={form.fileNo} onChange={(v) => setForm((f) => ({ ...f, fileNo: v }))} ltr />
            <MetaField label={ar ? 'الهاتف' : 'Phone'} value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} keyboardType="phone-pad" ltr />
          </>
        ) : (
          <>
            <MetaChip label={ar ? 'العمر' : 'Age'} value={`${p.age || '—'}${p.age ? (ar ? ' سنة' : 'y') : ''}`} />
            <MetaChip label={ar ? 'الجنس' : 'Gender'} value={p.gender === 'male' ? (ar ? 'ذكر' : 'Male') : ar ? 'أنثى' : 'Female'} />
            <MetaChip label={ar ? 'رقم الملف' : 'File #'} value={p.fileNo} />
            <MetaChip
              label={ar ? 'الهاتف' : 'Phone'}
              value={p.phone || '—'}
              icon={Phone}
              onPress={p.phone ? () => Linking.openURL(`tel:${p.phone}`) : undefined}
            />
          </>
        )}
      </View>

      {editing && (
        <View className="mt-3 flex-row gap-2 border-t border-slate-100 pt-3">
          <Pressable onPress={cancel} className="h-9 flex-1 items-center justify-center rounded-xl bg-slate-100">
            <Text className="text-xs font-bold text-slate-700">{ar ? 'تجاهل' : 'Cancel'}</Text>
          </Pressable>
          <Pressable onPress={save} className="h-9 flex-1 items-center justify-center rounded-xl bg-primary">
            <Text className="text-xs font-bold text-primary-foreground">{ar ? 'حفظ' : 'Save'}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function MiniBtn({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="h-7 w-7 items-center justify-center rounded-full bg-white"
      style={shadowSm}
    >
      {children}
    </Pressable>
  );
}

function ChartCard({ p, ar }: { p: Patient; ar: boolean }) {
  const [jaw, setJaw] = useState<'upper' | 'lower'>('upper');
  const [brush, setBrush] = useState<ToothStatus>('caries');
  const [zoom, setZoom] = useState(1);
  const [selecting, setSelecting] = useState(true);
  const [saved, setSaved] = useState(false);

  return (
    <View className="rounded-3xl border border-slate-100 bg-white p-4" style={shadowSm}>
      {/* Header */}
      <View className="mb-3.5 flex-row items-center gap-2.5">
        <View className="h-9 w-9 items-center justify-center rounded-2xl bg-sky-50">
          <Grid2x2 size={17} color="#0284C7" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-extrabold text-slate-900">{ar ? 'خريطة الأسنان' : 'Dental Chart'}</Text>
          <Text className="text-[10.5px] text-slate-400">
            {ar ? 'ملخّص حالة الفم التفاعلي' : 'Interactive case summary'}
          </Text>
        </View>
      </View>

      {/* Jaw segmented control */}
      <View className="mb-3 flex-row rounded-2xl bg-slate-100 p-1">
        {(['upper', 'lower'] as const).map((j) => {
          const active = jaw === j;
          return (
            <Pressable
              key={j}
              onPress={() => setJaw(j)}
              className={cn('h-9 flex-1 items-center justify-center rounded-xl', active && 'bg-white')}
              style={active ? shadowSm : undefined}
            >
              <Text className={cn('text-[12px] font-bold', active ? 'text-slate-900' : 'text-slate-500')}>
                {j === 'upper' ? (ar ? 'الفك العلوي' : 'Upper jaw') : ar ? 'الفك السفلي' : 'Lower jaw'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Arch viewer */}
      <View className="overflow-hidden rounded-2xl p-2.5" style={{ backgroundColor: 'rgba(240,249,255,0.6)' }}>
        <ArchViewer zoom={zoom} onZoomChange={setZoom} height={200}>
          <DentalArch
            jaw={jaw}
            teeth={p.teeth}
            onTooth={(n) => {
              if (!selecting) return;
              setSaved(false);
              setTooth(p.id, n, p.teeth[n] === brush ? 'healthy' : brush);
            }}
          />
        </ArchViewer>
        <Text className="mt-1.5 text-center text-[10px] text-slate-400">
          {ar
            ? 'اختر لوناً من المفتاح ثم اضغط على السن — قرّب بإصبعين واسحب للتنقل'
            : 'Pick a legend color, then tap a tooth — pinch to zoom, drag to move'}
        </Text>
      </View>

      {/* Legend */}
      <View className="mt-3 rounded-2xl border border-slate-100 p-3" style={{ backgroundColor: 'rgba(248,250,252,0.7)' }}>
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-[11.5px] font-extrabold text-slate-700">{ar ? 'حالة السن' : 'Tooth status'}</Text>
          <View className="flex-row items-center gap-1.5">
            <MiniBtn onPress={() => setZoom(1)}>
              <RotateCcw size={13} color="#2563EB" />
            </MiniBtn>
            <MiniBtn onPress={() => setZoom((z) => Math.max(ARCH_ZOOM_MIN, z - 0.2))}>
              <ZoomOut size={13} color="#2563EB" />
            </MiniBtn>
            <MiniBtn onPress={() => setZoom((z) => Math.min(ARCH_ZOOM_MAX, z + 0.2))}>
              <ZoomIn size={13} color="#2563EB" />
            </MiniBtn>
          </View>
        </View>
        <View className="flex-row flex-wrap gap-1.5">
          {LEGEND_ORDER.map((s) => {
            const active = brush === s;
            return (
              <Pressable
                key={s}
                onPress={() => setBrush(s)}
                style={[{ width: '31.5%' as const }, active ? shadowSm : undefined]}
                className={cn('h-8 flex-row items-center gap-1.5 rounded-xl px-2', active ? 'bg-white' : 'bg-transparent')}
              >
                <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TOOTH_META[s].dot }} />
                <Text numberOfLines={1} className={cn('text-[10.5px]', active ? 'font-bold text-slate-800' : 'text-slate-500')}>
                  {ar ? TOOTH_META[s].ar : TOOTH_META[s].en}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Actions */}
      <View className="mt-3 flex-row gap-2">
        {/* Each tooth tap is saved immediately; this used to be a "Save chart"
            button that saved nothing and only changed its own label. */}
        <View className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-emerald-50">
          <Check size={14} color="#047857" strokeWidth={3} />
          <Text className="text-xs font-extrabold text-emerald-700">
            {saved ? (ar ? 'تم حفظ التغيير' : 'Change saved') : ar ? 'يُحفظ تلقائياً' : 'Saves automatically'}
          </Text>
        </View>
        <Pressable
          onPress={() => setSelecting((v) => !v)}
          className={cn('h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl border', !selecting && 'border-slate-200 bg-white')}
          style={selecting ? { borderColor: 'rgba(59,130,246,0.3)', backgroundColor: 'rgba(59,130,246,0.05)' } : undefined}
        >
          <Scan size={14} color={selecting ? '#2563EB' : '#64748B'} />
          <Text className={cn('text-xs font-extrabold', selecting ? 'text-primary' : 'text-slate-500')}>
            {selecting ? (ar ? 'إيقاف التحديد' : 'Disable selection') : ar ? 'تفعيل التحديد' : 'Enable selection'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function PlanCard({ p, ar }: { p: Patient; ar: boolean }) {
  const [dept, setDept] = useState<string>(p.branch || BRANCHES[0].key);
  const { upload: uploadXrays, uploading: xrayUploading } = useXrayUpload(p, ar);
  const [adding, setAdding] = useState(false);
  const [picking, setPicking] = useState(false);
  const [form, setForm] = useState({ title: '', tooth: '', cost: '', note: '' });
  // Chosen explicitly per procedure — the cost used to be shown as "$" no
  // matter what the doctor meant.
  const [cur, setCur] = useState<FeeCurrency>(() => planCurrency(p));

  const all = getPlan(p);
  const plan = all.filter((s) => (s.dept ?? 'general') === dept);
  const deptMeta = BRANCHES.find((b) => b.key === dept) ?? BRANCHES[0];
  const isRadio = deptMeta.key === 'radio';
  const totalLabel = formatMoneyTotals(plan, p);
  const doneCount = plan.filter((s) => s.status === 'done').length;
  const statusLabel =
    plan.length === 0
      ? ar
        ? 'لم تبدأ'
        : 'Not started'
      : doneCount === plan.length
        ? ar
          ? 'مكتملة'
          : 'Completed'
        : ar
          ? 'نشطة'
          : 'Active';
  const statusCls =
    doneCount === plan.length && plan.length > 0
      ? 'bg-emerald-100 text-emerald-700'
      : plan.length === 0
        ? 'bg-slate-100 text-slate-500'
        : 'bg-blue-100 text-blue-700';

  // Set while the form edits an existing step instead of adding one.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toothError, setToothError] = useState(false);

  const closeForm = () => {
    setForm({ title: '', tooth: '', cost: '', note: '' });
    setEditingId(null);
    setToothError(false);
    setAdding(false);
  };

  const startEdit = (s: PlanStep) => {
    const c = planCurrency(p, s);
    setCur(c);
    setForm({ title: s.title, tooth: s.tooth ?? '', cost: s.cost ? formatAmountInput(String(s.cost), c) : '', note: s.note ?? '' });
    setEditingId(s.id);
    setToothError(false);
    setAdding(true);
  };

  const submit = () => {
    if (!form.title.trim()) return;
    const tooth = parseToothList(form.tooth);
    if (!tooth.ok) {
      setToothError(true);
      return;
    }
    const cost = parseAmountInput(form.cost);
    const fields = {
      tooth: tooth.value || undefined,
      cost,
      currency: cost === undefined ? undefined : cur,
      note: form.note.trim() || undefined,
    };
    if (editingId) updatePlanStep(p.id, editingId, { title: form.title.trim(), ...fields });
    else addPlanStep(p.id, form.title, { dept, ...fields });
    closeForm();
  };

  const confirmRemove = (s: PlanStep) =>
    Alert.alert(ar ? 'حذف الإجراء' : 'Delete procedure', ar ? `حذف «${s.title}» من الخطة؟` : `Delete "${s.title}" from the plan?`, [
      { text: ar ? 'إلغاء' : 'Cancel', style: 'cancel' },
      { text: ar ? 'حذف' : 'Delete', style: 'destructive', onPress: () => removePlanStep(p.id, s.id) },
    ]);

  return (
    <View className="gap-3">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerClassName="gap-2 pb-0.5">
        {BRANCHES.map((b) => {
          const active = b.key === dept;
          const count = all.filter((s) => (s.dept ?? 'general') === b.key).length;
          const Icon = b.icon;
          return (
            <Pressable
              key={b.key}
              onPress={() => setDept(b.key)}
              className="h-11 flex-row items-center gap-1.5 rounded-2xl px-3.5"
              style={[shadowSm, { backgroundColor: active ? '#3B82F6' : b.bg }]}
            >
              <Icon size={14} color={active ? '#FFFFFF' : b.fg} />
              <Text className="text-[12px] font-bold" style={{ color: active ? '#FFFFFF' : b.fg }}>
                {ar ? b.ar : b.en}
              </Text>
              {count > 0 && (
                <View
                  className="rounded-full px-1.5"
                  style={{ backgroundColor: active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)' }}
                >
                  <Text className="text-[10px] font-bold" style={{ color: active ? '#FFFFFF' : b.fg }}>
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <View className="rounded-3xl border border-slate-100 bg-white p-4" style={shadowSm}>
        <View className="mb-3 flex-row items-center gap-2.5">
          <View className="h-9 w-9 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: deptMeta.bg }}>
            <deptMeta.icon size={16} color={deptMeta.fg} />
          </View>
          <Text numberOfLines={1} className="min-w-0 flex-1 text-[13px] font-extrabold text-slate-900">
            {isRadio
              ? ar
                ? 'أشعة الأسنان الخاصة بالمريض'
                : 'Patient radiographs'
              : ar
                ? deptMeta.ar
                : deptMeta.en}
          </Text>
          <Pressable
            onPress={() => (isRadio ? void uploadXrays() : setPicking(true))}
            disabled={isRadio && xrayUploading}
            className="h-8 shrink-0 flex-row items-center gap-1 rounded-full px-3"
            style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}
          >
            {isRadio ? <Cloud size={13} color="#2563EB" /> : <Plus size={13} color="#2563EB" strokeWidth={3} />}
            <Text className="text-[11px] font-bold text-primary">
              {isRadio ? (ar ? 'رفع أشعة' : 'Upload') : ar ? 'إجراء جديد' : 'New'}
            </Text>
          </Pressable>
        </View>

        {!isRadio && (
          <View className="mb-3 flex-row items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
            <View className={cn('rounded-full px-2 py-0.5', statusCls)}>
              <Text className="text-[10.5px] font-bold">{statusLabel}</Text>
            </View>
            <Text className="text-[11px] text-slate-400">
              {doneCount}/{plan.length} {ar ? 'منجز' : 'done'}
            </Text>
            {!!totalLabel && (
              <Text numberOfLines={1} className="ml-auto shrink text-[13px] font-extrabold text-slate-800">{totalLabel}</Text>
            )}
          </View>
        )}

        {adding && (
          <View className="mb-3 gap-2 rounded-2xl bg-slate-50 p-3">
            <TextInput
              autoFocus
              value={form.title}
              onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
              placeholder={ar ? 'اسم الإجراء (مثال: حشوة جذر)' : 'Procedure name'}
              placeholderTextColor="#94A3B8"
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800"
            />
            <View className="flex-row gap-2">
              <TextInput
                value={form.tooth}
                onChangeText={(v) => {
                  setToothError(false);
                  setForm((f) => ({ ...f, tooth: v }));
                }}
                keyboardType="numbers-and-punctuation"
                placeholder={ar ? 'رقم السن (مثال: 36)' : 'Tooth # (e.g. 36)'}
                placeholderTextColor="#94A3B8"
                className={cn('h-11 flex-1 rounded-xl border bg-white px-3 text-xs text-slate-800', toothError ? 'border-rose-400' : 'border-slate-200')}
                style={{ writingDirection: 'ltr', textAlign: 'left' }}
              />
              <View className="h-11 flex-1 flex-row items-center rounded-xl border border-slate-200 bg-white px-3">
                <Text className="me-2 shrink-0 text-xs font-bold text-slate-400">{cur === 'IQD' ? 'د.ع' : '$'}</Text>
                <TextInput
                  value={form.cost}
                  onChangeText={(v) => setForm((f) => ({ ...f, cost: formatAmountInput(v, cur) }))}
                  keyboardType={cur === 'IQD' ? 'number-pad' : 'decimal-pad'}
                  placeholder={ar ? 'الكلفة' : 'Cost'}
                  placeholderTextColor="#94A3B8"
                  className="flex-1 text-xs text-slate-800"
                  style={{ writingDirection: 'ltr', textAlign: 'left' }}
                />
              </View>
            </View>
            {toothError && (
              <Text className="text-[11px] text-rose-600">
                {ar
                  ? 'رقم السن غير صحيح — استخدم ترقيم FDI (11–48، وللأسنان اللبنية 51–85)، وافصل بين الأسنان بفارزة.'
                  : 'Invalid tooth number — use FDI (11–48, primary 51–85), comma-separated.'}
              </Text>
            )}
            <View className="flex-row items-center justify-between">
              <Text className="text-[11px] font-bold text-slate-500">{ar ? 'عملة الكلفة' : 'Cost currency'}</Text>
              <View className="flex-row gap-1.5">
                {(['USD', 'IQD'] as const).map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => {
                      setCur(c);
                      setForm((f) => ({ ...f, cost: formatAmountInput(f.cost, c) }));
                    }}
                    className={cn(
                      'h-8 items-center justify-center rounded-full border px-3',
                      cur === c ? 'border-primary bg-primary' : 'border-slate-200 bg-white',
                    )}
                  >
                    <Text className={cn('text-[11px] font-bold', cur === c ? 'text-primary-foreground' : 'text-slate-500')}>
                      {c === 'USD' ? `$ ${ar ? 'دولار' : 'USD'}` : `د.ع ${ar ? 'دينار' : 'IQD'}`}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <TextInput
              value={form.note}
              onChangeText={(v) => setForm((f) => ({ ...f, note: v }))}
              placeholder={ar ? 'ملاحظة (الجلسة الثانية…)' : 'Note (session 2…)'}
              placeholderTextColor="#94A3B8"
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800"
            />
            <View className="flex-row gap-2">
              <Pressable onPress={closeForm} className="h-11 flex-1 items-center justify-center rounded-xl bg-slate-200">
                <Text className="text-xs font-bold text-slate-700">{ar ? 'إلغاء' : 'Cancel'}</Text>
              </Pressable>
              <Pressable onPress={submit} className="h-11 flex-[2] items-center justify-center rounded-xl bg-primary" style={shadowSm}>
                <Text className="text-xs font-extrabold text-primary-foreground">
                  {editingId ? (ar ? 'حفظ التعديل' : 'Save changes') : ar ? 'إضافة للخطة' : 'Add to plan'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {isRadio ? (
          <XrayGallery p={p} ar={ar} uploading={xrayUploading} />
        ) : plan.length === 0 ? (
          <View className="items-center rounded-2xl bg-slate-50 py-8">
            <Text className="text-xs text-slate-400">
              {ar ? 'لا توجد إجراءات مضافة في هذا الفرع بعد' : 'No procedures in this department yet'}
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {plan.map((s) => (
              <View key={s.id} className="flex-row items-center gap-2.5 rounded-2xl bg-slate-50 p-2.5">
                <View className="h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white" style={shadowSm}>
                  <Text className="text-[11px] font-extrabold" style={{ color: deptMeta.fg }}>
                    {s.tooth || '—'}
                  </Text>
                </View>
                {/* Tap the procedure to edit its name, tooth, cost or note. */}
                <Pressable onPress={() => startEdit(s)} className="min-w-0 flex-1">
                  <Text
                    numberOfLines={1}
                    className={cn('text-xs font-semibold text-slate-800', s.status === 'done' && 'text-slate-400 line-through')}
                  >
                    {s.title}
                  </Text>
                  <Text numberOfLines={1} className="text-[10px] text-slate-400">
                    {[s.note, s.cost ? formatMoney(Number(s.cost), planCurrency(p, s)) : ''].filter(Boolean).join(' · ') ||
                      (ar ? 'بدون ملاحظات' : 'No notes')}
                  </Text>
                </Pressable>
                {/* The one status control: planned → in progress → done. A
                    separate "done" checkbox used to sit next to it. */}
                <Pressable
                  onPress={() => cyclePlanStep(p.id, s.id)}
                  style={{ flexShrink: 0, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: PLAN_META[s.status].bg }}
                >
                  <Text className="font-bold" style={{ fontSize: 10, color: PLAN_META[s.status].text }}>
                    {ar ? PLAN_META[s.status].ar : PLAN_META[s.status].en}
                  </Text>
                </Pressable>
                <Pressable onPress={() => startEdit(s)} className="shrink-0 p-1">
                  <Pencil size={14} color="#64748B" />
                </Pressable>
                <Pressable onPress={() => confirmRemove(s)} className="shrink-0 p-1">
                  <Trash2 size={14} color="#94A3B8" />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      {picking && (
        <ProcedurePicker
          ar={ar}
          deptMeta={deptMeta}
          onClose={() => setPicking(false)}
          onPick={(title) => {
            setEditingId(null);
            setForm({ title, tooth: '', cost: '', note: '' });
            setPicking(false);
            setAdding(true);
          }}
          onCustom={() => {
            setEditingId(null);
            setForm({ title: '', tooth: '', cost: '', note: '' });
            setPicking(false);
            setAdding(true);
          }}
        />
      )}
    </View>
  );
}

function ProcedurePicker({
  ar,
  deptMeta,
  onClose,
  onPick,
  onCustom,
}: {
  ar: boolean;
  deptMeta: (typeof BRANCHES)[number];
  onClose: () => void;
  onPick: (title: string) => void;
  onCustom: () => void;
}) {
  const Icon = deptMeta.icon;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[75%] rounded-t-3xl bg-white p-4">
          <View className="mb-3 flex-row items-start justify-between gap-3">
            <Text className="flex-1 text-sm font-extrabold text-slate-900">
              {ar ? `اختر الإجراء الخاص بـ (${deptMeta.ar})` : `Choose a procedure — ${deptMeta.en}`}
            </Text>
            <Pressable onPress={onClose} className="h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100">
              <X size={14} color="#64748B" />
            </Pressable>
          </View>
          <ScrollView>
            {deptMeta.subs.map((s, i) => (
              <Pressable
                key={s.ar}
                onPress={() => onPick(ar ? s.ar : s.en)}
                className={cn('flex-row items-center gap-2.5 py-3', i > 0 && 'border-t border-slate-100')}
              >
                <View className="h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: deptMeta.bg }}>
                  <Icon size={16} color={deptMeta.fg} />
                </View>
                <Text className="flex-1 text-[13px] font-semibold text-slate-800">{ar ? s.ar : s.en}</Text>
                <Plus size={16} color="#2563EB" strokeWidth={3} />
              </Pressable>
            ))}
          </ScrollView>
          <Pressable onPress={onCustom} className="mt-3 h-10 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <Text className="text-xs font-bold text-slate-700">{ar ? 'إجراء مخصص…' : 'Custom procedure…'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
