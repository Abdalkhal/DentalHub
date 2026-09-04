import { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { ChevronDown, FlaskConical, Package } from 'lucide-react-native';
import { router } from 'expo-router';

import { Screen, Text, Spinner } from '@/components/ui';
import { ProductImage } from '@/components/ProductImage';
import { useDentistOrders, useOrders } from '@/lib/orders';
import { getStatusColor, getStatusLabel, useLabCases } from '@/lib/caseTracking';
import { useUserRole } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const FILTERS = [
  { id: 'all', ar: 'الكل', en: 'All' },
  { id: 'pending', ar: 'قيد الانتظار', en: 'Pending' },
  { id: 'confirmed', ar: 'مؤكد', en: 'Confirmed' },
  { id: 'delivered', ar: 'تم التسليم', en: 'Delivered' },
  { id: 'cancelled', ar: 'ملغي', en: 'Cancelled' },
];

const TONE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-sky-50 text-sky-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-rose-50 text-rose-600',
};

const LABEL: Record<string, { ar: string; en: string }> = {
  pending: { ar: 'قيد الانتظار', en: 'Pending' },
  confirmed: { ar: 'مؤكد', en: 'Confirmed' },
  delivered: { ar: 'تم التسليم', en: 'Delivered' },
  cancelled: { ar: 'ملغي', en: 'Cancelled' },
};

function orderNo(o: { id: string; orderNumber?: string }): string {
  return o.orderNumber || `DNT-${o.id.slice(0, 6).toUpperCase()}`;
}

function fmtDate(ts: unknown): string {
  const d = (ts as { toDate?: () => Date })?.toDate?.();
  return d ? d.toLocaleDateString() : '—';
}

function money(o: { totalUSD?: number; total?: number; totalIQD?: number }): string {
  if (o.totalUSD) return `$${o.totalUSD.toFixed(2)}`;
  if (o.totalIQD) return `${o.totalIQD.toLocaleString()} د.ع`;
  return `${(o.total ?? 0).toLocaleString()} د.ع`;
}

/**
 * Mirrors the web app's role branching in `src/routes/orders.tsx`: suppliers and
 * implant companies see the orders sent *to* them, dentists see the orders they
 * placed, and labs see their incoming cases.
 */
export default function OrdersScreen() {
  const { role, loading } = useUserRole();

  if (loading) return <Spinner />;

  const accountType = role?.accountType;
  if (accountType === 'supply' || accountType === 'implant') return <SupplierOrders />;
  if (accountType === 'lab') return <LabOrders />;
  return <DentistOrders />;
}

function DentistOrders() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useUserRole();
  const { data: orders = [], isLoading } = useDentistOrders(user?.uid);
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'all') return orders;
    const st = filter === 'cancelled' ? 'rejected' : filter;
    return orders.filter((o) => o.status === st);
  }, [orders, filter]);

  if (isLoading) return <Spinner />;

  return (
    <Screen scroll={false}>
      <View className="flex-row items-center justify-between pb-2">
        <Text className="text-xl font-extrabold text-slate-800">{ar ? 'طلباتي' : 'My Orders'}</Text>
        <Text className="text-xs text-slate-400">{orders.length}</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(o) => o.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={
          <View className="mb-3 flex-row flex-wrap gap-1.5">
            {FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setFilter(f.id)}
                  className={cn(
                    'h-8 items-center justify-center rounded-full border px-3',
                    active ? 'border-[#2563EB] bg-[#2563EB]' : 'border-slate-200 bg-white',
                  )}
                >
                  <Text className={cn('text-[11px] font-bold', active ? 'text-white' : 'text-slate-600')}>
                    {ar ? f.ar : f.en}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        }
        renderItem={({ item: o }) => {
          const st = (o.status as string) === 'rejected' ? 'cancelled' : ((o.status as string) ?? 'pending');
          const open = openId === o.id;
          const items = (o.items ?? []) as unknown as Array<{
            productName?: string;
            name?: string;
            quantity?: number;
            unitPrice?: number;
            price?: number;
            productImage?: string;
          }>;
          return (
            <Pressable
              onPress={() => setOpenId(open ? null : o.id)}
              className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-card shadow-sm"
            >
              <View className="p-4">
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="text-sm font-extrabold text-slate-800">{orderNo(o)}</Text>
                  <View className={cn('shrink-0 rounded-full px-2.5 py-1', TONE[st] ?? TONE.pending)}>
                    <Text className="text-[11px] font-bold">
                      {ar ? (LABEL[st]?.ar ?? st) : (LABEL[st]?.en ?? st)}
                    </Text>
                  </View>
                </View>
                <Text className="mt-1 text-xs text-slate-400">{fmtDate(o.createdAt)}</Text>
                <View className="mt-2 flex-row items-center justify-between border-t border-slate-100 pt-2">
                  <Text className="text-xs text-slate-500">
                    {items.length} {ar ? 'منتج' : 'items'} · {money(o)}
                  </Text>
                  <ChevronDown
                    size={16}
                    color="#94A3B8"
                    style={open ? { transform: [{ rotate: '180deg' }] } : undefined}
                  />
                </View>
              </View>
              {open && (
                <View className="gap-2 border-t border-slate-100 bg-slate-50/50 px-4 py-3">
                  {items.length === 0 ? (
                    <Text className="text-center text-xs text-slate-400">
                      {ar ? 'لا توجد تفاصيل' : 'No details'}
                    </Text>
                  ) : (
                    items.map((it, i) => (
                      <View key={i} className="flex-row items-center gap-2">
                        {it.productImage ? (
                          <ProductImage uri={it.productImage} className="h-10 w-10 rounded-lg bg-slate-100" iconSize={16} />
                        ) : (
                          <View className="h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                            <Package size={16} color="#94A3B8" />
                          </View>
                        )}
                        <Text className="min-w-0 flex-1 text-xs font-semibold text-slate-700" numberOfLines={1}>
                          {it.productName || it.name || '—'}
                        </Text>
                        <Text className="text-xs font-bold text-slate-500">× {it.quantity ?? 1}</Text>
                      </View>
                    ))
                  )}
                </View>
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Package size={48} color="#CBD5E1" strokeWidth={1.4} />
            <Text className="mt-3 text-sm text-slate-400">
              {ar ? 'لا توجد طلبات بعد' : 'No orders yet'}
            </Text>
          </View>
        }
      />
    </Screen>
  );
}

/* ── Supplier / implant company view ───────────────────────────────
   Reads orders where `supplierId == me` — the same source the tab badge
   counts, so the badge and the list can no longer disagree. */

function SupplierOrders() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useUserRole();
  const { data: orders = [], isLoading } = useOrders(user?.uid);
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'all') return orders;
    const st = filter === 'cancelled' ? 'rejected' : filter;
    return orders.filter((o) => o.status === st);
  }, [orders, filter]);

  if (isLoading) return <Spinner />;

  return (
    <Screen scroll={false}>
      <View className="flex-row items-center justify-between pb-2">
        <Text className="text-xl font-extrabold text-slate-800">
          {ar ? 'الطلبات الواردة' : 'Incoming Orders'}
        </Text>
        <Text className="text-xs text-slate-400">{orders.length}</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(o) => o.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={
          <View className="mb-3 flex-row flex-wrap gap-1.5">
            {FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setFilter(f.id)}
                  className={cn(
                    'h-8 items-center justify-center rounded-full border px-3',
                    active ? 'border-[#2563EB] bg-[#2563EB]' : 'border-slate-200 bg-white',
                  )}
                >
                  <Text className={cn('text-[11px] font-bold', active ? 'text-white' : 'text-slate-600')}>
                    {ar ? f.ar : f.en}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        }
        renderItem={({ item: o }) => {
          const st = (o.status as string) === 'rejected' ? 'cancelled' : ((o.status as string) ?? 'pending');
          const open = openId === o.id;
          const items = (o.items ?? []) as unknown as Array<{
            productName?: string;
            name?: string;
            quantity?: number;
            productImage?: string;
          }>;
          return (
            <Pressable
              onPress={() => setOpenId(open ? null : o.id)}
              className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-card shadow-sm"
            >
              <View className="p-4">
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="text-sm font-extrabold text-slate-800">{orderNo(o)}</Text>
                  <View className={cn('shrink-0 rounded-full px-2.5 py-1', TONE[st] ?? TONE.pending)}>
                    <Text className="text-[11px] font-bold">
                      {ar ? (LABEL[st]?.ar ?? st) : (LABEL[st]?.en ?? st)}
                    </Text>
                  </View>
                </View>

                {/* Who sent it — the field a supplier actually needs. */}
                <Text className="mt-1 text-xs font-semibold text-slate-600" numberOfLines={1}>
                  {o.dentistName || (ar ? 'طبيب' : 'Dentist')}
                  {o.clinicName ? ` · ${o.clinicName}` : ''}
                </Text>
                <Text className="mt-0.5 text-xs text-slate-400">{fmtDate(o.createdAt)}</Text>

                <View className="mt-2 flex-row items-center justify-between border-t border-slate-100 pt-2">
                  <Text className="text-xs text-slate-500">
                    {items.length} {ar ? 'منتج' : 'items'} · {money(o)}
                  </Text>
                  <ChevronDown
                    size={16}
                    color="#94A3B8"
                    style={open ? { transform: [{ rotate: '180deg' }] } : undefined}
                  />
                </View>
              </View>
              {open && (
                <View className="gap-2 border-t border-slate-100 bg-slate-50/50 px-4 py-3">
                  {items.length === 0 ? (
                    <Text className="text-center text-xs text-slate-400">
                      {ar ? 'لا توجد تفاصيل' : 'No details'}
                    </Text>
                  ) : (
                    items.map((it, i) => (
                      <View key={i} className="flex-row items-center gap-2">
                        {it.productImage ? (
                          <ProductImage uri={it.productImage} className="h-10 w-10 rounded-lg bg-slate-100" iconSize={16} />
                        ) : (
                          <View className="h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                            <Package size={16} color="#94A3B8" />
                          </View>
                        )}
                        <Text className="min-w-0 flex-1 text-xs font-semibold text-slate-700" numberOfLines={1}>
                          {it.productName || it.name || '—'}
                        </Text>
                        <Text className="text-xs font-bold text-slate-500">× {it.quantity ?? 1}</Text>
                      </View>
                    ))
                  )}
                  {o.dentistPhone ? (
                    <Text className="mt-1 text-xs text-slate-500">
                      {ar ? 'الهاتف: ' : 'Phone: '}
                      {o.dentistPhone}
                    </Text>
                  ) : null}
                </View>
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Package size={48} color="#CBD5E1" strokeWidth={1.4} />
            <Text className="mt-3 text-sm text-slate-400">
              {ar ? 'لا توجد طلبات واردة' : 'No incoming orders'}
            </Text>
          </View>
        }
      />
    </Screen>
  );
}

/* ── Lab view ──────────────────────────────────────────────────────
   Labs receive cases, not product orders, so this lists `lab_orders/{labId}/cases`
   the way the web app's LabOrders view does. */

function LabOrders() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useUserRole();
  const { cases, loading } = useLabCases(user?.uid ?? '');

  if (loading) return <Spinner />;

  return (
    <Screen scroll={false}>
      <View className="flex-row items-center justify-between pb-2">
        <Text className="text-xl font-extrabold text-slate-800">
          {ar ? 'الحالات الواردة' : 'Incoming Cases'}
        </Text>
        <Text className="text-xs text-slate-400">{cases.length}</Text>
      </View>

      <FlatList
        data={cases}
        keyExtractor={(c) => c.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item: c }) => (
          <Pressable
            onPress={() => router.push('/labs-office')}
            className="mb-3 flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-card p-4 shadow-sm"
          >
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-sky-50">
              <FlaskConical size={20} color="#0284C7" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-extrabold text-slate-800" numberOfLines={1}>
                {c.patient || (ar ? 'غير محدد' : 'Unspecified')}
              </Text>
              <Text className="mt-0.5 text-xs text-slate-500" numberOfLines={1}>
                {c.doctor} · {ar ? 'الحالة' : 'Case'} #{c.caseId || c.orderNumber}
              </Text>
              <Text className="mt-0.5 text-[11px] text-slate-400" numberOfLines={1}>
                {c.workType}
              </Text>
            </View>
            <View className={cn('shrink-0 rounded-full px-2.5 py-1', getStatusColor(c.status))}>
              <Text className="text-[10px] font-bold text-white">
                {getStatusLabel(c.status, lang)}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="items-center py-16">
            <FlaskConical size={48} color="#CBD5E1" strokeWidth={1.4} />
            <Text className="mt-3 text-sm text-slate-400">
              {ar ? 'لا توجد حالات بعد' : 'No cases yet'}
            </Text>
          </View>
        }
      />
    </Screen>
  );
}
