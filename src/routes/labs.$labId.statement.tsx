import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useAdminStore } from "@/lib/adminStore";
import { useI18n } from "@/lib/i18n";
import {
  Search,
  SlidersHorizontal,
  Filter,
  RotateCcw,
  Calendar,
  Printer,
  Download,
} from "lucide-react";

export const Route = createFileRoute("/labs/$labId/statement")({
  component: StatementPage,
});

type Row = {
  deliveryDate: string;
  agent: { ar: string; en: string };
  caseId: string;
  dentist: string;
  patient: { ar: string; en: string };
  workType: { ar: string; en: string };
  units: number;
  unitPrice: number;
  discount: number;
  reason: { ar: string; en: string };
};

const SAMPLE: Row[] = [
  {
    deliveryDate: "6/29/2026",
    agent: { ar: "موصل", en: "Mosul" },
    caseId: "7124",
    dentist: "Dr. Shaaban",
    patient: { ar: "عمشة جمعة", en: "Amsha Jumaa" },
    workType: { ar: "زيركون", en: "Zircon" },
    units: 4,
    unitPrice: 30000,
    discount: 0,
    reason: { ar: "زرع", en: "Implant" },
  },
  {
    deliveryDate: "6/29/2026",
    agent: { ar: "موصل", en: "Mosul" },
    caseId: "7124",
    dentist: "Dr. Shaaban",
    patient: { ar: "شعبان", en: "Shaaban" },
    workType: { ar: "زيركون", en: "Zircon" },
    units: 4,
    unitPrice: 30000,
    discount: 0,
    reason: { ar: "Implant", en: "Implant" },
  },
  {
    deliveryDate: "6/29/2026",
    agent: { ar: "موصل", en: "Mosul" },
    caseId: "7124",
    dentist: "Dr. Shaaban",
    patient: { ar: "شعبان", en: "Shaaban" },
    workType: { ar: "زيركون", en: "Zircon" },
    units: 4,
    unitPrice: 30000,
    discount: 0,
    reason: { ar: "Implant", en: "Implant" },
  },
  {
    deliveryDate: "6/28/2026",
    agent: { ar: "موصل", en: "Mosul" },
    caseId: "7118",
    dentist: "Dr. Ahmed",
    patient: { ar: "سارة علي", en: "Sara Ali" },
    workType: { ar: "PFM", en: "PFM" },
    units: 3,
    unitPrice: 25000,
    discount: 5000,
    reason: { ar: "—", en: "—" },
  },
  {
    deliveryDate: "6/27/2026",
    agent: { ar: "موصل", en: "Mosul" },
    caseId: "7115",
    dentist: "Dr. Salem",
    patient: { ar: "خالد محمود", en: "Khaled M." },
    workType: { ar: "E-max", en: "E-max" },
    units: 2,
    unitPrice: 45000,
    discount: 0,
    reason: { ar: "—", en: "—" },
  },
];

function StatementPage() {
  const { labId } = Route.useParams();
  const { labs: LABS } = useAdminStore();
  const lab = LABS.find((l) => l.id === labId);
  const { lang } = useI18n();
  const [query, setQuery] = useState("");
  const today = new Date();
  const from = new Date(today.getTime() - 5 * 86400000);
  const [fromDate, setFromDate] = useState(from.toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(today.toISOString().slice(0, 10));

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SAMPLE;
    return SAMPLE.filter((r) =>
      [r.caseId, r.dentist, r.patient.ar, r.patient.en, r.workType.ar, r.workType.en]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [query]);

  const subtotal = rows.reduce((s, r) => s + r.units * r.unitPrice, 0);
  const totalDiscount = rows.reduce((s, r) => s + r.discount, 0);
  const returnUnits = 0;
  const netTotal = subtotal - totalDiscount;

  const fmt = (n: number) => n.toLocaleString("en-US");
  const title = lang === "ar" ? "كشف حساب المختبر" : "Lab Statement & Ledger";

  return (
    <MobileShell>
      <TopBar title={title} showBack />
      <div className="px-3 pt-3 pb-4 space-y-3">
        {/* Header banner */}
        <div className="rounded-2xl bg-gradient-to-l from-primary to-[oklch(0.45_0.18_256)] text-primary-foreground p-4 shadow-card">
          <p className="text-[11px] font-semibold opacity-80">
            {lang === "ar" ? "DentalHub" : "DentalHub"}
          </p>
          <h2 className="font-display font-extrabold text-base leading-tight mt-0.5">
            {lang === "ar" ? `كشف حساب — ${lab ? lab.ar : ""}` : `Statement — ${lab ? lab.en : ""}`}
          </h2>
          <p className="text-[11px] opacity-85 mt-1">
            {lang === "ar" ? "من" : "From"} {fromDate} · {lang === "ar" ? "إلى" : "To"} {toDate}
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-2">
          <SummaryCard
            label={lang === "ar" ? "الإجمالي الفرعي" : "Subtotal"}
            value={`${fmt(subtotal)}`}
            unit={lang === "ar" ? "د.ع" : "IQD"}
            tone="neutral"
          />
          <SummaryCard
            label={lang === "ar" ? "إجمالي الحسم" : "Total Discount"}
            value={`${fmt(totalDiscount)}`}
            unit={lang === "ar" ? "د.ع" : "IQD"}
            tone="neutral"
          />
          <SummaryCard
            label={lang === "ar" ? "عدد وحدات حالات الإعادة" : "Return Units"}
            value={String(returnUnits)}
            unit=""
            tone="neutral"
          />
          <SummaryCard
            label={lang === "ar" ? "الصافي المستحق على الطبيب" : "Net Due from Dentist"}
            value={`${fmt(netTotal)}`}
            unit={lang === "ar" ? "د.ع" : "IQD"}
            tone="danger"
          />
        </div>

        {/* Date range */}
        <div className="rounded-2xl bg-primary text-primary-foreground p-3 shadow-card">
          <div className="grid grid-cols-2 gap-2">
            <DateField
              label={lang === "ar" ? "من الفترة" : "From Date"}
              value={fromDate}
              onChange={setFromDate}
            />
            <DateField
              label={lang === "ar" ? "إلى الفترة" : "To Date"}
              value={toDate}
              onChange={setToDate}
            />
          </div>
        </div>

        {/* Search + tools */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="size-4 absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={lang === "ar" ? "ابحث..." : "Search..."}
              className="w-full h-10 rounded-xl bg-card border border-border ps-9 pe-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary"
            />
          </div>
          <IconBtn ariaLabel="Sort">
            <SlidersHorizontal className="size-4" />
          </IconBtn>
          <IconBtn ariaLabel="Filter">
            <Filter className="size-4" />
          </IconBtn>
          <IconBtn ariaLabel="Refresh">
            <RotateCcw className="size-4" />
          </IconBtn>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-primary text-primary-foreground">
                <tr>
                  <Th ar="تاريخ الإخراج" en="Delivery Date" lang={lang} />
                  <Th ar="المندوب" en="Agent" lang={lang} />
                  <Th ar="رقم الحالة" en="Case ID" lang={lang} />
                  <Th ar="اسم الطبيب" en="Dentist" lang={lang} />
                  <Th ar="اسم المريض" en="Patient" lang={lang} />
                  <Th ar="نوع العمل" en="Work Type" lang={lang} />
                  <Th ar="عدد الوحدات" en="Units" lang={lang} align="center" />
                  <Th ar="السعر" en="Unit Price" lang={lang} align="end" />
                  <Th ar="الإجمالي" en="Total" lang={lang} align="end" />
                  <Th ar="الحسم" en="Discount" lang={lang} align="end" />
                  <Th ar="السبب" en="Reason" lang={lang} />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, i) => {
                  const total = r.units * r.unitPrice;
                  return (
                    <tr key={i} className="hover:bg-accent/50 transition-colors">
                      <Td>{r.deliveryDate}</Td>
                      <Td>{lang === "ar" ? r.agent.ar : r.agent.en}</Td>
                      <Td className="font-mono">{r.caseId}</Td>
                      <Td className="whitespace-nowrap">{r.dentist}</Td>
                      <Td className="whitespace-nowrap">
                        {lang === "ar" ? r.patient.ar : r.patient.en}
                      </Td>
                      <Td>{lang === "ar" ? r.workType.ar : r.workType.en}</Td>
                      <Td align="center" className="font-semibold">
                        {r.units}
                      </Td>
                      <Td align="end" className="whitespace-nowrap">
                        {fmt(r.unitPrice)} {lang === "ar" ? "د.ع" : "IQD"}
                      </Td>
                      <Td align="end" className="whitespace-nowrap font-semibold text-primary">
                        {fmt(total)} {lang === "ar" ? "د.ع" : "IQD"}
                      </Td>
                      <Td align="end">{r.discount ? fmt(r.discount) : "0.0"}</Td>
                      <Td>{lang === "ar" ? r.reason.ar : r.reason.en}</Td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-muted-foreground text-sm">
                      {lang === "ar" ? "لا توجد بيانات" : "No data"}
                    </td>
                  </tr>
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot className="bg-muted/40">
                  <tr className="font-display font-bold">
                    <td colSpan={8} className="px-3 py-2 text-end">
                      {lang === "ar" ? "الصافي المستحق" : "Net Total"}
                    </td>
                    <td className="px-3 py-2 text-end text-primary whitespace-nowrap">
                      {fmt(netTotal)} {lang === "ar" ? "د.ع" : "IQD"}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-display font-bold inline-flex items-center justify-center gap-2 shadow-card">
            <Printer className="size-4" />
            {lang === "ar" ? "طباعة" : "Print"}
          </button>
          <button className="flex-1 h-11 rounded-xl bg-card border border-border text-foreground font-display font-bold inline-flex items-center justify-center gap-2">
            <Download className="size-4" />
            {lang === "ar" ? "تصدير" : "Export"}
          </button>
        </div>
      </div>
    </MobileShell>
  );
}

function SummaryCard({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  tone: "neutral" | "danger";
}) {
  const isDanger = tone === "danger";
  return (
    <div
      className={
        "rounded-2xl p-3 border shadow-soft " +
        (isDanger
          ? "bg-[oklch(0.97_0.03_25)] border-[oklch(0.85_0.12_25)]"
          : "bg-card border-border")
      }
    >
      <p
        className={
          "text-[10px] font-semibold uppercase tracking-wide " +
          (isDanger ? "text-[oklch(0.5_0.2_25)]" : "text-muted-foreground")
        }
      >
        {label}
      </p>
      <p
        className={
          "mt-1 font-display font-extrabold text-lg leading-tight " +
          (isDanger ? "text-[oklch(0.5_0.2_25)]" : "text-foreground")
        }
      >
        {value} <span className="text-xs font-bold opacity-80">{unit}</span>
      </p>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-semibold opacity-85 mb-1">{label}</span>
      <div className="relative">
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-9 rounded-lg bg-white/95 text-foreground text-xs px-2 pe-7 border border-white/40 focus:outline-none focus:ring-2 focus:ring-white/50"
        />
        <Calendar className="size-3.5 absolute top-1/2 -translate-y-1/2 end-2 text-muted-foreground pointer-events-none" />
      </div>
    </label>
  );
}

function IconBtn({ children, ariaLabel }: { children: React.ReactNode; ariaLabel: string }) {
  return (
    <button
      aria-label={ariaLabel}
      className="size-10 rounded-xl bg-card border border-border flex items-center justify-center text-foreground hover:bg-accent shrink-0"
    >
      {children}
    </button>
  );
}

function Th({
  ar,
  en,
  lang,
  align = "start",
}: {
  ar: string;
  en: string;
  lang: "ar" | "en";
  align?: "start" | "center" | "end";
}) {
  return (
    <th
      className={
        "px-3 py-2 font-display font-bold text-[11px] whitespace-nowrap " +
        (align === "center" ? "text-center" : align === "end" ? "text-end" : "text-start")
      }
    >
      {lang === "ar" ? ar : en}
    </th>
  );
}

function Td({
  children,
  align = "start",
  className = "",
}: {
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
}) {
  return (
    <td
      className={
        "px-3 py-2.5 text-foreground " +
        (align === "center" ? "text-center " : align === "end" ? "text-end " : "text-start ") +
        className
      }
    >
      {children}
    </td>
  );
}
