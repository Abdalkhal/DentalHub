import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { CalendarDays, ChevronLeft, ChevronRight, Phone, Plus, Search, Users, X } from 'lucide-react-native';

import { Screen, Text } from '@/components/ui';
import {
  addPatient,
  updatePatient,
  usePatients,
  EMPTY_HISTORY,
  type MedicalHistory,
  type Patient,
  type PatientStatus,
} from '@/lib/patientsStore';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// Plain color values instead of NativeWind bg-*/text-* classes: this badge
// re-renders every time `cycleStatus` fires (many at once in a long patient
// list), which hits a known react-native-css-interop class-application race
// on this RN/Android setup — the label can end up silently clipped to its
// first couple of words after a re-render and never recovers. See the same
// workaround already used for shadowSm/shadowMd in patient/[patientId].tsx.
const STATUS_META: Record<PatientStatus, { ar: string; en: string; bg: string; text: string }> = {
  new: { ar: 'مريض جديد', en: 'New', bg: '#DBEAFE', text: '#1D4ED8' },
  in_treatment: { ar: 'علاج قيد الإنجاز', en: 'In treatment', bg: '#FEF3C7', text: '#B45309' },
  completed: { ar: 'مكتمل', en: 'Completed', bg: '#D1FAE5', text: '#047857' },
};

const STATUS_CYCLE: PatientStatus[] = ['new', 'in_treatment', 'completed'];

const HISTORY_LABELS: Array<{ key: keyof MedicalHistory; ar: string; en: string }> = [
  { key: 'diabetes', ar: 'السكري', en: 'Diabetes' },
  { key: 'hypertension', ar: 'ضغط الدم', en: 'Hypertension' },
  { key: 'heart', ar: 'أمراض القلب', en: 'Heart conditions' },
  { key: 'allergy', ar: 'حساسية أدوية', en: 'Drug allergies' },
  { key: 'bleeding', ar: 'ميل للنزف', en: 'Bleeding tendency' },
];

const FILTERS = ['all', 'in_treatment', 'completed', 'new'] as const;

function PatientCard({ p, ar }: { p: Patient; ar: boolean }) {
  const meta = STATUS_META[p.status];
  const cycleStatus = () => {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(p.status) + 1) % STATUS_CYCLE.length];
    updatePatient(p.id, { status: next });
  };
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/patient/[patientId]', params: { patientId: p.id } })}
      className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm"
    >
      <View className="flex-row items-start gap-3">
        <View className="h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50">
          <Text className="text-base font-extrabold text-sky-700">{p.name.trim().charAt(0) || '؟'}</Text>
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <Text numberOfLines={1} className="flex-shrink text-sm font-extrabold text-slate-900">
              {p.name}
            </Text>
            <Pressable
              onPress={cycleStatus}
              style={{ flexShrink: 0, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: meta.bg }}
            >
              <Text className="font-bold" style={{ fontSize: 10, color: meta.text }}>{ar ? meta.ar : meta.en}</Text>
            </Pressable>
          </View>
          <View className="mt-0.5 flex-row flex-wrap items-center gap-1.5">
            <Text className="text-[11px] font-semibold text-slate-500">{p.fileNo}</Text>
            <Text className="text-[11px] text-slate-300">·</Text>
            <Text className="text-[11px] text-slate-500">
              {p.age || '—'} {ar ? 'سنة' : 'yrs'}
            </Text>
          </View>
          <View className="mt-1.5 flex-row items-center gap-3">
            <View className="flex-row items-center gap-1">
              <Phone size={11} color="#94A3B8" />
              <Text className="text-[11px] text-slate-500">{p.phone || '—'}</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <CalendarDays size={11} color="#94A3B8" />
              <Text className="text-[11px] text-slate-500">{p.lastVisit}</Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function PatientsScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const patients = usePatients();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<PatientStatus | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return patients.filter((p) => {
      const okQ = !s || [p.name, p.phone, p.fileNo].some((v) => v.toLowerCase().includes(s));
      return okQ && (status === 'all' || p.status === status);
    });
  }, [patients, q, status]);

  return (
    <Screen scroll={false}>
      <View className="flex-row items-center gap-2">
        <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
          {ar ? <ChevronRight size={16} color="#334155" /> : <ChevronLeft size={16} color="#334155" />}
        </Pressable>
        <View className="min-w-0 flex-1">
          <Text className="text-lg font-extrabold leading-tight text-slate-900">
            {ar ? 'سجل المرضى' : 'Patient Records'}
          </Text>
          <Text className="text-[11px] text-slate-400">
            {ar ? 'إدارة ملفات ومعلومات المرضى' : 'Manage patient files & info'}
          </Text>
        </View>
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-sky-50">
          <Users size={18} color="#0369A1" />
        </View>
      </View>

      <View className="relative mt-3">
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={ar ? 'ابحث بالاسم أو الهاتف أو رقم الملف…' : 'Search name, phone or file ID…'}
          placeholderTextColor="#94A3B8"
          className="h-12 rounded-2xl border border-slate-200 bg-white pl-4 pr-11 text-sm text-slate-700 shadow-sm"
        />
        <View className="absolute bottom-0 right-4 top-0 justify-center">
          <Search size={16} color="#94A3B8" />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerClassName="mt-2.5 gap-1.5"
      >
        {FILTERS.map((s) => {
          const active = status === s;
          return (
            <Pressable
              key={s}
              onPress={() => setStatus(s)}
              style={{
                flexShrink: 0,
                height: 32,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 999,
                borderWidth: 1,
                paddingHorizontal: 12,
                borderColor: active ? '#3B82F6' : '#E2E8F0',
                backgroundColor: active ? '#3B82F6' : '#FFFFFF',
              }}
            >
              <Text className="font-bold" style={{ fontSize: 11, color: active ? '#FFFFFF' : '#64748B' }}>
                {s === 'all' ? (ar ? 'الكل' : 'All') : ar ? STATUS_META[s].ar : STATUS_META[s].en}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        onPress={() => setShowAdd(true)}
        className="mt-3 h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-primary shadow-lg"
      >
        <Plus size={16} color="#FFFFFF" strokeWidth={3} />
        <Text className="text-sm font-extrabold text-primary-foreground">
          {ar ? 'إضافة مريض جديد' : 'Add new patient'}
        </Text>
      </Pressable>

      <ScrollView className="mt-3 flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="gap-2.5 pb-6">
        {list.length === 0 ? (
          <View className="items-center rounded-2xl border border-dashed border-slate-200 bg-white p-8">
            <Users size={32} color="#94A3B8" />
            <Text className="mt-2 text-sm font-semibold text-slate-700">
              {ar ? 'لا يوجد مرضى بعد' : 'No patients yet'}
            </Text>
            <Text className="mt-1 text-center text-[11px] text-slate-400">
              {ar ? 'أضف أول مريض للبدء بإدارة الملفات' : 'Add your first patient to get started'}
            </Text>
          </View>
        ) : (
          list.map((p) => <PatientCard key={p.id} p={p} ar={ar} />)
        )}
      </ScrollView>

      <AddPatientModal open={showAdd} onClose={() => setShowAdd(false)} ar={ar} />
    </Screen>
  );
}

function AddPatientModal({ open, onClose, ar }: { open: boolean; onClose: () => void; ar: boolean }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<PatientStatus>('new');
  const [history, setHistory] = useState<MedicalHistory>({ ...EMPTY_HISTORY });
  const [complaint, setComplaint] = useState('');

  const reset = () => {
    setName('');
    setAge('');
    setGender('male');
    setPhone('');
    setStatus('new');
    setHistory({ ...EMPTY_HISTORY });
    setComplaint('');
  };

  const submit = () => {
    if (!name.trim()) return;
    const p = addPatient({
      name: name.trim(),
      age: age === '' ? '' : Number(age),
      gender,
      phone: phone.trim(),
      status,
      history,
      complaint: complaint.trim(),
    });
    reset();
    onClose();
    router.push({ pathname: '/patient/[patientId]', params: { patientId: p.id } });
  };

  if (!open) return null;

  return (
    <View className="absolute inset-0 items-center justify-center bg-black/40 p-5">
      <View className="max-h-[85%] w-full max-w-md overflow-hidden rounded-3xl bg-white">
        <View className="flex-row items-center justify-between border-b border-slate-100 px-4 pb-2.5 pt-4">
          <Text className="text-base font-extrabold text-slate-900">
            {ar ? 'إضافة مريض جديد' : 'Add new patient'}
          </Text>
          <Pressable onPress={onClose} className="h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
            <X size={16} color="#334155" />
          </Pressable>
        </View>

        <ScrollView contentContainerClassName="gap-3 px-4 py-4">
          <View>
            <Text className="mb-1.5 text-[11px] font-bold text-slate-500">{ar ? 'الاسم الكامل' : 'Full name'}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholderTextColor="#94A3B8"
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800"
            />
          </View>

          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <Text className="mb-1.5 text-[11px] font-bold text-slate-500">{ar ? 'العمر' : 'Age'}</Text>
              <TextInput
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
                placeholderTextColor="#94A3B8"
                className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800"
              />
            </View>
            <View className="flex-1">
              <Text className="mb-1.5 text-[11px] font-bold text-slate-500">{ar ? 'الجنس' : 'Gender'}</Text>
              <View className="h-11 flex-row overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {(['male', 'female'] as const).map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => setGender(g)}
                    className={cn('flex-1 items-center justify-center', gender === g && 'bg-primary')}
                  >
                    <Text className={cn('text-xs font-bold', gender === g ? 'text-primary-foreground' : 'text-slate-600')}>
                      {g === 'male' ? (ar ? 'ذكر' : 'Male') : ar ? 'أنثى' : 'Female'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <View>
            <Text className="mb-1.5 text-[11px] font-bold text-slate-500">{ar ? 'رقم الهاتف' : 'Phone number'}</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholderTextColor="#94A3B8"
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800"
            />
          </View>

          <View>
            <Text className="mb-1.5 text-[11px] font-bold text-slate-500">{ar ? 'الحالة' : 'Status'}</Text>
            <View className="flex-row gap-1.5">
              {(Object.keys(STATUS_META) as PatientStatus[]).map((s) => {
                const active = status === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setStatus(s)}
                    className={cn(
                      'h-10 flex-1 items-center justify-center rounded-xl border',
                      active ? 'border-primary bg-primary' : 'border-slate-200 bg-slate-50',
                    )}
                  >
                    <Text className={cn('text-[11px] font-bold', active ? 'text-primary-foreground' : 'text-slate-600')}>
                      {ar ? STATUS_META[s].ar : STATUS_META[s].en}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <Text className="mb-1.5 text-[11px] font-bold text-slate-500">{ar ? 'التاريخ المرضي' : 'Medical history'}</Text>
            <View className="flex-row flex-wrap gap-1.5">
              {HISTORY_LABELS.map((h) => {
                const active = history[h.key];
                return (
                  <Pressable
                    key={h.key}
                    onPress={() => setHistory((prev) => ({ ...prev, [h.key]: !prev[h.key] }))}
                    className="h-10 items-center justify-center rounded-xl border px-3"
                    style={{
                      width: '48%',
                      borderColor: active ? '#3B82F6' : '#E2E8F0',
                      backgroundColor: active ? 'rgba(59,130,246,0.1)' : '#F8FAFC',
                    }}
                  >
                    <Text className={cn('text-[12px] font-semibold', active ? 'text-primary' : 'text-slate-700')}>
                      {ar ? h.ar : h.en}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <Text className="mb-1.5 text-[11px] font-bold text-slate-500">
              {ar ? 'الشكوى الرئيسية / ملاحظات' : 'Chief complaint / notes'}
            </Text>
            <TextInput
              value={complaint}
              onChangeText={setComplaint}
              multiline
              numberOfLines={3}
              placeholderTextColor="#94A3B8"
              className="min-h-[80px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800"
              style={{ textAlignVertical: 'top' }}
            />
          </View>

          <Pressable onPress={submit} className="mt-1 h-12 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <Text className="text-sm font-extrabold text-primary-foreground">
              {ar ? 'حفظ المريض' : 'Save patient'}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}
