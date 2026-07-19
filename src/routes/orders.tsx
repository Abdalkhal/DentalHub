import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { z } from "zod";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Search, Eye, Edit3, X, Crown, Sparkles, Syringe, Layers } from "lucide-react";

const ordersSearchSchema = z.object({
  status: z.enum(["all", "in_progress", "completed", "delayed"]).catch("all"),
});

export const Route = createFileRoute("/orders")({
  validateSearch: ordersSearchSchema,
  component: Orders,
});

type OrderStatus = "all" | "in_progress" | "completed" | "delayed";
type WorkType = "crown" | "veneer" | "implant" | "clear_aligner";

type LabOrder = {
  id: string;
  orderNumber: string;
  patient: string;
  clinic: string;
  doctor: string;
  workType: WorkType;
  dateReceived: string;
  dueDate: string;
  status: Exclude<OrderStatus, "all">;
  amount: number;
};

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

const STATUS_META: Record<
  Exclude<OrderStatus, "all">,
  { ar: string; en: string; color: string; dot: string }
> = {
  in_progress: {
    ar: "قيد التنفيذ",
    en: "In Progress",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  completed: {
    ar: "مكتمل",
    en: "Completed",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  delayed: {
    ar: "متأخر",
    en: "Delayed",
    color: "bg-rose-100 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
};

const MOCK_ORDERS: LabOrder[] = [
  {
    id: "1",
    orderNumber: "ORD-001",
    patient: "سارة محمد",
    clinic: "عيادة النور",
    doctor: "د. أحمد علي",
    workType: "crown",
    dateReceived: "2026-07-15",
    dueDate: "2026-07-22",
    status: "in_progress",
    amount: 120,
  },
  {
    id: "2",
    orderNumber: "ORD-002",
    patient: "خالد عمر",
    clinic: "مجمع عيادات الفارابي",
    doctor: "د. نورا سعيد",
    workType: "veneer",
    dateReceived: "2026-07-14",
    dueDate: "2026-07-21",
    status: "completed",
    amount: 250,
  },
  {
    id: "3",
    orderNumber: "ORD-003",
    patient: "مريم حسن",
    clinic: "عيادة الريان",
    doctor: "د. كريم جمال",
    workType: "implant",
    dateReceived: "2026-07-10",
    dueDate: "2026-07-20",
    status: "delayed",
    amount: 800,
  },
  {
    id: "4",
    orderNumber: "ORD-004",
    patient: "أحمد رضا",
    clinic: "عيادة السلام",
    doctor: "د. ليلى نصر",
    workType: "clear_aligner",
    dateReceived: "2026-07-16",
    dueDate: "2026-08-01",
    status: "in_progress",
    amount: 450,
  },
  {
    id: "5",
    orderNumber: "ORD-005",
    patient: "نورة فهد",
    clinic: "مجمع عيادات الفارابي",
    doctor: "د. أحمد علي",
    workType: "crown",
    dateReceived: "2026-07-12",
    dueDate: "2026-07-19",
    status: "delayed",
    amount: 120,
  },
  {
    id: "6",
    orderNumber: "ORD-006",
    patient: "فيصل هاني",
    clinic: "عيادة النور",
    doctor: "د. سامي نور",
    workType: "veneer",
    dateReceived: "2026-07-17",
    dueDate: "2026-07-24",
    status: "completed",
    amount: 200,
  },
  {
    id: "7",
    orderNumber: "ORD-007",
    patient: "لينا عبد الله",
    clinic: "عيادة الريان",
    doctor: "د. ليلى نصر",
    workType: "implant",
    dateReceived: "2026-07-18",
    dueDate: "2026-07-28",
    status: "in_progress",
    amount: 750,
  },
  {
    id: "8",
    orderNumber: "ORD-008",
    patient: "يوسف محمود",
    clinic: "عيادة الزهراء",
    doctor: "د. كريم جمال",
    workType: "clear_aligner",
    dateReceived: "2026-07-13",
    dueDate: "2026-07-27",
    status: "completed",
    amount: 400,
  },
];

function Orders() {
  const { lang, t } = useI18n();
  const ar = lang === "ar";
  const navigate = useNavigate();

  const { status: initialStatus } = useSearch({ from: "/orders" });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus>(initialStatus);
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);

  const statusOptions: { id: OrderStatus; ar: string; en: string }[] = [
    { id: "all", ar: t("filter_all"), en: "All" },
    { id: "in_progress", ar: t("filter_in_production"), en: "In Progress" },
    { id: "completed", ar: t("filter_completed"), en: "Completed" },
    { id: "delayed", ar: t("filter_late"), en: "Late" },
  ];

  const filteredOrders = useMemo(() => {
    return MOCK_ORDERS.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          o.orderNumber.toLowerCase().includes(q) ||
          o.patient.includes(q) ||
          o.doctor.includes(q) ||
          o.clinic.includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [statusFilter, search]);

  return (
    <MobileShell>
      <TopBar title={ar ? "طلباتي" : "My Orders"} showBack />
      <div className="px-4 pt-4 pb-6 space-y-4">
        {/* Search bar */}
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

        {/* Status filter chips */}
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

        {/* Results count */}
        <p className="text-xs text-muted-foreground">
          {filteredOrders.length} {ar ? "طلب" : "order"}
          {filteredOrders.length !== 1 ? (ar ? "ات" : "s") : ""}
        </p>

        {/* Orders list */}
        <div className="space-y-2">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              {ar ? "لا توجد طلبات مطابقة" : "No matching orders"}
            </div>
          ) : (
            filteredOrders.map((o) => {
              const wt = WORK_TYPES[o.workType];
              const sm = STATUS_META[o.status];
              const WtIcon = wt.icon;
              return (
                <div
                  key={o.id}
                  className="bg-card border border-border rounded-2xl p-4 shadow-soft hover:shadow-card transition"
                >
                  {/* Top row: Case ID + Status badge */}
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
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0",
                        sm.color,
                      )}
                    >
                      <span className={cn("size-1.5 rounded-full", sm.dot)} />
                      {ar ? sm.ar : sm.en}
                    </span>
                  </div>
                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                    <div>
                      <p className="text-muted-foreground font-medium">{t("clinic_name")}</p>
                      <p className="font-semibold text-foreground truncate">{o.clinic}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-medium">{t("work_type")}</p>
                      <p className="font-semibold text-foreground">{ar ? wt.ar : wt.en}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-medium">{t("doctor")}</p>
                      <p className="font-semibold text-foreground truncate">{o.doctor}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-medium">{t("received_date")}</p>
                      <p className="font-semibold text-foreground">{o.dateReceived}</p>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <button
                      onClick={() => setSelectedOrder(o)}
                      className="flex-1 h-9 rounded-xl bg-primary/10 text-primary text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-primary/20 transition"
                    >
                      <Eye className="size-3.5" />
                      {t("view")}
                    </button>
                    <button
                      onClick={() => setSelectedOrder(o)}
                      className="flex-1 h-9 rounded-xl bg-card border border-border text-muted-foreground text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-accent transition"
                    >
                      <Edit3 className="size-3.5" />
                      {t("edit")}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-card w-full max-w-md rounded-3xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-extrabold text-lg">
                {ar
                  ? `تفاصيل ${selectedOrder.orderNumber}`
                  : `Details ${selectedOrder.orderNumber}`}
              </h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="size-9 rounded-xl hover:bg-accent flex items-center justify-center text-muted-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">{t("patient")}</p>
                  <p className="font-bold text-foreground">{selectedOrder.patient}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                    {t("clinic_name")}
                  </p>
                  <p className="font-bold text-foreground">{selectedOrder.clinic}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">{t("doctor")}</p>
                  <p className="font-bold text-foreground">{selectedOrder.doctor}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                    {t("received_date")}
                  </p>
                  <p className="font-bold text-foreground">{selectedOrder.dateReceived}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                    {t("work_type")}
                  </p>
                  <WorkBadge type={selectedOrder.workType} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">{t("status")}</p>
                  <StatusBadge status={selectedOrder.status} />
                </div>
              </div>
              <div className="pt-3 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  {ar ? "تغيير الحالة" : "Change Status"}
                </p>
                <div className="flex gap-2">
                  {(
                    Object.entries(STATUS_META) as [
                      Exclude<OrderStatus, "all">,
                      (typeof STATUS_META)[keyof typeof STATUS_META],
                    ][]
                  ).map(([key, meta]) => (
                    <button
                      key={key}
                      className={cn(
                        "flex-1 h-10 rounded-xl text-xs font-bold border-2 transition-all",
                        selectedOrder.status === key
                          ? `${meta.color} scale-105`
                          : "border-border text-muted-foreground hover:border-primary",
                      )}
                    >
                      {ar ? meta.ar : meta.en}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-2">
                <label className="block">
                  <span className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                    {t("lab_notes")}
                  </span>
                  <textarea
                    rows={3}
                    placeholder={ar ? "أضف ملاحظات..." : "Add notes..."}
                    className="w-full bg-slate-50 rounded-xl px-3 py-2.5 outline-none text-sm focus:ring-2 focus:ring-sky-300 resize-none"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </MobileShell>
  );
}

function WorkBadge({ type }: { type: WorkType }) {
  const wt = WORK_TYPES[type];
  const Icon = wt.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
        wt.color,
      )}
    >
      <Icon className="size-3.5" />
      {wt.en}
    </span>
  );
}

function StatusBadge({ status }: { status: Exclude<OrderStatus, "all"> }) {
  const sm = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border",
        sm.color,
      )}
    >
      <span className={cn("size-1.5 rounded-full", sm.dot)} />
      {sm.en}
    </span>
  );
}
