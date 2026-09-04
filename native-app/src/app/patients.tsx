import { useState } from 'react';
import { FlatList, Linking, Modal, Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Phone, UserPlus } from 'lucide-react-native';

import { Screen, Button, Input, Text } from '@/components/ui';
import {
  usePatients,
  addPatient,
  updatePatient,
  type Patient,
  type PatientStatus,
} from '@/lib/patientsStore';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const STATUS_AR: Record<PatientStatus, string> = {
  new: 'جديد',
  in_treatment: 'قيد الإنجاز',
  completed: 'مكتمل',
};
const STATUS_CLS: Record<PatientStatus, string> = {
  new: 'bg-sky-100 text-sky-700',
  in_treatment: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
};
const CYCLE: PatientStatus[] = ['new', 'in_treatment', 'completed'];

export default function PatientsScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const patients = usePatients();
  const [q, setQ] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const list = patients.filter((p) => {
    const term = q.trim().toLowerCase();
    return !term || `${p.name} ${p.phone}`.toLowerCase().includes(term);
  });

  const cycleStatus = (p: Patient) => {
    const next = CYCLE[(CYCLE.indexOf(p.status) + 1) % CYCLE.length];
    updatePatient(p.id, { status: next });
  };

  return (
    <Screen scroll={false}>
      <View className="flex-row items-center justify-between pb-2">
        <View>
          <Text className="text-xl font-extrabold text-slate-800">{ar ? 'المرضى' : 'Patients'}</Text>
          <Text className="text-[11px] text-slate-400">
            {patients.length} {ar ? 'مريض' : 'patients'}
          </Text>
        </View>
        <Button size="sm" title={ar ? '+ إضافة مريض' : '+ Add patient'} onPress={() => setShowAdd(true)} />
      </View>

      <FlatListImpl
        data={list}
        emptyText={ar ? 'لا يوجد مرضى بعد' : 'No patients yet'}
        emptyHint={
          <Button
            title={ar ? 'أضف أول مريض' : 'Add first patient'}
            onPress={() => setShowAdd(true)}
            className="mt-4"
          />
        }
        keyExtractor={(p) => p.id}
        searchValue={q}
        onSearch={setQ}
        searchPlaceholder={ar ? 'ابحث بالاسم أو الهاتف…' : 'Search name or phone…'}
        renderRow={(p) => (
          <View className="mb-3 flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-card p-3.5 shadow-sm">
            <Pressable
              onPress={() =>
                router.push({ pathname: '/patient/[patientId]', params: { patientId: p.id } } as never)
              }
              className="min-w-0 flex-1 flex-row items-center gap-3"
            >
              <View
                className={cn(
                  'h-11 w-11 items-center justify-center rounded-full',
                  p.gender === 'female' ? 'bg-pink-100' : 'bg-sky-100',
                )}
              >
                <Text className="font-extrabold text-slate-600">{p.name.charAt(0) || '?'}</Text>
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-bold text-slate-800" numberOfLines={1}>
                  {p.name}
                </Text>
                <Text className="text-[11px] text-slate-400">
                  {p.age || '—'} {ar ? 'سنة' : 'y'} · {p.gender === 'female' ? (ar ? 'أنثى' : 'Female') : ar ? 'ذكر' : 'Male'}
                </Text>
              </View>
            </Pressable>
            {!!p.phone && (
              <Pressable
                onPress={() => Linking.openURL(`tel:${p.phone}`)}
                className="h-9 w-9 items-center justify-center rounded-full bg-emerald-50"
              >
                <Phone size={15} color="#059669" />
              </Pressable>
            )}
            <Pressable
              onPress={() => cycleStatus(p)}
              className={cn('rounded-full px-2.5 py-1', STATUS_CLS[p.status])}
            >
              <Text className="text-[11px] font-bold">{STATUS_AR[p.status]}</Text>
            </Pressable>
          </View>
        )}
      />

      <AddPatientModal open={showAdd} onClose={() => setShowAdd(false)} ar={ar} />
    </Screen>
  );
}

function FlatListImpl({
  data,
  keyExtractor,
  renderRow,
  emptyText,
  emptyHint,
  searchValue,
  onSearch,
  searchPlaceholder,
}: {
  data: Patient[];
  keyExtractor: (p: Patient) => string;
  renderRow: (p: Patient) => React.ReactElement | null;
  emptyText: string;
  emptyHint?: React.ReactNode;
  searchValue: string;
  onSearch: (v: string) => void;
  searchPlaceholder: string;
}) {
  return (
    <FlatList
      data={data}
      keyExtractor={keyExtractor}
      renderItem={({ item }) => renderRow(item)}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 24 }}
      ListHeaderComponent={
        <TextInput
          value={searchValue}
          onChangeText={onSearch}
          placeholder={searchPlaceholder}
          placeholderTextColor="#94A3B8"
          className="mb-3 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm"
        />
      }
      ListEmptyComponent={
        <View className="items-center py-20">
          <UserPlus size={48} color="#CBD5E1" />
          <Text className="mt-3 text-sm text-slate-400">{emptyText}</Text>
          {emptyHint}
        </View>
      }
    />
  );
}

function AddPatientModal({ open, onClose, ar }: { open: boolean; onClose: () => void; ar: boolean }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [error, setError] = useState('');

  const save = () => {
    if (!name.trim()) {
      setError(ar ? 'الاسم مطلوب' : 'Name is required');
      return;
    }
    if (!phone.trim()) {
      setError(ar ? 'رقم الهاتف مطلوب' : 'Phone is required');
      return;
    }
    const p = addPatient({
      name: name.trim(),
      age: age === '' ? '' : Number(age),
      gender,
      phone: phone.trim(),
      history: { diabetes: false, hypertension: false, heart: false, allergy: false, bleeding: false },
      complaint: '',
      status: 'new',
    });
    setName('');
    setPhone('');
    setAge('');
    setError('');
    onClose();
    router.push({ pathname: '/patient/[patientId]', params: { patientId: p.id } } as never);
  };

  return (
    <Modal visible={open} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/40">
        <View className="rounded-t-3xl bg-white p-5 pb-8">
          <Text className="text-lg font-extrabold">{ar ? 'إضافة مريض جديد' : 'Add new patient'}</Text>
          <View className="mt-4 gap-3">
            <Input value={name} onChangeText={setName} placeholder={ar ? 'الاسم الكامل *' : 'Full name *'} />
            <Input value={phone} onChangeText={setPhone} placeholder={ar ? 'رقم الهاتف *' : 'Phone *'} keyboardType="phone-pad" />
            <Input value={age} onChangeText={setAge} placeholder={ar ? 'العمر' : 'Age'} keyboardType="numeric" />
            <View className="flex-row gap-2">
              {(['male', 'female'] as const).map((g) => (
                <Pressable
                  key={g}
                  onPress={() => setGender(g)}
                  className={cn(
                    'h-11 flex-1 items-center justify-center rounded-xl border-2',
                    gender === g ? 'border-[#2563EB] bg-sky-50' : 'border-transparent bg-slate-50',
                  )}
                >
                  <Text className={cn('text-sm font-semibold', gender === g ? 'text-sky-700' : 'text-slate-500')}>
                    {g === 'male' ? (ar ? 'ذكر' : 'Male') : ar ? 'أنثى' : 'Female'}
                  </Text>
                </Pressable>
              ))}
            </View>
            {!!error && (
              <Text className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{error}</Text>
            )}
          </View>
          <View className="mt-4 flex-row gap-2">
            <Button variant="outline" title={ar ? 'إلغاء' : 'Cancel'} onPress={onClose} className="flex-1" />
            <Button title={ar ? 'حفظ' : 'Save'} onPress={save} className="flex-1" />
          </View>
        </View>
      </View>
    </Modal>
  );
}
