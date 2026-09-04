import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import {
  Building2,
  CalendarDays,
  ClipboardList,
  Hash,
  Truck,
  User,
  Wrench,
} from 'lucide-react-native';

import { Screen, Text, Spinner } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useOrders, type Order, type OrderStatus } from '@/lib/ordersStore';
import {
  useDentistCases,
  filterLegacyOrders,
  getCaseProgress,
  getStageLabel,
  isCompletedStatus,
  isInProgressStatus,
  isNewStatus,
} from '@/lib/caseTracking';
import { useCaseUnreadCount, markCaseRead } from '@/lib/caseMessages';
import { useSession, useUserRole } from '@/lib/useAuth';

const STATUS_LABELS: Record<OrderStatus, { ar: string; en: string }> = {
  new: { ar: 'جديد', en: 'New' },
  delayed: { ar: 'متأخرة', en: 'Delayed' },
  in_progress: { ar: 'قيد التنفيذ', en: 'In Progress' },
  completed: { ar: 'مكتملة', en: 'Completed' },
};

const STATUS_STYLE: Record<OrderStatus, { bg: string; text: string; edge: string }> = {
  new: { bg: 'bg-sky-100', text: 'text-sky-700', edge: 'border-sky-400' },
  delayed: { bg: 'bg-rose-100', text: 'text-rose-700', edge: 'border-rose-400' },
  in_progress: { bg: 'bg-amber-100', text: 'text-amber-700', edge: 'border-amber-400' },
  completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', edge: 'border-emerald-400' },
};

function canonicalStatus(status: string | undefined): OrderStatus {
  if (isCompletedStatus(status)) return 'completed';
  if (isInProgressStatus(status)) return 'in_progress';
  if (isNewStatus(status)) return 'new';
  return 'delayed';
}

const FILTERS = [
  { id: 'all', ar: 'الكل', en: 'All' },
  { id: 'new', ar: 'جديد', en: 'New' },
  { id: 'delayed', ar: 'متأخرة', en: 'Delayed' },
  { id: 'in_progress', ar: 'قيد التنفيذ', en: 'In Progress' },
  { id: 'completed', ar: 'مكتملة', en: 'Completed' },
] as const;

function UnreadBadge({ labId, caseId, userId }: { labId?: string; caseId: string; userId?: string }) {
  const count = useCaseUnreadCount(labId ?? '', caseId, userId);
  if (!count) return null;
  return (
    <View className="min-w-5 h-5 shrink-0 items-center justify-center rounded-full bg-rose-500 px-1">
      <Text className="text-[10px] font-bold text-white">{count > 9 ? '9+' : count}</Text>
    </View>
  );
}

function CaseDetailModal({
  labId,
  order,
  onClose,
  userId,
}: {
  labId?: string;
  order: Order;
  onClose: () => void;
  userId?: string;
}) {
  useEffect(() => {
    if (userId) markCaseRead(order.id, userId);
  }, [userId, order.id]);

  const { lang } = useI18n();
  const ar = lang === 'ar';
  const st = STATUS_STYLE[canonicalStatus(order.status)];
  const label = STATUS_LABELS[canonicalStatus(order.status)];
  const rows: { label: string; value?: string }[] = [
    { label: ar ? 'المريض' : 'Patient', value: order.patient },
    { label: ar ? 'الطبيب' : 'Doctor', value: order.doctor },
    { label: ar ? 'نوع العمل' : 'Work type', value: order.workType },
    { label: ar ? 'تاريخ التسليم' : 'Due date', value: order.dueDate },
    { label: ar ? 'المناديب' : 'Agent', value: order.agent },
    { label: ar ? 'الوحدات' : 'Units', value: order.unitsCount ? String(order.unitsCount) : undefined },
    { label: ar ? 'العيادة' : 'Clinic', value: order.clinic },
  ].filter((r) => !!r.value);

  return (
    <Modal visible transparent animationType="fade">
      <View className="flex-1 items-end justify-end bg-black/40">
        <View className="w-full rounded-t-3xl bg-white p-5 pb-8">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-extrabold text-slate-900">
              {ar ? 'تفاصيل الحالة' : 'Case details'}
            </Text>
            <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
              <Text className="text-slate-500">✕</Text>
            </Pressable>
          </View>

          <View className={cn('mt-1 w-fit self-start rounded-full px-2.5 py-1', st.bg)}>
            <Text className={cn('text-[11px] font-bold', st.text)}>{ar ? label.ar : label.en}</Text>
          </View>

          {order.currentStage && (
            <View className="mt-3">
              <View className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <View
                  className="h-full rounded-full bg-[#38BDF8]"
                  style={{ width: `${Math.min(100, getCaseProgress(order.currentStage))}%` }}
                />
              </View>
              <Text className="mt-1 text-center text-[10px] text-slate-400">
                {getStageLabel(order.currentStage, ar ? 'ar' : 'en')}
              </Text>
            </View>
          )}

          <View className="mt-4 gap-2">
            {rows.map((r) => (
              <View key={r.label} className="flex-row items-start justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                <Text className="text-xs font-bold text-slate-500">{r.label}</Text>
                <Text className="max-w-[65%] text-end text-xs font-semibold text-slate-800">
                  {r.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Small hook to read current language for the modal without threading prop.
export default function TrackCasesScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useSession();
  const { role } = useUserRole();
  const localOrders = useOrders();
  const doctorName =
    role?.accountType === 'dentist' ? [role.name, role.surname].filter(Boolean).join(' ').trim() : '';

  const { cases: remoteCases, loading } = useDentistCases(user?.uid ?? '');
  const [filter, setFilter] = useState<string>('all');
  const [selected, setSelected] = useState<{ labId?: string; order: Order } | null>(null);

  const allCases = useMemo(() => {
    const remote = remoteCases.map((c) => ({ labId: c.labId, order: c.order }));
    const remoteIds = new Set(remote.map((r) => r.order.id));
    const legacy = filterLegacyOrders(localOrders, remoteIds, doctorName).map((o) => ({ labId: undefined, order: o }));
    return Array.from(new Map([...remote, ...legacy].map((c) => [c.order.id, c])).values());
  }, [remoteCases, localOrders, doctorName]);

  const counts: Record<string, number> = { all: allCases.length };
  (['new', 'delayed', 'in_progress', 'completed'] as const).forEach((s) => {
    counts[s] = allCases.filter((c) => canonicalStatus(c.order.status) === s).length;
  });

  const filtered = filter === 'all' ? allCases : allCases.filter((c) => canonicalStatus(c.order.status) === filter);

  return (
    <Screen>
      <View className="flex-row items-center justify-between">
        <Text className="text-xl font-extrabold text-slate-800">
          {ar ? 'تتبع حالاتك' : 'Track your cases'}
        </Text>
        {loading && <Text className="text-[10px] font-semibold text-slate-400">{ar ? 'تحديث…' : 'Syncing…'}</Text>}
      </View>

      <View className="mt-4 flex-row gap-1.5">
        {FILTERS.map((s) => {
          const active = filter === s.id;
          const st = s.id === 'all' ? undefined : STATUS_STYLE[s.id as OrderStatus];
          return (
            <Pressable
              key={s.id}
              onPress={() => setFilter(s.id)}
              className={cn(
                'flex-1 rounded-2xl border-2 p-2.5 text-center',
                active ? (st ? `${st.bg} border-transparent` : 'bg-slate-100 border-transparent') : 'border-slate-200 bg-white',
              )}
            >
              <Text className={cn('text-center text-lg font-extrabold', active ? (st ? st.text : 'text-slate-700') : 'text-slate-700')}>
                {counts[s.id]}
              </Text>
              <Text className={cn('mt-0.5 text-center text-[9px] font-semibold', active ? (st ? st.text : 'text-slate-600') : 'text-slate-500')}>
                {ar ? s.ar : s.en}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {filtered.length === 0 ? (
        <View className="items-center py-16">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-slate-100">
            <ClipboardList size={34} color="#CBD5E1" />
          </View>
          <Text className="font-bold text-slate-500">{ar ? 'لا توجد حالات' : 'No cases'}</Text>
          <Text className="mt-1 text-sm text-slate-400">
            {ar ? 'ستظهر هنا حالات المرضى المرسلة من المختبر' : 'Patient cases sent from the lab will appear here'}
          </Text>
        </View>
      ) : (
        <View className="mt-4 gap-3 pb-6">
          {filtered.map((c) => {
            const o = c.order;
            const st = STATUS_STYLE[canonicalStatus(o.status)];
            const label = STATUS_LABELS[canonicalStatus(o.status)];
            return (
              <Pressable
                key={o.id}
                onPress={() => setSelected(c)}
                className={cn('overflow-hidden rounded-2xl border border-slate-200 border-l-4 bg-card shadow-sm', st.edge)}
              >
                <View className="px-4 pb-1 pt-3">
                  <View className="flex-row items-center justify-between gap-2">
                    <View className="flex-row min-w-0 flex-1 items-center gap-2.5">
                      <View className={cn('h-9 w-9 shrink-0 items-center justify-center rounded-xl', st.bg)}>
                        <Text className={cn('text-sm font-bold', st.text)}>{(o.patient || '؟').charAt(0)}</Text>
                      </View>
                      <Text className="truncate text-sm font-bold text-slate-800">{o.patient}</Text>
                    </View>
                    <View className="flex-row shrink-0 items-center gap-1.5">
                      <UnreadBadge labId={c.labId} caseId={o.id} userId={user?.uid} />
                      <View className={cn('rounded-full px-2.5 py-1', st.bg)}>
                        <Text className={cn('text-[10px] font-bold', st.text)}>
                          {ar ? label.ar : label.en}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View className="gap-1.5 px-4 py-3">
                  <View className="flex-row flex-wrap items-center gap-3">
                    {!!o.doctor && (
                      <View className="flex-row items-center gap-1">
                        <User size={12} color="#94A3B8" />
                        <Text className="text-[11px] text-slate-600">{o.doctor}</Text>
                      </View>
                    )}
                    {!!o.workType && (
                      <View className="flex-row items-center gap-1">
                        <Wrench size={12} color="#94A3B8" />
                        <Text className="text-[11px] text-slate-600">{o.workType}</Text>
                      </View>
                    )}
                    {!!o.dueDate && (
                      <View className="flex-row items-center gap-1">
                        <CalendarDays size={12} color="#94A3B8" />
                        <Text className="text-[11px] text-slate-600">{o.dueDate}</Text>
                      </View>
                    )}
                  </View>
                  <View className="flex-row flex-wrap items-center gap-3">
                    {!!o.agent && (
                      <View className="flex-row items-center gap-1">
                        <Truck size={12} color="#94A3B8" />
                        <Text className="text-[11px] text-slate-600">{o.agent}</Text>
                      </View>
                    )}
                    {!!o.unitsCount && (
                      <View className="flex-row items-center gap-1">
                        <Hash size={12} color="#94A3B8" />
                        <Text className="text-[11px] text-slate-600">
                          {o.unitsCount} {ar ? 'وحدة' : 'units'}
                        </Text>
                      </View>
                    )}
                  </View>
                  {o.currentStage && (
                    <View className="pt-1">
                      <View className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <View
                          className="h-full rounded-full bg-[#38BDF8]"
                          style={{ width: `${Math.min(100, getCaseProgress(o.currentStage))}%` }}
                        />
                      </View>
                      <Text className="mt-0.5 text-center text-[10px] text-slate-400">
                        {getStageLabel(o.currentStage, lang)}
                      </Text>
                    </View>
                  )}
                  {!!o.clinic && (
                    <View className="flex-row items-center gap-1">
                      <Building2 size={12} color="#94A3B8" />
                      <Text className="text-[11px] text-slate-500">
                        {ar ? 'عيادة' : 'Clinic'}: {o.clinic}
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {selected && (
        <CaseDetailModal
          labId={selected.labId}
          order={selected.order}
          userId={user?.uid}
          onClose={() => setSelected(null)}
        />
      )}
    </Screen>
  );
}
