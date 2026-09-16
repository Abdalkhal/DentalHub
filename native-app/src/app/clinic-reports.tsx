import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Download } from 'lucide-react-native';

import { Screen, Select, Text } from '@/components/ui';
import { setClinicStoreUser, useClinic, clinicTotals } from '@/lib/clinicStore';
import { usePatients } from '@/lib/patientsStore';
import { useUserRole } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { shareCsv } from '@/lib/print';
import { toast } from '@/lib/toast';

const PERIOD_OPTIONS = [
  { id: 'today', ar: 'اليوم', en: 'Today' },
  { id: 'week', ar: 'هذا الأسبوع', en: 'This week' },
  { id: 'month', ar: 'هذا الشهر', en: 'This month' },
  { id: 'year', ar: 'هذه السنة', en: 'This year' },
];

function fmtIQD(n: number) {
  return `${n.toLocaleString()} د.ع`;
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' | 'default' }) {
  return (
    <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-3" style={{ minWidth: '46%' }}>
      <Text className="text-[11px] text-slate-500">{label}</Text>
      <Text
        className={cn(
          'mt-0.5 text-lg font-extrabold',
          tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-rose-600' : 'text-slate-800',
        )}
      >
        {value}
      </Text>
    </View>
  );
}

function ReportRow({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <Text className="text-xs text-slate-500">{label}</Text>
      <Text className="text-sm font-extrabold text-slate-800">{value}</Text>
    </View>
  );
}

export default function ClinicReportsScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useUserRole();

  useEffect(() => {
    if (user?.uid) setClinicStoreUser(user.uid);
  }, [user?.uid]);

  const data = useClinic();
  const patients = usePatients();
  const { expense } = clinicTotals(data);
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('month');

  const month = new Date().toISOString().slice(0, 7);

  // Revenue is what patients have actually paid (each patient's billing tab),
  // not the clinic-wide manual "income" transactions — those are a separate
  // ledger for things like supplier refunds, not patient collections.
  const income = patients.reduce((s, p) => s + p.payments.reduce((ps, pay) => ps + pay.amount, 0), 0);
  const monthIncome = patients.reduce(
    (s, p) => s + p.payments.filter((pay) => pay.date.startsWith(month)).reduce((ps, pay) => ps + pay.amount, 0),
    0,
  );
  const net = income - expense;

  const monthExpense = data.transactions
    .filter((t) => t.kind === 'expense' && t.date.startsWith(month))
    .reduce((s, t) => s + t.amount, 0);
  const completed = patients.filter((p) => p.status === 'completed').length;
  const inTreatment = patients.filter((p) => p.status === 'in_treatment').length;
  const newPatients = patients.filter((p) => p.status === 'new').length;

  const doctorOptions = useMemo(
    () => [
      { value: 'all', label: ar ? 'جميع الأطباء' : 'All doctors' },
      ...data.doctors.map((d) => ({ value: d.id, label: d.name })),
    ],
    [data.doctors, ar],
  );

  const periodOptions = useMemo(
    () => PERIOD_OPTIONS.map((p) => ({ value: p.id, label: ar ? p.ar : p.en })),
    [ar],
  );

  const doctorPerformance = useMemo(() => {
    const list = doctorFilter === 'all' ? data.doctors : data.doctors.filter((d) => d.id === doctorFilter);
    return list.map((d) => ({
      id: d.id,
      name: d.name,
      specialty: d.specialty || (ar ? 'بدون اختصاص' : 'No specialty'),
      split: 50,
      cases: d.cases || 0,
      revenue: 0,
    }));
  }, [data.doctors, doctorFilter, ar]);

  const exportCsv = async () => {
    const rows = [
      ['type', 'label', 'amount', 'date', 'source'],
      ...data.transactions.map((t) => [t.kind, t.label, String(t.amount), t.date, t.source]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const ok = await shareCsv(`clinic-report-${month}.csv`, csv);
    if (!ok) toast.error(ar ? 'تعذر تصدير التقرير' : 'Could not export report');
  };

  const bars = [
    { label: ar ? 'إيراد الشهر' : 'Month income', value: monthIncome, color: '#10B981' },
    { label: ar ? 'مصروف الشهر' : 'Month expense', value: monthExpense, color: '#F43F5E' },
  ];
  const max = Math.max(1, ...bars.map((b) => b.value));

  return (
    <Screen>
      {/* Filter bar */}
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Select value={doctorFilter} onChange={setDoctorFilter} options={doctorOptions} />
        </View>
        <View className="flex-1">
          <Select value={periodFilter} onChange={setPeriodFilter} options={periodOptions} />
        </View>
      </View>

      {/* Stats */}
      <View className="mt-3 gap-2.5">
        <View className="flex-row gap-2.5">
          <StatCard label={ar ? 'إجمالي الإيرادات' : 'Total revenue'} value={fmtIQD(income)} tone="good" />
          <StatCard label={ar ? 'إجمالي المصاريف' : 'Total expenses'} value={fmtIQD(expense)} tone="bad" />
        </View>
        <StatCard label={ar ? 'صافي الربح' : 'Net profit'} value={fmtIQD(net)} tone={net >= 0 ? 'good' : 'bad'} />
      </View>

      {/* This month */}
      <View className="mt-3 rounded-2xl border border-slate-200 bg-white p-3.5">
        <Text className="text-sm font-extrabold text-slate-900">{ar ? 'أداء الشهر الحالي' : 'This month'}</Text>
        <View className="mt-3 gap-2.5">
          {bars.map((b) => (
            <View key={b.label}>
              <View className="mb-1 flex-row items-center justify-between">
                <Text className="text-[11px] text-slate-500">{b.label}</Text>
                <Text className="text-[11px] font-bold text-slate-700">{fmtIQD(b.value)}</Text>
              </View>
              <View className="h-2 overflow-hidden rounded-full bg-slate-100">
                <View
                  className="h-full rounded-full"
                  style={{ width: `${(b.value / max) * 100}%`, backgroundColor: b.color }}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Doctor performance */}
      <View className="mt-3 rounded-2xl border border-slate-200 bg-white p-3.5">
        <Text className="mb-3 text-sm font-extrabold text-slate-900">
          {ar ? 'ملخص أداء الأطباء والمستحقات' : 'Doctor performance & dues'}
        </Text>
        {doctorPerformance.length === 0 ? (
          <Text className="text-xs text-slate-400">{ar ? 'لا يوجد أطباء بعد' : 'No doctors yet'}</Text>
        ) : (
          <View className="gap-2.5">
            {doctorPerformance.map((d) => (
              <View key={d.id} className="flex-row items-start gap-3 rounded-xl bg-slate-50 p-3">
                <View className="h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100">
                  <Text className="text-sm font-bold text-sky-700">{d.name.charAt(0)}</Text>
                </View>
                <View className="min-w-0 flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text numberOfLines={1} className="flex-shrink text-sm font-bold text-slate-900">
                      {d.name}
                    </Text>
                    <View className="shrink-0 rounded-full px-1.5 py-0.5" style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}>
                      <Text className="text-[10px] font-bold text-primary">{d.split}%</Text>
                    </View>
                  </View>
                  <Text className="text-[11px] text-slate-400">{d.specialty}</Text>
                  <View className="mt-1.5 flex-row gap-2">
                    <View className="flex-1 items-center rounded-lg bg-white p-1.5">
                      <Text className="text-[10px] text-slate-400">{ar ? 'الحالات' : 'Cases'}</Text>
                      <Text className="text-xs font-bold text-slate-800">{d.cases}</Text>
                    </View>
                    <View className="flex-1 items-center rounded-lg bg-white p-1.5">
                      <Text className="text-[10px] text-slate-400">{ar ? 'الإيراد' : 'Revenue'}</Text>
                      <Text className="text-xs font-bold text-slate-800">{fmtIQD(d.revenue)}</Text>
                    </View>
                    <View className="flex-1 items-center rounded-lg bg-white p-1.5">
                      <Text className="text-[10px] text-slate-400">{ar ? 'المستحق' : 'Due'}</Text>
                      <Text className="text-xs font-bold text-emerald-600">
                        {fmtIQD(Math.round((d.revenue * d.split) / 100))}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Patients */}
      <View className="mt-3 rounded-2xl border border-slate-200 bg-white p-3.5">
        <Text className="text-sm font-extrabold text-slate-900">{ar ? 'المرضى والعلاجات' : 'Patients & treatments'}</Text>
        <View className="mt-1">
          <ReportRow label={ar ? 'إجمالي المرضى' : 'Total patients'} value={patients.length} />
          <ReportRow label={ar ? 'مرضى جدد' : 'New patients'} value={newPatients} />
          <ReportRow label={ar ? 'علاج قيد الإنجاز' : 'In treatment'} value={inTreatment} />
          <ReportRow label={ar ? 'علاجات مكتملة' : 'Completed'} value={completed} />
        </View>
      </View>

      {/* Export */}
      <Pressable
        onPress={exportCsv}
        className="mt-3 h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-primary"
      >
        <Download size={16} color="#FFFFFF" />
        <Text className="text-sm font-extrabold text-primary-foreground">
          {ar ? 'تصدير التقرير المالي والإداري (CSV)' : 'Export financial & admin report (CSV)'}
        </Text>
      </Pressable>
    </Screen>
  );
}
