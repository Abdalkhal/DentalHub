import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { ReceiptText, User, Building2 } from 'lucide-react-native';

import { Screen, Text, Spinner } from '@/components/ui';
import { useOfficeInvoices, invoiceItemCount } from '@/lib/invoices';
import type { InvoiceStatus, InvoiceDoc } from '@/integrations/firebase/types';
import { useUserRole } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type StatusMeta = { ar: string; en: string; badge: string; dot: string };

const INVOICE_STATUS: Record<InvoiceStatus, StatusMeta> = {
  pending: { ar: 'قيد الانتظار', en: 'Pending', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  confirmed: { ar: 'تم التأكيد', en: 'Confirmed', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  shipped: { ar: 'تم الشحن', en: 'Shipped', badge: 'bg-sky-100 text-sky-700', dot: 'bg-sky-500' },
  delivered: { ar: 'تم التسليم', en: 'Delivered', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  rejected: { ar: 'ملغاة', en: 'Rejected', badge: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
};

function fmtDate(ts: { toDate?: () => Date } | undefined): string {
  if (!ts?.toDate) return '';
  const d = ts.toDate();
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function DoctorInvoicesListScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useUserRole();
  const { invoices, loading } = useOfficeInvoices(user?.uid);

  const fmtInvTotal = (inv: InvoiceDoc): string => {
    const parts: string[] = [];
    if ((inv.totalUSD ?? 0) > 0) parts.push(`$${(inv.totalUSD ?? 0).toFixed(2)}`);
    if ((inv.totalIQD ?? 0) > 0) parts.push(`${(inv.totalIQD ?? 0).toLocaleString()} ${ar ? 'د.ع' : 'IQD'}`);
    return parts.length > 0 ? parts.join(' + ') : `$${(inv.total || 0).toFixed(2)}`;
  };

  // Only show invoices that have already been confirmed in "My Orders"
  // (pending requests live in the orders collection, not here) — mirrors web.
  const visibleInvoices = invoices.filter((i) => i.status !== 'pending');

  return (
    <Screen>
      <Text className="text-sm text-slate-500">
        {visibleInvoices.length} {ar ? 'فواتير' : 'invoices'}
      </Text>

      {loading ? (
        <Spinner />
      ) : visibleInvoices.length === 0 ? (
        <View className="items-center py-16">
          <ReceiptText size={48} color="#CBD5E1" strokeWidth={1.4} />
          <Text className="mt-3 text-sm text-slate-400">{ar ? 'لا توجد فواتير بعد' : 'No invoices yet'}</Text>
        </View>
      ) : (
        <View className="mt-3 gap-3 pb-6">
          {visibleInvoices.map((inv) => {
            const meta = INVOICE_STATUS[inv.status];
            const count = invoiceItemCount(inv);
            return (
              <Pressable
                key={inv.id}
                onPress={() => router.push({ pathname: '/doctor-invoices/[invoiceId]', params: { invoiceId: inv.id } })}
                className="rounded-2xl border border-slate-200 bg-card p-4 shadow-sm"
              >
                <View className="flex-row items-start justify-between gap-2">
                  <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
                    <View className="h-9 w-9 items-center justify-center rounded-xl bg-blue-100">
                      <User size={16} color="#2563EB" />
                    </View>
                    <View className="min-w-0">
                      <Text numberOfLines={1} className="text-sm font-bold text-slate-800">
                        {inv.doctorName}
                      </Text>
                      <View className="flex-row items-center gap-1">
                        <Building2 size={11} color="#94A3B8" />
                        <Text numberOfLines={1} className="text-[11px] text-slate-400">
                          {inv.clinicName || inv.doctorName}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text className="shrink-0 text-[10px] text-slate-400" style={{ writingDirection: 'ltr' }}>
                    {inv.orderNumber}
                  </Text>
                </View>

                <View className="mt-2 flex-row items-center gap-2">
                  <View className={cn('flex-row items-center gap-1 rounded-full px-2.5 py-1', meta.badge)}>
                    <View className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
                    <Text className="text-[10px] font-bold">{ar ? meta.ar : meta.en}</Text>
                  </View>
                  <Text className="text-[11px] text-slate-400">
                    {count} {ar ? 'منتجات' : 'products'}
                  </Text>
                </View>

                <View className="my-2 border-t border-dashed border-slate-200" />

                <View className="flex-row items-center justify-between">
                  <Text className="text-[11px] text-slate-400">{fmtDate(inv.createdAt)}</Text>
                  <Text className="text-base font-extrabold text-slate-900" style={{ writingDirection: 'ltr' }}>
                    {fmtInvTotal(inv)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
