import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import type { OrderDoc } from "@/integrations/firebase/types";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { EditOrderModal } from "@/components/EditOrderModal";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { useI18n } from "@/lib/i18n";
import { useUserRole, useSession } from "@/lib/useAuth";
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
import { useCart } from "@/lib/cartStore";
import {
  placeCartOrder,
  confirmOrder,
  markOrderUnavailable,
  useOrders as useSupplierOrders,
  useDentistOrders,
} from "@/lib/orders";
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
  Loader2,
  Plus,
  Check,
  X,
} from "lucide-react";

const ordersSearchSchema = z.object({
  status: z.enum(["all", "in_progress", "completed", "delayed"]).catch("all"),
});

export const Route = createFileRoute("/orders")({
  validateSearch: ordersSearchSchema,
  component: Orders,
});

type FilterStatus = "all" | "in_progress" | "completed" | "delayed";
type WorkType = "zircon" | "inlay_onlay" | "night_guard" | "ceramic" | "implant" | "lumineer" | "e_max" | "veneer";

const WORK_TYPES: Record<WorkType, { ar: string; en: string; icon: typeof Crown; color: string }> = {
  zircon: { ar: "زيركون", en: "Zircon", icon: Crown, color: "text-amber-500 bg-amber-50" },
  inlay_onlay: { ar: "إنلاي وأونلاي", en: "Inlay & Onlay", icon: Sparkles, color: "text-orange-500 bg-orange-50" },
  night_guard: { ar: "واقي ليلي", en: "Night Guard", icon: Layers, color: "text-violet-500 bg-violet-50" },
  ceramic: { ar: "سيراميك", en: "Ceramic", icon: Sparkles, color: "text-pink-500 bg-pink-50" },
  implant: { ar: "زرعة", en: "Implant", icon: Syringe, color: "text-emerald-500 bg-emerald-50" },
  lumineer: { ar: "لومينير", en: "Lumineer", icon: Sparkles, color: "text-sky-500 bg-sky-50" },
  e_max: { ar: "إيماكس", en: "E-Max", icon: Sparkles, color: "text-rose-500 bg-rose-50" },
  veneer: { ar: "فينير", en: "Veneer", icon: Sparkles, color: "text-cyan-500 bg-cyan-50" },
};

function formatShortDate(v: unknown): string {
  if (!v) return "-";
  let d: Date;
  const o = v as { toDate?: () => Date; toMillis?: () => number };
  if (typeof o.toDate === "function") d = o.toDate();
  else if (typeof o.toMillis === "function") d = new Date(o.toMillis());
  else d = new Date(v as string);
  if (isNaN(d.getTime())) return "-";
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
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

  if (role?.accountType === "supply" || role?.accountType === "implant") return <SupplierOrders />;
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
  const { user } = useSession();
  const { role } = useUserRole();
  const cart = useCart();
  const queryClient = useQueryClient();
  const [placing, setPlacing] = useState(false);

  const handlePlaceOrder = async () => {
    if (!user || cart.length === 0) return;
    setPlacing(true);
    try {
      const { count } = await placeCartOrder({
        id: user.uid,
        name: role?.name || (ar ? "طبيب أسنان" : "Dentist"),
        phone: role?.phone,
        address: role?.address,
        city: role?.city,
        clinicName: role?.clinicName,
      });
      await queryClient.invalidateQueries({ queryKey: ["orders", "dentist", user.uid] });
      toast.success(
        ar ? `تم إرسال ${count} طلب بنجاح` : `${count} order(s) placed successfully`,
      );
    } catch (e: any) {
      toast.error(ar ? `فشل إرسال الطلب: ${e?.message || e}` : `Order failed: ${e?.message || e}`);
    } finally {
      setPlacing(false);
    }
  };

  const { data: myOrders = [], isLoading } = useDentistOrders(user?.uid);

  if (!user) {
    return (
      <MobileShell>
        <TopBar title={ar ? "طلباتي" : "My Orders"} showBack />
        <div className="p-6 text-center space-y-3">
          <Package className="size-10 text-slate-300 mx-auto" />
          <p className="font-bold text-slate-600">
            {ar ? "يجب تسجيل الدخول أولاً" : "Please sign in first"}
          </p>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <TopBar title={ar ? "طلباتي" : "My Orders"} showBack />
      <div className="px-4 pt-4 pb-6 space-y-4">

        {cart.length > 0 && (
          <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-bold text-sm text-sky-800">{ar ? "سلة التسوق" : "Shopping Cart"}</p>
                <p className="text-xs text-sky-600 mt-0.5">
                  {cart.length} {ar ? "منتجات" : "products"} · ${cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0).toFixed(2)}
                </p>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={placing}
              className="w-full h-11 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition disabled:opacity-60"
            >
              {placing ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {placing ? (ar ? "جارٍ الإرسال..." : "Placing...") : ar ? "إتمام الطلب" : "Complete order"}
            </button>
          </div>
        )}

        <h3 className="font-bold text-sm text-slate-600">
          {ar ? "سجل الطلبات السابقة" : "Past orders"}
        </h3>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 text-primary animate-spin" />
          </div>
        ) : myOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Package className="size-9 text-slate-400" />
            </div>
            <p className="font-bold text-lg text-slate-500">{ar ? "لا توجد طلبات سابقة" : "No past orders"}</p>
            <p className="text-sm text-slate-400 mt-1">{ar ? "ستظهر هنا طلبات الشراء التي قمت بها" : "Your purchase orders will appear here"}</p>
            <Link to="/supplies" className="mt-4 inline-flex h-11 px-5 rounded-xl bg-primary text-primary-foreground font-bold text-sm items-center gap-2 hover:opacity-90 transition">
              <Package className="size-4" />
              {ar ? "تصفح المنتجات" : "Browse Products"}
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {myOrders.map((o) => {
              const s = (o.status as string) || "pending";
              const itemCount = (o.items || []).reduce((sum, i) => sum + (i.quantity || 1), 0);
              return (
                <div key={o.id} className="bg-card border border-border rounded-2xl p-4 shadow-soft">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="size-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Package className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">
                          {o.items?.[0]?.name || (ar ? "منتج" : "Product")}
                          {itemCount > 1 ? ` +${itemCount - 1}` : ""}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {o.orderNumber || ""} · {o.createdAt ? formatShortDate(o.createdAt as unknown as string) : ""}
                        </p>
                      </div>
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                      s === "confirmed" ? "bg-emerald-100 text-emerald-700" :
                      s === "rejected" ? "bg-rose-100 text-rose-700" :
                      "bg-amber-100 text-amber-700",
                    )}>
                      {s === "pending" ? (ar ? "قيد الانتظار" : "Pending") :
                       s === "confirmed" ? (ar ? "تم التأكيد" : "Confirmed") :
                       s === "rejected" ? (ar ? "غير متوفر" : "Unavailable") : s}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{itemCount} {ar ? "منتجات" : "products"}</span>
                    <span className="font-display font-extrabold text-sm text-foreground">
                      ${(o.total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "confirmed" | "rejected">("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: supplierOrders = [], isLoading } = useSupplierOrders(supplierId);

  const statusOptions: { id: "all" | "pending" | "confirmed" | "rejected"; ar: string; en: string }[] = [
    { id: "all", ar: "الكل", en: "All" },
    { id: "pending", ar: "قيد الانتظار", en: "Pending" },
    { id: "confirmed", ar: "تم التأكيد", en: "Confirmed" },
    { id: "rejected", ar: "غير متوفر", en: "Unavailable" },
  ];

  const filteredOrders = useMemo(() => {
    return supplierOrders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          (o.orderNumber || "").toLowerCase().includes(q) ||
          (o.dentistName || "").toLowerCase().includes(q) ||
          (o.clinicName || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [supplierOrders, statusFilter, search]);

  const handleConfirm = async (o: OrderDoc) => {
    setBusyId(o.id);
    try {
      await confirmOrder(o);
      queryClient.invalidateQueries({ queryKey: ["orders", "supplier", supplierId] });
      toast.success(
        ar ? "تم تأكيد الطلب وتحويله إلى فاتورة" : "Order confirmed and converted to invoice",
      );
    } catch (e: any) {
      toast.error(ar ? `فشل التأكيد: ${e?.message || e}` : `Confirm failed: ${e?.message || e}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleUnavailable = async (o: OrderDoc) => {
    setBusyId(o.id);
    try {
      await markOrderUnavailable(o.id);
      queryClient.invalidateQueries({ queryKey: ["orders", "supplier", supplierId] });
      toast.success(ar ? "تم تحديد الطلب كغير متوفر" : "Order marked as unavailable");
    } catch (e: any) {
      toast.error(ar ? `فشل التحديث: ${e?.message || e}` : `Update failed: ${e?.message || e}`);
    } finally {
      setBusyId(null);
    }
  };

  const fmtTotal = (o: OrderDoc) => {
    const usd = o.totalUSD ?? 0;
    const iqd = o.totalIQD ?? 0;
    if (iqd > 0 && usd > 0) {
      return ar ? `${iqd.toLocaleString()} د.ع + $${usd.toFixed(2)}` : `${iqd.toLocaleString()} IQD + $${usd.toFixed(2)}`;
    }
    if (iqd > 0) return `${iqd.toLocaleString()} د.ع`;
    return `$${(o.total || 0).toFixed(2)}`;
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
                ? ar ? "لا توجد طلبات حتى الآن" : "No orders yet"
                : ar ? "لا توجد نتائج مطابقة" : "No matching orders"}
            </div>
          ) : (
            filteredOrders.map((o) => {
              const s = o.status;
              const itemCount = (o.items || []).reduce((sum, i) => sum + (i.quantity || 1), 0);
              const firstItem = o.items?.[0]?.name || (ar ? "منتج" : "Product");
              const isPending = s === "pending";
              return (
                <div key={o.id} className="bg-card border border-border rounded-2xl p-4 shadow-soft">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="size-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                        <Package className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-bold text-muted-foreground">
                          {o.orderNumber || `#${o.id.slice(0, 8).toUpperCase()}`}
                        </p>
                        <p className="font-display font-bold text-sm truncate">
                          {o.dentistName || (ar ? "طبيب" : "Doctor")}
                          {o.clinicName ? ` · ${o.clinicName}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0",
                      s === "confirmed" ? "bg-emerald-100 text-emerald-700" :
                      s === "rejected" ? "bg-rose-100 text-rose-700" :
                      "bg-amber-100 text-amber-700",
                    )}>
                      {s === "pending" ? (ar ? "قيد الانتظار" : "Pending") :
                       s === "confirmed" ? (ar ? "تم التأكيد" : "Confirmed") :
                       s === "rejected" ? (ar ? "غير متوفر" : "Unavailable") : s}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mb-2 truncate">
                    {firstItem}{itemCount > 1 ? ` +${itemCount - 1}` : ""}
                  </p>

                  <div className="flex items-center justify-between text-xs text-slate-500 border-t border-dashed border-border pt-2.5">
                    <span>
                      {itemCount} {ar ? "منتج" : "products"} · {o.createdAt ? formatShortDate(o.createdAt) : "-"}
                    </span>
                    <span className="font-display font-extrabold text-sm text-foreground">
                      {fmtTotal(o)}
                    </span>
                  </div>

                  {isPending && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                      <button
                        onClick={() => handleConfirm(o)}
                        disabled={busyId === o.id}
                        className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition disabled:opacity-60"
                      >
                        {busyId === o.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                        {ar ? "تأكيد الطلب" : "Confirm"}
                      </button>
                      <button
                        onClick={() => handleUnavailable(o)}
                        disabled={busyId === o.id}
                        className="flex-1 h-10 rounded-xl bg-card border border-border text-muted-foreground text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-rose-50 hover:text-rose-600 transition disabled:opacity-60"
                      >
                        <X className="size-4" />
                        {ar ? "الطلب غير متوفر" : "Unavailable"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </MobileShell>
  );
}
