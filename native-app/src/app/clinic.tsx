import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, View } from 'react-native';
import { router, type Href } from 'expo-router';
import {
  BarChart3,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ClipboardList,
  CreditCard,
  Package,
  Pencil,
  Plus,
  Stethoscope,
  Users,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Screen, Text, Input } from '@/components/ui';
import { AddAppointmentModal } from '@/components/AddAppointmentModal';
import { toDateStr } from '@/components/CalendarPickerModal';
import { useUserRole } from '@/lib/useAuth';
import { useAppointments } from '@/lib/appointmentsStore';
import { useClinic, clinicTotals } from '@/lib/clinicStore';
import { usePatients } from '@/lib/patientsStore';
import { setClinicsStoreUser, useClinics, addClinic, updateClinic, setActiveClinic, type Clinic } from '@/lib/clinicsStore';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Item = {
  icon: LucideIcon;
  // Lucide glyphs don't all fill their viewBox the same way — Package's
  // outline reads noticeably smaller than a denser icon like ClipboardList
  // at the same numeric size, so this lets a specific item nudge its size up
  // to look visually consistent with the others in its row.
  iconSize?: number;
  tone: string;
  color: string;
  title: string;
  subtitle: string;
  chip?: { label: string; cls: string };
  to: Href;
};

export default function ClinicHomeScreen() {
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
  const totals = clinicTotals(clinic);
  // Local calendar day, not UTC — appointments store dates via `toDateStr`
  // (local getFullYear/Month/Date), so comparing against a UTC-sliced ISO
  // string undercounts "today" for any timezone ahead of UTC during the
  // hours after local midnight but before UTC midnight (e.g. Iraq, UTC+3).
  const today = toDateStr(new Date());
  const todayCount = appointments.filter((a) => a.date === today).length;

  const [showAdd, setShowAdd] = useState(false);

  const daily: Item[] = [
    {
      icon: CreditCard,
      tone: 'bg-emerald-50',
      color: '#059669',
      title: ar ? 'المالية والحسابات' : 'Finance & Accounts',
      subtitle: ar ? 'الإيرادات، المصاريف، الفواتير والمدفوعات' : 'Income, expenses, invoices and payments',
      chip: {
        label: `${ar ? 'إيرادات اليوم' : "Today's revenue"} ${totals.income.toLocaleString()}`,
        cls: 'bg-emerald-50 text-emerald-600',
      },
      to: '/clinic-finance',
    },
    {
      icon: Users,
      tone: 'bg-sky-50',
      color: '#0284C7',
      title: ar ? 'المرضى والمواعيد' : 'Patients & Appointments',
      subtitle: ar ? 'سجلات المرضى، المواعيد والخطط العلاجية' : 'Patient records, appointments and treatment plans',
      chip: { label: `${ar ? 'مرضى' : 'Patients'} ${patients.length}`, cls: 'bg-sky-50 text-sky-600' },
      to: '/patients',
    },
  ];

  const inventory: Item[] = [
    {
      icon: ClipboardList,
      tone: 'bg-violet-50',
      color: '#7C3AED',
      title: ar ? 'طلبيات العيادة والمختبرات' : 'Clinic & Lab Orders',
      subtitle: ar ? 'طلبات المختبرات ومستلزمات العيادة' : 'Lab requests and clinic supplies',
      to: '/clinic-orders',
    },
    {
      icon: Package,
      iconSize: 23,
      tone: 'bg-emerald-50',
      color: '#059669',
      title: ar ? 'مواد العيادة' : 'Clinic Materials',
      subtitle: ar ? 'المخزون والمستهلكات والكيمياويات والمخدر' : 'Inventory, consumables, chemicals and anesthesia',
      to: '/clinic-materials',
    },
  ];

  const manage: Item[] = [
    {
      icon: BarChart3,
      tone: 'bg-amber-50',
      color: '#D97706',
      title: ar ? 'التقارير والإحصائيات' : 'Reports & Statistics',
      subtitle: ar ? 'أداء شهري، ملخص العلاجات وتصدير التقارير' : 'Monthly performance, treatment summary and report exports',
      to: '/clinic-reports',
    },
    {
      icon: Stethoscope,
      tone: 'bg-rose-50',
      color: '#E11D48',
      title: ar ? 'أطباء العيادة' : 'Clinic Doctors',
      subtitle: ar ? 'الأطباء، الاختصاصات والدوام والحالات' : 'Doctors, specialties, shifts and cases',
      to: '/clinic-doctors',
    },
  ];

  const renderItem = (it: Item) => (
    <Pressable key={it.title} onPress={() => router.push(it.to)} className="w-[48.5%]">
      {/* Fixed min-height so every card matches regardless of whether it
          carries a bottom chip — the chip (when present) is pushed to the
          bottom via `mt-auto` instead of just following the subtitle text,
          so the title/subtitle block lines up the same across all cards. */}
      <View className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" style={{ minHeight: 156 }}>
        <View className={cn('mb-3 h-11 w-11 items-center justify-center rounded-2xl', it.tone)}>
          <it.icon size={it.iconSize ?? 20} color={it.color} strokeWidth={2.2} />
        </View>
        <Text className="text-sm font-bold text-slate-800">{it.title}</Text>
        <Text className="mt-1 text-[11px] leading-snug text-slate-400">{it.subtitle}</Text>
        {it.chip ? (
          <Text className={cn('mt-auto self-start rounded-lg px-2 py-1 text-[10px] font-semibold', it.chip.cls)}>
            {it.chip.label}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );

  const renderSection = (label: string, items: Item[]) => (
    <View>
      <Text className="mb-3 text-sm font-bold text-slate-500">{label}</Text>
      <View className="flex-row flex-wrap justify-between gap-y-3">{items.map(renderItem)}</View>
    </View>
  );

  return (
    <Screen>
      {/* Clinic switcher — a dentist running more than one clinic picks
          which one is active here; every patient/appointment/finance/
          inventory store below re-keys to that clinic's own isolated
          storage the moment it changes (see clinicsStore.ts). */}
      <Pressable
        onPress={() => setMenuOpen((v) => !v)}
        className="mb-3 h-11 flex-row items-center gap-2 self-start rounded-full border border-slate-200 bg-white ps-4 pe-2"
      >
        <Text className="text-sm font-bold text-slate-800">{activeClinic?.name ?? (ar ? 'عيادتي' : 'My Clinic')}</Text>
        <ChevronDown size={16} color="#94A3B8" />
        <View className="h-8 w-8 items-center justify-center rounded-full bg-sky-50">
          <Building2 size={16} color="#0284C7" />
        </View>
      </Pressable>

      {menuOpen && (
        <View className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {clinics.map((c) => (
            <View
              key={c.id}
              className="flex-row items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 last:border-b-0"
            >
              <Pressable
                onPress={() => {
                  setActiveClinic(c.id);
                  setMenuOpen(false);
                }}
                className="min-w-0 flex-1"
              >
                <Text numberOfLines={1} className="text-sm font-bold text-slate-800">
                  {c.name}
                </Text>
              </Pressable>
              <View className="flex-row items-center gap-1.5">
                <Pressable onPress={() => openEditClinic(c)} className="h-7 w-7 items-center justify-center rounded-lg">
                  <Pencil size={14} color="#94A3B8" />
                </Pressable>
                {c.id === activeClinicId && (
                  <View className="h-7 w-7 items-center justify-center rounded-lg bg-sky-50">
                    <Check size={14} color="#0284C7" />
                  </View>
                )}
              </View>
            </View>
          ))}
          <Pressable onPress={openAddClinic} className="flex-row items-center justify-center gap-1.5 px-4 py-3">
            <Plus size={16} color="#2563EB" />
            <Text className="text-sm font-bold text-primary">{ar ? 'إضافة عيادة جديدة' : 'Add new clinic'}</Text>
          </Pressable>
        </View>
      )}

      {/* Hero */}
      <View className="h-44 flex-row overflow-hidden rounded-2xl bg-[#2563EB]">
        <View className="min-w-0 flex-1 justify-center p-3.5">
          <Text className="text-base font-extrabold leading-tight text-white">
            {ar ? 'إدارة العيادة والمرضى' : 'Clinic & Patient Management'}
          </Text>
          <Text className="mt-1 text-[11px] leading-snug text-white/70">
            {ar ? 'كل ما يخص عيادتك في مكان واحد' : 'Everything for your clinic in one place'}
          </Text>
          <Pressable
            onPress={() => setShowAdd(true)}
            className="mt-2.5 h-9 flex-row items-center justify-center gap-1.5 rounded-xl bg-white"
          >
            <Plus size={14} color="#2563EB" />
            <Text className="text-[11px] font-bold text-[#2563EB]">
              {ar ? 'إضافة موعد' : 'Add Appointment'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/clinic-appointments')}
            className="mt-2 h-9 flex-row items-center justify-center gap-1.5 rounded-xl bg-white/25"
          >
            <Calendar size={14} color="#FFFFFF" />
            <Text className="text-[11px] font-bold text-white">
              {ar ? `مواعيد اليوم (${todayCount})` : `Today's Visits (${todayCount})`}
            </Text>
          </Pressable>
        </View>
        <View className="w-2/5 shrink-0 overflow-hidden">
          <Image
            source={require('../../assets/home/clinic-hero.jpg')}
            className="h-full w-full"
            resizeMode="cover"
          />
        </View>
      </View>

      <View className="mt-5 gap-5">
        {renderSection(ar ? 'الخدمات اليومية والمرضى' : 'Daily Services & Patients', daily)}
        {renderSection(ar ? 'المخزون والمشتريات' : 'Inventory & Purchases', inventory)}
        {renderSection(ar ? 'التقارير والإدارة' : 'Reports & Management', manage)}
      </View>

      <AddAppointmentModal open={showAdd} onClose={() => setShowAdd(false)} />

      <Modal visible={formMode !== 'closed'} transparent animationType="fade" onRequestClose={() => setFormMode('closed')}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="gap-3 rounded-t-3xl bg-white p-5">
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
      </Modal>
    </Screen>
  );
}
