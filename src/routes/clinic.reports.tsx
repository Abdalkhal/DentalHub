import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
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

function ReportsPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const data = useClinic();
  const patients = usePatients();
  const { income, expense, net } = clinicTotals(data);

  const month = new Date().toISOString().slice(0, 7);
  const monthTx = data.transactions.filter((t) => t.date.startsWith(month));
  const monthIncome = monthTx.filter((t) => t.kind === "income").reduce((s, t) => s + t.amount, 0);
  const monthExpense = monthTx.filter((t) => t.kind === "expense").reduce((s, t) => s + t.amount, 0);
  const completed = patients.filter((p) => p.status === "completed").length;
  const inTreatment = patients.filter((p) => p.status === "in_treatment").length;
  const newPatients = patients.filter((p) => p.status === "new").length;
  const delivered = data.orders.filter((o) => o.status === "delivered").length;

  const exportCsv = () => {
    const rows = [
      ["type", "label", "amount", "date", "source"],
      ...data.transactions.map((t) => [t.kind, t.label, String(t.amount), t.date, t.source]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `clinic-report-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const bars = [
    { label: ar ? "إيراد الشهر" : "Month income", value: monthIncome, cls: "bg-emerald-500" },
    { label: ar ? "مصروف الشهر" : "Month expense", value: monthExpense, cls: "bg-rose-500" },
  ];
  const max = Math.max(1, ...bars.map((b) => b.value));

  return (
    <MobileShell>
      <TopBar title={ar ? "التقارير والإحصائيات" : "Reports & Analytics"} showBack />
      <div className="px-3 pt-3 pb-6">
        <div className="grid grid-cols-2 gap-2.5">
          <Stat label={ar ? "إجمالي الإيرادات" : "Total revenue"} value={`${income} $`} tone="good" />
          <Stat label={ar ? "إجمالي المصاريف" : "Total expenses"} value={`${expense} $`} tone="bad" />
          <Stat label={ar ? "صافي الربح" : "Net profit"} value={`${net} $`} tone={net >= 0 ? "good" : "bad"} />
          <Stat label={ar ? "طلبيات مسلّمة" : "Delivered orders"} value={String(delivered)} />
        </div>

        <div className="mt-3 rounded-2xl bg-card border border-border p-3.5 shadow-soft">
          <p className="font-display font-extrabold text-sm">{ar ? "أداء الشهر الحالي" : "This month"}</p>
          <div className="mt-3 space-y-2.5">
            {bars.map((b) => (
              <div key={b.label}>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-muted-foreground">{b.label}</span>
                  <span className="font-bold">{b.value} $</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${b.cls}`} style={{ width: `${(b.value / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 rounded-2xl bg-card border border-border p-3.5 shadow-soft">
          <p className="font-display font-extrabold text-sm">{ar ? "المرضى والعلاجات" : "Patients & treatments"}</p>
          <ul className="mt-2.5 space-y-2 text-sm">
            <Row label={ar ? "إجمالي المرضى" : "Total patients"} value={patients.length} />
            <Row label={ar ? "مرضى جدد" : "New patients"} value={newPatients} />
            <Row label={ar ? "علاج قيد الإنجاز" : "In treatment"} value={inTreatment} />
            <Row label={ar ? "علاجات مكتملة" : "Completed"} value={completed} />
          </ul>
        </div>

        <button
          onClick={exportCsv}
          className="mt-3 w-full h-12 rounded-2xl bg-primary text-primary-foreground font-display font-extrabold text-sm shadow-card flex items-center justify-center gap-2"
        >
          <Download className="size-4" />
          {ar ? "تصدير التقرير المالي (CSV)" : "Export financial report (CSV)"}
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
