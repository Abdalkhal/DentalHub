import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { useQuickOrders } from "@/lib/quickOrders";
import { Package, FlaskConical, ShoppingBag, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/quick-orders")({
  component: QuickOrdersPage,
});

function fmtPrice(n: number) {
  return n > 0 ? `$${n.toFixed(2)}` : "—";
}

function QuickOrdersPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const items = useQuickOrders();

  return (
    <MobileShell>
      <TopBar title={ar ? "الطلبات السريعة" : "Quick Orders"} showBack />
      <div className="px-3 pt-4 pb-24">
        {items.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <div className="size-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="size-9 text-slate-300" />
            </div>
            <p className="font-bold text-lg text-slate-500">{ar ? "لا توجد طلبات بعد" : "No orders yet"}</p>
            <p className="text-sm mt-1">{ar ? "لم تقم بإجراء أي طلبات شراء بعد" : "You haven't placed any orders yet"}</p>
            <div className="flex gap-2 mt-4 justify-center">
              <Link to="/supplies" className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5">
                <Package className="size-4" />{ar ? "المستلزمات الطبية" : "Medical Supplies"}
              </Link>
              <Link to="/labs" className="h-10 px-4 rounded-xl bg-sky-50 text-sky-700 text-xs font-bold flex items-center gap-1.5">
                <FlaskConical className="size-4" />{ar ? "المختبرات" : "Labs"}
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-sm text-slate-500">{ar ? "الأكثر طلباً" : "Most Ordered"}</h2>
              <span className="text-xs text-slate-400">{items.length} {ar ? "منتج" : "products"}</span>
            </div>
            {items.map((item, i) => (
              <div key={item.name} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
                <span className="size-10 rounded-xl bg-slate-50 flex items-center justify-center font-bold text-sm text-primary shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{item.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{item.vendor}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                    <span>{ar ? "طلب" : "ordered"} {item.orderCount}×</span>
                    <span>·</span>
                    <span>{ar ? "الكمية" : "qty"}: {item.totalQty}</span>
                    <span>·</span>
                    <span className="font-bold text-primary">{fmtPrice(item.avgPrice)}</span>
                  </div>
                </div>
                <button className="h-8 px-3 rounded-lg bg-primary/10 text-primary text-[10px] font-bold shrink-0 hover:bg-primary/20 transition">
                  {ar ? "إعادة طلب" : "Reorder"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileShell>
  );
}
