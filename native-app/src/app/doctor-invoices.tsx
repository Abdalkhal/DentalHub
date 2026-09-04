import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs } from 'firebase/firestore';
import { FileText } from 'lucide-react-native';

import { Screen, Card, Button, Text, Spinner } from '@/components/ui';
import { db } from '@/integrations/firebase/client';
import { useOfficeInvoices, updateInvoiceStatus, invoiceItemCount } from '@/lib/invoices';
import { useUserRole } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  pending: { ar: 'معلق', en: 'Pending' },
  paid: { ar: 'مدفوع', en: 'Paid' },
  overdue: { ar: 'متأخر', en: 'Overdue' },
};
const STATUS_TONE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  paid: 'bg-emerald-50 text-emerald-700',
  overdue: 'bg-rose-50 text-rose-700',
};

export default function DoctorInvoicesScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useUserRole();
  const { invoices = [], loading: isLoading } = useOfficeInvoices(user?.uid);

  const doctorIds = useMemo(
    () => Array.from(new Set(invoices.map((i) => i.doctorId).filter(Boolean))) as string[],
    [invoices],
  );
  const { data: doctorNames = {} } = useQuery({
    queryKey: ['invoice-doctors', doctorIds],
    enabled: doctorIds.length > 0,
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'user_roles'));
      const map: Record<string, string> = {};
      snap.docs.forEach((d) => {
        const u = d.data() as Record<string, unknown>;
        if (u.name && doctorIds.includes(String(u.userId))) map[String(u.userId)] = String(u.name);
      });
      return map;
    },
    staleTime: 120_000,
  });

  const setStatus = (id: string, status: string) => {
    updateInvoiceStatus(id, status as Parameters<typeof updateInvoiceStatus>[1])
      .then(() => toast.success(ar ? 'تم تحديث الحالة' : 'Status updated'))
      .catch(() => toast.error(ar ? 'فشل التحديث' : 'Update failed'));
  };

  return (
    <Screen>
      <Text className="text-xl font-extrabold text-slate-800">
        {ar ? 'فواتير الأطباء' : 'Doctor Invoices'}
      </Text>
      <Text className="mt-0.5 text-xs text-slate-500">
        {invoices.length} {ar ? 'فاتورة' : 'invoices'}
      </Text>

      {isLoading ? (
        <Spinner size="small" />
      ) : invoices.length === 0 ? (
        <View className="items-center py-16">
          <FileText size={48} color="#CBD5E1" strokeWidth={1.4} />
          <Text className="mt-3 text-sm text-slate-400">{ar ? 'لا توجد فواتير بعد' : 'No invoices yet'}</Text>
        </View>
      ) : (
        <View className="mt-4 gap-3 pb-6">
          {invoices.map((inv) => {
            const status = inv.status ?? 'pending';
            const tone = STATUS_TONE[status] ?? STATUS_TONE.pending;
            const label = STATUS_LABELS[status] ?? STATUS_LABELS.pending;
            return (
              <Card key={inv.id}>
                <View className="flex-row items-center justify-between gap-2">
                  <View className="min-w-0 flex-1">
                    <Text className="truncate text-sm font-bold text-slate-800">
                      {doctorNames[inv.doctorId] || inv.doctorId.slice(0, 8)}
                    </Text>
                    <Text className="text-[11px] text-slate-400">
                      {invoiceItemCount(inv)} {ar ? 'صنف' : 'items'} · {inv.id.slice(0, 8)}
                    </Text>
                  </View>
                  <View className={cn('shrink-0 rounded-full px-2.5 py-1', tone)}>
                    <Text className="text-[10px] font-bold">
                      {ar ? label.ar : label.en}
                    </Text>
                  </View>
                </View>
                {inv.totalUSD != null && inv.totalUSD > 0 && (
                  <Text className="mt-2 text-sm font-extrabold text-primary">
                    ${inv.totalUSD.toFixed(2)}
                  </Text>
                )}
                {inv.totalIQD != null && inv.totalIQD > 0 && (
                  <Text className="mt-2 text-sm font-extrabold text-primary">
                    {inv.totalIQD.toLocaleString()} د.ع
                  </Text>
                )}
                <View className="mt-2.5 flex-row gap-1.5">
                  {(['paid', 'pending', 'overdue'] as const).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={status === s ? 'primary' : 'outline'}
                      title={ar ? STATUS_LABELS[s].ar : STATUS_LABELS[s].en}
                      onPress={() => setStatus(inv.id, s)}
                      className="flex-1"
                    />
                  ))}
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
