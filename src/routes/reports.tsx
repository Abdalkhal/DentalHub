import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { BarChart3, TrendingUp, DollarSign, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const ORDERS_KEY = "dental_hub_orders";

export const Route = createFileRoute("/reports")({
  component: Reports,
});

const RANGES = ["7d", "30d", "90d"] as const;
type Range = (typeof RANGES)[number];

type OrderData = {
  id: string;
  orderNumber: string;
  patient: string;
  doctor: string;
  workType: string;
  receivedDate: string;
  status: string;
};

const WORK_TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  crown: { ar: "تاج", en: "Crown" },
  veneer: { ar: "فينير", en: "Veneer" },
  implant: { ar: "زرعة", en: "Implant" },
  clear_aligner: { ar: "مصفف شفاف", en: "Clear Aligner" },
  bridge: { ar: "جسر", en: "Bridge" },
  denture: { ar: "طقم", en: "Denture" },
};

const REVENUE_COLORS = ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"];

function loadOrders(): OrderData[] {
  try {
    const saved = localStorage.getItem(ORDERS_KEY);
    if (saved) return JSON.parse(saved);
    const old = localStorage.getItem("dental_orders");
    if (old) {
      const parsed = JSON.parse(old) as OrderData[];
      localStorage.setItem(ORDERS_KEY, JSON.stringify(parsed));
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

function filterByRange(orders: OrderData[], range: Range): OrderData[] {
  const now = Date.now();
  const msMap: Record<Range, number> = {
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
    "90d": 90 * 24 * 60 * 60 * 1000,
  };
  const cutoff = now - msMap[range];
  return orders.filter((o) => {
    const ts = new Date(o.receivedDate).getTime();
    return !isNaN(ts) && ts >= cutoff;
  });
}

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(dateStr: string, lang: "ar" | "en"): string {
  const d = new Date(dateStr);
  const months =
    lang === "ar"
      ? [
          "يناير",
          "فبراير",
          "مارس",
          "أبريل",
          "مايو",
          "يونيو",
          "يوليو",
          "أغسطس",
          "سبتمبر",
          "أكتوبر",
          "نوفمبر",
          "ديسمبر",
        ]
      : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months[d.getMonth()];
}

function buildTypeData(orders: OrderData[], lang: "ar" | "en") {
  const counts: Record<string, number> = {};
  for (const o of orders) {
    const key = o.workType || "unknown";
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([key, value]) => ({
      name: WORK_TYPE_LABELS[key]?.[lang] ?? key,
      value,
    }))
    .sort((a, b) => b.value - a.value);
}

function buildTurnaroundData(orders: OrderData[], lang: "ar" | "en") {
  const completed = orders.filter((o) => o.status === "completed");
  const byMonth: Record<string, number[]> = {};
  for (const o of completed) {
    const received = new Date(o.receivedDate).getTime();
    if (isNaN(received)) continue;
    const delivered = Date.now();
    const days = Math.max(1, Math.round((delivered - received) / (24 * 60 * 60 * 1000)));
    const key = getMonthKey(o.receivedDate);
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(days);
  }
  return Object.entries(byMonth)
    .map(([key, days]) => ({
      month: getMonthLabel(key + "-01", lang),
      days: Math.round(days.reduce((a, b) => a + b, 0) / days.length),
    }))
    .slice(-6);
}

function buildRevenueData(orders: OrderData[], lang: "ar" | "en") {
  const counts: Record<string, number> = {};
  for (const o of orders) {
    const key = o.workType || "unknown";
    counts[key] = (counts[key] || 0) + 1;
  }
  const maxCount = Math.max(...Object.values(counts), 1);
  return Object.entries(counts)
    .map(([key, value]) => ({
      name: WORK_TYPE_LABELS[key]?.[lang] ?? key,
      value: value * 200,
    }))
    .sort((a, b) => b.value - a.value);
}

function buildVolumeData(orders: OrderData[], lang: "ar" | "en") {
  const byMonth: Record<string, number> = {};
  for (const o of orders) {
    const key = getMonthKey(o.receivedDate);
    byMonth[key] = (byMonth[key] || 0) + 1;
  }
  return Object.entries(byMonth)
    .map(([key, cases]) => ({
      month: getMonthLabel(key + "-01", lang),
      cases,
    }))
    .slice(-6);
}

function Reports() {
  const { t, lang, dir } = useI18n();
  const ar = lang === "ar";
  const [range, setRange] = useState<Range>("30d");

  const allOrders = useMemo(() => loadOrders(), []);
  const orders = useMemo(() => filterByRange(allOrders, range), [allOrders, range]);

  const caseTypeData = useMemo(() => buildTypeData(orders, lang), [orders, lang]);
  const turnaroundData = useMemo(() => buildTurnaroundData(orders, lang), [orders, lang]);
  const revenueData = useMemo(() => buildRevenueData(orders, lang), [orders, lang]);
  const volumeData = useMemo(() => buildVolumeData(orders, lang), [orders, lang]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat(ar ? "ar-IQ" : "en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(v);

  const chartCardClass = "bg-white border border-slate-200 rounded-2xl p-4 shadow-soft";
  const labelClass = "text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5";
  const emptyCardClass =
    "flex flex-col items-center justify-center py-16 text-center text-sm text-slate-400";

  const hasData = orders.length > 0;

  return (
    <MobileShell>
      <TopBar title={ar ? "التقارير" : "Reports"} showBack />

      <div className="px-4 pb-6 space-y-4" dir={dir}>
        <div className="flex gap-2 bg-white border border-slate-200 rounded-2xl p-1 shadow-soft">
          {RANGES.map((r) => {
            const labels: Record<Range, string> = {
              "7d": ar ? "٧ أيام" : "7 days",
              "30d": ar ? "٣٠ يوم" : "30 days",
              "90d": ar ? "٩٠ يوم" : "90 days",
            };
            return (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "flex-1 h-9 rounded-xl text-sm font-semibold transition-colors",
                  range === r
                    ? "bg-primary text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800",
                )}
              >
                {labels[r]}
              </button>
            );
          })}
        </div>

        {!hasData ? (
          <div className={chartCardClass}>
            <div className={emptyCardClass}>
              <BarChart3 className="size-10 mb-3 text-slate-300" />
              <p>
                {ar
                  ? "لا توجد بيانات كافية لعرض التقارير حالياً"
                  : "Not enough data to show reports yet"}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className={chartCardClass}>
              <p className={labelClass}>
                <BarChart3 className="size-4 text-primary" />
                {ar ? "شعبية أنواع الحالات" : "Case Type Popularity"}
              </p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={caseTypeData} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        fontSize: 13,
                      }}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={chartCardClass}>
              <p className={labelClass}>
                <TrendingUp className="size-4 text-primary" />
                {ar ? "متوسط وقت التسليم" : "Avg. Turnaround Time"}
              </p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={turnaroundData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#64748b" }} unit={ar ? " يوم" : " days"} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        fontSize: 13,
                      }}
                      formatter={(value: number) => [
                        `${value} ${ar ? "أيام" : "days"}`,
                        ar ? "المتوسط" : "Avg",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="days"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ fill: "#2563eb", strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: "#2563eb" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={chartCardClass}>
              <p className={labelClass}>
                <DollarSign className="size-4 text-primary" />
                {ar ? "توزيع الإيرادات" : "Revenue Breakdown"}
              </p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {revenueData.map((_, i) => (
                        <Cell key={i} fill={REVENUE_COLORS[i % REVENUE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        fontSize: 13,
                      }}
                      formatter={(value: number) => [
                        formatCurrency(value),
                        ar ? "الإيراد" : "Revenue",
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 12, color: "#475569" }}
                      formatter={(value: string) => <span className="text-slate-600">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={chartCardClass}>
              <p className={labelClass}>
                <Activity className="size-4 text-primary" />
                {ar ? "حجم الحالات الشهري" : "Monthly Case Volume"}
              </p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={volumeData}>
                    <defs>
                      <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        fontSize: 13,
                      }}
                      formatter={(value: number) => [
                        `${value} ${ar ? "حالة" : "cases"}`,
                        ar ? "العدد" : "Count",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="cases"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      fill="url(#volumeGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </MobileShell>
  );
}
