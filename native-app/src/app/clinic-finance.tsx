import { useEffect, useMemo, useState } from 'react';
import { Modal, View } from 'react-native';

import { Screen, Card, Button, Input, Text } from '@/components/ui';
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

export default function ClinicFinanceScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useUserRole();
  useEffect(() => {
    if (user?.uid) setClinicStoreUser(user.uid);
  }, [user?.uid]);

  const clinic = useClinic();
  const totals = clinicTotals(clinic);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <Screen>
      <View className="flex-row items-center justify-between">
        <Text className="text-xl font-extrabold text-slate-800">{ar ? 'المالية' : 'Finance'}</Text>
        <Button size="sm" title={ar ? '+ معاملة' : '+ Add'} onPress={() => setShowAdd(true)} />
      </View>

      <View className="mt-4 flex-row gap-2">
        <View className="flex-1 rounded-2xl border border-slate-200 bg-card p-3 shadow-sm">
          <Text className="text-[11px] font-bold text-slate-500">{ar ? 'الإيرادات' : 'Income'}</Text>
          <Text className="mt-1 truncate text-base font-extrabold text-emerald-600">
            {totals.income.toLocaleString()}
          </Text>
        </View>
        <View className="flex-1 rounded-2xl border border-slate-200 bg-card p-3 shadow-sm">
          <Text className="text-[11px] font-bold text-slate-500">{ar ? 'المصروفات' : 'Expenses'}</Text>
          <Text className="mt-1 truncate text-base font-extrabold text-rose-500">
            {totals.expense.toLocaleString()}
          </Text>
        </View>
        <View className="flex-1 rounded-2xl border border-slate-200 bg-card p-3 shadow-sm">
          <Text className="text-[11px] font-bold text-slate-500">{ar ? 'الصافي' : 'Net'}</Text>
          <Text className="mt-1 truncate text-base font-extrabold text-primary">
            {totals.net.toLocaleString()}
          </Text>
        </View>
      </View>

      <MonthlyBars transactions={clinic.transactions} ar={ar} />

      {clinic.transactions.length === 0 ? (
        <Text className="mt-10 text-center text-slate-500">{ar ? 'لا توجد معاملات' : 'No transactions'}</Text>
      ) : (
        <View className="mt-4 space-y-2">
          {clinic.transactions.map((t) => (
            <Card key={t.id} className="flex-row items-center gap-3">
              <View className="flex-1">
                <Text className="text-sm font-bold text-slate-800">{t.label}</Text>
                <Text className="text-[11px] text-slate-400">
                  {t.source || '—'} · {t.date}
                </Text>
              </View>
              <Text className={cn('text-sm font-extrabold', t.kind === 'income' ? 'text-emerald-600' : 'text-rose-500')}>
                {t.kind === 'income' ? '+' : '−'}
                {t.amount.toLocaleString()}
              </Text>
              <Button variant="ghost" title="✕" onPress={() => removeTransaction(t.id)} />
            </Card>
          ))}
        </View>
      )}

      <AddTxModal open={showAdd} onClose={() => setShowAdd(false)} ar={ar} />
    </Screen>
  );
}

function AddTxModal({
  open,
  onClose,
  ar,
}: {
  open: boolean;
  onClose: () => void;
  ar: boolean;
}) {
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<TxKind>('income');
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');

  const save = () => {
    if (!label.trim() || !amount) return;
    addTransaction({
      label: label.trim(),
      kind,
      amount: Number(amount) || 0,
      source: source.trim(),
    });
    setLabel('');
    setAmount('');
    setSource('');
    onClose();
  };

  return (
    <Modal visible={open} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/40">
        <View className="rounded-t-3xl bg-white p-5 pb-8">
          <Text className="text-lg font-extrabold">{ar ? 'إضافة معاملة' : 'Add transaction'}</Text>
          <View className="mt-4 flex-row gap-1.5">
            <Button size="sm" variant={kind === 'income' ? 'primary' : 'outline'} title={ar ? 'إيراد' : 'Income'} onPress={() => setKind('income')} className="flex-1" />
            <Button size="sm" variant={kind === 'expense' ? 'primary' : 'outline'} title={ar ? 'مصروف' : 'Expense'} onPress={() => setKind('expense')} className="flex-1" />
          </View>
          <View className="mt-4 space-y-3">
            <Input value={label} onChangeText={setLabel} placeholder={ar ? 'البيان' : 'Label'} />
            <Input value={amount} onChangeText={setAmount} placeholder={ar ? 'المبلغ' : 'Amount'} keyboardType="numeric" />
            <Input value={source} onChangeText={setSource} placeholder={ar ? 'المصدر' : 'Source'} />
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

const SHORT_MONTHS: { ar: string[]; en: string[] } = {
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

function monthKeyOf(date?: string): string | null {
  if (!date) return null;
  const m = /^(\d{4})-(\d{2})/.exec(date);
  if (m) return `${m[1]}-${m[2]}`;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 7);
}

function MonthlyBars({
  transactions,
  ar,
}: {
  transactions: Array<{ kind: TxKind; amount: number; date?: string }>;
  ar: boolean;
}) {
  const data = useMemo(() => {
    const keys: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const sums = keys.map((k) => ({ k, income: 0, expense: 0 }));
    transactions.forEach((t) => {
      const k = monthKeyOf(t.date);
      if (!k) return;
      const row = sums.find((s) => s.k === k);
      if (!row) return;
      if (t.kind === 'expense') row.expense += t.amount;
      else row.income += t.amount;
    });
    return sums;
  }, [transactions]);

  if (transactions.length === 0) return null;
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));

  return (
    <Card className="mt-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-extrabold text-slate-800">
          {ar ? 'الصافي الشهري' : 'Monthly finance'}
        </Text>
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-1">
            <View className="h-2 w-2 rounded-full bg-emerald-500" />
            <Text className="text-[10px] text-slate-500">{ar ? 'إيرادات' : 'Income'}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <View className="h-2 w-2 rounded-full bg-rose-400" />
            <Text className="text-[10px] text-slate-500">{ar ? 'مصروفات' : 'Expenses'}</Text>
          </View>
        </View>
      </View>

      <View className="mt-4 flex-row items-end justify-between">
        {data.map((d) => {
          const mon = Number(d.k.split('-')[1]);
          const label = (ar ? SHORT_MONTHS.ar[mon - 1] : SHORT_MONTHS.en[mon - 1]) ?? d.k;
          const ih = Math.max(2, Math.round((d.income / max) * 88));
          const eh = Math.max(2, Math.round((d.expense / max) * 88));
          return (
            <View key={d.k} className="flex-1 items-center">
              <View className="h-[104px] flex-row items-end justify-center gap-1">
                <View className="w-3 rounded-t bg-emerald-500" style={{ height: ih }} />
                <View className="w-3 rounded-t bg-rose-400" style={{ height: eh }} />
              </View>
              <Text className="mt-1 text-[9px] text-slate-400">{label}</Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}
