import { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, FlaskConical, MapPin, Package, Phone, Search, X } from 'lucide-react-native';

import { Screen, Text, Spinner, Input, Button } from '@/components/ui';
import { ProductImage } from '@/components/ProductImage';
import {
  useDentistOrders,
  useOrders,
  confirmOrder,
  markOrderUnavailable,
  updateOrderItemAvailability,
  ordersQueryKey,
} from '@/lib/orders';
import { useMarkOrderSeen } from '@/lib/orderSeen';
import { useProducts, useSignedImageUrls } from '@/lib/products';
import { useLabCases } from '@/lib/caseTracking';
import type { Order as LabOrder, OrderStatus as LabOrderStatus } from '@/lib/ordersStore';
import { CaseDetailModal, LAB_STATUS_AR, LAB_STATUS_EN, formatShortDate } from '@/components/CaseDetailModal';
import { useUserRole } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

// The real order-status model (see OrderStatus in integrations/firebase/types
// on the web side, mirrored here): an order is only ever pending, confirmed,
// or rejected — "delivered"/"cancelled" belong to *invoices*, generated only
// after an order is confirmed. A filter chip for those never matched anything.
const FILTERS = [
  { id: 'all', ar: 'الكل', en: 'All' },
  { id: 'pending', ar: 'قيد الانتظار', en: 'Pending' },
  { id: 'confirmed', ar: 'تم التأكيد', en: 'Confirmed' },
  { id: 'rejected', ar: 'غير متوفر', en: 'Unavailable' },
];

const TONE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-600',
};

const LABEL: Record<string, { ar: string; en: string }> = {
  pending: { ar: 'قيد الانتظار', en: 'Pending' },
  confirmed: { ar: 'تم التأكيد', en: 'Confirmed' },
  rejected: { ar: 'غير متوفر', en: 'Unavailable' },
};

// A fixed `h-8` chip with a two-word label like "غير متوفر" can wrap to a
// second line that the fixed height then clips — the exact bug already
// fixed for the shared Button component (components/ui/Button.tsx), but
// these filter chips are their own inline Pressable/Text, duplicated three
// times in this file, so that earlier fix never reached them.
function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'min-h-8 items-center justify-center rounded-full border px-3 py-1.5',
        active ? 'border-[#2563EB] bg-[#2563EB]' : 'border-slate-200 bg-white',
      )}
    >
      <Text className={cn('text-center text-[11px] font-bold', active ? 'text-white' : 'text-slate-600')}>
        {label}
      </Text>
    </Pressable>
  );
}

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
  const markSeen = useMarkOrderSeen(user?.uid);
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'all') return orders;
    return orders.filter((o) => o.status === filter);
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
            {FILTERS.map((f) => (
              <FilterChip key={f.id} label={ar ? f.ar : f.en} active={filter === f.id} onPress={() => setFilter(f.id)} />
            ))}
          </View>
        }
        renderItem={({ item: o }) => {
          const st = (o.status as string) ?? 'pending';
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
              onPress={() => {
                markSeen(o.id);
                setOpenId(open ? null : o.id);
              }}
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
  const qc = useQueryClient();
  const { data: orders = [], isLoading } = useOrders(user?.uid);
  const markSeen = useMarkOrderSeen(user?.uid);

  const { data: products = [] } = useProducts();
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const imagePaths = useMemo(
    () =>
      orders
        .flatMap((o) => (o.items ?? []).map((it) => productById.get(it.productId)?.images?.[0]))
        .filter((x): x is string => !!x),
    [orders, productById],
  );
  const { data: imageUrlMap = {} } = useSignedImageUrls(imagePaths);
  const imageOf = (productId: string) => {
    const path = productById.get(productId)?.images?.[0];
    return path ? imageUrlMap[path] : undefined;
  };

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyIdx, setBusyIdx] = useState<number | null>(null);
  const [acting, setActing] = useState<'confirm' | 'reject' | null>(null);

  const filtered = useMemo(() => {
    let list = orders;
    if (filter !== 'all') list = list.filter((o) => o.status === filter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (o) =>
          (o.orderNumber || '').toLowerCase().includes(q) ||
          (o.dentistName || '').toLowerCase().includes(q) ||
          (o.clinicName || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [orders, filter, search]);

  const act = async (o: (typeof orders)[number], kind: 'confirm' | 'reject') => {
    setActing(kind);
    try {
      if (kind === 'confirm') await confirmOrder(o);
      else await markOrderUnavailable(o.id);
      await qc.invalidateQueries({ queryKey: ordersQueryKey });
      toast.success(
        kind === 'confirm'
          ? ar
            ? 'تم تأكيد الطلب ونقله إلى فواتير الأطباء'
            : 'Order confirmed and moved to doctor invoices'
          : ar
            ? 'تم تحديد الطلب كغير متوفر'
            : 'Order marked as unavailable',
      );
      setOpenId(null);
    } catch {
      toast.error(ar ? 'فشلت العملية' : 'Action failed');
    } finally {
      setActing(null);
    }
  };

  const setAvailability = async (
    o: (typeof orders)[number],
    idx: number,
    value: 'available' | 'not_available',
  ) => {
    setBusyIdx(idx);
    try {
      await updateOrderItemAvailability(o.id, idx, value);
      await qc.invalidateQueries({ queryKey: ordersQueryKey });
    } catch {
      toast.error(ar ? 'فشل تحديث التوفر' : 'Failed to update availability');
    } finally {
      setBusyIdx(null);
    }
  };

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
          <View className="mb-3 gap-2.5">
            <Input
              value={search}
              onChangeText={setSearch}
              placeholder={ar ? 'ابحث برقم الطلب أو الطبيب…' : 'Search order or doctor…'}
              leftIcon={<Search size={16} color="#94A3B8" />}
            />
            <View className="flex-row flex-wrap gap-1.5">
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
          </View>
        }
        renderItem={({ item: o }) => {
          const st = (o.status as string) ?? 'pending';
          const pending = st === 'pending';
          const open = openId === o.id;
          const items = o.items ?? [];
          return (
            <Pressable
              onPress={() => {
                markSeen(o.id);
                setOpenId(open ? null : o.id);
              }}
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
                <View className="gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-3">
                  {/* Doctor info — matches the web order-detail popup's "Doctor Information" card */}
                  {(o.dentistPhone || o.dentistAddress) && (
                    <View className="flex-row flex-wrap gap-x-4 gap-y-1">
                      {o.dentistPhone ? (
                        <View className="flex-row items-center gap-1.5">
                          <Phone size={12} color="#94A3B8" />
                          <Text className="text-xs text-slate-500" style={{ writingDirection: 'ltr' }}>
                            {o.dentistPhone}
                          </Text>
                        </View>
                      ) : null}
                      {o.dentistAddress ? (
                        <View className="flex-row items-center gap-1.5">
                          <MapPin size={12} color="#94A3B8" />
                          <Text className="text-xs text-slate-500" numberOfLines={1}>
                            {o.dentistAddress}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  )}

                  {items.length === 0 ? (
                    <Text className="text-center text-xs text-slate-400">
                      {ar ? 'لا توجد تفاصيل' : 'No details'}
                    </Text>
                  ) : (
                    items.map((it, i) => {
                      const busy = busyIdx === i && acting === null;
                      const avail = it.availability;
                      return (
                        <View key={i} className="flex-row items-center gap-2">
                          <ProductImage
                            uri={imageOf(it.productId)}
                            className="h-10 w-10 rounded-lg bg-slate-100"
                            iconSize={16}
                          />
                          <View className="min-w-0 flex-1">
                            <Text className="text-xs font-semibold text-slate-700" numberOfLines={1}>
                              {it.name || '—'}
                            </Text>
                            <Text className="text-[11px] text-slate-400">
                              × {it.quantity} ·{' '}
                              {it.currency === 'IQD'
                                ? `${(it.price * it.quantity).toLocaleString()} د.ع`
                                : `$${(it.price * it.quantity).toFixed(2)}`}
                            </Text>
                          </View>
                          {pending && (
                            <View className="flex-row gap-1">
                              <Pressable
                                disabled={busy}
                                onPress={() => setAvailability(o, i, 'available')}
                                className={cn(
                                  'h-7 w-7 items-center justify-center rounded-lg border',
                                  avail === 'available'
                                    ? 'border-emerald-600 bg-emerald-600'
                                    : 'border-emerald-200 bg-emerald-50',
                                )}
                              >
                                <Check size={13} color={avail === 'available' ? '#fff' : '#059669'} />
                              </Pressable>
                              <Pressable
                                disabled={busy}
                                onPress={() => setAvailability(o, i, 'not_available')}
                                className={cn(
                                  'h-7 w-7 items-center justify-center rounded-lg border',
                                  avail === 'not_available'
                                    ? 'border-rose-600 bg-rose-600'
                                    : 'border-rose-200 bg-rose-50',
                                )}
                              >
                                <X size={13} color={avail === 'not_available' ? '#fff' : '#E11D48'} />
                              </Pressable>
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}

                  {pending && (
                    <View className="mt-1 flex-row gap-2">
                      <Button
                        size="sm"
                        title={ar ? 'تأكيد' : 'Confirm'}
                        loading={acting === 'confirm'}
                        disabled={acting !== null}
                        onPress={() => act(o, 'confirm')}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        title={ar ? 'غير متوفر' : 'Unavailable'}
                        loading={acting === 'reject'}
                        disabled={acting !== null}
                        onPress={() => act(o, 'reject')}
                        className="flex-1"
                      />
                    </View>
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
              {ar ? 'لا توجد طلبات واردة' : 'No incoming orders'}
            </Text>
          </View>
        }
      />
    </Screen>
  );
}

/* ── Lab view ──────────────────────────────────────────────────────
   Mirrors the web app's `LabOrders()` in src/routes/orders.tsx: this is
   specifically the cases *sent in by doctors* (`source ===
   "incoming_doctor_case"`), with search + status filtering — not every
   document in `lab_orders/{labId}/cases`, which also holds cases the lab
   created itself from its own dashboard (shown separately there). */

const LAB_ORDER_FILTERS: { id: 'all' | LabOrderStatus; ar: string; en: string }[] = [
  { id: 'all', ar: 'الكل', en: 'All' },
  { id: 'new', ar: 'جديد', en: 'New' },
  { id: 'in_progress', ar: 'قيد التنفيذ', en: 'In Progress' },
  { id: 'completed', ar: 'مكتملة', en: 'Completed' },
  { id: 'delayed', ar: 'متأخرة', en: 'Late' },
];

const LAB_STATUS_TONE: Record<LabOrderStatus, string> = {
  new: 'bg-sky-100 text-sky-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  delayed: 'bg-rose-100 text-rose-700',
};
const LAB_STATUS_ACCENT: Record<LabOrderStatus, string> = {
  new: '#0369A1',
  in_progress: '#B45309',
  completed: '#047857',
  delayed: '#B91C1C',
};

function LabOrders() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user, role } = useUserRole();
  const { cases, loading } = useLabCases(user?.uid ?? '');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | LabOrderStatus>('all');
  const [selected, setSelected] = useState<LabOrder | null>(null);

  const incoming = useMemo(() => cases.filter((c) => c.source === 'incoming_doctor_case'), [cases]);

  const filtered = useMemo(() => {
    let list = filter === 'all' ? incoming : incoming.filter((c) => c.status === filter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          (c.orderNumber || '').toLowerCase().includes(q) ||
          (c.patient || '').toLowerCase().includes(q) ||
          (c.doctor || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [incoming, filter, search]);

  if (loading) return <Spinner />;

  return (
    <Screen scroll={false}>
      <View className="flex-row items-center justify-between pb-2">
        <Text className="text-xl font-extrabold text-slate-800">
          {ar ? 'الطلبات الواردة' : 'Incoming Orders'}
        </Text>
        <Text className="text-xs text-slate-400">{incoming.length}</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={
          <View className="mb-3 gap-2.5">
            <Input
              value={search}
              onChangeText={setSearch}
              placeholder={ar ? 'ابحث باسم الطبيب أو المريض…' : 'Search by doctor or patient…'}
              leftIcon={<Search size={16} color="#94A3B8" />}
            />
            <View className="flex-row flex-wrap gap-1.5">
              {LAB_ORDER_FILTERS.map((f) => (
                <FilterChip key={f.id} label={ar ? f.ar : f.en} active={filter === f.id} onPress={() => setFilter(f.id)} />
              ))}
            </View>
          </View>
        }
        renderItem={({ item: c }) => (
          <Pressable
            onPress={() => setSelected(c)}
            className="mb-3 rounded-2xl border border-slate-200 bg-card p-3.5 shadow-sm"
            style={{
              [ar ? 'borderRightWidth' : 'borderLeftWidth']: 3,
              [ar ? 'borderRightColor' : 'borderLeftColor']: LAB_STATUS_ACCENT[c.status],
            }}
          >
            <View className="flex-row items-center justify-between gap-2">
              <Text className="min-w-0 flex-1 truncate text-sm font-extrabold text-slate-800">
                {c.patient || (ar ? 'غير محدد' : 'Unspecified')}
              </Text>
              <View className={cn('shrink-0 rounded-full px-2.5 py-1', LAB_STATUS_TONE[c.status] ?? LAB_STATUS_TONE.new)}>
                <Text className="text-[10px] font-bold">
                  {ar ? LAB_STATUS_AR[c.status] : LAB_STATUS_EN[c.status]}
                </Text>
              </View>
            </View>
            <Text numberOfLines={1} className="mt-1 text-[11px] text-slate-500">
              {[c.doctor, c.workType, c.orderNumber || (c.caseId ? `#${c.caseId}` : undefined)]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            {!!c.receivedDate && (
              <Text className="mt-0.5 text-[10px] text-slate-400">{formatShortDate(c.receivedDate)}</Text>
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="items-center py-16">
            <FlaskConical size={48} color="#CBD5E1" strokeWidth={1.4} />
            <Text className="mt-3 text-sm text-slate-400">
              {ar ? 'لا توجد حالات واردة من الأطباء' : 'No incoming doctor cases'}
            </Text>
          </View>
        }
      />

      {selected && <CaseDetailModal ar={ar} order={selected} onClose={() => setSelected(null)} labName={role?.name} />}
    </Screen>
  );
}
