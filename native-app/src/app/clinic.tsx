import { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { router, type Href } from 'expo-router';
import {
  BarChart3,
  Calendar,
  ClipboardList,
  CreditCard,
  Package,
  Plus,
  Stethoscope,
  Users,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Screen, Text } from '@/components/ui';
import { AddAppointmentModal } from '@/components/AddAppointmentModal';
import { toDateStr } from '@/components/CalendarPickerModal';
import { useUserRole } from '@/lib/useAuth';
import { setAppointmentsStoreUser, useAppointments } from '@/lib/appointmentsStore';
import { setClinicStoreUser, useClinic, clinicTotals } from '@/lib/clinicStore';
import { usePatients } from '@/lib/patientsStore';
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
  chip?: { label: string; cls: string };
  to: Href;
};

export default function ClinicHomeScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useUserRole();

  useEffect(() => {
    if (user?.uid) {
      setAppointmentsStoreUser(user.uid);
      setClinicStoreUser(user.uid);
    }
  }, [user?.uid]);

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
      to: '/clinic-orders',
    },
    {
      icon: Package,
      iconSize: 23,
      tone: 'bg-emerald-50',
      color: '#059669',
      title: ar ? 'مواد العيادة' : 'Clinic Materials',
      to: '/clinic-materials',
    },
  ];

  const manage: Item[] = [
    {
      icon: BarChart3,
      tone: 'bg-amber-50',
      color: '#D97706',
      title: ar ? 'التقارير والإحصائيات' : 'Reports & Statistics',
      to: '/clinic-reports',
    },
    {
      icon: Stethoscope,
      tone: 'bg-rose-50',
      color: '#E11D48',
      title: ar ? 'أطباء العيادة' : 'Clinic Doctors',
      to: '/clinic-doctors',
    },
  ];

  const renderItem = (it: Item) => (
    <Pressable key={it.title} onPress={() => router.push(it.to)} className="w-[48.5%]">
      <View className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <View className={cn('mb-3 h-11 w-11 items-center justify-center rounded-2xl', it.tone)}>
          <it.icon size={it.iconSize ?? 20} color={it.color} strokeWidth={2.2} />
        </View>
        <Text className="text-sm font-bold text-slate-800">{it.title}</Text>
        {it.chip ? (
          <Text className={cn('mt-2 inline-block self-start rounded-lg px-2 py-1 text-[10px] font-semibold', it.chip.cls)}>
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
    </Screen>
  );
}
