import { useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
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
  type Patient,
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

export default function PatientDetailScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const patients = usePatients();
  const p = patients.find((x) => x.id === patientId);

  const [tab, setTab] = useState<'info' | 'visits' | 'teeth' | 'plan' | 'fees'>('info');
  const [note, setNote] = useState('');

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
    const sym = p.feeCurrency === 'IQD' ? (ar ? 'د.ع' : 'IQD') : '$';
    const teeth = Object.entries(p.teeth)
      .map(([tooth, status]) => ({ tooth: Number(tooth), status, meta: TOOTH_META[status] }))
      .sort((a, b) => a.tooth - b.tooth)
      .map((x) => ({ tooth: x.tooth, status: ar ? x.meta.ar : x.meta.en, color: x.meta.dot }));
    const plan = getPlan(p).map((s) => ({
      title: s.title,
      tooth: s.tooth,
      dept: s.dept ? (ar ? BRANCHES.find((b) => b.key === s.dept)?.ar : BRANCHES.find((b) => b.key === s.dept)?.en) : undefined,
      cost: s.cost ? `${sym}${s.cost}` : undefined,
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

      <ScrollView className="mt-4 flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
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
              <Text className="mb-2 text-xs font-bold text-slate-500">{ar ? 'ملاحظات الطبيب' : 'Doctor note'}</Text>
              <Input value={note} onChangeText={setNote} placeholder={ar ? 'اكتب ملاحظة...' : 'Write a note...'} multiline />
              <Button
                title={ar ? 'حفظ الملاحظة' : 'Save note'}
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
      </ScrollView>
    </Screen>
  );
}

function VisitsTab({ p, ar }: { p: Patient; ar: boolean }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [procedure, setProcedure] = useState('');
  const [upcoming, setUpcoming] = useState(false);

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
              <Input value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
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
                <Pressable onPress={() => removeVisit(p.id, v.id)} className="shrink-0">
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
  const sym = cur === 'IQD' ? 'د.ع' : '$';

  const fmt = (n: number) => {
    const v = Number(n || 0).toLocaleString('en-US');
    return cur === 'IQD' ? `${v} ${sym}` : `${sym}${v}`;
  };
  const digitsOnly = (raw: string) => raw.replace(/[^\d]/g, '');
  const setCurrency = (c: 'USD' | 'IQD') => updatePatient(p.id, { feeCurrency: c });

  const submit = () => {
    const n = Number(digitsOnly(amount));
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
        <View className={cn('flex-1 items-center rounded-2xl p-3', remaining > 0 ? 'bg-rose-50' : 'bg-emerald-50')}>
          <Text
            numberOfLines={1}
            className={cn('text-base font-extrabold', remaining > 0 ? 'text-rose-600' : 'text-emerald-700')}
          >
            {fmt(remaining)}
          </Text>
          <Text className={cn('mt-0.5 text-[10.5px]', remaining > 0 ? 'text-rose-500' : 'text-emerald-600')}>
            {ar ? 'المتبقي' : 'Remaining'}
          </Text>
        </View>
      </View>

      {/* Editable total fees */}
      <Card>
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-xs font-bold text-slate-500">{ar ? 'إجمالي الأتعاب' : 'Total fees'}</Text>
          <Wallet size={16} color="#2563EB" />
        </View>
        <View className="h-11 flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-3">
          <Text className="me-2 shrink-0 text-xs font-bold text-slate-400">{sym}</Text>
          <TextInput
            value={p.totalFees ? p.totalFees.toLocaleString('en-US') : ''}
            onChangeText={(v) => {
              const digits = digitsOnly(v);
              updatePatient(p.id, { totalFees: digits ? Number(digits) : 0 });
            }}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#94A3B8"
            className="flex-1 text-sm text-slate-800"
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
                onChangeText={(v) => {
                  const digits = digitsOnly(v);
                  setAmount(digits ? Number(digits).toLocaleString('en-US') : '');
                }}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#94A3B8"
                className="flex-1 text-sm text-slate-800"
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
                <Pressable onPress={() => removePayment(p.id, x.id)}>
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
            <Text className="text-[11px] text-slate-400">{p.dob || p.lastVisit || '—'}</Text>
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
  const [zoom, setZoom] = useState(0.75);
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
          {ar ? 'اختر لوناً من المفتاح ثم اضغط على السن' : 'Pick a legend color, then tap a tooth'}
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
        <Pressable
          onPress={() => setSaved(true)}
          className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-primary"
          style={shadowMd}
        >
          <Check size={14} color="#FFFFFF" strokeWidth={3} />
          <Text className="text-xs font-extrabold text-primary-foreground">
            {saved ? (ar ? 'تم الحفظ' : 'Saved') : ar ? 'حفظ مخطط الأسنان' : 'Save chart'}
          </Text>
        </Pressable>
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
  const [adding, setAdding] = useState(false);
  const [picking, setPicking] = useState(false);
  const [form, setForm] = useState({ title: '', tooth: '', cost: '', note: '' });

  const all = getPlan(p);
  const plan = all.filter((s) => (s.dept ?? 'general') === dept);
  const deptMeta = BRANCHES.find((b) => b.key === dept) ?? BRANCHES[0];
  const isRadio = deptMeta.key === 'radio';
  const total = plan.reduce((s, x) => s + (Number(x.cost) || 0), 0);
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

  const submit = () => {
    if (!form.title.trim()) return;
    addPlanStep(p.id, form.title, {
      dept,
      tooth: form.tooth.trim() || undefined,
      cost: form.cost === '' ? undefined : Number(form.cost),
      note: form.note.trim() || undefined,
    });
    setForm({ title: '', tooth: '', cost: '', note: '' });
    setAdding(false);
  };

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
            onPress={() => (isRadio ? undefined : setPicking(true))}
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
            {total > 0 && (
              <Text className="ml-auto text-[13px] font-extrabold text-slate-800">${total.toLocaleString()}</Text>
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
                onChangeText={(v) => setForm((f) => ({ ...f, tooth: v }))}
                placeholder={ar ? 'رقم السن' : 'Tooth #'}
                placeholderTextColor="#94A3B8"
                className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800"
              />
              <TextInput
                value={form.cost}
                onChangeText={(v) => setForm((f) => ({ ...f, cost: v }))}
                keyboardType="decimal-pad"
                placeholder={ar ? 'الكلفة' : 'Cost'}
                placeholderTextColor="#94A3B8"
                className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800"
              />
            </View>
            <TextInput
              value={form.note}
              onChangeText={(v) => setForm((f) => ({ ...f, note: v }))}
              placeholder={ar ? 'ملاحظة (الجلسة الثانية…)' : 'Note (session 2…)'}
              placeholderTextColor="#94A3B8"
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800"
            />
            <Pressable onPress={submit} className="h-11 items-center justify-center rounded-xl bg-primary" style={shadowSm}>
              <Text className="text-xs font-extrabold text-primary-foreground">{ar ? 'إضافة للخطة' : 'Add to plan'}</Text>
            </Pressable>
          </View>
        )}

        {isRadio ? (
          <View className="items-center rounded-2xl bg-slate-50 py-8">
            <Cloud size={28} color="#94A3B8" />
            <Text className="mt-2 text-xs font-semibold text-slate-500">
              {ar ? 'معرض الأشعة قادم قريباً' : 'X-ray gallery coming soon'}
            </Text>
          </View>
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
                <View className="min-w-0 flex-1">
                  <Text
                    numberOfLines={1}
                    className={cn('text-xs font-semibold text-slate-800', s.status === 'done' && 'text-slate-400 line-through')}
                  >
                    {s.title}
                  </Text>
                  <Text numberOfLines={1} className="text-[10px] text-slate-400">
                    {[s.note, s.cost ? `$${Number(s.cost).toLocaleString()}` : ''].filter(Boolean).join(' · ') ||
                      (ar ? 'بدون ملاحظات' : 'No notes')}
                  </Text>
                </View>
                <Pressable
                  onPress={() => cyclePlanStep(p.id, s.id)}
                  style={{ flexShrink: 0, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: PLAN_META[s.status].bg }}
                >
                  <Text className="font-bold" style={{ fontSize: 10, color: PLAN_META[s.status].text }}>
                    {ar ? PLAN_META[s.status].ar : PLAN_META[s.status].en}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => updatePlanStep(p.id, s.id, { status: s.status === 'done' ? 'planned' : 'done' })}
                  className={cn(
                    'h-6 w-6 shrink-0 items-center justify-center rounded-lg',
                    s.status === 'done' ? 'bg-primary' : 'border border-slate-300 bg-white',
                  )}
                >
                  {s.status === 'done' && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                </Pressable>
                <Pressable onPress={() => removePlanStep(p.id, s.id)} className="shrink-0 p-1">
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
            setForm({ title, tooth: '', cost: '', note: '' });
            setPicking(false);
            setAdding(true);
          }}
          onCustom={() => {
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
