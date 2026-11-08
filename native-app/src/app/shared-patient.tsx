import { useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { FileImage, MessageCircle, Phone, Plus, Upload } from 'lucide-react-native';

import { Screen, Select, Text } from '@/components/ui';
import { whatsappLink } from '@/lib/booking';
import {
  canRecordPayments,
  planStatusLabel,
  sharedBalance,
  sharedUploadPath,
  teamErrorMessage,
  toothLabel,
  TOOTH_STATUSES,
  updateSharedPatient,
  useMyClinicMemberships,
  useSharedPatients,
  type SharedPatient,
} from '@/lib/clinicTeam';
import { useI18n } from '@/lib/i18n';
import { uploadFileUri } from '@/lib/nativeUpload';
import { formatAmountInput, formatMoney, localDay, parseAmountInput, type FeeCurrency } from '@/lib/patientsStore';
import { useSession } from '@/lib/useAuth';
import { cn } from '@/lib/utils';

const inputCls = 'h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-2 rounded-2xl border border-slate-200 bg-white p-3.5">
      <Text className="text-xs font-extrabold text-slate-900">{title}</Text>
      {children}
    </View>
  );
}

function Primary({ label, disabled, onPress }: { label: string; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} className="h-10 items-center justify-center rounded-xl bg-primary" style={{ opacity: disabled ? 0.5 : 1 }}>
      <Text className="text-[11px] font-bold text-primary-foreground">{label}</Text>
    </Pressable>
  );
}

type Run = (op: string, payload: Record<string, unknown>, after?: () => void) => Promise<void>;
type Props = { p: SharedPatient; ar: boolean; busy: boolean; run: Run };

export default function SharedPatientScreen() {
  const params = useLocalSearchParams<{ ownerId: string; clinicId: string; patientId: string }>();
  const ownerId = String(params.ownerId);
  const clinicId = String(params.clinicId);
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useSession();
  const memberships = useMyClinicMemberships(user?.uid);
  const member = memberships.find((m) => m.ownerId === ownerId && m.clinicId === clinicId && m.status === 'active');
  const { list, loading } = useSharedPatients(user?.uid, ownerId, clinicId);
  const p = list.find((x) => x.id === params.patientId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run: Run = async (op, payload, after) => {
    if (!p) return;
    setBusy(true);
    setError('');
    try {
      await updateSharedPatient(p, op, payload);
      after?.();
    } catch (err) {
      setError(teamErrorMessage(err, ar));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View className="gap-3">
        {!p && !loading && (
          <View className="items-center rounded-2xl border border-dashed border-slate-200 bg-white py-10">
            <Text className="text-xs text-slate-500">{ar ? 'هذا الملف غير متاح لك' : "This file isn't available to you"}</Text>
          </View>
        )}
        {p && (
          <>
            {!!error && (
              <View className="rounded-xl bg-rose-50 p-3">
                <Text className="text-xs font-medium text-rose-700">{error}</Text>
              </View>
            )}
            <Info p={p} ar={ar} />
            <Notes key={`${p.complaint}|${p.doctorNote}`} p={p} ar={ar} busy={busy} run={run} />
            <Visits p={p} ar={ar} busy={busy} run={run} />
            <Plan p={p} ar={ar} busy={busy} run={run} />
            <Teeth p={p} ar={ar} busy={busy} run={run} />
            <Files p={p} ar={ar} busy={busy} run={run} uid={user?.uid ?? ''} setBusy={setBusy} onError={setError} />
            {p.finance && member && <Finance p={p} ar={ar} busy={busy} run={run} canRecord={canRecordPayments(member)} />}
            <Activity p={p} ar={ar} busy={busy} run={run} />
          </>
        )}
      </View>
    </Screen>
  );
}

function Info({ p, ar }: { p: SharedPatient; ar: boolean }) {
  const conditions = Object.keys(p.history || {}).filter((k) => p.history[k]);
  const names: Record<string, string> = { diabetes: 'السكري', hypertension: 'ضغط الدم', heart: 'أمراض القلب', allergy: 'الحساسية', bleeding: 'النزف' };
  const alerts = [conditions.map((k) => (ar ? names[k] ?? k : k)).join('، '), p.allergies && `${ar ? 'حساسية' : 'Allergy'}: ${p.allergies}`, p.meds && `${ar ? 'أدوية' : 'Meds'}: ${p.meds}`].filter(Boolean).join(' · ');
  return (
    <Section title={`${p.name} · ${p.fileNo}`}>
      <Text className="text-[11px] text-slate-500">
        {p.age ? `${p.age} ${ar ? 'سنة' : 'y'} · ` : ''}
        {p.gender === 'female' ? (ar ? 'أنثى' : 'Female') : ar ? 'ذكر' : 'Male'}
        {p.lastVisit ? ` · ${ar ? 'آخر زيارة' : 'Last visit'}: ${p.lastVisit}` : ''}
      </Text>
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
      {!!alerts && (
        <View className="rounded-xl bg-amber-50 p-2.5">
          <Text className="text-[11px] font-semibold text-amber-900">{alerts}</Text>
        </View>
      )}
    </Section>
  );
}

function Notes({ p, ar, busy, run }: Props) {
  const [complaint, setComplaint] = useState(p.complaint);
  const [doctorNote, setDoctorNote] = useState(p.doctorNote);
  const dirty = complaint !== p.complaint || doctorNote !== p.doctorNote;
  return (
    <Section title={ar ? 'الشكوى والملاحظات' : 'Complaint and notes'}>
      <TextInput value={complaint} onChangeText={setComplaint} placeholder={ar ? 'الشكوى الرئيسية' : 'Main complaint'} placeholderTextColor="#94A3B8" className={inputCls} />
      <TextInput value={doctorNote} onChangeText={setDoctorNote} multiline placeholder={ar ? 'ملاحظات الطبيب' : "Doctor's notes"} placeholderTextColor="#94A3B8" className="min-h-[64px] rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800" textAlignVertical="top" />
      {dirty && <Primary label={ar ? 'حفظ' : 'Save'} disabled={busy} onPress={() => void run('setNotes', { complaint, doctorNote })} />}
    </Section>
  );
}

function Visits({ p, ar, busy, run }: Props) {
  const [procedure, setProcedure] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(localDay());
  return (
    <Section title={ar ? 'الزيارات' : 'Visits'}>
      <TextInput value={procedure} onChangeText={setProcedure} placeholder={ar ? 'الإجراء' : 'Procedure'} placeholderTextColor="#94A3B8" className={inputCls} />
      <TextInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor="#94A3B8" className={inputCls} style={{ writingDirection: 'ltr', textAlign: 'left' }} />
      <TextInput value={note} onChangeText={setNote} placeholder={ar ? 'ملاحظة' : 'Note'} placeholderTextColor="#94A3B8" className={inputCls} />
      <Primary
        label={ar ? 'إضافة زيارة' : 'Add visit'}
        disabled={busy || !procedure.trim()}
        onPress={() =>
          void run('addVisit', { procedure, note, date, upcoming: date > localDay() }, () => {
            setProcedure('');
            setNote('');
          })
        }
      />
      {p.visits.map((v) => (
        <View key={v.id} className="rounded-xl border border-slate-200 px-3 py-2">
          <Text className="text-[11px] font-bold text-slate-800">{v.procedure}</Text>
          <Text className="text-[11px] text-slate-500">{[v.date, v.byName || v.doctor, v.note].filter(Boolean).join(' · ')}</Text>
        </View>
      ))}
    </Section>
  );
}

function CurrencyPills({ value, onChange }: { value: FeeCurrency; onChange: (c: FeeCurrency) => void }) {
  return (
    <>
      {(['IQD', 'USD'] as const).map((c) => (
        <Pressable key={c} onPress={() => onChange(c)} className={cn('h-11 justify-center rounded-xl border px-3', value === c ? 'border-primary bg-primary' : 'border-slate-200 bg-white')}>
          <Text className={cn('text-[11px] font-bold', value === c ? 'text-primary-foreground' : 'text-slate-500')}>{c === 'IQD' ? 'د.ع' : '$'}</Text>
        </Pressable>
      ))}
    </>
  );
}

function Plan({ p, ar, busy, run }: Props) {
  const [title, setTitle] = useState('');
  const [tooth, setTooth] = useState('');
  const [cost, setCost] = useState('');
  const [cur, setCur] = useState<FeeCurrency>('IQD');
  const next = { planned: 'active', active: 'done', done: 'planned' } as const;
  return (
    <Section title={ar ? 'خطة العلاج' : 'Treatment plan'}>
      <View className="flex-row gap-2">
        <TextInput value={title} onChangeText={setTitle} placeholder={ar ? 'الإجراء' : 'Procedure'} placeholderTextColor="#94A3B8" className={cn(inputCls, 'flex-[2]')} />
        <TextInput value={tooth} onChangeText={setTooth} placeholder={ar ? 'السن' : 'Tooth'} placeholderTextColor="#94A3B8" className={cn(inputCls, 'flex-1')} style={{ writingDirection: 'ltr', textAlign: 'left' }} />
      </View>
      {!!p.finance && (
        <View className="flex-row gap-1.5">
          <CurrencyPills
            value={cur}
            onChange={(c) => {
              setCur(c);
              setCost((a) => formatAmountInput(a, c));
            }}
          />
          <TextInput value={cost} onChangeText={(v) => setCost(formatAmountInput(v, cur))} keyboardType={cur === 'IQD' ? 'number-pad' : 'decimal-pad'} placeholder={ar ? 'الكلفة' : 'Cost'} placeholderTextColor="#94A3B8" className={cn(inputCls, 'flex-1')} style={{ writingDirection: 'ltr', textAlign: 'left' }} />
        </View>
      )}
      <Primary
        label={ar ? 'إضافة إلى الخطة' : 'Add to plan'}
        disabled={busy || !title.trim()}
        onPress={() =>
          void run('addPlanStep', { title, tooth, cost: parseAmountInput(cost), currency: cur }, () => {
            setTitle('');
            setTooth('');
            setCost('');
          })
        }
      />
      {p.plan.map((s) => (
        <View key={s.id} className="flex-row items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="text-[11px] font-bold text-slate-800">{s.title}</Text>
            <Text numberOfLines={1} className="text-[11px] text-slate-500">{[s.tooth, s.cost && s.currency ? formatMoney(s.cost, s.currency) : '', s.byName].filter(Boolean).join(' · ')}</Text>
          </View>
          <Pressable disabled={busy} onPress={() => void run('setPlanStatus', { stepId: s.id, status: next[s.status] })} className="h-7 justify-center rounded-full px-2.5" style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}>
            <Text className="text-[10px] font-bold text-primary">{planStatusLabel(s.status, ar)}</Text>
          </Pressable>
        </View>
      ))}
    </Section>
  );
}

function Teeth({ p, ar, busy, run }: Props) {
  const [tooth, setTooth] = useState('');
  const [status, setStatus] = useState<string>('caries');
  const flagged = Object.keys(p.teeth || {}).sort((a, b) => Number(a) - Number(b));
  return (
    <Section title={ar ? 'حالة الأسنان' : 'Teeth'}>
      {flagged.length > 0 ? (
        <View className="flex-row flex-wrap gap-1.5">
          {flagged.map((t) => (
            <View key={t} className="rounded-full bg-slate-100 px-2.5 py-1">
              <Text className="text-[10px] font-bold text-slate-700">{t} — {toothLabel(p.teeth[t], ar)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text className="text-[11px] text-slate-400">{ar ? 'لا توجد ملاحظات' : 'Nothing flagged'}</Text>
      )}
      <View className="flex-row items-center gap-2">
        <TextInput value={tooth} onChangeText={(v) => setTooth(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder={ar ? 'رقم السن' : 'Tooth #'} placeholderTextColor="#94A3B8" className={cn(inputCls, 'w-24')} style={{ writingDirection: 'ltr', textAlign: 'left' }} />
        <View className="flex-1">
          <Select value={status} onChange={setStatus} options={TOOTH_STATUSES.map((s) => ({ value: s, label: toothLabel(s, ar) }))} />
        </View>
        <Pressable disabled={busy || !tooth} onPress={() => void run('setTooth', { tooth: Number(tooth), status }, () => setTooth(''))} className="h-11 w-11 items-center justify-center rounded-xl bg-primary" style={{ opacity: busy || !tooth ? 0.5 : 1 }}>
          <Plus size={16} color="#FFFFFF" />
        </Pressable>
      </View>
    </Section>
  );
}

function Files({ p, ar, busy, run, uid, setBusy, onError }: Props & { uid: string; setBusy: (b: boolean) => void; onError: (e: string) => void }) {
  const [tag, setTag] = useState<'xray' | ''>('xray');
  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    const a = res.canceled ? null : res.assets?.[0];
    if (!a || !uid) return;
    setBusy(true);
    onError('');
    try {
      const type = a.mimeType ?? 'image/jpeg';
      const name = a.fileName ?? `image-${Date.now()}.${type.split('/')[1] ?? 'jpg'}`;
      const uploadPath = sharedUploadPath(uid, name);
      await uploadFileUri(uploadPath, a.uri, type);
      await run('addFile', { uploadPath, name, type, tag });
    } catch (err) {
      onError(teamErrorMessage(err, ar));
    } finally {
      setBusy(false);
    }
  };
  const options: ['xray' | '', string][] = [['xray', ar ? 'أشعة' : 'X-ray'], ['', ar ? 'صورة' : 'Photo']];
  return (
    <Section title={ar ? 'الأشعة والصور' : 'X-rays and photos'}>
      <View className="flex-row gap-1.5">
        {options.map(([v, label]) => (
          <Pressable key={v} onPress={() => setTag(v)} className={cn('h-10 justify-center rounded-xl border px-3', tag === v ? 'border-primary bg-primary' : 'border-slate-200 bg-white')}>
            <Text className={cn('text-[11px] font-bold', tag === v ? 'text-primary-foreground' : 'text-slate-500')}>{label}</Text>
          </Pressable>
        ))}
        <Pressable disabled={busy} onPress={() => void pick()} className="h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white">
          {busy ? <ActivityIndicator size="small" color="#2563EB" /> : <Upload size={14} color="#475569" />}
          <Text className="text-[11px] font-bold text-slate-700">{ar ? 'رفع' : 'Upload'}</Text>
        </Pressable>
      </View>
      {p.files.length > 0 && (
        <View className="flex-row flex-wrap gap-2">
          {p.files.map((f) => (
            <Pressable key={f.id} onPress={() => void Linking.openURL(f.url)} style={{ width: '31.5%' }} className="aspect-square items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              {f.type.startsWith('image/') ? <Image source={{ uri: f.url }} className="h-full w-full" resizeMode="cover" /> : <FileImage size={22} color="#94A3B8" />}
            </Pressable>
          ))}
        </View>
      )}
    </Section>
  );
}

function Finance({ p, ar, busy, run, canRecord }: Props & { canRecord: boolean }) {
  const f = p.finance!;
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [cur, setCur] = useState<FeeCurrency>(f.fees.USD > 0 && !f.fees.IQD ? 'USD' : 'IQD');
  const used = (['IQD', 'USD'] as const).filter((c) => f.fees[c] > 0 || sharedBalance(f, c).paid > 0);
  return (
    <Section title={ar ? 'المالية' : 'Finances'}>
      {used.length === 0 && <Text className="text-[11px] text-slate-400">{ar ? 'لا توجد مبالغ مسجلة' : 'No amounts recorded'}</Text>}
      {used.map((c) => {
        const b = sharedBalance(f, c);
        const cells: [string, number][] = [[ar ? 'الأتعاب' : 'Fees', b.fees], [ar ? 'المدفوع' : 'Paid', b.paid], [ar ? 'المتبقي' : 'Remaining', b.remaining]];
        return (
          <View key={c} className="flex-row gap-1.5">
            {cells.map(([label, v]) => (
              <View key={label} className="flex-1 items-center rounded-xl bg-slate-100 p-2">
                <Text numberOfLines={1} className="text-xs font-extrabold text-slate-800">{formatMoney(v, c)}</Text>
                <Text className="text-[10px] text-slate-500">{label}</Text>
              </View>
            ))}
          </View>
        );
      })}
      {canRecord && (
        <View className="gap-1.5 rounded-xl bg-slate-50 p-2.5">
          <View className="flex-row gap-1.5">
            <CurrencyPills
              value={cur}
              onChange={(c) => {
                setCur(c);
                setAmount((a) => formatAmountInput(a, c));
              }}
            />
            <TextInput value={amount} onChangeText={(v) => setAmount(formatAmountInput(v, cur))} keyboardType={cur === 'IQD' ? 'number-pad' : 'decimal-pad'} placeholder={ar ? 'المبلغ' : 'Amount'} placeholderTextColor="#94A3B8" className={cn(inputCls, 'flex-1 bg-white')} style={{ writingDirection: 'ltr', textAlign: 'left' }} />
          </View>
          <TextInput value={note} onChangeText={setNote} placeholder={ar ? 'ملاحظة' : 'Note'} placeholderTextColor="#94A3B8" className={cn(inputCls, 'bg-white')} />
          <Primary
            label={ar ? 'تسجيل دفعة' : 'Record payment'}
            disabled={busy || !parseAmountInput(amount)}
            onPress={() =>
              void run('addPayment', { amount: parseAmountInput(amount), currency: cur, note }, () => {
                setAmount('');
                setNote('');
              })
            }
          />
        </View>
      )}
      {f.payments.map((x) => (
        <View key={x.id} className="rounded-xl border border-slate-200 px-3 py-2">
          <Text className="text-[11px] font-bold text-slate-800">{formatMoney(x.amount, x.currency)}</Text>
          <Text className="text-[11px] text-slate-500">{[x.date, x.receiptNo, x.note].filter(Boolean).join(' · ')}</Text>
        </View>
      ))}
    </Section>
  );
}

function Activity({ p, ar, busy, run }: Props) {
  const [text, setText] = useState('');
  return (
    <Section title={ar ? 'سجل العمل' : 'Activity'}>
      <View className="flex-row gap-2">
        <TextInput value={text} onChangeText={setText} placeholder={ar ? 'إضافة ملاحظة' : 'Add a note'} placeholderTextColor="#94A3B8" className={cn(inputCls, 'flex-1')} />
        <Pressable disabled={busy || !text.trim()} onPress={() => void run('addNote', { text }, () => setText(''))} className="h-11 w-11 items-center justify-center rounded-xl bg-primary" style={{ opacity: busy || !text.trim() ? 0.5 : 1 }}>
          <Plus size={16} color="#FFFFFF" />
        </Pressable>
      </View>
      {p.log.map((e) => (
        <Text key={e.id} className="text-[11px] text-slate-500">{e.date} · {e.text}</Text>
      ))}
    </Section>
  );
}
