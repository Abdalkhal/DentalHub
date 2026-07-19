import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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

export const Route = createFileRoute("/reports")({
  component: Reports,
});

const RANGES = ["7d", "30d", "90d"] as const;
type Range = (typeof RANGES)[number];

const CASE_TYPES = [
  { key: "crown", ar: "تاج", en: "Crown" },
  { key: "veneer", ar: "فينير", en: "Veneer" },
  { key: "implant", ar: "زرعة", en: "Implant" },
  { key: "aligner", ar: "مصفف", en: "Clear Aligner" },
  { key: "bridge", ar: "جسر", en: "Bridge" },
  { key: "denture", ar: "طقم", en: "Denture" },
];

function mockCaseTypeData(lang: "ar" | "en") {
  return [
    { name: lang === "ar" ? "تاج" : "Crown", value: 145 },
    { name: lang === "ar" ? "فينير" : "Veneer", value: 98 },
    { name: lang === "ar" ? "زرعة" : "Implant", value: 132 },
    { name: lang === "ar" ? "مصفف" : "Clear Aligner", value: 76 },
    { name: lang === "ar" ? "جسر" : "Bridge", value: 54 },
    { name: lang === "ar" ? "طقم" : "Denture", value: 33 },
  ];
}

function mockTurnaroundData() {
  return [
    { month: "Jan", days: 12 },
    { month: "Feb", days: 11 },
    { month: "Mar", days: 13 },
    { month: "Apr", days: 10 },
    { month: "May", days: 9 },
    { month: "Jun", days: 8 },
  ];
}

const REVENUE_COLORS = ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"];

function mockRevenueData(lang: "ar" | "en") {
  return [
    { name: lang === "ar" ? "تاج" : "Crown", value: 28400 },
    { name: lang === "ar" ? "فينير" : "Veneer", value: 15600 },
    { name: lang === "ar" ? "زرعة" : "Implant", value: 42200 },
    { name: lang === "ar" ? "مصفف" : "Clear Aligner", value: 11200 },
    { name: lang === "ar" ? "جسر" : "Bridge", value: 9800 },
    { name: lang === "ar" ? "طقم" : "Denture", value: 5400 },
  ];
}

function mockVolumeData(lang: "ar" | "en") {
  return [
    { month: lang === "ar" ? "يناير" : "Jan", cases: 210 },
    { month: lang === "ar" ? "فبراير" : "Feb", cases: 185 },
    { month: lang === "ar" ? "مارس" : "Mar", cases: 245 },
    { month: lang === "ar" ? "أبريل" : "Apr", cases: 220 },
    { month: lang === "ar" ? "مايو" : "May", cases: 270 },
    { month: lang === "ar" ? "يونيو" : "Jun", cases: 310 },
  ];
}

function Reports() {
  const { t, lang, dir } = useI18n();
  const ar = lang === "ar";
  const [range, setRange] = useState<Range>("30d");

  const caseTypeData = mockCaseTypeData(lang);
  const turnaroundData = mockTurnaroundData();
  const revenueData = mockRevenueData(lang);
  const volumeData = mockVolumeData(lang);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat(ar ? "ar-IQ" : "en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(v);

  const chartCardClass = "bg-white border border-slate-200 rounded-2xl p-4 shadow-soft";
  const labelClass = "text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5";

  return (
    <MobileShell>
      <TopBar title={ar ? "التقارير" : "Reports"} />

      <div className="px-4 pb-6 space-y-4" dir={dir}>
        {/* Date Range Filter */}
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

        {/* Bar Chart - Case Type Popularity */}
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

        {/* Line Chart - Turnaround Time */}
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

        {/* Pie Chart - Revenue Breakdown */}
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
                    <Cell key={i} fill={REVENUE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    fontSize: 13,
                  }}
                  formatter={(value: number) => [formatCurrency(value), ar ? "الإيراد" : "Revenue"]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: "#475569" }}
                  formatter={(value: string) => <span className="text-slate-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Area Chart - Monthly Case Volume */}
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
      </div>
    </MobileShell>
  );
}
