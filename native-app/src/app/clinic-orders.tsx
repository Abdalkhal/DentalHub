import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ClipboardList, FlaskConical, Package, Trash2 } from 'lucide-react-native';

import { Screen, Text } from '@/components/ui';
import { useUserRole } from '@/lib/useAuth';
import {
  setClinicStoreUser,
  useClinic,
  removeOrder,
  setOrderStatus,
  type ClinicOrderStatus,
} from '@/lib/clinicStore';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const STATUS: Record<ClinicOrderStatus, { ar: string; en: string; bg: string; text: string }> = {
  pending: { ar: 'مستحق الدفع', en: 'Due', bg: 'bg-slate-100', text: 'text-slate-700' },
  in_progress: { ar: 'قيد التنفيذ', en: 'In progress', bg: 'bg-amber-100', text: 'text-amber-700' },
  delivered: { ar: 'مكتمل', en: 'Completed', bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

const TABS = ['all', 'lab', 'supply'] as const;

function fmtIQD(n: number) {
  return `${n.toLocaleString()} د.ع`;
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: 'warn' | 'bad' }) {
  return (
    <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <Text className="text-[11px] text-slate-500">{label}</Text>
      <Text className={cn('mt-0.5 text-lg font-extrabold', tone === 'warn' ? 'text-amber-600' : 'text-rose-600')}>
        {value}
      </Text>
    </View>
  );
}

export default function ClinicOrdersScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useUserRole();
  useEffect(() => {
    if (user?.uid) setClinicStoreUser(user.uid);
  }, [user?.uid]);

  const { orders } = useClinic();
  const [tab, setTab] = useState<(typeof TABS)[number]>('all');

  const list = orders.filter((o) => tab === 'all' || o.kind === tab);
  const openCount = orders.filter((o) => o.status !== 'delivered').length;
  const due = orders.filter((o) => o.status !== 'delivered').reduce((s, o) => s + o.amount, 0);

  return (
    <Screen>
      <View className="flex-row gap-2.5">
        <StatCard label={ar ? 'طلبات مفتوحة' : 'Open orders'} value={String(openCount)} tone="warn" />
        <StatCard label={ar ? 'مبالغ مستحقة' : 'Due amount'} value={fmtIQD(due)} tone="bad" />
      </View>

      <View className="mt-3 flex-row gap-1.5">
        {TABS.map((k) => {
          const active = tab === k;
          return (
            <Pressable
              key={k}
              onPress={() => setTab(k)}
              className={cn(
                'h-8 items-center justify-center rounded-full border px-3',
                active ? 'border-primary bg-primary' : 'border-slate-200 bg-white',
              )}
            >
              <Text className={cn('text-[11px] font-bold', active ? 'text-primary-foreground' : 'text-slate-500')}>
                {k === 'all' ? (ar ? 'الكل' : 'All') : k === 'lab' ? (ar ? 'المختبرات' : 'Labs') : ar ? 'المستلزمات' : 'Supplies'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="mt-3 gap-2.5">
        {orders.length === 0 ? (
          <View className="items-center rounded-2xl border border-dashed border-slate-200 bg-white p-8">
            <ClipboardList size={32} color="#94A3B8" />
            <Text className="mt-2 text-sm font-semibold text-slate-700">
              {ar ? 'لا توجد طلبيات مسجلة حالياً' : 'No orders registered yet'}
            </Text>
            <Text className="mt-1 text-center text-[11px] text-slate-400">
              {ar
                ? 'ستظهر طلبات المختبرات والمستلزمات تلقائياً هنا عند إرسالها من ملف المريض أو المتجر.'
                : 'Lab and supply orders will appear here automatically when sent from patient files or the store.'}
            </Text>
          </View>
        ) : list.length === 0 ? (
          <View className="items-center rounded-2xl border border-dashed border-slate-200 bg-white p-8">
            <ClipboardList size={32} color="#94A3B8" />
            <Text className="mt-2 text-sm font-semibold text-slate-700">
              {ar ? 'لا توجد طلبيات في هذه الفئة' : 'No orders in this category'}
            </Text>
          </View>
        ) : (
          list.map((o) => (
            <View key={o.id} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
              <View className="flex-row items-start gap-3">
                <View
                  className={cn(
                    'h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
                    o.kind === 'lab' ? 'bg-violet-100' : 'bg-emerald-100',
                  )}
                >
                  {o.kind === 'lab' ? <FlaskConical size={18} color="#7C3AED" /> : <Package size={18} color="#059669" />}
                </View>
                <View className="min-w-0 flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text numberOfLines={1} className="flex-shrink text-sm font-extrabold text-slate-900">
                      {o.title}
                    </Text>
                    <View className={cn('shrink-0 rounded-full px-2 py-0.5', STATUS[o.status].bg)}>
                      <Text className={cn('text-[10px] font-bold', STATUS[o.status].text)}>
                        {ar ? STATUS[o.status].ar : STATUS[o.status].en}
                      </Text>
                    </View>
                  </View>
                  <Text className="mt-0.5 text-[11px] text-slate-400">
                    {o.ref} · {o.vendor} · {o.date}
                  </Text>
                  <Text className="mt-0.5 text-[11px] font-bold text-primary">{fmtIQD(o.amount)}</Text>
                </View>
                <Pressable onPress={() => removeOrder(o.id)} className="h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                  <Trash2 size={14} color="#64748B" />
                </Pressable>
              </View>
              <View className="mt-2.5 flex-row gap-1.5">
                {(Object.keys(STATUS) as ClinicOrderStatus[]).map((s) => {
                  const active = o.status === s;
                  return (
                    <Pressable
                      key={s}
                      onPress={() => setOrderStatus(o.id, s)}
                      className={cn(
                        'h-8 flex-1 items-center justify-center rounded-xl border',
                        active ? 'border-primary bg-primary' : 'border-slate-200 bg-white',
                      )}
                    >
                      <Text className={cn('text-[10px] font-bold', active ? 'text-primary-foreground' : 'text-slate-500')}>
                        {ar ? STATUS[s].ar : STATUS[s].en}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}
