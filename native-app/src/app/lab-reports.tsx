import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Activity, BarChart3, DollarSign, TrendingUp } from 'lucide-react-native';

import { Screen, Text } from '@/components/ui';
import { useOrders, connectLabOrders, disconnectLabOrders, type Order } from '@/lib/ordersStore';
import { resolveOrderTotal } from '@/lib/orderLines';
import { useUserRole } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// Ported from the web app's reports.tsx, but reading real data instead of
// what it actually reads there: `localStorage.getItem("dental_hub_orders")`
// — a leftover key nothing in the current app ever writes to, so on web this
// page is permanently stuck on "not enough data". This version uses the same
// `ordersStore` data every other lab screen uses, and — since web's revenue
// chart isn't real revenue either (`count * 200`, a made-up placeholder
// multiplier) — a real per-work-type revenue sum via `resolveOrderTotal`.
// Charts are plain Views (no charting library is installed for native-app);
// the turnaround estimate keeps web's own approximation (received date to
// *now*, not an actual delivery timestamp — the data model has no such
// field to read instead).

const RANGES = ['7d', '30d', '90d'] as const;
type Range = (typeof RANGES)[number];

const RANGE_MS: Record<Range, number> = {
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
};

const BAR_COLORS = ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#0EA5E9'];

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string, ar: boolean): string {
  const monthsAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const idx = Number(key.split('-')[1]) - 1;
  return (ar ? monthsAr : monthsEn)[idx] ?? key;
}

function BarRow({ label, value, max, color, valueLabel }: { label: string; value: number; max: number; color: string; valueLabel: string }) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <View className="gap-1">
      <View className="flex-row items-center justify-between">
        <Text numberOfLines={1} className="flex-1 text-xs font-semibold text-slate-600">{label}</Text>
        <Text className="text-xs font-bold text-slate-800">{valueLabel}</Text>
      </View>
      <View className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <View className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}

function VerticalBars({ data, unitLabel }: { data: { label: string; value: number }[]; unitLabel?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View className="flex-row items-end justify-between gap-2" style={{ height: 140 }}>
      {data.map((d, i) => (
        <View key={i} className="flex-1 items-center gap-1.5">
          <Text className="text-[10px] font-bold text-slate-500">{d.value}{unitLabel ?? ''}</Text>
          <View className="w-full justify-end overflow-hidden rounded-t-lg bg-slate-100" style={{ height: 90 }}>
            <View
              className="w-full rounded-t-lg bg-primary"
              style={{ height: `${Math.max(6, Math.round((d.value / max) * 100))}%` }}
            />
          </View>
          <Text className="text-[10px] text-slate-400">{d.label}</Text>
        </View>
      ))}
    </View>
  );
}

function ChartCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3 rounded-2xl border border-slate-200 bg-card p-4 shadow-sm">
      <View className="flex-row items-center gap-1.5">
        {icon}
        <Text className="text-xs font-bold text-slate-500">{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default function LabReportsScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useUserRole();
  const labId = user?.uid ?? '';
  const orders = useOrders();
  const [range, setRange] = useState<Range>('30d');

  useEffect(() => {
    if (!labId) return;
    connectLabOrders(labId);
    return () => disconnectLabOrders();
  }, [labId]);

  const filtered = useMemo(() => {
    const cutoff = Date.now() - RANGE_MS[range];
    return orders.filter((o) => {
      const ts = new Date(o.receivedDate).getTime();
      return !isNaN(ts) && ts >= cutoff;
    });
  }, [orders, range]);

  const caseTypeData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const o of filtered) {
      const key = o.workType || (ar ? 'غير محدد' : 'Unspecified');
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [filtered, ar]);

  const turnaroundData = useMemo(() => {
    const completed = filtered.filter((o) => o.status === 'completed');
    const byMonth = new Map<string, number[]>();
    for (const o of completed) {
      const received = new Date(o.receivedDate).getTime();
      if (isNaN(received)) continue;
      const days = Math.max(1, Math.round((Date.now() - received) / (24 * 60 * 60 * 1000)));
      const key = monthKey(new Date(o.receivedDate));
      const arr = byMonth.get(key) ?? [];
      arr.push(days);
      byMonth.set(key, arr);
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, days]) => ({ label: monthLabel(key, ar), value: Math.round(days.reduce((a, b) => a + b, 0) / days.length) }));
  }, [filtered, ar]);

  const revenueData = useMemo(() => {
    const sums = new Map<string, number>();
    for (const o of filtered) {
      const key = o.workType || (ar ? 'غير محدد' : 'Unspecified');
      sums.set(key, (sums.get(key) ?? 0) + resolveOrderTotal(o));
    }
    return [...sums.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [filtered, ar]);

  const volumeData = useMemo(() => {
    const byMonth = new Map<string, number>();
    for (const o of filtered) {
      const d = new Date(o.receivedDate);
      if (isNaN(d.getTime())) continue;
      const key = monthKey(d);
      byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
    }
    return [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([key, cases]) => ({ label: monthLabel(key, ar), value: cases }));
  }, [filtered, ar]);

  const hasData = filtered.length > 0;
  const revenueMax = Math.max(1, ...revenueData.map((d) => d.value));

  return (
    <Screen>
      <View className="gap-4 pb-4">
        <View className="flex-row gap-1 rounded-2xl border border-slate-200 bg-card p-1">
          {RANGES.map((r) => {
            const active = range === r;
            const labels: Record<Range, string> = {
              '7d': ar ? '٧ أيام' : '7 days',
              '30d': ar ? '٣٠ يوم' : '30 days',
              '90d': ar ? '٩٠ يوم' : '90 days',
            };
            return (
              <Pressable
                key={r}
                onPress={() => setRange(r)}
                className={cn('h-9 flex-1 items-center justify-center rounded-xl', active ? 'bg-primary' : 'bg-transparent')}
              >
                <Text className={cn('text-xs font-bold', active ? 'text-white' : 'text-slate-500')}>{labels[r]}</Text>
              </Pressable>
            );
          })}
        </View>

        {!hasData ? (
          <View className="items-center rounded-2xl border border-dashed border-slate-200 bg-card py-16">
            <BarChart3 size={40} color="#CBD5E1" />
            <Text className="mt-3 text-sm text-slate-400">{ar ? 'لا توجد بيانات كافية لعرض التقارير حالياً' : 'Not enough data to show reports yet'}</Text>
          </View>
        ) : (
          <>
            <ChartCard icon={<BarChart3 size={15} color="#2563EB" />} title={ar ? 'شعبية أنواع الحالات' : 'Case Type Popularity'}>
              <View className="gap-2.5">
                {caseTypeData.map((d, i) => (
                  <BarRow key={d.label} label={d.label} value={d.value} max={caseTypeData[0]?.value ?? 1} color={BAR_COLORS[i % BAR_COLORS.length]} valueLabel={String(d.value)} />
                ))}
              </View>
            </ChartCard>

            <ChartCard icon={<TrendingUp size={15} color="#2563EB" />} title={ar ? 'متوسط وقت التسليم' : 'Avg. Turnaround Time'}>
              {turnaroundData.length === 0 ? (
                <Text className="py-6 text-center text-xs text-slate-400">{ar ? 'لا توجد حالات مكتملة بعد' : 'No completed cases yet'}</Text>
              ) : (
                <VerticalBars data={turnaroundData} unitLabel={ar ? 'ي' : 'd'} />
              )}
            </ChartCard>

            <ChartCard icon={<DollarSign size={15} color="#2563EB" />} title={ar ? 'توزيع الإيرادات' : 'Revenue Breakdown'}>
              <View className="gap-2.5">
                {revenueData.map((d, i) => (
                  <BarRow
                    key={d.label}
                    label={d.label}
                    value={d.value}
                    max={revenueMax}
                    color={BAR_COLORS[i % BAR_COLORS.length]}
                    valueLabel={`${d.value.toLocaleString('en-US')} ${ar ? 'د.ع' : 'IQD'}`}
                  />
                ))}
              </View>
            </ChartCard>

            <ChartCard icon={<Activity size={15} color="#2563EB" />} title={ar ? 'حجم الحالات الشهري' : 'Monthly Case Volume'}>
              <VerticalBars data={volumeData} />
            </ChartCard>
          </>
        )}
      </View>
    </Screen>
  );
}
