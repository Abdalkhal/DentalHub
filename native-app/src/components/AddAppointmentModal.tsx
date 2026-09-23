import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Calendar, Check, ChevronDown, Clock, Phone, User, X } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  GOLD,
  NAVY,
  SHEET_GRADIENT,
  FIELD_GRADIENT,
  LIGHT_GRADIENT,
  SAVE_GRADIENT,
  GradientFill,
  GradientField,
} from '@/components/appointmentTheme';
import { useI18n } from '@/lib/i18n';
import { addAppointment } from '@/lib/appointmentsStore';
import { useClinic } from '@/lib/clinicStore';
import { useUserRole } from '@/lib/useAuth';
import { toast } from '@/lib/toast';
import { CalendarPickerModal, toDateStr } from '@/components/CalendarPickerModal';

// Values ported verbatim from the web app's AddAppointmentModal — the web
// list isn't translated per-language either, so we keep the same Arabic
// strings regardless of `ar` to stay in sync with it.
const APPOINTMENT_TYPES = ['استشارة', 'متابعة', 'مراجعة بعد العلاج', 'طوارئ', 'فحص دوري', 'استشارة اونلاين'];
const TREATMENTS = ['تنظيف اسنان', 'حشوة', 'علاج جذور', 'خلع', 'زراعة اسنان', 'تركيب تاج', 'تقويم', 'تبييض'];

const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

function NavyDropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="h-11 flex-row items-center justify-between gap-1.5 rounded-2xl px-3.5"
        style={{ backgroundColor: NAVY }}
      >
        <ChevronDown size={16} color={GOLD} />
        <Text numberOfLines={1} className="flex-1 text-sm font-bold text-white">
          {selected?.label ?? value}
        </Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 items-center justify-center bg-black/40 p-6">
          <View className="max-h-80 w-full max-w-xs overflow-hidden rounded-2xl bg-white shadow-xl">
            <View className="flex-row items-center justify-end border-b border-slate-100 px-3 py-2">
              <Pressable onPress={() => setOpen(false)} className="h-7 w-7 items-center justify-center rounded-full bg-slate-100">
                <X size={14} color="#64748B" />
              </Pressable>
            </View>
            <ScrollView>
              {options.map((o) => {
                const isSelected = o.value === value;
                return (
                  <Pressable
                    key={o.value}
                    onPress={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={cn('flex-row items-center justify-between gap-2 px-4 py-3', isSelected && 'bg-sky-50')}
                  >
                    <Text className={cn('flex-1 text-sm', isSelected ? 'font-bold text-sky-700' : 'text-slate-700')}>
                      {o.label}
                    </Text>
                    {isSelected && <Check size={14} color="#0369A1" />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function maskTime(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.length > 4) digits = digits.slice(0, 4);
  if (digits.length === 0) return '';
  const hh = digits.slice(0, 2);
  const mm = digits.slice(2);
  if (digits.length < 2) return hh;
  return `${hh}:${mm}`;
}

function FieldLabel({ children }: { children: string }) {
  return <Text className="mb-1.5 text-[11px] font-bold text-slate-500">{children}</Text>;
}

export function AddAppointmentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { role } = useUserRole();
  const clinic = useClinic();
  const insets = useSafeAreaInsets();

  const mainDoctor = role?.name || (ar ? 'الطبيب الرئيسي' : 'Main Doctor');
  const doctorOptions = useMemo(() => {
    const list = [{ value: 'main', label: mainDoctor }];
    clinic.doctors.forEach((d) => list.push({ value: d.id, label: d.name }));
    return list;
  }, [clinic.doctors, mainDoctor]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState(toDateStr(new Date()));
  const [showCalendar, setShowCalendar] = useState(false);
  const [time, setTime] = useState('');
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [appointmentType, setAppointmentType] = useState(APPOINTMENT_TYPES[0]);
  const [room, setRoom] = useState('');
  const [doctor, setDoctor] = useState('main');
  const [treatment, setTreatment] = useState(TREATMENTS[0]);
  const [notes, setNotes] = useState('');
  const [reminder, setReminder] = useState(true);

  const formatFullTime = (): string => {
    const digits = time.replace(/\D/g, '');
    if (!digits) return '00:00';
    let hh = Number(digits.slice(0, 2)) || 0;
    const mm = digits.slice(2, 4).padEnd(2, '0');
    if (period === 'PM' && hh < 12) hh += 12;
    if (period === 'AM' && hh === 12) hh = 0;
    return `${String(hh).padStart(2, '0')}:${mm}`;
  };

  const reset = () => {
    setName('');
    setPhone('');
    setTime('');
    setPeriod('AM');
    setAppointmentType(APPOINTMENT_TYPES[0]);
    setRoom('');
    setDoctor('main');
    setTreatment(TREATMENTS[0]);
    setNotes('');
    setReminder(true);
  };

  const submit = () => {
    if (!name.trim()) {
      toast.error(ar ? 'اسم المريض مطلوب' : 'Patient name is required');
      return;
    }
    addAppointment({
      patientName: name.trim(),
      phone: phone.replace(/\D/g, ''),
      date,
      time: formatFullTime(),
      appointmentType,
      clinicRoom: room.trim(),
      doctor: doctor === 'main' ? mainDoctor : clinic.doctors.find((d) => d.id === doctor)?.name || mainDoctor,
      treatment,
      notes: notes.trim(),
      reminder,
      status: 'confirmed',
    });
    toast.success(ar ? 'تم إضافة الموعد بنجاح' : 'Appointment added successfully');
    reset();
    onClose();
  };

  const dateObj = new Date(date + 'T00:00:00');
  const dateLabel = ar
    ? `${dateObj.getDate()} ${MONTHS_AR[dateObj.getMonth()]} ${dateObj.getFullYear()}`
    : dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View className="flex-1 justify-start bg-black/45">
        <View className="max-h-[92%] overflow-hidden rounded-b-3xl" style={{ paddingTop: insets.top }}>
          <GradientFill colors={SHEET_GRADIENT} />
          <View className="flex-row items-center justify-between border-b border-white/40 px-4 pb-2.5 pt-4">
            <Text className="text-base font-extrabold text-slate-900">
              {ar ? 'إضافة موعد' : 'Add Appointment'}
            </Text>
            <Pressable onPress={onClose} className="h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-white/50">
              <X size={16} color="#334155" />
            </Pressable>
          </View>

          <ScrollView className="px-4" contentContainerClassName="py-4 gap-4">
            {/* Patient */}
            <View className="gap-2.5">
              <FieldLabel>{ar ? 'بيانات المريض' : 'Patient'}</FieldLabel>
              <GradientField className="relative rounded-2xl">
                <View className="absolute bottom-0 right-3 top-0 z-10 justify-center">
                  <User size={16} color={GOLD} />
                </View>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={ar ? 'اسم المريض' : 'Patient name'}
                  placeholderTextColor="#7C8AA5"
                  className="h-11 bg-transparent pl-3 pr-9 text-sm text-slate-800"
                />
              </GradientField>
              <GradientField className="relative rounded-2xl">
                <View className="absolute bottom-0 right-3 top-0 z-10 justify-center">
                  <Phone size={16} color={GOLD} />
                </View>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder={ar ? 'رقم الهاتف' : 'Phone number'}
                  placeholderTextColor="#7C8AA5"
                  className="h-11 bg-transparent pl-3 pr-9 text-sm text-slate-800"
                />
              </GradientField>
            </View>

            {/* Date + Time */}
            <View className="gap-2.5">
              <FieldLabel>{ar ? 'التاريخ والوقت' : 'Date & Time'}</FieldLabel>
              <View className="flex-row gap-2.5">
                <Pressable onPress={() => setShowCalendar(true)} className="flex-1">
                  <GradientField colors={LIGHT_GRADIENT} className="h-11 flex-row items-center gap-2 rounded-full px-3.5">
                    <Calendar size={16} color="#2563EB" />
                    <Text numberOfLines={1} className="flex-1 text-sm font-semibold text-slate-700">
                      {dateLabel}
                    </Text>
                  </GradientField>
                </Pressable>
              </View>
              <View className="flex-row items-center gap-2">
                <View
                  className="h-11 w-11 items-center justify-center rounded-full bg-white"
                  style={{ borderWidth: 2, borderColor: GOLD + '55' }}
                >
                  <Clock size={17} color={GOLD} />
                </View>
                <GradientField className="h-11 flex-1 justify-center rounded-full px-3.5">
                  <TextInput
                    value={time}
                    onChangeText={(v) => setTime(maskTime(v))}
                    keyboardType="number-pad"
                    placeholder="00:00"
                    placeholderTextColor="#7C8AA5"
                    className="bg-transparent text-sm text-slate-800"
                    style={{ writingDirection: 'ltr' }}
                  />
                </GradientField>
                <View className="flex-row overflow-hidden rounded-full bg-white/70 p-0.5">
                  <Pressable
                    onPress={() => setPeriod('AM')}
                    className="h-10 justify-center rounded-full px-3"
                    style={{ backgroundColor: period === 'AM' ? NAVY : 'transparent' }}
                  >
                    <Text className={cn('text-[11px] font-bold', period === 'AM' ? 'text-white' : 'text-slate-500')}>
                      {ar ? 'صباحاً' : 'AM'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setPeriod('PM')}
                    className="h-10 justify-center rounded-full px-3"
                    style={{ backgroundColor: period === 'PM' ? NAVY : 'transparent' }}
                  >
                    <Text className={cn('text-[11px] font-bold', period === 'PM' ? 'text-white' : 'text-slate-500')}>
                      {ar ? 'مساءً' : 'PM'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Type + Room */}
            <View className="flex-row gap-2.5">
              <View className="flex-1">
                <FieldLabel>{ar ? 'نوع الموعد' : 'Appointment Type'}</FieldLabel>
                <NavyDropdown
                  value={appointmentType}
                  onChange={setAppointmentType}
                  options={APPOINTMENT_TYPES.map((t) => ({ value: t, label: t }))}
                />
              </View>
              <View className="flex-1">
                <FieldLabel>{ar ? 'العيادة / الغرفة (اختياري)' : 'Clinic / Room (Optional)'}</FieldLabel>
                <GradientField className="rounded-2xl">
                  <TextInput
                    value={room}
                    onChangeText={setRoom}
                    placeholder={ar ? 'العيادة الرئيسية - غرفة 1' : 'Main clinic - Room 1'}
                    placeholderTextColor="#7C8AA5"
                    className="h-11 bg-transparent px-3 text-sm text-slate-800"
                  />
                </GradientField>
              </View>
            </View>

            {/* Doctor + Treatment */}
            <View className="flex-row gap-2.5">
              <View className="flex-1">
                <FieldLabel>{ar ? 'الطبيب' : 'Doctor'}</FieldLabel>
                <NavyDropdown value={doctor} onChange={setDoctor} options={doctorOptions} />
              </View>
              <View className="flex-1">
                <FieldLabel>{ar ? 'العلاج / الخدمة' : 'Treatment / Service'}</FieldLabel>
                <NavyDropdown
                  value={treatment}
                  onChange={setTreatment}
                  options={TREATMENTS.map((t) => ({ value: t, label: t }))}
                />
              </View>
            </View>

            {/* Notes */}
            <View>
              <View className="mb-1.5 flex-row items-center justify-between">
                <FieldLabel>{ar ? 'ملاحظات' : 'Notes'}</FieldLabel>
                <Text className="text-[10px] text-slate-400">{notes.length}/200</Text>
              </View>
              <GradientField className="rounded-2xl">
                <TextInput
                  value={notes}
                  onChangeText={(v) => setNotes(v.slice(0, 200))}
                  multiline
                  numberOfLines={3}
                  placeholder={ar ? 'أضف أي ملاحظات...' : 'Add any notes...'}
                  placeholderTextColor="#7C8AA5"
                  className="min-h-[88px] bg-transparent px-3 py-2.5 text-sm text-slate-800"
                  style={{ textAlignVertical: 'top' }}
                />
              </GradientField>
            </View>

            {/* Reminder */}
            <Pressable onPress={() => setReminder((v) => !v)}>
              <GradientField
                colors={reminder ? FIELD_GRADIENT : LIGHT_GRADIENT}
                className="h-12 flex-row items-center justify-between rounded-2xl px-4"
              >
                <View className="flex-row items-center gap-2">
                  <Bell size={16} color={reminder ? GOLD : '#94A3B8'} />
                  <Text className="text-sm font-semibold text-slate-800">
                    {ar ? 'تذكير بالموعد' : 'Appointment reminder'}
                  </Text>
                </View>
                <View className={cn('h-6 w-11 justify-center rounded-full', reminder ? 'bg-primary' : 'bg-slate-300')}>
                  <View
                    className={cn(
                      'absolute h-5 w-5 rounded-full bg-white shadow',
                      reminder ? 'left-[2px]' : 'right-[2px]',
                    )}
                  />
                </View>
              </GradientField>
            </Pressable>
          </ScrollView>

          <View className="border-t border-white/40 p-4">
            <Pressable onPress={submit} className="overflow-hidden rounded-full shadow-lg">
              <GradientFill colors={SAVE_GRADIENT} />
              <View className="h-12 flex-row items-center justify-center gap-1.5">
                <Check size={16} color="#FFFFFF" />
                <Text className="text-sm font-extrabold text-white">
                  {ar ? 'حفظ الموعد' : 'Save Appointment'}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </View>
      </KeyboardAvoidingView>

      <CalendarPickerModal
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        selectedDate={date}
        minDate={toDateStr(new Date())}
        onSelect={(ds) => {
          setDate(ds);
          setShowCalendar(false);
        }}
      />
    </Modal>
  );
}
