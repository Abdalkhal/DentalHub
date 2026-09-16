import { Pressable, Share, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MessageSquare, Printer, ReceiptText, Share2 } from 'lucide-react-native';

import { Screen, Text, Spinner } from '@/components/ui';
import { OfficialInvoiceView, STATUS_META, fmtDate } from '@/components/OfficialInvoiceView';
import { useInvoice } from '@/lib/invoices';
import { useUserRole } from '@/lib/useAuth';
import { sharePdf, invoiceHtml } from '@/lib/print';
import { useI18n } from '@/lib/i18n';
import { toast } from '@/lib/toast';

const TEAL = '#0E6E66';

function fmtIqd(n: number): string {
  return `${n.toLocaleString()} د.ع`;
}
function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

export default function InvoiceDetailScreen() {
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { invoice: inv, loading } = useInvoice(invoiceId);
  const { role } = useUserRole();

  const storeName = role?.name || (ar ? 'مكتب المستلزمات الطبية' : 'Medical Supplies Store');
  const storePhone = role?.phone || '';
  const storeAddress = [role?.address, role?.city].filter(Boolean).join('، ');
  // This invoice's seller is whichever account is viewing it — an implant
  // company selling implants should never be labeled a supplies office.
  const storeType =
    role?.accountType === 'implant'
      ? ar ? 'شركة زرعات' : 'Implant Company'
      : role?.accountType === 'lab'
        ? ar ? 'مختبر' : 'Laboratory'
        : undefined;

  if (loading) return <Spinner />;

  if (!inv) {
    return (
      <Screen>
        <View className="items-center py-16">
          <ReceiptText size={48} color="#CBD5E1" strokeWidth={1.4} />
          <Text className="mt-3 text-sm text-slate-400">{ar ? 'الفاتورة غير موجودة' : 'Invoice not found'}</Text>
        </View>
      </Screen>
    );
  }

  const iqdTotal = inv.items.filter((i) => i.currency === 'IQD').reduce((s, i) => s + i.price * i.quantity, 0);
  const usdTotal = inv.items.filter((i) => i.currency !== 'IQD').reduce((s, i) => s + i.price * i.quantity, 0);
  const missingLabel = ar ? 'غير مدخل' : 'Not provided';
  const location = [inv.doctorCity, inv.doctorAddress].filter(Boolean).join('، ');
  const statusLabel = ar ? STATUS_META[inv.status].ar : STATUS_META[inv.status].en;

  const handleShare = async () => {
    const lines = inv.items.map(
      (i) => `• ${i.name} ×${i.quantity} — ${i.currency === 'IQD' ? fmtIqd(i.price * i.quantity) : fmtUsd(i.price * i.quantity)}`,
    );
    const text = [
      ar ? 'فاتورة' : 'Invoice',
      inv.orderNumber,
      inv.doctorName,
      ...lines,
      ar ? `الإجمالي بالدينار: ${fmtIqd(iqdTotal)}` : `IQD total: ${fmtIqd(iqdTotal)}`,
      ar ? `الإجمالي بالدولار: ${fmtUsd(usdTotal)}` : `USD total: ${fmtUsd(usdTotal)}`,
    ].join('\n');
    try {
      await Share.share({ message: text });
    } catch {
      /* user cancelled */
    }
  };

  const handlePrint = async () => {
    const ok = await sharePdf(
      `Invoice-${inv.orderNumber}.pdf`,
      invoiceHtml({
        ar,
        title: ar ? 'فاتورة' : 'Invoice',
        meta: [
          { label: ar ? 'رقم الطلب' : 'Order #', value: inv.orderNumber },
          { label: ar ? 'الحالة' : 'Status', value: statusLabel },
          { label: ar ? 'تاريخ التأكيد' : 'Confirmed on', value: fmtDate(inv.confirmedAt || inv.createdAt, ar) || missingLabel },
          { label: ar ? 'اسم المكتب' : 'Store name', value: storeName },
          { label: ar ? 'نوع الحساب' : 'Account type', value: storeType || (ar ? 'مكتب المستلزمات الطبية' : 'Medical Supplies Store') },
          { label: ar ? 'هاتف المكتب' : 'Store phone', value: storePhone || missingLabel },
          { label: ar ? 'عنوان المكتب' : 'Store address', value: storeAddress || missingLabel },
          { label: ar ? 'اسم الطبيب' : 'Doctor name', value: inv.doctorName },
          { label: ar ? 'اسم العيادة' : 'Clinic name', value: inv.clinicName || inv.doctorName },
          { label: ar ? 'هاتف الطبيب' : 'Doctor phone', value: inv.doctorPhone || missingLabel },
          { label: ar ? 'موقع التسليم' : 'Delivery location', value: location || missingLabel },
        ],
        rows: inv.items.map((i) => ({
          name: i.name,
          detail: `${i.currency === 'IQD' ? fmtIqd(i.price) : fmtUsd(i.price)} × ${i.quantity}`,
          qty: i.quantity,
          price: i.currency === 'IQD' ? fmtIqd(i.price * i.quantity) : fmtUsd(i.price * i.quantity),
        })),
        totals: [
          { label: ar ? 'الإجمالي بالدينار' : 'Total (IQD)', value: fmtIqd(iqdTotal) },
          { label: ar ? 'الإجمالي بالدولار' : 'Total (USD)', value: fmtUsd(usdTotal) },
        ],
        note: inv.note ? { label: ar ? 'ملاحظة الطبيب' : 'Doctor note', value: inv.note } : undefined,
      }),
    );
    if (!ok) toast.error(ar ? 'تعذر إنشاء PDF' : 'Could not create PDF');
  };

  return (
    <Screen>
      <View className="flex-row gap-2">
        <Pressable
          onPress={handlePrint}
          className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-xl"
          style={{ backgroundColor: TEAL }}
        >
          <Printer size={16} color="#FFFFFF" />
          <Text className="text-sm font-bold text-white">{ar ? 'طباعة' : 'Print'}</Text>
        </Pressable>
        <Pressable
          onPress={handleShare}
          className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white"
        >
          <Share2 size={16} color="#334155" />
          <Text className="text-sm font-bold text-slate-700">{ar ? 'مشاركة' : 'Share'}</Text>
        </Pressable>
      </View>

      {!!inv.doctorId && (
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/messages',
              params: { with: inv.doctorId, withName: inv.doctorName },
            })
          }
          className="mt-2 h-11 flex-row items-center justify-center gap-2 rounded-xl bg-[#2563EB]"
        >
          <MessageSquare size={16} color="#FFFFFF" />
          <Text className="text-sm font-bold text-white">{ar ? 'مراسلة الطبيب' : 'Message doctor'}</Text>
        </Pressable>
      )}

      <View className="mt-4">
        <OfficialInvoiceView invoice={inv} storeName={storeName} storeType={storeType} storePhone={storePhone} storeAddress={storeAddress} ar={ar} />
      </View>
    </Screen>
  );
}
