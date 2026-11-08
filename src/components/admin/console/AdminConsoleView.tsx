import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity, AlertTriangle, BadgePercent, Building2, CalendarClock, Check, ChevronLeft, ClipboardList, FlaskConical, LayoutDashboard, LayoutGrid,
  LogOut, Mail, Megaphone, Menu, Package, Phone, RefreshCw, ShieldCheck, ShoppingBag, Stethoscope, Users, Wallet, X, type LucideIcon,
} from "lucide-react";
import {
  dayOf, formatBoth, formatMoney, inPeriod, officeRows, orderLines, periodsOf, sumLines,
  type AccountFile, type BusinessData, type LabStats, type OrderLine, type SupplierType,
} from "@/lib/adminBusiness";
import type { AdminAccount, AdminLog } from "@/lib/adminPanel";
import type { Offer } from "@/lib/offers";
import { cn } from "@/lib/utils";
import { Badge, Button, Dialog, Empty, ExpandRow, inputCls, Loading, PageHeader, Panel, SearchBox, SegmentedTabs, Select, SlideOver, Stat, type Tone } from "./ui";

/** An offer, or an account's general ad (the `ads` collection). */
export type AdminAd = Offer & { kind?: "ads"; ownerName?: string };

export type AdminReport = { id: string; kind?: string; reason?: string; reporterId?: string; reportedId?: string; status?: string; adminNote?: string; createdAt?: string };

export type ConsoleActions = {
  refreshBusiness: () => void;
  setRate: (t: SupplierType, rate: number) => Promise<unknown>;
  loadAccountFile: (uid: string) => Promise<AccountFile>;
  setStatus: (uid: string, status: "active" | "suspended", reason: string) => Promise<unknown>;
  extend: (uid: string, months: number) => Promise<unknown>;
  revoke: (uid: string) => Promise<unknown>;
  approveAd: (ad: AdminAd, expiryDate: string) => Promise<unknown>;
  rejectAd: (ad: AdminAd, reason: string) => Promise<unknown>;
  stopAd: (ad: AdminAd) => Promise<unknown>;
  resolveReport: (id: string, status: "reviewing" | "resolved", note: string) => Promise<unknown>;
  signOut: () => void;
  errorText: (err: unknown) => string;
};

export type ConsoleProps = {
  adminName: string;
  business: BusinessData | null;
  businessError?: string;
  accounts: AdminAccount[];
  offers: AdminAd[];
  reports: AdminReport[];
  logs: AdminLog[];
  actions: ConsoleActions;
  contentSlot: ReactNode;
};

type Page = "home" | "earnings" | "labs" | "accounts" | "ads" | "reports" | "content" | "audit";

const TYPE_LABEL: Record<string, string> = { secretary: "سكرتارية", dentist: "طبيب أسنان", lab: "مختبر", supply: "مكتب مستلزمات", implant: "شركة زراعة" };
const MONTHS = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];
const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-");
  return `${MONTHS[Number(m) - 1] ?? m} ${y}`;
};
const CASE_STATUS: Record<string, { label: string; tone: Tone }> = {
  new: { label: "جديدة", tone: "blue" },
  in_progress: { label: "قيد العمل", tone: "violet" },
  delayed: { label: "متأخرة", tone: "amber" },
  completed: { label: "مكتملة", tone: "green" },
};
const ORDER_STATUS: Record<string, { label: string; tone: Tone }> = {
  confirmed: { label: "مكتملة", tone: "green" },
  pending: { label: "بانتظار المكتب", tone: "amber" },
  rejected: { label: "مرفوضة", tone: "rose" },
};
const orderStatus = (s: string) => ORDER_STATUS[s] ?? { label: s, tone: "slate" as Tone };

const accountLabel = (a: AdminAccount) => a.name || a.clinicName || a.email || "حساب";
const isSuspended = (a: { accountStatus?: string }) => a.accountStatus === "suspended";

export function AdminConsoleView(props: ConsoleProps) {
  const [page, setPage] = useState<Page>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [openAccount, setOpenAccount] = useState<string | null>(null);
  const pendingAds = props.offers.filter((o) => o.status === "pending").length;
  const openReports = props.reports.filter((r) => (r.status ?? "open") !== "resolved").length;

  const nav: { key: Page; label: string; icon: LucideIcon; count?: number }[] = [
    { key: "home", label: "الرئيسية", icon: LayoutDashboard },
    { key: "earnings", label: "الأرباح والمكاتب", icon: Wallet },
    { key: "labs", label: "المختبرات", icon: FlaskConical },
    { key: "accounts", label: "الحسابات", icon: Users },
    { key: "ads", label: "الإعلانات", icon: Megaphone, count: pendingAds },
    { key: "reports", label: "البلاغات", icon: AlertTriangle, count: openReports },
    { key: "content", label: "المحتوى", icon: LayoutGrid },
    { key: "audit", label: "سجل الإجراءات", icon: Activity },
  ];

  const go = (p: Page) => {
    setPage(p);
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white">
          <ShieldCheck className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-sm font-extrabold text-slate-900">Dent Hub</p>
          <p className="truncate text-[11px] text-slate-500">لوحة الإدارة</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {nav.map((n) => (
          <button
            key={n.key}
            type="button"
            onClick={() => go(n.key)}
            aria-current={page === n.key ? "page" : undefined}
            className={cn(
              "flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition",
              page === n.key ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
            )}
          >
            <n.icon className="size-[18px] shrink-0" />
            <span className="flex-1 text-start">{n.label}</span>
            {!!n.count && <span className="rounded-full bg-rose-500 px-1.5 py-px text-[10px] font-bold text-white">{n.count}</span>}
          </button>
        ))}
      </nav>
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-extrabold text-slate-600">{props.adminName.trim().charAt(0) || "A"}</span>
          <p className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700">{props.adminName}</p>
          <button type="button" onClick={props.actions.signOut} aria-label="تسجيل الخروج" className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600">
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800" dir="rtl">
      <aside className="fixed inset-y-0 right-0 z-40 hidden w-60 border-l border-slate-200 lg:block">{sidebar}</aside>

      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <button type="button" onClick={() => setMenuOpen(true)} aria-label="القائمة" className="flex size-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100">
          <Menu className="size-5" />
        </button>
        <p className="font-display text-sm font-extrabold text-slate-900">{nav.find((n) => n.key === page)?.label}</p>
        <span className="size-9" />
      </div>
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 lg:hidden" onClick={() => setMenuOpen(false)}>
          <aside className="absolute inset-y-0 right-0 w-64 shadow-2xl" onClick={(e) => e.stopPropagation()}>{sidebar}</aside>
        </div>
      )}

      <main className="lg:mr-60">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
          {props.businessError && (page === "home" || page === "earnings" || page === "labs") && (
            <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{props.businessError}</p>
          )}
          {page === "home" && <HomePage {...props} go={go} pendingAds={pendingAds} openReports={openReports} />}
          {page === "earnings" && <EarningsPage {...props} />}
          {page === "labs" && <LabsPage {...props} />}
          {page === "accounts" && <AccountsPage {...props} onOpen={setOpenAccount} />}
          {page === "ads" && <AdsPage {...props} />}
          {page === "reports" && <ReportsPage {...props} onOpenAccount={setOpenAccount} />}
          {page === "content" && (
            <>
              <PageHeader title="المحتوى" subtitle="الفروع والمكاتب والمختبرات والمنتجات المعروضة في التطبيق" />
              {props.contentSlot}
            </>
          )}
          {page === "audit" && <AuditPage {...props} />}
        </div>
      </main>

      {openAccount && <AccountSlideOver uid={openAccount} actions={props.actions} onClose={() => setOpenAccount(null)} />}
    </div>
  );
}

/* ── Home ─────────────────────────────────────────────────────── */

function HomePage({ adminName, business, accounts, offers, go, pendingAds, openReports }: ConsoleProps & { go: (p: Page) => void; pendingAds: number; openReports: number }) {
  const thisMonth = dayOf(Date.now()).slice(0, 7);
  const lines = useMemo(() => (business ? orderLines(business) : []), [business]);
  const month = sumLines(lines.filter((l) => inPeriod(l.createdAt, thisMonth)));
  const all = sumLines(lines);
  const cases = (business?.labs ?? []).reduce((n, l) => n + l.total, 0);
  const soon = Date.now() + 14 * 86400000;
  const expiring = accounts.filter((a) => {
    const t = a.subscriptionExpiry ? Date.parse(String(a.subscriptionExpiry)) : 0;
    return t > 0 && t < soon && t > Date.now();
  }).length;
  const suspended = accounts.filter(isSuspended).length;
  const byType = (t: string) => accounts.filter((a) => a.accountType === t).length;
  const decisions: { label: string; hint: string; count: number; page: Page; icon: LucideIcon; tone: Tone }[] = [
    { label: "إعلانات بانتظار الموافقة", hint: "راجعها لتظهر للأطباء", count: pendingAds, page: "ads", icon: Megaphone, tone: "amber" },
    { label: "بلاغات مفتوحة", hint: "تحتاج مراجعة وقرار", count: openReports, page: "reports", icon: AlertTriangle, tone: "rose" },
    { label: "اشتراكات تنتهي خلال 14 يوماً", hint: "مدّدها أو تواصل مع أصحابها", count: expiring, page: "accounts", icon: CalendarClock, tone: "violet" },
  ];
  const active = decisions.filter((d) => d.count > 0);

  return (
    <>
      <PageHeader title={`أهلاً، ${adminName}`} subtitle="ملخص المنصة وما يحتاج قرارك اليوم" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="أرباحي هذا الشهر" value={business ? formatBoth(month.earnIQD, month.earnUSD) : "…"} sub={`${month.lists} قائمة مكتملة`} icon={Wallet} tone="green" />
        <Stat label="إجمالي أرباحي" value={business ? formatBoth(all.earnIQD, all.earnUSD) : "…"} sub={`من ${all.lists} قائمة مكتملة`} icon={BadgePercent} tone="blue" />
        <Stat label="حالات المختبرات" value={business ? cases : "…"} sub={`في ${business?.labs.length ?? 0} مختبر`} icon={FlaskConical} tone="violet" />
        <Stat label="الحسابات" value={accounts.length} sub={suspended ? `${suspended} موقوف` : "لا يوجد موقوف"} icon={Users} tone="slate" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Panel title="يحتاج قرارك" flush>
            {active.length === 0 ? (
              <Empty icon={Check} title="لا يوجد ما يحتاج قرارك الآن" hint={`${offers.filter((o) => o.status === "active").length} إعلان نشط حالياً`} />
            ) : (
              active.map((d) => (
                <button key={d.label} type="button" onClick={() => go(d.page)} className="flex w-full items-center gap-3 border-b border-slate-100 px-5 py-4 text-start transition last:border-b-0 hover:bg-slate-50">
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", d.tone === "amber" ? "bg-amber-50 text-amber-700" : d.tone === "rose" ? "bg-rose-50 text-rose-700" : "bg-violet-50 text-violet-700")}>
                    <d.icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-900">{d.label}</span>
                    <span className="block text-xs text-slate-500">{d.hint}</span>
                  </span>
                  <span className="font-display text-xl font-extrabold tabular-nums text-slate-900">{d.count}</span>
                  <ChevronLeft className="size-4 text-slate-400" />
                </button>
              ))
            )}
          </Panel>
        </div>
        <div className="lg:col-span-2">
          <Panel title="الحسابات حسب النوع" flush>
            {[
              { t: "dentist", icon: Stethoscope },
              { t: "lab", icon: FlaskConical },
              { t: "supply", icon: Package },
              { t: "implant", icon: Building2 },
            ].map(({ t, icon: Icon }) => (
              <div key={t} className="flex items-center gap-3 border-b border-slate-100 px-5 py-3 last:border-b-0">
                <Icon className="size-4 text-slate-400" />
                <span className="flex-1 text-sm text-slate-600">{TYPE_LABEL[t]}</span>
                <span className="text-sm font-extrabold tabular-nums text-slate-900">{byType(t)}</span>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </>
  );
}

/* ── Earnings and offices ─────────────────────────────────────── */

function ListDetails({ line }: { line: OrderLine }) {
  const s = orderStatus(line.status);
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-100 px-4 py-3 text-xs text-slate-500">
        <Badge tone={s.tone}>{s.label}</Badge>
        <span>رقم القائمة: <b className="text-slate-700" dir="ltr">{line.orderNumber || "—"}</b></span>
        <span>الطبيب: <b className="text-slate-700">{line.dentistName || "—"}</b></span>
        {line.clinicName && line.clinicName !== line.dentistName && <span>العيادة: <b className="text-slate-700">{line.clinicName}</b></span>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] font-bold text-slate-400">
              <th className="px-4 py-2 text-start font-bold">المنتج</th>
              <th className="px-4 py-2 text-center font-bold">الكمية</th>
              <th className="px-4 py-2 text-end font-bold">السعر</th>
              <th className="px-4 py-2 text-end font-bold">المجموع</th>
            </tr>
          </thead>
          <tbody>
            {line.items.map((i, n) => (
              <tr key={n} className={cn("border-t border-slate-100", !i.available && "text-slate-400 line-through")}>
                <td className="px-4 py-2 font-semibold text-slate-700">{i.name || "—"}</td>
                <td className="px-4 py-2 text-center tabular-nums">{i.quantity}</td>
                <td className="px-4 py-2 text-end tabular-nums">{formatMoney(i.price, i.currency)}</td>
                <td className="px-4 py-2 text-end font-semibold tabular-nums">{formatMoney(i.price * i.quantity, i.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3 text-sm">
        <span className="text-slate-500">مجموع القائمة: <b className="tabular-nums text-slate-900">{formatBoth(line.totalIQD, line.totalUSD)}</b></span>
        {line.completed && <span className="text-emerald-700">ربحي ({line.rate}%): <b className="tabular-nums">{formatBoth(line.earnIQD, line.earnUSD)}</b></span>}
      </div>
    </div>
  );
}

function ListRow({ line, showOffice }: { line: OrderLine; showOffice?: boolean }) {
  const s = orderStatus(line.status);
  return (
    <ExpandRow
      header={
        <div className="grid grid-cols-2 items-center gap-x-4 gap-y-1 md:grid-cols-[110px_minmax(0,1.3fr)_70px_minmax(0,1fr)_minmax(0,1fr)_100px]">
          <span className="text-sm font-semibold tabular-nums text-slate-700">{dayOf(line.createdAt) || "—"}</span>
          <span className="min-w-0 truncate text-sm font-bold text-slate-900">{showOffice ? line.supplierName : line.dentistName || "—"}</span>
          <span className="text-xs text-slate-500">{line.itemCount} منتج</span>
          <span className="truncate text-sm tabular-nums text-slate-700">{formatBoth(line.totalIQD, line.totalUSD)}</span>
          <span className="truncate text-sm font-bold tabular-nums text-emerald-700">{line.completed ? formatBoth(line.earnIQD, line.earnUSD) : "—"}</span>
          <span><Badge tone={s.tone}>{s.label}</Badge></span>
        </div>
      }
    >
      <ListDetails line={line} />
    </ExpandRow>
  );
}

function ListHeader({ showOffice }: { showOffice?: boolean }) {
  return (
    <div className="hidden gap-x-4 border-b border-slate-100 bg-slate-50/70 py-2.5 ps-5 pe-12 text-[11px] font-bold text-slate-400 md:grid md:grid-cols-[110px_minmax(0,1.3fr)_70px_minmax(0,1fr)_minmax(0,1fr)_100px]">
      <span>التاريخ</span>
      <span>{showOffice ? "المكتب" : "الطبيب"}</span>
      <span>المنتجات</span>
      <span>قيمة القائمة</span>
      <span>ربحي</span>
      <span>الحالة</span>
    </div>
  );
}

function RateCard({ business, actions }: { business: BusinessData; actions: ConsoleActions }) {
  const [editing, setEditing] = useState<SupplierType | null>(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const rows: { t: SupplierType; label: string }[] = [
    { t: "supply", label: "مكاتب المستلزمات" },
    { t: "implant", label: "شركات الزراعة" },
  ];
  const save = async () => {
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      await actions.setRate(editing, Number(value));
      setEditing(null);
      actions.refreshBusiness();
    } catch (err) {
      setError(actions.errorText(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {rows.map((r) => (
          <button key={r.t} type="button" onClick={() => { setEditing(r.t); setValue(String(business.settings.rates[r.t] ?? 0)); setError(""); }} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            <BadgePercent className="size-4 text-blue-600" />
            {r.label}: <b className="text-sm font-extrabold tabular-nums text-slate-900">{business.settings.rates[r.t] ?? 0}%</b>
          </button>
        ))}
      </div>
      {editing && (
        <Dialog
          title={`نسبة الربح: ${rows.find((r) => r.t === editing)?.label}`}
          onClose={() => setEditing(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditing(null)}>إلغاء</Button>
              <Button busy={busy} onClick={() => void save()}>حفظ</Button>
            </>
          }
        >
          <label className="text-xs font-bold text-slate-600">النسبة (%)</label>
          <input value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" dir="ltr" autoFocus className={cn(inputCls, "mt-1.5 h-11")} />
          <p className="mt-2 text-xs text-slate-500">تسري النسبة الجديدة على القوائم من اليوم فصاعداً، ولا تتغير أرباح القوائم السابقة.</p>
          {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
        </Dialog>
      )}
    </>
  );
}

function EarningsPage({ business, actions }: ConsoleProps) {
  const [view, setView] = useState<"offices" | "earnings">("offices");
  const [period, setPeriod] = useState("all");
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | SupplierType>("all");
  const lines = useMemo(() => (business ? orderLines(business) : []), [business]);

  const refresh = <Button variant="secondary" icon={RefreshCw} onClick={actions.refreshBusiness}>تحديث</Button>;
  if (!business) {
    return (
      <>
        <PageHeader title="الأرباح والمكاتب" action={refresh} />
        <Panel><Loading /></Panel>
      </>
    );
  }
  const visible = lines.filter((l) => inPeriod(l.createdAt, period));
  const totals = sumLines(visible);
  const periods = periodsOf(business.orders);
  const needle = q.trim().toLowerCase();
  const rows = officeRows(business, visible)
    .filter((r) => type === "all" || r.type === type)
    .filter((r) => !needle || r.name.toLowerCase().includes(needle));
  const completed = visible.filter((l) => l.completed);

  return (
    <>
      <PageHeader title="الأرباح والمكاتب" subtitle="ربحك من كل قائمة مشتريات مكتملة، وما اشتراه الأطباء من كل مكتب" action={refresh} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="أرباحي" value={formatBoth(totals.earnIQD, totals.earnUSD)} sub={period === "all" ? "كل الفترات" : monthLabel(period)} icon={Wallet} tone="green" />
        <Stat label="قيمة المشتريات" value={formatBoth(totals.salesIQD, totals.salesUSD)} sub="القوائم المكتملة فقط" icon={ShoppingBag} tone="blue" />
        <Stat label="القوائم والمنتجات" value={totals.lists} sub={`${totals.items} منتج مباع`} icon={ClipboardList} tone="violet" />
      </div>

      <div className="mt-6 mb-4 flex flex-wrap items-center gap-3">
        <SegmentedTabs value={view} onChange={setView} options={[{ value: "offices", label: "المكاتب", count: rows.length }, { value: "earnings", label: "قائمة أرباحي", count: completed.length }]} />
        <Select value={period} onChange={setPeriod} options={[{ value: "all", label: "كل الفترات" }, ...periods.map((p) => ({ value: p, label: monthLabel(p) }))]} />
        <div className="ms-auto"><RateCard business={business} actions={actions} /></div>
      </div>

      {view === "offices" ? (
        <Panel
          flush
          title="المكاتب"
          hint="اضغط مكتباً لعرض قوائمه، ثم قائمة لعرض منتجاتها"
          action={
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <SearchBox value={q} onChange={setQ} placeholder="ابحث باسم المكتب" />
              <Select value={type} onChange={(v) => setType(v as typeof type)} options={[{ value: "all", label: "كل الأنواع" }, { value: "supply", label: "مكاتب المستلزمات" }, { value: "implant", label: "شركات الزراعة" }]} />
            </div>
          }
        >
          {rows.length === 0 ? (
            <Empty icon={Package} title="لا توجد مكاتب مطابقة" />
          ) : (
            rows.map((r) => (
              <ExpandRow
                key={r.id}
                header={
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <div className="flex min-w-[200px] flex-1 items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 font-display text-sm font-extrabold text-blue-700">{r.name.trim().charAt(0) || "?"}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-slate-900">{r.name}</p>
                        <p className="text-xs text-slate-500">{r.lastAt ? `آخر قائمة: ${dayOf(r.lastAt)}` : "لا توجد قوائم"}</p>
                      </div>
                    </div>
                    <Figure label="القوائم" value={r.totals.lists} />
                    <Figure label="المنتجات" value={r.totals.items} />
                    <Figure label="المشتريات" value={formatBoth(r.totals.salesIQD, r.totals.salesUSD)} />
                    <Figure label="ربحي" value={formatBoth(r.totals.earnIQD, r.totals.earnUSD)} strong />
                  </div>
                }
              >
                {r.lines.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-500">لا توجد قوائم في هذه الفترة</p>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <ListHeader />
                    {r.lines.map((l) => <ListRow key={l.id} line={l} />)}
                  </div>
                )}
              </ExpandRow>
            ))
          )}
        </Panel>
      ) : (
        <Panel flush title="قائمة أرباحي" hint="كل قائمة مكتملة والربح المقتطع منها، الأحدث أولاً">
          {completed.length === 0 ? (
            <Empty icon={Wallet} title="لا توجد أرباح في هذه الفترة" />
          ) : (
            <>
              <ListHeader showOffice />
              {completed.map((l) => <ListRow key={l.id} line={l} showOffice />)}
            </>
          )}
        </Panel>
      )}
    </>
  );
}

function Figure({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="min-w-[72px]">
      <p className="text-[11px] font-semibold text-slate-400">{label}</p>
      <p className={cn("text-sm font-extrabold tabular-nums", strong ? "text-emerald-700" : "text-slate-800")}>{value}</p>
    </div>
  );
}

/* ── Labs ─────────────────────────────────────────────────────── */

function LabCard({ lab }: { lab: LabStats }) {
  const months = Object.keys(lab.months).sort().reverse().slice(0, 6);
  return (
    <ExpandRow
      header={
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex min-w-[200px] flex-1 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
              <FlaskConical className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-slate-900">{lab.name}</p>
              <p className="text-xs text-slate-500">{lab.doctors.length} طبيب أرسل حالات</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(CASE_STATUS).filter((s) => lab.byStatus[s]).map((s) => (
              <Badge key={s} tone={CASE_STATUS[s].tone}>{CASE_STATUS[s].label}: {lab.byStatus[s]}</Badge>
            ))}
          </div>
          <div className="min-w-[64px] text-center">
            <p className="font-display text-2xl font-extrabold tabular-nums text-slate-900">{lab.total}</p>
            <p className="text-[11px] font-semibold text-slate-400">حالة</p>
          </div>
        </div>
      }
    >
      {lab.total === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-500">لم تصل إلى هذا المختبر أي حالة بعد</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <p className="border-b border-slate-100 px-4 py-2.5 text-xs font-bold text-slate-500">الحالات حسب الطبيب</p>
            {lab.doctors.map((d, i) => (
              <div key={i} className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 text-sm last:border-b-0">
                <span className="truncate font-semibold text-slate-700">{d.name}</span>
                <b className="tabular-nums text-slate-900">{d.count}</b>
              </div>
            ))}
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <p className="border-b border-slate-100 px-4 py-2.5 text-xs font-bold text-slate-500">الحالات حسب الشهر</p>
            {months.length === 0 ? (
              <p className="px-4 py-4 text-xs text-slate-500">لا توجد تواريخ مسجلة</p>
            ) : (
              months.map((m) => (
                <div key={m} className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 text-sm last:border-b-0">
                  <span className="font-semibold text-slate-700">{monthLabel(m)}</span>
                  <b className="tabular-nums text-slate-900">{lab.months[m]}</b>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </ExpandRow>
  );
}

function LabsPage({ business, actions }: ConsoleProps) {
  const [q, setQ] = useState("");
  const refresh = <Button variant="secondary" icon={RefreshCw} onClick={actions.refreshBusiness}>تحديث</Button>;
  if (!business) {
    return (
      <>
        <PageHeader title="المختبرات" action={refresh} />
        <Panel><Loading /></Panel>
      </>
    );
  }
  const needle = q.trim().toLowerCase();
  const labs = business.labs.filter((l) => !needle || l.name.toLowerCase().includes(needle)).sort((a, b) => b.total - a.total);
  const total = business.labs.reduce((n, l) => n + l.total, 0);
  const count = (s: string) => business.labs.reduce((n, l) => n + (l.byStatus[s] || 0), 0);
  return (
    <>
      <PageHeader title="المختبرات" subtitle="عدد الحالات التي أرسلها الأطباء إلى كل مختبر. تفاصيل المرضى لا تظهر هنا." action={refresh} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="كل الحالات" value={total} icon={ClipboardList} tone="blue" />
        <Stat label="قيد العمل" value={count("in_progress") + count("new")} icon={Activity} tone="violet" />
        <Stat label="متأخرة" value={count("delayed")} icon={CalendarClock} tone="amber" />
        <Stat label="مكتملة" value={count("completed")} icon={Check} tone="green" />
      </div>
      <div className="mt-6">
        <Panel flush title="الحالات لكل مختبر" hint="اضغط مختبراً لعرض الأطباء والأشهر" action={<SearchBox value={q} onChange={setQ} placeholder="ابحث باسم المختبر" />}>
          {labs.length === 0 ? <Empty icon={FlaskConical} title="لا توجد مختبرات مطابقة" /> : labs.map((l) => <LabCard key={l.id} lab={l} />)}
        </Panel>
      </div>
    </>
  );
}

/* ── Accounts ─────────────────────────────────────────────────── */

function AccountsPage({ accounts, onOpen }: ConsoleProps & { onOpen: (uid: string) => void }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const needle = q.trim().toLowerCase();
  const list = accounts.filter((a) => {
    if (type !== "all" && a.accountType !== type) return false;
    if (status === "suspended" && !isSuspended(a)) return false;
    if (status === "active" && isSuspended(a)) return false;
    if (!needle) return true;
    return [a.name, a.clinicName, a.email, a.phone].some((v) => String(v ?? "").toLowerCase().includes(needle));
  });
  return (
    <>
      <PageHeader title="الحسابات" subtitle={`${accounts.length} حساب على المنصة`} />
      <div className="mb-4 flex flex-wrap gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="ابحث بالاسم أو البريد أو الهاتف" />
        <Select value={type} onChange={setType} options={[{ value: "all", label: "كل الأنواع" }, ...Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))]} />
        <Select value={status} onChange={setStatus} options={[{ value: "all", label: "كل الحالات" }, { value: "active", label: "نشط" }, { value: "suspended", label: "موقوف" }]} />
      </div>
      <Panel flush>
        {list.length === 0 ? (
          <Empty icon={Users} title="لا توجد حسابات مطابقة" />
        ) : (
          list.map((a) => (
            <button key={a.docId} type="button" onClick={() => onOpen(a.docId)} className="flex w-full items-center gap-3 border-b border-slate-100 px-5 py-3 text-start transition last:border-b-0 hover:bg-slate-50">
              <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-sm font-extrabold text-slate-600">
                {a.photoURL ? <img src={a.photoURL} alt="" className="size-full object-cover" /> : accountLabel(a).trim().charAt(0)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-slate-900">{accountLabel(a)}</span>
                <span className="block truncate text-xs text-slate-500" dir="ltr" style={{ textAlign: "right" }}>{a.email || a.phone || "—"}</span>
              </span>
              <span className="hidden sm:block"><Badge>{TYPE_LABEL[a.accountType ?? ""] ?? "—"}</Badge></span>
              <Badge tone={isSuspended(a) ? "rose" : "green"}>{isSuspended(a) ? "موقوف" : "نشط"}</Badge>
              <ChevronLeft className="size-4 shrink-0 text-slate-400" />
            </button>
          ))
        )}
      </Panel>
    </>
  );
}

function AccountSlideOver({ uid, actions, onClose }: { uid: string; actions: ConsoleActions; onClose: () => void }) {
  const [file, setFile] = useState<AccountFile | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [suspending, setSuspending] = useState(false);
  const [reason, setReason] = useState("");

  const load = () => actions.loadAccountFile(uid).then(setFile).catch((err) => setError(actions.errorText(err)));
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await load();
      setSuspending(false);
      setReason("");
    } catch (err) {
      setError(actions.errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const figures = file
    ? ([
        ["طلبات اشتراها", file.counts.asDentist, file.accountType === "dentist"],
        ["مرضى (عدد فقط)", file.counts.patients, file.accountType === "dentist"],
        ["طلبات باعها", file.counts.asSupplier, file.accountType === "supply" || file.accountType === "implant"],
        ["منتجات", file.counts.products, file.accountType === "supply" || file.accountType === "implant"],
        ["عروض", file.counts.offers, file.accountType === "supply" || file.accountType === "implant"],
        ["حالات", file.counts.cases, file.accountType === "lab"],
        ["بلاغات عليه", file.counts.reports, true],
      ] as [string, number, boolean][]).filter((f) => f[2])
    : [];

  return (
    <SlideOver title={file?.name ?? "ملف الحساب"} onClose={onClose}>
      {!file && !error && <Loading />}
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>}
      {file && (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 font-display text-xl font-extrabold text-slate-600">
                {file.photoURL ? <img src={file.photoURL} alt="" className="size-full object-cover" /> : file.name.trim().charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-extrabold text-slate-900">{file.name}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge>{TYPE_LABEL[file.accountType] ?? file.role ?? "—"}</Badge>
                  <Badge tone={file.status === "suspended" ? "rose" : "green"}>{file.status === "suspended" ? "موقوف" : "نشط"}</Badge>
                  <Badge tone={file.emailVerified ? "blue" : "amber"}>{file.emailVerified ? "البريد مؤكد" : "البريد غير مؤكد"}</Badge>
                </div>
              </div>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              {file.email && <Info icon={Mail} ltr>{file.email}</Info>}
              {file.phone && <Info icon={Phone} ltr>{file.phone}</Info>}
              <Info icon={CalendarClock}>سجّل في {dayOf(file.createdAt) || "—"} · آخر دخول {dayOf(file.lastSignIn) || "—"}</Info>
              <Info icon={BadgePercent}>الاشتراك: {file.subscriptionExpiry ? `حتى ${String(file.subscriptionExpiry).slice(0, 10)}` : "غير محدد"}</Info>
            </dl>
            {file.status === "suspended" && file.suspendedReason && (
              <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">سبب الإيقاف: {file.suspendedReason}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {figures.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-semibold text-slate-400">{label}</p>
                <p className="font-display text-lg font-extrabold tabular-nums text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          {file.role !== "admin" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="mb-3 text-xs font-bold text-slate-500">الإجراءات</p>
              <div className="flex flex-wrap gap-2">
                {file.status === "suspended" ? (
                  <Button icon={Check} busy={busy} onClick={() => void act(() => actions.setStatus(uid, "active", ""))}>إعادة تفعيل الحساب</Button>
                ) : (
                  <Button variant="danger" icon={X} onClick={() => setSuspending(true)}>إيقاف الحساب</Button>
                )}
                <Button variant="secondary" busy={busy} onClick={() => void act(() => actions.extend(uid, 1))}>تمديد شهر</Button>
                <Button variant="secondary" busy={busy} onClick={() => void act(() => actions.extend(uid, 12))}>تمديد سنة</Button>
                <Button variant="secondary" busy={busy} onClick={() => void act(() => actions.revoke(uid))}>إنهاء جلسات الدخول</Button>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="mb-3 text-xs font-bold text-slate-500">سجل قرارات الإدارة</p>
            {file.history.length === 0 ? (
              <p className="text-xs text-slate-400">لا توجد قرارات بعد</p>
            ) : (
              <ul className="space-y-2.5">
                {file.history.map((h) => (
                  <li key={h.id} className="text-xs">
                    <p className="font-semibold text-slate-700">{h.message}</p>
                    <p className="text-slate-400">{dayOf(h.at)} · {h.adminName}{h.reason ? ` · ${h.reason}` : ""}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="px-1 text-[11px] leading-5 text-slate-400">سجلات المرضى لا تظهر للإدارة؛ يظهر عددها فقط.</p>

          {suspending && (
            <Dialog
              title={`إيقاف ${file.name}`}
              onClose={() => setSuspending(false)}
              footer={
                <>
                  <Button variant="secondary" onClick={() => setSuspending(false)}>إلغاء</Button>
                  <Button variant="danger" busy={busy} disabled={!reason.trim()} onClick={() => void act(() => actions.setStatus(uid, "suspended", reason))}>إيقاف الحساب</Button>
                </>
              }
            >
              <p className="mb-3 text-xs leading-5 text-slate-500">لن يستطيع الدخول، وتُخفى منتجاته وعروضه وإعلاناته، ولا يستقبل طلبات. لا تُحذف أي بيانات، وعند إعادة التفعيل يعود كل شيء.</p>
              <label className="text-xs font-bold text-slate-600">السبب (يظهر لصاحب الحساب)</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} autoFocus className={cn(inputCls, "mt-1.5 py-2")} />
            </Dialog>
          )}
        </>
      )}
    </SlideOver>
  );
}

function Info({ icon: Icon, children, ltr }: { icon: LucideIcon; children: ReactNode; ltr?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-slate-600">
      <Icon className="size-4 shrink-0 text-slate-400" />
      <span className="min-w-0 truncate" dir={ltr ? "ltr" : undefined}>{children}</span>
    </div>
  );
}

/* ── Ads ──────────────────────────────────────────────────────── */

function AdsPage({ offers, accounts, actions }: ConsoleProps) {
  const [filter, setFilter] = useState("pending");
  const [dialog, setDialog] = useState<{ kind: "approve" | "reject"; offer: AdminAd } | null>(null);
  const [date, setDate] = useState(() => dayOf(Date.now() + 30 * 86400000));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const names = new Map(accounts.map((a) => [a.docId, accountLabel(a)]));
  const count = (s: string) => offers.filter((o) => (o.status ?? "active") === s).length;
  const list = offers.filter((o) => (o.status ?? "active") === filter);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      setDialog(null);
      setReason("");
    } catch (err) {
      setError(actions.errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="الإعلانات" subtitle="العروض وإعلانات الحسابات قبل ظهورها للمستخدمين" />
      <div className="mb-4">
        <SegmentedTabs
          value={filter}
          onChange={setFilter}
          options={[
            { value: "pending", label: "بانتظار الموافقة", count: count("pending") },
            { value: "active", label: "نشطة", count: count("active") },
            { value: "rejected", label: "مرفوضة", count: count("rejected") },
            { value: "expired", label: "منتهية", count: count("expired") },
          ]}
        />
      </div>
      {error && !dialog && <p className="mb-3 rounded-xl bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700">{error}</p>}
      {list.length === 0 ? (
        <Panel><Empty icon={Megaphone} title="لا توجد إعلانات هنا" /></Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((o) => (
            <article key={`${o.kind ?? "offer"}-${o.id}`} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="aspect-[16/9] bg-slate-100">
                {o.imageUrl ? <img src={o.imageUrl} alt="" className="size-full object-cover" /> : <div className="flex size-full items-center justify-center text-slate-300"><Megaphone className="size-8" /></div>}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-extrabold text-slate-900">{o.title || "بدون عنوان"}</p>
                  <Badge tone={o.kind === "ads" ? "violet" : "blue"}>{o.kind === "ads" ? "إعلان" : "عرض"}</Badge>
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500">{o.ownerName || names.get(o.supplierId) || "—"}</p>
                {o.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{o.description}</p>}
                {o.expiryDate && o.status === "active" && <p className="mt-2 text-[11px] text-slate-400">حتى {o.expiryDate.slice(0, 10)}</p>}
                {o.rejectReason && <p className="mt-2 rounded-lg bg-rose-50 px-2 py-1 text-[11px] text-rose-700">{o.rejectReason}</p>}
                <div className="mt-auto flex gap-2 pt-3">
                  {o.status === "pending" && (
                    <>
                      <Button size="sm" icon={Check} onClick={() => { setError(""); setDialog({ kind: "approve", offer: o }); }}>موافقة</Button>
                      <Button size="sm" variant="secondary" icon={X} onClick={() => { setError(""); setDialog({ kind: "reject", offer: o }); }}>رفض</Button>
                    </>
                  )}
                  {o.status === "active" && <Button size="sm" variant="secondary" busy={busy} onClick={() => void run(() => actions.stopAd(o))}>إيقاف الإعلان</Button>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {dialog && (
        <Dialog
          title={dialog.kind === "approve" ? "الموافقة على الإعلان" : "رفض الإعلان"}
          onClose={() => setDialog(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDialog(null)}>إلغاء</Button>
              {dialog.kind === "approve" ? (
                <Button busy={busy} onClick={() => void run(() => actions.approveAd(dialog.offer, date))}>موافقة</Button>
              ) : (
                <Button variant="danger" busy={busy} disabled={!reason.trim()} onClick={() => void run(() => actions.rejectAd(dialog.offer, reason))}>رفض</Button>
              )}
            </>
          }
        >
          {dialog.kind === "approve" ? (
            <>
              <label className="text-xs font-bold text-slate-600">يظهر الإعلان حتى</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} dir="ltr" className={cn(inputCls, "mt-1.5 h-11")} />
            </>
          ) : (
            <>
              <label className="text-xs font-bold text-slate-600">سبب الرفض (يظهر للمكتب)</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} autoFocus className={cn(inputCls, "mt-1.5 py-2")} />
            </>
          )}
          {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
        </Dialog>
      )}
    </>
  );
}

/* ── Reports ──────────────────────────────────────────────────── */

const REPORT_STATUS: Record<string, { label: string; tone: Tone }> = {
  open: { label: "جديد", tone: "rose" },
  reviewing: { label: "قيد المراجعة", tone: "amber" },
  resolved: { label: "تم الحل", tone: "green" },
};

function ReportsPage({ reports, accounts, actions, onOpenAccount }: ConsoleProps & { onOpenAccount: (uid: string) => void }) {
  const [filter, setFilter] = useState("open");
  const [error, setError] = useState("");
  const names = new Map(accounts.map((a) => [a.docId, accountLabel(a)]));
  const state = (r: AdminReport) => r.status ?? "open";
  const list = reports.filter((r) => state(r) === filter);
  const set = (id: string, status: "reviewing" | "resolved") =>
    actions.resolveReport(id, status, "").catch((err) => setError(actions.errorText(err)));
  return (
    <>
      <PageHeader title="البلاغات" subtitle="بلاغات المستخدمين من الرسائل" />
      <div className="mb-4">
        <SegmentedTabs
          value={filter}
          onChange={setFilter}
          options={Object.entries(REPORT_STATUS).map(([value, s]) => ({ value, label: s.label, count: reports.filter((r) => state(r) === value).length }))}
        />
      </div>
      {error && <p className="mb-3 rounded-xl bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700">{error}</p>}
      <Panel flush>
        {list.length === 0 ? (
          <Empty icon={AlertTriangle} title="لا توجد بلاغات هنا" />
        ) : (
          list.map((r) => (
            <div key={r.id} className="border-b border-slate-100 px-5 py-4 last:border-b-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={REPORT_STATUS[state(r)]?.tone}>{REPORT_STATUS[state(r)]?.label}</Badge>
                {r.createdAt && <span className="text-xs text-slate-400">{r.createdAt.slice(0, 10)}</span>}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-800">{r.reason || "بدون تفاصيل"}</p>
              <p className="mt-1 text-xs text-slate-500">
                من {names.get(r.reporterId ?? "") ?? "—"} على{" "}
                {r.reportedId ? (
                  <button type="button" onClick={() => onOpenAccount(r.reportedId!)} className="font-bold text-blue-700 hover:underline">{names.get(r.reportedId) ?? "الحساب"}</button>
                ) : "—"}
              </p>
              {state(r) !== "resolved" && (
                <div className="mt-3 flex gap-2">
                  {state(r) === "open" && <Button size="sm" variant="secondary" onClick={() => void set(r.id, "reviewing")}>بدء المراجعة</Button>}
                  <Button size="sm" icon={Check} onClick={() => void set(r.id, "resolved")}>تم الحل</Button>
                </div>
              )}
            </div>
          ))
        )}
      </Panel>
    </>
  );
}

/* ── Audit ────────────────────────────────────────────────────── */

function AuditPage({ logs }: ConsoleProps) {
  return (
    <>
      <PageHeader title="سجل الإجراءات" subtitle="كل إجراء إداري يكتبه السيرفر، ولا يمكن تعديله أو حذفه من اللوحة" />
      <Panel flush>
        {logs.length === 0 ? (
          <Empty icon={Activity} title="لا توجد إجراءات مسجلة بعد" />
        ) : (
          logs.map((l) => (
            <div key={l.id} className="flex items-start gap-3 border-b border-slate-100 px-5 py-3.5 last:border-b-0">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-blue-500" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">{l.message}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {l.adminName}
                  {l.targetName ? ` · ${l.targetName}` : ""}
                  {l.reason ? ` · ${l.reason}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-xs tabular-nums text-slate-400">{l.createdAt.slice(0, 10)}</span>
            </div>
          ))
        )}
      </Panel>
    </>
  );
}
