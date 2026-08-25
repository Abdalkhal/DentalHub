import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { auth, db } from "@/integrations/firebase/client";
import { signOut } from "firebase/auth";
import { onSnapshot, doc } from "firebase/firestore";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/useAuth";
import { cn } from "@/lib/utils";
import { CombinedLabOrderModal, type CombinedLabOrder } from "@/components/CombinedLabOrderModal";
import { EditOrderModal } from "@/components/EditOrderModal";
import { OrderInvoiceModal } from "@/components/OrderInvoiceModal";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { WORK_TYPES as DENTAL_WORK_TYPES } from "@/lib/dentalConfig";
import { toast } from "sonner";
import { deriveOrderLines } from "@/lib/orderLines";
import { NotificationBell } from "@/components/NotificationBell";
import {
  addOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  useOrders,
  getNextOrderNumber,
  getNextCaseId,
  connectLabOrders,
  disconnectLabOrders,
  type Order,
  type OrderStatus,
} from "@/lib/ordersStore";
import type { UserRoleDoc } from "@/integrations/firebase/types";
import { useLabFinance, sumFinanceRevenue } from "@/lib/financeStore";
import {
  Search,
  Bell,
  MessageSquare,
  Plus,
  List,
  Users,
  CreditCard,
  ChevronLeft,
  Eye,
  Edit3,
  Trash2,
  Sparkles,
  Layers,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
  DollarSign,
  Target,
  LogOut,
  Package,
  Building2,
  ChevronDown,
  X,
  Loader2,
  Globe,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/labs/dashboard")({
  component: LabDashboard,
});

const STATUS_META: Record<OrderStatus, { ar: string; en: string; color: string; dot: string }> = {
  new: {
    ar: "جديد",
    en: "New",
    color: "bg-sky-100 text-sky-700 border-sky-200",
    dot: "bg-sky-500",
  },
  in_progress: {
    ar: "قيد التنفيذ",
    en: "In Progress",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  completed: {
    ar: "مكتملة",
    en: "Completed",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  delayed: {
    ar: "متأخرة",
    en: "Delayed",
    color: "bg-rose-100 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
};

const NAV_ITEMS = [
  { key: "home", ar: "الرئيسية", en: "Home", icon: BarChart3, path: "/labs/dashboard" },
  { key: "orders", ar: "الطلبات", en: "Orders", icon: List, path: "/orders" },
  { key: "staff", ar: "كادر المختبر", en: "Lab Staff", icon: Users, path: "/labs/staff" },
  { key: "cases", ar: "حالات العمل", en: "Work Cases", icon: Layers, path: "/production" },
  { key: "patients", ar: "المرضى", en: "Patients", icon: Users, path: "/patients" },
  { key: "doctors", ar: "الأطباء", en: "Doctors", icon: Users, path: "/doctors" },
  { key: "reports", ar: "التقارير", en: "Reports", icon: BarChart3, path: "/reports" },
  { key: "finance", ar: "المالية", en: "Finance", icon: CreditCard, path: "/finance" },
  { key: "supplies", ar: "المكاتب والمستلزمات", en: "Supplies", icon: Package, path: "/supplies" },
  { key: "labs", ar: "المختبرات", en: "Labs", icon: Building2, path: "/labs" },
  { key: "services", ar: "خدمات المختبر", en: "Lab Services", icon: Sparkles, path: "/lab/my-services" },
  { key: "messages", ar: "الرسائل", en: "Messages", icon: MessageSquare, path: "/messages" },
  { key: "settings", ar: "الإعدادات", en: "Settings", icon: Edit3, path: "/account/settings" },
];

function formatDate(date: Date, lang: "ar" | "en"): string {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", opts);
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
}

function fmtCurrency(amount: number, cur?: "USD" | "IQD"): string {
  const isIQD = cur === "IQD";
  if (isIQD) return `${amount.toLocaleString("en-US")} د.ع`;
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatCard({
  label,
  value,
  trend,
  trendUp,
  icon: Icon,
  color,
  onClick,
}: {
  label: string;
  value: string | number;
  trend: string;
  trendUp: boolean;
  icon: LucideIcon;
  color: string;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "rounded-2xl p-5 border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow duration-300",
        color,
        onClick && "cursor-pointer active:scale-[0.98]",
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wide">
          {label}
        </span>
        <span className="size-10 rounded-xl bg-white/70 flex items-center justify-center">
          <Icon className="size-5" />
        </span>
      </div>
      <p className="text-3xl font-extrabold tracking-tight font-display">{value}</p>
      <div className="flex items-center gap-1 mt-2 opacity-90">
        {trendUp ? (
          <TrendingUp className="size-3.5" />
        ) : (
          <TrendingDown className="size-3.5" />
        )}
        <span className="text-xs font-semibold">{trend}</span>
      </div>
    </Comp>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const sm = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border",
        sm.color,
      )}
    >
      <span className={cn("size-1.5 rounded-full", sm.dot)} />
      {sm.ar}
    </span>
  );
}

function LabDashboard() {
  const { lang, setLang } = useI18n();
  const ar = lang === "ar";
  const navigate = useNavigate();
  const { user } = useSession();

  const [profile, setProfile] = useState<UserRoleDoc | null>(null);
  const orders = useOrders();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("home");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "user_roles", user.uid), (snap) => {
      if (snap.exists()) setProfile(snap.data() as UserRoleDoc);
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    connectLabOrders(user.uid);
    return () => disconnectLabOrders();
  }, [user]);

  const labName = profile?.name || (ar ? "مختبر دنتال هب" : "Dental Hub Lab");
  const labAddress = profile?.city ? [profile.city, profile.address].filter(Boolean).join("، ") : profile?.address || "";
  const labPhone = profile?.phone || "";

  const internalOrders = useMemo(
    () => orders.filter((o) => o.source !== "incoming_doctor_case"),
    [orders],
  );

  const stats = useMemo(() => {
    const total = internalOrders.length;
    const inProgress = internalOrders.filter((c) => c.status === "in_progress").length;
    const completed = internalOrders.filter((c) => c.status === "completed").length;
    const delayed = internalOrders.filter((c) => c.status === "delayed").length;
    return { total, inProgress, completed, delayed };
  }, [internalOrders]);

  const { finance: labFinance } = useLabFinance(user?.uid || "");
  const totalRevenue = useMemo(() => {
    const internalIds = new Set(internalOrders.map((o) => o.id));
    return sumFinanceRevenue(labFinance.filter((f) => internalIds.has(f.caseId)));
  }, [labFinance, internalOrders]);

  const avgRating = useMemo(() => {
    const rated = internalOrders.filter((c) => c.rating != null && c.rating > 0);
    if (rated.length === 0) return null;
    return rated.reduce((sum, c) => sum + (c.rating ?? 0), 0) / rated.length;
  }, [internalOrders]);

  const filteredCases = useMemo(() => {
    let list = internalOrders;
    if (statusFilter !== "all") {
      list = list.filter((c) => c.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.orderNumber.toLowerCase().includes(q) ||
          String(c.caseId).includes(q) ||
          c.patient.toLowerCase().includes(q) ||
          c.doctor.toLowerCase().includes(q) ||
          c.agent.toLowerCase().includes(q),
      );
    }
    return list;
  }, [internalOrders, searchQuery, statusFilter]);

  const displayedCases = showAllOrders ? filteredCases : filteredCases.slice(0, 5);

  const handleStatusChange = (id: string, newStatus: OrderStatus) => {
    updateOrderStatus(id, newStatus);
    setSelectedOrder((prev) => (prev?.id === id ? { ...prev, status: newStatus } : prev));
  };

  const handleCreateOrder = (o: CombinedLabOrder) => {
    const materialLabel: Record<string, string> = {
      "material.zirconia": "زركونيا",
      "material.emax": "إيماكس",
      "material.pfm": "سيراميك على معدن",
      "material.full_cast_metal": "معدن كامل",
      "material.pmma": "تركيبات مؤقتة",
      "material.feldspathic": "سيراميك تجميلي",
      "material.clear_aligner": "تقويم شفاف",
      "material.titanium_bar": "تيتانيوم بار",
    };
    const units = o.unitsCount || 0;
    const USD_RATE = 1480;
    const workTypeLabel = DENTAL_WORK_TYPES.find((w) => w.id === o.workType)?.ar ?? o.workType ?? "";
    const pricingItems =
      o.pricingMode === "mixed" && o.pricingItems?.length
        ? o.pricingItems.map((it) => ({
            id: it.id,
            name: it.name,
            quantity: Number(it.quantity) || 0,
            unitPrice: Number(it.unitPrice) || 0,
            currency: it.currency,
          }))
        : [
            {
              id: crypto.randomUUID(),
              name: workTypeLabel,
              quantity: units,
              unitPrice: o.currency === "USD" ? (o.unitPriceIQD || 0) / USD_RATE : o.unitPriceIQD || 0,
              currency: o.currency,
            },
          ];
    const price =
      o.pricingMode === "single" && o.currency === "USD"
        ? o.finalTotalUSD
        : Math.max(0, o.finalTotalIQD);
    addOrder({
      id: crypto.randomUUID(),
      orderNumber: getNextOrderNumber(),
      caseId: getNextCaseId(),
      receivedDate: new Date().toISOString(),
      dueDate: o.deliveryDate ?? "",
      patient: o.patientName ?? "",
      doctor: o.doctorName ?? "",
      workType: materialLabel[o.material] ?? o.material ?? "",
      material: o.material ?? "",
      workTypeId: o.workType ?? "",
      manufacturingMethod: o.manufacturingMethod ?? "",
      frameworkCreation: o.frameworkCreation ?? "",
      shade: o.shade ?? "",
      pricingMode: o.pricingMode,
      currency: o.currency,
      pricingItems,
      unitsCount: units,
      unitPrice: o.unitPriceIQD || 0,
      discount: o.discountAmountIQD || 0,
      price,
      subtotalIQD: o.subtotalIQD,
      discountAmountIQD: o.discountAmountIQD,
      finalTotalUSD: o.finalTotalUSD,
      notes: o.notes ?? "",
      clinic: o.clinicName ?? "",
      implantCompany: o.implantCompany,
      implantSystem: o.implantSystem,
      implantConnection: o.implantConnection,
      implantPlatform: o.implantPlatform,
      implantScanBody: o.implantScanBody,
      implantLevel: o.implantLevel,
      implantRetention: o.implantRetention,
      alignerTreatmentType: o.alignerTreatmentType,
      alignerArch: o.alignerArch,
      alignerScans: o.alignerScans,
      alignerCount: o.alignerCount,
      alignerWearProtocol: o.alignerWearProtocol,
      titaniumFrameworkType: o.titaniumFrameworkType,
      designerId: o.designerId,
      designerName: o.designerName,
      ceramistId: o.ceramistId,
      ceramistName: o.ceramistName,
      status: "delayed",
      agent: "",
    });
  };

  const handleDelete = (target: Order) => {
    deleteOrder(target.id);
    setDeleteTarget(null);
    toast.success(ar ? "تم حذف الطلب بنجاح" : "Order deleted successfully");
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate({ to: "/auth" });
  };

  const today = new Date();

  return (
    <div className="min-h-screen bg-[#F8FAFC] overflow-x-hidden" dir={ar ? "rtl" : "ltr"}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex w-full">
        {/* ===== LEFT SIDEBAR ===== */}
        <aside
          className={cn(
            "fixed lg:sticky top-0 z-50 h-screen min-h-screen w-64 shrink-0 bg-[#0f172a] border-slate-800 flex flex-col transition-transform duration-300 lg:translate-x-0",
            ar ? "right-0 border-l" : "left-0 border-r",
            sidebarOpen ? "translate-x-0" : ar ? "translate-x-full" : "-translate-x-full",
          )}
        >
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-800 shrink-0">
            <div className="size-8 rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 text-white flex items-center justify-center shadow-md">
              <span className="font-extrabold text-sm">DH</span>
            </div>
            <span className="font-display font-extrabold text-lg">
              <span className="text-sky-400">Dental</span>
              <span className="text-white">Hub</span>
            </span>
          </div>

          {/* Quick Access */}
          <div className="p-4 space-y-2 border-b border-slate-800 shrink-0">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">
              {ar ? "الوصول السريع" : "Quick Access"}
            </p>
            <QuickAccessButton
              icon={Plus}
              label={ar ? "طلب جديد" : "New Order"}
              color="bg-sky-600 text-white hover:bg-sky-500"
              onClick={() => setShowNewOrder(true)}
            />
            <QuickAccessButton
              icon={List}
              label={ar ? "عرض الطلبات" : "View Orders"}
              color="bg-sky-600 text-white hover:bg-sky-500"
              onClick={() => navigate({ to: "/orders" })}
            />
            <QuickAccessButton
              icon={Users}
              label={ar ? "الأطباء" : "Doctors"}
              onClick={() => navigate({ to: "/doctors" })}
            />
            <QuickAccessButton
              icon={CreditCard}
              label={ar ? "الحسابات" : "Accounts"}
              onClick={() => navigate({ to: "/finance" })}
            />

            {/* Promo card */}
            <button
              onClick={() => setShowPromoModal(true)}
              className="relative mt-4 w-full rounded-2xl overflow-hidden bg-gradient-to-br from-sky-600 to-indigo-600 p-4 text-white text-right shadow-lg group"
            >
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_50%,white_0%,transparent_60%)]" />
              <p className="font-display font-bold text-sm leading-tight relative line-clamp-2">
                {profile?.labDescription
                  || (ar ? "تقنيات حديثة لنتائج دقيقة" : "Modern Tech for Precise Results")}
              </p>
              <p className="text-[11px] opacity-80 mt-1 relative">
                {ar ? "اعرف المزيد" : "Learn more"}
              </p>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1 min-h-0">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">
              {ar ? "القائمة" : "Menu"}
            </p>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeNav === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setActiveNav(item.key);
                    navigate({ to: item.path as any });
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 h-11 rounded-xl text-sm font-semibold transition-all",
                    active
                      ? "bg-teal-700 text-white shadow-sm"
                      : "text-slate-200 hover:bg-slate-800 hover:text-white",
                  )}
                >
                  <span
                    className={cn(
                      "size-8 rounded-lg flex items-center justify-center",
                      active ? "bg-white/20 text-white" : "bg-slate-800 text-slate-300",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  {ar ? item.ar : item.en}
                </button>
              );
            })}
          </nav>

          {/* Profile widget */}
          <div className="p-4 border-t border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <span className="size-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 text-white flex items-center justify-center font-display font-bold shadow-md shrink-0">
                {labName.charAt(0)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{labName}</p>
                <p className="text-[11px] text-slate-400">{ar ? "مدير النظام" : "Administrator"}</p>
              </div>
              <button
                onClick={handleLogout}
                className="size-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-rose-400 transition-colors"
                title={ar ? "تسجيل الخروج" : "Logout"}
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* ===== MAIN CONTENT ===== */}
        <main className="flex-1 min-w-0">
          {/* Top bar */}
          <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
            <div className="flex items-center justify-between px-4 lg:px-6 h-16">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden size-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <Plus className="size-4" />
              </button>

              <div className="hidden lg:flex items-center gap-3">
                <span className="text-2xl">👋</span>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {ar ? `مرحباً بك، ${labName}` : `Welcome, ${labName}`}
                  </p>
                  <p className="text-xs text-slate-500">{formatDate(today, lang)}</p>
                </div>
              </div>

              {/* Mobile greeting */}
              <div className="lg:hidden flex items-center gap-2">
                <span className="text-xl">👋</span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{labName}</p>
                  <p className="text-[10px] text-slate-500">{formatDate(today, lang)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative hidden sm:block">
                  <Search className="size-4 absolute top-1/2 -translate-y-1/2 start-3 text-slate-400 pointer-events-none" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      ar ? "بحث عن طلب، طبيب، مريض..." : "Search orders, doctors, patients..."
                    }
                    className="w-56 lg:w-72 h-10 bg-slate-50 rounded-xl border border-slate-200 ps-9 pe-3 text-sm outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                  />
                </div>
                <button
                  onClick={() => setLang(lang === "ar" ? "en" : "ar")}
                  className="size-10 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500"
                  title={ar ? "English" : "العربية"}
                >
                  <Globe className="size-5" />
                </button>
                <NotificationBell userId={user?.uid || ""} />
                <button className="size-10 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500">
                  <MessageSquare className="size-5" />
                </button>
              </div>
            </div>
            {/* Mobile search */}
            <div className="sm:hidden px-4 pb-3">
              <div className="relative">
                <Search className="size-4 absolute top-1/2 -translate-y-1/2 start-3 text-slate-400 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={ar ? "بحث..." : "Search..."}
                  className="w-full h-10 bg-slate-50 rounded-xl border border-slate-200 ps-9 pe-3 text-sm outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                />
              </div>
            </div>
          </header>

          <div className="p-4 lg:p-6 space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label={ar ? "إجمالي الطلبات" : "Total Orders"}
                value={stats.total}
                trend={ar ? "+15% عن الشهر الماضي" : "+15% vs last month"}
                trendUp
                icon={BarChart3}
                color="bg-[#E0F2FE] text-[#0369A1]"
                onClick={() => setStatusFilter("all")}
              />
              <StatCard
                label={ar ? "قيد التنفيذ" : "In Production"}
                value={stats.inProgress}
                trend={ar ? "+8% عن الشهر الماضي" : "+8% vs last month"}
                trendUp
                icon={Clock}
                color="bg-[#FEF3C7] text-[#B45309]"
                onClick={() => setStatusFilter("in_progress")}
              />
              <StatCard
                label={ar ? "مكتملة" : "Completed"}
                value={stats.completed}
                trend={ar ? "+22% عن الشهر الماضي" : "+22% vs last month"}
                trendUp
                icon={CheckCircle2}
                color="bg-[#D1FAE5] text-[#047857]"
                onClick={() => setStatusFilter("completed")}
              />
              <StatCard
                label={ar ? "متأخرة" : "Delayed"}
                value={stats.delayed}
                trend={ar ? "-3% عن الشهر الماضي" : "-3% vs last month"}
                trendUp={false}
                icon={AlertCircle}
                color="bg-[#FEE2E2] text-[#B91C1C]"
                onClick={() => setStatusFilter("delayed")}
              />
            </div>

            {/* Orders table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h2 className="font-display font-extrabold text-lg text-slate-800">
                  {statusFilter === "all"
                    ? ar ? "الطلبات الأخيرة" : "Recent Orders"
                    : STATUS_META[statusFilter][ar ? "ar" : "en"]}
                </h2>
                <span className="text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-full font-semibold">
                  {filteredCases.length} {ar ? "طلب" : "orders"}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      {[
                        ar ? "تاريخ الإخراج" : "Date",
                        ar ? "المندوب" : "Agent",
                        ar ? "رقم الحالة" : "Case ID",
                        ar ? "اسم الطبيب" : "Dentist Name",
                        ar ? "اسم المريض" : "Patient Name",
                        ar ? "نوع العمل" : "Work Type",
                        ar ? "عدد الوحدات" : "Units Count",
                        ar ? "نوع التسعير" : "Pricing Type",
                        ar ? "الإجمالي" : "Total Price",
                        "",
                      ].map((h, i) => (
                        <th
                          key={i}
                          className="text-right px-3 py-3 text-[11px] font-semibold text-slate-600 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayedCases.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center py-12 text-sm font-medium text-slate-500">
                          {ar ? "لا توجد طلبات مطابقة" : "No matching orders"}
                        </td>
                      </tr>
                    ) : (
                      displayedCases.map((c) => (
                        <tr
                          key={c.id}
                          className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-3 py-3 text-xs text-slate-700 font-medium whitespace-nowrap">
                            {formatShortDate(c.dueDate || c.receivedDate)}
                          </td>
                          <td className="px-3 py-3 text-xs text-slate-800 whitespace-nowrap font-medium">
                            {c.agent || "-"}
                          </td>
                          <td className="px-3 py-3 font-mono text-xs font-bold text-sky-700 whitespace-nowrap">
                            {c.caseId || c.orderNumber}
                          </td>
                          <td className="px-3 py-3 text-xs font-bold text-slate-900 whitespace-nowrap">
                            {c.doctor}
                          </td>
                          <td className="px-3 py-3 text-xs font-bold text-slate-900 whitespace-nowrap">
                            {c.patient}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1 max-w-[240px]">
                              {deriveOrderLines(c).map((l) => (
                                <span
                                  key={l.id}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 whitespace-nowrap"
                                  title={l.name}
                                >
                                  {l.name}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-xs text-slate-800 font-semibold whitespace-nowrap text-center">
                            {c.unitsCount ?? "-"}
                          </td>
                          <td className="px-3 py-3">
                            {c.pricingMode === "mixed" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-violet-100 text-violet-700 whitespace-nowrap">
                                <Layers className="size-3" />
                                {ar ? "وحدات متعددة" : "Mixed Units"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-100 text-sky-700 whitespace-nowrap">
                                {ar ? "وحدة واحدة" : "Single Unit"}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-xs font-bold text-emerald-700 whitespace-nowrap">
                            {fmtCurrency(c.price ?? 0, c.currency)}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setViewOrder(c)}
                                className="h-7 px-2 rounded-lg text-[11px] font-bold text-sky-600 hover:bg-sky-50 flex items-center gap-1 whitespace-nowrap"
                              >
                                <Eye className="size-3" />
                                {ar ? "عرض" : "View"}
                              </button>
                              <div className="relative">
                                <button
                                  onClick={() => setStatusMenuId(statusMenuId === c.id ? null : c.id)}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold border whitespace-nowrap cursor-pointer transition",
                                    STATUS_META[c.status].color,
                                  )}
                                >
                                  <span className={cn("size-1.5 rounded-full", STATUS_META[c.status].dot)} />
                                  {ar ? STATUS_META[c.status].ar : STATUS_META[c.status].en}
                                  <ChevronDown className="size-3" />
                                </button>
                                {statusMenuId === c.id && (
                                  <div className="absolute z-30 top-full mt-1 end-0 w-40 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                                    {(["new", "in_progress", "completed", "delayed"] as OrderStatus[]).map((s) => (
                                      <button
                                        key={s}
                                        onClick={() => {
                                          handleStatusChange(c.id, s);
                                          setStatusMenuId(null);
                                        }}
                                        className={cn(
                                          "w-full text-right px-3 py-2 text-xs font-bold hover:bg-slate-50 flex items-center gap-2 transition",
                                          c.status === s && "bg-slate-50",
                                        )}
                                      >
                                        <span className={cn("size-1.5 rounded-full", STATUS_META[s].dot)} />
                                        {ar ? STATUS_META[s].ar : STATUS_META[s].en}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => setDeleteTarget(c)}
                                className="h-7 w-7 rounded-lg text-[11px] font-bold text-rose-500 hover:bg-rose-50 flex items-center justify-center"
                                title={ar ? "حذف" : "Delete"}
                              >
                                <Trash2 className="size-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {filteredCases.length > 5 && (
                <div className="px-5 py-3 border-t border-slate-100">
                  <button
                    onClick={() => setShowAllOrders(!showAllOrders)}
                    className="text-sm font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                  >
                    {showAllOrders
                      ? ar
                        ? "عرض أقل"
                        : "Show less"
                      : ar
                        ? "عرض جميع الطلبات"
                        : "View All Orders"}
                    <ChevronDown
                      className={cn("size-4 transition-transform", showAllOrders && "rotate-180")}
                    />
                  </button>
                </div>
              )}
            </div>

            {/* Analytics row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    {ar ? "الجودة والدقة" : "Quality & Accuracy"}
                  </span>
                  <Target className="size-4 text-sky-500" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative size-20">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle
                        cx="18"
                        cy="18"
                        r="15.5"
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="2.5"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="15.5"
                        fill="none"
                        stroke="#0ea5e9"
                        strokeWidth="2.5"
                        strokeDasharray="100"
                        strokeDashoffset={avgRating != null ? 100 - avgRating * 20 : 100}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center font-display font-extrabold text-lg text-slate-800">
                      {avgRating != null ? `${avgRating.toFixed(1)}` : "N/A"}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">
                      {ar ? "رضا الأطباء" : "Doctor Satisfaction"}
                    </p>
                    <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                      <TrendingUp className="size-3" />
                      +2.5% {ar ? "عن الربع السابق" : "vs last quarter"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    {ar ? "متوسط مدة الإنجاز" : "Avg. Turnaround"}
                  </span>
                  <Clock className="size-4 text-amber-500" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-display font-extrabold text-slate-800">3.2</span>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{ar ? "يوم" : "Days"}</p>
                    <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                      <TrendingUp className="size-3" />
                      -0.5 {ar ? "يوم عن الشهر الماضي" : "day vs last month"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    {ar ? "إجمالي الإيرادات" : "Total Revenue"}
                  </span>
                  <DollarSign className="size-4 text-emerald-500" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-display font-extrabold text-slate-800">
                    {totalRevenue.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 })}
                  </span>
                  <div>
                    <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <TrendingUp className="size-3" />
                      {ar ? "محدث في الوقت الفعلي" : "Real-time updated"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Order edit modal */}
      {selectedOrder && (
        <EditOrderModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onSave={updateOrder}
        />
      )}

      {/* Order invoice viewer */}
      {viewOrder && (
        <OrderInvoiceModal
          order={viewOrder}
          labName={labName}
          labAddress={labAddress}
          labPhone={labPhone}
          onClose={() => setViewOrder(null)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          orderNumber={deleteTarget.orderNumber}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget)}
        />
      )}

      {/* New Order Modal */}
      <CombinedLabOrderModal
        open={showNewOrder}
        onClose={() => setShowNewOrder(false)}
        onSubmit={handleCreateOrder}
        labId={user?.uid}
      />

      {/* Promo modal */}
      {showPromoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowPromoModal(false)}
        >
          <div
            className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-extrabold text-lg line-clamp-2">
                {profile?.labDescription
                  || (ar ? "تقنيات حديثة لنتائج دقيقة" : "Modern Tech for Precise Results")}
              </h3>
              <button
                onClick={() => setShowPromoModal(false)}
                className="size-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-sky-500 to-indigo-600 p-6 text-white mb-4">
              <p className="font-display font-bold text-xl leading-tight">
                {profile?.labDescription
                  || (ar
                    ? "نستخدم أحدث تقنيات المسح الرقمي والطباعة ثلاثية الأبعاد"
                    : "We use the latest digital scanning & 3D printing technology")}
              </p>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {ar
                ? "مختبر دنتال هب مجهز بأحدث الأجهزة الرقمية لضمان أعلى دقة في التركيبات السنية. نقدم خدمات التيجان، القشور، الزرعات، والمصففات الشفافة بأعلى معايير الجودة."
                : "Dental Hub Lab is equipped with the latest digital devices to ensure the highest precision in dental prosthetics. We offer crowns, veneers, implants, and clear aligners with the highest quality standards."}
            </p>
            <button
              onClick={() => setShowPromoModal(false)}
              className="mt-4 w-full h-12 rounded-xl bg-sky-500 text-white font-bold hover:bg-sky-600 transition"
            >
              {ar ? "فهمت" : "Got it"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickAccessButton({
  icon: Icon,
  label,
  color,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  color?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 h-11 rounded-full text-sm font-semibold transition-all",
        color || "text-slate-200 hover:bg-slate-800 hover:text-white",
      )}
    >
      <span
        className={cn(
          "size-8 rounded-full flex items-center justify-center",
          color ? "bg-white/20 text-white" : "bg-slate-800 text-slate-300",
        )}
      >
        <Icon className="size-4" />
      </span>
      {label}
    </button>
  );
}
