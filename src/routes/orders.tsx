import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { z } from "zod";
import { db } from "@/integrations/firebase/client";
import type { OrderDoc } from "@/integrations/firebase/types";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { EditOrderModal } from "@/components/EditOrderModal";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { useI18n } from "@/lib/i18n";
import { useUserRole } from "@/lib/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  updateOrderStatus,
  updateOrder,
  deleteOrder,
  useOrders,
  type Order,
  type OrderStatus,
} from "@/lib/ordersStore";
import {
  Search,
  Eye,
  Edit3,
  Trash2,
  Crown,
  Sparkles,
  Syringe,
  Layers,
  Package,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

const ordersSearchSchema = z.object({
  status: z.enum(["all", "in_progress", "completed", "delayed"]).catch("all"),
});

export const Route = createFileRoute("/orders")({
  validateSearch: ordersSearchSchema,
  component: Orders,
});

type FilterStatus = "all" | "in_progress" | "completed" | "delayed";
type WorkType = "crown" | "veneer" | "implant" | "clear_aligner";
type SupplierOrderStatus = "pending" | "confirmed" | "delivered" | "cancelled";

const WORK_TYPES: Record<WorkType, { ar: string; en: string; icon: typeof Crown; color: string }> = {
  crown: { ar: "تاج", en: "Crown", icon: Crown, color: "text-amber-500 bg-amber-50" },
  veneer: { ar: "قشرة", en: "Veneer", icon: Sparkles, color: "text-sky-500 bg-sky-50" },
  implant: { ar: "زرعة", en: "Implant", icon: Syringe, color: "text-emerald-500 bg-emerald-50" },
  clear_aligner: { ar: "مصفف شفاف", en: "Clear Aligner", icon: Layers, color: "text-violet-500 bg-violet-50" },
};

const SUPPLIER_STATUS: Record<SupplierOrderStatus, { ar: string; en: string; color: string }> = {
  pending: { ar: "قيد الانتظار", en: "Pending", color: "bg-amber-100 text-amber-700" },
  confirmed: { ar: "قيد التجهيز", en: "Confirmed", color: "bg-sky-100 text-sky-700" },
  delivered: { ar: "مكتمل", en: "Delivered", color: "bg-emerald-100 text-emerald-700" },
  cancelled: { ar: "ملغي", en: "Cancelled", color: "bg-rose-100 text-rose-700" },
};

function formatShortDate(iso: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
}

function fmtPrice(n: number): string {
  return n.toLocaleString() + " د.ع";
}

/* ── Main Component ─────────────────────────────── */

function Orders() {
  const { lang, t } = useI18n();
  const ar = lang === "ar";
  const { role, loading: roleLoading } = useUserRole();

  if (roleLoading) {
    return (
      <MobileShell>
        <TopBar title={ar ? "طلباتي" : "My Orders"} showBack />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MobileShell>
    );
  }

  if (role?.accountType === "supply") return <SupplierOrders />;
  if (role?.accountType === "dentist") return <DentistOrders />;
  return <LabOrders />;
}

/* ── Lab Orders View ─────────────────────────────── */

function LabOrders() {
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
        return (
          o.orderNumber.toLowerCase().includes(q) ||
          o.patient.toLowerCase().includes(q) ||
          o.doctor.toLowerCase().includes(q)
        );
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
                      <span className={cn("size-9 rounded-xl flex items-center justify-center shrink-0", wt.color)}>
                        <WtIcon className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-bold text-muted-foreground">{o.orderNumber}</p>
                        <p className="font-display font-bold text-sm text-foreground truncate">{o.patient}</p>
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
                          ? o.status === "in_progress" ? "قيد التنفيذ" : o.status === "completed" ? "مكتملة" : "متأخرة"
                          : o.status === "in_progress" ? "In Progress" : o.status === "completed" ? "Completed" : "Delayed"}
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
        <EditOrderModal
          order={selectedOrder}
          onClose={() => setSelectedOrderId(null)}
          onSave={updateOrder}
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

/* ── Dentist Orders View ─────────────────────────── */

function DentistOrders() {
  const { lang } = useI18n();
  const ar = lang === "ar";

  return (
    <MobileShell>
      <TopBar title={ar ? "طلباتي" : "My Orders"} showBack />
      <div className="px-4 pt-4 pb-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="size-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <Package className="size-9 text-slate-400" />
        </div>
        <p className="font-display font-bold text-lg text-slate-500">{ar ? "لا توجد طلبات حالياً" : "No orders yet"}</p>
        <p className="text-sm text-slate-400 mt-1">{ar ? "لم تقم بإجراء أي طلبات شراء بعد" : "You haven't made any purchase orders yet"}</p>
        <Link to="/supplies" className="mt-4 inline-flex h-11 px-5 rounded-xl bg-primary text-primary-foreground font-bold text-sm items-center gap-2 hover:opacity-90 transition">
          <Package className="size-4" />
          {ar ? "تصفح المنتجات" : "Browse Products"}
        </Link>
      </div>
    </MobileShell>
  );
}

/* ── Supplier Orders View ────────────────────────── */

function SupplierOrders() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { role } = useUserRole();
  const supplierId = role?.userId ?? "";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SupplierOrderStatus>("all");

  const { data: supplierOrders = [], isLoading } = useQuery({
    queryKey: ["supplier-orders", supplierId],
    queryFn: async (): Promise<OrderDoc[]> => {
      if (!supplierId) return [];
      const q = query(
        collection(db, "orders"),
        where("supplierId", "==", supplierId),
        orderBy("createdAt", "desc"),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as OrderDoc));
    },
    enabled: !!supplierId,
    staleTime: 30_000,
  });

  const statusOptions: { id: "all" | SupplierOrderStatus; ar: string; en: string }[] = [
    { id: "all", ar: "الكل", en: "All" },
    { id: "pending", ar: "قيد الانتظار", en: "Pending" },
    { id: "confirmed", ar: "قيد التجهيز", en: "Confirmed" },
    { id: "delivered", ar: "مكتمل", en: "Delivered" },
    { id: "cancelled", ar: "ملغي", en: "Cancelled" },
  ];

  const filteredOrders = useMemo(() => {
    return supplierOrders.filter((o) => {
      const s = o.status as SupplierOrderStatus;
      if (statusFilter !== "all" && s !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          o.id.toLowerCase().includes(q) ||
          (o.dentistName || "").toLowerCase().includes(q) ||
          (o.productName || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [supplierOrders, statusFilter, search]);

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
            placeholder={ar ? "ابحث عن طلب أو طبيب…" : "Search order or doctor…"}
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
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 text-primary animate-spin" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-16 text-sm text-muted-foreground">
              <Package className="size-10 mx-auto mb-3 text-muted-foreground/40" />
              {supplierOrders.length === 0
                ? ar ? "لا توجد طلبات مبيعات حتى الآن" : "No sales orders yet"
                : ar ? "لا توجد طلبات مطابقة" : "No matching orders"}
            </div>
          ) : (
            filteredOrders.map((o) => {
              const s = (o.status as SupplierOrderStatus) || "pending";
              const sm = SUPPLIER_STATUS[s] ?? SUPPLIER_STATUS.pending;
              return (
                <div key={o.id} className="bg-card border border-border rounded-2xl p-4 shadow-soft">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="size-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                        <Package className="size-4" />
                      </span>
                      <div>
                        <p className="font-mono text-xs font-bold text-muted-foreground">
                          #{o.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="font-display font-bold text-sm">
                          {o.productName || (ar ? "منتج" : "Product")}
                        </p>
                      </div>
                    </div>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", sm.color)}>
                      {ar ? sm.ar : sm.en}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">{ar ? "الطبيب" : "Doctor"}</p>
                      <p className="font-semibold text-foreground flex items-center gap-1 truncate">
                        <Building2 className="size-3 shrink-0" />
                        {o.dentistName || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{ar ? "التاريخ" : "Date"}</p>
                      <p className="font-semibold text-foreground flex items-center gap-1">
                        <Clock className="size-3" />
                        {o.createdAt ? formatShortDate(o.createdAt as unknown as string) : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{ar ? "الكمية" : "Qty"}</p>
                      <p className="font-semibold text-foreground">×{o.quantity || 1}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{ar ? "سعر الوحدة" : "Unit Price"}</p>
                      <p className="font-semibold text-foreground">{fmtPrice(o.unitPrice || 0)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <p className="font-display font-extrabold text-sm text-emerald-600">
                      {ar ? "الإجمالي" : "Total"}: {fmtPrice(o.total || 0)}
                    </p>
                    <div className="flex gap-1.5">
                      <button className="h-8 px-3 rounded-lg bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20 transition flex items-center gap-1">
                        <Eye className="size-3" />
                        {ar ? "تفاصيل" : "Details"}
                      </button>
                      {s === "pending" && (
                        <button className="h-8 px-3 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold hover:bg-emerald-100 transition flex items-center gap-1">
                          <CheckCircle2 className="size-3" />
                          {ar ? "قبول" : "Accept"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </MobileShell>
  );
}
