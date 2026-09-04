import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Package } from 'lucide-react-native';

import { Button, Text } from '@/components/ui';
import { useOrders, confirmOrder, markOrderUnavailable, ordersQueryKey } from '@/lib/orders';
import type { OrderDoc } from '@/integrations/firebase/types';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

const TONE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-600',
};
const LABEL: Record<string, { ar: string; en: string }> = {
  pending: { ar: 'قيد الانتظار', en: 'Pending' },
  confirmed: { ar: 'مؤكد', en: 'Confirmed' },
  rejected: { ar: 'مرفوض', en: 'Rejected' },
};

function fmtDate(ts: unknown): string {
  const d = (ts as { toDate?: () => Date })?.toDate?.();
  return d ? d.toLocaleDateString() : '—';
}

export function OfficeOrders({ supplierId }: { supplierId: string }) {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const qc = useQueryClient();
  const { data: orders = [], isLoading } = useOrders(supplierId);
  const [busy, setBusy] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const sorted = [...orders].sort((a, b) => {
    const ta = (a.createdAt as { toDate?: () => Date })?.toDate?.()?.getTime() ?? 0;
    const tb = (b.createdAt as { toDate?: () => Date })?.toDate?.()?.getTime() ?? 0;
    return tb - ta;
  });

  const act = async (o: OrderDoc, kind: 'confirm' | 'reject') => {
    setBusy(o.id);
    try {
      if (kind === 'confirm') await confirmOrder(o);
      else await markOrderUnavailable(o.id);
      await qc.invalidateQueries({ queryKey: ordersQueryKey });
      toast.success(kind === 'confirm' ? (ar ? 'تم تأكيد الطلب' : 'Order confirmed') : ar ? 'تم رفض الطلب' : 'Order rejected');
    } catch {
      toast.error(ar ? 'فشلت العملية' : 'Action failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View className="mt-6 pb-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-bold text-slate-600">
          {ar ? 'الطلبات الواردة' : 'Incoming orders'} ({orders.length})
        </Text>
      </View>

      {isLoading ? (
        <Text className="mt-4 text-center text-xs text-slate-400">{ar ? 'جارٍ التحميل…' : 'Loading…'}</Text>
      ) : sorted.length === 0 ? (
        <Text className="mt-4 text-center text-xs text-slate-400">
          {ar ? 'لا توجد طلبات بعد' : 'No orders yet'}
        </Text>
      ) : (
        <View className="mt-3 gap-2.5">
          {sorted.map((o) => {
            const st = (o.status as string) ?? 'pending';
            const tone = TONE[st] ?? TONE.pending;
            const items = (o.items ?? []) as unknown as Array<{
              name?: string;
              productName?: string;
              quantity?: number;
              price?: number;
            }>;
            return (
              <Pressable
                key={o.id}
                onPress={() => setOpenId(openId === o.id ? null : o.id)}
                className="rounded-2xl border border-slate-200 bg-card p-3.5 shadow-sm"
              >
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="min-w-0 flex-1 truncate text-sm font-extrabold text-slate-800">
                    {o.orderNumber || o.id.slice(0, 8)}
                  </Text>
                  <View className={cn('shrink-0 rounded-full px-2.5 py-1', tone)}>
                    <Text className="text-[10px] font-bold">{ar ? (LABEL[st]?.ar ?? st) : (LABEL[st]?.en ?? st)}</Text>
                  </View>
                </View>
                <Text className="mt-0.5 text-[11px] text-slate-400">
                  {fmtDate(o.createdAt)} · {o.dentistName || (ar ? 'طبيب' : 'Dentist')}
                </Text>
                {!!o.totalUSD && (
                  <Text className="mt-1 text-sm font-extrabold text-primary">${o.totalUSD.toFixed(2)}</Text>
                )}
                {!!o.totalIQD && (
                  <Text className="mt-1 text-sm font-extrabold text-primary">{o.totalIQD.toLocaleString()} د.ع</Text>
                )}

                {openId === o.id && (
                  <View className="mt-2 gap-1.5 border-t border-slate-100 pt-2">
                    {items.length === 0 ? (
                      <Text className="text-xs text-slate-400">{ar ? 'لا توجد بنود' : 'No items'}</Text>
                    ) : (
                      items.map((it, i) => (
                        <View key={i} className="flex-row items-center gap-2">
                          <Package size={13} color="#94A3B8" />
                          <Text className="min-w-0 flex-1 text-xs text-slate-600" numberOfLines={1}>
                            {it.name || it.productName || '—'}
                          </Text>
                          <Text className="text-xs font-bold text-slate-500">× {it.quantity ?? 1}</Text>
                        </View>
                      ))
                    )}
                    {(o.status === 'pending' || o.status == null) && (
                      <View className="mt-2 flex-row gap-2">
                        <Button
                          size="sm"
                          title={ar ? 'تأكيد' : 'Confirm'}
                          loading={busy === o.id}
                          onPress={() => act(o, 'confirm')}
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          title={ar ? 'رفض' : 'Reject'}
                          onPress={() => act(o, 'reject')}
                          className="flex-1"
                        />
                      </View>
                    )}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {sorted.length === 0 && !isLoading && (
        <View className="mt-4 items-center">
          <ClipboardList size={32} color="#CBD5E1" />
        </View>
      )}
    </View>
  );
}
