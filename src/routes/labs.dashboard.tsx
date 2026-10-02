import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { NotificationBell } from "@/components/NotificationBell";
import { LabStaffPanel } from "@/components/LabStaffPanel";
import { OrderInvoiceModal } from "@/components/OrderInvoiceModal";
import { CombinedLabOrderModal, type CombinedLabOrder } from "@/components/CombinedLabOrderModal";
import { useI18n } from "@/lib/i18n";
import { useUserRole } from "@/lib/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  addOrder,
  buildInternalOrder,
  useOrders,
  connectLabOrders,
  disconnectLabOrders,
  updateOrderStatus,
  type Order,
  type OrderStatus,
} from "@/lib/ordersStore";
import { getCaseProgress, getStageLabel, getStatusLabel } from "@/lib/caseTracking";
import {
  AlertCircle,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Layers,
  List,
  Megaphone,
  Menu,
  Phone,
  Plus,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCircle2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/labs/dashboard")({
  component: LabDashboard,
});

const STATUS_AR: Record<OrderStatus, string> = {
  new: "جديد",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
  delayed: "متأخر",
};
const STATUS_EN: Record<OrderStatus, string> = {
  new: "New",
  in_progress: "In Progress",
  completed: "Completed",
  delayed: "Delayed",
};
const STATUS_TONE: Record<OrderStatus, string> = {
  new: "bg-sky-100 text-sky-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  delayed: "bg-rose-100 text-rose-700",
};
const STATUS_ACCENT: Record<OrderStatus, string> = {
  new: "#0369A1",
  in_progress: "#B45309",
  completed: "#047857",
  delayed: "#B91C1C",
};

const STAT_CARDS: { key: "all" | OrderStatus; ar: string; en: string; icon: LucideIcon; bg: string; fg: string }[] = [
  { key: "all", ar: "إجمالي الطلبات", en: "Total Orders", icon: Layers, bg: "#E0F2FE", fg: "#0369A1" },
  { key: "in_progress", ar: "قيد التنفيذ", en: "In Production", icon: Clock, bg: "#FEF3C7", fg: "#B45309" },
  { key: "completed", ar: "مكتملة", en: "Completed", icon: CheckCircle2, bg: "#D1FAE5", fg: "#047857" },
  { key: "delayed", ar: "متأخرة", en: "Delayed", icon: AlertCircle, bg: "#FEE2E2", fg: "#B91C1C" },
];

// Below this many orders last month a percentage is misleading (1 → 2 reads
// as "+100%"), so the trend falls back to a plain count difference.
const MIN_TREND_SAMPLE = 5;

function monthKey(d: Date): number {
  return d.getFullYear() * 12 + d.getMonth();
}

function activityTime(o: Order): number {
  if (o.updatedAt) return o.updatedAt;
  const t = new Date(o.receivedDate || o.dueDate || 0).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function trendLabel(t: { cur: number; prev: number }, ar: boolean): { text: string; up: boolean } | null {
  if (t.cur === 0 && t.prev === 0) return null;
  const delta = t.cur - t.prev;
  const suffix = ar ? "عن الشهر الماضي" : "vs last month";
  if (t.prev >= MIN_TREND_SAMPLE) {
    const pct = Math.round((delta / t.prev) * 100);
    return { text: `${pct >= 0 ? "+" : ""}${pct}% ${suffix}`, up: pct >= 0 };
  }
  return { text: `${delta >= 0 ? "+" : ""}${delta} ${suffix}`, up: delta >= 0 };
}

function nextStatus(s: OrderStatus): OrderStatus {
  if (s === "new" || s === "delayed") return "in_progress";
  return "completed";
}

type MenuItem = { key: string; ar: string; en: string; icon: LucideIcon; to?: string };

const MENU_ITEMS: MenuItem[] = [
  { key: "new_order", ar: "طلب جديد", en: "New Order", icon: Plus },
  { key: "orders", ar: "الطلبات", en: "Orders", icon: List, to: "/orders" },
  { key: "doctors", ar: "الأطباء", en: "Doctors", icon: Users, to: "/lab-doctors" },
  { key: "accounts", ar: "الحسابات", en: "Accounts", icon: CreditCard, to: "/finance" },
  { key: "patients", ar: "المرضى", en: "Patients", icon: Users, to: "/lab-patients" },
  { key: "reports", ar: "التقارير", en: "Reports", icon: BarChart3, to: "/reports" },
  { key: "services", ar: "خدمات المختبر", en: "Lab Services", icon: Sparkles, to: "/lab/my-services" },
  { key: "myads", ar: "إعلاناتي", en: "My Ads", icon: Megaphone, to: "/my-ads" },
];

function LabSidebar({
  open,
  ar,
  onClose,
  onNewOrder,
}: {
  open: boolean;
  ar: boolean;
  onClose: () => void;
  onNewOrder: () => void;
}) {
  const navigate = useNavigate();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="absolute inset-y-0 start-0 w-[78%] max-w-[300px] bg-[#0F172A] flex flex-col animate-in fade-in duration-200">
        <div className="flex items-center justify-between border-b border-white/10 px-4 pb-4 pt-6">
          <p className="text-sm font-extrabold text-white">{ar ? "القائمة" : "Menu"}</p>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-lg bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition"
          >
            <X className="size-4" />
          </button>
        </div>
        <nav className="p-3 space-y-1 overflow-y-auto">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                onClose();
                if (item.key === "new_order") onNewOrder();
                else if (item.to) navigate({ to: item.to });
              }}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-start hover:bg-white/5 transition"
            >
              <span className="size-9 rounded-lg bg-white/10 text-slate-200 flex items-center justify-center shrink-0">
                <item.icon className="size-4" />
              </span>
              <span className="text-sm font-semibold text-white">{ar ? item.ar : item.en}</span>
            </button>
          ))}
        </nav>
      </aside>
    </div>
  );
}

function LabDashboard() {
  const { lang, toggle } = useI18n();
  const ar = lang === "ar";
  const { user, role } = useUserRole();
  const orders = useOrders();
  const [tab, setTab] = useState<"cases" | "team">("cases");
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNewOrder, setShowNewOrder] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    connectLabOrders(user.uid);
    return () => disconnectLabOrders();
  }, [user?.uid]);

  // A doctor-sent case the lab hasn't priced/confirmed yet belongs in the
  // incoming-orders screen, not here. Most recently touched first.
  const internalOrders = useMemo(
    () =>
      orders
        .filter((o) => o.source !== "incoming_doctor_case")
        .sort((a, b) => activityTime(b) - activityTime(a)),
    [orders],
  );

  const counts: Record<string, number> = { all: internalOrders.length };
  for (const o of internalOrders) counts[o.status] = (counts[o.status] ?? 0) + 1;

  const trends = useMemo(() => {
    const now = new Date();
    const curKey = monthKey(now);
    const prevKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const result: Record<string, { cur: number; prev: number }> = {
      all: { cur: 0, prev: 0 },
      new: { cur: 0, prev: 0 },
      in_progress: { cur: 0, prev: 0 },
      completed: { cur: 0, prev: 0 },
      delayed: { cur: 0, prev: 0 },
    };
    for (const o of internalOrders) {
      const d = new Date(o.receivedDate || o.dueDate || "");
      if (isNaN(d.getTime())) continue;
      const k = monthKey(d);
      if (k !== curKey && k !== prevKey) continue;
      const bucket = k === curKey ? "cur" : "prev";
      result.all[bucket]++;
      // Older cases can carry a status outside the four known ones.
      if (result[o.status]) result[o.status][bucket]++;
    }
    return result;
  }, [internalOrders]);

  const filtered = useMemo(() => {
    let list = filter === "all" ? internalOrders : internalOrders.filter((o) => o.status === filter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (o) =>
          (o.patient || "").toLowerCase().includes(q) ||
          (o.doctor || "").toLowerCase().includes(q) ||
          (o.orderNumber || "").toLowerCase().includes(q) ||
          String(o.caseId || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [internalOrders, filter, search]);

  const handleCreateOrder = (o: CombinedLabOrder) => {
    addOrder(buildInternalOrder(o, "new"));
    toast.success(ar ? "تمت إضافة الطلب" : "Order added");
  };

  const labName = role?.name || (ar ? "المختبر" : "Lab");
  const labAddress = [role?.city, role?.address].filter(Boolean).join("، ");

  return (
    <MobileShell wide>
      <div className="px-4 pt-4 pb-6 md:px-6 md:pt-8 lg:px-8 lg:max-w-6xl lg:mx-auto">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-[#0F172A] p-4 md:p-6">
          <div className="pointer-events-none absolute -end-8 -top-12 size-40 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -start-10 -bottom-14 size-36 rounded-full bg-white/[0.04]" />
          <Layers className="pointer-events-none absolute -end-2 -bottom-3.5 size-[104px] text-white/[0.06]" strokeWidth={1.2} />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label={ar ? "القائمة" : "Menu"}
                className="size-9 rounded-xl border border-white/20 bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition"
              >
                <Menu className="size-4" />
              </button>
              <button
                type="button"
                onClick={toggle}
                className="h-9 px-3 rounded-xl border border-white/20 bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition"
              >
                {ar ? "EN" : "AR"}
              </button>
            </div>
            <NotificationBell userId={user?.uid || ""} dark />
          </div>

          <div className="relative mt-3 flex items-start justify-between">
            <div className="min-w-0 flex-1 pe-3">
              <p className="text-[11px] font-bold text-[#60A5FA]">{ar ? "مرحباً" : "Welcome"}</p>
              <p className="mt-0.5 truncate text-xl font-extrabold text-white md:text-2xl">{labName}</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="h-1 w-5 rounded-full bg-[#3B82F6]" />
                <span className="text-[11px] text-white/60">
                  {ar ? "شريكك لنجاح أفضل" : "Your partner for better results"}
                </span>
              </div>
              {role?.phone && (
                <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-2.5 py-1 text-[11px] text-white/85" dir="ltr">
                  <Phone className="size-3 text-white/75" />
                  {role.phone}
                </span>
              )}
            </div>
            <Link to="/account" className="relative shrink-0">
              <span className="size-14 rounded-full border-2 border-white/20 bg-white/[0.12] flex items-center justify-center overflow-hidden">
                {role?.photoURL ? (
                  <img src={role.photoURL} alt="" className="size-full object-cover" />
                ) : (
                  <UserCircle2 className="size-7 text-white/80" />
                )}
              </span>
              <span className="absolute -end-0.5 -bottom-0.5 size-5 rounded-full border-2 border-[#0F172A] bg-[#3B82F6] flex items-center justify-center">
                <BadgeCheck className="size-3 text-white" />
              </span>
            </Link>
          </div>
        </div>

        <LabSidebar
          open={sidebarOpen}
          ar={ar}
          onClose={() => setSidebarOpen(false)}
          onNewOrder={() => setShowNewOrder(true)}
        />

        {/* Tabs */}
        <div className="mt-3 flex gap-1.5 rounded-2xl bg-slate-100 p-1.5 md:max-w-md">
          {(["cases", "team"] as const).map((t) => {
            const TabIcon = t === "cases" ? FileText : Users;
            const active = tab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "min-h-10 flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition",
                  active ? "bg-[#0F172A] text-white" : "text-slate-500 hover:text-slate-700",
                )}
              >
                <TabIcon className="size-3.5" />
                {t === "cases" ? (ar ? "الحالات" : "Cases") : ar ? "كادر المختبر" : "Lab Staff"}
              </button>
            );
          })}
        </div>

        {tab === "cases" ? (
          <>
            {/* Stat cards — tapping one filters the list below. */}
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {STAT_CARDS.map((c) => {
                const active = filter === c.key;
                const Icon = c.icon;
                const trend = trendLabel(trends[c.key] ?? { cur: 0, prev: 0 }, ar);
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setFilter(active ? "all" : c.key)}
                    className={cn(
                      "relative overflow-hidden rounded-2xl p-4 text-start transition",
                      active && "shadow-md",
                    )}
                    style={{
                      backgroundColor: c.bg,
                      color: c.fg,
                      outline: active ? `2px solid ${c.fg}` : undefined,
                      outlineOffset: active ? 2 : undefined,
                    }}
                  >
                    <Icon className="pointer-events-none absolute -end-3 -bottom-3 size-16 opacity-[0.12]" strokeWidth={1.2} />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wide">{ar ? c.ar : c.en}</span>
                      <span className="size-8 rounded-xl bg-white/60 flex items-center justify-center">
                        <Icon className="size-4" />
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-extrabold font-display">{counts[c.key] ?? 0}</p>
                    {trend && (
                      <div className="mt-1.5 flex items-center gap-1">
                        {trend.up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                        <span className="text-[10px] font-semibold truncate">{trend.text}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="relative mt-4 md:max-w-md">
              <Search className="size-4 absolute top-1/2 -translate-y-1/2 start-3.5 text-slate-400 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={ar ? "ابحث عن حالة، طبيب أو مريض…" : "Search case, doctor or patient…"}
                className="w-full h-11 bg-white rounded-xl border border-slate-200 ps-10 pe-4 text-sm outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
              />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-slate-500" />
                <p className="text-sm font-extrabold text-slate-800">
                  {filter === "all"
                    ? ar
                      ? "الحالات الأخيرة"
                      : "Recent Cases"
                    : ar
                      ? STATUS_AR[filter]
                      : STATUS_EN[filter]}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                {filtered.length} {ar ? "حالة" : "cases"}
              </span>
            </div>

            {filtered.length === 0 ? (
              <p className="mt-12 text-center text-slate-500">{ar ? "لا توجد حالات" : "No cases"}</p>
            ) : (
              <div className="mt-3 grid gap-3 pb-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((o) => (
                  <div
                    key={o.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelected(o)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setSelected(o);
                    }}
                    className="cursor-pointer rounded-2xl border border-slate-200 border-s-[3px] bg-white p-3.5 shadow-sm hover:shadow-md transition"
                    style={{ borderInlineStartColor: STATUS_ACCENT[o.status] ?? "#64748B" }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm font-extrabold text-slate-800">{o.patient || "—"}</p>
                      <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold", STATUS_TONE[o.status] ?? "bg-slate-100 text-slate-600")}>
                        {(ar ? STATUS_AR[o.status] : STATUS_EN[o.status]) ?? getStatusLabel(o.status, lang)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-slate-500">
                      {[o.workType, o.orderNumber, o.unitsCount ? `${o.unitsCount} ${ar ? "وحدة" : "units"}` : undefined]
                        .filter(Boolean)
                        .join(" · ") || (ar ? "بلا تفاصيل" : "No details")}
                    </p>
                    {(o.currentStage || o.status === "completed") && (
                      <div className="mt-2">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${o.status === "completed" ? 100 : Math.min(100, getCaseProgress(o.currentStage))}%`,
                              backgroundColor: STATUS_ACCENT[o.status] ?? "#64748B",
                            }}
                          />
                        </div>
                        {o.currentStage && (
                          <p className="mt-0.5 text-center text-[10px] text-slate-400">
                            {o.status === "completed" ? (ar ? "مكتملة" : "Completed") : getStageLabel(o.currentStage, lang)}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="mt-2.5 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {o.status !== "completed" && (
                        <button
                          type="button"
                          onClick={() => updateOrderStatus(o.id, nextStatus(o.status))}
                          className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition"
                        >
                          {ar ? "تقدم للمرحلة التالية" : "Advance"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => updateOrderStatus(o.id, o.status === "delayed" ? "in_progress" : "delayed")}
                        className={cn(
                          "flex-1 h-9 rounded-xl border bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition",
                          o.status === "delayed" ? "border-slate-200" : "border-rose-200",
                        )}
                      >
                        {o.status === "delayed" ? (ar ? "إلغاء التأخير" : "Clear delay") : ar ? "تأخير" : "Delay"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="mt-4">
            <LabStaffPanel labId={user?.uid ?? ""} ar={ar} />
          </div>
        )}
      </div>

      {selected && (
        <OrderInvoiceModal
          order={selected}
          labName={labName}
          labAddress={labAddress}
          labPhone={role?.phone || ""}
          onClose={() => setSelected(null)}
        />
      )}

      <CombinedLabOrderModal
        open={showNewOrder}
        onClose={() => setShowNewOrder(false)}
        onSubmit={handleCreateOrder}
        labId={user?.uid}
      />
    </MobileShell>
  );
}
