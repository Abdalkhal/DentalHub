import { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { ChevronDown, Package } from 'lucide-react-native';

import { Screen, Text, Spinner } from '@/components/ui';
import { ProductImage } from '@/components/ProductImage';
import { useDentistOrders } from '@/lib/orders';
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

export default function OrdersScreen() {
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
