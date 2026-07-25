import { useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search,
  Bell,
  MessageSquare,
  Globe,
  Eye,
  Edit3,
  Plus,
  Users,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  ArrowRight,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { NewOrderModal, type NewOrder } from "./NewOrderModal";
import { OrderDetailsModal } from "./OrderDetailsModal";
import {
  useOrders,
  addOrder,
  updateOrderStatus,
  getNextOrderNumber,
  getNextCaseId,
  type Order,
  type OrderStatus,
} from "@/lib/ordersStore";

const STATUS_META: Record<OrderStatus, { ar: string; en: string; badge: string; dot: string }> = {
  in_progress: {
    ar: "قيد التنفيذ",
    en: "In Progress",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  completed: {
    ar: "مكتملة",
    en: "Completed",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  delayed: {
    ar: "متأخرة",
    en: "Delayed",
    badge: "bg-rose-100 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
};

const WORK_TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  crown: { ar: "تاج", en: "Crown" },
  veneer: { ar: "قشرة", en: "Veneer" },
  implant: { ar: "زرعة", en: "Implant" },
  clear_aligner: { ar: "مصفف شفاف", en: "Clear Aligner" },
};

type FilterType = "all" | "delayed" | "completed" | "in_progress";

export function DashboardHome() {
  const { lang, t, toggle, dir } = useI18n();
  const ar = lang === "ar";
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const orders = useOrders();
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const selectedOrder = useMemo(
    () => (selectedOrderId ? (orders.find((o) => o.id === selectedOrderId) ?? null) : null),
    [selectedOrderId, orders],
  );

  const handleStatusChange = (id: string, newStatus: OrderStatus) => {
    updateOrderStatus(id, newStatus);
  };

  const hour = new Date().getHours();
  const isMorning = hour >= 5 && hour < 12;
  const greeting = isMorning ? t("greeting_morning") : t("greeting_evening");

  const filteredOrders = orders.filter((o) => {
    if (filter === "delayed" && o.status !== "delayed") return false;
    if (filter === "completed" && o.status !== "completed") return false;
    if (filter === "in_progress" && o.status !== "in_progress") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matches =
        o.orderNumber.toLowerCase().includes(q) || o.patient.includes(q) || o.doctor.includes(q);
      if (!matches) return false;
    }
    return true;
  });

  const stats = [
    {
      key: "delayed" as FilterType,
      label: t("filter_late"),
      count: orders.filter((o) => o.status === "delayed").length,
      icon: AlertCircle,
      color: "rose",
    },
    {
      key: "completed" as FilterType,
      label: t("filter_completed"),
      count: orders.filter((o) => o.status === "completed").length,
      icon: CheckCircle2,
      color: "emerald",
    },
    {
      key: "in_progress" as FilterType,
      label: t("filter_in_production"),
      count: orders.filter((o) => o.status === "in_progress").length,
      icon: Clock,
      color: "amber",
    },
    {
      key: "all" as FilterType,
      label: t("total_orders"),
      count: orders.length,
      icon: Package,
      color: "sky",
    },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-50 overflow-x-hidden">
      <div className="relative w-full min-h-screen bg-white flex flex-col shadow-soft">
        <div className="flex-1 pb-28 md:pb-0">
          {/* ==================== TOP HEADER ==================== */}
          <header className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-border px-4 pt-4 pb-3">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 font-display font-extrabold text-lg">
                <span className="text-foreground">Dental</span>
                <span className="text-primary">Hub</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggle}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-card border border-border text-xs font-semibold text-foreground hover:bg-accent"
                >
                  <Globe className="size-3.5" />
                  {lang === "ar" ? "AR/EN" : "EN/AR"}
                </button>
                <button
                  className="size-9 rounded-full bg-card border border-border flex items-center justify-center text-foreground hover:bg-accent relative"
                  aria-label={t("notifications")}
                >
                  <Bell className="size-4" />
                  <span className="absolute -top-0.5 -end-0.5 size-2.5 bg-rose-500 rounded-full ring-2 ring-background" />
                </button>
                <button
                  className="size-9 rounded-full bg-card border border-border flex items-center justify-center text-foreground hover:bg-accent"
                  aria-label={t("messages")}
                >
                  <MessageSquare className="size-4" />
                </button>
              </div>
            </div>
            <div className="relative">
              <Search className="size-4 absolute top-1/2 -translate-y-1/2 start-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("search_orders_placeholder")}
                className="w-full h-11 rounded-2xl bg-card border border-border ps-10 pe-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary"
              />
            </div>
          </header>

          <div className="px-4 pt-4 space-y-5">
            {/* ==================== RESIDENT AREA ==================== */}
            <section className="bg-gradient-to-br from-primary/10 to-primary-soft/30 rounded-3xl p-5 border border-primary/10">
              <div className="flex items-start justify-between">
                <div>
                  <p
                    className={cn(
                      "text-2xl font-display font-extrabold text-foreground",
                      ar && "text-right",
                    )}
                  >
                    {greeting}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {ar ? "اليوم" : "Today"} — {t("thursday")}, 19 يوليو 2026
                  </p>
                </div>
                <div className="size-14 rounded-2xl bg-primary/15 flex items-center justify-center text-primary">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="size-7"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
              </div>
            </section>

            {/* ==================== ANALYTICS GRID ==================== */}
            <section>
              <div className="grid grid-cols-2 gap-3">
                {stats.map((stat) => {
                  const active = filter === stat.key;
                  const Icon = stat.icon;
                  const colorClasses: Record<
                    string,
                    { bg: string; text: string; ring: string; activeBg: string; activeRing: string }
                  > = {
                    rose: {
                      bg: "bg-rose-50",
                      text: "text-rose-700",
                      ring: "ring-rose-200",
                      activeBg: "bg-rose-100",
                      activeRing: "ring-rose-500",
                    },
                    emerald: {
                      bg: "bg-emerald-50",
                      text: "text-emerald-700",
                      ring: "ring-emerald-200",
                      activeBg: "bg-emerald-100",
                      activeRing: "ring-emerald-500",
                    },
                    amber: {
                      bg: "bg-amber-50",
                      text: "text-amber-700",
                      ring: "ring-amber-200",
                      activeBg: "bg-amber-100",
                      activeRing: "ring-amber-500",
                    },
                    sky: {
                      bg: "bg-sky-50",
                      text: "text-sky-700",
                      ring: "ring-sky-200",
                      activeBg: "bg-sky-100",
                      activeRing: "ring-sky-500",
                    },
                  };
                  const cc = colorClasses[stat.color];
                  return (
                    <button
                      key={stat.key}
                      onClick={() => {
                        setFilter(stat.key);
                        const statusMap: Record<string, string> = {
                          delayed: "delayed",
                          completed: "completed",
                          in_progress: "in_progress",
                          all: "all",
                        };
                        navigate({ to: "/orders", search: { status: statusMap[stat.key] } });
                      }}
                      className={cn(
                        "rounded-2xl p-4 border-2 text-start transition-all duration-200",
                        active
                          ? `${cc.activeBg} ${cc.activeRing} border-transparent shadow-sm scale-[1.02]`
                          : "bg-card border-border hover:bg-accent/50",
                      )}
                    >
                      <div
                        className={cn(
                          "size-10 rounded-xl flex items-center justify-center mb-3 transition-colors",
                          active ? `${cc.bg} ring-2 ${cc.activeRing}` : "bg-muted",
                        )}
                      >
                        <Icon
                          className={cn("size-5", active ? cc.text : "text-muted-foreground")}
                        />
                      </div>
                      <p
                        className={cn(
                          "text-2xl font-display font-extrabold transition-colors",
                          active ? cc.text : "text-foreground",
                        )}
                      >
                        {stat.count}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                        {stat.label}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ==================== ORDER LIST ==================== */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-extrabold text-lg text-foreground">
                  {t("tab_orders")}
                </h2>
                {filter !== "all" && (
                  <button
                    onClick={() => setFilter("all")}
                    className="text-xs font-bold text-primary hover:text-primary/80"
                  >
                    {t("filter_all")}
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {filteredOrders.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-10 bg-card border border-dashed border-border rounded-2xl">
                    {t("empty_orders")}
                  </div>
                ) : (
                  filteredOrders.slice(0, 5).map((order) => {
                    const sm = STATUS_META[order.status];
                    const wt = WORK_TYPE_LABELS[order.workType] ?? {
                      ar: order.workType,
                      en: order.workType,
                    };
                    return (
                      <div
                        key={order.id}
                        className="bg-card border border-border rounded-2xl p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-display font-bold text-sm text-foreground">
                            {order.orderNumber}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border",
                              sm.badge,
                            )}
                          >
                            <span className={cn("size-1.5 rounded-full", sm.dot)} />
                            {ar ? sm.ar : sm.en}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                          <div>
                            <span className="text-[11px] text-muted-foreground block">
                              {t("patient")}
                            </span>
                            <span className="font-semibold text-foreground">{order.patient}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-muted-foreground block">
                              {t("doctor")}
                            </span>
                            <span className="font-semibold text-foreground">{order.doctor}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-muted-foreground block">
                              {t("work_type")}
                            </span>
                            <span className="font-semibold text-foreground">
                              {ar ? wt.ar : wt.en}
                            </span>
                          </div>
                          <div>
                            <span className="text-[11px] text-muted-foreground block">
                              {t("received_date")}
                            </span>
                            <span className="font-semibold text-foreground">
                              {order.receivedDate}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-1 border-t border-border">
                          <button
                            onClick={() => setSelectedOrderId(order.id)}
                            className="flex-1 h-9 rounded-xl bg-primary/10 text-primary text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-primary/20 transition-colors"
                          >
                            <Eye className="size-3.5" />
                            {t("view")}
                          </button>
                          <button
                            onClick={() => setSelectedOrderId(order.id)}
                            className="flex-1 h-9 rounded-xl bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-accent/80 transition-colors"
                          >
                            <Edit3 className="size-3.5" />
                            {t("edit")}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}

                {(filteredOrders.length > 5 ||
                  (filteredOrders.length > 0 && filteredOrders.length <= 5)) && (
                  <button
                    onClick={() => {
                      const statusMap: Record<string, string> = {
                        delayed: "delayed",
                        completed: "completed",
                        in_progress: "in_progress",
                        all: "all",
                      };
                      navigate({ to: "/orders", search: { status: statusMap[filter] } });
                    }}
                    className="w-full h-11 rounded-2xl bg-card border border-border text-sm font-bold text-foreground hover:bg-accent transition-colors flex items-center justify-center gap-2"
                  >
                    {t("view_all")}
                    <ArrowRight className={cn("size-4", dir === "rtl" && "rotate-180")} />
                  </button>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* ==================== QUICK ACCESS PANEL ==================== */}
        <div className="fixed md:hidden bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur border-t border-border px-4 pt-3 pb-5">
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setShowNewOrder(true)}
              className="flex flex-col items-center gap-1.5 py-2.5 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25"
            >
              <Plus className="size-5" />
              <span className="text-[10px] font-bold">{ar ? "طلب جديد" : "New Order"}</span>
            </button>
            <button
              onClick={() => navigate({ to: "/production" })}
              className="flex flex-col items-center gap-1.5 py-2.5 rounded-2xl bg-card border border-border hover:bg-accent"
            >
              <Clock className="size-5 text-foreground" />
              <span className="text-[10px] font-bold text-foreground">
                {ar ? "الإنتاج" : "Production"}
              </span>
            </button>
            <button
              onClick={() => navigate({ to: "/doctors" })}
              className="flex flex-col items-center gap-1.5 py-2.5 rounded-2xl bg-card border border-border hover:bg-accent"
            >
              <Users className="size-5 text-foreground" />
              <span className="text-[10px] font-bold text-foreground">
                {ar ? "الأطباء" : "Doctors"}
              </span>
            </button>
            <button
              onClick={() => navigate({ to: "/account" })}
              className="flex flex-col items-center gap-1.5 py-2.5 rounded-2xl bg-card border border-border hover:bg-accent"
            >
              <CreditCard className="size-5 text-foreground" />
              <span className="text-[10px] font-bold text-foreground">
                {ar ? "الحسابات" : "Accounts"}
              </span>
            </button>
          </div>
        </div>
      </div>

      <NewOrderModal
        open={showNewOrder}
        onClose={() => setShowNewOrder(false)}
        onSubmit={(order: NewOrder) => {
          const units = order.unitsCount || 0;
          const price = order.unitPrice || 0;
          const disc = order.discount || 0;
          const total = Math.max(0, units * price - disc);
          const newOrder: Order = {
            id: crypto.randomUUID(),
            orderNumber: getNextOrderNumber(),
            caseId: getNextCaseId(),
            patient: order.patient,
            doctor: order.dentist,
            workType: order.workType,
            receivedDate: new Date().toISOString().split("T")[0],
            dueDate: order.date,
            status: "in_progress",
            agent: order.agent,
            unitsCount: units,
            unitPrice: price,
            currency: order.currency,
            discount: disc,
            price: total,
            notes: order.notes,
          };
          addOrder(newOrder);
        }}
      />

      {/* Order Status Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrderId(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
