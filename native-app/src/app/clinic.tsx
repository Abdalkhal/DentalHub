import { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { router, type Href } from 'expo-router';
import {
  BarChart3,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  ClipboardList,
  CreditCard,
  Package,
  Pencil,
  Plus,
  Stethoscope,
  Users,
  ShieldCheck,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Screen, Text, Input } from '@/components/ui';
import { AddAppointmentModal } from '@/components/AddAppointmentModal';
import { BookingLinkCard } from '@/components/BookingLinkCard';
import { toDateStr } from '@/components/CalendarPickerModal';
import { useUserRole } from '@/lib/useAuth';
import { useAppointments } from '@/lib/appointmentsStore';
import { useClinic, todayIncome, fmtMoney } from '@/lib/clinicStore';
import { usePatients } from '@/lib/patientsStore';
import { setClinicsStoreUser, useClinics, addClinic, updateClinic, setActiveClinic, type Clinic } from '@/lib/clinicsStore';
import { useI18n } from '@/lib/i18n';
import { useMaterialsBadge } from '@/lib/materialsStore';
import { cn } from '@/lib/utils';
import { GradientFill } from '@/components/appointmentTheme';

// Clinic palette: the app's medical blue, navy text, soft blue lines.
const BLUE = '#1D6FE8';
const NAVY = '#0F2747';
const MUTED = '#5B6B82';
const LINE = '#DCE7F5';
const TINT = '#E8F1FE';
const softShadow = {
  shadowColor: '#1E3A8A',
  shadowOpacity: 0.07,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

type Item = {
  icon: LucideIcon;
  // Lucide glyphs don't all fill their viewBox the same way — Package's
  // outline reads noticeably smaller than a denser icon like ClipboardList
  // at the same numeric size, so this lets a specific item nudge its size up.
  iconSize?: number;
  title: string;
  /** One short line. */
  subtitle: string;
  /** A number shown on the card (patients). */
  count?: number;
  /** An alert count (materials running low). */
  badge?: number;
  to: Href;
};

export default function ClinicHomeScreen() {
  const materialsBadge = useMaterialsBadge();
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useUserRole();

  useEffect(() => {
    if (user?.uid) setClinicsStoreUser(user.uid);
  }, [user?.uid]);

  const { clinics, activeClinicId } = useClinics();
  const activeClinic = clinics.find((c) => c.id === activeClinicId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [formMode, setFormMode] = useState<'closed' | 'add' | 'edit'>('closed');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formWorkDays, setFormWorkDays] = useState('');

  const openAddClinic = () => {
    setEditingId(null);
    setFormName('');
    setFormAddress('');
    setFormWorkDays('');
    setFormMode('add');
    setMenuOpen(false);
  };
  const openEditClinic = (c: Clinic) => {
    setEditingId(c.id);
    setFormName(c.name);
    setFormAddress(c.address);
    setFormWorkDays(c.workDays);
    setFormMode('edit');
    setMenuOpen(false);
  };
  const saveClinicForm = () => {
    if (!formName.trim()) return;
    if (formMode === 'add') {
      addClinic({ name: formName.trim(), address: formAddress.trim(), workDays: formWorkDays.trim() });
    } else if (formMode === 'edit' && editingId) {
      updateClinic(editingId, { name: formName.trim(), address: formAddress.trim(), workDays: formWorkDays.trim() });
    }
    setFormMode('closed');
  };

  const patients = usePatients();
  const appointments = useAppointments();
  const clinic = useClinic();
  const income = todayIncome(clinic);
  // Local calendar day, not UTC — appointments store dates via `toDateStr`
  // (local getFullYear/Month/Date), so comparing against a UTC-sliced ISO
  // string undercounts "today" for any timezone ahead of UTC during the
  // hours after local midnight but before UTC midnight (e.g. Iraq, UTC+3).
  const today = toDateStr(new Date());
  const todays = appointments.filter((a) => a.date === today && a.status !== 'cancelled');
  const todayCount = todays.length;
  // The next patient: today's first appointment from now on that isn't done.
  const nowHm = (() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  })();
  const next = todays
    .filter((a) => a.status !== 'completed' && (a.time || '') >= nowHm)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))[0];
  const incomeText =
    income.IQD || !income.USD
      ? fmtMoney(income.IQD, 'IQD') + (income.USD ? ` + ${fmtMoney(income.USD, 'USD')}` : '')
      : fmtMoney(income.USD, 'USD');

  const [showAdd, setShowAdd] = useState(false);

  const daily: Item[] = [
    {
      icon: Users,
      title: ar ? 'المرضى والمواعيد' : 'Patients & Appointments',
      subtitle: ar ? 'السجلات والمواعيد والخطط' : 'Records, visits and plans',
      count: patients.length,
      to: '/patients',
    },
    {
      icon: CreditCard,
      title: ar ? 'المالية والحسابات' : 'Finance & Accounts',
      subtitle: ar ? 'الإيرادات والمصاريف والفواتير' : 'Income, expenses, invoices',
      to: '/clinic-finance',
    },
  ];

  const inventory: Item[] = [
    {
      icon: ClipboardList,
      title: ar ? 'طلبيات العيادة والمختبرات' : 'Clinic & Lab Orders',
      subtitle: ar ? 'المختبرات والمستلزمات' : 'Labs and supplies',
      to: '/clinic-orders',
    },
    {
      icon: Package,
      iconSize: 22,
      title: ar ? 'مواد العيادة' : 'Clinic Materials',
      subtitle: ar ? 'المخزون والمستهلكات' : 'Stock and consumables',
      to: '/clinic-materials',
      badge: materialsBadge,
    },
  ];

  const team: Item[] = [
    {
      icon: Stethoscope,
      title: ar ? 'أطباء العيادة' : 'Clinic Doctors',
      subtitle: ar ? 'الاختصاصات والدوام' : 'Specialties and shifts',
      to: '/clinic-doctors',
    },
    {
      icon: ShieldCheck,
      title: ar ? 'السكرتارية' : 'Secretaries',
      subtitle: ar ? 'الدعوات والصلاحيات' : 'Invites and access',
      to: '/clinic-secretaries' as Href,
    },
    {
      icon: BarChart3,
      title: ar ? 'التقارير والإحصائيات' : 'Reports & Statistics',
      subtitle: ar ? 'الأداء الشهري والتصدير' : 'Monthly performance, exports',
      to: '/clinic-reports',
    },
  ];

  // A compact card: icon, title, one line. Every card has the same height.
  const renderItem = (it: Item, wide: boolean) => (
    <Pressable key={it.title} onPress={() => router.push(it.to)} className={wide ? 'w-full' : 'w-[48.5%]'}>
      <View className="h-[72px] flex-row items-center gap-2.5 rounded-[18px] border bg-white px-3" style={{ borderColor: LINE, ...softShadow }}>
        <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: TINT }}>
          <it.icon size={it.iconSize ?? 19} color={BLUE} strokeWidth={2.2} />
        </View>
        <View className="min-w-0 flex-1">
          {/* On a phone a half-width card fits the title on two lines; a full-width one also has room for the subtitle. */}
          <Text numberOfLines={2} className="text-[13px] font-extrabold leading-[17px]" style={{ color: NAVY }}>
            {it.title}
          </Text>
          {wide && (
            <Text numberOfLines={1} className="mt-0.5 text-[11px]" style={{ color: MUTED }}>
              {it.subtitle}
            </Text>
          )}
        </View>
        {it.count !== undefined && (
          <View className="h-6 min-w-6 items-center justify-center rounded-full px-1.5" style={{ backgroundColor: TINT }}>
            <Text className="text-[11px] font-extrabold" style={{ color: BLUE }}>
              {it.count}
            </Text>
          </View>
        )}
        {!!it.badge && (
          <View className="h-6 min-w-6 items-center justify-center rounded-full bg-rose-600 px-1.5">
            <Text className="text-[11px] font-extrabold text-white">{it.badge > 99 ? '99+' : it.badge}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );

  const renderSection = (label: string, list: Item[]) => (
    <View>
      <View className="mb-2.5 flex-row items-center gap-2">
        <View className="h-4 w-1 rounded-full" style={{ backgroundColor: BLUE }} />
        <Text className="text-[15px] font-extrabold" style={{ color: NAVY }}>
          {label}
        </Text>
      </View>
      {/* An odd last card spans the row, at the same height as the others. */}
      <View className="flex-row flex-wrap justify-between gap-y-2.5">
        {list.map((it, i) => renderItem(it, list.length % 2 === 1 && i === list.length - 1))}
      </View>
    </View>
  );

  return (
    <Screen>
      {/* Today at a glance: the clinic, today's visits, the next patient and
          today's income, with one main action under them. */}
      <View className="overflow-hidden rounded-3xl" style={{ shadowColor: '#1D4ED8', shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 5 }}>
        <GradientFill colors={['#2F80F0', '#1748B8']} />
        <View pointerEvents="none" style={{ position: 'absolute', top: -50, left: -40, width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.08)' }} />
        <View className="p-4">
          {/* Clinic switcher — a dentist running more than one clinic picks
              which one is active here; every patient/appointment/finance/
              inventory store below re-keys to that clinic's own isolated
              storage the moment it changes (see clinicsStore.ts). */}
          <View className="flex-row items-center justify-between gap-2">
            <Pressable onPress={() => setMenuOpen((v) => !v)} className="h-9 flex-row items-center gap-1.5 rounded-full bg-white/15 pe-2.5 ps-1.5" style={{ maxWidth: '72%' }}>
              <View className="h-6 w-6 items-center justify-center rounded-full bg-white/20">
                <Building2 size={13} color="#FFFFFF" />
              </View>
              <Text numberOfLines={1} className="shrink text-[13px] font-extrabold text-white">
                {activeClinic?.name ?? (ar ? 'عيادتي' : 'My Clinic')}
              </Text>
              <ChevronDown size={15} color="rgba(255,255,255,0.85)" />
            </Pressable>
            <Text className="text-[11px] font-bold text-white/75">{ar ? 'ملخص اليوم' : 'Today'}</Text>
          </View>

          <View className="mt-3.5 flex-row gap-2">
            <Pressable onPress={() => router.push('/clinic-appointments')} className="flex-1 rounded-2xl p-2.5" style={{ backgroundColor: 'rgba(255,255,255,0.13)' }}>
              <Calendar size={15} color="rgba(255,255,255,0.85)" />
              <Text className="mt-1.5 text-[22px] font-extrabold leading-7 text-white">{todayCount}</Text>
              <Text numberOfLines={1} className="text-[10.5px] font-bold text-white/80">
                {ar ? 'مواعيد اليوم' : "Today's visits"}
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push('/clinic-appointments')} className="flex-[1.35] rounded-2xl p-2.5" style={{ backgroundColor: 'rgba(255,255,255,0.13)' }}>
              <Clock size={15} color="rgba(255,255,255,0.85)" />
              <Text numberOfLines={1} className="mt-1.5 text-[14px] font-extrabold leading-7 text-white">
                {next ? next.patientName || (ar ? 'مريض' : 'Patient') : ar ? 'لا يوجد' : 'None'}
              </Text>
              <Text numberOfLines={1} className="text-[10.5px] font-bold text-white/80">
                {next ? `${ar ? 'التالي' : 'Next'} · ${'\u2066' + next.time + '\u2069'}` : ar ? 'المريض التالي' : 'Next patient'}
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push('/clinic-finance')} className="flex-[1.35] rounded-2xl p-2.5" style={{ backgroundColor: 'rgba(255,255,255,0.13)' }}>
              <CreditCard size={15} color="rgba(255,255,255,0.85)" />
              <Text numberOfLines={1} adjustsFontSizeToFit className="mt-1.5 text-[14px] font-extrabold leading-7 text-white">
                {incomeText}
              </Text>
              <Text numberOfLines={1} className="text-[10.5px] font-bold text-white/80">
                {ar ? 'إيرادات اليوم' : "Today's income"}
              </Text>
            </Pressable>
          </View>

          <Pressable onPress={() => setShowAdd(true)} className="mt-3.5 h-12 flex-row items-center justify-center gap-1.5 rounded-2xl bg-white">
            <Plus size={17} color={BLUE} strokeWidth={2.6} />
            <Text className="text-[14px] font-extrabold" style={{ color: BLUE }}>
              {ar ? 'إضافة موعد' : 'Add appointment'}
            </Text>
          </Pressable>
        </View>
      </View>

      {menuOpen && (
        <View className="mt-2 overflow-hidden rounded-2xl border bg-white" style={{ borderColor: LINE, ...softShadow }}>
          {clinics.map((c) => (
            <View key={c.id} className="flex-row items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
              <Pressable
                onPress={() => {
                  setActiveClinic(c.id);
                  setMenuOpen(false);
                }}
                className="min-w-0 flex-1"
              >
                <Text numberOfLines={1} className="text-sm font-bold" style={{ color: NAVY }}>
                  {c.name}
                </Text>
              </Pressable>
              <View className="flex-row items-center gap-1.5">
                <Pressable onPress={() => openEditClinic(c)} className="h-7 w-7 items-center justify-center rounded-lg">
                  <Pencil size={14} color="#94A3B8" />
                </Pressable>
                {c.id === activeClinicId && (
                  <View className="h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: TINT }}>
                    <Check size={14} color={BLUE} />
                  </View>
                )}
              </View>
            </View>
          ))}
          <Pressable onPress={openAddClinic} className="flex-row items-center justify-center gap-1.5 px-4 py-3">
            <Plus size={16} color={BLUE} />
            <Text className="text-sm font-bold" style={{ color: BLUE }}>
              {ar ? 'إضافة عيادة جديدة' : 'Add new clinic'}
            </Text>
          </Pressable>
        </View>
      )}

      <BookingLinkCard uid={user?.uid} />

      <View className="mt-5 gap-5">
        {renderSection(ar ? 'الخدمات اليومية والمرضى' : 'Daily Services & Patients', daily)}
        {renderSection(ar ? 'المخزون والمشتريات' : 'Inventory & Purchases', inventory)}
        {renderSection(ar ? 'الفريق والإدارة' : 'Team & Management', team)}
      </View>

      <AddAppointmentModal open={showAdd} onClose={() => setShowAdd(false)} />

      <Modal visible={formMode !== 'closed'} transparent animationType="fade" onRequestClose={() => setFormMode('closed')}>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        {/* A centred box: as a bottom sheet its buttons sat behind the phone's navigation bar. */}
        <View className="flex-1 justify-center bg-black/40 px-5">
          <View className="gap-3 rounded-3xl bg-white p-5" style={{ shadowColor: '#0F172A', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10 }}>
            <Text className="text-lg font-extrabold text-slate-800">
              {formMode === 'add' ? (ar ? 'عيادة جديدة' : 'New clinic') : ar ? 'تعديل العيادة' : 'Edit clinic'}
            </Text>
            <Input value={formName} onChangeText={setFormName} placeholder={ar ? 'اسم العيادة' : 'Clinic name'} />
            <Input value={formAddress} onChangeText={setFormAddress} placeholder={ar ? 'العنوان' : 'Address'} />
            <Input value={formWorkDays} onChangeText={setFormWorkDays} placeholder={ar ? 'أيام العمل' : 'Working days'} />
            <View className="flex-row gap-3 pt-1">
              <Pressable
                onPress={saveClinicForm}
                disabled={!formName.trim()}
                className={cn('h-12 flex-1 items-center justify-center rounded-2xl', formName.trim() ? 'bg-primary' : 'bg-slate-200')}
              >
                <Text className="text-sm font-bold text-white">{ar ? 'حفظ' : 'Save'}</Text>
              </Pressable>
              <Pressable
                onPress={() => setFormMode('closed')}
                className="h-12 flex-1 items-center justify-center rounded-2xl border border-slate-200"
              >
                <Text className="text-sm font-bold text-slate-600">{ar ? 'إلغاء' : 'Cancel'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
