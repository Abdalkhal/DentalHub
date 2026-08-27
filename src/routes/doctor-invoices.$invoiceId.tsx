import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { RoleGuard } from "@/components/RoleGuard";
import { useI18n } from "@/lib/i18n";
import { useInvoice } from "@/lib/invoices";
import { useProducts, useSignedImageUrls } from "@/lib/products";
import type { InvoiceStatus } from "@/integrations/firebase/types";
import { useUserRole } from "@/lib/useAuth";
import {
  Loader2,
  ReceiptText,
  Building2,
  Phone,
  MapPin,
  Package,
  StickyNote,
  Printer,
  Share2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { useMemo } from "react";

export const Route = createFileRoute("/doctor-invoices/$invoiceId")({
  component: InvoiceDetail,
});

const TEAL = "#0E6E66";

const STATUS_META: Record<InvoiceStatus, { ar: string; en: string; badge: string }> = {
  pending: { ar: "قيد الانتظار", en: "Pending", badge: "bg-amber-100 text-amber-700" },
  confirmed: { ar: "تم التأكيد", en: "Confirmed", badge: "bg-emerald-100 text-emerald-700" },
  shipped: { ar: "تم الشحن", en: "Shipped", badge: "bg-sky-100 text-sky-700" },
  delivered: { ar: "تم التسليم", en: "Delivered", badge: "bg-emerald-100 text-emerald-700" },
  rejected: { ar: "مرفوضة", en: "Rejected", badge: "bg-rose-100 text-rose-700" },
};

function fmtIqd(n: number): string {
  return `${n.toLocaleString()} د.ع`;
}

function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

function fmtDate(ts: { toDate?: () => Date } | null | undefined): string {
  if (!ts || !ts.toDate) return "";
  const d = ts.toDate();
  return d.toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric" });
}

function InvoiceDetail() {
  return (
    <RoleGuard allowedRoles={["supply", "implant"]}>
      <InvoiceDetailInner />
    </RoleGuard>
  );
}

function InvoiceDetailInner() {
  const { invoiceId } = Route.useParams();
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { invoice: inv, loading } = useInvoice(invoiceId);
  const { role } = useUserRole();

  const storeName = role?.name || (ar ? "مكتب المستلزمات الطبية" : "Medical Supplies Store");
  const storePhone = role?.phone || "";
  const storeAddress = [role?.address, role?.city].filter(Boolean).join("، ");

  const { data: products = [] } = useProducts();
  const productById = useMemo(() => {
    const map: Record<string, (typeof products)[number]> = {};
    for (const p of products) map[p.id] = p;
    return map;
  }, [products]);
  const imagePaths = useMemo(
    () =>
      (inv?.items ?? [])
        .map((it) => productById[it.productId]?.images?.[0])
        .filter((x): x is string => !!x),
    [inv?.items, productById],
  );
  const { data: imageUrlMap = {} } = useSignedImageUrls(imagePaths);
  const imageOf = (productId: string) => {
    const path = productById[productId]?.images?.[0];
    return path ? imageUrlMap[path] : undefined;
  };

  if (loading) {
    return (
      <MobileShell>
        <TopBar title={ar ? "تفاصيل الفاتورة" : "Invoice Details"} showBack />
        <div className="flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </MobileShell>
    );
  }

  if (!inv) {
    return (
      <MobileShell>
        <TopBar title={ar ? "تفاصيل الفاتورة" : "Invoice Details"} showBack />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ReceiptText className="size-12 text-muted-foreground/40 mb-3" />
          <p className="font-bold text-sm text-muted-foreground">
            {ar ? "الفاتورة غير موجودة" : "Invoice not found"}
          </p>
        </div>
      </MobileShell>
    );
  }

  const meta = STATUS_META[inv.status];
  const location = [inv.doctorCity, inv.doctorAddress].filter(Boolean).join("، ");
  const missingLabel = ar ? "غير مدخل" : "Not provided";
  const confirmDate = inv.confirmedAt || inv.createdAt;
  const iqdTotal = inv.items
    .filter((i) => i.currency === "IQD")
    .reduce((s, i) => s + i.price * i.quantity, 0);
  const usdTotal = inv.items
    .filter((i) => i.currency !== "IQD")
    .reduce((s, i) => s + i.price * i.quantity, 0);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const lines = inv.items.map(
      (i) =>
        `• ${i.name} ×${i.quantity} — ${
          i.currency === "IQD" ? fmtIqd(i.price * i.quantity) : fmtUsd(i.price * i.quantity)
        }`,
    );
    const text = [
      ar ? "فاتورة" : "Invoice",
      inv.orderNumber,
      inv.doctorName,
      ...lines,
      ar ? `الإجمالي بالدينار: ${fmtIqd(iqdTotal)}` : `IQD total: ${fmtIqd(iqdTotal)}`,
      ar ? `الإجمالي بالدولار: ${fmtUsd(usdTotal)}` : `USD total: ${fmtUsd(usdTotal)}`,
    ].join("\n");

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: ar ? "فاتورة" : "Invoice", text });
      } catch {}
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
    <MobileShell>
      <TopBar title={ar ? "تفاصيل الفاتورة" : "Invoice Details"} showBack />
      <div className="px-4 py-4 space-y-4 pb-10">
        {/* Print / Share actions */}
        <div className="flex gap-2 no-print">
          <button
            onClick={handlePrint}
            className="flex-1 h-11 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition"
            style={{ backgroundColor: TEAL }}
          >
            <Printer className="size-4" />
            {ar ? "طباعة" : "Print"}
          </button>
          <button
            onClick={handleShare}
            className="flex-1 h-11 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition"
          >
            <Share2 className="size-4" />
            {ar ? "مشاركة" : "Share"}
          </button>
        </div>

        <div id="invoice-print" className="space-y-4">
          {/* Store header */}
          <div
            className="rounded-3xl p-5 text-white shadow-lg relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${TEAL}, #0B5952)` }}
          >
            <div className="absolute -top-12 -end-12 size-40 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-white/80 text-[11px] font-mono">
                    <ReceiptText className="size-3.5" />
                    {inv.orderNumber}
                  </div>
                  <p className="font-display font-extrabold text-xl mt-1.5 truncate">{storeName}</p>
                  <p className="text-xs text-white/80 mt-1 flex items-center gap-1">
                    <Building2 className="size-3.5 shrink-0" />
                    {ar ? "مكتب المستلزمات الطبية" : "Medical Supplies Store"}
                  </p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/20 backdrop-blur">
                    {ar ? meta.ar : meta.en}
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/20 backdrop-blur">
                    {ar ? `تأكيد: ${fmtDate(confirmDate)}` : `Confirmed: ${fmtDate(confirmDate)}`}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-white/15 text-xs text-white/85">
                <span className="flex items-center gap-1.5">
                  <Phone className="size-3.5 shrink-0" />
                  {storePhone || <span className="text-white/60">{missingLabel}</span>}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 shrink-0" />
                  {storeAddress || <span className="text-white/60">{missingLabel}</span>}
                </span>
              </div>
            </div>
          </div>

          {/* Doctor information */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-soft overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <User className="size-4 text-slate-400" />
              <span className="text-sm font-bold text-slate-700">
                {ar ? "معلومات الطبيب" : "Doctor Information"}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2">
              <div className="px-4 py-3 border-b sm:border-b-0 sm:border-e border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 mb-0.5">{ar ? "اسم الطبيب" : "Doctor Name"}</p>
                <p className="text-sm font-semibold text-slate-800">{inv.doctorName}</p>
              </div>
              <div className="px-4 py-3 border-b sm:border-b-0 border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 mb-0.5">{ar ? "اسم العيادة" : "Clinic Name"}</p>
                <p className="text-sm font-semibold text-slate-800">{inv.clinicName || inv.doctorName}</p>
              </div>
              <div className="px-4 py-3 border-b sm:border-b-0 sm:border-e border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 mb-0.5">{ar ? "رقم الهاتف" : "Phone Number"}</p>
                <p className="text-sm font-semibold text-slate-800" dir="ltr">{inv.doctorPhone || missingLabel}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[11px] font-bold text-slate-400 mb-0.5">{ar ? "الموقع / العنوان" : "Delivery Location"}</p>
                <p className="text-sm font-semibold text-slate-800">{location || missingLabel}</p>
              </div>
            </div>
          </div>

          {/* Items table (read-only) */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[560px]">
                <div
                  className="grid grid-cols-[minmax(200px,1.5fr)_56px_110px_120px] items-center gap-2 px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide border-b border-slate-100"
                  style={{ backgroundColor: `${TEAL}08` }}
                >
                  <span>{ar ? "المنتج" : "Product"}</span>
                  <span className="text-center">{ar ? "الكمية" : "Qty"}</span>
                  <span className="text-center">{ar ? "السعر" : "Unit Price"}</span>
                  <span className="text-end">{ar ? "الإجمالي" : "Total"}</span>
                </div>

                {inv.items.map((item, idx) => (
                  <div
                    key={`${item.productId}-${idx}`}
                    className="grid grid-cols-[minmax(200px,1.5fr)_56px_110px_120px] items-center gap-2 px-4 py-3 border-b border-slate-50 last:border-0"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {imageOf(item.productId) ? (
                        <img
                          src={imageOf(item.productId)}
                          alt=""
                          className="size-11 rounded-lg object-cover bg-slate-100 shrink-0"
                        />
                      ) : (
                        <span className="size-11 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          <Package className="size-5 text-slate-400" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                      </div>
                    </div>

                    <span className="text-sm font-bold text-slate-700 text-center">{item.quantity}</span>

                    <span className="text-xs text-slate-500 text-center">
                      {item.currency === "IQD" ? fmtIqd(item.price) : fmtUsd(item.price)}
                    </span>

                    <span className="text-sm font-display font-extrabold text-end" style={{ color: TEAL }}>
                      {item.currency === "IQD"
                        ? fmtIqd(item.price * item.quantity)
                        : fmtUsd(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-4">
            <p className="text-sm font-bold text-slate-700">{ar ? "ملخص الفاتورة" : "Invoice summary"}</p>
            <div className="mt-3 space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">{ar ? "الإجمالي بالدينار" : "Total (IQD)"}</span>
                <span className="font-semibold">{fmtIqd(iqdTotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">{ar ? "الإجمالي بالدولار" : "Total (USD)"}</span>
                <span className="font-semibold">{fmtUsd(usdTotal)}</span>
              </div>
              {inv.note && (
                <div className="mt-3 pt-3 border-t border-dashed border-slate-200">
                  <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mb-1">
                    <StickyNote className="size-3.5" />
                    {ar ? "ملاحظة الطبيب" : "Doctor note"}
                  </p>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{inv.note}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MobileShell>
  );
}
