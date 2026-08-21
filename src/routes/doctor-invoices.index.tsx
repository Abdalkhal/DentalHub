import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { RoleGuard } from "@/components/RoleGuard";
import { useI18n } from "@/lib/i18n";
import { useUserRole } from "@/lib/useAuth";
import { useOfficeInvoices, invoiceItemCount } from "@/lib/invoices";
import type { InvoiceStatus } from "@/integrations/firebase/types";
import { Loader2, ReceiptText, User, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/doctor-invoices/")({
  component: DoctorInvoicesList,
});

type StatusMeta = { ar: string; en: string; badge: string; dot: string };

const INVOICE_STATUS: Record<InvoiceStatus, StatusMeta> = {
  pending: { ar: "قيد الانتظار", en: "Pending", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  confirmed: { ar: "تم التأكيد", en: "Confirmed", badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  shipped: { ar: "تم الشحن", en: "Shipped", badge: "bg-sky-100 text-sky-700", dot: "bg-sky-500" },
  delivered: { ar: "تم التسليم", en: "Delivered", badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  rejected: { ar: "ملغاة", en: "Rejected", badge: "bg-rose-100 text-rose-700", dot: "bg-rose-500" },
};

function fmtDate(ts: { toDate?: () => Date } | undefined): string {
  if (!ts || !ts.toDate) return "";
  const d = ts.toDate();
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function DoctorInvoicesList() {
  return (
    <RoleGuard allowedRoles={["supply", "implant"]}>
      <DoctorInvoicesListInner />
    </RoleGuard>
  );
}

function DoctorInvoicesListInner() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { role } = useUserRole();
  const officeId = role?.userId;
  const { invoices, loading } = useOfficeInvoices(officeId);

  // Only show invoices that have already been confirmed in "My Orders"
  // (pending requests live in the orders collection, not here).
  const visibleInvoices = invoices.filter((i) => i.status !== "pending");

  return (
    <MobileShell>
      <TopBar title={ar ? "فواتير الأطباء" : "Doctor Invoices"} showBack />
      <div className="px-4 pt-3 pb-6 space-y-4">
        {/* Counter header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {visibleInvoices.length} {ar ? "فواتير" : "invoices"}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : visibleInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 px-6">
            <span className="size-16 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground/30 mb-4">
              <ReceiptText className="size-8" strokeWidth={1.5} />
            </span>
            <p className="font-display font-bold text-sm text-muted-foreground">
              {ar ? "لا توجد فواتير بعد" : "No invoices yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleInvoices.map((inv) => {
              const meta = INVOICE_STATUS[inv.status];
              const count = invoiceItemCount(inv);
              return (
                <div key={inv.id} className="bg-card border border-border rounded-2xl p-4 shadow-soft">
                  <Link to="/doctor-invoices/$invoiceId" params={{ invoiceId: inv.id }} className="block">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="size-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                          <User className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-display font-bold text-sm truncate">{inv.doctorName}</p>
                          <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                            <Building2 className="size-3 shrink-0" />
                            {inv.clinicName || inv.doctorName}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                        {inv.orderNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full", meta.badge)}>
                        <span className={cn("size-1.5 rounded-full", meta.dot)} />
                        {ar ? meta.ar : meta.en}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {count} {ar ? "منتجات" : "products"}
                      </span>
                    </div>

                    <div className="border-t border-dashed border-border my-2" />

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{fmtDate(inv.createdAt)}</span>
                      <span className="font-display font-extrabold text-base text-foreground">
                        ${inv.total.toFixed(2)}
                      </span>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MobileShell>
  );
}
