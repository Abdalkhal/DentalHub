import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Bell, Calendar, Clock, Phone, User, X } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { Appointment } from '@/lib/appointmentsStore';
import { GOLD, NAVY, SHEET_GRADIENT, LIGHT_GRADIENT, GradientFill, GradientField } from '@/components/appointmentTheme';

const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

function FieldLabel({ children }: { children: string }) {
  return <Text className="mb-1.5 text-[11px] font-bold text-slate-500">{children}</Text>;
}

function ReadPill({
  icon,
  value,
  className,
  colors,
}: {
  icon?: React.ReactNode;
  value: string;
  className?: string;
  colors?: [string, string];
}) {
  return (
    <GradientField colors={colors} className={cn('h-11 flex-row items-center gap-2 rounded-2xl px-3.5', className)}>
      {icon}
      <Text numberOfLines={1} className="flex-1 text-sm font-semibold text-slate-800">
        {value}
      </Text>
    </GradientField>
  );
}

function NavyPill({ value }: { value: string }) {
  return (
    <View className="h-11 items-center justify-center rounded-2xl px-3.5" style={{ backgroundColor: NAVY }}>
      <Text numberOfLines={1} className="text-sm font-bold text-white">
        {value}
      </Text>
    </View>
  );
}

function format12h(time: string, ar: boolean): string {
  const [hStr, mm] = (time || '00:00').split(':');
  const hh = parseInt(hStr || '0', 10);
  const suffix = hh < 12 ? (ar ? 'ص' : 'AM') : ar ? 'م' : 'PM';
  let hour = hh % 12;
  if (hour === 0) hour = 12;
  return `${String(hour).padStart(2, '0')}:${mm} ${suffix}`;
}

export function AppointmentDetailModal({
  appointment,
  onClose,
}: {
  appointment: Appointment | null;
  onClose: () => void;
}) {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  if (!appointment) return null;

  const dateObj = new Date(appointment.date + 'T00:00:00');
  const dateLabel = ar
    ? `${dateObj.getDate()} ${MONTHS_AR[dateObj.getMonth()]} ${dateObj.getFullYear()}`
    : dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/45">
        <View className="max-h-[92%] overflow-hidden rounded-t-3xl">
          <GradientFill colors={SHEET_GRADIENT} />
          <View className="flex-row items-center justify-between border-b border-white/40 px-4 pb-2.5 pt-4">
            <Text className="text-base font-extrabold text-slate-900">
              {ar ? 'تفاصيل الموعد' : 'Appointment Details'}
            </Text>
            <Pressable onPress={onClose} className="h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-white/50">
              <X size={16} color="#334155" />
            </Pressable>
          </View>

          <ScrollView className="px-4" contentContainerClassName="py-4 gap-4">
            {/* Patient */}
            <View className="gap-2.5">
              <FieldLabel>{ar ? 'بيانات المريض' : 'Patient'}</FieldLabel>
              <ReadPill icon={<User size={16} color={GOLD} />} value={appointment.patientName || (ar ? 'غير محدد' : 'Unspecified')} />
              {!!appointment.phone && <ReadPill icon={<Phone size={16} color={GOLD} />} value={appointment.phone} />}
            </View>

            {/* Date + Time */}
            <View className="gap-2.5">
              <FieldLabel>{ar ? 'التاريخ والوقت' : 'Date & Time'}</FieldLabel>
              <ReadPill colors={LIGHT_GRADIENT} icon={<Calendar size={16} color="#2563EB" />} value={dateLabel} className="rounded-full" />
              <ReadPill icon={<Clock size={16} color={GOLD} />} value={format12h(appointment.time, ar)} />
            </View>

            {/* Type + Room */}
            <View className="flex-row gap-2.5">
              <View className="flex-1">
                <FieldLabel>{ar ? 'نوع الموعد' : 'Appointment Type'}</FieldLabel>
                <NavyPill value={appointment.appointmentType || '-'} />
              </View>
              <View className="flex-1">
                <FieldLabel>{ar ? 'العيادة / الغرفة' : 'Clinic / Room'}</FieldLabel>
                <ReadPill value={appointment.clinicRoom || (ar ? 'غير محدد' : 'Unspecified')} />
              </View>
            </View>

            {/* Doctor + Treatment */}
            <View className="flex-row gap-2.5">
              <View className="flex-1">
                <FieldLabel>{ar ? 'الطبيب' : 'Doctor'}</FieldLabel>
                <NavyPill value={appointment.doctor || '-'} />
              </View>
              <View className="flex-1">
                <FieldLabel>{ar ? 'العلاج / الخدمة' : 'Treatment / Service'}</FieldLabel>
                <NavyPill value={appointment.treatment || '-'} />
              </View>
            </View>

            {/* Notes */}
            {!!appointment.notes && (
              <View>
                <FieldLabel>{ar ? 'ملاحظات' : 'Notes'}</FieldLabel>
                <GradientField className="rounded-2xl p-3">
                  <Text className="text-sm text-slate-800">{appointment.notes}</Text>
                </GradientField>
              </View>
            )}

            {/* Reminder */}
            <GradientField
              colors={appointment.reminder ? undefined : LIGHT_GRADIENT}
              className="h-12 flex-row items-center gap-2 rounded-2xl px-4"
            >
              <Bell size={16} color={appointment.reminder ? GOLD : '#94A3B8'} />
              <Text className="text-sm font-semibold text-slate-800">
                {appointment.reminder
                  ? ar
                    ? 'التذكير بالموعد مفعّل'
                    : 'Appointment reminder is on'
                  : ar
                    ? 'التذكير بالموعد غير مفعّل'
                    : 'Appointment reminder is off'}
              </Text>
            </GradientField>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
