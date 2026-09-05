import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, View } from 'react-native';
import { Phone, Trash2, UserPlus } from 'lucide-react-native';

import { Screen, Card, Button, Text } from '@/components/ui';
import {
  useOrders,
  connectLabOrders,
  disconnectLabOrders,
  updateOrderStatus,
  type Order,
  type OrderStatus,
} from '@/lib/ordersStore';
import { getCaseProgress, getStageLabel } from '@/lib/caseTracking';
import { useLabMembers, removeLabMember } from '@/lib/labMembersStore';
import { useUserRole } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const STATUS_ORDER: OrderStatus[] = ['new', 'in_progress', 'completed', 'delayed'];
const STATUS_AR: Record<OrderStatus, string> = { new: 'جديد', in_progress: 'قيد التنفيذ', completed: 'مكتمل', delayed: 'متأخر' };
const STATUS_EN: Record<OrderStatus, string> = { new: 'New', in_progress: 'In Progress', completed: 'Completed', delayed: 'Delayed' };
const STATUS_TONE: Record<OrderStatus, string> = {
  new: 'bg-sky-100 text-sky-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  delayed: 'bg-rose-100 text-rose-700',
};

export default function LabsOfficeScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user, role } = useUserRole();
  const orders = useOrders();
  const [tab, setTab] = useState<'cases' | 'team'>('cases');
  const [filter, setFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Order | null>(null);

  const { members = [] } = useLabMembers(user?.uid ?? '');

  useEffect(() => {
    if (!user?.uid) return;
    connectLabOrders(user.uid);
    return () => disconnectLabOrders();
  }, [user?.uid]);

  const counts: Record<string, number> = { all: orders.length };
  for (const o of orders) counts[o.status] = (counts[o.status] ?? 0) + 1;

  const filtered = useMemo(
    () => (filter === 'all' ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter],
  );

  const nextStatus = (s: OrderStatus): OrderStatus => {
    if (s === 'new' || s === 'delayed') return 'in_progress';
    if (s === 'in_progress') return 'completed';
    return 'completed';
  };

  return (
    <Screen>
      <Text className="text-xl font-extrabold text-slate-800">
        {ar ? 'لوحة المختبر' : 'Lab Dashboard'}
      </Text>
      <Text className="mt-0.5 text-sm text-slate-500">{role?.name ?? ''}</Text>

      {/* Tabs */}
      <View className="mt-4 flex-row gap-1.5 rounded-2xl bg-slate-100 p-1.5">
        {(['cases', 'team'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            // NativeWind 4.2.6 + RN 0.86: toggling a shadow-* class on and off
            // crashes with a bogus "Couldn't find a navigation context" error, so
            // the shadow stays applied on both branches and only colour changes.
            className={cn(
              'h-10 flex-1 items-center justify-center rounded-xl shadow-sm',
              tab === t ? 'bg-white' : 'bg-transparent',
            )}
          >
            <Text className={cn('text-xs font-bold', tab === t ? 'text-slate-900' : 'text-slate-500')}>
              {t === 'cases' ? (ar ? 'الحالات' : 'Cases') : ar ? 'الفريق' : 'Team'}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'cases' ? (
        <>
          {/* Stats */}
          <View className="mt-4 flex-row gap-2">
            {(['new', 'in_progress', 'completed', 'delayed'] as OrderStatus[]).map((s) => (
              <Pressable
                key={s}
                onPress={() => setFilter(filter === s ? 'all' : s)}
                className={cn(
                  'flex-1 rounded-2xl border bg-white p-2.5 text-center shadow-sm',
                  filter === s ? 'border-transparent' : 'border-slate-200',
                )}
              >
                <Text className={cn('text-center text-lg font-extrabold', STATUS_TONE[s].split(' ')[1])}>
                  {counts[s] ?? 0}
                </Text>
                <Text className="mt-0.5 text-center text-[9px] font-semibold text-slate-500">
                  {ar ? STATUS_AR[s] : STATUS_EN[s]}
                </Text>
              </Pressable>
            ))}
          </View>

          {filtered.length === 0 ? (
            <Text className="mt-12 text-center text-slate-500">{ar ? 'لا توجد حالات' : 'No cases'}</Text>
          ) : (
            <View className="mt-4 gap-3 pb-4">
              {filtered.map((o) => (
                <Pressable
                  key={o.id}
                  onPress={() => setSelected(o)}
                  className="rounded-2xl border border-slate-200 border-l-4 bg-card p-3.5 shadow-sm"
                  style={{ borderLeftColor: undefined }}
                >
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className="min-w-0 flex-1 truncate text-sm font-extrabold text-slate-800">
                      {o.patient || '—'}
                      {o.workType ? ` · ${o.workType}` : ''}
                    </Text>
                    <View className={cn('shrink-0 rounded-full px-2.5 py-1', STATUS_TONE[o.status])}>
                      <Text className="text-[10px] font-bold">
                        {ar ? STATUS_AR[o.status] : STATUS_EN[o.status]}
                      </Text>
                    </View>
                  </View>
                  <View className="mt-2 flex-row flex-wrap items-center gap-3 text-[11px] text-slate-600">
                    {!!o.orderNumber && <Text className="text-[11px] text-slate-500">{o.orderNumber}</Text>}
                    {!!o.unitsCount && <Text className="text-[11px] text-slate-500">{o.unitsCount} {ar ? 'وحدة' : 'units'}</Text>}
                    {!!o.dueDate && <Text className="text-[11px] text-slate-500">{o.dueDate}</Text>}
                  </View>
                  {o.currentStage && (
                    <View className="mt-2">
                      <View className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <View
                          className="h-full rounded-full bg-sky-400"
                          style={{ width: `${Math.min(100, getCaseProgress(o.currentStage))}%` }}
                        />
                      </View>
                      <Text className="mt-0.5 text-center text-[10px] text-slate-400">
                        {getStageLabel(o.currentStage, lang)}
                      </Text>
                    </View>
                  )}
                  <View className="mt-2.5 flex-row gap-1.5">
                    {o.status !== 'completed' && (
                      <Button
                        size="sm"
                        title={ar ? 'تقدم للمرحلة التالية' : 'Advance'}
                        onPress={() => updateOrderStatus(o.id, nextStatus(o.status))}
                        className="flex-1"
                      />
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      title={o.status === 'delayed' ? (ar ? 'إلغاء التأخير' : 'Clear delay') : ar ? 'تأخير' : 'Delay'}
                      onPress={() => updateOrderStatus(o.id, o.status === 'delayed' ? 'in_progress' : 'delayed')}
                      className={cn('flex-1', o.status !== 'delayed' && 'border-rose-200')}
                    />
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </>
      ) : (
        <>
          <View className="mt-4 flex-row items-center justify-between">
            <Text className="text-sm font-bold text-slate-600">
              {ar ? 'أعضاء الفريق' : 'Team members'} ({members.length})
            </Text>
            <Text className="text-[11px] text-slate-400">
              {ar ? 'تتم الإضافة من حساب رئيسي' : 'Managed from a main account'}
            </Text>
          </View>
          {members.length === 0 ? (
            <Text className="mt-12 text-center text-slate-500">
              {ar ? 'لا يوجد أعضاء بعد' : 'No members yet'}
            </Text>
          ) : (
            <View className="mt-3 gap-2.5">
              {members.map((m) => (
                <View key={m.id} className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-card p-3.5 shadow-sm">
                  <View className="h-11 w-11 items-center justify-center rounded-xl bg-violet-100">
                    <Text className="text-base font-extrabold text-violet-700">{m.name.charAt(0)}</Text>
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-bold text-slate-800">{m.name}</Text>
                    <Text className="text-[11px] text-slate-400">{m.role}</Text>
                  </View>
                  <Button
                    size="sm"
                    variant="outline"
                    title="✕"
                    onPress={() =>
                      Alert.alert(
                        ar ? 'إزالة عضو' : 'Remove member',
                        m.name,
                        [
                          { text: ar ? 'إلغاء' : 'Cancel', style: 'cancel' },
                          { text: ar ? 'إزالة' : 'Remove', style: 'destructive', onPress: () => removeLabMember(m.id) },
                        ],
                      )
                    }
                  />
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {selected && <CaseDetailModal ar={ar} order={selected} onClose={() => setSelected(null)} />}
    </Screen>
  );
}

function CaseDetailModal({ ar, order: o, onClose }: { ar: boolean; order: Order; onClose: () => void }) {
  const rows: { label: string; value?: string }[] = [
    { label: ar ? 'المريض' : 'Patient', value: o.patient },
    { label: ar ? 'الطبيب' : 'Doctor', value: o.doctor },
    { label: ar ? 'العيادة' : 'Clinic', value: o.clinic },
    { label: ar ? 'نوع العمل' : 'Work type', value: o.workType },
    { label: ar ? 'المناديب' : 'Agent', value: o.agent },
    { label: ar ? 'الوحدات' : 'Units', value: o.unitsCount ? String(o.unitsCount) : undefined },
    { label: ar ? 'تاريخ التسليم' : 'Due date', value: o.dueDate },
  ].filter((r) => !!r.value);

  return (
    <Modal visible transparent animationType="fade">
      <View className="flex-1 justify-end bg-black/40">
        <View className="w-full rounded-t-3xl bg-white p-5 pb-8">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-extrabold text-slate-900">
              {ar ? 'تفاصيل الحالة' : 'Case details'}
            </Text>
            <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
              <Text className="text-slate-500">✕</Text>
            </Pressable>
          </View>
          <View className="mt-4 gap-2">
            {rows.map((r) => (
              <View key={r.label} className="flex-row items-start justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                <Text className="text-xs font-bold text-slate-500">{r.label}</Text>
                <Text className="max-w-[65%] text-end text-xs font-semibold text-slate-800">{r.value}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
