import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronDown, ChevronUp, Search, Stethoscope } from 'lucide-react-native';

import { Screen, Text, Input } from '@/components/ui';
import { useOrders, connectLabOrders, disconnectLabOrders, type Order } from '@/lib/ordersStore';
import { useUserRole } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// Ported from the web app's doctors.tsx, reading real data instead of what
// it actually reads there: `localStorage.getItem("dental_hub_orders")` — the
// same dead, never-written key reports.tsx read (see lab-reports.tsx) — so
// on web this page is permanently empty too. This groups the lab's real
// `ordersStore` orders by doctor, same as web's `buildDoctors`.

type DoctorEntry = { name: string; orders: Order[] };

const STATUS_META: Record<string, { ar: string; en: string; cls: string }> = {
  new: { ar: 'جديد', en: 'New', cls: 'bg-sky-50 text-sky-600' },
  in_progress: { ar: 'قيد التنفيذ', en: 'In Progress', cls: 'bg-amber-50 text-amber-600' },
  completed: { ar: 'مكتملة', en: 'Completed', cls: 'bg-emerald-50 text-emerald-600' },
  delayed: { ar: 'متأخرة', en: 'Delayed', cls: 'bg-rose-50 text-rose-600' },
};

function normalize(s: string): string {
  return s
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .trim()
    .toLowerCase();
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-GB');
}

function orderCountLabel(n: number, ar: boolean): string {
  return `${n} ${ar ? (n === 1 ? 'طلب' : 'طلبات') : n === 1 ? 'order' : 'orders'}`;
}

export default function LabDoctorsScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useUserRole();
  const labId = user?.uid ?? '';
  const orders = useOrders();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<DoctorEntry | null>(null);

  useEffect(() => {
    if (!labId) return;
    connectLabOrders(labId);
    return () => disconnectLabOrders();
  }, [labId]);

  const doctors = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of orders) {
      const name = (o.doctor || '').trim();
      if (!name) continue;
      const list = map.get(name) ?? [];
      list.push(o);
      map.set(name, list);
    }
    return [...map.entries()].map(([name, list]) => ({ name, orders: list })).sort((a, b) => b.orders.length - a.orders.length);
  }, [orders]);

  const filtered = useMemo(() => {
    if (!search.trim()) return doctors;
    const q = normalize(search);
    return doctors.filter((d) => normalize(d.name).includes(q));
  }, [search, doctors]);

  if (selected) {
    return (
      <Screen>
        <View className="gap-3">
          <View className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-card p-4 shadow-sm">
            <View className="h-12 w-12 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50">
              <Text className="text-lg font-extrabold text-sky-600">{selected.name.charAt(0)}</Text>
            </View>
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="text-base font-extrabold text-slate-900">{selected.name}</Text>
              <Text className="mt-0.5 text-xs text-slate-400">{orderCountLabel(selected.orders.length, ar)}</Text>
            </View>
          </View>

          <View className="gap-2">
            {selected.orders.map((o) => {
              const meta = STATUS_META[o.status] ?? { ar: o.status, en: o.status, cls: 'bg-slate-50 text-slate-600' };
              return (
                <View key={o.id} className="rounded-2xl border border-slate-200 bg-card p-3.5 shadow-sm">
                  <View className="mb-1.5 flex-row items-center justify-between">
                    <Text className="text-xs font-bold text-slate-400" style={{ writingDirection: 'ltr' }}>{o.orderNumber}</Text>
                    <View className={cn('rounded-full px-2 py-0.5', meta.cls)}>
                      <Text className="text-[11px] font-bold">{ar ? meta.ar : meta.en}</Text>
                    </View>
                  </View>
                  <View className="flex-row gap-4">
                    <View className="flex-1">
                      <Text className="text-[11px] text-slate-400">{ar ? 'المريض' : 'Patient'}</Text>
                      <Text className="text-xs font-semibold text-slate-800">{o.patient || '—'}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-[11px] text-slate-400">{ar ? 'التاريخ' : 'Date'}</Text>
                      <Text className="text-xs font-semibold text-slate-800">{formatDate(o.receivedDate)}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          <Pressable
            onPress={() => setSelected(null)}
            className="h-11 flex-row items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-card"
          >
            <ChevronUp size={16} color="#334155" />
            <Text className="text-sm font-semibold text-slate-700">{ar ? 'العودة إلى القائمة' : 'Back to list'}</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="gap-3">
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder={ar ? 'ابحث عن طبيب…' : 'Search by doctor…'}
          leftIcon={<Search size={16} color="#94A3B8" />}
        />

        {filtered.length === 0 ? (
          <View className="items-center py-16">
            <Stethoscope size={40} color="#CBD5E1" />
            <Text className="mt-3 text-sm text-slate-400">{ar ? 'لا يوجد أطباء مطابقون' : 'No matching doctors'}</Text>
          </View>
        ) : (
          <View className="gap-2.5">
            {filtered.map((d) => (
              <Pressable
                key={d.name}
                onPress={() => setSelected(d)}
                className="flex-row items-start gap-3 rounded-2xl border border-slate-200 bg-card p-3.5 shadow-sm"
              >
                <View className="h-12 w-12 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50">
                  <Text className="text-lg font-extrabold text-sky-600">{d.name.charAt(0)}</Text>
                </View>
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={1} className="text-sm font-extrabold text-slate-900">{d.name}</Text>
                  <Text className="mt-0.5 text-xs text-slate-400">{orderCountLabel(d.orders.length, ar)}</Text>
                </View>
                <ChevronDown size={16} color="#94A3B8" />
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
