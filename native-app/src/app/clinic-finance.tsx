import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trash2, TrendingDown, TrendingUp, Wallet, X } from 'lucide-react-native';

import { Screen, Select, Text } from '@/components/ui';
import { useUserRole } from '@/lib/useAuth';
import {
  setClinicStoreUser,
  useClinic,
  clinicTotals,
  addTransaction,
  removeTransaction,
  type TxKind,
} from '@/lib/clinicStore';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const SOURCES = [
  { id: 'patient', ar: 'مريض', en: 'Patient' },
  { id: 'lab', ar: 'مختبر', en: 'Lab' },
  { id: 'supply', ar: 'مستلزمات', en: 'Supplies' },
  { id: 'other', ar: 'أخرى', en: 'Other' },
] as const;

function fmtIQD(n: number) {
  return `${n.toLocaleString()} د.ع`;
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'warn' | 'good' | 'bad' }) {
  return (
    <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <Text className="text-[11px] text-slate-500">{label}</Text>
      <Text
        className={cn(
          'mt-0.5 text-lg font-extrabold',
          tone === 'warn' ? 'text-amber-600' : tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-rose-600' : 'text-slate-800',
        )}
      >
        {value}
      </Text>
    </View>
  );
}

export default function ClinicFinanceScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useUserRole();
  useEffect(() => {
    if (user?.uid) setClinicStoreUser(user.uid);
  }, [user?.uid]);

  const clinic = useClinic();
  const { income, expense, net, dueOrders } = clinicTotals(clinic);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <Screen>
      <View className="flex-row flex-wrap gap-2.5">
        <StatCard label={ar ? 'الإيرادات' : 'Revenue'} value={fmtIQD(income)} tone="good" />
        <StatCard label={ar ? 'المصاريف' : 'Expenses'} value={fmtIQD(expense)} tone="bad" />
        <StatCard label={ar ? 'الصافي' : 'Net'} value={fmtIQD(net)} tone={net >= 0 ? 'good' : 'bad'} />
        <StatCard label={ar ? 'متبقي للموردين' : 'Outstanding'} value={fmtIQD(dueOrders)} tone="warn" />
      </View>

      <Pressable
        onPress={() => setShowAdd(true)}
        className="mt-3 h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-primary shadow-lg"
      >
        <Text className="text-lg font-bold text-primary-foreground">+</Text>
        <Text className="text-sm font-extrabold text-primary-foreground">
          {ar ? 'إضافة حركة مالية' : 'Add transaction'}
        </Text>
      </Pressable>

      {clinic.transactions.length === 0 ? (
        <View className="mt-4 items-center rounded-2xl border border-dashed border-slate-200 bg-white p-8">
          <Wallet size={32} color="#94A3B8" />
          <Text className="mt-2 text-sm font-semibold text-slate-700">
            {ar ? 'لا توجد حركات مالية' : 'No transactions'}
          </Text>
          <Text className="mt-1 text-center text-[11px] text-slate-400">
            {ar ? 'سجّل أول دفعة أو مصروف' : 'Add your first entry'}
          </Text>
        </View>
      ) : (
        <View className="mt-4 gap-2.5">
          {clinic.transactions.map((t) => {
            const src = SOURCES.find((s) => s.id === t.source);
            return (
              <View key={t.id} className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                <View
                  className={cn(
                    'h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
                    t.kind === 'income' ? 'bg-emerald-100' : 'bg-rose-100',
                  )}
                >
                  <Text className={cn('text-sm font-extrabold', t.kind === 'income' ? 'text-emerald-700' : 'text-rose-700')}>
                    {t.kind === 'income' ? '+' : '−'}
                  </Text>
                </View>
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={1} className="text-sm font-extrabold text-slate-900">
                    {t.label}
                  </Text>
                  <Text className="text-[11px] text-slate-400">
                    {t.date} · {src ? (ar ? src.ar : src.en) : t.source || '—'}
                  </Text>
                </View>
                <Text className={cn('text-sm font-extrabold', t.kind === 'income' ? 'text-emerald-600' : 'text-rose-600')}>
                  {fmtIQD(t.amount)}
                </Text>
                <Pressable onPress={() => removeTransaction(t.id)} className="h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                  <Trash2 size={14} color="#64748B" />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      <AddTxModal open={showAdd} onClose={() => setShowAdd(false)} ar={ar} />
    </Screen>
  );
}

function AddTxModal({ open, onClose, ar }: { open: boolean; onClose: () => void; ar: boolean }) {
  const insets = useSafeAreaInsets();
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<TxKind>('income');
  const [amountDisplay, setAmountDisplay] = useState('');
  const [source, setSource] = useState<(typeof SOURCES)[number]['id']>('patient');

  const formatAmount = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('en-US');
  };

  const reset = () => {
    setLabel('');
    setKind('income');
    setAmountDisplay('');
    setSource('patient');
  };

  const submit = () => {
    if (!label.trim()) return;
    addTransaction({
      label: label.trim(),
      kind,
      amount: Number(amountDisplay.replace(/,/g, '')) || 0,
      source,
    });
    reset();
    onClose();
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View className="flex-1 justify-start bg-black/40">
        <View className="rounded-b-3xl bg-white" style={{ paddingTop: insets.top }}>
          <View className="flex-row items-center justify-between border-b border-slate-100 px-4 pb-2.5 pt-4">
            <Text className="text-base font-extrabold text-slate-900">
              {ar ? 'إضافة حركة مالية' : 'Add transaction'}
            </Text>
            <Pressable onPress={onClose} className="h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
              <X size={16} color="#334155" />
            </Pressable>
          </View>

          <ScrollView contentContainerClassName="gap-3 px-4 py-4">
            {/* Income / Expense toggle */}
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setKind('income')}
                className={cn(
                  'h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2',
                  kind === 'income' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-200 bg-white',
                )}
              >
                <TrendingUp size={16} color={kind === 'income' ? '#FFFFFF' : '#475569'} />
                <Text className={cn('text-sm font-bold', kind === 'income' ? 'text-white' : 'text-slate-600')}>
                  {ar ? 'إيراد' : 'Income'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setKind('expense')}
                className={cn(
                  'h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2',
                  kind === 'expense' ? 'border-rose-500 bg-rose-500' : 'border-slate-200 bg-white',
                )}
              >
                <TrendingDown size={16} color={kind === 'expense' ? '#FFFFFF' : '#475569'} />
                <Text className={cn('text-sm font-bold', kind === 'expense' ? 'text-white' : 'text-slate-600')}>
                  {ar ? 'مصروف' : 'Expense'}
                </Text>
              </Pressable>
            </View>

            <View>
              <Text className="mb-1.5 text-[11px] font-bold text-slate-500">{ar ? 'البيان' : 'Description'}</Text>
              <TextInput
                value={label}
                onChangeText={setLabel}
                placeholder={ar ? 'مثال: دفعة مريض' : 'e.g., Patient payment'}
                placeholderTextColor="#94A3B8"
                className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800"
              />
            </View>

            <View>
              <Text className="mb-1.5 text-[11px] font-bold text-slate-500">
                {ar ? 'المبلغ' : 'Amount'} ({ar ? 'د.ع' : 'IQD'})
              </Text>
              <View className="h-11 flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-3">
                <TextInput
                  value={amountDisplay}
                  onChangeText={(v) => setAmountDisplay(formatAmount(v))}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                  className="flex-1 text-right text-sm text-slate-800"
                />
                <Text className="ms-2 shrink-0 text-xs font-bold text-slate-400">{ar ? 'د.ع' : 'IQD'}</Text>
              </View>
            </View>

            <View>
              <Text className="mb-1.5 text-[11px] font-bold text-slate-500">{ar ? 'المصدر' : 'Source'}</Text>
              <Select
                value={source}
                onChange={(v) => setSource(v as (typeof SOURCES)[number]['id'])}
                options={SOURCES.map((s) => ({ value: s.id, label: ar ? s.ar : s.en }))}
              />
            </View>

            <Pressable
              onPress={submit}
              className={cn(
                'mt-1 h-12 items-center justify-center rounded-2xl shadow-lg',
                kind === 'income' ? 'bg-emerald-500' : 'bg-rose-500',
              )}
            >
              <Text className="text-sm font-extrabold text-white">
                {ar ? 'حفظ الحركة' : 'Save Transaction'}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
