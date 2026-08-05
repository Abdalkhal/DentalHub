import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { clinicTotals, useClinic } from "@/lib/clinicStore";
import { usePatients } from "@/lib/patientsStore";
import { Download } from "lucide-react";
import { Stat } from "./clinic.materials";

export const Route = createFileRoute("/clinic/reports")({
  head: () => ({
    meta: [
      { title: "التقارير والإحصائيات | DentalHub" },
      { name: "description", content: "مؤشرات الأداء الشهري، ملخص العلاجات المنجزة، نمو المرضى وتصدير التقارير المالية." },
      { property: "og:title", content: "التقارير والإحصائيات | DentalHub" },
      { property: "og:description", content: "مؤشرات أداء العيادة وتصدير التقارير." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

const PERIOD_OPTIONS = [
  { id: "today", ar: "اليوم", en: "Today" },
  { id: "week", ar: "هذا الأسبوع", en: "This week" },
  { id: "month", ar: "هذا الشهر", en: "This month" },
  { id: "year", ar: "هذه السنة", en: "This year" },
];

function fmtIQD(n: number) { return `${n.toLocaleString()} د.ع`; }

function ReportsPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const data = useClinic();
  const patients = usePatients();
  const { income, expense, net } = clinicTotals(data);
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("month");

  const month = new Date().toISOString().slice(0, 7);
  const monthTx = data.transactions.filter((t) => t.date.startsWith(month));
  const monthIncome = monthTx.filter((t) => t.kind === "income").reduce((s, t) => s + t.amount, 0);
  const monthExpense = monthTx.filter((t) => t.kind === "expense").reduce((s, t) => s + t.amount, 0);
  const completed = patients.filter((p) => p.status === "completed").length;
  const inTreatment = patients.filter((p) => p.status === "in_treatment").length;
  const newPatients = patients.filter((p) => p.status === "new").length;
  const delivered = data.orders.filter((o) => o.status === "delivered").length;

  const { doctors } = useClinic();

  const doctorOptions = useMemo(() => [
    { id: "all", name: ar ? "جميع الأطباء" : "All doctors" },
    ...doctors.map((d) => ({ id: d.id, name: d.name })),
  ], [doctors, ar]);

  const doctorPerformance = useMemo(() => {
    const list = doctorFilter === "all" ? doctors : doctors.filter((d) => d.id === doctorFilter);
    return list.map((d) => ({
      id: d.id,
      name: d.name,
      specialty: d.specialty || (ar ? "بدون اختصاص" : "No specialty"),
      split: 50,
      cases: d.cases || 0,
      revenue: 0,
    }));
  }, [doctors, doctorFilter, ar]);

  const exportCsv = () => {
    const rows = [
      ["type", "label", "amount", "date", "source"],
      ...data.transactions.map((t) => [t.kind, t.label, String(t.amount), t.date, t.source]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `clinic-report-${month}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const bars = [
    { label: ar ? "إيراد الشهر" : "Month income", value: monthIncome, cls: "bg-emerald-500" },
    { label: ar ? "مصروف الشهر" : "Month expense", value: monthExpense, cls: "bg-rose-500" },
  ];
  const max = Math.max(1, ...bars.map((b) => b.value));

  return (
    <MobileShell>
      <TopBar title={ar ? "التقارير والإحصائيات" : "Reports & Analytics"} showBack />
      <div className="px-3 pt-3 pb-6 space-y-3">
        {/* Filter bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <select value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)}
              className="w-full h-10 rounded-xl bg-card border border-border px-3 pe-8 text-xs font-semibold appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20">
              {doctorOptions.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
            </select>
            <span className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]">▼</span>
          </div>
          <div className="relative flex-1">
            <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}
              className="w-full h-10 rounded-xl bg-card border border-border px-3 pe-8 text-xs font-semibold appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20">
              {PERIOD_OPTIONS.map((p) => (<option key={p.id} value={p.id}>{ar ? p.ar : p.en}</option>))}
            </select>
            <span className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]">▼</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2.5">
          <Stat label={ar ? "إجمالي الإيرادات" : "Total revenue"} value={fmtIQD(income)} tone="good" />
          <Stat label={ar ? "إجمالي المصاريف" : "Total expenses"} value={fmtIQD(expense)} tone="bad" />
          <Stat label={ar ? "صافي الربح" : "Net profit"} value={fmtIQD(net)} tone={net >= 0 ? "good" : "bad"} />
          <Stat label={ar ? "طلبيات مسلّمة" : "Delivered orders"} value={String(delivered)} />
        </div>

        {/* Month performance */}
        <div className="rounded-2xl bg-card border border-border p-3.5 shadow-soft">
          <p className="font-display font-extrabold text-sm">{ar ? "أداء الشهر الحالي" : "This month"}</p>
          <div className="mt-3 space-y-2.5">
            {bars.map((b) => (
              <div key={b.label}>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-muted-foreground">{b.label}</span>
                  <span className="font-bold">{fmtIQD(b.value)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${b.cls}`} style={{ width: `${(b.value / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Doctor performance */}
        <div className="rounded-2xl bg-card border border-border p-3.5 shadow-soft">
          <p className="font-display font-extrabold text-sm mb-3">{ar ? "ملخص أداء الأطباء والمستحقات" : "Doctor Performance & Dues"}</p>
          <div className="space-y-2.5">
            {doctorPerformance.map((d) => (
              <div key={d.id} className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
                <span className="size-10 shrink-0 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center font-bold text-sm">
                  {d.name.charAt(0)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm truncate">{d.name}</p>
                    <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{d.split}%</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{d.specialty}</p>
                  <div className="grid grid-cols-3 gap-2 mt-1.5 text-center">
                    <div className="bg-white rounded-lg p-1.5"><p className="text-[10px] text-slate-400">{ar ? "الحالات" : "Cases"}</p><p className="text-xs font-bold">{d.cases}</p></div>
                    <div className="bg-white rounded-lg p-1.5"><p className="text-[10px] text-slate-400">{ar ? "الإيراد" : "Revenue"}</p><p className="text-xs font-bold">{fmtIQD(d.revenue)}</p></div>
                    <div className="bg-white rounded-lg p-1.5"><p className="text-[10px] text-slate-400">{ar ? "المستحق" : "Due"}</p><p className="text-xs font-bold text-emerald-600">{fmtIQD(Math.round(d.revenue * d.split / 100))}</p></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Patients */}
        <div className="rounded-2xl bg-card border border-border p-3.5 shadow-soft">
          <p className="font-display font-extrabold text-sm">{ar ? "المرضى والعلاجات" : "Patients & treatments"}</p>
          <ul className="mt-2.5 space-y-2 text-sm">
            <Row label={ar ? "إجمالي المرضى" : "Total patients"} value={patients.length} />
            <Row label={ar ? "مرضى جدد" : "New patients"} value={newPatients} />
            <Row label={ar ? "علاج قيد الإنجاز" : "In treatment"} value={inTreatment} />
            <Row label={ar ? "علاجات مكتملة" : "Completed"} value={completed} />
          </ul>
        </div>

        {/* Export */}
        <button onClick={exportCsv}
          className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-display font-extrabold text-sm shadow-card flex items-center justify-center gap-2">
          <Download className="size-4" />
          {ar ? "تصدير التقرير المالي والإداري (CSV)" : "Export Financial & Admin Report (CSV)"}
        </button>
      </div>
    </MobileShell>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-muted-foreground text-[12px]">{label}</span>
      <span className="font-display font-extrabold">{value}</span>
    </li>
  );
}
