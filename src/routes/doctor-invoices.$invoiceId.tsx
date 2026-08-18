import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { RoleGuard } from "@/components/RoleGuard";
import { useI18n } from "@/lib/i18n";
import { useInvoice, updateInvoiceStatus, updateInvoiceItemAvailability } from "@/lib/invoices";
import type { InvoiceStatus } from "@/integrations/firebase/types";
import {
  Loader2,
  ReceiptText,
  Building2,
  Phone,
  MapPin,
  Check,
  X,
  Package,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

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
  const [busyIdx, setBusyIdx] = useState<number | null>(null);

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
  const iqdTotal = inv.items
    .filter((i) => i.currency === "IQD")
    .reduce((s, i) => s + i.price * i.quantity, 0);
  const usdTotal = inv.items
    .filter((i) => i.currency !== "IQD")
    .reduce((s, i) => s + i.price * i.quantity, 0);

  const handleAvailability = async (index: number, value: "available" | "not_available") => {
    setBusyIdx(index);
    try {
      await updateInvoiceItemAvailability(inv.id, index, value);
    } catch (e: any) {
      toast.error(ar ? `فشل التحديث: ${e?.message || e}` : `Update failed: ${e?.message || e}`);
    } finally {
      setBusyIdx(null);
    }
  };

  const handleStatus = async (status: InvoiceStatus) => {
    try {
      await updateInvoiceStatus(inv.id, status);
      toast.success(
        status === "confirmed"
          ? ar ? "تم تأكيد الطلب" : "Order confirmed"
          : ar ? "تم رفض الطلب" : "Order rejected",
      );
    } catch (e: any) {
      toast.error(ar ? `فشل التحديث: ${e?.message || e}` : `Update failed: ${e?.message || e}`);
    }
  };

  return (
    <MobileShell>
      <TopBar title={ar ? "تفاصيل الفاتورة" : "Invoice Details"} showBack />
      <div className="px-4 py-4 space-y-4 pb-10">
        {/* Invoice header */}
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
                <p className="font-display font-extrabold text-xl mt-1.5 truncate">{inv.doctorName}</p>
                <p className="text-xs text-white/80 mt-1 flex items-center gap-1">
                  <Building2 className="size-3.5 shrink-0" />
                  {inv.clinicName || inv.doctorName}
                </p>
              </div>
              <span className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/20 backdrop-blur">
                {ar ? meta.ar : meta.en}
              </span>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-white/15 text-xs text-white/85">
              <span className="flex items-center gap-1.5">
                <Phone className="size-3.5 shrink-0" />
                {inv.doctorPhone || (
                  <span className="text-white/60">{missingLabel}</span>
                )}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0" />
                {location || <span className="text-white/60">{missingLabel}</span>}
              </span>
              <span className="flex items-center gap-1.5">
                <ReceiptText className="size-3.5 shrink-0" />
                {fmtDate(inv.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Items table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              <div
                className="grid grid-cols-[minmax(180px,1.5fr)_48px_88px_88px_96px_176px] items-center gap-2 px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide border-b border-slate-100"
                style={{ backgroundColor: `${TEAL}08` }}
              >
                <span>{ar ? "المنتج" : "Product"}</span>
                <span className="text-center">{ar ? "الكمية" : "Qty"}</span>
                <span className="text-center">{ar ? "السعر (د.ع)" : "Price (IQD)"}</span>
                <span className="text-center">{ar ? "السعر ($)" : "Price ($)"}</span>
                <span className="text-center">{ar ? "الإجمالي" : "Total"}</span>
                <span className="text-center">{ar ? "التوفر" : "Availability"}</span>
              </div>

              {inv.items.map((item, idx) => {
                const avail = item.availability;
                return (
                  <div
                    key={`${item.productId}-${idx}`}
                    className="grid grid-cols-[minmax(180px,1.5fr)_48px_88px_88px_96px_176px] items-center gap-2 px-4 py-3 border-b border-slate-50 last:border-0"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="size-11 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <Package className="size-5 text-slate-400" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                      </div>
                    </div>

                    <span className="text-sm font-bold text-slate-700 text-center">{item.quantity}</span>

                    <span className="text-xs text-slate-500 text-center">
                      {item.currency === "IQD" ? item.price.toLocaleString() : "—"}
                    </span>

                    <span className="text-xs text-slate-500 text-center">
                      {item.currency !== "IQD" ? `$${item.price.toFixed(2)}` : "—"}
                    </span>

                    <span className="text-sm font-display font-extrabold text-center" style={{ color: TEAL }}>
                      {item.currency === "IQD"
                        ? (item.price * item.quantity).toLocaleString()
                        : `$${(item.price * item.quantity).toFixed(2)}`}
                    </span>

                    <div className="flex items-center gap-1.5 justify-center">
                      <button
                        onClick={() => handleAvailability(idx, "available")}
                        disabled={busyIdx === idx}
                        className="h-8 px-2.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition border"
                        style={
                          avail === "available"
                            ? { backgroundColor: "#059669", color: "#fff", borderColor: "#059669" }
                            : { color: "#059669", borderColor: "#05966933", backgroundColor: "#0596690D" }
                        }
                      >
                        <Check className="size-3" />
                        {ar ? "متوفر" : "Available"}
                      </button>
                      <button
                        onClick={() => handleAvailability(idx, "not_available")}
                        disabled={busyIdx === idx}
                        className="h-8 px-2.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition border"
                        style={
                          avail === "not_available"
                            ? { backgroundColor: "#e11d48", color: "#fff", borderColor: "#e11d48" }
                            : { color: "#e11d48", borderColor: "#e11d4833", backgroundColor: "#e11d480D" }
                        }
                      >
                        <X className="size-3" />
                        {ar ? "غير متوفر" : "Not available"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-4">
          <p className="text-sm font-bold text-slate-700">{ar ? "ملخص الطلب" : "Order summary"}</p>
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

        {/* Status actions */}
        {inv.status === "pending" && (
          <div className="flex gap-2">
            <button
              onClick={() => handleStatus("confirmed")}
              className="flex-1 h-12 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-1.5 hover:opacity-90 transition"
              style={{ backgroundColor: TEAL }}
            >
              <Check className="size-4" />
              {ar ? "تأكيد الطلب" : "Confirm order"}
            </button>
            <button
              onClick={() => handleStatus("rejected")}
              className="flex-1 h-12 rounded-2xl bg-white border border-slate-200 text-rose-600 font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-rose-50 transition"
            >
              <X className="size-4" />
              {ar ? "رفض الطلب" : "Reject order"}
            </button>
          </div>
        )}
      </div>
    </MobileShell>
  );
}
