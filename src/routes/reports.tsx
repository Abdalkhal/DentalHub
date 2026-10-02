import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/useAuth";
import { useOrders, connectLabOrders, disconnectLabOrders } from "@/lib/ordersStore";
import { resolveOrderTotal } from "@/lib/orderLines";
import { Activity, BarChart3, DollarSign, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  component: Reports,
});

// Lab reports from the lab's real orders, same as native's lab-reports:
// revenue is a real per-work-type sum, and turnaround keeps the existing
// approximation (received date to now — orders carry no delivery timestamp).

const RANGES = ["7d", "30d", "90d"] as const;
type Range = (typeof RANGES)[number];

const RANGE_MS: Record<Range, number> = {
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

const BAR_COLORS = ["#2563EB", "#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE", "#0EA5E9"];

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string, ar: boolean): string {
  const monthsAr = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const idx = Number(key.split("-")[1]) - 1;
  return (ar ? monthsAr : monthsEn)[idx] ?? key;
}

function BarRow({ label, value, max, color, valueLabel }: { label: string; value: number; max: number; color: string; valueLabel: string }) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="flex-1 truncate text-xs font-semibold text-slate-600">{label}</span>
        <span className="text-xs font-bold text-slate-800" dir="ltr">
          {valueLabel}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function VerticalBars({ data, unitLabel }: { data: { label: string; value: number }[]; unitLabel?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end justify-between gap-2" style={{ height: 150 }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-500">
            {d.value}
            {unitLabel ?? ""}
          </span>
          <div className="flex w-full items-end overflow-hidden rounded-t-lg bg-slate-100" style={{ height: 96 }}>
            <div
              className="w-full rounded-t-lg bg-primary"
              style={{ height: `${Math.max(6, Math.round((d.value / max) * 100))}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function ChartCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs font-bold text-slate-500">{title}</span>
      </div>
      {children}
    </div>
  );
}

function Reports() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { user } = useSession();
  const labId = user?.uid ?? "";
  const orders = useOrders();
  const [range, setRange] = useState<Range>("30d");

  useEffect(() => {
    if (!labId) return;
    connectLabOrders(labId);
    return () => disconnectLabOrders();
  }, [labId]);

  const filtered = useMemo(() => {
    const cutoff = Date.now() - RANGE_MS[range];
    return orders.filter((o) => {
      const ts = new Date(o.receivedDate).getTime();
      return !isNaN(ts) && ts >= cutoff;
    });
  }, [orders, range]);

  const unspecified = ar ? "غير محدد" : "Unspecified";

  const caseTypeData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const o of filtered) {
      const key = o.workType || unspecified;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filtered, unspecified]);

  const turnaroundData = useMemo(() => {
    const byMonth = new Map<string, number[]>();
    for (const o of filtered.filter((x) => x.status === "completed")) {
      const received = new Date(o.receivedDate).getTime();
      if (isNaN(received)) continue;
      const days = Math.max(1, Math.round((Date.now() - received) / (24 * 60 * 60 * 1000)));
      const key = monthKey(new Date(o.receivedDate));
      const arr = byMonth.get(key) ?? [];
      arr.push(days);
      byMonth.set(key, arr);
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, days]) => ({ label: monthLabel(key, ar), value: Math.round(days.reduce((a, b) => a + b, 0) / days.length) }));
  }, [filtered, ar]);

  const revenueData = useMemo(() => {
    const sums = new Map<string, number>();
    for (const o of filtered) {
      const key = o.workType || unspecified;
      sums.set(key, (sums.get(key) ?? 0) + resolveOrderTotal(o));
    }
    return [...sums.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filtered, unspecified]);

  const volumeData = useMemo(() => {
    const byMonth = new Map<string, number>();
    for (const o of filtered) {
      const d = new Date(o.receivedDate);
      if (isNaN(d.getTime())) continue;
      const key = monthKey(d);
      byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, cases]) => ({ label: monthLabel(key, ar), value: cases }));
  }, [filtered, ar]);

  const revenueMax = Math.max(1, ...revenueData.map((d) => d.value));
  const rangeLabels: Record<Range, string> = {
    "7d": ar ? "٧ أيام" : "7 days",
    "30d": ar ? "٣٠ يوم" : "30 days",
    "90d": ar ? "٩٠ يوم" : "90 days",
  };

  return (
    <MobileShell wide>
      <TopBar title={ar ? "التقارير" : "Reports"} showBack wide maxW="6xl" />
      <div className="px-4 pt-4 pb-8 space-y-4 md:px-6 md:pt-6 lg:px-8 lg:max-w-6xl lg:mx-auto">
        <div className="flex gap-1 rounded-2xl border border-slate-200 bg-white p-1 md:max-w-sm">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                "h-9 flex-1 rounded-xl text-xs font-bold transition",
                range === r ? "bg-primary text-primary-foreground" : "text-slate-500 hover:text-slate-700",
              )}
            >
              {rangeLabels[r]}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-white py-16">
            <BarChart3 className="size-10 text-slate-300" />
            <p className="mt-3 text-sm text-slate-400">
              {ar ? "لا توجد بيانات كافية لعرض التقارير حالياً" : "Not enough data to show reports yet"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <ChartCard icon={<BarChart3 className="size-4 text-primary" />} title={ar ? "شعبية أنواع الحالات" : "Case Type Popularity"}>
              <div className="space-y-2.5">
                {caseTypeData.map((d, i) => (
                  <BarRow
                    key={d.label}
                    label={d.label}
                    value={d.value}
                    max={caseTypeData[0]?.value ?? 1}
                    color={BAR_COLORS[i % BAR_COLORS.length]}
                    valueLabel={String(d.value)}
                  />
                ))}
              </div>
            </ChartCard>

            <ChartCard icon={<TrendingUp className="size-4 text-primary" />} title={ar ? "متوسط وقت التسليم" : "Avg. Turnaround Time"}>
              {turnaroundData.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  {ar ? "لا توجد حالات مكتملة بعد" : "No completed cases yet"}
                </p>
              ) : (
                <VerticalBars data={turnaroundData} unitLabel={ar ? "ي" : "d"} />
              )}
            </ChartCard>

            <ChartCard icon={<DollarSign className="size-4 text-primary" />} title={ar ? "توزيع الإيرادات" : "Revenue Breakdown"}>
              <div className="space-y-2.5">
                {revenueData.map((d, i) => (
                  <BarRow
                    key={d.label}
                    label={d.label}
                    value={d.value}
                    max={revenueMax}
                    color={BAR_COLORS[i % BAR_COLORS.length]}
                    valueLabel={`${d.value.toLocaleString("en-US")} ${ar ? "د.ع" : "IQD"}`}
                  />
                ))}
              </div>
            </ChartCard>

            <ChartCard icon={<Activity className="size-4 text-primary" />} title={ar ? "حجم الحالات الشهري" : "Monthly Case Volume"}>
              <VerticalBars data={volumeData} />
            </ChartCard>
          </div>
        )}
      </div>
    </MobileShell>
  );
}
