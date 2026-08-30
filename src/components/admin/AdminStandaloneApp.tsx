import { useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/integrations/firebase/client";
import {
  useAdminOffers,
  useAdminAccounts,
  useAdminLogs,
  approveAd,
  rejectAd,
  deactivateAd,
  setAccountStatus,
  extendSubscription,
  type AdminAccount,
} from "@/lib/adminPanel";
import type { Offer } from "@/lib/offers";
import {
  LayoutDashboard,
  Megaphone,
  Users,
  Activity,
  LogOut,
  Check,
  X,
  Ban,
  Clock,
  Package,
  Building2,
  FlaskConical,
  Stethoscope,
  Eye,
  ShieldCheck,
} from "lucide-react";

type Tab = "overview" | "ads" | "accounts" | "logs";

const ACCOUNT_META: Record<string, { ar: string; icon: typeof Users }> = {
  implant: { ar: "شركات الزرعات", icon: FlaskConical },
  supply: { ar: "مستلزمات طبية", icon: Package },
  dentist: { ar: "أطباء الأسنان", icon: Stethoscope },
  lab: { ar: "المختبرات", icon: Building2 },
};

const STATUS_META: Record<string, { ar: string; cls: string }> = {
  active: { ar: "نشط", cls: "bg-emerald-100 text-emerald-700" },
  pending: { ar: "قيد المراجعة", cls: "bg-amber-100 text-amber-700" },
  expired: { ar: "منتهي", cls: "bg-slate-100 text-slate-500" },
  rejected: { ar: "مرفوض", cls: "bg-rose-100 text-rose-600" },
};

export function AdminStandaloneApp({ adminName }: { adminName: string }) {
  const ar = true;
  const [tab, setTab] = useState<Tab>("overview");
  const [adsFilter, setAdsFilter] = useState<string>("all");
  const [acctFilter, setAcctFilter] = useState<string>("all");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date(Date.now() + 30 * 86400000);
    return d.toISOString().slice(0, 10);
  });

  const { data: offers = [], loading: offersLoading } = useAdminOffers();
  const { data: accounts = [], loading: accountsLoading } = useAdminAccounts();
  const { data: logs = [], loading: logsLoading } = useAdminLogs();

  const filteredAds = useMemo(
    () =>
      adsFilter === "all" ? offers : offers.filter((o) => (o.status ?? "active") === adsFilter),
    [offers, adsFilter],
  );

  const filteredAccounts = useMemo(
    () => (acctFilter === "all" ? accounts : accounts.filter((a) => a.accountType === acctFilter)),
    [accounts, acctFilter],
  );

  const stats = useMemo(() => {
    const pending = offers.filter((o) => o.status === "pending").length;
    const active = offers.filter((o) => o.status === "active").length;
    const expired = offers.filter((o) => o.status === "expired" || o.status === "rejected").length;
    const byType: Record<string, number> = {};
    for (const a of accounts) byType[a.accountType] = (byType[a.accountType] ?? 0) + 1;
    return { total: offers.length, pending, active, expired, byType, users: accounts.length };
  }, [offers, accounts]);

  const statusBadge = (s: string | undefined) => {
    const m = STATUS_META[s ?? "active"] ?? STATUS_META.active;
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${m.cls}`}
      >
        {m.ar}
      </span>
    );
  };

  const handleApprove = async (offer: Offer) => {
    const expiry = new Date(endDate).toISOString();
    await approveAd(offer.id, expiry, adminName);
    setApprovingId(null);
  };

  const handleReject = async (offer: Offer) => {
    const reason = window.prompt(ar ? "سبب الرفض:" : "Rejection reason:");
    if (reason === null) return;
    await rejectAd(offer.id, reason.trim() || "بدون سبب", adminName);
  };

  const handleDeactivate = async (offer: Offer) => {
    if (!window.confirm(ar ? "إيقاف هذا الإعلان؟" : "Deactivate this ad?")) return;
    await deactivateAd(offer.id, adminName);
  };

  const handleStatus = async (acc: AdminAccount, status: "active" | "suspended" | "expired") => {
    await setAccountStatus(acc.docId, status, adminName);
  };

  const handleExtend = async (acc: AdminAccount, months: number) => {
    await extendSubscription(acc.docId, months, adminName);
  };

  const navItem = (key: Tab, label: string, icon: typeof LayoutDashboard) => {
    const Icon = icon;
    return (
      <button
        type="button"
        onClick={() => setTab(key)}
        className={`w-full flex items-center gap-3 px-3 h-11 rounded-xl text-sm font-semibold transition-all ${
          tab === key
            ? "bg-[#0052FF] text-white shadow-sm"
            : "text-slate-300 hover:bg-slate-800 hover:text-white"
        }`}
      >
        <span
          className={`size-8 rounded-lg flex items-center justify-center ${
            tab === key ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
          }`}
        >
          <Icon className="size-4" />
        </span>
        {label}
      </button>
    );
  };

  const cardCls = "bg-white border border-slate-200 rounded-2xl shadow-sm";

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-800" dir="rtl">
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex fixed top-0 right-0 z-40 h-screen w-64 bg-[#0F172A] border-l border-slate-800 flex-col p-4">
          <div className="flex items-center gap-2.5 px-2 py-3 mb-4">
            <span className="size-10 rounded-xl bg-[#0052FF] text-white flex items-center justify-center">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="font-display font-extrabold text-white text-sm">
                {ar ? "لوحة التحكم" : "Admin Panel"}
              </p>
              <p className="text-[10px] text-slate-400">Dental Hub Admin</p>
            </div>
          </div>
          <div className="space-y-1.5 flex-1">
            {navItem("overview", ar ? "نظرة عامة" : "Overview", LayoutDashboard)}
            {navItem("ads", ar ? "التحكم بالإعلانات" : "Ads Control", Megaphone)}
            {navItem("accounts", ar ? "الحسابات والاشتراكات" : "Accounts & Subs", Users)}
            {navItem("logs", ar ? "سجل النشاط" : "Activity Log", Activity)}
          </div>
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="w-full flex items-center gap-3 px-3 h-11 rounded-xl text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-rose-400 transition-all"
          >
            <span className="size-8 rounded-lg bg-slate-800 flex items-center justify-center">
              <LogOut className="size-4" />
            </span>
            {ar ? "تسجيل الخروج" : "Sign out"}
          </button>
        </aside>

        {/* Mobile top bar */}
        <div className="md:hidden fixed top-0 inset-x-0 z-40 bg-[#0F172A] border-b border-slate-800 px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="size-8 rounded-lg bg-[#0052FF] text-white flex items-center justify-center">
              <ShieldCheck className="size-4" />
            </span>
            <p className="font-display font-extrabold text-white text-sm">
              {ar ? "لوحة التحكم" : "Admin Panel"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 hidden sm:block">{adminName}</span>
            <button
              type="button"
              onClick={() => signOut(auth)}
              className="size-9 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 md:mr-64 min-h-screen bg-slate-100">
          <div className="md:pt-6 pt-20 px-4 md:px-8 pb-10 max-w-6xl mx-auto">
            {/* Mobile tabs */}
            <div className="md:hidden flex gap-2 overflow-x-auto pb-3 mb-4">
              {[
                {
                  key: "overview" as Tab,
                  label: ar ? "نظرة عامة" : "Overview",
                  icon: LayoutDashboard,
                },
                { key: "ads" as Tab, label: ar ? "الإعلانات" : "Ads", icon: Megaphone },
                { key: "accounts" as Tab, label: ar ? "الحسابات" : "Accounts", icon: Users },
                { key: "logs" as Tab, label: ar ? "السجل" : "Logs", icon: Activity },
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={`shrink-0 flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-bold border transition ${
                      tab === t.key
                        ? "bg-[#0052FF] text-white border-[#0052FF]"
                        : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    <Icon className="size-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {tab === "overview" && (
              <div className="space-y-5">
                <div
                  className="rounded-2xl p-5 text-white shadow-lg relative overflow-hidden"
                  style={{ background: "linear-gradient(135deg, #0052FF, #00A3FF)" }}
                >
                  <p className="font-display font-extrabold text-lg">
                    {ar ? "مرحباً، " : "Welcome, "}
                    {adminName}
                  </p>
                  <p className="text-white/80 text-xs mt-1">
                    {ar
                      ? "تحكم كامل في الإعلانات والحسابات والاشتراكات بشكل لحظي"
                      : "Full real-time control over ads, accounts and subscriptions"}
                  </p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className={cardCls + " p-4"}>
                    <div className="flex items-center gap-3">
                      <span className="size-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Clock className="size-5" />
                      </span>
                      <div>
                        <p className="font-display font-extrabold text-lg text-slate-900">
                          {stats.pending}
                        </p>
                        <p className="text-[11px] font-bold text-slate-500">
                          {ar ? "إعلانات قيد المراجعة" : "Pending ads"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className={cardCls + " p-4"}>
                    <div className="flex items-center gap-3">
                      <span className="size-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Megaphone className="size-5" />
                      </span>
                      <div>
                        <p className="font-display font-extrabold text-lg text-slate-900">
                          {stats.active}
                        </p>
                        <p className="text-[11px] font-bold text-slate-500">
                          {ar ? "إعلانات نشطة" : "Active ads"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className={cardCls + " p-4"}>
                    <div className="flex items-center gap-3">
                      <span className="size-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                        <Users className="size-5" />
                      </span>
                      <div>
                        <p className="font-display font-extrabold text-lg text-slate-900">
                          {stats.users}
                        </p>
                        <p className="text-[11px] font-bold text-slate-500">
                          {ar ? "إجمالي الحسابات" : "Total accounts"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className={cardCls + " p-4"}>
                    <div className="flex items-center gap-3">
                      <span className="size-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                        <Eye className="size-5" />
                      </span>
                      <div>
                        <p className="font-display font-extrabold text-lg text-slate-900">
                          {stats.total}
                        </p>
                        <p className="text-[11px] font-bold text-slate-500">
                          {ar ? "إجمالي الإعلانات" : "Total ads"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={cardCls + " p-4"}>
                  <p className="font-display font-bold text-sm text-slate-800 mb-3">
                    {ar ? "الحسابات حسب الفئة" : "Accounts by category"}
                  </p>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {Object.entries(ACCOUNT_META).map(([type, meta]) => {
                      const Icon = meta.icon;
                      const count = stats.byType[type] ?? 0;
                      return (
                        <div
                          key={type}
                          className="rounded-2xl bg-slate-50 border border-slate-100 p-4 flex items-center gap-3"
                        >
                          <span className="size-10 rounded-xl bg-white border border-slate-200 text-[#0052FF] flex items-center justify-center">
                            <Icon className="size-5" />
                          </span>
                          <div>
                            <p className="font-display font-extrabold text-lg text-slate-900">
                              {count}
                            </p>
                            <p className="text-[11px] font-bold text-slate-500">{meta.ar}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={cardCls + " p-4"}>
                  <p className="font-display font-bold text-sm text-slate-800 mb-3">
                    {ar ? "آخر النشاطات" : "Recent activity"}
                  </p>
                  <ActivityList logs={logs} loading={logsLoading} compact />
                </div>
              </div>
            )}

            {tab === "ads" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-base text-slate-800">
                    {ar ? "التحكم بالإعلانات" : "Ads Control Center"}
                  </h3>
                  <span className="text-xs text-slate-500">
                    {offers.length} {ar ? "إعلان" : "ads"}
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {["all", "pending", "active", "expired", "rejected"].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setAdsFilter(f)}
                      className={`shrink-0 h-9 px-3.5 rounded-full text-xs font-bold border transition ${
                        adsFilter === f
                          ? "bg-[#0052FF] text-white border-[#0052FF]"
                          : "bg-white text-slate-600 border-slate-200"
                      }`}
                    >
                      {f === "all" ? (ar ? "الكل" : "All") : (STATUS_META[f]?.ar ?? f)}
                    </button>
                  ))}
                </div>

                {offersLoading ? (
                  <p className="text-center text-sm text-slate-400 py-10">
                    {ar ? "جارٍ التحميل..." : "Loading..."}
                  </p>
                ) : filteredAds.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl py-14 text-center text-sm text-slate-400">
                    {ar ? "لا توجد إعلانات في هذه الحالة" : "No ads in this status"}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredAds.map((offer) => (
                      <div
                        key={offer.id}
                        className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-display font-bold text-sm text-slate-800 line-clamp-1">
                              {offer.title || ar ? "بدون عنوان" : "Untitled"}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                              {ar ? "المورد" : "Supplier"}: {offer.supplierId.slice(0, 8)}…
                            </p>
                            {offer.expiryDate && (
                              <p className="text-[11px] text-slate-400 mt-0.5" dir="ltr">
                                {offer.expiryDate.slice(0, 10)}
                              </p>
                            )}
                            {offer.rejectReason && (
                              <p className="text-[11px] text-rose-500 mt-1">
                                ↳ {offer.rejectReason}
                              </p>
                            )}
                          </div>
                          {statusBadge(offer.status)}
                        </div>
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          {(offer.status === "pending" || offer.status === undefined) && (
                            <>
                              {approvingId === offer.id ? (
                                <div className="flex items-center gap-2 flex-1 flex-wrap">
                                  <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white"
                                    dir="ltr"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleApprove(offer)}
                                    className="h-9 px-4 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 hover:bg-emerald-700 transition"
                                  >
                                    <Check className="size-3.5" /> {ar ? "اعتماد" : "Approve"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setApprovingId(null)}
                                    className="h-9 px-3 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold"
                                  >
                                    {ar ? "إلغاء" : "Cancel"}
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setApprovingId(offer.id)}
                                    className="h-9 px-4 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 hover:bg-emerald-700 transition"
                                  >
                                    <Check className="size-3.5" /> {ar ? "اعتماد" : "Approve"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleReject(offer)}
                                    className="h-9 px-4 rounded-lg bg-rose-600 text-white text-xs font-bold flex items-center gap-1 hover:bg-rose-700 transition"
                                  >
                                    <X className="size-3.5" /> {ar ? "رفض" : "Reject"}
                                  </button>
                                </>
                              )}
                            </>
                          )}
                          {offer.status === "active" && (
                            <button
                              type="button"
                              onClick={() => handleDeactivate(offer)}
                              className="h-9 px-4 rounded-lg bg-slate-800 text-white text-xs font-bold flex items-center gap-1 hover:bg-slate-900 transition"
                            >
                              <Ban className="size-3.5" /> {ar ? "إيقاف" : "Deactivate"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "accounts" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-base text-slate-800">
                    {ar ? "الحسابات والاشتراكات" : "Accounts & Subscriptions"}
                  </h3>
                  <span className="text-xs text-slate-500">
                    {accounts.length} {ar ? "حساب" : "accounts"}
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {["all", "implant", "supply", "dentist", "lab"].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setAcctFilter(f)}
                      className={`shrink-0 h-9 px-3.5 rounded-full text-xs font-bold border transition ${
                        acctFilter === f
                          ? "bg-[#0052FF] text-white border-[#0052FF]"
                          : "bg-white text-slate-600 border-slate-200"
                      }`}
                    >
                      {f === "all" ? (ar ? "الكل" : "All") : (ACCOUNT_META[f]?.ar ?? f)}
                    </button>
                  ))}
                </div>

                {accountsLoading ? (
                  <p className="text-center text-sm text-slate-400 py-10">
                    {ar ? "جارٍ التحميل..." : "Loading..."}
                  </p>
                ) : filteredAccounts.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl py-14 text-center text-sm text-slate-400">
                    {ar ? "لا توجد حسابات" : "No accounts"}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredAccounts.map((acc) => {
                      const accStatus = acc.accountStatus ?? "active";
                      const TypeIcon = ACCOUNT_META[acc.accountType]?.icon ?? Users;
                      const expiry = acc.subscriptionExpiry
                        ? new Date(acc.subscriptionExpiry).toLocaleDateString()
                        : null;
                      return (
                        <div
                          key={acc.docId}
                          className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4"
                        >
                          <div className="flex items-center gap-3">
                            <span className="size-11 rounded-full bg-[#0052FF]/10 text-[#0052FF] flex items-center justify-center font-bold shrink-0">
                              {(acc.name || "؟").charAt(0)}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-display font-bold text-sm text-slate-800 truncate">
                                  {acc.name || "—"}
                                </p>
                                <TypeIcon className="size-3.5 text-slate-400 shrink-0" />
                              </div>
                              <p className="text-[11px] text-slate-500 truncate" dir="ltr">
                                {acc.email || "—"}
                              </p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {statusBadge(accStatus)}
                                <span className="text-[10px] font-bold text-slate-400">
                                  {ar ? "الاشتراك ينتهي" : "Subs until"}: {expiry ?? "—"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <select
                              value={accStatus}
                              onChange={(e) =>
                                handleStatus(
                                  acc,
                                  e.target.value as "active" | "suspended" | "expired",
                                )
                              }
                              className="h-9 px-2 rounded-lg border border-slate-200 text-xs bg-white text-slate-700"
                            >
                              <option value="active">{ar ? "نشط" : "Active"}</option>
                              <option value="suspended">{ar ? "موقوف" : "Suspended"}</option>
                              <option value="expired">{ar ? "منتهي" : "Expired"}</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => handleExtend(acc, 1)}
                              className="h-9 px-3 rounded-lg bg-[#0052FF]/10 text-[#0052FF] text-xs font-bold hover:bg-[#0052FF]/20 transition"
                            >
                              {ar ? "+ شهر" : "+1M"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExtend(acc, 3)}
                              className="h-9 px-3 rounded-lg bg-[#0052FF]/10 text-[#0052FF] text-xs font-bold hover:bg-[#0052FF]/20 transition"
                            >
                              {ar ? "+ 3 شهور" : "+3M"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExtend(acc, 12)}
                              className="h-9 px-3 rounded-lg bg-[#0052FF]/10 text-[#0052FF] text-xs font-bold hover:bg-[#0052FF]/20 transition"
                            >
                              {ar ? "+ سنة" : "+1Y"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {tab === "logs" && (
              <div className="space-y-4">
                <h3 className="font-display font-bold text-base text-slate-800">
                  {ar ? "سجل النشاط" : "System Activity Log"}
                </h3>
                <div className={cardCls + " p-4"}>
                  <ActivityList logs={logs} loading={logsLoading} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityList({
  logs,
  loading,
  compact,
}: {
  logs: { id: string; type: string; message: string; adminName: string; createdAt: string }[];
  loading: boolean;
  compact?: boolean;
}) {
  if (loading) {
    return <p className="text-center text-sm text-slate-400 py-8">…</p>;
  }
  if (logs.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-slate-400">
        {compact ? "" : "لا توجد نشاطات بعد"}
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {logs.slice(0, compact ? 5 : 50).map((l) => (
        <div
          key={l.id}
          className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-100 p-3"
        >
          <span className="size-8 rounded-lg bg-white border border-slate-200 text-[#0052FF] flex items-center justify-center shrink-0">
            <Activity className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] text-slate-700 leading-snug">{l.message}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {l.adminName} · {l.createdAt ? new Date(l.createdAt).toLocaleString() : "—"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
