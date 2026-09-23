import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { useUserRole } from "@/lib/useAuth";
import { useOrders } from "@/lib/orders";
import { Loader2, FileText, ReceiptText, Package, User, Calendar, Hash } from "lucide-react";

export const Route = createFileRoute("/account/balances")({
  component: Invoices,
});

function Invoices() {
  const { lang, dir } = useI18n();
  const ar = lang === "ar";
  const { role, loading: roleLoading } = useUserRole();
  const supplierId = role?.userId;
  const { data: orders = [], isLoading } = useOrders(supplierId);

  const fmtPrice = (n: number, currency: string) => {
    if (currency === "IQD") return `${n.toLocaleString()} د.ع`;
    return `$${n.toFixed(2)}`;
  };

  const fmtDate = (ts: { toDate?: () => Date } | undefined) => {
    if (!ts || !ts.toDate) return "";
    const d = ts.toDate();
    return d.toLocaleDateString(ar ? "ar-IQ" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (roleLoading || isLoading) {
    return (
      <MobileShell wide>
        <TopBar title={ar ? "فواتير الأطباء" : "Doctor Invoices"} showBack wide />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell wide>
      <TopBar title={ar ? "فواتير الأطباء" : "Doctor Invoices"} showBack wide />
      <div className="px-4 pt-4 pb-6 md:px-6 md:pt-6 md:pb-12 lg:px-8 lg:max-w-5xl lg:mx-auto" dir={dir}>
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 px-6">
            <span className="size-16 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground/30 mb-4">
              <ReceiptText className="size-8" strokeWidth={1.5} />
            </span>
            <p className="font-display font-bold text-sm text-muted-foreground">
              {ar ? "لا توجد فواتير مبيعات للأطباء بعد" : "No doctor purchase invoices yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-5 xl:grid-cols-3 md:items-start">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-card border border-border rounded-2xl p-4 shadow-soft space-y-3"
              >
                {/* Doctor Name */}
                <div className="flex items-center gap-2">
                  <span className="size-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <User className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{order.dentistName}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="size-3" />
                      {fmtDate(order.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Product */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/60">
                  <div className="size-14 rounded-xl bg-white border border-border flex items-center justify-center overflow-hidden shrink-0">
                    <Package className="size-6 text-muted-foreground/40" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">
                      {order.items[0]?.name || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ar
                        ? `اشترى ${order.items[0]?.name ?? ""} بكمية ${order.items[0]?.quantity ?? 0}`
                        : `Purchased ${order.items[0]?.name ?? ""} ×${order.items[0]?.quantity ?? 0}`}
                    </p>
                  </div>
                </div>

                {/* Summary */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Hash className="size-3.5" />
                    <span>
                      {ar ? "الكمية:" : "Qty:"} {order.items[0]?.quantity ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {fmtPrice(order.items[0]?.price ?? 0, order.items[0]?.currency ?? "USD")} ×{" "}
                      {order.items[0]?.quantity ?? 0}
                    </span>
                    <span className="font-display font-extrabold text-base text-foreground">
                      {fmtPrice(order.total, order.items[0]?.currency ?? "USD")}
                    </span>
                  </div>
                </div>

                {/* Status badge */}
                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      order.status === "confirmed"
                        ? "bg-sky-100 text-sky-700"
                        : order.status === "rejected"
                          ? "bg-rose-100 text-rose-600"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    <FileText className="size-3" />
                    {order.status === "confirmed"
                      ? ar
                        ? "مؤكد"
                        : "Confirmed"
                      : order.status === "rejected"
                        ? ar
                          ? "مرفوض"
                          : "Rejected"
                        : ar
                          ? "قيد الانتظار"
                          : "Pending"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {ar ? "فاتورة" : "Invoice"} #{order.id.slice(0, 8)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileShell>
  );
}
