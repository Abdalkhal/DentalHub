import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  AlertCircle,
  BadgeCheck,
  Bell,
  CheckCircle2,
  Clock,
  FileText,
  Layers,
  Menu,
  Phone,
  Search,
  TrendingDown,
  TrendingUp,
  UserCircle2,
  Users,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Screen, Input, Button, Text } from '@/components/ui';
import { LabSidebar } from '@/components/LabSidebar';
import { CaseDetailModal, LAB_STATUS_AR as STATUS_AR, LAB_STATUS_EN as STATUS_EN } from '@/components/CaseDetailModal';
import {
  useOrders,
  connectLabOrders,
  disconnectLabOrders,
  updateOrderStatus,
  type Order,
  type OrderStatus,
} from '@/lib/ordersStore';
import { getCaseProgress, getStageLabel } from '@/lib/caseTracking';
import { LabStaffPanel } from '@/components/LabStaffPanel';
import { useUserRole } from '@/lib/useAuth';
import { useUnreadNotificationsCount } from '@/lib/notifications';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const STATUS_TONE: Record<OrderStatus, string> = {
  new: 'bg-sky-100 text-sky-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  delayed: 'bg-rose-100 text-rose-700',
};
// Same hex family as STAT_CARDS' `fg`, used for the case cards' accent border.
const STATUS_ACCENT: Record<OrderStatus, string> = {
  new: '#0369A1',
  in_progress: '#B45309',
  completed: '#047857',
  delayed: '#B91C1C',
};

// Mirrors the 4-way breakdown on the web dashboard's home screen
// (labs.dashboard.tsx: "إجمالي الطلبات" / "قيد التنفيذ" / "مكتملة" / "متأخرة"),
// including its exact card colors, as large colored stat tiles instead of a
// desktop data table — the web layout's sidebar + table chrome is
// desktop-only chrome, not something to clone onto a phone screen.
const STAT_CARDS: {
  key: 'all' | OrderStatus;
  ar: string;
  en: string;
  icon: LucideIcon;
  bg: string;
  fg: string;
}[] = [
  { key: 'all', ar: 'إجمالي الطلبات', en: 'Total Orders', icon: Layers, bg: '#E0F2FE', fg: '#0369A1' },
  { key: 'in_progress', ar: 'قيد التنفيذ', en: 'In Production', icon: Clock, bg: '#FEF3C7', fg: '#B45309' },
  { key: 'completed', ar: 'مكتملة', en: 'Completed', icon: CheckCircle2, bg: '#D1FAE5', fg: '#047857' },
  { key: 'delayed', ar: 'متأخرة', en: 'Delayed', icon: AlertCircle, bg: '#FEE2E2', fg: '#B91C1C' },
];

// Below this many orders in the *previous* month, a percentage is noisy to
// the point of being misleading (1 → 2 orders reads as "+100%"). Fall back to
// a plain count difference until there's enough volume for a % to mean
// anything.
const MIN_TREND_SAMPLE = 5;

function monthKey(d: Date): number {
  return d.getFullYear() * 12 + d.getMonth();
}

function trendLabel(t: { cur: number; prev: number }, ar: boolean): { text: string; up: boolean } | null {
  if (t.cur === 0 && t.prev === 0) return null;
  const delta = t.cur - t.prev;
  const sign = delta >= 0 ? '+' : '';
  const suffix = ar ? 'عن الشهر الماضي' : 'vs last month';
  if (t.prev >= MIN_TREND_SAMPLE) {
    const pct = Math.round((delta / t.prev) * 100);
    return { text: `${pct >= 0 ? '+' : ''}${pct}% ${suffix}`, up: pct >= 0 };
  }
  return { text: `${sign}${delta} ${suffix}`, up: delta >= 0 };
}

export default function LabsOfficeScreen() {
  const { lang, toggle } = useI18n();
  const ar = lang === 'ar';
  const { user, role } = useUserRole();
  const insets = useSafeAreaInsets();
  const unreadCount = useUnreadNotificationsCount(user?.uid);
  const orders = useOrders();
  const [tab, setTab] = useState<'cases' | 'team'>('cases');
  const [filter, setFilter] = useState<'all' | OrderStatus>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Order | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    connectLabOrders(user.uid);
    return () => disconnectLabOrders();
  }, [user?.uid]);

  const counts: Record<string, number> = { all: orders.length };
  for (const o of orders) counts[o.status] = (counts[o.status] ?? 0) + 1;

  // Real month-over-month counts (from each order's receivedDate), used to
  // drive the stat cards' trend line below the count.
  const trends = useMemo(() => {
    const now = new Date();
    const curKey = monthKey(now);
    const prevKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

    const result: Record<string, { cur: number; prev: number }> = {
      all: { cur: 0, prev: 0 },
      new: { cur: 0, prev: 0 },
      in_progress: { cur: 0, prev: 0 },
      completed: { cur: 0, prev: 0 },
      delayed: { cur: 0, prev: 0 },
    };

    for (const o of orders) {
      const d = new Date(o.receivedDate || o.dueDate || '');
      if (isNaN(d.getTime())) continue;
      const k = monthKey(d);
      if (k !== curKey && k !== prevKey) continue;
      const bucket = k === curKey ? 'cur' : 'prev';
      result.all[bucket]++;
      result[o.status][bucket]++;
    }
    return result;
  }, [orders]);

  const filtered = useMemo(() => {
    let list = filter === 'all' ? orders : orders.filter((o) => o.status === filter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (o) =>
          (o.patient || '').toLowerCase().includes(q) ||
          (o.doctor || '').toLowerCase().includes(q) ||
          (o.orderNumber || '').toLowerCase().includes(q) ||
          String(o.caseId || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [orders, filter, search]);

  const nextStatus = (s: OrderStatus): OrderStatus => {
    if (s === 'new' || s === 'delayed') return 'in_progress';
    if (s === 'in_progress') return 'completed';
    return 'completed';
  };

  return (
    <Screen>
      {/* Header — navy hero card matching implants-office.tsx's redesign:
          decorative circles + a large faint watermark icon behind a
          "مرحباً" greeting, lab name, tagline, phone chip, and a verified
          avatar — instead of the old flat single-row teal bar. */}
      <View
        className="overflow-hidden rounded-3xl p-4"
        style={{ backgroundColor: '#0F172A', marginTop: insets.top }}
      >
        <View
          pointerEvents="none"
          className="absolute -end-8 -top-12 h-40 w-40 rounded-full"
          style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
        />
        <View
          pointerEvents="none"
          className="absolute -start-10 -bottom-14 h-36 w-36 rounded-full"
          style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
        />
        <View pointerEvents="none" className="absolute -end-2 -bottom-3.5">
          <Layers size={104} color="rgba(255,255,255,0.06)" strokeWidth={1.2} />
        </View>

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => setSidebarOpen(true)}
              className="h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10"
            >
              <Menu size={16} color="#FFFFFF" />
            </Pressable>
            <Pressable
              onPress={toggle}
              className="h-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-3"
            >
              <Text className="text-xs font-bold text-white">{ar ? 'EN' : 'AR'}</Text>
            </Pressable>
          </View>
          <Pressable
            onPress={() => router.push('/notifications')}
            className="relative h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10"
          >
            <Bell size={16} color="#FFFFFF" />
            {unreadCount > 0 && (
              <View className="absolute -end-1 -top-1 h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1">
                <Text className="text-[9px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View className="mt-3 flex-row items-start justify-between">
          <View className="min-w-0 flex-1 pe-3">
            <Text className="text-[11px] font-bold" style={{ color: '#60A5FA' }}>
              {ar ? 'مرحباً' : 'Welcome'}
            </Text>
            <Text numberOfLines={1} className="mt-0.5 text-xl font-extrabold text-white">
              {role?.name || (ar ? 'المختبر' : 'Lab')}
            </Text>
            <View className="mt-1.5 flex-row items-center gap-1.5">
              <View className="h-1 w-5 rounded-full" style={{ backgroundColor: '#3B82F6' }} />
              <Text className="text-[11px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {ar ? 'شريكك لنجاح أفضل' : 'Your partner for better results'}
              </Text>
            </View>
            {!!role?.phone && (
              <View
                className="mt-2.5 flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
              >
                <Phone size={11} color="rgba(255,255,255,0.75)" />
                <Text className="text-[11px]" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {role.phone}
                </Text>
              </View>
            )}
          </View>

          <Pressable onPress={() => router.push('/account')} className="relative">
            <View
              className="h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2"
              style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.2)' }}
            >
              {role?.photoURL ? (
                <Image source={{ uri: role.photoURL }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <UserCircle2 size={28} color="rgba(255,255,255,0.8)" />
              )}
            </View>
            <View
              className="absolute -end-0.5 -bottom-0.5 h-5 w-5 items-center justify-center rounded-full border-2"
              style={{ backgroundColor: '#3B82F6', borderColor: '#0F172A' }}
            >
              <BadgeCheck size={11} color="#FFFFFF" />
            </View>
          </Pressable>
        </View>
      </View>

      <LabSidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Tabs */}
      <View className="mt-3 flex-row gap-1.5 rounded-2xl bg-slate-100 p-1.5">
        {(['cases', 'team'] as const).map((t) => {
          const TabIcon = t === 'cases' ? FileText : Users;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              className="min-h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2"
              style={tab === t ? { backgroundColor: '#0F172A' } : undefined}
            >
              <TabIcon size={14} color={tab === t ? '#FFFFFF' : '#64748B'} />
              <Text className={cn('text-center text-xs font-bold', tab === t ? 'text-white' : 'text-slate-500')}>
                {t === 'cases' ? (ar ? 'الحالات' : 'Cases') : ar ? 'كادر المختبر' : 'Lab Staff'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'cases' ? (
        <>
          {/* Stat grid — tapping a card filters the list below it, same as
              the equivalent cards on the web dashboard. */}
          <View className="mt-4 flex-row flex-wrap justify-between gap-y-3">
            {STAT_CARDS.map((c) => {
              const active = filter === c.key;
              const Icon = c.icon;
              const trend = trendLabel(trends[c.key] ?? { cur: 0, prev: 0 }, ar);
              return (
                <Pressable
                  key={c.key}
                  onPress={() => setFilter(active ? 'all' : c.key)}
                  className="w-[48.5%] overflow-hidden rounded-2xl p-4"
                  style={{
                    backgroundColor: c.bg,
                    ...(active
                      ? { shadowColor: c.fg, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 }
                      : null),
                  }}
                >
                  <View pointerEvents="none" className="absolute -end-3 -bottom-3">
                    <Icon size={64} color={c.fg} strokeWidth={1.2} style={{ opacity: 0.12 }} />
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[10px] font-bold uppercase tracking-wide" style={{ color: c.fg }}>
                      {ar ? c.ar : c.en}
                    </Text>
                    <View className="h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.6)' }}>
                      <Icon size={15} color={c.fg} />
                    </View>
                  </View>
                  <Text className="mt-2 text-2xl font-extrabold" style={{ color: c.fg }}>
                    {counts[c.key] ?? 0}
                  </Text>
                  {trend && (
                    <View className="mt-1.5 flex-row items-center gap-1">
                      {trend.up ? (
                        <TrendingUp size={11} color={c.fg} />
                      ) : (
                        <TrendingDown size={11} color={c.fg} />
                      )}
                      <Text className="text-[10px] font-semibold" style={{ color: c.fg }} numberOfLines={1}>
                        {trend.text}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          <Input
            value={search}
            onChangeText={setSearch}
            placeholder={ar ? 'ابحث عن حالة، طبيب أو مريض…' : 'Search case, doctor or patient…'}
            leftIcon={<Search size={16} color="#94A3B8" />}
            className="mt-4"
          />

          <View className="mt-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <Clock size={14} color="#64748B" />
              <Text className="text-sm font-extrabold text-slate-800">
                {filter === 'all' ? (ar ? 'الحالات الأخيرة' : 'Recent Cases') : ar ? STATUS_AR[filter] : STATUS_EN[filter]}
              </Text>
            </View>
            <View className="rounded-full bg-slate-100 px-2.5 py-1">
              <Text className="text-[11px] font-bold text-slate-600">
                {filtered.length} {ar ? 'حالة' : 'cases'}
              </Text>
            </View>
          </View>

          {filtered.length === 0 ? (
            <Text className="mt-12 text-center text-slate-500">{ar ? 'لا توجد حالات' : 'No cases'}</Text>
          ) : (
            <View className="mt-3 gap-3 pb-4">
              {filtered.map((o) => (
                <Pressable
                  key={o.id}
                  onPress={() => setSelected(o)}
                  className="rounded-2xl border border-slate-200 bg-card p-3.5 shadow-sm"
                  style={{
                    [ar ? 'borderRightWidth' : 'borderLeftWidth']: 3,
                    [ar ? 'borderRightColor' : 'borderLeftColor']: STATUS_ACCENT[o.status],
                  }}
                >
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className="min-w-0 flex-1 truncate text-sm font-extrabold text-slate-800">
                      {o.patient || '—'}
                    </Text>
                    <View className={cn('shrink-0 rounded-full px-2.5 py-1', STATUS_TONE[o.status])}>
                      <Text className="text-[10px] font-bold">
                        {ar ? STATUS_AR[o.status] : STATUS_EN[o.status]}
                      </Text>
                    </View>
                  </View>
                  <Text numberOfLines={1} className="mt-1 text-[11px] text-slate-500">
                    {[o.workType, o.orderNumber, o.unitsCount ? `${o.unitsCount} ${ar ? 'وحدة' : 'units'}` : undefined]
                      .filter(Boolean)
                      .join(' · ') || (ar ? 'بلا تفاصيل' : 'No details')}
                  </Text>
                  {(o.currentStage || o.status === 'completed') && (
                    <View className="mt-2">
                      <View className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <View
                          className="h-full rounded-full"
                          style={{
                            width: `${o.status === 'completed' ? 100 : Math.min(100, getCaseProgress(o.currentStage))}%`,
                            backgroundColor: STATUS_ACCENT[o.status],
                          }}
                        />
                      </View>
                      {!!o.currentStage && (
                        <Text className="mt-0.5 text-center text-[10px] text-slate-400">
                          {o.status === 'completed' ? (ar ? 'مكتملة' : 'Completed') : getStageLabel(o.currentStage, lang)}
                        </Text>
                      )}
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
        <View className="mt-4">
          <LabStaffPanel labId={user?.uid ?? ''} ar={ar} />
        </View>
      )}

      {selected && <CaseDetailModal ar={ar} order={selected} onClose={() => setSelected(null)} labName={role?.name} />}
    </Screen>
  );
}
