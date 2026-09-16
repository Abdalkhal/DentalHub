import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import {
  Bell,
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Moon,
  Sun,
  Users,
  XCircle,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Screen, Text } from '@/components/ui';
import { AddAppointmentModal } from '@/components/AddAppointmentModal';
import { AppointmentDetailModal } from '@/components/AppointmentDetailModal';
import { CalendarPickerModal, toDateStr } from '@/components/CalendarPickerModal';
import {
  ToothIcon,
  CrownToothIcon,
  RootCanalIcon,
  ImplantIcon,
  BracesIcon,
  SparkleToothIcon,
  ExtractionIcon,
  type DentalIconComponent,
} from '@/components/DentalIcons';
import { setAppointmentsStoreUser, useAppointments, type Appointment } from '@/lib/appointmentsStore';
import { useUserRole } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const MORNING_SLOTS = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00'];
const EVENING_SLOTS = ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

const DAY_LABELS = [
  { ar: 'الأحد', en: 'Sun' },
  { ar: 'الإثنين', en: 'Mon' },
  { ar: 'الثلاثاء', en: 'Tue' },
  { ar: 'الأربعاء', en: 'Wed' },
  { ar: 'الخميس', en: 'Thu' },
  { ar: 'الجمعة', en: 'Fri' },
  { ar: 'السبت', en: 'Sat' },
];

const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const TREATMENT_ICONS: Record<string, DentalIconComponent> = {
  'تنظيف اسنان': SparkleToothIcon,
  'حشوة': ToothIcon,
  'علاج جذور': RootCanalIcon,
  'خلع': ExtractionIcon,
  'زراعة اسنان': ImplantIcon,
  'تركيب تاج': CrownToothIcon,
  'تقويم': BracesIcon,
  'تبييض': SparkleToothIcon,
};

function treatmentIcon(treatment: string): DentalIconComponent {
  return TREATMENT_ICONS[treatment] ?? ToothIcon;
}

function format12h(slot: string, ar: boolean): string {
  const [hStr, mm] = slot.split(':');
  const hh = parseInt(hStr || '0', 10);
  const suffix = hh < 12 ? 'ص' : 'م';
  let hour = hh % 12;
  if (hour === 0) hour = 12;
  const hh12 = String(hour).padStart(2, '0');
  if (!ar) return `${hh12}:${mm} ${hh < 12 ? 'AM' : 'PM'}`;
  return `${hh12}:${mm} ${suffix}`;
}

function hourSlot(time: string): string {
  const hh = time?.split(':')[0] ?? '08';
  return `${hh}:00`;
}

function formatMonthYear(date: Date, ar: boolean): string {
  const months = ar ? MONTHS_AR : MONTHS_EN;
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

type Theme = {
  bg: string;
  border: string;
  badgeBg: string;
  badgeTextCls: string;
  badgeColor: string;
  icon: LucideIcon;
  label: { ar: string; en: string };
};

function statusTheme(appt: Appointment): Theme {
  const status = appt.status ?? 'confirmed';
  if (appt.appointmentType === 'متابعة' && status === 'confirmed') {
    return {
      bg: 'bg-purple-50',
      border: 'border-purple-100',
      badgeBg: 'bg-purple-100',
      badgeTextCls: 'text-purple-700',
      badgeColor: '#7E22CE',
      icon: Check,
      label: { ar: 'متابعة', en: 'Follow-up' },
    };
  }
  switch (status) {
    case 'completed':
      return { bg: 'bg-emerald-50', border: 'border-emerald-100', badgeBg: 'bg-emerald-100', badgeTextCls: 'text-emerald-700', badgeColor: '#047857', icon: Check, label: { ar: 'مكتمل', en: 'Completed' } };
    case 'waiting':
      return { bg: 'bg-amber-50', border: 'border-amber-100', badgeBg: 'bg-amber-100', badgeTextCls: 'text-amber-700', badgeColor: '#B45309', icon: Clock, label: { ar: 'انتظار', en: 'Waiting' } };
    case 'cancelled':
      return { bg: 'bg-rose-50', border: 'border-rose-100', badgeBg: 'bg-rose-100', badgeTextCls: 'text-rose-700', badgeColor: '#BE123C', icon: XCircle, label: { ar: 'ملغي', en: 'Cancelled' } };
    default:
      return { bg: 'bg-blue-50', border: 'border-blue-100', badgeBg: 'bg-blue-100', badgeTextCls: 'text-blue-700', badgeColor: '#1D4ED8', icon: Check, label: { ar: 'مؤكد', en: 'Confirmed' } };
  }
}

function AppointmentCard({ appt, ar, onPress }: { appt: Appointment; ar: boolean; onPress?: () => void }) {
  const theme = statusTheme(appt);
  const initial = appt.patientName.trim().charAt(0) || '؟';
  const StatusIcon = theme.icon;
  const TreatmentIcon = treatmentIcon(appt.treatment);
  return (
    <Pressable onPress={onPress} className={cn('flex-row items-center gap-3 rounded-2xl border px-4 py-2.5', theme.bg, theme.border)}>
      <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-200">
        <Text className="text-sm font-bold text-slate-700">{initial}</Text>
      </View>
      <View className="h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
        <TreatmentIcon size={18} color="#2563EB" />
      </View>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-sm font-semibold text-slate-900">
          {appt.patientName}
        </Text>
        <Text numberOfLines={1} className="text-xs text-slate-500">
          {appt.treatment}
        </Text>
      </View>
      <View className={cn('shrink-0 flex-row items-center gap-1 rounded-full px-3 py-1', theme.badgeBg)}>
        <StatusIcon size={12} color={theme.badgeColor} />
        <Text className={cn('text-xs font-medium', theme.badgeTextCls)}>{ar ? theme.label.ar : theme.label.en}</Text>
      </View>
    </Pressable>
  );
}

function StatCard({
  label,
  value,
  color,
  icon: Icon,
  ar,
  onPress,
  active,
}: {
  label: { ar: string; en: string };
  value: number;
  color: { bg: string; fg: string };
  icon: LucideIcon;
  ar: boolean;
  onPress?: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className={cn(
        'flex-1 items-center rounded-2xl border p-3 shadow-sm',
        active ? 'border-primary bg-primary/5' : 'border-slate-100 bg-white',
      )}
    >
      <View className={cn('mb-1.5 h-8 w-8 items-center justify-center rounded-xl', color.bg)}>
        <Icon size={16} color={color.fg} />
      </View>
      <Text className="text-lg font-extrabold leading-none text-slate-800">{value}</Text>
      <Text className={cn('mt-0.5 text-[10px] font-bold', active ? 'text-primary' : 'text-slate-400')}>
        {ar ? label.ar : label.en}
      </Text>
    </Pressable>
  );
}

export default function ClinicAppointmentsScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useUserRole();
  const appointments = useAppointments();
  const today = new Date();
  const todayStr = toDateStr(today);

  useEffect(() => {
    if (user?.uid) setAppointmentsStoreUser(user.uid);
  }, [user?.uid]);

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);

  // Which half of the day the timeline shows. Defaults to whichever period
  // actually has this day's appointments (falls back to AM) — tapping
  // "صباحاً"/"مساءً" above overrides it until the selected date changes.
  const [manualPeriod, setManualPeriod] = useState<'AM' | 'PM' | null>(null);
  useEffect(() => {
    setManualPeriod(null);
  }, [selectedDate]);

  const selectedDateObj = useMemo(() => new Date(selectedDate + 'T00:00:00'), [selectedDate]);

  const weekDays = useMemo(() => {
    const startOfWeek = new Date(selectedDateObj);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [selectedDateObj]);

  const dayAppointments = useMemo(() => appointments.filter((a) => a.date === selectedDate), [appointments, selectedDate]);

  const sorted = useMemo(
    () => [...dayAppointments].sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00')),
    [dayAppointments],
  );

  const stats = useMemo(() => {
    const total = dayAppointments.length;
    const morning = dayAppointments.filter((a) => Number((a.time || '00:00').split(':')[0]) < 12).length;
    const evening = total - morning;
    const reminders = dayAppointments.filter((a) => a.reminder).length;
    return { total, morning, evening, reminders };
  }, [dayAppointments]);

  const defaultPeriod: 'AM' | 'PM' = stats.evening > stats.morning ? 'PM' : 'AM';
  const periodFilter = manualPeriod ?? defaultPeriod;
  const activeSlots = periodFilter === 'AM' ? MORNING_SLOTS : EVENING_SLOTS;

  const markedDates = useMemo(() => new Set(appointments.map((a) => a.date)), [appointments]);

  const changeMonth = (dir: -1 | 1) => {
    setSelectedDate((prev) => {
      const d = new Date(prev + 'T00:00:00');
      const day = d.getDate();
      d.setDate(1);
      d.setMonth(d.getMonth() + dir);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(day, lastDay));
      return toDateStr(d);
    });
  };

  const nowHour = new Date().getHours();

  return (
    <Screen scroll={false} padded={false}>
      <ScrollView contentContainerClassName="px-4 pt-3 pb-8">
        {/* Month header */}
        <View className="mb-3 flex-row items-center justify-between">
          <Pressable onPress={() => changeMonth(-1)} className="h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white">
            {ar ? <ChevronRight size={16} color="#475569" /> : <ChevronLeft size={16} color="#475569" />}
          </Pressable>
          <Pressable onPress={() => setShowCalendar(true)} className="flex-row items-center gap-1.5 rounded-xl px-3 py-1">
            <Text className="text-base font-extrabold text-slate-800">{formatMonthYear(selectedDateObj, ar)}</Text>
            <CalendarCheck size={16} color="#2563EB" />
          </Pressable>
          <Pressable onPress={() => changeMonth(1)} className="h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white">
            {ar ? <ChevronLeft size={16} color="#475569" /> : <ChevronRight size={16} color="#475569" />}
          </Pressable>
        </View>

        {/* Day picker strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-1.5 pb-1">
          {weekDays.map((d) => {
            const ds = toDateStr(d);
            const isToday = ds === todayStr;
            const isSelected = ds === selectedDate;
            const dow = d.getDay();
            const dayLabel = DAY_LABELS[dow];
            const hasAppt = markedDates.has(ds);
            return (
              <Pressable
                key={ds}
                onPress={() => setSelectedDate(ds)}
                className={cn(
                  'w-12 items-center rounded-2xl py-2',
                  isSelected ? 'bg-primary' : 'bg-transparent',
                )}
              >
                <Text className={cn('text-[10px] font-bold', isSelected ? 'text-primary-foreground' : isToday ? 'text-primary' : 'text-slate-500')}>
                  {ar ? dayLabel.ar : dayLabel.en}
                </Text>
                <Text className={cn('mt-0.5 text-sm font-extrabold', isSelected ? 'text-primary-foreground' : 'text-slate-800')}>
                  {d.getDate()}
                </Text>
                {hasAppt && (
                  <View className={cn('mt-1 h-1 w-1 rounded-full', isSelected ? 'bg-white' : 'bg-primary')} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        <View className="mt-4 gap-4">
          {/* Back to today */}
          {selectedDate !== todayStr && (
            <Pressable onPress={() => setSelectedDate(todayStr)} className="self-center">
              <Text className="text-xs font-bold text-primary">{ar ? '‹ العودة لليوم' : '‹ Back to today'}</Text>
            </Pressable>
          )}

          {/* Stats */}
          <View className="flex-row gap-2">
            <StatCard ar={ar} label={{ ar: 'الإجمالي', en: 'Total' }} value={stats.total} color={{ bg: 'bg-sky-50', fg: '#0369A1' }} icon={Users} />
            <StatCard
              ar={ar}
              label={{ ar: 'صباحاً', en: 'Morning' }}
              value={stats.morning}
              color={{ bg: 'bg-amber-50', fg: '#B45309' }}
              icon={Sun}
              onPress={() => setManualPeriod('AM')}
              active={periodFilter === 'AM'}
            />
            <StatCard
              ar={ar}
              label={{ ar: 'مساءً', en: 'Evening' }}
              value={stats.evening}
              color={{ bg: 'bg-indigo-50', fg: '#4338CA' }}
              icon={Moon}
              onPress={() => setManualPeriod('PM')}
              active={periodFilter === 'PM'}
            />
            <StatCard ar={ar} label={{ ar: 'تذكير', en: 'Reminders' }} value={stats.reminders} color={{ bg: 'bg-rose-50', fg: '#BE123C' }} icon={Bell} />
          </View>

          {/* Timeline */}
          <View>
            <View className="mb-3 flex-row items-center gap-1.5">
              <Clock size={16} color="#2563EB" />
              <Text className="text-sm font-bold text-slate-700">{ar ? 'الجدول الزمني' : 'Timeline'}</Text>
            </View>
            <View className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              {activeSlots.map((slot, i) => {
                const slotAppts = sorted.filter((a) => hourSlot(a.time) === slot);
                const isCurrentHour = selectedDate === todayStr && parseInt(slot.split(':')[0], 10) === nowHour;
                return (
                  <View
                    key={slot}
                    className={cn(
                      'flex-row',
                      i < activeSlots.length - 1 && 'border-b border-slate-50',
                      isCurrentHour && 'bg-sky-50/40',
                    )}
                  >
                    <View className="w-16 items-center border-r border-slate-50 py-3">
                      <Text className={cn('text-[11px] font-bold', isCurrentHour ? 'text-primary' : 'text-slate-400')}>
                        {format12h(slot, ar)}
                      </Text>
                      {isCurrentHour && (
                        <Text className="mt-0.5 text-[9px] font-bold text-primary">{ar ? 'الآن' : 'Now'}</Text>
                      )}
                    </View>
                    <View className="flex-1 gap-1.5 px-2 py-1.5">
                      {slotAppts.length === 0 ? (
                        <View className="h-6" />
                      ) : (
                        slotAppts.map((a) => <AppointmentCard key={a.id} appt={a} ar={ar} onPress={() => setSelectedAppt(a)} />)
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Empty state */}
          {dayAppointments.length === 0 && (
            <View className="items-center py-10">
              <CalendarCheck size={40} color="#CBD5E1" />
              <Text className="mt-2 text-sm font-bold text-slate-400">
                {ar ? 'لا توجد مواعيد في هذا اليوم' : 'No appointments on this day'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating add button */}
      <Pressable
        onPress={() => setShowAdd(true)}
        className="absolute bottom-6 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg"
        style={{ right: 20, elevation: 6 }}
      >
        <Text className="text-2xl font-bold text-primary-foreground">+</Text>
      </Pressable>

      <CalendarPickerModal
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        selectedDate={selectedDate}
        markedDates={markedDates}
        onSelect={(ds) => {
          setSelectedDate(ds);
          setShowCalendar(false);
        }}
      />

      <AddAppointmentModal open={showAdd} onClose={() => setShowAdd(false)} />
      <AppointmentDetailModal appointment={selectedAppt} onClose={() => setSelectedAppt(null)} />
    </Screen>
  );
}
