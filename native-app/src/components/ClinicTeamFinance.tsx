import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Switch, TextInput, View } from 'react-native';
import { Wallet, X } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { removeDoctor, useClinic } from '@/lib/clinicStore';
import { useClinics } from '@/lib/clinicsStore';
import {
  addDoctorPayout,
  getClinicDues,
  teamErrorMessage,
  updateClinicMember,
  useClinicTeam,
  voidDoctorPayout,
  type ClinicMember,
  type DuesReport,
} from '@/lib/clinicTeam';
import { formatAmountInput, formatMoney, parseAmountInput, setPatientDoctors, type FeeCurrency, type Patient } from '@/lib/patientsStore';
import { useSession } from '@/lib/useAuth';
import { cn } from '@/lib/utils';

function Toggle({ label, hint, on, disabled, onChange }: { label: string; hint?: string; on: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <View className="flex-row items-center gap-2" style={{ opacity: disabled ? 0.5 : 1 }}>
      <View className="min-w-0 flex-1">
        <Text className="text-[11px] font-bold text-slate-800">{label}</Text>
        {!!hint && <Text className="text-[10px] leading-4 text-slate-500">{hint}</Text>}
      </View>
      <Switch value={on} disabled={disabled} onValueChange={onChange} />
    </View>
  );
}

/** The owner's settings for one member: what they see, and their agreement. */
export function MemberControls({ m, ar, busy, run }: { m: ClinicMember; ar: boolean; busy: boolean; run: (fn: () => Promise<unknown>) => Promise<void> }) {
  const { doctors } = useClinic();
  const [type, setType] = useState(m.agreementType ?? 'percentage');
  const [percent, setPercent] = useState(String(m.agreementPercent ?? ''));
  const [showDues, setShowDues] = useState(false);
  const dirty = type !== (m.agreementType ?? 'percentage') || (type === 'percentage' && percent !== String(m.agreementPercent ?? ''));

  return (
    <View className="gap-2.5 border-t border-slate-100 pt-2.5">
      <Toggle
        label={ar ? 'يرى كل مرضى العيادة' : 'Sees all clinic patients'}
        hint={ar ? 'عند إيقافه يرى من أُسندوا إليه أو سجّلهم فقط' : 'When off, only those assigned to or added by them'}
        on={m.allPatients === true}
        disabled={busy}
        onChange={(v) => void run(() => updateClinicMember(m.id, { allPatients: v }))}
      />
      <Toggle
        label={ar ? 'يرى المبالغ ويسجل الدفعات' : 'Sees amounts and records payments'}
        hint={m.role === 'visitor' ? (ar ? 'غير متاح للطبيب الزائر' : 'Not available to visiting doctors') : ar ? 'لمرضاه فقط، ولا يغيّر الأتعاب ولا يحذف دفعة' : "Their patients only; can't change fees or delete payments"}
        on={m.financeAccess === true}
        disabled={busy || m.role === 'visitor'}
        onChange={(v) => void run(() => updateClinicMember(m.id, { financeAccess: v }))}
      />

      <View className="gap-1.5">
        <Text className="text-[11px] font-bold text-slate-800">{ar ? 'الاتفاقية المالية' : 'Financial agreement'}</Text>
        <View className="flex-row flex-wrap items-center gap-1.5">
          {(['percentage', 'fixed'] as const).map((t) => (
            <Pressable key={t} onPress={() => setType(t)} className={cn('h-8 justify-center rounded-full border px-3', type === t ? 'border-primary bg-primary' : 'border-slate-200 bg-white')}>
              <Text className={cn('text-[11px] font-bold', type === t ? 'text-primary-foreground' : 'text-slate-500')}>
                {t === 'percentage' ? (ar ? 'نسبة' : 'Percent') : ar ? 'راتب ثابت' : 'Fixed salary'}
              </Text>
            </Pressable>
          ))}
          {type === 'percentage' && (
            <TextInput
              keyboardType="number-pad"
              value={percent}
              onChangeText={(v) => setPercent(v.replace(/[^\d.]/g, ''))}
              placeholder="%"
              placeholderTextColor="#94A3B8"
              textAlignVertical="center"
              className="h-9 w-16 rounded-lg border border-slate-200 bg-white text-xs text-slate-800"
              style={{ textAlign: 'center' }}
            />
          )}
          {dirty && (
            <Pressable
              disabled={busy}
              onPress={() => void run(() => updateClinicMember(m.id, { agreementType: type, agreementPercent: type === 'percentage' ? Number(percent) || 0 : 0 }))}
              className="h-8 justify-center rounded-full bg-primary px-3"
            >
              <Text className="text-[11px] font-bold text-primary-foreground">{ar ? 'حفظ' : 'Save'}</Text>
            </Pressable>
          )}
        </View>
        <Text className="text-[10px] text-slate-400">{ar ? 'تغيير النسبة يسري على الدفعات من تاريخ التغيير فقط.' : 'A new percentage applies from its date onward.'}</Text>
        {!m.agreementType && doctors.length > 0 && (
          <View className="flex-row flex-wrap items-center gap-1.5">
            <Text className="text-[10px] text-slate-400">{ar ? 'من السجل الداخلي:' : 'From the internal list:'}</Text>
            {doctors.map((d) => (
              <Pressable
                key={d.id}
                disabled={busy}
                onPress={() =>
                  Alert.alert(ar ? 'ربط بالسجل الداخلي' : 'Link', ar ? `اعتماد اتفاقية ${d.name} لهذا الطبيب وحذفه من السجل الداخلي؟` : `Use ${d.name}'s agreement and remove them from the internal list?`, [
                    { text: ar ? 'إلغاء' : 'Cancel', style: 'cancel' },
                    {
                      text: ar ? 'اعتماد' : 'Use',
                      onPress: () =>
                        void run(() =>
                          updateClinicMember(m.id, { agreementType: d.agreementType, agreementPercent: d.agreementType === 'percentage' ? d.agreementPercent : 0 }).then(() => removeDoctor(d.id)),
                        ),
                    },
                  ])
                }
                className="h-7 justify-center rounded-full border border-slate-200 bg-white px-2.5"
              >
                <Text className="text-[10px] font-bold text-slate-700">{d.name}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <Pressable onPress={() => setShowDues((v) => !v)} className="h-10 flex-row items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white">
        <Wallet size={14} color="#475569" />
        <Text className="text-[11px] font-bold text-slate-700">{showDues ? (ar ? 'إخفاء المستحقات' : 'Hide dues') : ar ? 'المستحقات والدفعات' : 'Dues and payouts'}</Text>
      </Pressable>
      {showDues && <DuesPanel memberDocId={m.id} ar={ar} owner />}
    </View>
  );
}

/** What a doctor earned at a clinic. Both sides see the same figures. */
export function DuesPanel({ memberDocId, ar, owner }: { memberDocId: string; ar: boolean; owner?: boolean }) {
  const [data, setData] = useState<DuesReport | null>(null);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const [cur, setCur] = useState<FeeCurrency>('IQD');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () =>
    getClinicDues(memberDocId)
      .then(setData)
      .catch((err) => setError(teamErrorMessage(err, ar)));
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberDocId]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setError(teamErrorMessage(err, ar));
    } finally {
      setBusy(false);
    }
  };

  if (!data) return error ? <Text className="text-xs text-rose-600">{error}</Text> : <ActivityIndicator color="#2563EB" />;
  const used = (['IQD', 'USD'] as const).filter((c) => data.totals[c].collected > 0 || data.totals[c].paidOut > 0);

  return (
    <View className="gap-2.5">
      <Text className="text-[11px] text-slate-500">
        {data.agreementType === 'fixed'
          ? ar ? 'الاتفاقية: راتب ثابت' : 'Agreement: fixed salary'
          : data.agreementType === 'percentage'
            ? ar ? `الاتفاقية: ${data.agreementPercent}% من دفعات مرضاه` : `Agreement: ${data.agreementPercent}% of their patients' payments`
            : ar ? 'لم تُحدد الاتفاقية بعد' : 'No agreement set yet'}
      </Text>
      {used.length === 0 && <Text className="text-[11px] text-slate-400">{ar ? 'لا توجد دفعات بعد' : 'No payments yet'}</Text>}
      {used.map((c) => {
        const t = data.totals[c];
        const cells: [string, number, string][] = [
          [ar ? 'دفعات مرضاه' : 'Collected', t.collected, 'bg-slate-100'],
          [ar ? 'المُستلم' : 'Paid out', t.paidOut, 'bg-emerald-50'],
          [ar ? 'المستحق' : 'Owed', t.earned - t.paidOut, 'bg-blue-50'],
        ];
        return (
          <View key={c} className="flex-row gap-1.5">
            {cells.map(([label, value, cls]) => (
              <View key={label} className={cn('flex-1 items-center rounded-xl p-2', cls)}>
                <Text numberOfLines={1} className="text-xs font-extrabold text-slate-800">{formatMoney(value, c)}</Text>
                <Text className="text-[10px] text-slate-500">{label}</Text>
              </View>
            ))}
          </View>
        );
      })}

      {owner && (
        <View className="gap-1.5 rounded-xl bg-slate-50 p-2.5">
          <Text className="text-[11px] font-bold text-slate-800">{ar ? 'تسجيل دفعة للطبيب' : 'Record a payout'}</Text>
          <View className="flex-row gap-1.5">
            {(['IQD', 'USD'] as const).map((c) => (
              <Pressable
                key={c}
                onPress={() => {
                  setCur(c);
                  setAmount((a) => formatAmountInput(a, c));
                }}
                className={cn('h-10 justify-center rounded-xl border px-3', cur === c ? 'border-primary bg-primary' : 'border-slate-200 bg-white')}
              >
                <Text className={cn('text-[11px] font-bold', cur === c ? 'text-primary-foreground' : 'text-slate-500')}>{c === 'IQD' ? 'د.ع' : '$'}</Text>
              </Pressable>
            ))}
            <TextInput
              value={amount}
              onChangeText={(v) => setAmount(formatAmountInput(v, cur))}
              keyboardType={cur === 'IQD' ? 'number-pad' : 'decimal-pad'}
              placeholder="0"
              placeholderTextColor="#94A3B8"
              className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-800"
              style={{ writingDirection: 'ltr', textAlign: 'left' }}
            />
          </View>
          <TextInput value={note} onChangeText={setNote} placeholder={ar ? 'ملاحظة' : 'Note'} placeholderTextColor="#94A3B8" className="h-10 rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-800" />
          <Pressable
            disabled={busy || !parseAmountInput(amount)}
            onPress={() =>
              void act(async () => {
                await addDoctorPayout(memberDocId, parseAmountInput(amount) ?? 0, cur, note);
                setAmount('');
                setNote('');
              })
            }
            className="h-10 items-center justify-center rounded-xl bg-primary"
            style={{ opacity: busy || !parseAmountInput(amount) ? 0.5 : 1 }}
          >
            <Text className="text-[11px] font-bold text-primary-foreground">{ar ? 'تسجيل' : 'Record'}</Text>
          </Pressable>
        </View>
      )}
      {!!error && <Text className="text-xs font-medium text-rose-600">{error}</Text>}

      {data.payouts.length > 0 && (
        <View className="gap-1">
          <Text className="text-[11px] font-bold text-slate-800">{ar ? 'الدفعات المستلمة' : 'Payouts'}</Text>
          {data.payouts.map((o) => (
            <View key={o.id} className="flex-row items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5" style={{ opacity: o.voidedAt ? 0.5 : 1 }}>
              <Text className={cn('text-[11px] font-bold text-slate-800', !!o.voidedAt && 'line-through')}>{formatMoney(o.amount, o.currency)}</Text>
              <Text numberOfLines={1} className="min-w-0 flex-1 text-[11px] text-slate-500">{o.date}{o.note ? ` · ${o.note}` : ''}</Text>
              {o.voidedAt ? (
                <Text className="text-[10px] font-bold text-rose-600">{ar ? 'ملغاة' : 'Void'}</Text>
              ) : (
                owner && (
                  <Pressable
                    disabled={busy}
                    onPress={() =>
                      Alert.alert(ar ? 'إلغاء الدفعة' : 'Void payout', ar ? 'إلغاء هذه الدفعة؟ ستبقى ظاهرة كملغاة.' : 'Void this payout? It stays visible as void.', [
                        { text: ar ? 'رجوع' : 'Back', style: 'cancel' },
                        { text: ar ? 'إلغاء الدفعة' : 'Void', style: 'destructive', onPress: () => void act(() => voidDoctorPayout(memberDocId, o.id)) },
                      ])
                    }
                  >
                    <X size={14} color="#94A3B8" />
                  </Pressable>
                )
              )}
            </View>
          ))}
        </View>
      )}

      {data.items.length > 0 && (
        <View className="gap-1">
          <Text className="text-[11px] font-bold text-slate-800">{ar ? 'تفاصيل الدفعات' : 'Payment details'}</Text>
          {data.items.map((i, n) => (
            <View key={n} className="rounded-lg border border-slate-200 px-2 py-1.5">
              <View className="flex-row justify-between gap-2">
                <Text numberOfLines={1} className="flex-1 text-[11px] font-bold text-slate-800">{i.patientName}</Text>
                <Text className="text-[11px] font-bold text-primary">{formatMoney(i.share, i.currency)}</Text>
              </View>
              <Text className="text-[10px] text-slate-500">
                {i.date} · {i.receiptNo || '—'} · {formatMoney(i.amount, i.currency)} · {i.percent}%
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/** Owner: which team members treat this patient. */
export function PatientDoctorsCard({ p, ar }: { p: Patient; ar: boolean }) {
  const { user } = useSession();
  const { activeClinicId } = useClinics();
  const team = useClinicTeam(user?.uid, activeClinicId);
  if (team.active.length === 0) return null;
  const chosen = p.doctorUids ?? [];
  return (
    <View className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
      <Text className="mb-2 text-[11px] font-bold text-slate-500">{ar ? 'الأطباء المعالجون' : 'Treating doctors'}</Text>
      <View className="flex-row flex-wrap gap-1.5">
        {team.active.map((m) => {
          const on = chosen.includes(m.memberId);
          return (
            <Pressable
              key={m.id}
              onPress={() => setPatientDoctors(p.id, on ? chosen.filter((u) => u !== m.memberId) : [...chosen, m.memberId])}
              className={cn('h-8 justify-center rounded-full border px-3', on ? 'border-primary bg-primary' : 'border-slate-200 bg-white')}
            >
              <Text className={cn('text-[11px] font-bold', on ? 'text-primary-foreground' : 'text-slate-500')}>{m.memberName}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="mt-1.5 text-[10px] leading-4 text-slate-400">
        {ar ? 'الطبيب المختار يرى ملف هذا المريض فقط، وتُحسب دفعاته الجديدة ضمن مستحقاته (الأول في القائمة).' : 'A chosen doctor sees this patient only; new payments count towards the first one listed.'}
      </Text>
    </View>
  );
}
