import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { addTransaction, clinicTotals, removeTransaction, useClinic, type TxKind } from "@/lib/clinicStore";
import { Wallet, Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { EmptyState, Field, Sheet, Stat, inputCls } from "./clinic.materials";

export const Route = createFileRoute("/clinic/finance")({
  head: () => ({
    meta: [
      { title: "المالية والحسابات | DentalHub" },
      { name: "description", content: "تتبع إيرادات العيادة والمصاريف وفواتير المختبر ومدفوعات المرضى والمتبقي." },
      { property: "og:title", content: "المالية والحسابات | DentalHub" },
      { property: "og:description", content: "إيرادات ومصاريف وفواتير العيادة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FinancePage,
});

const SOURCES = [
  { id: "patient", ar: "مريض", en: "Patient" },
  { id: "lab", ar: "مختبر", en: "Lab" },
  { id: "supply", ar: "مستلزمات", en: "Supplies" },
  { id: "other", ar: "أخرى", en: "Other" },
] as const;

function FinancePage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const data = useClinic();
  const { income, expense, net, dueOrders } = clinicTotals(data);
  const [open, setOpen] = useState(false);

  return (
    <MobileShell>
      <TopBar title={ar ? "المالية والحسابات" : "Finance & Accounts"} showBack />
      <div className="px-3 pt-3 pb-6">
        <div className="grid grid-cols-2 gap-2.5">
          <Stat label={ar ? "الإيرادات" : "Revenue"} value={`${income} د.ع`} tone="good" />
          <Stat label={ar ? "المصاريف" : "Expenses"} value={`${expense} د.ع`} tone="bad" />
          <Stat label={ar ? "الصافي" : "Net"} value={`${net} د.ع`} tone={net >= 0 ? "good" : "bad"} />
          <Stat label={ar ? "متبقي للموردين" : "Outstanding"} value={`${dueOrders} د.ع`} tone="warn" />
        </div>

        <button
          onClick={() => setOpen(true)}
          className="mt-3 w-full h-12 rounded-2xl bg-primary text-primary-foreground font-display font-extrabold text-sm shadow-card flex items-center justify-center gap-2"
        >
          <Plus className="size-4" strokeWidth={3} />
          {ar ? "إضافة حركة مالية" : "Add transaction"}
        </button>

        <ul className="mt-3 space-y-2.5">
          {data.transactions.length === 0 ? (
            <EmptyState icon={Wallet} title={ar ? "لا توجد حركات مالية" : "No transactions"} sub={ar ? "سجّل أول دفعة أو مصروف" : "Add your first entry"} />
          ) : (
            data.transactions.map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-2xl bg-card border border-border p-3.5 shadow-soft">
                <span
                  className={cn(
                    "size-10 shrink-0 rounded-2xl flex items-center justify-center font-display font-extrabold text-sm",
                    t.kind === "income" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                  )}
                >
                  {t.kind === "income" ? "+" : "−"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-extrabold text-sm truncate">{t.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t.date} · {ar ? SOURCES.find((s) => s.id === t.source)?.ar : SOURCES.find((s) => s.id === t.source)?.en}
                  </p>
                </div>
                <span className={cn("font-display font-extrabold text-sm", t.kind === "income" ? "text-emerald-600" : "text-rose-600")}>
                  {t.amount.toLocaleString()} د.ع
                </span>
                <button onClick={() => removeTransaction(t.id)} className="size-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      {open && <TxModal ar={ar} onClose={() => setOpen(false)} />}
    </MobileShell>
  );
}

function TxModal({ ar, onClose }: { ar: boolean; onClose: () => void }) {
  const [f, setF] = useState({ label: "", kind: "income" as TxKind, amount: 0, source: "patient" as (typeof SOURCES)[number]["id"] });
  const [amountDisplay, setAmountDisplay] = useState("");

  const formatAmount = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return "";
    return Number(digits).toLocaleString("en-US");
  };

  return (
    <Sheet onClose={onClose} title={ar ? "إضافة حركة مالية" : "Add transaction"}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!f.label.trim()) return;
          addTransaction(f);
          onClose();
        }}
        className="space-y-3"
      >
        {/* Income / Expense Toggle */}
        <div className="flex gap-2">
          <button type="button" onClick={() => setF({ ...f, kind: "income" })}
            className={cn("flex-1 h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border-2 transition",
              f.kind === "income" ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300")}>
            <TrendingUp className="size-4" />{ar ? "إيراد" : "Income"}
          </button>
          <button type="button" onClick={() => setF({ ...f, kind: "expense" })}
            className={cn("flex-1 h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border-2 transition",
              f.kind === "expense" ? "bg-rose-500 text-white border-rose-500" : "bg-white text-slate-600 border-slate-200 hover:border-rose-300")}>
            <TrendingDown className="size-4" />{ar ? "مصروف" : "Expense"}
          </button>
        </div>

        <Field label={ar ? "البيان" : "Description"}>
          <input required autoFocus value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder={ar ? "مثال: دفعة مريض" : "e.g., Patient payment"} className={inputCls} />
        </Field>

        <Field label={`${ar ? "المبلغ" : "Amount"} (${ar ? "د.ع" : "IQD"})`}>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={amountDisplay}
              onChange={(e) => {
                const formatted = formatAmount(e.target.value);
                setAmountDisplay(formatted);
                setF({ ...f, amount: Number(formatted.replace(/,/g, "")) || 0 });
              }}
              placeholder="0"
              className={cn(inputCls, "text-right")}
            />
            <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{ar ? "د.ع" : "IQD"}</span>
          </div>
        </Field>

        <Field label={ar ? "المصدر" : "Source"}>
          <div className="relative">
            <select value={f.source} onChange={(e) => setF({ ...f, source: e.target.value as (typeof SOURCES)[number]["id"] })} className={cn(inputCls, "appearance-none pe-10")}>
              {SOURCES.map((s) => (<option key={s.id} value={s.id}>{ar ? s.ar : s.en}</option>))}
            </select>
            <span className="absolute end-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</span>
          </div>
        </Field>

        <button type="submit"
          className={cn("w-full h-12 rounded-2xl text-primary-foreground font-display font-extrabold text-sm shadow-card transition",
            f.kind === "income" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600")}>
          {ar ? "حفظ الحركة" : "Save Transaction"}
        </button>
      </form>
    </Sheet>
  );
}
