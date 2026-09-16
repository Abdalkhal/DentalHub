import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Clock, Phone, Plus, Stethoscope, Trash2, X } from 'lucide-react-native';

import { Screen, Select, Text } from '@/components/ui';
import { addDoctor, removeDoctor, setClinicStoreUser, useClinic } from '@/lib/clinicStore';
import { useUserRole } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const DAYS_AR = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text className="mb-1.5 text-[11px] font-bold text-slate-500">{label}</Text>
      {children}
    </View>
  );
}

const inputStyle = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const ltrInputStyle = { writingDirection: 'ltr' as const, textAlign: 'left' as const };

export default function ClinicDoctorsScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useUserRole();

  useEffect(() => {
    if (user?.uid) setClinicStoreUser(user.uid);
  }, [user?.uid]);

  const { doctors } = useClinic();
  const [open, setOpen] = useState(false);

  return (
    <Screen>
      <Pressable
        onPress={() => setOpen(true)}
        className="h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-primary"
      >
        <Plus size={16} color="#FFFFFF" strokeWidth={3} />
        <Text className="text-sm font-extrabold text-primary-foreground">{ar ? 'إضافة طبيب' : 'Add doctor'}</Text>
      </Pressable>

      <View className="mt-3 gap-2.5">
        {doctors.length === 0 ? (
          <View className="items-center rounded-2xl border border-dashed border-slate-200 bg-white py-14">
            <Stethoscope size={40} color="#CBD5E1" />
            <Text className="mt-3 text-sm font-bold text-slate-500">{ar ? 'لا يوجد أطباء بعد' : 'No doctors yet'}</Text>
            <Text className="mt-1 text-xs text-slate-400">
              {ar ? 'أضف أطباء العيادة واختصاصاتهم' : 'Add clinic staff'}
            </Text>
          </View>
        ) : (
          doctors.map((d) => (
            <View key={d.id} className="flex-row items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5">
              <View className="h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100">
                <Text className="text-base font-extrabold text-sky-700">{d.name.trim().charAt(0) || '?'}</Text>
              </View>
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className="text-sm font-extrabold text-slate-900">
                  {d.name}
                </Text>
                <Text className="text-[11px] text-slate-500">{d.specialty}</Text>
                <View className="mt-1.5 flex-row items-center gap-3">
                  <View className="flex-row items-center gap-1">
                    <Phone size={11} color="#94A3B8" />
                    <Text className="text-[11px] text-slate-500">{d.phone || '—'}</Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Clock size={11} color="#94A3B8" />
                    <Text className="text-[11px] text-slate-500">{d.shift || '—'}</Text>
                  </View>
                </View>
                <Text className="mt-1 text-[11px] font-bold text-primary">
                  {ar ? 'الحالات المسندة' : 'Assigned cases'}: {d.cases}
                </Text>
              </View>
              <Pressable
                onPress={() => removeDoctor(d.id)}
                className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"
              >
                <Trash2 size={14} color="#64748B" />
              </Pressable>
            </View>
          ))
        )}
      </View>

      {open && <AddDoctorSheet ar={ar} onClose={() => setOpen(false)} />}
    </Screen>
  );
}

function AddDoctorSheet({ ar, onClose }: { ar: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [shift, setShift] = useState('');
  const [agreementType, setAgreementType] = useState<'percentage' | 'fixed'>('percentage');
  const [agreementPercent, setAgreementPercent] = useState('50');
  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const permissionOptions = [
    { value: ar ? 'رؤية مرضاه الخاصين فقط' : 'Own patients only', label: ar ? 'رؤية مرضاه الخاصين فقط' : 'Own patients only' },
    { value: ar ? 'رؤية جميع مرضى العيادة' : 'All clinic patients', label: ar ? 'رؤية جميع مرضى العيادة' : 'All clinic patients' },
  ];
  const [permissions, setPermissions] = useState(permissionOptions[0].value);

  const toggleDay = (day: string) => {
    setWorkingDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const submit = () => {
    if (!name.trim()) return;
    addDoctor({
      name: name.trim(),
      specialty: specialty.trim(),
      phone: phone.trim(),
      shift: shift.trim(),
      licenseNumber: licenseNumber.trim(),
      agreementType,
      agreementPercent: Number(agreementPercent) || 0,
      workingDays,
      permissions,
      cases: 0,
    });
    onClose();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[92%] rounded-t-3xl bg-white">
          <View className="flex-row items-center justify-between border-b border-slate-100 px-4 pb-2.5 pt-4">
            <Text className="text-base font-extrabold text-slate-900">{ar ? 'إضافة طبيب' : 'Add doctor'}</Text>
            <Pressable onPress={onClose} className="h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
              <X size={16} color="#334155" />
            </Pressable>
          </View>

          <ScrollView className="px-4" contentContainerClassName="gap-3.5 py-4">
            <Field label={ar ? 'اسم الطبيب' : 'Doctor name'}>
              <TextInput
                autoFocus
                value={name}
                onChangeText={setName}
                className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800"
                style={inputStyle}
              />
            </Field>

            <View className="flex-row gap-2.5">
              <View className="flex-1">
                <Field label={ar ? 'الاختصاص' : 'Specialty'}>
                  <TextInput
                    value={specialty}
                    onChangeText={setSpecialty}
                    className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800"
                    style={inputStyle}
                  />
                </Field>
              </View>
              <View className="flex-1">
                <Field label={ar ? 'رقم الهوية / النقابة' : 'License ID'}>
                  <TextInput
                    value={licenseNumber}
                    onChangeText={setLicenseNumber}
                    className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800"
                    style={ltrInputStyle}
                  />
                </Field>
              </View>
            </View>

            <View className="flex-row gap-2.5">
              <View className="flex-1">
                <Field label={ar ? 'الهاتف' : 'Phone'}>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800"
                    style={ltrInputStyle}
                  />
                </Field>
              </View>
              <View className="flex-1">
                <Field label={ar ? 'الدوام' : 'Shift'}>
                  <TextInput
                    value={shift}
                    onChangeText={setShift}
                    placeholder={ar ? 'صباحي 9-2' : 'Morning 9-2'}
                    placeholderTextColor="#94A3B8"
                    className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800"
                    style={inputStyle}
                  />
                </Field>
              </View>
            </View>

            <View>
              <Text className="mb-1.5 text-[11px] font-bold text-slate-500">
                {ar ? 'الاتفاقية المالية' : 'Financial Agreement'}
              </Text>
              <View className="mb-2 flex-row gap-2">
                <Pressable
                  onPress={() => setAgreementType('percentage')}
                  className={cn(
                    'h-9 flex-1 items-center justify-center rounded-xl border',
                    agreementType === 'percentage' ? 'border-primary bg-primary' : 'border-slate-200 bg-white',
                  )}
                >
                  <Text
                    className={cn(
                      'text-xs font-bold',
                      agreementType === 'percentage' ? 'text-primary-foreground' : 'text-slate-500',
                    )}
                  >
                    {ar ? 'نسبة مئوية (%)' : 'Percentage (%)'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setAgreementType('fixed')}
                  className={cn(
                    'h-9 flex-1 items-center justify-center rounded-xl border',
                    agreementType === 'fixed' ? 'border-primary bg-primary' : 'border-slate-200 bg-white',
                  )}
                >
                  <Text
                    className={cn(
                      'text-xs font-bold',
                      agreementType === 'fixed' ? 'text-primary-foreground' : 'text-slate-500',
                    )}
                  >
                    {ar ? 'راتب ثابت' : 'Fixed Salary'}
                  </Text>
                </Pressable>
              </View>
              {agreementType === 'percentage' && (
                <Field label={ar ? 'النسبة (%)' : 'Percent (%)'}>
                  <TextInput
                    value={agreementPercent}
                    onChangeText={(v) => setAgreementPercent(v.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800"
                    style={ltrInputStyle}
                  />
                </Field>
              )}
            </View>

            <View>
              <Text className="mb-1.5 text-[11px] font-bold text-slate-500">{ar ? 'أيام العمل' : 'Working Days'}</Text>
              <View className="flex-row flex-wrap gap-1.5">
                {DAYS_AR.map((day) => (
                  <Pressable
                    key={day}
                    onPress={() => toggleDay(day)}
                    className={cn(
                      'h-8 rounded-full border px-3 justify-center',
                      workingDays.includes(day) ? 'border-primary bg-primary' : 'border-slate-200 bg-white',
                    )}
                  >
                    <Text
                      className={cn(
                        'text-[11px] font-semibold',
                        workingDays.includes(day) ? 'text-primary-foreground' : 'text-slate-500',
                      )}
                    >
                      {day}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Field label={ar ? 'صلاحيات السجلات' : 'App Permissions'}>
              <Select value={permissions} onChange={setPermissions} options={permissionOptions} />
            </Field>

            <Pressable onPress={submit} className="h-12 items-center justify-center rounded-2xl bg-primary">
              <Text className="text-sm font-extrabold text-primary-foreground">{ar ? 'حفظ' : 'Save'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
