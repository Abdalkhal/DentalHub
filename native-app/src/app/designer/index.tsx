import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { signOut } from 'firebase/auth';
import {
  Bell,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Clock,
  Layers,
  LogOut,
  MessageCircle,
  Package,
  PenTool,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react-native';

import { Screen, Spinner, Text } from '@/components/ui';
import { auth } from '@/integrations/firebase/client';
import { useDesignerCases } from '@/lib/designerStore';
import { useSession, useLabStaffClaim } from '@/lib/useAuth';
import { useUnreadNotificationsCount } from '@/lib/notifications';
import { useDmThreads, getDmLastReadMs } from '@/lib/directMessages';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Order, OrderStatus } from '@/lib/ordersStore';

const STATUS_META: Record<OrderStatus, { ar: string; en: string; bg: string; fg: string; icon?: LucideIcon }> = {
  new: { ar: 'جديدة', en: 'New', bg: '#E0F2FE', fg: '#0369A1' },
  in_progress: { ar: 'قيد التصميم', en: 'In design', bg: '#FEF3C7', fg: '#B45309', icon: Clock },
  completed: { ar: 'مكتملة', en: 'Completed', bg: '#D1FAE5', fg: '#047857', icon: CheckCircle2 },
  delayed: { ar: 'متأخرة', en: 'Delayed', bg: '#FEE2E2', fg: '#B91C1C', icon: Clock },
};
const STATUS_ORDER: OrderStatus[] = ['new', 'in_progress', 'completed', 'delayed'];
const FALLBACK_META = { ar: '—', en: '—', bg: '#E2E8F0', fg: '#475569', icon: Clock as LucideIcon };

function statusMeta(status: string) {
  return STATUS_META[status as OrderStatus] ?? FALLBACK_META;
}

function MetaRow({ icon, children }: { icon: ReactNode; children?: ReactNode }) {
  if (!children) return null;
  return (
    <View className="flex-row items-center gap-1.5">
      {icon}
      <Text className="shrink text-[11px] text-slate-500" numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

function ShortcutCard({
  icon,
  iconBg,
  title,
  subtitle,
  onPress,
}: {
  icon: ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-card p-3.5 shadow-sm"
    >
      <View className="h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: iconBg }}>
        {icon}
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-xs font-extrabold text-slate-800" numberOfLines={1}>
          {title}
        </Text>
        <Text className="mt-0.5 text-[11px] text-slate-500" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <ChevronLeft size={16} color="#CBD5E1" />
    </Pressable>
  );
}

/**
 * Native counterpart of the web app's `/designer` route. Lists only the cases
 * assigned to the signed-in designer — `useDesignerCases` queries on
 * `designerId`, which is also what the Firestore rules enforce, so an
 * unassigned case is invisible here and unreadable server-side.
 */
export default function DesignerIndexScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user, loading: authLoading } = useSession();
  const { claim } = useLabStaffClaim();
  const { cases, loading, refetch } = useDesignerCases(user?.uid || '');
  const unreadNotifications = useUnreadNotificationsCount(user?.uid);
  const { threads: dmThreads } = useDmThreads(user?.uid);
  const [activeFilter, setActiveFilter] = useState<OrderStatus | null>(null);

  // The DM unread-count hook (directMessages.ts) is per-thread and would need
  // one mounted per conversation just to sum a header badge; comparing each
  // thread's own `lastMessageAt`/`lastSenderId` against its local read marker
  // gives the same "has something new" signal from data already in memory.
  const [dmReadTick, setDmReadTick] = useState(0);
  useEffect(() => {
    const onRead = () => setDmReadTick((t) => t + 1);
    window.addEventListener('dm-thread-read', onRead);
    return () => window.removeEventListener('dm-thread-read', onRead);
  }, []);
  const unreadThreadsCount = useMemo(() => {
    if (!user?.uid) return 0;
    return dmThreads.filter((t) => {
      if (!t.lastSenderId || t.lastSenderId === user.uid) return false;
      const lastMs = t.lastMessageAt?.toMillis?.() ?? 0;
      return lastMs > getDmLastReadMs(t.id, user.uid);
    }).length;
  }, [dmThreads, user?.uid, dmReadTick]);

  const counts = useMemo(() => {
    const c: Record<OrderStatus, number> = { new: 0, in_progress: 0, completed: 0, delayed: 0 };
    cases.forEach(({ order }) => {
      if (order.status in c) c[order.status] += 1;
    });
    return c;
  }, [cases]);

  const filteredCases = useMemo(
    () => (activeFilter ? cases.filter((c) => c.order.status === activeFilter) : cases),
    [cases, activeFilter],
  );

  if (authLoading) return <Spinner />;
  if (!user) return <Redirect href="/login" />;
  if (loading) return <Spinner />;

  const roleLabel =
    claim?.role === 'TECHNICIAN' ? (ar ? 'فني مختبر' : 'Lab Technician') : ar ? 'مصمم مختبر' : 'Dental Lab Designer';
  const displayName = user.displayName || user.email || (ar ? 'عضو المختبر' : 'Lab member');

  const openCase = (orderId: string) =>
    router.push({ pathname: '/designer/[caseId]', params: { caseId: orderId } } as never);

  const openChat = (order: Order) => {
    if (!order.dentistId) {
      Alert.alert(
        ar ? 'تعذر فتح المحادثة' : 'Can’t open chat',
        ar ? 'لا يوجد طبيب مرتبط بهذه الحالة بعد' : 'No dentist is linked to this case yet',
      );
      return;
    }
    router.push({ pathname: '/messages', params: { with: order.dentistId, withName: order.doctor } } as never);
  };

  const confirmSignOut = () => {
    Alert.alert(
      ar ? 'تسجيل الخروج' : 'Sign out',
      ar ? 'هل تريد تسجيل الخروج من حسابك؟' : 'Do you want to sign out of your account?',
      [
        { text: ar ? 'إلغاء' : 'Cancel', style: 'cancel' },
        { text: ar ? 'تسجيل الخروج' : 'Sign out', style: 'destructive', onPress: () => signOut(auth) },
      ],
    );
  };

  return (
    <Screen scroll={false}>
      <FlatList
        data={filteredCases}
        keyExtractor={({ order }) => order.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
        ListHeaderComponent={
          <View className="mb-4">
            {/* Header */}
            <View className="mb-5 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2.5">
                <View className="relative">
                  <View className="h-11 w-11 items-center justify-center rounded-full bg-sky-100">
                    <Text className="text-base font-extrabold text-sky-700">
                      {displayName.trim().charAt(0).toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View className="absolute -end-0.5 bottom-0 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
                </View>
                <View className="min-w-0">
                  <Text className="text-sm font-extrabold text-slate-900" numberOfLines={1}>
                    {displayName}
                  </Text>
                  <Text className="text-[11px] text-slate-500" numberOfLines={1}>
                    {roleLabel}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => router.push('/notifications')}
                  className="relative h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm"
                >
                  <Bell size={16} color="#334155" />
                  {unreadNotifications > 0 && (
                    <View className="absolute -end-1 -top-1 h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1">
                      <Text className="text-[9px] font-bold text-white">
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </Text>
                    </View>
                  )}
                </Pressable>
                <Text className="text-base font-extrabold tracking-tight">
                  <Text className="text-primary">Dent</Text>
                  <Text className="text-slate-900"> Hub</Text>
                </Text>
              </View>
            </View>

            {/* Title */}
            <Text className="text-xl font-extrabold text-slate-900">{ar ? 'حالاتي' : 'My cases'}</Text>
            <Text className="mt-0.5 text-xs text-slate-500">
              {ar ? 'عرض جميع الحالات المسندة إليك' : 'All the cases assigned to you'}
            </Text>

            {/* Shortcuts */}
            <View className="mt-4 flex-row gap-3">
              <ShortcutCard
                icon={<MessageCircle size={19} color="#0284C7" />}
                iconBg="#E0F2FE"
                title={ar ? 'المحادثات' : 'Messages'}
                subtitle={
                  unreadThreadsCount > 0
                    ? ar
                      ? `${unreadThreadsCount} رسالة جديدة`
                      : `${unreadThreadsCount} new message${unreadThreadsCount > 1 ? 's' : ''}`
                    : ar
                      ? 'لا رسائل جديدة'
                      : 'No new messages'
                }
                onPress={() => router.push('/messages')}
              />
              <ShortcutCard
                icon={<ClipboardList size={19} color="#7C3AED" />}
                iconBg="#EDE9FE"
                title={ar ? 'الحالات المسندة' : 'Assigned cases'}
                subtitle={ar ? `${cases.length} حالات` : `${cases.length} cases`}
                onPress={() => setActiveFilter(null)}
              />
            </View>

            {/* Filters */}
            <View className="mt-4 flex-row flex-wrap gap-2">
              {STATUS_ORDER.map((key) => {
                const meta = STATUS_META[key];
                const Icon = meta.icon;
                const active = activeFilter === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setActiveFilter((f) => (f === key ? null : key))}
                    className={cn(
                      'flex-row items-center gap-1.5 rounded-full px-3 py-2',
                      active ? 'bg-primary' : 'border border-slate-200 bg-white',
                    )}
                  >
                    {Icon && <Icon size={13} color={active ? '#FFFFFF' : meta.fg} />}
                    <Text className={cn('text-xs font-bold', active ? 'text-white' : 'text-slate-700')}>
                      {ar ? meta.ar : meta.en}
                    </Text>
                    <View
                      className={cn(
                        'min-w-5 items-center justify-center rounded-full px-1.5 py-0.5',
                        active ? 'bg-white/25' : 'bg-slate-100',
                      )}
                    >
                      <Text className={cn('text-[10px] font-extrabold', active ? 'text-white' : 'text-slate-600')}>
                        {counts[key]}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        renderItem={({ item: { order } }) => {
          const meta = statusMeta(order.status);
          return (
            <Pressable
              onPress={() => openCase(order.id)}
              className="mb-3 rounded-2xl border border-slate-200 bg-card p-3.5 shadow-sm"
            >
              <View className="flex-row items-start gap-3">
                <View
                  className="h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: meta.bg }}
                >
                  <Layers size={22} color={meta.fg} />
                </View>
                <View className="min-w-0 flex-1 gap-1">
                  <Text className="text-[11px] font-extrabold text-primary" numberOfLines={1}>
                    #{order.orderNumber || order.caseId}
                  </Text>
                  <Text className="text-sm font-extrabold text-slate-900" numberOfLines={1}>
                    {order.workType || (ar ? 'غير محدد' : 'Unspecified')}
                  </Text>
                  <MetaRow icon={<Stethoscope size={12} color="#94A3B8" />}>{order.doctor}</MetaRow>
                  <MetaRow icon={<Building2 size={12} color="#94A3B8" />}>{order.clinic}</MetaRow>
                  <View className="mt-0.5 flex-row flex-wrap gap-x-4 gap-y-1">
                    <MetaRow icon={<Calendar size={12} color="#94A3B8" />}>
                      {order.dueDate ? `${ar ? 'موعد التسليم' : 'Due'}: ${order.dueDate}` : undefined}
                    </MetaRow>
                    <MetaRow icon={<Package size={12} color="#94A3B8" />}>
                      {order.material ? `${ar ? 'المادة' : 'Material'}: ${order.material}` : undefined}
                    </MetaRow>
                  </View>
                </View>
                <View className="items-end gap-2">
                  <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: meta.bg }}>
                    <Text className="text-[10px] font-bold" style={{ color: meta.fg }}>
                      {ar ? meta.ar : meta.en}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="mt-3 flex-row gap-2">
                <Pressable
                  onPress={() => openCase(order.id)}
                  className="h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-primary"
                >
                  <ClipboardList size={14} color="#FFFFFF" />
                  <Text className="text-xs font-bold text-primary-foreground">{ar ? 'الحالة' : 'Case'}</Text>
                </Pressable>
                <Pressable
                  onPress={() => openChat(order)}
                  className={cn(
                    'h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white',
                    !order.dentistId && 'opacity-40',
                  )}
                >
                  <MessageCircle size={14} color="#334155" />
                  <Text className="text-xs font-bold text-slate-700">{ar ? 'محادثة' : 'Chat'}</Text>
                </Pressable>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View className="items-center py-16">
            <PenTool size={44} color="#CBD5E1" strokeWidth={1.4} />
            <Text className="mt-3 text-sm font-semibold text-slate-400">
              {cases.length === 0
                ? ar
                  ? 'لا توجد حالات مسندة إليك'
                  : 'No cases assigned to you'
                : ar
                  ? 'لا توجد حالات ضمن هذا التصنيف'
                  : 'No cases in this filter'}
            </Text>
            <Text className="mt-1 text-xs text-slate-400">
              {cases.length === 0
                ? ar
                  ? 'ستظهر الحالات المسندة إليك هنا'
                  : 'Cases assigned to you will appear here'
                : ar
                  ? 'جرّب تصنيفاً آخر'
                  : 'Try another filter'}
            </Text>
          </View>
        }
        ListFooterComponent={
          <Pressable
            onPress={confirmSignOut}
            className="mt-2 h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-rose-50"
          >
            <LogOut size={16} color="#E11D48" />
            <Text className="text-sm font-extrabold text-rose-600">{ar ? 'تسجيل الخروج من الحساب' : 'Sign out'}</Text>
          </Pressable>
        }
      />
    </Screen>
  );
}
