import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { RoleGuard } from "@/components/RoleGuard";
import { useI18n } from "@/lib/i18n";
import { useInvoice } from "@/lib/invoices";
import { useUserRole } from "@/lib/useAuth";
import { OfficialInvoiceView } from "@/components/OfficialInvoiceView";
import { Loader2, ReceiptText, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/doctor-invoices/$invoiceId")({
  component: InvoiceDetail,
});

const TEAL = "#0E6E66";

function fmtIqd(n: number): string {
  return `${n.toLocaleString()} د.ع`;
}

function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`;
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
      } catch { /* user cancelled */ }
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
          <OfficialInvoiceView
            invoice={inv}
            storeName={storeName}
            storePhone={storePhone}
            storeAddress={storeAddress}
          />
        </div>
      </div>
    </MobileShell>
  );
}
