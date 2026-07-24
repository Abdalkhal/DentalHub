import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { z } from "zod";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { OrderDetailsModal } from "@/components/OrderDetailsModal";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  updateOrderStatus,
  deleteOrder,
  useOrders,
  type Order,
  type OrderStatus,
} from "@/lib/ordersStore";
import { Search, Eye, Edit3, Trash2, Crown, Sparkles, Syringe, Layers } from "lucide-react";

const ordersSearchSchema = z.object({
  status: z.enum(["all", "in_progress", "completed", "delayed"]).catch("all"),
});

export const Route = createFileRoute("/orders")({
  validateSearch: ordersSearchSchema,
  component: Orders,
});

type FilterStatus = "all" | "in_progress" | "completed" | "delayed";
type WorkType = "crown" | "veneer" | "implant" | "clear_aligner";

const WORK_TYPES: Record<WorkType, { ar: string; en: string; icon: typeof Crown; color: string }> =
  {
    crown: { ar: "تاج", en: "Crown", icon: Crown, color: "text-amber-500 bg-amber-50" },
    veneer: { ar: "قشرة", en: "Veneer", icon: Sparkles, color: "text-sky-500 bg-sky-50" },
    implant: { ar: "زرعة", en: "Implant", icon: Syringe, color: "text-emerald-500 bg-emerald-50" },
    clear_aligner: {
      ar: "مصفف شفاف",
      en: "Clear Aligner",
      icon: Layers,
      color: "text-violet-500 bg-violet-50",
    },
  };

function Orders() {
  const { lang, t } = useI18n();
  const ar = lang === "ar";

  const { status: initialStatus } = useSearch({ from: "/orders" });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>(initialStatus);
  const orders = useOrders();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);

  const selectedOrder = useMemo(
    () => (selectedOrderId ? (orders.find((o) => o.id === selectedOrderId) ?? null) : null),
    [selectedOrderId, orders],
  );

  const handleDelete = (target: Order) => {
    deleteOrder(target.id);
    setDeleteTarget(null);
    toast.success(ar ? "تم حذف الطلب بنجاح" : "Order deleted successfully");
  };

  const statusOptions: { id: FilterStatus; ar: string; en: string }[] = [
    { id: "all", ar: t("filter_all"), en: "All" },
    { id: "in_progress", ar: t("filter_in_production"), en: "In Progress" },
    { id: "completed", ar: t("filter_completed"), en: "Completed" },
    { id: "delayed", ar: t("filter_late"), en: "Late" },
  ];

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          o.orderNumber.toLowerCase().includes(q) || o.patient.toLowerCase().includes(q) || o.doctor.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [statusFilter, search, orders]);

  const handleStatusChange = (id: string, newStatus: OrderStatus) => {
    updateOrderStatus(id, newStatus);
  };

  return (
    <MobileShell>
      <TopBar title={ar ? "طلباتي" : "My Orders"} showBack />
      <div className="px-4 pt-4 pb-6 space-y-4">
        <div className="relative">
          <Search className="size-4 absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={ar ? "ابحث باسم الطبيب أو المريض…" : "Search by doctor or patient…"}
            className="w-full h-11 rounded-2xl bg-card border border-border ps-10 pe-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {statusOptions.map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={cn(
                "px-3.5 h-8 rounded-full text-xs font-semibold border transition",
                statusFilter === s.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-accent",
              )}
            >
              {ar ? s.ar : s.en}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          {filteredOrders.length} {ar ? "طلب" : "order"}
          {filteredOrders.length !== 1 ? (ar ? "ات" : "s") : ""}
        </p>

        <div className="space-y-2">
          {orders.length === 0 ? (
            <div className="text-center py-16 text-sm text-muted-foreground">
              {ar ? "لا توجد طلبات حالياً" : "No orders available"}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              {ar ? "لا توجد طلبات مطابقة" : "No matching orders"}
            </div>
          ) : (
            filteredOrders.map((o) => {
              const wt = WORK_TYPES[o.workType as WorkType] ?? {
                ar: o.workType,
                en: o.workType,
                icon: Crown,
                color: "text-gray-500 bg-gray-50",
              };
              const WtIcon = wt.icon;
              return (
                <div
                  key={o.id}
                  className="bg-card border border-border rounded-2xl p-4 shadow-soft hover:shadow-card transition"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={cn(
                          "size-9 rounded-xl flex items-center justify-center shrink-0",
                          wt.color,
                        )}
                      >
                        <WtIcon className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-bold text-muted-foreground">
                          {o.orderNumber}
                        </p>
                        <p className="font-display font-bold text-sm text-foreground truncate">
                          {o.patient}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                    <div>
                      <p className="text-muted-foreground font-medium">{t("doctor")}</p>
                      <p className="font-semibold text-foreground truncate">{o.doctor}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-medium">{t("work_type")}</p>
                      <p className="font-semibold text-foreground">{ar ? wt.ar : wt.en}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-medium">{t("received_date")}</p>
                      <p className="font-semibold text-foreground">{o.receivedDate}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-medium">{t("status")}</p>
                      <span className="font-semibold text-foreground">
                        {ar
                          ? o.status === "in_progress"
                            ? "قيد التنفيذ"
                            : o.status === "completed"
                              ? "مكتملة"
                              : "متأخرة"
                          : o.status === "in_progress"
                            ? "In Progress"
                            : o.status === "completed"
                              ? "Completed"
                              : "Delayed"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <button
                      onClick={() => setSelectedOrderId(o.id)}
                      className="flex-1 h-9 rounded-xl bg-primary/10 text-primary text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-primary/20 transition"
                    >
                      <Eye className="size-3.5" />
                      {t("view")}
                    </button>
                    <button
                      onClick={() => setSelectedOrderId(o.id)}
                      className="flex-1 h-9 rounded-xl bg-card border border-border text-muted-foreground text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-accent transition"
                    >
                      <Edit3 className="size-3.5" />
                      {t("edit")}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(o)}
                      className="size-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition shrink-0"
                      title={ar ? "حذف" : "Delete"}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrderId(null)}
          onStatusChange={handleStatusChange}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          orderNumber={deleteTarget.orderNumber}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget)}
        />
      )}
    </MobileShell>
  );
}
