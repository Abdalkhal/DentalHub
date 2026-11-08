import { useCallback, useEffect, useMemo, useState } from 'react';
import { signOutDevice } from '@/lib/push';
import { ActivityIndicator, Alert, Image, Linking, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileImage,
  History,
  Inbox,
  LogOut,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Printer,
  Search,
  Share2,
  Upload,
  Users,
  X,
} from 'lucide-react-native';

import { JoinCodePanel } from '@/components/ClinicTeam';
import { Select, Text } from '@/components/ui';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { auth } from '@/integrations/firebase/client';
import { whatsappLink } from '@/lib/booking';
import {
  activityTime,
  BOOKING_REASONS,
  createSharedPatient,
  createStaffAppointment,
  getStaffContext,
  getStaffReport,
  joinClinicWithCode,
  listStaffBookings,
  listStaffMaterials,
  MATERIAL_STATUSES,
  PENDING_STAFF_CODE,
  planStatusLabel,
  resolveStaffBooking,
  setStaffMaterial,
  sharedBalance,
  sharedUploadPath,
  staffReceiptBody,
  staffReceiptText,
  statusLabel,
  teamErrorMessage,
  toothLabel,
  updateStaffAppointment,
  updateStaffPatient,
  useClinicActivity,
  useStaffAppointments,
  useStaffMemberships,
  useStaffPatients,
  type StaffAppointment,
  type StaffBooking,
  type StaffMaterial,
  type StaffMember,
  type StaffPatient,
  type StaffPermission,
  type StaffReceipt,
  type StaffReport,
} from '@/lib/clinicTeam';
import { useI18n } from '@/lib/i18n';
import { uploadFileUri } from '@/lib/nativeUpload';
import { formatAmountInput, formatMoney, localDay, parseAmountInput, type FeeCurrency } from '@/lib/patientsStore';
import { printDocument, receiptHtml, sharePdf } from '@/lib/print';
import { useUserRole } from '@/lib/useAuth';
import { cn } from '@/lib/utils';

type Tab = 'appointments' | 'bookings' | 'patients' | 'materials' | 'reports' | 'activity';
type Common = { m: StaffMember; ar: boolean };

const STATUS_STYLE: Record<StaffAppointment['status'], [string, string]> = {
  confirmed: ['bg-blue-50', 'text-blue-700'],
  waiting: ['bg-amber-50', 'text-amber-700'],
  completed: ['bg-emerald-50', 'text-emerald-700'],
  cancelled: ['bg-slate-100', 'text-slate-500'],
};

const inputCls = 'h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800';
const ltr = { writingDirection: 'ltr' as const, textAlign: 'left' as const };

const Card = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <View className={cn('gap-2.5 rounded-2xl border border-slate-200 bg-white p-4', className)}>{children}</View>
);

const Empty = ({ icon: Icon, text }: { icon: typeof Inbox; text: string }) => (
  <View className="items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white py-12">
    <Icon size={30} color="#CBD5E1" />
    <Text className="text-xs text-slate-500">{text}</Text>
  </View>
);

const Spinner = () => (
  <View className="py-10">
    <ActivityIndicator color="#2563EB" />
  </View>
);

const ErrorLine = ({ text }: { text: string }) =>
  text ? (
    <View className="rounded-xl bg-rose-50 p-3">
      <Text className="text-xs font-medium text-rose-700">{text}</Text>
    </View>
  ) : null;

function Primary({ label, busy, disabled, onPress }: { label: string; busy?: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable disabled={busy || disabled} onPress={onPress} className="h-12 items-center justify-center rounded-2xl bg-primary" style={{ opacity: busy || disabled ? 0.6 : 1 }}>
      {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text className="text-sm font-extrabold text-primary-foreground">{label}</Text>}
    </Pressable>
  );
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <View className="flex-1">
      <Text className="mb-1.5 text-[11px] font-bold text-slate-500">{text}</Text>
      {children}
    </View>
  );
}

function SheetView({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[88%] rounded-t-3xl bg-white" style={{ paddingBottom: insets.bottom + 12 }}>
          <View className="flex-row items-center justify-between px-4 pb-2 pt-4">
            <Text className="flex-1 text-sm font-extrabold text-slate-900">{title}</Text>
            <Pressable onPress={onClose} className="h-8 w-8 items-center justify-center rounded-full bg-slate-100">
              <X size={15} color="#64748B" />
            </Pressable>
          </View>
          <KeyboardAwareScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8, gap: 12 }} keyboardShouldPersistTaps="handled">
            {children}
          </KeyboardAwareScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function SecretaryScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const insets = useSafeAreaInsets();
  const { user, role, loading } = useUserRole();
  const memberships = useStaffMemberships(user?.uid);
  const [clinicKey, setClinicKey] = useState('');
  const [tab, setTab] = useState<Tab | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [joining, setJoining] = useState(false);

  // The invite they signed up from, answered as soon as their email is verified.
  useEffect(() => {
    if (!user?.emailVerified) return;
    const code = localStorage.getItem(PENDING_STAFF_CODE);
    if (!code) return;
    setJoining(true);
    joinClinicWithCode(code)
      .catch((e) => console.warn('Invite not accepted:', e))
      .finally(() => {
        localStorage.removeItem(PENDING_STAFF_CODE);
        setJoining(false);
      });
  }, [user?.emailVerified]);

  const m = memberships.find((x) => x.id === clinicKey) ?? memberships[0];
  const p = m?.permissions;

  const tabs = useMemo(() => {
    const all: { id: Tab; ar: string; en: string; icon: typeof Inbox; needs?: StaffPermission }[] = [
      { id: 'appointments', ar: 'المواعيد', en: 'Appointments', icon: CalendarDays, needs: 'appointments' },
      { id: 'bookings', ar: 'طلبات الحجز', en: 'Requests', icon: Inbox, needs: 'bookings' },
      { id: 'patients', ar: 'المرضى', en: 'Patients', icon: Users, needs: 'patients' },
      { id: 'materials', ar: 'المواد', en: 'Materials', icon: Boxes, needs: 'materials' },
      { id: 'reports', ar: 'التقارير', en: 'Reports', icon: BarChart3, needs: 'reports' },
      { id: 'activity', ar: 'نشاطي', en: 'My activity', icon: History },
    ];
    return all.filter((t) => !t.needs || p?.[t.needs]);
  }, [p]);
  const current = tabs.find((t) => t.id === tab)?.id ?? tabs[0]?.id;

  const refreshPending = useCallback(() => {
    if (!m || !m.permissions.bookings) {
      setPendingCount(0);
      return;
    }
    listStaffBookings(m)
      .then((r) => setPendingCount(r.requests.length))
      .catch(() => setPendingCount(0));
  }, [m]);
  useEffect(refreshPending, [refreshPending]);

  if (!loading && role && role.accountType !== 'secretary') return <Redirect href="/" />;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary">
          <Text className="text-base font-extrabold text-primary-foreground">{(m?.clinicName || role?.name || '?').trim().charAt(0)}</Text>
        </View>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-sm font-extrabold text-slate-900">{m?.clinicName ?? (ar ? 'مساحة السكرتارية' : 'Secretary workspace')}</Text>
          <Text numberOfLines={1} className="text-[11px] text-slate-500">{role?.name}{m ? ` · ${ar ? 'عيادة' : 'Clinic of'} ${m.ownerName}` : ''}</Text>
        </View>
        <Pressable
          accessibilityLabel={ar ? 'تسجيل الخروج' : 'Sign out'}
          onPress={() => void signOutDevice().then(() => router.replace('/login'))}
          className="h-9 w-9 items-center justify-center rounded-xl border border-slate-200"
        >
          <LogOut size={15} color="#64748B" />
        </Pressable>
      </View>

      {memberships.length > 1 && m && (
        <View className="bg-white px-4 pb-2">
          <Select value={m.id} onChange={(v) => { setClinicKey(v); setTab(null); }} options={memberships.map((x) => ({ value: x.id, label: x.clinicName }))} />
        </View>
      )}

      {m && (
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 12, paddingVertical: 10 }}>
            {tabs.map((t) => {
              const on = current === t.id;
              return (
                <Pressable key={t.id} onPress={() => setTab(t.id)} className={cn('h-10 flex-row items-center gap-1.5 rounded-xl px-3', on ? 'bg-primary' : 'bg-white')}>
                  <t.icon size={15} color={on ? '#FFFFFF' : '#64748B'} />
                  <Text className={cn('text-xs font-bold', on ? 'text-primary-foreground' : 'text-slate-500')}>{ar ? t.ar : t.en}</Text>
                  {t.id === 'bookings' && pendingCount > 0 && (
                    <View className="rounded-full bg-rose-500 px-1.5">
                      <Text className="text-[10px] font-extrabold text-white">{pendingCount}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <KeyboardAwareScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingTop: m ? 0 : 12, paddingBottom: insets.bottom + 24, gap: 12 }} keyboardShouldPersistTaps="handled">
        {!m ? (
          loading || joining ? <Spinner /> : <NoClinic ar={ar} />
        ) : current === 'appointments' ? (
          <AppointmentsTab key={m.id} m={m} ar={ar} uid={user?.uid} />
        ) : current === 'bookings' ? (
          <BookingsTab key={m.id} m={m} ar={ar} onChanged={refreshPending} />
        ) : current === 'patients' ? (
          <PatientsTab key={m.id} m={m} ar={ar} uid={user?.uid} />
        ) : current === 'materials' ? (
          <MaterialsTab key={m.id} m={m} ar={ar} />
        ) : current === 'reports' ? (
          <ReportsTab key={m.id} m={m} ar={ar} />
        ) : (
          <>
            <ActivityTab key={m.id} m={m} ar={ar} uid={user?.uid} />
            <Card>
              <Text className="text-xs font-extrabold text-slate-900">{ar ? 'الانضمام إلى عيادة أخرى' : 'Join another clinic'}</Text>
              <JoinCodePanel ar={ar} />
            </Card>
          </>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

function NoClinic({ ar }: { ar: boolean }) {
  return (
    <Card>
      <View className="items-center gap-1">
        <View className="mb-1 h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
          <ClipboardList size={22} color="#2563EB" />
        </View>
        <Text className="text-sm font-extrabold text-slate-900">{ar ? 'لم تنضم إلى عيادة بعد' : "You haven't joined a clinic yet"}</Text>
        <Text className="text-[11px] text-slate-500">{ar ? 'أدخل رمز الدعوة الذي وصلك من الطبيب.' : 'Enter the invite code the doctor sent you.'}</Text>
      </View>
      <JoinCodePanel ar={ar} />
    </Card>
  );
}

/* ── Appointments ─────────────────────────────────────────────────── */

const shiftDay = (day: string, by: number) => {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + by);
  return localDay(d);
};
const validDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
const validTime = (v: string) => /^\d{2}:\d{2}$/.test(v);

function SmallButton({ label, danger, onPress }: { label: string; danger?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className={cn('h-9 justify-center rounded-lg border px-2.5', danger ? 'border-rose-200' : 'border-slate-200')}>
      <Text className={cn('text-[11px] font-bold', danger ? 'text-rose-600' : 'text-slate-700')}>{label}</Text>
    </Pressable>
  );
}

function AppointmentsTab({ m, ar, uid }: Common & { uid?: string }) {
  const { list, loading } = useStaffAppointments(uid, m.ownerId, m.clinicId);
  const [day, setDay] = useState(localDay());
  const [adding, setAdding] = useState(false);
  const [moving, setMoving] = useState<StaffAppointment | null>(null);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [doctors, setDoctors] = useState<{ uid: string; name: string }[]>([]);

  useEffect(() => {
    getStaffContext(m).then((r) => setDoctors(r.doctors)).catch(() => undefined);
  }, [m]);

  const today = localDay();
  const items = useMemo(() => list.filter((a) => a.date === day).sort((a, b) => a.time.localeCompare(b.time)), [list, day]);
  const counts: [string, number, string][] = [
    [ar ? 'مواعيد' : 'Booked', items.filter((a) => a.status !== 'cancelled').length, 'text-primary'],
    [ar ? 'بالانتظار' : 'Waiting', items.filter((a) => a.status === 'waiting').length, 'text-amber-600'],
    [ar ? 'مكتملة' : 'Done', items.filter((a) => a.status === 'completed').length, 'text-emerald-600'],
  ];

  const setStatus = async (a: StaffAppointment, status: StaffAppointment['status']) => {
    setBusyId(a.id);
    setError('');
    try {
      await updateStaffAppointment(m, a.appointmentId, { status });
    } catch (err) {
      setError(teamErrorMessage(err, ar));
    } finally {
      setBusyId('');
    }
  };
  const confirmCancel = (a: StaffAppointment) =>
    Alert.alert(ar ? 'إلغاء الموعد' : 'Cancel appointment', ar ? `إلغاء موعد ${a.patientName}؟` : `Cancel ${a.patientName}'s appointment?`, [
      { text: ar ? 'رجوع' : 'Back', style: 'cancel' },
      { text: ar ? 'إلغاء الموعد' : 'Cancel it', style: 'destructive', onPress: () => void setStatus(a, 'cancelled') },
    ]);

  return (
    <>
      <View className="flex-row items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
        <Pressable onPress={() => setDay(shiftDay(day, -1))} className="h-10 w-10 items-center justify-center rounded-xl border border-slate-200">
          {ar ? <ChevronRight size={16} color="#475569" /> : <ChevronLeft size={16} color="#475569" />}
        </Pressable>
        <Pressable onPress={() => setDay(today)} className="flex-1 items-center">
          <Text className="text-xs font-extrabold text-slate-900" style={{ writingDirection: 'ltr' }}>{day}</Text>
          {day !== today && <Text className="text-[10px] font-bold text-primary">{ar ? 'العودة إلى اليوم' : 'Back to today'}</Text>}
        </Pressable>
        <Pressable onPress={() => setDay(shiftDay(day, 1))} className="h-10 w-10 items-center justify-center rounded-xl border border-slate-200">
          {ar ? <ChevronLeft size={16} color="#475569" /> : <ChevronRight size={16} color="#475569" />}
        </Pressable>
        <Pressable onPress={() => setAdding(true)} accessibilityLabel={ar ? 'موعد جديد' : 'New appointment'} className="h-10 w-10 items-center justify-center rounded-xl bg-primary">
          <Plus size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      <View className="flex-row gap-2">
        {counts.map(([label, n, color]) => (
          <View key={label} className="flex-1 items-center rounded-2xl border border-slate-200 bg-white p-3">
            <Text className={cn('text-xl font-extrabold', color)}>{n}</Text>
            <Text className="text-[10px] font-bold text-slate-500">{label}</Text>
          </View>
        ))}
      </View>

      <ErrorLine text={error} />

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Empty icon={CalendarDays} text={ar ? 'لا مواعيد في هذا اليوم' : 'No appointments on this day'} />
      ) : (
        items.map((a) => (
          <View key={a.id} className="gap-2.5 rounded-2xl border border-slate-200 bg-white p-3" style={{ opacity: a.status === 'cancelled' ? 0.6 : 1 }}>
            <View className="flex-row items-start gap-3">
              <View className="w-14 items-center rounded-xl bg-blue-50 py-2">
                <Text className="text-sm font-extrabold text-primary" style={{ writingDirection: 'ltr' }}>{a.time}</Text>
              </View>
              <View className="min-w-0 flex-1">
                <View className="flex-row items-center gap-2">
                  <Text numberOfLines={1} className="flex-shrink text-sm font-extrabold text-slate-900">{a.patientName}</Text>
                  <View className={cn('rounded-full px-2 py-0.5', STATUS_STYLE[a.status][0])}>
                    <Text className={cn('text-[10px] font-bold', STATUS_STYLE[a.status][1])}>{statusLabel(a.status, ar)}</Text>
                  </View>
                </View>
                <Text numberOfLines={1} className="text-[11px] text-slate-500">{[a.treatment || a.appointmentType, a.doctor].filter(Boolean).join(' · ')}</Text>
                {!!a.notes && <Text className="mt-0.5 text-[11px] text-slate-500">{a.notes}</Text>}
              </View>
            </View>
            <View className="flex-row flex-wrap items-center gap-1.5">
              {!!a.phone && (
                <>
                  <Pressable onPress={() => void Linking.openURL(`tel:${a.phone}`)} className="h-9 w-9 items-center justify-center rounded-lg bg-slate-100"><Phone size={14} color="#2563EB" /></Pressable>
                  <Pressable onPress={() => void Linking.openURL(whatsappLink(a.phone, ''))} className="h-9 w-9 items-center justify-center rounded-lg bg-slate-100"><MessageCircle size={14} color="#047857" /></Pressable>
                </>
              )}
              <View className="flex-1" />
              {busyId === a.id ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                a.status !== 'cancelled' && (
                  <>
                    {a.status === 'confirmed' && <SmallButton label={ar ? 'وصل المريض' : 'Arrived'} onPress={() => void setStatus(a, 'waiting')} />}
                    {a.status !== 'completed' && <SmallButton label={ar ? 'اكتمل' : 'Done'} onPress={() => void setStatus(a, 'completed')} />}
                    <SmallButton label={ar ? 'نقل' : 'Move'} onPress={() => setMoving(a)} />
                    {a.status !== 'completed' && <SmallButton danger label={ar ? 'إلغاء' : 'Cancel'} onPress={() => confirmCancel(a)} />}
                  </>
                )
              )}
            </View>
          </View>
        ))
      )}

      {adding && <AppointmentSheet m={m} ar={ar} day={day} doctors={doctors} onClose={() => setAdding(false)} />}
      {moving && <MoveSheet m={m} ar={ar} a={moving} onClose={() => setMoving(null)} />}
    </>
  );
}

function AppointmentSheet({ m, ar, day, doctors, onClose }: Common & { day: string; doctors: { uid: string; name: string }[]; onClose: () => void }) {
  const [f, setF] = useState({ patientName: '', phone: '', date: day, time: '10:00', treatment: '', notes: '', doctorUid: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  const ok = f.patientName.trim() && validDay(f.date) && validTime(f.time);
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await createStaffAppointment(m, f);
      onClose();
    } catch (err) {
      setError(teamErrorMessage(err, ar));
      setBusy(false);
    }
  };
  return (
    <SheetView title={ar ? 'موعد جديد' : 'New appointment'} onClose={onClose}>
      <Label text={ar ? 'اسم المريض' : 'Patient name'}>
        <TextInput value={f.patientName} onChangeText={set('patientName')} className={inputCls} />
      </Label>
      <Label text={ar ? 'الهاتف' : 'Phone'}>
        <TextInput value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" className={inputCls} style={ltr} />
      </Label>
      <View className="flex-row gap-2.5">
        <Label text={ar ? 'التاريخ' : 'Date'}>
          <TextInput value={f.date} onChangeText={set('date')} placeholder="2026-11-30" placeholderTextColor="#94A3B8" className={inputCls} style={ltr} />
        </Label>
        <Label text={ar ? 'الوقت' : 'Time'}>
          <TextInput value={f.time} onChangeText={set('time')} placeholder="10:00" placeholderTextColor="#94A3B8" className={inputCls} style={ltr} />
        </Label>
      </View>
      {doctors.length > 1 && (
        <Label text={ar ? 'الطبيب' : 'Doctor'}>
          <Select value={f.doctorUid} onChange={set('doctorUid')} options={doctors.map((d) => ({ value: d.uid, label: d.name }))} />
        </Label>
      )}
      <Label text={ar ? 'العلاج' : 'Treatment'}>
        <TextInput value={f.treatment} onChangeText={set('treatment')} className={inputCls} />
      </Label>
      <Label text={ar ? 'ملاحظة' : 'Note'}>
        <TextInput value={f.notes} onChangeText={set('notes')} className={inputCls} />
      </Label>
      <ErrorLine text={error} />
      <Primary label={ar ? 'حفظ الموعد' : 'Save'} busy={busy} disabled={!ok} onPress={() => void submit()} />
    </SheetView>
  );
}

function MoveSheet({ m, ar, a, onClose }: Common & { a: StaffAppointment; onClose: () => void }) {
  const [date, setDate] = useState(a.date);
  const [time, setTime] = useState(a.time);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await updateStaffAppointment(m, a.appointmentId, { date, time });
      onClose();
    } catch (err) {
      setError(teamErrorMessage(err, ar));
      setBusy(false);
    }
  };
  return (
    <SheetView title={ar ? `نقل موعد ${a.patientName}` : `Move ${a.patientName}`} onClose={onClose}>
      <View className="flex-row gap-2.5">
        <Label text={ar ? 'التاريخ' : 'Date'}>
          <TextInput value={date} onChangeText={setDate} className={inputCls} style={ltr} />
        </Label>
        <Label text={ar ? 'الوقت' : 'Time'}>
          <TextInput value={time} onChangeText={setTime} className={inputCls} style={ltr} />
        </Label>
      </View>
      <ErrorLine text={error} />
      <Primary label={ar ? 'حفظ' : 'Save'} busy={busy} disabled={!validDay(date) || !validTime(time)} onPress={() => void save()} />
    </SheetView>
  );
}

/* ── Booking requests ─────────────────────────────────────────────── */

function BookingsTab({ m, ar, onChanged }: Common & { onChanged: () => void }) {
  const [list, setList] = useState<StaffBooking[] | null>(null);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [rejecting, setRejecting] = useState<StaffBooking | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    listStaffBookings(m)
      .then((r) => setList(r.requests))
      .catch((err) => {
        setList([]);
        setError(teamErrorMessage(err, ar));
      });
  }, [m, ar]);

  const resolve = async (r: StaffBooking, accept: boolean, why = '') => {
    setBusyId(r.id);
    setError('');
    try {
      await resolveStaffBooking(m, r.id, accept, why);
      setList((cur) => (cur ?? []).filter((x) => x.id !== r.id));
      onChanged();
    } catch (err) {
      setError(teamErrorMessage(err, ar));
    } finally {
      setBusyId('');
    }
  };

  if (!list) return <Spinner />;
  return (
    <>
      <ErrorLine text={error} />
      {list.length === 0 ? (
        <Empty icon={Inbox} text={ar ? 'لا طلبات حجز جديدة' : 'No new booking requests'} />
      ) : (
        list.map((r) => (
          <View key={r.id} className="gap-2.5 rounded-2xl border border-slate-200 bg-white p-3.5">
            <View className="flex-row items-start justify-between gap-2">
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className="text-sm font-extrabold text-slate-900">{r.patientName}</Text>
                <Text className="text-[11px] text-slate-500">{BOOKING_REASONS[r.reason]?.[ar ? 0 : 1] ?? r.reason}</Text>
              </View>
              <View className="items-center rounded-xl bg-blue-50 px-2.5 py-1">
                <Text className="text-[11px] font-bold text-primary" style={{ writingDirection: 'ltr' }}>{r.date}</Text>
                <Text className="text-[11px] font-bold text-primary" style={{ writingDirection: 'ltr' }}>{r.time}</Text>
              </View>
            </View>
            {!!r.note && (
              <View className="rounded-xl bg-slate-50 p-2">
                <Text className="text-[11px] text-slate-700">{r.note}</Text>
              </View>
            )}
            <View className="flex-row gap-1.5">
              <Pressable onPress={() => void Linking.openURL(`tel:${r.phone}`)} className="h-11 w-11 items-center justify-center rounded-xl bg-slate-100"><Phone size={16} color="#2563EB" /></Pressable>
              <Pressable disabled={busyId === r.id} onPress={() => void resolve(r, true)} className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-primary" style={{ opacity: busyId === r.id ? 0.6 : 1 }}>
                {busyId === r.id ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Check size={16} color="#FFFFFF" />}
                <Text className="text-xs font-bold text-primary-foreground">{ar ? 'قبول' : 'Accept'}</Text>
              </Pressable>
              <Pressable disabled={busyId === r.id} onPress={() => { setReason(''); setRejecting(r); }} className="h-11 flex-row items-center justify-center gap-1 rounded-xl border border-slate-200 px-4">
                <X size={15} color="#64748B" />
                <Text className="text-xs font-bold text-slate-500">{ar ? 'رفض' : 'Decline'}</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
      {rejecting && (
        <SheetView title={ar ? `رفض طلب ${rejecting.patientName}` : `Decline ${rejecting.patientName}`} onClose={() => setRejecting(null)}>
          <Label text={ar ? 'السبب (اختياري، يصل إلى المريض)' : 'Reason (optional, sent to the patient)'}>
            <TextInput value={reason} onChangeText={setReason} className={inputCls} />
          </Label>
          <Primary
            label={ar ? 'رفض الطلب' : 'Decline'}
            onPress={() => {
              const r = rejecting;
              setRejecting(null);
              void resolve(r, false, reason);
            }}
          />
        </SheetView>
      )}
    </>
  );
}

/* ── Patients ─────────────────────────────────────────────────────── */

function PatientsTab({ m, ar, uid }: Common & { uid?: string }) {
  const { list, loading } = useStaffPatients(uid, m.ownerId, m.clinicId);
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState('');
  const [adding, setAdding] = useState(false);
  const open = list.find((p) => p.id === openId);
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter((p) => p.name.toLowerCase().includes(term) || (p.phone || '').includes(term) || String(p.fileNo).toLowerCase().includes(term));
  }, [list, q]);

  if (open) return <PatientDetail key={open.id} m={m} ar={ar} p={open} uid={uid} onBack={() => setOpenId('')} />;

  return (
    <>
      <View className="flex-row gap-2">
        <View className="h-11 flex-1 flex-row items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
          <Search size={15} color="#94A3B8" />
          <TextInput value={q} onChangeText={setQ} placeholder={ar ? 'الاسم أو الهاتف أو رقم الملف' : 'Name, phone or file #'} placeholderTextColor="#94A3B8" className="h-11 flex-1 text-xs text-slate-800" />
        </View>
        <Pressable onPress={() => setAdding(true)} accessibilityLabel={ar ? 'مريض جديد' : 'New patient'} className="h-11 w-11 items-center justify-center rounded-xl bg-primary">
          <Plus size={19} color="#FFFFFF" />
        </Pressable>
      </View>
      {loading ? (
        <Spinner />
      ) : shown.length === 0 ? (
        <Empty icon={Users} text={q ? (ar ? 'لا نتائج' : 'No results') : ar ? 'لا يوجد مرضى بعد' : 'No patients yet'} />
      ) : (
        shown.map((p) => (
          <Pressable key={p.id} onPress={() => setOpenId(p.id)} className="flex-row items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-sky-100">
              <Text className="text-sm font-extrabold text-sky-700">{p.name.trim().charAt(0) || '?'}</Text>
            </View>
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="text-xs font-bold text-slate-800">{p.name}</Text>
              <Text numberOfLines={1} className="text-[10px] text-slate-500">{[p.fileNo, p.phone].filter(Boolean).join(' · ')}</Text>
            </View>
          </Pressable>
        ))
      )}
      {adding && <PatientSheet m={m} ar={ar} onClose={() => setAdding(false)} />}
    </>
  );
}

function PatientSheet({ m, ar, p, onClose }: Common & { p?: StaffPatient; onClose: () => void }) {
  const [f, setF] = useState({ name: p?.name ?? '', phone: p?.phone ?? '', age: String(p?.age ?? ''), gender: p?.gender === 'female' ? 'female' : 'male' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      if (p) await updateStaffPatient(p, 'setBasics', f);
      else await createSharedPatient(m.ownerId, m.clinicId, f);
      onClose();
    } catch (err) {
      setError(teamErrorMessage(err, ar));
      setBusy(false);
    }
  };
  return (
    <SheetView title={p ? (ar ? 'تعديل البيانات' : 'Edit details') : ar ? 'مريض جديد' : 'New patient'} onClose={onClose}>
      <Label text={ar ? 'الاسم' : 'Name'}>
        <TextInput value={f.name} onChangeText={(v) => setF({ ...f, name: v })} className={inputCls} />
      </Label>
      <Label text={ar ? 'الهاتف' : 'Phone'}>
        <TextInput value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} keyboardType="phone-pad" className={inputCls} style={ltr} />
      </Label>
      <View className="flex-row gap-2.5">
        <Label text={ar ? 'العمر' : 'Age'}>
          <TextInput value={f.age} onChangeText={(v) => setF({ ...f, age: v.replace(/\D/g, '') })} keyboardType="number-pad" className={inputCls} style={ltr} />
        </Label>
        <Label text={ar ? 'الجنس' : 'Gender'}>
          <Select value={f.gender} onChange={(v) => setF({ ...f, gender: v })} options={[{ value: 'male', label: ar ? 'ذكر' : 'Male' }, { value: 'female', label: ar ? 'أنثى' : 'Female' }]} />
        </Label>
      </View>
      <ErrorLine text={error} />
      <Primary label={ar ? 'حفظ' : 'Save'} busy={busy} disabled={!f.name.trim()} onPress={() => void submit()} />
    </SheetView>
  );
}

function PatientDetail({ m, ar, p, uid, onBack }: Common & { p: StaffPatient; uid?: string; onBack: () => void }) {
  const [editing, setEditing] = useState(false);
  return (
    <>
      <Pressable onPress={onBack} className="flex-row items-center gap-1 self-start py-1">
        <ArrowRight size={16} color="#2563EB" style={ar ? undefined : { transform: [{ rotate: '180deg' }] }} />
        <Text className="text-xs font-bold text-primary">{ar ? 'كل المرضى' : 'All patients'}</Text>
      </Pressable>
      <Card>
        <View className="flex-row items-start justify-between gap-2">
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="text-base font-extrabold text-slate-900">{p.name}</Text>
            <Text className="text-[11px] text-slate-500">
              {[p.fileNo, p.age ? `${p.age} ${ar ? 'سنة' : 'y'}` : '', p.gender === 'female' ? (ar ? 'أنثى' : 'Female') : ar ? 'ذكر' : 'Male', p.lastVisit && `${ar ? 'آخر زيارة' : 'Last visit'} ${p.lastVisit}`].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Pressable onPress={() => setEditing(true)} className="h-9 flex-row items-center gap-1 rounded-lg border border-slate-200 px-2.5">
            <Pencil size={12} color="#475569" />
            <Text className="text-[11px] font-bold text-slate-700">{ar ? 'تعديل' : 'Edit'}</Text>
          </Pressable>
        </View>
        {!!p.phone && (
          <View className="flex-row gap-4">
            <Pressable onPress={() => void Linking.openURL(`tel:${p.phone}`)} className="flex-row items-center gap-1">
              <Phone size={12} color="#2563EB" />
              <Text className="text-[11px] font-semibold text-primary">{p.phone}</Text>
            </Pressable>
            <Pressable onPress={() => void Linking.openURL(whatsappLink(p.phone, ''))} className="flex-row items-center gap-1">
              <MessageCircle size={12} color="#047857" />
              <Text className="text-[11px] font-semibold text-emerald-700">{ar ? 'واتساب' : 'WhatsApp'}</Text>
            </Pressable>
          </View>
        )}
      </Card>
      {(m.permissions.payments || !!p.finance) && <FinanceCard m={m} ar={ar} p={p} />}
      {m.permissions.files && <FilesCard ar={ar} p={p} uid={uid} />}
      {p.medical && <MedicalCard ar={ar} medical={p.medical} />}
      {editing && <PatientSheet m={m} ar={ar} p={p} onClose={() => setEditing(false)} />}
    </>
  );
}

function FinanceCard({ m, ar, p }: Common & { p: StaffPatient }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [cur, setCur] = useState<FeeCurrency>(() => (p.finance && p.finance.fees.USD > 0 && !p.finance.fees.IQD ? 'USD' : 'IQD'));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<StaffReceipt | null>(null);
  const f = p.finance;
  const used = f ? (['IQD', 'USD'] as const).filter((c) => f.fees[c] > 0 || sharedBalance(f, c).paid > 0) : [];

  const record = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await updateStaffPatient(p, 'addPayment', { amount: parseAmountInput(amount), currency: cur, note });
      setReceipt(r.receipt);
      setAmount('');
      setNote('');
    } catch (err) {
      setError(teamErrorMessage(err, ar));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Text className="text-xs font-extrabold text-slate-900">{ar ? 'المالية' : 'Finances'}</Text>
      {f && used.length === 0 && <Text className="text-[11px] text-slate-500">{ar ? 'لا توجد مبالغ مسجلة' : 'No amounts recorded'}</Text>}
      {f && used.map((c) => {
        const b = sharedBalance(f, c);
        const cells: [string, number][] = [[ar ? 'الأتعاب' : 'Fees', b.fees], [ar ? 'المدفوع' : 'Paid', b.paid], [ar ? 'المتبقي' : 'Remaining', b.remaining]];
        return (
          <View key={c} className="flex-row gap-1.5">
            {cells.map(([label, v]) => (
              <View key={label} className="flex-1 items-center rounded-xl bg-slate-50 p-2">
                <Text className="text-xs font-extrabold text-slate-900">{formatMoney(v, c)}</Text>
                <Text className="text-[10px] text-slate-500">{label}</Text>
              </View>
            ))}
          </View>
        );
      })}
      {m.permissions.payments && (
        <View className="gap-1.5 rounded-xl bg-slate-50 p-2.5">
          <View className="flex-row gap-1.5">
            {(['IQD', 'USD'] as const).map((c) => (
              <Pressable key={c} onPress={() => { setCur(c); setAmount((a) => formatAmountInput(a, c)); }} className={cn('h-11 justify-center rounded-xl border px-3', cur === c ? 'border-primary bg-primary' : 'border-slate-200 bg-white')}>
                <Text className={cn('text-[11px] font-bold', cur === c ? 'text-primary-foreground' : 'text-slate-500')}>{c === 'IQD' ? 'د.ع' : '$'}</Text>
              </Pressable>
            ))}
            <TextInput value={amount} onChangeText={(v) => setAmount(formatAmountInput(v, cur))} placeholder={ar ? 'المبلغ' : 'Amount'} placeholderTextColor="#94A3B8" keyboardType="decimal-pad" className={cn(inputCls, 'flex-1 bg-white')} style={ltr} />
          </View>
          <TextInput value={note} onChangeText={setNote} placeholder={ar ? 'ملاحظة' : 'Note'} placeholderTextColor="#94A3B8" className={cn(inputCls, 'bg-white')} />
          <Pressable disabled={busy || !parseAmountInput(amount)} onPress={() => void record()} className="h-11 items-center justify-center rounded-xl bg-primary" style={{ opacity: busy || !parseAmountInput(amount) ? 0.5 : 1 }}>
            {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text className="text-xs font-bold text-primary-foreground">{ar ? 'تسجيل الدفعة وإصدار وصل' : 'Record and issue receipt'}</Text>}
          </Pressable>
          <ErrorLine text={error} />
        </View>
      )}
      {receipt && (
        <View className="gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <Text className="text-xs font-extrabold text-emerald-900">
            {ar ? `سُجلت الدفعة ${formatMoney(receipt.amount, receipt.currency)} · وصل ${receipt.receiptNo}` : `Recorded ${formatMoney(receipt.amount, receipt.currency)} · receipt ${receipt.receiptNo}`}
          </Text>
          <View className="flex-row gap-1.5">
            <Pressable onPress={() => void Linking.openURL(whatsappLink(p.phone || '', staffReceiptText(receipt, m.clinicName, ar)))} className="h-10 flex-1 flex-row items-center justify-center gap-1 rounded-xl bg-emerald-600">
              <MessageCircle size={13} color="#FFFFFF" />
              <Text className="text-[11px] font-bold text-white">{ar ? 'واتساب' : 'WhatsApp'}</Text>
            </Pressable>
            <Pressable onPress={() => void printDocument(receiptHtml(staffReceiptBody(receipt, m.clinicName, ar), ar))} className="h-10 flex-1 flex-row items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white">
              <Printer size={13} color="#475569" />
              <Text className="text-[11px] font-bold text-slate-700">{ar ? 'طباعة' : 'Print'}</Text>
            </Pressable>
            <Pressable onPress={() => void sharePdf(`receipt-${receipt.receiptNo}.pdf`, receiptHtml(staffReceiptBody(receipt, m.clinicName, ar), ar))} className="h-10 flex-1 flex-row items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white">
              <Share2 size={13} color="#475569" />
              <Text className="text-[11px] font-bold text-slate-700">{ar ? 'مشاركة' : 'Share'}</Text>
            </Pressable>
          </View>
        </View>
      )}
      {f && [...f.payments].reverse().map((x) => (
        <View key={x.id} className="rounded-xl border border-slate-200 px-3 py-2">
          <Text className="text-[11px] font-bold text-slate-800">{formatMoney(x.amount, x.currency)}</Text>
          <Text className="text-[11px] text-slate-500">{[x.date, x.receiptNo, x.note].filter(Boolean).join(' · ')}</Text>
        </View>
      ))}
    </Card>
  );
}

function FilesCard({ ar, p, uid }: { ar: boolean; p: StaffPatient; uid?: string }) {
  const [tag, setTag] = useState<'xray' | ''>('xray');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    const a = res.canceled ? null : res.assets?.[0];
    if (!a || !uid) return;
    setBusy(true);
    setError('');
    try {
      const type = a.mimeType ?? 'image/jpeg';
      const name = a.fileName ?? `image-${Date.now()}.${type.split('/')[1] ?? 'jpg'}`;
      const uploadPath = sharedUploadPath(uid, name);
      await uploadFileUri(uploadPath, a.uri, type);
      await updateStaffPatient(p, 'addFile', { uploadPath, name, type, tag });
    } catch (err) {
      setError(teamErrorMessage(err, ar));
    } finally {
      setBusy(false);
    }
  };
  const options: ['xray' | '', string][] = [['xray', ar ? 'أشعة' : 'X-ray'], ['', ar ? 'صورة' : 'Photo']];
  return (
    <Card>
      <Text className="text-xs font-extrabold text-slate-900">{ar ? 'الأشعة والملفات' : 'X-rays and files'}</Text>
      <View className="flex-row gap-1.5">
        {options.map(([v, label]) => (
          <Pressable key={v} onPress={() => setTag(v)} className={cn('h-10 justify-center rounded-xl border px-3', tag === v ? 'border-primary bg-primary' : 'border-slate-200 bg-white')}>
            <Text className={cn('text-[11px] font-bold', tag === v ? 'text-primary-foreground' : 'text-slate-500')}>{label}</Text>
          </Pressable>
        ))}
        <Pressable disabled={busy} onPress={() => void pick()} className="h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white">
          {busy ? <ActivityIndicator size="small" color="#2563EB" /> : <Upload size={14} color="#475569" />}
          <Text className="text-[11px] font-bold text-slate-700">{ar ? 'رفع ملف' : 'Upload'}</Text>
        </Pressable>
      </View>
      <ErrorLine text={error} />
      {(p.files ?? []).length > 0 && (
        <View className="flex-row flex-wrap gap-2">
          {(p.files ?? []).map((f) => (
            <Pressable key={f.id} onPress={() => void Linking.openURL(f.url)} style={{ width: '31.5%' }} className="aspect-square items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              {f.type.startsWith('image/') ? <Image source={{ uri: f.url }} className="h-full w-full" resizeMode="cover" /> : <FileImage size={22} color="#94A3B8" />}
            </Pressable>
          ))}
        </View>
      )}
    </Card>
  );
}

function MedicalCard({ ar, medical }: { ar: boolean; medical: NonNullable<StaffPatient['medical']> }) {
  const names: Record<string, string> = { diabetes: 'السكري', hypertension: 'ضغط الدم', heart: 'أمراض القلب', allergy: 'الحساسية', bleeding: 'النزف' };
  const conditions = Object.keys(medical.history || {}).filter((k) => medical.history[k]);
  const alerts = [conditions.map((k) => (ar ? names[k] ?? k : k)).join('، '), medical.allergies && `${ar ? 'حساسية' : 'Allergy'}: ${medical.allergies}`, medical.meds && `${ar ? 'أدوية' : 'Meds'}: ${medical.meds}`].filter(Boolean).join(' · ');
  const teeth = Object.keys(medical.teeth || {}).sort((a, b) => Number(a) - Number(b));
  return (
    <Card>
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-extrabold text-slate-900">{ar ? 'الملف الطبي' : 'Medical file'}</Text>
        <View className="rounded-full bg-slate-100 px-2 py-0.5">
          <Text className="text-[10px] font-bold text-slate-500">{ar ? 'للاطلاع فقط' : 'View only'}</Text>
        </View>
      </View>
      {!!alerts && (
        <View className="rounded-xl bg-amber-50 p-2.5">
          <Text className="text-[11px] font-semibold text-amber-900">{alerts}</Text>
        </View>
      )}
      {!!medical.complaint && <Text className="text-[11px] text-slate-700">{`${ar ? 'الشكوى: ' : 'Complaint: '}${medical.complaint}`}</Text>}
      {!!medical.doctorNote && <Text className="text-[11px] text-slate-700">{`${ar ? 'ملاحظات الطبيب: ' : "Doctor's notes: "}${medical.doctorNote}`}</Text>}
      {teeth.length > 0 && (
        <View className="flex-row flex-wrap gap-1.5">
          {teeth.map((t) => (
            <View key={t} className="rounded-full bg-slate-100 px-2.5 py-1">
              <Text className="text-[10px] font-bold text-slate-700">{t} — {toothLabel(medical.teeth[t], ar)}</Text>
            </View>
          ))}
        </View>
      )}
      {medical.plan.length > 0 && (
        <View className="gap-1">
          <Text className="text-[11px] font-bold text-slate-500">{ar ? 'خطة العلاج' : 'Treatment plan'}</Text>
          {medical.plan.map((s) => (
            <View key={s.id} className="flex-row justify-between gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5">
              <Text numberOfLines={1} className="flex-1 text-[11px] font-semibold text-slate-800">{[s.title, s.tooth].filter(Boolean).join(' · ')}</Text>
              <Text className="text-[11px] text-slate-500">{planStatusLabel(s.status, ar)}</Text>
            </View>
          ))}
        </View>
      )}
      {medical.visits.length > 0 && (
        <View className="gap-1">
          <Text className="text-[11px] font-bold text-slate-500">{ar ? 'الزيارات' : 'Visits'}</Text>
          {medical.visits.map((v) => (
            <View key={v.id} className="rounded-lg border border-slate-200 px-2.5 py-1.5">
              <Text className="text-[11px] font-semibold text-slate-800">{v.procedure}</Text>
              <Text className="text-[11px] text-slate-500">{[v.date, v.note].filter(Boolean).join(' · ')}</Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

/* ── Materials, reports, activity ─────────────────────────────────── */

const MATERIAL_STYLE: Record<StaffMaterial['status'], string> = {
  available: 'border-emerald-600 bg-emerald-600',
  half: 'border-sky-600 bg-sky-600',
  low: 'border-amber-500 bg-amber-500',
  out: 'border-rose-600 bg-rose-600',
};

function MaterialsTab({ m, ar }: Common) {
  const [items, setItems] = useState<StaffMaterial[] | null>(null);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    listStaffMaterials(m)
      .then((r) => setItems(r.items))
      .catch((err) => {
        setItems([]);
        setError(teamErrorMessage(err, ar));
      });
  }, [m, ar]);
  const update = async (id: string, status: StaffMaterial['status']) => {
    setBusyId(id);
    setError('');
    try {
      await setStaffMaterial(m, id, status);
      setItems((cur) => (cur ?? []).map((x) => (x.id === id ? { ...x, status } : x)));
    } catch (err) {
      setError(teamErrorMessage(err, ar));
    } finally {
      setBusyId('');
    }
  };
  if (!items) return <Spinner />;
  return (
    <>
      <ErrorLine text={error} />
      {items.length === 0 ? (
        <Empty icon={Boxes} text={ar ? 'لا توجد مواد مسجلة' : 'No materials recorded'} />
      ) : (
        items.map((x) => (
          <View key={x.id} className="gap-2 rounded-2xl border border-slate-200 bg-white p-3">
            <View className="flex-row items-center justify-between gap-2">
              <Text numberOfLines={1} className="flex-1 text-xs font-bold text-slate-800">{x.name}</Text>
              {busyId === x.id ? <ActivityIndicator size="small" color="#2563EB" /> : <Text className="text-[10px] text-slate-500">{ar ? `الكمية ${x.qty}` : `Qty ${x.qty}`}</Text>}
            </View>
            <View className="flex-row gap-1">
              {MATERIAL_STATUSES.map((s) => {
                const on = x.status === s.id;
                return (
                  <Pressable key={s.id} disabled={busyId === x.id || on} onPress={() => void update(x.id, s.id)} className={cn('h-9 flex-1 items-center justify-center rounded-lg border', on ? MATERIAL_STYLE[s.id] : 'border-slate-200 bg-white')}>
                    <Text className={cn('text-[10px] font-bold', on ? 'text-white' : 'text-slate-500')}>{ar ? s.ar : s.en}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))
      )}
    </>
  );
}

function ReportsTab({ m, ar }: Common) {
  const [r, setR] = useState<StaffReport | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    getStaffReport(m).then(setR).catch((err) => setError(teamErrorMessage(err, ar)));
  }, [m, ar]);
  if (error) return <ErrorLine text={error} />;
  if (!r) return <Spinner />;
  const stats: [string, number][] = [
    [ar ? 'مواعيد اليوم' : 'Today', r.appointmentsToday],
    [ar ? 'مواعيد الشهر' : 'This month', r.appointmentsThisMonth],
    [ar ? 'المرضى' : 'Patients', r.patientCount],
  ];
  return (
    <>
      <View className="flex-row gap-2">
        {stats.map(([label, n]) => (
          <View key={label} className="flex-1 items-center rounded-2xl border border-slate-200 bg-white p-3">
            <Text className="text-xl font-extrabold text-primary">{n}</Text>
            <Text className="text-[10px] font-bold text-slate-500">{label}</Text>
          </View>
        ))}
      </View>
      {(['IQD', 'USD'] as const).map((c) => {
        const cells: [string, number][] = [[ar ? 'هذا الشهر' : 'This month', r.totals[c].month], [ar ? 'الإجمالي' : 'All time', r.totals[c].all]];
        return (
          <Card key={c}>
            <Text className="text-xs font-extrabold text-slate-900">{c === 'IQD' ? (ar ? 'الدخل بالدينار' : 'Income in IQD') : ar ? 'الدخل بالدولار' : 'Income in USD'}</Text>
            <View className="flex-row gap-1.5">
              {cells.map(([label, v]) => (
                <View key={label} className="flex-1 items-center rounded-xl bg-slate-50 p-2.5">
                  <Text className="text-sm font-extrabold text-slate-900">{formatMoney(v, c)}</Text>
                  <Text className="text-[10px] text-slate-500">{label}</Text>
                </View>
              ))}
            </View>
          </Card>
        );
      })}
    </>
  );
}

function ActivityTab({ m, ar, uid }: Common & { uid?: string }) {
  const list = useClinicActivity('memberId', uid, m.clinicId).filter((a) => a.ownerId === m.ownerId);
  if (list.length === 0) return <Empty icon={History} text={ar ? 'لم تسجل أي عمل بعد' : 'Nothing recorded yet'} />;
  return (
    <>
      {list.map((a) => (
        <View key={a.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <Text className="text-xs text-slate-800">{a.message}</Text>
          <Text className="text-[10px] text-slate-400">{activityTime(a.at, ar)}</Text>
        </View>
      ))}
    </>
  );
}
