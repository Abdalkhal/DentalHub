import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Share, View, type LayoutChangeEvent } from 'react-native';
import { Check, FileText, Hash, Layers, Paintbrush, Ruler, Share2, Smile, Syringe, X, type LucideIcon } from 'lucide-react-native';

import { Text } from '@/components/ui';
import {
  MATERIALS,
  WORK_TYPES,
  MANUFACTURING_METHODS,
  FRAMEWORK_CREATION,
  VITA_SHADES,
  VITA_3D_SHADES,
  VITA_BLEACH_SHADES,
  classifyShade,
} from '@/lib/dentalConfig';
import { deriveOrderLines, deriveWorkDetailGroups, cleanDoctorNotes, resolveOrderTotal, type OrderLine } from '@/lib/orderLines';
import { FDI_UPPER, FDI_LOWER, UPPER_POS, LOWER_POS } from '@/components/DentalArch';
import type { Order, OrderStatus } from '@/lib/ordersStore';

// A faithful port of the web app's OrderInvoiceModal (src/components/OrderInvoiceModal.tsx)
// — tapping a case anywhere in the app (labs-office.tsx's dashboard,
// orders.tsx's incoming-orders list) opens this directly, matching the "tap
// the row, no separate view button" behavior web's own table has via its
// row's "عرض" action. Left out versus web: the "طباعة" print action (would
// need a full second HTML template) and the scanner-file / attachments
// sections — `fileUrl` is deliberately never written by this app (see
// ordersStore.ts's attachOrderFile comment; only `filePath` is set, which
// needs a signed-URL resolution step this modal doesn't have), so that
// section is dead code in practice, and attachments are effectively unused
// by orders created from either "New Order" screen. "مشاركة" (share) is kept
// via RN's Share sheet, using the same text summary web builds.

export const LAB_STATUS_AR: Record<OrderStatus, string> = {
  new: 'جديد',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتمل',
  delayed: 'متأخر',
};
export const LAB_STATUS_EN: Record<OrderStatus, string> = {
  new: 'New',
  in_progress: 'In Progress',
  completed: 'Completed',
  delayed: 'Delayed',
};

export function formatShortDate(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

const C = {
  deepBlue: '#14539E',
  lightBlue: '#DCEAFB',
  lightBlueSoft: '#EEF6FD',
  lightBlueText: '#5B82B5',
  gold: '#C9A227',
};

const MATERIAL_LABEL = Object.fromEntries(MATERIALS.map((m) => [m.id, { ar: m.ar, en: m.en }]));
const WORK_TYPE_LABEL = Object.fromEntries(WORK_TYPES.map((w) => [w.id, { ar: w.ar, en: w.en }]));
const MANUFACTURING_LABEL = Object.fromEntries(MANUFACTURING_METHODS.map((m) => [m.id, { ar: m.ar, en: m.en }]));
const FRAMEWORK_LABEL = Object.fromEntries(FRAMEWORK_CREATION.map((f) => [f.id, { ar: f.ar, en: f.en }]));
const SHADE_HEX = Object.fromEntries([...VITA_SHADES, ...VITA_3D_SHADES, ...VITA_BLEACH_SHADES].map((s) => [s.code, s.hex]));
const SHADE_SYSTEMS: Record<string, { ar: string; en: string }> = {
  classical: { ar: 'VITA Classical', en: 'VITA Classical' },
  '3d': { ar: 'VITA 3D-Master', en: 'VITA 3D-Master' },
  bleach: { ar: 'Bleach', en: 'Bleach' },
  others: { ar: 'أخرى', en: 'Other' },
};
const IMPLANT_CONNECTION: Record<string, { ar: string; en: string }> = {
  internal_hex: { ar: 'سداسي داخلي', en: 'Internal Hex' },
  external_hex: { ar: 'سداسي خارجي', en: 'External Hex' },
  conical: { ar: 'مخروطي', en: 'Conical' },
  morse_taper: { ar: 'Morse Taper', en: 'Morse Taper' },
  internal_octagon: { ar: 'ثماني داخلي', en: 'Internal Octagon' },
};
const IMPLANT_LEVEL: Record<string, { ar: string; en: string }> = {
  implant: { ar: 'مستوى الزرعة', en: 'Implant Level' },
  multi_unit: { ar: 'مستوى مالتي يونيت', en: 'Multi-Unit' },
};
const IMPLANT_RETENTION: Record<string, { ar: string; en: string }> = {
  screw: { ar: 'تثبيت بالبرغي', en: 'Screw-Retained' },
  cement: { ar: 'تثبيت بالإسمنت', en: 'Cement-Retained' },
};
const ALIGNER_TREATMENT: Record<string, { ar: string; en: string }> = {
  comprehensive: { ar: 'شامل', en: 'Comprehensive' },
  express: { ar: 'سريع', en: 'Express' },
  retention: { ar: 'مثبّت', en: 'Retention' },
};
const ALIGNER_ARCH: Record<string, { ar: string; en: string }> = {
  upper: { ar: 'علوي', en: 'Upper' },
  lower: { ar: 'سفلي', en: 'Lower' },
  both: { ar: 'كلاهما', en: 'Both' },
};
const ALIGNER_WEAR: Record<string, { ar: string; en: string }> = {
  '7days': { ar: 'كل 7 أيام', en: 'Every 7 days' },
  '10days': { ar: 'كل 10 أيام', en: 'Every 10 days' },
  '14days': { ar: 'كل 14 يوماً', en: 'Every 14 days' },
};
const TITANIUM_TYPE: Record<string, { ar: string; en: string }> = {
  removable_overdenture: { ar: 'طقم قابل للإزالة', en: 'Removable Overdenture' },
  fixed_framework: { ar: 'هيكل ثابت', en: 'Fixed Framework' },
};

function fmtNum(n: number): string {
  return (n ?? 0).toLocaleString('en-US');
}

function fmtAmount(n: number, cur?: 'USD' | 'IQD'): string {
  const value = Number(n) || 0;
  if (cur === 'USD') return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${fmtNum(Math.round(value))} د.ع`;
}

function itemUnitPrice(it: OrderLine, fallbackTotal: number): number {
  return Number(it.unitPrice) || Number(it.price) || fallbackTotal || 0;
}

function itemRowTotal(it: OrderLine, fallbackTotal: number): number {
  const unitPrice = itemUnitPrice(it, fallbackTotal);
  return Number(it.totalPrice) || Number(it.total) || unitPrice * (Number(it.quantity) || 1);
}

function fmtRowTotal(it: OrderLine, fallbackTotal: number): string {
  const total = itemRowTotal(it, fallbackTotal);
  if (it.currency === 'USD') return `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${fmtNum(Math.round(total))} د.ع`;
}

function formatInvoiceDate(dateStr: string, ar: boolean): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(ar ? 'ar-IQ' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Read-only mirror of the doctor's own tooth-charting picker
// (SendCaseModal.tsx's OdontogramArch / web's IncomingOrderRxModal's
// RxArch) — a still-unconfirmed incoming case carries no price (see
// `isUnconfirmedIncoming` below), so the lab needs this instead to know
// *which tooth* needs *which* treatment before it can price anything.
type RxWorkTypeKey = 'crown' | 'bridge' | 'veneer' | 'inlay';
const RX_WORK_TYPE_META: Record<RxWorkTypeKey, { ar: string; en: string; dot: string }> = {
  crown: { ar: 'تاج', en: 'Crown', dot: '#3B82F6' },
  bridge: { ar: 'جسر', en: 'Bridge', dot: '#22C55E' },
  veneer: { ar: 'فينير', en: 'Veneer', dot: '#A855F7' },
  inlay: { ar: 'حشوة داخلية/خارجية', en: 'Inlay/Onlay', dot: '#F97316' },
};
const RX_WORK_TYPE_ORDER: RxWorkTypeKey[] = ['crown', 'bridge', 'veneer', 'inlay'];

function RxOdontogramArch({ jaw, teeth }: { jaw: 'upper' | 'lower'; teeth: Record<number, RxWorkTypeKey> }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });

  const fdiList = jaw === 'upper' ? FDI_UPPER : FDI_LOWER;
  const posMap = jaw === 'upper' ? UPPER_POS : LOWER_POS;
  const archSrc = jaw === 'upper' ? require('../../assets/home/arch-upper.png') : require('../../assets/home/arch-lower.png');

  return (
    // `direction: 'ltr'` (matching DentalArch.tsx) keeps the absolute tooth
    // markers from being mirrored under forced Arabic RTL layout.
    <View onLayout={onLayout} style={{ width: '100%', aspectRatio: 4 / 3, direction: 'ltr' }}>
      <Image source={archSrc} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="contain" />
      {size.width > 0 &&
        fdiList.map((n) => {
          const pos = posMap[n];
          if (!pos) return null;
          const lx = 50 + (pos[0] - 50) * 1.22;
          const ly = 50 + (pos[1] - 50) * 1.18;
          const cx = (lx / 100) * size.width;
          const cy = (ly / 100) * size.height;
          const wt = teeth[n];
          const meta = wt ? RX_WORK_TYPE_META[wt] : null;
          return (
            <View
              key={n}
              style={{
                position: 'absolute',
                left: cx - 12,
                top: cy - 12,
                width: 24,
                height: 24,
                borderRadius: 12,
                borderWidth: 1.5,
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: meta ? meta.dot : '#E2E8F0',
                backgroundColor: meta ? meta.dot : '#F8FAFC',
              }}
            >
              <Text style={{ fontSize: 8, fontWeight: '700', color: meta ? '#FFFFFF' : '#94A3B8' }}>{n}</Text>
            </View>
          );
        })}
    </View>
  );
}

function CaseBox({ label, value }: { label: string; value?: string }) {
  return (
    <View className="w-[31%] gap-0.5 rounded-xl bg-white p-2.5" style={{ borderWidth: 1, borderColor: C.lightBlue }}>
      <Text className="text-[9px] font-bold uppercase" style={{ color: C.lightBlueText }}>{label}</Text>
      <Text numberOfLines={1} className="text-xs font-semibold text-slate-800">{value || '-'}</Text>
    </View>
  );
}

function DetailChip({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View className="w-[31%] rounded-xl p-2.5" style={{ backgroundColor: C.lightBlueSoft, borderWidth: 1, borderColor: C.lightBlue }}>
      <Text className="mb-0.5 text-[9px] font-bold" style={{ color: C.lightBlueText }}>{label}</Text>
      <Text numberOfLines={1} className="text-xs font-semibold text-slate-800">{value}</Text>
    </View>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <View className="overflow-hidden rounded-2xl" style={{ borderWidth: 1, borderColor: C.lightBlue }}>
      <View className="flex-row items-center gap-1.5 px-4 py-2.5" style={{ backgroundColor: C.lightBlueSoft, borderBottomWidth: 1, borderColor: C.lightBlue }}>
        <Icon size={13} color={C.deepBlue} />
        <Text className="text-[11px] font-bold uppercase" style={{ color: C.lightBlueText }}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export function CaseDetailModal({
  ar,
  order,
  onClose,
  labName,
  onConfirm,
}: {
  ar: boolean;
  order: Order;
  onClose: () => void;
  labName?: string;
  /** Rendered as a "تأكيد الحالة" footer button, only shown for a case the
   * lab hasn't priced yet (`source === 'incoming_doctor_case'`) — the doctor
   * who sent it has no way to set a price, so that pricing table below is
   * hidden here too and replaced by this button, which routes to "New Order"
   * pre-filled to let the lab actually price and confirm the case. */
  onConfirm?: () => void;
}) {
  // Flips to "internal" once the lab confirms (new-lab-order.tsx), so this
  // only ever applies to a still-unpriced, just-arrived doctor case.
  const isUnconfirmedIncoming = order.source === 'incoming_doctor_case';
  const workDetailGroups = deriveWorkDetailGroups(order);
  const selectedShade = order.shade ? order.shade.trim() : '';
  const shadeTab = selectedShade ? classifyShade(selectedShade) : null;
  const shadeHex = selectedShade ? SHADE_HEX[selectedShade] : undefined;
  const shadeSystemLabel = shadeTab && shadeTab !== 'others' ? (ar ? SHADE_SYSTEMS[shadeTab].ar : SHADE_SYSTEMS[shadeTab].en) : null;

  const labTitle = labName || (ar ? 'مختبر دنت هب' : 'Dent Hub Lab');
  const items = deriveOrderLines(order);
  const finalAmount = resolveOrderTotal(order);
  const orderCurrency: 'USD' | 'IQD' = order.currency === 'USD' ? 'USD' : 'IQD';
  const totalUnits = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
  const usdTotal = items.filter((i) => i.currency !== 'IQD').reduce((s, i) => s + itemRowTotal(i, finalAmount), 0);
  const grandTotalLabel = fmtAmount(finalAmount, orderCurrency);
  const showUsdSecondary = orderCurrency !== 'USD' && usdTotal > 0;
  const notes = cleanDoctorNotes(order.notes);

  const hasImplantDetails = order.implantCompany || order.implantSystem || order.implantConnection || order.implantPlatform || order.implantLevel;
  const hasAlignerDetails = order.alignerTreatmentType || order.alignerArch || order.alignerScans || order.alignerCount;

  const rxTeeth: Record<number, RxWorkTypeKey> = {};
  Object.entries(order.rxTeeth ?? {}).forEach(([n, t]) => {
    if (t === 'crown' || t === 'bridge' || t === 'veneer' || t === 'inlay') rxTeeth[Number(n)] = t;
  });
  const rxToothItems = (order.rxData?.toothItems as Record<string, string[]> | undefined) ?? {};
  // Kept visible after confirmation too (not gated on `isUnconfirmedIncoming`
  // like the pricing table/confirm button above) — the tooth chart the
  // doctor drew stays useful for production long after the case is priced.
  const hasOdontogram = Object.keys(rxTeeth).length > 0 || Object.keys(rxToothItems).length > 0;

  const handleShare = () => {
    const lines = items.map((i) => `• ${i.name} ×${i.quantity} — ${fmtRowTotal(i, finalAmount)}`);
    const extra: string[] = [];
    if (order.shade) extra.push(ar ? `درجة اللون: ${order.shade}` : `Shade: ${order.shade}`);
    if (notes) extra.push(ar ? `ملاحظات: ${notes}` : `Notes: ${notes}`);
    const text = [
      ar ? 'فاتورة' : 'Invoice',
      `${ar ? 'رقم الطلب' : 'Order #'} ${order.orderNumber}`,
      `${ar ? 'رقم الحالة' : 'Case'} ${order.caseId}`,
      `${ar ? 'الطبيب' : 'Doctor'}: ${order.doctor}`,
      `${ar ? 'المريض' : 'Patient'}: ${order.patient}`,
      ...lines,
      ...extra,
      ar ? `الإجمالي: ${grandTotalLabel}` : `Grand Total: ${grandTotalLabel}`,
    ].join('\n');
    Share.share({ message: text }).catch(() => {});
  };

  return (
    <Modal visible transparent animationType="fade">
      <View className="flex-1 justify-end bg-black/40">
        <View className="w-full rounded-t-3xl bg-white" style={{ maxHeight: '92%' }}>
          <View className="flex-row gap-2 border-b border-slate-100 p-4">
            <Pressable onPress={handleShare} className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-slate-200">
              <Share2 size={15} color="#334155" />
              <Text className="text-sm font-bold text-slate-700">{ar ? 'مشاركة' : 'Share'}</Text>
            </Pressable>
            <Pressable onPress={onClose} className="h-11 flex-row items-center justify-center gap-2 rounded-xl border border-slate-200 px-4">
              <X size={15} color="#64748B" />
              <Text className="text-sm font-bold text-slate-500">{ar ? 'إغلاق' : 'Close'}</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-8">
            <View className="p-5" style={{ backgroundColor: C.deepBlue }}>
              <View className="flex-row flex-wrap items-start justify-between gap-3">
                <View className="min-w-0 flex-1">
                  <Text className="text-lg font-extrabold text-white">{labTitle}</Text>
                  <Text className="mt-0.5 text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {ar ? 'فاتورة طلب معملي' : 'Lab Order Invoice'}
                  </Text>
                </View>
                <View className="shrink-0 items-end">
                  <Text className="text-[10px] font-bold uppercase" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {ar ? 'رقم الطلب / الحالة' : 'Order / Case'}
                  </Text>
                  <Text className="text-lg font-extrabold text-white" style={{ writingDirection: 'ltr' }}>{order.orderNumber}</Text>
                  <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.8)', writingDirection: 'ltr' }}>
                    {ar ? `حالة #${order.caseId}` : `Case #${order.caseId}`}
                  </Text>
                </View>
              </View>
            </View>

            <View className="gap-4 px-5 py-5">
              <SectionCard icon={Hash} title={ar ? 'بيانات الحالة' : 'Case Details'}>
                <View className="flex-row flex-wrap gap-2 p-3">
                  <CaseBox label={ar ? 'رقم الحالة' : 'Case ID'} value={`#${order.caseId}`} />
                  <CaseBox label={ar ? 'رقم الطلب' : 'Order No.'} value={order.orderNumber} />
                  <CaseBox label={ar ? 'تاريخ الاستلام' : 'Received'} value={formatInvoiceDate(order.receivedDate, ar)} />
                  <CaseBox label={ar ? 'تاريخ الإخراج' : 'Delivery'} value={formatInvoiceDate(order.dueDate, ar)} />
                  <CaseBox label={ar ? 'الطبيب' : 'Doctor'} value={order.doctor} />
                  <CaseBox label={ar ? 'المريض' : 'Patient'} value={order.patient} />
                  <CaseBox label={ar ? 'العيادة' : 'Clinic'} value={order.clinic || '-'} />
                </View>
              </SectionCard>

              {hasOdontogram && (
                <SectionCard icon={Layers} title={ar ? 'مخطط الأسنان (Odontogram)' : 'Odontogram'}>
                  <View className="gap-2 p-3">
                    <RxOdontogramArch jaw="upper" teeth={rxTeeth} />
                    <RxOdontogramArch jaw="lower" teeth={rxTeeth} />
                    <View className="flex-row flex-wrap justify-center gap-1.5 pt-1">
                      {RX_WORK_TYPE_ORDER.map((k) => {
                        const meta = RX_WORK_TYPE_META[k];
                        const count = Object.values(rxTeeth).filter((t) => t === k).length;
                        return (
                          <View key={k} className="flex-row items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1">
                            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: meta.dot }} />
                            <Text className="text-[10px] font-bold text-slate-600">
                              {ar ? meta.ar : meta.en} · {count}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                  {Object.keys(rxToothItems).length > 0 && (
                    <View className="gap-2 border-t border-slate-100 p-3">
                      <Text className="text-[11px] font-bold uppercase" style={{ color: C.lightBlueText }}>
                        {ar ? 'تفاصيل كل سن' : 'Per-Tooth Details'}
                      </Text>
                      {Object.entries(rxToothItems).map(([tooth, labels]) => (
                        <View key={tooth} className="flex-row items-start gap-2">
                          <View className="h-6 w-6 items-center justify-center rounded-full bg-slate-100">
                            <Text style={{ fontSize: 10 }} className="font-bold text-slate-600">{tooth}</Text>
                          </View>
                          <View className="flex-1 flex-row flex-wrap gap-1.5">
                            {labels.map((label, i) => (
                              <View key={i} className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1">
                                <Text className="text-[11px] font-semibold text-slate-700">{label}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </SectionCard>
              )}

              <SectionCard icon={Paintbrush} title={ar ? 'درجة اللون' : 'Shade'}>
                <View className="p-3">
                  {selectedShade ? (
                    <View
                      className="flex-row items-center gap-2.5 self-start rounded-full px-4 py-2.5"
                      style={{ backgroundColor: C.lightBlueSoft, borderWidth: 1, borderColor: C.lightBlue }}
                    >
                      <View className="h-6 w-6 rounded-full border border-slate-300" style={{ backgroundColor: shadeHex ?? '#E8D5B7' }} />
                      <Text className="text-sm font-extrabold text-slate-800">{selectedShade}</Text>
                      {!!shadeSystemLabel && (
                        <Text className="text-[11px] font-semibold" style={{ color: C.lightBlueText }}>{shadeSystemLabel}</Text>
                      )}
                    </View>
                  ) : (
                    <Text className="rounded-lg px-3 py-2 text-xs font-medium" style={{ backgroundColor: C.lightBlueSoft, color: C.lightBlueText }}>
                      {ar ? 'لم تُحدَّد درجة لون لهذا الطلب.' : 'No shade has been set for this order.'}
                    </Text>
                  )}
                </View>
              </SectionCard>

              {workDetailGroups.map((g, gi) => {
                const materialMeta = g.material ? MATERIAL_LABEL[g.material] : null;
                const workTypeMeta = g.workType ? WORK_TYPE_LABEL[g.workType] : null;
                const methodMeta = g.manufacturingMethod ? MANUFACTURING_LABEL[g.manufacturingMethod] : null;
                const frameworkMeta = g.frameworkCreation ? FRAMEWORK_LABEL[g.frameworkCreation] : null;
                const titaniumMeta = g.titaniumFrameworkType ? TITANIUM_TYPE[g.titaniumFrameworkType] : null;
                const title =
                  workDetailGroups.length > 1
                    ? `${ar ? 'المادة وتفاصيل العمل' : 'Material & Work Details'} — ${
                        materialMeta ? (ar ? materialMeta.ar : materialMeta.en) : g.lineNames[0] ?? gi + 1
                      }`
                    : ar
                      ? 'المادة وتفاصيل العمل'
                      : 'Material & Work Details';
                return (
                  <SectionCard key={g.key} icon={Layers} title={title}>
                    <View className="flex-row flex-wrap gap-2 p-3">
                      <DetailChip label={ar ? 'المادة' : 'Material'} value={materialMeta ? (ar ? materialMeta.ar : materialMeta.en) : order.workType} />
                      <DetailChip label={ar ? 'نوع العمل' : 'Work Type'} value={workTypeMeta ? (ar ? workTypeMeta.ar : workTypeMeta.en) : undefined} />
                      <DetailChip label={ar ? 'طريقة التصنيع' : 'Manufacturing'} value={methodMeta ? (ar ? methodMeta.ar : methodMeta.en) : undefined} />
                      <DetailChip label={ar ? 'إنشاء الهيكل' : 'Framework'} value={frameworkMeta ? (ar ? frameworkMeta.ar : frameworkMeta.en) : undefined} />
                      <DetailChip
                        label={ar ? 'نوع التثبيت' : 'Retention'}
                        value={order.implantRetention ? (ar ? IMPLANT_RETENTION[order.implantRetention]?.ar : IMPLANT_RETENTION[order.implantRetention]?.en) : undefined}
                      />
                      <DetailChip label={ar ? 'نوع الهيكل' : 'Framework Type'} value={titaniumMeta ? (ar ? titaniumMeta.ar : titaniumMeta.en) : undefined} />
                    </View>
                  </SectionCard>
                );
              })}

              {(!!hasImplantDetails || !!hasAlignerDetails) && (
              <SectionCard icon={Layers} title={ar ? 'تفاصيل إضافية' : 'Additional Details'}>
                {!!hasImplantDetails && (
                  <View className="gap-2 px-3 pb-3">
                    <View className="flex-row items-center gap-1">
                      <Syringe size={11} color={C.deepBlue} />
                      <Text className="text-[10px] font-bold" style={{ color: C.deepBlue }}>{ar ? 'تفاصيل الزرعة' : 'Implant Details'}</Text>
                    </View>
                    <View className="flex-row flex-wrap gap-2">
                      <DetailChip label={ar ? 'شركة الزرعة' : 'Company'} value={order.implantCompany} />
                      <DetailChip label={ar ? 'النظام' : 'System'} value={order.implantSystem} />
                      <DetailChip
                        label={ar ? 'الربط' : 'Connection'}
                        value={order.implantConnection ? (ar ? IMPLANT_CONNECTION[order.implantConnection]?.ar : IMPLANT_CONNECTION[order.implantConnection]?.en) : undefined}
                      />
                      <DetailChip label={ar ? 'المنصة' : 'Platform'} value={order.implantPlatform} />
                      <DetailChip
                        label={ar ? 'المستوى' : 'Level'}
                        value={order.implantLevel ? (ar ? IMPLANT_LEVEL[order.implantLevel]?.ar : IMPLANT_LEVEL[order.implantLevel]?.en) : undefined}
                      />
                      <DetailChip label="Scan Body" value={order.implantScanBody} />
                    </View>
                  </View>
                )}

                {!!hasAlignerDetails && (
                  <View className="gap-2 px-3 pb-3">
                    <View className="flex-row items-center gap-1">
                      <Smile size={11} color={C.deepBlue} />
                      <Text className="text-[10px] font-bold" style={{ color: C.deepBlue }}>{ar ? 'تفاصيل التقويم الشفاف' : 'Clear Aligner Details'}</Text>
                    </View>
                    <View className="flex-row flex-wrap gap-2">
                      <DetailChip
                        label={ar ? 'نوع العلاج' : 'Treatment'}
                        value={order.alignerTreatmentType ? (ar ? ALIGNER_TREATMENT[order.alignerTreatmentType]?.ar : ALIGNER_TREATMENT[order.alignerTreatmentType]?.en) : undefined}
                      />
                      <DetailChip
                        label={ar ? 'القوس' : 'Arch'}
                        value={order.alignerArch ? (ar ? ALIGNER_ARCH[order.alignerArch]?.ar : ALIGNER_ARCH[order.alignerArch]?.en) : undefined}
                      />
                      <DetailChip label={ar ? 'المسحات' : 'Scans'} value={order.alignerScans} />
                      <DetailChip label={ar ? 'العدد' : 'Count'} value={order.alignerCount} />
                      <DetailChip
                        label={ar ? 'بروتوكول الارتداء' : 'Wear Protocol'}
                        value={order.alignerWearProtocol ? (ar ? ALIGNER_WEAR[order.alignerWearProtocol]?.ar : ALIGNER_WEAR[order.alignerWearProtocol]?.en) : undefined}
                      />
                    </View>
                  </View>
                )}
              </SectionCard>
              )}

              {!isUnconfirmedIncoming && (
                <SectionCard
                  icon={Hash}
                  title={ar ? (order.pricingMode === 'mixed' ? 'جدول تسعير الوحدات المتعددة' : 'جدول التسعير') : order.pricingMode === 'mixed' ? 'Mixed Units Pricing' : 'Pricing'}
                >
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ minWidth: 480 }}>
                      <View className="flex-row px-4 py-2.5" style={{ backgroundColor: C.lightBlueSoft, borderBottomWidth: 1, borderColor: C.lightBlue }}>
                        <Text style={{ width: 190, color: C.lightBlueText }} className="text-[10px] font-bold">{ar ? 'العنصر' : 'Item'}</Text>
                        <Text style={{ width: 70, color: C.lightBlueText }} className="text-center text-[10px] font-bold">{ar ? 'العدد' : 'Units'}</Text>
                        <Text style={{ width: 110, color: C.lightBlueText }} className="text-center text-[10px] font-bold">{ar ? 'السعر' : 'Price'}</Text>
                        <Text style={{ width: 110, color: C.lightBlueText }} className="text-center text-[10px] font-bold">{ar ? 'الإجمالي' : 'Total'}</Text>
                      </View>
                      {items.map((it) => (
                        <View key={it.id} className="flex-row items-center px-4 py-3" style={{ borderBottomWidth: 1, borderColor: C.lightBlue }}>
                          <Text numberOfLines={1} style={{ width: 190 }} className="text-xs font-semibold text-slate-800">{it.name}</Text>
                          <Text style={{ width: 70, writingDirection: 'ltr' }} className="text-center text-xs font-bold text-slate-700">{it.quantity}</Text>
                          <Text style={{ width: 110, writingDirection: 'ltr' }} className="text-center text-[10px] text-slate-500">{fmtAmount(itemUnitPrice(it, finalAmount), it.currency)}</Text>
                          <Text style={{ width: 110, color: C.deepBlue, writingDirection: 'ltr' }} className="text-center text-xs font-extrabold">{fmtRowTotal(it, finalAmount)}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>

                  <View className="flex-row flex-wrap items-center justify-between gap-3 p-4" style={{ backgroundColor: C.lightBlueSoft, borderTopWidth: 1, borderColor: C.lightBlue }}>
                    <View>
                      <Text className="text-[10px] font-bold uppercase" style={{ color: C.gold }}>{ar ? 'إجمالي عدد الوحدات' : 'Total Units'}</Text>
                      <Text className="text-lg font-extrabold" style={{ color: C.deepBlue, writingDirection: 'ltr' }}>{fmtNum(totalUnits)}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-[10px] font-bold uppercase" style={{ color: C.gold }}>{ar ? 'الإجمالي الكلي' : 'Grand Total'}</Text>
                      <Text className="text-xl font-extrabold" style={{ color: C.gold, writingDirection: 'ltr' }}>{grandTotalLabel}</Text>
                      {showUsdSecondary && (
                        <Text className="text-xs font-semibold" style={{ color: C.lightBlueText, writingDirection: 'ltr' }}>
                          ≈ ${usdTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                      )}
                    </View>
                  </View>
                </SectionCard>
              )}

              {!!notes && (
                <SectionCard icon={FileText} title={ar ? 'ملاحظات' : 'Notes'}>
                  <Text className="p-3 text-sm text-slate-700">{notes}</Text>
                </SectionCard>
              )}

              <View className="flex-row items-center justify-between gap-2 border-t border-dashed pt-4" style={{ borderColor: C.lightBlue }}>
                <View className="flex-1 flex-row items-center gap-1.5">
                  <Ruler size={12} color="#94A3B8" />
                  <Text numberOfLines={1} className="flex-1 text-[11px] text-slate-400">
                    {ar ? 'وثيقة فاتورة رسمية' : 'Official invoice document'}
                  </Text>
                </View>
                <Text className="text-[11px] text-slate-400" style={{ writingDirection: 'ltr' }}>{labTitle}</Text>
              </View>
            </View>
          </ScrollView>

          {isUnconfirmedIncoming && onConfirm && (
            <View className="border-t border-slate-100 p-4">
              <Pressable
                onPress={onConfirm}
                className="h-12 flex-row items-center justify-center gap-2 rounded-xl bg-primary"
              >
                <Check size={16} color="#FFFFFF" />
                <Text className="text-sm font-extrabold text-white">
                  {ar ? 'تأكيد الحالة' : 'Confirm Case'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
