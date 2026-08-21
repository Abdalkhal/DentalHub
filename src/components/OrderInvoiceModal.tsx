import { useMemo, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  X,
  Printer,
  Share2,
  ReceiptText,
  Hash,
  Paintbrush,
  Layers,
  FileText,
  Syringe,
  Smile,
  Ruler,
  MapPin,
  Phone,
  type LucideIcon,
} from "lucide-react";
import type { Order, PricingItem } from "@/lib/ordersStore";
import {
  MATERIALS,
  WORK_TYPES,
  MANUFACTURING_METHODS,
  FRAMEWORK_CREATION,
  VITA_SHADES,
} from "@/lib/dentalConfig";

type Props = {
  order: Order;
  labName?: string;
  labAddress?: string;
  labPhone?: string;
  onClose: () => void;
};

/** Deep blue + light blue + gold palette */
const C = {
  deepBlue: "#14539E",
  deepBlueDark: "#0F3D77",
  lightBlue: "#DCEAFB",
  lightBlueSoft: "#EEF6FD",
  lightBlueText: "#5B82B5",
  gold: "#C9A227",
};

const MATERIAL_LABEL: Record<string, { ar: string; en: string }> = Object.fromEntries(
  MATERIALS.map((m) => [m.id, { ar: m.ar, en: m.en }]),
);
const WORK_TYPE_LABEL: Record<string, { ar: string; en: string }> = Object.fromEntries(
  WORK_TYPES.map((w) => [w.id, { ar: w.ar, en: w.en }]),
);
const MANUFACTURING_LABEL: Record<string, { ar: string; en: string }> = Object.fromEntries(
  MANUFACTURING_METHODS.map((m) => [m.id, { ar: m.ar, en: m.en }]),
);
const FRAMEWORK_LABEL: Record<string, { ar: string; en: string }> = Object.fromEntries(
  FRAMEWORK_CREATION.map((f) => [f.id, { ar: f.ar, en: f.en }]),
);

const IMPLANT_CONNECTION: Record<string, { ar: string; en: string }> = {
  internal_hex: { ar: "سداسي داخلي", en: "Internal Hex" },
  external_hex: { ar: "سداسي خارجي", en: "External Hex" },
  conical: { ar: "مخروطي", en: "Conical" },
  morse_taper: { ar: "Morse Taper", en: "Morse Taper" },
  internal_octagon: { ar: "ثماني داخلي", en: "Internal Octagon" },
};

const IMPLANT_LEVEL: Record<string, { ar: string; en: string }> = {
  implant: { ar: "مستوى الزرعة", en: "Implant Level" },
  multi_unit: { ar: "مستوى مالتي يونيت", en: "Multi-Unit" },
};

const IMPLANT_RETENTION: Record<string, { ar: string; en: string }> = {
  screw: { ar: "تثبيت بالبرغي", en: "Screw-Retained" },
  cement: { ar: "تثبيت بالإسمنت", en: "Cement-Retained" },
};

const ALIGNER_TREATMENT: Record<string, { ar: string; en: string }> = {
  comprehensive: { ar: "شامل", en: "Comprehensive" },
  express: { ar: "سريع", en: "Express" },
  retention: { ar: "مثبّت", en: "Retention" },
};

const ALIGNER_ARCH: Record<string, { ar: string; en: string }> = {
  upper: { ar: "علوي", en: "Upper" },
  lower: { ar: "سفلي", en: "Lower" },
  both: { ar: "كلاهما", en: "Both" },
};

const ALIGNER_WEAR: Record<string, { ar: string; en: string }> = {
  "7days": { ar: "كل 7 أيام", en: "Every 7 days" },
  "10days": { ar: "كل 10 أيام", en: "Every 10 days" },
  "14days": { ar: "كل 14 يوماً", en: "Every 14 days" },
};

const TITANIUM_TYPE: Record<string, { ar: string; en: string }> = {
  removable_overdenture: { ar: "طقم قابل للإزالة", en: "Removable Overdenture" },
  fixed_framework: { ar: "هيكل ثابت", en: "Fixed Framework" },
};

function fmtNum(n: number): string {
  return (n ?? 0).toLocaleString("en-US");
}

function fmtAmount(n: number, cur?: "USD" | "IQD"): string {
  if (cur === "IQD") return `${fmtNum(Math.round(n || 0))} د.ع`;
  return `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtRowTotal(it: PricingItem): string {
  const total = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
  return it.currency === "IQD" ? `${fmtNum(Math.round(total))} د.ع` : `$${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatInvoiceDate(dateStr: string, lang: "ar" | "en"): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(lang === "ar" ? "ar-IQ" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function CaseBox({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div
      className="flex flex-col gap-0.5 rounded-xl px-3 py-2.5"
      style={{ border: `1px solid ${C.lightBlue}`, background: "#FFFFFF" }}
    >
      <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: C.lightBlueText }}>
        {label}
      </span>
      <span className="text-sm font-semibold text-slate-800 truncate">{value || "-"}</span>
    </div>
  );
}

function DetailChip({ label, value }: { label: string; value: ReactNode }) {
  if (!value) return null;
  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{ border: `1px solid ${C.lightBlue}`, background: C.lightBlueSoft }}
    >
      <p className="text-[10px] font-bold mb-0.5" style={{ color: C.lightBlueText }}>
        {label}
      </p>
      <p className="text-xs font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.lightBlue}` }}>
      <div
        className="flex items-center gap-1.5 px-4 py-2.5"
        style={{ background: C.lightBlueSoft, borderBottom: `1px solid ${C.lightBlue}` }}
      >
        <Icon className="size-3.5" style={{ color: C.deepBlue }} />
        <span
          className="text-[11px] font-bold uppercase tracking-wide"
          style={{ color: C.lightBlueText }}
        >
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

export function OrderInvoiceModal({ order, labName, labAddress, labPhone, onClose }: Props) {
  const { lang } = useI18n();
  const ar = lang === "ar";

  const materialMeta = order.material ? MATERIAL_LABEL[order.material] : null;
  const workTypeMeta = order.workTypeId ? WORK_TYPE_LABEL[order.workTypeId] : null;
  const methodMeta = order.manufacturingMethod ? MANUFACTURING_LABEL[order.manufacturingMethod] : null;
  const frameworkMeta = order.frameworkCreation ? FRAMEWORK_LABEL[order.frameworkCreation] : null;
  const titaniumMeta = order.titaniumFrameworkType ? TITANIUM_TYPE[order.titaniumFrameworkType] : null;
  const selectedShade = order.shade ? order.shade.trim() : "";

  const labTitle = labName || (ar ? "مختبر دنتال هب" : "Dental Hub Lab");
  const address = labAddress?.trim() || "";
  const phone = labPhone?.trim() || "";

  const items = useMemo(
    () => (order.pricingItems ?? []).filter((i) => i.name && String(i.name).trim() !== ""),
    [order.pricingItems],
  );
  const hasTable = items.length > 0;

  const totalUnits = hasTable
    ? items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)
    : order.unitsCount || 0;

  const usdTotal = hasTable
    ? items
        .filter((i) => i.currency !== "IQD")
        .reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0)
    : order.currency === "USD"
      ? order.price || 0
      : 0;

  const grandTotalLabel = fmtAmount(order.price ?? 0, order.currency);
  const showUsdSecondary = order.currency !== "USD" && usdTotal > 0;

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const lines = hasTable
      ? items.map((i) => `• ${i.name} ×${i.quantity} — ${fmtRowTotal(i)}`)
      : [`• ${order.workType} ×${totalUnits} — ${grandTotalLabel}`];

    const extra: string[] = [];
    if (order.shade) extra.push(ar ? `درجة اللون: ${order.shade}` : `Shade: ${order.shade}`);
    if (order.notes) extra.push(ar ? `ملاحظات: ${order.notes}` : `Notes: ${order.notes}`);

    const text = [
      ar ? "فاتورة" : "Invoice",
      `${ar ? "رقم الطلب" : "Order #"} ${order.orderNumber}`,
      `${ar ? "رقم الحالة" : "Case"} ${order.caseId}`,
      `${ar ? "الطبيب" : "Doctor"}: ${order.doctor}`,
      `${ar ? "المريض" : "Patient"}: ${order.patient}`,
      ...lines,
      ...extra,
      ar ? `الإجمالي: ${grandTotalLabel}` : `Grand Total: ${grandTotalLabel}`,
    ].join("\n");

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: ar ? "فاتورة طلب" : "Order Invoice", text });
      } catch {
        // user cancelled — ignore
      }
    } else {
      try {
        await navigator.clipboard?.writeText(text);
        toast.success(ar ? "تم نسخ ملخص الفاتورة" : "Invoice summary copied");
      } catch {
        toast.error(ar ? "تعذرت المشاركة" : "Share failed");
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="min-h-full flex items-start sm:items-center justify-center p-3 sm:p-6">
        <div
          className="w-full max-w-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Action bar */}
          <div className="flex items-center gap-2 mb-3 no-print">
            <button
              onClick={handlePrint}
              className="flex-1 h-11 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition shadow-sm hover:opacity-90"
              style={{ background: C.deepBlue }}
            >
              <Printer className="size-4" />
              {ar ? "طباعة الفاتورة" : "Print Invoice"}
            </button>
            <button
              onClick={handleShare}
              className="flex-1 h-11 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition shadow-sm"
            >
              <Share2 className="size-4" />
              {ar ? "حفظ كـ PDF / مشاركة" : "Save as PDF / Share"}
            </button>
            <button
              onClick={onClose}
              className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-slate-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-rose-50 hover:text-rose-600 transition shadow-sm"
              title={ar ? "إغلاق" : "Close"}
            >
              <X className="size-4" />
              {ar ? "إغلاق" : "Close"}
            </button>
          </div>

          {/* Invoice document */}
          <div
            id="order-invoice"
            dir={ar ? "rtl" : "ltr"}
            className="bg-white rounded-2xl shadow-2xl overflow-hidden"
            style={{ border: `1px solid ${C.lightBlue}` }}
          >
            {/* ===== Deep blue header ===== */}
            <div className="relative overflow-hidden text-white px-6 sm:px-8 py-6" style={{ background: C.deepBlue }}>
              <div className="absolute -top-14 -end-14 size-44 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-16 -start-10 size-40 rounded-full bg-white/5 blur-2xl" />

              {/* Top row: lab identity (address/phone stacked) + reference number */}
              <div className="relative flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="size-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                      <ReceiptText className="size-5" />
                    </span>
                    <div>
                      <p className="font-display font-extrabold text-lg leading-tight">{labTitle}</p>
                      <p className="text-xs text-white/80">
                        {ar ? "فاتورة طلب معملي" : "Lab Order Invoice"}
                      </p>
                    </div>
                  </div>
                  {/* Contact info stacked: address line 1, phone line 2 */}
                  <div className="space-y-1 text-xs text-white/85">
                    {address && (
                      <p className="flex items-start gap-1.5">
                        <MapPin className="size-3.5 shrink-0 mt-0.5 text-white/60" />
                        <span className="leading-snug">{address}</span>
                      </p>
                    )}
                    {phone && (
                      <p className="flex items-center gap-1.5" dir="ltr">
                        <Phone className="size-3.5 shrink-0 text-white/60" />
                        <span>{phone}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Reference number (replaces the removed status badge) */}
                <div className="shrink-0 text-end">
                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-wide">
                    {ar ? "رقم الطلب / الحالة" : "Order / Case"}
                  </p>
                  <p className="font-mono font-bold text-lg leading-tight" dir="ltr">
                    {order.orderNumber}
                  </p>
                  <p className="font-mono text-xs text-white/80" dir="ltr">
                    {ar ? `حالة #${order.caseId}` : `Case #${order.caseId}`}
                  </p>
                </div>
              </div>
            </div>

            {/* ===== Body ===== */}
            <div className="px-6 sm:px-8 py-6 space-y-6">
              {/* Case metadata */}
              <SectionCard icon={ReceiptText} title={ar ? "بيانات الحالة" : "Case Details"}>
                <div className="px-4 py-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <CaseBox label={ar ? "رقم الحالة" : "Case ID"} value={`#${order.caseId}`} />
                  <CaseBox label={ar ? "رقم الطلب" : "Order No."} value={order.orderNumber} />
                  <CaseBox
                    label={ar ? "تاريخ الاستلام" : "Received Date"}
                    value={formatInvoiceDate(order.receivedDate, lang)}
                  />
                  <CaseBox
                    label={ar ? "تاريخ الإخراج المتوقع" : "Expected Delivery"}
                    value={formatInvoiceDate(order.dueDate, lang)}
                  />
                  <CaseBox label={ar ? "الطبيب" : "Doctor"} value={order.doctor} />
                  <CaseBox label={ar ? "المريض" : "Patient"} value={order.patient} />
                  <CaseBox label={ar ? "العيادة" : "Clinic"} value={order.clinic || "-"} />
                </div>
              </SectionCard>

              {/* Shade (Vita Classical) strip */}
              <SectionCard icon={Paintbrush} title={ar ? "درجة اللون (Vita Classical)" : "Shade (Vita Classical)"}>
                <div className="px-4 py-4">
                  <div className="grid grid-cols-8 gap-1.5">
                    {VITA_SHADES.map((s) => {
                      const active = selectedShade === s.code;
                      return (
                        <div
                          key={s.code}
                          className={cn(
                            "relative aspect-square rounded-xl border-2 transition-all flex flex-col items-center justify-center",
                            active
                              ? "border-blue-600 scale-110 shadow-md z-10 ring-2 ring-blue-500/20"
                              : "border-slate-200",
                          )}
                        >
                          <span
                            className="size-5 rounded-full border border-slate-300"
                            style={{ background: s.hex }}
                          />
                          <span className="text-[9px] font-bold text-slate-600 mt-0.5">
                            {s.code}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {!selectedShade && (
                    <p
                      className="mt-3 text-xs font-medium rounded-lg px-3 py-2"
                      style={{ background: C.lightBlueSoft, color: C.lightBlueText }}
                    >
                      {ar
                        ? "لم تُحدَّد درجة لون لهذا الطلب - الشريط أعلاه يُبرز الدرجة تلقائياً عند اختيارها من صفحة الحالة."
                        : "No shade has been set for this order — the strip above highlights the shade automatically once selected from the case page."}
                    </p>
                  )}
                </div>
              </SectionCard>

              {/* Material & Work details */}
              <SectionCard icon={Layers} title={ar ? "المادة وتفاصيل العمل" : "Material & Work Details"}>
                <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <DetailChip
                    label={ar ? "المادة الأساسية" : "Material"}
                    value={materialMeta ? (ar ? materialMeta.ar : materialMeta.en) : order.workType}
                  />
                  <DetailChip
                    label={ar ? "نوع العمل" : "Work Type"}
                    value={workTypeMeta ? (ar ? workTypeMeta.ar : workTypeMeta.en) : undefined}
                  />
                  <DetailChip
                    label={ar ? "طريقة التصنيع" : "Manufacturing"}
                    value={methodMeta ? (ar ? methodMeta.ar : methodMeta.en) : undefined}
                  />
                  <DetailChip
                    label={ar ? "إنشاء الهيكل" : "Framework"}
                    value={frameworkMeta ? (ar ? frameworkMeta.ar : frameworkMeta.en) : undefined}
                  />
                  <DetailChip
                    label={ar ? "نوع التثبيت" : "Retention"}
                    value={
                      order.implantRetention
                        ? (ar
                            ? IMPLANT_RETENTION[order.implantRetention]?.ar
                            : IMPLANT_RETENTION[order.implantRetention]?.en)
                        : undefined
                    }
                  />
                  <DetailChip
                    label={ar ? "نوع الهيكل" : "Framework Type"}
                    value={titaniumMeta ? (ar ? titaniumMeta.ar : titaniumMeta.en) : undefined}
                  />
                </div>

                {/* Implant details */}
                {(order.implantCompany ||
                  order.implantSystem ||
                  order.implantConnection ||
                  order.implantPlatform ||
                  order.implantLevel) && (
                  <div className="px-4 pb-3 space-y-2">
                    <p className="text-[10px] font-bold flex items-center gap-1" style={{ color: C.deepBlue }}>
                      <Syringe className="size-3" />
                      {ar ? "تفاصيل الزرعة" : "Implant Details"}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <DetailChip label={ar ? "شركة الزرعة" : "Company"} value={order.implantCompany} />
                      <DetailChip label={ar ? "النظام" : "System"} value={order.implantSystem} />
                      <DetailChip
                        label={ar ? "الربط" : "Connection"}
                        value={
                          order.implantConnection
                            ? (ar
                                ? IMPLANT_CONNECTION[order.implantConnection]?.ar
                                : IMPLANT_CONNECTION[order.implantConnection]?.en)
                            : undefined
                        }
                      />
                      <DetailChip label={ar ? "المنصة" : "Platform"} value={order.implantPlatform} />
                      <DetailChip
                        label={ar ? "المستوى" : "Level"}
                        value={
                          order.implantLevel
                            ? (ar
                                ? IMPLANT_LEVEL[order.implantLevel]?.ar
                                : IMPLANT_LEVEL[order.implantLevel]?.en)
                            : undefined
                        }
                      />
                      <DetailChip label={ar ? "Scan Body" : "Scan Body"} value={order.implantScanBody} />
                    </div>
                  </div>
                )}

                {/* Aligner details */}
                {(order.alignerTreatmentType ||
                  order.alignerArch ||
                  order.alignerScans ||
                  order.alignerCount) && (
                  <div className="px-4 pb-3 space-y-2">
                    <p className="text-[10px] font-bold flex items-center gap-1" style={{ color: C.deepBlue }}>
                      <Smile className="size-3" />
                      {ar ? "تفاصيل التقويم الشفاف" : "Clear Aligner Details"}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <DetailChip
                        label={ar ? "نوع العلاج" : "Treatment"}
                        value={
                          order.alignerTreatmentType
                            ? (ar
                                ? ALIGNER_TREATMENT[order.alignerTreatmentType]?.ar
                                : ALIGNER_TREATMENT[order.alignerTreatmentType]?.en)
                            : undefined
                        }
                      />
                      <DetailChip
                        label={ar ? "القوس" : "Arch"}
                        value={
                          order.alignerArch
                            ? (ar ? ALIGNER_ARCH[order.alignerArch]?.ar : ALIGNER_ARCH[order.alignerArch]?.en)
                            : undefined
                        }
                      />
                      <DetailChip label={ar ? "المسحات" : "Scans"} value={order.alignerScans} />
                      <DetailChip label={ar ? "العدد" : "Count"} value={order.alignerCount} />
                      <DetailChip
                        label={ar ? "بروتوكول الارتداء" : "Wear Protocol"}
                        value={
                          order.alignerWearProtocol
                            ? (ar
                                ? ALIGNER_WEAR[order.alignerWearProtocol]?.ar
                                : ALIGNER_WEAR[order.alignerWearProtocol]?.en)
                            : undefined
                        }
                      />
                    </div>
                  </div>
                )}
              </SectionCard>

              {/* Pricing table */}
              <SectionCard
                icon={Hash}
                title={
                  ar
                    ? order.pricingMode === "mixed"
                      ? "جدول تسعير الوحدات المتعددة"
                      : "جدول التسعير"
                    : order.pricingMode === "mixed"
                      ? "Mixed Units Pricing"
                      : "Pricing"
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-right" style={{ borderBottom: `1px solid ${C.lightBlue}`, background: C.lightBlueSoft }}>
                        <th className="px-4 py-2.5 text-[10px] font-bold whitespace-nowrap" style={{ color: C.lightBlueText }}>
                          {ar ? "اسم العنصر / نوع العمل" : "Item / Work Type"}
                        </th>
                        <th className="px-3 py-2.5 text-[10px] font-bold text-center whitespace-nowrap" style={{ color: C.lightBlueText }}>
                          {ar ? "عدد الوحدات" : "Units"}
                        </th>
                        <th className="px-3 py-2.5 text-[10px] font-bold text-center whitespace-nowrap" style={{ color: C.lightBlueText }}>
                          {ar ? "سعر الوحدة" : "Price / Unit"}
                        </th>
                        <th className="px-4 py-2.5 text-[10px] font-bold text-center whitespace-nowrap" style={{ color: C.lightBlueText }}>
                          {ar ? "إجمالي الصف" : "Row Total"}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {hasTable ? (
                        items.map((it) => (
                          <tr key={it.id} style={{ borderBottom: `1px solid ${C.lightBlue}` }}>
                            <td className="px-4 py-3 text-sm font-semibold text-slate-800">{it.name}</td>
                            <td className="px-3 py-3 text-center font-mono text-sm font-bold text-slate-700">
                              {it.quantity}
                            </td>
                            <td className="px-3 py-3 text-center text-xs text-slate-500 whitespace-nowrap">
                              {fmtAmount(it.unitPrice, it.currency)}
                            </td>
                            <td className="px-4 py-3 text-center font-display font-extrabold whitespace-nowrap" style={{ color: C.deepBlue }}>
                              {fmtRowTotal(it)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr style={{ borderBottom: `1px solid ${C.lightBlue}` }}>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-800">{order.workType}</td>
                          <td className="px-3 py-3 text-center font-mono text-sm font-bold text-slate-700">
                            {order.unitsCount ?? "-"}
                          </td>
                          <td className="px-3 py-3 text-center text-xs text-slate-500 whitespace-nowrap">
                            {fmtAmount(order.unitPrice, order.currency)}
                          </td>
                          <td className="px-4 py-3 text-center font-display font-extrabold whitespace-nowrap" style={{ color: C.deepBlue }}>
                            {fmtAmount(order.price ?? 0, order.currency)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Summary bar */}
                <div
                  className="px-4 py-4 flex flex-wrap items-center justify-between gap-3"
                  style={{ background: C.lightBlueSoft, borderTop: `1px solid ${C.lightBlue}` }}
                >
                  <div>
                    <p
                      className="text-[10px] font-bold uppercase tracking-wide"
                      style={{ color: C.gold }}
                    >
                      {ar ? "إجمالي عدد الوحدات" : "Total Units"}
                    </p>
                    <p className="font-display font-extrabold text-lg" dir="ltr" style={{ color: C.deepBlue }}>
                      {fmtNum(totalUnits)}
                    </p>
                  </div>
                  <div className="text-end">
                    <p
                      className="text-[10px] font-bold uppercase tracking-wide"
                      style={{ color: C.gold }}
                    >
                      {ar ? "الإجمالي الكلي" : "Grand Total"}
                    </p>
                    <p className="font-display font-extrabold text-xl" dir="ltr" style={{ color: C.gold }}>
                      {grandTotalLabel}
                    </p>
                    {showUsdSecondary && (
                      <p className="text-xs font-semibold" style={{ color: C.lightBlueText }} dir="ltr">
                        ≈ ${usdTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                </div>
              </SectionCard>

              {/* Notes */}
              {order.notes && (
                <SectionCard icon={FileText} title={ar ? "ملاحظات" : "Notes"}>
                  <p className="px-4 py-3 text-sm text-slate-700 whitespace-pre-wrap">{order.notes}</p>
                </SectionCard>
              )}

              {/* Footer */}
              <div
                className="pt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400"
                style={{ borderTop: `1px dashed ${C.lightBlue}` }}
              >
                <span className="flex items-center gap-1.5">
                  <Ruler className="size-3.5" />
                  {ar ? "وثيقة فاتورة رسمية — معدة للطباعة" : "Official invoice document — ready to print"}
                </span>
                <span className="font-mono">{labTitle}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
