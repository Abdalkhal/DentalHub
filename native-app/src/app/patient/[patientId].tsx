import { useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Pencil, Phone, Plus, Trash2 } from 'lucide-react-native';

import { Screen, Card, Button, Input, Text } from '@/components/ui';
import {
  usePatients,
  updatePatient,
  removePatient,
  getLog,
  addLogEntry,
  addVisit,
  removeVisit,
  setTooth,
  addPayment,
  removePayment,
  paidTotal,
  type PatientStatus,
  type ToothStatus,
} from '@/lib/patientsStore';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const STATUS_AR: Record<PatientStatus, string> = {
  new: 'جديد',
  in_treatment: 'قيد الإنجاز',
  completed: 'مكتمل',
};

const TOOTH_ROWS = [
  [18, 17, 16, 15, 14, 13, 12, 11],
  [21, 22, 23, 24, 25, 26, 27, 28],
  [48, 47, 46, 45, 44, 43, 42, 41],
  [31, 32, 33, 34, 35, 36, 37, 38],
];

const TOOTH_OPTIONS: { value: ToothStatus; ar: string; color: string }[] = [
  { value: 'healthy', ar: 'سليم', color: '#E2E8F0' },
  { value: 'filled', ar: 'محشو', color: '#3B82F6' },
  { value: 'missing', ar: 'مفقود', color: '#DC2626' },
  { value: 'caries', ar: 'يحتاج علاج', color: '#F59E0B' },
  { value: 'crown', ar: 'تاج', color: '#8B5CF6' },
  { value: 'implant', ar: 'زرعة', color: '#10B981' },
];

function toothColor(s?: ToothStatus): string {
  return TOOTH_OPTIONS.find((o) => o.value === s)?.color ?? '#E2E8F0';
}

export default function PatientDetailScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const patients = usePatients();
  const p = patients.find((x) => x.id === patientId);

  const [tab, setTab] = useState<'info' | 'visits' | 'teeth' | 'fees'>('info');
  const [note, setNote] = useState('');
  const [showAddVisit, setShowAddVisit] = useState(false);
  const [toothPick, setToothPick] = useState<number | null>(null);
  const [showAddPay, setShowAddPay] = useState(false);

  if (!p) {
    return (
      <Screen>
        <Text className="mt-10 text-center text-slate-500">{ar ? 'المريض غير موجود' : 'Patient not found'}</Text>
      </Screen>
    );
  }

  const log = getLog(p);
  const paid = paidTotal(p);
  const remaining = Math.max(0, (p.totalFees ?? 0) - paid);

  const edit = () => {
    Alert.prompt(
      ar ? 'تعديل رقم الهاتف' : 'Edit phone',
      p.name,
      [
        { text: ar ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: ar ? 'حفظ' : 'Save',
          onPress: (v?: string) => v && updatePatient(p.id, { phone: v }),
        },
      ],
      'plain-text',
      p.phone || '',
    );
  };

  const del = () => {
    Alert.alert(ar ? 'حذف المريض' : 'Delete patient', p.name, [
      { text: ar ? 'إلغاء' : 'Cancel', style: 'cancel' },
      { text: ar ? 'حذف' : 'Delete', style: 'destructive', onPress: () => { removePatient(p.id); router.back(); } },
    ]);
  };

  const TABS = [
    { id: 'info', ar: 'المعلومات', en: 'Info' },
    { id: 'visits', ar: 'الزيارات', en: 'Visits' },
    { id: 'teeth', ar: 'الأسنان', en: 'Teeth' },
    { id: 'fees', ar: 'المالية', en: 'Fees' },
  ] as const;

  return (
    <Screen>
      {/* Header card */}
      <View className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-card p-4 shadow-sm">
        <View className={cn('h-14 w-14 items-center justify-center rounded-full', p.gender === 'female' ? 'bg-pink-100' : 'bg-sky-100')}>
          <Text className="text-xl font-extrabold text-slate-700">{p.name.charAt(0) || '؟'}</Text>
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-lg font-extrabold text-slate-900">{p.name}</Text>
          <Text className="text-xs text-slate-500">
            {p.age || '—'} {ar ? 'سنة' : 'y'} · {p.gender === 'female' ? (ar ? 'أنثى' : 'Female') : ar ? 'ذكر' : 'Male'}
          </Text>
          {!!p.phone && (
            <Pressable onPress={() => Linking.openURL(`tel:${p.phone}`)} className="mt-1 flex-row items-center gap-1 self-start">
              <Phone size={12} color="#2563EB" />
              <Text className="text-xs font-bold text-primary">{p.phone}</Text>
            </Pressable>
          )}
        </View>
        <Pressable onPress={edit} className="h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
          <Pencil size={15} color="#334155" />
        </Pressable>
        <Pressable onPress={del} className="h-9 w-9 items-center justify-center rounded-xl bg-rose-50">
          <Trash2 size={15} color="#E11D48" />
        </Pressable>
      </View>

      {/* Tabs */}
      <View className="mt-4 flex-row rounded-2xl bg-slate-100 p-1.5">
        {TABS.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setTab(t.id)}
            className={cn('h-10 flex-1 items-center justify-center rounded-xl', tab === t.id && 'bg-white shadow-sm')}
          >
            <Text className={cn('text-xs font-bold', tab === t.id ? 'text-slate-900' : 'text-slate-500')}>
              {ar ? t.ar : t.en}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView className="mt-4 flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {tab === 'info' && (
          <View className="gap-3">
            <View className="flex-row gap-2">
              {(Object.keys(STATUS_AR) as PatientStatus[]).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={p.status === s ? 'primary' : 'outline'}
                  title={STATUS_AR[s]}
                  onPress={() => updatePatient(p.id, { status: s })}
                  className={cn('flex-1', p.status !== s && 'border-border')}
                />
              ))}
            </View>
            <Card>
              <Text className="text-xs font-bold text-slate-500">{ar ? 'الشكوى الرئيسية' : 'Chief complaint'}</Text>
              <Input
                value={p.complaint}
                onChangeText={(v) => updatePatient(p.id, { complaint: v })}
                placeholder={ar ? 'اكتب الشكوى...' : 'Write complaint...'}
                multiline
                className="mt-2"
              />
            </Card>
            <Card>
              <Text className="mb-2 text-xs font-bold text-slate-500">{ar ? 'ملاحظات الطبيب' : 'Doctor note'}</Text>
              <Input value={note} onChangeText={setNote} placeholder={ar ? 'اكتب ملاحظة...' : 'Write a note...'} multiline />
              <Button
                title={ar ? 'حفظ الملاحظة' : 'Save note'}
                onPress={() => updatePatient(p.id, { doctorNote: note, doctorNoteDate: new Date().toISOString().slice(0, 10) })}
                className="mt-2"
              />
            </Card>
            <Card>
              <Text className="mb-2 text-xs font-bold text-slate-500">{ar ? 'السجل المرضي' : 'History log'}</Text>
              {log.length === 0 ? (
                <Text className="text-xs text-slate-400">{ar ? 'لا توجد سجلات' : 'No records'}</Text>
              ) : (
                log.map((e) => (
                  <View key={e.id} className="mb-1.5 rounded-xl border border-border px-3 py-2">
                    <Text className="text-xs font-semibold text-slate-700">{e.text}</Text>
                    <Text className="text-[10px] text-slate-400">{e.date}</Text>
                  </View>
                ))
              )}
            </Card>
            <Button
              title={ar ? 'وصفة طبية (Rx)' : 'Prescription (Rx)'}
              onPress={() => router.push({ pathname: '/rx/[patientId]', params: { patientId: p.id } })}
            />
          </View>
        )}

        {tab === 'visits' && (
          <View className="gap-3">
            <Button title={ar ? '+ إضافة زيارة' : '+ Add visit'} onPress={() => setShowAddVisit(true)} />
            {p.visits.length === 0 ? (
              <Text className="py-10 text-center text-slate-400">{ar ? 'لا توجد زيارات' : 'No visits yet'}</Text>
            ) : (
              p.visits.map((v) => (
                <Card key={v.id} className="flex-row items-center gap-3">
                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-bold text-slate-800">{v.procedure || '—'}</Text>
                    <Text className="text-[11px] text-slate-400">
                      {v.date} {v.time ? ` · ${v.time}` : ''}
                    </Text>
                    {!!v.note && <Text className="mt-1 text-xs text-slate-600">{v.note}</Text>}
                  </View>
                  <Pressable onPress={() => removeVisit(p.id, v.id)} className="h-8 w-8 items-center justify-center rounded-lg bg-rose-50">
                    <Trash2 size={14} color="#E11D48" />
                  </Pressable>
                </Card>
              ))
            )}
          </View>
        )}

        {tab === 'teeth' && (
          <View className="gap-1.5">
            <Text className="mb-1 text-center text-xs text-slate-400">
              {ar ? 'اضغط على السن لتغيير حالته' : 'Tap a tooth to change its status'}
            </Text>
            {TOOTH_ROWS.map((row, i) => (
              <View key={i} className="flex-row gap-1.5">
                {row.map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => setToothPick(n)}
                    className="h-9 flex-1 items-center justify-center rounded-md border border-slate-200"
                    style={{ backgroundColor: toothColor(p.teeth[n]) }}
                  >
                    <Text className={cn('text-[9px] font-bold', p.teeth[n] ? 'text-white' : 'text-slate-500')}>{n}</Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        )}

        {tab === 'fees' && (
          <View className="gap-3">
            <View className="flex-row gap-2">
              <Card className="flex-1 items-center">
                <Text className="text-lg font-extrabold text-slate-800">{(p.totalFees ?? 0).toLocaleString()}</Text>
                <Text className="text-[11px] text-slate-500">{ar ? 'إجمالي الرسوم' : 'Total fees'}</Text>
              </Card>
              <Card className="flex-1 items-center">
                <Text className="text-lg font-extrabold text-emerald-600">{paid.toLocaleString()}</Text>
                <Text className="text-[11px] text-slate-500">{ar ? 'المدفوع' : 'Paid'}</Text>
              </Card>
              <Card className="flex-1 items-center">
                <Text className={cn('text-lg font-extrabold', remaining > 0 ? 'text-rose-500' : 'text-emerald-600')}>
                  {remaining.toLocaleString()}
                </Text>
                <Text className="text-[11px] text-slate-500">{ar ? 'المتبقي' : 'Remaining'}</Text>
              </Card>
            </View>
            <Button title={ar ? '+ دفعة' : '+ Add payment'} onPress={() => setShowAddPay(true)} />
            {p.payments.length === 0 ? (
              <Text className="py-6 text-center text-xs text-slate-400">{ar ? 'لا توجد دفعات' : 'No payments'}</Text>
            ) : (
              p.payments.map((pay) => (
                <Card key={pay.id} className="flex-row items-center gap-3">
                  <View className="flex-1">
                    <Text className="text-sm font-extrabold text-slate-800">{pay.amount.toLocaleString()}</Text>
                    <Text className="text-[11px] text-slate-400">{pay.date}</Text>
                  </View>
                  <Pressable onPress={() => removePayment(p.id, pay.id)} className="h-8 w-8 items-center justify-center rounded-lg bg-rose-50">
                    <Trash2 size={14} color="#E11D48" />
                  </Pressable>
                </Card>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {showAddVisit && (
        <AddVisitSheet
          ar={ar}
          patientId={p.id}
          onClose={() => setShowAddVisit(false)}
        />
      )}
      {showAddPay && (
        <AddPaymentSheet ar={ar} patientId={p.id} onClose={() => setShowAddPay(false)} />
      )}
      {toothPick != null && (
        <ToothPicker
          ar={ar}
          current={p.teeth[toothPick]}
          onClose={() => setToothPick(null)}
          onPick={(st) => {
            setTooth(p.id, toothPick, st);
            setToothPick(null);
          }}
        />
      )}
    </Screen>
  );
}

function AddVisitSheet({ ar, patientId, onClose }: { ar: boolean; patientId: string; onClose: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [procedure, setProcedure] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const save = () => {
    if (!procedure.trim()) {
      setError(ar ? 'نوع العلاج مطلوب' : 'Procedure is required');
      return;
    }
    addVisit(patientId, { date, procedure: procedure.trim(), note: note.trim() });
    onClose();
  };

  return (
    <Modal visible transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/40">
        <View className="rounded-t-3xl bg-white p-5 pb-8">
          <Text className="text-lg font-extrabold">{ar ? 'إضافة زيارة' : 'Add visit'}</Text>
          <View className="mt-4 gap-3">
            <Input value={date} onChangeText={setDate} placeholder={ar ? 'التاريخ (YYYY-MM-DD)' : 'Date (YYYY-MM-DD)'} />
            <Input value={procedure} onChangeText={setProcedure} placeholder={ar ? 'نوع العلاج *' : 'Procedure *'} />
            <Input value={note} onChangeText={setNote} placeholder={ar ? 'ملاحظات' : 'Notes'} multiline />
            {!!error && <Text className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</Text>}
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

function AddPaymentSheet({ ar, patientId, onClose }: { ar: boolean; patientId: string; onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const save = () => {
    const n = Number(amount);
    if (!n || n <= 0) return;
    addPayment(patientId, { amount: n, date: new Date().toISOString().slice(0, 10) });
    onClose();
  };
  return (
    <Modal visible transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/40">
        <View className="rounded-t-3xl bg-white p-5 pb-8">
          <Text className="text-lg font-extrabold">{ar ? 'إضافة دفعة' : 'Add payment'}</Text>
          <Input value={amount} onChangeText={setAmount} placeholder={ar ? 'المبلغ' : 'Amount'} keyboardType="numeric" className="mt-4" />
          <View className="mt-4 flex-row gap-2">
            <Button variant="outline" title={ar ? 'إلغاء' : 'Cancel'} onPress={onClose} className="flex-1" />
            <Button title={ar ? 'حفظ' : 'Save'} onPress={save} className="flex-1" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ToothPicker({
  ar,
  current,
  onClose,
  onPick,
}: {
  ar: boolean;
  current?: ToothStatus;
  onClose: () => void;
  onPick: (s: ToothStatus) => void;
}) {
  return (
    <Modal visible transparent animationType="fade">
      <View className="flex-1 items-center justify-center bg-black/40 p-6">
        <View className="w-full rounded-3xl bg-white p-5">
          <Text className="mb-3 text-center text-sm font-extrabold text-slate-700">
            {ar ? 'اختر الحالة' : 'Choose status'}
          </Text>
          <View className="gap-2">
            {TOOTH_OPTIONS.map((o) => (
              <Pressable
                key={o.value}
                onPress={() => onPick(o.value)}
                className="h-11 flex-row items-center justify-between rounded-xl border border-slate-200 px-4"
              >
                <View className="h-4 w-4 rounded-full" style={{ backgroundColor: o.color }} />
                <Text className="text-sm font-bold text-slate-700">{ar ? o.ar : o.value}</Text>
                {current === o.value && <Text className="text-xs font-bold text-primary">✓</Text>}
              </Pressable>
            ))}
          </View>
          <Button variant="outline" title={ar ? 'إلغاء' : 'Cancel'} onPress={onClose} className="mt-4" />
        </View>
      </View>
    </Modal>
  );
}
