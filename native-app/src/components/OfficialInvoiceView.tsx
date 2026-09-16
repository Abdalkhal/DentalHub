import { useMemo } from 'react';
import { Image, View } from 'react-native';
import { ReceiptText, Building2, Phone, MapPin, Package, StickyNote, User } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { useProducts, useSignedImageUrls } from '@/lib/products';
import type { InvoiceDoc, InvoiceStatus } from '@/integrations/firebase/types';
import { cn } from '@/lib/utils';

const TEAL = '#0E6E66';

export const STATUS_META: Record<InvoiceStatus, { ar: string; en: string }> = {
  pending: { ar: 'قيد الانتظار', en: 'Pending' },
  confirmed: { ar: 'تم التأكيد', en: 'Confirmed' },
  shipped: { ar: 'تم الشحن', en: 'Shipped' },
  delivered: { ar: 'تم التسليم', en: 'Delivered' },
  rejected: { ar: 'مرفوضة', en: 'Rejected' },
};

function fmtIqd(n: number): string {
  return `${n.toLocaleString()} د.ع`;
}
function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}
export function fmtDate(ts: { toDate?: () => Date } | null | undefined, ar: boolean): string {
  if (!ts?.toDate) return '';
  const d = ts.toDate();
  return d.toLocaleDateString(ar ? 'ar' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
}

function InfoCell({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <View className="w-1/2 border-b border-slate-100 px-4 py-3">
      <Text className="mb-0.5 text-[11px] font-bold text-slate-400">{label}</Text>
      <Text
        numberOfLines={1}
        className="text-sm font-semibold text-slate-800"
        style={ltr ? { writingDirection: 'ltr', textAlign: 'left' } : undefined}
      >
        {value}
      </Text>
    </View>
  );
}

export function OfficialInvoiceView({
  invoice: inv,
  storeName,
  storeType,
  storePhone,
  storeAddress,
  ar,
}: {
  invoice: InvoiceDoc;
  storeName: string;
  /** Defaults to "Medical Supplies Store" — pass this for any non-supply
   * seller (implant company, lab, …) so the invoice doesn't mislabel them. */
  storeType?: string;
  storePhone: string;
  storeAddress: string;
  ar: boolean;
}) {
  const { data: products = [] } = useProducts();
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const imagePaths = useMemo(
    () => inv.items.map((it) => productById.get(it.productId)?.images?.[0]).filter((x): x is string => !!x),
    [inv.items, productById],
  );
  const { data: imageUrlMap = {} } = useSignedImageUrls(imagePaths);
  const imageOf = (productId: string) => {
    const path = productById.get(productId)?.images?.[0];
    return path ? imageUrlMap[path] : undefined;
  };

  const meta = STATUS_META[inv.status];
  const location = [inv.doctorCity, inv.doctorAddress].filter(Boolean).join('، ');
  const missingLabel = ar ? 'غير مدخل' : 'Not provided';
  const confirmDate = inv.confirmedAt || inv.createdAt;
  const iqdTotal = inv.items.filter((i) => i.currency === 'IQD').reduce((s, i) => s + i.price * i.quantity, 0);
  const usdTotal = inv.items.filter((i) => i.currency !== 'IQD').reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <View className="gap-4">
      {/* Store header */}
      <View className="rounded-3xl p-5" style={{ backgroundColor: TEAL }}>
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-1.5">
              <ReceiptText size={13} color="rgba(255,255,255,0.8)" />
              <Text className="text-[11px]" style={{ color: 'rgba(255,255,255,0.8)', writingDirection: 'ltr' }}>
                {inv.orderNumber}
              </Text>
            </View>
            <Text numberOfLines={1} className="mt-1.5 text-xl font-extrabold text-white">
              {storeName}
            </Text>
            <View className="mt-1 flex-row items-center gap-1.5">
              <Building2 size={13} color="rgba(255,255,255,0.8)" />
              <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {storeType || (ar ? 'مكتب المستلزمات الطبية' : 'Medical Supplies Store')}
              </Text>
            </View>
          </View>
          <View className="shrink-0 items-end gap-1.5">
            <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <Text className="text-[10px] font-bold text-white">{ar ? meta.ar : meta.en}</Text>
            </View>
            <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <Text className="text-[10px] font-bold text-white">
                {ar ? `تأكيد: ${fmtDate(confirmDate, ar)}` : `Confirmed: ${fmtDate(confirmDate, ar)}`}
              </Text>
            </View>
          </View>
        </View>

        <View
          className="mt-3 flex-row flex-wrap gap-x-4 gap-y-1 border-t pt-3"
          style={{ borderColor: 'rgba(255,255,255,0.15)' }}
        >
          <View className="flex-row items-center gap-1.5">
            <Phone size={13} color="rgba(255,255,255,0.85)" />
            <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {storePhone || missingLabel}
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <MapPin size={13} color="rgba(255,255,255,0.85)" />
            <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {storeAddress || missingLabel}
            </Text>
          </View>
        </View>
      </View>

      {/* Doctor information */}
      <View className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        <View className="flex-row items-center gap-2 border-b border-slate-100 px-4 py-3">
          <User size={16} color="#94A3B8" />
          <Text className="text-sm font-bold text-slate-700">{ar ? 'معلومات الطبيب' : 'Doctor Information'}</Text>
        </View>
        <View className="flex-row flex-wrap">
          <InfoCell label={ar ? 'اسم الطبيب' : 'Doctor Name'} value={inv.doctorName} />
          <InfoCell label={ar ? 'اسم العيادة' : 'Clinic Name'} value={inv.clinicName || inv.doctorName} />
          <InfoCell label={ar ? 'رقم الهاتف' : 'Phone Number'} value={inv.doctorPhone || missingLabel} ltr />
          <InfoCell label={ar ? 'الموقع / العنوان' : 'Delivery Location'} value={location || missingLabel} />
        </View>
      </View>

      {/* Items */}
      <View className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        {inv.items.map((item, idx) => (
          <View
            key={`${item.productId}-${idx}`}
            className={cn(
              'flex-row items-center gap-3 px-4 py-3',
              idx < inv.items.length - 1 && 'border-b border-slate-50',
            )}
          >
            {imageOf(item.productId) ? (
              <Image source={{ uri: imageOf(item.productId) }} className="h-11 w-11 rounded-lg bg-slate-100" />
            ) : (
              <View className="h-11 w-11 items-center justify-center rounded-lg bg-slate-100">
                <Package size={18} color="#94A3B8" />
              </View>
            )}
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="text-sm font-semibold text-slate-800">
                {item.name}
              </Text>
              <Text className="text-[11px] text-slate-400" style={{ writingDirection: 'ltr', textAlign: 'left' }}>
                {item.currency === 'IQD' ? fmtIqd(item.price) : fmtUsd(item.price)} × {item.quantity}
              </Text>
            </View>
            <Text className="text-sm font-extrabold" style={{ color: TEAL, writingDirection: 'ltr' }}>
              {item.currency === 'IQD' ? fmtIqd(item.price * item.quantity) : fmtUsd(item.price * item.quantity)}
            </Text>
          </View>
        ))}
      </View>

      {/* Summary */}
      <View className="rounded-2xl border border-slate-100 bg-white p-4">
        <Text className="text-sm font-bold text-slate-700">{ar ? 'ملخص الفاتورة' : 'Invoice summary'}</Text>
        <View className="mt-3 gap-2.5">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-slate-500">{ar ? 'الإجمالي بالدينار' : 'Total (IQD)'}</Text>
            <Text className="text-sm font-semibold" style={{ writingDirection: 'ltr' }}>
              {fmtIqd(iqdTotal)}
            </Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-slate-500">{ar ? 'الإجمالي بالدولار' : 'Total (USD)'}</Text>
            <Text className="text-sm font-semibold" style={{ writingDirection: 'ltr' }}>
              {fmtUsd(usdTotal)}
            </Text>
          </View>
          {!!inv.note && (
            <View className="mt-1 border-t border-dashed border-slate-200 pt-3">
              <View className="mb-1 flex-row items-center gap-1">
                <StickyNote size={13} color="#94A3B8" />
                <Text className="text-[11px] font-bold text-slate-400">{ar ? 'ملاحظة الطبيب' : 'Doctor note'}</Text>
              </View>
              <Text className="text-sm text-slate-600">{inv.note}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
