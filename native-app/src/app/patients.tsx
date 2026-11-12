import { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { router } from 'expo-router';
import { CalendarClock, CloudOff, MessageCircle, Phone, Plus, Search, Users, X } from 'lucide-react-native';
import { toast } from '@/lib/toast';

import { Screen, Text } from '@/components/ui';
import {
  addPatient,
  updatePatient,
  usePatients,
  syncPatientsNow,
  usePatientSyncStatus,
  EMPTY_HISTORY,
  type MedicalHistory,
  type Patient,
  type PatientStatus,
} from '@/lib/patientsStore';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useSession } from '@/lib/useAuth';
import { setActiveClinic, useClinics } from '@/lib/clinicsStore';
import { usePatientCountsByClinic } from '@/lib/patientClinicCounts';
import { useAppointments, type Appointment } from '@/lib/appointmentsStore';
import { avatarColor, initial, nextVisits, patientsCount, shortDate } from '@/lib/patientList';
import { whatsappLink } from '@/lib/booking';

// The clinic's blue, navy text and soft lines (same as Home and My Clinic).
const BLUE = '#1D6FE8';
const NAVY = '#0F2747';
const MUTED = '#5B6B82';
const LINE = '#DCE7F5';
const softShadow = {
  shadowColor: '#1E3A8A',
  shadowOpacity: 0.07,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;


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

/**
 * One patient on a compact row: avatar, name and status, then the next visit
 * (or the last one), with call / WhatsApp buttons when there is a phone.
 * Empty fields are left out instead of showing a dash.
 */
function PatientCard({ p, ar, next }: { p: Patient; ar: boolean; next?: Appointment }) {
  const meta = STATUS_META[p.status];
  const av = avatarColor(p.name);
  const cycleStatus = () => {
    const nextStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(p.status) + 1) % STATUS_CYCLE.length];
    updatePatient(p.id, { status: nextStatus });
  };
  const age = p.age ? `${p.age} ${ar ? 'سنة' : 'yrs'}` : '';
  const last = p.lastVisit ? `${ar ? 'آخر زيارة' : 'Last visit'} ${shortDate(p.lastVisit, ar)}` : '';
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/patient/[patientId]', params: { patientId: p.id } })}
      className="flex-row items-center gap-3 rounded-[18px] border bg-white px-3 py-2.5"
      style={{ borderColor: LINE, ...softShadow }}
    >
      <View className="h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: av.bg }}>
        <Text className="text-base font-extrabold" style={{ color: av.fg }}>
          {initial(p.name)}
        </Text>
      </View>
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text numberOfLines={1} className="flex-shrink text-[14px] font-extrabold" style={{ color: NAVY }}>
            {p.name}
          </Text>
          <Pressable
            onPress={cycleStatus}
            hitSlop={4}
            style={{ flexShrink: 0, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: meta.bg }}
          >
            <Text className="font-bold" style={{ fontSize: 10, color: meta.text }}>
              {ar ? meta.ar : meta.en}
            </Text>
          </Pressable>
        </View>
        {next ? (
          <View className="mt-1 flex-row items-center gap-1">
            <CalendarClock size={12} color={BLUE} />
            <Text numberOfLines={1} className="flex-shrink text-[11.5px] font-bold" style={{ color: BLUE }}>
              {ar ? 'موعد قادم' : 'Next visit'} {shortDate(next.date, ar)}
              {next.time ? ` · ${'\u2066' + next.time + '\u2069'}` : ''}
            </Text>
          </View>
        ) : (
          <Text numberOfLines={1} className="mt-1 text-[11.5px]" style={{ color: MUTED }}>
            {[age, last].filter(Boolean).join(' · ')}
          </Text>
        )}
        <Text numberOfLines={1} className="mt-0.5 text-[10px]" style={{ color: '#94A3B8' }}>
          {[next ? age : '', p.fileNo].filter(Boolean).join(' · ')}
        </Text>
      </View>
      {!!p.phone && (
        <View className="flex-row items-center gap-1.5">
          <Pressable
            onPress={() => Linking.openURL(`tel:${p.phone}`)}
            hitSlop={4}
            className="h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: '#E8F1FE' }}
            accessibilityLabel={ar ? 'اتصال' : 'Call'}
          >
            <Phone size={16} color={BLUE} />
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL(whatsappLink(p.phone, ''))}
            hitSlop={4}
            className="h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: '#E3F7EC' }}
            accessibilityLabel="WhatsApp"
          >
            <MessageCircle size={16} color="#15803D" />
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

export default function PatientsScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const patients = usePatients();
  const appointments = useAppointments();
  const upcoming = useMemo(() => nextVisits(patients, appointments), [patients, appointments]);
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
  const counts = useMemo(() => {
    const c: Record<PatientStatus | 'all', number> = { all: patients.length, new: 0, in_treatment: 0, completed: 0 };
    for (const p of patients) c[p.status] += 1;
    return c;
  }, [patients]);

  return (
    <Screen scroll={false}>
      {/* The screen title is in the header; here only how many patients there are. */}
      <Text className="text-[12px] font-bold" style={{ color: MUTED }}>
        {patientsCount(patients.length, ar)}
      </Text>

      <SyncNotice ar={ar} />
      <OtherClinicsNotice ar={ar} />

      <View className="relative mt-3">
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={ar ? 'ابحث بالاسم أو الهاتف أو رقم الملف…' : 'Search name, phone or file ID…'}
          placeholderTextColor="#8A9AB0"
          className="h-12 rounded-2xl border bg-white pl-4 pr-11 text-sm"
          style={{ borderColor: '#CFDDF0', color: NAVY, ...softShadow }}
        />
        <View className="absolute bottom-0 right-4 top-0 justify-center">
          <Search size={17} color={BLUE} />
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
                flexDirection: 'row',
                gap: 6,
                borderColor: active ? BLUE : LINE,
                backgroundColor: active ? BLUE : '#FFFFFF',
              }}
            >
              <Text className="font-bold" style={{ fontSize: 11, color: active ? '#FFFFFF' : MUTED }}>
                {s === 'all' ? (ar ? 'الكل' : 'All') : ar ? STATUS_META[s].ar : STATUS_META[s].en}
              </Text>
              <View
                style={{
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  paddingHorizontal: 4,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: active ? 'rgba(255,255,255,0.25)' : '#EEF3FA',
                }}
              >
                <Text className="font-extrabold" style={{ fontSize: 10, color: active ? '#FFFFFF' : NAVY }}>
                  {counts[s]}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView className="mt-3 flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="gap-2 pb-24">
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
          list.map((p) => <PatientCard key={p.id} p={p} ar={ar} next={upcoming.get(p.id)} />)
        )}
      </ScrollView>

      {/* Add a patient: a floating button, so it doesn't split the filters from their results. */}
      <Pressable
        onPress={() => setShowAdd(true)}
        className="absolute bottom-6 h-14 flex-row items-center gap-2 rounded-full px-5"
        style={{
          right: 16,
          backgroundColor: BLUE,
          shadowColor: '#1D4ED8',
          shadowOpacity: 0.35,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        }}
        accessibilityLabel={ar ? 'إضافة مريض جديد' : 'Add new patient'}
      >
        <Plus size={20} color="#FFFFFF" strokeWidth={2.8} />
        <Text className="text-[14px] font-extrabold text-white">{ar ? 'مريض جديد' : 'New patient'}</Text>
      </Pressable>

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

        <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerClassName="gap-3 px-4 py-4">
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
        </KeyboardAwareScrollView>
      </View>
    </View>
  );
}

/** Sync is automatic; this only appears when records did not reach the cloud
 *  (they are retried on their own — the button just does it now). */
function SyncNotice({ ar }: { ar: boolean }) {
  const { failed, error } = usePatientSyncStatus();
  const [busy, setBusy] = useState(false);
  if (!error) return null;
  const retry = async () => {
    setBusy(true);
    try {
      const r = await syncPatientsNow();
      if (r.failed === 0 && !r.error) toast.success(ar ? 'تمت مزامنة المرضى' : 'Patients synced');
    } finally {
      setBusy(false);
    }
  };
  return (
    <View className="mt-3 flex-row items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3">
      <CloudOff size={18} color="#B45309" />
      <View className="min-w-0 flex-1">
        <Text className="text-xs font-bold text-amber-800">
          {failed > 0
            ? ar
              ? `لم تُرفع بيانات ${failed} مريض إلى السحابة بعد`
              : `${failed} patient(s) not saved to the cloud yet`
            : ar
              ? 'تعذر الاتصال بالسحابة لمزامنة المرضى'
              : 'Could not reach the cloud to sync patients'}
        </Text>
        <Text className="mt-0.5 text-[11px] text-amber-700">{ar ? 'ستُعاد المحاولة تلقائياً.' : 'Retrying automatically.'}</Text>
        <Text className="mt-0.5 text-[10px] text-amber-600">{error}</Text>
      </View>
      <Pressable onPress={retry} disabled={busy} className="h-8 items-center justify-center rounded-xl bg-white px-2.5">
        {busy ? (
          <ActivityIndicator size="small" color="#B45309" />
        ) : (
          <Text className="text-[11px] font-bold text-amber-800">{ar ? 'أعد الآن' : 'Retry'}</Text>
        )}
      </Pressable>
    </View>
  );
}

/** Patients belong to one clinic, and adding a clinic switches to it — an
 *  empty list then looked like the patients were gone. Points to the others. */
function OtherClinicsNotice({ ar }: { ar: boolean }) {
  const { user } = useSession();
  const { clinics, activeClinicId } = useClinics();
  const counts = usePatientCountsByClinic(clinics.length > 1 ? user?.uid : undefined);
  const [hidden, setHidden] = useState(false);
  const others = clinics.filter((c) => c.id !== activeClinicId && (counts[c.id] ?? 0) > 0);
  if (hidden || others.length === 0) return null;
  return (
    <View className="mt-2.5 gap-1.5">
      {others.map((c) => (
        <View key={c.id} className="h-10 flex-row items-center gap-2 rounded-xl border bg-white pe-1.5 ps-3" style={{ borderColor: LINE }}>
          <Users size={14} color={MUTED} />
          <Text numberOfLines={1} className="min-w-0 flex-1 text-[12px]" style={{ color: MUTED }}>
            {ar ? `${patientsCount(counts[c.id], true)} في «${c.name}»` : `${patientsCount(counts[c.id], false)} in “${c.name}”`}
          </Text>
          <Pressable onPress={() => setActiveClinic(c.id)} hitSlop={6} className="h-7 justify-center rounded-lg px-2.5" style={{ backgroundColor: '#E8F1FE' }}>
            <Text className="text-[11px] font-extrabold" style={{ color: BLUE }}>
              {ar ? 'عرض' : 'Show'}
            </Text>
          </Pressable>
          <Pressable onPress={() => setHidden(true)} hitSlop={8} className="h-7 w-7 items-center justify-center" accessibilityLabel={ar ? 'إخفاء' : 'Hide'}>
            <X size={14} color="#94A3B8" />
          </Pressable>
        </View>
      ))}
    </View>
  );
}
